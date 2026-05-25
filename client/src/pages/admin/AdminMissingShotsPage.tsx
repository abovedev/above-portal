import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Camera, ExternalLink, Loader2, CheckCircle2, Clock, Archive, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import Modal from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

type ShotStatus = 'NEEDED' | 'IN_PROGRESS' | 'CAPTURED' | 'ARCHIVED';
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

interface MissingShot {
  id: string; subject: string; description: string | null;
  vehicleMake: string | null; packageType: string | null;
  category: string | null; feature: string | null;
  priority: Priority; status: ShotStatus;
  targetShootDate: string | null; notes: string | null;
  requestedBy: { id: string; firstName: string; lastName: string };
  resolvedFile: { id: string; name: string; webViewLink: string } | null;
  createdAt: string;
}

const STATUS_CONFIG: Record<ShotStatus, { label: string; color: string; icon: React.ElementType }> = {
  NEEDED: { label: 'Needed', color: 'text-priority-urgent', icon: AlertTriangle },
  IN_PROGRESS: { label: 'In Progress', color: 'text-amber-400', icon: Clock },
  CAPTURED: { label: 'Captured', color: 'text-green-400', icon: CheckCircle2 },
  ARCHIVED: { label: 'Archived', color: 'text-text-muted', icon: Archive },
};

const PRIORITY_COLOR: Record<Priority, string> = {
  LOW: 'bg-surface-elevated text-text-muted',
  MEDIUM: 'bg-amber-500/10 text-amber-400',
  HIGH: 'bg-orange-500/10 text-orange-400',
  URGENT: 'bg-priority-urgent/10 text-priority-urgent',
};

// ─── Form Modal ───────────────────────────────────────────────────────────────

function ShotModal({ open, onClose, editing, onSaved }: {
  open: boolean; onClose: () => void; editing: MissingShot | null; onSaved: () => void;
}) {
  const blank = { subject: '', description: '', vehicleMake: '', packageType: '', category: '', feature: '', priority: 'MEDIUM' as Priority, targetShootDate: '', notes: '' };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) {
      setForm({
        subject: editing.subject, description: editing.description ?? '',
        vehicleMake: editing.vehicleMake ?? '', packageType: editing.packageType ?? '',
        category: editing.category ?? '', feature: editing.feature ?? '',
        priority: editing.priority,
        targetShootDate: editing.targetShootDate ? editing.targetShootDate.slice(0, 10) : '',
        notes: editing.notes ?? '',
      });
    } else { setForm(blank); }
  }, [editing]);

  function set(k: keyof typeof blank) { return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, targetShootDate: form.targetShootDate || undefined };
      if (editing) await api.patch(`/files/missing-shots/${editing.id}`, payload);
      else await api.post('/files/missing-shots', payload);
      toast.success(editing ? 'Shot updated' : 'Missing shot logged');
      onSaved(); onClose();
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Missing Shot' : 'Log Missing Shot'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Subject *</label>
          <input className="input" value={form.subject} onChange={set('subject')} placeholder="e.g. Ford Ranger + Dog Box close-up, Tier 1" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Vehicle Make</label>
            <input className="input" value={form.vehicleMake} onChange={set('vehicleMake')} placeholder="Ford Ranger" />
          </div>
          <div>
            <label className="label">Package Type</label>
            <input className="input" value={form.packageType} onChange={set('packageType')} placeholder="Companion" />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={form.category} onChange={set('category')} placeholder="Lifestyle" />
          </div>
          <div>
            <label className="label">Feature</label>
            <input className="input" value={form.feature} onChange={set('feature')} placeholder="Dog Box" />
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input" value={form.priority} onChange={set('priority')}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
          <div>
            <label className="label">Target Shoot Date</label>
            <input type="date" className="input" value={form.targetShootDate} onChange={set('targetShootDate')} />
          </div>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input min-h-16 resize-none" value={form.description} onChange={set('description')} placeholder="More detail about what's needed..." />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input min-h-12 resize-none" value={form.notes} onChange={set('notes')} placeholder="Internal notes..." />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? 'Saving...' : editing ? 'Save Changes' : 'Log Shot'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Shot Card ────────────────────────────────────────────────────────────────

