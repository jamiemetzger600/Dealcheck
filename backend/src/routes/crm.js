import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getCrmToday,
  getCrmKanban,
  getDealActivities,
  addDealActivity,
  refreshDealFromListing,
  patchDealStage,
  getDealTasks,
  postDealTask,
  postQuickFollowUp,
  patchTask
} from '../controllers/crmController.js';
import {
  getDealDd,
  startDealDd,
  patchDealDdItem,
  postDdShareLink,
  deleteDdShareLink
} from '../controllers/ddController.js';

const router = express.Router();

router.use(authMiddleware);

router.get('/today', getCrmToday);
router.get('/kanban', getCrmKanban);
router.patch('/deals/:id/stage', patchDealStage);
router.get('/deals/:id/activities', getDealActivities);
router.post('/deals/:id/activities', addDealActivity);
router.post('/deals/:id/refresh-from-listing', refreshDealFromListing);

router.get('/deals/:id/tasks', getDealTasks);
router.post('/deals/:id/tasks', postDealTask);
router.post('/deals/:id/follow-up', postQuickFollowUp);
router.patch('/tasks/:taskId', patchTask);

router.get('/deals/:id/dd', getDealDd);
router.post('/deals/:id/dd/start', startDealDd);
router.patch('/deals/:id/dd/items/:itemId', patchDealDdItem);
router.post('/deals/:id/dd/share-links', postDdShareLink);
router.delete('/deals/:id/dd/share-links/:linkId', deleteDdShareLink);

export default router;
