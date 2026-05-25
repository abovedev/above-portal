import { Response } from 'express';
import { google, drive_v3 } from 'googleapis';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import prisma from '../prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ─── Naming Convention ────────────────────────────────────────────────────────

const VIDEO_EXTS = new Set(['mp4', 'mov', 'mxf', 'r3d', 'braw', 'avi', 'mkv', 'mts', 'm2ts']);
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'tiff', 'tif', 'dng', 'arw', 'cr2', 'cr3', 'nef', 'orf', 'raf', 'rw2', 'heic', 'webp']);
const MEDIA_EXTS = new Set([...VIDEO_EXTS, ...IMAGE_EXTS]);

// MIME type prefixes accepted during Drive sync
function isMediaMime(mimeType: string) {
  return mimeType.startsWith('video/') || mimeType.startsWith('image/');
}

const JUNK_FILENAMES = new Set(['.ds_store', 'thumbs.db', 'desktop.ini', '.localized']);
function isJunkFile(name: string) {
  return JUNK_FILENAMES.has(name.toLowerCase());
}

export function parseFileName(name: string) {
  const lastDot = name.lastIndexOf('.');
  const ext = lastDot !== -1 ? name.slice(lastDot + 1).toLowerCase() : '';
  const base = lastDot !== -1 ? name.slice(0, lastDot) : name;
  const extValid = MEDIA_EXTS.has(ext);
  const parts = base.split('_');

  const dateValid = parts.length >= 1 && /^\d{8}$/.test(parts[0]);
  const hasSubject = parts.length >= 2 && parts[1].trim().length > 0;
  const hasLocation = parts.length >= 3 && parts[2].trim().length > 0;

  // Location is optional — YYYYMMDD_Subject.ext is a valid name
  const valid = dateValid && hasSubject && extValid;

  let parsedDate: string | null = null;
  if (dateValid) {
    const d = parts[0];
    parsedDate = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  }

  return {
    valid,
    parsedDate,
    parsedSubject: hasSubject ? parts[1] : null,
    parsedLocation: hasLocation ? parts[2] : null,
    ext,
    extValid,
  };
}

