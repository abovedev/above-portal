import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Clock, User } from 'lucide-react';
import Topbar from '@/components/layout/Topbar';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate } from '@/lib/utils';
import type { Page } from '@/types';
import api from '@/lib/api';
import { generateHTML } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';

function renderContent(content: unknown): string {
  if (!content) return '';
  try {
    return generateHTML(content as Parameters<typeof generateHTML>[0], [StarterKit]);
  } catch {
    return '<p>Content could not be rendered.</p>';
  }
}

export default function PageViewPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api.get(`/pages/${slug}`).then((res) => {
      setPage(res.data.data.page);
      setLoading(false);
    }).catch((err) => {
      if (err.response?.status === 404) setNotFound(true);
      setLoading(false);
    });
  }, [slug]);

  return (
    <div className="flex flex-col h-full">
      <Topbar />

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="max-w-3xl mx-auto p-8 space-y-6">
            <Skeleton className="h-56 w-full rounded-xl" />
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <div className="space-y-3 mt-8">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ) : notFound ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <div className="text-6xl">🔍</div>
            <h2 className="font-heading font-bold text-text-primary text-xl">Page not found</h2>
            <button onClick={() => navigate(-1)} className="btn-ghost">Go back</button>
          </div>
        ) : page ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl mx-auto pb-16"
          >
            {/* Cover image */}
            {page.coverImage && (
              <div className="relative h-56 overflow-hidden">
                <img src={page.coverImage} alt={page.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
              </div>
            )}

            <div className="px-8 pt-6">
              {/* Back button */}
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-1.5 text-text-muted hover:text-text-primary transition-colors mb-6 text-sm"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              {/* Page header */}
              <div className="mb-8">
                {page.icon && <div className="text-5xl mb-3">{page.icon}</div>}
                <h1 className="font-heading text-3xl font-bold text-text-primary mb-3">{page.title}</h1>
                {page.description && (
                  <p className="text-text-secondary text-lg leading-relaxed">{page.description}</p>
                )}
                <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-1.5 text-sm text-text-muted">
                    <User className="w-3.5 h-3.5" />
                    {page.createdBy.firstName} {page.createdBy.lastName}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-text-muted">
                    <Clock className="w-3.5 h-3.5" />
                    Updated {formatDate(page.updatedAt, 'relative')}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div
                className="page-content"
                dangerouslySetInnerHTML={{ __html: renderContent(page.content) }}
              />
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
