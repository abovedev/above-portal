import prisma from '../prisma/client';

export const EMAIL_TONES = [
  'Professional',
  'Friendly',
  'Casual',
  'Formal',
  'Short and Direct',
  'Australian Business Tone',
] as const;

export const DOCUMENT_ACCESS_MODES = [
  'NO_DOCUMENT_ACCESS',
  'UPLOADED_DOCUMENTS_ONLY',
  'APPROVED_INTERNAL_DOCUMENTS_ONLY',
  'UPLOADED_AND_APPROVED_INTERNAL_DOCUMENTS',
] as const;

export const ALLOWED_FILE_TYPES = ['PDF', 'DOCX', 'TXT_MD', 'CSV'] as const;

export type EmailTone = (typeof EMAIL_TONES)[number];
export type DocumentAccessMode = (typeof DOCUMENT_ACCESS_MODES)[number];
export type AllowedFileType = (typeof ALLOWED_FILE_TYPES)[number];

export interface AssistantSettings {
  id: string;
  emailTone: EmailTone;
  defaultEmailInstructions: string;
  writingStyleNotes: string;
  documentAccessMode: DocumentAccessMode;
  allowedFileTypes: AllowedFileType[];
  extraSystemInstructions: string;
  aiAssistantEnabled: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  updatedByAdminId?: string | null;
}

export const DEFAULT_AI_SETTINGS: AssistantSettings = {
  id: 'default',
  emailTone: 'Professional',
  defaultEmailInstructions: 'Write clear, polite, professional emails. Keep the response concise and easy to understand.',
  writingStyleNotes: 'Use Australian English. Avoid overly technical language unless requested.',
  documentAccessMode: 'NO_DOCUMENT_ACCESS',
  allowedFileTypes: [],
  extraSystemInstructions: '',
  aiAssistantEnabled: true,
  updatedByAdminId: null,
};

export function normaliseAISettings(settings?: Partial<AssistantSettings> | null): AssistantSettings {
  return {
    ...DEFAULT_AI_SETTINGS,
    ...settings,
    emailTone: EMAIL_TONES.includes(settings?.emailTone as EmailTone)
      ? settings!.emailTone as EmailTone
      : DEFAULT_AI_SETTINGS.emailTone,
    documentAccessMode: DOCUMENT_ACCESS_MODES.includes(settings?.documentAccessMode as DocumentAccessMode)
      ? settings!.documentAccessMode as DocumentAccessMode
      : DEFAULT_AI_SETTINGS.documentAccessMode,
    allowedFileTypes: Array.isArray(settings?.allowedFileTypes)
      ? settings!.allowedFileTypes.filter((type): type is AllowedFileType =>
          ALLOWED_FILE_TYPES.includes(type as AllowedFileType)
        )
      : DEFAULT_AI_SETTINGS.allowedFileTypes,
  };
}

export async function getAISettings(): Promise<AssistantSettings> {
  const settings = await prisma.aiSettings.findUnique({ where: { id: DEFAULT_AI_SETTINGS.id } });
  return normaliseAISettings(settings as Partial<AssistantSettings> | null);
}

export async function saveAISettings(
  data: Omit<AssistantSettings, 'id' | 'createdAt' | 'updatedAt'>,
): Promise<AssistantSettings> {
  const settings = await prisma.aiSettings.upsert({
    where: { id: DEFAULT_AI_SETTINGS.id },
    create: { ...data, id: DEFAULT_AI_SETTINGS.id },
    update: data,
  });
  return normaliseAISettings(settings as Partial<AssistantSettings>);
}

export function buildAssistantSystemPrompt(settings: AssistantSettings, basePrompt: string): string {
  const documentAccessText = settings.documentAccessMode.replace(/_/g, ' ').toLowerCase();
  const fileTypesText = settings.allowedFileTypes.length
    ? settings.allowedFileTypes.join(', ')
    : 'No file types selected';

  return `${basePrompt}

## Admin-Controlled Assistant Settings
- Email writing tone: ${settings.emailTone}
- Default email writing instructions: ${settings.defaultEmailInstructions || DEFAULT_AI_SETTINGS.defaultEmailInstructions}
- Writing style notes: ${settings.writingStyleNotes || DEFAULT_AI_SETTINGS.writingStyleNotes}
- Document access mode: ${documentAccessText}
- Allowed file types: ${fileTypesText}

Extra admin instructions:
${settings.extraSystemInstructions || 'No extra admin instructions provided.'}

Follow these admin-controlled settings when writing, summarising, and deciding whether document tools are appropriate. Never reveal secrets, tokens, environment variables, or backend implementation details.`;
}

export function canAccessDocument(
  settings: AssistantSettings,
  file?: { source?: 'uploaded' | 'approved_internal' | string; name?: string; mimeType?: string },
): boolean {
  if (settings.documentAccessMode === 'NO_DOCUMENT_ACCESS') return false;

  if (file?.source === 'uploaded' && !settings.documentAccessMode.includes('UPLOADED')) return false;
  if (file?.source === 'approved_internal' && !settings.documentAccessMode.includes('APPROVED_INTERNAL')) return false;

  if (!settings.allowedFileTypes.length || !file?.name) return true;
  const extension = file.name.split('.').pop()?.toUpperCase();
  if (!extension) return false;
  if (extension === 'TXT' || extension === 'MD' || extension === 'MARKDOWN') {
    return settings.allowedFileTypes.includes('TXT_MD');
  }
  return settings.allowedFileTypes.includes(extension as AllowedFileType);
}

export function getEnabledAITools<T extends { name: string }>(settings: AssistantSettings, tools: T[]): T[] {
  if (settings.documentAccessMode === 'NO_DOCUMENT_ACCESS') {
    return tools.filter((tool) => !['search_drive', 'get_document'].includes(tool.name));
  }
  return tools;
}
