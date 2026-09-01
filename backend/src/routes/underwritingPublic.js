import express from 'express';
import { getPublicUw, postPublicUwUnlock } from '../controllers/underwritingController.js';

const router = express.Router();

router.get('/:token', getPublicUw);
router.post('/:token/unlock', postPublicUwUnlock);

export default router;
