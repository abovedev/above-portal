export type Role = 'USER' | 'ADMIN';
export type PageType = 'GLOBAL' | 'PERSONAL';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type NotificationType = 'PAGE_ASSIGNED' | 'ANNOUNCEMENT' | 'SYSTEM' | 'TASK_REMINDER' | 'GEAR_REQUEST';

export type GearStatus = 'AVAILABLE' | 'CHECKED_OUT' | 'RESERVED' | 'RETURN_PENDING' | 'MAINTENANCE' | 'RETIRED';
export type GearRequestStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'CANCELLED' | 'COLLECTED';
export type GearCondition = 'New' | 'Good' | 'Fair' | 'Poor';

export const GEAR_CATEGORIES = [
  'Laptop', 'Desktop', 'Phone', 'Tablet', 'Camera', 'Audio', 'Vehicle', 'Tool', 'Networking', 'Other',
] as const;

export interface GearUser {
  id: string;
  firstName: string;
  lastName: string;
  avatar: string | null;
}

export interface GearAssignmentSummary {
  id: string;
  checkedOutAt: string;
  dueDate: string | null;
  user: GearUser;
}

export interface GearItem {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  category: string;
  serialNumber: string | null;
  imei: string | null;
  assetTag: string | null;
  description: string | null;
  notes: string | null;
  photo: string | null;
  purchaseDate: string | null;
  purchaseCost: number | null;
  vendor: string | null;
  warrantyExpiry: string | null;
  condition: GearCondition;
  location: string | null;
  status: GearStatus;
  createdAt: string;
  updatedAt: string;
  assignments?: GearAssignmentSummary[];
  _count?: { requests: number };
}

export interface GearAssignmentDetail {
  id: string;
  checkedOutAt: string;
  dueDate: string | null;
  returnedAt: string | null;
  notes: string | null;
  user: GearUser;
  assignedBy: GearUser;
}

export interface GearItemDetail extends GearItem {
  assignments: GearAssignmentDetail[];
  requests: GearRequest[];
}

export interface GearRequest {
  id: string;
  gearItemId: string;
  gearItem: { id: string; name: string; category: string; photo: string | null; status: GearStatus };
  requesterId: string;
  requester: GearUser;
  status: GearRequestStatus;
  reason: string | null;
  startDate: string | null;
  endDate: string | null;
  adminNote: string | null;
  reviewedBy: GearUser | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GearStats {
  total: number;
  available: number;
  checkedOut: number;
  reserved: number;
  returnPending: number;
  maintenance: number;
  pendingRequests: number;
}

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
  | 'GCHAT'
  | 'AI_CHAT';

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
  _count?: { comments: number };
  reactionSummary?: { emoji: string; count: number; userIds: string[] }[];
}

export interface AnnouncementComment {
  id: string;
  announcementId: string;
  userId: string;
  user: { id: string; firstName: string; lastName: string; avatar: string | null };
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementReactionItem {
  id: string;
  announcementId: string;
  userId: string;
  emoji: string;
}

export interface AnnouncementDetail extends Announcement {
  comments: AnnouncementComment[];
  reactions: AnnouncementReactionItem[];
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

export type EmailTone =
  | 'Professional'
  | 'Friendly'
  | 'Casual'
  | 'Formal'
  | 'Short and Direct'
  | 'Australian Business Tone';

export type DocumentAccessMode =
  | 'NO_DOCUMENT_ACCESS'
  | 'UPLOADED_DOCUMENTS_ONLY'
  | 'APPROVED_INTERNAL_DOCUMENTS_ONLY'
  | 'UPLOADED_AND_APPROVED_INTERNAL_DOCUMENTS';

export type AllowedFileType = 'PDF' | 'DOCX' | 'TXT_MD' | 'CSV';

export interface AISettings {
  id: string;
  emailTone: EmailTone;
  defaultEmailInstructions: string;
  writingStyleNotes: string;
  documentAccessMode: DocumentAccessMode;
  allowedFileTypes: AllowedFileType[];
  extraSystemInstructions: string;
  aiAssistantEnabled: boolean;
  createdAt?: string;
  updatedAt?: string;
  updatedByAdminId?: string | null;
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
