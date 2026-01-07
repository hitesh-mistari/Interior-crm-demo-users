import { useMemo, useState, Fragment, useEffect } from 'react';
import { ArrowLeft, Calendar, Building2, Phone, Filter, FileText, Image as ImageIcon, ChevronDown, CreditCard, Banknote, Smartphone, Building, User } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';
import { formatShortDate } from '../utils/dates';
import SupplierPaymentModal from './SupplierPaymentModal';

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

const percentageLabelsPlugin = {
  id: 'percentageLabels',
  afterDatasetsDraw(chart: any) {
    const { ctx } = chart;
    const dataset = chart.data.datasets?.[0];
    const meta = chart.getDatasetMeta(0);
    if (!dataset || !meta) return;
    const total = (dataset.data || []).reduce((sum: number, v: number) => sum + (Number(v) || 0), 0);
    meta.data.forEach((element: any, index: number) => {
      const value = Number(dataset.data?.[index] || 0);
      if (!total || !value) return;
      const percent = Math.round((value / total) * 100);
      const { x, y } = element.tooltipPosition();
      ctx.save();
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${percent}% `, x, y);
      ctx.restore();
    });
  }
};

ChartJS.register(ArcElement, Tooltip, Legend, percentageLabelsPlugin);

type DateFilter = 'today' | 'week' | 'month' | '6months' | 'year' | 'all';
type PaymentStatusFilter = 'all' | 'paid' | 'partial' | 'pending';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

interface ProjectDashboardProps {
  projectId: string;
  onClose: () => void;
}

export default function ProjectDashboard({ projectId, onClose }: ProjectDashboardProps) {
  const { projects, expenses, payments, suppliers, supplierPayments, users, addPayment, currentUser, addNotification, hasPermission, tasks, teams } = useApp();
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>('all');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedExpenseForPayment, setSelectedExpenseForPayment] = useState<string | null>(null);
  const [selectedExpenseImages, setSelectedExpenseImages] = useState<string[] | null>(null);
  const [selectedFullImage, setSelectedFullImage] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [entryAmount, setEntryAmount] = useState<number>(0);
  const [entryDate, setEntryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [entryMethod, setEntryMethod] = useState<'Cash' | 'Cheque' | 'UPI' | 'Banking' | 'Other'>('Cash');
  const [entryReference, setEntryReference] = useState<string>('');
  const [entryNotes, setEntryNotes] = useState<string>('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [taskMetrics, setTaskMetrics] = useState<{ totalTasks: number; completedTasks: number; completionPercentage: number; statusBreakdown: { status: string; count: number }[]; priorityBreakdown: { priority: string; count: number }[] }>({ totalTasks: 0, completedTasks: 0, completionPercentage: 0, statusBreakdown: [], priorityBreakdown: [] });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [projectId]);

  const project = projects.find((p) => p.id === projectId);

  if (!project) {
    return (
      <div className="space-y-6 pb-20 p-[15px] sm:p-0">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="px-3 py-1.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 inline-flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to Projects
          </button>
          <span className="text-red-600">Project not found.</span>
        </div>
      </div>
    );
  }





  const projectExpenses = expenses.filter((e) => e.projectId === project.id && !e.deleted);
  const projectPayments = payments.filter((p) => p.projectId === project.id && !p.deleted);

  // Helper functions for payment tracking
  const getExpensePaidAmount = (expenseId: string, expenseAmount: number, expenseStatus?: string) => {
    // If expense is marked as "Paid", return the full amount
    if (expenseStatus === 'Paid') {
      return expenseAmount;
    }
    // Otherwise, return the sum of supplier payments for this expense
    return supplierPayments
      .filter((p) => p.expenseId === expenseId && !p.deleted)
      .reduce((sum, p) => sum + p.amount, 0);
  };

  const getPaymentStatus = (amount: number, paid: number): 'paid' | 'partial' | 'pending' => {
    if (paid === 0) return 'pending';
    if (paid >= amount) return 'paid';
    return 'partial';
  };

  const getUserName = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return user?.fullName || 'Unknown User';
  };

  const getUser = (userId: string) => {
    return users.find((u) => u.id === userId);
  };

  const getSupplierName = (expense: any) => {
    if (expense.tempSupplierName) {
      return expense.tempSupplierName;
    }
    if (expense.supplierId) {
      const supplier = suppliers.find((s) => s.id === expense.supplierId);
      return supplier?.supplierName || '-';
    }
    // Check for team member
    if (expense.teamMemberId) {
      const teamMember = teams.find((t) => t.id === expense.teamMemberId);
      return teamMember?.fullName || teamMember?.name || 'Team Member';
    }
    return '-';
  };

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

  const totalPurchases = useMemo(() => projectExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0), [projectExpenses]);

  const totalPaid = useMemo(() => {
    // Calculate total paid from both supplier payments AND expenses marked as "Paid"
    // Important: Don't double count - if an expense is marked as 'Paid', ignore supplier payments for it
    const paidFromExpenseStatus = projectExpenses
      .filter((e) => (e as any).paymentStatus === 'Paid')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const paidFromSupplierPayments = supplierPayments
      .filter((p) => {
        if (!p.expenseId) return false;
        // Only count if the expense exists in this project
        const expense = projectExpenses.find((e) => e.id === p.expenseId);
        if (!expense) return false;
        // Only count if the expense is NOT marked as 'Paid' (to avoid double counting)
        return (expense as any).paymentStatus !== 'Paid';
      })
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    return paidFromSupplierPayments + paidFromExpenseStatus;
  }, [projectExpenses, supplierPayments]);

  const outstanding = totalPurchases - totalPaid;

  useEffect(() => {
    const api = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

    fetch(`${api}/projects/${projectId}/task-metrics`)
      .then((r) => r.json())
      .then((d) => setTaskMetrics(d))
      .catch(() => setTaskMetrics({ totalTasks: 0, completedTasks: 0, completionPercentage: 0, statusBreakdown: [], priorityBreakdown: [] }))
      .finally(() => { });
  }, [projectId, tasks]);

  const percentage = taskMetrics.completionPercentage || 0;

  let progressColor = '#ef4444'; // Red (0-40%)
  if (percentage > 40 && percentage < 90) progressColor = '#f97316'; // Orange (41-89%)
  if (percentage >= 90) progressColor = '#22c55e'; // Green (90-100%)

  const completionData = {
    labels: ['Completed', 'Remaining'],
    datasets: [{
      data: [percentage, 100 - percentage],
      backgroundColor: [progressColor, '#f1f5f9'],
      borderColor: [progressColor, '#f1f5f9'],
      borderWidth: 0,
      circumference: 360,
      rotation: 0,
    }],
  };

  const completionOptions = {
    cutout: '85%',
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
      percentageLabels: false // Disable custom plugin
    },
    maintainAspectRatio: false,
    responsive: true,
  } as any;



  const handleGeneratePDF = () => {
    const totalExpenses = projectExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalPayments = projectPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const dueAmount = (project.projectAmount ?? project.quotationAmount ?? 0) || 0;
    const progressRaw = dueAmount > 0 ? (totalPayments / dueAmount) * 100 : 0;
    const progressPercent = Math.min(100, Math.max(0, progressRaw));
    const profitLoss = totalPayments - totalExpenses;

    const w = window.open('', '', 'width=800,height=600');
    if (!w) return;

    const html = `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Project Report - ${project.projectName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #1e293b; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .company-name { font-size: 24px; font-weight: bold; color: #1e293b; margin-bottom: 5px; }
          .company-tagline { font-size: 14px; color: #64748b; }
          .report-title { font-size: 20px; font-weight: bold; margin: 20px 0; color: #1e293b; }
          .project-details { margin-bottom: 20px; background: #f8fafc; padding: 15px; border-radius: 8px; }
          .project-details table { width: 100%; }
          .project-details td { padding: 6px; }
          .section-title { font-size: 16px; font-weight: bold; margin-top: 24px; margin-bottom: 10px; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #1e293b; color: #fff; padding: 10px; text-align: left; font-size: 12px; }
          td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
          tr:hover { background: #f8fafc; }
          .summary { background: #f1f5f9; padding: 16px; border-radius: 8px; margin-top: 16px; }
          .summary-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #cbd5e1; }
          .summary-row.total { font-weight: bold; font-size: 16px; border-bottom: none; border-top: 2px solid #1e293b; margin-top: 8px; }
          .profit { color: #059669; }
          .loss { color: #dc2626; }
          .footer { margin-top: 24px; text-align: center; color: #64748b; font-size: 12px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">Artistic Engineers</div>
          <div class="company-tagline">Interior Design & Management</div>
        </div>
        <div class="report-title">Project Financial Report</div>
        <div class="project-details">
          <table>
            <tr>
              <td><strong>Project:</strong> ${project.projectName}</td>
              <td style="text-align: right;"><strong>Client:</strong> ${project.clientName}</td>
            </tr>
            <tr>
              <td><strong>Project Type:</strong> ${project.projectType}</td>
              <td style="text-align: right;"><strong>Status:</strong> ${project.status}</td>
            </tr>
            <tr>
              <td><strong>Start Date:</strong> ${formatShortDate(project.startDate)}</td>
              <td style="text-align: right;"><strong>Report Date:</strong> ${formatShortDate(new Date().toISOString())}</td>
            </tr>
          </table>
        </div>

        ${projectPayments.length > 0 ? `
          <div class="section-title">Payments Received</div>
          <table>
            <thead>
              <tr>
                <th style="width:5%">#</th>
                <th style="width:40%">Type</th>
                <th style="width:25%">Amount</th>
                <th style="width:15%">Date</th>
                <th style="width:15%">Notes</th>
              </tr>
            </thead>
            <tbody>
              ${projectPayments.map((p, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${p.paymentType}</td>
                  <td>${formatCurrency(p.amount)}</td>
                  <td>${formatShortDate(p.paymentDate)}</td>
                  <td>${p.notes || '-'}</td>
                </tr>
              `).join('')}
              <tr style="background:#f1f5f9; font-weight:bold;">
                <td colspan="2" style="text-align:right;">Total Payments:</td>
                <td colspan="3">${formatCurrency(totalPayments)}</td>
              </tr>
            </tbody>
          </table>
        ` : ''}

        <div class="section-title">Project Progress</div>
        <div class="summary">
          <div class="summary-row"><span>Project Amount:</span><span>${formatCurrency(dueAmount)}</span></div>
          <div class="summary-row"><span>Total Payments Received:</span><span>${formatCurrency(totalPayments)}</span></div>
          <div class="summary-row"><span>Progress:</span><span>${progressPercent.toFixed(2)}%</span></div>
        </div>

        ${projectExpenses.length > 0 ? `
          <div class="section-title">Other Expenses</div>
          <table>
            <thead>
              <tr>
                <th style="width:5%">#</th>
                <th style="width:35%">Title</th>
                <th style="width:20%">Amount</th>
                <th style="width:15%">Date</th>
                <th style="width:15%">Payment Mode</th>
              </tr>
            </thead>
            <tbody>
              ${projectExpenses.map((e, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${e.title}</td>
                  <td>${formatCurrency(e.amount)}</td>
                  <td>${formatShortDate(e.expenseDate)}</td>
                  <td>${e.paymentMode || '-'}</td>
                </tr>
              `).join('')}
              <tr style="background:#f1f5f9; font-weight:bold;">
                <td colspan="2" style="text-align:right;">Total Expenses:</td>
                <td colspan="3">${formatCurrency(totalExpenses)}</td>
              </tr>
            </tbody>
          </table>
        ` : ''}

        <div class="summary">
          <div class="summary-row"><span>Total Payments Received:</span><span>${formatCurrency(totalPayments)}</span></div>
          <div class="summary-row"><span>Total Expenses:</span><span>${formatCurrency(totalExpenses)}</span></div>
          <div class="summary-row total ${profitLoss >= 0 ? 'profit' : 'loss'}"><span>${profitLoss >= 0 ? 'Profit' : 'Loss'}:</span><span>${formatCurrency(Math.abs(profitLoss))}</span></div>
        </div>

        <div class="footer">
          <p>This is a computer-generated report from Artistic Engineers</p>
          <p>Generated on ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}</p>
        </div>
        <script>
          window.onload = () => { window.print(); setTimeout(() => window.close(), 300); };
        </script>
      </body>
      </html>`;

    w.document.write(html);
    w.document.close();
    w.focus();
  };

  const getFilteredExpenses = () => {
    const now = new Date();
    let filtered = [...projectExpenses];

    // Date filtering
    switch (dateFilter) {
      case 'today':
        filtered = filtered.filter((e) => new Date(e.expenseDate).toDateString() === now.toDateString());
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
      default:
        break;
    }

    // Payment status filtering
    if (paymentStatusFilter !== 'all') {
      filtered = filtered.filter((expense) => {
        const expensePaid = getExpensePaidAmount(expense.id, expense.amount, (expense as any).paymentStatus);
        const status = getPaymentStatus(expense.amount, expensePaid);
        return status === paymentStatusFilter;
      });
    }

    return filtered.sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
  };

  const filteredExpenses = getFilteredExpenses();

  const canAccountantRecord = (currentUser?.role === 'accountant') && hasPermission('payments', 'create');
  const canRecordPayment = ['admin', 'accountant'].includes(currentUser?.role || '');

  const isDuplicate = projectPayments.some(
    (p) =>
      p.amount === entryAmount &&
      p.paymentDate === entryDate &&
      (entryReference ? p.referenceNumber === entryReference : true)
  );

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent duplicate submissions
    if (isSubmittingPayment) return;
    if (!canAccountantRecord) return;

    if (!entryAmount || entryAmount <= 0) {
      addNotification('Enter a valid payment amount.');
      return;
    }
    if (!entryDate) {
      addNotification('Select payment date.');
      return;
    }
    if (isDuplicate) {
      addNotification('Possible duplicate payment detected.');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      await addPayment({
        projectId: project.id,
        amount: entryAmount,
        paymentDate: entryDate,
        paymentType: 'Installment',
        paymentMode: entryMethod,
        referenceNumber: entryReference || undefined,
        notes: entryNotes || undefined,
      });
      setEntryAmount(0);
      setEntryDate(new Date().toISOString().split('T')[0]);
      setEntryMethod('Cash');
      setEntryReference('');
      setEntryNotes('');
      addNotification('Payment recorded successfully.');
    } catch (error) {
      console.error('Error recording payment:', error);
      addNotification('Failed to record payment. Please try again.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };



  return (
    <div className="space-y-6 pb-20 p-[15px] sm:p-0">
      {/* Header */}
      <div className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 inline-flex items-center gap-2 transition-transform active:scale-95 shadow-sm shadow-slate-200">
            <ArrowLeft className="w-4 h-4" /> <span className="hidden md:inline font-medium">Back to Projects</span>
          </button>
        </div>
        <button onClick={handleGeneratePDF} className="inline-flex items-center px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-transform active:scale-95 shadow-sm shadow-slate-200" aria-label="Generate project report">
          <FileText className="w-4 h-4 md:mr-2" /> <span className="hidden md:inline font-medium">Generate PDF</span>
        </button>
      </div>

      {/* Hero Section */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden relative">
        <div className="p-5 md:p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center relative z-10">

          {/* Project Identity */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-start justify-between">
              <div className="flex gap-4 md:gap-6">
                {/* Avatar / Icon Placeholder */}
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-slate-900 text-white flex-shrink-0 flex items-center justify-center text-xl md:text-2xl font-bold shadow-xl shadow-slate-200 uppercase">
                  {project.clientName.slice(0, 2)}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3 mb-1.5">
                    <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight truncate max-w-full">{project.projectName}</h2>
                    <span
                      className={`inline-flex px-2.5 py-0.5 text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-full border ${project.status === 'Ongoing'
                        ? 'bg-blue-50 text-blue-700 border-blue-100'
                        : project.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}
                    >
                      {project.status}
                    </span>
                  </div>
                  <p className="text-base md:text-lg text-slate-500 font-medium truncate">{project.clientName} • {project.projectType}</p>
                </div>
              </div>
            </div>

            {/* Compact Details Chips - Scrollable on mobile */}
            <div className="flex overflow-x-auto pb-2 md:pb-0 gap-3 md:gap-4 no-scrollbar -mx-5 px-5 md:mx-0 md:px-0">
              <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 min-w-[160px]">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-slate-100 shadow-sm">
                  <Calendar className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">Timeline</span>
                  <span className="text-xs md:text-sm font-bold text-slate-700 block mt-0.5">
                    {formatShortDate(project.startDate)}
                    {project.deadline ? ` → ${formatShortDate(project.deadline)}` : ''}
                  </span>
                </div>
              </div>

              <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 min-w-[140px]">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-slate-100 shadow-sm">
                  <Banknote className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">Advance</span>
                  <span className="text-xs md:text-sm font-bold text-slate-700 block mt-0.5">{formatCurrency(project.advancePayment)}</span>
                </div>
              </div>

              <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 min-w-[150px]">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-slate-100 shadow-sm">
                  <Phone className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wide">Contact</span>
                  <span className="text-xs md:text-sm font-bold text-slate-700 block mt-0.5">{project.clientContact}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Progress Circle (Hero) - Centered on mobile */}
          <div className="lg:border-l lg:border-slate-100 lg:pl-8 flex flex-col items-center justify-center pt-4 lg:pt-0 border-t border-slate-100 lg:border-t-0 mt-2 lg:mt-0">
            <div className="w-32 h-32 md:w-40 md:h-40 relative">
              <Doughnut data={completionData} options={completionOptions} />
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl md:text-3xl font-extrabold text-slate-800">
                  {Math.round(taskMetrics.completionPercentage || 0)}%
                </span>
                <span className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wide mt-1">Complete</span>
              </div>
            </div>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-4 text-center bg-slate-50 px-3 py-1 rounded-full">
              {taskMetrics.completedTasks} of {taskMetrics.totalTasks} tasks done
            </p>
          </div>

        </div>
      </div>

      {/* Financial Stats Cards - Standardized Height */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group min-h-[140px] flex flex-col justify-center">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
            <Building2 className="w-24 h-24 text-slate-900" />
          </div>
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mb-3 border border-slate-100 shadow-sm">
              <Building2 className="w-5 h-5 text-slate-600" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Total Purchases</p>
            <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">{formatCurrency(totalPurchases)}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group min-h-[140px] flex flex-col justify-center">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
            <Banknote className="w-24 h-24 text-emerald-600" />
          </div>
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3 border border-emerald-100 shadow-sm">
              <Banknote className="w-5 h-5 text-emerald-600" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Total Paid</p>
            <div className="flex items-baseline gap-3">
              <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">{formatCurrency(totalPaid)}</h3>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                {totalPurchases > 0 ? Math.round((totalPaid / totalPurchases) * 100) : 0}% Paid
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm relative overflow-hidden group min-h-[140px] flex flex-col justify-center">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110 duration-500">
            <CreditCard className="w-24 h-24 text-rose-600" />
          </div>
          <div className="relative z-10">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center mb-3 border border-rose-100 shadow-sm">
              <CreditCard className="w-5 h-5 text-rose-600" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Outstanding</p>
            <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">{formatCurrency(outstanding)}</h3>
          </div>
        </div>
      </div>



      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 min-w-fit">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Filters:</span>
          </div>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilter)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none cursor-pointer hover:border-slate-300 transition-colors"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="6months">Last 6 Months</option>
            <option value="year">This Year</option>
          </select>

          <select
            value={paymentStatusFilter}
            onChange={(e) => setPaymentStatusFilter(e.target.value as PaymentStatusFilter)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none cursor-pointer hover:border-slate-300 transition-colors"
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {canAccountantRecord && (
            <button
              onClick={() => document.getElementById('payment-form')?.scrollIntoView({ behavior: 'smooth' })} // Simple scroll to form
              className="hidden md:inline-flex items-center px-4 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Record Payment
            </button>
          )}
        </div>
      </div>

      {/* Accountant Payment Entry */}
      {canAccountantRecord && (
        <div id="payment-form" className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Record New Payment
            </h3>
            <div className="text-sm text-slate-600">Outstanding: <span className="font-bold text-rose-600 font-mono">{formatCurrency(outstanding)}</span></div>
          </div>
          <form className="p-6 space-y-5" onSubmit={handleRecordPayment}>
            {/* Same form content but slightly styled... keeping logic same */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Amount (₹)</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={entryAmount}
                  onChange={(e) => setEntryAmount(Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all font-medium text-slate-900"
                  placeholder="0"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Date</label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-slate-700"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Method</label>
                <select
                  value={entryMethod}
                  onChange={(e) => setEntryMethod(e.target.value as any)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-slate-700"
                >
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="UPI">UPI</option>
                  <option value="Banking">Bank Transfer</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Reference</label>
                <input
                  type="text"
                  value={entryReference}
                  onChange={(e) => setEntryReference(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-slate-700 placeholder:text-slate-400"
                  placeholder="Txn ID / Check #"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Notes</label>
              <textarea
                value={entryNotes}
                onChange={(e) => setEntryNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none transition-all text-slate-700 placeholder:text-slate-400"
                placeholder="Description or remarks (optional)"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs font-medium text-slate-400">
                {isDuplicate ? <span className="text-amber-600 flex items-center gap-1"><Filter className="w-3 h-3" /> Potential duplicate detected</span> : 'Linked to project automatically'}
              </div>
              <button
                type="submit"
                disabled={isSubmittingPayment}
                className="w-full px-4 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingPayment ? 'Recording Payment...' : 'Record Payment'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Full-size Image Viewer Modal (Unchanged logic) */}
      {selectedFullImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="relative max-w-full max-h-full">
            <button
              onClick={() => setSelectedFullImage(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors backdrop-blur-md"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={`${API_BASE}${selectedFullImage.startsWith('/') ? selectedFullImage : `/${selectedFullImage}`}`}
              alt="Full size receipt"
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onClick={() => setSelectedFullImage(null)}
            />
          </div>
        </div>
      )}

      {/* Purchase History */}
      <div className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden min-h-[400px]`}>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-900">Purchase History</h3>
          <span className="text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
            {filteredExpenses.length} Records
          </span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="px-6 py-20 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
              <Building2 className="w-10 h-10 text-slate-300" />
            </div>
            <h4 className="text-lg font-semibold text-slate-900 mb-2">No purchases found</h4>
            <p className="text-slate-500 max-w-xs mx-auto">
              There are no expenses recorded for this project yet, or they don't match your current filters.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block w-full overflow-x-auto">
              <table className="w-full min-w-[1000px] border-collapse border border-slate-200">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200">Description</th>
                    <th className="px-6 py-4 text-left text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200">Supplier</th>
                    <th className="px-6 py-4 text-center text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200">Added By</th>
                    <th className="px-6 py-4 text-right text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200">Amount</th>
                    <th className="px-6 py-4 text-right text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200">Paid</th>
                    <th className="px-6 py-4 text-right text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200">Balance</th>
                    <th className="px-6 py-4 text-center text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200">Status</th>
                    <th className="px-6 py-4 text-center text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200">Receipt</th>
                    {canRecordPayment && (
                      <th className="px-6 py-4 text-right text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider border-r border-slate-200">Actions</th>
                    )}
                    <th className="px-6 py-4 text-center text-[10px] md:text-xs font-bold text-slate-500 uppercase tracking-wider">Expand</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredExpenses.map((expense) => {
                    const paid = getExpensePaidAmount(expense.id, expense.amount, (expense as any).paymentStatus);
                    const balance = expense.amount - paid;
                    const status = getPaymentStatus(expense.amount, paid);

                    return (
                      <Fragment key={expense.id}>
                        <tr key={expense.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="px-6 py-4 border-r border-slate-200">
                            <div>
                              <p className="font-semibold text-slate-900 line-clamp-1 text-xs md:text-base" title={expense.title}>{expense.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[10px] md:text-xs text-slate-500">{formatShortDate(expense.expenseDate)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 border-r border-slate-200">
                            {(() => {
                              // Check if it's a team expense
                              if (expense.teamMemberId) {
                                const teamMember = teams.find((t) => t.id === expense.teamMemberId);
                                if (teamMember) {
                                  return (
                                    <div className="flex items-center gap-2">
                                      {teamMember.photoUrl ? (
                                        <img
                                          src={teamMember.photoUrl}
                                          alt={teamMember.fullName || teamMember.name}
                                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                                          title={teamMember.fullName || teamMember.name}
                                        />
                                      ) : (
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                          <User className="w-4 h-4 text-slate-400" />
                                        </div>
                                      )}
                                      <span className="text-[10px] md:text-sm text-slate-700 font-medium">
                                        {teamMember.fullName || teamMember.name}
                                      </span>
                                    </div>
                                  );
                                }
                              }
                              // Otherwise show supplier name or dash
                              return (
                                <span className="text-[10px] md:text-sm text-slate-600">
                                  {getSupplierName(expense)}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4 text-center border-r border-slate-200">
                            {(() => {
                              const user = getUser(expense.addedBy);
                              if (user?.photoUrl) {
                                return (
                                  <img
                                    src={user.photoUrl}
                                    alt={user.fullName}
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200 mx-auto"
                                    title={user.fullName}
                                  />
                                );
                              }
                              if (user?.profilePicture) {
                                return (
                                  <img
                                    src={`${API_BASE}${user.profilePicture.startsWith('/') ? user.profilePicture : `/${user.profilePicture}`}`}
                                    alt={user.fullName}
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200 mx-auto"
                                    title={user.fullName}
                                  />
                                );
                              }
                              return (
                                <div
                                  className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 mx-auto"
                                  title={user?.fullName || 'Unknown User'}
                                >
                                  <User className="w-4 h-4 text-slate-400" />
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-slate-800 border-r border-slate-200 text-[10px] md:text-base">
                            {formatCurrency(expense.amount)}
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-green-600 border-r border-slate-200 text-[10px] md:text-base">
                            {formatCurrency(paid)}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-amber-600 border-r border-slate-200">
                            {formatCurrency(balance)}
                          </td>
                          <td className="px-6 py-4 text-center border-r border-slate-200">
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
                          <td className="px-6 py-4 text-center border-r border-slate-200">
                            {expense.receiptUrl ? (
                              <button
                                onClick={() => setSelectedFullImage(expense.receiptUrl!)}
                                className="inline-flex items-center text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                              >
                                <ImageIcon className="w-4 h-4 mr-1" />
                                View
                              </button>
                            ) : (
                              <span className="text-xs text-slate-400 italic">No receipt</span>
                            )}
                          </td>
                          {canRecordPayment && (
                            <td className="px-6 py-4 text-right border-r border-slate-200">
                              <button
                                onClick={() => {
                                  setSelectedExpenseForPayment(expense.id);
                                  // setSelectedExpenseImages(expense.receiptUrl ? [expense.receiptUrl] : []); // Removed to fix double modal
                                  setIsPaymentModalOpen(true);
                                }}
                                disabled={status === 'paid'}
                                className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ml-auto ${status === 'paid'
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                  }`}
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                Pay
                              </button>
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
                        {
                          expandedRows.has(expense.id) && (
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
                                      {supplierPayments.filter(p => p.expenseId === expense.id).length > 0 && (
                                        <span className="text-xs text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200">
                                          {supplierPayments.filter(p => p.expenseId === expense.id).length} payment{supplierPayments.filter(p => p.expenseId === expense.id).length !== 1 ? 's' : ''}
                                        </span>
                                      )}
                                    </div>

                                    {supplierPayments.filter(p => p.expenseId === expense.id).length === 0 ? (
                                      <div className="text-center py-8 text-slate-500 text-sm bg-white rounded-lg border border-slate-200">
                                        No payments recorded yet
                                      </div>
                                    ) : (
                                      <div className="space-y-3">
                                        {(() => {
                                          // Sort payments by date (oldest first)
                                          const sortedPayments = supplierPayments
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
                                                      {formatShortDate(paymentData.paymentDate)}
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
                          )
                        }
                      </Fragment >
                    );
                  })}
                </tbody >
              </table >
            </div >

            {/* Mobile View - Cards List */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredExpenses.map((expense) => {
                const paid = getExpensePaidAmount(expense.id, expense.amount, (expense as any).paymentStatus);
                const status = getPaymentStatus(expense.amount, paid);
                const user = getUser(expense.addedBy);

                return (
                  <div key={`mob-${expense.id}`} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h4 className="font-bold text-slate-900 line-clamp-2 text-sm max-w-[200px]">{expense.title}</h4>
                        <div className="flex items-center gap-1.5 mt-1 text-slate-500">
                          <Building2 className="w-3 h-3" />
                          {(() => {
                            // Check if it's a team expense
                            if (expense.teamMemberId) {
                              const teamMember = teams.find((t) => t.id === expense.teamMemberId);
                              if (teamMember) {
                                return (
                                  <div className="flex items-center gap-1.5">
                                    {teamMember.photoUrl ? (
                                      <img
                                        src={teamMember.photoUrl}
                                        alt={teamMember.fullName || teamMember.name}
                                        className="w-4 h-4 rounded-full object-cover border border-slate-200"
                                      />
                                    ) : (
                                      <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                        <User className="w-2 h-2 text-slate-400" />
                                      </div>
                                    )}
                                    <span className="text-xs truncate max-w-[150px]">
                                      {teamMember.fullName || teamMember.name}
                                    </span>
                                  </div>
                                );
                              }
                            }
                            // Otherwise show supplier name
                            return (
                              <span className="text-xs truncate max-w-[150px]">
                                {getSupplierName(expense)}
                              </span>
                            );
                          })()}
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
                        {canRecordPayment && (
                          <button
                            onClick={() => {
                              setSelectedExpenseForPayment(expense.id);
                              setIsPaymentModalOpen(true);
                            }}
                            disabled={status === 'paid'}
                            className={`w-8 h-8 flex items-center justify-center rounded-full shadow-sm border ${status === 'paid' ? 'bg-slate-50 border-slate-100 text-slate-300' : 'bg-slate-900 border-slate-900 text-white'
                              }`}
                          >
                            <CreditCard className="w-4 h-4" />
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
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-slate-500 uppercase">Payment History</span>
                          <span className="text-xs font-medium text-emerald-600">Paid: {formatCurrency(paid)}</span>
                        </div>
                        {supplierPayments.filter(p => p.expenseId === expense.id).length === 0 ? (
                          <p className="text-xs text-slate-400 italic text-center py-2">No payments yet</p>
                        ) : (
                          <div className="space-y-2">
                            {supplierPayments.filter(p => p.expenseId === expense.id).map(p => (
                              <div key={p.id} className="flex justify-between items-center bg-white p-2 rounded border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-2">
                                  <div className="p-1 rounded bg-slate-100">
                                    {getPaymentMethodIcon(p.paymentMode)}
                                  </div>
                                  <div>
                                    <div className="text-xs font-bold text-slate-700">{formatCurrency(p.amount)}</div>
                                    <div className="text-[10px] text-slate-400">{formatShortDate(p.paymentDate)}</div>
                                  </div>
                                </div>
                                <span className="text-[10px] font-medium text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded">
                                  {p.paymentType}
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

            {/* Mobile View Removed as per request to keep only table */}

          </>
        )}
      </div>

      {/* Supplier Payment Modal */}
      {
        isPaymentModalOpen && selectedExpenseForPayment && (
          <SupplierPaymentModal
            supplierId={filteredExpenses.find((e) => e.id === selectedExpenseForPayment)?.supplierId || ''}
            expenseId={selectedExpenseForPayment}
            onClose={() => {
              setIsPaymentModalOpen(false);
              setSelectedExpenseForPayment(null);
            }}
          />
        )
      }

      {/* Receipt Image Viewer */}
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
    </div >
  );
}