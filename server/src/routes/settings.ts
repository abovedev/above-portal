import { Router } from 'express';
import { getSettings, updateSettings } from '../controllers/settings';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

router.get('/', requireAuth, getSettings);
router.put('/', requireAdmin, updateSettings);
router.post('/logo', requireAdmin, upload.single('logo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file' });
  const logoUrl = `/uploads/${req.file.filename}`;
  const { PrismaClient } = await import('@prisma/client');
  const p = new PrismaClient();
  const settings = await p.companySettings.findFirst();
  if (settings) {
    await p.companySettings.update({ where: { id: settings.id }, data: { logoUrl } });
  }
  res.json({ success: true, data: { logoUrl } });
});

export default router;
