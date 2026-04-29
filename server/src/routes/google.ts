import { Router } from 'express';
import {
  getAuthUrl, handleCallback, getGoogleStatus,
  getGmailThreads, getCalendarEvents,
  getChatSpaces, getChatMessages, sendChatMessage,
  disconnectGoogle, reconnectGoogle,
} from '../controllers/google';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/auth', requireAuth, getAuthUrl);
router.post('/reconnect', requireAuth, reconnectGoogle);
router.get('/callback', handleCallback);
router.get('/status', requireAuth, getGoogleStatus);
router.get('/gmail/threads', requireAuth, getGmailThreads);
router.get('/calendar/events', requireAuth, getCalendarEvents);
router.get('/chat/spaces', requireAuth, getChatSpaces);
router.get('/chat/spaces/:spaceId/messages', requireAuth, getChatMessages);
router.post('/chat/spaces/:spaceId/messages', requireAuth, sendChatMessage);
router.delete('/disconnect', requireAuth, disconnectGoogle);

export default router;
