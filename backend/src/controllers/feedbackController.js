import {
  createSubmission,
  listMine,
  countUnreadForUser,
  listAdmin,
  getSubmissionDetail,
  addMessage,
  updateStatus,
  addMeToo,
  listOpenBugsForMeToo,
  getAttachmentForUser,
  viewerIsAdmin,
} from '../services/feedbackService.js';

export const postFeedback = async (req, res) => {
  try {
    const detail = await createSubmission(req.user.userId, req.body || {});
    res.status(201).json(detail);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[feedback] postFeedback error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getMine = async (req, res) => {
  try {
    const items = await listMine(req.user.userId);
    const unreadCount = await countUnreadForUser(req.user.userId);
    res.json({ items, unreadCount, isAdmin: viewerIsAdmin(req.user.email) });
  } catch (error) {
    console.error('[feedback] getMine error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getUnread = async (req, res) => {
  try {
    const unreadCount = await countUnreadForUser(req.user.userId);
    res.json({ unreadCount, isAdmin: viewerIsAdmin(req.user.email) });
  } catch (error) {
    console.error('[feedback] getUnread error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getAdminList = async (req, res) => {
  try {
    const items = await listAdmin({
      category: req.query.category,
      status: req.query.status,
      severity: req.query.severity,
      q: req.query.q,
      limit: req.query.limit,
      offset: req.query.offset,
    });
    res.json({ items });
  } catch (error) {
    console.error('[feedback] getAdminList error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getOne = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const asAdmin = viewerIsAdmin(req.user.email);
    const detail = await getSubmissionDetail(req.user.userId, id, { asAdmin });
    res.json(detail);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[feedback] getOne error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const postMessage = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const asAdmin = viewerIsAdmin(req.user.email);
    const detail = await addMessage(req.user.userId, id, {
      body: req.body?.body,
      asAdmin,
      attachments: req.body?.attachments || [],
    });
    res.status(201).json(detail);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[feedback] postMessage error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const patchStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const detail = await updateStatus(req.user.userId, id, String(req.body?.status || '').toLowerCase());
    res.json(detail);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[feedback] patchStatus error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const postMeToo = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const detail = await addMeToo(req.user.userId, id);
    res.json(detail);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[feedback] postMeToo error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getOpenBugs = async (req, res) => {
  try {
    const items = await listOpenBugsForMeToo(req.user.userId);
    res.json({ items });
  } catch (error) {
    console.error('[feedback] getOpenBugs error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getAttachment = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const asAdmin = viewerIsAdmin(req.user.email);
    const row = await getAttachmentForUser(req.user.userId, id, { asAdmin });
    res.setHeader('Content-Type', row.mime_type);
    res.setHeader('Content-Length', row.data.length);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.send(row.data);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ error: error.message });
    console.error('[feedback] getAttachment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
