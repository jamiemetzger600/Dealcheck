import {
  getOrCreateForDeal,
  createBlankUnderwriting,
  updateModel,
  createPath,
  updatePath,
  deletePath,
  saveRevision,
  upsertCustomSheet,
  deleteCustomSheet,
  upsertEvidenceLink,
  requestEvidenceViaDd,
  createShareLink,
  revokeShareLink,
  getPublicUnderwriting,
  applyWorkbookImport,
  serializeModel,
  listWorkbooks
} from '../services/underwritingService.js';
import { proposeMappingsFromSheets } from '../lib/underwritingImport.js';

function handle(res, err) {
  const status = err.status || 500;
  if (status >= 500) console.error('[underwriting]', err);
  res.status(status).json({ error: err.message || 'Server error' });
}

export async function getUnderwritingHub(req, res) {
  try {
    const workbooks = await listWorkbooks(req.user.userId, {
      limit: req.query.limit
    });
    res.json({ workbooks });
  } catch (err) {
    handle(res, err);
  }
}

export async function getDealUnderwriting(req, res) {
  try {
    const workbook = await getOrCreateForDeal(req.user.userId, Number(req.params.id), {
      prefill: req.query.prefill !== '0'
    });
    res.json({ workbook });
  } catch (err) {
    handle(res, err);
  }
}

export async function postBlankUnderwriting(req, res) {
  try {
    const result = await createBlankUnderwriting(req.user.userId, {
      name: req.body?.name,
      buyerType: req.body?.buyerType
    });
    res.status(201).json(result);
  } catch (err) {
    handle(res, err);
  }
}

export async function patchUnderwritingModel(req, res) {
  try {
    const workbook = await updateModel(req.user.userId, Number(req.params.modelId), req.body || {});
    res.json({ workbook });
  } catch (err) {
    handle(res, err);
  }
}

export async function postStructurePath(req, res) {
  try {
    const workbook = await createPath(req.user.userId, Number(req.params.modelId), req.body || {});
    res.status(201).json({ workbook });
  } catch (err) {
    handle(res, err);
  }
}

export async function patchStructurePath(req, res) {
  try {
    const workbook = await updatePath(
      req.user.userId,
      Number(req.params.modelId),
      Number(req.params.pathId),
      req.body || {}
    );
    res.json({ workbook });
  } catch (err) {
    handle(res, err);
  }
}

export async function deleteStructurePath(req, res) {
  try {
    const workbook = await deletePath(
      req.user.userId,
      Number(req.params.modelId),
      Number(req.params.pathId)
    );
    res.json({ workbook });
  } catch (err) {
    handle(res, err);
  }
}

export async function postRevision(req, res) {
  try {
    const workbook = await saveRevision(req.user.userId, Number(req.params.modelId), req.body || {});
    res.status(201).json({ workbook });
  } catch (err) {
    handle(res, err);
  }
}

export async function putCustomSheet(req, res) {
  try {
    const workbook = await upsertCustomSheet(req.user.userId, Number(req.params.modelId), req.body || {});
    res.json({ workbook });
  } catch (err) {
    handle(res, err);
  }
}

export async function removeCustomSheet(req, res) {
  try {
    const workbook = await deleteCustomSheet(
      req.user.userId,
      Number(req.params.modelId),
      Number(req.params.sheetId)
    );
    res.json({ workbook });
  } catch (err) {
    handle(res, err);
  }
}

export async function postEvidenceLink(req, res) {
  try {
    const workbook = await upsertEvidenceLink(req.user.userId, Number(req.params.modelId), req.body || {});
    res.json({ workbook });
  } catch (err) {
    handle(res, err);
  }
}

export async function postRequestEvidence(req, res) {
  try {
    const workbook = await requestEvidenceViaDd(req.user.userId, Number(req.params.modelId), req.body || {});
    res.json({ workbook });
  } catch (err) {
    handle(res, err);
  }
}

export async function postShareLink(req, res) {
  try {
    const link = await createShareLink(req.user.userId, Number(req.params.modelId), req.body || {});
    res.status(201).json({ link });
  } catch (err) {
    handle(res, err);
  }
}

export async function deleteShareLink(req, res) {
  try {
    const workbook = await revokeShareLink(
      req.user.userId,
      Number(req.params.modelId),
      Number(req.params.linkId)
    );
    res.json({ workbook });
  } catch (err) {
    handle(res, err);
  }
}

export async function getPublicUw(req, res) {
  try {
    const data = await getPublicUnderwriting(req.params.token, {
      password: req.body?.password || req.query?.password
    });
    res.json(data);
  } catch (err) {
    handle(res, err);
  }
}

export async function postPublicUwUnlock(req, res) {
  try {
    const data = await getPublicUnderwriting(req.params.token, {
      password: req.body?.password
    });
    res.json(data);
  } catch (err) {
    handle(res, err);
  }
}

/** JSON import: sheets array from client-parsed CSV/XLSX or server parse. */
export async function postImportPreview(req, res) {
  try {
    let sheets = req.body?.sheets || [];
    // Optional base64 xlsx
    if (req.body?.xlsxBase64) {
      const XLSX = await import('xlsx');
      const buf = Buffer.from(req.body.xlsxBase64, 'base64');
      const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
      sheets = wb.SheetNames.map((name) => ({
        name,
        rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' })
      }));
    }
    const mapped = proposeMappingsFromSheets(sheets);
    const proposals = Array.isArray(mapped) ? mapped : mapped.proposals || [];
    const detectedSoil = Boolean(mapped?.detectedSoil);
    const heuristicUnmapped = Array.isArray(mapped?.unmappedSheets) ? mapped.unmappedSheets : [];
    res.json({
      proposals,
      detectedSoil,
      sheetNames: sheets.map((s) => s.name),
      unmappedSheets: heuristicUnmapped.length
        ? heuristicUnmapped.map((s) => ({
            name: s.name,
            rows: []
          }))
        : sheets
            .filter((s) => !/quick\s*underwrite|p\s*&\s*l\s*yoy|executive\s*summary|amortization|roi-/i.test(s.name || ''))
            .map((s) => ({
              name: s.name,
              rows: (s.rows || []).slice(0, 40).map((r) => ({
                label: String(r?.[0] ?? ''),
                value: Number(String(r?.[1] ?? '').replace(/[$,]/g, '')) || 0,
                note: 'imported'
              }))
            }))
    });
  } catch (err) {
    handle(res, err);
  }
}

export async function postImportApply(req, res) {
  try {
    const workbook = await applyWorkbookImport(req.user.userId, Number(req.params.modelId), req.body || {});
    res.json({ workbook });
  } catch (err) {
    handle(res, err);
  }
}

export async function getUnderwritingByModel(req, res) {
  try {
    await serializeModel; // silence lint if unused path
    const { getDealAccess, assertCanRead } = await import('../lib/teamAcl.js');
    const pool = (await import('../db/pool.js')).default;
    const m = await pool.query('SELECT saved_deal_id FROM underwriting_models WHERE id = $1', [
      Number(req.params.modelId)
    ]);
    if (!m.rows.length) return res.status(404).json({ error: 'Not found' });
    const access = await getDealAccess(req.user.userId, m.rows[0].saved_deal_id);
    assertCanRead(access);
    const workbook = await serializeModel(Number(req.params.modelId));
    res.json({ workbook });
  } catch (err) {
    handle(res, err);
  }
}
