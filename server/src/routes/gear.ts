import { Router } from 'express';
import {
  getGearItems, getGearItem, createGearItem, updateGearItem, deleteGearItem,
  checkoutGear, returnGear, confirmReturn,
  getGearRequests, submitGearRequest, reviewGearRequest, cancelGearRequest, pickupGear,
  getGearStats, getMyAssignmentHistory,
} from '../controllers/gear';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

// Stats
router.get('/stats', requireAdmin, getGearStats);

// User assignment history (must be before /:id)
router.get('/my-history', requireAuth, getMyAssignmentHistory);

// Requests — list (must be before /:id)
router.get('/requests', requireAuth, getGearRequests);
router.put('/requests/:reqId/review', requireAdmin, reviewGearRequest);
router.delete('/requests/:reqId', requireAuth, cancelGearRequest);
router.post('/requests/:reqId/pickup', requireAuth, pickupGear);

// Items
router.get('/', requireAuth, getGearItems);
router.get('/:id', requireAuth, getGearItem);
router.post('/', requireAdmin, createGearItem);
router.put('/:id', requireAdmin, updateGearItem);
router.delete('/:id', requireAdmin, deleteGearItem);

// Checkout / return
router.post('/:id/checkout', requireAdmin, checkoutGear);
router.post('/:id/return', requireAuth, returnGear);
router.post('/:id/confirm-return', requireAdmin, confirmReturn);

// User request
router.post('/:id/request', requireAuth, submitGearRequest);

export default router;
