import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export async function getQuickLinks(req: AuthRequest, res: Response) {
  const links = await prisma.quickLink.findMany({
    where: { userId: req.user!.userId },
    orderBy: { order: 'asc' },
  });
  return sendSuccess(res, { links });
}

const linkSchema = z.object({
  label: z.string().min(1),
  url: z.string().url(),
  icon: z.string().optional(),
  order: z.number().optional(),
});

export async function createQuickLink(req: AuthRequest, res: Response) {
  const parsed = linkSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid data', 400);

  const count = await prisma.quickLink.count({ where: { userId: req.user!.userId } });
  const link = await prisma.quickLink.create({
    data: { ...parsed.data, userId: req.user!.userId, order: parsed.data.order ?? count },
  });
  return sendSuccess(res, { link }, 'Link created', 201);
}

export async function updateQuickLink(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const parsed = linkSchema.partial().safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid data', 400);

  const link = await prisma.quickLink.findFirst({ where: { id, userId: req.user!.userId } });
  if (!link) return sendError(res, 'Link not found', 404);

  const updated = await prisma.quickLink.update({ where: { id }, data: parsed.data });
  return sendSuccess(res, { link: updated });
}

export async function deleteQuickLink(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const link = await prisma.quickLink.findFirst({ where: { id, userId: req.user!.userId } });
  if (!link) return sendError(res, 'Link not found', 404);
  await prisma.quickLink.delete({ where: { id } });
  return sendSuccess(res, null, 'Link deleted');
}
