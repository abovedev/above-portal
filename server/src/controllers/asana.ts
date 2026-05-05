import { Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

const ASANA_API_BASE = 'https://app.asana.com/api/1.0';
const ASANA_AUTH_URL = 'https://app.asana.com/-/oauth_authorize';
const ASANA_TOKEN_URL = 'https://app.asana.com/-/oauth_token';
const ASANA_SCOPES = 'tasks:read tasks:write workspaces:read';
const STATE_SECRET = process.env.JWT_SECRET || 'dev-secret';

type AsanaConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  clientUrl: string;
};

type AsanaErrorBody = {
  errors?: Array<{ message?: string }>;
  message?: string;
};

type AsanaTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  data?: {
    id?: string | number;
    gid?: string;
    name?: string;
    email?: string;
  };
};

type AsanaTask = {
  gid: string;
  name: string;
  completed?: boolean;
  permalink_url?: string;
  due_on?: string | null;
};

type AsanaWorkspace = {
  gid: string;
  name: string;
};

function getAsanaConfig() {
  return {
    clientId: process.env.ASANA_CLIENT_ID,
    clientSecret: process.env.ASANA_CLIENT_SECRET,
    redirectUri: process.env.ASANA_REDIRECT_URI || `${process.env.SERVER_URL || 'http://localhost:4000'}/api/asana/callback`,
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  };
}

function assertAsanaConfig(res: Response): AsanaConfig | null {
  const config = getAsanaConfig();
  if (!config.clientId || !config.clientSecret) {
    sendError(res, 'Asana integration is not configured. Set ASANA_CLIENT_ID and ASANA_CLIENT_SECRET.', 503);
    return null;
  }
  return {
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri,
    clientUrl: config.clientUrl,
  };
}

async function asanaRequest<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${ASANA_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  const body = await res.json().catch(() => ({})) as AsanaErrorBody;
  if (!res.ok) {
    const message = body?.errors?.[0]?.message || body?.message || 'Asana request failed';
    const error = new Error(message) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return body as T;
}

async function refreshAccessToken(userId: string) {
  const config = getAsanaConfig();
  if (!config.clientId || !config.clientSecret) throw new Error('Asana integration is not configured');

  const connection = await prisma.asanaConnection.findUnique({ where: { userId } });
  if (!connection) return null;
  if (connection.expiresAt.getTime() > Date.now() + 60_000) return connection;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: connection.refreshToken,
  });

  const res = await fetch(ASANA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const tokenData = await res.json().catch(() => ({})) as AsanaTokenResponse & AsanaErrorBody;
  if (!res.ok) throw new Error(tokenData?.errors?.[0]?.message || 'Failed to refresh Asana token');

  return prisma.asanaConnection.update({
    where: { userId },
    data: {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || connection.refreshToken,
      expiresAt: new Date(Date.now() + Number(tokenData.expires_in || 3600) * 1000),
    },
  });
}

async function getConnectionOrError(req: AuthRequest, res: Response) {
  try {
    const connection = await refreshAccessToken(req.user!.userId);
    if (!connection) {
      sendError(res, 'Asana is not connected', 404, 'ASANA_NOT_CONNECTED');
      return null;
    }
    return connection;
  } catch {
    sendError(res, 'Failed to refresh Asana connection', 401, 'ASANA_AUTH_EXPIRED');
    return null;
  }
}

export async function getStatus(req: AuthRequest, res: Response) {
  const config = getAsanaConfig();
  const connection = await prisma.asanaConnection.findUnique({ where: { userId: req.user!.userId } });
  return sendSuccess(res, {
    configured: Boolean(config.clientId && config.clientSecret),
    connected: Boolean(connection),
    connection: connection ? {
      userName: connection.asanaUserName,
      userEmail: connection.asanaUserEmail,
      workspaceName: connection.workspaceName,
    } : null,
  });
}