function ShotCard({ shot, onEdit, onStatusChange }: {
  shot: MissingShot; onEdit: (s: MissingShot) => void; onStatusChange: () => void;
}) {
  const { label, color, icon: Icon } = STATUS_CONFIG[shot.status];
  const [updating, setUpdating] = useState(false);

  async function nextStatus() {
    const order: ShotStatus[] = ['NEEDED', 'IN_PROGRESS', 'CAPTURED', 'ARCHIVED'];
    const idx = order.indexOf(shot.status);
    if (idx >= order.length - 1) return;
    setUpdating(true);
    await api.patch(`/files/missing-shots/${shot.id}`, { status: order[idx + 1] });
    onStatusChange();
    setUpdating(false);
  }

  const meta = [shot.vehicleMake, shot.packageType, shot.category, shot.feature].filter(Boolean);

  return (
    <motion.div layout initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
      className="card p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', PRIORITY_COLOR[shot.priority])}>
              {shot.priority}
            </span>
            <h3 className="text-sm font-medium text-text-primary">{shot.subject}</h3>
          </div>
          {meta.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {meta.map((m, i) => (
                <span key={i} className="text-xs bg-surface-elevated text-text-secondary px-2 py-0.5 rounded-full">{m}</span>
              ))}
            </div>
          )}
          {shot.description && <p className="text-xs text-text-muted mt-1">{shot.description}</p>}
        </div>
        <button
          onClick={nextStatus}
          disabled={updating || shot.status === 'ARCHIVED'}
          className={cn('flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border border-border hover:border-accent/40 transition-colors flex-shrink-0', color)}
          title="Advance status"
        >
          {updating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Icon className="w-3 h-3" />}
          {label}
        </button>
      </div>
      <div className="flex items-center justify-between pt-1 border-t border-border/50">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span>by {shot.requestedBy.firstName} {shot.requestedBy.lastName}</span>
          {shot.targetShootDate && <span>· Target: {new Date(shot.targetShootDate).toLocaleDateString()}</span>}
        </div>
        <div className="flex items-center gap-2">
          {shot.resolvedFile && (
            <a href={shot.resolvedFile.webViewLink} target="_blank" rel="noopener noreferrer"
              className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 transition-colors">
              <ExternalLink className="w-3 h-3" /> View File
            </a>
          )}
          <button onClick={() => onEdit(shot)} className="text-xs text-text-muted hover:text-accent transition-colors">Edit</button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminMissingShotsPage() {
  const [shots, setShots] = useState<MissingShot[]>([]);
  const [filter, setFilter] = useState<ShotStatus | 'ALL'>('NEEDED');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MissingShot | null>(null);

  async function fetchShots() {
    const params = filter !== 'ALL' ? { status: filter } : {};
    const resp = await api.get('/files/missing-shots', { params });
    setShots(resp.data.data);
    setLoading(false);
  }

  useEffect(() => { fetchShots(); }, [filter]);

  const counts = Object.fromEntries(
    (['NEEDED', 'IN_PROGRESS', 'CAPTURED', 'ARCHIVED'] as ShotStatus[]).map((s) => [s, 0]),
  ) as Record<ShotStatus, number>;
  shots.forEach((s) => { if (filter === 'ALL') counts[s.status]++; });

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="font-heading font-semibold text-text-primary text-lg">Missing Shots</h1>
          <p className="text-xs text-text-muted mt-0.5">Track B-roll footage the team needs to capture</p>
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-primary text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Log Shot
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 px-6 py-3 border-b border-border overflow-x-auto">
        {(['ALL', 'NEEDED', 'IN_PROGRESS', 'CAPTURED', 'ARCHIVED'] as const).map((s) => {
          const cfg = s !== 'ALL' ? STATUS_CONFIG[s] : null;
          const Icon = cfg?.icon;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                'flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors',
                filter === s ? 'bg-accent-muted text-accent' : 'text-text-secondary hover:bg-surface-hover',
              )}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {s === 'ALL' ? 'All' : s === 'IN_PROGRESS' ? 'In Progress' : STATUS_CONFIG[s].label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-text-muted">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
          </div>
        ) : shots.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted gap-3">
            <Camera className="w-12 h-12 opacity-30" />
            <p className="text-sm">No missing shots in this category</p>
            <button onClick={() => { setEditing(null); setModalOpen(true); }} className="btn-ghost text-sm">Log the first one</button>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {shots.map((s) => (
              <ShotCard key={s.id} shot={s} onEdit={(shot) => { setEditing(shot); setModalOpen(true); }} onStatusChange={fetchShots} />
            ))}
          </div>
        )}
      </div>

      <ShotModal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} editing={editing} onSaved={fetchShots} />
    </div>
  );
}
