import express from 'express';
import { getUserSettings, updateUserSettings, getUserEntitlements } from '../controllers/userController.js';
import {
  getPushPublicKey,
  subscribePush,
  unsubscribePush,
  postTestPush,
  postSendDigestNow
} from '../controllers/pushController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/settings', authMiddleware, getUserSettings);
router.put('/settings', authMiddleware, updateUserSettings);
router.get('/entitlements', authMiddleware, getUserEntitlements);
router.get('/push/public-key', authMiddleware, getPushPublicKey);
router.post('/push/subscribe', authMiddleware, subscribePush);
router.post('/push/unsubscribe', authMiddleware, unsubscribePush);
router.post('/push/test', authMiddleware, postTestPush);
router.post('/notifications/digest-now', authMiddleware, postSendDigestNow);

export default router;
