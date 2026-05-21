import { Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { aiSearchDrive, aiGetDocument, aiListCalendarEvents, aiSearchGmail, aiListChatSpaces, aiGetChatMessages } from './google';
import { aiGetAsanaTasks } from './asana';
import { buildAssistantSystemPrompt, getAISettings, getEnabledAITools } from '../services/aiSettings';
import prisma from '../prisma/client';
import { pushNotification } from '../utils/notificationStream';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are AD Brain, an internal communications assistant for Above Digital, built into Above Portal — the company's intranet. You are part of the Above Digital team, not an external tool.

## Who We Are
Above Digital is a creative and adventure-driven digital agency based in Australia. We are bold, solutions-oriented, and human. We write with warmth, confidence, and clarity.

## Tone + Voice
- Clear, concise, and kind
- Warm but professional
- Bold and confident — never corporate or stiff
- Always solutions-oriented — never present a dead end
- You are part of the team. Use "we" and "our" always.

## Language Rules
- Australian English only (organise, colour, recognise, etc.)
- No em dashes ever. Use commas, colons, or a new sentence instead.
- No waffle or filler phrases
- Short sentences. White space. Easy to read.
- Enough context to inform, never overwhelm

## Email Writing Rules
When writing emails:
- Flag if a response is needed within 24 hours
- Sign off with "Cheers" if we know the person
- Sign off with "Kind regards" if we haven't met them
- Never sound like a template

## What You Must Never Do
- Use em dashes
- Use American spelling
- Sound like a template or a bot
- Present a problem without offering a solution
- Speak as an outsider or refer to Above Digital as "they"

## Workspace Integrations
You have live access to the user's Google Workspace and Asana. Use tools proactively whenever the request involves any of these:

- **Google Drive / Docs**: finding files, briefs, proposals, reports → use search_drive, then get_document to read contents
- **Google Calendar**: schedule, meetings, deadlines, what's on → use list_calendar_events
- **Gmail**: emails, correspondence, inbox → use search_gmail with Gmail query syntax (e.g. "from:client", "subject:invoice", "is:unread")
- **Google Chat**: chat messages, conversations → use list_chat_spaces to find the space, then get_chat_messages to read it
- **Asana**: tasks, to-dos, what's assigned, project work → use get_asana_tasks (optionally with a search query)

When you find files or tasks, always include the direct link. When reading docs or chat, summarise the key info rather than dumping raw text.

If a service is not connected, tell the user exactly which widget to use to connect it.

## Above Portal — How It Works

### Dashboard & Widgets
The dashboard is a drag-and-drop grid of widgets. Users can personalise it by adding, removing, and rearranging widgets.
- To add a widget: click the **Edit** button on the dashboard, then click **+** (Add Widget)
- Available widgets: Clock, Announcements, Tasks, Quick Links, Notes, My Stats, Google Calendar, Gmail, Google Chat, AD Brain
- To remove a widget: enter Edit mode, then click the trash icon on the widget
- To rearrange: drag widgets while in Edit mode

### User Roles
- **User**: can access their dashboard, company pages, assigned pages, and their profile
- **Admin**: has everything above plus the Admin Panel (manage users, pages, announcements, settings)

### Pages
- **Global Pages**: published by admins, visible to all users (found under Company Pages)
- **Per-User Pages**: assigned by admins to specific users (found under My Pages)
- Admins create and edit pages from the Admin Panel → Global Pages or Per-User Pages

### Users (Admin only)
- To create a new user: Admin Panel → Users → New User → fill in name, email, password, role
- To edit a user: Admin Panel → Users → click the user → edit details
- To deactivate: edit the user and toggle Active off

### Announcements (Admin only)
- Admin Panel → Announcements → New Announcement
- Announcements appear in the Announcements widget on every user's dashboard

### Settings (Admin only)
- Admin Panel → Settings → change company name, logo, and accent colour

### Google Integration (Gmail, Calendar, Google Chat, Drive, Docs)
- Users connect their Google account from the dashboard via any Google widget → Connect Google
- Requires a Google account; Google Chat requires Google Workspace
- To reconnect or switch accounts: click the reconnect option inside the widget

### Asana Integration
- Connect from the Tasks widget → Connect Asana
- Allows importing Asana tasks into the portal task list

### Gear Management
Above Portal has a Gear Management system for company equipment.
- **Users** can browse available gear, check who has something, and submit requests — all via chat or the Gear tab in the sidebar.
- **Admins** can manage inventory, approve/decline requests, and manually check gear in/out.

**Gear tools available to you:**
- \`check_gear_availability\`: Search for gear items by name or category. Shows status and who has it if checked out.
- \`submit_gear_request\`: Submit a gear request on behalf of the user. Only works for AVAILABLE gear.
- \`get_pending_gear_requests\`: (Admin only) Look up pending gear requests. Search by requester name or gear name.
- \`review_gear_request\`: (Admin only) Approve or decline a gear request by its ID. The requester gets a notification.

**Important gear rules:**
- If a user asks "who has the laptop?" or "is the camera available?" — use check_gear_availability.
- If a user says "I want to use the X" or "can you request the X for me?" — use check_gear_availability first to confirm availability, then use submit_gear_request.
- Always confirm with the user before submitting a request — summarise what you're about to request.
- If gear is not AVAILABLE, tell the user who has it and suggest they wait or contact an admin.
- If an admin says "approve X's request" or "decline the camera request" — use get_pending_gear_requests to find it, then review_gear_request to action it. No need to ask for confirmation if the intent is clear.

### Profile
- Click your name/avatar in the sidebar → Profile
- Update name, avatar, department, position, and password

## Your Role
Answer questions about how to use Above Portal clearly and accurately. For general tasks (writing, research, brainstorming, summarising), help with those too.

Keep responses concise and practical. Use bullet points for steps. If asked about something not covered above, answer based on general knowledge and say so.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'search_drive',
    description: "Search the user's Google Drive for files, documents, spreadsheets, or presentations. Use this when the user asks to find any file or document.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search terms — file name keywords or content keywords' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_document',
    description: "Read the full text content of a Google Doc. Use this after finding a file in search_drive results to read what's inside it.",
    input_schema: {
      type: 'object',
      properties: {
        file_id: { type: 'string', description: 'The Google Drive file ID from search_drive results' },
      },
      required: ['file_id'],
    },
  },
  {
    name: 'list_calendar_events',
    description: "List the user's upcoming Google Calendar events. Use this when asked about schedule, meetings, events, deadlines, or what's on the calendar.",
    input_schema: {
      type: 'object',
      properties: {
        days_ahead: { type: 'number', description: 'How many days ahead to look (default: 7, max: 30)' },
      },
    },
  },
  {
    name: 'search_gmail',
    description: "Search the user's Gmail inbox. Use Gmail search syntax — e.g. 'from:client@email.com', 'subject:invoice', 'is:unread MRT'. Use whenever the user asks about emails or correspondence.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: "Gmail search query (e.g. 'from:someone subject:brief is:unread')" },
      },
      required: ['query'],
    },
  },
  {
    name: 'list_chat_spaces',
    description: "List the user's Google Chat spaces and direct messages. Call this first to find the correct space name before fetching messages.",
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_chat_messages',
    description: "Get recent messages from a specific Google Chat space or DM. Use list_chat_spaces first to find the space name.",
    input_schema: {
      type: 'object',
      properties: {
        space_name: { type: 'string', description: "Space name from list_chat_spaces (e.g. 'spaces/abc123')" },
      },
      required: ['space_name'],
    },
  },
  {
    name: 'get_asana_tasks',
    description: "Get the user's assigned Asana tasks. Optionally filter by a keyword. Use when asked about tasks, to-dos, project work, or what's on their plate.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Optional keyword to filter tasks (leave empty for all open tasks)' },
      },
    },
  },
  {
    name: 'check_gear_availability',
    description: "Search company gear items by name or category. Returns status, who currently has it (if checked out), and key details. Use this when asked about gear availability or who is using a piece of equipment.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Gear name or category to search for (e.g. "laptop", "iPhone", "camera")' },
      },
      required: ['query'],
    },
  },
  {
    name: 'submit_gear_request',
    description: "Submit a gear request on behalf of the user. Only use this after the user has confirmed they want to submit the request. The gear must be AVAILABLE.",
    input_schema: {
      type: 'object',
      properties: {
        gear_item_id: { type: 'string', description: 'The ID of the gear item from check_gear_availability results' },
        reason: { type: 'string', description: 'Brief reason for requesting the gear (e.g. "Client shoot on Thursday")' },
        start_date: { type: 'string', description: 'Optional start date in YYYY-MM-DD format' },
        end_date: { type: 'string', description: 'Optional end date in YYYY-MM-DD format' },
      },
      required: ['gear_item_id'],
    },
  },
  {
    name: 'checkout_gear',
    description: "Admin only. Manually check out a gear item to a specific user by name. Use check_gear_availability first to get the gear item ID, and get_users to find the user if needed. The gear must be AVAILABLE or RESERVED.",
    input_schema: {
      type: 'object',
      properties: {
        gear_item_id: { type: 'string', description: 'The ID of the gear item to check out' },
        user_id: { type: 'string', description: 'The ID of the user to assign the gear to' },
        due_date: { type: 'string', description: 'Optional return due date in YYYY-MM-DD format' },
        notes: { type: 'string', description: 'Optional notes about this checkout' },
      },
      required: ['gear_item_id', 'user_id'],
    },
  },
  {
    name: 'get_users',
    description: "Admin only. Get a list of users to find a user ID when checking out gear. Search by name.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Name to search for (e.g. "Rene")' },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_pending_gear_requests',
    description: "Admin only. Look up pending gear requests. Search by requester name or gear name to find the right request ID before approving or declining.",
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Name of the requester or gear item to search for (e.g. "Rene", "camera")' },
      },
      required: ['query'],
    },
  },
  {
    name: 'review_gear_request',
    description: "Admin only. Approve or decline a gear request by its ID. The requester will receive a notification. Use get_pending_gear_requests first to find the request ID.",
    input_schema: {
      type: 'object',
      properties: {
        request_id: { type: 'string', description: 'The ID of the gear request from get_pending_gear_requests results' },
        action: { type: 'string', enum: ['APPROVED', 'DECLINED'], description: 'Whether to approve or decline the request' },
        admin_note: { type: 'string', description: 'Optional note to send to the requester (e.g. "Please collect from front desk")' },
      },
      required: ['request_id', 'action'],
    },
  },
];

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function chat(req: AuthRequest, res: Response) {
  const { messages } = req.body as { messages: ChatMessage[] };
  const userId = req.user!.userId;
  const userRole = req.user!.role;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return sendError(res, 'messages array is required', 400);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return sendError(res, 'AI is not configured', 503);
  }

  try {
    const aiSettings = await getAISettings();
    if (!aiSettings.aiAssistantEnabled) {
      return sendSuccess(res, { reply: 'AI Assistant is currently disabled by the admin.' });
    }

    const systemPrompt = buildAssistantSystemPrompt(aiSettings, SYSTEM_PROMPT);
    const enabledTools = getEnabledAITools(aiSettings, TOOLS);

    // Build the conversation as Anthropic messages, keeping last 20 turns
    let apiMessages: Anthropic.MessageParam[] = messages.slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Tool use loop — Claude may call tools one or more times before giving a final answer
    for (let iteration = 0; iteration < 5; iteration++) {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        tools: enabledTools,
        messages: apiMessages,
      });

      if (response.stop_reason === 'end_turn') {
        const text = response.content.find((b: Anthropic.ContentBlock) => b.type === 'text');
        return sendSuccess(res, { reply: text && text.type === 'text' ? text.text : '' });
      }

      if (response.stop_reason === 'tool_use') {
        // Append Claude's response (which contains tool_use blocks) to the conversation
        apiMessages.push({ role: 'assistant', content: response.content });

        // Execute each tool call and collect results
        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;

          let result: string;

          try {
            if (block.name === 'search_drive') {
              if (aiSettings.documentAccessMode === 'NO_DOCUMENT_ACCESS') {
                result = 'Document access is disabled by the admin.';
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: result,
                });
                continue;
              }
              const { query } = block.input as { query: string };
              result = await aiSearchDrive(userId, query);
            } else if (block.name === 'get_document') {
              if (aiSettings.documentAccessMode === 'NO_DOCUMENT_ACCESS') {
                result = 'Document access is disabled by the admin.';
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: result,
                });
                continue;
              }
              const { file_id } = block.input as { file_id: string };
              result = await aiGetDocument(userId, file_id);
            } else if (block.name === 'list_calendar_events') {
              const { days_ahead } = (block.input ?? {}) as { days_ahead?: number };
              result = await aiListCalendarEvents(userId, days_ahead ?? 7);
            } else if (block.name === 'search_gmail') {
              const { query } = block.input as { query: string };
              result = await aiSearchGmail(userId, query);
            } else if (block.name === 'list_chat_spaces') {
              result = await aiListChatSpaces(userId);
            } else if (block.name === 'get_chat_messages') {
              const { space_name } = block.input as { space_name: string };
              result = await aiGetChatMessages(userId, space_name);
            } else if (block.name === 'get_asana_tasks') {
              const { query } = (block.input ?? {}) as { query?: string };
              result = await aiGetAsanaTasks(userId, query);
            } else if (block.name === 'check_gear_availability') {
              const { query } = block.input as { query: string };
              result = await aiCheckGearAvailability(query);
            } else if (block.name === 'submit_gear_request') {
              const { gear_item_id, reason, start_date, end_date } = block.input as {
                gear_item_id: string; reason?: string; start_date?: string; end_date?: string;
              };
              result = await aiSubmitGearRequest(userId, gear_item_id, reason, start_date, end_date);
            } else if (block.name === 'checkout_gear') {
              if (userRole !== 'ADMIN') { result = 'Only admins can check out gear.'; }
              else {
                const { gear_item_id, user_id, due_date, notes } = block.input as {
                  gear_item_id: string; user_id: string; due_date?: string; notes?: string;
                };
                result = await aiCheckoutGear(userId, gear_item_id, user_id, due_date, notes);
              }
            } else if (block.name === 'get_users') {
              if (userRole !== 'ADMIN') { result = 'Only admins can look up users.'; }
              else {
                const { query } = block.input as { query: string };
                result = await aiGetUsers(query);
              }
            } else if (block.name === 'get_pending_gear_requests') {
              if (userRole !== 'ADMIN') { result = 'Only admins can view gear requests.'; }
              else {
                const { query } = block.input as { query: string };
                result = await aiGetPendingGearRequests(query);
              }
            } else if (block.name === 'review_gear_request') {
              if (userRole !== 'ADMIN') { result = 'Only admins can approve or decline gear requests.'; }
              else {
                const { request_id, action, admin_note } = block.input as {
                  request_id: string; action: 'APPROVED' | 'DECLINED'; admin_note?: string;
                };
                result = await aiReviewGearRequest(userId, request_id, action, admin_note);
              }
            } else {
              result = 'Unknown tool.';
            }
          } catch {
            result = 'Tool call failed unexpectedly.';
          }

          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          });
        }

        // Append tool results as a user message and loop
        apiMessages.push({ role: 'user', content: toolResults });
        continue;
      }

      // Any other stop reason — return whatever text we have
      const text = response.content.find((b: Anthropic.ContentBlock) => b.type === 'text');
      return sendSuccess(res, { reply: text && text.type === 'text' ? text.text : '' });
    }

    return sendError(res, 'Too many tool iterations', 500);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI request failed';
    return sendError(res, message, 500);
  }
}

// ─── Gear AI helpers ───────────────────────────────────────────────────────────

async function aiCheckGearAvailability(query: string): Promise<string> {
  const items = await prisma.gearItem.findMany({
    where: {
      status: { not: 'RETIRED' },
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { brand: { contains: query, mode: 'insensitive' } },
        { model: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
      ],
    },
    include: {
      assignments: {
        where: { returnedAt: null },
        include: { user: { select: { firstName: true, lastName: true } } },
        take: 1,
      },
    },
    take: 10,
  });

  if (items.length === 0) return `No gear found matching "${query}".`;

  return items.map((item) => {
    const a = item.assignments[0];
    const who = a ? `checked out to ${a.user.firstName} ${a.user.lastName}${a.dueDate ? `, due back ${a.dueDate.toISOString().slice(0, 10)}` : ''}` : null;
    return [
      `**${item.name}** (ID: ${item.id})`,
      `  Status: ${item.status}${who ? ` — ${who}` : ''}`,
      item.brand ? `  Brand: ${item.brand}${item.model ? ` ${item.model}` : ''}` : null,
      `  Category: ${item.category} | Condition: ${item.condition}`,
      item.location ? `  Location: ${item.location}` : null,
    ].filter(Boolean).join('\n');
  }).join('\n\n');
}

async function aiSubmitGearRequest(
  userId: string,
  gearItemId: string,
  reason?: string,
  startDate?: string,
  endDate?: string,
): Promise<string> {
  const item = await prisma.gearItem.findUnique({ where: { id: gearItemId } });
  if (!item) return 'Gear item not found.';
  if (item.status !== 'AVAILABLE') return `"${item.name}" is not available right now (status: ${item.status}). Cannot submit request.`;

  const existing = await prisma.gearRequest.findFirst({
    where: { gearItemId, requesterId: userId, status: 'PENDING' },
  });
  if (existing) return `You already have a pending request for "${item.name}".`;

  await prisma.gearRequest.create({
    data: {
      gearItemId,
      requesterId: userId,
      reason: reason || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });

  // Notify admins
  const admins = await prisma.user.findMany({ where: { role: 'ADMIN', isActive: true }, select: { id: true } });
  const requester = await prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true } });
  await Promise.all(
    admins.map(async (admin) => {
      const n = await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'New Gear Request',
          message: `${requester?.firstName} ${requester?.lastName} requested ${item.name} via AD Brain.`,
          type: 'GEAR_REQUEST',
          link: '/admin/gear/requests',
        },
      });
      pushNotification(n);
    })
  );

  return `Request submitted for "${item.name}". An admin will review it and you'll get a notification when it's approved or declined.`;
}

async function aiGetUsers(query: string): Promise<string> {
  const users = await prisma.user.findMany({
    where: {
      isActive: true,
      OR: [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
      ],
    },
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
    take: 10,
  });
  if (users.length === 0) return `No users found matching "${query}".`;
  return users.map((u) => `**${u.firstName} ${u.lastName}** (ID: ${u.id}) — ${u.email} [${u.role}]`).join('\n');
}

async function aiCheckoutGear(
  adminId: string,
  gearItemId: string,
  targetUserId: string,
  dueDate?: string,
  notes?: string,
): Promise<string> {
  const item = await prisma.gearItem.findUnique({ where: { id: gearItemId } });
  if (!item) return 'Gear item not found.';
  if (item.status === 'RETURN_PENDING') return `"${item.name}" has a pending return — wait for it to be confirmed before checking it out again.`;
  if (item.status !== 'AVAILABLE' && item.status !== 'RESERVED') {
    return `"${item.name}" is currently ${item.status.toLowerCase().replace('_', ' ')} and cannot be checked out.`;
  }

  const targetUser = await prisma.user.findFirst({
    where: { id: targetUserId, isActive: true },
    select: { firstName: true, lastName: true },
  });
  if (!targetUser) return 'Active user not found.';

  await prisma.$transaction([
    prisma.gearAssignment.create({
      data: {
        gearItemId,
        userId: targetUserId,
        assignedById: adminId,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        notes: notes || undefined,
      },
    }),
    prisma.gearItem.update({ where: { id: gearItemId }, data: { status: 'CHECKED_OUT' } }),
  ]);

  const notification = await prisma.notification.create({
    data: {
      userId: targetUserId,
      title: 'Gear Checked Out',
      message: `${item.name} has been checked out to you.${notes ? ` Note: ${notes}` : ''}`,
      type: 'GEAR_REQUEST',
      link: '/gear',
    },
  });
  pushNotification(notification);

  return `Done. "${item.name}" is now checked out to ${targetUser.firstName} ${targetUser.lastName}. They've been notified.${dueDate ? ` Due back: ${dueDate}.` : ''}`;
}

