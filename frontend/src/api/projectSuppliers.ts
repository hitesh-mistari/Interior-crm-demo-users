import { Supplier, Expense } from '../types';

export interface SupplierExpenseSummary {
  supplier: Supplier;
  expenses: Expense[];
  totalAmount: number;
}

export interface ProjectSupplierResponse {
  projectId: string;
  suppliers: SupplierExpenseSummary[];
}

// API helper: fetch project-specific supplier expense data.
// If Supabase is configured and has relevant tables, it can be extended to query live data.
export async function fetchProjectSupplierData(
  projectId: string,
  options: {
    suppliers: Supplier[];
    expenses: Expense[];
  }
): Promise<ProjectSupplierResponse> {
  // Local filtering path using in-app state as the single source of truth
  const { suppliers, expenses } = options;
  const projectExpenses = expenses.filter(
    (e) => e.projectId === projectId && !!e.supplierId && !e.deleted
  );

  const grouped = new Map<string, Expense[]>();
  for (const exp of projectExpenses) {
    const sid = exp.supplierId as string;
    if (!grouped.has(sid)) grouped.set(sid, []);
    grouped.get(sid)!.push(exp);
  }

  const summaries: SupplierExpenseSummary[] = Array.from(grouped.entries())
    .map(([sid, exps]) => {
      const supplier = suppliers.find((s) => s.id === sid);
      const totalAmount = exps.reduce((sum, e) => sum + (e.amount || 0), 0);
      return supplier
        ? { supplier, expenses: exps.sort((a,b)=> new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()), totalAmount }
        : undefined;
    })
    .filter(Boolean) as SupplierExpenseSummary[];

  return { projectId, suppliers: summaries };
}