function buildSuggestion(name: string): string | null {
  const lastDot = name.lastIndexOf('.');
  const ext = lastDot !== -1 ? name.slice(lastDot + 1).toLowerCase() : null;
  const base = lastDot !== -1 ? name.slice(0, lastDot) : name;
  const extSuffix = ext ? `.${ext}` : '';

  // If it already looks like YYYYMMDD prefix but lacks parts, hint the format
  if (/^\d{8}/.test(base)) return null; // already has date, user just needs subject/location

  // Try to extract a date from the filename
  const dateMatch = base.match(/(\d{4})[._-]?(\d{2})[._-]?(\d{2})/);
  const today = new Date();
  const datePrefix = dateMatch
    ? `${dateMatch[1]}${dateMatch[2]}${dateMatch[3]}`
    : `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

  const cleaned = base.replace(/\d{4}[._-]?\d{2}[._-]?\d{2}[._-]?/g, '').replace(/[._-]+/g, ' ').trim();
  return `${datePrefix}_${cleaned || 'Subject'}${extSuffix}`;
}

// ─── OAuth helper ─────────────────────────────────────────────────────────────

async function getDriveForUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleAccessToken: true, googleRefreshToken: true },
  });
  if (!user?.googleRefreshToken) throw new Error('Google account not connected. Please connect Google in settings.');

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
  oauth2.setCredentials({
    access_token: user.googleAccessToken ?? undefined,
    refresh_token: user.googleRefreshToken,
  });
  return google.drive({ version: 'v3', auth: oauth2 });
}

// ─── Folder endpoints ─────────────────────────────────────────────────────────

const addFolderSchema = z.object({
  driveId: z.string().min(1),
  name: z.string().min(1),
  url: z.string().optional(),
  driveType: z.enum(['personal', 'shared']).default('personal'),
  recursive: z.boolean().default(false),
});

export async function getFolders(req: AuthRequest, res: Response) {
  const folders = await prisma.driveFolder.findMany({
    where: { isWatched: true },
    orderBy: { createdAt: 'asc' },
    include: {
      addedBy: { select: { id: true, firstName: true, lastName: true } },
      _count: { select: { files: true } },
    },
  });
  return sendSuccess(res, folders);
}

export async function addFolder(req: AuthRequest, res: Response) {
  const parsed = addFolderSchema.safeParse(req.body);
  if (!parsed.success) return sendError(res, parsed.error.errors[0].message, 400);

  const { driveId, name, url, driveType, recursive } = parsed.data;
  const existing = await prisma.driveFolder.findUnique({ where: { driveId } });
  if (existing) {
    await prisma.driveFolder.update({ where: { driveId }, data: { isWatched: true, recursive } });
    return sendSuccess(res, { ...existing, recursive });
  }

  const folder = await prisma.driveFolder.create({
    data: { driveId, name, url, driveType, recursive, addedById: req.user!.userId },
  });
  return sendSuccess(res, folder, undefined, 201);
}

export async function updateFolder(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const { recursive } = req.body as { recursive?: boolean };
  if (typeof recursive !== 'boolean') return sendError(res, 'recursive (boolean) is required', 400);
  const updated = await prisma.driveFolder.update({ where: { id }, data: { recursive } });
  return sendSuccess(res, updated);
}

export async function removeFolder(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  await prisma.driveFolder.delete({ where: { id } });
  return sendSuccess(res, { id });
}

export async function purgeStaleFiles(req: AuthRequest, res: Response) {
  // Deletes non-media rows and known junk files left over from unfiltered syncs
  const stale = await prisma.driveFile.findMany({ select: { id: true, name: true, mimeType: true } });
  const ids = stale
    .filter((f) => !isMediaMime(f.mimeType) || isJunkFile(f.name))
    .map((f) => f.id);
  if (ids.length) await prisma.driveFile.deleteMany({ where: { id: { in: ids } } });
  return sendSuccess(res, { removed: ids.length });
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

type RawDriveFile = drive_v3.Schema$File;

interface MediaEntry { file: RawDriveFile; subfolderPath: string; }

// BFS traversal — collects all media files, optionally recursing into subfolders
async function collectMediaFiles(
  drive: ReturnType<typeof google.drive>,
  rootFolderId: string,
  isShared: boolean,
  recursive: boolean,
): Promise<MediaEntry[]> {
  const results: MediaEntry[] = [];
  const queue: Array<{ folderId: string; path: string }> = [{ folderId: rootFolderId, path: '' }];

  while (queue.length > 0) {
    const { folderId, path } = queue.shift()!;
    let pageToken: string | undefined;

    do {
      const resp = await drive.files.list({
        q: `'${folderId}' in parents and trashed=false`,
        fields: 'nextPageToken,files(id,name,mimeType,size,webViewLink,thumbnailLink,modifiedTime)',
        pageSize: 200,
        supportsAllDrives: isShared,
        includeItemsFromAllDrives: isShared,
        pageToken,
      });

      const files = resp.data.files ?? [];
      pageToken = resp.data.nextPageToken ?? undefined;

      for (const f of files) {
        if (!f.id || !f.name) continue;
        if (isJunkFile(f.name)) continue;
        if (f.mimeType === 'application/vnd.google-apps.folder') {
          if (recursive) {
            queue.push({ folderId: f.id, path: path ? `${path}/${f.name}` : f.name });
          }
        } else if (isMediaMime(f.mimeType ?? '')) {
          results.push({ file: f, subfolderPath: path });
        }
      }
    } while (pageToken);
  }

  return results;
}

async function syncFolderFiles(
  drive: ReturnType<typeof google.drive>,
  folder: { id: string; driveId: string; driveType: string; recursive: boolean },
) {
  const isShared = folder.driveType === 'shared';
  const entries = await collectMediaFiles(drive, folder.driveId, isShared, folder.recursive);

  for (const { file: f, subfolderPath } of entries) {
    const parsed = parseFileName(f.name!);
    const suggestion = parsed.valid ? null : buildSuggestion(f.name!);

    await prisma.driveFile.upsert({
      where: { driveId: f.id! },
      create: {
        driveId: f.id!,
        name: f.name!,
        mimeType: f.mimeType ?? 'application/octet-stream',
        size: f.size ? BigInt(f.size) : null,
        webViewLink: f.webViewLink ?? '',
        thumbnailLink: f.thumbnailLink ?? null,
        folderId: folder.id,
        subfolderPath: subfolderPath || null,
        nameValid: parsed.valid,
        parsedDate: parsed.parsedDate,
        parsedSubject: parsed.parsedSubject,
        parsedLocation: parsed.parsedLocation,
        nameSuggestion: suggestion,
        modifiedAt: f.modifiedTime ? new Date(f.modifiedTime) : null,
        syncedAt: new Date(),
      },
      update: {
        name: f.name!,
        mimeType: f.mimeType ?? 'application/octet-stream',
        size: f.size ? BigInt(f.size) : null,
        webViewLink: f.webViewLink ?? '',
        thumbnailLink: f.thumbnailLink ?? null,
        subfolderPath: subfolderPath || null,
        nameValid: parsed.valid,
        parsedDate: parsed.parsedDate,
        parsedSubject: parsed.parsedSubject,
        parsedLocation: parsed.parsedLocation,
        nameSuggestion: suggestion,
        modifiedAt: f.modifiedTime ? new Date(f.modifiedTime) : null,
        syncedAt: new Date(),
      },
    });
  }

  // Remove stale non-media rows (legacy data before MIME filter was added)
  const allInFolder = await prisma.driveFile.findMany({
    where: { folderId: folder.id },
    select: { id: true, mimeType: true },
  });
  const staleIds = allInFolder.filter((f) => !isMediaMime(f.mimeType)).map((f) => f.id);
  if (staleIds.length) {
    await prisma.driveFile.deleteMany({ where: { id: { in: staleIds } } });
  }

  await prisma.driveFolder.update({
    where: { id: folder.id },
    data: { lastSyncAt: new Date(), fileCount: entries.length },
  });

  return entries.length;
}

export async function countFolderFiles(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const folder = await prisma.driveFolder.findUnique({ where: { id } });
  if (!folder) return sendError(res, 'Folder not found', 404);

  try {
    const drive = await getDriveForUser(req.user!.userId);
    const entries = await collectMediaFiles(drive, folder.driveId, folder.driveType === 'shared', folder.recursive);
    const subfolders = new Set(entries.map((e) => e.subfolderPath).filter(Boolean));
    return sendSuccess(res, { count: entries.length, subfolderCount: subfolders.size, recursive: folder.recursive });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Count failed';
    return sendError(res, msg, 500);
  }
}

export async function syncFolder(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const folder = await prisma.driveFolder.findUnique({ where: { id } });
  if (!folder) return sendError(res, 'Folder not found', 404);

  try {
    const drive = await getDriveForUser(req.user!.userId);
    const count = await syncFolderFiles(drive, folder);
    return sendSuccess(res, { synced: count, folderId: id });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sync failed';
    return sendError(res, msg, 500);
  }
}

export async function syncAll(req: AuthRequest, res: Response) {
  const folders = await prisma.driveFolder.findMany({ where: { isWatched: true } });
  if (!folders.length) return sendSuccess(res, { synced: 0, folders: 0 });

  try {
    const drive = await getDriveForUser(req.user!.userId);
    let total = 0;
    for (const folder of folders) {
      total += await syncFolderFiles(drive, folder);
    }
    return sendSuccess(res, { synced: total, folders: folders.length });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sync failed';
    return sendError(res, msg, 500);
  }
}

// ─── File endpoints ───────────────────────────────────────────────────────────

function qs(v: unknown) { return typeof v === 'string' ? v : undefined; }

export async function getFiles(req: AuthRequest, res: Response) {
  const search = qs(req.query.search);
  const folderId = qs(req.query.folderId);
  const nameValid = req.query.nameValid;
  const mediaType = qs(req.query.mediaType); // 'video' | 'image'
  const tagValueIds = req.query.tagValueIds
    ? String(req.query.tagValueIds).split(',').filter(Boolean)
    : undefined;

  const page = Math.max(1, parseInt(qs(req.query.page) ?? '1', 10));
  const limit = Math.min(100, parseInt(qs(req.query.limit) ?? '50', 10));

  const where: Record<string, unknown> = {};
  if (folderId) where.folderId = folderId;
  if (nameValid === 'true') where.nameValid = true;
  if (nameValid === 'false') where.nameValid = false;
  if (search) where.name = { contains: search, mode: 'insensitive' };
  if (mediaType === 'video') where.mimeType = { startsWith: 'video/' };
  if (mediaType === 'image') where.mimeType = { startsWith: 'image/' };
  if (tagValueIds?.length) {
    where.tags = { some: { tagValueId: { in: tagValueIds } } };
  }

  const [files, total] = await Promise.all([
    prisma.driveFile.findMany({
      where,
      orderBy: { modifiedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        folder: { select: { id: true, name: true } },
        tags: {
          include: {
            tagValue: { include: { category: { select: { id: true, name: true, color: true } } } },
          },
        },
      },
    }),
    prisma.driveFile.count({ where }),
  ]);

  // serialise BigInt
  const serialised = files.map((f) => ({ ...f, size: f.size?.toString() ?? null }));
  return sendSuccess(res, { files: serialised, total, page, limit });
}

export async function getFileStats(req: AuthRequest, res: Response) {
  const [total, valid, invalid, tagged] = await Promise.all([
    prisma.driveFile.count(),
    prisma.driveFile.count({ where: { nameValid: true } }),
    prisma.driveFile.count({ where: { nameValid: false } }),
    prisma.driveFile.count({ where: { tags: { some: {} } } }),
  ]);
  return sendSuccess(res, { total, valid, invalid, tagged, untagged: total - tagged });
}

export async function renameFile(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const { newName } = req.body as { newName?: string };
  if (!newName?.trim()) return sendError(res, 'newName is required', 400);

  const file = await prisma.driveFile.findUnique({ where: { id } });
  if (!file) return sendError(res, 'File not found', 404);

  try {
    const drive = await getDriveForUser(req.user!.userId);
    await drive.files.update({
      fileId: file.driveId,
      supportsAllDrives: true,
      requestBody: { name: newName.trim() },
    });

    const parsed = parseFileName(newName.trim());
    const updated = await prisma.driveFile.update({
      where: { id },
      data: {
        name: newName.trim(),
        nameValid: parsed.valid,
        parsedDate: parsed.parsedDate,
        parsedSubject: parsed.parsedSubject,
        parsedLocation: parsed.parsedLocation,
        nameSuggestion: null,
      },
      include: {
        tags: {
          include: {
            tagValue: { include: { category: { select: { id: true, name: true, color: true } } } },
          },
        },
      },
    });
    return sendSuccess(res, { ...updated, size: updated.size?.toString() ?? null });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Rename failed';
    return sendError(res, msg, 500);
  }
}

export async function bulkRenameFiles(req: AuthRequest, res: Response) {
  const { renames } = req.body as { renames?: Array<{ id: string; newName: string }> };
  if (!Array.isArray(renames) || renames.length === 0) return sendError(res, 'renames array required', 400);

  let drive: ReturnType<typeof google.drive>;
  try {
    drive = await getDriveForUser(req.user!.userId);
  } catch (err: unknown) {
    return sendError(res, err instanceof Error ? err.message : 'Drive connection failed', 500);
  }

  const results: unknown[] = [];
  const errors: { id: string; error: string }[] = [];

  for (const { id, newName } of renames) {
    if (!newName?.trim()) { errors.push({ id, error: 'newName is empty' }); continue; }
    try {
      const file = await prisma.driveFile.findUnique({ where: { id } });
      if (!file) { errors.push({ id, error: 'File not found' }); continue; }

      await drive.files.update({
        fileId: file.driveId,
        supportsAllDrives: true,
        requestBody: { name: newName.trim() },
      });

      const parsed = parseFileName(newName.trim());
      const updated = await prisma.driveFile.update({
        where: { id },
        data: {
          name: newName.trim(),
          nameValid: parsed.valid,
          parsedDate: parsed.parsedDate,
          parsedSubject: parsed.parsedSubject,
          parsedLocation: parsed.parsedLocation,
          nameSuggestion: null,
        },
        include: {
          tags: {
            include: {
              tagValue: { include: { category: { select: { id: true, name: true, color: true } } } },
            },
          },
        },
      });
      results.push({ ...updated, size: updated.size?.toString() ?? null });
    } catch (err: unknown) {
      errors.push({ id, error: err instanceof Error ? err.message : 'Rename failed' });
    }
  }

  return sendSuccess(res, { renamed: results.length, errors, results });
}

export async function getQASummary(req: AuthRequest, res: Response) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    invalidCount,
    invalidSample,
    untaggedCount,
    untaggedSample,
    staleFolders,
    dupRaw,
    openShotsCount,
    openShots,
  ] = await Promise.all([
    prisma.driveFile.count({ where: { nameValid: false } }),
    prisma.driveFile.findMany({
      where: { nameValid: false },
      orderBy: { modifiedAt: 'desc' },
      take: 5,
      include: { folder: { select: { id: true, name: true } } },
    }),
    prisma.driveFile.count({ where: { tags: { none: {} } } }),
    prisma.driveFile.findMany({
      where: { tags: { none: {} } },
      orderBy: { modifiedAt: 'desc' },
      take: 5,
      include: { folder: { select: { id: true, name: true } } },
    }),
    prisma.driveFolder.findMany({
      where: {
        isWatched: true,
        OR: [{ lastSyncAt: null }, { lastSyncAt: { lt: sevenDaysAgo } }],
      },
    }),
    prisma.$queryRaw<Array<{ parsedDate: string; parsedSubject: string; parsedLocation: string | null; cnt: bigint }>>`
      SELECT "parsedDate", "parsedSubject", "parsedLocation", COUNT(*) as cnt
      FROM "DriveFile"
      WHERE "parsedDate" IS NOT NULL AND "parsedSubject" IS NOT NULL AND "nameValid" = true
      GROUP BY "parsedDate", "parsedSubject", "parsedLocation"
      HAVING COUNT(*) > 1
      ORDER BY cnt DESC
      LIMIT 5
    `,
    prisma.missingShot.count({ where: { status: { in: ['NEEDED', 'IN_PROGRESS'] } } }),
    prisma.missingShot.findMany({
      where: { status: { in: ['NEEDED', 'IN_PROGRESS'] } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: { requestedBy: { select: { id: true, firstName: true, lastName: true } } },
      take: 10,
    }),
  ]);

  const dupGroups = await Promise.all(
    dupRaw.map(async (g) => {
      const files = await prisma.driveFile.findMany({
        where: { parsedDate: g.parsedDate, parsedSubject: g.parsedSubject, parsedLocation: g.parsedLocation },
        take: 4,
        include: { folder: { select: { id: true, name: true } } },
        orderBy: { modifiedAt: 'desc' },
      });
      return {
        parsedDate: g.parsedDate,
        parsedSubject: g.parsedSubject,
        parsedLocation: g.parsedLocation,
        count: Number(g.cnt),
        files: files.map((f) => ({ ...f, size: f.size?.toString() ?? null })),
      };
    })
  );

  return sendSuccess(res, {
    invalidNames: {
      count: invalidCount,
      sample: invalidSample.map((f) => ({ ...f, size: f.size?.toString() ?? null })),
    },
    untagged: {
      count: untaggedCount,
      sample: untaggedSample.map((f) => ({ ...f, size: f.size?.toString() ?? null })),
    },
    staleFolders: { count: staleFolders.length, folders: staleFolders },
    duplicates: { count: dupGroups.length, groups: dupGroups },
    openShots: { count: openShotsCount, shots: openShots },
  });
}

export async function getArchiveReport(_req: AuthRequest, res: Response) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalFiles, validFiles, taggedFiles, tagCategories, openShots, staleFolders] = await Promise.all([
    prisma.driveFile.count(),
    prisma.driveFile.count({ where: { nameValid: true } }),
    prisma.driveFile.count({ where: { tags: { some: {} } } }),
    prisma.tagCategory.findMany({
      orderBy: { order: 'asc' },
      include: {
        values: {
          orderBy: { order: 'asc' },
          include: { _count: { select: { files: true } } },
        },
      },
    }),
    prisma.missingShot.findMany({
      where: { status: { in: ['NEEDED', 'IN_PROGRESS'] } },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      include: { requestedBy: { select: { firstName: true, lastName: true } } },
    }),
    prisma.driveFolder.findMany({
      where: {
        isWatched: true,
        OR: [{ lastSyncAt: null }, { lastSyncAt: { lt: sevenDaysAgo } }],
      },
    }),
  ]);

  return sendSuccess(res, {
    generatedAt: new Date().toISOString(),
    overview: {
      totalFiles,
      validFiles,
      invalidFiles: totalFiles - validFiles,
      validPct: totalFiles > 0 ? Math.round((validFiles / totalFiles) * 100) : 0,
      taggedFiles,
      untaggedFiles: totalFiles - taggedFiles,
      taggedPct: totalFiles > 0 ? Math.round((taggedFiles / totalFiles) * 100) : 0,
    },
    tagBreakdown: tagCategories.map((c) => ({
      id: c.id,
      name: c.name,
      color: c.color,
      totalFiles: c.values.reduce((sum, v) => sum + v._count.files, 0),
      values: c.values
        .filter((v) => v._count.files > 0)
        .map((v) => ({ id: v.id, value: v.value, fileCount: v._count.files })),
    })),
    openShots: openShots.map((s) => ({
      id: s.id,
      subject: s.subject,
      priority: s.priority,
      status: s.status,
      vehicleMake: s.vehicleMake,
      packageType: s.packageType,
      category: s.category,
      targetShootDate: s.targetShootDate?.toISOString() ?? null,
      requestedBy: `${s.requestedBy.firstName} ${s.requestedBy.lastName}`,
    })),
    staleFolders: staleFolders.map((f) => ({
      id: f.id,
      name: f.name,
      lastSyncAt: f.lastSyncAt?.toISOString() ?? null,
      fileCount: f.fileCount,
    })),
  });
}

export async function matchMissingShots(_req: AuthRequest, res: Response) {
  const shots = await prisma.missingShot.findMany({
    where: { status: { in: ['NEEDED', 'IN_PROGRESS'] } },
    orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    include: { requestedBy: { select: { id: true, firstName: true, lastName: true } } },
  });

  const matches: Array<{ shot: (typeof shots)[0]; files: unknown[] }> = [];

  for (const shot of shots) {
    const candidates = await prisma.driveFile.findMany({
      where: {
        OR: [
          { parsedSubject: { contains: shot.subject, mode: 'insensitive' } },
          { name: { contains: shot.subject, mode: 'insensitive' } },
        ],
      },
      take: 3,
      orderBy: { modifiedAt: 'desc' },
      include: { folder: { select: { id: true, name: true } } },
    });
    if (candidates.length > 0) {
      matches.push({
        shot,
        files: candidates.map((f) => ({ ...f, size: f.size?.toString() ?? null })),
      });
    }
  }

  return sendSuccess(res, { matches });
}

export async function suggestFileTags(req: AuthRequest, res: Response) {
  const id = req.params.id as string;

  const [file, categories] = await Promise.all([
    prisma.driveFile.findUnique({
      where: { id },
      include: {
        folder: { select: { name: true } },
        tags: { include: { tagValue: { include: { category: { select: { id: true, name: true, color: true } } } } } },
      },
    }),
    prisma.tagCategory.findMany({
      orderBy: { order: 'asc' },
      include: { values: { orderBy: { order: 'asc' } } },
    }),
  ]);

  if (!file) return sendError(res, 'File not found', 404);
  if (categories.length === 0) return sendSuccess(res, { suggestions: [] });

  const existingIds = new Set(file.tags.map((t) => t.tagValue.id));

  const taxonomy = categories
    .map((c) => `${c.name}: ${c.values.map((v) => `"${v.value}" (id: ${v.id})`).join(', ')}`)
    .join('\n');

  const context = [
    `Filename: ${file.name}`,
    file.folder ? `Folder: ${file.folder.name}` : null,
    file.subfolderPath ? `Subfolder path: ${file.subfolderPath}` : null,
    file.parsedDate ? `Shoot date: ${file.parsedDate}` : null,
    file.parsedSubject ? `Subject: ${file.parsedSubject}` : null,
    file.parsedLocation ? `Location: ${file.parsedLocation}` : null,
  ].filter(Boolean).join('\n');

  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: `You are a metadata assistant for a creative agency's video and photo archive. Suggest relevant tags for this file based on its filename and folder context. Only suggest tags you can confidently infer — do not guess.

File context:
${context}

Tag taxonomy (only use IDs from this list):
${taxonomy}

Return ONLY a JSON array of tag value IDs that apply to this file. If nothing is clearly applicable, return [].
Example: ["abc123", "def456"]`,
      }],
    });

    const text = message.content.find((c) => c.type === 'text')?.text ?? '[]';
    const match = text.match(/\[[\s\S]*?\]/);
    const rawIds: unknown = match ? JSON.parse(match[0]) : [];
    if (!Array.isArray(rawIds)) return sendSuccess(res, { suggestions: [] });

    const allValues = new Map(
      categories.flatMap((c) =>
        c.values.map((v) => [v.id, { id: v.id, value: v.value, category: { id: c.id, name: c.name, color: c.color } }])
      )
    );

    const suggestions = (rawIds as unknown[])
      .filter((id): id is string => typeof id === 'string' && allValues.has(id) && !existingIds.has(id))
      .map((id) => allValues.get(id)!);

    return sendSuccess(res, { suggestions });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'AI suggestion failed';
    return sendError(res, msg, 500);
  }
}

export async function updateFileTags(req: AuthRequest, res: Response) {
  const id = req.params.id as string;
  const { tagValueIds } = req.body as { tagValueIds?: string[] };
  if (!Array.isArray(tagValueIds)) return sendError(res, 'tagValueIds must be an array', 400);

  const file = await prisma.driveFile.findUnique({ where: { id } });
  if (!file) return sendError(res, 'File not found', 404);

  // Check tagging permission (admin always allowed)
  if (req.user!.role !== 'ADMIN') {
    const perm = await prisma.fileTagPermission.findUnique({ where: { userId: req.user!.userId } });
    if (!perm?.canTag) return sendError(res, 'You do not have permission to tag files', 403);
  }

  await prisma.$transaction(async (tx) => {
    await tx.fileTag.deleteMany({ where: { fileId: id } });
    if (tagValueIds.length) {
      await tx.fileTag.createMany({
        data: tagValueIds.map((tagValueId) => ({
          fileId: id,
          tagValueId,
          taggedById: req.user!.userId,
        })),
        skipDuplicates: true,
      });
    }
  });

  const updated = await prisma.driveFile.findUnique({
    where: { id },
    include: {
      tags: {
        include: {
          tagValue: { include: { category: { select: { id: true, name: true, color: true } } } },
        },
      },
    },
  });
  return sendSuccess(res, { ...updated, size: (updated as { size?: bigint | null }).size?.toString() ?? null });
}
