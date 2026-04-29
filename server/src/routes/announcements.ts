import { Router } from 'express';
import { getAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement } from '../controllers/announcements';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getAnnouncements);
router.post('/', requireAdmin, createAnnouncement);
router.put('/:id', requireAdmin, updateAnnouncement);
router.delete('/:id', requireAdmin, deleteAnnouncement);

export default router;
