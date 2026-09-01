import { useCallback, useEffect, useState } from 'react';
import { crmAPI, dealsAPI } from '../utils/api';
import { PIPELINE_STAGE_OPTIONS } from '../utils/pipelineStages';

/**
 * Pipeline status control that writes `saved_deals.progress_stage` via the CRM
 * stage endpoint so aggregator, My Deals, kanban, and CRM workspace stay in sync.
 */
export function useCrmStageControl({
  deal,
  crmMeta = null,
  ensureSaved,
  isGuest = false,
  requireSignup = null,
  onSynced = null,
  writeEnabled = true
} = {}) {
  const dealKey = deal ? `${deal.id ?? ''}:${deal.dbId ?? ''}` : '';
  const savedStage = crmMeta?.progressStage || '';
  const savedCustom = crmMeta?.customStageLabel || '';
  const [progressStage, setProgressStage] = useState(savedStage);
  const [customStageLabel, setCustomStageLabel] = useState(savedCustom);
  const [saving, setSaving] = useState(false);
  const [customSaving, setCustomSaving] = useState(false);

  useEffect(() => {
    setProgressStage(savedStage);
    setCustomStageLabel(savedCustom);
  }, [dealKey, savedStage, savedCustom]);

  const onChange = useCallback(async (e) => {
    const newStage = e.target.value;
    if (!newStage.trim() || saving) return;
    if (isGuest) {
      requireSignup?.('save', { dealDbId: deal?.dbId });
      return;
    }
    if (!writeEnabled || typeof ensureSaved !== 'function') return;

    const previous = progressStage;
    setProgressStage(newStage);
    setSaving(true);
    try {
      const savedDealId = await ensureSaved(deal);
      if (savedDealId == null) {
        throw new Error('Could not save deal to CRM');
      }
      const result = await crmAPI.updateStage(savedDealId, newStage);
      console.log('[crm-stage] synced', {
        savedDealId,
        stage: newStage,
        unchanged: Boolean(result?.unchanged)
      });
      await onSynced?.(result);
    } catch (err) {
      setProgressStage(previous);
      alert('Failed to update status: ' + (err.message || 'error'));
    } finally {
      setSaving(false);
    }
  }, [deal, ensureSaved, isGuest, onSynced, progressStage, requireSignup, saving, writeEnabled]);

  const saveCustomLabel = useCallback(async () => {
    if (isGuest) {
      requireSignup?.('save', { dealDbId: deal?.dbId });
      return;
    }
    const label = String(customStageLabel || '').trim();
    if (!label) {
      alert('Enter a custom status label (e.g. “Waiting on seller P&Ls”).');
      return;
    }
    if (typeof ensureSaved !== 'function') return;
    setCustomSaving(true);
    try {
      const savedDealId = await ensureSaved(deal);
      if (savedDealId == null) {
        throw new Error('Could not save deal to CRM');
      }
      await dealsAPI.updateDeal(savedDealId, { customStageLabel: label });
      console.log('[crm-stage] custom label saved', { savedDealId, label });
      await onSynced?.();
    } catch (err) {
      alert(err.message || 'Failed to save custom status');
    } finally {
      setCustomSaving(false);
    }
  }, [customStageLabel, deal, ensureSaved, isGuest, onSynced, requireSignup]);

  return {
    value: progressStage,
    onChange,
    options: PIPELINE_STAGE_OPTIONS,
    saving,
    disabled: Boolean(saving || !writeEnabled),
    customLabel: customStageLabel,
    onCustomLabelChange: (e) => setCustomStageLabel(e.target.value),
    onCustomLabelSave: saveCustomLabel,
    customLabelSaving: customSaving
  };
}
