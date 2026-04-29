"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PresignUploadSchema = exports.UserFilterSchema = exports.CursorPaginationSchema = exports.PaginationSchema = exports.CreateNewsPostSchema = exports.CreateLabelSchema = exports.CreateSubtaskSchema = exports.MoveCardSchema = exports.CreateCardSchema = exports.CreateColumnSchema = exports.CreateBoardSchema = exports.SendMessageSchema = exports.CreateRoomSchema = exports.MessageTypeSchema = exports.CreateOrganizationSchema = exports.UpdateDepartmentSchema = exports.CreateDepartmentSchema = exports.CreateWorkHistorySchema = exports.WorkHistoryEventTypeSchema = exports.UpdateUserSchema = exports.CreateUserSchema = exports.UserRoleSchema = void 0;
const zod_1 = require("zod");
// ── User validators ───────────────────────────────────────────────────────────
exports.UserRoleSchema = zod_1.z.enum(['superadmin', 'admin', 'manager', 'hr_manager', 'employee']);
exports.CreateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    firstName: zod_1.z.string().min(1).max(100),
    lastName: zod_1.z.string().min(1).max(100),
    middleName: zod_1.z.string().max(100).optional(),
    phone: zod_1.z.string().max(50).optional(),
    gender: zod_1.z.string().max(20).optional(),
    dateOfBirth: zod_1.z.string().date().optional(),
    address: zod_1.z
        .object({
        street: zod_1.z.string().optional(),
        city: zod_1.z.string().optional(),
        country: zod_1.z.string().optional(),
        postalCode: zod_1.z.string().optional(),
    })
        .optional(),
    positionName: zod_1.z.string().max(255).optional(),
    role: exports.UserRoleSchema,
    departmentId: zod_1.z.string().uuid().optional(),
    organizationId: zod_1.z.string().uuid(),
});
exports.UpdateUserSchema = exports.CreateUserSchema.partial().omit({ organizationId: true });
exports.WorkHistoryEventTypeSchema = zod_1.z.enum([
    'HIRED',
    'PROMOTED',
    'TRANSFERRED',
    'ROLE_CHANGED',
    'TERMINATED',
]);
exports.CreateWorkHistorySchema = zod_1.z.object({
    eventType: exports.WorkHistoryEventTypeSchema,
    fromDepartmentId: zod_1.z.string().uuid().optional(),
    toDepartmentId: zod_1.z.string().uuid().optional(),
    fromPosition: zod_1.z.string().max(255).optional(),
    toPosition: zod_1.z.string().max(255).optional(),
    fromRole: exports.UserRoleSchema.optional(),
    toRole: exports.UserRoleSchema.optional(),
    effectiveDate: zod_1.z.string().date(),
    notes: zod_1.z.string().max(2000).optional(),
});
// ── Department validators ─────────────────────────────────────────────────────
exports.CreateDepartmentSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    organizationId: zod_1.z.string().uuid(),
    parentDepartmentId: zod_1.z.string().uuid().optional(),
});
exports.UpdateDepartmentSchema = exports.CreateDepartmentSchema.partial().omit({
    organizationId: true,
});
// ── Organization validators ───────────────────────────────────────────────────
exports.CreateOrganizationSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    slug: zod_1.z
        .string()
        .min(2)
        .max(100)
        .regex(/^[a-z0-9-]+$/),
});
// ── Chat validators ───────────────────────────────────────────────────────────
exports.MessageTypeSchema = zod_1.z.enum(['text', 'voice', 'video', 'file', 'image']);
exports.CreateRoomSchema = zod_1.z.object({
    type: zod_1.z.enum(['direct', 'group']),
    name: zod_1.z.string().min(1).max(255).optional(),
    memberIds: zod_1.z.array(zod_1.z.string().uuid()).min(1),
});
exports.SendMessageSchema = zod_1.z.object({
    messageType: exports.MessageTypeSchema,
    content: zod_1.z.string().max(10000).optional(),
    fileUrl: zod_1.z.string().url().optional(),
    fileName: zod_1.z.string().max(255).optional(),
    fileSize: zod_1.z.number().int().positive().optional(),
    durationSeconds: zod_1.z.number().int().positive().optional(),
    replyToMessageId: zod_1.z.string().uuid().optional(),
});
// ── Kanban validators ─────────────────────────────────────────────────────────
exports.CreateBoardSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().max(2000).optional(),
    organizationId: zod_1.z.string().uuid(),
});
exports.CreateColumnSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    color: zod_1.z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .optional(),
});
exports.CreateCardSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500),
    description: zod_1.z.string().max(10000).optional(),
    dueDate: zod_1.z.string().datetime().optional(),
    assigneeIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    labelIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
});
exports.MoveCardSchema = zod_1.z.object({
    toColumnId: zod_1.z.string().uuid(),
    newPosition: zod_1.z.number(),
});
exports.CreateSubtaskSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500),
});
exports.CreateLabelSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    color: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});
// ── News validators ───────────────────────────────────────────────────────────
exports.CreateNewsPostSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500),
    content: zod_1.z.string().min(1),
    isPinned: zod_1.z.boolean().optional().default(false),
    publishedAt: zod_1.z.string().datetime().optional(),
});
// ── Query param validators ────────────────────────────────────────────────────
exports.PaginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
exports.CursorPaginationSchema = zod_1.z.object({
    cursor: zod_1.z.string().optional(),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
});
exports.UserFilterSchema = exports.PaginationSchema.extend({
    organizationId: zod_1.z.string().uuid().optional(),
    departmentId: zod_1.z.string().uuid().optional(),
    role: exports.UserRoleSchema.optional(),
    search: zod_1.z.string().max(100).optional(),
    isActive: zod_1.z.coerce.boolean().optional(),
});
// ── File upload validators ────────────────────────────────────────────────────
exports.PresignUploadSchema = zod_1.z.object({
    bucket: zod_1.z.enum(['avatars', 'chat-media', 'kanban-attachments']),
    fileName: zod_1.z.string().min(1).max(255),
    contentType: zod_1.z.string().min(1).max(100),
});
//# sourceMappingURL=index.js.map