import pool from '../db/pool.js';
import { hydrateCrmForSavedDeal } from '../services/crmHydration.js';
import { PIPELINE_STAGES, UNSTAGED_KEY, KANBAN_COLUMNS, kanbanColumnForStage } from '../constants/pipelineStages.js';
import { updateDealPipelineStage } from '../services/crmStageService.js';
import { findStaleListings } from '../services/crmStaleListing.js';
import {
  getTodayTaskSummary,
  listAllTasks,
  listDealTasks,
  createTask,
  createQuickFollowUp,
  updateTask
} from '../services/crmTaskService.js';
import { getDdOverdueForToday, getRecentPortalComments } from '../services/ddChecklistService.js';
import { getCrmFunnelAnalytics } from '../services/crmAnalyticsService.js';
import { listDealDocuments, addDealDocument } from '../services/crmDocumentService.js';
import {
  isGoogleCalendarOAuthConfigured,
  getGoogleCalendarAuthUrl,
  verifyOAuthState,
  exchangeCodeAndStoreTokens,
  disconnectGoogleCalendar,
  getGoogleCalendarRedirectUri
} from '../services/googleCalendarService.js';
import {
  listCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  syncCalendarRange
} from '../services/crmCalendarService.js';

const KANBAN_DEAL_FIELDS = `
  id, deal_id, name, url, progress_stage, progress_history, status,
  asking_price, ebitda, revenue, city, state, industry, source,
  market_deal_id, calculator_state, saved_at, updated_at
`;

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

