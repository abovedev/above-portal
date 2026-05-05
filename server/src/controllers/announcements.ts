import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { pushNotification } from '../utils/notificationStream';

const createdBySelect = { select: { id: true, firstName: true, lastName: true, avatar: true } };

function groupReactions(reactions: { emoji: string; userId: string }[]) {
  const map: Record<string, { count: number; userIds: string[] }> = {};
  for (const r of reactions) {
    if (!map[r.emoji]) map[r.emoji] = { count: 0, userIds: [] };
    map[r.emoji].count++;
    map[r.emoji].userIds.push(r.userId);
  }
  return Object.entries(map).map(([emoji, data]) => ({ emoji, ...data }));
}

export async function getAnnouncements(req: AuthRequest, res: Response) {
  const isAdmin = req.user!.role === 'ADMIN';
  const announcements = await prisma.announcement.findMany({
    where: {
      ...(!isAdmin && {
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      }),
    },
    include: {
      createdBy: createdBySelect,
      _count: { select: { comments: true } },
      reactions: { select: { emoji: true, userId: true } },
    },
    orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
  });

  return sendSuccess(res, {
    announcements: announcements.map(({ reactions, ...a }) => ({
      ...a,
      reactionSummary: groupReactions(reactions),
    })),
  });
}

export async function getAnnouncementDetail(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const isAdmin = req.user!.role === 'ADMIN';

  const announcement = await prisma.announcement.findFirst({
    where: {
      id,
      ...(!isAdmin && {
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      }),
    },
    include: {
      createdBy: createdBySelect,
      comments: {
        include: { user: createdBySelect },
        orderBy: { createdAt: 'asc' },
      },
      reactions: { select: { id: true, emoji: true, userId: true } },
    },
  });

  if (!announcement) return sendError(res, 'Not found', 404);

  const { reactions, ...rest } = announcement;
  return sendSuccess(res, {
    announcement: { ...rest, reactionSummary: groupReactions(reactions), reactions },
  });
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
    include: { createdBy: createdBySelect },
  });

  const users = await prisma.user.findMany({
    where: { isActive: true, id: { not: req.user!.userId } },
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
    include: { createdBy: createdBySelect },
  });

  return sendSuccess(res, { announcement }, 'Announcement updated');
}

export async function deleteAnnouncement(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  await prisma.announcement.delete({ where: { id } });
  return sendSuccess(res, null, 'Announcement deleted');
}

export async function addComment(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const userId = req.user!.userId;

  const parsed = z.object({
    content: z.string().min(1).max(2000),
    mentionedUserIds: z.array(z.string()).optional().default([]),
  }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid data', 400);

  const { content, mentionedUserIds } = parsed.data;

  const announcement = await prisma.announcement.findFirst({
    where: { id, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    select: { id: true, title: true },
  });
  if (!announcement) return sendError(res, 'Not found', 404);

  const comment = await prisma.announcementComment.create({
    data: {
      announcementId: id,
      userId,
      content,
      ...(mentionedUserIds.length > 0 && {
        mentions: {
          create: mentionedUserIds.map((uid) => ({ userId: uid })),
        },
      }),
    },
    include: { user: createdBySelect },
  });

  if (mentionedUserIds.length > 0) {
    const commenter = await prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    await Promise.all(
      mentionedUserIds.map(async (uid) => {
        const notification = await prisma.notification.create({
          data: {
            userId: uid,
            title: 'You were mentioned',
            message: `${commenter?.firstName} ${commenter?.lastName} mentioned you in "${announcement.title}"`,
            type: 'MENTION',
            link: '/dashboard',
          },
        });
        pushNotification(notification);
      })
    );
  }

  return sendSuccess(res, { comment }, 'Comment added', 201);
}

export async function deleteComment(req: AuthRequest, res: Response) {
  const commentId = req.params.commentId as string;
  const userId = req.user!.userId;
  const isAdmin = req.user!.role === 'ADMIN';

  const comment = await prisma.announcementComment.findUnique({ where: { id: commentId } });
  if (!comment) return sendError(res, 'Not found', 404);
  if (comment.userId !== userId && !isAdmin) return sendError(res, 'Forbidden', 403);

  await prisma.announcementComment.delete({ where: { id: commentId } });
  return sendSuccess(res, null, 'Comment deleted');
}

export async function toggleReaction(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const userId = req.user!.userId;

  const parsed = z.object({ emoji: z.string().min(1).max(10) }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid emoji', 400);

  const { emoji } = parsed.data;

  const existing = await prisma.announcementReaction.findUnique({
    where: { announcementId_userId_emoji: { announcementId: id, userId, emoji } },
  });

  if (existing) {
    await prisma.announcementReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.announcementReaction.create({
      data: { announcementId: id, userId, emoji },
    });
  }

  const reactions = await prisma.announcementReaction.findMany({
    where: { announcementId: id },
    select: { id: true, emoji: true, userId: true },
  });

  return sendSuccess(res, { reactions, reactionSummary: groupReactions(reactions) });
}
