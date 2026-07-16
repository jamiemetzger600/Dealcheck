import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  listTeams,
  createTeam,
  getTeam,
  inviteMember,
  createInviteLink,
  revokeInvite,
  acceptInvite,
  removeMember,
  updateMemberRole,
  shareDealToTeam,
  unshareDeal,
  listPendingApprovals,
  reviewApproval
} from '../controllers/teamsController.js';

const router = express.Router();
router.use(authMiddleware);

router.get('/', listTeams);
router.post('/', createTeam);
router.post('/invites/accept', acceptInvite);
router.get('/approvals', listPendingApprovals);
router.post('/approvals/:approvalId/review', reviewApproval);

router.get('/:teamId', getTeam);
router.post('/:teamId/invites', inviteMember);
router.post('/:teamId/invite-links', createInviteLink);
router.delete('/:teamId/invites/:inviteId', revokeInvite);
router.patch('/:teamId/members/:userId', updateMemberRole);
router.delete('/:teamId/members/:userId', removeMember);
router.post('/:teamId/deals/:dealId/share', shareDealToTeam);
router.post('/deals/:dealId/unshare', unshareDeal);

export default router;
