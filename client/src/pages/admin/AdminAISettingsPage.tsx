import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bot, FileText, Save, ShieldAlert, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import type { AISettings, AllowedFileType, DocumentAccessMode, EmailTone } from '@/types';

const emailToneOptions: EmailTone[] = [
  'Professional',
  'Friendly',
  'Casual',
  'Formal',
  'Short and Direct',
  'Australian Business Tone',
];

const documentAccessOptions: Array<{ value: DocumentAccessMode; label: string }> = [
  { value: 'NO_DOCUMENT_ACCESS', label: 'No document access' },
  { value: 'UPLOADED_DOCUMENTS_ONLY', label: 'Uploaded documents only' },
  { value: 'APPROVED_INTERNAL_DOCUMENTS_ONLY', label: 'Approved internal documents only' },
  { value: 'UPLOADED_AND_APPROVED_INTERNAL_DOCUMENTS', label: 'Uploaded + approved internal documents' },
];

const fileTypeOptions: Array<{ value: AllowedFileType; label: string }> = [
  { value: 'PDF', label: 'PDF' },
  { value: 'DOCX', label: 'DOCX' },
  { value: 'TXT_MD', label: 'TXT / Markdown' },
  { value: 'CSV', label: 'CSV' },
];

const defaultForm: AISettings = {
  id: 'default',
  emailTone: 'Professional',
  defaultEmailInstructions: 'Write clear, polite, professional emails. Keep the response concise and easy to understand.',
  writingStyleNotes: 'Use Australian English. Avoid overly technical language unless requested.',
  documentAccessMode: 'NO_DOCUMENT_ACCESS',
  allowedFileTypes: [],
  extraSystemInstructions: '',
  aiAssistantEnabled: true,
};

export default function AdminAISettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<AISettings>(defaultForm);

  useEffect(() => {
    api.get('/admin/ai-settings')
      .then((res) => setForm({ ...defaultForm, ...res.data.data.settings }))
      .catch(() => toast.error('Failed to load AI settings'))
      .finally(() => setLoading(false));
  }, []);

  const updateForm = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const toggleFileType = (fileType: AllowedFileType) => {
    setForm((current) => ({
      ...current,
      allowedFileTypes: current.allowedFileTypes.includes(fileType)
        ? current.allowedFileTypes.filter((type) => type !== fileType)
        : [...current.allowedFileTypes, fileType],
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        emailTone: form.emailTone,
        defaultEmailInstructions: form.defaultEmailInstructions,
        writingStyleNotes: form.writingStyleNotes,
        documentAccessMode: form.documentAccessMode,
        allowedFileTypes: form.allowedFileTypes,
        extraSystemInstructions: form.extraSystemInstructions,
        aiAssistantEnabled: form.aiAssistantEnabled,
      };
      const res = await api.put('/admin/ai-settings', payload);
      setForm({ ...defaultForm, ...res.data.data.settings });
      toast.success('AI settings saved');
    } catch {
      toast.error('Failed to save AI settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <Topbar title="AI Assistant Settings" />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Topbar title="AI Assistant Settings" />
      <div className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-text-primary flex items-center gap-2">
              <Bot className="w-5 h-5 text-accent" />
              AI Assistant Settings
            </h1>
            <p className="text-sm text-text-secondary mt-2">
              Control how the AI assistant writes, responds, and handles document access. These settings can be updated anytime by admins.
            </p>
          </div>

          <motion.form
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleSave}
            className="card p-5 sm:p-6 space-y-6"
          >
            <div data-tour="ai-toggle" className="flex items-center justify-between gap-4 border-b border-border pb-5">
              <div>
                <label className="label mb-1">Enable AI Assistant</label>
                <p className="text-xs text-text-muted">Turn the assistant on or off for users.</p>
              </div>
              <button
                type="button"
                onClick={() => updateForm('aiAssistantEnabled', !form.aiAssistantEnabled)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                  form.aiAssistantEnabled
                    ? 'border-accent/40 bg-accent-muted text-accent'
                    : 'border-border text-text-secondary hover:border-border-hover'
                }`}
              >
                {form.aiAssistantEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                <span className="text-sm font-medium">{form.aiAssistantEnabled ? 'Enabled' : 'Disabled'}</span>
              </button>
            </div>

            <div data-tour="ai-tone">
              <label className="label">Email Writing Tone</label>
              <select
                className="input"
                value={form.emailTone}
                onChange={(e) => updateForm('emailTone', e.target.value as EmailTone)}
              >
                {emailToneOptions.map((tone) => (
                  <option key={tone} value={tone}>{tone}</option>
                ))}
              </select>
              <p className="text-xs text-text-muted mt-1">Choose the default tone used when the assistant writes emails.</p>
            </div>

            <div data-tour="ai-instructions">
              <label className="label">Default Email Writing Instructions</label>
              <textarea
                className="input min-h-28 resize-y"
                maxLength={2000}
                value={form.defaultEmailInstructions}
                placeholder="Write clear, polite, professional emails. Keep the response concise and easy to understand."
                onChange={(e) => updateForm('defaultEmailInstructions', e.target.value)}
              />
              <p className="text-xs text-text-muted mt-1">Applied whenever the assistant drafts or improves email content.</p>
            </div>

            <div>
              <label className="label">Writing Style Notes</label>
              <textarea
                className="input min-h-24 resize-y"
                maxLength={2000}
                value={form.writingStyleNotes}
                placeholder="Use Australian English. Avoid overly technical language unless requested."
                onChange={(e) => updateForm('writingStyleNotes', e.target.value)}
              />
              <p className="text-xs text-text-muted mt-1">Add style preferences such as spelling, formatting, or plain-language rules.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="label flex items-center gap-2">
                  <FileText className="w-4 h-4 text-accent" />
                  Allowed Document Access
                </label>
                <p className="text-xs text-text-muted">
                  Choose what types of documents the AI assistant is allowed to reference when generating responses.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {documentAccessOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateForm('documentAccessMode', option.value)}
                    className={`text-left px-3 py-2 rounded-lg border text-sm transition-all ${
                      form.documentAccessMode === option.value
                        ? 'bg-accent-muted border-accent/40 text-accent'
                        : 'border-border text-text-secondary hover:border-border-hover hover:text-text-primary'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Allowed File Types</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {fileTypeOptions.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm text-text-secondary hover:border-border-hover cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={form.allowedFileTypes.includes(option.value)}
                      onChange={() => toggleFileType(option.value)}
                      className="accent-accent"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              <p className="text-xs text-text-muted mt-1">Stored for current and future document-aware AI features.</p>
            </div>

            <div>
              <label className="label flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-priority-medium" />
                Extra System Instructions
              </label>
              <textarea
                className="input min-h-32 resize-y"
                maxLength={3000}
                value={form.extraSystemInstructions}
                onChange={(e) => updateForm('extraSystemInstructions', e.target.value)}
              />
              <p className="text-xs text-text-muted mt-1">
                Use this for general behaviour rules such as tone, formatting, and writing preferences. Do not store passwords, API keys, or private credentials here.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={saving} className="btn-primary">
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </motion.form>
        </div>
      </div>
    </div>
  );
}
