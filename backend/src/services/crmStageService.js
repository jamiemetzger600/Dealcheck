import pool from '../db/pool.js';
import { PIPELINE_STAGES } from '../constants/pipelineStages.js';
import { suggestedTaskForStage } from '../constants/stageTaskSuggestions.js';
import { matchIndustryKey, isFranchiseTagged } from '../lib/industryMatcher.js';
import {
  getDealAccess,
  assertCanWrite,
  stageChangeNeedsApproval
} from '../lib/teamAcl.js';
import { sendEmail } from './emailService.js';

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

async function notifyTeamAdmins(teamId, subject, html) {
  try {
    const admins = await pool.query(
      `SELECT u.email FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = $1 AND tm.status = 'active' AND tm.role = 'admin'`,
      [teamId]
    );
    for (const row of admins.rows) {
      await sendEmail({ to: row.email, subject, html }).catch((err) => {
        console.warn('[crmStage] admin notify failed:', err.message);
      });
    }
  } catch (err) {
    console.warn('[crmStage] notifyTeamAdmins error:', err.message);
  }
}

async function notifyUser(userId, subject, html) {
  try {
    const row = await pool.query(`SELECT email FROM users WHERE id = $1`, [userId]);
    const email = row.rows[0]?.email;
    if (!email) return;
    await sendEmail({ to: email, subject, html });
  } catch (err) {
    console.warn('[crmStage] notifyUser failed:', err.message);
  }
}

/**
 * Apply stage update assuming ACL already validated (or approval just granted).
 */
