import { Response } from 'express';
import { z } from 'zod';
import { GearStatus, GearRequestStatus } from '@prisma/client';
import prisma from '../prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { pushNotification } from '../utils/notificationStream';

const userSelect = { select: { id: true, firstName: true, lastName: true, avatar: true } };

const createGearSchema = z.object({
  name: z.string().min(1).max(200),
  brand: z.string().max(100).optional(),
  model: z.string().max(100).optional(),
  category: z.string().max(100).default('Other'),
  serialNumber: z.string().max(100).optional(),
  imei: z.string().max(20).optional(),
  assetTag: z.string().max(50).optional(),
  description: z.string().max(1000).optional(),
  notes: z.string().max(1000).optional(),
  purchaseDate: z.string().optional(),
  purchaseCost: z.number().optional(),
  vendor: z.string().max(200).optional(),
  warrantyExpiry: z.string().optional(),
  condition: z.enum(['New', 'Good', 'Fair', 'Poor']).default('Good'),
  location: z.string().max(200).optional(),
  status: z.enum(['AVAILABLE', 'MAINTENANCE', 'RETIRED']).optional(),
});

// ─── Gear Items ────────────────────────────────────────────────────────────────

function qs(val: unknown): string | undefined {
  return typeof val === 'string' ? val : undefined;
}

export async function getGearItems(req: AuthRequest, res: Response) {
  const isAdmin = req.user!.role === 'ADMIN';
  const category = qs(req.query.category);
  const status    = qs(req.query.status);
  const search    = qs(req.query.search);

  const items = await prisma.gearItem.findMany({
    where: {
      ...(category && { category }),
      ...(status && { status: status as GearStatus }),
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
    },
    select: {
      id: true, name: true, brand: true, model: true, category: true,
      serialNumber: true, imei: true, assetTag: true, description: true, notes: true,
      photo: true, purchaseDate: true, purchaseCost: true, vendor: true,
      warrantyExpiry: true, condition: true, location: true, status: true,
      createdAt: true, updatedAt: true,
      assignments: {
        where: { returnedAt: null },
        select: {
          id: true, checkedOutAt: true, dueDate: true,
          user: userSelect,
        },
        take: 1,
      },
      _count: { select: { requests: { where: { status: 'PENDING' } } } },
    },
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  });

  if (!isAdmin) {
    const userId = req.user!.userId;
    const filtered = items.map((item) => ({
      ...item,
      _count: undefined,
      assignments: item.assignments.filter((a) => a.user.id === userId),
    }));
    return sendSuccess(res, { items: filtered });
  }

  return sendSuccess(res, { items });
}

export async function getGearItem(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const isAdmin = req.user!.role === 'ADMIN';
  const userId = req.user!.userId;
  const item = await prisma.gearItem.findUnique({
    where: { id },
    include: {
      assignments: {
        ...(!isAdmin && { where: { userId } }),
        orderBy: { createdAt: 'desc' },
        include: {
          user: userSelect,
          assignedBy: userSelect,
        },
      },
      requests: {
        ...(!isAdmin && { where: { requesterId: userId } }),
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          requester: userSelect,
          reviewedBy: userSelect,
        },
      },
    },
  });
  if (!item) return sendError(res, 'Gear item not found', 404);
  return sendSuccess(res, { item });
}

export async function createGearItem(req: AuthRequest, res: Response) {
  const parsed = createGearSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);

  const { purchaseDate, warrantyExpiry, ...rest } = parsed.data;
  const item = await prisma.gearItem.create({
    data: {
      ...rest,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : undefined,
    },
  });
  return sendSuccess(res, { item }, 'Gear item created', 201);
}

export async function updateGearItem(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const parsed = createGearSchema.partial().safeParse(req.body);
  if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);

  const { purchaseDate, warrantyExpiry, ...rest } = parsed.data;
  const existing = await prisma.gearItem.findUnique({ where: { id } });
  if (!existing) return sendError(res, 'Gear item not found', 404);

  const item = await prisma.gearItem.update({
    where: { id },
    data: {
      ...rest,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : undefined,
    },
  });
  return sendSuccess(res, { item });
}

