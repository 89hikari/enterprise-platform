# Admin Panel — Company Structure Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Admin panel (Org / Departments / Users tabs) that creates users simultaneously in Keycloak and the DB, with a hierarchical department tree.

**Architecture:** A new `KeycloakAdminService` handles all Keycloak Admin REST API calls. `UsersService.create()` calls it first, gets the Keycloak sub, then inserts the DB record. The frontend adds an `/admin` route with three client-side tabs using existing API endpoints.

**Tech Stack:** NestJS (backend), Next.js 15 App Router (frontend), react-oidc-context, @tanstack/react-query, Keycloak Admin REST API, axios.

---

## File Map

**New — API:**
- `apps/api/src/modules/keycloak-admin/keycloak-admin.service.ts` — Keycloak Admin REST client
- `apps/api/src/modules/keycloak-admin/keycloak-admin.module.ts` — NestJS module that exports the service

**Modified — API:**
- `apps/api/src/config/app.config.ts` — add `adminUser`, `adminPassword` to keycloak block
- `apps/api/src/modules/users/dto/create-user.dto.ts` — remove `keycloakSub`, add `password`
- `apps/api/src/modules/users/users.service.ts` — inject `KeycloakAdminService`, rewrite `create()`
- `apps/api/src/modules/users/users.module.ts` — import `KeycloakAdminModule`
- `apps/api/src/app.module.ts` — import `KeycloakAdminModule`
- `apps/api/src/modules/organizations/organizations.controller.ts` — add `@Roles` to `PATCH`
- `apps/api/.env` — add `KEYCLOAK_ADMIN` / `KEYCLOAK_ADMIN_PASSWORD`
- `.env.dev` — same

**New — Web:**
- `apps/web/src/app/(app)/admin/page.tsx` — route with tab switcher
- `apps/web/src/components/admin/OrgTab.tsx` — organization name edit
- `apps/web/src/components/admin/DepartmentsTab.tsx` — hierarchical department tree
- `apps/web/src/components/admin/AddUserModal.tsx` — create user modal form

**Modified — Web:**
- `apps/web/src/components/shared/Sidebar.tsx` — add Admin link (role-gated)
- `apps/web/src/app/(app)/users/page.tsx` — replace Users tab content (now lives in admin)

---

## Task 1: Add env vars and update app.config.ts

**Files:**
- Modify: `apps/api/.env`
- Modify: `.env.dev`
- Modify: `apps/api/src/config/app.config.ts`

- [ ] **Step 1: Add vars to `apps/api/.env`**

Append to the end of the file:
```
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin
```

- [ ] **Step 2: Add vars to `.env.dev`**

Append to the end of the file:
```
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=admin
```

- [ ] **Step 3: Update `app.config.ts` keycloak block**

