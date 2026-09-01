/**
 * Underwriting service — one workbook per saved deal.
 */
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import pool from '../db/pool.js';
import { assertCanRead, assertCanWrite, getDealAccess, VISIBLE_DEALS_SQL } from '../lib/teamAcl.js';
import {
  applyCustomSheetMappings,
  computeWorkbook,
  defaultBaselinePath,
  defaultSharedFromDeal,
  projectPath
} from '../lib/underwritingEngine.js';
import { suggestGrowthAssumptions } from '../lib/industryGrowthBenchmarks.js';

async function loadDealRow(savedDealId) {
  const r = await pool.query(
    `SELECT id, user_id, team_id, name, asking_price, ebitda, revenue, industry, location, source
     FROM saved_deals WHERE id = $1`,
    [savedDealId]
  );
  return r.rows[0] || null;
}

export async function serializeModel(modelId) {
  const modelRes = await pool.query(
    `SELECT id, saved_deal_id, buyer_type, ui_mode, settings, shared_inputs,
            created_by, created_at, updated_at
     FROM underwriting_models WHERE id = $1`,
    [modelId]
  );
  const model = modelRes.rows[0];
  if (!model) return null;

  const paths = await pool.query(
    `SELECT id, name, is_baseline, sort_order, path_inputs, created_at, updated_at
     FROM underwriting_structure_paths WHERE model_id = $1
     ORDER BY sort_order ASC, id ASC`,
    [modelId]
  );
  const sheets = await pool.query(
    `SELECT id, name, sort_order, rows, created_at, updated_at
     FROM underwriting_custom_sheets WHERE model_id = $1
     ORDER BY sort_order ASC, id ASC`,
    [modelId]
  );
  const evidence = await pool.query(
    `SELECT id, input_path, dd_item_id, deal_document_id, status, notes, created_at, updated_at
     FROM underwriting_evidence_links WHERE model_id = $1
     ORDER BY id ASC`,
    [modelId]
  );
  const revisions = await pool.query(
    `SELECT id, label, change_summary, created_by, created_at
     FROM underwriting_revisions WHERE model_id = $1
     ORDER BY created_at DESC LIMIT 30`,
    [modelId]
  );
  const shares = await pool.query(
    `SELECT id, token, label, expires_at, revoked_at, pinned_revision_id, preferred_path_id,
            (password_hash IS NOT NULL) AS has_password, created_at
     FROM underwriting_share_links
     WHERE model_id = $1 AND revoked_at IS NULL
     ORDER BY created_at DESC`,
    [modelId]
  );

  const pathPayloads = paths.rows.map((p) => ({
    id: p.id,
    name: p.name,
    isBaseline: p.is_baseline,
    sortOrder: p.sort_order,
    ...((p.path_inputs && typeof p.path_inputs === 'object') ? p.path_inputs : {})
  }));

  const customSheets = sheets.rows.map((s) => ({
    id: s.id,
    name: s.name,
    sortOrder: s.sort_order,
    rows: Array.isArray(s.rows) ? s.rows : []
  }));

  const shared = applyCustomSheetMappings(
    model.shared_inputs && typeof model.shared_inputs === 'object' ? model.shared_inputs : {},
    customSheets
  );

  const outputs = computeWorkbook({
    shared,
    paths: pathPayloads,
    scenarioKey: model.settings?.scenarioKey || 'base'
  });

  const deal = await loadDealRow(model.saved_deal_id);
  const growthSuggestions = suggestGrowthAssumptions({
    industry: deal?.industry || '',
    historicals: shared.historicals || []
  });

  return {
    id: model.id,
    savedDealId: model.saved_deal_id,
    dealName: deal?.name || `Deal #${model.saved_deal_id}`,
    dealMeta: deal
      ? {
          askingPrice: deal.asking_price != null ? Number(deal.asking_price) : null,
          industry: deal.industry || null,
          location: deal.location || null,
          source: deal.source || null
        }
      : null,
    growthSuggestions,
    buyerType: model.buyer_type,
    uiMode: model.ui_mode,
    settings: model.settings || {},
    sharedInputs: model.shared_inputs || {},
    paths: pathPayloads,
    customSheets,
    evidenceLinks: evidence.rows.map((e) => ({
      id: e.id,
      inputPath: e.input_path,
      ddItemId: e.dd_item_id,
      dealDocumentId: e.deal_document_id,
      status: e.status,
      notes: e.notes,
      createdAt: e.created_at,
      updatedAt: e.updated_at
    })),
    revisions: revisions.rows.map((r) => ({
      id: r.id,
      label: r.label,
      changeSummary: r.change_summary,
      createdBy: r.created_by,
      createdAt: r.created_at
    })),
    shareLinks: shares.rows.map((s) => ({
      id: s.id,
      token: s.token,
      label: s.label,
      expiresAt: s.expires_at,
      hasPassword: Boolean(s.has_password),
      pinnedRevisionId: s.pinned_revision_id,
      preferredPathId: s.preferred_path_id,
      createdAt: s.created_at
    })),
    outputs,
    createdAt: model.created_at,
    updatedAt: model.updated_at
  };
}

