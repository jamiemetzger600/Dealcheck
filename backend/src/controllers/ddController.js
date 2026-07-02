import {
  getChecklistForDeal,
  startChecklistFromTemplate,
  patchDdItem,
  createShareLink,
  revokeShareLink,
  getPublicChecklistByToken,
  patchPublicDdItem as patchPublicDdItemService,
  addDdGroup,
  addDdItem,
  addDdItemDocument,
  addPublicDdComment,
  addPublicDdDocument
} from '../services/ddChecklistService.js';

export const getDealDd = async (req, res) => {
  try {
    const checklist = await getChecklistForDeal(req.user.userId, req.params.id);
    res.json({ checklist });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ error: error.message });
    console.error('[dd] getDealDd error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const startDealDd = async (req, res) => {
  try {
    const checklist = await startChecklistFromTemplate(req.user.userId, req.params.id);
    res.status(201).json({ checklist });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ error: error.message });
    console.error('[dd] startDealDd error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const patchDealDdItem = async (req, res) => {
  try {
    const checklist = await patchDdItem(
      req.user.userId,
      req.params.id,
      req.params.itemId,
      req.body
    );
    res.json({ checklist });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ error: error.message });
    console.error('[dd] patchDealDdItem error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const postDdShareLink = async (req, res) => {
  try {
    const link = await createShareLink(req.user.userId, req.params.id, req.body);
    res.status(201).json({ link });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
    if (error.status === 404) return res.status(404).json({ error: error.message });
    console.error('[dd] postDdShareLink error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const deleteDdShareLink = async (req, res) => {
  try {
    await revokeShareLink(req.user.userId, req.params.id, req.params.linkId);
    res.json({ revoked: true });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ error: error.message });
    console.error('[dd] deleteDdShareLink error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getPublicDd = async (req, res) => {
  try {
    const data = await getPublicChecklistByToken(req.params.token);
    res.json(data);
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ error: 'Link not found' });
    if (error.status === 410) return res.status(410).json({ error: 'Link expired' });
    console.error('[dd] getPublicDd error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const patchPublicDdItemHandler = async (req, res) => {
  try {
    const checklist = await patchPublicDdItemService(req.params.token, req.params.itemId, req.body);
    res.json({ checklist });
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: error.message });
    if (error.status === 404) return res.status(404).json({ error: error.message });
    console.error('[dd] patchPublicDdItem error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const postDdGroup = async (req, res) => {
  try {
    const checklist = await addDdGroup(req.user.userId, req.params.id, req.body);
    res.status(201).json({ checklist });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
    if (error.status === 404) return res.status(404).json({ error: error.message });
    console.error('[dd] postDdGroup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const postDdItem = async (req, res) => {
  try {
    const checklist = await addDdItem(req.user.userId, req.params.id, req.params.groupId, req.body);
    res.status(201).json({ checklist });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
    if (error.status === 404) return res.status(404).json({ error: error.message });
    console.error('[dd] postDdItem error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const postDdItemDocument = async (req, res) => {
  try {
    const checklist = await addDdItemDocument(
      req.user.userId,
      req.params.id,
      req.params.itemId,
      req.body
    );
    res.status(201).json({ checklist });
  } catch (error) {
    if (error.status === 400) return res.status(400).json({ error: error.message });
    if (error.status === 404) return res.status(404).json({ error: error.message });
    console.error('[dd] postDdItemDocument error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const postPublicDdComment = async (req, res) => {
  try {
    const checklist = await addPublicDdComment(req.params.token, req.params.itemId, req.body);
    res.json({ checklist });
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: error.message });
    if (error.status === 400) return res.status(400).json({ error: error.message });
    console.error('[dd] postPublicDdComment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const postPublicDdDocument = async (req, res) => {
  try {
    const checklist = await addPublicDdDocument(req.params.token, req.params.itemId, req.body);
    res.json({ checklist });
  } catch (error) {
    if (error.status === 403) return res.status(403).json({ error: error.message });
    if (error.status === 400) return res.status(400).json({ error: error.message });
    console.error('[dd] postPublicDdDocument error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
