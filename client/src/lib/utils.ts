import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, format: 'short' | 'long' | 'relative' = 'short') {
  const d = new Date(date);
  if (format === 'relative') {
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
    return d.toLocaleDateString();
  }
  if (format === 'long') {
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

export function priorityColor(priority: string) {
  switch (priority) {
    case 'LOW': return 'text-priority-low';
    case 'MEDIUM': return 'text-priority-medium';
    case 'HIGH': return 'text-priority-high';
    case 'URGENT': return 'text-priority-urgent';
    default: return 'text-text-muted';
  }
}

export function priorityBadgeClass(priority: string) {
  switch (priority) {
    case 'LOW': return 'badge-low';
    case 'MEDIUM': return 'badge-medium';
    case 'HIGH': return 'badge-high';
    case 'URGENT': return 'badge-urgent';
    default: return 'badge';
  }
}

export function slugify(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