/**
 * Hub list: workbooks visible to the user (personal + team deals).
 * Light baseline Y1 DSCR for each row — avoids full serialize of every model.
 */
export async function listWorkbooks(userId, { limit = 100 } = {}) {
  const lim = Math.min(200, Math.max(1, Number(limit) || 100));
  const r = await pool.query(
    `SELECT m.id AS model_id,
            m.saved_deal_id,
            m.updated_at,
            m.shared_inputs,
            m.settings,
            sd.name AS deal_name,
            sd.asking_price,
            sd.industry,
            sd.location,
            (SELECT COUNT(*)::int FROM underwriting_evidence_links e WHERE e.model_id = m.id) AS evidence_total,
            (SELECT COUNT(*)::int FROM underwriting_evidence_links e
              WHERE e.model_id = m.id AND e.status IN ('received', 'verified')) AS evidence_ok,
            (SELECT COUNT(*)::int FROM underwriting_structure_paths p WHERE p.model_id = m.id) AS path_count,
            bp.id AS baseline_path_id,
            bp.name AS baseline_path_name,
            bp.path_inputs AS baseline_path_inputs
     FROM underwriting_models m
     JOIN saved_deals sd ON sd.id = m.saved_deal_id
     LEFT JOIN LATERAL (
       SELECT id, name, path_inputs
       FROM underwriting_structure_paths
       WHERE model_id = m.id
       ORDER BY is_baseline DESC, sort_order ASC, id ASC
       LIMIT 1
     ) bp ON TRUE
     WHERE ${VISIBLE_DEALS_SQL}
     ORDER BY m.updated_at DESC
     LIMIT $2`,
    [userId, lim]
  );

  const workbooks = r.rows.map((row) => {
    const shared =
      row.shared_inputs && typeof row.shared_inputs === 'object' ? row.shared_inputs : {};
    const pathInputs =
      row.baseline_path_inputs && typeof row.baseline_path_inputs === 'object'
        ? row.baseline_path_inputs
        : {};
    let year1Dscr = null;
    try {
      if (row.baseline_path_id) {
        const projected = projectPath(
          shared,
          { id: row.baseline_path_id, name: row.baseline_path_name, ...pathInputs },
          row.settings?.scenarioKey || 'base'
        );
        year1Dscr = projected?.returns?.year1Dscr ?? projected?.years?.[0]?.dscr ?? null;
      }
    } catch (err) {
      console.warn('[underwriting] list hub dscr failed', { modelId: row.model_id, err: err.message });
    }
    const evidenceTotal = row.evidence_total || 0;
    const evidenceOk = row.evidence_ok || 0;
    return {
      modelId: row.model_id,
      savedDealId: row.saved_deal_id,
      dealName: row.deal_name || `Deal #${row.saved_deal_id}`,
      askingPrice: row.asking_price != null ? Number(row.asking_price) : null,
      industry: row.industry || null,
      location: row.location || null,
      pathCount: row.path_count || 0,
      evidenceTotal,
      evidenceOk,
      evidencePct: evidenceTotal ? Math.round((evidenceOk / evidenceTotal) * 100) : 0,
      year1Dscr,
      updatedAt: row.updated_at
    };
  });

  console.log('[underwriting] list workbooks', { userId, count: workbooks.length });
  return workbooks;
}

