import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { IndianRupee, FileText, Receipt, Shield } from 'lucide-react';

export default function AdminSummary() {
  const { payments, expenses, quotations, users, projects } = useApp();

  const formatDateTime = (iso?: string) => {
    if (!iso) return '-';
    try {
      return new Date(iso).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return iso;
    }
  };


  const getProjectName = (id?: string) => projects.find((p) => p.id === id)?.projectName || '—';

  const recentExpenses = useMemo(() => {
    return [...expenses]
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 10);
  }, [expenses]);

  const recentPayments = useMemo(() => {
    return [...payments]
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 10);
  }, [payments]);

  const sentQuotations = useMemo(() => {
    return quotations
      .filter((q) => q.status === 'Sent')
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .slice(0, 10);
  }, [quotations]);



  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-slate-800">
        <Shield className="w-5 h-5" />
        <h2 className="text-lg font-semibold">Admin Summary</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Recent Expenses */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-800">Recent Expenses</h3>
          </div>
          <ul className="p-4 space-y-3">
            {recentExpenses.length === 0 && (
              <li className="text-slate-500 text-sm">No recent expenses</li>
            )}
            {recentExpenses.map((e) => {
              const user = users.find((u) => u.id === e.addedBy);
              return (
                <li key={e.id} className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {e.title}
                    </p>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      {formatDateTime(e.createdAt)}
                      <span>·</span>
                      <span className="text-slate-400">added by</span>
                      {user?.photoUrl ? (
                        <img
                          src={user.photoUrl}
                          alt={user.fullName}
                          className="w-4 h-4 rounded-full object-cover border border-slate-200"
                          title={user.fullName}
                        />
                      ) : (
                        <div
                          className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600 border border-slate-300"
                          title={user?.fullName || 'Unknown'}
                        >
                          {(user?.fullName || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-semibold text-rose-600`}>
                      ₹ {Math.abs(e.amount).toLocaleString('en-IN')}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Payments Received */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-800">Payments Received</h3>
          </div>
          <ul className="p-4 space-y-3">
            {recentPayments.length === 0 && (
              <li className="text-slate-500 text-sm">No payments yet</li>
            )}
            {recentPayments.map((p) => {
              let user = users.find((u) => u.id === p.addedBy);

              // For Advance payments created automatically, fallback to project creator if user not found
              if (!user && p.paymentType === 'Advance') {
                const project = projects.find((prj) => prj.id === p.projectId);
                if (project?.createdBy) {
                  user = users.find((u) => u.id === project.createdBy);
                }
              }

              return (
                <li key={p.id} className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {getProjectName(p.projectId)} · {p.paymentType}
                    </p>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      {formatDateTime(p.createdAt)}
                      <span>·</span>
                      <span className="text-slate-400">added by</span>
                      {user?.photoUrl ? (
                        <img
                          src={user.photoUrl}
                          alt={user.fullName}
                          className="w-4 h-4 rounded-full object-cover border border-slate-200"
                          title={user.fullName}
                        />
                      ) : (
                        <div
                          className="w-4 h-4 rounded-full bg-slate-200 flex items-center justify-center text-[8px] font-bold text-slate-600 border border-slate-300"
                          title={user?.fullName || 'Unknown'}
                        >
                          {(user?.fullName || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-emerald-600">
                      ₹ {p.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Quotations Sent */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-800">Quotations Sent</h3>
          </div>
          <ul className="p-4 space-y-3">
            {sentQuotations.length === 0 && (
              <li className="text-slate-500 text-sm">No quotations sent</li>
            )}
            {sentQuotations.map((q) => (
              <li key={q.id} className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {q.clientName} · {q.projectName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(q.createdAt)} · QT: {q.quotationNumber}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-slate-700">
                    ₹ {q.total.toLocaleString('en-IN')}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
