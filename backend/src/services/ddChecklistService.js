import crypto from 'crypto';
import bcrypt from 'bcrypt';
import pool from '../db/pool.js';
import { BUSINESS_ACQUISITION_DD_TEMPLATE } from '../data/ddBusinessTemplate.js';
import { sendEmail } from './emailService.js';

const WEB_APP_URL = process.env.WEB_APP_URL || 'http://localhost:5173';

async function loadCommentsForChecklist(checklistId) {
  const res = await pool.query(
    `SELECT c.id, c.item_id, c.author_email, c.author_name, c.body, c.is_external, c.created_at
     FROM dd_item_comments c
     INNER JOIN dd_items i ON i.id = c.item_id
     INNER JOIN dd_groups g ON g.id = i.group_id
     WHERE g.checklist_id = $1
     ORDER BY c.created_at ASC`,
    [checklistId]
  );
  const byItem = new Map();
  for (const row of res.rows) {
    if (!byItem.has(row.item_id)) byItem.set(row.item_id, []);
    byItem.get(row.item_id).push({
      id: row.id,
      authorEmail: row.author_email,
      authorName: row.author_name,
      body: row.body,
      isExternal: row.is_external,
      createdAt: row.created_at
    });
  }
  return byItem;
}

async function notifyDealOwnerPortalComment(userId, savedDealId, { dealName, itemTitle, authorName, body }) {
  const user = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
  const ownerEmail = user.rows[0]?.email;
  const author = authorName || 'Portal guest';
  const preview = body.length > 120 ? `${body.slice(0, 117)}…` : body;

  await pool.query(
    `INSERT INTO reminders (user_id, saved_deal_id, remind_at, channel)
     VALUES ($1, $2, NOW(), 'in_app')`,
    [userId, savedDealId]
  );

  if (!ownerEmail) {
    console.warn('[dd] portal comment alert skipped — no owner email', { userId, savedDealId });
    return;
  }

  try {
    await sendEmail({
      to: ownerEmail,
      subject: `DD portal comment on ${dealName}`,
      html: `<p><strong>${author}</strong> commented on <em>${itemTitle}</em>:</p>
             <blockquote style="margin:12px 0;padding:8px 12px;border-left:3px solid #7eb8ff;">${preview}</blockquote>
             <p><a href="${WEB_APP_URL}/dashboard">Open deal in Vettr CRM</a></p>`
    });
    console.log(`[dd] portal comment alert emailed to ${ownerEmail} deal=${savedDealId}`);
  } catch (err) {
    console.warn('[dd] portal comment email failed:', err.message);
  }
}

export async function getRecentPortalComments(userId, days = 7) {
  const result = await pool.query(
    `SELECT c.id, c.body, c.author_name, c.author_email, c.created_at,
            i.title AS item_title, i.id AS item_id,
            sd.id AS saved_deal_id, sd.name AS deal_name
     FROM dd_item_comments c
     JOIN dd_items i ON i.id = c.item_id
     JOIN dd_groups g ON g.id = i.group_id
     JOIN dd_checklists cl ON cl.id = g.checklist_id
     JOIN saved_deals sd ON sd.id = cl.saved_deal_id AND sd.user_id = $1
     WHERE c.is_external = true
       AND c.created_at >= NOW() - ($2::int || ' days')::interval
     ORDER BY c.created_at DESC
     LIMIT 30`,
    [userId, days]
  );
  return result.rows;
}

export async function ensureSystemDdTemplate() {
  const existing = await pool.query(
    `SELECT id FROM dd_templates WHERE user_id IS NULL AND name = $1 LIMIT 1`,
    [BUSINESS_ACQUISITION_DD_TEMPLATE.name]
  );
  if (existing.rows.length) return existing.rows[0].id;

  const tpl = await pool.query(
    `INSERT INTO dd_templates (user_id, name, asset_type) VALUES (NULL, $1, $2) RETURNING id`,
    [BUSINESS_ACQUISITION_DD_TEMPLATE.name, BUSINESS_ACQUISITION_DD_TEMPLATE.assetType]
  );
  const templateId = tpl.rows[0].id;

  for (let gi = 0; gi < BUSINESS_ACQUISITION_DD_TEMPLATE.groups.length; gi++) {
    const group = BUSINESS_ACQUISITION_DD_TEMPLATE.groups[gi];
    const gRes = await pool.query(
      `INSERT INTO dd_template_groups (template_id, name, sort_order) VALUES ($1, $2, $3) RETURNING id`,
      [templateId, group.name, gi]
    );
    const groupId = gRes.rows[0].id;
    for (let ii = 0; ii < group.items.length; ii++) {
      const item = group.items[ii];
      await pool.query(
        `INSERT INTO dd_template_items (group_id, title, requests_document, sort_order)
         VALUES ($1, $2, $3, $4)`,
        [groupId, item.title, !!item.requestsDocument, ii]
      );
    }
  }

  console.log(`[dd] seeded system template id=${templateId}`);
  return templateId;
}

