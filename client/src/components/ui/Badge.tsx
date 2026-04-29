import { cn } from '@/lib/utils';
import type { Priority } from '@/types';

export function PriorityBadge({ priority }: { priority: Priority }) {
  const classes: Record<Priority, string> = {
    LOW: 'badge-low',
    MEDIUM: 'badge-medium',
    HIGH: 'badge-high',
    URGENT: 'badge-urgent',
  };
  return <span className={classes[priority]}>{priority}</span>;
}

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('badge bg-surface-elevated text-text-secondary', className)}>{children}</span>;
}
