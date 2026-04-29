import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export default function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      {Icon && (
        <div className="w-14 h-14 rounded-full bg-surface-elevated flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-text-muted" />
        </div>
      )}
      <h3 className="font-heading font-semibold text-text-primary mb-1">{title}</h3>
      {description && <p className="text-text-secondary text-sm max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
