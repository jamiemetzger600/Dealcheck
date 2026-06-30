import express from 'express';
import { getPublicDd, patchPublicDdItemHandler } from '../controllers/ddController.js';

const router = express.Router();

router.get('/:token', getPublicDd);
router.patch('/:token/items/:itemId', patchPublicDdItemHandler);

export default router;
