import { useState, useMemo, useEffect } from 'react';
import { Plus, Trash2, Search, Filter, Edit, Clock, X } from 'lucide-react';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { useApp } from '../context/AppContext';
import PaymentModal from './PaymentModal';
import { Payment } from '../types';
// Local timestamp formatter to avoid module export issues
import { getPaymentVersionHistory, formatVersionHistoryDate } from '../utils/versionHistory';
import { formatYMDHM } from '../utils/date';
import PaginationControls from './PaginationControls';

export default function PaymentsView() {
  const { payments, projects, users, deletePayment, hasPermission } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('All');
  // Selected payment whose version history is shown in the top panel
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const canAdd = hasPermission('payments', 'create');
  const canEdit = hasPermission('payments', 'update');
  const canDelete = hasPermission('payments', 'delete');

  const filteredPayments = useMemo(() => {
    return payments
      .filter((payment) => {
        // First check: payment must not be deleted
        if (payment.deleted) return false;

        // Second check: project must exist and not be deleted
        const project = projects.find((p) => p.id === payment.projectId);
        if (!project || project.deleted) return false;

        // Third check: search filter
        const matchesSearch = project.projectName.toLowerCase().includes(searchTerm.toLowerCase());

        // Fourth check: project filter
        const matchesProject = projectFilter === 'All' || payment.projectId === projectFilter;

        return matchesSearch && matchesProject;
      })
      .sort((a, b) => {
        return new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime();
      });
  }, [payments, projects, searchTerm, projectFilter]);

  const totalPayments = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  const handleDelete = (id: string) => {
    const p = payments.find((x) => x.id === id);
    const label = p ? `${p.paymentType} • ₹${new Intl.NumberFormat('en-IN').format(p.amount)}` : '';
    setConfirmDelete({ id, title: label });
  };

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPayment(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const fmtDate = (dateString: string) => formatYMDHM(dateString);



  const getClientName = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.clientName || 'Unknown Client';
  };

  const getUserName = (payment: Payment) => {
    let user = users.find((u) => u.id === payment.addedBy);

    if (!user && payment.paymentType === 'Advance') {
      const project = projects.find((p) => p.id === payment.projectId);
      if (project?.createdBy) {
        user = users.find((u) => u.id === project.createdBy);
      }
    }

    return user?.fullName || 'Unknown User';
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, projectFilter]);

  const totalItems = filteredPayments.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedPayments = filteredPayments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 p-[15px] sm:p-0">
      <div className="flex flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Payments</h2>
          <p className="text-slate-600 mt-1">
            {filteredPayments.length} payments • Total: {formatCurrency(totalPayments)}
          </p>
        </div>
        {canAdd && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Payment
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="flex flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search payments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-2 rounded-lg border transition-colors ${projectFilter !== 'All'
                ? 'bg-slate-100 border-slate-300 text-slate-900'
                : 'bg-white border-transparent hover:bg-slate-50 text-slate-400'
                }`}
              title="Filter by project"
            >
              <Filter className="w-5 h-5" />
            </button>

            {isFilterOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsFilterOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 animate-in fade-in zoom-in-95 duration-100 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => {
                      setProjectFilter('All');
                      setIsFilterOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${projectFilter === 'All' ? 'text-blue-600 font-medium bg-blue-50' : 'text-slate-700'
                      }`}
                  >
                    All Projects
                  </button>
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        setProjectFilter(project.id);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors truncate ${projectFilter === project.id ? 'text-blue-600 font-medium bg-blue-50' : 'text-slate-700'
                        }`}
                    >
                      {project.projectName}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>


      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 ">
        {paginatedPayments.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-500">
            No payments found. {canAdd && 'Add your first payment to get started.'}
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[700px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Payment Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Added By
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Amount
                    </th>
                    {(canEdit || canDelete) && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedPayments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-800">{fmtDate(payment.paymentDate)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-800">
                          {getClientName(payment.projectId)}
                        </div>
                        {payment.notes && (
                          <div className="text-sm text-slate-500 mt-1">{payment.notes}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${payment.paymentType === 'Advance'
                            ? 'bg-blue-100 text-blue-700'
                            : payment.paymentType === 'Final'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-100 text-slate-700'
                            }`}
                        >
                          {payment.paymentType}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          let user = users.find((u) => u.id === payment.addedBy);
                          if (!user && payment.paymentType === 'Advance') {
                            const project = projects.find((p) => p.id === payment.projectId);
                            if (project?.createdBy) {
                              user = users.find((u) => u.id === project.createdBy);
                            }
                          }
                          const userName = user?.fullName || 'Unknown User';
                          const userPhoto = user?.photoUrl;

                          return (
                            <div className="flex items-center gap-2">
                              {userPhoto ? (
                                <img
                                  src={userPhoto}
                                  alt={userName}
                                  className="w-8 h-8 rounded-full object-cover border-2 border-slate-200"
                                  title={userName}
                                />
                              ) : (
                                <div
                                  className="w-8 h-8 rounded-full bg-slate-600 text-white flex items-center justify-center text-sm font-medium"
                                  title={userName}
                                >
                                  {userName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="text-sm text-slate-800">{userName}</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-green-600">
                        {formatCurrency(payment.amount)}
                      </td>
                      {(canEdit || canDelete) && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedPaymentId(payment.id)}
                              className="relative inline-flex items-center px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="View version history in panel"
                            >
                              <Clock className="w-4 h-4" />
                              {getPaymentVersionHistory(payment.id).length > 0 && (
                                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                                  {getPaymentVersionHistory(payment.id).length}
                                </span>
                              )}
                            </button>
                            {canEdit && (
                              <button
                                onClick={() => handleEdit(payment)}
                                className="inline-flex items-center px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Edit payment"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(payment.id)}
                                className="inline-flex items-center px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete payment"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-200">
              {paginatedPayments.map((payment) => (
                <div key={payment.id} className="p-4 hover:bg-slate-50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-800">
                        {getClientName(payment.projectId)}
                      </h4>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {fmtDate(payment.paymentDate)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${payment.paymentType === 'Advance'
                        ? 'bg-blue-100 text-blue-700'
                        : payment.paymentType === 'Final'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-700'
                        }`}
                    >
                      {payment.paymentType}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Added By:</span>
                      {(() => {
                        let user = users.find((u) => u.id === payment.addedBy);
                        if (!user && payment.paymentType === 'Advance') {
                          const project = projects.find((p) => p.id === payment.projectId);
                          if (project?.createdBy) {
                            user = users.find((u) => u.id === project.createdBy);
                          }
                        }
                        const userName = user?.fullName || 'Unknown User';
                        const userPhoto = user?.photoUrl;

                        return (
                          <div className="flex items-center gap-2">
                            {userPhoto ? (
                              <img
                                src={userPhoto}
                                alt={userName}
                                className="w-6 h-6 rounded-full object-cover border border-slate-200"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-600 text-white flex items-center justify-center text-xs font-medium">
                                {userName.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="font-medium text-slate-800">{userName}</span>
                          </div>
                        );
                      })()}
                    </div>
                    {payment.notes && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Notes:</span>
                        <span className="font-medium text-slate-800 text-right max-w-[200px]">
                          {payment.notes}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-slate-200">
                      <span className="text-slate-600 font-medium">Amount:</span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(payment.amount)}
                      </span>
                    </div>
                  </div>

                  {(canEdit || canDelete) && (
                    <div className="mt-3 pt-3 border-t border-slate-200 flex gap-2">
                      <button
                        onClick={() => setSelectedPaymentId(payment.id)}
                        className="relative flex-1 inline-flex items-center justify-center px-3 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        title="View history"
                      >
                        <Clock className="w-4 h-4 mr-1" />
                        History
                        {getPaymentVersionHistory(payment.id).length > 0 && (
                          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                            {getPaymentVersionHistory(payment.id).length}
                          </span>
                        )}
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => handleEdit(payment)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(payment.id)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="px-4">
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
                onItemsPerPageChange={setItemsPerPage}
              />
            </div>
          </>
        )}
      </div>

      {isModalOpen && <PaymentModal payment={editingPayment} onClose={handleCloseModal} />}

      <ConfirmDeleteModal
        open={!!confirmDelete}
        title="Delete Payment"
        message="Do you really want to delete this payment?"
        detail={confirmDelete?.title}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => { if (confirmDelete) { deletePayment(confirmDelete.id); setConfirmDelete(null); } }}
      />

      {/* Version History Modal - Simple Timeline Design */}
      {selectedPaymentId && (() => {
        const history = getPaymentVersionHistory(selectedPaymentId);
        const payment = payments.find(p => p.id === selectedPaymentId);

        // Group changes by version number (timestamp)
        const groupedHistory: { [key: number]: typeof history } = {};
        history.forEach(change => {
          if (!groupedHistory[change.version_number]) {
            groupedHistory[change.version_number] = [];
          }
          groupedHistory[change.version_number].push(change);
        });

        const versions = Object.keys(groupedHistory).map(Number).sort((a, b) => b - a);

        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4" onClick={() => setSelectedPaymentId(null)}>
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="flex-shrink-0 bg-white border-b border-slate-200 p-3 sm:p-4 flex justify-between items-start gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-slate-800 truncate">Edit History</h3>
                  {payment && <p className="text-xs sm:text-sm text-slate-600 mt-1 truncate">{getClientName(payment.projectId)} - {formatCurrency(payment.amount)}</p>}
                </div>
                <button
                  onClick={() => setSelectedPaymentId(null)}
                  className="flex-shrink-0 p-1.5 sm:p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-3 sm:p-6">
                {versions.length > 0 ? (
                  <div className="space-y-4 sm:space-y-6">
                    {versions.map((versionNum) => {
                      const versionChanges = groupedHistory[versionNum];
                      const firstChange = versionChanges[0];

                      return (
                        <div key={versionNum} className="relative">
                          {/* Timeline dot and line */}
                          <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-200" style={{ left: '9px' }} />
                          <div className="absolute left-0 top-2 w-5 h-5 bg-blue-500 rounded-full border-4 border-white shadow" />

                          <div className="ml-8 sm:ml-10">
                            {/* Timestamp and user */}
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-2">
                              <span className="text-xs sm:text-sm font-medium text-slate-700">
                                {formatVersionHistoryDate(firstChange.edited_at)}
                              </span>
                              {firstChange.edited_by_name && (
                                <>
                                  <span className="text-slate-400 text-xs">•</span>
                                  <span className="text-xs sm:text-sm text-slate-600">by {firstChange.edited_by_name}</span>
                                </>
                              )}
                            </div>

                            {/* Changes */}
                            <div className="bg-slate-50 rounded-lg p-3 sm:p-4 space-y-2.5 sm:space-y-3">
                              {versionChanges.map((change) => (
                                <div key={change.id}>
                                  <div className="text-xs sm:text-sm font-medium text-slate-700 mb-1">{change.field_name}</div>
                                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm flex-wrap">
                                    <span className="text-red-600 line-through break-all">{change.old_value || '(empty)'}</span>
                                    <span className="text-slate-400 flex-shrink-0">→</span>
                                    <span className="text-green-600 font-medium break-all">{change.new_value || '(empty)'}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Clock className="w-10 h-10 sm:w-12 sm:h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-sm sm:text-base text-slate-600">No edit history available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
