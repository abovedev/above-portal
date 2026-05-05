import { Router } from 'express';
import {
  getAnnouncements,
  getAnnouncementDetail,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  addComment,
  deleteComment,
  toggleReaction,
} from '../controllers/announcements';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getAnnouncements);
router.get('/:id', requireAuth, getAnnouncementDetail);
router.post('/', requireAdmin, createAnnouncement);
router.put('/:id', requireAdmin, updateAnnouncement);
router.delete('/:id', requireAdmin, deleteAnnouncement);

router.post('/:id/comments', requireAuth, addComment);
router.delete('/:id/comments/:commentId', requireAuth, deleteComment);
router.post('/:id/reactions', requireAuth, toggleReaction);

export default router;