async function assertDealOwned(userId, savedDealId) {
  const row = await pool.query(
    'SELECT id, name, progress_stage FROM saved_deals WHERE user_id = $1 AND id = $2',
    [userId, savedDealId]
  );
  if (!row.rows.length) {
    const err = new Error('Deal not found');
    err.status = 404;
    throw err;
  }
  return row.rows[0];
}

export async function getChecklistForDeal(userId, savedDealId) {
  await assertDealOwned(userId, savedDealId);
  const cl = await pool.query(
    `SELECT c.id, c.template_id, c.started_at, c.completed_at, t.name AS template_name
     FROM dd_checklists c
     LEFT JOIN dd_templates t ON t.id = c.template_id
     WHERE c.saved_deal_id = $1`,
    [savedDealId]
  );
  if (!cl.rows.length) return null;

  const checklistId = cl.rows[0].id;
  const commentsByItem = await loadCommentsForChecklist(checklistId);
  const groupsRes = await pool.query(
    `SELECT id, name, sort_order FROM dd_groups WHERE checklist_id = $1 ORDER BY sort_order`,
    [checklistId]
  );

  const groups = [];
  let totalItems = 0;
  let completeItems = 0;
  let overdueItems = 0;
  const now = new Date();

  for (const g of groupsRes.rows) {
    const itemsRes = await pool.query(
      `SELECT i.id, i.title, i.description, i.status, i.due_at, i.requests_document,
              i.sort_order, i.completed_at
       FROM dd_items i WHERE i.group_id = $1 ORDER BY i.sort_order`,
      [g.id]
    );
    const assigneesRes = await pool.query(
      `SELECT a.item_id, a.email, a.name, a.role_label
       FROM dd_item_assignees a
       INNER JOIN dd_items i ON i.id = a.item_id AND i.group_id = $1`,
      [g.id]
    );
    const assigneesByItem = new Map();
    for (const a of assigneesRes.rows) {
      if (!assigneesByItem.has(a.item_id)) assigneesByItem.set(a.item_id, []);
      assigneesByItem.get(a.item_id).push({
        email: a.email,
        name: a.name,
        roleLabel: a.role_label
      });
    }

    const items = itemsRes.rows.map((i) => {
      totalItems += 1;
      if (i.status === 'complete' || i.status === 'na') completeItems += 1;
      if (i.due_at && i.status !== 'complete' && i.status !== 'na' && new Date(i.due_at) < now) {
        overdueItems += 1;
      }
      return {
        ...i,
        assignees: assigneesByItem.get(i.id) || [],
        comments: commentsByItem.get(i.id) || []
      };
    });

    groups.push({ ...g, items });
  }

  const shareLinks = await pool.query(
    `SELECT id, label, mode, expires_at, revoked_at, show_deal_name, created_at
     FROM dd_share_links WHERE checklist_id = $1 AND revoked_at IS NULL
     ORDER BY created_at DESC`,
    [checklistId]
  );

  return {
    ...cl.rows[0],
    groups,
    progress: {
      totalItems,
      completeItems,
      percent: totalItems ? Math.round((completeItems / totalItems) * 100) : 0,
      overdueItems
    },
    shareLinks: shareLinks.rows
  };
}

