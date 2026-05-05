import { Response } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { sendSuccess, sendError } from '../utils/response';
import { AuthRequest } from '../middleware/auth';
import { aiSearchDrive, aiGetDocument, aiListCalendarEvents, aiSearchGmail, aiListChatSpaces, aiGetChatMessages } from './google';
import { aiGetAsanaTasks } from './asana';

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
];

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function chat(req: AuthRequest, res: Response) {
  const { messages } = req.body as { messages: ChatMessage[] };
  const userId = req.user!.userId;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return sendError(res, 'messages array is required', 400);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return sendError(res, 'AI is not configured', 503);
  }

  try {
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
        system: SYSTEM_PROMPT,
        tools: TOOLS,
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
              const { query } = block.input as { query: string };
              result = await aiSearchDrive(userId, query);
            } else if (block.name === 'get_document') {
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
