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
  // Always use WEB_APP_URL so invite links point at the live app (e.g. vettr.pages.dev).
  // Optional WEB_APP_URL_LOCAL overrides only when explicitly set (local-only testing).
  const raw =
    process.env.WEB_APP_URL_LOCAL ||
    process.env.WEB_APP_URL ||
    'http://localhost:5173';
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

async function countActiveAdmins(teamId) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS n FROM team_members
     WHERE team_id = $1 AND status = 'active' AND role = 'admin'`,
    [teamId]
  );
  return result.rows[0]?.n || 0;
}

function parseInviteRole(raw, { allowAdmin = true } = {}) {
  const role = String(raw || 'member').trim();
  if (!TEAM_ROLES.includes(role)) {
    return { error: 'Role must be admin, member, or viewer' };
  }
  if (role === 'admin' && !allowAdmin) {
    return { error: 'Role must be member or viewer' };
  }
  return { role };
}

/**
 * Copy a personal saved deal onto a team workspace.
 * Personal row is left unchanged so it stays in My Deals.
 */
async function copyPersonalDealToTeam({
  savedDealId,
  teamId,
  sharedByUserId,
  actorUserId,
  message
}) {
  const src = await pool.query(
    `SELECT * FROM saved_deals WHERE id = $1 AND team_id IS NULL`,
    [savedDealId]
  );
  const deal = src.rows[0];
  if (!deal) {
    const err = new Error('Personal deal not found');
    err.status = 404;
    throw err;
  }

  const dup = await pool.query(
    `SELECT id FROM saved_deals WHERE team_id = $1 AND deal_id = $2`,
    [teamId, deal.deal_id]
  );
  if (dup.rows[0]) {
    const err = new Error('This listing is already on the team');
    err.status = 400;
    throw err;
  }

  const inserted = await pool.query(
    `INSERT INTO saved_deals (
      user_id, deal_id, name, url, description, broker, broker_name, broker_company,
      broker_email, broker_phone, source, source_type, discovered_at,
      asking_price, ebitda, revenue, location, city, state, county, country,
      industry, years_established, franchise, remote, listing_id,
      notes, status, progress_stage, progress_history, calculator_state,
      team_id, shared_by_user_id, market_deal_id, listing_snapshot_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13,
      $14, $15, $16, $17, $18, $19, $20, $21,
      $22, $23, $24, $25, $26,
      $27, $28, $29, $30, $31,
      $32, $33, $34, $35
    ) RETURNING id`,
    [
      deal.user_id,
      deal.deal_id,
      deal.name,
      deal.url,
      deal.description,
      deal.broker,
      deal.broker_name,
      deal.broker_company,
      deal.broker_email,
      deal.broker_phone,
      deal.source,
      deal.source_type,
      deal.discovered_at,
      deal.asking_price,
      deal.ebitda,
      deal.revenue,
      deal.location,
      deal.city,
      deal.state,
      deal.county,
      deal.country,
      deal.industry,
      deal.years_established,
      deal.franchise,
      deal.remote,
      deal.listing_id,
      deal.notes,
      deal.status,
      deal.progress_stage,
      deal.progress_history || [],
      deal.calculator_state,
      teamId,
      sharedByUserId,
      deal.market_deal_id,
      deal.listing_snapshot_at
    ]
  );
  const teamSavedDealId = inserted.rows[0].id;
  const actor = actorUserId || sharedByUserId;
  const body = message || 'Deal shared with the team';

  await pool.query(
    `INSERT INTO deal_messages (saved_deal_id, author_user_id, body, message_kind)
     VALUES ($1, $2, $3, 'system')`,
    [teamSavedDealId, actor, body]
  );
  await pool.query(
    `INSERT INTO deal_messages (saved_deal_id, author_user_id, body, message_kind)
     VALUES ($1, $2, $3, 'system')`,
    [savedDealId, actor, body]
  );

  return { teamSavedDealId, personalSavedDealId: savedDealId, dealId: deal.deal_id };
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
  const parsed = parseInviteRole(req.body?.role || 'member');
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }
  const role = parsed.role;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' });
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
  const parsed = parseInviteRole(req.body?.role || 'member');
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }
  const role = parsed.role;
  const passwordRaw = req.body?.password != null ? String(req.body.password) : '';
  const password = passwordRaw.trim();
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
    const target = await getMembership(targetUserId, teamId);
    if (!target) {
      return res.status(404).json({ error: 'Member not found' });
    }
    if (target.role === 'admin') {
      const adminCount = await countActiveAdmins(teamId);
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot remove the last admin. Promote another admin first.' });
      }
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
    console.log(`[teams] removed user=${targetUserId} from team=${teamId}`);
    res.json({ removed: true, userId: targetUserId });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[teams] removeMember error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/** Admin can change member roles (supports multiple admins). */
export const updateMemberRole = async (req, res) => {
  const teamId = Number(req.params.teamId);
  const targetUserId = Number(req.params.userId);
  const parsed = parseInviteRole(req.body?.role);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }
  const role = parsed.role;

  try {
    await assertAdmin(req.user.userId, teamId);
    const target = await getMembership(targetUserId, teamId);
    if (!target) {
      return res.status(404).json({ error: 'Member not found' });
    }
    if (target.role === 'admin' && role !== 'admin') {
      const adminCount = await countActiveAdmins(teamId);
      if (adminCount <= 1) {
        return res.status(400).json({ error: 'Cannot demote the last admin. Promote another admin first.' });
      }
    }
    await pool.query(
      `UPDATE team_members SET role = $1
       WHERE team_id = $2 AND user_id = $3 AND status = 'active'`,
      [role, teamId, targetUserId]
    );
    console.log(`[teams] user=${targetUserId} role=${role} on team=${teamId}`);
    res.json({ updated: true, userId: targetUserId, role });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[teams] updateMemberRole error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/** Promote personal deal into a team (share). Admins share immediately; members need admin approval. */
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
      return res.status(400).json({ error: 'Open the personal copy of this deal to share it' });
    }
    if (access.deal.user_id !== req.user.userId) {
      return res.status(403).json({ error: 'Only the deal owner can share it' });
    }

    // Admin: copy onto team immediately (personal deal stays)
    if (membership.role === 'admin') {
      const copied = await copyPersonalDealToTeam({
        savedDealId,
        teamId,
        sharedByUserId: req.user.userId,
        actorUserId: req.user.userId,
        message: `${req.user.email || 'Someone'} shared this deal with the team`
      });
      console.log(
        `[teams] deal=${savedDealId} copied to team=${teamId} as ${copied.teamSavedDealId} by admin`
      );
      return res.json({
        shared: true,
        pending: false,
        teamId,
        savedDealId,
        teamSavedDealId: copied.teamSavedDealId
      });
    }

    // Member: queue for admin approval (deal stays personal until approved)
    const existing = await pool.query(
      `SELECT id FROM deal_approvals
       WHERE saved_deal_id = $1 AND team_id = $2 AND action_type = 'share' AND status = 'pending'`,
      [savedDealId, teamId]
    );
    if (existing.rows[0]) {
      return res.status(400).json({ error: 'Share already pending admin approval' });
    }

    const approval = await pool.query(
      `INSERT INTO deal_approvals (
         saved_deal_id, team_id, requested_by, action_type, from_value, to_value, status
       ) VALUES ($1, $2, $3, 'share', 'personal', $4, 'pending')
       RETURNING id, saved_deal_id, team_id, action_type, status, created_at`,
      [savedDealId, teamId, req.user.userId, membership.team_name || String(teamId)]
    );

    await pool.query(
      `INSERT INTO deal_messages (saved_deal_id, author_user_id, body, message_kind)
       VALUES ($1, $2, $3, 'system')`,
      [
        savedDealId,
        req.user.userId,
        `${req.user.email || 'Someone'} requested to share this deal with the team (pending admin approval)`
      ]
    );

    console.log(`[teams] deal=${savedDealId} share pending approval team=${teamId}`);
    res.status(202).json({
      shared: false,
      pending: true,
      approval: approval.rows[0],
      teamId,
      savedDealId
    });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[teams] shareDealToTeam error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/** Remove the team copy of a deal. Personal copy is left alone. */
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
    const result = await pool.query(
      `DELETE FROM saved_deals
       WHERE id = $1 AND team_id IS NOT NULL
       RETURNING id, deal_id, team_id`,
      [savedDealId]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Team deal not found' });
    }

    console.log(
      `[teams] deal=${savedDealId} removed from team=${result.rows[0].team_id}; personal owner=${ownerId}`
    );
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

    // Share approvals: deal is still personal — authorize via team admin, not deal ACL
    if (approval.action_type === 'share') {
      await assertAdmin(req.user.userId, approval.team_id);

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
            `Rejected share to team${note ? `: ${note}` : ''}`
          ]
        );
        console.log(`[teams] share approval=${approvalId} rejected`);
        return res.json({ status: 'rejected' });
      }

      const dealRow = await pool.query(
        `SELECT id, team_id, user_id, deal_id FROM saved_deals WHERE id = $1`,
        [approval.saved_deal_id]
      );
      const deal = dealRow.rows[0];
      if (!deal) {
        return res.status(404).json({ error: 'Deal not found' });
      }

      let teamSavedDealId = null;
      if (!deal.team_id) {
        try {
          const copied = await copyPersonalDealToTeam({
            savedDealId: approval.saved_deal_id,
            teamId: approval.team_id,
            sharedByUserId: approval.requested_by,
            actorUserId: req.user.userId,
            message: `${req.user.email || 'Admin'} approved sharing this deal with the team`
          });
          teamSavedDealId = copied.teamSavedDealId;
        } catch (copyErr) {
          // Already on team from a race / prior share — still clear the approval
          if (copyErr.status !== 400) throw copyErr;
          console.warn(`[teams] share approval=${approvalId}: ${copyErr.message}`);
        }
      }
      await pool.query(
        `UPDATE deal_approvals
         SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), note = $2
         WHERE id = $3`,
        [req.user.userId, note, approvalId]
      );
      console.log(
        `[teams] share approval=${approvalId} approved personal=${approval.saved_deal_id} teamCopy=${teamSavedDealId}`
      );
      return res.json({
        status: 'approved',
        shared: true,
        savedDealId: approval.saved_deal_id,
        teamSavedDealId
      });
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

function sanitizeDeedBoardPrefs(raw) {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const order = Array.isArray(src.order)
    ? [...new Set(src.order.map((id) => String(id)).filter(Boolean))].slice(0, 2000)
    : [];
  const pins = {};
  if (src.pins && typeof src.pins === 'object' && !Array.isArray(src.pins)) {
    for (const [key, value] of Object.entries(src.pins)) {
      if (value) pins[String(key)] = true;
    }
  }
  const colors = {};
  if (src.colors && typeof src.colors === 'object' && !Array.isArray(src.colors)) {
    for (const [key, value] of Object.entries(src.colors)) {
      const id = String(value || '').slice(0, 40);
      if (id) colors[String(key)] = id;
    }
  }
  const waitingOn = {};
  if (src.waitingOn && typeof src.waitingOn === 'object' && !Array.isArray(src.waitingOn)) {
    for (const [key, value] of Object.entries(src.waitingOn)) {
      if (!value || typeof value !== 'object') continue;
      waitingOn[String(key)] = {
        active: Array.isArray(value.active) ? value.active.map(String).slice(0, 40) : [],
        custom: Array.isArray(value.custom)
          ? value.custom
            .filter((item) => item && item.label)
            .slice(0, 20)
            .map((item) => ({
              id: String(item.id || '').slice(0, 40),
              label: String(item.label).slice(0, 80)
            }))
          : []
      };
    }
  }
  return { order, pins, colors, waitingOn };
}

export const getDeedBoardPrefs = async (req, res) => {
  try {
    const teamId = Number(req.params.teamId);
    const membership = await getMembership(req.user.userId, teamId);
    if (!membership) {
      return res.status(404).json({ error: 'Team not found' });
    }
    const result = await pool.query(
      `SELECT deed_board_prefs, deed_board_prefs_updated_at
       FROM teams WHERE id = $1`,
      [teamId]
    );
    const row = result.rows[0];
    if (!row) {
      return res.status(404).json({ error: 'Team not found' });
    }
    const prefs = sanitizeDeedBoardPrefs(row.deed_board_prefs);
    console.log('[teams] deed-board get', teamId, {
      order: prefs.order.length,
      pins: Object.keys(prefs.pins).length
    });
    res.json({
      prefs,
      updatedAt: row.deed_board_prefs_updated_at || null
    });
  } catch (error) {
    console.error('[teams] getDeedBoardPrefs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const putDeedBoardPrefs = async (req, res) => {
  try {
    const teamId = Number(req.params.teamId);
    const membership = await getMembership(req.user.userId, teamId);
    if (!membership) {
      return res.status(404).json({ error: 'Team not found' });
    }
    if (membership.role === 'viewer') {
      return res.status(403).json({ error: 'Viewer cannot edit the team board' });
    }
    const prefs = sanitizeDeedBoardPrefs(req.body?.prefs);
    const result = await pool.query(
      `UPDATE teams
       SET deed_board_prefs = $2::jsonb,
           deed_board_prefs_updated_at = NOW(),
           deed_board_prefs_updated_by = $3,
           updated_at = NOW()
       WHERE id = $1
       RETURNING deed_board_prefs, deed_board_prefs_updated_at`,
      [teamId, JSON.stringify(prefs), req.user.userId]
    );
    const row = result.rows[0];
    console.log('[teams] deed-board put', teamId, {
      userId: req.user.userId,
      order: prefs.order.length,
      pins: Object.keys(prefs.pins).length
    });
    res.json({
      prefs: sanitizeDeedBoardPrefs(row.deed_board_prefs),
      updatedAt: row.deed_board_prefs_updated_at || null
    });
  } catch (error) {
    console.error('[teams] putDeedBoardPrefs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