export async function startChecklistFromTemplate(userId, savedDealId) {
  const deal = await assertDealOwned(userId, savedDealId);
  const existing = await pool.query(
    'SELECT id FROM dd_checklists WHERE saved_deal_id = $1',
    [savedDealId]
  );
  if (existing.rows.length) {
    return getChecklistForDeal(userId, savedDealId);
  }

  const templateId = await ensureSystemDdTemplate();
  const clRes = await pool.query(
    `INSERT INTO dd_checklists (saved_deal_id, template_id) VALUES ($1, $2) RETURNING id`,
    [savedDealId, templateId]
  );
  const checklistId = clRes.rows[0].id;

  const tplGroups = await pool.query(
    `SELECT g.id, g.name, g.sort_order,
            json_agg(json_build_object(
              'title', i.title,
              'requests_document', i.requests_document,
              'sort_order', i.sort_order
            ) ORDER BY i.sort_order) AS items
     FROM dd_template_groups g
     JOIN dd_template_items i ON i.group_id = g.id
     WHERE g.template_id = $1
     GROUP BY g.id ORDER BY g.sort_order`,
    [templateId]
  );

  for (const g of tplGroups.rows) {
    const gIns = await pool.query(
      `INSERT INTO dd_groups (checklist_id, name, sort_order) VALUES ($1, $2, $3) RETURNING id`,
      [checklistId, g.name, g.sort_order]
    );
    const groupId = gIns.rows[0].id;
    const items = Array.isArray(g.items) ? g.items : [];
    for (const item of items) {
      await pool.query(
        `INSERT INTO dd_items (group_id, title, requests_document, sort_order, status)
         VALUES ($1, $2, $3, $4, 'not_started')`,
        [groupId, item.title, item.requests_document, item.sort_order]
      );
    }
  }

  await pool.query(
    `INSERT INTO activities (user_id, saved_deal_id, activity_type, body)
     VALUES ($1, $2, 'dd_started', $3)`,
    [userId, savedDealId, `Started due diligence checklist for ${deal.name}`]
  );

  console.log(`[dd] checklist=${checklistId} started for deal=${savedDealId}`);
  return getChecklistForDeal(userId, savedDealId);
}

export async function patchDdItem(userId, savedDealId, itemId, patch) {
  await assertDealOwned(userId, savedDealId);
  const itemRow = await pool.query(
    `SELECT i.id, i.status, i.title, g.checklist_id, c.saved_deal_id
     FROM dd_items i
     JOIN dd_groups g ON g.id = i.group_id
     JOIN dd_checklists c ON c.id = g.checklist_id
     WHERE i.id = $1 AND c.saved_deal_id = $2`,
    [itemId, savedDealId]
  );
  if (!itemRow.rows.length) {
    const err = new Error('DD item not found');
    err.status = 404;
    throw err;
  }

  const item = itemRow.rows[0];
  const status = patch.status ?? item.status;
  const dueAt = patch.dueAt !== undefined ? patch.dueAt : undefined;
  const completedAt =
    status === 'complete' && item.status !== 'complete' ? new Date().toISOString() : undefined;

  const sets = ['status = $1'];
  const vals = [status];
  let idx = 2;
  if (dueAt !== undefined) {
    sets.push(`due_at = $${idx++}`);
    vals.push(dueAt);
  }
  if (completedAt) {
    sets.push(`completed_at = $${idx++}`);
    vals.push(completedAt);
  }
  vals.push(itemId);

  await pool.query(`UPDATE dd_items SET ${sets.join(', ')} WHERE id = $${idx}`, vals);

  if (patch.assignee?.email) {
    const email = String(patch.assignee.email).trim().toLowerCase();
    if (email) {
      await pool.query(
        `INSERT INTO dd_item_assignees (item_id, email, name, role_label)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (item_id, email) DO UPDATE SET name = EXCLUDED.name, role_label = EXCLUDED.role_label`,
        [itemId, email, patch.assignee.name || null, patch.assignee.roleLabel || null]
      );
      notifyAssigneeEmail(email, patch.assignee.name, item.title, itemId, savedDealId, userId).catch((err) => {
        console.warn('[dd] assignee notify failed:', err.message);
      });
    }
  }

  return getChecklistForDeal(userId, savedDealId);
}

async function notifyAssigneeEmail(email, name, itemTitle, itemId, savedDealId, userId) {
  const deal = await pool.query('SELECT name FROM saved_deals WHERE id = $1', [savedDealId]);
  const dealName = deal.rows[0]?.name || 'a deal';
  await sendEmail({
    to: email,
    subject: `DD request: ${itemTitle}`,
    html: `<p>Hi${name ? ` ${name}` : ''},</p>
           <p>You were assigned a due diligence item on <strong>${dealName}</strong>:</p>
           <p><strong>${itemTitle}</strong></p>
           <p>The buyer will share a collaborative portal link separately if needed.</p>`
  });
  await pool.query(
    `UPDATE dd_item_assignees SET notified_at = NOW() WHERE item_id = $1 AND email = $2`,
    [itemId, email]
  );
}

export async function addDdGroup(userId, savedDealId, { name }) {
  const checklist = await getChecklistForDeal(userId, savedDealId);
  if (!checklist) {
    const err = new Error('Start a DD checklist first');
    err.status = 400;
    throw err;
  }
  const trimmed = (name || '').trim();
  if (!trimmed) {
    const err = new Error('Group name required');
    err.status = 400;
    throw err;
  }
  const maxOrder = await pool.query(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM dd_groups WHERE checklist_id = $1',
    [checklist.id]
  );
  await pool.query(
    'INSERT INTO dd_groups (checklist_id, name, sort_order) VALUES ($1, $2, $3)',
    [checklist.id, trimmed, maxOrder.rows[0].next]
  );
  return getChecklistForDeal(userId, savedDealId);
}

