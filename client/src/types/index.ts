export type Role = 'USER' | 'ADMIN';
export type PageType = 'GLOBAL' | 'PERSONAL';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type NotificationType = 'PAGE_ASSIGNED' | 'ANNOUNCEMENT' | 'SYSTEM' | 'TASK_REMINDER';

export type WidgetType =
  | 'CLOCK'
  | 'WEATHER'
  | 'ANNOUNCEMENTS'
  | 'QUICK_LINKS'
  | 'TASKS'
  | 'CALENDAR'
  | 'NOTES'
  | 'STATS'
  | 'SYSTEM_STATS'
  | 'RECENT_ACTIVITY'
  | 'USER_GROWTH'
  | 'PAGE_VIEWS'
  | 'GMAIL'
  | 'GCHAT';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
  role: Role;
  department: string | null;
  position: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  content: unknown;
  coverImage: string | null;
  icon: string | null;
  description: string | null;
  type: PageType;
  isPublished: boolean;
  createdById: string;
  createdBy: { id: string; firstName: string; lastName: string; avatar: string | null };
  createdAt: string;
  updatedAt: string;
  assignedAt?: string;
  _count?: { assignments: number; sections: number };
  sections?: PageSection[];
}

export interface PageSection {
  id: string;
  pageId: string;
  title: string | null;
  content: unknown;
  order: number;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'EMBED' | 'DIVIDER';
}

export interface Widget {
  id: string;
  userId: string;
  type: WidgetType;
  title: string;
  settings: Record<string, unknown>;
  isVisible: boolean;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: Priority;
  isPinned: boolean;
  createdById: string;
  createdBy: { id: string; firstName: string; lastName: string; avatar: string | null };
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  isCompleted: boolean;
  dueDate: string | null;
  priority: Priority;
  asanaTaskGid?: string | null;
  asanaPermalink?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuickLink {
  id: string;
  userId: string;
  label: string;
  url: string;
  icon: string | null;
  order: number;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}

export interface CompanySettings {
  id: string;
  companyName: string;
  logoUrl: string | null;
  theme: string;
  accentColor: string;
  defaultWidgets: unknown;
  updatedAt: string;
}

export interface PageAssignment {
  id: string;
  pageId: string;
  page: Page;
  userId: string | null;
  assignedById: string;
  assignedAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}
