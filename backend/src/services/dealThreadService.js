import pool from '../db/pool.js';
import {
  getDealAccess,
  assertCanTalk,
  getMembership
} from '../lib/teamAcl.js';
import { sendEmail } from './emailService.js';

const MENTION_RE = /@([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

function extractEmailsFromBody(body) {
  const emails = new Set();
  let m;
  const re = new RegExp(MENTION_RE.source, 'g');
  while ((m = re.exec(body)) !== null) {
    emails.add(m[1].toLowerCase());
  }
  return [...emails];
}

function extractTags(body) {
  const tags = [];
  const re = /#([a-zA-Z][a-zA-Z0-9_-]{0,31})/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    tags.push(m[1].toLowerCase());
  }
  return [...new Set(tags)];
}

export async function listDealMessages(userId, savedDealId, { afterId } = {}) {
  const access = await getDealAccess(userId, savedDealId);
  assertCanTalk(access);

  const params = [savedDealId];
  let sql = `
    SELECT m.id, m.saved_deal_id, m.author_user_id, m.body, m.message_kind,
           m.assignee_user_id, m.resolved_at, m.resolved_by, m.tags, m.created_at,
           u.email AS author_email,
           au.email AS assignee_email
    FROM deal_messages m
    JOIN users u ON u.id = m.author_user_id
    LEFT JOIN users au ON au.id = m.assignee_user_id
    WHERE m.saved_deal_id = $1
  `;
  if (afterId) {
    params.push(afterId);
    sql += ` AND m.id > $2`;
  }
  sql += ` ORDER BY m.created_at ASC, m.id ASC LIMIT 200`;

  const messages = await pool.query(sql, params);

  const ids = messages.rows.map((r) => r.id);
  let mentions = [];
  let reactions = [];
  if (ids.length) {
    const m = await pool.query(
      `SELECT message_id, user_id FROM deal_message_mentions WHERE message_id = ANY($1::int[])`,
      [ids]
    );
    mentions = m.rows;
    const r = await pool.query(
      `SELECT message_id, user_id, emoji, u.email
       FROM deal_message_reactions r
       JOIN users u ON u.id = r.user_id
       WHERE message_id = ANY($1::int[])`,
      [ids]
    );
    reactions = r.rows;
  }

  await pool.query(
    `INSERT INTO deal_thread_reads (user_id, saved_deal_id, last_read_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id, saved_deal_id)
     DO UPDATE SET last_read_at = NOW()`,
    [userId, savedDealId]
  );

  return {
    messages: messages.rows.map((msg) => ({
      ...msg,
      mentions: mentions.filter((x) => x.message_id === msg.id).map((x) => x.user_id),
      reactions: reactions.filter((x) => x.message_id === msg.id)
    })),
    access: {
      canWrite: access.canWrite,
      canTalk: true,
      role: access.role,
      teamId: access.deal.team_id
    }
  };
}

export async function postDealMessage(userId, savedDealId, { body, assigneeUserId } = {}) {
  const access = await getDealAccess(userId, savedDealId);
  assertCanTalk(access);

  const text = String(body || '').trim();
  if (!text) {
    const err = new Error('Message body required');
    err.status = 400;
    throw err;
  }
  if (text.length > 4000) {
    const err = new Error('Message too long');
    err.status = 400;
    throw err;
  }

  let assignee = assigneeUserId ? Number(assigneeUserId) : null;
  if (assignee && access.deal.team_id) {
    const m = await getMembership(assignee, access.deal.team_id);
    if (!m) {
      const err = new Error('Assignee must be a team member');
      err.status = 400;
      throw err;
    }
  } else if (assignee && !access.deal.team_id) {
    assignee = null;
  }

  const tags = extractTags(text);
  const result = await pool.query(
    `INSERT INTO deal_messages (
       saved_deal_id, author_user_id, body, message_kind, assignee_user_id, tags
     ) VALUES ($1, $2, $3, 'chat', $4, $5)
     RETURNING id, saved_deal_id, author_user_id, body, message_kind,
               assignee_user_id, resolved_at, tags, created_at`,
    [savedDealId, userId, text, assignee, tags]
  );
  const message = result.rows[0];

  // Mentions: match @email against team members
  if (access.deal.team_id) {
    const emails = extractEmailsFromBody(text);
    if (emails.length) {
      const members = await pool.query(
        `SELECT u.id, LOWER(u.email) AS email FROM team_members tm
         JOIN users u ON u.id = tm.user_id
         WHERE tm.team_id = $1 AND tm.status = 'active'`,
        [access.deal.team_id]
      );
      const byEmail = new Map(members.rows.map((r) => [r.email, r.id]));
      const author = await pool.query(`SELECT email FROM users WHERE id = $1`, [userId]);
      const authorEmail = author.rows[0]?.email || 'A teammate';

      for (const email of emails) {
        const mentionedId = byEmail.get(email);
        if (!mentionedId || mentionedId === userId) continue;
        await pool.query(
          `INSERT INTO deal_message_mentions (message_id, user_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [message.id, mentionedId]
        );
        const user = members.rows.find((r) => r.id === mentionedId);
        if (user) {
          await sendEmail({
            to: email,
            subject: `${authorEmail} mentioned you on a Vettr deal`,
            html: `<p>${authorEmail} mentioned you:</p><blockquote>${text}</blockquote><p>Open the deal in Vettr to reply.</p>`
          }).catch((err) => console.warn('[dealThread] mention email failed:', err.message));
        }
      }
    }

    if (assignee && assignee !== userId) {
      const assigneeRow = await pool.query(`SELECT email FROM users WHERE id = $1`, [assignee]);
      const author = await pool.query(`SELECT email FROM users WHERE id = $1`, [userId]);
      if (assigneeRow.rows[0]?.email) {
        await sendEmail({
          to: assigneeRow.rows[0].email,
          subject: `Assigned on a Vettr deal`,
          html: `<p>${author.rows[0]?.email || 'A teammate'} assigned you:</p><blockquote>${text}</blockquote>`
        }).catch((err) => console.warn('[dealThread] assign email failed:', err.message));
      }
    }
  }

  // Create linked task when assigning
  if (assignee && access.canWrite) {
    await pool.query(
      `INSERT INTO tasks (user_id, saved_deal_id, title, status, metadata)
       VALUES ($1, $2, $3, 'open', $4)`,
      [
        assignee,
        savedDealId,
        text.slice(0, 200),
        JSON.stringify({ fromMessageId: message.id, assignedBy: userId })
      ]
    ).catch((err) => {
      // tasks.metadata may not exist — fall back without metadata
      console.warn('[dealThread] task create with metadata failed, retrying:', err.message);
      return pool.query(
        `INSERT INTO tasks (user_id, saved_deal_id, title, status)
         VALUES ($1, $2, $3, 'open')`,
        [assignee, savedDealId, text.slice(0, 200)]
      ).catch((e2) => console.warn('[dealThread] task create failed:', e2.message));
    });
  }

  console.log(`[dealThread] message=${message.id} deal=${savedDealId} by=${userId}`);
  return message;
}

export async function reactToMessage(userId, messageId, emoji) {
  const emojiClean = String(emoji || '').trim().slice(0, 16);
  if (!emojiClean) {
    const err = new Error('Emoji required');
    err.status = 400;
    throw err;
  }

  const msg = await pool.query(
    `SELECT id, saved_deal_id FROM deal_messages WHERE id = $1`,
    [messageId]
  );
  if (!msg.rows[0]) {
    const err = new Error('Message not found');
    err.status = 404;
    throw err;
  }

  const access = await getDealAccess(userId, msg.rows[0].saved_deal_id);
  assertCanTalk(access);

  const existing = await pool.query(
    `SELECT 1 FROM deal_message_reactions
     WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
    [messageId, userId, emojiClean]
  );

  if (existing.rows.length) {
    await pool.query(
      `DELETE FROM deal_message_reactions
       WHERE message_id = $1 AND user_id = $2 AND emoji = $3`,
      [messageId, userId, emojiClean]
    );
    return { toggled: 'off', emoji: emojiClean };
  }

  await pool.query(
    `INSERT INTO deal_message_reactions (message_id, user_id, emoji)
     VALUES ($1, $2, $3)`,
    [messageId, userId, emojiClean]
  );
  return { toggled: 'on', emoji: emojiClean };
}

export async function resolveMessage(userId, messageId, resolved = true) {
  const msg = await pool.query(
    `SELECT id, saved_deal_id, assignee_user_id FROM deal_messages WHERE id = $1`,
    [messageId]
  );
  if (!msg.rows[0]) {
    const err = new Error('Message not found');
    err.status = 404;
    throw err;
  }

  const access = await getDealAccess(userId, msg.rows[0].saved_deal_id);
  assertCanTalk(access);

  if (resolved) {
    await pool.query(
      `UPDATE deal_messages SET resolved_at = NOW(), resolved_by = $1 WHERE id = $2`,
      [userId, messageId]
    );
  } else {
    await pool.query(
      `UPDATE deal_messages SET resolved_at = NULL, resolved_by = NULL WHERE id = $1`,
      [messageId]
    );
  }
  return { resolved };
}

export async function getUnreadCounts(userId, savedDealIds) {
  if (!savedDealIds?.length) return {};
  const result = await pool.query(
    `SELECT m.saved_deal_id, COUNT(*)::int AS unread
     FROM deal_messages m
     LEFT JOIN deal_thread_reads r
       ON r.saved_deal_id = m.saved_deal_id AND r.user_id = $1
     WHERE m.saved_deal_id = ANY($2::int[])
       AND m.author_user_id <> $1
       AND m.message_kind = 'chat'
       AND (r.last_read_at IS NULL OR m.created_at > r.last_read_at)
     GROUP BY m.saved_deal_id`,
    [userId, savedDealIds]
  );
  const map = {};
  for (const row of result.rows) map[row.saved_deal_id] = row.unread;
  return map;
}
