// frontend/src/context/AppContext.tsx

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import * as projectsApi from "../api/projectsApi";
import * as expensesApi from "../api/expensesApi";
import * as paymentsApi from "../api/paymentsApi";
import * as quotationsApi from "../api/quotationsApi";
import * as materialsApi from "../api/materialsApi";
import * as productsApi from "../api/productsApi";
import * as suppliersApi from "../api/suppliersApi";
import * as supplierPaymentsApi from "../api/supplierPaymentsApi";
import * as tasksApi from "../api/tasksApi";
import * as leadsApi from "../api/leadsApi";
import * as leadInteractionsApi from "../api/leadInteractionsApi";
import * as leadFollowUpsApi from "../api/leadFollowUpsApi";
import * as notificationsApi from "../api/notificationsApi";
import * as bankAccountsApi from "../api/bankAccountsApi";
import * as teamsApi from "../api/teamsApi";
import * as teamWorkApi from "../api/teamWorkApi";
import * as teamPaymentsApi from "../api/teamPaymentsApi";
import { formatCurrency } from "../utils/formatters";
import { add as dbAdd, getAll as dbGetAll, remove as dbRemove, addToSyncQueue, getSyncQueue, removeSyncQueueItem } from "../utils/db";

import { patchAuthFetch } from "../utils/fetchAuthPatch";
import { setAuthToken, clearAuthToken, setAuthUser, clearAuthUser } from "../utils/auth";
import * as usersApi from "../api/usersApi";
import * as trashLogsApi from "../api/trashLogsApi";

type AnyObj = Record<string, any>;

interface User {
  id: string;
  email?: string;
  name?: string;
  fullName?: string; // Added to match backend and types.ts
  role?: string;
  photoUrl?: string;
  permissions?: any;
  username?: string;
}

interface ResourceHandlers {
  load?: () => Promise<void>;
  create?: (payload?: any) => Promise<any>;
  update?: (id: string, patch?: any) => Promise<any>;
  delete?: (id: string, ...args: any[]) => Promise<void>;
  restore?: (id: string, ...args: any[]) => Promise<void>;
  purge?: (id: string, ...args: any[]) => Promise<void>;
  loadTrash?: () => Promise<void>;
}

interface AppContextValue {
  currentUser: User | null;
  users: any[];

  notifications: any[];
  hasPermission: (resource: string, action: string) => boolean;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;

  projects: any[];
  expenses: any[];
  payments: any[];
  quotations: any[];
  materials: any[];
  products: any[];
  suppliers: any[];
  supplierPayments: any[];
  tasks: any[];
  leads: any[];
  leadInteractions: any[];
  leadFollowUps: any[];
  bankAccounts: any[];
  trashLogs: any[];

  teams: any[];
  teamWork: any[];
  teamPayments: any[];

  addProject: (payload: any) => Promise<any>;
  updateProject: (id: string, patch: any) => Promise<any>;
  deleteProject: (id: string) => Promise<void>;

  addQuotation: (payload: any) => Promise<any>;
  updateQuotation: (id: string, patch: any) => Promise<any>;
  addUser: (payload: any) => Promise<any>;
  updateUser: (id: string, payload: any) => Promise<any>;
  deleteUser: (id: string) => Promise<void>;

  createBankAccount: (payload: any) => Promise<any>;
  updateBankAccount: (id: string, patch: any) => Promise<any>;
  deleteBankAccount: (id: string) => Promise<void>;

  addTask: (payload: any) => Promise<any>;
  updateTask: (id: string, patch: any) => Promise<any>;
  deleteTask: (id: string) => Promise<void>;

  addExpense: (payload: any) => Promise<any>;
  updateExpense: (id: string, patch: any) => Promise<any>;
  deleteExpense: (id: string) => Promise<void>;
  restoreExpense: (id: string) => Promise<void>;

  addPayment: (payload: any) => Promise<any>;
  updatePayment: (id: string, patch: any) => Promise<any>;
  deletePayment: (id: string) => Promise<void>;
  restorePayment: (id: string) => Promise<void>;

  addSupplier: (payload: any) => Promise<any>;
  updateSupplier: (id: string, patch: any) => Promise<any>;
  deleteSupplier: (id: string) => Promise<void>;
  restoreSupplier: (id: string) => Promise<void>;

  addProduct: (payload: any) => Promise<any>;
  updateProduct: (id: string, patch: any) => Promise<any>;
  deleteProduct: (id: string) => Promise<void>;
  restoreProduct: (id: string) => Promise<void>;

  addMaterial: (payload: any) => Promise<any>;
  deleteMaterial: (id: string) => Promise<void>;

  addLead: (payload: any) => Promise<any>;
  updateLead: (id: string, patch: any) => Promise<any>;
  addLeadInteraction: (payload: any) => Promise<any>;
  addLeadFollowUp: (payload: any) => Promise<any>;

  addTeamMember: (payload: any) => Promise<any>;
  updateTeamMember: (id: string, patch: any) => Promise<any>;
  deleteTeamMember: (id: string) => Promise<void>;