async function applyStageUpdate(actorUserId, deal, newStage, previousStage) {
  const trimmed = newStage == null ? '' : String(newStage).trim();
  if (trimmed && !PIPELINE_STAGES.includes(trimmed)) {
    throw new Error('Invalid pipeline stage');
  }

  const history = normalizeProgressHistory(deal.progress_history);
  const timestamp = new Date().toISOString();
  const newHistory = trimmed
    ? [...history, { stage: trimmed, timestamp }]
    : history;

  await pool.query(
    `UPDATE saved_deals
     SET progress_stage = $1, progress_history = $2::jsonb, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [trimmed || null, JSON.stringify(newHistory), deal.id]
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
      actorUserId,
      deal.id,
      body,
      JSON.stringify({ previousStage: previousStage || null, newStage: trimmed || null })
    ]
  );

  if (deal.team_id) {
    await pool.query(
      `INSERT INTO deal_messages (saved_deal_id, author_user_id, body, message_kind)
       VALUES ($1, $2, $3, 'system')`,
      [deal.id, actorUserId, body]
    );
  }

  console.log(`[crmStage] deal=${deal.id} ${previousStage || '(none)'} -> ${trimmed || '(cleared)'}`);

  const industryKey = isFranchiseTagged(deal.industry)
    ? 'franchise'
    : matchIndustryKey(deal.industry);

  let queuedTask = null;
  if (trimmed) {
    try {
      const { ensureStageNudge } = await import('./crmNudgeService.js');
      const queued = await ensureStageNudge(actorUserId, deal.id, trimmed, deal.industry);
      queuedTask = queued?.task
        ? { id: queued.task.id, title: queued.task.title || suggestedTaskForStage(trimmed, industryKey), created: queued.created }
        : null;
    } catch (err) {
      console.warn('[crmStage] stage nudge skipped:', err.message);
    }
  }

  return {
    savedDealId: deal.id,
    progressStage: trimmed || null,
    progressHistory: newHistory,
    previousStage: previousStage || null,
    suggestedTask: trimmed ? suggestedTaskForStage(trimmed, industryKey) : null,
    queuedTask,
    suggestedIndustryKey: industryKey
  };
}

/**
 * Update pipeline stage with team ACL + approval gating.
 * Pass null or '' for newStage to clear stage (move to unstaged).
 */
export async function updateDealPipelineStage(userId, savedDealId, newStage, { previousStage: prevOverride } = {}) {
  const trimmed = newStage == null ? '' : String(newStage).trim();
  const access = await getDealAccess(userId, savedDealId);
  assertCanWrite(access);

  const deal = await pool.query(
    `SELECT id, user_id, team_id, progress_stage, progress_history, name, industry
     FROM saved_deals WHERE id = $1`,
    [savedDealId]
  ).then((r) => r.rows[0]);

  if (!deal) {
    const err = new Error('Deal not found');
    err.status = 404;
    throw err;
  }

  const previousStage = prevOverride !== undefined ? prevOverride : (deal.progress_stage || '');

  if (trimmed && !PIPELINE_STAGES.includes(trimmed)) {
    throw new Error('Invalid pipeline stage');
  }

  if (previousStage === trimmed) {
    return { savedDealId, progressStage: trimmed || null, unchanged: true };
  }

  if (stageChangeNeedsApproval(access, trimmed)) {
    // Cancel other pending stage approvals for this deal
    await pool.query(
      `UPDATE deal_approvals SET status = 'rejected', reviewed_at = NOW(), note = 'Superseded'
       WHERE saved_deal_id = $1 AND status = 'pending' AND action_type = 'stage_change'`,
      [savedDealId]
    );

    const approval = await pool.query(
      `INSERT INTO deal_approvals (
         saved_deal_id, team_id, requested_by, action_type, from_value, to_value, status
       ) VALUES ($1, $2, $3, 'stage_change', $4, $5, 'pending')
       RETURNING id, status, to_value, from_value, created_at`,
      [savedDealId, deal.team_id, userId, previousStage || null, trimmed || null]
    );

    await pool.query(
      `INSERT INTO deal_messages (saved_deal_id, author_user_id, body, message_kind)
       VALUES ($1, $2, $3, 'system')`,
      [
        savedDealId,
        userId,
        `Requested approval: "${previousStage || 'Inbox'}" → "${trimmed || 'Inbox'}"`
      ]
    );

    const requester = await pool.query(`SELECT email FROM users WHERE id = $1`, [userId]);
    await notifyTeamAdmins(
      deal.team_id,
      `Approval needed: ${deal.name || 'Deal'}`,
      `<p>${requester.rows[0]?.email || 'A teammate'} requested moving <strong>${deal.name || 'a deal'}</strong> to <strong>${trimmed}</strong>.</p>
       <p>Open Vettr CRM Today to approve or reject.</p>`
    );

    console.log(`[crmStage] deal=${savedDealId} approval requested -> ${trimmed}`);
    return {
      savedDealId,
      progressStage: previousStage || null,
      pendingApproval: approval.rows[0],
      needsApproval: true
    };
  }

  return applyStageUpdate(userId, deal, trimmed, previousStage);
}

/** Called when Admin approves a pending stage change. */
export async function applyApprovedStageChange(adminUserId, approval, note) {
  const deal = await pool.query(
    `SELECT id, user_id, team_id, progress_stage, progress_history, name, industry
     FROM saved_deals WHERE id = $1`,
    [approval.saved_deal_id]
  ).then((r) => r.rows[0]);

  if (!deal) {
    const err = new Error('Deal not found');
    err.status = 404;
    throw err;
  }

  await pool.query(
    `UPDATE deal_approvals
     SET status = 'approved', reviewed_by = $1, reviewed_at = NOW(), note = $2
     WHERE id = $3`,
    [adminUserId, note, approval.id]
  );

  const result = await applyStageUpdate(
    approval.requested_by,
    deal,
    approval.to_value,
    approval.from_value || deal.progress_stage || ''
  );

  await pool.query(
    `INSERT INTO deal_messages (saved_deal_id, author_user_id, body, message_kind)
     VALUES ($1, $2, $3, 'system')`,
    [
      deal.id,
      adminUserId,
      `Approved stage change to "${approval.to_value}"${note ? `: ${note}` : ''}`
    ]
  );

  await notifyUser(
    approval.requested_by,
    `Approved: ${deal.name || 'Deal'} → ${approval.to_value}`,
    `<p>Your request to move <strong>${deal.name || 'a deal'}</strong> to <strong>${approval.to_value}</strong> was approved.</p>
     ${note ? `<p>Note: ${note}</p>` : ''}`
  );

  return result;
}

/** Notify requester that Admin rejected their stage change. */
export async function notifyApprovalRejected(approval, dealName, note) {
  await notifyUser(
    approval.requested_by,
    `Rejected: ${dealName || 'Deal'} → ${approval.to_value}`,
    `<p>Your request to move <strong>${dealName || 'a deal'}</strong> to <strong>${approval.to_value}</strong> was rejected.</p>
     ${note ? `<p>Note: ${note}</p>` : ''}`
  );
}
