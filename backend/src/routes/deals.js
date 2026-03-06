import express from 'express';
import { getSavedDeals, saveDeal, updateSavedDeal, deleteSavedDeal } from '../controllers/dealsController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.get('/', authMiddleware, getSavedDeals);
router.post('/', authMiddleware, saveDeal);
router.put('/:id', authMiddleware, updateSavedDeal);
router.delete('/:id', authMiddleware, deleteSavedDeal);

export default router;
