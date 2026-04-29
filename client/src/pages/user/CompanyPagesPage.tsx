import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutGrid, List, Search, BookOpen, Clock } from 'lucide-react';
import Topbar from '@/components/layout/Topbar';
import { PageCardSkeleton } from '@/components/ui/Skeleton';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';
import type { Page } from '@/types';
import api from '@/lib/api';

export default function CompanyPagesPage() {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const q = searchParams.get('search') || '';
    setSearch(q);
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ type: 'GLOBAL' });
    if (search) params.set('search', search);
    api.get(`/pages?${params}`).then((res) => {
      setPages(res.data.data.pages);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [search]);

  return (
    <div className="flex flex-col h-full">
      <Topbar title="Company Pages" />

      <div className="flex-1 overflow-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 h-9 text-sm"
              placeholder="Search pages..."
            />
          </div>
          <div className="ml-auto flex items-center gap-1 bg-surface-elevated rounded-lg p-1 border border-border">
            <button
              onClick={() => setView('grid')}
              className={`p-1.5 rounded ${view === 'grid' ? 'bg-accent text-background' : 'text-text-muted hover:text-text-primary'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView('list')}
              className={`p-1.5 rounded ${view === 'list' ? 'bg-accent text-background' : 'text-text-muted hover:text-text-primary'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className={view === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
            {Array.from({ length: 6 }).map((_, i) => <PageCardSkeleton key={i} />)}
          </div>
        ) : pages.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No pages found"
            description={search ? `No results for "${search}"` : 'No company pages published yet'}
          />
        ) : view === 'grid' ? (
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
                    <img src={page.coverImage} alt={page.title} className="w-full h-32 object-cover" />
                  ) : (
                    <div className="w-full h-32 bg-surface-elevated flex items-center justify-center">
                      <span className="text-4xl">{page.icon || '📄'}</span>
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{page.icon || '📄'}</span>
                      <h3 className="font-heading font-semibold text-text-primary group-hover:text-accent transition-colors truncate">
                        {page.title}
                      </h3>
                    </div>
                    {page.description && (
                      <p className="text-text-muted text-sm line-clamp-2 mb-2">{page.description}</p>
                    )}
                    <div className="flex items-center gap-1 text-xs text-text-muted">
                      <Clock className="w-3 h-3" />
                      {formatDate(page.updatedAt, 'relative')}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {pages.map((page, i) => (
              <motion.div
                key={page.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
              >
                <Link
                  to={`/pages/${page.slug}`}
                  className="card flex items-center gap-4 p-4 hover:border-border-hover hover:shadow-card-hover transition-all group"
                >
                  <span className="text-2xl flex-shrink-0">{page.icon || '📄'}</span>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-text-primary group-hover:text-accent transition-colors truncate">
                      {page.title}
                    </h3>
                    {page.description && (
                      <p className="text-text-muted text-sm truncate">{page.description}</p>
                    )}
                  </div>
                  <div className="text-xs text-text-muted whitespace-nowrap">
                    {formatDate(page.updatedAt, 'relative')}
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