export async function getOrCreateForDeal(userId, savedDealId, { prefill = true } = {}) {
  const access = await getDealAccess(userId, savedDealId);
  assertCanRead(access);
  if (!access.deal) {
    const err = new Error('Deal not found');
    err.status = 404;
    throw err;
  }

  let existing = await pool.query(
    'SELECT id FROM underwriting_models WHERE saved_deal_id = $1',
    [savedDealId]
  );
  if (existing.rows.length) {
    return serializeModel(existing.rows[0].id);
  }

  assertCanWrite(access);
  const deal = await loadDealRow(savedDealId);
  const shared = prefill ? defaultSharedFromDeal(deal) : defaultSharedFromDeal({});
  const path = defaultBaselinePath(shared, 'Baseline');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const modelIns = await client.query(
      `INSERT INTO underwriting_models (saved_deal_id, created_by, shared_inputs, settings)
       VALUES ($1, $2, $3::jsonb, $4::jsonb)
       RETURNING id`,
      [
        savedDealId,
        userId,
        JSON.stringify(shared),
        JSON.stringify({ scenarioKey: 'base' })
      ]
    );
    const modelId = modelIns.rows[0].id;
    const { name, isBaseline, ...pathInputs } = path;
    await client.query(
      `INSERT INTO underwriting_structure_paths (model_id, name, is_baseline, sort_order, path_inputs)
       VALUES ($1, $2, TRUE, 0, $3::jsonb)`,
      [modelId, name || 'Baseline', JSON.stringify(pathInputs)]
    );
    await client.query('COMMIT');
    console.log('[underwriting] created model', { modelId, savedDealId, userId });
    return serializeModel(modelId);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      existing = await pool.query(
        'SELECT id FROM underwriting_models WHERE saved_deal_id = $1',
        [savedDealId]
      );
      if (existing.rows[0]) return serializeModel(existing.rows[0].id);
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function createBlankUnderwriting(userId, { name = 'Off-market deal', buyerType = 'owner_operator' } = {}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const dealIns = await client.query(
      `INSERT INTO saved_deals (
         user_id, deal_id, name, source, source_type, status, progress_stage, notes
       ) VALUES ($1, $2, $3, 'manual', 'manual', 'none', NULL, $4)
       RETURNING id`,
      [
        userId,
        `manual-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
        name,
        'Created via blank underwriting canvas'
      ]
    );
    const savedDealId = dealIns.rows[0].id;
    const shared = defaultSharedFromDeal({});
    const path = defaultBaselinePath(shared, 'Baseline');
    const modelIns = await client.query(
      `INSERT INTO underwriting_models (saved_deal_id, buyer_type, created_by, shared_inputs, settings)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb)
       RETURNING id`,
      [
        savedDealId,
        buyerType,
        userId,
        JSON.stringify(shared),
        JSON.stringify({ scenarioKey: 'base' })
      ]
    );
    const modelId = modelIns.rows[0].id;
    const { name: pathName, isBaseline, ...pathInputs } = path;
    await client.query(
      `INSERT INTO underwriting_structure_paths (model_id, name, is_baseline, sort_order, path_inputs)
       VALUES ($1, $2, TRUE, 0, $3::jsonb)`,
      [modelId, pathName || 'Baseline', JSON.stringify(pathInputs)]
    );
    await client.query('COMMIT');
    console.log('[underwriting] blank canvas', { modelId, savedDealId, userId });
    const workbook = await serializeModel(modelId);
    return { savedDealId, workbook };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function requireModelWrite(userId, modelId) {
  const m = await pool.query(
    'SELECT id, saved_deal_id FROM underwriting_models WHERE id = $1',
    [modelId]
  );
  if (!m.rows.length) {
    const err = new Error('Underwriting not found');
    err.status = 404;
    throw err;
  }
  const access = await getDealAccess(userId, m.rows[0].saved_deal_id);
  assertCanWrite(access);
  return m.rows[0];
}

async function requireModelRead(userId, modelId) {
  const m = await pool.query(
    'SELECT id, saved_deal_id FROM underwriting_models WHERE id = $1',
    [modelId]
  );
  if (!m.rows.length) {
    const err = new Error('Underwriting not found');
    err.status = 404;
    throw err;
  }
  const access = await getDealAccess(userId, m.rows[0].saved_deal_id);
  assertCanRead(access);
  return m.rows[0];
}

export async function updateModel(userId, modelId, patch = {}) {
  await requireModelWrite(userId, modelId);
  const fields = [];
  const vals = [];
  let i = 1;
  if (patch.sharedInputs !== undefined) {
    fields.push(`shared_inputs = $${i++}::jsonb`);
    vals.push(JSON.stringify(patch.sharedInputs));
  }
  if (patch.settings !== undefined) {
    fields.push(`settings = $${i++}::jsonb`);
    vals.push(JSON.stringify(patch.settings));
  }
  if (patch.buyerType !== undefined) {
    fields.push(`buyer_type = $${i++}`);
    vals.push(patch.buyerType);
  }
  if (patch.uiMode !== undefined) {
    fields.push(`ui_mode = $${i++}`);
    vals.push(patch.uiMode);
  }
  if (!fields.length) return serializeModel(modelId);
  fields.push('updated_at = NOW()');
  vals.push(modelId);
  await pool.query(
    `UPDATE underwriting_models SET ${fields.join(', ')} WHERE id = $${i}`,
    vals
  );
  return serializeModel(modelId);
}

export async function createPath(userId, modelId, { name, duplicateFromId, pathInputs } = {}) {
  await requireModelWrite(userId, modelId);
  let inputs = pathInputs || {};
  let pathName = (name || 'Structure path').trim();
  if (duplicateFromId) {
    const src = await pool.query(
      `SELECT name, path_inputs FROM underwriting_structure_paths
       WHERE id = $1 AND model_id = $2`,
      [duplicateFromId, modelId]
    );
    if (!src.rows.length) {
      const err = new Error('Source path not found');
      err.status = 404;
      throw err;
    }
    inputs = { ...(src.rows[0].path_inputs || {}) };
    if (!name) pathName = `${src.rows[0].name} (copy)`;
  }
  const maxOrder = await pool.query(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM underwriting_structure_paths WHERE model_id = $1',
    [modelId]
  );
  const ins = await pool.query(
    `INSERT INTO underwriting_structure_paths (model_id, name, is_baseline, sort_order, path_inputs)
     VALUES ($1, $2, FALSE, $3, $4::jsonb)
     RETURNING id`,
    [modelId, pathName, maxOrder.rows[0].next, JSON.stringify(inputs)]
  );
  console.log('[underwriting] path created', { modelId, pathId: ins.rows[0].id });
  return serializeModel(modelId);
}

export async function updatePath(userId, modelId, pathId, patch = {}) {
  await requireModelWrite(userId, modelId);
  const existing = await pool.query(
    `SELECT id, path_inputs FROM underwriting_structure_paths WHERE id = $1 AND model_id = $2`,
    [pathId, modelId]
  );
  if (!existing.rows.length) {
    const err = new Error('Path not found');
    err.status = 404;
    throw err;
  }
  if (patch.name !== undefined) {
    await pool.query(
      `UPDATE underwriting_structure_paths SET name = $1, updated_at = NOW() WHERE id = $2`,
      [String(patch.name).trim() || 'Path', pathId]
    );
  }
  if (patch.pathInputs !== undefined || patch.inputs !== undefined) {
    const next = {
      ...(existing.rows[0].path_inputs || {}),
      ...(patch.pathInputs || patch.inputs || {})
    };
    // strip meta keys if present
    delete next.id;
    delete next.name;
    delete next.isBaseline;
    delete next.sortOrder;
    const markPreferred = next.isPreferred === true || patch.isPreferred === true;
    if (markPreferred) next.isPreferred = true;
    await pool.query(
      `UPDATE underwriting_structure_paths SET path_inputs = $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(next), pathId]
    );
    if (markPreferred) {
      // Clear preferred flag on sibling paths (stored in path_inputs JSON)
      const siblings = await pool.query(
        `SELECT id, path_inputs FROM underwriting_structure_paths WHERE model_id = $1 AND id <> $2`,
        [modelId, pathId]
      );
      for (const sib of siblings.rows) {
        const inputs = { ...(sib.path_inputs || {}), isPreferred: false };
        await pool.query(
          `UPDATE underwriting_structure_paths SET path_inputs = $1::jsonb, updated_at = NOW() WHERE id = $2`,
          [JSON.stringify(inputs), sib.id]
        );
      }
    }
  }
  if (patch.isBaseline === true) {
    await pool.query(
      `UPDATE underwriting_structure_paths SET is_baseline = FALSE WHERE model_id = $1`,
      [modelId]
    );
    await pool.query(
      `UPDATE underwriting_structure_paths SET is_baseline = TRUE, updated_at = NOW() WHERE id = $1`,
      [pathId]
    );
  }
  if (patch.isPreferred === true && patch.pathInputs === undefined && patch.inputs === undefined) {
    const next = { ...(existing.rows[0].path_inputs || {}), isPreferred: true };
    await pool.query(
      `UPDATE underwriting_structure_paths SET path_inputs = $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(next), pathId]
    );
    const siblings = await pool.query(
      `SELECT id, path_inputs FROM underwriting_structure_paths WHERE model_id = $1 AND id <> $2`,
      [modelId, pathId]
    );
    for (const sib of siblings.rows) {
      const inputs = { ...(sib.path_inputs || {}), isPreferred: false };
      await pool.query(
        `UPDATE underwriting_structure_paths SET path_inputs = $1::jsonb, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(inputs), sib.id]
      );
    }
  }
  return serializeModel(modelId);
}

