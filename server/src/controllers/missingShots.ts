import { Response } from 'express';
import { z } from 'zod';
import { Priority, MissingShotStatus } from '@prisma/client';
import prisma from '../prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

const shotSchema = z.object({
  subject: z.string().min(1).max(300),
  description: z.string().max(1000).optional(),
  vehicleMake: z.string().max(100).optional(),
  packageType: z.string().max(100).optional(),
  category: z.string().max(100).optional(),
  feature: z.string().max(100).optional(),
  priority: z.nativeEnum(Priority).default('MEDIUM'),
  targetShootDate: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

const updateSchema = shotSchema.partial().extend({
  status: z.nativeEnum(MissingShotStatus).optional(),
  resolvedFileId: z.string().nullable().optional(),
});

const userSelect = { select: { id: true, firstName: true, lastName: true, avatar: true } };

export async function getMissingShots(req: AuthRequest, res: Response) {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const shots = await prisma.missingShot.findMany({
    where: status ? { status: status as MissingShotStatus } : undefined,
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    include: {
      requestedBy: userSelect,
      resolvedFile: { select: { id: true, name: true, webViewLink: true } },
    },
  });
  return sendSuccess(res, shots);
}

export async function createMissingShot(req: AuthRequest, res: Response) {
  const parsed = shotSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);

  const { targetShootDate, ...rest } = parsed.data;
  const shot = await prisma.missingShot.create({
    data: {
      ...rest,
      targetShootDate: targetShootDate ? new Date(targetShootDate) : undefined,
      requestedById: req.user!.userId,
    },
    include: { requestedBy: userSelect },
  });
  return sendSuccess(res, shot, undefined, 201);
}

const STATUS_ORDER: Record<string, number> = { NEEDED: 0, IN_PROGRESS: 1, CAPTURED: 2, ARCHIVED: 3 };

export async function updateMissingShot(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const parsed = updateSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);

  const existing = await prisma.missingShot.findUnique({ where: { id } });
  if (!existing) return sendError(res, 'Missing shot not found', 404);

  const isAdmin = req.user!.role === 'ADMIN';

  if (!isAdmin && existing.requestedById !== req.user!.userId) {
    return sendError(res, 'You can only edit your own missing shots', 403);
  }

  const { targetShootDate, ...rest } = parsed.data;

  if (!isAdmin && rest.status) {
    const currentOrder = STATUS_ORDER[existing.status] ?? 0;
    const newOrder = STATUS_ORDER[rest.status] ?? 0;
    if (newOrder < currentOrder) return sendError(res, 'Cannot move a shot back to an earlier status', 403);
    if (rest.status === 'ARCHIVED') return sendError(res, 'Only admins can archive missing shots', 403);
  }
  const shot = await prisma.missingShot.update({
    where: { id },
    data: {
      ...rest,
      ...(targetShootDate !== undefined ? { targetShootDate: new Date(targetShootDate) } : {}),
    },
    include: {
      requestedBy: userSelect,
      resolvedFile: { select: { id: true, name: true, webViewLink: true } },
    },
  });
  return sendSuccess(res, shot);
}

export async function deleteMissingShot(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  await prisma.missingShot.delete({ where: { id } });
  return sendSuccess(res, { id });
}
