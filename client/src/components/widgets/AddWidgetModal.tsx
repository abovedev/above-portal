import Modal from '@/components/ui/Modal';
import { Clock, Megaphone, CheckSquare, Link2, StickyNote, BarChart2, CalendarDays, Activity, Mail, MessageSquare, Sparkles } from 'lucide-react';
import type { WidgetType } from '@/types';

const WIDGET_OPTIONS: { type: WidgetType; label: string; desc: string; icon: React.ElementType; adminOnly?: boolean }[] = [
  { type: 'CLOCK', label: 'Clock', desc: 'Live digital clock with timezone selection', icon: Clock },
  { type: 'ANNOUNCEMENTS', label: 'Notice Board', desc: 'Company notices with comments and reactions', icon: Megaphone },
  { type: 'TASKS', label: 'My Tasks', desc: 'Personal to-do list', icon: CheckSquare },
  { type: 'QUICK_LINKS', label: 'Quick Links', desc: 'Bookmarks and shortcuts', icon: Link2 },
  { type: 'NOTES', label: 'Notes', desc: 'Sticky notepad (autosaves)', icon: StickyNote },
  { type: 'STATS', label: 'My Stats', desc: 'Pages, tasks, and notifications summary', icon: BarChart2 },
  { type: 'CALENDAR', label: 'Google Calendar', desc: 'Upcoming events from Google Calendar', icon: CalendarDays },
  { type: 'GMAIL', label: 'Gmail', desc: 'Recent inbox threads from Gmail', icon: Mail },
  { type: 'GCHAT', label: 'Google Chat', desc: 'Quick launcher for Google Chat', icon: MessageSquare },
  { type: 'AI_CHAT', label: 'AD Brain', desc: "Above Digital's internal AI assistant", icon: Sparkles },
  { type: 'SYSTEM_STATS', label: 'System Stats', desc: 'Admin-level system metrics', icon: Activity, adminOnly: true },
];

interface AddWidgetModalProps {
  open: boolean;
  onClose: () => void;
  onAdd: (type: WidgetType) => void;
  existingTypes: WidgetType[];
  isAdmin?: boolean;
}

export default function AddWidgetModal({ open, onClose, onAdd, existingTypes, isAdmin }: AddWidgetModalProps) {
  const available = WIDGET_OPTIONS.filter((w) => {
    if (w.adminOnly && !isAdmin) return false;
    return true;
  });

  return (
    <Modal open={open} onClose={onClose} title="Add Widget" size="lg">
      <div className="grid grid-cols-2 gap-3">
        {available.map(({ type, label, desc, icon: Icon }) => {
          const added = existingTypes.includes(type);
          return (
            <button
              key={type}
              onClick={() => { if (!added) { onAdd(type); onClose(); } }}
              disabled={added}
              className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
                added
                  ? 'opacity-40 cursor-not-allowed border-border'
                  : 'border-border hover:border-accent/40 hover:bg-accent-muted cursor-pointer'
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-surface-elevated flex items-center justify-center flex-shrink-0">
                <Icon className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="font-medium text-text-primary text-sm">{label}</p>
                <p className="text-xs text-text-muted">{desc}</p>
                {added && <p className="text-xs text-accent mt-0.5">Already on board</p>}
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