export async function addDdItem(userId, savedDealId, groupId, { title, requestsDocument = false }) {
  await assertDealOwned(userId, savedDealId);
  const trimmed = (title || '').trim();
  if (!trimmed) {
    const err = new Error('Item title required');
    err.status = 400;
    throw err;
  }
  const maxOrder = await pool.query(
    'SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM dd_items WHERE group_id = $1',
    [groupId]
  );
  await pool.query(
    `INSERT INTO dd_items (group_id, title, requests_document, sort_order, status)
     VALUES ($1, $2, $3, $4, 'not_started')`,
    [groupId, trimmed, !!requestsDocument, maxOrder.rows[0].next]
  );
  return getChecklistForDeal(userId, savedDealId);
}

export async function addDdItemComment(userId, savedDealId, itemId, { body, authorName, isExternal = false }) {
  await assertDealOwned(userId, savedDealId);
  const text = (body || '').trim();
  if (!text) {
    const err = new Error('Comment required');
    err.status = 400;
    throw err;
  }
  const user = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
  await pool.query(
    `INSERT INTO dd_item_comments (item_id, author_email, author_name, body, is_external)
     VALUES ($1, $2, $3, $4, $5)`,
    [itemId, user.rows[0]?.email || null, authorName || null, text, isExternal]
  );
  return getChecklistForDeal(userId, savedDealId);
}

