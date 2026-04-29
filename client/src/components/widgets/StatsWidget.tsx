import { useEffect, useState } from 'react';
import { FileText, CheckSquare, Bell } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import api from '@/lib/api';

interface Stats {
  assignedPages: number;
  completedTasks: number;
  unreadNotifications: number;
}

export default function StatsWidget() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/pages/assigned'),
      api.get('/tasks'),
      api.get('/notifications'),
    ]).then(([pages, tasks, notifs]) => {
      setStats({
        assignedPages: pages.data.data.pages.length,
        completedTasks: tasks.data.data.tasks.filter((t: { isCompleted: boolean }) => t.isCompleted).length,
        unreadNotifications: notifs.data.data.unreadCount,
      });
    }).catch(() => {});
  }, []);

  const items = [
    { label: 'Assigned Pages', value: stats?.assignedPages, icon: FileText, color: 'text-accent' },
    { label: 'Tasks Done', value: stats?.completedTasks, icon: CheckSquare, color: 'text-priority-low' },
    { label: 'Unread Alerts', value: stats?.unreadNotifications, icon: Bell, color: 'text-priority-high' },
  ];

  return (
    <div className="p-4 flex flex-col h-full">
      <h3 className="font-heading font-semibold text-text-primary text-sm mb-3">My Stats</h3>
      <div className="grid grid-cols-3 gap-2 flex-1">
        {items.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-surface-elevated rounded-lg p-3 flex flex-col items-center justify-center gap-1 border border-border">
            <Icon className={`w-5 h-5 ${color}`} />
            {stats ? (
              <span className="font-heading font-bold text-xl text-text-primary">{value}</span>
            ) : (
              <Skeleton className="h-6 w-8" />
            )}
            <span className="text-xs text-text-muted text-center leading-tight">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
