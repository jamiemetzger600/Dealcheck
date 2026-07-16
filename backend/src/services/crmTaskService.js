import pool from '../db/pool.js';
import {
  getDealAccess,
  assertCanRead,
  assertCanWrite,
  VISIBLE_DEALS_SQL
} from '../lib/teamAcl.js';

const FOLLOW_UP_PRESETS = {
  tomorrow: 1,
  '3days': 3,
  '1week': 7
};

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
}

/** Team-ACL aware deal gate (name kept for existing imports). */
export async function assertDealOwned(userId, savedDealId, { write = true } = {}) {
  const access = await getDealAccess(userId, savedDealId);
  if (write) assertCanWrite(access);
  else assertCanRead(access);
  return {
    id: access.deal.id,
    name: access.deal.name,
    team_id: access.deal.team_id,
    user_id: access.deal.user_id
  };
}

async function resolveNotifyRecipients(userId, savedDealId, rawRecipients) {
  if (!Array.isArray(rawRecipients) || rawRecipients.length === 0) {
    return [{ type: 'self', channels: ['in_app', 'email'] }];
  }

  const resolved = [];
  for (const r of rawRecipients) {
    if (r.type === 'self') {
      resolved.push({ type: 'self', channels: ['in_app', 'email'] });
      continue;
    }
    if (r.type === 'contact' && r.contactId) {
      const row = await pool.query(
        `SELECT c.id, c.name, c.email
         FROM contacts c
         JOIN deal_contacts dc ON dc.contact_id = c.id
         WHERE dc.saved_deal_id = $1 AND c.id = $2`,
        [savedDealId, r.contactId]
      );
      const contact = row.rows[0];
      if (contact?.email) {
        resolved.push({
          type: 'contact',
          contactId: contact.id,
          email: contact.email.trim().toLowerCase(),
          name: contact.name || null,
          channels: ['email']
        });
      }
      continue;
    }
    if (r.type === 'email' && r.email) {
      const email = String(r.email).trim().toLowerCase();
      if (email) {
        resolved.push({
          type: 'email',
          email,
          name: r.name ? String(r.name).trim() : null,
          channels: ['email']
        });
      }
    }
  }

  if (!resolved.length) {
    return [{ type: 'self', channels: ['in_app', 'email'] }];
  }
  return resolved;
}