export async function addDdItemDocument(userId, savedDealId, itemId, { filename, mimeType, storageKey, isExternal = false }) {
  await assertDealOwned(userId, savedDealId);
  const name = (filename || '').trim();
  if (!name) {
    const err = new Error('Filename required');
    err.status = 400;
    throw err;
  }
  const user = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
  await pool.query(
    `INSERT INTO dd_item_documents (item_id, filename, mime_type, storage_key, uploaded_by_email, is_external)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [itemId, name, mimeType || null, storageKey || name, user.rows[0]?.email || null, isExternal]
  );
  return getChecklistForDeal(userId, savedDealId);
}

export async function addPublicDdComment(token, itemId, { body, authorName, authorEmail }) {
  const link = await pool.query(
    `SELECT sl.mode, sl.label, c.saved_deal_id, sd.user_id, sd.name AS deal_name
     FROM dd_share_links sl
     JOIN dd_checklists c ON c.id = sl.checklist_id
     JOIN saved_deals sd ON sd.id = c.saved_deal_id
     WHERE sl.token = $1 AND sl.revoked_at IS NULL AND sl.mode = 'collaborative'`,
    [token]
  );
  if (!link.rows.length) {
    const err = new Error('Collaborative access required');
    err.status = 403;
    throw err;
  }
  const { saved_deal_id: savedDealId, user_id: userId, deal_name: dealName, label: linkLabel } = link.rows[0];

  const itemRow = await pool.query(
    `SELECT i.id, i.title
     FROM dd_items i
     JOIN dd_groups g ON g.id = i.group_id
     JOIN dd_checklists c ON c.id = g.checklist_id
     WHERE i.id = $1 AND c.saved_deal_id = $2`,
    [itemId, savedDealId]
  );
  if (!itemRow.rows.length) {
    const err = new Error('Checklist item not found');
    err.status = 404;
    throw err;
  }

  const text = (body || '').trim();
  if (!text) {
    const err = new Error('Comment required');
    err.status = 400;
    throw err;
  }

  const author = (authorName || '').trim() || linkLabel || 'Portal guest';
  const email = (authorEmail || '').trim().toLowerCase() || null;

  await pool.query(
    `INSERT INTO dd_item_comments (item_id, author_email, author_name, body, is_external)
     VALUES ($1, $2, $3, $4, true)`,
    [itemId, email, author, text]
  );

  const itemTitle = itemRow.rows[0].title;
  await pool.query(
    `INSERT INTO activities (user_id, saved_deal_id, activity_type, body, metadata)
     VALUES ($1, $2, 'dd_portal_comment', $3, $4)`,
    [
      userId,
      savedDealId,
      `${author} commented on "${itemTitle}"`,
      JSON.stringify({ itemId, author, body: text })
    ]
  );

  notifyDealOwnerPortalComment(userId, savedDealId, {
    dealName,
    itemTitle,
    authorName: author,
    body: text
  }).catch((err) => console.warn('[dd] portal comment notify failed:', err.message));

  console.log(`[dd] portal comment on item=${itemId} deal=${savedDealId} by ${author}`);
  return getChecklistForDeal(userId, savedDealId);
}

export async function addPublicDdDocument(token, itemId, { filename, mimeType, storageKey, authorEmail }) {
  const link = await pool.query(
    `SELECT sl.mode, c.saved_deal_id, sd.user_id
     FROM dd_share_links sl
     JOIN dd_checklists c ON c.id = sl.checklist_id
     JOIN saved_deals sd ON sd.id = c.saved_deal_id
     WHERE sl.token = $1 AND sl.revoked_at IS NULL AND sl.mode = 'collaborative'`,
    [token]
  );
  if (!link.rows.length) {
    const err = new Error('Collaborative access required');
    err.status = 403;
    throw err;
  }
  const { saved_deal_id: savedDealId, user_id: userId } = link.rows[0];
  return addDdItemDocument(userId, savedDealId, itemId, {
    filename,
    mimeType,
    storageKey,
    isExternal: true
  });
}

export async function createShareLink(userId, savedDealId, { label, mode = 'view_only', expiresAt = null, showDealName = true, password = null }) {
  const checklist = await getChecklistForDeal(userId, savedDealId);
  if (!checklist) {
    const err = new Error('Start a DD checklist first');
    err.status = 400;
    throw err;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const passwordHash = password ? await bcrypt.hash(String(password), 10) : null;
  const result = await pool.query(
    `INSERT INTO dd_share_links (checklist_id, token, label, mode, expires_at, show_deal_name, password_hash)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, token, label, mode, expires_at, show_deal_name, created_at`,
    [checklist.id, token, label || 'Share link', mode, expiresAt, showDealName, passwordHash]
  );

  return result.rows[0];
}

export async function revokeShareLink(userId, savedDealId, linkId) {
  await assertDealOwned(userId, savedDealId);
  await pool.query(
    `UPDATE dd_share_links sl SET revoked_at = NOW()
     FROM dd_checklists c
     WHERE sl.id = $1 AND sl.checklist_id = c.id AND c.saved_deal_id = $2`,
    [linkId, savedDealId]
  );
  return { revoked: true };
}

export async function getPublicChecklistByToken(token) {
  const link = await pool.query(
    `SELECT sl.*, c.saved_deal_id, sd.name AS deal_name, sd.user_id
     FROM dd_share_links sl
     JOIN dd_checklists c ON c.id = sl.checklist_id
     JOIN saved_deals sd ON sd.id = c.saved_deal_id
     WHERE sl.token = $1 AND sl.revoked_at IS NULL`,
    [token]
  );
  if (!link.rows.length) {
    const err = new Error('Link not found');
    err.status = 404;
    throw err;
  }
  const row = link.rows[0];
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    const err = new Error('Link expired');
    err.status = 410;
    throw err;
  }

  const checklist = await getChecklistForDeal(row.user_id, row.saved_deal_id);
  return {
    mode: row.mode,
    label: row.label,
    showDealName: row.show_deal_name,
    dealName: row.show_deal_name ? row.deal_name : 'Due Diligence',
    checklist
  };
}

export async function patchPublicDdItem(token, itemId, patch) {
  const link = await pool.query(
    `SELECT sl.mode, c.saved_deal_id, sd.user_id
     FROM dd_share_links sl
     JOIN dd_checklists c ON c.id = sl.checklist_id
     JOIN saved_deals sd ON sd.id = c.saved_deal_id
     WHERE sl.token = $1 AND sl.revoked_at IS NULL AND sl.mode = 'collaborative'`,
    [token]
  );
  if (!link.rows.length) {
    const err = new Error('Collaborative access required');
    err.status = 403;
    throw err;
  }
  const { saved_deal_id: savedDealId, user_id: userId } = link.rows[0];
  return patchDdItem(userId, savedDealId, itemId, patch);
}

export async function getDdOverdueForToday(userId) {
  const result = await pool.query(
    `SELECT i.id, i.title, i.due_at, i.status, sd.id AS saved_deal_id, sd.name AS deal_name
     FROM dd_items i
     JOIN dd_groups g ON g.id = i.group_id
     JOIN dd_checklists c ON c.id = g.checklist_id
     JOIN saved_deals sd ON sd.id = c.saved_deal_id AND sd.user_id = $1
     WHERE i.status NOT IN ('complete', 'na')
       AND i.due_at IS NOT NULL AND i.due_at < NOW()
     ORDER BY i.due_at ASC
     LIMIT 20`,
    [userId]
  );
  return result.rows;
}
