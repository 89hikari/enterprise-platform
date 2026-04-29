import { z } from 'zod';
export declare const UserRoleSchema: z.ZodEnum<["superadmin", "admin", "manager", "hr_manager", "employee"]>;
export declare const CreateUserSchema: z.ZodObject<{
    email: z.ZodString;
    firstName: z.ZodString;
    lastName: z.ZodString;
    middleName: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    gender: z.ZodOptional<z.ZodString>;
    dateOfBirth: z.ZodOptional<z.ZodString>;
    address: z.ZodOptional<z.ZodObject<{
        street: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
        postalCode: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        street?: string | undefined;
        city?: string | undefined;
        country?: string | undefined;
        postalCode?: string | undefined;
    }, {
        street?: string | undefined;
        city?: string | undefined;
        country?: string | undefined;
        postalCode?: string | undefined;
    }>>;
    positionName: z.ZodOptional<z.ZodString>;
    role: z.ZodEnum<["superadmin", "admin", "manager", "hr_manager", "employee"]>;
    departmentId: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    firstName: string;
    lastName: string;
    organizationId: string;
    email: string;
    role: "superadmin" | "admin" | "manager" | "hr_manager" | "employee";
    departmentId?: string | undefined;
    middleName?: string | undefined;
    phone?: string | undefined;
    gender?: string | undefined;
    dateOfBirth?: string | undefined;
    address?: {
        street?: string | undefined;
        city?: string | undefined;
        country?: string | undefined;
        postalCode?: string | undefined;
    } | undefined;
    positionName?: string | undefined;
}, {
    firstName: string;
    lastName: string;
    organizationId: string;
    email: string;
    role: "superadmin" | "admin" | "manager" | "hr_manager" | "employee";
    departmentId?: string | undefined;
    middleName?: string | undefined;
    phone?: string | undefined;
    gender?: string | undefined;
    dateOfBirth?: string | undefined;
    address?: {
        street?: string | undefined;
        city?: string | undefined;
        country?: string | undefined;
        postalCode?: string | undefined;
    } | undefined;
    positionName?: string | undefined;
}>;
export declare const UpdateUserSchema: z.ZodObject<Omit<{
    email: z.ZodOptional<z.ZodString>;
    firstName: z.ZodOptional<z.ZodString>;
    lastName: z.ZodOptional<z.ZodString>;
    middleName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    phone: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    gender: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    dateOfBirth: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    address: z.ZodOptional<z.ZodOptional<z.ZodObject<{
        street: z.ZodOptional<z.ZodString>;
        city: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
        postalCode: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        street?: string | undefined;
        city?: string | undefined;
        country?: string | undefined;
        postalCode?: string | undefined;
    }, {
        street?: string | undefined;
        city?: string | undefined;
        country?: string | undefined;
        postalCode?: string | undefined;
    }>>>;
    positionName: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    role: z.ZodOptional<z.ZodEnum<["superadmin", "admin", "manager", "hr_manager", "employee"]>>;
    departmentId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
    organizationId: z.ZodOptional<z.ZodString>;
}, "organizationId">, "strip", z.ZodTypeAny, {
    firstName?: string | undefined;
    lastName?: string | undefined;
    departmentId?: string | undefined;
    middleName?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    gender?: string | undefined;
    dateOfBirth?: string | undefined;
    address?: {
        street?: string | undefined;
        city?: string | undefined;
        country?: string | undefined;
        postalCode?: string | undefined;
    } | undefined;
    positionName?: string | undefined;
    role?: "superadmin" | "admin" | "manager" | "hr_manager" | "employee" | undefined;
}, {
    firstName?: string | undefined;
    lastName?: string | undefined;
    departmentId?: string | undefined;
    middleName?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
    gender?: string | undefined;
    dateOfBirth?: string | undefined;
    address?: {
        street?: string | undefined;
        city?: string | undefined;
        country?: string | undefined;
        postalCode?: string | undefined;
    } | undefined;
    positionName?: string | undefined;
    role?: "superadmin" | "admin" | "manager" | "hr_manager" | "employee" | undefined;
}>;
export declare const WorkHistoryEventTypeSchema: z.ZodEnum<["HIRED", "PROMOTED", "TRANSFERRED", "ROLE_CHANGED", "TERMINATED"]>;
export declare const CreateWorkHistorySchema: z.ZodObject<{
    eventType: z.ZodEnum<["HIRED", "PROMOTED", "TRANSFERRED", "ROLE_CHANGED", "TERMINATED"]>;
    fromDepartmentId: z.ZodOptional<z.ZodString>;
    toDepartmentId: z.ZodOptional<z.ZodString>;
    fromPosition: z.ZodOptional<z.ZodString>;
    toPosition: z.ZodOptional<z.ZodString>;
    fromRole: z.ZodOptional<z.ZodEnum<["superadmin", "admin", "manager", "hr_manager", "employee"]>>;
    toRole: z.ZodOptional<z.ZodEnum<["superadmin", "admin", "manager", "hr_manager", "employee"]>>;
    effectiveDate: z.ZodString;
    notes: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    eventType: "HIRED" | "PROMOTED" | "TRANSFERRED" | "ROLE_CHANGED" | "TERMINATED";
    effectiveDate: string;
    fromDepartmentId?: string | undefined;
    toDepartmentId?: string | undefined;
    fromPosition?: string | undefined;
    toPosition?: string | undefined;
    fromRole?: "superadmin" | "admin" | "manager" | "hr_manager" | "employee" | undefined;
    toRole?: "superadmin" | "admin" | "manager" | "hr_manager" | "employee" | undefined;
    notes?: string | undefined;
}, {
    eventType: "HIRED" | "PROMOTED" | "TRANSFERRED" | "ROLE_CHANGED" | "TERMINATED";
    effectiveDate: string;
    fromDepartmentId?: string | undefined;
    toDepartmentId?: string | undefined;
    fromPosition?: string | undefined;
    toPosition?: string | undefined;
    fromRole?: "superadmin" | "admin" | "manager" | "hr_manager" | "employee" | undefined;
    toRole?: "superadmin" | "admin" | "manager" | "hr_manager" | "employee" | undefined;
    notes?: string | undefined;
}>;
export declare const CreateDepartmentSchema: z.ZodObject<{
    name: z.ZodString;
    organizationId: z.ZodString;
    parentDepartmentId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    organizationId: string;
    parentDepartmentId?: string | undefined;
}, {
    name: string;
    organizationId: string;
    parentDepartmentId?: string | undefined;
}>;
export declare const UpdateDepartmentSchema: z.ZodObject<Omit<{
    name: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodOptional<z.ZodString>;
    parentDepartmentId: z.ZodOptional<z.ZodOptional<z.ZodString>>;
}, "organizationId">, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    parentDepartmentId?: string | undefined;
}, {
    name?: string | undefined;
    parentDepartmentId?: string | undefined;
}>;
export declare const CreateOrganizationSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    slug: string;
}, {
    name: string;
    slug: string;
}>;
export declare const MessageTypeSchema: z.ZodEnum<["text", "voice", "video", "file", "image"]>;
export declare const CreateRoomSchema: z.ZodObject<{
    type: z.ZodEnum<["direct", "group"]>;
    name: z.ZodOptional<z.ZodString>;
    memberIds: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    type: "direct" | "group";
    memberIds: string[];
    name?: string | undefined;
}, {
    type: "direct" | "group";
    memberIds: string[];
    name?: string | undefined;
}>;
export declare const SendMessageSchema: z.ZodObject<{
    messageType: z.ZodEnum<["text", "voice", "video", "file", "image"]>;
    content: z.ZodOptional<z.ZodString>;
    fileUrl: z.ZodOptional<z.ZodString>;
    fileName: z.ZodOptional<z.ZodString>;
    fileSize: z.ZodOptional<z.ZodNumber>;
    durationSeconds: z.ZodOptional<z.ZodNumber>;
    replyToMessageId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    messageType: "text" | "voice" | "video" | "file" | "image";
    content?: string | undefined;
    fileUrl?: string | undefined;
    fileName?: string | undefined;
    fileSize?: number | undefined;
    durationSeconds?: number | undefined;
    replyToMessageId?: string | undefined;
}, {
    messageType: "text" | "voice" | "video" | "file" | "image";
    content?: string | undefined;
    fileUrl?: string | undefined;
    fileName?: string | undefined;
    fileSize?: number | undefined;
    durationSeconds?: number | undefined;
    replyToMessageId?: string | undefined;
}>;
export declare const CreateBoardSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    organizationId: string;
    description?: string | undefined;
}, {
    name: string;
    organizationId: string;
    description?: string | undefined;
}>;
export declare const CreateColumnSchema: z.ZodObject<{
    name: z.ZodString;
    color: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    color?: string | undefined;
}, {
    name: string;
    color?: string | undefined;
}>;
export declare const CreateCardSchema: z.ZodObject<{
    title: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    dueDate: z.ZodOptional<z.ZodString>;
    assigneeIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    labelIds: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    title: string;
    description?: string | undefined;
    dueDate?: string | undefined;
    assigneeIds?: string[] | undefined;
    labelIds?: string[] | undefined;
}, {
    title: string;
    description?: string | undefined;
    dueDate?: string | undefined;
    assigneeIds?: string[] | undefined;
    labelIds?: string[] | undefined;
}>;
export declare const MoveCardSchema: z.ZodObject<{
    toColumnId: z.ZodString;
    newPosition: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    toColumnId: string;
    newPosition: number;
}, {
    toColumnId: string;
    newPosition: number;
}>;
export declare const CreateSubtaskSchema: z.ZodObject<{
    title: z.ZodString;
}, "strip", z.ZodTypeAny, {
    title: string;
}, {
    title: string;
}>;
export declare const CreateLabelSchema: z.ZodObject<{
    name: z.ZodString;
    color: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
    color: string;
}, {
    name: string;
    color: string;
}>;
export declare const CreateNewsPostSchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    isPinned: z.ZodDefault<z.ZodOptional<z.ZodBoolean>>;
    publishedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    content: string;
    title: string;
    isPinned: boolean;
    publishedAt?: string | undefined;
}, {
    content: string;
    title: string;
    isPinned?: boolean | undefined;
    publishedAt?: string | undefined;
}>;
export declare const PaginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
}, {
    page?: number | undefined;
    limit?: number | undefined;
}>;
export declare const CursorPaginationSchema: z.ZodObject<{
    cursor: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    cursor?: string | undefined;
}, {
    limit?: number | undefined;
    cursor?: string | undefined;
}>;
export declare const UserFilterSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
} & {
    organizationId: z.ZodOptional<z.ZodString>;
    departmentId: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<["superadmin", "admin", "manager", "hr_manager", "employee"]>>;
    search: z.ZodOptional<z.ZodString>;
    isActive: z.ZodOptional<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    organizationId?: string | undefined;
    departmentId?: string | undefined;
    role?: "superadmin" | "admin" | "manager" | "hr_manager" | "employee" | undefined;
    isActive?: boolean | undefined;
    search?: string | undefined;
}, {
    organizationId?: string | undefined;
    departmentId?: string | undefined;
    role?: "superadmin" | "admin" | "manager" | "hr_manager" | "employee" | undefined;
    isActive?: boolean | undefined;
    page?: number | undefined;
    limit?: number | undefined;
    search?: string | undefined;
}>;
export declare const PresignUploadSchema: z.ZodObject<{
    bucket: z.ZodEnum<["avatars", "chat-media", "kanban-attachments"]>;
    fileName: z.ZodString;
    contentType: z.ZodString;
}, "strip", z.ZodTypeAny, {
    fileName: string;
    bucket: "avatars" | "chat-media" | "kanban-attachments";
    contentType: string;
}, {
    fileName: string;
    bucket: "avatars" | "chat-media" | "kanban-attachments";
    contentType: string;
}>;
//# sourceMappingURL=index.d.ts.map