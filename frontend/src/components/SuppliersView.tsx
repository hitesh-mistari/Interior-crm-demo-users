import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Filter, Building2, Eye, Trash2, AlertCircle, TrendingUp, DollarSign, Users, Calendar, Archive, Tag } from 'lucide-react';

type OverviewFilter = 'week' | 'month' | 'year' | 'all';
import { useApp } from '../context/AppContext';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import SupplierModal from './SupplierModal';
import SupplierDashboard from './SupplierDashboard';
import { formatCurrency } from '../utils/formatters';
import { formatLongDate } from '../utils/dates';
import PaginationControls from './PaginationControls';

export default function SuppliersView() {
  const { suppliers, expenses, supplierPayments, projects, deleteSupplier, hasPermission } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [overviewFilter, setOverviewFilter] = useState<OverviewFilter>('all');
  // Others (temporary suppliers) filters
  const [othersStartDate, setOthersStartDate] = useState<string>('');
  const [othersEndDate, setOthersEndDate] = useState<string>('');
  const [othersCategory, setOthersCategory] = useState<string>('All');
  const [showArchived, setShowArchived] = useState<boolean>(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [confirmDeleteTemp, setConfirmDeleteTemp] = useState<string | null>(null);

  const { updateExpense } = useApp();

  const canAdd = hasPermission('suppliers', 'create');
  const canEdit = hasPermission('suppliers', 'update');
  const canDelete = hasPermission('suppliers', 'delete');

  const activeSuppliers = suppliers.filter((s) => !s.deleted);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    activeSuppliers.forEach((s) => {
      if (s.category) cats.add(s.category);
    });
    return Array.from(cats).sort();
  }, [activeSuppliers]);

  const getSupplierStats = (supplierId: string) => {
    // Filter expenses: not deleted AND project exists and is not deleted
    const supplierExpenses = expenses.filter((e) => {
      if (e.deleted) return false;
      if (e.supplierId !== supplierId) return false;

      // If expense has a projectId, verify the project exists and is not deleted
      if (e.projectId) {
        const project = projects.find(p => p.id === e.projectId);
        if (!project || project.deleted) return false;
      }

      return true;
    });

    // Get all supplier payments for this supplier
    const allPayments = supplierPayments.filter((p) => p.supplierId === supplierId && !p.deleted);

    // Only count payments that are either:
    // 1. Not linked to any expense (general supplier payments)
    // 2. Linked to expenses that still exist (not deleted)
    const validPayments = allPayments.filter((p) => {
      if (!p.expenseId) return true; // General payment, not linked to specific expense
      return supplierExpenses.some((e) => e.id === p.expenseId); // Linked to existing expense
    });

    const totalPurchases = supplierExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Calculate total paid from both supplier payments AND expenses marked as "Paid"
    // Important: Don't double count - if an expense is marked as 'Paid', ignore supplier payments for it
    const paidFromExpenseStatus = supplierExpenses
      .filter((e) => (e as any).paymentStatus === 'Paid')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const paidFromPayments = validPayments
      .filter((p) => {
        // Only count supplier payment if the expense is NOT marked as 'Paid'
        if (!p.expenseId) return true; // General payment, not linked to specific expense
        const expense = supplierExpenses.find((e) => e.id === p.expenseId);
        return expense && (expense as any).paymentStatus !== 'Paid';
      })
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const totalPaid = paidFromPayments + paidFromExpenseStatus;
    const outstanding = totalPurchases - totalPaid;

    const lastPurchase = supplierExpenses.length > 0
      ? new Date(
        Math.max(...supplierExpenses.map((e) => new Date(e.expenseDate).getTime()))
      )
      : null;

    return {
      totalPurchases,
      totalPaid,
      outstanding,
      lastPurchase,
      purchaseCount: supplierExpenses.length,
    };
  };

  const filteredSuppliers = useMemo(() => {
    return activeSuppliers
      .filter((supplier) => {
        const matchesSearch =
          supplier.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supplier.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          supplier.phone.includes(searchTerm);
        const matchesCategory =
          categoryFilter === 'All' || supplier.category === categoryFilter;
        return matchesSearch && matchesCategory;
      })
      .sort((a, b) => {
        const statsA = getSupplierStats(a.id);
        const statsB = getSupplierStats(b.id);
        return statsB.totalPurchases - statsA.totalPurchases;
      });
  }, [activeSuppliers, searchTerm, categoryFilter]);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter]);

  const totalItems = filteredSuppliers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedSuppliers = filteredSuppliers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const totalOutstanding = useMemo(() => {
    return filteredSuppliers.reduce((sum, s) => sum + getSupplierStats(s.id).outstanding, 0);
  }, [filteredSuppliers]);

  const getFilteredExpensesByDate = () => {
    const now = new Date();
    return expenses.filter((e) => {
      if (!e.supplierId || e.deleted) return false;

      // If expense has a projectId, verify the project exists and is not deleted
      if (e.projectId) {
        const project = projects.find(p => p.id === e.projectId);
        if (!project || project.deleted) return false;
      }

      const expenseDate = new Date(e.expenseDate);

      switch (overviewFilter) {
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return expenseDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
          return expenseDate >= monthAgo;
        case 'year':
          const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          return expenseDate >= yearAgo;
        case 'all':
        default:
          return true;
      }
    });
  };

  // Temporary suppliers aggregation - filter out expenses from deleted projects
  const tempExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (e.deleted) return false;
      if (e.supplierId) return false; // Must not have a supplier
      if (!e.tempSupplierName?.trim()) return false; // Must have temp supplier name

      // If expense has a projectId, verify the project exists and is not deleted
      if (e.projectId) {
        const project = projects.find(p => p.id === e.projectId);
        if (!project || project.deleted) return false;
      }

      return true;
    });
  }, [expenses, projects]);

  const tempCategories = useMemo(() => {
    const set = new Set<string>();
    tempExpenses.forEach((e) => {
      if (e.title?.trim()) set.add(e.title.trim());
    });
    return ['All', ...Array.from(set).sort()];
  }, [tempExpenses]);

  const tempGroups = useMemo(() => {
    const start = othersStartDate ? new Date(othersStartDate) : null;
    const end = othersEndDate ? new Date(othersEndDate) : null;
    const map = new Map<string, { name: string; expenses: typeof tempExpenses; usage: number; lastUsed: Date }>();
    tempExpenses.forEach((e) => {
      const name = (e.tempSupplierName || '').trim();
      if (!name) return;
      const d = new Date(e.expenseDate);
      if (start && d < start) return;
      if (end && d > end) return;
      if (othersCategory !== 'All' && (e.title?.trim() !== othersCategory)) return;
      const key = name.toLowerCase();
      const obj = map.get(key) || { name, expenses: [] as typeof tempExpenses, usage: 0, lastUsed: new Date(0) };
      obj.expenses.push(e);
      obj.usage += 1;
      if (d > obj.lastUsed) obj.lastUsed = d;
      map.set(key, obj);
    });
    return Array.from(map.values()).sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
  }, [tempExpenses, othersStartDate, othersEndDate, othersCategory]);

  const nowDate = new Date();
  const yearAgo = new Date(nowDate.getFullYear() - 1, nowDate.getMonth(), nowDate.getDate());
  const activeTempGroups = tempGroups.filter((g) => g.lastUsed >= yearAgo);
  const archivedTempGroups = tempGroups.filter((g) => g.lastUsed < yearAgo);

  const overviewStats = useMemo(() => {
    const filteredExpenses = getFilteredExpensesByDate();
    const totalPurchases = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    // Calculate total paid from both supplier payments AND expenses marked as "Paid"
    // Important: Don't double count - if an expense is marked as 'Paid', ignore supplier payments for it
    const paidFromExpenseStatus = filteredExpenses
      .filter((e) => (e as any).paymentStatus === 'Paid')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const paidFromSupplierPayments = supplierPayments
      .filter((p) => {
        if (p.deleted) return false;
        if (!p.expenseId) return false; // Don't count general payments in overview
        // Only count if the expense exists in filtered expenses
        const expense = filteredExpenses.find((e) => e.id === p.expenseId);
        if (!expense) return false;
        // Only count if the expense is NOT marked as 'Paid' (to avoid double counting)
        return (expense as any).paymentStatus !== 'Paid';
      })
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const totalPaid = paidFromExpenseStatus + paidFromSupplierPayments;
    const outstanding = totalPurchases - totalPaid;
    const activeSupplierCount = activeSuppliers.length;

    return {
      totalPurchases,
      totalPaid,
      outstanding,
      activeSupplierCount,
    };
  }, [expenses, supplierPayments, activeSuppliers, overviewFilter]);

  const handleDelete = (id: string, name: string) => {
    setConfirmDelete({ id, title: name });
  };

  const onConfirmDeleteTemp = async () => {
    if (!confirmDeleteTemp) return;
    const targets = expenses.filter(e => !e.deleted && e.tempSupplierName === confirmDeleteTemp);
    await Promise.all(targets.map(e => updateExpense(e.id, { tempSupplierName: null })));
    setConfirmDeleteTemp(null);
  };

  const handleEdit = (supplierId: string) => {
    setEditingSupplierId(supplierId);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingSupplierId(null);
  };

  if (selectedSupplier) {
    return (
      <SupplierDashboard
        supplierId={selectedSupplier}
        onClose={() => setSelectedSupplier(null)}
      />
    );
  }

  return (
    <div className="space-y-6 p-[15px] sm:p-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Supplier Management</h2>
          <p className="text-slate-600 mt-1 text-sm md:text-base">
            {filteredSuppliers.length} suppliers • Outstanding: <span className="font-semibold text-slate-900">{formatCurrency(totalOutstanding)}</span>
          </p>
        </div>
        {canAdd && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full md:w-auto inline-flex items-center justify-center px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-transform active:scale-95 shadow-sm shadow-slate-200 font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Supplier
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-lg font-bold text-slate-800">Supplier Overview</h3>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-none">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <select
                value={overviewFilter}
                onChange={(e) => setOverviewFilter(e.target.value as OverviewFilter)}
                className="w-full sm:w-auto pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none bg-slate-50 font-medium text-slate-700"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="year">This Year</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative bg-white rounded-xl shadow-sm border border-slate-100 p-5 overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
              <TrendingUp className="w-16 h-16 text-slate-900" />
            </div>
            <div className="relative z-10">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Total Purchase</p>
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {formatCurrency(overviewStats.totalPurchases)}
              </p>
            </div>
          </div>

          <div className="relative bg-white rounded-xl shadow-sm border border-slate-100 p-5 overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
              <DollarSign className="w-16 h-16 text-emerald-600" />
            </div>
            <div className="relative z-10">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Total Paid</p>
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {formatCurrency(overviewStats.totalPaid)}
              </p>
            </div>
          </div>

          <div className="relative bg-white rounded-xl shadow-sm border border-slate-100 p-5 overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
              <AlertCircle className={`w-16 h-16 ${overviewStats.outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`} />
            </div>
            <div className="relative z-10">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Outstanding</p>
              <p className={`text-2xl font-extrabold tracking-tight ${overviewStats.outstanding > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatCurrency(overviewStats.outstanding)}
              </p>
            </div>
          </div>

          <div className="relative bg-white rounded-xl shadow-sm border border-slate-100 p-5 overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity">
              <Users className="w-16 h-16 text-blue-600" />
            </div>
            <div className="relative z-10">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Active Suppliers</p>
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {overviewStats.activeSupplierCount} <span className="text-sm font-medium text-slate-400">/ {suppliers.length}</span>
              </p>
            </div>
          </div>
        </div>
      </div>


      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 sticky top-[70px] z-10">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search suppliers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-shadow"
            />
          </div>
          <div className="relative flex-none">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-colors font-medium ${categoryFilter !== 'All'
                ? 'bg-slate-900 border-slate-900 text-white'
                : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              title="Filter by category"
            >
              <Filter className="w-4 h-4" />
              <span className="sm:hidden lg:inline">{categoryFilter === 'All' ? 'Filter' : categoryFilter}</span>
            </button>

            {isFilterOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsFilterOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-full sm:w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-20 animate-in fade-in zoom-in-95 duration-100 max-h-64 overflow-y-auto ring-1 ring-slate-900/5">
                  <button
                    onClick={() => {
                      setCategoryFilter('All');
                      setIsFilterOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors ${categoryFilter === 'All' ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-700 font-medium'
                      }`}
                  >
                    All Categories
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setCategoryFilter(cat);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors truncate ${categoryFilter === cat ? 'text-blue-600 font-bold bg-blue-50/50' : 'text-slate-700 font-medium'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {paginatedSuppliers.length === 0 ? (
          <div className="col-span-full bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-slate-100">
              <Users className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">No suppliers found</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              {searchTerm || categoryFilter !== 'All' ? 'Try adjusting your search or filters to find what you\'re looking for.' : 'Get started by adding your first supplier.'}
            </p>
            {canAdd && !searchTerm && categoryFilter === 'All' && (
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 inline-flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Supplier
              </button>
            )}
          </div>
        ) : (
          paginatedSuppliers.map((supplier) => {
            const stats = getSupplierStats(supplier.id);
            return (
              <div
                key={supplier.id}
                className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-all duration-300 group flex flex-col relative"
              >
                {/* Edit/Delete Icons - Top Right */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  {canEdit && (
                    <button
                      onClick={() => handleEdit(supplier.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
                      title="Edit supplier"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(supplier.id, supplier.supplierName)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors"
                      title="Delete supplier"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="flex justify-between items-start mb-4 pr-20">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-800 text-lg truncate pr-2">
                      {supplier.supplierName}
                    </h3>
                    {supplier.companyName && (
                      <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-1 truncate">
                        <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{supplier.companyName}</span>
                      </div>
                    )}
                  </div>
                </div>



                <div className="space-y-3 mb-5 flex-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Total Purchases</span>
                    <span className="font-bold text-slate-900 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      {formatCurrency(stats.totalPurchases)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Total Paid</span>
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      {formatCurrency(stats.totalPaid)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-100 border-dashed">
                    <span className="text-slate-500 font-medium">Outstanding</span>
                    <span
                      className={`font-bold text-base ${stats.outstanding > 0 ? 'text-rose-600' : 'text-slate-900'
                        }`}
                    >
                      {formatCurrency(stats.outstanding)}
                    </span>
                  </div>
                  {stats.lastPurchase && (
                    <div className="text-[10px] text-slate-400 text-right font-medium uppercase tracking-wide">
                      Last: {formatLongDate(stats.lastPurchase)}
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100">
                  <button
                    onClick={() => setSelectedSupplier(supplier.id)}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 text-sm bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium shadow-sm active:scale-[0.98]"
                  >
                    <Eye className="w-4 h-4" />
                    View Ledger
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-8">
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      {/* Temporary Suppliers (Others) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5 md:p-6 mt-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Temporary Suppliers (Others)</h3>
            <p className="text-sm text-slate-500 mt-0.5">Manage one-time suppliers and expenses</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-lg border border-slate-200 w-full sm:w-auto">
              <div className="relative flex-1">
                <input
                  type="date"
                  value={othersStartDate}
                  onChange={(e) => setOthersStartDate(e.target.value)}
                  className="w-full sm:w-32 px-2 py-1.5 text-xs font-medium bg-transparent border-none focus:ring-0 text-slate-700"
                />
              </div>
              <span className="text-slate-300 font-light">—</span>
              <div className="relative flex-1">
                <input
                  type="date"
                  value={othersEndDate}
                  onChange={(e) => setOthersEndDate(e.target.value)}
                  className="w-full sm:w-32 px-2 py-1.5 text-xs font-medium bg-transparent border-none focus:ring-0 text-slate-700"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1 sm:flex-none">
                <select
                  value={othersCategory}
                  onChange={(e) => setOthersCategory(e.target.value)}
                  className="w-full sm:w-40 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none bg-white font-medium text-slate-700 appearance-none"
                >
                  {tempCategories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

              <button
                onClick={() => setShowArchived((v) => !v)}
                className={`flex-none inline-flex items-center justify-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors font-medium ${showArchived ? 'bg-slate-900 border-slate-900 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
              >
                <Archive className="w-4 h-4" />
                <span className="hidden sm:inline">{showArchived ? 'Hide Archived' : 'Archived'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active temporary suppliers */}
        {activeTempGroups.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
              <Search className="w-5 h-5 text-slate-300" />
            </div>
            <p className="text-slate-500 font-medium">No temporary suppliers found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting the date range or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {activeTempGroups.map((g) => (
              <div key={g.name} className="relative bg-white rounded-xl shadow-sm border border-slate-100 p-5 hover:shadow-md transition-all duration-300 group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-slate-800 text-base">{g.name}</h4>
                    <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md bg-amber-50 text-amber-700 border border-amber-100">
                      <Tag className="w-3 h-3" />
                      Temporary
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="block text-2xl font-extrabold text-slate-900">{g.usage}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Entries</span>
                  </div>
                </div>

                {canDelete && (
                  <button
                    onClick={() => setConfirmDeleteTemp(g.name)}
                    className="absolute top-4 right-4 p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete temporary supplier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                <div className="border-t border-slate-100 pt-4 relative">
                  <div className="overflow-x-auto -mx-5 px-5 pb-2">
                    <table className="w-full min-w-[280px]">
                      <thead>
                        <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-left">
                          <th className="pb-2">Date</th>
                          <th className="pb-2 text-right pr-4">Amount</th>
                          <th className="pb-2 pl-2">Category</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm font-medium">
                        {g.expenses.slice(0, 5).map((e) => (
                          <tr key={e.id} className="group/row">
                            <td className="py-1.5 text-slate-500 whitespace-nowrap border-b border-slate-50">{formatLongDate(e.expenseDate)}</td>
                            <td className="py-1.5 text-right text-slate-900 pr-4 whitespace-nowrap border-b border-slate-50">{formatCurrency(e.amount)}</td>
                            <td className="py-1.5 text-slate-600 pl-2 whitespace-nowrap border-b border-slate-50 truncate max-w-[100px]" title={e.title}>{e.title}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {g.expenses.length > 5 && (
                    <div className="mt-2 text-center">
                      <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
                        + {g.expenses.length - 5} more entries
                      </span>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-400">Last used</span>
                  <span className="text-xs font-semibold text-slate-700">{formatLongDate(g.lastUsed)}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Archived temporary suppliers */}
        {showArchived && (
          <div className="mt-8 pt-8 border-t border-slate-100">
            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Archive className="w-4 h-4 text-slate-400" />
              Archived Suppliers <span className="text-slate-400 font-normal">(Inactive &gt; 1 year)</span>
            </h4>
            {archivedTempGroups.length === 0 ? (
              <div className="text-slate-400 text-sm italic">No archived temporary suppliers found.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {archivedTempGroups.map((g) => (
                  <div key={g.name} className="bg-slate-50 rounded-lg border border-slate-200 p-4 opacity-75 hover:opacity-100 transition-opacity">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-700">{g.name}</span>
                      <span className="text-xs font-medium text-slate-500 bg-white px-2 py-1 rounded border border-slate-200">Usage: {g.usage}</span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">Last used: <span className="font-medium">{formatLongDate(g.lastUsed)}</span></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {
        isModalOpen && (
          <SupplierModal
            onClose={handleModalClose}
            supplierId={editingSupplierId}
          />
        )
      }

      <ConfirmDeleteModal
        open={!!confirmDelete}
        title="Delete Supplier"
        message="Do you really want to delete this supplier?"
        detail={confirmDelete?.title}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => { if (confirmDelete) { deleteSupplier(confirmDelete.id); setConfirmDelete(null); } }}
      />

      <ConfirmDeleteModal
        open={!!confirmDeleteTemp}
        title="Delete Temporary Supplier"
        message={`Are you sure you want to delete "${confirmDeleteTemp}"? This will remove the supplier name from ${expenses.filter(e => !e.deleted && e.tempSupplierName === confirmDeleteTemp).length} expense(s), but strictly keep the expense records.`}
        detail={confirmDeleteTemp || undefined}
        onCancel={() => setConfirmDeleteTemp(null)}
        onConfirm={onConfirmDeleteTemp}
      />
    </div >
  );
}
