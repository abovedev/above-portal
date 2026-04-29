import { useEffect, useState } from 'react';
import { Megaphone, Pin } from 'lucide-react';
import { formatDate, priorityColor } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Announcement } from '@/types';
import api from '@/lib/api';

export default function AnnouncementsWidget() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/announcements').then((res) => {
      setAnnouncements(res.data.data.announcements);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="p-4 flex flex-col h-full">
      <div className="flex items-center gap-2 mb-3">
        <Megaphone className="w-4 h-4 text-accent" />
        <h3 className="font-heading font-semibold text-text-primary text-sm">Announcements</h3>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          No announcements
        </div>
      ) : (
        <div className="space-y-2 overflow-y-auto flex-1 scrollbar-hide">
          {announcements.map((a) => (
            <div
              key={a.id}
              className={`p-2.5 rounded-lg border ${
                a.priority === 'URGENT'
                  ? 'bg-priority-urgent/10 border-priority-urgent/30'
                  : a.priority === 'HIGH'
                  ? 'bg-priority-high/10 border-priority-high/30'
                  : 'bg-surface-elevated border-border'
              }`}
            >
              <div className="flex items-start gap-2">
                {a.isPinned && <Pin className="w-3 h-3 text-text-muted flex-shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{a.title}</p>
                  <p className="text-xs text-text-secondary line-clamp-2 mt-0.5">{a.body}</p>
                  <p className={`text-xs mt-1 ${priorityColor(a.priority)}`}>
                    {a.priority} · {formatDate(a.createdAt, 'relative')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
