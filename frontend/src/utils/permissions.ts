import { ModuleKey, PermissionAction, Permissions, User, UserRole } from '../types';

export const ALL_MODULES: ModuleKey[] = [
  'dashboard',
  'projects',
  'quotations',
  'expenses',
  'payments',
  'suppliers',
  'teams',
  'materials',
  'products',
  'reports',
  'leads',
  'users',
  'settings',
  'trash',
  'todo',
  'todo_team',
  'marketing',
  'summary',
];



export function emptyPermissions(): Permissions {
  const base: Partial<Permissions> = {};
  for (const m of ALL_MODULES) {
    const actions: Record<PermissionAction, boolean> = { create: false, read: false, update: false, delete: false };
    base[m] = actions;
  }
  return base as Permissions;
}

function fullPermissions(): Permissions {
  const base: Partial<Permissions> = {};
  for (const m of ALL_MODULES) {
    const actions: Record<PermissionAction, boolean> = { create: true, read: true, update: true, delete: true };
    base[m] = actions;
  }
  return base as Permissions;
}

export function buildDefaultPermissionsForRole(role: UserRole): Permissions {
  if (role === 'admin') return fullPermissions();

  const perms = emptyPermissions();

  switch (role) {
    case 'accountant': {
      // Focus on expenses, payments, suppliers, reports
      for (const mod of ['expenses', 'payments', 'suppliers'] as ModuleKey[]) {
        perms[mod].create = true;
        perms[mod].read = true;
        perms[mod].update = true;
        perms[mod].delete = true;
      }
      perms['reports'].read = true;
      // Read-only access to teams
      perms['teams'].read = true;
      // Read-only access to trash for audit transparency
      perms['trash'].read = true;
      // Read-only access to projects and quotations
      perms['projects'].read = true;
      perms['quotations'].read = true;
      // Read-only access to products
      perms['products'].read = true;
      break;
    }
    case 'sales': {
      // Create/manage quotations & projects, view payments
      for (const mod of ['quotations', 'projects'] as ModuleKey[]) {
        perms[mod].create = true;
        perms[mod].read = true;
        perms[mod].update = true;
      }
      perms['payments'].read = true;
      perms['reports'].read = true;
      // Read-only access to teams
      perms['teams'].read = true;
      // Manage products
      perms['products'].create = true;
      perms['products'].read = true;
      perms['products'].update = true;
      // No trash access
      break;
    }
    case 'employee': {
      // Read projects; can add expenses
      perms['projects'].read = true;
      perms['quotations'].read = true;
      perms['expenses'].create = true;
      perms['expenses'].read = true;
      // Read-only access to teams
      perms['teams'].read = true;
      // Read-only access to products
      perms['products'].read = true;
      // No trash access
      break;
    }
  }

  // Everyone can read dashboard
  perms['dashboard'].read = true;

  return perms;
}

export function isAllowed(user: User | null, module: ModuleKey, action: PermissionAction): boolean {
  if (!user || user.isActive === false) return false;

  // ONLY use permissions from database - no hardcoded defaults!
  // If user doesn't have permissions set, they have no access
  if (!user.permissions) return false;

  const modulePerms = user.permissions[module];
  if (!modulePerms) return false;

  return Boolean(modulePerms[action]);
}

export function togglePermission(perms: Permissions, module: ModuleKey, action: PermissionAction, value: boolean): Permissions {
  return {
    ...perms,
    [module]: {
      ...perms[module],
      [action]: value,
    },
  };
}
