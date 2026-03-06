import express from 'express';
import { createCheckoutSession, createPortalSession, handleWebhook } from '../controllers/paymentsController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.post('/create-checkout-session', authMiddleware, createCheckoutSession);
router.post('/create-portal-session', authMiddleware, createPortalSession);

// Webhook endpoint (no auth, raw body needed)
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

export default router;
