export type UserRole = 'admin' | 'accountant' | 'sales' | 'employee';

// Permission system
export type PermissionAction = 'create' | 'read' | 'update' | 'delete';
export type ModuleKey =
  | 'dashboard'
  | 'projects'
  | 'quotations'
  | 'expenses'
  | 'payments'
  | 'suppliers'
  | 'teams'
  | 'materials'
  | 'products'
  | 'reports'
  | 'leads'
  | 'users'
  | 'settings'
  | 'trash'
  | 'todo'
  | 'todo_team'
  | 'marketing'
  | 'summary';

export type Permissions = Record<ModuleKey, Record<PermissionAction, boolean>>;

export type ProjectStatus = 'Ongoing' | 'Completed' | 'Cancelled';

export type PaymentType = 'Advance' | 'Installment' | 'Final';

export interface User {
  id: string;
  username: string;
  password: string;
  fullName: string;
  photoUrl?: string;
  role: UserRole;
  phone?: string;
  isActive: boolean;
  // Role management
  roleMode?: 'default' | 'custom';
  permissions?: Permissions;
}
export interface Project {
  id: string;
  projectName: string;
  clientName: string;
  clientContact: string;
  projectType: string;
  startDate: string;
  deadline?: string;
  advancePayment: number;
  projectAmount?: number;
  orderCostToMe?: number;

  totalTasks?: number;
  completedTasks?: number;

  expectedProfitPercentage: number;

  quotationId?: string;
  quotationAmount?: number;
  status: ProjectStatus;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}


export type PaymentMode = 'Cash' | 'Cheque' | 'UPI' | 'Banking';

export interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
}