export async function deletePath(userId, modelId, pathId) {
  await requireModelWrite(userId, modelId);
  const row = await pool.query(
    `SELECT id, is_baseline FROM underwriting_structure_paths WHERE id = $1 AND model_id = $2`,
    [pathId, modelId]
  );
  if (!row.rows.length) {
    const err = new Error('Path not found');
    err.status = 404;
    throw err;
  }
  const count = await pool.query(
    'SELECT COUNT(*)::int AS n FROM underwriting_structure_paths WHERE model_id = $1',
    [modelId]
  );
  if (count.rows[0].n <= 1) {
    const err = new Error('Cannot delete the only structure path');
    err.status = 400;
    throw err;
  }
  await pool.query('DELETE FROM underwriting_structure_paths WHERE id = $1', [pathId]);
  if (row.rows[0].is_baseline) {
    await pool.query(
      `UPDATE underwriting_structure_paths SET is_baseline = TRUE
       WHERE id = (
         SELECT id FROM underwriting_structure_paths WHERE model_id = $1 ORDER BY sort_order ASC LIMIT 1
       )`,
      [modelId]
    );
  }
  return serializeModel(modelId);
}

export async function saveRevision(userId, modelId, { label, changeSummary } = {}) {
  await requireModelWrite(userId, modelId);
  const workbook = await serializeModel(modelId);
  const snapshot = {
    sharedInputs: workbook.sharedInputs,
    paths: workbook.paths,
    customSheets: workbook.customSheets,
    settings: workbook.settings,
    buyerType: workbook.buyerType,
    uiMode: workbook.uiMode
  };
  const ins = await pool.query(
    `INSERT INTO underwriting_revisions (model_id, label, change_summary, snapshot, outputs, created_by)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
     RETURNING id, created_at`,
    [
      modelId,
      label || `Revision ${new Date().toISOString().slice(0, 16)}`,
      changeSummary || null,
      JSON.stringify(snapshot),
      JSON.stringify(workbook.outputs),
      userId
    ]
  );
  console.log('[underwriting] revision saved', { modelId, revisionId: ins.rows[0].id });
  return serializeModel(modelId);
}

