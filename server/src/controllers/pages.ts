import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const pageInclude = {
  createdBy: { select: { id: true, firstName: true, lastName: true, avatar: true } },
  _count: { select: { assignments: true, sections: true } },
};

export async function getPages(req: AuthRequest, res: Response) {
  const { type, search } = req.query as Record<string, string>;
  const isAdmin = req.user!.role === 'ADMIN';

  const pages = await prisma.page.findMany({
    where: {
      ...(type && { type: type as 'GLOBAL' | 'PERSONAL' }),
      ...(!isAdmin && { isPublished: true }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    include: pageInclude,
    orderBy: { updatedAt: 'desc' },
  });

  return sendSuccess(res, { pages });
}

export async function getAssignedPages(req: AuthRequest, res: Response) {
  const assignments = await prisma.pageAssignment.findMany({
    where: { userId: req.user!.userId },
    include: {
      page: { include: pageInclude },
    },
    orderBy: { assignedAt: 'desc' },
  });

  const pages = assignments.map((a) => ({ ...a.page, assignedAt: a.assignedAt }));
  return sendSuccess(res, { pages });
}

export async function getPage(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const page = await prisma.page.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: {
      ...pageInclude,
      sections: { orderBy: { order: 'asc' } },
    },
  });

  if (!page) return sendError(res, 'Page not found', 404);
  if (!page.isPublished && req.user!.role !== 'ADMIN') {
    return sendError(res, 'Page not found', 404);
  }
  if (page.type === 'PERSONAL' && req.user!.role !== 'ADMIN') {
    const assignment = await prisma.pageAssignment.findFirst({
      where: { pageId: page.id, userId: req.user!.userId },
      select: { id: true },
    });
    if (!assignment) return sendError(res, 'Page not found', 404);
  }

  return sendSuccess(res, { page });
}

const pageSchema = z.object({
  title: z.string().min(1),
  slug: z.string().optional(),
  description: z.string().optional(),
  content: z.any().optional(),
  coverImage: z.string().optional(),
  icon: z.string().optional(),
  type: z.enum(['GLOBAL', 'PERSONAL']).default('GLOBAL'),
  isPublished: z.boolean().default(false),
});

export async function createPage(req: AuthRequest, res: Response) {
  const parsed = pageSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid data', 400);

  const { slug: rawSlug, title, ...rest } = parsed.data;
  let slug = rawSlug ? slugify(rawSlug) : slugify(title);

  const existing = await prisma.page.findUnique({ where: { slug } });
  if (existing) slug = `${slug}-${Date.now()}`;

  const page = await prisma.page.create({
    data: { ...rest, title, slug, createdById: req.user!.userId },
    include: pageInclude,
  });

  return sendSuccess(res, { page }, 'Page created', 201);
}

export async function updatePage(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const parsed = pageSchema.partial().safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid data', 400);

  const { slug: rawSlug, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (rawSlug) {
    const slug = slugify(rawSlug);
    const conflictingPage = await prisma.page.findFirst({
      where: { slug, NOT: { id } },
      select: { id: true },
    });
    if (conflictingPage) return sendError(res, 'Slug is already in use', 409);
    data.slug = slug;
  }

  const existing = await prisma.page.findUnique({ where: { id } });
  if (!existing) return sendError(res, 'Page not found', 404);

  const page = await prisma.page.update({
    where: { id },
    data,
    include: pageInclude,
  });

  return sendSuccess(res, { page }, 'Page updated');
}

export async function deletePage(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const existing = await prisma.page.findUnique({ where: { id } });
  if (!existing) return sendError(res, 'Page not found', 404);

  await prisma.page.delete({ where: { id } });
  return sendSuccess(res, null, 'Page deleted');
}

export async function uploadCover(req: AuthRequest, res: Response) {
  if (!req.file) return sendError(res, 'No file uploaded', 400);
  const coverUrl = `/uploads/${req.file.filename}`;
  return sendSuccess(res, { coverUrl });
}