async function aiGetPendingGearRequests(query: string): Promise<string> {
  const requests = await prisma.gearRequest.findMany({
    where: {
      status: 'PENDING',
      OR: [
        { requester: { firstName: { contains: query, mode: 'insensitive' } } },
        { requester: { lastName: { contains: query, mode: 'insensitive' } } },
        { gearItem: { name: { contains: query, mode: 'insensitive' } } },
        { gearItem: { category: { contains: query, mode: 'insensitive' } } },
      ],
    },
    include: {
      requester: { select: { firstName: true, lastName: true } },
      gearItem: { select: { name: true, status: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  });

  if (requests.length === 0) return `No pending gear requests found matching "${query}".`;

  return requests.map((r) => [
    `**Request ID: ${r.id}**`,
    `  Requester: ${r.requester.firstName} ${r.requester.lastName}`,
    `  Gear: ${r.gearItem.name} (currently: ${r.gearItem.status})`,
    r.reason ? `  Reason: ${r.reason}` : null,
    r.startDate ? `  Dates: ${r.startDate.toISOString().slice(0, 10)} to ${r.endDate?.toISOString().slice(0, 10) ?? 'open'}` : null,
    `  Submitted: ${r.createdAt.toISOString().slice(0, 10)}`,
  ].filter(Boolean).join('\n')).join('\n\n');
}

async function aiReviewGearRequest(
  adminId: string,
  requestId: string,
  action: 'APPROVED' | 'DECLINED',
  adminNote?: string,
): Promise<string> {
  const gearRequest = await prisma.gearRequest.findUnique({ where: { id: requestId } });
  if (!gearRequest) return 'Request not found.';
  if (gearRequest.status !== 'PENDING') return `This request has already been ${gearRequest.status.toLowerCase()}.`;

  const gearItem = await prisma.gearItem.findUnique({ where: { id: gearRequest.gearItemId } });
  if (!gearItem) return 'Gear item not found.';
  if (action === 'APPROVED' && gearItem.status !== 'AVAILABLE') {
    return `"${gearItem.name}" is no longer available, so this request cannot be approved.`;
  }

  await prisma.gearRequest.update({
    where: { id: requestId },
    data: {
      status: action,
      adminNote: adminNote || null,
      reviewedById: adminId,
      reviewedAt: new Date(),
    },
  });

  if (action === 'APPROVED') {
    await prisma.gearItem.update({ where: { id: gearItem.id }, data: { status: 'RESERVED' } });
  }

  const requester = await prisma.user.findUnique({
    where: { id: gearRequest.requesterId },
    select: { firstName: true, lastName: true },
  });

  const noteText = adminNote ? ` Note: ${adminNote}` : '';
  const notification = await prisma.notification.create({
    data: {
      userId: gearRequest.requesterId,
      title: action === 'APPROVED' ? 'Gear Request Approved' : 'Gear Request Declined',
      message: action === 'APPROVED'
        ? `Your request for ${gearItem.name} has been approved.${noteText}`
        : `Your request for ${gearItem.name} was declined.${noteText}`,
      type: 'GEAR_REQUEST',
      link: '/gear',
    },
  });
  pushNotification(notification);

  return `Done. ${requester?.firstName} ${requester?.lastName}'s request for "${gearItem.name}" has been ${action.toLowerCase()}. They've been notified.${adminNote ? ` Your note "${adminNote}" was included.` : ''}`;
}
