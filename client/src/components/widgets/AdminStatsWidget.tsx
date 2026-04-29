import { useEffect, useState } from 'react';
import { Users, FileText, Megaphone, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import api from '@/lib/api';

interface AdminStats {
  totalUsers: number;
  totalPages: number;
  activeAnnouncements: number;
}

export default function AdminStatsWidget() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/users'),
      api.get('/pages?type=GLOBAL'),
      api.get('/announcements'),
    ]).then(([users, pages, announcements]) => {
      setStats({
        totalUsers: users.data.data.users.length,
        totalPages: pages.data.data.pages.length,
        activeAnnouncements: announcements.data.data.announcements.length,
      });
    }).catch(() => {});
  }, []);

  const items = [
    { label: 'Total Users', value: stats?.totalUsers, icon: Users, color: 'text-accent' },
    { label: 'Global Pages', value: stats?.totalPages, icon: FileText, color: 'text-text-primary' },
    { label: 'Active Announcements', value: stats?.activeAnnouncements, icon: Megaphone, color: 'text-priority-high' },
    { label: 'System Status', value: '✓ OK', icon: Activity, color: 'text-priority-low', isText: true },
  ];

  return (
    <div className="p-4 flex flex-col h-full">
      <h3 className="font-heading font-semibold text-text-primary text-sm mb-3">System Stats</h3>
      <div className="grid grid-cols-2 gap-2 flex-1">
        {items.map(({ label, value, icon: Icon, color, isText }) => (
          <div key={label} className="bg-surface-elevated rounded-lg p-3 flex flex-col gap-2 border border-border">
            <Icon className={`w-4 h-4 ${color}`} />
            {stats || isText ? (
              <span className="font-heading font-bold text-xl text-text-primary">{value}</span>
            ) : (
              <Skeleton className="h-6 w-10" />
            )}
            <span className="text-xs text-text-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
