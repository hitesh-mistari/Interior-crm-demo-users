import { useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, Wallet, Receipt, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProjectSummary } from '../types';
import { formatCurrency } from '../utils/formatters';
import * as XLSX from 'xlsx';




export default function OverviewDashboard() {
  const { projects, expenses, payments, supplierPayments, teamWork, updateProject, currentUser, hasPermission, tasks } = useApp();
  const isAdmin = currentUser?.role === 'admin';
  const canReadProjects = hasPermission('projects', 'read');
  const canReadExpenses = hasPermission('expenses', 'read');
  const canReadPayments = hasPermission('payments', 'read');

  const SHOW_ROW_ACTIONS = false;
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);


  // Use only real data from context - no fallback demo data
  const projectsSrc = projects || [];
  const paymentsSrc = payments || [];
  const expensesSrc = expenses || [];
  const teamWorkSrc = teamWork || [];

  const activeProjectIds = useMemo(() => new Set(projectsSrc.filter(p => !p.deleted).map(p => p.id)), [projectsSrc]);

  const filteredPayments = useMemo(() => {
    return paymentsSrc.filter(payment => activeProjectIds.has(payment.projectId));
  }, [paymentsSrc, activeProjectIds]);

  const filteredSupplierPayments = useMemo(() => {
    // Pre-filter expenses to know which ones are active
    const activeExpenseIds = new Set(expensesSrc.filter(e => activeProjectIds.has(e.projectId)).map(e => e.id));

    return (supplierPayments || []).filter(sp => {
      if (sp.expenseId && !activeExpenseIds.has(sp.expenseId)) return false;
      return true;
    });
  }, [supplierPayments, activeProjectIds, expensesSrc]);

  const filteredExpenses = useMemo(() => {
    return expensesSrc.filter(expense => activeProjectIds.has(expense.projectId));
  }, [expensesSrc, activeProjectIds]);

  const filteredProjects = useMemo(() => {
    return projectsSrc.filter(project => !project.deleted);
  }, [projectsSrc]);

  const filteredTeamWork = useMemo(() => {
    return teamWorkSrc.filter(work => {
      if (work.projectId && !activeProjectIds.has(work.projectId)) return false;
      return true;
    });
  }, [teamWorkSrc, activeProjectIds]);






  const stats = useMemo(() => {
    const finalQuotationSum = filteredProjects
      .reduce((sum, p) => sum + (Number(p.projectAmount ?? p.quotationAmount ?? 0) || 0), 0);

    // Team Work Amounts
    const totalTeamWorkAmount = filteredTeamWork.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
    const totalTeamOutstanding = filteredTeamWork
      .filter(t => t.paymentStatus !== 'Paid')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0) + totalTeamWorkAmount;
    const totalPaymentsReceived = filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const profitLoss = totalPaymentsReceived - totalExpenses;
    const totalSupplierPaid = filteredSupplierPayments.reduce((sum, sp) => sum + (Number(sp.amount) || 0), 0);
    const totalPaidExpenses = filteredExpenses.reduce((sum, e) => {
      // Include only expenses marked as 'Paid'
      if ((e as any).paymentStatus === 'Paid') {
        return sum + (Number(e.amount) || 0);
      }
      return sum;
    }, 0);
    const totalUnpaidExpenses = filteredExpenses.reduce((sum, e) => {
      // Skip expenses marked as 'Paid'
      if ((e as any).paymentStatus === 'Paid') {
        return sum;
      }
      const paidForExp = filteredSupplierPayments
        .filter(sp => (sp.expenseId || '') === e.id)
        .reduce((s, sp) => s + (Number(sp.amount) || 0), 0);
      const remaining = Math.max(0, (Number(e.amount) || 0) - paidForExp);
      return sum + remaining;
    }, 0) + totalTeamOutstanding;

    // Calculate total amount actually paid out:
    // 1. Expenses marked as 'Paid' (full amount)
    // 2. Supplier payments for expenses NOT marked as paid (to avoid double counting)
    const supplierPaymentsForUnpaidExpenses = filteredSupplierPayments
      .filter(sp => {
        // Only count supplier payments for expenses that are NOT marked as 'Paid'
        if (!sp.expenseId) return true; // Count payments not linked to expenses
        const expense = filteredExpenses.find(e => e.id === sp.expenseId);
        return !expense || (expense as any).paymentStatus !== 'Paid';
      })
      .reduce((sum, sp) => sum + (Number(sp.amount) || 0), 0);

    const totalActuallyPaidOut = totalPaidExpenses + supplierPaymentsForUnpaidExpenses;
    const totalBalance = Math.max(0, totalPaymentsReceived - totalActuallyPaidOut);
    const ongoingProjects = projectsSrc.filter((p) => p.status === 'Ongoing').length;
    const completedProjects = projectsSrc.filter((p) => p.status === 'Completed').length;
    const cancelledProjects = projectsSrc.filter((p) => p.status === 'Cancelled').length;

    // Client Balance (Outstanding from Clients)
    const totalClientOutstanding = filteredProjects.reduce((sum, p) => {
      const pPayments = filteredPayments.filter(pay => pay.projectId === p.id)
        .reduce((s, pay) => s + (Number(pay.amount) || 0), 0);
      const pAmount = Number(p.projectAmount ?? p.quotationAmount ?? 0);
      return sum + Math.max(0, pAmount - pPayments);
    }, 0);

    return {
      totalTurnover: finalQuotationSum,
      totalExpenses,
      profitLoss,
      totalPaymentsReceived,
      totalSupplierPaid,
      totalUnpaidExpenses,
      totalBalance,
      totalClientOutstanding,
      activeProjects: ongoingProjects + completedProjects,
      ongoingProjects,
      completedProjects,
      cancelledProjects,
      totalPaidExpenses,
      totalProjects: projectsSrc.length,
    };
  }, [projectsSrc, filteredProjects, filteredExpenses, filteredPayments, filteredSupplierPayments, filteredTeamWork]);



  const projectSummaries: ProjectSummary[] = useMemo(() => {
    const summaries = projectsSrc.map((project) => {
      const projectExpenses = filteredExpenses.filter((e) => e.projectId === project.id);
      const projectTeamWork = filteredTeamWork.filter((t) => t.projectId === project.id);
      const projectPayments = filteredPayments.filter((p) => p.projectId === project.id);

      const expenseTotal = projectExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const teamWorkTotal = projectTeamWork.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
      const totalExpenses = expenseTotal + teamWorkTotal;

      const totalPayments = projectPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      return {
        project,
        totalExpenses,
        totalPayments,
        profitLoss: totalPayments - totalExpenses,
      };
    });

    // Handle Unallocated Team Work (No Project ID)
    const unallocatedTeamWork = filteredTeamWork.filter(t => !t.projectId);
    if (unallocatedTeamWork.length > 0) {
      const unallocatedExpenseTotal = unallocatedTeamWork.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      summaries.push({
        project: {
          id: 'unallocated',
          projectName: 'General / Unallocated',
          clientName: '-',
          projectType: 'General',
          quotationId: null,
          projectAmount: 0,
          quotationAmount: 0,
          status: 'Ongoing',
          paymentStatus: 'Pending',
          startDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          description: 'Expenses not linked to any specific project'
        } as any,
        totalExpenses: unallocatedExpenseTotal,
        totalPayments: 0,
        profitLoss: -unallocatedExpenseTotal
      });
    }

    return summaries;
  }, [projectsSrc, expensesSrc, filteredPayments, filteredTeamWork]);

  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return projectSummaries.slice(startIndex, endIndex);
  }, [projectSummaries, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(projectSummaries.length / itemsPerPage);

  const handleItemsPerPageChange = (value: number) => {
    setItemsPerPage(value);
    setCurrentPage(1);
  };

  const downloadExcel = () => {
    // Map data to rows
    const rows = projectSummaries.map((summary, index) => {
      const serialNumber = index + 1;
      const finalQuotation = Number(summary.project.projectAmount ?? summary.project.quotationAmount ?? 0);
      const remainingAfterPayments = Math.max(0, finalQuotation - summary.totalPayments);

      const projectTasks = tasks.filter(t => t.projectId === summary.project.id && !t.deleted);
      const pendingTasks = projectTasks.filter(t => t.status !== 'Completed').length;
      const totalTasks = projectTasks.length;

      const teamWorkUnpaid = filteredTeamWork
        .filter(t => t.projectId === summary.project.id && t.paymentStatus !== 'Paid')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const expenseTotal = Number(summary.totalExpenses) || 0; // Includes team work

      const unpaidExpenseTotal = filteredExpenses
        .filter(e => e.projectId === summary.project.id)
        .reduce((sum, e) => {
          if ((e as any).paymentStatus === 'Paid') return sum;
          const paidForExp = supplierPayments
            .filter(sp => (sp.expenseId || '') === e.id)
            .reduce((s, sp) => s + (Number(sp.amount) || 0), 0);
          const remaining = Math.max(0, (Number(e.amount) || 0) - paidForExp);
          return sum + remaining;
        }, 0);
      const totalUnpaid = unpaidExpenseTotal + teamWorkUnpaid;

      const profitEarned = summary.totalPayments - expenseTotal;

      return {
        'Sr No': serialNumber,
        'Order Details (Project)': summary.project.projectName || summary.project.projectType || '-',
        'Client': summary.project.clientName || '-',
        'Project Amount': finalQuotation,
        'Payments': summary.totalPayments,
        'Balance': remainingAfterPayments,
        'Tasks': `${pendingTasks}/${totalTasks} Pending`,
        'Expense': expenseTotal,
        'Unpaid Expense': totalUnpaid,
        'Profit': profitEarned
      };
    });

    // Create Summary Sheet Data
    // Create Summary Sheet Data (Transposed/Horizontal)
    const summaryData = [
      {
        'Payments Received': stats.totalPaymentsReceived,
        'Total Expense': stats.totalExpenses,
        'Paid Expenses': stats.totalPaidExpenses,
        'Unpaid Expenses': stats.totalUnpaidExpenses,
        'Turnover': stats.totalTurnover,
        'Balance': stats.totalBalance,
        'Profit / Loss': stats.profitLoss,
        'Balance (Client)': stats.totalClientOutstanding,
        'Total Projects': stats.totalProjects
      }
    ];

    const workbook = XLSX.utils.book_new();

    // Add Summary Sheet
    const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
    // Adjust column widths for Summary (All columns roughly same width)
    const summaryCols = Object.keys(summaryData[0]).map(() => ({ wch: 18 }));
    summaryWorksheet['!cols'] = summaryCols;
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, "Dashboard Summary");

    // Add Projects Sheet
    const projectsWorksheet = XLSX.utils.json_to_sheet(rows);
    // Adjust column widths for Projects
    projectsWorksheet['!cols'] = [
      { wch: 8 },  // Sr No
      { wch: 30 }, // Order Details
      { wch: 20 }, // Client
      { wch: 15 }, // Project Amount
      { wch: 15 }, // Payments
      { wch: 15 }, // Balance
      { wch: 15 }, // Tasks
      { wch: 15 }, // Expense
      { wch: 15 }, // Unpaid Expense
      { wch: 15 }  // Profit
    ];
    XLSX.utils.book_append_sheet(workbook, projectsWorksheet, "Project Performance");

    XLSX.writeFile(workbook, `ae_dashboard_overview_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-6 text-sm sm:text-base">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800">
            Welcome back, {currentUser?.name}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-1">Here's your business overview</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-3 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-lg">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active</span>
              <span className="text-xs font-bold text-indigo-700">{stats.activeProjects}</span>
            </div>
            <div className="w-px h-3 bg-indigo-200"></div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ongoing</span>
              <span className="text-xs font-bold text-indigo-700">{stats.ongoingProjects}</span>
            </div>
          </div>


        </div>
      </div>

      <div className={`grid grid-cols-2 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-4' : 'lg:grid-cols-2'} gap-4 sm:gap-6`}>
        {isAdmin && (
          <>
            {/* Card 1: Total Turnover - Neutral/Informational */}
            <div className="relative rounded-lg shadow-sm border p-4 sm:p-6" style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-xs sm:text-sm font-medium" style={{ color: '#64748B' }}>Turnover</p>
                  <p className="text-2xl font-bold mt-1 sm:mt-2" style={{ color: '#0F172A' }}>
                    {formatCurrency(stats.totalTurnover)}
                  </p>
                </div>
                <div className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-lg items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E2E8F0' }}>
                  <Wallet className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#334155' }} />
                </div>
              </div>
              <div className="absolute right-3 top-3 sm:hidden opacity-10">
                <Wallet className="w-10 h-10" style={{ color: '#334155' }} />
              </div>
            </div>

            {/* Card 2: Payments Received - Positive/Success */}
            <div className="relative rounded-lg shadow-sm border p-4 sm:p-6" style={{ backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' }}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-xs sm:text-sm font-medium" style={{ color: '#64748B' }}> Payments Received</p>
                  <p className="text-2xl font-bold mt-1 sm:mt-2" style={{ color: '#16A34A' }}>
                    {formatCurrency(stats.totalPaymentsReceived)}
                  </p>
                </div>
                <div className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-lg items-center justify-center flex-shrink-0" style={{ backgroundColor: '#D1FAE5' }}>
                  <Wallet className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#16A34A' }} />
                </div>
              </div>
              <div className="absolute right-3 top-3 sm:hidden opacity-10">
                <Wallet className="w-10 h-10" style={{ color: '#16A34A' }} />
              </div>
            </div>

            {/* Card 3: Client Balance (Outstanding) - Positive/Pending */}
            <div className="relative rounded-lg shadow-sm border p-4 sm:p-6" style={{ backgroundColor: '#FFFAF0', borderColor: '#FDE68A' }}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-xs sm:text-sm font-medium" style={{ color: '#64748B' }}>Balance (Client)</p>
                  <p className="text-2xl font-bold mt-1 sm:mt-2" style={{ color: '#D97706' }}>
                    {formatCurrency(stats.totalClientOutstanding)}
                  </p>
                </div>
                <div className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-lg items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FEF3C7' }}>
                  <Wallet className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#D97706' }} />
                </div>
              </div>
              <div className="absolute right-3 top-3 sm:hidden opacity-10">
                <Wallet className="w-10 h-10" style={{ color: '#D97706' }} />
              </div>
            </div>

            {/* Card 4: Profit / Loss - Dynamic (Positive/Negative) */}
            <div className="relative rounded-lg shadow-sm border p-4 sm:p-6" style={{ backgroundColor: stats.profitLoss >= 0 ? '#ECFDF5' : '#FFF1F2', borderColor: stats.profitLoss >= 0 ? '#D1FAE5' : '#FECACA' }}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-xs sm:text-sm font-medium" style={{ color: '#64748B' }}>Profit / Loss</p>
                  <p
                    className="text-2xl font-bold mt-1 sm:mt-2"
                    style={{ color: stats.profitLoss >= 0 ? '#16A34A' : '#DC2626' }}
                  >
                    {formatCurrency(stats.profitLoss)}
                  </p>
                </div>
                <div
                  className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-lg items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: stats.profitLoss >= 0 ? '#D1FAE5' : '#FECACA' }}
                >
                  {stats.profitLoss >= 0 ? (
                    <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#16A34A' }} />
                  ) : (
                    <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#DC2626' }} />
                  )}
                </div>
              </div>
              <div className="absolute right-3 top-3 sm:hidden opacity-10">
                {stats.profitLoss >= 0 ? (
                  <TrendingUp className="w-10 h-10" style={{ color: '#16A34A' }} />
                ) : (
                  <TrendingDown className="w-10 h-10" style={{ color: '#DC2626' }} />
                )}
              </div>
            </div>

            {/* Card 5: Total Expense - Neutral/Informational */}
            <div className="relative rounded-lg shadow-sm border p-4 sm:p-6" style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-xs sm:text-sm font-medium" style={{ color: '#64748B' }}>Total Expense</p>
                  <p className="text-2xl font-bold mt-1 sm:mt-2" style={{ color: '#0F172A' }}>
                    {formatCurrency(stats.totalExpenses)}
                  </p>
                </div>
                <div className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-lg items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E2E8F0' }}>
                  <Receipt className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#334155' }} />
                </div>
              </div>
              <div className="absolute right-3 top-3 sm:hidden opacity-10">
                <Receipt className="w-10 h-10" style={{ color: '#334155' }} />
              </div>
            </div>

            {/* Card 6: Paid Expenses - Neutral/Informational */}
            <div className="relative rounded-lg shadow-sm border p-4 sm:p-6" style={{ backgroundColor: '#F8FAFC', borderColor: '#E2E8F0' }}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-xs sm:text-sm font-medium" style={{ color: '#64748B' }}>Paid Expenses</p>
                  <p className="text-2xl font-bold mt-1 sm:mt-2" style={{ color: '#0F172A' }}>
                    {formatCurrency(stats.totalPaidExpenses)}
                  </p>
                </div>
                <div className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-lg items-center justify-center flex-shrink-0" style={{ backgroundColor: '#E2E8F0' }}>
                  <Receipt className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#334155' }} />
                </div>
              </div>
              <div className="absolute right-3 top-3 sm:hidden opacity-10">
                <Receipt className="w-10 h-10" style={{ color: '#334155' }} />
              </div>
            </div>

            {/* Card 7: Total Unpaid Expenses - Loss/Negative */}
            <div className="relative rounded-lg shadow-sm border p-4 sm:p-6" style={{ backgroundColor: '#FFF1F2', borderColor: '#FECACA' }}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-xs sm:text-sm font-medium" style={{ color: '#64748B' }}>Unpaid Expenses</p>
                  <p className="text-2xl font-bold mt-1 sm:mt-2" style={{ color: '#DC2626' }}>
                    {formatCurrency(stats.totalUnpaidExpenses)}
                  </p>
                </div>
                <div className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-lg items-center justify-center flex-shrink-0" style={{ backgroundColor: '#FECACA' }}>
                  <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#DC2626' }} />
                </div>
              </div>
              <div className="absolute right-3 top-3 sm:hidden opacity-10">
                <TrendingDown className="w-10 h-10" style={{ color: '#DC2626' }} />
              </div>
            </div>

            {/* Card 8: Balance (Me) - Positive/Success */}
            <div className="relative rounded-lg shadow-sm border p-4 sm:p-6" style={{ backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' }}>
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0 mr-3">
                  <p className="text-xs sm:text-sm font-medium" style={{ color: '#64748B' }}>Balance (Me)</p>
                  <p className="text-2xl font-bold mt-1 sm:mt-2" style={{ color: '#16A34A' }}>
                    {formatCurrency(stats.totalBalance)}
                  </p>
                </div>
                <div className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-lg items-center justify-center flex-shrink-0" style={{ backgroundColor: '#D1FAE5' }}>
                  <Wallet className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: '#16A34A' }} />
                </div>
              </div>
              <div className="absolute right-3 top-3 sm:hidden opacity-10">
                <Wallet className="w-10 h-10" style={{ color: '#16A34A' }} />
              </div>
            </div>
          </>
        )}
      </div>

      {/* CHARTS ROW */}


      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-lg font-semibold text-slate-800">Project Performance</h3>
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-sm text-slate-600 font-medium">Show:</label>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-slate-600">per page</span>
            <div className="h-6 w-px bg-slate-300 mx-2 hidden sm:block"></div>
            <button
              onClick={downloadExcel}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Excel
            </button>
          </div>
        </div>

        {(projectSummaries.length === 0 || !canReadProjects) ? (
          <div className="px-6 py-12 text-center text-slate-500">
            {!canReadProjects ? "You don't have permission to view projects." : "No projects yet. Create your first project to get started."}
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400 [&::-webkit-scrollbar-thumb]:rounded-full transition-colors">
              <table className="w-full min-w-[1400px] border-collapse border border-slate-200 rounded-lg">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider w-12 whitespace-nowrap border border-slate-200">Sr No</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider whitespace-nowrap border border-slate-200">Order Details</th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider whitespace-nowrap border border-slate-200">Project Amount</th>
                    {canReadPayments && <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider whitespace-nowrap border border-slate-200 bg-green-50 text-green-700">Payments</th>}
                    {canReadPayments && <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider whitespace-nowrap border border-slate-200 bg-orange-50 text-orange-700">Balance</th>}
                    {canReadExpenses && <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider whitespace-nowrap border border-slate-200">Tasks</th>}
                    {canReadExpenses && <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider whitespace-nowrap border border-slate-200">Expense</th>}
                    {canReadExpenses && <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider whitespace-nowrap border border-slate-200 bg-red-50 text-red-700">Unpaid Expense</th>}
                    {(canReadExpenses && canReadPayments) && <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider whitespace-nowrap border border-slate-200 bg-green-100 text-green-700">Profit</th>}
                    {SHOW_ROW_ACTIONS && (
                      <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider whitespace-nowrap border border-slate-200">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {paginatedProjects.map((summary, index) => {

                    const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;
                    const finalQuotation = Number(summary.project.projectAmount ?? summary.project.quotationAmount ?? 0);
                    const remainingAfterPayments = Math.max(0, finalQuotation - summary.totalPayments);
                    const expenseOnSite = summary.totalExpenses;
                    const unpaidExpenseTotal = filteredExpenses
                      .filter(e => e.projectId === summary.project.id)
                      .reduce((sum, e) => {
                        // Skip expenses marked as 'Paid'
                        if ((e as any).paymentStatus === 'Paid') {
                          return sum;
                        }
                        const paidForExp = supplierPayments
                          .filter(sp => (sp.expenseId || '') === e.id)
                          .reduce((s, sp) => s + (Number(sp.amount) || 0), 0);
                        const remaining = Math.max(0, (Number(e.amount) || 0) - paidForExp);
                        return sum + remaining;
                      }, 0);

                    const teamWorkUnpaid = filteredTeamWork
                      .filter(t => t.projectId === summary.project.id && t.paymentStatus !== 'Paid')
                      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

                    const totalUnpaid = unpaidExpenseTotal + teamWorkUnpaid;

                    // Net cash balance removed from row display; computation omitted

                    const profitEarned = summary.totalPayments - Number(expenseOnSite);
                    const profitDisplay = formatCurrency(profitEarned);

                    return (
                      <tr key={summary.project.id} className="hover:bg-slate-50">
                        <td className="px-4 py-4 text-center text-xs font-medium text-slate-500 whitespace-nowrap border border-slate-200">
                          {(() => {
                            // Calculate Tasks Progress
                            const totalTasks = Number(summary.project.totalTasks || 0);
                            const completedTasks = Number(summary.project.completedTasks || 0);
                            const taskPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

                            const radius = 17;
                            const strokeW = 4;
                            const circumference = 2 * Math.PI * radius;
                            const offset = circumference * (1 - taskPercentage / 100);
                            const gradId = `ringGrad-${summary.project.id}-${serialNumber}`;

                            return (
                              <div
                                className="group relative w-10 h-10 inline-flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-full"
                                role="progressbar"
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={taskPercentage}
                                aria-valuetext={`${taskPercentage}%`}
                                aria-label={`Task completion ${taskPercentage}%`}
                                tabIndex={0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.history.pushState({}, '', `/projects/${summary.project.id}`);
                                  const navEvent = new PopStateEvent('popstate');
                                  window.dispatchEvent(navEvent);
                                }}
                                style={{ background: '#fff' }}
                              >
                                <svg width="40" height="40" viewBox="0 0 40 40" className="absolute inset-0">
                                  <defs>
                                    <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                                      <stop offset="0%" stopColor="#66BB6A" />
                                      <stop offset="50%" stopColor="#4CAF50" />
                                      <stop offset="100%" stopColor="#2E7D32" />
                                    </linearGradient>
                                  </defs>
                                  <circle cx="20" cy="20" r={radius} stroke="#F3F4F6" strokeWidth={strokeW} fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.05))' }} />
                                  <circle
                                    cx="20"
                                    cy="20"
                                    r={radius}
                                    stroke={`url(#${gradId})`}
                                    strokeWidth={strokeW}
                                    fill="none"
                                    strokeLinecap="round"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={offset}
                                    style={{ transition: 'stroke-dashoffset 300ms ease-in-out', transform: 'rotate(-90deg)', transformOrigin: '50% 50%', filter: 'drop-shadow(0 2px 4px rgba(76,175,80,0.25))' }}
                                  />
                                </svg>
                                <span className="text-slate-700 text-[13px] sm:text-sm font-medium transition-opacity duration-300 ease-in-out group-hover:opacity-0 group-focus:opacity-0 group-active:opacity-0">{serialNumber}</span>
                                <span className="absolute text-[10px] font-bold transition-opacity duration-300 ease-in-out opacity-0 group-hover:opacity-100 group-focus:opacity-100 group-active:opacity-100" style={{ color: '#4CAF50' }}>{taskPercentage}%</span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-800 border border-slate-200">
                          <div className="flex flex-col items-start space-y-0.5">
                            <div className="font-semibold text-slate-800 truncate max-w-[220px]" title={summary.project.projectName || summary.project.projectType}>
                              {summary.project.projectName || summary.project.projectType || '—'}
                            </div>
                            <div className="text-[11px] text-slate-600 truncate max-w-[220px]" title={summary.project.clientName}>
                              {summary.project.clientName || '—'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center text-xs font-medium text-slate-800 whitespace-nowrap border border-slate-200">{finalQuotation ? formatCurrency(finalQuotation) : '-'}</td>
                        {canReadPayments && <td className="px-6 py-4 text-center text-xs font-semibold whitespace-nowrap border border-slate-200 bg-green-50 text-green-700">{summary.totalPayments ? formatCurrency(summary.totalPayments) : '-'}</td>}
                        {canReadPayments && <td className="px-6 py-4 text-center text-xs font-semibold whitespace-nowrap border border-slate-200 bg-orange-50 text-orange-700">{formatCurrency(remainingAfterPayments)}</td>}
                        {canReadExpenses && (() => {
                          const projectTasks = tasks.filter(t => t.projectId === summary.project.id && !t.deleted);
                          const pendingTasks = projectTasks.filter(t => t.status !== 'Completed').length;
                          const totalTasks = projectTasks.length;
                          return (
                            <td className="px-6 py-4 text-center text-xs font-medium text-slate-800 whitespace-nowrap border border-slate-200">
                              <span className="inline-flex items-center gap-1">
                                <span className="font-semibold text-orange-600">{pendingTasks}</span>
                                <span className="text-slate-400">/</span>
                                <span className="text-slate-600">{totalTasks}</span>
                              </span>
                            </td>
                          );
                        })()}
                        {canReadExpenses && <td className="px-6 py-4 text-center text-xs font-medium text-slate-800 whitespace-nowrap border border-slate-200">{formatCurrency(expenseOnSite)}</td>}
                        {canReadExpenses && (
                          <td
                            className="px-6 py-4 text-center text-xs font-semibold whitespace-nowrap border border-slate-200 bg-red-50 text-red-700 cursor-pointer hover:bg-red-100 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.history.pushState({}, '', `/projects/${summary.project.id}`);
                              const navEvent = new PopStateEvent('popstate');
                              window.dispatchEvent(navEvent);
                            }}
                          >
                            {formatCurrency(totalUnpaid)}
                          </td>
                        )}
                        {(canReadExpenses && canReadPayments) && (() => {
                          // Calculate actual profit percentage
                          const actualProfitPercentage = summary.totalPayments > 0
                            ? (profitEarned / summary.totalPayments) * 100
                            : 0;
                          const expectedProfit = Number(summary.project.expectedProfitPercentage) || 0;
                          const isBelowExpected = expectedProfit > 0 && actualProfitPercentage < expectedProfit;

                          return (
                            <td className="px-6 py-4 text-center text-xs font-semibold whitespace-nowrap border border-slate-200 bg-green-100">
                              <div className="flex flex-col items-center gap-1">
                                <span className={profitEarned < 0 ? 'text-red-700' : 'text-green-700'}>
                                  {profitDisplay}
                                </span>
                                {isBelowExpected && (
                                  <span className="text-[10px] text-orange-600 font-medium">
                                    Below target ({expectedProfit.toFixed(1)}%)
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        })()}
                        {SHOW_ROW_ACTIONS && (
                          <td className="px-6 py-4 text-center text-xs whitespace-nowrap border border-slate-200">
                            <div className="inline-flex items-center gap-3 text-slate-700 whitespace-nowrap">
                              <button className="hover:text-slate-900" onClick={() => { window.location.href = `/projects/${summary.project.id}`; }}>View</button>
                              <span className="text-slate-300">|</span>
                              <button className="hover:text-slate-900" onClick={() => { window.location.href = `/projects/${summary.project.id}`; }}>Edit</button>
                              <span className="text-slate-300">|</span>
                              <button className="hover:text-slate-900" onClick={() => { window.location.href = `/projects/${summary.project.id}`; }}>Add Payment</button>
                              <span className="text-slate-300">|</span>
                              <button className="hover:text-slate-900" onClick={() => { updateProject(summary.project.id, { status: 'Completed' }); }}>Complete</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden flex flex-col gap-3">
              {paginatedProjects.map((summary, index) => {
                const isOngoing = summary.project.status === 'Ongoing';
                const profitMargin = summary.totalPayments > 0
                  ? ((summary.profitLoss / summary.totalPayments) * 100)
                  : 0;
                const expectedProfit = summary.project.expectedProfitPercentage || 0;
                const showWarning = isOngoing && expectedProfit > 0 && profitMargin < expectedProfit;
                const serialNumber = (currentPage - 1) * itemsPerPage + index + 1;

                // Calculations for Mobile View
                const finalQuotation = Number(summary.project.projectAmount ?? summary.project.quotationAmount ?? 0);
                const remainingAfterPayments = Math.max(0, finalQuotation - summary.totalPayments);

                const unpaidExpenseTotal = filteredExpenses
                  .filter(e => e.projectId === summary.project.id)
                  .reduce((sum, e) => {
                    if ((e as any).paymentStatus === 'Paid') return sum;
                    const paidForExp = supplierPayments
                      .filter(sp => (sp.expenseId || '') === e.id)
                      .reduce((s, sp) => s + (Number(sp.amount) || 0), 0);
                    const remaining = Math.max(0, (Number(e.amount) || 0) - paidForExp);
                    return sum + remaining;
                  }, 0);

                const teamWorkUnpaid = filteredTeamWork
                  .filter(t => t.projectId === summary.project.id && t.paymentStatus !== 'Paid')
                  .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

                const totalUnpaid = unpaidExpenseTotal + teamWorkUnpaid;

                return (
                  <div key={summary.project.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex gap-3 flex-1">
                        {(() => {
                          const finalQuotation = Number(summary.project.projectAmount ?? summary.project.quotationAmount ?? 0);
                          const paymentProgress = finalQuotation > 0 ? Math.min(100, Math.round((summary.totalPayments / finalQuotation) * 100)) : 0;
                          const radius = 19;
                          const circumference = 2 * Math.PI * radius;
                          const offset = circumference * (1 - paymentProgress / 100);
                          return (
                            <div
                              className="group flex-shrink-0 w-10 h-10 rounded-full relative flex items-center justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                              role="progressbar"
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={paymentProgress}
                              aria-valuetext={`${paymentProgress}%`}
                              aria-label={`Payment progress ${paymentProgress}%`}
                              tabIndex={0}
                              style={{ background: '#fff' }}
                            >
                              <svg width="40" height="40" viewBox="0 0 40 40" className="absolute inset-0">
                                <defs>
                                  <linearGradient id={`ringGrad-${summary.project.id}-${serialNumber}-m`} x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#66BB6A" />
                                    <stop offset="50%" stopColor="#4CAF50" />
                                    <stop offset="100%" stopColor="#2E7D32" />
                                  </linearGradient>
                                </defs>
                                <circle cx="20" cy="20" r={17} stroke="#F3F4F6" strokeWidth={4} fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.05))' }} />
                                <circle
                                  cx="20"
                                  cy="20"
                                  r={17}
                                  stroke={`url(#${`ringGrad-${summary.project.id}-${serialNumber}-m`})`}
                                  strokeWidth={4}
                                  fill="none"
                                  strokeLinecap="round"
                                  strokeDasharray={circumference}
                                  strokeDashoffset={offset}
                                  style={{ transition: 'stroke-dashoffset 300ms ease-in-out', transform: 'rotate(-90deg)', transformOrigin: '50% 50%', filter: 'drop-shadow(0 2px 4px rgba(76,175,80,0.25))' }}
                                />
                              </svg>
                              <span className="text-slate-700 text-[13px] sm:text-sm font-medium transition-opacity duration-300 ease-in-out group-hover:opacity-0 group-focus:opacity-0 group-active:opacity-0">{serialNumber}</span>
                              <span className="absolute text-[10px] font-bold transition-opacity duration-300 ease-in-out opacity-0 group-hover:opacity-100 group-focus:opacity-100 group-active:opacity-100" style={{ color: '#4CAF50' }}>{paymentProgress}%</span>
                            </div>
                          );
                        })()}
                        <div className="flex-1">
                          <h4 className="font-semibold text-slate-800">
                            {summary.project.projectName}
                          </h4>
                          <p className="text-sm text-slate-500 mt-0.5">
                            {summary.project.projectType}
                          </p>
                          <p className="text-xs text-slate-600 mt-1 font-medium">
                            {summary.project.clientName}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${summary.project.status === 'Ongoing'
                          ? 'bg-blue-100 text-blue-700'
                          : summary.project.status === 'Completed'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                          }`}
                      >
                        {summary.project.status}
                      </span>
                    </div>

                    {isAdmin && (
                      <div className="space-y-2 text-sm">
                        {summary.project.projectAmount && (
                          <div className="flex justify-between">
                            <span className="text-slate-600">Project Amount:</span>
                            <span className="font-bold text-slate-900">
                              {formatCurrency(summary.project.projectAmount)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-600">Payments:</span>
                          <span className="font-semibold text-emerald-600">
                            {canReadPayments ? formatCurrency(summary.totalPayments) : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Balance (Client):</span>
                          <span className="font-semibold text-orange-600">
                            {canReadPayments ? formatCurrency(remainingAfterPayments) : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Tasks (Pending):</span>
                          <span className="font-medium text-slate-700">
                            {(() => {
                              const projectTasks = tasks.filter(t => t.projectId === summary.project.id && !t.deleted);
                              const pendingTasks = projectTasks.filter(t => t.status !== 'Completed').length;
                              const totalTasks = projectTasks.length;
                              return `${pendingTasks} / ${totalTasks}`;
                            })()}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Unpaid Expenses:</span>
                          <span className={`font-semibold ${totalUnpaid > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                            {canReadExpenses ? formatCurrency(totalUnpaid) : '—'}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-slate-200">
                          <span className="text-slate-600 font-medium">
                            Profit:
                          </span>
                          <div className="text-right">
                            <div
                              className={`font-bold ${showWarning
                                ? 'text-orange-600'
                                : summary.profitLoss >= 0
                                  ? 'text-emerald-600'
                                  : 'text-red-600'
                                }`}
                            >
                              {(canReadExpenses && canReadPayments) ? formatCurrency(summary.profitLoss) : '—'}
                            </div>
                            {showWarning && (
                              <div className="text-xs text-orange-600 font-medium mt-0.5">
                                Below target ({expectedProfit}%)
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-slate-600">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, projectSummaries.length)} of{' '}
              {projectSummaries.length} projects
            </div>
            <div className="flex gap-2 flex-wrap justify-center">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Previous</span>
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let page;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium ${currentPage === page
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-700 hover:bg-slate-50'
                        }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
              >
                <span className="hidden sm:inline">Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
