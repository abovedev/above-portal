import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Pin, Megaphone } from 'lucide-react';
import { toast } from 'sonner';
import Topbar from '@/components/layout/Topbar';
import Modal from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/Modal';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { PriorityBadge } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';
import type { Announcement, Priority } from '@/types';
import api from '@/lib/api';

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

interface AForm {
  title: string;
  body: string;
  priority: Priority;
  isPinned: boolean;
  expiresAt: string;
}

const defaultForm: AForm = {
  title: '',
  body: '',
  priority: 'LOW',
  isPinned: false,
  expiresAt: '',
};

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editAnnouncement, setEditAnnouncement] = useState<Announcement | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<AForm>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchAnnouncements = () => {
    api.get('/announcements').then((res) => {
      setAnnouncements(res.data.data.announcements);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const openCreate = () => {
    setEditAnnouncement(null);
    setForm(defaultForm);
    setCreateOpen(true);
  };

  const openEdit = (a: Announcement) => {
    setEditAnnouncement(a);
    setForm({
      title: a.title,
      body: a.body,
      priority: a.priority,
      isPinned: a.isPinned,
      expiresAt: a.expiresAt ? new Date(a.expiresAt).toISOString().slice(0, 16) : '',
    });
    setCreateOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    };
    try {
      if (editAnnouncement) {
        const res = await api.put(`/announcements/${editAnnouncement.id}`, payload);
        setAnnouncements((prev) => prev.map((a) => (a.id === editAnnouncement.id ? res.data.data.announcement : a)));
        toast.success('Announcement updated');
      } else {
        const res = await api.post('/announcements', payload);
        setAnnouncements((prev) => [res.data.data.announcement, ...prev]);
        toast.success('Announcement created');
      }
      setCreateOpen(false);
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/announcements/${deleteId}`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== deleteId));
      setDeleteId(null);
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Announcements"
        actions={
          <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New Announcement
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <table className="w-full">
            <tbody>{Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)}</tbody>
          </table>
        ) : announcements.length === 0 ? (
          <EmptyState
            icon={Megaphone}
            title="No announcements"
            description="Create company-wide announcements to keep everyone informed"
            action={<button onClick={openCreate} className="btn-primary text-sm"><Plus className="w-4 h-4" /> Create First Announcement</button>}
          />
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {announcements.map((a) => (
              <div
                key={a.id}
                className={`card p-4 flex items-start gap-4 ${
                  a.priority === 'URGENT' ? 'border-priority-urgent/30' : a.priority === 'HIGH' ? 'border-priority-high/30' : ''
                }`}
              >
                {a.isPinned && <Pin className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-text-primary">{a.title}</h3>
                    <PriorityBadge priority={a.priority} />
                  </div>
                  <p className="text-sm text-text-secondary line-clamp-2">{a.body}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                    <span>{formatDate(a.createdAt, 'relative')}</span>
                    {a.expiresAt && <span>Expires {formatDate(a.expiresAt, 'short')}</span>}
                    <span>By {a.createdBy.firstName} {a.createdBy.lastName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(a)} className="p-1.5 text-text-muted hover:text-accent transition-colors rounded hover:bg-surface-hover">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteId(a.id)} className="p-1.5 text-text-muted hover:text-priority-urgent transition-colors rounded hover:bg-surface-hover">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Create/Edit modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={editAnnouncement ? 'Edit Announcement' : 'New Announcement'} size="lg">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Title</label>
            <input className="input" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required placeholder="Announcement title" />
          </div>
          <div>
            <label className="label">Body</label>
            <textarea className="input resize-none" rows={5} value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} required placeholder="Announcement details..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Priority</label>
              <div className="grid grid-cols-2 gap-1.5">
                {PRIORITIES.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, priority: p }))}
                    className={`py-1.5 text-xs rounded-lg border transition-all ${form.priority === p ? `bg-accent-muted border-accent/40 text-accent` : 'border-border text-text-muted hover:border-border-hover'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Expires At</label>
              <input
                className="input text-sm"
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              />
              <p className="text-xs text-text-muted mt-1">Leave blank for no expiry</p>
            </div>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-text-secondary">Pin to top</span>
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, isPinned: !f.isPinned }))}
              className={`w-10 h-5 rounded-full transition-all relative ${form.isPinned ? 'bg-accent' : 'bg-surface-elevated border border-border'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-text-primary transition-all ${form.isPinned ? 'right-0.5' : 'left-0.5'}`} />
            </button>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setCreateOpen(false)} className="btn-ghost text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary text-sm">
              {saving ? 'Saving...' : editAnnouncement ? 'Update' : 'Publish'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Announcement"
        message="This announcement will be permanently removed."
      />
    </div>
  );
}
