import pool from '../db/pool.js';
import { sendEmail } from './emailService.js';
import { getTodayTaskSummary } from './crmTaskService.js';
import { getDdOverdueForToday, getRecentPortalComments } from './ddChecklistService.js';
import { getUnreadMentions } from './dealThreadService.js';
import { findDormantDeals } from './crmPresenceService.js';
import { findStaleListings } from './crmStaleListing.js';

const WEB_APP_URL = process.env.WEB_APP_URL || 'http://localhost:5173';

function prefsCrmEmailDigest(prefs) {
  if (!prefs || typeof prefs !== 'object') return false;
  return prefs.crmEmailDigest === true;
}

export async function processDueReminders() {
  const due = await pool.query(
    `SELECT r.id, r.user_id, r.remind_at, r.channel, t.title AS task_title,
            sd.name AS deal_name,
            COALESCE(r.recipient_email, u.email) AS notify_email,
            r.recipient_name
     FROM reminders r
     JOIN users u ON u.id = r.user_id
     LEFT JOIN tasks t ON t.id = r.task_id
     LEFT JOIN saved_deals sd ON sd.id = r.saved_deal_id
     WHERE r.sent_at IS NULL
       AND r.remind_at <= NOW()
       AND r.channel IN ('email', 'in_app')
     ORDER BY r.remind_at ASC
     LIMIT 100`
  );

  let sent = 0;
  for (const row of due.rows) {
    if (row.channel === 'email' && row.notify_email) {
      try {
        const greeting = row.recipient_name ? `Hi ${row.recipient_name},` : 'Hi,';
        await sendEmail({
          to: row.notify_email,
          subject: `Vettr reminder: ${row.task_title || row.deal_name || 'Follow up'}`,
          html: `<p>${greeting}</p>
                 <p><strong>${row.task_title || 'Task due'}</strong></p>
                 <p>Deal: ${row.deal_name || '—'}</p>
                 <p><a href="${WEB_APP_URL}/dashboard">Open Vettr CRM</a></p>`
        });
        sent += 1;
      } catch (err) {
        console.warn('[crmReminder] email failed:', err.message);
      }
    }
    await pool.query('UPDATE reminders SET sent_at = NOW() WHERE id = $1', [row.id]);
  }

  if (sent > 0) console.log(`[crmReminder] processed ${due.rows.length} reminders, emailed ${sent}`);
  return { processed: due.rows.length, emailed: sent };
}

export async function sendCrmDailyDigests() {
  const users = await pool.query(
    `SELECT u.id, u.email, us.preferences
     FROM users u
     JOIN user_settings us ON us.user_id = u.id`
  );

  let sent = 0;
  for (const user of users.rows) {
    const prefs = user.preferences || {};
    if (!prefsCrmEmailDigest(prefs)) continue;

    const tasks = await getTodayTaskSummary(user.id);
    const ddOverdue = await getDdOverdueForToday(user.id).catch(() => []);
    const mentions = await getUnreadMentions(user.id).catch(() => []);
    const portalComments = await getRecentPortalComments(user.id).catch(() => []);
    const staleListings = await findStaleListings(user.id).catch(() => []);
    const dormantDeals = await findDormantDeals(user.id, { days: 14, limit: 10 }).catch(() => []);

    const approvals = await pool.query(
      `SELECT a.id, sd.name AS deal_name, a.action_type, a.to_value, u.email AS requester_email
       FROM deal_approvals a
       JOIN saved_deals sd ON sd.id = a.saved_deal_id
       JOIN users u ON u.id = a.requested_by
       JOIN team_members tm ON tm.team_id = a.team_id AND tm.user_id = $1
         AND tm.status = 'active' AND tm.role = 'admin'
       WHERE a.status = 'pending'
       ORDER BY a.created_at ASC
       LIMIT 20`,
      [user.id]
    ).catch(() => ({ rows: [] }));

    const total =
      tasks.badgeCount
      + ddOverdue.length
      + mentions.length
      + portalComments.length
      + staleListings.length
      + dormantDeals.length
      + approvals.rows.length;
    if (total === 0) continue;

    const lines = [
      ...mentions.map((m) => `<li>Mention: ${m.author_email} on ${m.deal_name || 'a deal'}</li>`),
      ...approvals.rows.map(
        (a) =>
          `<li>Approval: ${a.requester_email} — ${a.deal_name || 'deal'}${a.to_value ? ` → ${a.to_value}` : ''}</li>`
      ),
      ...tasks.overdue.map((t) => `<li>Overdue: ${t.title} (${t.deal_name})</li>`),
      ...tasks.dueToday.map((t) => `<li>Due today: ${t.title} (${t.deal_name})</li>`),
      ...ddOverdue.map((d) => `<li>DD overdue: ${d.title} (${d.deal_name})</li>`),
      ...portalComments.map(
        (c) => `<li>Portal comment: ${c.item_title || 'item'} (${c.deal_name})</li>`
      ),
      ...staleListings.map((s) => `<li>Stale listing: ${s.name || s.deal_name || 'deal'}</li>`),
      ...dormantDeals.map(
        (d) =>
          `<li>Dormant (${d.days_idle}d): ${d.deal_name}${d.progress_stage ? ` — ${d.progress_stage}` : ''}</li>`
      )
    ];

    try {
      await sendEmail({
        to: user.email,
        subject: `Vettr Today — ${total} item${total === 1 ? '' : 's'} need attention`,
        html: `<p>Your CRM Today summary:</p><ul>${lines.join('')}</ul>
               <p><a href="${WEB_APP_URL}/dashboard?tab=crm&crmSubview=today">Open Vettr Today</a></p>`
      });
      sent += 1;
      console.log('[crmReminder] digest sent', {
        email: user.email,
        total,
        mentions: mentions.length,
        approvals: approvals.rows.length,
        dormant: dormantDeals.length
      });
    } catch (err) {
      console.warn('[crmReminder] digest failed for', user.email, err.message);
    }
  }

  if (sent > 0) console.log(`[crmReminder] sent ${sent} CRM daily digests`);
  return { sent };
}
