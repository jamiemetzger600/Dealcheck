import express from 'express';
import {
  getPublicDd,
  patchPublicDdItemHandler,
  postPublicDdComment,
  postPublicDdDocument
} from '../controllers/ddController.js';

const router = express.Router();

router.get('/:token', getPublicDd);
router.patch('/:token/items/:itemId', patchPublicDdItemHandler);
router.post('/:token/items/:itemId/comments', postPublicDdComment);
router.post('/:token/items/:itemId/documents', postPublicDdDocument);

export default router;
