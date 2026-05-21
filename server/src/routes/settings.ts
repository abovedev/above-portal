import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';
import prisma from '../prisma/client';
import { sendError, sendSuccess } from '../utils/response';

const router = Router();

router.get('/', requireAuth, getSettings);
router.put('/', requireAdmin, updateSettings);
router.post('/logo', requireAdmin, upload.single('logo'), async (req, res) => {
  if (!req.file) return sendError(res, 'No file uploaded', 400);
  const logoUrl = `/uploads/${req.file.filename}`;
  const settings = await prisma.companySettings.findFirst();
  if (settings) {
    await prisma.companySettings.update({ where: { id: settings.id }, data: { logoUrl } });
  } else {
    await prisma.companySettings.create({ data: { logoUrl } });
  }
  return sendSuccess(res, { logoUrl });
});

export default router;
