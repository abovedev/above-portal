import { Request, Response } from 'express';
import { google } from 'googleapis';
import prisma from '../prisma/client';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';

function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:4000/api/google/callback'
  );
}

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/chat.spaces.readonly',
  'https://www.googleapis.com/auth/chat.messages',
  'https://www.googleapis.com/auth/chat.messages.readonly',
  'https://www.googleapis.com/auth/chat.messages.create',
  'https://www.googleapis.com/auth/chat.memberships.readonly',
  'https://www.googleapis.com/auth/contacts.other.readonly',
  'https://www.googleapis.com/auth/directory.readonly',
  'email',
  'profile',
];

type GoogleApiError = Error & {
  code?: number;
  response?: {
    status?: number;
    data?: {
      error?: {
        code?: number;
        status?: string;
        message?: string;
      };
      error_description?: string;
    };
  };
};

function getGoogleErrorDetails(err: unknown) {
  const error = err as GoogleApiError;
  const status = error.response?.status ?? error.code ?? 500;
  const message =
    error.response?.data?.error?.message ||
    error.response?.data?.error_description ||
    error.message ||
    'Google API request failed';
  const googleStatus = error.response?.data?.error?.status;
  const code = message.includes('Token has been expired or revoked')
    ? 'GOOGLE_RECONNECT_REQUIRED'
    : message.includes('Google Chat app not found')
    ? 'GOOGLE_CHAT_APP_NOT_CONFIGURED'
    : status === 401 || status === 403
      ? 'GOOGLE_RECONNECT_REQUIRED'
      : googleStatus || 'GOOGLE_API_ERROR';

  return { status, message, googleStatus, code };
}

export async function getAuthUrl(req: AuthRequest, res: Response) {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return sendError(res, 'Google OAuth not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env', 503);
  }
  const oauth2Client = createOAuthClient();
  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    state: req.user!.userId,
    prompt: 'consent',
    include_granted_scopes: true,
  });
  // Return the URL as JSON so the client can redirect with the auth header already sent
  return sendSuccess(res, { url });
}

export async function reconnectGoogle(req: AuthRequest, res: Response) {
  await prisma.user.update({
    where: { id: req.user!.userId },
    data: {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleEmail: null,
    },
  });

  return getAuthUrl(req, res);
}

export async function handleCallback(req: Request, res: Response) {
  const { code, state: userId, error } = req.query as Record<string, string>;

  if (error || !code || !userId) {
    return res.redirect(`${process.env.CLIENT_URL || 'http://localhost:5173'}?google=error`);
  }

  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

  try {
    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: profile } = await oauth2Api.userinfo.get();

    await prisma.user.update({
      where: { id: userId },
      data: {
        googleAccessToken: tokens.access_token,
        googleRefreshToken: tokens.refresh_token ?? undefined,
        googleEmail: profile.email ?? undefined,
      },
    });

    return res.redirect(`${clientUrl}/dashboard?google=connected`);
  } catch (err) {
    console.error('[Google OAuth callback error]', err);
    return res.redirect(`${clientUrl}/dashboard?google=error`);
  }
}

export async function getGoogleStatus(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { googleAccessToken: true, googleEmail: true },
  });
  return sendSuccess(res, {
    connected: !!user?.googleAccessToken,
    email: user?.googleEmail ?? null,
  });
}

async function getAuthedClient(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { googleAccessToken: true, googleRefreshToken: true },
  });
  if (!user?.googleAccessToken) return null;

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: user.googleAccessToken,
    refresh_token: user.googleRefreshToken ?? undefined,
  });

  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await prisma.user.update({
        where: { id: userId },
        data: { googleAccessToken: tokens.access_token },
      });
    }
  });

  return oauth2Client;
}

