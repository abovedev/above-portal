import { Router } from 'express';
import { authenticate, requireAdmin, requireAdminOrTagPermission } from '../middleware/auth';
import {
  getFolders, addFolder, updateFolder, removeFolder, purgeStaleFiles,
  syncFolder, syncAll, countFolderFiles,
  getFiles, getFileStats, getQASummary, getArchiveReport, matchMissingShots,
  renameFile, bulkRenameFiles, updateFileTags, suggestFileTags,
} from '../controllers/files';
import {
  getCategories, createCategory, updateCategory, deleteCategory,
  createValue, deleteValue,
  getPermissions, setPermission, removePermission,
} from '../controllers/tags';
import { getMissingShots, createMissingShot, updateMissingShot, deleteMissingShot } from '../controllers/missingShots';

const router = Router();
router.use(authenticate);

// Folders
router.get('/folders', requireAdmin, getFolders);
router.post('/folders', requireAdmin, addFolder);
router.patch('/folders/:id', requireAdmin, updateFolder);
router.delete('/folders/:id', requireAdmin, removeFolder);
router.get('/folders/:id/count', requireAdmin, countFolderFiles);
router.post('/folders/:id/sync', requireAdmin, syncFolder);
router.post('/sync', requireAdmin, syncAll);
router.post('/purge-stale', requireAdmin, purgeStaleFiles);

// Files
router.get('/stats', requireAdmin, getFileStats);
router.get('/qa-summary', requireAdmin, getQASummary);
router.get('/report', requireAdmin, getArchiveReport);
router.get('/match-missing-shots', requireAdmin, matchMissingShots);
router.get('/', getFiles);
router.patch('/:id/rename', requireAdmin, renameFile);
router.post('/bulk-rename', requireAdmin, bulkRenameFiles);
router.post('/:id/suggest-tags', requireAdminOrTagPermission, suggestFileTags);
router.patch('/:id/tags', requireAdminOrTagPermission, updateFileTags);

// Tag categories
router.get('/tags', getCategories);
router.post('/tags', requireAdmin, createCategory);
router.patch('/tags/:id', requireAdmin, updateCategory);
router.delete('/tags/:id', requireAdmin, deleteCategory);
router.post('/tags/:id/values', requireAdmin, createValue);
router.delete('/tags/:id/values/:valueId', requireAdmin, deleteValue);

// Tag permissions
router.get('/tags/permissions', requireAdmin, getPermissions);
router.post('/tags/permissions', requireAdmin, setPermission);
router.delete('/tags/permissions/:userId', requireAdmin, removePermission);

// Missing shots
router.get('/missing-shots', getMissingShots);
router.post('/missing-shots', createMissingShot);
router.patch('/missing-shots/:id', updateMissingShot);
router.delete('/missing-shots/:id', requireAdmin, deleteMissingShot);

export default router;
