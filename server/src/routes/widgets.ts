import { Router } from 'express';
import { getWidgets, addWidget, updateWidget, batchUpdateWidgets, deleteWidget } from '../controllers/widgets';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, getWidgets);
router.post('/', requireAuth, addWidget);
router.put('/batch', requireAuth, batchUpdateWidgets);
router.put('/:id', requireAuth, updateWidget);
router.delete('/:id', requireAuth, deleteWidget);

export default router;