function parseFrom(from: string): { name: string; email: string } {
  const match = from.match(/^(.*?)\s*<(.+?)>$/);
  if (match) return { name: match[1].replace(/"/g, '').trim(), email: match[2] };
  return { name: from, email: from };
}

async function resolveGoogleUserName(
  authClient: Awaited<ReturnType<typeof getAuthedClient>>,
  userName: string
) {
  if (!authClient || !userName.startsWith('users/')) return { name: null, needsReconnect: false };
  const id = userName.replace('users/', '');
  if (!id || id === 'me' || id === 'app') return { name: null, needsReconnect: false };

  try {
    const people = google.people({ version: 'v1', auth: authClient });
    const person = await people.people.get({
      resourceName: `people/${id}`,
      personFields: 'names,emailAddresses',
    });

    return {
      name: person.data.names?.[0]?.displayName || person.data.emailAddresses?.[0]?.value || null,
      needsReconnect: false,
    };
  } catch (err) {
    const details = getGoogleErrorDetails(err);
    console.warn('[People display name warning]', details);
    return {
      name: null,
      needsReconnect: details.code === 'GOOGLE_RECONNECT_REQUIRED',
    };
  }
}

async function resolveChatSpaceDisplayName(
  chat: ReturnType<typeof google.chat>,
  authClient: Awaited<ReturnType<typeof getAuthedClient>>,
  spaceName: string,
  fallback: string,
  currentUserEmail?: string | null,
  currentGoogleUserId?: string | null
): Promise<{ displayName: string; needsReconnect: boolean }> {
  const currentUserResourceName = currentGoogleUserId ? `users/${currentGoogleUserId}` : null;

  try {
    const membersRes = await chat.spaces.members.list({
      parent: spaceName,
      pageSize: 10,
      filter: 'member.type = "HUMAN"',
    });

    let peopleNeedsReconnect = false;
    const members = await Promise.all(
      (membersRes.data.memberships ?? []).map(async (membership) => {
        const member = membership.member;
        const memberName = member?.name ?? '';
        const resolved = member?.displayName
          ? { name: member.displayName, needsReconnect: false }
          : await resolveGoogleUserName(authClient, memberName);
        if (resolved.needsReconnect) peopleNeedsReconnect = true;
        const email = memberName.startsWith('users/')
          ? memberName.replace('users/', '')
          : '';
        return { displayName: resolved.name ?? '', email, memberName };
      })
    );

    const visibleMembers = members
      .filter((member) => member.displayName || member.email)
      .filter((member) => !currentUserEmail || member.email.toLowerCase() !== currentUserEmail.toLowerCase())
      .filter((member) => !currentUserResourceName || member.memberName !== currentUserResourceName);

    const namedMembers = visibleMembers.filter((member) => {
      const value = member.displayName || member.email;
      return !/^\d{8,}$/.test(value);
    });

    if (namedMembers.length > 0) {
      return {
        displayName: namedMembers.map((member) => member.displayName || member.email).join(', '),
        needsReconnect: false,
      };
    }
    if (peopleNeedsReconnect) {
      return { displayName: fallback, needsReconnect: true };
    }
  } catch (err) {
    const details = getGoogleErrorDetails(err);
    console.warn('[Chat members display name warning]', details);
    return {
      displayName: fallback,
      needsReconnect: details.code === 'GOOGLE_RECONNECT_REQUIRED',
    };
  }

  try {
    const messagesRes = await chat.spaces.messages.list({
      parent: spaceName,
      pageSize: 20,
      orderBy: 'createTime desc',
    });

    const senders = (messagesRes.data.messages ?? [])
      .map((message) => ({
        name: message.sender?.name ?? '',
        displayName: message.sender?.displayName ?? '',
      }))
      .filter((sender) => sender.displayName)
      .filter((sender) => !currentUserResourceName || sender.name !== currentUserResourceName);

    const uniqueNames = Array.from(new Set(senders.map((sender) => sender.displayName)));
    if (uniqueNames.length > 0) {
      return { displayName: uniqueNames.join(', '), needsReconnect: false };
    }
  } catch (err) {
    const details = getGoogleErrorDetails(err);
    console.warn('[Chat messages display name warning]', details);
    if (details.code === 'GOOGLE_RECONNECT_REQUIRED') {
      return { displayName: fallback, needsReconnect: true };
    }
  }

  return { displayName: fallback, needsReconnect: false };
}

export async function getGmailThreads(req: AuthRequest, res: Response) {
  const authClient = await getAuthedClient(req.user!.userId);
  if (!authClient) return sendError(res, 'Google not connected', 401);

  try {
    const gmail = google.gmail({ version: 'v1', auth: authClient });

    const listRes = await gmail.users.threads.list({
      userId: 'me',
      maxResults: 15,
      labelIds: ['INBOX'],
    });

    const threadItems = listRes.data.threads ?? [];

    const threads = await Promise.all(
      threadItems.map(async (t) => {
        const thread = await gmail.users.threads.get({
          userId: 'me',
          id: t.id!,
          format: 'metadata',
          metadataHeaders: ['From', 'Subject', 'Date'],
        });

        const messages = thread.data.messages ?? [];
        const lastMsg = messages[messages.length - 1];
        const headers = lastMsg?.payload?.headers ?? [];
        const getHeader = (name: string) =>
          headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? '';

        const isUnread = messages.some((m) => m.labelIds?.includes('UNREAD'));
        const from = parseFrom(getHeader('From'));

        return {
          id: t.id,
          subject: getHeader('Subject') || '(no subject)',
          from,
          date: getHeader('Date'),
          snippet: lastMsg?.snippet ?? '',
          isUnread,
          messageCount: messages.length,
        };
      })
    );

    return sendSuccess(res, { threads });
  } catch {
    return sendError(res, 'Failed to fetch Gmail threads', 500);
  }
}

export async function getCalendarEvents(req: AuthRequest, res: Response) {
  const authClient = await getAuthedClient(req.user!.userId);
  if (!authClient) return sendError(res, 'Google not connected', 401);

  try {
    const calendar = google.calendar({ version: 'v3', auth: authClient });

    const now = new Date();
    const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const eventsRes = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: twoWeeksOut.toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = (eventsRes.data.items ?? []).map((e) => ({
      id: e.id,
      title: e.summary ?? '(no title)',
      start: e.start?.dateTime ?? e.start?.date ?? null,
      end: e.end?.dateTime ?? e.end?.date ?? null,
      location: e.location ?? null,
      htmlLink: e.htmlLink ?? null,
      allDay: !e.start?.dateTime,
      colorId: e.colorId ?? null,
    }));

    return sendSuccess(res, { events });
  } catch {
    return sendError(res, 'Failed to fetch Calendar events', 500);
  }
}

export async function getChatSpaces(req: AuthRequest, res: Response) {
  const authClient = await getAuthedClient(req.user!.userId);
  if (!authClient) return sendError(res, 'Google not connected', 401);

  try {
    const chat = google.chat({ version: 'v1', auth: authClient });
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { googleEmail: true },
    });
    let currentGoogleUserId: string | null = null;
    try {
      const oauth2Api = google.oauth2({ version: 'v2', auth: authClient });
      const { data: profile } = await oauth2Api.userinfo.get();
      currentGoogleUserId = profile.id ?? null;
    } catch (err) {
      console.warn('[Google profile lookup warning]', getGoogleErrorDetails(err));
    }

    const spacesRes = await chat.spaces.list({ pageSize: 20 });
    let needsReconnect = false;
    const spaces = await Promise.all(
      (spacesRes.data.spaces ?? []).map(async (s) => {
        const type = s.spaceType ?? s.type;
        const fallback = s.displayName ?? s.name ?? 'Unknown';
        const shouldResolveMembers =
          Boolean(s.name) &&
          (!s.displayName || type === 'DIRECT_MESSAGE' || type === 'GROUP_CHAT');

        const resolved = shouldResolveMembers
          ? await resolveChatSpaceDisplayName(chat, authClient, s.name!, fallback, user?.googleEmail, currentGoogleUserId)
          : { displayName: fallback, needsReconnect: false };
        if (resolved.needsReconnect) needsReconnect = true;

        return {
          name: s.name,
          displayName: resolved.displayName,
          type,
        };
      })
    );
    return sendSuccess(res, { spaces, needsReconnect });
  } catch (err) {
    const details = getGoogleErrorDetails(err);
    console.error('[Chat spaces error]', details);
    return sendError(res, details.message, details.status, details.code);
  }
}