export async function upsertCustomSheet(userId, modelId, { id, name, rows, sortOrder } = {}) {
  await requireModelWrite(userId, modelId);
  if (id) {
    await pool.query(
      `UPDATE underwriting_custom_sheets
       SET name = COALESCE($1, name),
           rows = COALESCE($2::jsonb, rows),
           sort_order = COALESCE($3, sort_order),
           updated_at = NOW()
       WHERE id = $4 AND model_id = $5`,
      [
        name || null,
        rows !== undefined ? JSON.stringify(rows) : null,
        sortOrder ?? null,
        id,
        modelId
      ]
    );
  } else {
    const maxOrder = await pool.query(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM underwriting_custom_sheets WHERE model_id = $1',
      [modelId]
    );
    await pool.query(
      `INSERT INTO underwriting_custom_sheets (model_id, name, sort_order, rows)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [
        modelId,
        (name || 'Custom sheet').trim(),
        sortOrder ?? maxOrder.rows[0].next,
        JSON.stringify(rows || [])
      ]
    );
  }
  return serializeModel(modelId);
}

export async function deleteCustomSheet(userId, modelId, sheetId) {
  await requireModelWrite(userId, modelId);
  await pool.query(
    'DELETE FROM underwriting_custom_sheets WHERE id = $1 AND model_id = $2',
    [sheetId, modelId]
  );
  return serializeModel(modelId);
}

export async function upsertEvidenceLink(userId, modelId, payload = {}) {
  await requireModelWrite(userId, modelId);
  const inputPath = (payload.inputPath || '').trim();
  if (!inputPath) {
    const err = new Error('inputPath required');
    err.status = 400;
    throw err;
  }
  if (payload.id) {
    await pool.query(
      `UPDATE underwriting_evidence_links
       SET dd_item_id = COALESCE($1, dd_item_id),
           deal_document_id = COALESCE($2, deal_document_id),
           status = COALESCE($3, status),
           notes = COALESCE($4, notes),
           updated_at = NOW()
       WHERE id = $5 AND model_id = $6`,
      [
        payload.ddItemId ?? null,
        payload.dealDocumentId ?? null,
        payload.status || null,
        payload.notes ?? null,
        payload.id,
        modelId
      ]
    );
  } else {
    await pool.query(
      `INSERT INTO underwriting_evidence_links
         (model_id, input_path, dd_item_id, deal_document_id, status, notes)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        modelId,
        inputPath,
        payload.ddItemId || null,
        payload.dealDocumentId || null,
        payload.status || 'requested',
        payload.notes || null
      ]
    );
  }
  return serializeModel(modelId);
}