  addTeamWork: (payload: any) => Promise<any>;
  updateTeamWork: (id: string, patch: any) => Promise<any>;
  deleteTeamWork: (id: string) => Promise<void>;

  addTeamPayment: (payload: any) => Promise<any>;
  updateTeamPayment: (id: string, patch: any) => Promise<any>;
  deleteTeamPayment: (id: string) => Promise<void>;

  addSupplierPayment: (payload: any) => Promise<any>;

  addNotification: (message: string) => void;
  deleteQuotation: (id: string) => Promise<void>;
  duplicateQuotation: (id: string) => Promise<void>;
  convertQuotationToProject: (quotationId: string) => Promise<void>;

  restoreProject: (id: string) => Promise<void>;

  login: (u: string, p: string) => Promise<void>;
  logout: () => void;

  handlers: Record<string, ResourceHandlers>;
  loadTrashLogs: () => Promise<void>;
  isSessionLoading: boolean;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

// safe call wrapper
const safeCall = async (fn?: (...args: any[]) => Promise<any>, ...args: any[]) => {
  if (!fn) return;
  try {
    const res = await fn(...args);
    if (res && typeof res === 'object' && 'success' in res) {
      if ((res as any).success) return (res as any).data;
      const msg = String((res as any).error || 'Operation failed');
      throw new Error(msg);
    }
    return res;
  } catch (err: any) {
    const msg = String(err?.message || err);
    const name = String(fn?.name || '').toLowerCase();
    const isListCall = args.length === 0 && /(list|get|fetch|all)/.test(name);
    const isNetwork = /failed to fetch|err_name_not_resolved|networkerror/i.test(msg);
    if (isListCall && isNetwork) return [];
    throw err;
  }
};

// Build module handlers
const buildModuleHandlers = (
  api: AnyObj,
  setData: React.Dispatch<React.SetStateAction<any[]>>,
  setTrash?: React.Dispatch<React.SetStateAction<any[]>>,
  transform?: (x: any) => any
) => {
  const resolveDelete =
    api.deleteExpense ??
    api.deletePayment ??
    api.deleteSupplier ??
    api.deleteProduct ??
    api.deleteMaterial ??
    api.deleteTask ??
    api.deleteProject ??
    api.delete ??
    api.remove ??
    api.destroy ??
    api.deleteOne;

  return {
    load: async () => {
      if (api.list) {
        const d = await safeCall(api.list);
        const arr = Array.isArray(d) ? d : [];
        setData(transform ? arr.map(transform) : arr);
      }
    },

    create: async (payload?: any) => {
      if (!api.create) throw new Error("create not supported");
      const item = await safeCall(api.create, payload);
      const next = transform ? transform(item) : item;
      setData((p) => [...p, next]);
      return next;
    },

    update: async (id: string, patch?: any) => {
      if (!api.update) throw new Error("update not supported");
      const updated = await safeCall(api.update, id, patch);
      const next = transform ? transform(updated) : updated;
      setData((p) => p.map((x) => (x.id === id ? next : x)));
      return next;
    },

    delete: async (id: string, ...a: any[]) => {
      if (!resolveDelete) throw new Error("delete not supported by API module");
      await safeCall(resolveDelete, id, ...a);
      setData((p) => p.filter((x) => x.id !== id));
    },

    restore: async (id: string, ...a: any[]) => {
      if (api.restore) await safeCall(api.restore, id, ...a);

      if (api.list) {
        const d = await safeCall(api.list);
        setData(Array.isArray(d) ? d : []);
      }

      if (api.listTrash && setTrash) {
        const t = await safeCall(api.listTrash);
        setTrash(Array.isArray(t) ? t : []);
      }
    },

    purge: async (id: string, ...a: any[]) => {
      if (api.purge) await safeCall(api.purge, id, ...a);
      if (api.listTrash && setTrash) {
        const t = await safeCall(api.listTrash);
        setTrash(Array.isArray(t) ? t : []);
      }
    },

    loadTrash: async () => {
      if (api.listTrash && setTrash) {
        const t = await safeCall(api.listTrash);
        setTrash(Array.isArray(t) ? t : []);
      }
    },
  };
};

export const AppProvider = ({ children }: { children: any }) => {
  patchAuthFetch();
  // All global states
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [leadInteractions, setLeadInteractions] = useState<any[]>([]);
  const [leadFollowUps, setLeadFollowUps] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [trashLogs, setTrashLogs] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [teamWork, setTeamWork] = useState<any[]>([]);
  const [teamPayments, setTeamPayments] = useState<any[]>([]);
  const [isBackendReachable, setIsBackendReachable] = useState<boolean>(true);

  // Register handlers
  const sanitizeTask = (t: any) => {
    const { estimatedHours, actualHours, tags, ...rest } = t || {};
    return rest;
  };

  const transformBankAccount = (b: any) => ({
    id: b.id,
    bankName: b.bank_name || b.bankName,
    accountHolderName: b.account_holder_name || b.accountHolderName,
    branchName: b.branch_name || b.branchName,
    branchAddress: b.branch_address || b.branchAddress,
    accountType: b.account_type || b.accountType,
    accountNumber: b.account_number || b.accountNumber,
    ifscCode: b.ifsc_code || b.ifscCode,
    upiIdOrPhone: b.upi_id_or_phone || b.upiIdOrPhone,
    paymentInstructions: b.payment_instructions || b.paymentInstructions,
    isDefault: b.is_default !== undefined ? b.is_default : b.isDefault,
    createdAt: b.created_at || b.createdAt,
    createdBy: b.created_by || b.createdBy,
    updatedAt: b.updated_at || b.updatedAt,
    deleted: b.deleted,
    deletedAt: b.deleted_at || b.deletedAt,
    deletedBy: b.deleted_by || b.deletedBy
  });

  const handlers = {
    projects: buildModuleHandlers(projectsApi, setProjects),
    expenses: buildModuleHandlers(expensesApi, setExpenses),
    payments: buildModuleHandlers(paymentsApi, setPayments),
    quotations: buildModuleHandlers(quotationsApi, setQuotations),
    materials: buildModuleHandlers(materialsApi, setMaterials),
    products: buildModuleHandlers(productsApi, setProducts),
    suppliers: buildModuleHandlers(suppliersApi, setSuppliers),
    supplierPayments: buildModuleHandlers(supplierPaymentsApi, setSupplierPayments),
    tasks: buildModuleHandlers(tasksApi, setTasks, undefined, sanitizeTask),
    leads: buildModuleHandlers(leadsApi, setLeads),
    leadInteractions: buildModuleHandlers(leadInteractionsApi, setLeadInteractions),
    leadFollowUps: buildModuleHandlers(leadFollowUpsApi, setLeadFollowUps),
    notifications: buildModuleHandlers(notificationsApi, setNotifications),
    bankAccounts: buildModuleHandlers(bankAccountsApi, setBankAccounts, undefined, transformBankAccount),
    teams: buildModuleHandlers(teamsApi, setTeams),
    teamWork: buildModuleHandlers(teamWorkApi, setTeamWork),
    teamPayments: buildModuleHandlers(teamPaymentsApi, setTeamPayments),
  };

  // Helper to get base URL (stripping /api if present)
  const getBaseUrl = () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
    return apiBase.replace(/\/api$/, "");
  };

