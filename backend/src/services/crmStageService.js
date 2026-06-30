import pool from '../db/pool.js';
import { PIPELINE_STAGES } from '../constants/pipelineStages.js';
import { suggestedTaskForStage } from '../constants/stageTaskSuggestions.js';

function normalizeProgressHistory(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Update pipeline stage, append history, log CRM activity.
 * Pass null or '' for newStage to clear stage (move to unstaged).
 */
export async function updateDealPipelineStage(userId, savedDealId, newStage, { previousStage: prevOverride } = {}) {
  const trimmed = newStage == null ? '' : String(newStage).trim();

  const row = await pool.query(
    `SELECT id, progress_stage, progress_history, name
     FROM saved_deals WHERE user_id = $1 AND id = $2`,
    [userId, savedDealId]
  );
  if (row.rows.length === 0) {
    const err = new Error('Deal not found');
    err.status = 404;
    throw err;
  }

  const deal = row.rows[0];
  const previousStage = prevOverride !== undefined ? prevOverride : (deal.progress_stage || '');

  if (trimmed && !PIPELINE_STAGES.includes(trimmed)) {
    throw new Error('Invalid pipeline stage');
  }

  if (previousStage === trimmed) {
    return { savedDealId, progressStage: trimmed || null, unchanged: true };
  }

  const history = normalizeProgressHistory(deal.progress_history);
  const timestamp = new Date().toISOString();
  const newHistory = trimmed
    ? [...history, { stage: trimmed, timestamp }]
    : history;

  await pool.query(
    `UPDATE saved_deals
     SET progress_stage = $1, progress_history = $2::jsonb, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $3 AND id = $4`,
    [trimmed || null, JSON.stringify(newHistory), userId, savedDealId]
  );

  const body = trimmed
    ? (previousStage
      ? `Moved from "${previousStage}" to "${trimmed}"`
      : `Set stage to "${trimmed}"`)
    : `Cleared stage (was "${previousStage}")`;

  await pool.query(
    `INSERT INTO activities (user_id, saved_deal_id, activity_type, body, metadata)
     VALUES ($1, $2, 'stage_change', $3, $4)`,
    [
      userId,
      savedDealId,
      body,
      JSON.stringify({ previousStage: previousStage || null, newStage: trimmed || null })
    ]
  );

  console.log(`[crmStage] deal=${savedDealId} ${previousStage || '(none)'} -> ${trimmed || '(cleared)'}`);

  return {
    savedDealId,
    progressStage: trimmed || null,
    progressHistory: newHistory,
    previousStage: previousStage || null,
    suggestedTask: trimmed ? suggestedTaskForStage(trimmed) : null
  };
}
