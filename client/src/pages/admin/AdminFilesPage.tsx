import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen, RefreshCw, Search, Filter, ExternalLink,
  CheckCircle2, XCircle, Tag, FolderSync, AlertCircle, X,
  ChevronDown, Pencil, Loader2, FolderPlus, Trash2, Film, Image, GitBranch,
  CheckSquare, Square, Wand2, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import Modal from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

function todayYYYYMMDD() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function fileExt(name: string) {
  const i = name.lastIndexOf('.');
  return i !== -1 ? name.slice(i + 1).toLowerCase() : '';
}

function buildNewName(date: string, subject: string, location: string, ext: string, seq: number | null) {
  const parts = [date.trim(), subject.trim(), location.trim()].filter(Boolean);
  const seqStr = seq !== null ? `_${String(seq).padStart(2, '0')}` : '';
  const extStr = ext ? `.${ext}` : '';
  return `${parts.join('_')}${seqStr}${extStr}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface DriveFolder { id: string; driveId: string; name: string; driveType: string; lastSyncAt: string | null; fileCount: number; recursive: boolean; }
interface TagValue { id: string; value: string; category: { id: string; name: string; color: string }; }
interface DriveFile {
  id: string; name: string; mimeType: string; webViewLink: string; thumbnailLink: string | null;
  nameValid: boolean; parsedDate: string | null; parsedSubject: string | null; parsedLocation: string | null;
  nameSuggestion: string | null; modifiedAt: string | null; subfolderPath: string | null;
  folder: { id: string; name: string } | null;
  tags: { id: string; tagValue: TagValue }[];
}
interface TagCategory { id: string; name: string; slug: string; color: string; values: TagValue[]; }
interface FileStats { total: number; valid: number; invalid: number; tagged: number; untagged: number; }

function getMediaType(mimeType: string): 'video' | 'image' | 'other' {
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('image/')) return 'image';
  return 'other';
}

// ─── Add Folder Modal ─────────────────────────────────────────────────────────

function AddFolderModal({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: () => void }) {
  const [driveUrl, setDriveUrl] = useState('');
  const [name, setName] = useState('');
  const [driveType, setDriveType] = useState<'personal' | 'shared'>('personal');
  const [recursive, setRecursive] = useState(false);
  const [saving, setSaving] = useState(false);

  function extractDriveId(url: string): string | null {
    const m = url.match(/\/folders\/([a-zA-Z0-9_-]{20,})/);
    return m ? m[1] : url.trim().length > 10 ? url.trim() : null;
  }

  // Auto-enable recursive when URL looks like a drive root (no /folders/ segment)
  function handleUrlChange(url: string) {
    setDriveUrl(url);
    const looksLikeRoot = url.includes('drive.google.com') && !url.includes('/folders/');
    if (looksLikeRoot) setRecursive(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const driveId = extractDriveId(driveUrl);
    if (!driveId) return toast.error('Enter a valid Google Drive folder URL or ID');
    if (!name.trim()) return toast.error('Enter a folder name');
    setSaving(true);
    try {
      await api.post('/files/folders', { driveId, name: name.trim(), url: driveUrl.trim(), driveType, recursive });
      toast.success('Folder added');
      onAdded();
      onClose();
      setDriveUrl(''); setName(''); setRecursive(false);
    } catch { toast.error('Failed to add folder'); }
    finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Drive Folder" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Google Drive Folder URL or ID *</label>
          <input className="input" value={driveUrl} onChange={(e) => handleUrlChange(e.target.value)}
            placeholder="https://drive.google.com/drive/folders/..." required />
          <p className="text-xs text-text-muted mt-1">Paste the folder URL from Google Drive</p>
        </div>
        <div>
          <label className="label">Folder Name *</label>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="MRT Master Archive" required />
        </div>
        <div>
          <label className="label">Drive Type</label>
          <select className="input" value={driveType} onChange={(e) => setDriveType(e.target.value as 'personal' | 'shared')}>
            <option value="personal">Personal Drive</option>
            <option value="shared">Shared Drive</option>
          </select>
        </div>
        <div className={cn('rounded-lg border p-3 space-y-1.5', recursive ? 'border-accent/30 bg-accent-muted' : 'border-border')}>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={recursive}
              onChange={(e) => setRecursive(e.target.checked)}
              className="w-4 h-4 rounded accent-accent"
            />
            <span className="text-sm font-medium text-text-primary">Sync subfolders recursively</span>
          </label>
          <p className="text-xs text-text-muted pl-6.5">
            {recursive
              ? 'All media files in nested subfolders will be synced. Subfolder paths are stored per file. Recommended for root or archive folders.'
              : 'Only direct children of this folder are synced. Enable for root drives or deeply nested archives.'}
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary text-sm">
            {saving ? 'Adding...' : 'Add Folder'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Tag Modal ────────────────────────────────────────────────────────────────

function TagModal({
  open, onClose, file, categories, onSaved,
}: { open: boolean; onClose: () => void; file: DriveFile | null; categories: TagCategory[]; onSaved: (f: DriveFile) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<TagValue[]>([]);

  useEffect(() => {
    if (file) {
      setSelected(new Set((file.tags ?? []).map((t) => t.tagValue.id)));
      setSuggestions([]);
    }
  }, [file]);

  async function handleSuggest() {
    if (!file) return;
    setSuggesting(true);
    try {
      const resp = await api.post(`/files/${file.id}/suggest-tags`);
      const got = resp.data.data.suggestions as TagValue[];
      if (got.length === 0) toast.info('No confident suggestions for this file');
      else setSuggestions(got);
    } catch { toast.error('AI suggestion failed'); }
    finally { setSuggesting(false); }
  }

  function acceptSuggestion(id: string) {
    setSelected((s) => { const n = new Set(s); n.add(id); return n; });
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }

  function dismissSuggestion(id: string) {
    setSuggestions((prev) => prev.filter((s) => s.id !== id));
  }

  function toggle(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function handleSave() {
    if (!file) return;
    setSaving(true);
    try {
      const resp = await api.patch(`/files/${file.id}/tags`, { tagValueIds: [...selected] });
      onSaved(resp.data.data);
      toast.success('Tags saved');
      onClose();
    } catch { toast.error('Failed to save tags'); }
    finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Tag — ${file?.name ?? ''}`} size="lg">
      <div className="space-y-3">
        {/* AI Suggestions */}
        <AnimatePresence>
          {suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="p-3 bg-accent/5 border border-accent/20 rounded-lg"
            >
              <p className="text-xs font-medium text-accent mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> AI Suggestions — click to apply
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-dashed"
                    style={{ borderColor: s.category.color, color: s.category.color }}
                  >
                    <button type="button" onClick={() => acceptSuggestion(s.id)} className="hover:opacity-80 transition-opacity">
                      {s.category.name}: {s.value}
                    </button>
                    <button type="button" onClick={() => dismissSuggestion(s.id)}
                      className="opacity-40 hover:opacity-100 transition-opacity ml-0.5">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {categories.map((cat) => (
          <div key={cat.id} className="border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setExpanded(expanded === cat.id ? null : cat.id)}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-surface-hover transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                <span className="text-sm font-medium text-text-primary">{cat.name}</span>
                {[...selected].filter((id) => cat.values.some((v) => v.id === id)).length > 0 && (
                  <span className="text-xs bg-accent-muted text-accent px-1.5 py-0.5 rounded-full">
                    {[...selected].filter((id) => cat.values.some((v) => v.id === id)).length}
                  </span>
                )}
              </div>
              <ChevronDown className={cn('w-4 h-4 text-text-muted transition-transform', expanded === cat.id && 'rotate-180')} />
            </button>
            <AnimatePresence>
              {expanded === cat.id && (
                <motion.div
                  initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                  className="overflow-hidden border-t border-border"
                >
                  <div className="p-3 flex flex-wrap gap-2">
                    {cat.values.map((val) => (
                      <button
                        key={val.id}
                        type="button"
                        onClick={() => toggle(val.id)}
                        className={cn(
                          'text-xs px-2.5 py-1 rounded-full border transition-all',
                          selected.has(val.id)
                            ? 'border-transparent text-white'
                            : 'border-border text-text-secondary hover:border-border-hover hover:text-text-primary',
                        )}
                        style={selected.has(val.id) ? { background: cat.color, borderColor: cat.color } : {}}
                      >
                        {val.value}
                      </button>
                    ))}
                    {cat.values.length === 0 && <p className="text-xs text-text-muted">No values in this category</p>}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
        {categories.length === 0 && <p className="text-text-muted text-sm text-center py-4">No tag categories yet. Create them in the Tags tab.</p>}
        <div className="flex items-center justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={handleSuggest}
            disabled={suggesting || saving}
            className="btn-ghost text-sm flex items-center gap-1.5"
          >
            {suggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {suggesting ? 'Thinking…' : 'Suggest'}
          </button>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-ghost text-sm">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary text-sm">
              {saving ? 'Saving...' : 'Save Tags'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// ─── Rename Modal ─────────────────────────────────────────────────────────────

function RenameModal({
  open, onClose, file, onRenamed,
}: { open: boolean; onClose: () => void; file: DriveFile | null; onRenamed: (f: DriveFile) => void }) {
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (file) setNewName(file.nameSuggestion ?? file.name);
  }, [file]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !newName.trim()) return;
    setSaving(true);
    try {
      const resp = await api.patch(`/files/${file.id}/rename`, { newName: newName.trim() });
      onRenamed(resp.data.data);
      toast.success('File renamed in Google Drive');
      onClose();
    } catch { toast.error('Rename failed — check your Google Drive connection'); }
    finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title="Rename File" size="md">
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="label">Current Name</label>
          <p className="text-sm text-text-muted font-mono break-all">{file?.name}</p>
        </div>
        {file?.nameSuggestion && (
          <div className="p-3 bg-surface-elevated rounded-lg border border-accent/20">
            <p className="text-xs text-accent font-medium mb-1">Suggested name</p>
            <p className="text-xs text-text-secondary font-mono">{file.nameSuggestion}</p>
          </div>
        )}
        <div>
          <label className="label">New Name *</label>
          <input className="input font-mono text-sm" value={newName} onChange={(e) => setNewName(e.target.value)} required />
          <p className="text-xs text-text-muted mt-1">Format: YYYYMMDD_Subject.ext or YYYYMMDD_Subject_Location.ext</p>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary text-sm">
            {saving ? 'Renaming...' : 'Rename in Drive'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Bulk Rename Modal ────────────────────────────────────────────────────────

interface PreviewRow { id: string; originalName: string; newName: string; ext: string; }

function BulkRenameModal({
  open, onClose, files, onRenamed,
}: { open: boolean; onClose: () => void; files: DriveFile[]; onRenamed: (updated: DriveFile[]) => void }) {
  const [date, setDate] = useState(todayYYYYMMDD);
  const [subject, setSubject] = useState('');
  const [location, setLocation] = useState('');
  const [useSeq, setUseSeq] = useState(true);
  const [previews, setPreviews] = useState<PreviewRow[]>([]);
  const [saving, setSaving] = useState(false);

  // Initialise previews when files change
  useEffect(() => {
    if (!open) return;
    setPreviews(files.map((f) => ({ id: f.id, originalName: f.name, newName: f.nameSuggestion ?? f.name, ext: fileExt(f.name) })));
    setDate(todayYYYYMMDD());
    setSubject('');
    setLocation('');
  }, [open, files]);

  function applyTemplate() {
    if (!date.trim() && !subject.trim()) return toast.error('Enter at least a date and subject');
    setPreviews((prev) =>
      prev.map((p, i) => ({
        ...p,
        newName: buildNewName(date, subject, location, p.ext, useSeq && prev.length > 1 ? i + 1 : null),
      }))
    );
  }

  function setPreviewName(id: string, newName: string) {
    setPreviews((prev) => prev.map((p) => (p.id === id ? { ...p, newName } : p)));
  }

  async function handleSave() {
    const invalid = previews.filter((p) => !p.newName.trim());
    if (invalid.length) return toast.error('Some files have empty names');
    setSaving(true);
    try {
      const resp = await api.post('/files/bulk-rename', {
        renames: previews.map((p) => ({ id: p.id, newName: p.newName.trim() })),
      });
      const { renamed, errors, results } = resp.data.data as { renamed: number; errors: { id: string; error: string }[]; results: DriveFile[] };
      if (renamed > 0) {
        toast.success(`Renamed ${renamed} file${renamed !== 1 ? 's' : ''} in Google Drive`);
        onRenamed(results);
      }
      if (errors.length) toast.error(`${errors.length} file${errors.length !== 1 ? 's' : ''} failed — check Drive connection`);
      onClose();
    } catch { toast.error('Bulk rename failed'); }
    finally { setSaving(false); }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Bulk Rename — ${files.length} files`} size="xl">
      {/* Template */}
      <div className="p-4 bg-surface-elevated rounded-lg border border-border space-y-3 mb-4">
        <p className="text-xs font-medium text-text-muted uppercase tracking-wide">Template</p>
        <div className="flex gap-2 flex-wrap">
          <div className="flex-shrink-0">
            <label className="label text-xs">Date (YYYYMMDD)</label>
            <input className="input font-mono text-sm w-32" value={date} onChange={(e) => setDate(e.target.value)} placeholder="20260523" />
          </div>
          <div className="flex-1 min-w-36">
            <label className="label text-xs">Subject *</label>
            <input className="input text-sm" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Ford Ranger Sport" />
          </div>
          <div className="flex-1 min-w-28">
            <label className="label text-xs">Location <span className="text-text-muted font-normal">(optional)</span></label>
            <input className="input text-sm" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Studio" />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-text-secondary">
            <input type="checkbox" checked={useSeq} onChange={(e) => setUseSeq(e.target.checked)} className="w-3.5 h-3.5 accent-accent" />
            Add sequence numbers (_01, _02…)
          </label>
          <button onClick={applyTemplate} className="btn-primary text-xs flex items-center gap-1.5 px-3 py-1.5">
            <Wand2 className="w-3 h-3" /> Apply to all
          </button>
        </div>
      </div>

      {/* Preview table */}
      <div className="text-xs text-text-muted font-medium mb-2">Preview — edit individual names as needed</div>
      <div className="border border-border rounded-lg overflow-hidden mb-4">
        <div className="grid grid-cols-[1fr_1fr] text-xs font-medium text-text-muted bg-surface-elevated px-3 py-2 border-b border-border">
          <span>Current name</span>
          <span>New name</span>
        </div>
        <div className="max-h-64 overflow-y-auto divide-y divide-border">
          {previews.map((p) => (
            <div key={p.id} className="grid grid-cols-[1fr_1fr] gap-2 px-3 py-2 hover:bg-surface-hover transition-colors items-center">
              <span className="text-xs text-text-muted font-mono truncate" title={p.originalName}>{p.originalName}</span>
              <input
                className="input input-sm font-mono text-xs py-1"
                value={p.newName}
                onChange={(e) => setPreviewName(p.id, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="btn-primary text-sm flex items-center gap-2">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          {saving ? 'Renaming...' : `Rename ${files.length} File${files.length !== 1 ? 's' : ''}`}
        </button>
      </div>
    </Modal>
  );
}

// ─── File Row ─────────────────────────────────────────────────────────────────

function FileRow({
  file, selected, onSelect, onTag, onRename,
}: {
  file: DriveFile; selected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  onTag: (f: DriveFile) => void; onRename: (f: DriveFile) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg transition-colors group',
        selected ? 'bg-accent-muted' : 'hover:bg-surface-hover',
      )}
    >
      {/* Checkbox */}
      <button
        onClick={() => onSelect(file.id, !selected)}
        className="mt-0.5 flex-shrink-0 text-text-muted hover:text-accent transition-colors"
      >
        {selected
          ? <CheckSquare className="w-4 h-4 text-accent" />
          : <Square className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />}
      </button>

      {/* Valid indicator */}
      <div className="mt-0.5 flex-shrink-0">
        {file.nameValid
          ? <CheckCircle2 className="w-4 h-4 text-green-500" />
          : <XCircle className="w-4 h-4 text-priority-urgent" />}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-text-primary font-mono truncate max-w-xs">{file.name}</span>
          {getMediaType(file.mimeType) === 'video' && (
            <span className="flex items-center gap-1 text-[10px] text-text-muted bg-surface-elevated px-1.5 py-0.5 rounded">
              <Film className="w-2.5 h-2.5" /> Video
            </span>
          )}
          {getMediaType(file.mimeType) === 'image' && (
            <span className="flex items-center gap-1 text-[10px] text-text-muted bg-surface-elevated px-1.5 py-0.5 rounded">
              <Image className="w-2.5 h-2.5" /> Image
            </span>
          )}
          {file.subfolderPath && (
            <span className="text-[10px] text-text-muted font-mono opacity-70 truncate max-w-[160px]" title={file.subfolderPath}>
              {file.subfolderPath.split('/').join(' › ')}
            </span>
          )}
          {!file.subfolderPath && file.folder && (
            <span className="text-xs text-text-muted">in {file.folder.name}</span>
          )}
        </div>
        {!file.nameValid && file.nameSuggestion && (
          <p className="text-xs text-amber-400 mt-0.5">Suggested: <span className="font-mono">{file.nameSuggestion}</span></p>
        )}
        {(file.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {(file.tags ?? []).map((t) => (
              <span key={t.id} className="text-xs px-2 py-0.5 rounded-full text-white" style={{ background: t.tagValue.category.color }}>
                {t.tagValue.value}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        {!file.nameValid && (
          <button onClick={() => onRename(file)} className="p-1.5 text-text-muted hover:text-accent rounded-md hover:bg-surface transition-colors" title="Rename">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={() => onTag(file)} className="p-1.5 text-text-muted hover:text-accent rounded-md hover:bg-surface transition-colors" title="Tag">
          <Tag className="w-3.5 h-3.5" />
        </button>
        <a href={file.webViewLink} target="_blank" rel="noopener noreferrer"
          className="p-1.5 text-text-muted hover:text-accent rounded-md hover:bg-surface transition-colors" title="Open in Drive">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminFilesPage() {
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [categories, setCategories] = useState<TagCategory[]>([]);
  const [stats, setStats] = useState<FileStats | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterValid, setFilterValid] = useState<'all' | 'valid' | 'invalid'>('all');
  const [filterMedia, setFilterMedia] = useState<'all' | 'video' | 'image'>('all');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncConfirm, setSyncConfirm] = useState<{ folderId: string; count: number; subfolderCount: number } | null>(null);
  const [counting, setCounting] = useState<string | null>(null);
  const [addFolderOpen, setAddFolderOpen] = useState(false);
  const [tagFile, setTagFile] = useState<DriveFile | null>(null);
  const [renameFile, setRenameFile] = useState<DriveFile | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkRenameOpen, setBulkRenameOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [confirmRemoveFolder, setConfirmRemoveFolder] = useState<DriveFolder | null>(null);
  const [purging, setPurging] = useState(false);

  const limit = 50;

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit };
      if (selectedFolder) params.folderId = selectedFolder;
      if (search) params.search = search;
      if (filterValid === 'valid') params.nameValid = 'true';
      if (filterValid === 'invalid') params.nameValid = 'false';
      if (filterMedia !== 'all') params.mediaType = filterMedia;
      const resp = await api.get('/files', { params });
      setFiles(resp.data.data.files);
      setTotal(resp.data.data.total);
    } catch { toast.error('Failed to load files'); }
    finally { setLoading(false); }
  }, [page, selectedFolder, search, filterValid, filterMedia, limit]);

  const fetchAll = useCallback(async () => {
    const [foldersResp, statsResp, catsResp] = await Promise.all([
      api.get('/files/folders'),
      api.get('/files/stats'),
      api.get('/files/tags'),
    ]);
    setFolders(foldersResp.data.data);
    setStats(statsResp.data.data);
    setCategories(catsResp.data.data);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);
  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  // Debounce search input — waits 300ms after typing stops before firing a fetch
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Clear selection whenever filters or page changes (avoids phantom selections on hidden files)
  useEffect(() => { setSelectedIds(new Set()); }, [selectedFolder, filterValid, filterMedia, search, page]);

  async function handleSync(folderId?: string) {
    // For a specific recursive folder, fetch count first and ask for confirmation
    if (folderId) {
      const folder = folders.find((f) => f.id === folderId);
      if (folder?.recursive) {
        setCounting(folderId);
        try {
          const { data } = await api.get(`/files/folders/${folderId}/count`);
          setSyncConfirm({ folderId, count: data.data.count, subfolderCount: data.data.subfolderCount });
        } catch {
          toast.error('Could not estimate file count');
        } finally {
          setCounting(null);
        }
        return;
      }
    }
    await runSync(folderId);
  }

  async function runSync(folderId?: string) {
    setSyncing(folderId ?? 'all');
    try {
      const resp = folderId
        ? await api.post(`/files/folders/${folderId}/sync`)
        : await api.post('/files/sync');
      toast.success(`Synced ${resp.data.data.synced} files`);
      fetchAll();
      fetchFiles();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error ?? 'Sync failed';
      toast.error(msg);
    } finally {
      setSyncing(null);
    }
  }

  async function doRemoveFolder() {
    if (!confirmRemoveFolder) return;
    try {
      await api.delete(`/files/folders/${confirmRemoveFolder.id}`);
      toast.success('Folder removed');
      if (selectedFolder === confirmRemoveFolder.id) setSelectedFolder(null);
      setConfirmRemoveFolder(null);
      fetchAll();
      fetchFiles();
    } catch { toast.error('Failed to remove folder'); }
  }

  async function handlePurgeStale() {
    setPurging(true);
    try {
      const resp = await api.post('/files/purge-stale');
      const count = resp.data?.data?.removed ?? 0;
      toast.success(count > 0 ? `Removed ${count} stale entr${count === 1 ? 'y' : 'ies'}` : 'No stale files found');
      if (count > 0) { fetchAll(); fetchFiles(); }
    } catch { toast.error('Purge failed'); }
    finally { setPurging(false); }
  }

  async function toggleRecursive(folder: DriveFolder) {
    try {
      await api.patch(`/files/folders/${folder.id}`, { recursive: !folder.recursive });
      toast.success(`Recursive sync ${!folder.recursive ? 'enabled' : 'disabled'} — re-sync to apply`);
      fetchAll();
    } catch { toast.error('Failed to update folder'); }
  }


  function handleFileTagged(updated: DriveFile) {
    setFiles((fs) => fs.map((f) => (f.id === updated.id ? updated : f)));
  }
  function handleFileRenamed(updated: DriveFile) {
    setFiles((fs) => fs.map((f) => (f.id === updated.id ? updated : f)));
  }
  function handleBulkRenamed(updated: DriveFile[]) {
    const map = new Map(updated.map((f) => [f.id, f]));
    setFiles((fs) => fs.map((f) => map.get(f.id) ?? f));
    setSelectedIds(new Set());
    fetchAll(); // refresh stats
  }

  function toggleSelect(id: string, checked: boolean) {
    setSelectedIds((prev) => { const n = new Set(prev); checked ? n.add(id) : n.delete(id); return n; });
  }
  function selectAll() { setSelectedIds(new Set(files.map((f) => f.id))); }
  function selectAllInvalid() { setSelectedIds(new Set(files.filter((f) => !f.nameValid).map((f) => f.id))); }
  function clearSelection() { setSelectedIds(new Set()); }

  const selectedFiles = useMemo(() => files.filter((f) => selectedIds.has(f.id)), [files, selectedIds]);

  return (
    <div className="flex flex-col h-full relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div>
          <h1 className="font-heading font-semibold text-text-primary text-lg">File Management</h1>
          <p className="text-xs text-text-muted mt-0.5">B-roll archive — sync, tag and rename footage</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePurgeStale}
            disabled={purging}
            title="Delete non-media and junk rows left over from old syncs"
            className="btn-ghost text-sm flex items-center gap-2"
          >
            {purging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Purge Stale
          </button>
          <button
            onClick={() => handleSync()}
            disabled={syncing !== null}
            className="btn-ghost text-sm flex items-center gap-2"
          >
            {syncing === 'all' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Sync All
          </button>
          <button onClick={() => setAddFolderOpen(true)} className="btn-primary text-sm flex items-center gap-2">
            <FolderPlus className="w-4 h-4" /> Add Folder
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 flex-shrink-0 border-r border-border flex flex-col overflow-y-auto">
          {/* Stats */}
          {stats && (
            <div className="p-3 border-b border-border space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Total files</span>
                <span className="font-medium text-text-primary">{(stats.total ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-green-400">Valid names</span>
                <span className="font-medium text-green-400">{(stats.valid ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-priority-urgent">Invalid names</span>
                <span className="font-medium text-priority-urgent">{(stats.invalid ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-text-muted">Tagged</span>
                <span className="font-medium text-text-secondary">{(stats.tagged ?? 0).toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Filter by media type */}
          <div className="p-3 border-b border-border space-y-1">
            <p className="text-xs text-text-muted font-medium mb-2">Media Type</p>
            {([
              { v: 'all', label: 'All Media' },
              { v: 'video', label: 'Video' },
              { v: 'image', label: 'Image' },
            ] as const).map(({ v, label }) => (
              <button
                key={v}
                onClick={() => { setFilterMedia(v); setPage(1); }}
                className={cn(
                  'w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors flex items-center gap-2',
                  filterMedia === v ? 'bg-accent-muted text-accent' : 'text-text-secondary hover:bg-surface-hover',
                )}
              >
                {v === 'video' && <Film className="w-3.5 h-3.5 flex-shrink-0" />}
                {v === 'image' && <Image className="w-3.5 h-3.5 flex-shrink-0" />}
                {v === 'all' && <Filter className="w-3.5 h-3.5 flex-shrink-0" />}
                {label}
              </button>
            ))}
          </div>

          {/* Filter by validity */}
          <div className="p-3 border-b border-border space-y-1">
            <p className="text-xs text-text-muted font-medium mb-2">Name Status</p>
            {(['all', 'invalid', 'valid'] as const).map((v) => (
              <button
                key={v}
                onClick={() => { setFilterValid(v); setPage(1); }}
                className={cn(
                  'w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors capitalize',
                  filterValid === v ? 'bg-accent-muted text-accent' : 'text-text-secondary hover:bg-surface-hover',
                )}
              >
                {v === 'all' ? 'All Files' : v === 'invalid' ? 'Invalid Names' : 'Valid Names'}
              </button>
            ))}
          </div>

          {/* Folders */}
          <div className="p-3 flex-1">
            <p className="text-xs text-text-muted font-medium mb-2">Folders</p>
            <button
              onClick={() => { setSelectedFolder(null); setPage(1); }}
              className={cn(
                'w-full text-left text-sm px-2 py-1.5 rounded-md transition-colors flex items-center gap-2',
                !selectedFolder ? 'bg-accent-muted text-accent' : 'text-text-secondary hover:bg-surface-hover',
              )}
            >
              <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" /> All Folders
            </button>
            {folders.map((f) => (
              <div key={f.id} className="group flex items-center">
                <button
                  onClick={() => { setSelectedFolder(f.id); setPage(1); }}
                  className={cn(
                    'flex-1 text-left text-sm px-2 py-1.5 rounded-md transition-colors flex items-center gap-2 min-w-0',
                    selectedFolder === f.id ? 'bg-accent-muted text-accent' : 'text-text-secondary hover:bg-surface-hover',
                  )}
                >
                  <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate flex-1">{f.name}</span>
                  {f.recursive && (
                    <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-accent/15 text-accent flex-shrink-0">
                      REC
                    </span>
                  )}
                </button>
                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleRecursive(f)}
                    className={cn(
                      'p-1 rounded',
                      f.recursive ? 'text-accent hover:text-accent/70' : 'text-text-muted hover:text-accent',
                    )}
                    title={f.recursive ? 'Recursive ON — click to disable' : 'Enable recursive sync (includes subfolders)'}
                  >
                    <GitBranch className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleSync(f.id)}
                    disabled={syncing !== null || counting !== null}
                    className="p-1 text-text-muted hover:text-accent rounded"
                    title={f.recursive ? 'Recursive sync (will estimate file count first)' : 'Sync folder'}
                  >
                    {syncing === f.id || counting === f.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <FolderSync className="w-3 h-3" />}
                  </button>
                  <button onClick={() => setConfirmRemoveFolder(f)} className="p-1 text-text-muted hover:text-priority-urgent rounded" title="Remove folder">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
            {folders.length === 0 && (
              <p className="text-xs text-text-muted mt-2 px-2">No folders added yet. Click "Add Folder" to watch a Drive folder.</p>
            )}
          </div>
        </aside>

        {/* File list */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                className="input pl-8 text-sm"
                placeholder="Search filenames..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              {searchInput && (
                <button onClick={() => { setSearchInput(''); setSearch(''); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Filter className="w-3.5 h-3.5" />
              <span>{total.toLocaleString()} file{total !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* File list */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Select all bar */}
            {files.length > 0 && (
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-border">
                <button onClick={selectedIds.size === files.length ? clearSelection : selectAll}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors">
                  {selectedIds.size === files.length
                    ? <CheckSquare className="w-3.5 h-3.5 text-accent" />
                    : <Square className="w-3.5 h-3.5" />}
                  {selectedIds.size === files.length ? 'Deselect all' : 'Select all'}
                </button>
                {files.some((f) => !f.nameValid) && (
                  <button onClick={selectAllInvalid} className="text-xs text-text-muted hover:text-amber-400 transition-colors">
                    Select invalid only
                  </button>
                )}
                {selectedIds.size > 0 && (
                  <button onClick={clearSelection} className="text-xs text-text-muted hover:text-text-primary transition-colors ml-auto">
                    Clear ({selectedIds.size})
                  </button>
                )}
              </div>
            )}

            {loading && !files.length ? (
              <div className="flex items-center justify-center py-20 text-text-muted">
                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading files...
              </div>
            ) : files.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-text-muted gap-3">
                <AlertCircle className="w-10 h-10 opacity-30" />
                <p className="text-sm">{folders.length === 0 ? 'Add a folder and sync to see files' : 'No files match your filter'}</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {files.map((f) => (
                  <FileRow key={f.id} file={f} selected={selectedIds.has(f.id)} onSelect={toggleSelect} onTag={setTagFile} onRename={setRenameFile} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {total > limit && (
              <div className="flex items-center justify-center gap-3 mt-6 pt-4 border-t border-border">
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="btn-ghost text-sm" >Prev</button>
                <span className="text-sm text-text-muted">Page {page} of {Math.ceil(total / limit)}</span>
                <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)} className="btn-ghost text-sm">Next</button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Selection action bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 36 }}
            className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3 px-4 py-3 bg-surface border border-border rounded-xl shadow-xl z-30"
          >
            <span className="text-sm font-medium text-text-primary">{selectedIds.size} file{selectedIds.size !== 1 ? 's' : ''} selected</span>
            <div className="w-px h-4 bg-border" />
            <button onClick={clearSelection} className="text-xs text-text-muted hover:text-text-primary transition-colors">Clear</button>
            <button
              onClick={() => setBulkRenameOpen(true)}
              className="btn-primary text-sm flex items-center gap-2 px-3 py-1.5"
            >
              <Wand2 className="w-3.5 h-3.5" /> Bulk Rename
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AddFolderModal open={addFolderOpen} onClose={() => setAddFolderOpen(false)} onAdded={fetchAll} />
      <TagModal open={!!tagFile} onClose={() => setTagFile(null)} file={tagFile} categories={categories} onSaved={handleFileTagged} />
      <RenameModal open={!!renameFile} onClose={() => setRenameFile(null)} file={renameFile} onRenamed={handleFileRenamed} />
      <BulkRenameModal open={bulkRenameOpen} onClose={() => setBulkRenameOpen(false)} files={selectedFiles} onRenamed={handleBulkRenamed} />

      {/* Remove folder confirmation */}
      <Modal open={!!confirmRemoveFolder} onClose={() => setConfirmRemoveFolder(null)} title="Remove Folder" size="sm">
        {confirmRemoveFolder && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Remove <span className="font-semibold text-text-primary">{confirmRemoveFolder.name}</span> from the portal?
            </p>
            <p className="text-sm text-priority-urgent">
              All {confirmRemoveFolder.fileCount.toLocaleString()} synced file records will be permanently deleted from the database. Files in Google Drive are not affected.
            </p>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setConfirmRemoveFolder(null)} className="btn-ghost text-sm">Cancel</button>
              <button
                onClick={doRemoveFolder}
                className="text-sm font-medium px-3 py-1.5 rounded-lg bg-priority-urgent/10 text-priority-urgent hover:bg-priority-urgent/20 transition-colors border border-priority-urgent/20"
              >
                Remove Folder &amp; Files
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Recursive sync confirmation */}
      <Modal open={!!syncConfirm} onClose={() => setSyncConfirm(null)} title="Confirm Recursive Sync" size="sm">
        {syncConfirm && (
          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Found <span className="font-semibold text-text-primary">{syncConfirm.count.toLocaleString()} media files</span> across{' '}
              <span className="font-semibold text-text-primary">{syncConfirm.subfolderCount} subfolder{syncConfirm.subfolderCount !== 1 ? 's' : ''}</span>.
            </p>
            {syncConfirm.count > 500 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>Large archive detected. This sync may take several minutes. Don&apos;t close the browser.</span>
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setSyncConfirm(null)} className="btn-ghost text-sm">Cancel</button>
              <button
                onClick={() => { const id = syncConfirm.folderId; setSyncConfirm(null); runSync(id); }}
                className="btn-primary text-sm"
              >
                Sync All
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
