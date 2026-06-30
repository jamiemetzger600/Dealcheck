import pool from '../db/pool.js';

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

export async function assertDealOwned(userId, savedDealId) {
  const row = await pool.query(
    'SELECT id, name FROM saved_deals WHERE user_id = $1 AND id = $2',
    [userId, savedDealId]
  );
  if (!row.rows.length) {
    const err = new Error('Deal not found');
    err.status = 404;
    throw err;
  }
  return row.rows[0];
}

export async function listDealTasks(userId, savedDealId) {
  await assertDealOwned(userId, savedDealId);
  const result = await pool.query(
    `SELECT id, saved_deal_id, title, status, due_at, completed_at, source, metadata, created_at
     FROM tasks
     WHERE user_id = $1 AND saved_deal_id = $2
     ORDER BY due_at ASC NULLS LAST, created_at DESC`,
    [userId, savedDealId]
  );
  return result.rows;
}

export async function createTask(userId, savedDealId, { title, dueAt, source = 'manual', metadata = {} }) {
  const deal = await assertDealOwned(userId, savedDealId);
  const trimmed = (title || '').trim();
  if (!trimmed) {
    const err = new Error('Task title is required');
    err.status = 400;
    throw err;
  }

  const result = await pool.query(
    `INSERT INTO tasks (user_id, saved_deal_id, title, due_at, source, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, savedDealId, trimmed, dueAt || null, source, JSON.stringify(metadata)]
  );

  const task = result.rows[0];

  if (dueAt) {
    await pool.query(
      `INSERT INTO reminders (user_id, saved_deal_id, task_id, remind_at, channel)
       VALUES ($1, $2, $3, $4, 'in_app')`,
      [userId, savedDealId, task.id, dueAt]
    );
  }

  await pool.query(
    `INSERT INTO activities (user_id, saved_deal_id, activity_type, body, metadata)
     VALUES ($1, $2, 'task_created', $3, $4)`,
    [
      userId,
      savedDealId,
      `Task: ${trimmed}`,
      JSON.stringify({ taskId: task.id, dueAt: dueAt || null })
    ]
  );

  console.log(`[crmTask] created task=${task.id} deal=${savedDealId} (${deal.name})`);
  return task;
}

export async function createQuickFollowUp(userId, savedDealId, { preset, dueAt, title }) {
  const days = FOLLOW_UP_PRESETS[preset];
  const resolvedDue = dueAt || (days != null ? addDays(days) : addDays(3));
  const deal = await assertDealOwned(userId, savedDealId);
  const taskTitle = (title || '').trim() || `Follow up: ${deal.name}`;
  return createTask(userId, savedDealId, {
    title: taskTitle,
    dueAt: resolvedDue,
    source: 'follow_up_chip',
    metadata: { preset: preset || 'custom' }
  });
}

export async function updateTask(userId, taskId, patch) {
  const existing = await pool.query(
    'SELECT * FROM tasks WHERE user_id = $1 AND id = $2',
    [userId, taskId]
  );
  if (!existing.rows.length) {
    const err = new Error('Task not found');
    err.status = 404;
    throw err;
  }

  const task = existing.rows[0];
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
     WHERE user_id = $5 AND id = $6 RETURNING *`,
    [title, status, dueAt, completedAt, userId, taskId]
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
     JOIN saved_deals sd ON sd.id = t.saved_deal_id AND sd.user_id = $1
     WHERE t.user_id = $1 AND t.status = 'open'
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
    badgeCount: overdue.length + dueToday.length
  };
}
