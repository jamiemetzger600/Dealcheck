import pool from '../db/pool.js';
import { hydrateCrmForSavedDeal } from '../services/crmHydration.js';
import { PIPELINE_STAGES, UNSTAGED_KEY, KANBAN_COLUMNS, kanbanColumnForStage } from '../constants/pipelineStages.js';
import { updateDealPipelineStage } from '../services/crmStageService.js';

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
      recentActivities: recentActivities.rows
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
