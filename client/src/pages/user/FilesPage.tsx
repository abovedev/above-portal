import { useEffect, useState, useCallback } from 'react';
import { Search, ExternalLink, CheckCircle2, XCircle, Filter, X, ChevronDown, Loader2, Film } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

interface TagValue { id: string; value: string; category: { id: string; name: string; color: string }; }
interface DriveFile {
  id: string; name: string; webViewLink: string; thumbnailLink: string | null;
  nameValid: boolean; parsedDate: string | null; parsedSubject: string | null; parsedLocation: string | null;
  folder: { id: string; name: string } | null;
  tags: { id: string; tagValue: TagValue }[];
}
interface TagCategory { id: string; name: string; color: string; values: TagValue[]; }

export default function FilesPage() {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const limit = 48;

  useEffect(() => {
    api.get('/files/tags').then((r) => setCategories(r.data.data)).catch(() => {});
  }, []);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (search) params.search = search;
      if (selectedTags.size) params.tagValueIds = [...selectedTags].join(',');
      const resp = await api.get('/files', { params });
      setFiles(resp.data.data.files);
      setTotal(resp.data.data.total);
    } catch { toast.error('Failed to load files'); }
    finally { setLoading(false); }
  }, [page, search, selectedTags, limit]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  function toggleTag(id: string) {
    setSelectedTags((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
    setPage(1);
  }

  function clearFilters() { setSelectedTags(new Set()); setSearch(''); setPage(1); }

  const hasFilters = selectedTags.size > 0 || search;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border flex-shrink-0">
        <h1 className="font-heading font-semibold text-text-primary text-lg">B-Roll Archive</h1>
        <p className="text-xs text-text-muted mt-0.5">Search and browse company footage</p>
      </div>

      {/* Search + Filter bar */}
      <div className="px-6 py-3 border-b border-border flex items-center gap-3 flex-shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            className="input pl-8 text-sm"
            placeholder="Search filenames, subjects, locations..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button
          onClick={() => setFiltersOpen((o) => !o)}
          className={cn('flex items-center gap-2 text-sm px-3 py-2 rounded-lg border transition-colors',
            filtersOpen || selectedTags.size
              ? 'border-accent text-accent bg-accent-muted'
              : 'border-border text-text-secondary hover:border-border-hover',
          )}
        >
          <Filter className="w-4 h-4" />
          {selectedTags.size > 0 ? `${selectedTags.size} filter${selectedTags.size > 1 ? 's' : ''}` : 'Filter'}
        </button>
        {hasFilters && (
          <button onClick={clearFilters} className="text-xs text-text-muted hover:text-text-primary transition-colors">
            Clear all
          </button>
        )}
        <span className="text-xs text-text-muted ml-auto">{total.toLocaleString()} file{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Filter panel */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-b border-border"
          >
            <div className="px-6 py-3 flex flex-wrap gap-3">
              {categories.map((cat) => (
                <div key={cat.id} className="min-w-40">
                  <button
                    onClick={() => setExpandedCat(expandedCat === cat.id ? null : cat.id)}
                    className="flex items-center gap-1.5 text-xs font-medium text-text-secondary hover:text-text-primary mb-1.5 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: cat.color }} />
                    {cat.name}
                    <ChevronDown className={cn('w-3 h-3 transition-transform', expandedCat === cat.id && 'rotate-180')} />
                  </button>
                  <AnimatePresence>
                    {expandedCat === cat.id && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="flex flex-wrap gap-1">
                        {cat.values.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => toggleTag(v.id)}
                            className="text-xs px-2 py-0.5 rounded-full border transition-all"
                            style={
                              selectedTags.has(v.id)
                                ? { background: cat.color, borderColor: cat.color, color: '#fff' }
                                : { borderColor: 'var(--border)' }
                            }
                          >
                            {v.value}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Files grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading && !files.length ? (
          <div className="flex items-center justify-center py-20 text-text-muted">
            <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading files...
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-text-muted gap-3">
            <Film className="w-12 h-12 opacity-30" />
            <p className="text-sm">{hasFilters ? 'No files match your filters' : 'No files indexed yet'}</p>
            {hasFilters && <button onClick={clearFilters} className="text-xs text-accent hover:underline">Clear filters</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {files.map((f) => (
              <motion.a
                key={f.id}
                href={f.webViewLink}
                target="_blank"
                rel="noopener noreferrer"
                layout
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card p-3 hover:border-accent/30 transition-colors group flex flex-col gap-2 cursor-pointer"
              >
                {/* Thumbnail */}
                {f.thumbnailLink ? (
                  <div className="aspect-video rounded-md overflow-hidden bg-surface-elevated">
                    <img src={f.thumbnailLink} alt={f.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-video rounded-md bg-surface-elevated flex items-center justify-center">
                    <Film className="w-8 h-8 text-text-muted opacity-50" />
                  </div>
                )}

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-start gap-1.5">
                    {f.nameValid
                      ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0 mt-0.5" />
                      : <XCircle className="w-3.5 h-3.5 text-priority-urgent flex-shrink-0 mt-0.5" />}
                    <p className="text-xs font-mono text-text-primary line-clamp-2 leading-relaxed">{f.name}</p>
                  </div>
                  {f.folder && <p className="text-xs text-text-muted mt-0.5">{f.folder.name}</p>}
                </div>

                {/* Tags */}
                {f.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {f.tags.slice(0, 4).map((t) => (
                      <span key={t.id} className="text-xs px-1.5 py-0.5 rounded-full text-white"
                        style={{ background: t.tagValue.category.color, fontSize: '10px' }}>
                        {t.tagValue.value}
                      </span>
                    ))}
                    {f.tags.length > 4 && <span className="text-xs text-text-muted">+{f.tags.length - 4}</span>}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                  {f.parsedDate && <span className="text-xs text-text-muted">{f.parsedDate}</span>}
                  <ExternalLink className="w-3 h-3 text-text-muted group-hover:text-accent transition-colors ml-auto" />
                </div>
              </motion.a>
            ))}
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="flex items-center justify-center gap-3 mt-8 pt-6 border-t border-border">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="btn-ghost text-sm">Prev</button>
            <span className="text-sm text-text-muted">Page {page} of {Math.ceil(total / limit)}</span>
            <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage((p) => p + 1)} className="btn-ghost text-sm">Next</button>
          </div>
        )}
      </div>
    </div>
  );
}
