import pool from '../db/pool.js';
import { getMembership } from '../lib/teamAcl.js';

export async function listSavedViews(userId, { teamId = null } = {}) {
  const result = await pool.query(
    `SELECT id, user_id, team_id, name, view_type, filters, is_shared, created_at, updated_at
     FROM crm_saved_views
     WHERE user_id = $1
        OR (is_shared = true AND team_id IS NOT NULL AND EXISTS (
              SELECT 1 FROM team_members tm
              WHERE tm.team_id = crm_saved_views.team_id
                AND tm.user_id = $1 AND tm.status = 'active'
            ))
        OR ($2::int IS NOT NULL AND team_id = $2 AND (
              user_id = $1 OR is_shared = true
            ))
     ORDER BY name`,
    [userId, teamId]
  );
  return result.rows;
}

export async function createSavedView(userId, { name, viewType = 'deals', filters = {}, teamId = null, isShared = false }) {
  const trimmed = (name || '').trim();
  if (!trimmed) {
    const err = new Error('View name is required');
    err.status = 400;
    throw err;
  }
  if (teamId) {
    const membership = await getMembership(userId, teamId);
    if (!membership) {
      const err = new Error('Not a team member');
      err.status = 403;
      throw err;
    }
  }
  const result = await pool.query(
    `INSERT INTO crm_saved_views (user_id, team_id, name, view_type, filters, is_shared)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6)
     RETURNING *`,
    [userId, teamId, trimmed, viewType || 'deals', JSON.stringify(filters || {}), Boolean(isShared)]
  );
  console.log('[crmViews] created', result.rows[0].id, trimmed);
  return result.rows[0];
}

export async function updateSavedView(userId, viewId, patch) {
  const existing = await pool.query('SELECT * FROM crm_saved_views WHERE id = $1', [viewId]);
  if (!existing.rows.length) {
    const err = new Error('View not found');
    err.status = 404;
    throw err;
  }
  if (Number(existing.rows[0].user_id) !== Number(userId)) {
    const err = new Error('Only the view owner can edit it');
    err.status = 403;
    throw err;
  }
  const result = await pool.query(
    `UPDATE crm_saved_views SET
       name = COALESCE($1, name),
       filters = COALESCE($2::jsonb, filters),
       is_shared = COALESCE($3, is_shared),
       updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [
      patch.name != null ? String(patch.name).trim() : null,
      patch.filters !== undefined ? JSON.stringify(patch.filters) : null,
      patch.isShared !== undefined ? Boolean(patch.isShared) : null,
      viewId
    ]
  );
  return result.rows[0];
}

export async function deleteSavedView(userId, viewId) {
  const existing = await pool.query('SELECT * FROM crm_saved_views WHERE id = $1', [viewId]);
  if (!existing.rows.length) {
    const err = new Error('View not found');
    err.status = 404;
    throw err;
  }
  if (Number(existing.rows[0].user_id) !== Number(userId)) {
    const err = new Error('Only the view owner can delete it');
    err.status = 403;
    throw err;
  }
  await pool.query('DELETE FROM crm_saved_views WHERE id = $1', [viewId]);
  return { deleted: true };
}

/** Built-in views — no DB rows needed. */
export function getBuiltinViews() {
  return [
    { id: 'builtin_mine', name: 'My deals', view_type: 'deals', filters: { owner: 'me' }, builtin: true },
    { id: 'builtin_team', name: 'Team deals', view_type: 'deals', filters: { scope: 'team' }, builtin: true },
    { id: 'builtin_unstaged', name: 'Inbox (unstaged)', view_type: 'deals', filters: { unstaged: true }, builtin: true },
    { id: 'builtin_my_tasks', name: 'My tasks', view_type: 'tasks', filters: { assignee: 'me' }, builtin: true },
    { id: 'builtin_team_tasks', name: 'Team tasks', view_type: 'tasks', filters: { assignee: 'team' }, builtin: true }
  ];
}
