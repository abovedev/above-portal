import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Plus, Trash2, Users, BookOpen, Pencil, FilePlus } from 'lucide-react';
import { toast } from 'sonner';
import Topbar from '@/components/layout/Topbar';
import Avatar from '@/components/ui/Avatar';
import Modal from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/utils';
import type { User, Page, PageAssignment } from '@/types';
import api from '@/lib/api';

export default function AdminPerUserPagesPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [assignments, setAssignments] = useState<PageAssignment[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [unassignId, setUnassignId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [assignNewPage, setAssignNewPage] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/users'),
      api.get('/pages?type=PERSONAL'),
    ]).then(([usersRes, pagesRes]) => {
      setUsers(usersRes.data.data.users.filter((u: User) => u.role === 'USER'));
      setPages(pagesRes.data.data.pages);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    api.get(`/assignments/user/${selectedUser.id}`).then((res) => {
      setAssignments(res.data.data.assignments);
    });
  }, [selectedUser]);

  const refreshAssignments = async () => {
    if (!selectedUser) return;
    const res = await api.get(`/assignments/user/${selectedUser.id}`);
    setAssignments(res.data.data.assignments);
  };

  const handleAssign = async () => {
    if (!selectedUser || selectedPages.length === 0) return;
    setAssigning(true);
    try {
      await Promise.all(
        selectedPages.map((pageId) =>
          api.post('/assignments', { pageId, userIds: [selectedUser.id] })
        )
      );
      toast.success(`${selectedPages.length} page(s) assigned`);
      setAssignOpen(false);
      setSelectedPages([]);
      await refreshAssignments();
    } catch { toast.error('Failed to assign pages'); }
    finally { setAssigning(false); }
  };

  const handleCreatePage = async () => {
    if (!newPageTitle.trim()) {
      toast.error('Page title is required');
      return;
    }
    setCreating(true);
    try {
      const pageRes = await api.post('/pages', {
        title: newPageTitle.trim(),
        type: 'PERSONAL',
        isPublished: true,
      });
      const page: Page = pageRes.data.data.page;

      if (selectedUser && assignNewPage) {
        await api.post('/assignments', { pageId: page.id, userIds: [selectedUser.id] });
        await refreshAssignments();
      }

      setPages((prev) => [page, ...prev]);
      setCreateOpen(false);
      setNewPageTitle('');
      setAssignNewPage(true);
      toast.success('Personal page created');
      navigate(`/admin/pages/per-user/${page.id}/edit`);
    } catch {
      toast.error('Failed to create page');
    } finally {
      setCreating(false);
    }
  };

  const handleUnassign = async () => {
    if (!unassignId) return;
    try {
      await api.delete(`/assignments/${unassignId}`);
      setAssignments((prev) => prev.filter((a) => a.id !== unassignId));
      setUnassignId(null);
      toast.success('Page unassigned');
    } catch { toast.error('Failed to unassign'); }
  };

  const filteredUsers = users.filter((u) =>
    `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(userSearch.toLowerCase())
  );

  const assignedPageIds = assignments.map((a) => a.pageId);
  const availablePages = pages.filter((p) => !assignedPageIds.includes(p.id));

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Per-User Pages"
        actions={
          <button data-tour="new-page" onClick={() => setCreateOpen(true)} className="btn-primary text-sm flex items-center gap-1.5">
            <FilePlus className="w-4 h-4" /> Create Page
          </button>
        }
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: User list */}
        <div className="w-72 border-r border-border flex flex-col bg-surface flex-shrink-0">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="input pl-9 h-8 text-sm"
                placeholder="Search users..."
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 p-2">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-4 text-center text-text-muted text-sm">No users found</div>
            ) : (
              filteredUsers.map((user) => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                    selectedUser?.id === user.id
                      ? 'bg-accent-muted border-l-2 border-accent'
                      : 'hover:bg-surface-hover border-l-2 border-transparent'
                  }`}
                >
                  <Avatar src={user.avatar} firstName={user.firstName} lastName={user.lastName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-text-muted truncate">{user.department}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Assigned pages */}
        <div className="flex-1 overflow-auto p-6">
          {!selectedUser ? (
            <EmptyState
              icon={Users}
              title="Select a user"
              description="Choose a user from the list to manage their assigned pages"
            />
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Avatar src={selectedUser.avatar} firstName={selectedUser.firstName} lastName={selectedUser.lastName} />
                  <div>
                    <h2 className="font-heading font-semibold text-text-primary">
                      {selectedUser.firstName} {selectedUser.lastName}
                    </h2>
                    <p className="text-sm text-text-muted">{selectedUser.department} · {selectedUser.position}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setCreateOpen(true)} className="btn-ghost text-sm flex items-center gap-1.5">
                    <FilePlus className="w-4 h-4" /> New Page
                  </button>
                  <button onClick={() => setAssignOpen(true)} className="btn-primary text-sm flex items-center gap-1.5">
                    <Plus className="w-4 h-4" /> Assign Page
                  </button>
                </div>
              </div>

              {assignments.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="No pages assigned"
                  description={`${selectedUser.firstName} has no personally assigned pages yet`}
                  action={
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => setCreateOpen(true)} className="btn-primary text-sm inline-flex items-center gap-1.5 whitespace-nowrap">
                        <FilePlus className="w-4 h-4" /> Create Page
                      </button>
                      <button onClick={() => setAssignOpen(true)} className="btn-ghost text-sm inline-flex items-center gap-1.5 whitespace-nowrap">
                        <Plus className="w-4 h-4" /> Assign Existing
                      </button>
                    </div>
                  }
                />
              ) : (
                <div data-tour="page-list" className="space-y-2">
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className="card flex items-center gap-4 p-4">
                      <span className="text-2xl">{assignment.page.icon || '📄'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary">{assignment.page.title}</p>
                        <p className="text-xs text-text-muted">
                          Assigned {formatDate(assignment.assignedAt, 'relative')}
                        </p>
                      </div>
                      <button
                        onClick={() => navigate(`/admin/pages/per-user/${assignment.page.id}/edit`)}
                        className="text-text-muted hover:text-accent transition-colors p-1.5 rounded hover:bg-surface-hover"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setUnassignId(assignment.id)}
                        className="text-text-muted hover:text-priority-urgent transition-colors p-1.5 rounded hover:bg-surface-hover"
                        title="Unassign"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Create modal */}
      <Modal open={createOpen} onClose={() => { setCreateOpen(false); setNewPageTitle(''); setAssignNewPage(true); }} title="Create personal page" size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Page title</label>
            <input
              value={newPageTitle}
              onChange={(e) => setNewPageTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreatePage();
              }}
              className="input"
              placeholder="Untitled personal page"
              autoFocus
            />
          </div>
          {selectedUser && (
            <label className="flex items-center gap-3 p-3 rounded-lg bg-surface-elevated cursor-pointer">
              <input
                type="checkbox"
                checked={assignNewPage}
                onChange={(e) => setAssignNewPage(e.target.checked)}
                className="accent-accent"
              />
              <span className="text-sm text-text-secondary">
                Assign to {selectedUser.firstName} {selectedUser.lastName}
              </span>
            </label>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={() => setCreateOpen(false)} className="btn-ghost text-sm">Cancel</button>
          <button
            onClick={handleCreatePage}
            disabled={creating || !newPageTitle.trim()}
            className="btn-primary text-sm"
          >
            {creating ? 'Creating...' : 'Create and Edit'}
          </button>
        </div>
      </Modal>

      {/* Assign modal */}
      <Modal open={assignOpen} onClose={() => { setAssignOpen(false); setSelectedPages([]); }} title={`Assign pages to ${selectedUser?.firstName}`} size="md">
        {availablePages.length === 0 ? (
          <p className="text-text-muted text-sm text-center py-4">All pages already assigned</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto mb-4">
            {availablePages.map((page) => (
              <label key={page.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-surface-hover cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPages.includes(page.id)}
                  onChange={(e) => {
                    setSelectedPages((prev) => e.target.checked ? [...prev, page.id] : prev.filter((id) => id !== page.id));
                  }}
                  className="accent-accent"
                />
                <span className="text-lg">{page.icon || '📄'}</span>
                <div>
                  <p className="text-sm font-medium text-text-primary">{page.title}</p>
                  <p className="text-xs text-text-muted">{page.type}</p>
                </div>
              </label>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <button onClick={() => setAssignOpen(false)} className="btn-ghost text-sm">Cancel</button>
          <button
            onClick={handleAssign}
            disabled={assigning || selectedPages.length === 0}
            className="btn-primary text-sm"
          >
            {assigning ? 'Assigning...' : `Assign ${selectedPages.length || ''} Page${selectedPages.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      </Modal>

      <ConfirmModal
        open={!!unassignId}
        onClose={() => setUnassignId(null)}
        onConfirm={handleUnassign}
        title="Unassign Page"
        message="This user will no longer have access to this page."
        confirmLabel="Unassign"
      />
    </div>
  );
}
