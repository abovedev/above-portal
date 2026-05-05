import { Response } from 'express';
import { z } from 'zod';
import { AuthRequest } from '../middleware/auth';
import { sendError, sendSuccess } from '../utils/response';
import {
  ALLOWED_FILE_TYPES,
  DOCUMENT_ACCESS_MODES,
  EMAIL_TONES,
  saveAISettings,
  getAISettings,
  type AllowedFileType,
} from '../services/aiSettings';

const MAX_INSTRUCTIONS_LENGTH = 2000;
const MAX_EXTRA_INSTRUCTIONS_LENGTH = 3000;

function sanitiseText(value: string) {
  return value
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim();
}

const aiSettingsSchema = z.object({
  emailTone: z.enum(EMAIL_TONES),
  defaultEmailInstructions: z.string().max(MAX_INSTRUCTIONS_LENGTH).transform(sanitiseText),
  writingStyleNotes: z.string().max(MAX_INSTRUCTIONS_LENGTH).transform(sanitiseText),
  documentAccessMode: z.enum(DOCUMENT_ACCESS_MODES),
  allowedFileTypes: z.array(z.enum(ALLOWED_FILE_TYPES)).max(ALLOWED_FILE_TYPES.length),
  extraSystemInstructions: z.string().max(MAX_EXTRA_INSTRUCTIONS_LENGTH).transform(sanitiseText),
  aiAssistantEnabled: z.boolean(),
});

export async function getAdminAISettings(_req: AuthRequest, res: Response) {
  const settings = await getAISettings();
  return sendSuccess(res, { settings });
}

export async function updateAdminAISettings(req: AuthRequest, res: Response) {
  const parsed = aiSettingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return sendError(res, 'Invalid AI settings', 400);
  }

  const uniqueFileTypes = Array.from(new Set(parsed.data.allowedFileTypes)) as AllowedFileType[];
  const settings = await saveAISettings({
    ...parsed.data,
    allowedFileTypes: uniqueFileTypes,
    updatedByAdminId: req.user?.userId ?? null,
  });

  return sendSuccess(res, { settings }, 'AI settings updated');
}
