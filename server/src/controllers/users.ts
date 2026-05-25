import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import prisma from '../prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

const userSelect = {
  id: true, email: true, firstName: true, lastName: true,
  avatar: true, role: true, department: true, position: true,
  isActive: true, createdAt: true, updatedAt: true,
};

export async function getUsers(req: AuthRequest, res: Response) {
  const { department, role, status, search } = req.query as Record<string, string>;
  const users = await prisma.user.findMany({
    where: {
      ...(department && { department }),
      ...(role && { role: role as 'USER' | 'ADMIN' }),
      ...(status && { isActive: status === 'active' }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
    },
    select: userSelect,
    orderBy: { createdAt: 'desc' },
  });
  return sendSuccess(res, { users });
}

export async function getUser(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  if (req.user!.role !== 'ADMIN' && req.user!.userId !== id) {
    return sendError(res, 'Forbidden', 403);
  }

  const user = await prisma.user.findUnique({ where: { id }, select: userSelect });
  if (!user) return sendError(res, 'User not found', 404);

  const [assignedPages, widgetCount] = await Promise.all([
    prisma.pageAssignment.count({ where: { userId: id } }),
    prisma.widget.count({ where: { userId: id } }),
  ]);

  return sendSuccess(res, { user, assignedPages, widgetCount });
}

const updateUserSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  department: z.string().optional(),
  position: z.string().optional(),
  role: z.enum(['USER', 'ADMIN']).optional(),
  isActive: z.boolean().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
});

export async function updateUser(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const isAdmin = req.user!.role === 'ADMIN';
  const isSelf = req.user!.userId === id;

  if (!isAdmin && !isSelf) return sendError(res, 'Forbidden', 403);

  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid data', 400);

  const { currentPassword, newPassword, role, isActive, ...rest } = parsed.data;

  const updateData: Record<string, unknown> = { ...rest };

  if (!isAdmin && (role !== undefined || isActive !== undefined)) {
    return sendError(res, 'Cannot change role or status', 403);
  }
  if (isAdmin) {
    if (role !== undefined) updateData.role = role;
    // Prevent an admin from deactivating or downgrading their own account
    if (isActive !== undefined) {
      if (isSelf && isActive === false) return sendError(res, 'You cannot deactivate your own account', 400);
      updateData.isActive = isActive;
    }
    if (role !== undefined && isSelf && role !== 'ADMIN') {
      return sendError(res, 'You cannot remove your own admin role', 400);
    }
  }

  if (newPassword) {
    if (!currentPassword) return sendError(res, 'Current password required', 400);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return sendError(res, 'User not found', 404);
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return sendError(res, 'Current password is incorrect', 400);
    updateData.password = await bcrypt.hash(newPassword, 12);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: userSelect,
  });

  return sendSuccess(res, { user }, 'Profile updated');
}

export async function inviteUser(req: AuthRequest, res: Response) {
  const schema = z.object({
    email: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    role: z.enum(['USER', 'ADMIN']).default('USER'),
    department: z.string().optional(),
    position: z.string().optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid data', 400);

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return sendError(res, 'Email already in use', 409);

  const tempPassword = Math.random().toString(36).slice(-10);
  const hashed = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: { ...parsed.data, password: hashed },
    select: userSelect,
  });

  return sendSuccess(res, { user, tempPassword }, 'User invited', 201);
}

export async function deleteUser(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  if (req.user!.userId === id) return sendError(res, 'Cannot delete your own account', 400);
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return sendError(res, 'User not found', 404);

  await prisma.$transaction([
    prisma.page.updateMany({
      where: { createdById: id },
      data: { createdById: req.user!.userId },
    }),
    prisma.announcement.updateMany({
      where: { createdById: id },
      data: { createdById: req.user!.userId },
    }),
    prisma.pageAssignment.updateMany({
      where: { assignedById: id },
      data: { assignedById: req.user!.userId },
    }),
    prisma.gearAssignment.updateMany({
      where: { assignedById: id },
      data: { assignedById: req.user!.userId },
    }),
    prisma.user.delete({ where: { id } }),
  ]);

  return sendSuccess(res, null, 'User deleted');
}

export async function uploadAvatar(req: AuthRequest, res: Response) {
  if (!req.file) return sendError(res, 'No file uploaded', 400);
  const avatarUrl = `/uploads/${req.file.filename}`;
  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { avatar: avatarUrl },
  });
  return sendSuccess(res, { avatarUrl });
}

export async function getMentionUsers(req: AuthRequest, res: Response) {
  const q = (req.query.q as string) || '';
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      id: { not: req.user!.userId },
      ...(q && {
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
        ],
      }),
    },
    select: { id: true, firstName: true, lastName: true, avatar: true },
    take: 8,
    orderBy: { firstName: 'asc' },
  });
  return sendSuccess(res, { users });
}
