import pool from '../db/pool.js';
import { isGatedStage } from '../constants/teams.js';

/**
 * Active membership for a user on a team, or null.
 */
export async function getMembership(userId, teamId) {
  if (!userId || !teamId) return null;
  const result = await pool.query(
    `SELECT tm.id, tm.team_id, tm.user_id, tm.role, tm.status, t.name AS team_name
     FROM team_members tm
     JOIN teams t ON t.id = tm.team_id
     WHERE tm.user_id = $1 AND tm.team_id = $2 AND tm.status = 'active'`,
    [userId, teamId]
  );
  return result.rows[0] || null;
}

export async function listUserTeams(userId) {
  const result = await pool.query(
    `SELECT t.id, t.name, t.created_by, t.created_at, tm.role,
            (SELECT COUNT(*)::int FROM team_members m
             WHERE m.team_id = t.id AND m.status = 'active') AS member_count
     FROM team_members tm
     JOIN teams t ON t.id = tm.team_id
     WHERE tm.user_id = $1 AND tm.status = 'active'
     ORDER BY t.name ASC`,
    [userId]
  );
  return result.rows;
}

/**
 * Load a saved deal and compute access for userId.
 * @returns {{ deal, membership, canRead, canWrite, canShare, canUnshare, canApprove, canAdmin, role }}
 */
export async function getDealAccess(userId, savedDealId) {
  const result = await pool.query(
    `SELECT id, user_id, team_id, shared_by_user_id, name, notes, progress_stage,
            progress_history, status, updated_at
     FROM saved_deals WHERE id = $1`,
    [savedDealId]
  );
  const deal = result.rows[0];
  if (!deal) {
    return {
      deal: null,
      membership: null,
      canRead: false,
      canWrite: false,
      canShare: false,
      canUnshare: false,
      canApprove: false,
      canAdmin: false,
      role: null
    };
  }

  const isOwner = deal.user_id === userId;
  const isPersonal = !deal.team_id;

  if (isPersonal) {
    return {
      deal,
      membership: null,
      canRead: isOwner,
      canWrite: isOwner,
      canShare: isOwner,
      canUnshare: false,
      canApprove: false,
      canAdmin: false,
      role: isOwner ? 'owner' : null
    };
  }

  const membership = await getMembership(userId, deal.team_id);
  if (!membership) {
    return {
      deal,
      membership: null,
      canRead: false,
      canWrite: false,
      canShare: false,
      canUnshare: false,
      canApprove: false,
      canAdmin: false,
      role: null
    };
  }

  const role = membership.role;
  const canAdmin = role === 'admin';
  const canWrite = role === 'admin' || role === 'member';
  const canUnshare =
    canAdmin || deal.shared_by_user_id === userId || (isOwner && canWrite);

  return {
    deal,
    membership,
    canRead: true,
    canWrite,
    canShare: false,
    canUnshare,
    canApprove: canAdmin,
    canAdmin,
    role
  };
}

export function assertCanRead(access) {
  if (!access?.canRead) {
    const err = new Error('Deal not found');
    err.status = 404;
    throw err;
  }
}

export function assertCanWrite(access) {
  assertCanRead(access);
  if (!access.canWrite) {
    const err = new Error('Read-only access');
    err.status = 403;
    throw err;
  }
}

export function assertCanTalk(access) {
  assertCanRead(access);
  // Viewers can post in Talk
}

export function assertCanApprove(access) {
  assertCanRead(access);
  if (!access.canApprove) {
    const err = new Error('Admin approval required');
    err.status = 403;
    throw err;
  }
}

/**
 * Load deal access and assert read or write. Returns access (with deal).
 * Replaces personal-only `assertDealOwned` patterns.
 */
export async function requireDealAccess(userId, savedDealId, { write = false } = {}) {
  const access = await getDealAccess(userId, savedDealId);
  if (write) assertCanWrite(access);
  else assertCanRead(access);
  return access;
}

/**
 * Whether a stage change on this deal needs an approval request.
 */
export function stageChangeNeedsApproval(access, newStage) {
  if (!access.deal?.team_id) return false;
  if (access.canApprove) return false; // Admin applies immediately
  if (!access.canWrite) return false; // Viewers can't change stage at all
  return isGatedStage(newStage);
}

/**
 * SQL fragment: deals visible to user (personal + all team deals).
 * Params start at $1 = userId. Alias saved_deals as `sd`.
 */
export const VISIBLE_DEALS_SQL = `
  (
    (sd.user_id = $1 AND sd.team_id IS NULL)
    OR (
      sd.team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = sd.team_id
          AND tm.user_id = $1
          AND tm.status = 'active'
      )
    )
  )
`;

/**
 * Same visibility without requiring `sd` alias (table is `saved_deals`).
 */
export const VISIBLE_SAVED_DEALS_SQL = `
  (
    (saved_deals.user_id = $1 AND saved_deals.team_id IS NULL)
    OR (
      saved_deals.team_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = saved_deals.team_id
          AND tm.user_id = $1
          AND tm.status = 'active'
      )
    )
  )
`;

/**
 * Scope filter for list endpoints.
 * @param {'personal'|'team'|'all'} scope
 * @param {number|null} teamId
 */
export function dealsScopeClause(scope, teamId, userIdParam = 1, teamIdParam = 2) {
  if (scope === 'team' && teamId) {
    return {
      sql: `team_id = $${teamIdParam} AND EXISTS (
        SELECT 1 FROM team_members tm
        WHERE tm.team_id = saved_deals.team_id
          AND tm.user_id = $${userIdParam}
          AND tm.status = 'active'
      )`,
      params: [teamId]
    };
  }
  if (scope === 'personal') {
    return {
      sql: `user_id = $${userIdParam} AND team_id IS NULL`,
      params: []
    };
  }
  // all visible
  return {
    sql: `(
      (user_id = $${userIdParam} AND team_id IS NULL)
      OR (
        team_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM team_members tm
          WHERE tm.team_id = saved_deals.team_id
            AND tm.user_id = $${userIdParam}
            AND tm.status = 'active'
        )
      )
    )`,
    params: []
  };
}

export async function countActiveMembers(teamId) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS n FROM team_members
     WHERE team_id = $1 AND status = 'active'`,
    [teamId]
  );
  return result.rows[0]?.n || 0;
}

export async function getUserDisplay(userId) {
  const result = await pool.query(
    `SELECT id, email FROM users WHERE id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}
