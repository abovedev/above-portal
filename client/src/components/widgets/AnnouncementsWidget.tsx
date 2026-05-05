import { useEffect, useState } from 'react';
import { ClipboardList, MessageSquare, Pin } from 'lucide-react';
import { formatDate, priorityColor } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import NoticeBoardFloater from '@/components/NoticeBoardFloater';
import type { Announcement } from '@/types';
import api from '@/lib/api';

export default function AnnouncementsWidget() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    api.get('/announcements').then((res) => {
      setAnnouncements(res.data.data.announcements);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardList className="w-4 h-4 text-accent" />
        <h3 className="font-heading font-semibold text-text-primary text-sm">Notice Board</h3>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          No notices
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto flex-1 scrollbar-hide">
          {announcements.map((a) => {
            const commentCount = a._count?.comments ?? 0;
            const topReactions = (a.reactionSummary ?? []).slice(0, 3);

            return (
              <button
                key={a.id}
                onClick={() => setOpenId(a.id)}
                className={`w-full text-left p-2.5 rounded-lg border transition-all hover:shadow-sm active:scale-[0.99] ${
                  a.priority === 'URGENT'
                    ? 'bg-priority-urgent/10 border-priority-urgent/30 hover:bg-priority-urgent/15'
                    : a.priority === 'HIGH'
                    ? 'bg-priority-high/10 border-priority-high/30 hover:bg-priority-high/15'
                    : 'bg-surface-elevated border-border hover:border-border-hover hover:bg-surface-hover'
                }`}
              >
                <div className="flex items-start gap-2">
                  {a.isPinned && (
                    <Pin className="w-3 h-3 text-text-muted flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{a.title}</p>
                    <p className="text-xs text-text-secondary line-clamp-1 mt-0.5">{a.body}</p>

                    {/* Footer: priority/date + reactions/comments */}
                    <div className="flex items-center justify-between mt-1.5">
                      <p className={`text-xs ${priorityColor(a.priority)}`}>
                        {a.priority} · {formatDate(a.createdAt, 'relative')}
                      </p>
                      <div className="flex items-center gap-2">
                        {topReactions.length > 0 && (
                          <span className="text-xs text-text-muted">
                            {topReactions.map(r => `${r.emoji}${r.count}`).join(' ')}
                          </span>
                        )}
                        {commentCount > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-text-muted">
                            <MessageSquare className="w-3 h-3" />
                            {commentCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {openId && (
        <NoticeBoardFloater
          announcementId={openId}
          onClose={() => setOpenId(null)}
        />
      )}
    </div>
  );
}
