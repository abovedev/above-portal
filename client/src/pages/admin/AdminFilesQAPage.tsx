import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ShieldCheck, RefreshCw, Loader2, CheckCircle2, XCircle,
  FileX, Tag, Clock, Copy, Camera, ExternalLink, FolderSync, Film, Image, Link2,
  FileDown, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { cn } from '@/lib/utils';
import Modal from '@/components/ui/Modal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QAFile {
  id: string; name: string; mimeType: string; webViewLink: string;
  nameValid: boolean; nameSuggestion: string | null;
  folder: { id: string; name: string } | null;
}

interface QAFolder {
  id: string; name: string; lastSyncAt: string | null; fileCount: number; recursive: boolean;
}

interface DuplicateGroup {
  parsedDate: string; parsedSubject: string; parsedLocation: string | null;
  count: number; files: QAFile[];
}

interface QAShot {
  id: string; subject: string; priority: string; status: string;
  requestedBy: { firstName: string; lastName: string };
  targetShootDate: string | null; vehicleMake: string | null;
}

interface CandidateFile {
  id: string; name: string; mimeType: string; webViewLink: string;
  modifiedAt: string | null; folder: { id: string; name: string } | null;
}

interface ShotMatch { shot: QAShot; files: CandidateFile[]; }

interface ReportOverview {
  totalFiles: number; validFiles: number; invalidFiles: number; validPct: number;
  taggedFiles: number; untaggedFiles: number; taggedPct: number;
}
interface ReportTagValue { id: string; value: string; fileCount: number; }
interface ReportTagCategory { id: string; name: string; color: string; totalFiles: number; values: ReportTagValue[]; }
interface ReportShot {
  id: string; subject: string; priority: string; status: string;
  vehicleMake: string | null; targetShootDate: string | null; requestedBy: string;
}
interface ReportFolder { id: string; name: string; lastSyncAt: string | null; fileCount: number; }
interface ArchiveReport {
  generatedAt: string;
  overview: ReportOverview;
  tagBreakdown: ReportTagCategory[];
  openShots: ReportShot[];
  staleFolders: ReportFolder[];
}

interface QASummary {
  invalidNames: { count: number; sample: QAFile[] };
  untagged: { count: number; sample: QAFile[] };
  staleFolders: { count: number; folders: QAFolder[] };
  duplicates: { count: number; groups: DuplicateGroup[] };
  openShots: { count: number; shots: QAShot[] };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sev(count: number) {
  if (count === 0) return 'green' as const;
  if (count < 10) return 'amber' as const;
  return 'red' as const;
}

function SeverityDot({ count }: { count: number }) {
  const s = sev(count);
  return (
    <span className={cn(
      'w-2 h-2 rounded-full flex-shrink-0 mt-px',
      s === 'green' ? 'bg-green-500' : s === 'amber' ? 'bg-amber-400' : 'bg-priority-urgent',
    )} />
  );
}

function CountBadge({ count }: { count: number }) {
  const s = sev(count);
  return (
    <span className={cn(
      'text-xs font-semibold px-2 py-0.5 rounded-full',
      s === 'green' ? 'bg-green-500/15 text-green-400' :
      s === 'amber' ? 'bg-amber-400/15 text-amber-400' :
      'bg-priority-urgent/15 text-priority-urgent',
    )}>
      {count.toLocaleString()}
    </span>
  );
}

function MediaIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('video/')) return <Film className="w-3 h-3 text-text-muted flex-shrink-0" />;
  if (mimeType.startsWith('image/')) return <Image className="w-3 h-3 text-text-muted flex-shrink-0" />;
  return null;
}

function priorityColor(p: string) {
  if (p === 'URGENT') return 'text-priority-urgent';
  if (p === 'HIGH') return 'text-amber-400';
  if (p === 'MEDIUM') return 'text-blue-400';
  return 'text-text-muted';
}

// ─── Report ───────────────────────────────────────────────────────────────────

