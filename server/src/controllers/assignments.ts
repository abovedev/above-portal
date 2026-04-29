import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { pushNotification } from '../utils/notificationStream';

export async function getAssignmentsByUser(req: AuthRequest, res: Response) {
  const userId = req.params.userId as string;
  const assignments = await prisma.pageAssignment.findMany({
    where: { userId },
    include: {
      page: {
        include: {
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { assignedAt: 'desc' },
  });
  return sendSuccess(res, { assignments });
}

const assignSchema = z.object({
  pageId: z.string(),
  userIds: z.array(z.string()).min(1),
});

export async function assign(req: AuthRequest, res: Response) {
  const parsed = assignSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid data', 400);

  const { pageId, userIds } = parsed.data;

  const created = await Promise.all(
    userIds.map(async (userId) => {
      const existing = await prisma.pageAssignment.findUnique({
        where: { pageId_userId: { pageId, userId } },
      });
      if (existing) return existing;

      const assignment = await prisma.pageAssignment.create({
        data: { pageId, userId, assignedById: req.user!.userId },
      });

      // Create notification
      const page = await prisma.page.findUnique({ where: { id: pageId }, select: { title: true, slug: true } });
      const admin = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { firstName: true, lastName: true } });
      if (page && admin) {
        const notification = await prisma.notification.create({
          data: {
            userId,
            title: 'New Page Assigned',
            message: `${admin.firstName} ${admin.lastName} assigned you "${page.title}"`,
            type: 'PAGE_ASSIGNED',
            link: `/pages/${page.slug}`,
          },
        });
        pushNotification(notification);
      }

      return assignment;
    })
  );

  return sendSuccess(res, { assignments: created }, 'Pages assigned', 201);
}

export async function unassign(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  await prisma.pageAssignment.delete({ where: { id } });
  return sendSuccess(res, null, 'Assignment removed');
}
