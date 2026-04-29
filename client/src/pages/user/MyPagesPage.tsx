import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bookmark, Clock } from 'lucide-react';
import Topbar from '@/components/layout/Topbar';
import { PageCardSkeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';
import type { Page } from '@/types';
import api from '@/lib/api';

export default function MyPagesPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/pages/assigned').then((res) => {
      setPages(res.data.data.pages);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col h-full">
      <Topbar title="My Pages" />

      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Bookmark className="w-5 h-5 text-accent" />
          <h2 className="font-heading font-semibold text-text-primary">Assigned to me</h2>
          {!loading && (
            <span className="ml-2 badge bg-accent-muted text-accent">{pages.length}</span>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <PageCardSkeleton key={i} />)}
          </div>
        ) : pages.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="No pages assigned"
            description="When an admin assigns pages specifically to you, they'll appear here."
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pages.map((page, i) => (
              <motion.div
                key={page.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link to={`/pages/${page.slug}`} className="card-hover block overflow-hidden group">
                  {page.coverImage ? (
                    <img src={page.coverImage} alt={page.title} className="w-full h-28 object-cover" />
                  ) : (
                    <div className="w-full h-28 bg-surface-elevated flex items-center justify-center">
                      <span className="text-3xl">{page.icon || '📑'}</span>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{page.icon || '📑'}</span>
                      <h3 className="font-heading font-semibold text-text-primary group-hover:text-accent transition-colors truncate">
                        {page.title}
                      </h3>
                    </div>
                    {page.description && (
                      <p className="text-text-muted text-sm line-clamp-2 mb-2">{page.description}</p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-text-muted">
                      <Clock className="w-3 h-3" />
                      Assigned {formatDate(page.assignedAt || page.createdAt, 'relative')}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