export async function connect(req: AuthRequest, res: Response) {
  const config = assertAsanaConfig(res);
  if (!config) return;

  const state = jwt.sign(
    {
      userId: req.user!.userId,
      nonce: crypto.randomBytes(16).toString('hex'),
    },
    STATE_SECRET,
    { expiresIn: '10m' }
  );

  const url = new URL(ASANA_AUTH_URL);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  url.searchParams.set('scope', ASANA_SCOPES);

  // Log the generated Asana authorization URL to help debug redirect URI mismatches
  // (restart the server and trigger the connect flow; the URL will appear in server logs)
  // eslint-disable-next-line no-console
  console.log('Asana connect URL:', url.toString());

  return sendSuccess(res, { url: url.toString() });
}

export async function callback(req: AuthRequest, res: Response) {
  const config = assertAsanaConfig(res);
  if (!config) return;

  const parsed = z.object({
    code: z.string(),
    state: z.string(),
  }).safeParse(req.query);
  if (!parsed.success) return res.redirect(`${config.clientUrl}/dashboard?asana=failed`);

  let state: { userId: string };
  try {
    state = jwt.verify(parsed.data.state, STATE_SECRET) as { userId: string };
  } catch {
    return res.redirect(`${config.clientUrl}/dashboard?asana=failed`);
  }

  const tokenBody = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    code: parsed.data.code,
  });

  try {
    const tokenRes = await fetch(ASANA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody,
    });
    const tokenData = await tokenRes.json() as AsanaTokenResponse;
    if (!tokenRes.ok) throw new Error('Asana token exchange failed');

    const accessToken = tokenData.access_token as string;
    const workspaces = await asanaRequest<{ data: AsanaWorkspace[] }>(
      accessToken,
      '/workspaces?limit=10&opt_fields=gid,name'
    );
    const workspace = workspaces.data[0];
    const asanaUser = tokenData.data || {};

    await prisma.asanaConnection.upsert({
      where: { userId: state.userId },
      update: {
        asanaUserGid: String(asanaUser.gid || asanaUser.id || ''),
        asanaUserName: asanaUser.name,
        asanaUserEmail: asanaUser.email,
        accessToken,
        refreshToken: tokenData.refresh_token || '',
        expiresAt: new Date(Date.now() + Number(tokenData.expires_in || 3600) * 1000),
        workspaceGid: workspace?.gid,
        workspaceName: workspace?.name,
      },
      create: {
        userId: state.userId,
        asanaUserGid: String(asanaUser.gid || asanaUser.id || ''),
        asanaUserName: asanaUser.name,
        asanaUserEmail: asanaUser.email,
        accessToken,
        refreshToken: tokenData.refresh_token || '',
        expiresAt: new Date(Date.now() + Number(tokenData.expires_in || 3600) * 1000),
        workspaceGid: workspace?.gid,
        workspaceName: workspace?.name,
      },
    });

    return res.redirect(`${config.clientUrl}/dashboard?asana=connected`);
  } catch {
    return res.redirect(`${config.clientUrl}/dashboard?asana=failed`);
  }
}

export async function disconnect(req: AuthRequest, res: Response) {
  await prisma.asanaConnection.deleteMany({ where: { userId: req.user!.userId } });
  return sendSuccess(res, null, 'Asana disconnected');
}

export async function searchTasks(req: AuthRequest, res: Response) {
  const connection = await getConnectionOrError(req, res);
  if (!connection) return;
  if (!connection.workspaceGid) return sendError(res, 'No Asana workspace found for this account', 400);

  const query = z.object({ q: z.string().min(1).max(120) }).safeParse(req.query);
  if (!query.success) return sendError(res, 'Search text is required', 400);

  const fields = 'gid,name,completed,permalink_url,due_on';
  const searchPath = `/workspaces/${connection.workspaceGid}/tasks/search?${new URLSearchParams({
    text: query.data.q,
    'assignee.any': 'me',
    completed: 'false',
    limit: '10',
    opt_fields: fields,
  })}`;

  try {
    const result = await asanaRequest<{ data: AsanaTask[] }>(connection.accessToken, searchPath);
    return sendSuccess(res, {
      tasks: result.data.map((task) => ({
        gid: task.gid,
        name: task.name,
        completed: Boolean(task.completed),
        permalinkUrl: task.permalink_url,
        dueOn: task.due_on || null,
      })),
    });
  } catch (error) {
    const status = (error as Error & { status?: number }).status;
    if (status === 402) {
      return sendError(res, 'Asana search requires a premium Asana workspace.', 402, 'ASANA_SEARCH_PREMIUM_REQUIRED');
    }
    return sendError(res, 'Failed to search Asana tasks', 502);
  }
}

