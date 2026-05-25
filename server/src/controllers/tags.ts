import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

const categorySchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
  order: z.number().int().default(0),
});

const valueSchema = z.object({
  value: z.string().min(1).max(200),
  order: z.number().int().default(0),
});

// ─── Categories ───────────────────────────────────────────────────────────────

export async function getCategories(_req: AuthRequest, res: Response) {
  const categories = await prisma.tagCategory.findMany({
    orderBy: { order: 'asc' },
    include: {
      values: { orderBy: { order: 'asc' } },
      _count: { select: { values: true } },
    },
  });
  return sendSuccess(res, categories);
}

export async function createCategory(req: AuthRequest, res: Response) {
  const parsed = categorySchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);

  const existing = await prisma.tagCategory.findFirst({
    where: { OR: [{ name: parsed.data.name }, { slug: parsed.data.slug }] },
  });
  if (existing) return sendError(res, 'Category name or slug already exists', 409);

  const category = await prisma.tagCategory.create({ data: parsed.data });
  return sendSuccess(res, category, undefined, 201);
}

export async function updateCategory(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const parsed = categorySchema.partial().safeParse(req.body);
  if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);

  const category = await prisma.tagCategory.update({ where: { id }, data: parsed.data });
  return sendSuccess(res, category);
}

export async function deleteCategory(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  await prisma.tagCategory.delete({ where: { id } });
  return sendSuccess(res, { id });
}

// ─── Values ───────────────────────────────────────────────────────────────────

export async function createValue(req: AuthRequest, res: Response) {
  const categoryId = req.params.id as string;
  const parsed = valueSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);

  const category = await prisma.tagCategory.findUnique({ where: { id: categoryId } });
  if (!category) return sendError(res, 'Category not found', 404);

  const value = await prisma.tagValue.create({
    data: { categoryId, value: parsed.data.value, order: parsed.data.order },
  });
  return sendSuccess(res, value, undefined, 201);
}

export async function deleteValue(req: AuthRequest, res: Response) {
  const valueId = req.params.valueId as string;
  await prisma.tagValue.delete({ where: { id: valueId } });
  return sendSuccess(res, { id: valueId });
}

// ─── Permissions ──────────────────────────────────────────────────────────────

export async function getPermissions(_req: AuthRequest, res: Response) {
  const perms = await prisma.fileTagPermission.findMany({
    include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true, email: true } } },
  });
  return sendSuccess(res, perms);
}

export async function setPermission(req: AuthRequest, res: Response) {
  const { userId } = req.body as { userId?: string };
  const canTag = req.body.canTag !== false;
  if (!userId) return sendError(res, 'userId is required', 400);

  const perm = await prisma.fileTagPermission.upsert({
    where: { userId },
    create: { userId, canTag },
    update: { canTag },
    include: { user: { select: { id: true, firstName: true, lastName: true, avatar: true, email: true } } },
  });
  return sendSuccess(res, perm);
}

export async function removePermission(req: AuthRequest, res: Response) {
  const userId = req.params.userId as string;
  await prisma.fileTagPermission.deleteMany({ where: { userId } });
  return sendSuccess(res, { userId });
}
