import pool from '../db/pool.js';
import { sendEmail } from './emailService.js';
import { isFeedbackAdminEmail, getFeedbackAdminEmails } from '../middleware/requireFeedbackAdmin.js';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_AUDIO_BYTES = 5 * 1024 * 1024;

const STATUS_LABELS = {
  new: 'Submitted',
  needs_info: 'Needs more info',
  in_progress: 'In progress',
  fixed: 'Fixed',
  wont_fix: 'Closed',
  closed: 'Closed',
};

const CATEGORIES = new Set(['bug', 'feedback', 'suggestion']);
const SEVERITIES = new Set(['low', 'normal', 'blocking']);
const STATUSES = new Set(['new', 'needs_info', 'in_progress', 'fixed', 'wont_fix', 'closed']);

function err(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

function decodeBase64Payload(dataBase64) {
  if (!dataBase64 || typeof dataBase64 !== 'string') return null;
  const cleaned = dataBase64.replace(/^data:[^;]+;base64,/, '');
  try {
    return Buffer.from(cleaned, 'base64');
  } catch {
    return null;
  }
}

function validateAttachment(att, { kind }) {
  if (!att || typeof att !== 'object') return null;
  const mimeType = String(att.mimeType || att.mime_type || '').slice(0, 100);
  const buf = decodeBase64Payload(att.dataBase64 || att.data_base64);
  if (!buf || !mimeType) return null;
  const max = kind === 'voice' ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES;
  if (buf.length > max) {
    throw err(400, `${kind} exceeds size limit (${Math.round(max / 1024 / 1024)}MB)`);
  }
  if (buf.length < 16) throw err(400, `${kind} payload too small`);
  return { kind, mimeType, data: buf, byteSize: buf.length };
}

function webAppBase() {
  const raw = (process.env.WEB_APP_URL || 'http://localhost:5173').split(',')[0].trim();
  return raw.replace(/\/+$/, '');
}

async function getUserEmail(userId) {
  const r = await pool.query(`SELECT email FROM users WHERE id = $1`, [userId]);
  return r.rows[0]?.email || null;
}

async function notifyAdmins({ subject, html }) {
  const emails = getFeedbackAdminEmails();
  if (!emails.length) {
    console.warn('[feedback] no FEEDBACK_ADMIN_EMAILS configured — skip admin email');
    return;
  }
  for (const to of emails) {
    try {
      await sendEmail({ to, subject, html });
    } catch (e) {
      console.error('[feedback] admin email failed:', e.message);
    }
  }
}

async function notifyUser(userId, { subject, html }) {
  const to = await getUserEmail(userId);
  if (!to) return;
  try {
    await sendEmail({ to, subject, html });
  } catch (e) {
    console.error('[feedback] user email failed:', e.message);
  }
}

function buildTitle({ category, body, pageUrl }) {
  const text = String(body || '').trim().replace(/\s+/g, ' ');
  if (text) return text.slice(0, 80);
  const path = (() => {
    try {
      return pageUrl ? new URL(pageUrl).pathname : '/dashboard';
    } catch {
      return '/dashboard';
    }
  })();
  const label = category === 'bug' ? 'Bug' : category === 'suggestion' ? 'Suggestion' : 'Feedback';
  return `${label} on ${path}`;
}

export function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

export async function createSubmission(userId, payload) {
  const category = String(payload.category || '').toLowerCase();
  if (!CATEGORIES.has(category)) throw err(400, 'Invalid category');

  let severity = String(payload.severity || 'normal').toLowerCase();
  if (category !== 'bug') severity = 'normal';
  else if (!SEVERITIES.has(severity)) throw err(400, 'Invalid severity');

  const body = String(payload.body || '').trim();
  const pageUrl = payload.pageUrl ? String(payload.pageUrl).slice(0, 2000) : null;
  const appVersion = payload.appVersion ? String(payload.appVersion).slice(0, 32) : null;
  const userAgent = payload.userAgent ? String(payload.userAgent).slice(0, 500) : null;
  const viewport = payload.viewport && typeof payload.viewport === 'object' ? payload.viewport : {};
  const metadata = payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {};

  const screenshot = payload.screenshot
    ? validateAttachment(payload.screenshot, { kind: 'screenshot' })
    : null;
  const voice = payload.voice
    ? validateAttachment(payload.voice, { kind: 'voice' })
    : null;

  if (!body && !screenshot && !voice) {
    throw err(400, 'Add a note, screenshot, or voice note');
  }

  const title = buildTitle({ category, body, pageUrl });
  const client = await pool.connect();
  let submissionId;
  try {
    await client.query('BEGIN');
    const sub = await client.query(
      `INSERT INTO feedback_submissions (
         user_id, category, severity, status, title,
         page_url, app_version, user_agent, viewport, metadata
       ) VALUES ($1,$2,$3,'new',$4,$5,$6,$7,$8::jsonb,$9::jsonb)
       RETURNING *`,
      [
        userId,
        category,
        severity,
        title,
        pageUrl,
        appVersion,
        userAgent,
        JSON.stringify(viewport),
        JSON.stringify(metadata),
      ]
    );
    submissionId = sub.rows[0].id;

    const msgBody = body || '(attachment only)';
    const msg = await client.query(
      `INSERT INTO feedback_messages (submission_id, author_user_id, body, message_kind)
       VALUES ($1, $2, $3, 'user')
       RETURNING id`,
      [submissionId, userId, msgBody]
    );
    const messageId = msg.rows[0].id;

    for (const att of [screenshot, voice].filter(Boolean)) {
      await client.query(
        `INSERT INTO feedback_attachments
           (submission_id, message_id, kind, mime_type, byte_size, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [submissionId, messageId, att.kind, att.mimeType, att.byteSize, att.data]
      );
    }

    await client.query(
      `INSERT INTO feedback_reads (user_id, submission_id, last_read_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, submission_id) DO UPDATE SET last_read_at = NOW()`,
      [userId, submissionId]
    );

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  console.log(`[feedback] created #${submissionId} category=${category} user=${userId}`);

  const link = `${webAppBase()}/admin/feedback?id=${submissionId}`;
  await notifyAdmins({
    subject: `[Vettr Feedback] ${category}${severity === 'blocking' ? ' (blocking)' : ''}: ${title}`,
    html: `<p>New <strong>${category}</strong> from user #${userId}</p>
      <p>${title}</p>
      <p><a href="${link}">Open in admin</a></p>`,
  });

  return getSubmissionDetail(userId, submissionId, { asAdmin: false });
}

export async function listMine(userId) {
  const r = await pool.query(
    `SELECT s.id, s.category, s.severity, s.status, s.title, s.page_url,
            s.me_too_count, s.created_at, s.updated_at,
            (s.user_id = $1) AS is_owner,
            (SELECT COUNT(*)::int FROM feedback_messages m
               WHERE m.submission_id = s.id
                 AND m.message_kind = 'admin'
                 AND m.created_at > COALESCE(r.last_read_at, '1970-01-01'::timestamptz)
            ) AS unread_admin_replies
     FROM feedback_submissions s
     LEFT JOIN feedback_reads r
       ON r.submission_id = s.id AND r.user_id = $1
     WHERE s.user_id = $1
        OR EXISTS (
          SELECT 1 FROM feedback_me_too t
          WHERE t.submission_id = s.id AND t.user_id = $1
        )
     ORDER BY s.updated_at DESC
     LIMIT 100`,
    [userId]
  );
  return r.rows.map((row) => ({
    ...row,
    status_label: statusLabel(row.status),
  }));
}

export async function countUnreadForUser(userId) {
  const r = await pool.query(
    `SELECT COUNT(*)::int AS n
     FROM feedback_submissions s
     LEFT JOIN feedback_reads r
       ON r.submission_id = s.id AND r.user_id = $1
     WHERE (
         s.user_id = $1
         OR EXISTS (
           SELECT 1 FROM feedback_me_too t
           WHERE t.submission_id = s.id AND t.user_id = $1
         )
       )
       AND EXISTS (
         SELECT 1 FROM feedback_messages m
         WHERE m.submission_id = s.id
           AND m.message_kind = 'admin'
           AND m.created_at > COALESCE(r.last_read_at, '1970-01-01'::timestamptz)
       )`,
    [userId]
  );
  return r.rows[0]?.n || 0;
}

export async function listAdmin({ category, status, severity, q, limit = 50, offset = 0 } = {}) {
  const clauses = [];
  const params = [];
  let i = 1;
  if (category && CATEGORIES.has(category)) {
    clauses.push(`s.category = $${i++}`);
    params.push(category);
  }
  if (status && STATUSES.has(status)) {
    clauses.push(`s.status = $${i++}`);
    params.push(status);
  }
  if (severity && SEVERITIES.has(severity)) {
    clauses.push(`s.severity = $${i++}`);
    params.push(severity);
  }
  if (q) {
    clauses.push(`(s.title ILIKE $${i} OR u.email ILIKE $${i})`);
    params.push(`%${String(q).slice(0, 100)}%`);
    i += 1;
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  params.push(Math.min(Number(limit) || 50, 100), Number(offset) || 0);
  const r = await pool.query(
    `SELECT s.id, s.category, s.severity, s.status, s.title, s.page_url,
            s.app_version, s.me_too_count, s.created_at, s.updated_at,
            u.email AS user_email, u.id AS user_id
     FROM feedback_submissions s
     JOIN users u ON u.id = s.user_id
     ${where}
     ORDER BY
       CASE s.severity WHEN 'blocking' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
       s.updated_at DESC
     LIMIT $${i++} OFFSET $${i}`,
    params
  );
  return r.rows.map((row) => ({
    ...row,
    status_label: statusLabel(row.status),
  }));
}

export async function getSubmissionDetail(viewerUserId, submissionId, { asAdmin = false } = {}) {
  const sub = await pool.query(
    `SELECT s.*, u.email AS user_email
     FROM feedback_submissions s
     JOIN users u ON u.id = s.user_id
     WHERE s.id = $1`,
    [submissionId]
  );
  if (!sub.rows[0]) throw err(404, 'Feedback not found');
  const submission = sub.rows[0];

  let myMeToo = false;
  if (viewerUserId) {
    const mt = await pool.query(
      `SELECT 1 FROM feedback_me_too WHERE submission_id = $1 AND user_id = $2`,
      [submissionId, viewerUserId]
    );
    myMeToo = mt.rowCount > 0;
  }

  const isOwner = submission.user_id === viewerUserId;
  if (!asAdmin && !isOwner && !myMeToo) {
    throw err(403, 'Not allowed');
  }

  const messages = await pool.query(
    `SELECT m.id, m.submission_id, m.author_user_id, m.body, m.message_kind, m.created_at,
            u.email AS author_email
     FROM feedback_messages m
     LEFT JOIN users u ON u.id = m.author_user_id
     WHERE m.submission_id = $1
     ORDER BY m.created_at ASC`,
    [submissionId]
  );

  const attachments = await pool.query(
    `SELECT id, submission_id, message_id, kind, mime_type, byte_size, created_at
     FROM feedback_attachments
     WHERE submission_id = $1
     ORDER BY id ASC`,
    [submissionId]
  );

  await pool.query(
    `INSERT INTO feedback_reads (user_id, submission_id, last_read_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id, submission_id) DO UPDATE SET last_read_at = NOW()`,
    [viewerUserId, submissionId]
  );

  return {
    submission: {
      ...submission,
      status_label: statusLabel(submission.status),
      my_me_too: myMeToo,
      is_owner: isOwner,
      can_reply: asAdmin || isOwner,
    },
    messages: messages.rows,
    attachments: attachments.rows,
  };
}

export async function addMessage(actorUserId, submissionId, { body, asAdmin = false, attachments = [] } = {}) {
  const text = String(body || '').trim();
  if (!text) throw err(400, 'Message body required');

  const sub = await pool.query(`SELECT * FROM feedback_submissions WHERE id = $1`, [submissionId]);
  if (!sub.rows[0]) throw err(404, 'Feedback not found');
  const submission = sub.rows[0];

  if (!asAdmin && submission.user_id !== actorUserId) throw err(403, 'Not allowed');

  const kind = asAdmin ? 'admin' : 'user';
  const client = await pool.connect();
  let messageId;
  try {
    await client.query('BEGIN');
    const msg = await client.query(
      `INSERT INTO feedback_messages (submission_id, author_user_id, body, message_kind)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [submissionId, actorUserId, text, kind]
    );
    messageId = msg.rows[0].id;

    for (const raw of attachments || []) {
      const kindAtt = raw.kind === 'voice' ? 'voice' : raw.kind === 'screenshot' ? 'screenshot' : 'image';
      const att = validateAttachment(raw, { kind: kindAtt });
      if (!att) continue;
      await client.query(
        `INSERT INTO feedback_attachments
           (submission_id, message_id, kind, mime_type, byte_size, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [submissionId, messageId, att.kind, att.mimeType, att.byteSize, att.data]
      );
    }

    await client.query(
      `UPDATE feedback_submissions SET updated_at = NOW() WHERE id = $1`,
      [submissionId]
    );

    if (asAdmin && submission.status === 'new') {
      await client.query(
        `UPDATE feedback_submissions SET status = 'needs_info', updated_at = NOW() WHERE id = $1 AND status = 'new'`,
        [submissionId]
      );
    }

    await client.query(
      `INSERT INTO feedback_reads (user_id, submission_id, last_read_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id, submission_id) DO UPDATE SET last_read_at = NOW()`,
      [actorUserId, submissionId]
    );

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  const linkUser = `${webAppBase()}/dashboard?feedback=${submissionId}`;
  const linkAdmin = `${webAppBase()}/admin/feedback?id=${submissionId}`;

  if (asAdmin) {
    await notifyUser(submission.user_id, {
      subject: `[Vettr] Reply on your feedback: ${submission.title}`,
      html: `<p>We replied to your feedback:</p><blockquote>${text}</blockquote>
        <p><a href="${linkUser}">View thread</a></p>`,
    });
  } else {
    await notifyAdmins({
      subject: `[Vettr Feedback] User reply on #${submissionId}`,
      html: `<p>User replied on <strong>${submission.title}</strong></p>
        <blockquote>${text}</blockquote>
        <p><a href="${linkAdmin}">Open in admin</a></p>`,
    });
  }

  return getSubmissionDetail(actorUserId, submissionId, { asAdmin });
}

export async function updateStatus(adminUserId, submissionId, status) {
  if (!STATUSES.has(status)) throw err(400, 'Invalid status');
  const sub = await pool.query(`SELECT * FROM feedback_submissions WHERE id = $1`, [submissionId]);
  if (!sub.rows[0]) throw err(404, 'Feedback not found');
  const prev = sub.rows[0].status;
  if (prev === status) {
    return getSubmissionDetail(adminUserId, submissionId, { asAdmin: true });
  }

  await pool.query(
    `UPDATE feedback_submissions SET status = $1, updated_at = NOW() WHERE id = $2`,
    [status, submissionId]
  );

  const label = statusLabel(status);
  await pool.query(
    `INSERT INTO feedback_messages (submission_id, author_user_id, body, message_kind)
     VALUES ($1, $2, $3, 'system')`,
    [submissionId, adminUserId, `Status changed to ${label}`]
  );

  const linkUser = `${webAppBase()}/dashboard?feedback=${submissionId}`;
  await notifyUser(sub.rows[0].user_id, {
    subject: `[Vettr] Feedback status: ${label}`,
    html: `<p>Your feedback “${sub.rows[0].title}” is now <strong>${label}</strong>.</p>
      <p><a href="${linkUser}">View thread</a></p>`,
  });

  console.log(`[feedback] #${submissionId} status ${prev} → ${status}`);
  return getSubmissionDetail(adminUserId, submissionId, { asAdmin: true });
}

export async function addMeToo(userId, submissionId) {
  const sub = await pool.query(
    `SELECT * FROM feedback_submissions WHERE id = $1`,
    [submissionId]
  );
  if (!sub.rows[0]) throw err(404, 'Feedback not found');
  const s = sub.rows[0];
  if (s.category !== 'bug') throw err(400, 'Me too is only for bugs');
  if (!['new', 'needs_info', 'in_progress'].includes(s.status)) {
    throw err(400, 'This bug is already closed');
  }
  if (s.user_id === userId) throw err(400, 'You already reported this');

  const inserted = await pool.query(
    `INSERT INTO feedback_me_too (submission_id, user_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING
     RETURNING submission_id`,
    [submissionId, userId]
  );
  if (inserted.rowCount > 0) {
    await pool.query(
      `UPDATE feedback_submissions
       SET me_too_count = me_too_count + 1, updated_at = NOW()
       WHERE id = $1`,
      [submissionId]
    );
    console.log(`[feedback] me-too on #${submissionId} by user ${userId}`);
  }
  return getSubmissionDetail(userId, submissionId, { asAdmin: false });
}

export async function listOpenBugsForMeToo(userId, { limit = 20 } = {}) {
  const r = await pool.query(
    `SELECT s.id, s.title, s.severity, s.status, s.me_too_count, s.created_at,
            EXISTS (
              SELECT 1 FROM feedback_me_too t
              WHERE t.submission_id = s.id AND t.user_id = $1
            ) AS my_me_too
     FROM feedback_submissions s
     WHERE s.category = 'bug'
       AND s.status IN ('new', 'needs_info', 'in_progress')
       AND s.user_id <> $1
     ORDER BY s.me_too_count DESC, s.updated_at DESC
     LIMIT $2`,
    [userId, Math.min(Number(limit) || 20, 50)]
  );
  return r.rows.map((row) => ({
    ...row,
    status_label: statusLabel(row.status),
  }));
}

export async function getAttachmentForUser(viewerUserId, attachmentId, { asAdmin = false } = {}) {
  const r = await pool.query(
    `SELECT a.*, s.user_id AS owner_user_id
     FROM feedback_attachments a
     JOIN feedback_submissions s ON s.id = a.submission_id
     WHERE a.id = $1`,
    [attachmentId]
  );
  if (!r.rows[0]) throw err(404, 'Attachment not found');
  const row = r.rows[0];
  if (!asAdmin && row.owner_user_id !== viewerUserId) {
    const mt = await pool.query(
      `SELECT 1 FROM feedback_me_too WHERE submission_id = $1 AND user_id = $2`,
      [row.submission_id, viewerUserId]
    );
    if (!mt.rowCount) throw err(403, 'Not allowed');
  }
  return row;
}

export function viewerIsAdmin(email) {
  return isFeedbackAdminEmail(email);
}
