import { Router } from 'express';
import { getUsers, getUser, updateUser, inviteUser, deleteUser, uploadAvatar } from '../controllers/users';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/', requireAdmin, getUsers);
router.get('/:id', requireAuth, getUser);
router.put('/:id', requireAuth, updateUser);
router.post('/invite', requireAdmin, inviteUser);
router.delete('/:id', requireAdmin, deleteUser);
router.post('/avatar', requireAuth, upload.single('avatar'), uploadAvatar);

export default router;
