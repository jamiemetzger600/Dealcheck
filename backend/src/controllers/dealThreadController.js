import {
  listDealMessages,
  postDealMessage,
  reactToMessage,
  resolveMessage
} from '../services/dealThreadService.js';
import { getDealAccess, assertCanTalk } from '../lib/teamAcl.js';
import pool from '../db/pool.js';

export const getThread = async (req, res) => {
  try {
    const savedDealId = Number(req.params.id);
    const afterId = req.query.afterId ? Number(req.query.afterId) : undefined;
    const data = await listDealMessages(req.user.userId, savedDealId, { afterId });
    res.json(data);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[thread] getThread error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const postThreadMessage = async (req, res) => {
  try {
    const savedDealId = Number(req.params.id);
    const message = await postDealMessage(req.user.userId, savedDealId, {
      body: req.body?.body,
      assigneeUserId: req.body?.assigneeUserId,
      dueAt: req.body?.dueAt,
      linkedDdItemId: req.body?.linkedDdItemId
    });
    res.status(201).json({ message });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[thread] postThreadMessage error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const postReaction = async (req, res) => {
  try {
    const messageId = Number(req.params.messageId);
    const result = await reactToMessage(req.user.userId, messageId, req.body?.emoji);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[thread] postReaction error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const patchResolve = async (req, res) => {
  try {
    const messageId = Number(req.params.messageId);
    const resolved = req.body?.resolved !== false;
    const result = await resolveMessage(req.user.userId, messageId, resolved);
    res.json(result);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[thread] patchResolve error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

/** Team members for @mention picker on a deal. */
export const getThreadMembers = async (req, res) => {
  try {
    const savedDealId = Number(req.params.id);
    const access = await getDealAccess(req.user.userId, savedDealId);
    assertCanTalk(access);
    if (!access.deal.team_id) {
      return res.json({ members: [] });
    }
    const members = await pool.query(
      `SELECT u.id, u.email, tm.role
       FROM team_members tm
       JOIN users u ON u.id = tm.user_id
       WHERE tm.team_id = $1 AND tm.status = 'active'
       ORDER BY u.email`,
      [access.deal.team_id]
    );
    res.json({ members: members.rows });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[thread] getThreadMembers error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
