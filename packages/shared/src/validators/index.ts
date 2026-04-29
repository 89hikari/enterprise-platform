import { z } from 'zod';

// ── User validators ───────────────────────────────────────────────────────────

export const UserRoleSchema = z.enum(['superadmin', 'admin', 'manager', 'hr_manager', 'employee']);

export const CreateUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  middleName: z.string().max(100).optional(),
  phone: z.string().max(50).optional(),
  gender: z.string().max(20).optional(),
  dateOfBirth: z.string().date().optional(),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional(),
    })
    .optional(),
  positionName: z.string().max(255).optional(),
  role: UserRoleSchema,
  departmentId: z.string().uuid().optional(),
  organizationId: z.string().uuid(),
});

export const UpdateUserSchema = CreateUserSchema.partial().omit({ organizationId: true });

export const WorkHistoryEventTypeSchema = z.enum([
  'HIRED',
  'PROMOTED',
  'TRANSFERRED',
  'ROLE_CHANGED',
  'TERMINATED',
]);

export const CreateWorkHistorySchema = z.object({
  eventType: WorkHistoryEventTypeSchema,
  fromDepartmentId: z.string().uuid().optional(),
  toDepartmentId: z.string().uuid().optional(),
  fromPosition: z.string().max(255).optional(),
  toPosition: z.string().max(255).optional(),
  fromRole: UserRoleSchema.optional(),
  toRole: UserRoleSchema.optional(),
  effectiveDate: z.string().date(),
  notes: z.string().max(2000).optional(),
});

// ── Department validators ─────────────────────────────────────────────────────

export const CreateDepartmentSchema = z.object({
  name: z.string().min(1).max(255),
  organizationId: z.string().uuid(),
  parentDepartmentId: z.string().uuid().optional(),
});

export const UpdateDepartmentSchema = CreateDepartmentSchema.partial().omit({
  organizationId: true,
});

// ── Organization validators ───────────────────────────────────────────────────

export const CreateOrganizationSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/),
});

// ── Chat validators ───────────────────────────────────────────────────────────

export const MessageTypeSchema = z.enum(['text', 'voice', 'video', 'file', 'image']);

export const CreateRoomSchema = z.object({
  type: z.enum(['direct', 'group']),
  name: z.string().min(1).max(255).optional(),
  memberIds: z.array(z.string().uuid()).min(1),
});

export const SendMessageSchema = z.object({
  messageType: MessageTypeSchema,
  content: z.string().max(10000).optional(),
  fileUrl: z.string().url().optional(),
  fileName: z.string().max(255).optional(),
  fileSize: z.number().int().positive().optional(),
  durationSeconds: z.number().int().positive().optional(),
  replyToMessageId: z.string().uuid().optional(),
});

// ── Kanban validators ─────────────────────────────────────────────────────────

export const CreateBoardSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  organizationId: z.string().uuid(),
});

export const CreateColumnSchema = z.object({
  name: z.string().min(1).max(255),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
});

export const CreateCardSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  dueDate: z.string().datetime().optional(),
  assigneeIds: z.array(z.string().uuid()).optional(),
  labelIds: z.array(z.string().uuid()).optional(),
});

export const MoveCardSchema = z.object({
  toColumnId: z.string().uuid(),
  newPosition: z.number(),
});

export const CreateSubtaskSchema = z.object({
  title: z.string().min(1).max(500),
});

export const CreateLabelSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

// ── News validators ───────────────────────────────────────────────────────────

export const CreateNewsPostSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  isPinned: z.boolean().optional().default(false),
  publishedAt: z.string().datetime().optional(),
});

// ── Query param validators ────────────────────────────────────────────────────

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const CursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const UserFilterSchema = PaginationSchema.extend({
  organizationId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
  role: UserRoleSchema.optional(),
  search: z.string().max(100).optional(),
  isActive: z.coerce.boolean().optional(),
});

// ── File upload validators ────────────────────────────────────────────────────

export const PresignUploadSchema = z.object({
  bucket: z.enum(['avatars', 'chat-media', 'kanban-attachments']),
  fileName: z.string().min(1).max(255),
  contentType: z.string().min(1).max(100),
});
