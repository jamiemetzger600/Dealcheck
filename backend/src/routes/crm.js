import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getCrmToday,
  getCrmKanban,
  getDealActivities,
  addDealActivity,
  refreshDealFromListing,
  patchDealStage
} from '../controllers/crmController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/today', getCrmToday);
router.get('/kanban', getCrmKanban);
router.patch('/deals/:id/stage', patchDealStage);
router.get('/deals/:id/activities', getDealActivities);
router.post('/deals/:id/activities', addDealActivity);
router.post('/deals/:id/refresh-from-listing', refreshDealFromListing);

export default router;