export async function deleteGearItem(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const existing = await prisma.gearItem.findUnique({ where: { id } });
  if (!existing) return sendError(res, 'Gear item not found', 404);

  await prisma.gearItem.delete({ where: { id } });
  return sendSuccess(res, null, 'Gear item deleted');
}

// ─── Checkout / Return ────────────────────────────────────────────────────────

export async function checkoutGear(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const parsed = z.object({
    userId: z.string(),
    dueDate: z.string().optional(),
    notes: z.string().max(500).optional(),
  }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid data', 400);

  const item = await prisma.gearItem.findUnique({ where: { id } });
  if (!item) return sendError(res, 'Gear item not found', 404);
  const assignee = await prisma.user.findFirst({ where: { id: parsed.data.userId, isActive: true } });
  if (!assignee) return sendError(res, 'Active user not found', 404);
  if (item.status !== 'AVAILABLE' && item.status !== 'RESERVED') {
    const msg = item.status === 'RETURN_PENDING'
      ? 'Gear has a pending return — confirm receipt before checking it out again'
      : 'Gear is not available for checkout';
    return sendError(res, msg, 400);
  }

  const [assignment] = await prisma.$transaction([
    prisma.gearAssignment.create({
      data: {
        gearItemId: id,
        userId: parsed.data.userId,
        assignedById: req.user!.userId,
        dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
        notes: parsed.data.notes,
      },
    }),
    prisma.gearItem.update({ where: { id }, data: { status: 'CHECKED_OUT' } }),
  ]);

  const notification = await prisma.notification.create({
    data: {
      userId: parsed.data.userId,
      title: 'Gear Checked Out',
      message: `${item.name} has been checked out to you.`,
      type: 'GEAR_REQUEST',
      link: '/gear',
    },
  });
  pushNotification(notification);

  return sendSuccess(res, { assignment }, 'Gear checked out');
}

// User requests a return — notifies admins, sets status to RETURN_PENDING
export async function returnGear(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const userId = req.user!.userId;

  const item = await prisma.gearItem.findUnique({ where: { id } });
  if (!item) return sendError(res, 'Gear item not found', 404);
  if (item.status === 'RETURN_PENDING') return sendError(res, 'Return already requested', 400);

  const activeAssignment = await prisma.gearAssignment.findFirst({
    where: { gearItemId: id, returnedAt: null },
  });
  if (!activeAssignment) return sendError(res, 'No active assignment found', 400);
  if (activeAssignment.userId !== userId) return sendError(res, 'You can only return gear assigned to you', 403);

  await prisma.gearItem.update({ where: { id }, data: { status: 'RETURN_PENDING' } });

  const returner = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
  await Promise.all(admins.map(async (admin) => {
    const n = await prisma.notification.create({
      data: {
        userId: admin.id,
        title: 'Return Request',
        message: `${returner?.firstName} ${returner?.lastName} wants to return ${item.name}. Please confirm receipt.`,
        type: 'GEAR_REQUEST',
        link: '/admin/gear',
      },
    });
    pushNotification(n);
  }));

  return sendSuccess(res, null, 'Return requested. An admin will confirm receipt.');
}

// Admin confirms a return — works for RETURN_PENDING (user-initiated) and admin force-return (CHECKED_OUT/RESERVED)
export async function confirmReturn(req: AuthRequest, res: Response) {
  const id = req.params.id as string;

  const item = await prisma.gearItem.findUnique({ where: { id } });
  if (!item) return sendError(res, 'Gear item not found', 404);

  const returnable: string[] = ['RETURN_PENDING', 'CHECKED_OUT', 'RESERVED'];
  if (!returnable.includes(item.status)) return sendError(res, 'This item cannot be returned in its current state', 400);

  const activeAssignment = await prisma.gearAssignment.findFirst({
    where: { gearItemId: id, returnedAt: null },
  });
  if (!activeAssignment) return sendError(res, 'No active assignment found', 400);

  await prisma.$transaction([
    prisma.gearAssignment.update({
      where: { id: activeAssignment.id },
      data: { returnedAt: new Date() },
    }),
    prisma.gearItem.update({ where: { id }, data: { status: 'AVAILABLE' } }),
  ]);

  // Only notify the user if it was a user-initiated return request
  if (item.status === 'RETURN_PENDING') {
    const notification = await prisma.notification.create({
      data: {
        userId: activeAssignment.userId,
        title: 'Return Confirmed',
        message: `Your return of ${item.name} has been confirmed. Thanks for bringing it back!`,
        type: 'GEAR_REQUEST',
        link: '/gear',
      },
    });
    pushNotification(notification);
  }

  return sendSuccess(res, null, 'Return confirmed — gear is now available');
}

// ─── Requests ─────────────────────────────────────────────────────────────────

export async function getGearRequests(req: AuthRequest, res: Response) {
  const isAdmin = req.user!.role === 'ADMIN';
  const status  = qs(req.query.status);

  const requests = await prisma.gearRequest.findMany({
    where: {
      ...(!isAdmin && { requesterId: req.user!.userId }),
      ...(status && { status: status as GearRequestStatus }),
    },
    include: {
      gearItem: { select: { id: true, name: true, category: true, photo: true, status: true } },
      requester: userSelect,
      reviewedBy: userSelect,
    },
    orderBy: { createdAt: 'desc' },
  });
  return sendSuccess(res, { requests });
}

export async function submitGearRequest(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const parsed = z.object({
    reason: z.string().max(500).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid data', 400);

  const item = await prisma.gearItem.findUnique({ where: { id } });
  if (!item) return sendError(res, 'Gear item not found', 404);
  if (item.status !== 'AVAILABLE') return sendError(res, 'This gear is not available for requests', 400);

  const existing = await prisma.gearRequest.findFirst({
    where: { gearItemId: id, requesterId: req.user!.userId, status: 'PENDING' },
  });
  if (existing) return sendError(res, 'You already have a pending request for this item', 400);

  await prisma.gearRequest.create({
    data: {
      gearItemId: id,
      requesterId: req.user!.userId,
      reason: parsed.data.reason,
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : undefined,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : undefined,
    },
  });

  const requester = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { firstName: true, lastName: true },
  });

  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
  await Promise.all(
    admins.map(async (admin) => {
      const n = await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'New Gear Request',
          message: `${requester?.firstName} ${requester?.lastName} requested ${item.name}.`,
          type: 'GEAR_REQUEST',
          link: '/admin/gear/requests',
        },
      });
      pushNotification(n);
    })
  );

  return sendSuccess(res, {}, 'Request submitted', 201);
}

