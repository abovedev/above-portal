import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { pushNotification } from '../utils/notificationStream';

export async function getAnnouncements(req: AuthRequest, res: Response) {
  const isAdmin = req.user!.role === 'ADMIN';
  const announcements = await prisma.announcement.findMany({
    where: {
      ...(!isAdmin && {
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      }),
    },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
    },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
  });
  return sendSuccess(res, { announcements });
}

const announcementSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('LOW'),
  isPinned: z.boolean().default(false),
  expiresAt: z.string().datetime().optional().nullable(),
});

export async function createAnnouncement(req: AuthRequest, res: Response) {
  const parsed = announcementSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid data', 400);

  const { expiresAt, ...rest } = parsed.data;
  const announcement = await prisma.announcement.create({
    data: {
      ...rest,
      ...(expiresAt && { expiresAt: new Date(expiresAt) }),
      createdById: req.user!.userId,
    },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  const users = await prisma.user.findMany({
    where: { role: 'USER', isActive: true },
    select: { id: true },
  });

  await Promise.all(
    users.map(async (user) => {
      const notification = await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'New Announcement',
          message: announcement.title,
          type: 'ANNOUNCEMENT',
          link: '/dashboard',
        },
      });
      pushNotification(notification);
    })
  );

  return sendSuccess(res, { announcement }, 'Announcement created', 201);
}

export async function updateAnnouncement(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const parsed = announcementSchema.partial().safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid data', 400);

  const { expiresAt, ...rest } = parsed.data;
  const announcement = await prisma.announcement.update({
    where: { id },
    data: {
      ...rest,
      ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
    },
    include: {
      createdBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return sendSuccess(res, { announcement }, 'Announcement updated');
}

export async function deleteAnnouncement(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  await prisma.announcement.delete({ where: { id } });
  return sendSuccess(res, null, 'Announcement deleted');
}