export async function importTask(req: AuthRequest, res: Response) {
  const connection = await getConnectionOrError(req, res);
  if (!connection) return;

  const parsed = z.object({
    gid: z.string(),
    name: z.string().min(1),
    permalinkUrl: z.string().url().optional(),
    dueOn: z.string().optional().nullable(),
  }).safeParse(req.body);
  if (!parsed.success) return sendError(res, 'Invalid Asana task data', 400);

  const existing = await prisma.task.findFirst({
    where: { userId: req.user!.userId, asanaTaskGid: parsed.data.gid },
  });

  const task = existing
    ? await prisma.task.update({
      where: { id: existing.id },
      data: {
        title: parsed.data.name,
        asanaPermalink: parsed.data.permalinkUrl,
        ...(parsed.data.dueOn !== undefined && { dueDate: parsed.data.dueOn ? new Date(parsed.data.dueOn) : null }),
      },
    })
    : await prisma.task.create({
      data: {
      userId: req.user!.userId,
      title: parsed.data.name,
      asanaTaskGid: parsed.data.gid,
      asanaPermalink: parsed.data.permalinkUrl,
      ...(parsed.data.dueOn && { dueDate: new Date(parsed.data.dueOn) }),
      },
    });

  return sendSuccess(res, { task }, 'Asana task added', 201);
}

export async function completeTask(taskGid: string, userId: string) {
  const connection = await refreshAccessToken(userId);
  if (!connection) throw new Error('Asana is not connected');

  await asanaRequest(connection.accessToken, `/tasks/${taskGid}`, {
    method: 'PUT',
    body: JSON.stringify({ data: { completed: true } }),
  });
}

export async function aiGetAsanaTasks(userId: string, query?: string): Promise<string> {
  let connection;
  try {
    connection = await refreshAccessToken(userId);
  } catch {
    return 'Asana token refresh failed. Ask the user to reconnect Asana from the Tasks widget.';
  }

  if (!connection) return 'Asana is not connected. Ask the user to connect Asana from the Tasks widget on the dashboard.';
  if (!connection.workspaceGid) return 'No Asana workspace found for this account.';

  const fields = 'gid,name,completed,permalink_url,due_on';

  try {
    let tasks: AsanaTask[];

    if (query) {
      const path = `/workspaces/${connection.workspaceGid}/tasks/search?${new URLSearchParams({
        text: query,
        'assignee.any': 'me',
        completed: 'false',
        limit: '15',
        opt_fields: fields,
      })}`;
      const result = await asanaRequest<{ data: AsanaTask[] }>(connection.accessToken, path);
      tasks = result.data;
    } else {
      const path = `/tasks?${new URLSearchParams({
        workspace: connection.workspaceGid,
        assignee: 'me',
        completed_since: 'now',
        limit: '20',
        opt_fields: fields,
      })}`;
      const result = await asanaRequest<{ data: AsanaTask[] }>(connection.accessToken, path);
      tasks = result.data.filter((t) => !t.completed);
    }

    if (tasks.length === 0) {
      return query ? `No Asana tasks found matching "${query}".` : 'No open Asana tasks assigned to you.';
    }

    return JSON.stringify(
      tasks.map((t) => ({
        name: t.name,
        dueOn: t.due_on || null,
        link: t.permalink_url,
        gid: t.gid,
      }))
    );
  } catch (err) {
    const status = (err as Error & { status?: number }).status;
    if (status === 402) return 'Asana task search requires a premium Asana workspace.';
    return 'Failed to fetch Asana tasks.';
  }
}
