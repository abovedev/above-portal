import { Response } from 'express';
import { randomUUID } from 'crypto';
import prisma from '../prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { verifyAccessToken } from '../utils/jwt';
import { addNotificationClient } from '../utils/notificationStream';

export async function getNotifications(req: AuthRequest, res: Response) {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  return sendSuccess(res, { notifications, unreadCount });
}

export async function streamNotifications(req: AuthRequest, res: Response) {
  const token = typeof req.query.token === 'string' ? req.query.token : null;
  if (!token) return sendError(res, 'Authentication required', 401, 'UNAUTHORIZED');

  let userId: string;
  try {
    userId = verifyAccessToken(token).userId;
  } catch {
    return sendError(res, 'Invalid or expired token', 401, 'TOKEN_EXPIRED');
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();

  const cleanup = addNotificationClient(userId, {
    id: randomUUID(),
    res,
  });

  const heartbeat = setInterval(() => {
    res.write('event: heartbeat\n');
    res.write('data: {}\n\n');
  }, 25_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    cleanup();
  });
}

export async function markRead(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  await prisma.notification.updateMany({
    where: { id, userId: req.user!.userId },
    data: { isRead: true },
  });
  return sendSuccess(res, null, 'Marked as read');
}

export async function markAllRead(req: AuthRequest, res: Response) {
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, isRead: false },
    data: { isRead: true },
  });
  return sendSuccess(res, null, 'All marked as read');
}
