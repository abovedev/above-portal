import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, Eye, EyeOff, Upload } from 'lucide-react';
import { toast } from 'sonner';
import RichTextEditor from '@/components/admin/RichTextEditor';
import { slugify } from '@/lib/utils';
import api from '@/lib/api';
import type { Page } from '@/types';

const EMOJIS = ['📄', '📋', '📝', '📊', '📈', '📉', '🎯', '🚀', '💡', '⚙️', '🛠️', '📚', '🔑', '💼', '🏆', '✨', '🎨', '🌟', '💎', '🔥'];

export default function AdminPageEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = !!id;
  const isPerUserRoute = location.pathname.includes('/admin/pages/per-user');

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<unknown>(null);
  const [isDirty, setIsDirty] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState({
    title: '',
    slug: '',
    description: '',
    icon: '📄',
    coverImage: '',
    isPublished: false,
    type: (isPerUserRoute ? 'PERSONAL' : 'GLOBAL') as 'GLOBAL' | 'PERSONAL',
  });

  const listPath = isPerUserRoute || form.type === 'PERSONAL' ? '/admin/pages/per-user' : '/admin/pages/global';

  useEffect(() => {
    if (!isEdit) return;
    api.get(`/pages/${id}`).then((res) => {
      const page: Page = res.data.data.page;
      setForm({
        title: page.title,
        slug: page.slug,
        description: page.description || '',
        icon: page.icon || '📄',
        coverImage: page.coverImage || '',
        isPublished: page.isPublished,
        type: page.type,
      });
      setContent(page.content);
      setLoading(false);
    }).catch(() => { toast.error('Failed to load page'); navigate(isPerUserRoute ? '/admin/pages/per-user' : '/admin/pages/global'); });
  }, [id, isEdit, isPerUserRoute, navigate]);

  const handleTitleChange = (title: string) => {
    setForm((f) => ({
      ...f,
      title,
      slug: isEdit ? f.slug : slugify(title),
    }));
    setIsDirty(true);
  };

  const handleContentChange = (c: unknown) => {
    setContent(c);
    setIsDirty(true);

    // Autosave every 30 seconds
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    if (isEdit) {
      autosaveTimer.current = setTimeout(() => {
        handleSave(true);
      }, 30_000);
    }
  };

  const handleSave = async (silent = false) => {
    if (!form.title.trim()) {
      toast.error('Page title is required');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, content };
      if (isEdit) {
        await api.put(`/pages/${id}`, payload);
        if (!silent) toast.success('Page saved');
      } else {
        const res = await api.post('/pages', payload);
        if (!silent) toast.success('Page created');
        const pageTypePath = payload.type === 'PERSONAL' ? 'per-user' : 'global';
        navigate(`/admin/pages/${pageTypePath}/${res.data.data.page.id}/edit`, { replace: true });
      }
      setIsDirty(false);
    } catch {
      if (!silent) toast.error('Failed to save page');
    } finally {
      setSaving(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('cover', file);
    try {
      const res = await api.post('/pages/cover', fd);
      setForm((f) => ({ ...f, coverImage: res.data.data.coverUrl }));
      toast.success('Cover uploaded');
    } catch { toast.error('Upload failed'); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="h-14 bg-surface border-b border-border flex items-center px-4 gap-3 flex-shrink-0">
        <button
          onClick={() => navigate(listPath)}
          className="text-text-muted hover:text-text-primary transition-colors flex items-center gap-1.5 text-sm"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex-1 flex items-center">
          <input
            value={form.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            className="bg-transparent font-heading font-bold text-text-primary text-lg focus:outline-none placeholder:text-text-muted flex-1"
            placeholder="Untitled Page"
          />
          {isDirty && <span className="text-xs text-text-muted ml-2">Unsaved changes</span>}
        </div>
        <button
          onClick={() => setForm((f) => ({ ...f, isPublished: !f.isPublished }))}
          className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition-all ${
            form.isPublished
              ? 'bg-priority-low/10 border-priority-low/30 text-priority-low'
              : 'border-border text-text-muted hover:border-border-hover'
          }`}
        >
          {form.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {form.isPublished ? 'Published' : 'Draft'}
        </button>
        <button
          onClick={() => handleSave()}
          disabled={saving}
          className="btn-primary text-sm flex items-center gap-1.5"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Body — editor + settings panel */}
      <div className="flex-1 flex overflow-hidden">
        {/* Editor */}
        <div className="flex-1 bg-background-secondary overflow-hidden flex flex-col">
          <RichTextEditor content={content} onChange={handleContentChange} />
        </div>

        {/* Settings panel */}
        <motion.aside
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="w-72 border-l border-border bg-surface overflow-y-auto flex-shrink-0 p-4 space-y-5"
        >
          <div>
            <label className="label">Icon</label>
            <div className="grid grid-cols-10 gap-1">
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, icon: emoji }))}
                  className={`text-lg p-1 rounded transition-all ${form.icon === emoji ? 'bg-accent-muted ring-1 ring-accent' : 'hover:bg-surface-hover'}`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Slug</label>
            <input
              className="input text-sm font-mono"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="page-slug"
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              className="input text-sm resize-none"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Brief summary..."
            />
          </div>

          <div>
            <label className="label">Cover Image</label>
            {form.coverImage && (
              <img src={form.coverImage} alt="Cover" className="w-full h-24 object-cover rounded-lg mb-2" />
            )}
            <label className="flex items-center gap-2 btn-ghost text-sm cursor-pointer w-full justify-center border border-dashed border-border rounded-lg py-2.5">
              <Upload className="w-4 h-4" />
              Upload Cover
              <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            </label>
          </div>

          <div>
            <label className="label">Page Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(['GLOBAL', 'PERSONAL'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, type: t }))}
                  className={`py-1.5 text-sm rounded-lg border transition-all ${
                    form.type === t
                      ? 'bg-accent-muted border-accent/40 text-accent'
                      : 'border-border text-text-secondary hover:border-border-hover'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
