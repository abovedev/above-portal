import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

export async function getSettings(_req: AuthRequest, res: Response) {
  let settings = await prisma.companySettings.findFirst();
  if (!settings) {
    settings = await prisma.companySettings.create({ data: {} });
  }
  return sendSuccess(res, { settings });
}

const settingsSchema = z.object({
  companyName: z.string().optional(),
  theme: z.string().optional(),
  accentColor: z.string().optional(),
  defaultWidgets: z.any().optional(),
});

export async function updateSettings(req: AuthRequest, res: Response) {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid data', 400);

  let settings = await prisma.companySettings.findFirst();
  if (!settings) {
    settings = await prisma.companySettings.create({ data: parsed.data });
  } else {
    settings = await prisma.companySettings.update({ where: { id: settings.id }, data: parsed.data });
  }
  return sendSuccess(res, { settings }, 'Settings updated');
}