export interface Expense {
  id: string;
  projectId: string;
  title: string;
  category?: string;
  amount: number;
  expenseDate: string;
  addedBy: string;
  notes?: string;
  paymentMode?: PaymentMode;
  paymentStatus?: 'Paid' | 'Partial' | 'Unpaid';
  receiptImages?: string[];
  items?: ExpenseItem[];
  supplierId?: string;
  // Temporary supplier name for purchases from non-database suppliers
  // Stored with the expense record; not added to Supplier database
  tempSupplierName?: string;
  // Team member ID for labor/work expenses
  teamMemberId?: string;
  // Track how many times this record has been edited
  editCount?: number;
  createdAt: string;
  updatedAt?: string;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface Payment {
  id: string;
  projectId: string;
  amount: number;
  paymentDate: string;
  paymentType: PaymentType;
  // Optional payment method for accounting (Cash/Cheque/UPI/Banking/Other)
  paymentMode?: PaymentMode | 'Other';
  // Optional external reference/transaction number for audit trail
  referenceNumber?: string;
  addedBy: string;
  notes?: string;
  // Track how many times this record has been edited
  editCount?: number;
  createdAt: string;
  updatedAt?: string;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface ProjectSummary {
  project: Project;
  totalPayments: number;
  totalExpenses: number;
  profitLoss: number;
}

export interface QuotationItem {
  id: string;
  item: string;
  description: string;
  quantity: number | string;
  unit: string;
  rate: number;
  amount: number;
}

export interface Quotation {
  id: string;
  clientName: string;
  clientContact?: string;
  clientPhone?: string;
  projectName: string;
  quotationNumber: string;
  quotationDate: string;
  items: QuotationItem[];
  additionalWork?: QuotationItem[];
  subtotal: number;
  discountPercent?: number;
  discountAmount?: number;
  taxPercent: number;
  taxAmount: number;
  total: number;
  notes?: string;
  includeTerms?: boolean;
  // Bank details integration
  includeBankDetails?: boolean;
  bankAccountId?: string;
  status: 'Draft' | 'Sent' | 'Approved' | 'Converted';
  createdBy: string;
  // Track how many times this record has been edited
  editCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface Material {
  id: string;
  projectId: string;
  itemName: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  purchaseDate: string;
  vendor?: string;
  addedBy: string;
  createdAt: string;
}

// Catalog product definition for quotations and materials reference
export interface Product {
  id: string;
  name: string;
  category?: string;
  unit: string;
  defaultRate?: number;
  description?: string;
  sku?: string;
  tags?: string[];
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface Supplier {
  id: string;
  supplierName: string;
  companyName?: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  gstNumber?: string;
  notes?: string;
  category?: string;
  createdAt: string;
  createdBy: string;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  expenseId?: string;
  amount: number;
  paymentDate: string;
  paymentMode: PaymentMode | 'Other';
  notes?: string;
  createdAt: string;
  createdBy: string;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}



export interface Task {
  id: string;
  projectId: string;
  assignedTo?: string | null;
  title: string;
  description?: string | null;
  status?: 'Not Started' | 'To Do' | 'In Progress' | 'Review' | 'Done' | 'Cancelled' | null;
  priority?: 'Low' | 'Medium' | 'High' | 'Urgent' | null;
  dueDate?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  tags?: string[] | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export type LeadSource = 'Instagram' | 'Manual' | 'Facebook' | 'Referral';

export type LeadStatus = 'New' | 'Contacted' | 'Converted' | 'Lost';

export type LeadType = 'Hot' | 'Warm' | 'Cold';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  location?: string;
  source: LeadSource;
  status: LeadStatus;
  lead_type: LeadType;
  remarks?: string;
  assigned_to?: string;
  estimated_value?: number;
  instagram_lead_id?: string;
  created_at: string;
  updated_at?: string;
  created_by: string;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export type InteractionType = 'Call' | 'WhatsApp' | 'Email' | 'Meeting' | 'Note';

export interface LeadInteraction {
  id: string;
  lead_id: string;
  interaction_type: InteractionType;
  remarks: string;
  created_at: string;
  created_by: string;
}

export interface LeadFollowUp {
  id: string;
  lead_id: string;
  follow_up_date: string;
  notes?: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
  created_by: string;
}

export interface MediaFile {
  id: string;
  file_name: string;
  file_type: string;
  file_url: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
  deleted?: boolean;
  deleted_at?: string;
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface VersionHistory {
  id: string;
  record_id?: string;
  version_number: number;
  field_name: string;
  old_value: string;
  new_value: string;
  edited_by: string;
  edited_by_name: string;
  edited_at: string;
}

// ===== Team Module (Labor/Karagir) =====
// Replaces old HR/Payroll structures
export interface TeamMember {
  id: string;
  teamId?: string; // Added to track team association
  name: string;
  skill?: string;
  skills?: string[]; // Array from backend
  phone?: string;
  contact?: string; // Backend uses contact
  status?: 'Active' | 'Inactive';
  employmentStatus?: string; // Backend uses employmentStatus
  rateType?: 'Per Day' | 'Per Sqft' | 'Fixed'; // Made optional as backend might return null
  defaultRate?: number;
  photoUrl?: string;
  notes?: string;
  // Computed fields (optional)
  totalWorkValue?: number;
  totalPaid?: number;
  pendingAmount?: number;
  createdAt: string;
  updatedAt?: string;
  deleted?: boolean;
}

export interface WorkEntry {
  id: string;
  teamMemberId: string;
  projectId?: string;
  workDate: string;
  taskName: string;
  quantity: number;
  rate: number;
  amount: number;
  paymentStatus: 'Pending' | 'Paid' | 'Partial';
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  deleted?: boolean;
}

export interface TeamPayment {
  id: string;
  teamMemberId: string;
  amount: number;
  paymentDate: string;
  paymentMode: string;
  notes?: string;
  workEntryIds?: string[]; // IDs of WorkEntries this payment covers
  createdAt: string;
  updatedAt?: string;
  deleted?: boolean;
}

// ===== Trash / Recycle Bin Types =====

export type TrashAction = 'move' | 'restore' | 'purge' | 'retention_purge';

export interface TrashLog {
  id: string;
  itemType: 'team_member';
  itemId: string; // original item id
  action: TrashAction;
  actorUserId: string;
  reason?: string;
  timestamp: string;
}

export interface TeamMemberTrashItem {
  id: string; // trash record id
  original: TeamMember; // full snapshot of original data
  deletedAt: string;
  deletedBy: string; // user id of deleter
  reason?: string;
  retentionUntil: string; // ISO date when eligible for auto-purge
}

// Bank accounts for payments displayed on quotations
export type BankAccountType = 'Current' | 'Savings';

export interface BankAccount {
  id: string;
  bankName: string;
  accountHolderName: string;
  branchName: string;
  branchAddress: string;
  accountType: BankAccountType;
  accountNumber: string; // keep as string to preserve leading zeros
  ifscCode: string;
  upiIdOrPhone?: string;
  paymentInstructions?: string;
  isDefault?: boolean;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  deleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}
