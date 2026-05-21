import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton', className)} />;
}

export function WidgetSkeleton() {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}

export function PageCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <Skeleton className="h-32 rounded-none" />
      <div className="p-4 space-y-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function EmptyState({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-surface-hover flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-text-muted" />
      </div>
      <p className="text-sm font-medium text-text-primary">{title}</p>
      {description && <p className="text-xs text-text-muted mt-1 max-w-xs">{description}</p>}
    </div>
  );
}
