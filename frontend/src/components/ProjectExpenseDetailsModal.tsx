import { useEffect, useState } from 'react';
import { X, Loader2, Edit2 } from 'lucide-react';
import useEscapeKey from '../hooks/useEscapeKey';
import { useApp } from '../context/AppContext';
import { Expense } from '../types';
import { fetchProjectSupplierData, SupplierExpenseSummary } from '../api/projectSuppliers';
import { formatCurrency } from '../utils/formatters';
import { formatLongDate } from '../utils/dates';
import ExpenseModal from './ExpenseModal';

interface Props {
  projectId: string;
  onClose: () => void;
}

export default function ProjectExpenseDetailsModal({ projectId, onClose }: Props) {
  useEscapeKey(onClose);
  const { suppliers, expenses } = useApp();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<SupplierExpenseSummary[]>([]);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);
    fetchProjectSupplierData(projectId, { suppliers, expenses })
      .then((res) => {
        if (!isMounted) return;
        setSummaries(res.suppliers);
      })
      .catch((e: any) => {
        if (!isMounted) return;
        setError(e?.message || 'Failed to load supplier expenses.');
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [projectId, suppliers, expenses]);

  const fmtDate = (dateString: string) => formatLongDate(dateString);

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex md:items-center items-end justify-center md:p-4 z-[9999] animate-in fade-in duration-200 !mt-0">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white w-full max-w-4xl md:rounded-2xl rounded-t-3xl shadow-2xl max-h-[90vh] md:max-h-[85vh] flex flex-col relative z-10 animate-in slide-in-from-bottom duration-300 md:slide-in-from-bottom-10">
        {/* Mobile Drag Handle */}
        <div className="md:hidden w-full flex items-center justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 shrink-0">
          <h3 className="text-xl font-bold text-slate-800">Project Supplier Expenses</h3>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 min-h-0">
          {loading ? (
            <div className="flex items-center gap-2 text-slate-600"><Loader2 className="w-5 h-5 animate-spin" /> Loading...</div>
          ) : error ? (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg p-3 text-sm">{error}</div>
          ) : summaries.length === 0 ? (
            <div className="bg-slate-50 text-slate-700 border border-slate-200 rounded-lg p-3 text-sm">No supplier-linked expenses found for this project.</div>
          ) : (
            <div className="space-y-6">
              {summaries.map(({ supplier, expenses: sExps, totalAmount }) => (
                <div key={supplier.id} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 p-4 bg-slate-50 border-b border-slate-100">
                    <div>
                      <div className="text-slate-900 font-semibold text-lg">{supplier.supplierName}</div>
                      {supplier.companyName && <div className="text-slate-600 text-sm font-medium">{supplier.companyName}</div>}
                    </div>
                    <div className="text-slate-900 font-bold text-lg bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-sm">{formatCurrency(totalAmount)}</div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-white border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Title</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Payment</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Notes</th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {sExps.map((exp) => (
                          <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-slate-800">{exp.title}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{fmtDate(exp.expenseDate)}</td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-slate-800">{formatCurrency(exp.amount)}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{exp.paymentMode || 'Cash'}</td>
                            <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate" title={exp.notes || ''}>{exp.notes || '-'}</td>
                            <td className="px-4 py-3 text-sm text-center">
                              <button
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors font-medium border border-slate-200"
                                onClick={() => setEditingExpense(exp)}
                                aria-label={`Edit ${exp.title}`}
                              >
                                <Edit2 className="w-3.5 h-3.5" /> Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {editingExpense && (
          <ExpenseModal expense={editingExpense} onClose={() => setEditingExpense(null)} />
        )}
      </div>
    </div>
  );
}
