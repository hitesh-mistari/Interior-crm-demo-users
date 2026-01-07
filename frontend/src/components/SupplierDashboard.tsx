import { useState, useMemo, Fragment, useEffect } from 'react';
import {
  ArrowLeft,
  Phone,
  Building2,
  MapPin,
  CreditCard,
  Calendar,
  TrendingUp,
  Download,
  Plus,
  Image as ImageIcon,
  Filter,
  AlertTriangle,
  ChevronDown,
  Banknote,
  Smartphone,
  Building,
  FileText,
  User,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import SupplierPaymentModal from './SupplierPaymentModal';
import { formatCurrency } from '../utils/formatters';
import { formatLongDate, formatShortDate } from '../utils/dates';
import { generateSupplierPDF } from '../utils/pdfGenerator';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

interface SupplierDashboardProps {
  supplierId: string;
  onClose: () => void;
}

type DateFilter = 'today' | 'week' | 'month' | '6months' | 'year' | 'all';
type PaymentStatusFilter = 'all' | 'paid' | 'partial' | 'pending';

export default function SupplierDashboard({ supplierId, onClose }: SupplierDashboardProps) {
  const { suppliers, expenses, supplierPayments, projects, users, currentUser } = useApp();
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedExpenseForPayment, setSelectedExpenseForPayment] = useState<string | null>(
    null
  );
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>('all');
  const [selectedExpenseImages, setSelectedExpenseImages] = useState<string[] | null>(null);
  const [selectedFullImage, setSelectedFullImage] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [supplierId]);

  const supplier = suppliers.find((s) => s.id === supplierId);
  const fmtDate = (dateString: string) => formatLongDate(dateString);

  if (!supplier) {
    return null;
  }

  const canRecordPayment = ['admin', 'accountant'].includes(currentUser?.role || '');

  const supplierExpenses = expenses.filter(
    (e) => e.supplierId === supplierId && !e.deleted
  );
  const payments = supplierPayments.filter((p) => p.supplierId === supplierId && !p.deleted);

  const getExpensePaidAmount = (expenseId: string, expenseAmount: number, expenseStatus?: string) => {
    // If expense is marked as "Paid", return the full amount
    if (expenseStatus === 'Paid') {
      return expenseAmount;
    }
    // Otherwise, return the sum of supplier payments for this expense
    return payments
      .filter((p) => p.expenseId === expenseId)
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const getPaymentStatus = (
    amount: number,
    paid: number
  ): 'paid' | 'partial' | 'pending' => {
    if (paid === 0) return 'pending';
    if (paid >= amount) return 'paid';
    return 'partial';
  };

  const getFilteredExpenses = () => {
    const now = new Date();
    let filtered = [...supplierExpenses];

    switch (dateFilter) {
      case 'today':
        filtered = filtered.filter(
          (e) =>
            new Date(e.expenseDate).toDateString() === now.toDateString()
        );
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter((e) => new Date(e.expenseDate) >= weekAgo);
        break;
      case 'month':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        filtered = filtered.filter((e) => new Date(e.expenseDate) >= monthAgo);
        break;
      case '6months':
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        filtered = filtered.filter((e) => new Date(e.expenseDate) >= sixMonthsAgo);
        break;
      case 'year':
        const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        filtered = filtered.filter((e) => new Date(e.expenseDate) >= yearAgo);
        break;
    }

    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter((expense) => {
        const expensePaid = getExpensePaidAmount(expense.id, expense.amount, (expense as any).paymentStatus);
        const status = getPaymentStatus(expense.amount, expensePaid);
        return status === paymentStatusFilter;
      });
    }

    return filtered.sort(
      (a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime()
    );
  };

  const filteredExpenses = getFilteredExpenses();

  // Pagination Logic
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);

  const paginatedExpenses = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredExpenses.slice(start, start + itemsPerPage);
  }, [filteredExpenses, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [dateFilter, paymentStatusFilter]);

  const stats = useMemo(() => {
    const totalPurchases = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Calculate total paid from both supplier payments AND expenses marked as "Paid"
    // Important: Don't double count - if an expense is marked as 'Paid', ignore supplier payments for it
    const paidFromExpenseStatus = filteredExpenses
      .filter((e) => (e as any).paymentStatus === 'Paid')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const paidFromPayments = payments
      .filter((p) => {
        // Count general payments not linked to any expense
        if (!p.expenseId) return true;
        // Only count if the expense exists in filtered expenses
        const expense = filteredExpenses.find((e) => e.id === p.expenseId);
        if (!expense) return false;
        // Only count if the expense is NOT marked as 'Paid' (to avoid double counting)
        return (expense as any).paymentStatus !== 'Paid';
      })
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const totalPaid = paidFromPayments + paidFromExpenseStatus;
    const outstanding = totalPurchases - totalPaid;

    const lastPurchase = filteredExpenses.length > 0
      ? new Date(
        Math.max(...filteredExpenses.map((e) => new Date(e.expenseDate).getTime()))
      )
      : null;

    return {
      totalPurchases,
      totalPaid,
      outstanding,
      lastPurchase,
      purchaseCount: filteredExpenses.length,
    };
  }, [filteredExpenses, payments]);

  const toggleRow = (expenseId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(expenseId)) {
      newExpanded.delete(expenseId);
    } else {
      newExpanded.add(expenseId);
    }
    setExpandedRows(newExpanded);
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cash':
        return <Banknote className="w-4 h-4" />;
      case 'upi':
        return <Smartphone className="w-4 h-4" />;
      case 'banking':
      case 'bank':
      case 'cheque':
        return <Building className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const handleRecordPayment = (expenseId?: string) => {
    setSelectedExpenseForPayment(expenseId || null);
    setIsPaymentModalOpen(true);
  };

  const handleGeneratePDF = () => {
    generateSupplierPDF(
      supplier,
      filteredExpenses,
      payments,
      projects,
      dateFilter,
      stats
    );
  };

  const getProjectName = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.projectName || 'Unknown Project';
  };

  const getUserName = (userId: string) => {
    if (!userId) return 'System';
    const user = users.find((u) => u.id === userId);
    return user?.fullName || 'System';
  };

  const getUser = (userId: string) => {
    return users.find((u) => u.id === userId);
  };

  return (
    <div className="space-y-6 pb-20 p-[15px] sm:p-0">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 inline-flex items-center gap-2 transition-transform active:scale-95 shadow-sm shadow-slate-200"
          >
            <ArrowLeft className="w-4 h-4" /> <span className="hidden md:inline font-medium">Back</span>
          </button>
        </div>
        <div className="flex-1 text-center md:text-left px-2">
          <h2 className="text-xl md:text-2xl font-bold text-slate-800 truncate">{supplier.supplierName}</h2>
          {supplier.companyName && (
            <p className="text-xs md:text-sm text-slate-600 truncate hidden md:block">{supplier.companyName}</p>
          )}
        </div>
        <button
          onClick={handleGeneratePDF}
          className="inline-flex items-center px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-transform active:scale-95 shadow-sm shadow-slate-200"
        >
          <Download className="w-4 h-4 md:mr-2" />
          <span className="hidden md:inline font-medium">Generate PDF</span>
        </button>
      </div>

      {/* Supplier Info Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <Building2 className="w-32 h-32 text-slate-900" />
        </div>
        <h3 className="font-bold text-slate-800 mb-4 relative z-10">Supplier Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 flex-shrink-0">
              <Phone className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">Primary Phone</p>
              <p className="font-semibold text-slate-800">{supplier.phone}</p>
            </div>
          </div>
          {supplier.alternatePhone && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 flex-shrink-0">
                <Phone className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">Alternate Phone</p>
                <p className="font-semibold text-slate-800">{supplier.alternatePhone}</p>
              </div>
            </div>
          )}
          {supplier.address && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 flex-shrink-0">
                <MapPin className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">Address</p>
                <p className="font-semibold text-slate-800">{supplier.address}</p>
              </div>
            </div>
          )}
          {supplier.gstNumber && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 flex-shrink-0">
                <CreditCard className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">GST Number</p>
                <p className="font-semibold text-slate-800">{supplier.gstNumber}</p>
              </div>
            </div>
          )}
          {supplier.category && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 flex-shrink-0">
                <Building2 className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">Category</p>
                <p className="font-semibold text-slate-800">{supplier.category}</p>
              </div>
            </div>
          )}
          {stats.lastPurchase && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 flex-shrink-0">
                <Calendar className="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">Last Purchase</p>
                <p className="font-semibold text-slate-800">
                  {fmtDate(stats.lastPurchase.toISOString())}
                </p>
              </div>
            </div>
          )}
        </div>
        {supplier.notes && (
          <div className="mt-4 pt-4 border-t border-slate-100 relative z-10">
            <p className="text-xs text-slate-400 uppercase font-bold tracking-wide mb-1">Notes</p>
            <p className="text-sm text-slate-700">{supplier.notes}</p>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 relative overflow-hidden group min-h-[120px] flex flex-col justify-center">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="w-20 h-20 text-slate-900" />
          </div>
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-2 border border-slate-100">
              <TrendingUp className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Total Purchases</p>
            <p className="text-2xl font-extrabold text-slate-900 truncate tracking-tight">
              {formatCurrency(stats.totalPurchases)}
            </p>
            <p className="text-[10px] uppercase font-bold text-slate-400 mt-1 bg-slate-50 inline-block px-1.5 py-0.5 rounded border border-slate-100">{stats.purchaseCount} transactions</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 relative overflow-hidden group min-h-[120px] flex flex-col justify-center">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
            <TrendingUp className="w-20 h-20 text-emerald-600" />
          </div>
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-2 border border-emerald-100">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Total Paid</p>
            <p className="text-2xl font-extrabold text-slate-900 truncate tracking-tight">
              {formatCurrency(stats.totalPaid)}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 relative overflow-hidden group min-h-[120px] flex flex-col justify-center">
          <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
            <AlertTriangle className="w-20 h-20 text-rose-600" />
          </div>
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center mb-2 border border-rose-100">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Outstanding</p>
            <p className="text-2xl font-extrabold text-slate-900 truncate tracking-tight">
              {formatCurrency(stats.outstanding)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="flex flex-row items-center gap-4 overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as DateFilter)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none bg-white min-w-[120px]"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="6months">Last 6 Months</option>
              <option value="year">This Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <select
              value={paymentStatusFilter}
              onChange={(e) =>
                setPaymentStatusFilter(e.target.value as PaymentStatusFilter)
              }
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none bg-white min-w-[120px]"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 sm:p-6 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800">Purchase History</h3>
        </div>
        {filteredExpenses.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-500">
            No purchases found for the selected filters.
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[1000px] border border-slate-200 rounded-lg">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Added By
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Paid
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Receipt
                    </th>
                    {canRecordPayment && (
                      <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                        Details
                      </th>
                    )}
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Expand
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paginatedExpenses.map((expense) => {
                    const paid = getExpensePaidAmount(expense.id, expense.amount, (expense as any).paymentStatus);
                    const balance = expense.amount - paid;
                    const status = getPaymentStatus(expense.amount, paid);

                    return (
                      <Fragment key={expense.id}>
                        <tr className="hover:bg-slate-50">
                          <td className="px-6 py-4 text-sm text-slate-800">
                            {fmtDate(expense.expenseDate)}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-800">
                            {getProjectName(expense.projectId)}
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <div className="font-medium text-slate-800">{expense.title}</div>
                              {expense.notes && (
                                <div className="text-sm text-slate-500 mt-1">
                                  {expense.notes}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 text-center">
                            {(() => {
                              const user = users.find((u) => u.id === expense.addedBy);
                              if (!user) return 'Unknown';

                              return (
                                <div className="flex items-center justify-center gap-2">
                                  {user.photoUrl ? (
                                    <img
                                      src={user.photoUrl}
                                      alt={user.fullName || user.name}
                                      className="w-6 h-6 rounded-full object-cover border border-slate-200"
                                    />
                                  ) : (
                                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                      <User className="w-3 h-3 text-slate-400" />
                                    </div>
                                  )}
                                  <span className="font-medium">
                                    {user.fullName?.split(' ')[0] || user.name || 'Unknown'}
                                  </span>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-slate-800">
                            {formatCurrency(expense.amount)}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-green-600">
                            {formatCurrency(paid)}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-amber-600">
                            {formatCurrency(balance)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status === 'paid'
                                ? 'bg-green-100 text-green-700'
                                : status === 'partial'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-red-100 text-red-700'
                                }`}
                            >
                              {status === 'paid' ? 'Paid' : status === 'partial' ? 'Partial' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            {expense.receiptImages && expense.receiptImages.length > 0 ? (
                              <button
                                onClick={() =>
                                  setSelectedExpenseImages(expense.receiptImages || null)
                                }
                                className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                              >
                                <ImageIcon className="w-3 h-3" />
                                View
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400">No receipt</span>
                            )}
                          </td>
                          {canRecordPayment && (
                            <td className="px-6 py-4 text-right">
                              {balance > 0 && (
                                <button
                                  onClick={() => handleRecordPayment(expense.id)}
                                  className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                  Pay
                                </button>
                              )}
                            </td>
                          )}
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => toggleRow(expense.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-200 transition-all duration-200"
                            >
                              {expandedRows.has(expense.id) ? (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5 rotate-180 transition-transform duration-300" />
                                  Hide
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="w-3.5 h-3.5 transition-transform duration-300" />
                                  Show
                                </>
                              )}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded Payment History Row */}
                        {expandedRows.has(expense.id) && (
                          <tr>
                            <td colSpan={canRecordPayment ? 11 : 10} className="px-0 py-0">
                              <div
                                className="overflow-hidden transition-all duration-500 ease-in-out"
                                style={{
                                  maxHeight: expandedRows.has(expense.id) ? '1000px' : '0px',
                                }}
                              >
                                <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 px-6 py-6 border-t border-slate-200">
                                  <div className="mb-4 flex items-center justify-between">
                                    <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                      <CreditCard className="w-4 h-4 text-slate-600" />
                                      Payment History
                                    </h4>
                                    {payments.filter(p => p.expenseId === expense.id).length > 0 && (
                                      <span className="text-xs text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200">
                                        {payments.filter(p => p.expenseId === expense.id).length} payment{payments.filter(p => p.expenseId === expense.id).length !== 1 ? 's' : ''}
                                      </span>
                                    )}
                                  </div>

                                  {payments.filter(p => p.expenseId === expense.id).length === 0 ? (
                                    <div className="text-center py-8 text-slate-500 text-sm bg-white rounded-lg border border-slate-200">
                                      No payments recorded yet
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      {(() => {
                                        // Sort payments by date (oldest first)
                                        const sortedPayments = payments
                                          .filter(p => p.expenseId === expense.id)
                                          .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime());

                                        // Use reduce to calculate sequential balances
                                        const paymentsWithBalances = sortedPayments.reduce((acc, payment, index) => {
                                          // For the first payment, prevBalance is the full expense amount
                                          // For subsequent payments, prevBalance is the previous payment's newBalance
                                          const prevBalance = index === 0 ? expense.amount : acc[index - 1].newBalance;
                                          const newBalance = prevBalance - payment.amount;

                                          acc.push({
                                            ...payment,
                                            prevBalance,
                                            newBalance,
                                            index,
                                          });

                                          return acc;
                                        }, [] as Array<any>);

                                        // Now map and render
                                        return paymentsWithBalances.map((paymentData: any) => (
                                          <div
                                            key={paymentData.id}
                                            className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-all duration-300"
                                            style={{
                                              animation: `slideIn 0.3s ease-out ${paymentData.index * 0.1}s both`,
                                            }}
                                          >
                                            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                                              {/* Payment Date & Method */}
                                              <div className="flex items-center gap-3 lg:w-48">
                                                <div className="p-2.5 bg-slate-100 rounded-lg">
                                                  {getPaymentMethodIcon(paymentData.paymentMode)}
                                                </div>
                                                <div>
                                                  <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {fmtDate(paymentData.paymentDate)}
                                                  </div>
                                                  <p className="text-sm font-medium text-slate-900">{paymentData.paymentMode}</p>
                                                </div>
                                              </div>

                                              {/* Amount Paid */}
                                              <div className="lg:w-32">
                                                <p className="text-xs text-slate-500 mb-1">Amount Paid</p>
                                                <p className="text-lg font-bold text-green-600">
                                                  {formatCurrency(paymentData.amount)}
                                                </p>
                                              </div>

                                              {/* Balance Changes */}
                                              <div className="flex-1 grid grid-cols-2 gap-4 lg:gap-6">
                                                <div>
                                                  <p className="text-xs text-slate-500 mb-1">Prev Balance</p>
                                                  <p className="text-sm font-semibold text-slate-700">
                                                    {formatCurrency(paymentData.prevBalance)}
                                                  </p>
                                                </div>
                                                <div>
                                                  <p className="text-xs text-slate-500 mb-1">New Balance</p>
                                                  <p className="text-sm font-semibold text-amber-600">
                                                    {formatCurrency(paymentData.newBalance)}
                                                  </p>
                                                </div>
                                              </div>

                                              {/* Added By */}
                                              <div className="lg:w-48">
                                                <p className="text-xs text-slate-500 mb-1">Added By</p>
                                                <p className="text-sm text-slate-700">{getUserName(paymentData.createdBy)}</p>
                                              </div>
                                            </div>

                                            {/* Note */}
                                            {paymentData.notes && (
                                              <div className="mt-3 pt-3 border-t border-slate-100">
                                                <div className="flex items-start gap-2">
                                                  <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                                                  <p className="text-xs text-slate-600 leading-relaxed">{paymentData.notes}</p>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        ));
                                      })()}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-slate-100">
              {paginatedExpenses.map((expense) => {
                const paid = getExpensePaidAmount(expense.id, expense.amount, (expense as any).paymentStatus);
                const balance = expense.amount - paid;
                const status = getPaymentStatus(expense.amount, paid);
                const user = getUser(expense.addedBy);

                return (
                  <div key={expense.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-slate-900 line-clamp-2 text-sm max-w-[200px]">{expense.title}</h4>
                        <div className="flex items-center gap-1.5 mt-1 text-slate-500">
                          <Building2 className="w-3 h-3" />
                          <span className="text-xs truncate max-w-[150px]">{getProjectName(expense.projectId)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block text-lg font-extrabold text-slate-900">{formatCurrency(expense.amount)}</span>
                        <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border mt-1 ${status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                          status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                            'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                          {status === 'paid' ? 'Paid' : status === 'partial' ? 'Partial' : 'Pending'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-50">
                      <div className="flex items-center gap-2">
                        {user?.photoUrl ? (
                          <img src={user.photoUrl} alt="" className="w-6 h-6 rounded-full object-cover border border-slate-100" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                            <User className="w-3 h-3 text-slate-400" />
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 uppercase leading-none">Added by</span>
                          <span className="text-xs font-semibold text-slate-700 leading-none mt-0.5">{user?.fullName?.split(' ')[0] || 'Unknown'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{formatShortDate(expense.expenseDate)}</span>
                        {expense.receiptImages && expense.receiptImages.length > 0 && (
                          <button
                            onClick={() => setSelectedExpenseImages(expense.receiptImages || null)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-600"
                          >
                            <ImageIcon className="w-4 h-4" />
                          </button>
                        )}
                        {canRecordPayment && balance > 0 && (
                          <button
                            onClick={() => handleRecordPayment(expense.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-900 border border-slate-900 text-white shadow-sm"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => toggleRow(expense.id)}
                          className={`w-8 h-8 flex items-center justify-center rounded-full border transition-colors ${expandedRows.has(expense.id) ? 'bg-slate-200 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-600'
                            }`}
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${expandedRows.has(expense.id) ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>

                    {/* Mobile Expanded Details (Payment History) */}
                    {expandedRows.has(expense.id) && (
                      <div className="mt-3 bg-slate-50 rounded-xl p-3 border border-slate-100 animate-in slide-in-from-top-2 duration-200">
                        {expense.notes && (
                          <div className="mb-3 text-sm text-slate-600 bg-white p-2 rounded border border-slate-200 italic">
                            "{expense.notes}"
                          </div>
                        )}

                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-slate-500 uppercase">Payment History</span>
                          <span className="text-xs font-medium text-emerald-600">Paid: {formatCurrency(paid)}</span>
                        </div>
                        {payments.filter(p => p.expenseId === expense.id).length === 0 ? (
                          <p className="text-xs text-slate-400 italic text-center py-2">No payments yet</p>
                        ) : (
                          <div className="space-y-2">
                            {payments.filter(p => p.expenseId === expense.id).map(p => (
                              <div key={p.id} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-2">
                                  <div className="p-1 rounded bg-slate-100">
                                    {getPaymentMethodIcon(p.paymentMode)}
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-slate-700">{formatCurrency(p.amount)}</div>
                                    <div className="text-[10px] text-slate-400">{formatLongDate(p.paymentDate)}</div>
                                  </div>
                                </div>
                                <span className="text-[10px] font-medium text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded">
                                  {p.paymentMode}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>


            {/* Pagination Controls */}
            {filteredExpenses.length > itemsPerPage && (
              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 sm:px-6">
                <div className="flex flex-1 justify-between sm:hidden">
                  <button
                    onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(page => Math.min(page + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-700">
                      Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredExpenses.length)}</span> of <span className="font-medium">{filteredExpenses.length}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                      <button
                        onClick={() => setCurrentPage(page => Math.max(page - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:bg-slate-100 disabled:text-slate-300"
                      >
                        <span className="sr-only">Previous</span>
                        <ChevronDown className="h-5 w-5 rotate-90" aria-hidden="true" />
                      </button>

                      {/* Simple pagination: Show first, last, and current range */}
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(page => {
                          // Show first, last, current, and adjacent to current
                          return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                        })
                        .map((page, index, array) => {
                          // Add ellipsis if gap exists
                          const prevPage = array[index - 1];
                          const showEllipsis = prevPage && page - prevPage > 1;

                          return (
                            <Fragment key={page}>
                              {showEllipsis && <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-300 focus:outline-offset-0">...</span>}
                              <button
                                onClick={() => setCurrentPage(page)}
                                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold focus:z-20 focus:outline-offset-0 ${currentPage === page
                                  ? 'z-10 bg-slate-900 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900'
                                  : 'text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50'
                                  }`}
                              >
                                {page}
                              </button>
                            </Fragment>
                          );
                        })
                      }

                      <button
                        onClick={() => setCurrentPage(page => Math.min(page + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:bg-slate-100 disabled:text-slate-300"
                      >
                        <span className="sr-only">Next</span>
                        <ChevronDown className="h-5 w-5 -rotate-90" aria-hidden="true" />
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )
        }
      </div >

      {
        isPaymentModalOpen && (
          <SupplierPaymentModal
            supplierId={supplierId}
            expenseId={selectedExpenseForPayment}
            onClose={() => {
              setIsPaymentModalOpen(false);
              setSelectedExpenseForPayment(null);
            }}
          />
        )
      }

      {
        selectedExpenseImages && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800">Bill Images</h3>
                <button
                  onClick={() => setSelectedExpenseImages(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-600" />
                </button>
              </div>
              <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                {selectedExpenseImages.map((image, index) => (
                  <div
                    key={index}
                    className="border border-slate-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedFullImage(image)}
                  >
                    <img
                      src={`${API_BASE}${image.startsWith('/') ? image : `/${image}`}`}
                      alt={`Bill ${index + 1}`}
                      className="w-full h-auto hover:scale-105 transition-transform duration-200"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      }

      {/* Full-size Image Viewer Modal */}
      {
        selectedFullImage && (
          <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
            <div className="relative max-w-full max-h-full">
              <button
                onClick={() => setSelectedFullImage(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <img
                src={`${API_BASE}${selectedFullImage.startsWith('/') ? selectedFullImage : `/${selectedFullImage}`}`}
                alt="Full size receipt"
                className="max-w-full max-h-full object-contain"
                onClick={() => setSelectedFullImage(null)}
              />
            </div>
          </div>
        )
      }
    </div >
  );
}
