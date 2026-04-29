import { Response } from 'express';
import { z } from 'zod';
import prisma from '../prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { completeTask } from './asana';

export async function getTasks(req: AuthRequest, res: Response) {
  const tasks = await prisma.task.findMany({
    where: { userId: req.user!.userId },
    orderBy: [{ isCompleted: 'asc' }, { createdAt: 'desc' }],
  });
  return sendSuccess(res, { tasks });
}

const taskSchema = z.object({
  title: z.string().min(1),
  isCompleted: z.boolean().optional(),
  dueDate: z.string().datetime().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  asanaTaskGid: z.string().optional().nullable(),
  asanaPermalink: z.string().url().optional().nullable(),
});

export async function createTask(req: AuthRequest, res: Response) {
  const parsed = taskSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid data', 400);

  const { dueDate, ...rest } = parsed.data;
  if (rest.asanaTaskGid) {
    const existing = await prisma.task.findFirst({
      where: { userId: req.user!.userId, asanaTaskGid: rest.asanaTaskGid },
    });
    if (existing) return sendSuccess(res, { task: existing }, 'Task already added');
  }

  const task = await prisma.task.create({
    data: {
      ...rest,
      ...(dueDate && { dueDate: new Date(dueDate) }),
      userId: req.user!.userId,
    },
  });
  return sendSuccess(res, { task }, 'Task created', 201);
}

export async function updateTask(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const parsed = taskSchema.partial().safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid data', 400);

  const task = await prisma.task.findFirst({ where: { id, userId: req.user!.userId } });
  if (!task) return sendError(res, 'Task not found', 404);

  const { dueDate, ...rest } = parsed.data;
  if (task.asanaTaskGid && rest.isCompleted === true && !task.isCompleted) {
    try {
      await completeTask(task.asanaTaskGid, req.user!.userId);
    } catch {
      return sendError(res, 'Failed to complete task in Asana', 502);
    }
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...rest,
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
    },
  });
  return sendSuccess(res, { task: updated });
}

export async function deleteTask(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const task = await prisma.task.findFirst({ where: { id, userId: req.user!.userId } });
  if (!task) return sendError(res, 'Task not found', 404);
  await prisma.task.delete({ where: { id } });
  return sendSuccess(res, null, 'Task deleted');
}
