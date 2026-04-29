import { Router } from 'express';
import { getTasks, createTask, updateTask, deleteTask } from '../controllers/tasks';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getTasks);
router.post('/', requireAuth, createTask);
router.put('/:id', requireAuth, updateTask);
router.delete('/:id', requireAuth, deleteTask);

export default router;
