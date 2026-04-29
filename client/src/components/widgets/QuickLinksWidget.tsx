import { useEffect, useState } from 'react';
import { Link2, Plus, ExternalLink, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '@/components/ui/Modal';
import { useUIStore } from '@/stores/uiStore';
import type { QuickLink } from '@/types';
import api from '@/lib/api';

const EMOJI_OPTIONS = [
  '🔗', '⭐', '📌', '📁', '📄', '📊', '📅', '✅',
  '💬', '📧', '📞', '🌐', '🏠', '🏢', '💼', '🔐',
  '⚙️', '🛠️', '🚀', '💡', '🎯', '📚', '🧾', '🐙',
];

export default function QuickLinksWidget() {
  const { boardEditMode } = useUIStore();
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editLink, setEditLink] = useState<QuickLink | null>(null);
  const [form, setForm] = useState({ label: '', url: '', icon: '' });

  useEffect(() => {
    api.get('/quick-links').then((res) => {
      setLinks(res.data.data.links);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const openAdd = () => {
    setForm({ label: '', url: '', icon: '' });
    setEditLink(null);
    setAddOpen(true);
  };

  const openEdit = (link: QuickLink) => {
    setForm({ label: link.label, url: link.url, icon: link.icon || '' });
    setEditLink(link);
    setAddOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editLink) {
        const res = await api.put(`/quick-links/${editLink.id}`, form);
        setLinks((prev) => prev.map((l) => (l.id === editLink.id ? res.data.data.link : l)));
        toast.success('Link updated');
      } else {
        const res = await api.post('/quick-links', form);
        setLinks((prev) => [...prev, res.data.data.link]);
        toast.success('Link added');
      }
      setAddOpen(false);
    } catch {
      toast.error('Failed to save link');
    }
  };

  const deleteLink = async (id: string) => {
    setLinks((prev) => prev.filter((l) => l.id !== id));
    try {
      await api.delete(`/quick-links/${id}`);
    } catch {
      toast.error('Failed to delete link');
    }
  };

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <Link2 className="w-4 h-4 text-accent" />
        <h3 className="font-heading font-semibold text-text-primary text-sm">Quick Links</h3>
        <button onClick={openAdd} className="ml-auto text-text-muted hover:text-accent transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-surface-elevated skeleton" />
          ))}
        </div>
      ) : links.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-text-muted">
          <Link2 className="w-8 h-8" />
          <p className="text-sm">No links yet</p>
          <button onClick={openAdd} className="text-accent text-xs hover:underline">Add your first link</button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 overflow-y-auto flex-1 scrollbar-hide content-start">
          <AnimatePresence>
            {links.map((link) => (
              <motion.div
                key={link.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group relative"
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-lg bg-surface-elevated border border-border hover:border-border-hover hover:shadow-card-hover transition-all text-center"
                >
                  <span className="text-2xl">{link.icon || '🔗'}</span>
                  <span className="text-xs text-text-secondary truncate w-full text-center">{link.label}</span>
                </a>

                {boardEditMode && (
                  <div className="absolute -top-1.5 -right-1.5 hidden group-hover:flex gap-0.5">
                    <button
                      onClick={(e) => { e.preventDefault(); openEdit(link); }}
                      className="w-5 h-5 bg-surface-elevated border border-border rounded-full flex items-center justify-center text-text-muted hover:text-accent"
                    >
                      <Pencil className="w-2.5 h-2.5" />
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); deleteLink(link.id); }}
                      className="w-5 h-5 bg-surface-elevated border border-border rounded-full flex items-center justify-center text-text-muted hover:text-priority-urgent"
                    >
                      <Trash2 className="w-2.5 h-2.5" />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={editLink ? 'Edit Link' : 'Add Quick Link'} size="sm">
        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="label">Label</label>
            <input
              className="input"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="GitHub"
              required
            />
          </div>
          <div>
            <label className="label">URL</label>
            <input
              className="input"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://github.com"
              type="url"
              required
            />
          </div>
          <div>
            <label className="label">Icon (emoji)</label>
            <input
              className="input"
              value={form.icon}
              onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
              placeholder="🐙"
              maxLength={4}
            />
            <div className="grid grid-cols-8 gap-1 mt-2">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, icon: emoji }))}
                  className={`h-8 rounded-lg border text-lg transition-all ${
                    form.icon === emoji
                      ? 'bg-accent-muted border-accent/50'
                      : 'border-border bg-surface-elevated hover:border-border-hover hover:bg-surface-hover'
                  }`}
                  aria-label={`Use ${emoji} icon`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setAddOpen(false)} className="btn-ghost text-sm">Cancel</button>
            <button type="submit" className="btn-primary text-sm">Save</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
