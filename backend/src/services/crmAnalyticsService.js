import pool from '../db/pool.js';
import { KANBAN_COLUMNS, kanbanColumnForStage, UNSTAGED_KEY } from '../constants/pipelineStages.js';

export async function getCrmFunnelAnalytics(userId) {
  const deals = await pool.query(
    `SELECT id, progress_stage, saved_at, updated_at FROM saved_deals WHERE user_id = $1`,
    [userId]
  );

  const byColumn = Object.fromEntries(KANBAN_COLUMNS.map((c) => [c.id, 0]));
  let unstaged = 0;

  for (const row of deals.rows) {
    const col = kanbanColumnForStage(row.progress_stage);
    if (col.id === UNSTAGED_KEY) unstaged += 1;
    else byColumn[col.id] = (byColumn[col.id] || 0) + 1;
  }

  const openTasks = await pool.query(
    `SELECT COUNT(*)::int AS n FROM tasks WHERE user_id = $1 AND status = 'open'`,
    [userId]
  );

  const ddActive = await pool.query(
    `SELECT COUNT(*)::int AS n FROM dd_checklists c
     JOIN saved_deals sd ON sd.id = c.saved_deal_id AND sd.user_id = $1
     WHERE c.completed_at IS NULL`,
    [userId]
  );

  return {
    totalDeals: deals.rows.length,
    unstaged,
    byColumn: KANBAN_COLUMNS.map((c) => ({
      id: c.id,
      label: c.label,
      count: byColumn[c.id] || 0
    })),
    openTasks: openTasks.rows[0]?.n ?? 0,
    activeDdChecklists: ddActive.rows[0]?.n ?? 0
  };
}
