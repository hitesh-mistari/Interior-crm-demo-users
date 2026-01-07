const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
const API_BASE = API_ENDPOINT.replace(/\/api$/, "");

import { useState, useMemo, useEffect } from 'react';
import { Trash2, Image, Edit, Clock, X, Search } from 'lucide-react';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { useApp } from '../context/AppContext';
import ExpenseModal from './ExpenseModal';
import NumericInput from './NumericInput';
import { Expense } from '../types';
// Local timestamp formatter to avoid module export issues
import { getExpenseVersionHistory, formatVersionHistoryDate } from '../utils/versionHistory';
import { formatDateTime } from '../utils/dates';
import PaginationControls from './PaginationControls';


export default function ExpensesView() {
  const { expenses, projects, users, suppliers, deleteExpense, hasPermission, addExpense, teams, currentUser } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);




  const [selectedExpenseImages, setSelectedExpenseImages] = useState<string[] | null>(null);
  const [selectedFullImage, setSelectedFullImage] = useState<string | null>(null);
  // Selected expense whose version history is shown in the top panel
  const [selectedExpenseId, setSelectedExpenseId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);

  const [qaProjectId, setQaProjectId] = useState<string>(projects[0]?.id || '');
  const [qaSupplierId, setQaSupplierId] = useState<string>('');
  const [qaTempSupplierName, setQaTempSupplierName] = useState<string>('');
  const [qaTeamMemberId, setQaTeamMemberId] = useState<string>('');
  const [qaTitle, setQaTitle] = useState<string>('');
  const [qaAmount, setQaAmount] = useState<number | null>(null);
  const activeSuppliers = suppliers.filter((s) => !s.deleted);
  const [qaTitleFocused, setQaTitleFocused] = useState(false);
  const [qaExpenseType, setQaExpenseType] = useState<'Supplier' | 'Team' | 'Temp Supplier' | 'Other Expense'>('Supplier');
  const [qaPaymentStatus, setQaPaymentStatus] = useState<'Paid' | 'Unpaid'>('Unpaid');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const titleSuggestions = useMemo(() => {
    const q = qaTitle.trim().toLowerCase();
    const seen = new Set<string>();
    const all = expenses.map((e) => (e.title || '').trim()).filter(Boolean);
    const uniq: string[] = [];
    for (const t of all) {
      if (!seen.has(t)) {
        seen.add(t);
        uniq.push(t);
      }
    }
    const filtered = q ? uniq.filter((t) => t.toLowerCase().includes(q)) : uniq;
    return filtered.slice(0, 8);
  }, [expenses, qaTitle]);

  useEffect(() => {
    if (!qaProjectId && projects.length) {
      setQaProjectId(projects[0].id);
    }
  }, [projects]);

  const [adding, setAdding] = useState(false);

  const handleQuickAdd = async () => {
    if (adding) return;
    if (!qaProjectId || !qaAmount) {
      alert('Please fill project and amount');
      return;
    }

    // Validate based on expense type
    if (qaExpenseType === 'Supplier' && !qaSupplierId) {
      alert('Please select a supplier');
      return;
    }
    // Optional: Require title for supplier? Or allow default?
    // User asked for "option", so we won't strictly block if empty, we'll default it.

    if (qaExpenseType === 'Team' && !qaTeamMemberId) {
      alert('Please select a team member');
      return;
    }

    if (qaExpenseType === 'Temp Supplier' && !qaTempSupplierName.trim()) {
      alert('Please enter temp supplier name');
      return;
    }
    if (qaExpenseType === 'Other Expense' && !qaTitle.trim()) {
      alert('Please enter expense title');
      return;
    }

    setAdding(true);

    let title = '';
    let supplierId: string | undefined = undefined;
    let tempSupplierName: string | undefined = undefined;
    let teamMemberId: string | undefined = undefined;
    let category = 'General';

    if (qaExpenseType === 'Supplier') {
      supplierId = qaSupplierId;
      // Prefer manually entered title, fallback to 'Material Purchase'
      title = qaTitle.trim() || 'Material Purchase';
      category = 'General';
    } else if (qaExpenseType === 'Team') {
      // Team member expense
      teamMemberId = qaTeamMemberId;
      title = qaTitle.trim() || 'Team Work';
    } else if (qaExpenseType === 'Temp Supplier') {
      tempSupplierName = qaTempSupplierName.trim();
      // Allow manual title override, otherwise use temp supplier name
      title = qaTitle.trim() || tempSupplierName;
      category = 'General';
    } else {
      // Other Expense
      title = qaTitle.trim();
      supplierId = undefined;
      category = 'General';
    }

    const payload: any = {
      projectId: qaProjectId,
      title: title,
      category: category,
      amount: qaAmount,
      expenseDate: new Date().toISOString(),
      paymentMode: 'Cash',
      paymentStatus: qaPaymentStatus,
      supplierId: supplierId,
      tempSupplierName: tempSupplierName,
      teamMemberId: teamMemberId,
    };
    try {
      await addExpense(payload);
    } finally {
      setAdding(false);
    }
    // seeking feedback: clear inputs?
    setQaTitle('');
    setQaAmount(null);
    setQaSupplierId('');
    setQaTempSupplierName('');
    setQaTeamMemberId('');
    // Keep Project and Expense Type same for ease of multiple entry
    setQaPaymentStatus('Unpaid');
  };

  const handleNotify = () => {
    if (!qaTeamMemberId) return;
    const member = teams.find((m) => m.id === qaTeamMemberId);
    if (!member) return;

    // Check both contact and phone fields
    const phoneNumber = member.contact || member.phone;

    if (!phoneNumber) {
      alert('No contact number found for this team member.');
      return;
    }

    // Strip non-digits
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    if (!cleanNumber) return;

    const assignedBy = currentUser?.fullName || (currentUser as any)?.full_name || (currentUser as any)?.name || currentUser?.username || 'Admin';
    const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const companyName = "Artistics Engineers";

    // Get project name
    const project = projects.find(p => p.id === qaProjectId);
    const projectName = project ? project.projectName : 'our project';

    // Emojis removed as per user request
    const message = `Hi ${member.name}\n\nYou\u2019ve been assigned a new work related to ${projectName}.\n\nWork: ${qaTitle || 'Work'}\nAmount: \u20B9${qaAmount || 0}\nStatus: ${qaPaymentStatus}\nAssigned by: ${assignedBy}\nDate: ${date}\n\nThis is shared with you for tracking and payment coordination.\nPlease let us know once the work is completed or if you have any questions.\n\nThanks\n\u2013 ${companyName}`;

    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const canAdd = hasPermission('expenses', 'create');
  const canEdit = hasPermission('expenses', 'update');
  const canDelete = hasPermission('expenses', 'delete');

  const filteredExpenses = useMemo(() => {
    // First filter: exclude deleted expenses AND expenses whose project doesn't exist or is deleted
    let result = expenses.filter((expense) => {
      if (expense.deleted) return false;

      // If expense has a projectId, verify the project exists and is not deleted
      if (expense.projectId) {
        const project = projects.find(p => p.id === expense.projectId);
        if (!project || project.deleted) return false;
      }

      return true;
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      if (q === 'paid') {
        result = result.filter(e => e.paymentStatus === 'Paid');
      } else if (q === 'unpaid') {
        result = result.filter(e => e.paymentStatus === 'Unpaid' || !e.paymentStatus);
      } else {
        result = result.filter(e => {
          // Title
          if (e.title?.toLowerCase().includes(q)) return true;
          // Amount
          if (e.amount.toString().includes(q)) return true;

          // Supplier Name
          let supplierName = '';
          if (e.tempSupplierName) supplierName = e.tempSupplierName;
          else if (e.supplierId) {
            const s = suppliers.find(sup => sup.id === e.supplierId);
            if (s) supplierName = s.supplierName;
          } else if (e.teamMemberId) {
            const m = teams.find(tm => tm.id === e.teamMemberId);
            if (m) supplierName = m.name;
          }
          if (supplierName && supplierName.toLowerCase().includes(q)) return true;

          // Added By
          const u = users.find(usr => usr.id === e.addedBy);
          const userName = u?.full_name || u?.username || '';
          if (userName.toLowerCase().includes(q)) return true;

          return false;
        });
      }
    }

    return result.sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
  }, [expenses, projects, searchQuery, suppliers, teams, users]);

  // Search Suggestions
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return ['Paid', 'Unpaid'];
    const q = searchQuery.toLowerCase().trim();
    const suggestions = new Set<string>();

    // Suggest Status
    if ('paid'.includes(q)) suggestions.add('Paid');
    if ('unpaid'.includes(q)) suggestions.add('Unpaid');

    // Suggest Suppliers/Team matching input
    suppliers.forEach(s => {
      if (s.supplierName.toLowerCase().includes(q)) suggestions.add(s.supplierName);
    });
    teams.forEach(t => {
      if (t.name.toLowerCase().includes(q)) suggestions.add(t.name);
    });

    return Array.from(suggestions).slice(0, 5);
  }, [searchQuery, suppliers, teams]);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleDelete = (id: string) => {
    const exp = expenses.find(e => e.id === id);
    setConfirmDelete({ id, title: exp?.title || '' });
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingExpense(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => formatDateTime(dateString);



  const getClientName = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.clientName || 'Unknown Client';
  };



  const getSupplierName = (expense: Expense) => {
    if (expense.tempSupplierName) {
      return expense.tempSupplierName;
    }
    if (expense.supplierId) {
      const supplier = suppliers.find((s) => s.id === expense.supplierId);
      return supplier?.supplierName || '-';
    }
    if (expense.teamMemberId) {
      const member = teams.find((m) => m.id === expense.teamMemberId);
      return member?.name || '-';
    }
    return '-';
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page when filters (or data) change
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredExpenses.length]);

  const totalItems = filteredExpenses.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedExpenses = filteredExpenses.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 p-[15px] sm:p-0">
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Expenses</h2>
            <p className="text-slate-600 mt-1">
              {filteredExpenses.length} Purchase • Total: {formatCurrency(totalExpenses)}
            </p>
          </div>
        </div>
        {canAdd && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            {/* Mobile Layout (Optimized for Speed) */}
            <div className="md:hidden flex flex-col gap-3">

              {/* 1. Title Input (Necessary) */}
              <div className="relative">
                <input
                  type="text"
                  value={qaTitle}
                  onChange={(e) => setQaTitle(e.target.value)}
                  onFocus={() => setQaTitleFocused(true)}
                  onBlur={() => setQaTitleFocused(false)}
                  placeholder={qaExpenseType === 'Other Expense' ? "Expense Title (e.g. Tea, Fuel)" : "Expense Title"}
                  className="w-full px-3 py-3 border border-slate-300 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {qaTitleFocused && titleSuggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl max-h-40 overflow-y-auto">
                    {titleSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => setQaTitle(s)}
                        className="block w-full text-left px-4 py-3 text-base border-b border-slate-100 last:border-0 hover:bg-slate-50 text-slate-700"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Project Select */}
              <select
                value={qaProjectId}
                onChange={(e) => setQaProjectId(e.target.value)}
                className="w-full px-3 py-3 border border-slate-300 rounded-xl text-sm bg-slate-50 text-slate-700"
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.projectName}</option>
                ))}
              </select>

              {/* 3. Expense Type & Supplier/Input */}
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={qaExpenseType}
                  onChange={(e) => setQaExpenseType(e.target.value as any)}
                  className={`w-full px-3 py-3 border border-slate-300 rounded-xl text-sm bg-slate-50 font-medium text-slate-700 ${qaExpenseType === 'Other Expense' ? 'col-span-2' : ''}`}
                >
                  <option value="Supplier">Supplier</option>
                  <option value="Team">Team</option>
                  <option value="Temp Supplier">Temp Supplier</option>
                  <option value="Other Expense">Other Expense</option>
                </select>

                {qaExpenseType === 'Supplier' && (
                  <select
                    value={qaSupplierId}
                    onChange={(e) => setQaSupplierId(e.target.value)}
                    className="w-full px-3 py-3 border border-slate-300 rounded-xl text-sm bg-white text-slate-700"
                  >
                    <option value="">Select Supplier</option>
                    {activeSuppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.supplierName}</option>
                    ))}
                  </select>
                )}

                {qaExpenseType === 'Team' && (
                  <select
                    value={qaTeamMemberId}
                    onChange={(e) => setQaTeamMemberId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                  >
                    <option value="">Select Team Member</option>
                    {teams
                      .filter((member) => !member.deleted && member.employmentStatus === 'Full-Time')
                      .map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                  </select>
                )}
                {qaExpenseType === 'Temp Supplier' && (
                  <input
                    type="text"
                    value={qaTempSupplierName}
                    onChange={(e) => setQaTempSupplierName(e.target.value)}
                    placeholder="Enter Temp Supplier Name"
                    className="w-full px-3 py-3 border border-slate-300 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                )}
              </div>

              {/* 3. Amount & Status */}
              <div className="grid grid-cols-2 gap-2">
                <NumericInput
                  value={qaAmount}
                  onChange={(v) => setQaAmount(v)}
                  className="w-full px-3 py-3 border border-slate-300 rounded-xl text-base font-medium shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="₹0"
                />

                <button
                  type="button"
                  onClick={() => setQaPaymentStatus(prev => prev === 'Paid' ? 'Unpaid' : 'Paid')}
                  className={`w-full px-3 py-3 rounded-xl text-sm font-semibold transition-colors border ${qaPaymentStatus === 'Paid'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-red-50 text-red-600 border-red-200'
                    }`}
                >
                  {qaPaymentStatus}
                </button>
              </div>

              {/* 4. Add Button (Mobile) */}
              <div className="flex gap-2">
                {qaExpenseType === 'Team' && (
                  <button
                    onClick={async () => {
                      handleNotify();
                      await handleQuickAdd();
                    }}
                    className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-base font-semibold shadow-md active:scale-95 transition-all flex items-center justify-center hover:bg-emerald-700"
                  >
                    Add & Notify
                  </button>
                )}
                <button
                  onClick={handleQuickAdd}
                  disabled={adding}
                  className={`${qaExpenseType === 'Team' ? 'flex-1' : 'w-full'} py-3 bg-slate-900 text-white rounded-xl text-base font-semibold shadow-md active:scale-95 transition-all flex items-center justify-center disabled:opacity-70 disabled:active:scale-100`}
                >
                  {adding ? 'Adding...' : 'Add Expense'}
                </button>
              </div>
            </div>

            {/* Desktop Layout (New Grid) */}
            <div className="hidden md:flex flex-wrap items-center gap-3">
              {/* Project Select */}
              <select value={qaProjectId} onChange={(e) => setQaProjectId(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white min-w-[200px]">
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.projectName}</option>
                ))}
              </select>

              {/* Expense Type Select */}
              <select
                value={qaExpenseType}
                onChange={(e) => setQaExpenseType(e.target.value as any)}
                className="px-3 py-2 border border-blue-500 rounded-lg text-sm bg-blue-50 text-blue-700 font-medium cursor-pointer"
              >
                <option value="Supplier">Supplier</option>
                <option value="Team">Team</option>
                <option value="Temp Supplier">Temp Supplier</option>
                <option value="Other Expense">Other Expense</option>
              </select>

              {/* Dynamic Input based on Type */}
              <div className="flex-1 min-w-[250px]">
                {qaExpenseType === 'Supplier' && (
                  <div className="flex gap-2">
                    <select value={qaSupplierId} onChange={(e) => setQaSupplierId(e.target.value)} className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                      <option value="">Select Supplier</option>
                      {activeSuppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.supplierName}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={qaTitle}
                      onChange={(e) => setQaTitle(e.target.value)}
                      placeholder="Title"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                )}
                {qaExpenseType === 'Team' && (
                  <div className="flex gap-2">
                    <select value={qaTeamMemberId} onChange={(e) => setQaTeamMemberId(e.target.value)} className="w-1/2 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white">
                      <option value="">Select Team Member</option>
                      {teams
                        .filter((member) => !member.deleted && member.employmentStatus === 'Full-Time')
                        .map((member) => (
                          <option key={member.id} value={member.id}>{member.name}</option>
                        ))}
                    </select>
                    <input
                      type="text"
                      value={qaTitle}
                      onChange={(e) => setQaTitle(e.target.value)}
                      placeholder="Work Title"
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                  </div>
                )}
                {qaExpenseType === 'Temp Supplier' && (
                  <input
                    type="text"
                    value={qaTempSupplierName}
                    onChange={(e) => setQaTempSupplierName(e.target.value)}
                    placeholder="Enter Temp Supplier Name"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  />
                )}
                {qaExpenseType === 'Other Expense' && (
                  <div className="relative">
                    <input
                      type="text"
                      value={qaTitle}
                      onChange={(e) => setQaTitle(e.target.value)}
                      onFocus={() => setQaTitleFocused(true)}
                      onBlur={() => setQaTitleFocused(false)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !adding) handleQuickAdd();
                      }}
                      placeholder="Item/Title (e.g. Tea, Fuel)"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                    />
                    {qaTitleFocused && titleSuggestions.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-sm">
                        {titleSuggestions.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => setQaTitle(s)}
                            className="block w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Amount */}
              <NumericInput value={qaAmount} onChange={(v) => setQaAmount(v)} className="w-32 px-3 py-2 border border-slate-300 rounded-lg text-sm" placeholder="Amount" />

              {/* Payment Status Toggle */}
              <button
                type="button"
                onClick={() => setQaPaymentStatus(prev => prev === 'Paid' ? 'Unpaid' : 'Paid')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${qaPaymentStatus === 'Paid'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200'
                  : 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                  }`}
              >
                {qaPaymentStatus}
              </button>

              {/* Add Button (Desktop) */}
              {qaExpenseType === 'Team' && (
                <button
                  onClick={async () => {
                    handleNotify();
                    await handleQuickAdd();
                  }}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 font-medium transition-colors"
                >
                  Add & Notify
                </button>
              )}
              <button
                onClick={handleQuickAdd}
                disabled={adding}
                className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-700 disabled:opacity-50 font-medium"
              >
                Add
              </button>
            </div>


          </div>
        )}
      </div>




      {/* Smart Search Bar */}
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
            placeholder="Search expenses (e.g. 'Paid', 'Paint', 'Raju')..."
            className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
        {searchFocused && searchSuggestions.length > 0 && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-xl overflow-hidden">
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase">
              Suggestions
            </div>
            {searchSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                onMouseDown={(e) => e.preventDefault()} // Prevent blur before click
                onClick={() => {
                  setSearchQuery(suggestion);
                  setSearchFocused(false);
                }}
                className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 flex items-center justify-between"
              >
                <span>{suggestion}</span>
                <span className="text-xs text-slate-400">Filter</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        {paginatedExpenses.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-500">
            No expenses found. {canAdd && 'Add your first expense to get started.'}
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Expense
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Added By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Supplier Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">
                      Receipt
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
                  {paginatedExpenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-800">{formatDate(expense.expenseDate)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-medium text-slate-800">{expense.title} {expense.category && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700">{expense.category}</span>
                            )}</div>
                            {expense.items && expense.items.length > 0 && (
                              <div className="text-xs text-slate-500 mt-1">
                                {expense.items.length} items
                              </div>
                            )}
                            {expense.notes && (
                              <div className="text-sm text-slate-500 mt-1">{expense.notes}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-800">
                        {getClientName(expense.projectId)}
                      </td>
                      <td className="px-6 py-4">
                        {(() => {
                          const user = users.find((u) => u.id === expense.addedBy);
                          const userName = user?.full_name || user?.username || 'Unknown';
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
                      <td className="px-6 py-4 text-sm text-slate-800">
                        {(() => {
                          if (expense.teamMemberId) {
                            const member = teams.find((m) => m.id === expense.teamMemberId);
                            const name = member?.name || 'Unknown';
                            const photo = member?.photoUrl;
                            return (
                              <div className="flex items-center gap-2">
                                {photo ? (
                                  <img
                                    src={photo}
                                    alt={name}
                                    className="w-8 h-8 rounded-full object-cover border-2 border-slate-200"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold border border-slate-200">
                                    {name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="font-medium text-slate-800">{name}</span>
                              </div>
                            );
                          } else {
                            // Standard Supplier or Temp
                            const name = getSupplierName(expense);
                            return <span className="text-sm text-slate-800">{name}</span>;
                          }
                        })()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${(expense as any).paymentStatus === 'Paid'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                          }`}>
                          {(expense as any).paymentStatus || 'Unpaid'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {expense.receiptImages && expense.receiptImages.length > 0 ? (
                          <button
                            onClick={() => setSelectedExpenseImages(expense.receiptImages || null)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 rounded transition-colors"
                            title={`View ${expense.receiptImages.length} receipt(s)`}
                          >
                            <Image className="w-3 h-3" />
                            View
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">No receipt</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-slate-800">
                        {formatCurrency(expense.amount)}
                      </td>
                      {(canEdit || canDelete) && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedExpenseId(expense.id)}
                              className="relative inline-flex items-center px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                              title="View version history in panel"
                            >
                              <Clock className="w-4 h-4" />
                              {getExpenseVersionHistory(expense.id).length > 0 && (
                                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                                  {getExpenseVersionHistory(expense.id).length}
                                </span>
                              )}
                            </button>
                            {canEdit && (
                              <button
                                onClick={() => handleEdit(expense)}
                                className="inline-flex items-center px-3 py-1 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Edit expense"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(expense.id)}
                                className="inline-flex items-center px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete expense"
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

            <div className="md:hidden space-y-4">
              {paginatedExpenses.map((expense) => (
                <div key={expense.id} className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-slate-800">{expense.title}</h4>
                      </div>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {formatDate(expense.expenseDate)}
                      </p>
                      {/* Removed duplicate time row under date */}
                      {expense.items && expense.items.length > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          {expense.items.length} items
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Client:</span>
                      <span className="font-medium text-slate-800 text-right max-w-[200px]">
                        {getClientName(expense.projectId)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Added By:</span>
                      {(() => {
                        const user = users.find((u) => u.id === expense.addedBy);
                        const userName = user?.full_name || user?.username || 'Unknown';
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
                    <div className="flex justify-between">
                      <span className="text-slate-600">Supplier Name:</span>
                      <span className="font-medium text-slate-800">
                        {(() => {
                          if (expense.teamMemberId) {
                            const member = teams.find((m) => m.id === expense.teamMemberId);
                            const name = member?.name || 'Unknown';
                            const photo = member?.photoUrl;
                            return (
                              <div className="flex items-center gap-2 justify-end">
                                {photo ? (
                                  <img
                                    src={photo}
                                    alt={name}
                                    className="w-6 h-6 rounded-full object-cover border border-slate-200"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold border border-slate-200">
                                    {name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span>{name}</span>
                              </div>
                            );
                          } else {
                            return getSupplierName(expense);
                          }
                        })()}
                      </span>
                    </div>
                    {expense.notes && (
                      <div className="pt-2 border-t border-slate-200">
                        <p className="text-xs text-slate-600 mb-1">Notes:</p>
                        <p className="text-sm text-slate-700">{expense.notes}</p>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-slate-200">
                      <span className="text-slate-600 font-medium">Receipt:</span>
                      {expense.receiptImages && expense.receiptImages.length > 0 ? (
                        <button
                          onClick={() => setSelectedExpenseImages(expense.receiptImages || null)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 rounded transition-colors"
                        >
                          <Image className="w-3 h-3" />
                          View
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">No receipt</span>
                      )}
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-200">
                      <span className="text-slate-600 font-medium">Amount:</span>
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(expense.amount)}
                      </span>
                    </div>
                  </div>

                  {(canEdit || canDelete) && (
                    <div className="mt-3 pt-3 border-t border-slate-200 flex gap-2">
                      <button
                        onClick={() => setSelectedExpenseId(expense.id)}
                        className="relative flex-1 inline-flex items-center justify-center px-3 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        title="View history"
                      >
                        <Clock className="w-4 h-4 mr-1" />
                        History
                        {getExpenseVersionHistory(expense.id).length > 0 && (
                          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold text-white bg-red-500 rounded-full">
                            {getExpenseVersionHistory(expense.id).length}
                          </span>
                        )}
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => handleEdit(expense)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(expense.id)}
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

      {isModalOpen && <ExpenseModal expense={editingExpense} onClose={handleCloseModal} />}

      <ConfirmDeleteModal
        open={!!confirmDelete}
        title="Delete Expense"
        message="Do you really want to delete this expense?"
        detail={confirmDelete?.title ? `Expense: ${confirmDelete?.title}` : undefined}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => { if (confirmDelete) { deleteExpense(confirmDelete.id); setConfirmDelete(null); } }}
      />

      {/* Version History Modal - Simple Timeline Design */}
      {
        selectedExpenseId && (() => {
          const history = getExpenseVersionHistory(selectedExpenseId);
          const expense = expenses.find(e => e.id === selectedExpenseId);

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
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4" onClick={() => setSelectedExpenseId(null)}>
              <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="flex-shrink-0 bg-white border-b border-slate-200 p-3 sm:p-4 flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base sm:text-lg font-semibold text-slate-800 truncate">Edit History</h3>
                    {expense && <p className="text-xs sm:text-sm text-slate-600 mt-1 truncate">{expense.title}</p>}
                  </div>
                  <button
                    onClick={() => setSelectedExpenseId(null)}
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
        })()
      }

      {
        selectedExpenseImages && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-4 border-b border-slate-200">
                <h3 className="text-lg font-semibold text-slate-800">Receipt Images</h3>
                <button
                  onClick={() => setSelectedExpenseImages(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-600" />
                </button>
              </div>
              <div className={`p-4 grid grid-cols-1 ${selectedExpenseImages.length > 1 ? 'md:grid-cols-2' : ''} gap-4`}>
                {selectedExpenseImages.map((image, index) => (
                  <div
                    key={index}
                    className="border border-slate-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => setSelectedFullImage(image)}
                  >
                    <img
                      src={`${API_BASE}${image.startsWith('/') ? image : `/${image}`}`}
                      alt={`Receipt ${index + 1}`}
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