Replace the `keycloak` block in `apps/api/src/config/app.config.ts`:
```typescript
  keycloak: {
    url: process.env.KEYCLOAK_URL!,
    realm: process.env.KEYCLOAK_REALM!,
    clientId: process.env.KEYCLOAK_CLIENT_ID!,
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
    jwksUri: `${process.env.KEYCLOAK_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/certs`,
    adminUser: process.env.KEYCLOAK_ADMIN!,
    adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD!,
  },
```

- [ ] **Step 4: Commit**
```bash
git add apps/api/.env .env.dev apps/api/src/config/app.config.ts
git commit -m "feat: add keycloak admin env vars to config"
```

---

## Task 2: Create KeycloakAdminService

**Files:**
- Create: `apps/api/src/modules/keycloak-admin/keycloak-admin.service.ts`
- Create: `apps/api/src/modules/keycloak-admin/keycloak-admin.module.ts`

- [ ] **Step 1: Create the service**

Create `apps/api/src/modules/keycloak-admin/keycloak-admin.service.ts`:
```typescript
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

interface CachedToken {
  access_token: string;
  expires_at: number;
}

@Injectable()
export class KeycloakAdminService {
  private cached: CachedToken | null = null;

  constructor(private config: ConfigService) {}

  private get baseUrl() {
    const url = this.config.get<string>('app.keycloak.url')!;
    const realm = this.config.get<string>('app.keycloak.realm')!;
    return `${url}/admin/realms/${realm}`;
  }

  private async token(): Promise<string> {
    if (this.cached && this.cached.expires_at > Date.now() + 5_000) {
      return this.cached.access_token;
    }

    const url = this.config.get<string>('app.keycloak.url')!;
    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: this.config.get<string>('app.keycloak.adminUser')!,
      password: this.config.get<string>('app.keycloak.adminPassword')!,
    });

    const res = await axios.post(
      `${url}/realms/master/protocol/openid-connect/token`,
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );

    this.cached = {
      access_token: res.data.access_token,
      expires_at: Date.now() + res.data.expires_in * 1000,
    };
    return this.cached.access_token;
  }

  private authHeader(t: string) {
    return { Authorization: `Bearer ${t}` };
  }

  async createUser(data: {
    email: string;
    firstName: string;
    lastName: string;
    password: string;
    role: string;
  }): Promise<string> {
    const t = await this.token();

    // 1. Create user in Keycloak
    const createRes = await axios.post(
      `${this.baseUrl}/users`,
      {
        username: data.email,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        enabled: true,
        emailVerified: true,
        requiredActions: ['UPDATE_PASSWORD'],
        credentials: [{ type: 'password', value: data.password, temporary: true }],
      },
      { headers: this.authHeader(t) },
    );

    // Extract UUID from Location header: .../users/{uuid}
    const location: string = createRes.headers['location'];
    if (!location) throw new InternalServerErrorException('Keycloak did not return a Location header');
    const keycloakSub = location.split('/').pop()!;

    // 2. Fetch role representation
    let roleData: { id: string; name: string };
    try {
      const roleRes = await axios.get(`${this.baseUrl}/roles/${data.role}`, {
        headers: this.authHeader(t),
      });
      roleData = roleRes.data;
    } catch {
      // Role not found — clean up and fail clearly
      await this.deleteUser(keycloakSub).catch(() => {});
      throw new InternalServerErrorException(`Keycloak role '${data.role}' not found in realm`);
    }

    // 3. Assign realm role
    await axios.post(
      `${this.baseUrl}/users/${keycloakSub}/role-mappings/realm`,
      [{ id: roleData.id, name: roleData.name }],
      { headers: this.authHeader(t) },
    );

    return keycloakSub;
  }

  async deleteUser(keycloakSub: string): Promise<void> {
    const t = await this.token();
    await axios.delete(`${this.baseUrl}/users/${keycloakSub}`, {
      headers: this.authHeader(t),
    });
  }
}
```

- [ ] **Step 2: Create the module**

Create `apps/api/src/modules/keycloak-admin/keycloak-admin.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { KeycloakAdminService } from './keycloak-admin.service';

@Module({
  providers: [KeycloakAdminService],
  exports: [KeycloakAdminService],
})
export class KeycloakAdminModule {}
```

- [ ] **Step 3: Commit**
```bash
git add apps/api/src/modules/keycloak-admin/
git commit -m "feat: add KeycloakAdminService with createUser and deleteUser"
```

---

## Task 3: Wire KeycloakAdminModule into the app

**Files:**
- Modify: `apps/api/src/modules/users/users.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Import in UsersModule**

Replace `apps/api/src/modules/users/users.module.ts` with:
```typescript
import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { FilesModule } from '../files/files.module';
import { KeycloakAdminModule } from '../keycloak-admin/keycloak-admin.module';

@Module({
  imports: [FilesModule, KeycloakAdminModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
```

- [ ] **Step 2: Import in AppModule**

In `apps/api/src/app.module.ts`, add `KeycloakAdminModule` to the imports array and add the import statement:
```typescript
import { KeycloakAdminModule } from './modules/keycloak-admin/keycloak-admin.module';
```

Add `KeycloakAdminModule` to the imports array after `AuthModule`.

- [ ] **Step 3: Commit**
```bash
git add apps/api/src/modules/users/users.module.ts apps/api/src/app.module.ts
git commit -m "feat: wire KeycloakAdminModule into UsersModule and AppModule"
```

---

## Task 4: Update CreateUserDto and UsersService.create()

**Files:**
- Modify: `apps/api/src/modules/users/dto/create-user.dto.ts`
- Modify: `apps/api/src/modules/users/users.service.ts`

- [ ] **Step 1: Update CreateUserDto**

Replace `apps/api/src/modules/users/dto/create-user.dto.ts` with:
```typescript
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import type { UserRole } from '@enterprise/shared';

export class CreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  middleName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  gender?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  address?: {
    street?: string;
    city?: string;
    country?: string;
    postalCode?: string;
  };

  @IsOptional()
  @IsString()
  @MaxLength(255)
  positionName?: string;

  @IsEnum(['superadmin', 'admin', 'manager', 'hr_manager', 'employee'])
  role!: UserRole;

  @IsUUID()
  organizationId!: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
```

- [ ] **Step 2: Update UsersService — inject KeycloakAdminService and rewrite create()**

In `apps/api/src/modules/users/users.service.ts`, update the imports and constructor:
```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FilesService } from '../files/files.service';
import { KeycloakAdminService } from '../keycloak-admin/keycloak-admin.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import type { Prisma } from '@prisma/client';
```

Update the constructor:
```typescript
  constructor(
    private prisma: PrismaService,
    private files: FilesService,
    private keycloakAdmin: KeycloakAdminService,
  ) {}
```

Replace the `create()` method:
```typescript
  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');

    const keycloakSub = await this.keycloakAdmin.createUser({
      email: dto.email,
      firstName: dto.firstName,
      lastName: dto.lastName,
      password: dto.password,
      role: dto.role,
    });

    try {
      return await this.prisma.user.create({
        data: {
          id: keycloakSub,
          keycloakSub,
          organizationId: dto.organizationId,
          departmentId: dto.departmentId,
          firstName: dto.firstName,
          lastName: dto.lastName,
          middleName: dto.middleName,
          email: dto.email,
          phone: dto.phone,
          gender: dto.gender,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
          address: dto.address,
          positionName: dto.positionName,
          role: dto.role,
        },
        select: USER_SELECT,
      });
    } catch (err) {
      await this.keycloakAdmin.deleteUser(keycloakSub).catch(() => {});
      throw err;
    }
  }
```

- [ ] **Step 3: Start the API and verify it compiles**

Run: `pnpm --filter api dev`
Expected: `Nest application successfully started` with no TypeScript errors.

- [ ] **Step 4: Commit**
```bash
git add apps/api/src/modules/users/dto/create-user.dto.ts apps/api/src/modules/users/users.service.ts
git commit -m "feat: create() now provisions Keycloak user and rolls back on DB failure"
```

---

## Task 5: Fix organizations controller role guard

**Files:**
- Modify: `apps/api/src/modules/organizations/organizations.controller.ts`

- [ ] **Step 1: Add @Roles to PATCH**

The `PATCH :id` handler already has `@Roles('superadmin')`. The spec requires `admin` too. Update it:
```typescript
  @Patch(':id')
  @Roles('superadmin', 'admin')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() body: { name?: string; slug?: string }) {
    return this.orgs.update(id, body);
  }
```

- [ ] **Step 2: Commit**
```bash
git add apps/api/src/modules/organizations/organizations.controller.ts
git commit -m "fix: allow admin role to update organization"
```

---

## Task 6: Add Admin link to Sidebar

**Files:**
- Modify: `apps/web/src/components/shared/Sidebar.tsx`

- [ ] **Step 1: Add the Admin link**

In `Sidebar.tsx`, the `roles` claim is available via `auth.user?.profile`. Add the admin link after the main nav items, inside the `<nav>` block, rendered only for superadmin/admin:

After the `{NAV_ITEMS.map(...)}` block, add:
```tsx
        {(() => {
          const roles = (auth.user?.profile as any)?.roles as string[] | undefined;
          if (!roles?.some((r) => r === 'superadmin' || r === 'admin')) return null;
          return (
            <Link
              href="/admin"
              className={clsx(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                pathname.startsWith('/admin')
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              <span>⚙️</span>
              Admin
            </Link>
          );
        })()}
```

- [ ] **Step 2: Commit**
```bash
git add apps/web/src/components/shared/Sidebar.tsx
git commit -m "feat: add role-gated Admin link to sidebar"
```

---

## Task 7: Create admin page with tab scaffold

**Files:**
- Create: `apps/web/src/app/(app)/admin/page.tsx`

- [ ] **Step 1: Create the page**

Create `apps/web/src/app/(app)/admin/page.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useAuth } from 'react-oidc-context';
import { OrgTab } from '@/components/admin/OrgTab';
import { DepartmentsTab } from '@/components/admin/DepartmentsTab';
import { UsersTab } from '@/components/admin/UsersTab';

const TABS = ['Organization', 'Departments', 'Users'] as const;
type Tab = typeof TABS[number];

export default function AdminPage() {
  const auth = useAuth();
  const roles = (auth.user?.profile as any)?.roles as string[] | undefined;
  const isAdmin = roles?.some((r) => r === 'superadmin' || r === 'admin');
  const [tab, setTab] = useState<Tab>('Organization');
  const token = auth.user?.access_token;

  if (!isAdmin) {
    return (
      <div className="p-6 text-gray-400">
        You do not have permission to access this page.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin</h1>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-md transition-colors ${
              tab === t
                ? 'bg-white border border-b-white border-gray-200 text-blue-700 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Organization' && <OrgTab token={token} />}
      {tab === 'Departments' && <DepartmentsTab token={token} />}
      {tab === 'Users' && <UsersTab token={token} />}
    </div>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add apps/web/src/app/(app)/admin/
git commit -m "feat: add admin page with tab scaffold"
```

---

## Task 8: Build OrgTab

**Files:**
- Create: `apps/web/src/components/admin/OrgTab.tsx`

- [ ] **Step 1: Create OrgTab**

Create `apps/web/src/components/admin/OrgTab.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

interface Org { id: string; name: string; slug: string }

export function OrgTab({ token }: { token: string | undefined }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const { data: orgs } = useQuery<Org[]>({
    queryKey: ['organizations'],
    queryFn: () => api.get('/organizations', token),
    enabled: !!token,
  });

  const org = orgs?.[0];

  const update = useMutation({
    mutationFn: (newName: string) =>
      api.patch(`/organizations/${org!.id}`, { name: newName }, token),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['organizations'] });
      setEditing(false);
      setError('');
    },
    onError: (e: any) => setError(e.message ?? 'Failed to update'),
  });

  if (!org) return <p className="text-gray-400">Loading…</p>;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-lg">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
        Organization
      </h2>

      <div className="space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Name</label>
          {editing ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') update.mutate(name.trim());
                  if (e.key === 'Escape') setEditing(false);
                }}
              />
              <button
                onClick={() => update.mutate(name.trim())}
                disabled={!name.trim() || update.isPending}
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="text-sm text-gray-400 hover:text-gray-600 px-2"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-gray-900 font-medium">{org.name}</span>
              <button
                onClick={() => { setName(org.name); setEditing(true); }}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Edit
              </button>
            </div>
          )}
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>

        <div>
          <label className="block text-xs text-gray-500 mb-1">Slug</label>
          <span className="text-gray-500 text-sm font-mono">{org.slug}</span>
          <p className="text-xs text-gray-400 mt-0.5">Read-only — changing the slug would break existing references.</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add apps/web/src/components/admin/OrgTab.tsx
