import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Plus, Pencil, Trash2, Copy, Eye, EyeOff, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import Topbar from '@/components/layout/Topbar';
import { TableRowSkeleton } from '@/components/ui/Skeleton';
import { ConfirmModal } from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';
import type { Page } from '@/types';
import api from '@/lib/api';

export default function AdminGlobalPagesPage() {
  const navigate = useNavigate();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPages = () => {
    api.get('/pages?type=GLOBAL').then((res) => {
      setPages(res.data.data.pages);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchPages(); }, []);

  const togglePublish = async (page: Page) => {
    try {
      await api.put(`/pages/${page.id}`, { isPublished: !page.isPublished });
      setPages((prev) => prev.map((p) => p.id === page.id ? { ...p, isPublished: !p.isPublished } : p));
      toast.success(page.isPublished ? 'Page unpublished' : 'Page published');
    } catch { toast.error('Failed to update status'); }
  };

  const duplicatePage = async (page: Page) => {
    try {
      await api.post('/pages', {
        title: `${page.title} (copy)`,
        description: page.description,
        icon: page.icon,
        type: 'GLOBAL',
        content: page.content,
        isPublished: false,
      });
      toast.success('Page duplicated');
      fetchPages();
    } catch { toast.error('Failed to duplicate'); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/pages/${deleteId}`);
      setPages((prev) => prev.filter((p) => p.id !== deleteId));
      toast.success('Page deleted');
      setDeleteId(null);
    } catch { toast.error('Failed to delete'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="flex flex-col h-full">
      <Topbar
        title="Global Pages"
        actions={
          <button onClick={() => navigate('/admin/pages/global/new')} className="btn-primary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Create Page
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <table className="w-full">
            <tbody>{Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)}</tbody>
          </table>
        ) : pages.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No global pages"
            description="Create your first page to share knowledge across the organization"
            action={
              <button onClick={() => navigate('/admin/pages/global/new')} className="btn-primary">
                <Plus className="w-4 h-4" /> Create First Page
              </button>
            }
          />
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wide">Page</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wide">Assignments</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wide">Updated</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-text-muted uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pages.map((page) => (
                  <tr key={page.id} className="border-b border-border last:border-0 hover:bg-surface-hover transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{page.icon || '📄'}</span>
                        <div>
                          <p className="font-medium text-text-primary text-sm">{page.title}</p>
                          <p className="text-xs text-text-muted">/{page.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => togglePublish(page)} className="flex items-center gap-1.5">
                        {page.isPublished ? (
                          <span className="badge bg-priority-low/15 text-priority-low"><Eye className="w-3 h-3" /> Published</span>
                        ) : (
                          <span className="badge bg-surface-elevated text-text-muted"><EyeOff className="w-3 h-3" /> Draft</span>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {page._count?.assignments ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-text-muted">
                      {formatDate(page.updatedAt, 'relative')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/admin/pages/global/${page.id}/edit`)}
                          className="p-1.5 text-text-muted hover:text-accent transition-colors rounded hover:bg-surface-hover"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => duplicatePage(page)}
                          className="p-1.5 text-text-muted hover:text-text-primary transition-colors rounded hover:bg-surface-hover"
                          title="Duplicate"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(page.id)}
                          className="p-1.5 text-text-muted hover:text-priority-urgent transition-colors rounded hover:bg-surface-hover"
                          title="Delete"
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

      <ConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Page"
        message="This action is permanent. All assignments and content will be lost."
      />
    </div>
  );
}
