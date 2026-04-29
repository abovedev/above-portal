import { Response } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export async function getWidgets(req: AuthRequest, res: Response) {
  const widgets = await prisma.widget.findMany({
    where: { userId: req.user!.userId },
    orderBy: { order: 'asc' },
  });
  return sendSuccess(res, { widgets });
}

const widgetSchema = z.object({
  type: z.enum(['CLOCK','WEATHER','ANNOUNCEMENTS','QUICK_LINKS','TASKS','CALENDAR','NOTES','STATS','SYSTEM_STATS','RECENT_ACTIVITY','USER_GROWTH','PAGE_VIEWS','GMAIL','GCHAT']),
  title: z.string().min(1),
  settings: z.record(z.unknown()).default({}),
  isVisible: z.boolean().default(true),
  positionX: z.number().default(0),
  positionY: z.number().default(0),
  width: z.number().min(1).max(12).default(4),
  height: z.number().min(1).default(2),
  order: z.number().default(0),
});

export async function addWidget(req: AuthRequest, res: Response) {
  const parsed = widgetSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid data', 400);

  const { settings, ...rest } = parsed.data;
  const widget = await prisma.widget.create({
    data: { ...rest, settings: settings as Prisma.InputJsonValue, userId: req.user!.userId },
  });
  return sendSuccess(res, { widget }, 'Widget added', 201);
}

export async function updateWidget(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const parsed = widgetSchema.partial().safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid data', 400);

  const widget = await prisma.widget.findFirst({ where: { id, userId: req.user!.userId } });
  if (!widget) return sendError(res, 'Widget not found', 404);

  const { settings, ...rest } = parsed.data;
  const updated = await prisma.widget.update({
    where: { id },
    data: { ...rest, ...(settings !== undefined && { settings: settings as Prisma.InputJsonValue }) },
  });
  return sendSuccess(res, { widget: updated });
}

const batchSchema = z.array(z.object({
  id: z.string(),
  positionX: z.number(),
  positionY: z.number(),
  width: z.number(),
  height: z.number(),
  order: z.number(),
}));

export async function batchUpdateWidgets(req: AuthRequest, res: Response) {
  const parsed = batchSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid data', 400);

  await Promise.all(
    parsed.data.map(({ id, ...data }) =>
      prisma.widget.updateMany({
        where: { id, userId: req.user!.userId },
        data,
      })
    )
  );

  const widgets = await prisma.widget.findMany({
    where: { userId: req.user!.userId },
    orderBy: { order: 'asc' },
  });
  return sendSuccess(res, { widgets }, 'Layout saved');
}

export async function deleteWidget(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const widget = await prisma.widget.findFirst({ where: { id, userId: req.user!.userId } });
  if (!widget) return sendError(res, 'Widget not found', 404);
  await prisma.widget.delete({ where: { id } });
  return sendSuccess(res, null, 'Widget removed');
}
