import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { toast } from 'sonner';
import { useUIStore } from '@/stores/uiStore';
import { useWidgetStore } from '@/stores/widgetStore';
import type { Widget } from '@/types';
import api from '@/lib/api';

interface ClockWidgetProps {
  widget: Widget;
}

const TIMEZONE_OPTIONS = [
  { value: 'local', label: 'Local time' },
  { value: 'Asia/Manila', label: 'Philippines' },
  { value: 'Australia/Sydney', label: 'Australia' },
];

export default function ClockWidget({ widget }: ClockWidgetProps) {
  const { boardEditMode } = useUIStore();
  const { updateWidget } = useWidgetStore();
  const [time, setTime] = useState(new Date());
  const [timezone, setTimezone] = useState((widget.settings.timezone as string) || 'local');
  const format = (widget.settings.format as string) || '12h';

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setTimezone((widget.settings.timezone as string) || 'local');
  }, [widget.settings.timezone]);

  const handleTimezoneChange = async (value: string) => {
    const previousTimezone = timezone;
    const settings = { ...widget.settings, timezone: value };
    setTimezone(value);
    updateWidget(widget.id, { settings });

    try {
      await api.put(`/widgets/${widget.id}`, { settings });
      toast.success('Clock timezone updated');
    } catch {
      setTimezone(previousTimezone);
      updateWidget(widget.id, { settings: widget.settings });
      toast.error('Failed to update timezone');
    }
  };

  const getTimeInZone = () => {
    try {
      return time.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: format === '12h',
        ...(timezone !== 'local' ? { timeZone: timezone } : {}),
      });
    } catch {
      return time.toLocaleTimeString();
    }
  };

  const getDateInZone = () => {
    try {
      return time.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        ...(timezone !== 'local' ? { timeZone: timezone } : {}),
      });
    } catch {
      return time.toLocaleDateString();
    }
  };

  return (
    <div className="p-4 flex flex-col items-center justify-center h-full gap-1">
      <Clock className="w-5 h-5 text-accent mb-2" />
      <div className="font-heading font-bold text-3xl text-text-primary tabular-nums">
        {getTimeInZone()}
      </div>
      <div className="text-text-secondary text-sm">{getDateInZone()}</div>
      {timezone !== 'local' && (
        <div className="text-text-muted text-xs mt-1 bg-surface-elevated px-2 py-0.5 rounded-full">
          {timezone}
        </div>
      )}
      {boardEditMode && (
        <select
          value={timezone}
          onChange={(e) => handleTimezoneChange(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="mt-2 w-full max-w-44 bg-surface-elevated border border-border rounded-lg px-2 py-1 text-xs text-text-secondary focus:outline-none focus:border-accent"
          aria-label="Clock timezone"
        >
          {TIMEZONE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
