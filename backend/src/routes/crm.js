import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getCrmToday,
  getCrmKanban,
  getCrmContacts,
  getCrmTasks,
  getCrmAnalytics,
  getCalendarStatus,
  getCalendarOAuthConfig,
  getCalendarOAuthUrl,
  googleCalendarOAuthCallback,
  deleteCalendarConnection,
  getCalendarEvents,
  postCalendarEvent,
  patchCalendarEvent,
  removeCalendarEvent,
  postCalendarSync,
  getDealActivities,
  addDealActivity,
  refreshDealFromListing,
  patchDealStage,
  getDealTasks,
  postDealTask,
  postQuickFollowUp,
  patchTask,
  getDealDocuments,
  postDealDocument
} from '../controllers/crmController.js';
import {
  getThread,
  postThreadMessage,
  postReaction,
  patchResolve,
  getThreadMembers
} from '../controllers/dealThreadController.js';
import {
  getDealDd,
  startDealDd,
  patchDealDdItem,
  postDdShareLink,
  deleteDdShareLink,
  postDdGroup,
  postDdItem,
  postDdItemDocument
} from '../controllers/ddController.js';

const router = express.Router();

router.get('/calendar/oauth/callback', googleCalendarOAuthCallback);
router.get('/calendar/oauth-config', getCalendarOAuthConfig);

router.use(authMiddleware);

router.get('/today', getCrmToday);
router.get('/tasks', getCrmTasks);
router.get('/kanban', getCrmKanban);
router.get('/contacts', getCrmContacts);
router.get('/analytics', getCrmAnalytics);
router.get('/calendar/status', getCalendarStatus);
router.get('/calendar/events', getCalendarEvents);
router.post('/calendar/events', postCalendarEvent);
router.post('/calendar/sync', postCalendarSync);
router.patch('/calendar/events/:eventId', patchCalendarEvent);
router.delete('/calendar/events/:eventId', removeCalendarEvent);
router.get('/calendar/oauth/start', getCalendarOAuthUrl);
router.delete('/calendar/connection', deleteCalendarConnection);
router.patch('/deals/:id/stage', patchDealStage);
router.get('/deals/:id/activities', getDealActivities);
router.post('/deals/:id/activities', addDealActivity);
router.post('/deals/:id/refresh-from-listing', refreshDealFromListing);

router.get('/deals/:id/thread', getThread);
router.get('/deals/:id/thread/members', getThreadMembers);
router.post('/deals/:id/thread', postThreadMessage);
router.post('/deals/:id/thread/messages/:messageId/reactions', postReaction);
router.patch('/deals/:id/thread/messages/:messageId/resolve', patchResolve);

router.get('/deals/:id/tasks', getDealTasks);
router.post('/deals/:id/tasks', postDealTask);
router.post('/deals/:id/follow-up', postQuickFollowUp);
router.patch('/tasks/:taskId', patchTask);

router.get('/deals/:id/documents', getDealDocuments);
router.post('/deals/:id/documents', postDealDocument);

router.get('/deals/:id/dd', getDealDd);
router.post('/deals/:id/dd/start', startDealDd);
router.patch('/deals/:id/dd/items/:itemId', patchDealDdItem);
router.post('/deals/:id/dd/groups', postDdGroup);
router.post('/deals/:id/dd/groups/:groupId/items', postDdItem);
router.post('/deals/:id/dd/items/:itemId/documents', postDdItemDocument);
router.post('/deals/:id/dd/share-links', postDdShareLink);
router.delete('/deals/:id/dd/share-links/:linkId', deleteDdShareLink);

export default router;