git commit -m "feat: add OrgTab with inline name editing"
```

---

## Task 9: Build DepartmentsTab

**Files:**
- Create: `apps/web/src/components/admin/DepartmentsTab.tsx`

- [ ] **Step 1: Create DepartmentsTab**

Create `apps/web/src/components/admin/DepartmentsTab.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api-client';

interface Dept {
  id: string;
  name: string;
  parentDepartmentId: string | null;
  organizationId: string;
}

interface DeptNode extends Dept {
  children: DeptNode[];
}

function buildTree(flat: Dept[]): DeptNode[] {
  const map = new Map<string, DeptNode>();
  flat.forEach((d) => map.set(d.id, { ...d, children: [] }));
  const roots: DeptNode[] = [];
  map.forEach((node) => {
    if (node.parentDepartmentId && map.has(node.parentDepartmentId)) {
      map.get(node.parentDepartmentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

interface NodeProps {
  node: DeptNode;
  token: string | undefined;
  onMutate: () => void;
  orgId: string;
}

function DeptNodeRow({ node, token, onMutate, orgId }: NodeProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(node.name);
  const [addingChild, setAddingChild] = useState(false);
  const [childName, setChildName] = useState('');
  const [error, setError] = useState('');

  const rename = useMutation({
    mutationFn: (name: string) => api.patch(`/departments/${node.id}`, { name }, token),
    onSuccess: () => { onMutate(); setEditingName(false); },
    onError: (e: any) => setError(e.message ?? 'Error'),
  });

  const addChild = useMutation({
    mutationFn: (name: string) =>
      api.post('/departments', { name, organizationId: orgId, parentDepartmentId: node.id }, token),
    onSuccess: () => { onMutate(); setAddingChild(false); setChildName(''); },
    onError: (e: any) => setError(e.message ?? 'Error'),
  });

  const remove = useMutation({
    mutationFn: () => api.delete(`/departments/${node.id}`, token),
    onSuccess: onMutate,
    onError: (e: any) => setError(e.message ?? 'Cannot delete — department may have members'),
  });

  return (
    <div className="ml-4">
      <div className="flex items-center gap-2 py-1 group">
        <span className="text-gray-400 text-xs">▸</span>
        {editingName ? (
          <>
            <input
              autoFocus
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              className="border border-gray-300 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              onKeyDown={(e) => {
                if (e.key === 'Enter') rename.mutate(nameVal.trim());
                if (e.key === 'Escape') setEditingName(false);
              }}
            />
            <button
              onClick={() => rename.mutate(nameVal.trim())}
              disabled={!nameVal.trim() || rename.isPending}
              className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
            >Save</button>
            <button onClick={() => setEditingName(false)} className="text-xs text-gray-400">Cancel</button>
          </>
        ) : (
          <>
            <span
              className="text-sm text-gray-800 cursor-pointer hover:text-blue-600"
              onClick={() => { setNameVal(node.name); setEditingName(true); }}
            >
              {node.name}
            </span>
            <div className="hidden group-hover:flex items-center gap-2 ml-2">
              <button
                onClick={() => setAddingChild(true)}
                className="text-xs text-blue-500 hover:text-blue-700"
              >+ Child</button>
              <button
                onClick={() => { if (confirm(`Delete "${node.name}"?`)) remove.mutate(); }}
                className="text-xs text-red-400 hover:text-red-600"
              >× Delete</button>
            </div>
          </>
        )}
      </div>

      {error && <p className="text-xs text-red-500 ml-6 mb-1">{error}</p>}

      {addingChild && (
        <div className="ml-6 flex gap-2 mb-2">
          <input
            autoFocus
            value={childName}
            onChange={(e) => setChildName(e.target.value)}
            placeholder="Sub-department name"
            className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && childName.trim()) addChild.mutate(childName.trim());
              if (e.key === 'Escape') setAddingChild(false);
            }}
          />
          <button
            onClick={() => { if (childName.trim()) addChild.mutate(childName.trim()); }}
            disabled={!childName.trim() || addChild.isPending}
            className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
          >Add</button>
          <button onClick={() => setAddingChild(false)} className="text-xs text-gray-400">Cancel</button>
        </div>
      )}

      {node.children.map((child) => (
        <DeptNodeRow key={child.id} node={child} token={token} onMutate={onMutate} orgId={orgId} />
      ))}
    </div>
  );
}

