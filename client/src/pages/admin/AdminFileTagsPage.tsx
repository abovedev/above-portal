import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Pencil, UserCheck, UserX, Loader2, Tag } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import Modal from '@/components/ui/Modal';

interface TagValue { id: string; value: string; order: number; }
interface TagCategory { id: string; name: string; slug: string; color: string; order: number; values: TagValue[]; }
interface User { id: string; firstName: string; lastName: string; email: string; avatar: string | null; }
interface Permission { id: string; userId: string; canTag: boolean; user: User; }

const PALETTE = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6', '#f97316', '#84cc16'];

// ─── Category Form Modal ──────────────────────────────────────────────────────

function CategoryModal({ open, onClose, editing, onSaved }: {
  open: boolean; onClose: () => void; editing: TagCategory | null; onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [color, setColor] = useState(PALETTE[0]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editing) { setName(editing.name); setSlug(editing.slug); setColor(editing.color); }
    else { setName(''); setSlug(''); setColor(PALETTE[0]); }
  }, [editing]);

  function slugify(s: string) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/files/tags/${editing.id}`, { name, slug, color });
      } else {
        await api.post('/files/tags', { name, slug: slug || slugify(name), color });
      }
      toast.success(editing ? 'Category updated' : 'Category created');
      onSaved();
      onClose();
    } catch { toast.error('Failed to save category'); }
    finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Edit Category' : 'New Tag Category'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Category Name *</label>
          <input className="input" value={name} onChange={(e) => { setName(e.target.value); if (!editing) setSlug(slugify(e.target.value)); }} placeholder="e.g. Vehicle Make" required />
        </div>
        <div>
          <label className="label">Slug *</label>
          <input className="input font-mono text-sm" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="vehicle_make" required />
        </div>
        <div>
          <label className="label">Colour</label>
          <div className="flex gap-2 flex-wrap">
            {PALETTE.map((c) => (
              <button
                key={c} type="button"
                onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full border-2 transition-all"
                style={{ background: c, borderColor: color === c ? '#fff' : 'transparent' }}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary text-sm">{saving ? 'Saving...' : editing ? 'Save Changes' : 'Create'}</button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminFileTagsPage() {
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [catModal, setCatModal] = useState(false);
  const [editCat, setEditCat] = useState<TagCategory | null>(null);
  const [newValues, setNewValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  async function fetchAll() {
    try {
      const [catsResp, permsResp, usersResp] = await Promise.all([
        api.get('/files/tags'),
        api.get('/files/tags/permissions'),
        api.get('/users'),
      ]);
      setCategories(catsResp.data.data);
      setPermissions(permsResp.data.data);
      setAllUsers(usersResp.data.data.filter((u: User & { role: string }) => u.role !== 'ADMIN'));
    } catch {
      toast.error('Failed to load tag data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  async function deleteCategory(id: string) {
    await api.delete(`/files/tags/${id}`);
    toast.success('Category deleted');
    fetchAll();
  }

  async function addValue(catId: string) {
    const val = newValues[catId]?.trim();
    if (!val) return;
    try {
      await api.post(`/files/tags/${catId}/values`, { value: val });
      setNewValues((v) => ({ ...v, [catId]: '' }));
      fetchAll();
    } catch { toast.error('Failed to add value'); }
  }

  async function deleteValue(catId: string, valueId: string) {
    await api.delete(`/files/tags/${catId}/values/${valueId}`);
    fetchAll();
  }

  async function togglePermission(userId: string, current: boolean) {
    await api.post('/files/tags/permissions', { userId, canTag: !current });
    fetchAll();
  }

  async function grantPermission(userId: string) {
    await api.post('/files/tags/permissions', { userId, canTag: true });
    toast.success('Tagging permission granted');
    fetchAll();
  }

  const permittedIds = new Set(permissions.map((p) => p.userId));
  const unpermitted = allUsers.filter((u) => !permittedIds.has(u.id));

  if (loading) return (
    <div className="flex items-center justify-center h-full text-text-muted">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading...
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div>
          <h1 className="font-heading font-semibold text-text-primary text-lg">Tag Manager</h1>
          <p className="text-xs text-text-muted mt-0.5">Manage tag categories, values, and user permissions</p>
        </div>
        <button onClick={() => { setEditCat(null); setCatModal(true); }} className="btn-primary text-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Category
        </button>
      </div>

      <div className="p-6 space-y-6 flex-1">
        {/* Categories */}
        <div className="space-y-4">
          {categories.length === 0 && (
            <div className="card p-8 text-center text-text-muted">
              <Tag className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No tag categories yet. Create your first one above.</p>
            </div>
          )}
          {categories.map((cat) => (
            <motion.div key={cat.id} layout className="card overflow-hidden">
              {/* Category header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                  <div>
                    <p className="font-medium text-text-primary text-sm">{cat.name}</p>
                    <p className="text-xs text-text-muted font-mono">{cat.slug}</p>
                  </div>
                  <span className="text-xs text-text-muted bg-surface-elevated px-2 py-0.5 rounded-full">{cat.values.length} values</span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditCat(cat); setCatModal(true); }} className="p-1.5 text-text-muted hover:text-accent rounded-md hover:bg-surface-hover transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-text-muted hover:text-priority-urgent rounded-md hover:bg-surface-hover transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Values */}
              <div className="p-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  {cat.values.map((val) => (
                    <div key={val.id} className="group flex items-center gap-1 text-xs px-2.5 py-1 rounded-full text-white" style={{ background: cat.color }}>
                      <span>{val.value}</span>
                      <button onClick={() => deleteValue(cat.id, val.id)} className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-white/60">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {cat.values.length === 0 && <p className="text-xs text-text-muted">No values yet</p>}
                </div>
                <div className="flex gap-2">
                  <input
                    className="input text-sm flex-1"
                    placeholder={`Add ${cat.name} value...`}
                    value={newValues[cat.id] ?? ''}
                    onChange={(e) => setNewValues((v) => ({ ...v, [cat.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addValue(cat.id))}
                  />
                  <button onClick={() => addValue(cat.id)} className="btn-ghost text-sm flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Permissions */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h2 className="font-medium text-text-primary text-sm">Tagging Permissions</h2>
            <p className="text-xs text-text-muted mt-0.5">Grant non-admin users permission to tag files</p>
          </div>
          <div className="divide-y divide-border">
            {permissions.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{p.user.firstName} {p.user.lastName}</p>
                  <p className="text-xs text-text-muted">{p.user.email}</p>
                </div>
                <button
                  onClick={() => togglePermission(p.userId, p.canTag)}
                  className={p.canTag ? 'btn-ghost text-sm text-green-400' : 'btn-ghost text-sm text-text-muted'}
                >
                  {p.canTag ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                  {p.canTag ? 'Can Tag' : 'Revoked'}
                </button>
              </div>
            ))}
            {unpermitted.length > 0 && (
              <div className="px-4 py-3">
                <p className="text-xs text-text-muted mb-2">Grant access to</p>
                <div className="flex flex-wrap gap-2">
                  {unpermitted.map((u) => (
                    <button key={u.id} onClick={() => grantPermission(u.id)} className="text-xs px-3 py-1.5 border border-border rounded-full hover:border-accent hover:text-accent transition-colors flex items-center gap-1.5">
                      <Plus className="w-3 h-3" /> {u.firstName} {u.lastName}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {permissions.length === 0 && unpermitted.length === 0 && (
              <p className="px-4 py-4 text-sm text-text-muted">No team members to grant permissions to.</p>
            )}
          </div>
        </div>
      </div>

      <CategoryModal
        open={catModal}
        onClose={() => { setCatModal(false); setEditCat(null); }}
        editing={editCat}
        onSaved={fetchAll}
      />
    </div>
  );
}
