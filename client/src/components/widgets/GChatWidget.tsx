import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, ArrowLeft, Send, RefreshCw, Link2 } from 'lucide-react';
import { useGoogleStatus, connectGoogle, reconnectGoogle } from '@/hooks/useGoogleStatus';
import api from '@/lib/api';

interface ChatSpace {
  name: string;
  displayName: string;
  type: string;
}

interface ChatMessage {
  name: string;
  text: string;
  sender: string;
  senderType: string;
  createTime: string;
}

function relativeTime(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function GoogleConnectPrompt({ onConnect }: { onConnect: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-6">
      <div className="w-12 h-12 rounded-xl bg-surface-elevated flex items-center justify-center">
        <MessageSquare className="w-6 h-6 text-text-muted" />
      </div>
      <div className="text-center">
        <p className="font-medium text-text-primary text-sm mb-1">Connect Google Chat</p>
        <p className="text-xs text-text-muted">Sign in with Google to access your chats</p>
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

export default function GChatWidget() {
  const { status, loading } = useGoogleStatus();
  const [spaces, setSpaces] = useState<ChatSpace[]>([]);
  const [spacesLoading, setSpacesLoading] = useState(false);
  const [selectedSpace, setSelectedSpace] = useState<ChatSpace | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sendText, setSendText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);
  const [needsChatConfig, setNeedsChatConfig] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const spaceId = selectedSpace?.name?.split('/')[1];

  const fetchSpaces = useCallback(async () => {
    setSpacesLoading(true);
    setError(null);
    setNeedsReconnect(false);
    setNeedsChatConfig(false);
    try {
      const res = await api.get('/google/chat/spaces', { params: { t: Date.now() } });
      setSpaces(res.data.data.spaces);
      if (res.data.data.needsReconnect) {
        setNeedsReconnect(true);
        setError('Reconnect Google to grant permission to show direct message names.');
      }
    } catch (err: any) {
      const status = err.response?.status;
      const code = err.response?.data?.code;
      const message = err.response?.data?.error;
      if (code === 'GOOGLE_CHAT_APP_NOT_CONFIGURED') {
        setNeedsChatConfig(true);
        setError('Google Chat API is enabled, but the Chat app configuration has not been saved in Google Cloud Console.');
      } else if (code === 'GOOGLE_RECONNECT_REQUIRED' || status === 401 || status === 403) {
        setNeedsReconnect(true);
        setError(message || 'Reconnect Google to grant Google Chat permissions.');
      } else {
        setError(message || 'Failed to load spaces');
      }
    } finally {
      setSpacesLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (id: string) => {
    setMessagesLoading(true);
    try {
      const res = await api.get(`/google/chat/spaces/${id}/messages`);
      setMessages(res.data.data.messages);
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === 'GOOGLE_CHAT_APP_NOT_CONFIGURED') {
        setNeedsChatConfig(true);
        setError('Google Chat API is enabled, but the Chat app configuration has not been saved in Google Cloud Console.');
        setSelectedSpace(null);
      } else if (code === 'GOOGLE_RECONNECT_REQUIRED') {
        setNeedsReconnect(true);
        setError(err.response?.data?.error || 'Reconnect Google to grant Google Chat permissions.');
        setSelectedSpace(null);
      }
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status?.connected) fetchSpaces();
  }, [status?.connected, fetchSpaces]);

  useEffect(() => {
    if (spaceId) fetchMessages(spaceId);
  }, [spaceId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!sendText.trim() || !spaceId || sending) return;
    const text = sendText.trim();
    setSendText('');
    setSending(true);
    try {
      await api.post(`/google/chat/spaces/${spaceId}/messages`, { text });
      await fetchMessages(spaceId);
    } catch (err: any) {
      const code = err.response?.data?.code;
      if (code === 'GOOGLE_CHAT_APP_NOT_CONFIGURED') {
        setNeedsChatConfig(true);
        setError('Google Chat API is enabled, but the Chat app configuration has not been saved in Google Cloud Console.');
      } else if (code === 'GOOGLE_RECONNECT_REQUIRED') {
        setNeedsReconnect(true);
        setError(err.response?.data?.error || 'Reconnect Google to grant Google Chat permissions.');
      }
      setSendText(text);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <MessageSquare className="w-4 h-4 text-accent" />
          <span className="font-heading font-semibold text-text-primary text-sm">Google Chat</span>
        </div>
        <div className="flex-1 px-4 pt-2 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse h-10 bg-surface-elevated rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-4 pt-4 pb-2">
          <MessageSquare className="w-4 h-4 text-accent" />
          <span className="font-heading font-semibold text-text-primary text-sm">Google Chat</span>
        </div>
        <GoogleConnectPrompt onConnect={connectGoogle} />
      </div>
    );
  }

  /* ── Space list ── */
  if (!selectedSpace) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 pt-4 pb-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-accent" />
            <span className="font-heading font-semibold text-text-primary text-sm">Google Chat</span>
          </div>
          <button
            onClick={fetchSpaces}
            disabled={spacesLoading}
            className="p-1 text-text-muted hover:text-text-primary transition-colors rounded"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${spacesLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {spacesLoading ? (
            <div className="px-4 space-y-2 pt-1">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse h-10 bg-surface-elevated rounded-lg" />
              ))}
            </div>
          ) : error && spaces.length === 0 ? (
            <div className="px-4 pt-3 text-xs text-text-muted text-center leading-relaxed">
              <p>{error}</p>
              {needsChatConfig && (
                <>
                  <p className="mt-2">
                    Open Google Chat API Configuration, fill App name, Avatar URL, and Description, turn interactive features off, then Save.
                  </p>
                  <a
                    href="https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary text-xs mt-3 mx-auto"
                  >
                    Configure Chat API
                  </a>
                  <button
                    onClick={reconnectGoogle}
                    className="btn-ghost text-xs mt-2 mx-auto"
                  >
                    <Link2 className="w-3.5 h-3.5" /> Reconnect after saving
                  </button>
                </>
              )}
              {needsReconnect && (
                <button
                  onClick={reconnectGoogle}
                  className="btn-primary text-xs mt-3 mx-auto"
                >
                  <Link2 className="w-3.5 h-3.5" /> Reconnect Google
                </button>
              )}
            </div>
          ) : error && needsReconnect ? (
            <div className="px-3 pt-2">
              <div className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs text-text-muted">
                <p>{error}</p>
                <button
                  onClick={reconnectGoogle}
                  className="btn-primary text-xs mt-2"
                >
                  <Link2 className="w-3.5 h-3.5" /> Reconnect Google
                </button>
              </div>
            </div>
          ) : spaces.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-text-muted">
              No spaces found
            </div>
          ) : (
            <div className="px-2 pt-1 space-y-0.5">
              {spaces.map((space) => (
                <button
                  key={space.name}
                  onClick={() => setSelectedSpace(space)}
                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-surface-hover transition-colors flex items-center gap-2.5 group"
                >
                  <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <MessageSquare className="w-3.5 h-3.5 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate group-hover:text-accent transition-colors">
                      {space.displayName}
                    </p>
                    <p className="text-[10px] text-text-muted capitalize">{(space.type ?? '').toLowerCase().replace(/_/g, ' ')}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ── Message thread ── */
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2 flex-shrink-0 border-b border-border/40">
        <button
          onClick={() => { setSelectedSpace(null); setMessages([]); }}
          className="p-0.5 text-text-muted hover:text-text-primary transition-colors rounded"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <MessageSquare className="w-4 h-4 text-accent" />
        <span className="font-heading font-semibold text-text-primary text-sm truncate flex-1">
          {selectedSpace.displayName}
        </span>
        <button
          onClick={() => spaceId && fetchMessages(spaceId)}
          disabled={messagesLoading}
          className="p-1 text-text-muted hover:text-text-primary transition-colors rounded"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${messagesLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 px-3 py-2 space-y-2">
        {messagesLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="animate-pulse flex gap-2">
              <div className="w-6 h-6 rounded-full bg-surface-elevated flex-shrink-0" />
              <div className="flex-1 space-y-1.5 pt-0.5">
                <div className="h-2.5 bg-surface-elevated rounded w-1/4" />
                <div className="h-3 bg-surface-elevated rounded w-3/4" />
              </div>
            </div>
          ))
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-xs text-text-muted">
            No messages yet
          </div>
        ) : (
          messages.map((msg) => {
            const isBot = msg.senderType === 'BOT';
            const initials = msg.sender.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
            return (
              <div key={msg.name} className="flex gap-2 group">
                <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white mt-0.5 ${isBot ? 'bg-surface-elevated' : 'bg-accent/70'}`}>
                  {isBot ? <MessageSquare className="w-3 h-3 text-text-muted" /> : initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[11px] font-semibold text-text-primary">{msg.sender}</span>
                    <span className="text-[10px] text-text-muted">{relativeTime(msg.createTime)}</span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 px-3 pb-3 pt-2 border-t border-border/40">
        <div className="flex gap-2 items-end">
          <textarea
            value={sendText}
            onChange={(e) => setSendText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message..."
            rows={1}
            className="flex-1 text-xs bg-surface-elevated border border-border rounded-lg px-3 py-2 text-text-primary placeholder-text-muted resize-none focus:outline-none focus:border-accent/60 transition-colors min-h-[32px] max-h-[80px]"
            style={{ fieldSizing: 'content' } as React.CSSProperties}
          />
          <button
            onClick={handleSend}
            disabled={!sendText.trim() || sending}
            className="p-2 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="text-[10px] text-text-muted/50 mt-1 text-center">Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