export async function requestEvidenceViaDd(userId, modelId, { inputPath, title } = {}) {
  const model = await requireModelWrite(userId, modelId);
  const { startChecklistFromTemplate, addDdGroup, addDdItem, getChecklistForDeal } = await import('./ddChecklistService.js');
  let checklist = await getChecklistForDeal(userId, model.saved_deal_id);
  if (!checklist) {
    checklist = await startChecklistFromTemplate(userId, model.saved_deal_id, {});
  }
  let group = (checklist.groups || []).find((g) =>
    /financial|qoe|quality/i.test(g.name || '')
  );
  if (!group) {
    checklist = await addDdGroup(userId, model.saved_deal_id, { name: 'Financial & QoE' });
    group = (checklist.groups || []).find((g) => g.name === 'Financial & QoE') || checklist.groups?.[0];
  }
  const itemTitle = (title || `Evidence for ${inputPath}`).trim();
  checklist = await addDdItem(userId, model.saved_deal_id, group.id, {
    title: itemTitle,
    requestsDocument: true
  });
  const created = (checklist.groups || [])
    .flatMap((g) => g.items || [])
    .find((i) => i.title === itemTitle);
  return upsertEvidenceLink(userId, modelId, {
    inputPath,
    ddItemId: created?.id || null,
    status: 'requested',
    notes: 'Requested from underwriting'
  });
}

