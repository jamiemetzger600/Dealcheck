import express from 'express';
import { getUserSettings, updateUserSettings, getUserEntitlements } from '../controllers/userController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/settings', authMiddleware, getUserSettings);
router.put('/settings', authMiddleware, updateUserSettings);
router.get('/entitlements', authMiddleware, getUserEntitlements);

export default router;
