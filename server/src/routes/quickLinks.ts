import { Router } from 'express';
import { getQuickLinks, createQuickLink, updateQuickLink, deleteQuickLink } from '../controllers/quickLinks';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getQuickLinks);
router.post('/', requireAuth, createQuickLink);
router.put('/:id', requireAuth, updateQuickLink);
router.delete('/:id', requireAuth, deleteQuickLink);

export default router;