export async function createShareLink(userId, modelId, { label, password, expiresAt, preferredPathId } = {}) {
  await requireModelWrite(userId, modelId);
  const token = crypto.randomBytes(24).toString('hex');
  const passwordHash = password ? await bcrypt.hash(String(password), 10) : null;
  const ins = await pool.query(
    `INSERT INTO underwriting_share_links
       (model_id, token, label, password_hash, expires_at, preferred_path_id, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, token, created_at`,
    [
      modelId,
      token,
      label || 'Underwriting share',
      passwordHash,
      expiresAt || null,
      preferredPathId || null,
      userId
    ]
  );
  return {
    id: ins.rows[0].id,
    token: ins.rows[0].token,
    createdAt: ins.rows[0].created_at
  };
}

export async function revokeShareLink(userId, modelId, linkId) {
  await requireModelWrite(userId, modelId);
  await pool.query(
    `UPDATE underwriting_share_links SET revoked_at = NOW()
     WHERE id = $1 AND model_id = $2`,
    [linkId, modelId]
  );
  return serializeModel(modelId);
}

export async function getPublicUnderwriting(token, { password } = {}) {
  const row = await pool.query(
    `SELECT sl.*, m.saved_deal_id, m.shared_inputs, m.settings, m.buyer_type, m.ui_mode,
            d.name AS deal_name
     FROM underwriting_share_links sl
     JOIN underwriting_models m ON m.id = sl.model_id
     JOIN saved_deals d ON d.id = m.saved_deal_id
     WHERE sl.token = $1`,
    [token]
  );
  if (!row.rows.length || row.rows[0].revoked_at) {
    const err = new Error('Share link not found');
    err.status = 404;
    throw err;
  }
  const link = row.rows[0];
  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    const err = new Error('Share link expired');
    err.status = 410;
    throw err;
  }
  if (link.password_hash) {
    const ok = password && await bcrypt.compare(String(password), link.password_hash);
    if (!ok) {
      const err = new Error('Password required');
      err.status = 401;
      throw err;
    }
  }
  const workbook = await serializeModel(link.model_id);
  return {
    dealName: link.deal_name,
    label: link.label,
    preferredPathId: link.preferred_path_id,
    workbook
  };
}

/**
 * Import parsed sheet data (already extracted to JSON) with user-confirmed mappings.
 * mappings: [{ mapsTo, value, sourceLabel }]
 * unmappedSheets: [{ name, rows: [{ label, value, note }] }]
 */
const PATH_IMPORT_KEYS = new Set([
  'purchasePrice',
  'equityPercent',
  'sbaPercent',
  'sellerPercent',
  'sbaRate',
  'sbaTermYears',
  'sellerRate',
  'sellerTermYears',
  'exitMultiple',
  'exitMultiple2',
  'preferredReturnPercent',
  'investorProfitShare',
  'sponsorProfitShare',
  'startingRevenue',
  'startingEbitda',
  'ebitdaMargin',
  'workingCapitalInjection',
  'closingCosts'
]);

