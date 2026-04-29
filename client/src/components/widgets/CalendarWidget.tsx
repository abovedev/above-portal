import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, ExternalLink } from 'lucide-react';
import { useGoogleStatus, connectGoogle } from '@/hooks/useGoogleStatus';
import api from '@/lib/api';

interface CalendarEvent {
  id: string;
  title: string;
  start: string | null;
  end: string | null;
  location: string | null;
  htmlLink: string | null;
  allDay: boolean;
  colorId: string | null;
}

const COLOR_MAP: Record<string, string> = {
  '1': '#7986cb', '2': '#33b679', '3': '#8e24aa', '4': '#e67c73',
  '5': '#f6c026', '6': '#f5511d', '7': '#039be5', '8': '#616161',
  '9': '#3f51b5', '10': '#0b8043', '11': '#d60000',
};

function formatEventTime(start: string | null, allDay: boolean): string {
  if (!start) return '';
  if (allDay) {
    const d = new Date(start + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  const d = new Date(start);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `Today ${timeStr}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow ${timeStr}`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ` ${timeStr}`;
}

function MiniCalendar() {
  const [date, setDate] = useState(new Date());
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const monthName = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const days = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <button onClick={() => setDate(new Date(year, month - 1, 1))} className="text-text-muted hover:text-text-primary p-0.5">
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-medium text-text-primary flex-1 text-center">{monthName}</span>
        <button onClick={() => setDate(new Date(year, month + 1, 1))} className="text-text-muted hover:text-text-primary p-0.5">
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d) => (
          <div key={d} className="text-center text-[10px] text-text-muted font-medium py-0.5">{d}</div>
        ))}
        {cells.map((day, idx) => {
          const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
          return (
            <div key={idx} className={`text-center text-[11px] py-0.5 rounded ${
              !day ? '' : isToday
                ? 'bg-accent text-white font-bold rounded-full'
                : 'text-text-secondary hover:bg-surface-hover'
            }`}>
              {day ?? ''}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CalendarWidget() {
  const { status, loading: statusLoading } = useGoogleStatus();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  useEffect(() => {
    if (!status?.connected) return;
    setEventsLoading(true);
    api.get('/google/calendar/events')
      .then((res) => setEvents(res.data.data.events))
      .catch(() => {})
      .finally(() => setEventsLoading(false));
  }, [status?.connected]);

  const handleConnect = () => connectGoogle();

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-accent" />
          <span className="font-heading font-semibold text-text-primary text-sm">Calendar</span>
        </div>
        {status?.connected && (
          <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer"
            className="p-1 text-text-muted hover:text-text-primary transition-colors rounded">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      <div className="flex-shrink-0 mb-3">
        <MiniCalendar />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {statusLoading || eventsLoading ? (
          <div className="space-y-2 pt-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse flex gap-2">
                <div className="w-1 rounded-full bg-surface-elevated flex-shrink-0 h-10" />
                <div className="flex-1 space-y-1.5 py-0.5">
                  <div className="h-3 bg-surface-elevated rounded w-2/3" />
                  <div className="h-2.5 bg-surface-elevated rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : !status?.connected ? (
          <div className="flex flex-col items-center gap-2 pt-2">
            <p className="text-xs text-text-muted text-center">Connect Google to see upcoming events</p>
            <button onClick={handleConnect}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border hover:border-accent/40 hover:bg-accent-muted transition-all text-text-secondary">
              <svg className="w-3 h-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Connect Google
            </button>
          </div>
        ) : events.length === 0 ? (
          <p className="text-xs text-text-muted text-center pt-2">No upcoming events</p>
        ) : (
          <div className="space-y-2 pt-1">
            {events.map((event) => {
              const color = event.colorId ? COLOR_MAP[event.colorId] : '#6366f1';
              return (
                <a key={event.id} href={event.htmlLink ?? 'https://calendar.google.com'}
                  target="_blank" rel="noopener noreferrer"
                  className="flex gap-2 group hover:bg-surface-hover rounded-lg p-1 -mx-1 transition-colors">
                  <div className="w-1 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: color, minHeight: '2rem' }} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-text-primary truncate group-hover:text-accent transition-colors">
                      {event.title}
                    </p>
                    <p className="text-[10px] text-text-muted">{formatEventTime(event.start, event.allDay)}</p>
                    {event.location && <p className="text-[10px] text-text-muted truncate">{event.location}</p>}
                  </div>
                </a>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
