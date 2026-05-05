import type { Widget } from '@/types';
import ClockWidget from './ClockWidget';
import AnnouncementsWidget from './AnnouncementsWidget';
import TasksWidget from './TasksWidget';
import QuickLinksWidget from './QuickLinksWidget';
import NotesWidget from './NotesWidget';
import StatsWidget from './StatsWidget';
import CalendarWidget from './CalendarWidget';
import AdminStatsWidget from './AdminStatsWidget';
import GmailWidget from './GmailWidget';
import GChatWidget from './GChatWidget';
import AIChatWidget from './AIChatWidget';

interface WidgetRendererProps {
  widget: Widget;
}

export default function WidgetRenderer({ widget }: WidgetRendererProps) {
  switch (widget.type) {
    case 'CLOCK': return <ClockWidget widget={widget} />;
    case 'ANNOUNCEMENTS': return <AnnouncementsWidget />;
    case 'TASKS': return <TasksWidget />;
    case 'QUICK_LINKS': return <QuickLinksWidget />;
    case 'NOTES': return <NotesWidget />;
    case 'STATS': return <StatsWidget />;
    case 'CALENDAR': return <CalendarWidget />;
    case 'SYSTEM_STATS': return <AdminStatsWidget />;
    case 'GMAIL': return <GmailWidget />;
    case 'GCHAT': return <GChatWidget />;
    case 'AI_CHAT': return <AIChatWidget />;
    case 'RECENT_ACTIVITY': return (
      <div className="p-4 text-text-muted text-sm flex items-center justify-center h-full">
        Recent Activity
      </div>
    );
    default: return (
      <div className="p-4 text-text-muted text-sm flex items-center justify-center h-full">
        {widget.title}
      </div>
    );
  }
}