function generateMarkdown(r: ArchiveReport): string {
  const date = new Date(r.generatedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  const lines: string[] = [
    '# Above Digital Archive Report',
    `*Generated ${date}*`,
    '',
    '## Overview',
    '',
    '| Metric | Value |',
    '| --- | --- |',
    `| Total files | ${r.overview.totalFiles.toLocaleString()} |`,
    `| Valid names | ${r.overview.validFiles.toLocaleString()} (${r.overview.validPct}%) |`,
    `| Invalid names | ${r.overview.invalidFiles.toLocaleString()} |`,
    `| Tagged | ${r.overview.taggedFiles.toLocaleString()} (${r.overview.taggedPct}%) |`,
    `| Untagged | ${r.overview.untaggedFiles.toLocaleString()} |`,
    '',
  ];

  const activeCats = r.tagBreakdown.filter((c) => c.values.length > 0);
  if (activeCats.length > 0) {
    lines.push('## Tag Breakdown', '');
    for (const cat of activeCats) {
      lines.push(`### ${cat.name} (${cat.totalFiles} files)`, '');
      for (const v of cat.values) lines.push(`- ${v.value}: ${v.fileCount}`);
      lines.push('');
    }
  }

  if (r.openShots.length > 0) {
    lines.push('## Open Missing Shots', '', '| Priority | Subject | Status | Due | Requested By |', '| --- | --- | --- | --- | --- |');
    for (const s of r.openShots) {
      const due = s.targetShootDate ? new Date(s.targetShootDate).toLocaleDateString('en-AU') : '—';
      lines.push(`| ${s.priority} | ${s.subject}${s.vehicleMake ? ` (${s.vehicleMake})` : ''} | ${s.status.replace('_', ' ')} | ${due} | ${s.requestedBy} |`);
    }
    lines.push('');
  }

  if (r.staleFolders.length > 0) {
    lines.push('## Stale Sync', '');
    for (const f of r.staleFolders) {
      const last = f.lastSyncAt ? new Date(f.lastSyncAt).toLocaleDateString('en-AU') : 'Never';
      lines.push(`- **${f.name}** — last synced ${last} (${f.fileCount.toLocaleString()} files)`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function ReportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [report, setReport] = useState<ArchiveReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReport(null);
    setLoading(true);
    api.get('/files/report')
      .then((r) => setReport(r.data.data))
      .catch(() => toast.error('Failed to generate report'))
      .finally(() => setLoading(false));
  }, [open]);

  async function copyMarkdown() {
    if (!report) return;
    await navigator.clipboard.writeText(generateMarkdown(report));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Modal open={open} onClose={onClose} title="Archive Report" size="xl">
      {loading ? (
        <div className="flex items-center justify-center py-12 text-text-muted">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> Generating report…
        </div>
      ) : report ? (
        <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-text-muted">
              Generated {new Date(report.generatedAt).toLocaleString()}
            </p>
            <button
              onClick={copyMarkdown}
              className="btn-ghost text-sm flex items-center gap-1.5"
            >
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Markdown'}
            </button>
          </div>

          {/* Overview */}
          <section>
            <h3 className="text-sm font-semibold text-text-primary mb-3">Overview</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: 'Total Files', value: report.overview.totalFiles.toLocaleString(), tint: 'neutral' },
                { label: 'Valid Names', value: `${report.overview.validFiles.toLocaleString()} (${report.overview.validPct}%)`, tint: report.overview.validPct >= 80 ? 'green' : 'amber' },
                { label: 'Tagged', value: `${report.overview.taggedFiles.toLocaleString()} (${report.overview.taggedPct}%)`, tint: report.overview.taggedPct >= 80 ? 'green' : 'amber' },
                { label: 'Invalid Names', value: report.overview.invalidFiles.toLocaleString(), tint: report.overview.invalidFiles > 0 ? 'amber' : 'green' },
                { label: 'Untagged', value: report.overview.untaggedFiles.toLocaleString(), tint: report.overview.untaggedFiles > 0 ? 'amber' : 'green' },
                { label: 'Open Shots', value: report.openShots.length.toLocaleString(), tint: report.openShots.length > 0 ? 'amber' : 'green' },
              ].map(({ label, value, tint }) => (
                <div key={label} className="p-3 bg-surface-elevated rounded-lg border border-border">
                  <p className="text-xs text-text-muted">{label}</p>
                  <p className={cn(
                    'text-lg font-semibold mt-0.5',
                    tint === 'green' ? 'text-green-400' : tint === 'amber' ? 'text-amber-400' : 'text-text-primary',
                  )}>
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Tag Breakdown */}
          {report.tagBreakdown.some((c) => c.values.length > 0) && (
            <section>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Tag Breakdown</h3>
              <div className="space-y-4">
                {report.tagBreakdown.filter((c) => c.values.length > 0).map((cat) => (
                  <div key={cat.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                      <span className="text-sm font-medium text-text-primary">{cat.name}</span>
                      <span className="text-xs text-text-muted">{cat.totalFiles} files</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pl-4">
                      {cat.values.map((v) => (
                        <span key={v.id} className="text-xs px-2.5 py-1 rounded-full text-white" style={{ background: cat.color }}>
                          {v.value} <span className="opacity-70">({v.fileCount})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Open Missing Shots */}
          {report.openShots.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-text-primary mb-3">
                Open Missing Shots <span className="text-text-muted font-normal">({report.openShots.length})</span>
              </h3>
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-surface-elevated text-text-muted">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Priority</th>
                      <th className="px-3 py-2 text-left font-medium">Subject</th>
                      <th className="px-3 py-2 text-left font-medium">Status</th>
                      <th className="px-3 py-2 text-left font-medium">Due</th>
                      <th className="px-3 py-2 text-left font-medium">Requested By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.openShots.map((s) => (
                      <tr key={s.id} className="hover:bg-surface-hover">
                        <td className={cn('px-3 py-2 font-medium', priorityColor(s.priority))}>{s.priority}</td>
                        <td className="px-3 py-2 text-text-primary">
                          {s.subject}{s.vehicleMake ? ` (${s.vehicleMake})` : ''}
                        </td>
                        <td className="px-3 py-2 text-text-secondary">{s.status.replace('_', ' ')}</td>
                        <td className="px-3 py-2 text-text-muted">
                          {s.targetShootDate ? new Date(s.targetShootDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-3 py-2 text-text-muted">{s.requestedBy}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Stale Sync */}
          {report.staleFolders.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold text-text-primary mb-3">Stale Sync</h3>
              <div className="space-y-0 border border-border rounded-lg overflow-hidden divide-y divide-border">
                {report.staleFolders.map((f) => (
                  <div key={f.id} className="flex items-center justify-between px-3 py-2.5 text-sm hover:bg-surface-hover">
                    <span className="text-text-primary">{f.name}</span>
                    <span className="text-text-muted text-xs">
                      {f.lastSyncAt ? `Last synced ${new Date(f.lastSyncAt).toLocaleDateString()}` : 'Never synced'} · {f.fileCount.toLocaleString()} files
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {report.openShots.length === 0 && report.staleFolders.length === 0 && !report.tagBreakdown.some((c) => c.values.length > 0) && (
            <p className="text-sm text-text-muted text-center py-6">Nothing significant to report — archive is clean.</p>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ title, icon, count, action, description, children }: {
  title: string; icon: React.ReactNode; count: number;
  action?: React.ReactNode; description?: string; children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface border border-border rounded-xl overflow-hidden"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <SeverityDot count={count} />
          <span className="text-text-muted">{icon}</span>
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          <CountBadge count={count} />
        </div>
        <div className="flex items-center gap-3">
          {description && <span className="text-xs text-text-muted hidden md:block">{description}</span>}
          {action}
        </div>
      </div>
      <div className="px-4 py-2">{children}</div>
    </motion.div>
  );
}

function AllClearRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 py-2.5 text-green-400">
      <CheckCircle2 className="w-4 h-4" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

function QAFileRow({ file }: { file: QAFile }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        {file.nameValid
          ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
          : <XCircle className="w-3.5 h-3.5 text-priority-urgent flex-shrink-0" />}
        <MediaIcon mimeType={file.mimeType} />
        <span className="text-xs font-mono text-text-secondary truncate">{file.name}</span>
        {file.folder && (
          <span className="text-xs text-text-muted flex-shrink-0 hidden sm:block">in {file.folder.name}</span>
        )}
      </div>
      <div className="flex items-center gap-2 ml-2 flex-shrink-0">
        {file.nameSuggestion && (
          <span className="text-xs text-amber-400 font-mono hidden lg:block truncate max-w-[200px]" title={file.nameSuggestion}>
            → {file.nameSuggestion}
          </span>
        )}
        <a href={file.webViewLink} target="_blank" rel="noopener noreferrer"
          className="text-text-muted hover:text-accent transition-colors" title="Open in Drive">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminFilesQAPage() {
  const [summary, setSummary] = useState<QASummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [matches, setMatches] = useState<ShotMatch[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [resolving, setResolving] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await api.get('/files/qa-summary');
      setSummary(resp.data.data);
      setLastChecked(new Date());
    } catch { toast.error('Failed to load QA summary'); }
    finally { setLoading(false); }
  }, []);

  const loadMatches = useCallback(async () => {
    setMatchesLoading(true);
    try {
      const resp = await api.get('/files/match-missing-shots');
      setMatches(resp.data.data.matches);
    } catch { /* non-critical — page works without matches */ }
    finally { setMatchesLoading(false); }
  }, []);

  useEffect(() => { load(); loadMatches(); }, [load, loadMatches]);

  async function resolveMatch(shotId: string, fileId: string) {
    setResolving(shotId);
    try {
      await api.patch(`/files/missing-shots/${shotId}`, { status: 'CAPTURED', resolvedFileId: fileId });
      toast.success('Shot marked as captured');
      setMatches((prev) => prev.filter((m) => m.shot.id !== shotId));
      load(); // refresh open shots count in summary
    } catch { toast.error('Failed to resolve shot'); }
    finally { setResolving(null); }
  }

  function dismissMatch(shotId: string) {
    setMatches((prev) => prev.filter((m) => m.shot.id !== shotId));
  }

  async function syncFolder(id: string) {
    setSyncing(id);
    try {
      const resp = await api.post(`/files/folders/${id}/sync`);
      toast.success(`Synced ${resp.data.data.synced} files`);
      load();
    } catch { toast.error('Sync failed — check your Google Drive connection'); }
    finally { setSyncing(null); }
  }

  const totalIssues = summary
    ? summary.invalidNames.count + summary.untagged.count + summary.staleFolders.count +
      summary.duplicates.count + summary.openShots.count
    : 0;

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div>
          <h1 className="font-heading font-semibold text-text-primary text-lg">Archive QA</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {lastChecked ? `Last checked ${lastChecked.toLocaleTimeString()}` : 'Scanning archive…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReportOpen(true)}
            className="btn-ghost text-sm flex items-center gap-2"
          >
            <FileDown className="w-4 h-4" /> Export Report
          </button>
          <button
            onClick={() => { load(); loadMatches(); }}
            disabled={loading}
            className="btn-ghost text-sm flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>
      </div>

      {loading && !summary ? (
        <div className="flex items-center justify-center flex-1 text-text-muted">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Scanning archive…
        </div>
      ) : summary ? (
        <div className="p-6 space-y-4 max-w-4xl">

          {/* Health summary */}
          <div className="flex items-center gap-4 p-4 bg-surface border border-border rounded-xl">
            <ShieldCheck className={cn('w-8 h-8 flex-shrink-0', totalIssues === 0 ? 'text-green-400' : 'text-amber-400')} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                {totalIssues === 0 ? 'Archive looks healthy' : `${totalIssues} issue${totalIssues !== 1 ? 's' : ''} to review`}
              </p>
              <p className="text-xs text-text-muted mt-0.5 truncate">
                {summary.invalidNames.count} invalid names · {summary.untagged.count} untagged · {summary.staleFolders.count} stale folders · {summary.duplicates.count} duplicate groups · {summary.openShots.count} open shots
              </p>
            </div>
          </div>

          {/* Invalid Names */}
          <SectionCard
            title="Invalid File Names"
            icon={<FileX className="w-4 h-4" />}
            count={summary.invalidNames.count}
            description="Files that don't match YYYYMMDD_Subject.ext"
            action={
              <Link to="/admin/files" className="text-xs text-accent hover:underline whitespace-nowrap">
                Open Files →
              </Link>
            }
          >
            {summary.invalidNames.count === 0
              ? <AllClearRow label="All files have valid names" />
              : <>
                  {summary.invalidNames.sample.map((f) => <QAFileRow key={f.id} file={f} />)}
                  {summary.invalidNames.count > 5 && (
                    <p className="text-xs text-text-muted py-2">
                      …and {(summary.invalidNames.count - 5).toLocaleString()} more — use Bulk Rename in Files to fix them all
                    </p>
                  )}
                </>
            }
          </SectionCard>

          {/* Untagged Files */}
          <SectionCard
            title="Untagged Files"
            icon={<Tag className="w-4 h-4" />}
            count={summary.untagged.count}
            description="Files with no tag assigned"
            action={
              <Link to="/admin/files" className="text-xs text-accent hover:underline whitespace-nowrap">
                Open Files →
              </Link>
            }
          >
            {summary.untagged.count === 0
              ? <AllClearRow label="All files are tagged" />
              : <>
                  {summary.untagged.sample.map((f) => <QAFileRow key={f.id} file={f} />)}
                  {summary.untagged.count > 5 && (
                    <p className="text-xs text-text-muted py-2">
                      …and {(summary.untagged.count - 5).toLocaleString()} more
                    </p>
                  )}
                </>
            }
          </SectionCard>

          {/* Stale Sync */}
          <SectionCard
            title="Stale Sync"
            icon={<Clock className="w-4 h-4" />}
            count={summary.staleFolders.count}
            description="Folders not synced in the last 7 days"
          >
            {summary.staleFolders.count === 0
              ? <AllClearRow label="All folders synced within the last 7 days" />
              : summary.staleFolders.folders.map((f) => (
                  <div key={f.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm text-text-primary">{f.name}</p>
                      <p className="text-xs text-text-muted">
                        {f.lastSyncAt
                          ? `Last synced ${new Date(f.lastSyncAt).toLocaleDateString()}`
                          : 'Never synced'
                        } · {f.fileCount.toLocaleString()} files{f.recursive ? ' · recursive' : ''}
                      </p>
                    </div>
                    <button
                      onClick={() => syncFolder(f.id)}
                      disabled={syncing !== null}
                      className="btn-ghost text-xs flex items-center gap-1.5 px-2.5 py-1.5 flex-shrink-0 ml-4"
                    >
                      {syncing === f.id
                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        : <FolderSync className="w-3.5 h-3.5" />}
                      Sync
                    </button>
                  </div>
                ))
            }
          </SectionCard>

          {/* Duplicates */}
          <SectionCard
            title="Possible Duplicates"
            icon={<Copy className="w-4 h-4" />}
            count={summary.duplicates.count}
            description="Valid-named files sharing the same date, subject &amp; location"
          >
            {summary.duplicates.count === 0
              ? <AllClearRow label="No duplicate files detected" />
              : summary.duplicates.groups.map((g, i) => (
                  <div key={i} className="py-2.5 border-b border-border last:border-0">
                    <p className="text-xs font-medium text-text-muted mb-2">
                      {g.parsedDate} · {g.parsedSubject}
                      {g.parsedLocation ? ` · ${g.parsedLocation}` : ''} —{' '}
                      <span className="text-amber-400">{g.count} copies</span>
                    </p>
                    <div className="space-y-1.5 pl-2">
                      {g.files.map((f) => (
                        <div key={f.id} className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <MediaIcon mimeType={f.mimeType} />
                            <span className="text-xs font-mono text-text-secondary truncate">{f.name}</span>
                            {f.folder && (
                              <span className="text-xs text-text-muted flex-shrink-0 hidden sm:block">
                                in {f.folder.name}
                              </span>
                            )}
                          </div>
                          <a href={f.webViewLink} target="_blank" rel="noopener noreferrer"
                            className="flex-shrink-0 text-text-muted hover:text-accent transition-colors" title="Open in Drive">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            }
          </SectionCard>

          {/* Open Missing Shots */}
          <SectionCard
            title="Open Missing Shots"
            icon={<Camera className="w-4 h-4" />}
            count={summary.openShots.count}
            description="Shots still marked NEEDED or IN_PROGRESS"
            action={
              <Link to="/admin/files/missing" className="text-xs text-accent hover:underline whitespace-nowrap">
                View All →
              </Link>
            }
          >
            {summary.openShots.count === 0
              ? <AllClearRow label="No open missing shots — all captured!" />
              : <>
                  {summary.openShots.shots.map((s) => (
                    <div key={s.id} className="flex items-start justify-between py-2 border-b border-border last:border-0 gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={cn('text-xs font-medium flex-shrink-0', priorityColor(s.priority))}>
                            {s.priority}
                          </span>
                          <span className="text-sm text-text-primary truncate">{s.subject}</span>
                          {s.vehicleMake && (
                            <span className="text-xs text-text-muted flex-shrink-0">{s.vehicleMake}</span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted mt-0.5">
                          {s.status.replace('_', ' ')} · {s.requestedBy.firstName} {s.requestedBy.lastName}
                          {s.targetShootDate
                            ? ` · Due ${new Date(s.targetShootDate).toLocaleDateString()}`
                            : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                  {summary.openShots.count > 10 && (
                    <p className="text-xs text-text-muted py-2">
                      …and {summary.openShots.count - 10} more
                    </p>
                  )}
                </>
            }
          </SectionCard>

          {/* Candidate Shot Matches */}
          <SectionCard
            title="Candidate Shot Matches"
            icon={<Link2 className="w-4 h-4" />}
            count={matchesLoading ? 0 : matches.length}
            description="Files whose name may satisfy an open missing shot"
          >
            {matchesLoading ? (
              <div className="flex items-center gap-2 py-3 text-text-muted">
                <Loader2 className="w-4 h-4 animate-spin" /> Scanning for matches…
              </div>
            ) : matches.length === 0 ? (
              <AllClearRow label="No candidate matches found" />
            ) : (
              matches.map((m) => (
                <div key={m.shot.id} className="py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={cn('text-xs font-medium flex-shrink-0', priorityColor(m.shot.priority))}>
                      {m.shot.priority}
                    </span>
                    <span className="text-sm font-medium text-text-primary">{m.shot.subject}</span>
                    {m.shot.vehicleMake && (
                      <span className="text-xs text-text-muted flex-shrink-0">{m.shot.vehicleMake}</span>
                    )}
                    <span className="text-xs text-text-muted flex-shrink-0">
                      · {m.shot.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="space-y-1.5 pl-3 border-l-2 border-accent/30 mb-2">
                    {m.files.map((f) => (
                      <div key={f.id} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <MediaIcon mimeType={f.mimeType} />
                          <span className="text-xs font-mono text-text-secondary truncate">{f.name}</span>
                          {f.folder && (
                            <span className="text-xs text-text-muted flex-shrink-0 hidden sm:block">
                              in {f.folder.name}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <a href={f.webViewLink} target="_blank" rel="noopener noreferrer"
                            className="text-text-muted hover:text-accent transition-colors" title="Open in Drive">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                          <button
                            onClick={() => resolveMatch(m.shot.id, f.id)}
                            disabled={resolving !== null}
                            className="text-xs font-medium px-2.5 py-1 rounded-md bg-green-500/10 text-green-400 hover:bg-green-500/20 transition-colors border border-green-500/20 flex items-center gap-1"
                          >
                            {resolving === m.shot.id
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : 'Resolve'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => dismissMatch(m.shot.id)}
                    className="text-xs text-text-muted hover:text-text-primary transition-colors pl-3"
                  >
                    Not a match — dismiss
                  </button>
                </div>
              ))
            )}
          </SectionCard>

        </div>
      ) : null}

      <ReportModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </div>
  );
}
