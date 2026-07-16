import crypto from 'crypto';
import bcrypt from 'bcrypt';
import pool from '../db/pool.js';
import { sendEmail } from '../services/emailService.js';
import {
  TEAM_SEAT_CAP,
  TEAM_ROLES,
  INVITE_TTL_DAYS,
  INVITE_EXPIRES_DAY_OPTIONS
} from '../constants/teams.js';
import {
  listUserTeams,
  getMembership,
  countActiveMembers,
  getDealAccess,
  assertCanRead,
  assertCanApprove
} from '../lib/teamAcl.js';

function webAppBase() {
  // Invite tokens live in the DB of the API that created them. Local .env often
  // sets WEB_APP_URL to production for CORS — that must not mint prod accept URLs
  // for local invites (prod won't have the token or the /teams/accept route yet).
  if (process.env.NODE_ENV !== 'production') {
    const local = process.env.WEB_APP_URL_LOCAL || 'http://localhost:5173';
    return local.split(',')[0].trim().replace(/\/+$/, '');
  }
  const raw = process.env.WEB_APP_URL || 'http://localhost:5173';
  return raw.split(',')[0].trim().replace(/\/+$/, '');
}

function buildAcceptUrl(token) {
  return `${webAppBase()}/teams/accept?token=${token}`;
}

/** Short public tracking id shown in Settings (e.g. A3F2B1C9). */
function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

function resolveExpiresAt(expiresInDays) {
  const days = Number(expiresInDays);
  const allowed = INVITE_EXPIRES_DAY_OPTIONS.includes(days) ? days : INVITE_TTL_DAYS;
  return new Date(Date.now() + allowed * 24 * 60 * 60 * 1000);
}

async function assertSeatAvailable(teamId) {
  const activeCount = await countActiveMembers(teamId);
  const pendingInvites = await pool.query(
    `SELECT COUNT(*)::int AS n FROM team_invites
     WHERE team_id = $1 AND accepted_at IS NULL AND expires_at > NOW()`,
    [teamId]
  );
  if (activeCount + pendingInvites.rows[0].n >= TEAM_SEAT_CAP) {
    const err = new Error(`Team seat cap is ${TEAM_SEAT_CAP}. Remove a member or invite first.`);
    err.status = 400;
    throw err;
  }
}

function mapInviteRow(row) {
  return {
    id: row.id,
    code: row.invite_code || null,
    email: row.email,
    role: row.role,
    inviteKind: row.invite_kind || 'email',
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    hasPassword: Boolean(row.password_hash),
    acceptUrl: buildAcceptUrl(row.token),
    label: row.invite_kind === 'link' ? 'Anyone with link' : row.email
  };
}

async function assertAdmin(userId, teamId) {
  const m = await getMembership(userId, teamId);
  if (!m || m.role !== 'admin') {
    const err = new Error('Admin access required');
    err.status = 403;
    throw err;
  }
  return m;
}

