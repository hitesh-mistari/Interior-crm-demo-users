import { VersionHistory, Payment, Expense, SupplierPayment, Team, TeamMember } from '../types';

// Safe UUID generator: uses crypto.randomUUID when available, otherwise falls back
// to RFC4122 v4-like generation via crypto.getRandomValues, and finally a simple
// time+random string. This prevents runtime errors on browsers without randomUUID.
const safeUUID = (): string => {
  const c: Crypto | undefined = (globalThis as any).crypto;
  try {
    if (c && typeof (c as any).randomUUID === 'function') {
      return (c as any).randomUUID();
    }
    if (c && typeof c.getRandomValues === 'function') {
      const bytes = new Uint8Array(16);
      c.getRandomValues(bytes);
      // Set version (4) and variant bits
      bytes[6] = (bytes[6] & 0x0f) | 0x40;
      bytes[8] = (bytes[8] & 0x3f) | 0x80;
      const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
      return (
        hex.slice(0, 4).join('') +
        '-' +
        hex.slice(4, 6).join('') +
        '-' +
        hex.slice(6, 8).join('') +
        '-' +
        hex.slice(8, 10).join('') +
        '-' +
        hex.slice(10, 16).join('')
      );
    }
  } catch (_) {
    // ignore and fall through
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const logPaymentChange = (
  paymentId: string,
  oldPayment: Payment,
  newPayment: Partial<Payment>,
  userId: string,
  userName: string
): VersionHistory[] => {
  const changes: VersionHistory[] = [];
  const versionNumber = Date.now();

  const fieldMappings: Record<string, string> = {
    amount: 'Amount',
    paymentDate: 'Payment Date',
    paymentType: 'Payment Type',
    notes: 'Notes',
  };

  Object.keys(newPayment).forEach((key) => {
    const fieldKey = key as keyof Payment;
    if (oldPayment[fieldKey] !== newPayment[fieldKey] && fieldKey !== 'updatedAt') {
      changes.push({
        id: safeUUID(),
        version_number: versionNumber,
        field_name: fieldMappings[key] || key,
        old_value: String(oldPayment[fieldKey] || ''),
        new_value: String(newPayment[fieldKey] || ''),
        edited_by: userId,
        edited_by_name: userName,
        edited_at: new Date().toISOString(),
      });
    }
  });

  return changes;
};

// Creation log for payments: capture initial amount/mode/date/reference
export const logPaymentCreation = (
  payment: Payment,
  userId: string,
  userName: string
): VersionHistory[] => {
  const versionNumber = Date.now();
  const entries: VersionHistory[] = [
    {
      id: safeUUID(),
      version_number: versionNumber,
      field_name: 'Amount',
      old_value: '0',
      new_value: String(payment.amount),
      edited_by: userId,
      edited_by_name: userName,
      edited_at: new Date().toISOString(),
    },
  ];
  if (payment.paymentMode) {
    entries.push({
      id: safeUUID(),
      version_number: versionNumber,
      field_name: 'Payment Mode',
      old_value: '',
      new_value: String(payment.paymentMode),
      edited_by: userId,
      edited_by_name: userName,
      edited_at: new Date().toISOString(),
    });
  }
  if (payment.referenceNumber) {
    entries.push({
      id: safeUUID(),
      version_number: versionNumber,
      field_name: 'Reference Number',
      old_value: '',
      new_value: String(payment.referenceNumber),
      edited_by: userId,
      edited_by_name: userName,
      edited_at: new Date().toISOString(),
    });
  }
  return entries;
};

export const logExpenseChange = (
  expenseId: string,
  oldExpense: Expense,
  newExpense: Partial<Expense>,
  userId: string,
  userName: string
): VersionHistory[] => {
  const changes: VersionHistory[] = [];
  const versionNumber = Date.now();

  const fieldMappings: Record<string, string> = {
    title: 'Title',
    amount: 'Amount',
    expenseDate: 'Date',
    notes: 'Notes',
    paymentMode: 'Payment Mode',
    paymentStatus: 'Payment Status',
    supplierId: 'Supplier',
    tempSupplierName: 'Supplier Name',
  };

  // Fields to ignore in version history
  const ignoredFields = ['updatedAt', 'items', 'receiptImages', 'expenseTime', 'createdAt', 'addedBy', 'deleted', 'deletedAt', 'deletedBy', 'projectId'];

  Object.keys(newExpense).forEach((key) => {
    const fieldKey = key as keyof Expense;

    // Skip ignored fields
    if (ignoredFields.includes(key)) {
      return;
    }

    // Skip if values are the same
    if (oldExpense[fieldKey] === newExpense[fieldKey]) {
      return;
    }

    // Skip if both values are empty
    const oldVal = oldExpense[fieldKey];
    const newVal = newExpense[fieldKey];
    if ((!oldVal || oldVal === '') && (!newVal || newVal === '')) {
      return;
    }

    changes.push({
      id: safeUUID(),
      version_number: versionNumber,
      field_name: fieldMappings[key] || key,
      old_value: String(oldExpense[fieldKey] || ''),
      new_value: String(newExpense[fieldKey] || ''),
      edited_by: userId,
      edited_by_name: userName,
      edited_at: new Date().toISOString(),
    });
  });

  if (newExpense.items && oldExpense.items) {
    const oldTotal = oldExpense.items.reduce((sum, item) => sum + item.amount, 0);
    const newTotal = newExpense.items.reduce((sum, item) => sum + item.amount, 0);
    if (oldTotal !== newTotal) {
      changes.push({
        id: safeUUID(),
        version_number: versionNumber,
        field_name: 'Items Total',
        old_value: String(oldTotal),
        new_value: String(newTotal),
        edited_by: userId,
        edited_by_name: userName,
        edited_at: new Date().toISOString(),
      });
    }
  }

  return changes;
};

export const getPaymentVersionHistory = (paymentId: string): VersionHistory[] => {
  const storageKey = `payment_version_${paymentId}`;
  const stored = localStorage.getItem(storageKey);
  return stored ? JSON.parse(stored) : [];
};

export const getExpenseVersionHistory = (expenseId: string): VersionHistory[] => {
  const storageKey = `expense_version_${expenseId}`;
  const stored = localStorage.getItem(storageKey);
  return stored ? JSON.parse(stored) : [];
};

export const savePaymentVersionHistory = (
  paymentId: string,
  newChanges: VersionHistory[]
): void => {
  const storageKey = `payment_version_${paymentId}`;
  const existing = getPaymentVersionHistory(paymentId);
  const updated = [...existing, ...newChanges];
  localStorage.setItem(storageKey, JSON.stringify(updated));
};

export const saveExpenseVersionHistory = (
  expenseId: string,
  newChanges: VersionHistory[]
): void => {
  const storageKey = `expense_version_${expenseId}`;
  const existing = getExpenseVersionHistory(expenseId);
  const updated = [...existing, ...newChanges];
  localStorage.setItem(storageKey, JSON.stringify(updated));
};

export const formatVersionHistoryDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ===== Supplier Payment Version History Helpers =====

export const getSupplierPaymentVersionHistory = (
  paymentId: string
): VersionHistory[] => {
  const storageKey = `supplier_payment_version_${paymentId}`;
  const stored = localStorage.getItem(storageKey);
  return stored ? JSON.parse(stored) : [];
};

export const saveSupplierPaymentVersionHistory = (
  paymentId: string,
  newChanges: VersionHistory[]
): void => {
  const storageKey = `supplier_payment_version_${paymentId}`;
  const existing = getSupplierPaymentVersionHistory(paymentId);
  const updated = [...existing, ...newChanges];
  localStorage.setItem(storageKey, JSON.stringify(updated));
};

// ===== Team & Member Version History =====

export const getTeamVersionHistory = (teamId: string): VersionHistory[] => {
  const storageKey = `team_version_${teamId}`;
  const stored = localStorage.getItem(storageKey);
  return stored ? JSON.parse(stored) : [];
};

export const saveTeamVersionHistory = (teamId: string, changes: VersionHistory[]): void => {
  const storageKey = `team_version_${teamId}`;
  const existing = getTeamVersionHistory(teamId);
  const updated = [...existing, ...changes];
  localStorage.setItem(storageKey, JSON.stringify(updated));
};

export const logTeamChange = (oldTeam: Team, newTeam: Partial<Team>, userId: string, userName: string): VersionHistory[] => {
  const changes: VersionHistory[] = [];
  const versionNumber = Date.now();
  const fieldMappings: Record<string, string> = {
    name: 'Name',
    description: 'Description',
    leaderUserId: 'Leader',
    category: 'Category',
    photoUrl: 'Photo',
    assignedProjectId: 'Assigned Project',
  };
  Object.keys(newTeam).forEach((key) => {
    const fieldKey = key as keyof Team;
    if (oldTeam[fieldKey] !== newTeam[fieldKey] && fieldKey !== 'updatedAt') {
      changes.push({
        id: safeUUID(),
        version_number: versionNumber,
        field_name: fieldMappings[key] || key,
        old_value: String(oldTeam[fieldKey] || ''),
        new_value: String(newTeam[fieldKey] || ''),
        edited_by: userId,
        edited_by_name: userName,
        edited_at: new Date().toISOString(),
      });
    }
  });
  return changes;
};

export const getTeamMemberVersionHistory = (memberId: string): VersionHistory[] => {
  const storageKey = `team_member_version_${memberId}`;
  const stored = localStorage.getItem(storageKey);
  return stored ? JSON.parse(stored) : [];
};

export const saveTeamMemberVersionHistory = (memberId: string, changes: VersionHistory[]): void => {
  const storageKey = `team_member_version_${memberId}`;
  const existing = getTeamMemberVersionHistory(memberId);
  const updated = [...existing, ...changes];
  localStorage.setItem(storageKey, JSON.stringify(updated));
};

export const logTeamMemberChange = (oldMember: TeamMember, newMember: Partial<TeamMember>, userId: string, userName: string): VersionHistory[] => {
  const changes: VersionHistory[] = [];
  const versionNumber = Date.now();
  const fieldMappings: Record<string, string> = {
    name: 'Name',
    age: 'Age',
    contact: 'Contact',
    skills: 'Skills',
    specialties: 'Specialties',
    employmentStatus: 'Employment Status',
    rateType: 'Rate Type',
    rateAmount: 'Rate Amount',
    photoUrl: 'Photo',
  };
  Object.keys(newMember).forEach((key) => {
    const fieldKey = key as keyof TeamMember;
    const oldVal = oldMember[fieldKey];
    const newVal = newMember[fieldKey];
    const isArray = Array.isArray(oldVal) || Array.isArray(newVal);
    const changed = isArray ? JSON.stringify(oldVal || []) !== JSON.stringify(newVal || []) : oldVal !== newVal;
    if (changed && fieldKey !== 'updatedAt') {
      changes.push({
        id: safeUUID(),
        version_number: versionNumber,
        field_name: fieldMappings[key] || key,
        old_value: isArray ? JSON.stringify(oldVal || []) : String(oldVal || ''),
        new_value: isArray ? JSON.stringify(newVal || []) : String(newVal || ''),
        edited_by: userId,
        edited_by_name: userName,
        edited_at: new Date().toISOString(),
      });
    }
  });
  return changes;
};

export const logSupplierPaymentCreation = (
  payment: SupplierPayment,
  userId: string,
  userName: string
): VersionHistory[] => {
  const versionNumber = Date.now();
  return [
    {
      id: safeUUID(),
      version_number: versionNumber,
      field_name: 'Amount',
      old_value: '0',
      new_value: String(payment.amount),
      edited_by: userId,
      edited_by_name: userName,
      edited_at: new Date().toISOString(),
    },
  ];
};

export const logSupplierPaymentChange = (
  oldPayment: SupplierPayment,
  newPayment: Partial<SupplierPayment>,
  userId: string,
  userName: string
): VersionHistory[] => {
  const changes: VersionHistory[] = [];
  const versionNumber = Date.now();

  const fieldMappings: Record<string, string> = {
    amount: 'Amount',
    paymentDate: 'Payment Date',
    paymentMode: 'Payment Mode',
    notes: 'Notes',
  };

  Object.keys(newPayment).forEach((key) => {
    const fieldKey = key as keyof SupplierPayment;
    if (oldPayment[fieldKey] !== newPayment[fieldKey]) {
      changes.push({
        id: safeUUID(),
        version_number: versionNumber,
        field_name: fieldMappings[key] || key,
        old_value: String(oldPayment[fieldKey] || ''),
        new_value: String((newPayment as any)[fieldKey] || ''),
        edited_by: userId,
        edited_by_name: userName,
        edited_at: new Date().toISOString(),
      });
    }
  });

  return changes;
};
