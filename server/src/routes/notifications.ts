import { Router } from 'express';
import { getNotifications, markRead, markAllRead, streamNotifications } from '../controllers/notifications';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getNotifications);
router.get('/stream', streamNotifications);
router.put('/read-all', requireAuth, markAllRead);
router.put('/:id/read', requireAuth, markRead);

export default router;
