import { cn } from '@/lib/utils';

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