export const getCrmKanban = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await pool.query(
      `SELECT ${KANBAN_DEAL_FIELDS} FROM saved_deals WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId]
    );

    const deals = result.rows.map((row) => ({
      ...row,
      progress_history: normalizeProgressHistory(row.progress_history)
    }));

    const buckets = new Map(KANBAN_COLUMNS.map((col) => [col.id, []]));

    for (const deal of deals) {
      const col = kanbanColumnForStage(deal.progress_stage);
      buckets.get(col.id).push(deal);
    }

    const columns = KANBAN_COLUMNS.map((col) => ({
      id: col.id,
      label: col.label,
      stage: col.id,
      deals: buckets.get(col.id) || []
    }));

    res.json({
      columns,
      unstaged: buckets.get(UNSTAGED_KEY) || [],
      unstagedKey: UNSTAGED_KEY,
      stages: PIPELINE_STAGES,
      kanbanColumns: KANBAN_COLUMNS.map(({ id, label }) => ({ id, label })),
      totalDeals: deals.length
    });
  } catch (error) {
    console.error('[crm] getCrmKanban error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const patchDealStage = async (req, res) => {
  const { id } = req.params;
  const { progressStage } = req.body;

  try {
    const stageValue = progressStage == null || progressStage === '' ? null : progressStage;
    const result = await updateDealPipelineStage(req.user.userId, id, stageValue);
    res.json(result);
  } catch (error) {
    if (error.status === 404) {
      return res.status(404).json({ error: 'Deal not found' });
    }
    if (error.message === 'Invalid pipeline stage') {
      return res.status(400).json({ error: error.message });
    }
    console.error('[crm] patchDealStage error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getCrmToday = async (req, res) => {
  try {
    const userId = req.user.userId;
    const dealsResult = await pool.query(
      `SELECT id, deal_id, name, progress_stage, market_deal_id, saved_at, updated_at
       FROM saved_deals WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId]
    );

    const taskSummary = await getTodayTaskSummary(userId).catch((err) => {
      console.warn('[crm] getTodayTaskSummary skipped:', err.message);
      return { overdue: [], dueToday: [], upcoming: [], badgeCount: 0 };
    });
    const staleListings = await findStaleListings(userId).catch((err) => {
      console.warn('[crm] findStaleListings skipped:', err.message);
      return [];
    });
    const ddOverdue = await getDdOverdueForToday(userId).catch((err) => {
      console.warn('[crm] getDdOverdueForToday skipped:', err.message);
      return [];
    });
    const portalComments = await getRecentPortalComments(userId).catch((err) => {
      console.warn('[crm] getRecentPortalComments skipped:', err.message);
      return [];
    });

    const recentActivities = await pool.query(
      `SELECT a.id, a.saved_deal_id, a.activity_type, a.body, a.occurred_at, a.metadata,
              sd.name AS deal_name
       FROM activities a
       JOIN saved_deals sd ON sd.id = a.saved_deal_id AND sd.user_id = $1
       WHERE a.user_id = $1
       ORDER BY a.occurred_at DESC
       LIMIT 50`,
      [userId]
    );

    res.json({
      dealCount: dealsResult.rows.length,
      deals: dealsResult.rows,
      recentActivities: recentActivities.rows,
      tasks: taskSummary,
      staleListings,
      ddOverdue,
      portalComments,
      badgeCount:
        taskSummary.badgeCount + staleListings.length + ddOverdue.length + portalComments.length
    });
  } catch (error) {
    console.error('[crm] getCrmToday error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getDealActivities = async (req, res) => {
  const { id } = req.params;
  try {
    const dealCheck = await pool.query(
      'SELECT id FROM saved_deals WHERE user_id = $1 AND id = $2',
      [req.user.userId, id]
    );
    if (dealCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const contacts = await pool.query(
      `SELECT c.id, c.name, c.email, c.phone, dc.role, co.name AS company_name
       FROM deal_contacts dc
       JOIN contacts c ON c.id = dc.contact_id
       LEFT JOIN companies co ON co.id = c.company_id
       WHERE dc.saved_deal_id = $1`,
      [id]
    );

    const activities = await pool.query(
      `SELECT id, activity_type, body, metadata, occurred_at, contact_id
       FROM activities
       WHERE user_id = $1 AND saved_deal_id = $2
       ORDER BY occurred_at DESC`,
      [req.user.userId, id]
    );

    res.json({ contacts: contacts.rows, activities: activities.rows });
  } catch (error) {
    console.error('[crm] getDealActivities error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const addDealActivity = async (req, res) => {
  const { id } = req.params;
  const { body, activityType = 'note' } = req.body;

  if (!body || !String(body).trim()) {
    return res.status(400).json({ error: 'Activity body required' });
  }

  try {
    const dealCheck = await pool.query(
      'SELECT id FROM saved_deals WHERE user_id = $1 AND id = $2',
      [req.user.userId, id]
    );
    if (dealCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const result = await pool.query(
      `INSERT INTO activities (user_id, saved_deal_id, activity_type, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id, activity_type, body, occurred_at`,
      [req.user.userId, id, activityType, String(body).trim()]
    );

    res.status(201).json({ activity: result.rows[0] });
  } catch (error) {
    console.error('[crm] addDealActivity error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const refreshDealFromListing = async (req, res) => {
  const { id } = req.params;
  try {
    const dealRow = await pool.query(
      `SELECT id, deal_id, listing_id, source, broker_name, broker_company, broker_email, broker_phone
       FROM saved_deals WHERE user_id = $1 AND id = $2`,
      [req.user.userId, id]
    );
    if (dealRow.rows.length === 0) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    const deal = dealRow.rows[0];
    const result = await hydrateCrmForSavedDeal(req.user.userId, deal.id, {
      dealId: deal.deal_id,
      listingId: deal.listing_id,
      source: deal.source,
      brokerName: deal.broker_name,
      brokerCompany: deal.broker_company,
      brokerEmail: deal.broker_email,
      brokerPhone: deal.broker_phone
    });

    res.json({ message: 'Listing data refreshed', ...result });
  } catch (error) {
    console.error('[crm] refreshDealFromListing error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getCrmTasks = async (req, res) => {
  try {
    const status = ['open', 'done', 'all'].includes(req.query.status) ? req.query.status : 'open';
    const tasks = await listAllTasks(req.user.userId, { status });
    res.json({ tasks });
  } catch (error) {
    console.error('[crm] getCrmTasks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getDealTasks = async (req, res) => {
  try {
    const tasks = await listDealTasks(req.user.userId, req.params.id);
    res.json({ tasks });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ error: error.message });
    console.error('[crm] getDealTasks error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const postDealTask = async (req, res) => {
  try {
    const { title, dueAt, source, metadata, notifyRecipients } = req.body;
    const task = await createTask(req.user.userId, req.params.id, {
      title,
      dueAt,
      source,
      metadata,
      notifyRecipients
    });
    res.status(201).json({ task });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ error: error.message });
    if (error.status === 400) return res.status(400).json({ error: error.message });
    console.error('[crm] postDealTask error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const postQuickFollowUp = async (req, res) => {
  try {
    const { preset, dueAt, title, notifyRecipients } = req.body;
    const task = await createQuickFollowUp(req.user.userId, req.params.id, {
      preset,
      dueAt,
      title,
      notifyRecipients
    });
    res.status(201).json({ task });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ error: error.message });
    console.error('[crm] postQuickFollowUp error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const patchTask = async (req, res) => {
  try {
    const task = await updateTask(req.user.userId, req.params.taskId, req.body);
    res.json({ task });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ error: error.message });
    console.error('[crm] patchTask error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getCrmContacts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const result = await pool.query(
      `SELECT c.id, c.name, c.email, c.phone, co.name AS company_name,
              COALESCE(linked.deals, '[]'::json) AS linked_deals,
              COALESCE(linked.deal_count, 0)::int AS deal_count
       FROM contacts c
       LEFT JOIN companies co ON co.id = c.company_id
       LEFT JOIN LATERAL (
         SELECT json_agg(json_build_object('id', sd.id, 'name', sd.name) ORDER BY sd.name) AS deals,
                COUNT(DISTINCT sd.id)::int AS deal_count
         FROM deal_contacts dc
         JOIN saved_deals sd ON sd.id = dc.saved_deal_id AND sd.user_id = $1
         WHERE dc.contact_id = c.id
       ) linked ON true
       WHERE c.user_id = $1
       ORDER BY c.name NULLS LAST, c.email`,
      [userId]
    );
    res.json({ contacts: result.rows });
  } catch (error) {
    console.error('[crm] getCrmContacts error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getCrmAnalytics = async (req, res) => {
  try {
    const analytics = await getCrmFunnelAnalytics(req.user.userId);
    res.json(analytics);
  } catch (error) {
    console.error('[crm] getCrmAnalytics error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getDealDocuments = async (req, res) => {
  try {
    const documents = await listDealDocuments(req.user.userId, req.params.id);
    res.json({ documents });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ error: error.message });
    console.error('[crm] getDealDocuments error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const postDealDocument = async (req, res) => {
  try {
    const document = await addDealDocument(req.user.userId, req.params.id, req.body);
    res.status(201).json({ document });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ error: error.message });
    if (error.status === 400) return res.status(400).json({ error: error.message });
    console.error('[crm] postDealDocument error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getCalendarOAuthConfig = async (req, res) => {
  try {
    const configured = isGoogleCalendarOAuthConfigured();
    res.json({
      oauthConfigured: configured,
      redirectUri: configured ? getGoogleCalendarRedirectUri() : null
    });
  } catch (error) {
    console.error('[crm] getCalendarOAuthConfig error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getCalendarStatus = async (req, res) => {
  try {
    const row = await pool.query(
      'SELECT provider, calendar_id, connected_at FROM calendar_connections WHERE user_id = $1',
      [req.user.userId]
    );
    res.json({
      connected: row.rows.length > 0,
      provider: row.rows[0]?.provider || null,
      connectedAt: row.rows[0]?.connected_at || null,
      oauthConfigured: isGoogleCalendarOAuthConfigured(),
      redirectUri: isGoogleCalendarOAuthConfigured() ? getGoogleCalendarRedirectUri() : null
    });
  } catch (error) {
    console.error('[crm] getCalendarStatus error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getCalendarOAuthUrl = async (req, res) => {
  try {
    const url = getGoogleCalendarAuthUrl(req.user.userId);
    res.json({ url });
  } catch (error) {
    if (error.status === 503) return res.status(503).json({ error: error.message });
    console.error('[crm] getCalendarOAuthUrl error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const googleCalendarOAuthCallback = async (req, res) => {
  const webBase = (process.env.WEB_APP_URL || 'http://localhost:5173')
    .split(',')[0]
    .trim()
    .replace(/\/+$/, '');
  const redirectWith = (params) => {
    const qs = new URLSearchParams(params);
    res.redirect(`${webBase}/dashboard?${qs.toString()}`);
  };

  try {
    const { code, state, error: oauthError } = req.query;
    if (oauthError) {
      return redirectWith({
        tab: 'crm',
        crmSubview: 'calendar',
        calendar: 'error',
        message: String(oauthError)
      });
    }
    if (!code || !state) {
      return redirectWith({
        tab: 'crm',
        crmSubview: 'calendar',
        calendar: 'error',
        message: 'Missing authorization code'
      });
    }

    const userId = verifyOAuthState(String(state));
    await exchangeCodeAndStoreTokens(userId, String(code));
    return redirectWith({ tab: 'crm', crmSubview: 'calendar', calendar: 'connected' });
  } catch (error) {
    console.error('[crm] googleCalendarOAuthCallback error:', error);
    return redirectWith({
      tab: 'crm',
      crmSubview: 'calendar',
      calendar: 'error',
      message: error.message || 'OAuth failed'
    });
  }
};

export const deleteCalendarConnection = async (req, res) => {
  try {
    const result = await disconnectGoogleCalendar(req.user.userId);
    res.json(result);
  } catch (error) {
    console.error('[crm] deleteCalendarConnection error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getCalendarEvents = async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: 'start and end query params required' });
    }
    const events = await listCalendarEvents(req.user.userId, start, end);
    res.json({ events });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
    console.error('[crm] getCalendarEvents error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const postCalendarEvent = async (req, res) => {
  try {
    const event = await createCalendarEvent(req.user.userId, req.body);
    res.status(201).json({ event });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
    if (error.status === 404) return res.status(404).json({ error: error.message });
    console.error('[crm] postCalendarEvent error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const patchCalendarEvent = async (req, res) => {
  try {
    const event = await updateCalendarEvent(req.user.userId, req.params.eventId, req.body);
    res.json({ event });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ error: error.message });
    console.error('[crm] patchCalendarEvent error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const removeCalendarEvent = async (req, res) => {
  try {
    const result = await deleteCalendarEvent(req.user.userId, req.params.eventId);
    res.json(result);
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ error: error.message });
    console.error('[crm] removeCalendarEvent error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const postCalendarSync = async (req, res) => {
  try {
    const { start, end } = req.body || {};
    if (!start || !end) {
      return res.status(400).json({ error: 'start and end required' });
    }
    const result = await syncCalendarRange(req.user.userId, start, end);
    const events = await listCalendarEvents(req.user.userId, start, end, { sync: false });
    res.json({ ...result, events });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
    console.error('[crm] postCalendarSync error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