export const listTeams = async (req, res) => {
  try {
    const teams = await listUserTeams(req.user.userId);
    res.json({ teams, seatCap: TEAM_SEAT_CAP });
  } catch (error) {
    console.error('[teams] listTeams error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const createTeam = async (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name || name.length > 120) {
    return res.status(400).json({ error: 'Team name required (max 120 chars)' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const teamResult = await client.query(
      `INSERT INTO teams (name, created_by) VALUES ($1, $2)
       RETURNING id, name, created_by, created_at`,
      [name, req.user.userId]
    );
    const team = teamResult.rows[0];
    await client.query(
      `INSERT INTO team_members (team_id, user_id, role, status)
       VALUES ($1, $2, 'admin', 'active')`,
      [team.id, req.user.userId]
    );
    await client.query('COMMIT');
    console.log(`[teams] created team=${team.id} by user=${req.user.userId}`);
    res.status(201).json({
      team: { ...team, role: 'admin', member_count: 1 }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[teams] createTeam error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

export const getTeam = async (req, res) => {
  try {
    const teamId = Number(req.params.teamId);
    const membership = await getMembership(req.user.userId, teamId);
    if (!membership) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const members = await pool.query(
      `SELECT tm.user_id, tm.role, tm.status, tm.joined_at, u.email
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = $1 AND tm.status = 'active'
       ORDER BY tm.role ASC, u.email ASC`,
      [teamId]
    );

    const invites = await pool.query(
      `SELECT id, email, role, invite_kind, invite_code, token, expires_at, created_at,
              password_hash
       FROM team_invites
       WHERE team_id = $1 AND accepted_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [teamId]
    );

    res.json({
      team: {
        id: teamId,
        name: membership.team_name,
        role: membership.role
      },
      members: members.rows,
      invites: membership.role === 'admin' ? invites.rows.map(mapInviteRow) : [],
      seatCap: TEAM_SEAT_CAP
    });
  } catch (error) {
    console.error('[teams] getTeam error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const inviteMember = async (req, res) => {
  const teamId = Number(req.params.teamId);
  const email = String(req.body?.email || '').trim().toLowerCase();
  const role = String(req.body?.role || 'member').trim();

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  if (!TEAM_ROLES.includes(role) || role === 'admin') {
    // Phase 1: invite as member or viewer only (one admin = creator)
    if (role !== 'member' && role !== 'viewer') {
      return res.status(400).json({ error: 'Role must be member or viewer' });
    }
  }

  try {
    await assertAdmin(req.user.userId, teamId);
    await assertSeatAvailable(teamId);

    if (email === String(req.user.email || '').toLowerCase()) {
      return res.status(400).json({ error: 'Cannot invite yourself' });
    }

    const existingUser = await pool.query(
      `SELECT id FROM users WHERE LOWER(email) = $1`,
      [email]
    );
    if (existingUser.rows[0]) {
      const already = await getMembership(existingUser.rows[0].id, teamId);
      if (already) {
        return res.status(400).json({ error: 'User is already on this team' });
      }
    }

    const token = crypto.randomBytes(24).toString('hex');
    const inviteCode = generateInviteCode();
    const expiresAt = resolveExpiresAt(INVITE_TTL_DAYS);

    await pool.query(
      `DELETE FROM team_invites
       WHERE team_id = $1 AND LOWER(email) = $2 AND accepted_at IS NULL`,
      [teamId, email]
    );

    const invite = await pool.query(
      `INSERT INTO team_invites
         (team_id, email, role, token, invited_by, expires_at, invite_kind, invite_code)
       VALUES ($1, $2, $3, $4, $5, $6, 'email', $7)
       RETURNING id, email, role, invite_kind, invite_code, token, expires_at, created_at, password_hash`,
      [teamId, email, role, token, req.user.userId, expiresAt, inviteCode]
    );

    const teamRow = await pool.query(`SELECT name FROM teams WHERE id = $1`, [teamId]);
    const teamName = teamRow.rows[0]?.name || 'a Vettr team';
    const acceptUrl = buildAcceptUrl(token);

    try {
      await sendEmail({
        to: email,
        subject: `You're invited to ${teamName} on Vettr`,
        html: `
          <p>You've been invited to join <strong>${teamName}</strong> on Vettr as a <strong>${role}</strong>.</p>
          <p><a href="${acceptUrl}">Accept invite</a></p>
          <p>Or sign in to Vettr and open this link: ${acceptUrl}</p>
          <p>This invite expires in ${INVITE_TTL_DAYS} days.</p>
        `
      });
    } catch (mailErr) {
      console.warn('[teams] invite email failed:', mailErr.message);
    }

    console.log(`[teams] invited ${email} to team=${teamId} as ${role}`);
    res.status(201).json({
      invite: mapInviteRow(invite.rows[0])
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[teams] inviteMember error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/** Single-use invite link — any signed-in user can accept (no email required). */
export const createInviteLink = async (req, res) => {
  const teamId = Number(req.params.teamId);
  const role = String(req.body?.role || 'member').trim();
  const passwordRaw = req.body?.password != null ? String(req.body.password) : '';
  const password = passwordRaw.trim();

  if (role !== 'member' && role !== 'viewer') {
    return res.status(400).json({ error: 'Role must be member or viewer' });
  }
  if (password && password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }
  if (password.length > 72) {
    return res.status(400).json({ error: 'Password too long' });
  }

  try {
    await assertAdmin(req.user.userId, teamId);
    await assertSeatAvailable(teamId);

    const token = crypto.randomBytes(24).toString('hex');
    const inviteCode = generateInviteCode();
    const expiresAt = resolveExpiresAt(req.body?.expiresInDays);
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    const invite = await pool.query(
      `INSERT INTO team_invites
         (team_id, email, role, token, invited_by, expires_at, invite_kind, invite_code, password_hash)
       VALUES ($1, NULL, $2, $3, $4, $5, 'link', $6, $7)
       RETURNING id, email, role, invite_kind, invite_code, token, expires_at, created_at, password_hash`,
      [teamId, role, token, req.user.userId, expiresAt, inviteCode, passwordHash]
    );

    const mapped = mapInviteRow(invite.rows[0]);
    console.log(
      `[teams] link invite team=${teamId} code=${mapped.code} role=${role} expires=${expiresAt.toISOString()} password=${Boolean(passwordHash)} url=${mapped.acceptUrl}`
    );
    res.status(201).json({ invite: mapped });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[teams] createInviteLink error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const revokeInvite = async (req, res) => {
  const teamId = Number(req.params.teamId);
  const inviteId = Number(req.params.inviteId);
  try {
    await assertAdmin(req.user.userId, teamId);
    const result = await pool.query(
      `DELETE FROM team_invites
       WHERE id = $1 AND team_id = $2 AND accepted_at IS NULL
       RETURNING id`,
      [inviteId, teamId]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Invite not found' });
    }
    console.log(`[teams] revoked invite=${inviteId} team=${teamId}`);
    res.json({ revoked: true });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[teams] revokeInvite error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const acceptInvite = async (req, res) => {
  const token = String(req.body?.token || req.query?.token || '').trim();
  const password = req.body?.password != null ? String(req.body.password) : '';
  if (!token) {
    return res.status(400).json({ error: 'Invite token required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const inviteResult = await client.query(
      `SELECT * FROM team_invites WHERE token = $1 FOR UPDATE`,
      [token]
    );
    const invite = inviteResult.rows[0];
    if (!invite || invite.accepted_at) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Invite not found or already used' });
    }
    if (new Date(invite.expires_at) < new Date()) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invite expired' });
    }

    if (invite.password_hash) {
      if (!password) {
        await client.query('ROLLBACK');
        return res.status(403).json({
          error: 'Password required',
          requiresPassword: true,
          code: invite.invite_code || null
        });
      }
      const ok = await bcrypt.compare(password, invite.password_hash);
      if (!ok) {
        await client.query('ROLLBACK');
        console.warn(`[teams] bad invite password code=${invite.invite_code}`);
        return res.status(403).json({ error: 'Incorrect invite password', requiresPassword: true });
      }
    }

    const userEmail = String(req.user.email || '').toLowerCase();
    const isLinkInvite = invite.invite_kind === 'link' || !invite.email;
    if (!isLinkInvite && userEmail !== String(invite.email).toLowerCase()) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        error: `Sign in as ${invite.email} to accept this invite`
      });
    }

    const existingMember = await getMembership(req.user.userId, invite.team_id);
    if (existingMember) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'You are already on this team' });
    }

    const activeCount = await countActiveMembers(invite.team_id);
    if (activeCount >= TEAM_SEAT_CAP) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: `Team is full (${TEAM_SEAT_CAP} seats)` });
    }

    await client.query(
      `INSERT INTO team_members (team_id, user_id, role, status)
       VALUES ($1, $2, $3, 'active')
       ON CONFLICT (team_id, user_id) DO UPDATE
         SET role = EXCLUDED.role, status = 'active', joined_at = NOW()`,
      [invite.team_id, req.user.userId, invite.role]
    );
    await client.query(
      `UPDATE team_invites SET accepted_at = NOW() WHERE id = $1`,
      [invite.id]
    );
    await client.query('COMMIT');

    const team = await pool.query(`SELECT id, name FROM teams WHERE id = $1`, [invite.team_id]);
    console.log(`[teams] user=${req.user.userId} accepted invite team=${invite.team_id}`);
    res.json({
      team: team.rows[0],
      role: invite.role
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[teams] acceptInvite error:', error);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
};

export const removeMember = async (req, res) => {
  const teamId = Number(req.params.teamId);
  const targetUserId = Number(req.params.userId);
  try {
    await assertAdmin(req.user.userId, teamId);
    if (targetUserId === req.user.userId) {
      return res.status(400).json({ error: 'Cannot remove yourself as admin' });
    }
    const result = await pool.query(
      `UPDATE team_members SET status = 'removed'
       WHERE team_id = $1 AND user_id = $2 AND status = 'active'
       RETURNING user_id`,
      [teamId, targetUserId]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Member not found' });
    }
    res.json({ removed: true, userId: targetUserId });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[teams] removeMember error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/** Promote personal deal into a team (share). */
export const shareDealToTeam = async (req, res) => {
  const teamId = Number(req.params.teamId);
  const savedDealId = Number(req.params.dealId);
  try {
    const membership = await getMembership(req.user.userId, teamId);
    if (!membership || (membership.role !== 'admin' && membership.role !== 'member')) {
      return res.status(403).json({ error: 'Members can share deals into the team' });
    }

    const access = await getDealAccess(req.user.userId, savedDealId);
    assertCanRead(access);
    if (access.deal.team_id) {
      return res.status(400).json({ error: 'Deal is already on a team' });
    }
    if (access.deal.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Only the deal owner can share it' });
    }

    await pool.query(
      `UPDATE saved_deals
       SET team_id = $1, shared_by_user_id = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $2 AND team_id IS NULL`,
      [teamId, req.user.userId, savedDealId]
    );

    await pool.query(
      `INSERT INTO deal_messages (saved_deal_id, author_user_id, body, message_kind)
       VALUES ($1, $2, $3, 'system')`,
      [savedDealId, req.user.userId, `${req.user.email || 'Someone'} shared this deal with the team`]
    );

    console.log(`[teams] deal=${savedDealId} shared to team=${teamId}`);
    res.json({ shared: true, teamId, savedDealId });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[teams] shareDealToTeam error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/** Remove deal from team → back to original owner personal. */
export const unshareDeal = async (req, res) => {
  const savedDealId = Number(req.params.dealId);
  try {
    const access = await getDealAccess(req.user.userId, savedDealId);
    assertCanRead(access);
    if (!access.deal.team_id) {
      return res.status(400).json({ error: 'Deal is not on a team' });
    }
    if (!access.canUnshare) {
      return res.status(403).json({ error: 'Only admin or sharer can unshare' });
    }

    const ownerId = access.deal.user_id;
    await pool.query(
      `UPDATE saved_deals
       SET team_id = NULL, shared_by_user_id = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [savedDealId]
    );

    await pool.query(
      `INSERT INTO deal_messages (saved_deal_id, author_user_id, body, message_kind)
       VALUES ($1, $2, $3, 'system')`,
      [savedDealId, req.user.userId, `${req.user.email || 'Someone'} removed this deal from the team`]
    );

    console.log(`[teams] deal=${savedDealId} unshared; owner=${ownerId}`);
    res.json({ unshared: true, savedDealId, ownerId });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[teams] unshareDeal error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const listPendingApprovals = async (req, res) => {
  const teamId = Number(req.query.teamId) || null;
  try {
    const teams = await listUserTeams(req.user.userId);
    const adminTeamIds = teams.filter((t) => t.role === 'admin').map((t) => t.id);
    if (!adminTeamIds.length) {
      return res.json({ approvals: [] });
    }
    const filterIds = teamId && adminTeamIds.includes(teamId) ? [teamId] : adminTeamIds;

    const result = await pool.query(
      `SELECT a.id, a.saved_deal_id, a.team_id, a.requested_by, a.action_type,
              a.from_value, a.to_value, a.status, a.created_at,
              sd.name AS deal_name, u.email AS requester_email
       FROM deal_approvals a
       JOIN saved_deals sd ON sd.id = a.saved_deal_id
       JOIN users u ON u.id = a.requested_by
       WHERE a.status = 'pending' AND a.team_id = ANY($1::int[])
       ORDER BY a.created_at ASC`,
      [filterIds]
    );
    res.json({ approvals: result.rows });
  } catch (error) {
    console.error('[teams] listPendingApprovals error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const reviewApproval = async (req, res) => {
  const approvalId = Number(req.params.approvalId);
  const decision = String(req.body?.decision || '').trim(); // approve | reject
  const note = req.body?.note != null ? String(req.body.note).trim() : null;

  if (decision !== 'approve' && decision !== 'reject') {
    return res.status(400).json({ error: 'decision must be approve or reject' });
  }

  try {
    const row = await pool.query(
      `SELECT * FROM deal_approvals WHERE id = $1`,
      [approvalId]
    );
    const approval = row.rows[0];
    if (!approval || approval.status !== 'pending') {
      return res.status(404).json({ error: 'Pending approval not found' });
    }

    const access = await getDealAccess(req.user.userId, approval.saved_deal_id);
    assertCanApprove(access);

    if (decision === 'reject') {
      await pool.query(
        `UPDATE deal_approvals
         SET status = 'rejected', reviewed_by = $1, reviewed_at = NOW(), note = $2
         WHERE id = $3`,
        [req.user.userId, note, approvalId]
      );
      await pool.query(
        `INSERT INTO deal_messages (saved_deal_id, author_user_id, body, message_kind)
         VALUES ($1, $2, $3, 'system')`,
        [
          approval.saved_deal_id,
          req.user.userId,
          `Rejected stage change to "${approval.to_value}"${note ? `: ${note}` : ''}`
        ]
      );
      const dealName = await pool.query(
        `SELECT name FROM saved_deals WHERE id = $1`,
        [approval.saved_deal_id]
      );
      const { notifyApprovalRejected } = await import('../services/crmStageService.js');
      await notifyApprovalRejected(approval, dealName.rows[0]?.name, note);
      return res.json({ status: 'rejected' });
    }

    // Approve: apply stage via CRM stage service (imported dynamically to avoid cycles)
    const { applyApprovedStageChange } = await import('../services/crmStageService.js');
    const result = await applyApprovedStageChange(
      req.user.userId,
      approval,
      note
    );
    res.json({ status: 'approved', ...result });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[teams] reviewApproval error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
