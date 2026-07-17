import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireFeedbackAdmin } from '../middleware/requireFeedbackAdmin.js';
import {
  postFeedback,
  getMine,
  getUnread,
  getAdminList,
  getOne,
  postMessage,
  patchStatus,
  postMeToo,
  getOpenBugs,
  getAttachment,
} from '../controllers/feedbackController.js';

const router = Router();

router.use(authMiddleware);

router.post('/', postFeedback);
router.get('/mine', getMine);
router.get('/unread', getUnread);
router.get('/open-bugs', getOpenBugs);
router.get('/admin', requireFeedbackAdmin, getAdminList);
router.get('/attachments/:id', getAttachment);
router.get('/:id', getOne);
router.post('/:id/messages', postMessage);
router.patch('/:id/status', requireFeedbackAdmin, patchStatus);
router.post('/:id/me-too', postMeToo);

export default router;
