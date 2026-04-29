import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Pencil, UserCheck, UserX, Filter, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import Topbar from '@/components/layout/Topbar';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';
import type { User } from '@/types';
import api from '@/lib/api';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editUser, setEditUser] = useState<User | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    department: '',
    position: '',
    role: 'USER' as 'USER' | 'ADMIN',
    isActive: true,
  });

  const [inviteForm, setInviteForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    role: 'USER' as 'USER' | 'ADMIN',
    department: '',
    position: '',
  });

  const fetchUsers = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (roleFilter) params.set('role', roleFilter);
    api.get(`/users?${params}`).then((res) => {
      setUsers(res.data.data.users);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchUsers(); }, [search, roleFilter]);

  const openEdit = (user: User) => {
    setEditUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      department: user.department || '',
      position: user.position || '',
      role: user.role,
      isActive: user.isActive,
    });
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const res = await api.put(`/users/${editUser.id}`, editForm);
      setUsers((prev) => prev.map((u) => (u.id === editUser.id ? res.data.data.user : u)));
      setEditUser(null);
      toast.success('User updated');
    } catch { toast.error('Failed to update user'); }
    finally { setSaving(false); }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/users/invite', inviteForm);
      setUsers((prev) => [res.data.data.user, ...prev]);
      setInviteOpen(false);
      setInviteForm({ firstName: '', lastName: '', email: '', role: 'USER', department: '', position: '' });
      toast.success(`User invited! Temp password: ${res.data.data.tempPassword}`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to invite user';
      toast.error(msg);
    } finally { setSaving(false); }
  };

  const toggleActive = async (user: User) => {
    try {
      const res = await api.put(`/users/${user.id}`, { isActive: !user.isActive });
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data.data.user : u)));
      toast.success(user.isActive ? 'User deactivated' : 'User activated');
    } catch { toast.error('Failed to update'); }
  };

  const openDelete = (user: User) => {
    setDeleteTarget(user);
    setDeleteConfirmEmail('');
  };

  const handleDelete = async () => {
    if (!deleteTarget || deleteConfirmEmail !== deleteTarget.email) return;
    setDeleting(true);
    try {
      await api.delete(`/users/${deleteTarget.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== deleteTarget.id));
      setDeleteTarget(null);
      toast.success(`${deleteTarget.firstName} ${deleteTarget.lastName} has been deleted`);
    } catch { toast.error('Failed to delete user'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Users"
        actions={
          <button onClick={() => setInviteOpen(true)} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Invite User
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        {/* Filters */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 h-9 text-sm w-64"
              placeholder="Search users..."
            />
          </div>
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-text-muted" />
            {(['', 'USER', 'ADMIN'] as const).map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role)}
                className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${
                  roleFilter === role
                    ? 'bg-accent-muted border-accent/40 text-accent'
                    : 'border-border text-text-muted hover:border-border-hover'
                }`}
              >
                {role || 'All'}
              </button>
            ))}
          </div>
          <span className="ml-auto text-sm text-text-muted">{users.length} users</span>
        </div>

        {loading ? (
          <table className="w-full">
            <tbody>{Array.from({ length: 6 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)}</tbody>
          </table>
        ) : users.length === 0 ? (
          <EmptyState icon={Plus} title="No users found" description="Try adjusting your search or filters" />
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['User', 'Role', 'Department', 'Position', 'Joined', 'Status', 'Actions'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar src={user.avatar} firstName={user.firstName} lastName={user.lastName} size="sm" />
                        <div>
                          <p className="font-medium text-text-primary text-sm">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-text-muted">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={user.role === 'ADMIN' ? 'bg-accent-muted text-accent' : ''}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{user.department || '—'}</td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{user.position || '—'}</td>
                    <td className="px-4 py-3 text-sm text-text-muted">{formatDate(user.createdAt, 'short')}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${user.isActive ? 'bg-priority-low/15 text-priority-low' : 'bg-surface-elevated text-text-muted'}`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(user)}
                          className="p-1.5 text-text-muted hover:text-accent transition-colors rounded hover:bg-surface-hover"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(user)}
                          className={`p-1.5 transition-colors rounded hover:bg-surface-hover ${
                            user.isActive ? 'text-text-muted hover:text-priority-urgent' : 'text-text-muted hover:text-priority-low'
                          }`}
                          title={user.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {user.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openDelete(user)}
                          className="p-1.5 text-text-muted hover:text-priority-urgent transition-colors rounded hover:bg-priority-urgent/10"
                          title="Delete user"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}
      </div>

      {/* Edit modal */}
      <Modal open={!!editUser} onClose={() => setEditUser(null)} title="Edit User" size="md">
        {editUser && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">First Name</label>
                <input className="input" value={editForm.firstName} onChange={(e) => setEditForm((f) => ({ ...f, firstName: e.target.value }))} />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input className="input" value={editForm.lastName} onChange={(e) => setEditForm((f) => ({ ...f, lastName: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Department</label>
              <input className="input" value={editForm.department} onChange={(e) => setEditForm((f) => ({ ...f, department: e.target.value }))} />
            </div>
            <div>
              <label className="label">Position</label>
              <input className="input" value={editForm.position} onChange={(e) => setEditForm((f) => ({ ...f, position: e.target.value }))} />
            </div>
            <div>
              <label className="label">Role</label>
              <div className="grid grid-cols-2 gap-2">
                {(['USER', 'ADMIN'] as const).map((r) => (
                  <button key={r} type="button" onClick={() => setEditForm((f) => ({ ...f, role: r }))}
                    className={`py-1.5 text-sm rounded-lg border transition-all ${editForm.role === r ? 'bg-accent-muted border-accent/40 text-accent' : 'border-border text-text-secondary'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-text-secondary">Account Active</span>
              <button
                type="button"
                onClick={() => setEditForm((f) => ({ ...f, isActive: !f.isActive }))}
                className={`w-10 h-5 rounded-full transition-all relative ${editForm.isActive ? 'bg-accent' : 'bg-surface-elevated border border-border'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-text-primary transition-all ${editForm.isActive ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setEditUser(null)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={handleEditSave} disabled={saving} className="btn-primary text-sm">
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete User"
        size="sm"
      >
        {deleteTarget && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-priority-urgent/10 border border-priority-urgent/20">
              <AlertTriangle className="w-5 h-5 text-priority-urgent flex-shrink-0 mt-0.5" />
              <div className="text-sm text-text-secondary">
                <p className="font-medium text-text-primary mb-1">This action is permanent and cannot be undone.</p>
                <p>All data for <span className="font-medium text-text-primary">{deleteTarget.firstName} {deleteTarget.lastName}</span> will be permanently deleted — widgets, tasks, page assignments, and notifications.</p>
              </div>
            </div>

            <div>
              <label className="label">
                Type <span className="font-mono text-text-primary">{deleteTarget.email}</span> to confirm
              </label>
              <input
                className="input"
                type="email"
                placeholder={deleteTarget.email}
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                onPaste={(e) => e.preventDefault()}
                autoComplete="off"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setDeleteTarget(null)} className="btn-ghost text-sm">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleting || deleteConfirmEmail !== deleteTarget.email}
                className="text-sm px-4 py-2 rounded-lg font-medium transition-all bg-priority-urgent/10 text-priority-urgent border border-priority-urgent/30 hover:bg-priority-urgent hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Invite modal */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite New User" size="md">
        <form onSubmit={handleInvite} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">First Name</label>
              <input className="input" value={inviteForm.firstName} onChange={(e) => setInviteForm((f) => ({ ...f, firstName: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Last Name</label>
              <input className="input" value={inviteForm.lastName} onChange={(e) => setInviteForm((f) => ({ ...f, lastName: e.target.value }))} required />
            </div>
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={inviteForm.email} onChange={(e) => setInviteForm((f) => ({ ...f, email: e.target.value }))} required />
          </div>
          <div>
            <label className="label">Department</label>
            <input className="input" value={inviteForm.department} onChange={(e) => setInviteForm((f) => ({ ...f, department: e.target.value }))} />
          </div>
          <div>
            <label className="label">Position</label>
            <input className="input" value={inviteForm.position} onChange={(e) => setInviteForm((f) => ({ ...f, position: e.target.value }))} />
          </div>
          <div>
            <label className="label">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {(['USER', 'ADMIN'] as const).map((r) => (
                <button key={r} type="button" onClick={() => setInviteForm((f) => ({ ...f, role: r }))}
                  className={`py-1.5 text-sm rounded-lg border transition-all ${inviteForm.role === r ? 'bg-accent-muted border-accent/40 text-accent' : 'border-border text-text-secondary'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setInviteOpen(false)} className="btn-ghost text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary text-sm">
              {saving ? 'Inviting...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