export async function getChatMessages(req: AuthRequest, res: Response) {
  const authClient = await getAuthedClient(req.user!.userId);
  if (!authClient) return sendError(res, 'Google not connected', 401);

  const { spaceId } = req.params;
  try {
    const chat = google.chat({ version: 'v1', auth: authClient });
    const msgsRes = await chat.spaces.messages.list({
      parent: `spaces/${spaceId}`,
      pageSize: 50,
      orderBy: 'createTime asc',
    });
    const messages = (msgsRes.data.messages ?? []).map((m) => ({
      name: m.name,
      text: m.text ?? '',
      sender: m.sender?.displayName ?? m.sender?.name ?? 'Unknown',
      senderType: m.sender?.type,
      createTime: m.createTime,
    }));
    return sendSuccess(res, { messages });
  } catch (err) {
    const details = getGoogleErrorDetails(err);
    console.error('[Chat messages error]', details);
    return sendError(res, details.message, details.status, details.code);
  }
}

export async function sendChatMessage(req: AuthRequest, res: Response) {
  const authClient = await getAuthedClient(req.user!.userId);
  if (!authClient) return sendError(res, 'Google not connected', 401);

  const { spaceId } = req.params;
  const { text } = req.body as { text: string };
  if (!text?.trim()) return sendError(res, 'Message text is required', 400);

  try {
    const chat = google.chat({ version: 'v1', auth: authClient });
    await chat.spaces.messages.create({
      parent: `spaces/${spaceId}`,
      requestBody: { text },
    });
    return sendSuccess(res, null, 'Message sent');
  } catch (err) {
    const details = getGoogleErrorDetails(err);
    console.error('[Chat send error]', details);
    return sendError(res, details.message, details.status, details.code);
  }
}

export async function disconnectGoogle(req: AuthRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { googleAccessToken: true },
  });

  if (user?.googleAccessToken) {
    try {
      const oauth2Client = createOAuthClient();
      await oauth2Client.revokeToken(user.googleAccessToken);
    } catch (err) {
      console.warn('[Google revoke warning]', getGoogleErrorDetails(err));
    }
  }

  await prisma.user.update({
    where: { id: req.user!.userId },
    data: {
      googleAccessToken: null,
      googleRefreshToken: null,
      googleEmail: null,
    },
  });
  return sendSuccess(res, null, 'Google disconnected');
}
