import { useCallback, useEffect, useMemo, useState } from 'react';
import { crmAPI } from '../../utils/api';

/**
 * Shared load/save/compute state for standalone underwriting sections.
 */
export default function useUnderwritingWorkbook(dealId, { canWrite = true, onMeta = null } = {}) {
  const [workbook, setWorkbook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [pathId, setPathId] = useState(null);
  const [scenario, setScenario] = useState('base');

  const load = useCallback(async () => {
    if (!dealId) return;
    setLoading(true);
    setError('');
    try {
      const res = await crmAPI.getUnderwriting(dealId);
      setWorkbook(res.workbook);
      const baseline = res.workbook.paths?.find((p) => p.isBaseline) || res.workbook.paths?.[0];
      const preferred = res.workbook.paths?.find((p) => p.isPreferred);
      setPathId(preferred?.id || baseline?.id || null);
      setScenario(res.workbook.settings?.scenarioKey || 'base');
      console.log('[underwriting] workbook loaded', { dealId, modelId: res.workbook.id });
    } catch (err) {
      console.error('[underwriting] load failed', err);
      setError(err.message || 'Failed to load underwriting');
    } finally {
      setLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    load();
  }, [load]);

  const activePath = useMemo(
    () => workbook?.paths?.find((p) => p.id === pathId) || workbook?.paths?.[0],
    [workbook, pathId]
  );

  const pathOutput = useMemo(() => {
    if (!workbook?.outputs?.pathResults || !activePath) return null;
    return workbook.outputs.pathResults[activePath.id]?.[scenario] || null;
  }, [workbook, activePath, scenario]);

  const evidenceCoverage = useMemo(() => {
    const links = workbook?.evidenceLinks || [];
    if (!links.length) return { total: 0, verified: 0, pct: 0 };
    const verified = links.filter((l) => l.status === 'verified' || l.status === 'received').length;
    return { total: links.length, verified, pct: Math.round((verified / links.length) * 100) };
  }, [workbook]);

  const keyInputCoverage = useMemo(() => {
    const keys = [
      'purchasePrice',
      'startingRevenue',
      'startingEbitda',
      'historicals.revenue',
      'historicals.ebitda',
      'historicals.taxReturn'
    ];
    const links = workbook?.evidenceLinks || [];
    const byPath = new Map(links.map((l) => [l.inputPath, l]));
    let backed = 0;
    for (const k of keys) {
      const link = byPath.get(k);
      if (link && (link.status === 'verified' || link.status === 'received' || link.status === 'linked')) {
        backed += 1;
      }
    }
    return { total: keys.length, backed, pct: Math.round((backed / keys.length) * 100) };
  }, [workbook]);

  useEffect(() => {
    if (!onMeta || !workbook) return;
    onMeta({
      id: workbook.id,
      dealName: workbook.dealName,
      paths: workbook.paths,
      updatedAt: workbook.updatedAt,
      pathOutput,
      evidenceCoverage,
      keyInputCoverage,
      canWrite,
      reload: load,
      activePath,
      scenario,
      setPathId,
      setScenarioKey: async (key) => {
        setScenario(key);
        if (!canWrite) return;
        const res = await crmAPI.patchUnderwriting(workbook.id, {
          settings: { ...(workbook.settings || {}), scenarioKey: key }
        });
        setWorkbook(res.workbook);
      }
    });
  }, [onMeta, workbook, pathOutput, evidenceCoverage, keyInputCoverage, canWrite, load, activePath, scenario]);

  const persistShared = async (patch) => {
    if (!workbook || !canWrite) return;
    setSaving(true);
    setMsg('');
    try {
      const sharedInputs = { ...workbook.sharedInputs, ...patch };
      const res = await crmAPI.patchUnderwriting(workbook.id, { sharedInputs });
      setWorkbook(res.workbook);
      console.log('[underwriting] shared saved', Object.keys(patch));
    } catch (err) {
      setError(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const persistPath = async (patch, targetPathId = null) => {
    if (!workbook || !canWrite) return;
    const id = targetPathId || activePath?.id;
    if (!id) return;
    setSaving(true);
    try {
      const res = await crmAPI.patchUwPath(workbook.id, id, { pathInputs: patch });
      setWorkbook(res.workbook);
      console.log('[underwriting] path saved', { pathId: id, keys: Object.keys(patch) });
    } catch (err) {
      setError(err.message || 'Path save failed');
    } finally {
      setSaving(false);
    }
  };

  const patchPathMeta = async (pathIdToPatch, meta) => {
    if (!workbook || !canWrite) return;
    setSaving(true);
    try {
      const res = await crmAPI.patchUwPath(workbook.id, pathIdToPatch, meta);
      setWorkbook(res.workbook);
    } catch (err) {
      setError(err.message || 'Path update failed');
    } finally {
      setSaving(false);
    }
  };

  const setScenarioKey = async (key) => {
    setScenario(key);
    if (!workbook || !canWrite) return;
    const res = await crmAPI.patchUnderwriting(workbook.id, {
      settings: { ...(workbook.settings || {}), scenarioKey: key }
    });
    setWorkbook(res.workbook);
  };

  const duplicatePath = async (name) => {
    if (!workbook || !activePath || !canWrite) return null;
    setSaving(true);
    try {
      const res = await crmAPI.createUwPath(workbook.id, {
        duplicateFromId: activePath.id,
        name: name || `${activePath.name} variant`
      });
      setWorkbook(res.workbook);
      const newest = res.workbook.paths[res.workbook.paths.length - 1];
      setPathId(newest?.id);
      setMsg('Duplicated structure path');
      return newest;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setSaving(false);
    }
  };

  const requestEvidence = async (inputPath, title) => {
    if (!workbook || !canWrite) return;
    try {
      const res = await crmAPI.requestUwEvidenceDd(workbook.id, { inputPath, title });
      setWorkbook(res.workbook);
      setMsg(`DD item requested for ${inputPath}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const verifyEvidence = async (inputPath, status = 'verified', notes = '') => {
    if (!workbook || !canWrite) return;
    try {
      const res = await crmAPI.postUwEvidence(workbook.id, { inputPath, status, notes });
      setWorkbook(res.workbook);
      setMsg(`Evidence ${status}: ${inputPath}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return {
    workbook,
    setWorkbook,
    loading,
    error,
    setError,
    saving,
    msg,
    setMsg,
    pathId,
    setPathId,
    scenario,
    setScenarioKey,
    activePath,
    pathOutput,
    evidenceCoverage,
    keyInputCoverage,
    load,
    persistShared,
    persistPath,
    patchPathMeta,
    duplicatePath,
    requestEvidence,
    verifyEvidence,
    canWrite
  };
}