export async function applyWorkbookImport(userId, modelId, { mappings = [], unmappedSheets = [], fileName } = {}) {
  await requireModelWrite(userId, modelId);
  const modelRes = await pool.query(
    'SELECT shared_inputs FROM underwriting_models WHERE id = $1',
    [modelId]
  );
  const shared = { ...(modelRes.rows[0]?.shared_inputs || {}) };
  const pathPatch = {};
  const dealCosts = { ...(shared.dealCosts || {}) };
  const histByYear = new Map((shared.historicals || []).map((h) => [h.year, { ...h }]));

  for (const m of mappings) {
    if (!m.mapsTo) continue;
    const n = Number(m.value);
    if (!Number.isFinite(n)) continue;

    if (m.mapsTo === 'dealCostQoe') dealCosts.qoe = n;
    else if (m.mapsTo === 'dealCostLegal') dealCosts.legal = n;
    else if (m.mapsTo === 'dealCostDd') dealCosts.dd = n;
    else if (m.mapsTo === 'dealCostClosing') dealCosts.closing = n;
    else if (m.mapsTo === 'growthRate') {
      const curve = [...(shared.growthCurve || [0.05, 0.04, 0.03])];
      curve[0] = n > 1 ? n / 100 : n;
      shared.growthCurve = curve;
    } else if (m.mapsTo === 'historicalRevenue' || m.mapsTo === 'historicalTaxRevenue') {
      const year = Number(m.yearHint) || new Date().getFullYear() - 1;
      const row = histByYear.get(year) || {
        year,
        revenue: { value: 0, source: 'workbook_import', verified: false },
        cogs: { value: 0, source: 'manual', verified: false },
        opex: { value: 0, source: 'manual', verified: false },
        other: { value: 0, source: 'manual', verified: false },
        ownerSalaryAddback: { value: 0, source: 'manual', verified: false },
        taxReturnRevenue: { value: 0, source: 'manual', verified: false },
        taxReturnEbitda: { value: 0, source: 'manual', verified: false },
        addbacks: []
      };
      if (m.mapsTo === 'historicalRevenue') {
        row.revenue = { value: n, source: 'workbook_import', verified: false };
      } else {
        row.taxReturnRevenue = { value: n, source: 'workbook_import', verified: false };
      }
      histByYear.set(year, row);
    } else {
      shared[m.mapsTo] = n;
      if (PATH_IMPORT_KEYS.has(m.mapsTo)) pathPatch[m.mapsTo] = n;
    }

    shared[`${m.mapsTo}__meta`] = {
      source: 'workbook_import',
      verified: false,
      importLabel: m.sourceLabel || fileName || null
    };
  }

  shared.dealCosts = dealCosts;
  const closingSum =
    (Number(dealCosts.qoe) || 0) +
    (Number(dealCosts.legal) || 0) +
    (Number(dealCosts.dd) || 0) +
    (Number(dealCosts.closing) || 0);
  if (closingSum > 0) {
    shared.closingCosts = closingSum;
    pathPatch.closingCosts = closingSum;
    pathPatch.dealCosts = dealCosts;
  }
  if (histByYear.size) {
    shared.historicals = [...histByYear.values()].sort((a, b) => a.year - b.year);
  }

  await pool.query(
    `UPDATE underwriting_models SET shared_inputs = $1::jsonb, updated_at = NOW() WHERE id = $2`,
    [JSON.stringify(shared), modelId]
  );

  if (Object.keys(pathPatch).length) {
    const baseline = await pool.query(
      `SELECT id, path_inputs FROM underwriting_structure_paths
       WHERE model_id = $1 ORDER BY is_baseline DESC, sort_order ASC LIMIT 1`,
      [modelId]
    );
    if (baseline.rows[0]) {
      const next = { ...(baseline.rows[0].path_inputs || {}), ...pathPatch };
      await pool.query(
        `UPDATE underwriting_structure_paths SET path_inputs = $1::jsonb, updated_at = NOW() WHERE id = $2`,
        [JSON.stringify(next), baseline.rows[0].id]
      );
    }
  }

  for (const sheet of unmappedSheets) {
    if (!sheet?.name) continue;
    await pool.query(
      `INSERT INTO underwriting_custom_sheets (model_id, name, rows)
       VALUES ($1, $2, $3::jsonb)`,
      [
        modelId,
        (sheet.name || 'Imported sheet').slice(0, 120),
        JSON.stringify(sheet.rows || [])
      ]
    );
  }

  await saveRevision(userId, modelId, {
    label: `Imported from ${fileName || 'B-SOIL.xlsx'}`,
    changeSummary: `${mappings.length} mapped fields, ${unmappedSheets.length} custom sheets · provenance workbook_import`
  });
  console.log('[underwriting] import applied', { modelId, mappings: mappings.length, fileName });
  return serializeModel(modelId);
}

export async function getModelForDeal(userId, savedDealId) {
  return getOrCreateForDeal(userId, savedDealId);
}