  // LOGIN
  const login = async (username: string, password: string) => {
    try {
      const r = await fetch(`${getBaseUrl()}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!r.ok) {
        // Detect stale server (404 on /auth/login)
        if (r.status === 404) {
          throw new Error("Backend server outdated. Please restart 'npm start' in backend terminal.");
        }
        let reason = "Login failed";
        try { const j = await r.json(); reason = j.error || reason; } catch { }
        throw new Error(reason);
      }
      const d = await r.json();
      const token = d.token || d.access_token || d.jwt || d.sessionToken;
      if (token) setAuthToken(token);

      setCurrentUser({
        id: d.user.id,
        email: d.user.username,
        name: d.user.full_name,
        role: d.user.role,
        photoUrl: d.user.photoUrl,
        permissions: d.user.permissions,
      });
      setAuthUser({ id: d.user.id, email: d.user.username, name: d.user.full_name, role: d.user.role });
      return;
    } catch (err) {
      throw err;
    }
  };

  const logout = async () => {
    try { await fetch(`${getBaseUrl()}/auth/logout`, { method: "POST", credentials: 'include' }); } catch { }
    clearAuthToken();
    clearAuthUser();
    setCurrentUser(null);
    try { localStorage.setItem('ae_logout_broadcast', String(Date.now())); } catch { }
  };

  const [isSessionLoading, setIsSessionLoading] = useState(true);

  const checkSession = async () => {
    // ALWAYS fetch fresh user data from API to get permissions
    // Do NOT use cached localStorage data - it doesn't include permissions!
    try {
      const r = await fetch(`${getBaseUrl()}/auth/session`, { credentials: 'include' });
      const d = await r.json();
      if (d.active) {


        // Restore access token from session response (Critcial for persistency)
        if (d.token) {
          setAuthToken(d.token);
        }

        setCurrentUser({
          id: d.user.id,
          email: d.user.username,
          name: d.user.full_name,
          role: d.user.role,
          photoUrl: d.user.photoUrl,
          permissions: d.user.permissions,
        });
        setAuthUser({ id: d.user.id, email: d.user.username, name: d.user.full_name, role: d.user.role });
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      setCurrentUser(null);
    } finally {
      setIsSessionLoading(false);
    }
  };

  const pingBackend = async () => {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
    try {
      // Try common health endpoint first
      let ok = false;
      try {
        const r1 = await fetch(`${getBaseUrl()}/api/health`, { cache: 'no-store' });
        ok = r1.ok;
      } catch { }
      if (!ok) {
        const r2 = await fetch(`${apiBase}/tasks`, { method: 'GET', cache: 'no-store' });
        ok = r2.ok;
      }
      setIsBackendReachable(ok);
      return ok;
    } catch {
      setIsBackendReachable(false);
      return false;
    }
  };



  const hasPermission = (module: string, action: string) => {
    if (!currentUser) return false;

    // Cast to full User type to access permissions
    const user = currentUser as any;

    // ONLY use permissions from database - no hardcoded defaults!
    // If user doesn't have permissions set, they have no access
    if (!user.permissions) return false;

    const modulePerms = user.permissions[module];
    if (!modulePerms) return false;

    return !!modulePerms[action];
  };

  const markNotificationRead = (id: string) => {
    setNotifications((p) => p.map((x) => (x.id === id ? { ...x, read: true } : x)));
  };

  const markAllNotificationsRead = () => {
    setNotifications((p) => p.map((x) => ({ ...x, read: true })));
  };

  // Project handlers
  const addProject = async (payload: any) => {
    try {
      const created = await handlers.projects.create?.(payload);
      await handlers.projects.load?.();
      return created;
    } catch (err) {
      const now = new Date().toISOString();
      const local = {
        id: `mock-proj-${Date.now()}`,
        projectName: payload.projectName || 'Untitled Project',
        clientName: payload.clientName || '',
        clientContact: payload.clientContact || '',
        projectType: payload.projectType || 'General',
        status: payload.status || 'Not Started',
        startDate: payload.startDate || now.slice(0, 10),
        deadline: payload.deadline || '',
        projectAmount: payload.projectAmount ?? 0,
        advancePayment: payload.advancePayment ?? 0,
        expectedProfitPercentage: payload.expectedProfitPercentage ?? 0,
        createdAt: now,
        createdBy: currentUser?.id,
        deleted: false,
        documents: payload.documents || [],
        team: payload.team || [],
      } as any;
      setProjects((prev) => [local, ...prev]);
      addNotification(`Project created offline: ${local.projectName}`);
      return local;
    }
  };

  const updateProject = async (id: string, payload: any) => {
    try {
      const updated = await handlers.projects.update?.(id, payload);
      await handlers.projects.load?.();
      return updated;
    } catch (err) {
      setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, ...payload } : p)));
      addNotification(`Project updated offline`);
      return { id, ...payload } as any;
    }
  };

  const deleteProject = async (id: string) => {
    await handlers.projects.delete?.(id);
    // Reload expenses and payments to reflect cascade deletion
    await handlers.expenses.load?.();
    await handlers.payments.load?.();
    await handlers.supplierPayments.load?.();
    await handlers.quotations.load?.();
    await handlers.teamWork.load?.();
    await handlers.teamPayments.load?.();
  };

  const addQuotation = async (p: any) => {
    const isUuid = (s: any) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    const validCreatedBy = isUuid(currentUser?.id) ? currentUser?.id : null;
    return handlers.quotations.create?.({ ...p, createdBy: validCreatedBy });
  };
  const updateQuotation = async (id: string, p: any) => {
    await handlers.quotations.update?.(id, p);
    // Reload projects to reflect updated project_amount from linked quotation
    await handlers.projects.load?.();
  };

  const addUser = async (payload: any) => {
    const created = await usersApi.create(payload);
    setUsers((prev) => [...prev, created]);
    return created;
  };

  const updateUser = async (id: string, payload: any) => {
    const updated = await usersApi.update(id, payload);
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));

    // If updating current user's permissions, update currentUser state immediately
    if (currentUser && currentUser.id === id && payload.permissions) {
      setCurrentUser((prev) => prev ? { ...prev, permissions: updated.permissions } : null);
    }

    return updated;
  };

  const deleteUser = async (id: string) => {
    await usersApi.deleteUser(id, undefined, currentUser?.id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  };

  // Bank accounts
  const createBankAccount = async (p: any) => {
    const result = await handlers.bankAccounts.create?.(p);
    await handlers.bankAccounts.load?.(); // Reload to ensure UI updates
    return result;
  };
  const updateBankAccount = async (id: string, p: any) => {
    const result = await handlers.bankAccounts.update?.(id, p);
    await handlers.bankAccounts.load?.(); // Reload to ensure UI updates
    return result;
  };
  const deleteBankAccount = async (id: string) => {
    await bankAccountsApi.deleteBankAccount(id, undefined, currentUser?.id);
    await handlers.bankAccounts.load?.();
  };

  // Tasks
  const addTask = async (p: any) => {
    const isUuid = (s: any) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

    const getDefaultAssignee = () => {
      if (currentUser?.id && isUuid(currentUser.id)) return currentUser.id;
      const admin = users.find(u => (u.role || '').toLowerCase() === 'admin' && isUuid(u.id));
      if (admin?.id) return admin.id;
      const firstValid = users.find(u => isUuid(u.id));
      return firstValid?.id;
    };

    // Ensure IDs are valid UUIDs before sending
    const validCreatedBy = isUuid(currentUser?.id) ? currentUser?.id : null;
    const rawAssignedTo = p.assignedTo || getDefaultAssignee();
    const validAssignedTo = isUuid(rawAssignedTo) ? rawAssignedTo : null;

    const payload = {
      ...p,
      createdBy: validCreatedBy,
      assignedTo: validAssignedTo
    };

    const created = await handlers.tasks.create?.(payload);
    await handlers.tasks.load?.();
    await handlers.projects.load?.(); // Refresh projects to update task counts
    return created;
  };
  const updateTask = async (id: string, p: any) => {

    const isMock = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (isMock) {
      const existing = tasks.find(t => t.id === id) || {} as any;
      const isUuid = (s: any) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

      const payload = {
        title: p.title ?? existing.title ?? '',
        description: p.description ?? existing.description ?? '',
        status: p.status ?? existing.status ?? 'Not Started',
        priority: p.priority ?? existing.priority ?? 'Medium',
        dueDate: p.dueDate ?? existing.dueDate ?? null,
        projectId: p.projectId ?? existing.projectId ?? null,
        assignedTo: p.assignedTo ?? existing.assignedTo ?? (isUuid(currentUser?.id) ? currentUser?.id : null),
        createdBy: isUuid(currentUser?.id) ? currentUser?.id : null,
      };
      if (!isBackendReachable) throw new Error('offline');
      const created = await handlers.tasks.create?.(payload);
      setTasks((prev) => prev.map((t) => (t.id === id ? created as any : t)));
      await handlers.tasks.load?.();
      await handlers.projects.load?.(); // Refresh projects
      return created;
    }
    const updated = await handlers.tasks.update?.(id, p);
    await handlers.tasks.load?.();
    await handlers.projects.load?.(); // Refresh projects
    return updated;
  };
  const deleteTask = async (id: string) => {
    const isMock = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    const originalTasks = [...tasks];

    // Optimistic update
    setTasks((prev) => prev.filter((t) => t.id !== id));

    if (isMock) return;

    try {
      // handlers.tasks.delete handles the API call. 
      // Note: It also tries to update state on success, which is fine (id already gone).
      const isUuid = (s: any) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
      const validActorId = isUuid(currentUser?.id) ? currentUser?.id : undefined;
      await handlers.tasks.delete?.(id, undefined, validActorId);
    } catch (err: any) {
      console.error("Failed to delete task", err);
      // Only rollback if it's NOT a "Not found" error
      if (!err.message?.toLowerCase().includes("not found")) {
        setTasks(originalTasks); // Rollback
        addNotification("Failed to delete task");
      }
    }
  };

  // EXPENSE FIX — Auto inject createdBy
  const addExpense = async (p: any) => {
    const isUuid = (s: any) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    const validCreatedBy = isUuid(currentUser?.id) ? currentUser?.id : null;
    const payload = {
      ...p,
      expenseDate: p.expenseDate ?? new Date().toISOString(),
      createdBy: validCreatedBy,
    };

    try {
      const created = await handlers.expenses.create?.(payload);
      await handlers.expenses.load?.();
      return created;
    } catch (err) {
      const now = new Date().toISOString();
      const local = {
        id: `mock-exp-${Date.now()}`,
        projectId: payload.projectId,
        title: payload.title || 'Untitled',
        amount: Number(payload.amount) || 0,
        expenseDate: payload.expenseDate || now,
        paymentMode: payload.paymentMode || null,
        paymentStatus: payload.paymentStatus || null,
        notes: payload.notes || null,
        receiptImages: Array.isArray(payload.receiptImages) ? payload.receiptImages : [],
        supplierId: payload.supplierId || null,
        tempSupplierName: payload.tempSupplierName || null,
        addedBy: payload.createdBy || null,
        editCount: 0,
        createdAt: now,
        updatedAt: null,
        deleted: false,
        deletedAt: null,
        deletedBy: null,
      } as any;
      setExpenses((prev) => [local, ...prev]);
      try { await dbAdd('expenses', local); } catch { }
      try { await addToSyncQueue({ operation: 'create', entity: 'expenses', data: payload }); } catch { }
      addNotification(`Expense added offline: ${local.title} (${formatCurrency(local.amount)})`);
      return local;
    }
  };

  const updateExpense = async (id: string, p: any) => handlers.expenses.update?.(id, p);
  const deleteExpense = async (id: string) => {
    const exp = expenses.find((e) => e.id === id);
    const isMock = exp ? String(exp.id).startsWith('mock-exp-') : false;
    try {
      await handlers.expenses.delete?.(id);
      try { await dbRemove('expenses', id); } catch { }
      try {
        const queue = await getSyncQueue();
        for (const item of queue) {
          if (item.entity === 'expenses' && item.operation === 'create') {
            const d = item.data || {};
            if (isMock && d && d.title === exp?.title && Number(d.amount) === Number(exp?.amount) && d.projectId === exp?.projectId) {
              await removeSyncQueueItem(item.id);
            }
          }
        }
      } catch { }
    } catch (err) {
      setExpenses((prev) => prev.filter((e) => e.id !== id));
      try { await dbRemove('expenses', id); } catch { }
      try {
        if (!isMock) {
          await addToSyncQueue({ operation: 'delete', entity: 'expenses', data: { id } });
        } else {
          const queue = await getSyncQueue();
          for (const item of queue) {
            if (item.entity === 'expenses' && item.operation === 'create') {
              const d = item.data || {};
              if (d && d.title === exp?.title && Number(d.amount) === Number(exp?.amount) && d.projectId === exp?.projectId) {
                await removeSyncQueueItem(item.id);
              }
            }
          }
        }
      } catch { }
    }
  };

  const restoreExpense = async (id: string) => {
    await handlers.expenses.restore?.(id);
    await handlers.expenses.load?.();
  };

  // Payments
  const addPayment = async (p: any) => {
    const isUuid = (s: any) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    const payload = {
      ...p,
      createdBy: isUuid(currentUser?.id) ? currentUser?.id : null,
    };
    try {
      const created = await handlers.payments.create?.(payload);
      await handlers.payments.load?.();
      return created;
    } catch (err) {
      const local = {
        id: `mock-pay-${Date.now()}`,
        ...payload,
        deleted: false,
      } as any;
      setPayments((prev) => [local, ...prev]);
      addNotification(`Payment added offline: ${formatCurrency(payload.amount || 0)}`);
      return local;
    }
  };
  const updatePayment = async (id: string, p: any) => {
    const updated = await handlers.payments.update?.(id, p);
    await handlers.payments.load?.();
    return updated;
  };
  const deletePayment = async (id: string) => {
    await handlers.payments.delete?.(id);
    await handlers.payments.load?.();
  };
  const restorePayment = async (id: string) => {
    await handlers.payments.restore?.(id);
    await handlers.payments.load?.();
  };

  // Suppliers
  const addSupplier = async (p: any) => handlers.suppliers.create?.(p);
  const updateSupplier = async (id: string, p: any) => handlers.suppliers.update?.(id, p);
  const deleteSupplier = async (id: string) => handlers.suppliers.delete?.(id);
  const restoreSupplier = async (id: string) => {
    await handlers.suppliers.restore?.(id);
    await handlers.suppliers.load?.();
  };

  // Products
  const addProduct = async (p: any) => handlers.products.create?.(p);
  const updateProduct = async (id: string, p: any) => handlers.products.update?.(id, p);
  const deleteProduct = async (id: string) => handlers.products.delete?.(id);
  const restoreProduct = async (id: string) => handlers.products.restore?.(id);

  // Materials
  const addMaterial = async (p: any) => handlers.materials.create?.(p);
  const deleteMaterial = async (id: string) => handlers.materials.delete?.(id);

  // Leads
  const addLead = async (p: any) => handlers.leads.create?.(p);
  const updateLead = async (id: string, p: any) => handlers.leads.update?.(id, p);
  const addLeadInteraction = async (p: any) => handlers.leadInteractions.create?.(p);

  // Lead FollowUps
  const addLeadFollowUp = async (p: any) => handlers.leadFollowUps.create?.(p);

  // Teams
  const addTeamMember = async (p: any) => {
    const isUuid = (s: any) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    const validCreatedBy = isUuid(currentUser?.id) ? currentUser?.id : null;
    const payload = { ...p, createdBy: validCreatedBy };
    const created = await handlers.teams.create?.(payload);
    // await handlers.teams.load?.(); // Removed to prevent race condition
    return created;
  };
  const updateTeamMember = async (id: string, p: any) => handlers.teams.update?.(id, p);
  const deleteTeamMember = async (id: string) => handlers.teams.delete?.(id);

  const addTeamWork = async (p: any) => {
    const isUuid = (s: any) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    const validCreatedBy = isUuid(currentUser?.id) ? currentUser?.id : null;
    const payload = { ...p, createdBy: validCreatedBy };
    const created = await handlers.teamWork.create?.(payload);
    await handlers.teamWork.load?.(); // Enabled to ensure dashboard updates
    return created;
  };
  const updateTeamWork = async (id: string, p: any) => handlers.teamWork.update?.(id, p);
  const deleteTeamWork = async (id: string) => handlers.teamWork.delete?.(id);

  const addTeamPayment = async (p: any) => {
    const isUuid = (s: any) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    const validCreatedBy = isUuid(currentUser?.id) ? currentUser?.id : null;
    const payload = { ...p, createdBy: validCreatedBy };
    const created = await handlers.teamPayments.create?.(payload);
    // await handlers.teamPayments.load?.(); // Removed to prevent race condition
    return created;
  };
  const updateTeamPayment = async (id: string, p: any) => handlers.teamPayments.update?.(id, p);
  const deleteTeamPayment = async (id: string) => handlers.teamPayments.delete?.(id);

  // Supplier Payments
  const addSupplierPayment = async (p: any) => {
    const payload = {
      ...p,
      createdBy: currentUser?.id,
    };
    try {
      const result = await handlers.supplierPayments.create?.(payload);

      if (p.expenseId) {
        const expense = expenses.find(e => e.id === p.expenseId);
        if (expense) {
          const allPayments = [...supplierPayments, result];
          const totalPaid = allPayments
            .filter(payment => payment.expenseId === p.expenseId && !payment.deleted)
            .reduce((sum, payment) => sum + payment.amount, 0);
          if (totalPaid >= expense.amount) {
            await handlers.expenses.update?.(p.expenseId, { paymentStatus: 'Paid' });
          }
        }
        // Always reload expenses to get the updated payment_status from backend
        await handlers.expenses.load?.();
      }

      // Always reload supplier payments to ensure the new payment is in the list
      await handlers.supplierPayments.load?.();

      return result;
    } catch (err) {
      const local = {
        id: `mock-sp-${Date.now()}`,
        supplierId: payload.supplierId,
        expenseId: payload.expenseId,
        amount: Number(payload.amount) || 0,
        paymentDate: payload.paymentDate || new Date().toISOString().slice(0, 10),
        paymentMode: payload.paymentMode || 'Cash',
        notes: payload.notes || undefined,
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.id,
        deleted: false,
      } as any;
      setSupplierPayments((prev) => [local, ...prev]);
      addNotification(`Supplier payment added offline: ${formatCurrency(local.amount)}`);

      if (p.expenseId) {
        const expense = expenses.find(e => e.id === p.expenseId);
        if (expense) {
          const allPayments = [...supplierPayments, local];
          const totalPaid = allPayments
            .filter(payment => payment.expenseId === p.expenseId && !payment.deleted)
            .reduce((sum, payment) => sum + payment.amount, 0);
          if (totalPaid >= expense.amount) {
            // optimistic local status update
            setExpenses((prev) => prev.map((e) => e.id === p.expenseId ? { ...e, paymentStatus: 'Paid' } : e));
          }
        }
      }

      try { await addToSyncQueue({ operation: 'create', entity: 'supplierPayments', data: payload }); } catch { }

      return local;
    }
  };

  // Notifications
  const addNotification = (msg: string) => {
    setNotifications((p) => [
      ...p,
      {
        id: crypto.randomUUID(),
        message: msg,
        createdAt: new Date().toISOString(),
        read: false,
      },
    ]);

  };

  const deleteQuotation = async (id: string) => handlers.quotations.delete?.(id);

  const duplicateQuotation = async (id: string) => {
    const isUuid = (s: any) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    const validActorId = isUuid(currentUser?.id) ? currentUser?.id : undefined;
    if (!validActorId) throw new Error("User not authenticated");

    await quotationsApi.duplicate(id, validActorId);
    await handlers.quotations.load?.();
  };

  const convertQuotationToProject = async (quotationId: string) => {
    const isUuid = (s: any) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    const validActorId = isUuid(currentUser?.id) ? currentUser?.id : undefined;
    await quotationsApi.convert(quotationId, validActorId);
    await handlers.projects.load?.();
    await handlers.quotations.load?.();
  };

  const restoreProject = async (id: string) => {
    await handlers.projects.restore?.(id);
    await handlers.projects.load?.();
  };

  const loadTrashLogs = async () => {
    const d = await safeCall(trashLogsApi.listTrashLogs);
    setTrashLogs(Array.isArray(d) ? d : []);
  };

  // LOAD ALL ON START
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'ae_logout_broadcast') {
        clearAuthToken();
        clearAuthUser();
        setCurrentUser(null);
      }
    };
    try { window.addEventListener('storage', onStorage); } catch { }
    (async () => {
      await checkSession();
      const ok = await pingBackend();

      if (ok) {
        const loads = Object.values(handlers)
          .map((h) => h.load?.())
          .filter(Boolean);
        await Promise.allSettled(loads as Promise<any>[]);

        // Merge offline expenses stored in IndexedDB
        try {
          const offlineExpenses = await dbGetAll<any>('expenses');
          setExpenses((prev) => {
            const ids = new Set(prev.map((e) => e.id));
            const toAdd = offlineExpenses.filter((e) => !ids.has(e.id) && !e.deleted);
            return [...toAdd, ...prev];
          });
        } catch { }

        // Replay queued offline creates
        try {
          const queue = await getSyncQueue();
          for (const item of queue) {
            try {
              if (item.entity === 'expenses' && item.operation === 'create') {
                const created = await handlers.expenses.create?.(item.data);
                await removeSyncQueueItem(item.id);
                if (created) {
                  setExpenses((prev) => {
                    const withoutMock = prev.filter((e) => !(String(e.id).startsWith('mock-exp-') && e.title === item.data.title && e.amount === item.data.amount));
                    return [created, ...withoutMock];
                  });
                }
              } else if (item.entity === 'supplierPayments' && item.operation === 'create') {
                const createdSP = await handlers.supplierPayments.create?.(item.data);
                await removeSyncQueueItem(item.id);
                if (createdSP) {
                  setSupplierPayments((prev) => {
                    const withoutMock = prev.filter((sp) => String(sp.id).startsWith('mock-sp-'));
                    return [createdSP, ...withoutMock];
                  });
                  // If linked to an expense and fully paid, refresh expenses
                  const expId = item.data?.expenseId;
                  if (expId) {
                    const expense = expenses.find(e => e.id === expId);
                    if (expense) {
                      const allPayments = [...supplierPayments, createdSP];
                      const totalPaid = allPayments.filter(p => p.expenseId === expId && !p.deleted).reduce((s, p) => s + p.amount, 0);
                      if (totalPaid >= expense.amount) {
                        await handlers.expenses.update?.(expId, { paymentStatus: 'Paid' });
                        await handlers.expenses.load?.();
                      }
                    }
                  }
                }
              }
            } catch { }
          }
        } catch { }
      } else {
        console.warn('Backend unreachable');
      }


      const normalizeUser = (u: any) => ({
        id: u.id,
        fullName: u.fullName || u.full_name || u.name || u.username || u.email || 'User',
        username: u.username || u.email || u.name || u.full_name || 'user',
        role: u.role || 'employee',
        photoUrl: u.photoUrl || u.avatar_url || undefined,
        phone: u.phone || u.mobile || undefined,
        isActive: (u.isActive !== undefined ? u.isActive : (u.is_active !== undefined ? u.is_active : true)),
        deleted: (u.deleted !== undefined ? u.deleted : (u.is_deleted !== undefined ? u.is_deleted : false)),
        // CRITICAL: Include permissions and roleMode so they're available in UserModal!
        permissions: u.permissions || null,
        roleMode: u.roleMode || u.role_mode || 'default',
        password: u.password || '', // Include password for editing
      });

      const DEBUG = Boolean(import.meta.env.VITE_DEBUG);
      try {
        if (DEBUG) console.log('[DEBUG] Attempting to load users from API...');
        const raw = await safeCall(usersApi.list);
        if (DEBUG) console.log('[DEBUG] Raw API response:', raw);
        // Backend returns users as direct array
        const arr = Array.isArray(raw) ? raw : (raw?.data || raw?.rows || raw?.users || []);
        if (DEBUG) console.log('[DEBUG] Users loaded from API:', arr.length, arr);

        let loadedUsers = (arr || []).map(normalizeUser);
        if (currentUser && !loadedUsers.some((u: any) => u.id === currentUser.id)) {
          loadedUsers = [normalizeUser(currentUser), ...loadedUsers];
        }
        setUsers(loadedUsers);
      } catch (err) {
        if (DEBUG) console.error('[DEBUG] Failed to load users:', err);
        if (currentUser) {
          if (DEBUG) console.log('[DEBUG] Falling back to current user only');
          setUsers([normalizeUser(currentUser)]);
        } else {
          if (DEBUG) console.log('[DEBUG] No users available, setting empty array');
          setUsers([]);
        }
      }

      if (ok) {
        try {
          await loadTrashLogs();
        } catch {
          setTrashLogs([]);
        }
      } else {
        setTrashLogs([]);
      }
    })();
    return () => { try { window.removeEventListener('storage', onStorage); } catch { } };
  }, []);


  // PROVIDER VALUE
  const value = useMemo<AppContextValue>(() => {
    return {
      currentUser,
      users,
      isSessionLoading,

      notifications,
      hasPermission,
      markNotificationRead,
      markAllNotificationsRead,

      projects,
      expenses,
      payments,
      quotations,
      materials,
      products,
      suppliers,
      supplierPayments,
      tasks,
      leads,
      leadInteractions,
      leadFollowUps,
      bankAccounts,
      trashLogs,

      teams,
      teamWork,
      teamPayments,

      addProject,
      updateProject,
      deleteProject,

      addQuotation,
      updateQuotation,
      deleteQuotation,
      duplicateQuotation,
      convertQuotationToProject,

      addUser,
      updateUser,
      deleteUser,

      createBankAccount,
      updateBankAccount,
      deleteBankAccount,

      restoreProject,

      addTask,
      updateTask,
      deleteTask,

      addExpense,
      updateExpense,
      deleteExpense,
      restoreExpense,

      addPayment,
      updatePayment,
      deletePayment,
      restorePayment,

      addSupplier,
      updateSupplier,
      deleteSupplier,
      restoreSupplier,

      addProduct,
      updateProduct,
      deleteProduct,
      restoreProduct,

      addMaterial,
      deleteMaterial,

      addLead,
      updateLead,
      addLeadInteraction,
      addLeadFollowUp,

      addTeamMember,
      updateTeamMember,
      deleteTeamMember,
      addTeamWork,
      updateTeamWork,
      deleteTeamWork,
      addTeamPayment,
      updateTeamPayment,
      deleteTeamPayment,

      addSupplierPayment,

      addNotification,

      login,
      logout,

      handlers,
      loadTrashLogs,
    };
  }, [
    currentUser,
    users,
    isSessionLoading,
    notifications,
    projects,
    expenses,
    payments,
    quotations,
    materials,
    products,
    suppliers,
    supplierPayments,
    tasks,
    leads,
    leadInteractions,
    leadFollowUps,
    bankAccounts,
    trashLogs,
    teams,
    teamWork,
    teamPayments,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export default AppProvider;
// End of context
