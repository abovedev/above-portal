import { Router } from 'express';
import {
  callback,
  connect,
  disconnect,
  getStatus,
  importTask,
  searchTasks,
} from '../controllers/asana';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/status', requireAuth, getStatus);
router.post('/connect', requireAuth, connect);
router.get('/callback', callback);
router.delete('/disconnect', requireAuth, disconnect);
router.get('/tasks/search', requireAuth, searchTasks);
router.post('/tasks/import', requireAuth, importTask);

export default router;
