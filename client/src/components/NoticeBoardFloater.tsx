import { useState, useEffect, useRef, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X, Pin, Trash2, Smile, Send, Loader2, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Modal from '@/components/ui/Modal';
import Avatar from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDate, priorityColor } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import api from '@/lib/api';
import type { AnnouncementDetail } from '@/types';

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

type MentionUser = {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
};

interface Props {
  announcementId: string;
  onClose: () => void;
}

export default function NoticeBoardFloater({ announcementId, onClose }: Props) {
  const { user } = useAuthStore();
  const [detail, setDetail] = useState<AnnouncementDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [commentText, setCommentText] = useState('');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const [reacting, setReacting] = useState<string | null>(null);
  const [showEmojiBar, setShowEmojiBar] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionDebounce = useRef<ReturnType<typeof setTimeout>>();

  const loadDetail = useCallback(async () => {
    try {
      const res = await api.get(`/announcements/${announcementId}`);
      setDetail(res.data.data.announcement);
    } catch {
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [announcementId]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  useEffect(() => {
    if (mentionStart === null) { setMentionUsers([]); return; }
    clearTimeout(mentionDebounce.current);
    mentionDebounce.current = setTimeout(async () => {
      try {
        const res = await api.get('/users/mentions', { params: { q: mentionQuery } });
        setMentionUsers(res.data.data.users);
      } catch { setMentionUsers([]); }
    }, 150);
    return () => clearTimeout(mentionDebounce.current);
  }, [mentionQuery, mentionStart]);

  const handleCommentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const cursor = e.target.selectionStart ?? text.length;
    setCommentText(text);

    if (mentionStart !== null) {
      if (cursor <= mentionStart) {
        setMentionStart(null);
        setMentionUsers([]);
      } else {
        const q = text.slice(mentionStart + 1, cursor);
        if (q.includes('\n')) {
          setMentionStart(null);
          setMentionUsers([]);
        } else {
          setMentionQuery(q);
        }
      }
    } else if (text[cursor - 1] === '@') {
      setMentionStart(cursor - 1);
      setMentionQuery('');
    }
  };

  const selectMention = (u: MentionUser) => {
    if (mentionStart === null || !textareaRef.current) return;
    const cursor = textareaRef.current.selectionStart ?? commentText.length;
    const insertion = `@${u.firstName} ${u.lastName} `;
    const newText = commentText.slice(0, mentionStart) + insertion + commentText.slice(cursor);
    setCommentText(newText);
    setMentionedUserIds((prev) => [...new Set([...prev, u.id])]);
    setMentionStart(null);
    setMentionUsers([]);
    const newCursor = mentionStart + insertion.length;
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(newCursor, newCursor);
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && mentionStart !== null) {
      e.preventDefault();
      setMentionStart(null);
      setMentionUsers([]);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey && mentionStart === null) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const handleSubmitComment = async () => {
    const text = commentText.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      await api.post(`/announcements/${announcementId}/comments`, {
        content: text,
        mentionedUserIds,
      });
      setCommentText('');
      setMentionedUserIds([]);
      await loadDetail();
    } catch {
      // silent — user sees no change, can retry
    } finally {
      setSubmitting(false);
    }
  };

  const handleReaction = async (emoji: string) => {
    if (reacting) return;
    setReacting(emoji);
    try {
      const res = await api.post(`/announcements/${announcementId}/reactions`, { emoji });
      setDetail((prev) =>
        prev
          ? { ...prev, reactions: res.data.data.reactions, reactionSummary: res.data.data.reactionSummary }
          : prev
      );
    } catch {
      // silent
    } finally {
      setReacting(null);
      setShowEmojiBar(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.delete(`/announcements/${announcementId}/comments/${commentId}`);
      setDetail((prev) =>
        prev ? { ...prev, comments: prev.comments.filter((c) => c.id !== commentId) } : prev
      );
    } catch {
      // silent
    }
  };

  return (
    <Modal open onClose={onClose} size="xl">
      {loading ? (
        <div className="space-y-3 py-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : !detail ? (
        <p className="text-text-muted text-sm text-center py-8">Could not load this notice.</p>
      ) : (
        <div className="overflow-y-auto max-h-[75vh] -mx-4 -mt-4 px-4 pt-4 space-y-5 pb-1">
          {/* Header row: title + close */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                {detail.isPinned && (
                  <Pin className="w-4 h-4 text-text-muted flex-shrink-0 mt-1" />
                )}
                <h2 className="font-heading font-semibold text-text-primary text-lg leading-snug">
                  {detail.title}
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-text-muted flex-wrap mt-1.5">
                <Avatar
                  src={detail.createdBy.avatar}
                  firstName={detail.createdBy.firstName}
                  lastName={detail.createdBy.lastName}
                  size="xs"
                />
                <span>{detail.createdBy.firstName} {detail.createdBy.lastName}</span>
                <span>·</span>
                <span>{formatDate(detail.createdAt, 'short')}</span>
                <span>·</span>
                <span className={priorityColor(detail.priority)}>{detail.priority}</span>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                className="flex-shrink-0 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg p-1.5 transition-all"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </Dialog.Close>
          </div>

          {/* Body */}
          <p className="text-text-secondary text-sm whitespace-pre-wrap leading-relaxed">
            {detail.body}
          </p>

          {/* Reactions */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center gap-2 flex-wrap">
              {(detail.reactionSummary ?? []).map(({ emoji, count, userIds }) => {
                const reacted = user ? userIds.includes(user.id) : false;
                return (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    disabled={!!reacting}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-sm transition-all ${
                      reacted
                        ? 'bg-accent-muted border-accent/40 text-text-primary'
                        : 'border-border text-text-secondary hover:border-border-hover'
                    }`}
                  >
                    <span>{emoji}</span>
                    <span className="text-xs font-medium">{count}</span>
                  </button>
                );
              })}

              <div className="relative">
                <button
                  onClick={() => setShowEmojiBar((v) => !v)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-border text-text-muted text-xs hover:border-border-hover hover:text-text-secondary transition-all"
                >
                  <Smile className="w-3.5 h-3.5" />
                  <span>React</span>
                </button>
                <AnimatePresence>
                  {showEmojiBar && (
                    <motion.div
                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      transition={{ duration: 0.1 }}
                      className="absolute bottom-full mb-1 left-0 flex gap-1 bg-surface border border-border rounded-xl p-1.5 shadow-card-hover z-10"
                    >
                      {REACTION_EMOJIS.map((e) => (
                        <button
                          key={e}
                          onClick={() => handleReaction(e)}
                          className="text-lg w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-elevated transition-colors"
                        >
                          {e}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Comments */}
          <div className="border-t border-border pt-4 space-y-4 pb-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-text-muted" />
              <span className="text-sm font-medium text-text-primary">
                Comments
                {detail.comments.length > 0 && (
                  <span className="text-text-muted font-normal ml-1">({detail.comments.length})</span>
                )}
              </span>
            </div>

            {detail.comments.length === 0 && (
              <p className="text-xs text-text-muted">No comments yet. Be the first.</p>
            )}

            <div className="space-y-4">
              {detail.comments.map((c) => {
                const canDelete = user && (c.userId === user.id || user.role === 'ADMIN');
                return (
                  <div key={c.id} className="flex gap-2.5 group">
                    <Avatar
                      src={c.user.avatar}
                      firstName={c.user.firstName}
                      lastName={c.user.lastName}
                      size="xs"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="text-xs font-medium text-text-primary">
                          {c.user.firstName} {c.user.lastName}
                        </span>
                        <span className="text-xs text-text-muted">
                          {formatDate(c.createdAt, 'relative')}
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary leading-relaxed">{c.content}</p>
                    </div>
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-priority-urgent transition-all flex-shrink-0 p-0.5 mt-0.5"
                        title="Delete comment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Comment input */}
            <div className="flex gap-2.5 items-start mt-3">
              {user && (
                <Avatar
                  src={user.avatar}
                  firstName={user.firstName}
                  lastName={user.lastName}
                  size="xs"
                />
              )}
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={commentText}
                  onChange={handleCommentChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Add a comment… type @ to mention someone"
                  rows={2}
                  disabled={submitting}
                  className="input resize-none w-full text-sm pr-9"
                  style={{ fieldSizing: 'content' } as React.CSSProperties}
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={!commentText.trim() || submitting}
                  className="absolute right-2 bottom-2 text-accent disabled:opacity-30 transition-opacity"
                  title="Send (Enter)"
                >
                  {submitting
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Send className="w-4 h-4" />}
                </button>

                {/* @mention dropdown */}
                <AnimatePresence>
                  {mentionStart !== null && mentionUsers.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      transition={{ duration: 0.1 }}
                      className="absolute bottom-full mb-1 left-0 w-56 bg-surface border border-border rounded-lg shadow-card-hover z-20 overflow-hidden"
                    >
                      {mentionUsers.map((u) => (
                        <button
                          key={u.id}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectMention(u);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-text-secondary hover:bg-surface-elevated hover:text-text-primary transition-colors"
                        >
                          <Avatar src={u.avatar} firstName={u.firstName} lastName={u.lastName} size="xs" />
                          <span>{u.firstName} {u.lastName}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
