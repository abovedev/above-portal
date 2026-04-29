import { Router } from 'express';
import { getPages, getAssignedPages, getPage, createPage, updatePage, deletePage, uploadCover } from '../controllers/pages';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/assigned', requireAuth, getAssignedPages);
router.get('/', requireAuth, getPages);
router.get('/:id', requireAuth, getPage);
router.post('/', requireAdmin, createPage);
router.put('/:id', requireAdmin, updatePage);
router.delete('/:id', requireAdmin, deletePage);
router.post('/cover', requireAdmin, upload.single('cover'), uploadCover);

export default router;
