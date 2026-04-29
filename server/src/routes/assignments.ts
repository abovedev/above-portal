import { Router } from 'express';
import { getAssignmentsByUser, assign, unassign } from '../controllers/assignments';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/user/:userId', requireAdmin, getAssignmentsByUser);
router.post('/', requireAdmin, assign);
router.delete('/:id', requireAdmin, unassign);

export default router;
