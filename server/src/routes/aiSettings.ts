import { Router } from 'express';
import { getAdminAISettings, updateAdminAISettings } from '../controllers/aiSettings';
import { requireAdmin } from '../middleware/auth';

const router = Router();

router.get('/', requireAdmin, getAdminAISettings);
router.put('/', requireAdmin, updateAdminAISettings);

export default router;
