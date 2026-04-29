import { Router } from 'express';
import { login, logout, refresh, me } from '../controllers/auth';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.get('/me', requireAuth, me);

export default router;