async function createRemindersForTask(userId, savedDealId, taskId, dueAt, recipients) {
  if (!dueAt) return;

  for (const recipient of recipients) {
    const channels = recipient.channels || (recipient.type === 'self' ? ['in_app', 'email'] : ['email']);
    const recipientEmail = recipient.type === 'self' ? null : recipient.email || null;
    const recipientName = recipient.type === 'self' ? null : recipient.name || null;
    const recipientContactId = recipient.contactId || null;

    for (const channel of channels) {
      if (channel === 'in_app' && recipient.type !== 'self') continue;

      await pool.query(
        `INSERT INTO reminders (
           user_id, saved_deal_id, task_id, remind_at, channel,
           recipient_email, recipient_name, recipient_contact_id
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          userId,
          savedDealId,
          taskId,
          dueAt,
          channel,
          recipientEmail,
          recipientName,
          recipientContactId
        ]
      );
    }
  }
}

export async function listAllTasks(userId, { status = 'open' } = {}) {
  let statusClause = "AND t.status = 'open'";
  if (status === 'done') statusClause = "AND t.status = 'done'";
  else if (status === 'all') statusClause = '';

  const result = await pool.query(
    `SELECT t.id, t.saved_deal_id, t.title, t.status, t.due_at, t.completed_at, t.source, t.metadata, t.created_at,
            sd.name AS deal_name, sd.progress_stage
     FROM tasks t
     JOIN saved_deals sd ON sd.id = t.saved_deal_id
     WHERE ${VISIBLE_DEALS_SQL} ${statusClause}
     ORDER BY
       CASE WHEN t.status = 'open' THEN 0 ELSE 1 END,
       t.due_at ASC NULLS LAST,
       t.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function listDealTasks(userId, savedDealId) {
  await assertDealOwned(userId, savedDealId, { write: false });
  const result = await pool.query(
    `SELECT id, saved_deal_id, title, status, due_at, completed_at, source, metadata, created_at, user_id
     FROM tasks
     WHERE saved_deal_id = $1
     ORDER BY due_at ASC NULLS LAST, created_at DESC`,
    [savedDealId]
  );
  return result.rows;
}

export async function createTask(
  userId,
  savedDealId,
  { title, dueAt, source = 'manual', metadata = {}, notifyRecipients }
) {
  const deal = await assertDealOwned(userId, savedDealId, { write: true });
  const trimmed = (title || '').trim();
  if (!trimmed) {
    const err = new Error('Task title is required');
    err.status = 400;
    throw err;
  }

  const recipients = await resolveNotifyRecipients(userId, savedDealId, notifyRecipients);
  const taskMetadata = {
    ...metadata,
    notifyRecipients: recipients.map(({ type, email, name, contactId }) => ({
      type,
      email: email || null,
      name: name || null,
      contactId: contactId || null
    }))
  };

  const result = await pool.query(
    `INSERT INTO tasks (user_id, saved_deal_id, title, due_at, source, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, savedDealId, trimmed, dueAt || null, source, JSON.stringify(taskMetadata)]
  );

  const task = result.rows[0];

  if (dueAt) {
    await createRemindersForTask(userId, savedDealId, task.id, dueAt, recipients);
  }

  await pool.query(
    `INSERT INTO activities (user_id, saved_deal_id, activity_type, body, metadata)
     VALUES ($1, $2, 'task_created', $3, $4)`,
    [
      userId,
      savedDealId,
      `Task: ${trimmed}`,
      JSON.stringify({ taskId: task.id, dueAt: dueAt || null, notifyRecipients: taskMetadata.notifyRecipients })
    ]
  );

  console.log(
    `[crmTask] created task=${task.id} deal=${savedDealId} (${deal.name}) recipients=${recipients.length}`
  );
  return task;
}

export async function createQuickFollowUp(
  userId,
  savedDealId,
  { preset, dueAt, title, notifyRecipients }
) {
  const days = FOLLOW_UP_PRESETS[preset];
  const resolvedDue = dueAt || (days != null ? addDays(days) : addDays(3));
  const deal = await assertDealOwned(userId, savedDealId, { write: true });
  const taskTitle = (title || '').trim() || `Follow up: ${deal.name}`;
  return createTask(userId, savedDealId, {
    title: taskTitle,
    dueAt: resolvedDue,
    source: preset ? 'follow_up_chip' : 'follow_up_custom',
    metadata: { preset: preset || 'custom' },
    notifyRecipients
  });
}

export async function updateTask(userId, taskId, patch) {
  const existing = await pool.query('SELECT * FROM tasks WHERE id = $1', [taskId]);
  if (!existing.rows.length) {
    const err = new Error('Task not found');
    err.status = 404;
    throw err;
  }

  const task = existing.rows[0];
  await assertDealOwned(userId, task.saved_deal_id, { write: true });

  const title = patch.title != null ? String(patch.title).trim() : task.title;
  const status = patch.status != null ? patch.status : task.status;
  const dueAt = patch.dueAt !== undefined ? patch.dueAt : task.due_at;
  const completedAt =
    status === 'done' && task.status !== 'done'
      ? new Date().toISOString()
      : status === 'done'
        ? task.completed_at
        : null;

  const result = await pool.query(
    `UPDATE tasks SET title = $1, status = $2, due_at = $3, completed_at = $4
     WHERE id = $5 RETURNING *`,
    [title, status, dueAt, completedAt, taskId]
  );

  if (status === 'done' && task.status !== 'done') {
    await pool.query(
      `INSERT INTO activities (user_id, saved_deal_id, activity_type, body, metadata)
       VALUES ($1, $2, 'task_completed', $3, $4)`,
      [userId, task.saved_deal_id, `Completed: ${title}`, JSON.stringify({ taskId })]
    );
  }

  return result.rows[0];
}

export async function getTodayTaskSummary(userId) {
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const result = await pool.query(
    `SELECT t.id, t.saved_deal_id, t.title, t.status, t.due_at, t.source,
            sd.name AS deal_name, sd.progress_stage
     FROM tasks t
     JOIN saved_deals sd ON sd.id = t.saved_deal_id
     WHERE ${VISIBLE_DEALS_SQL} AND t.status = 'open'
     ORDER BY t.due_at ASC NULLS LAST, t.created_at DESC`,
    [userId]
  );

  const open = result.rows;
  const overdue = [];
  const dueToday = [];
  const upcoming = [];

  for (const task of open) {
    if (!task.due_at) {
      upcoming.push(task);
      continue;
    }
    const due = new Date(task.due_at);
    if (due < startOfDay) overdue.push(task);
    else if (due <= endOfDay) dueToday.push(task);
    else upcoming.push(task);
  }

  return {
    overdue,
    dueToday,
    upcoming,
    openCount: open.length,
    badgeCount: overdue.length + dueToday.length
  };
}