export function DepartmentsTab({ token }: { token: string | undefined }) {
  const qc = useQueryClient();
  const [addingRoot, setAddingRoot] = useState(false);
  const [rootName, setRootName] = useState('');
  const [error, setError] = useState('');

  const { data: orgs } = useQuery<{ id: string }[]>({
    queryKey: ['organizations'],
    queryFn: () => api.get('/organizations', token),
    enabled: !!token,
  });
  const orgId = orgs?.[0]?.id ?? '';

  const { data: departments = [] } = useQuery<Dept[]>({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments', token),
    enabled: !!token,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['departments'] });

  const addRoot = useMutation({
    mutationFn: (name: string) =>
      api.post('/departments', { name, organizationId: orgId }, token),
    onSuccess: () => { refresh(); setAddingRoot(false); setRootName(''); setError(''); },
    onError: (e: any) => setError(e.message ?? 'Error'),
  });

  const tree = buildTree(departments);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Departments</h2>
        <button
          onClick={() => setAddingRoot(true)}
          className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
        >
          + Add department
        </button>
      </div>

      {addingRoot && (
        <div className="flex gap-2 mb-4">
          <input
            autoFocus
            value={rootName}
            onChange={(e) => setRootName(e.target.value)}
            placeholder="Department name"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && rootName.trim()) addRoot.mutate(rootName.trim());
              if (e.key === 'Escape') setAddingRoot(false);
            }}
          />
          <button
            onClick={() => { if (rootName.trim()) addRoot.mutate(rootName.trim()); }}
            disabled={!rootName.trim() || addRoot.isPending}
            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >Add</button>
          <button onClick={() => setAddingRoot(false)} className="text-sm text-gray-400 hover:text-gray-600 px-2">Cancel</button>
        </div>
      )}
      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      {tree.length === 0 && !addingRoot && (
        <p className="text-gray-400 text-sm">No departments yet.</p>
      )}

      {tree.map((node) => (
        <DeptNodeRow key={node.id} node={node} token={token} onMutate={refresh} orgId={orgId} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**
```bash
git add apps/web/src/components/admin/DepartmentsTab.tsx
git commit -m "feat: add hierarchical DepartmentsTab with inline create/rename/delete"
```

---

## Task 10: Build UsersTab and AddUserModal

**Files:**
- Create: `apps/web/src/components/admin/UsersTab.tsx`
- Create: `apps/web/src/components/admin/AddUserModal.tsx`

- [ ] **Step 1: Create AddUserModal**

Create `apps/web/src/components/admin/AddUserModal.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

interface Dept { id: string; name: string; parentDepartmentId: string | null }
interface Org { id: string }

interface Props {
  token: string | undefined;
  onSuccess: () => void;
  onClose: () => void;
}

const ROLES = ['employee', 'manager', 'hr_manager', 'admin', 'superadmin'] as const;

export function AddUserModal({ token, onSuccess, onClose }: Props) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '',
    role: 'employee', departmentId: '', positionName: '', password: '',
  });
  const [error, setError] = useState('');

  const { data: orgs } = useQuery<Org[]>({
    queryKey: ['organizations'],
    queryFn: () => api.get('/organizations', token),
    enabled: !!token,
  });

  const { data: departments = [] } = useQuery<Dept[]>({
    queryKey: ['departments'],
    queryFn: () => api.get('/departments', token),
    enabled: !!token,
  });

  const orgId = orgs?.[0]?.id ?? '';

  const create = useMutation({
    mutationFn: () =>
      api.post('/users', {
        ...form,
        organizationId: orgId,
        departmentId: form.departmentId || undefined,
        positionName: form.positionName || undefined,
      }, token),
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setError(e.message ?? 'Failed to create user'),
  });

  const set = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const valid = form.firstName && form.lastName && form.email &&
    form.password.length >= 8 && orgId;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-gray-900">Add User</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">First name *</label>
              <input
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Last name *</label>
              <input
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Role *</label>
              <select
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Department</label>
              <select
                value={form.departmentId}
                onChange={(e) => set('departmentId', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              >
                <option value="">— None —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Position</label>
            <input
              value={form.positionName}
              onChange={(e) => set('positionName', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              placeholder="e.g. Software Engineer"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Temporary password * (min 8 chars)</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-500 mt-3">{error}</p>}

        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 px-3">
            Cancel
          </button>
          <button
            onClick={() => create.mutate()}
            disabled={!valid || create.isPending}
            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {create.isPending ? 'Creating…' : 'Create user'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create UsersTab**

Create `apps/web/src/components/admin/UsersTab.tsx`:
```tsx
'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { AddUserModal } from './AddUserModal';
import type { PaginatedResponse, User } from '@enterprise/shared';

export function UsersTab({ token }: { token: string | undefined }) {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search],
    queryFn: () =>
      api.get<PaginatedResponse<User>>(
        `/users?search=${encodeURIComponent(search)}&limit=50`,
        token,
      ),
    enabled: !!token,
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => api.patch(`/users/${id}/deactivate`, {}, token),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const ROLE_COLORS: Record<string, string> = {
    superadmin: 'bg-purple-100 text-purple-700',
    admin: 'bg-blue-100 text-blue-700',
    manager: 'bg-green-100 text-green-700',
    hr_manager: 'bg-yellow-100 text-yellow-700',
    employee: 'bg-gray-100 text-gray-600',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <input
          type="search"
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
        >
          + Add User
        </button>
      </div>

      {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data?.data.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                      {user.firstName[0]}{user.lastName[0]}
                    </div>
                    <span className="font-medium text-gray-900">
                      {user.firstName} {user.lastName}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role] ?? 'bg-gray-100 text-gray-600'}`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium ${user.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {user.isActive && (
                    <button
                      onClick={() => {
                        if (confirm(`Deactivate ${user.firstName} ${user.lastName}?`))
                          deactivate.mutate(user.id);
                      }}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Deactivate
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.total === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">No users found.</p>
        )}
      </div>

      {showModal && (
        <AddUserModal
          token={token}
          onClose={() => setShowModal(false)}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['admin-users'] })}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**
```bash
git add apps/web/src/components/admin/
git commit -m "feat: add UsersTab with paginated table, deactivate action, and AddUserModal"
```

---

## Task 11: Smoke test end-to-end

- [ ] **Step 1: Verify API starts cleanly**

Run: `pnpm --filter api dev`
Expected: `Nest application successfully started` with no TypeScript errors in the console.

- [ ] **Step 2: Verify web compiles**

Run: `pnpm --filter web dev`
Expected: Next.js ready on port 3000 with no TypeScript errors.

- [ ] **Step 3: Test create user flow**

1. Navigate to `http://localhost:3000/admin`
2. Click **Users** tab → **+ Add User**
3. Fill in all fields with a new email, set a temporary password (≥ 8 chars)
4. Click **Create user**
5. Expected: modal closes, new user appears in the table
6. Navigate to `http://localhost:8080` → enterprise realm → Users
7. Expected: the new user appears in Keycloak with `UPDATE_PASSWORD` required action

- [ ] **Step 4: Test department tree**

1. Click **Departments** tab → **+ Add department** → create "Engineering"
2. Hover over "Engineering" → click **+ Child** → create "Frontend"
3. Expected: "Frontend" appears nested under "Engineering"
4. Hover over "Frontend" → click **× Delete** → confirm
5. Expected: "Frontend" disappears

- [ ] **Step 5: Test org name edit**

1. Click **Organization** tab → click **Edit** next to the org name
2. Change the name and press Enter or click Save
3. Expected: name updates in the UI