export async function reviewGearRequest(req: AuthRequest, res: Response) {
  const reqId = req.params.reqId as string;
  const parsed = z.object({
    action: z.enum(['APPROVED', 'DECLINED']),
    adminNote: z.string().max(500).optional(),
  }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid data', 400);

  const gearRequest = await prisma.gearRequest.findUnique({ where: { id: reqId } });
  if (!gearRequest) return sendError(res, 'Request not found', 404);
  if (gearRequest.status !== 'PENDING') return sendError(res, 'Request is no longer pending', 400);

  const gearItem = await prisma.gearItem.findUnique({ where: { id: gearRequest.gearItemId } });
  if (!gearItem) return sendError(res, 'Gear item not found', 404);
  if (parsed.data.action === 'APPROVED' && gearItem.status !== 'AVAILABLE') {
    return sendError(res, 'Gear is no longer available for approval', 409);
  }

  await prisma.gearRequest.update({
    where: { id: reqId },
    data: {
      status: parsed.data.action,
      adminNote: parsed.data.adminNote,
      reviewedById: req.user!.userId,
      reviewedAt: new Date(),
    },
  });

  if (parsed.data.action === 'APPROVED') {
    await prisma.gearItem.update({ where: { id: gearItem.id }, data: { status: 'RESERVED' } });
  }

  const notification = await prisma.notification.create({
    data: {
      userId: gearRequest.requesterId,
      title: parsed.data.action === 'APPROVED' ? 'Gear Request Approved' : 'Gear Request Declined',
      message: parsed.data.action === 'APPROVED'
        ? `Your request for ${gearItem.name} has been approved. Please pick it up.`
        : `Your request for ${gearItem.name} was declined.${parsed.data.adminNote ? ` Note: ${parsed.data.adminNote}` : ''}`,
      type: 'GEAR_REQUEST',
      link: '/gear',
    },
  });
  pushNotification(notification);

  return sendSuccess(res, null, `Request ${parsed.data.action.toLowerCase()}`);
}

export async function cancelGearRequest(req: AuthRequest, res: Response) {
  const reqId = req.params.reqId as string;
  const gearRequest = await prisma.gearRequest.findUnique({ where: { id: reqId } });
  if (!gearRequest) return sendError(res, 'Request not found', 404);
  if (gearRequest.requesterId !== req.user!.userId) return sendError(res, 'Not your request', 403);
  if (gearRequest.status !== 'PENDING') return sendError(res, 'Can only cancel pending requests', 400);

  await prisma.gearRequest.update({ where: { id: reqId }, data: { status: 'CANCELLED' } });
  return sendSuccess(res, null, 'Request cancelled');
}

export async function pickupGear(req: AuthRequest, res: Response) {
  const reqId = req.params.reqId as string;
  const userId = req.user!.userId;

  const gearRequest = await prisma.gearRequest.findUnique({ where: { id: reqId } });
  if (!gearRequest) return sendError(res, 'Request not found', 404);
  if (gearRequest.requesterId !== userId) return sendError(res, 'Not your request', 403);
  if (gearRequest.status !== 'APPROVED') return sendError(res, 'Request is not approved', 400);

  const item = await prisma.gearItem.findUnique({ where: { id: gearRequest.gearItemId } });
  if (!item) return sendError(res, 'Gear item not found', 404);
  if (item.status !== 'RESERVED') return sendError(res, 'Gear is not reserved for pickup', 400);

  await prisma.$transaction([
    prisma.gearAssignment.create({
      data: {
        gearItemId: item.id,
        userId,
        assignedById: userId,
        dueDate: gearRequest.endDate ?? undefined,
      },
    }),
    prisma.gearItem.update({ where: { id: item.id }, data: { status: 'CHECKED_OUT' } }),
    prisma.gearRequest.update({ where: { id: reqId }, data: { status: 'COLLECTED' } }),
  ]);

  return sendSuccess(res, null, 'Gear checked out — enjoy!');
}

// ─── User assignment history ──────────────────────────────────────────────────

export async function getMyAssignmentHistory(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const assignments = await prisma.gearAssignment.findMany({
    where: { userId, returnedAt: { not: null } },
    include: {
      gearItem: { select: { id: true, name: true, brand: true, category: true, photo: true } },
    },
    orderBy: { returnedAt: 'desc' },
    take: 20,
  });
  return sendSuccess(res, { assignments });
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getGearStats(req: AuthRequest, res: Response) {
  const [total, available, checkedOut, reserved, returnPending, maintenance, pendingRequests] = await Promise.all([
    prisma.gearItem.count({ where: { status: { not: 'RETIRED' } } }),
    prisma.gearItem.count({ where: { status: 'AVAILABLE' } }),
    prisma.gearItem.count({ where: { status: 'CHECKED_OUT' } }),
    prisma.gearItem.count({ where: { status: 'RESERVED' } }),
    prisma.gearItem.count({ where: { status: 'RETURN_PENDING' } }),
    prisma.gearItem.count({ where: { status: 'MAINTENANCE' } }),
    prisma.gearRequest.count({ where: { status: 'PENDING' } }),
  ]);
  return sendSuccess(res, { total, available, checkedOut, reserved, returnPending, maintenance, pendingRequests });
}
