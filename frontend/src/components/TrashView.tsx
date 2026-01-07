import { RotateCcw, FolderKanban, Receipt, CreditCard, Building2 } from 'lucide-react';
import { formatLongDate } from '../utils/dates';
import { useApp } from '../context/AppContext';

export default function TrashView() {
  const {
    projects,
    expenses,
    payments,
    suppliers,
    users,
    trashLogs,
    restoreProject,
    restoreExpense,
    restorePayment,
    restoreSupplier,
  } = useApp();



  const deletedProjects = projects.filter((p) => p.deleted);
  const deletedExpenses = expenses.filter((e) => e.deleted);
  const deletedPayments = payments.filter((p) => p.deleted);
  const deletedSuppliers = suppliers.filter((s) => s.deleted);

  const handleRestoreProject = (id: string) => {
    if (window.confirm('Are you sure you want to restore this project?')) {
      restoreProject(id);
    }
  };

  const handleRestoreExpense = (id: string) => {
    if (window.confirm('Are you sure you want to restore this expense?')) {
      restoreExpense(id);
    }
  };

  const handleRestorePayment = (id: string) => {
    if (window.confirm('Are you sure you want to restore this payment?')) {
      restorePayment(id);
    }
  };

  const handleRestoreSupplier = (id: string) => {
    if (window.confirm('Are you sure you want to restore this supplier?')) {
      restoreSupplier(id);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Trash</h2>
        <p className="text-slate-600 mt-1">Restore deleted items and manage team member trash</p>
      </div>

      <div className="space-y-6">
        {/* Team Member Trash */}


        {/* Trash Activity Log */}
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800">Recent Trash Activity</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Actor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(trashLogs || []).slice(0, 20).map((log) => {
                  const actor = users.find((u) => u.id === log.actorUserId)?.fullName || log.actorUserId;
                  const label = log.itemId;
                  return (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-slate-700">{new Date(log.timestamp).toLocaleString('en-IN')}</td>
                      <td className="px-6 py-4 text-slate-700">{label}</td>
                      <td className="px-6 py-4 text-slate-700">{log.action.replace('_', ' ')}</td>
                      <td className="px-6 py-4 text-slate-700">{actor}</td>
                      <td className="px-6 py-4 text-slate-700">{log.reason || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <FolderKanban className="w-5 h-5" />
              Deleted Projects
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Deleted By
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {deletedProjects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      No deleted projects
                    </td>
                  </tr>
                ) : (
                  deletedProjects.map((project) => (
                    <tr key={project.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{project.projectName}</div>
                        <div className="text-sm text-slate-600 mt-0.5">{project.clientName}</div>
                        <div className="text-sm text-slate-500">{project.clientContact}</div>
                        <div className="text-sm text-slate-500">ID: {project.id}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{project.projectType}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${project.status === 'Completed'
                            ? 'bg-green-100 text-green-800'
                            : project.status === 'Cancelled'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                            }`}
                        >
                          {project.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-700">
                        {users.find((u) => u.id === project.deletedBy)?.fullName || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleRestoreProject(project.id)}
                            className="flex items-center gap-2 px-3 py-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Restore"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Restore
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Deleted Expenses
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Project
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Deleted By
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {deletedExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                      No deleted expenses
                    </td>
                  </tr>
                ) : (
                  deletedExpenses.map((expense) => {
                    const project = projects.find((p) => p.id === expense.projectId);
                    return (
                      <tr key={expense.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-slate-800">{expense.title}</div>
                          {expense.notes && (
                            <div className="text-sm text-slate-500">{expense.notes}</div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-slate-700">{project?.projectName || 'Unknown'}</div>
                          <div className="text-sm text-slate-600 mt-0.5">{project?.clientName}</div>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-slate-800">
                          {formatCurrency(expense.amount)}
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          {formatLongDate(expense.expenseDate)}
                        </td>
                        <td className="px-6 py-4 text-slate-700">
                          {users.find((u) => u.id === expense.deletedBy)?.fullName || '-'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleRestoreExpense(expense.id)}
                              className="flex items-center gap-2 px-3 py-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Restore"
                            >
                              <RotateCcw className="w-4 h-4" />
                              Restore
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Deleted Payments
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Project</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Deleted By</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {deletedPayments.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No deleted payments</td>
                  </tr>
                ) : (
                  deletedPayments.map((payment) => {
                    const project = projects.find((p) => p.id === payment.projectId);
                    return (
                      <tr key={payment.id} className="hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <div className="text-slate-700">{project?.projectName || 'Unknown'}</div>
                          <div className="text-sm text-slate-600 mt-0.5">{project?.clientName}</div>
                        </td>
                        <td className="px-6 py-4 text-slate-700">{payment.paymentType}</td>
                        <td className="px-6 py-4 text-right font-semibold text-slate-800">{formatCurrency(payment.amount)}</td>
                        <td className="px-6 py-4 text-slate-700">{formatLongDate(payment.paymentDate)}</td>
                        <td className="px-6 py-4 text-slate-700">{users.find((u) => u.id === payment.deletedBy)?.fullName || '-'}</td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center">
                            <button
                              onClick={() => handleRestorePayment(payment.id)}
                              className="flex items-center gap-2 px-3 py-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Restore"
                            >
                              <RotateCcw className="w-4 h-4" />
                              Restore
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Deleted Suppliers
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Company</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Deleted By</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {deletedSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">No deleted suppliers</td>
                  </tr>
                ) : (
                  deletedSuppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">{supplier.supplierName}</div>
                      </td>
                      <td className="px-6 py-4 text-slate-700">{supplier.companyName || '-'}</td>
                      <td className="px-6 py-4 text-slate-700">{supplier.phone}</td>
                      <td className="px-6 py-4 text-slate-700">{users.find((u) => u.id === supplier.deletedBy)?.fullName || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <button
                            onClick={() => handleRestoreSupplier(supplier.id)}
                            className="flex items-center gap-2 px-3 py-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Restore"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Restore
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
