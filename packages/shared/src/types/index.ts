// ── Enums ─────────────────────────────────────────────────────────────────────

export type UserRole = 'superadmin' | 'admin' | 'manager' | 'hr_manager' | 'employee';

export type MessageType = 'text' | 'voice' | 'video' | 'file' | 'image';

export type RoomType = 'direct' | 'group';

export type WorkHistoryEventType =
  | 'HIRED'
  | 'PROMOTED'
  | 'TRANSFERRED'
  | 'ROLE_CHANGED'
  | 'TERMINATED';

export type BoardMemberRole = 'owner' | 'editor' | 'viewer';

export type NotificationType =
  | 'TASK_ASSIGNED'
  | 'TASK_DEADLINE_APPROACHING'
  | 'MESSAGE_RECEIVED'
  | 'WORK_HISTORY_UPDATED';

// ── Core Entities ─────────────────────────────────────────────────────────────

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  id: string;
  organizationId: string;
  parentDepartmentId: string | null;
  name: string;
  createdAt: string;
  updatedAt: string;
  children?: Department[];
}

export interface UserAddress {
  street?: string;
  city?: string;
  country?: string;
  postalCode?: string;
}

export interface User {
  id: string;
  organizationId: string;
  departmentId: string | null;
  firstName: string;
  lastName: string;
  middleName: string | null;
  email: string;
  phone: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  address: UserAddress | null;
  positionName: string | null;
  role: UserRole;
  photoUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserWithRelations extends User {
  department: Department | null;
  organization: Organization;
  managers: User[];
}

export interface WorkHistory {
  id: string;
  userId: string;
  eventType: WorkHistoryEventType;
  fromDepartmentId: string | null;
  toDepartmentId: string | null;
  fromPosition: string | null;
  toPosition: string | null;
  fromRole: UserRole | null;
  toRole: UserRole | null;
  effectiveDate: string;
  notes: string | null;
  recordedBy: string;
  createdAt: string;
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export interface ChatRoom {
  id: string;
  organizationId: string;
  type: RoomType;
  name: string | null;
  avatarUrl: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastMessage?: ChatMessage | null;
  unreadCount?: number;
  members?: User[];
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  sender?: Pick<User, 'id' | 'firstName' | 'lastName' | 'photoUrl'>;
  messageType: MessageType;
  content: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  durationSeconds: number | null;
  replyToMessageId: string | null;
  replyTo?: ChatMessage | null;
  isDeleted: boolean;
  createdAt: string;
  editedAt: string | null;
}

// ── Kanban ────────────────────────────────────────────────────────────────────

export interface KanbanBoard {
  id: string;
  organizationId: string;
  name: string;
  description: string | null;
  createdBy: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
  columns?: KanbanColumn[];
}

export interface KanbanColumn {
  id: string;
  boardId: string;
  name: string;
  position: number;
  color: string | null;
  createdAt: string;
  updatedAt: string;
  cards?: KanbanCard[];
}

export interface KanbanLabel {
  id: string;
  boardId: string;
  name: string;
  color: string;
}

export interface KanbanSubtask {
  id: string;
  cardId: string;
  title: string;
  isCompleted: boolean;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface KanbanAttachment {
  id: string;
  cardId: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
}

// Assignee shape as returned by the Prisma CARD_SELECT query (junction row wrapping the user)
export interface KanbanCardAssignee {
  user: Pick<User, 'id' | 'firstName' | 'lastName' | 'photoUrl'>;
}

export interface KanbanCard {
  id: string;
  columnId: string;
  boardId: string;
  title: string;
  description: string | null;
  position: number;
  dueDate: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  assignees?: KanbanCardAssignee[];
  labels?: KanbanLabel[];
  subtasks?: KanbanSubtask[];
  attachments?: KanbanAttachment[];
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface NewsPost {
  id: string;
  organizationId: string;
  authorId: string;
  author?: Pick<User, 'id' | 'firstName' | 'lastName' | 'photoUrl'>;
  title: string;
  content: string;
  isPinned: boolean;
  publishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  referenceType: string | null;
  referenceId: string | null;
  isRead: boolean;
  createdAt: string;
}

// ── API Response wrappers ─────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNextPage: boolean;
}

export interface CursorPaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}

// ── Socket.IO Event Payloads ──────────────────────────────────────────────────

export interface SocketSendMessagePayload {
  roomId: string;
  messageType: MessageType;
  content?: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  durationSeconds?: number;
  replyToMessageId?: string;
}

export interface SocketTypingPayload {
  roomId: string;
}

export interface SocketMarkReadPayload {
  roomId: string;
}

export interface SocketCardMovedPayload {
  cardId: string;
  fromColumnId: string;
  toColumnId: string;
  newPosition: number;
}

export interface SocketCardUpdatedPayload {
  boardId: string;
  cardId: string;
  changes: Partial<KanbanCard>;
}
