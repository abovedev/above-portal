import { useEffect, useState, useCallback } from 'react';
import { Mail, RefreshCw, ExternalLink } from 'lucide-react';
import { useGoogleStatus, connectGoogle } from '@/hooks/useGoogleStatus';
import api from '@/lib/api';

interface GmailThread {
  id: string;
  subject: string;
  from: { name: string; email: string };
  date: string;
  snippet: string;
  isUnread: boolean;
  messageCount: number;
}

function relativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 7 * 86400) return date.toLocaleDateString('en-AU', { weekday: 'short' });
  return date.toLocaleDateString('en-AU', { month: 'short', day: 'numeric' });
}

function GoogleConnectPrompt({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
      <div className="w-12 h-12 rounded-xl bg-surface-elevated flex items-center justify-center">
        <Mail className="w-6 h-6 text-text-muted" />
      </div>
      <div className="text-center">
        <p className="font-medium text-text-primary text-sm mb-1">Connect Gmail</p>
        <p className="text-xs text-text-muted">Sign in with Google to see your inbox</p>
      </div>
      <button
        onClick={onConnect}
        className="flex items-center gap-2.5 px-4 py-2 rounded-lg border border-border bg-surface-elevated hover:bg-surface-hover hover:border-border-hover transition-all text-sm font-medium text-text-primary"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        Sign in with Google
      </button>
    </div>
  );
}

export default function GmailWidget() {
  const { status, loading: statusLoading } = useGoogleStatus();
  const [threads, setThreads] = useState<GmailThread[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchThreads = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await api.get('/google/gmail/threads');
      setThreads(res.data.data.threads);
    } catch (err: unknown) {
      const status = (err as { response?: { status: number } })?.response?.status;
      if (status !== 401) setError('Failed to load emails');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (status?.connected) fetchThreads();
  }, [status?.connected, fetchThreads]);

  const handleConnect = () => connectGoogle();

  const openThread = (id: string) => {
    window.open(`https://mail.google.com/mail/u/0/#inbox/${id}`, '_blank', 'noopener');
  };

  if (statusLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-accent" />
            <span className="font-heading font-semibold text-text-primary text-sm">Gmail</span>
          </div>
        </div>
        <div className="flex-1 px-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse flex gap-2 py-2 border-b border-border/50">
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-surface-elevated rounded w-1/3" />
                <div className="h-3 bg-surface-elevated rounded w-3/4" />
                <div className="h-2.5 bg-surface-elevated rounded w-full" />
              </div>
              <div className="h-2.5 bg-surface-elevated rounded w-8 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <Mail className="w-4 h-4 text-accent" />
          <span className="font-heading font-semibold text-text-primary text-sm">Gmail</span>
        </div>
        <GoogleConnectPrompt onConnect={handleConnect} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-accent" />
          <span className="font-heading font-semibold text-text-primary text-sm">Gmail</span>
          {status.email && (
            <span className="text-xs text-text-muted truncate max-w-[120px]">{status.email}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => fetchThreads(true)}
            disabled={refreshing}
            className="p-1 text-text-muted hover:text-text-primary transition-colors rounded"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <a
            href="https://mail.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1 text-text-muted hover:text-text-primary transition-colors rounded"
            title="Open Gmail"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="px-4 space-y-0">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse py-2.5 border-b border-border/40">
                <div className="flex justify-between mb-1">
                  <div className="h-3 bg-surface-elevated rounded w-1/3" />
                  <div className="h-2.5 bg-surface-elevated rounded w-8" />
                </div>
                <div className="h-3 bg-surface-elevated rounded w-2/3 mb-1" />
                <div className="h-2.5 bg-surface-elevated rounded w-full" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full text-sm text-text-muted px-4 text-center">
            {error}
          </div>
        ) : threads.length === 0 ? (
          <div className="flex items-center justify-center h-full text-sm text-text-muted">
            Inbox is empty
          </div>
        ) : (
          <div>
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => openThread(thread.id)}
                className="w-full text-left px-4 py-2.5 border-b border-border/40 hover:bg-surface-hover transition-colors group"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {thread.isUnread && (
                      <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0 mt-1" />
                    )}
                    <span className={`text-xs truncate ${thread.isUnread ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                      {thread.from.name || thread.from.email}
                    </span>
                    {thread.messageCount > 1 && (
                      <span className="text-[10px] text-text-muted flex-shrink-0">({thread.messageCount})</span>
                    )}
                  </div>
                  <span className="text-[10px] text-text-muted flex-shrink-0 mt-0.5">
                    {relativeDate(thread.date)}
                  </span>
                </div>
                <p className={`text-xs mt-0.5 truncate ${thread.isUnread ? 'font-medium text-text-primary' : 'text-text-secondary'}`}>
                  {thread.subject}
                </p>
                <p className="text-[11px] text-text-muted truncate mt-0.5 leading-relaxed">
                  {thread.snippet}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
