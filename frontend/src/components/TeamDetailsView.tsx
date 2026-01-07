import { useState, useMemo, Fragment, useEffect } from 'react';
import {
    ArrowLeft,
    Phone,
    Building2,
    TrendingUp,
    Plus,
    Filter,
    AlertTriangle,
    ChevronDown,
    Banknote,
    Smartphone,
    Building,
    CreditCard,
    FileText,
    User,
    Trash2
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/formatters';
import { formatLongDate, formatShortDate } from '../utils/dates';
import AddWorkModal from './AddWorkModal';
import AddTeamPaymentModal from './AddTeamPaymentModal';
import AddTeamMemberModal from './AddTeamMemberModal';
import ConfirmDeleteModal from './ConfirmDeleteModal';


interface TeamDetailsViewProps {
    memberId: string;
    onBack: () => void;
}

type DateFilter = 'today' | 'week' | 'month' | '6months' | 'year' | 'all';
type PaymentStatusFilter = 'all' | 'paid' | 'partial' | 'pending';

export default function TeamDetailsView({ memberId, onBack }: TeamDetailsViewProps) {
    const { teams, teamWork, teamPayments, projects, expenses, deleteTeamWork, deleteTeamPayment, deleteTeamMember, deleteExpense, hasPermission, currentUser } = useApp();
    const [isAddWorkOpen, setIsAddWorkOpen] = useState(false);
    const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
    const [isEditMemberOpen, setIsEditMemberOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ type: 'work' | 'payment' | 'member', id: string } | null>(null);

    const [dateFilter, setDateFilter] = useState<DateFilter>('all');
    const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatusFilter>('all');
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [selectedWorkIdForPayment, setSelectedWorkIdForPayment] = useState<string | null>(null);

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [memberId]);

    const member = teams.find(m => m.id === memberId);

    if (!member) {
        return (
            <div className="p-6 text-center">
                <div className="mb-4 text-slate-500">Team member not found or deleted.</div>
                <button
                    onClick={onBack}
                    className="inline-flex items-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back to List
                </button>
            </div>
        );
    }

    const canEdit = hasPermission('teams', 'update');
    const canDelete = hasPermission('teams', 'delete');
    const canRecordPayment = ['admin', 'accountant'].includes(currentUser?.role || '');

    // Get all work entries for this member - filter out deleted work AND work from deleted projects
    const dbWork = teamWork.filter(w => {
        if (w.deleted) return false;
        if (w.teamMemberId !== memberId) return false;
        if (w.projectId) {
            const project = projects.find(p => p.id === w.projectId);
            if (!project || project.deleted) return false;
        }
        return true;
    });

    // Get all expenses for this member - filter out deleted expenses AND expenses from deleted projects
    const teamExpenses = expenses.filter(e => {
        if (e.deleted) return false;
        if (e.teamMemberId !== memberId) return false;
        if (e.projectId) {
            const project = projects.find(p => p.id === e.projectId);
            if (!project || project.deleted) return false;
        }
        return true;
    });

    // Merge into unified work list
    const myWork = [
        ...dbWork.map(w => ({ ...w, type: 'work' as const })),
        ...teamExpenses.map(e => ({
            id: e.id,
            teamMemberId: e.teamMemberId!,
            projectId: e.projectId,
            workDate: e.expenseDate,
            taskName: e.title,
            quantity: 1,
            rate: e.amount,
            amount: e.amount,
            paymentStatus: e.paymentStatus || 'Pending',
            notes: e.notes,
            createdAt: e.createdAt,
            type: 'expense' as const
        }))
    ];

    // Get valid work IDs (from active projects)
    const validWorkIds = new Set(myWork.map(w => w.id));

    // Get all payments for this member - filter out payments linked to deleted project work
    const myPayments = teamPayments.filter(p => {
        if (p.deleted) return false;
        if (p.teamMemberId !== memberId) return false;

        // If payment has linked work entries, check if any are still valid
        if (p.workEntryIds && Array.isArray(p.workEntryIds) && p.workEntryIds.length > 0) {
            // Only include payment if at least one of its work entries is still valid
            const hasValidWork = p.workEntryIds.some((workId: string) => validWorkIds.has(workId));
            if (!hasValidWork) return false;
        }

        return true;
    });

    const getWorkPaidAmount = (workId: string, workAmount: number, workStatus?: string) => {
        if (workStatus === 'Paid') return workAmount;
        // Sum payments that specifically link to this work ID
        // Note: The original types defined workEntryIds on TeamPayment
        return myPayments
            .filter(p => p.workEntryIds?.includes(workId))
            .reduce((sum, p) => sum + p.amount, 0);
    };

    const getPaymentStatus = (amount: number, paid: number): 'paid' | 'partial' | 'pending' => {
        if (paid === 0) return 'pending';
        if (paid >= amount) return 'paid';
        return 'partial';
    };

    const getFilteredWork = () => {
        const now = new Date();
        let filtered = [...myWork];

        switch (dateFilter) {
            case 'today':
                filtered = filtered.filter(w => new Date(w.workDate).toDateString() === now.toDateString());
                break;
            case 'week':
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                filtered = filtered.filter(w => new Date(w.workDate) >= weekAgo);
                break;
            case 'month':
                const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                filtered = filtered.filter(w => new Date(w.workDate) >= monthAgo);
                break;
            case '6months':
                const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
                filtered = filtered.filter(w => new Date(w.workDate) >= sixMonthsAgo);
                break;
            case 'year':
                const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
                filtered = filtered.filter(w => new Date(w.workDate) >= yearAgo);
                break;
        }

        if (paymentStatusFilter !== 'all') {
            filtered = filtered.filter(work => {
                const paid = getWorkPaidAmount(work.id, work.amount, work.paymentStatus);
                const status = getPaymentStatus(work.amount, paid);
                return status === paymentStatusFilter;
            });
        }

        return filtered.sort((a, b) => new Date(b.workDate).getTime() - new Date(a.workDate).getTime());
    };

    const filteredWork = getFilteredWork();

    // Stats Calculation
    const stats = useMemo(() => {
        const totalWorkValue = filteredWork.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

        // Calculate Total Paid
        const allPaymentsSum = myPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const allWorkSum = myWork.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

        // Calculate paid portion of expenses (since they don't have separate payment records)
        const paidExpensesSum = myWork
            .filter(w => (w as any).type === 'expense' && w.paymentStatus === 'Paid')
            .reduce((sum, w) => sum + (Number(w.amount) || 0), 0);

        const globalPaid = allPaymentsSum + paidExpensesSum;
        const globalOutstanding = allWorkSum - globalPaid;

        return {
            totalWork: totalWorkValue, // Contextual to filters
            totalPaid: globalPaid, // Global for the member
            outstanding: globalOutstanding, // Global
            workCount: filteredWork.length
        };
    }, [filteredWork, myWork, myPayments]);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    const paginatedWork = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredWork.slice(start, start + itemsPerPage);
    }, [filteredWork, currentPage]);

    const totalPages = Math.ceil(filteredWork.length / itemsPerPage);

    const toggleRow = (workId: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(workId)) newExpanded.delete(workId);
        else newExpanded.add(workId);
        setExpandedRows(newExpanded);
    };

    const getPaymentMethodIcon = (method: string) => {
        switch (method?.toLowerCase()) {
            case 'cash': return <Banknote className="w-4 h-4" />;
            case 'upi': return <Smartphone className="w-4 h-4" />;
            case 'cheque': return <Building className="w-4 h-4" />;
            default: return <CreditCard className="w-4 h-4" />;
        }
    };



    const handleRecordPayment = (workId: string) => {
        setSelectedWorkIdForPayment(workId);
        setIsAddPaymentOpen(true);
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            if (confirmDelete.type === 'work') {
                // Check if it's an expense or real work
                const item = myWork.find(w => w.id === confirmDelete.id);
                if (item && item.type === 'expense') {
                    await deleteExpense(confirmDelete.id);
                } else {
                    await deleteTeamWork(confirmDelete.id);
                }
            }
            else if (confirmDelete.type === 'payment') await deleteTeamPayment(confirmDelete.id);
            else if (confirmDelete.type === 'member') {
                await deleteTeamMember(confirmDelete.id);
                onBack(); // Go back after deleting member
            }
        } catch (err) {
            console.error("Delete failed", err);
        } finally {
            setConfirmDelete(null);
        }
    };

    // Format Date - Unused but keeping helper if needed, else delete. Lint says unused.
    // const fmtDate = (dateString: string) => formatLongDate(dateString);

    return (
        <div className="space-y-6 pb-20 p-[15px] sm:p-0">
            {/* Header */}
            <div className="flex flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={onBack}
                        className="px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 inline-flex items-center gap-2 transition-transform active:scale-95 shadow-sm shadow-slate-200"
                    >
                        <ArrowLeft className="w-4 h-4" /> <span className="hidden md:inline font-medium">Back</span>
                    </button>
                </div>
                <div className="flex-1 text-center md:text-left px-2">
                    <h2 className="text-xl md:text-2xl font-bold text-slate-800 truncate">{member.name}</h2>
                    <p className="text-xs md:text-sm text-slate-600 truncate hidden md:block">
                        {member.employmentStatus} • {member.contact}
                    </p>
                </div>
                <div className="flex gap-2">
                    {canEdit && (
                        <button
                            onClick={() => setIsEditMemberOpen(true)}
                            className="inline-flex items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-transform active:scale-95 shadow-sm"
                        >
                            <span className="hidden md:inline font-medium">Edit Profile</span>
                            <span className="md:hidden">Edit</span>
                        </button>
                    )}
                    {/* Add Work Button */}
                    <button
                        onClick={() => setIsAddWorkOpen(true)}
                        className="inline-flex items-center px-4 py-2.5 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-transform active:scale-95 shadow-sm shadow-slate-200"
                    >
                        <Plus className="w-4 h-4 md:mr-2" />
                        <span className="hidden md:inline font-medium">Add Work</span>
                    </button>
                </div>
            </div>

            {/* Team Member Info Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 md:p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                    <User className="w-32 h-32 text-slate-900" />
                </div>
                <h3 className="font-bold text-slate-800 mb-4 relative z-10">Team Member Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 flex-shrink-0">
                            <Phone className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">Contact</p>
                            <p className="font-semibold text-slate-800">{member.contact || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 flex-shrink-0">
                            <Building2 className="w-4 h-4 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">Employment Type</p>
                            <p className="font-semibold text-slate-800">{member.employmentStatus || 'Unknown'}</p>
                        </div>
                    </div>
                    {member.skills && member.skills.length > 0 && (
                        <div className="flex items-start gap-3 col-span-1 md:col-span-2">
                            <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 flex-shrink-0">
                                <FileText className="w-4 h-4 text-slate-500" />
                            </div>
                            <div>
                                <p className="text-xs text-slate-400 uppercase font-bold tracking-wide">Skills</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {member.skills.map((s: string) => (
                                        <span key={s} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md font-medium">
                                            {s}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
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
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Total Work Value</p>
                        <p className="text-2xl font-extrabold text-slate-900 truncate tracking-tight">
                            {formatCurrency(stats.totalWork)}
                        </p>
                        <p className="text-[10px] uppercase font-bold text-slate-400 mt-1 bg-slate-50 inline-block px-1.5 py-0.5 rounded border border-slate-100">
                            {stats.workCount} entries
                        </p>
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
                        <button
                            onClick={() => { setSelectedWorkIdForPayment(null); setIsAddPaymentOpen(true); }}
                            className="mt-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded inline-flex items-center hover:bg-emerald-100 transition-colors"
                        >
                            <Plus className="w-3 h-3 mr-1" /> Add Payment
                        </button>
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
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-0.5">Pending Amount</p>
                        <p className="text-2xl font-extrabold text-slate-900 truncate tracking-tight">
                            {formatCurrency(stats.outstanding)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filters */}
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
                            onChange={(e) => setPaymentStatusFilter(e.target.value as PaymentStatusFilter)}
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

            {/* Work History Table */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="p-4 sm:p-6 border-b border-slate-200">
                    <h3 className="font-semibold text-slate-800">Work History</h3>
                </div>

                {filteredWork.length === 0 ? (
                    <div className="px-6 py-12 text-center text-slate-500">
                        No work entries found for the selected filters.
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden md:block overflow-x-auto">
                            <table className="w-full min-w-[1000px] border border-slate-200 rounded-lg">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Description</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">Paid</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-600 uppercase tracking-wider">Balance</th>
                                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">Status</th>
                                        {canRecordPayment && (
                                            <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">Updates</th>
                                        )}
                                        <th className="px-6 py-3 text-center text-xs font-medium text-slate-600 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200">
                                    {paginatedWork.map(work => {
                                        const paid = getWorkPaidAmount(work.id, work.amount, work.paymentStatus);
                                        const balance = work.amount - paid;
                                        const status = getPaymentStatus(work.amount, paid);

                                        return (
                                            <Fragment key={work.id}>
                                                <tr className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 text-sm text-slate-800">{formatShortDate(work.workDate)}</td>
                                                    <td className="px-6 py-4 text-sm">
                                                        <div className="text-slate-800 font-medium">{work.taskName}</div>
                                                        {work.notes && <div className="text-xs text-slate-500">{work.notes}</div>}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-semibold text-slate-800">{formatCurrency(work.amount)}</td>
                                                    <td className="px-6 py-4 text-right font-semibold text-green-600">{formatCurrency(paid)}</td>
                                                    <td className="px-6 py-4 text-right font-semibold text-amber-600">{formatCurrency(balance)}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${status === 'paid' ? 'bg-green-100 text-green-700' :
                                                            status === 'partial' ? 'bg-amber-100 text-amber-700' :
                                                                'bg-red-100 text-red-700'
                                                            }`}>
                                                            {status === 'paid' ? 'Paid' : status === 'partial' ? 'Partial' : 'Pending'}
                                                        </span>
                                                    </td>
                                                    {canRecordPayment && (
                                                        <td className="px-6 py-4 text-center">
                                                            {balance > 0 && (
                                                                <button
                                                                    onClick={() => handleRecordPayment(work.id)}
                                                                    className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                                                                >
                                                                    <Plus className="w-3 h-3" /> Pay
                                                                </button>
                                                            )}
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => toggleRow(work.id)}
                                                            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                                                            title="View Payment History"
                                                        >
                                                            <ChevronDown className={`w-4 h-4 transition-transform ${expandedRows.has(work.id) ? 'rotate-180' : ''}`} />
                                                        </button>
                                                        {canDelete && (
                                                            <button
                                                                onClick={() => setConfirmDelete({ type: 'work', id: work.id })}
                                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>

                                                {/* Expanded Payments Row */}
                                                {expandedRows.has(work.id) && (
                                                    <tr>
                                                        <td colSpan={canRecordPayment ? 9 : 8} className="px-0 py-0">
                                                            <div className="bg-slate-50 p-4 border-t border-slate-200">
                                                                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                                                    <ClockIcon /> Payment History
                                                                </h4>

                                                                {myPayments.filter(p => p.workEntryIds?.includes(work.id)).length === 0 ? (
                                                                    <p className="text-sm text-slate-500 italic">No specific payments recorded for this work.</p>
                                                                ) : (
                                                                    <div className="space-y-2">
                                                                        {myPayments
                                                                            .filter(p => p.workEntryIds?.includes(work.id))
                                                                            .map(payment => (
                                                                                <div key={payment.id} className="bg-white border border-slate-200 rounded-lg p-3 flex justify-between items-center">
                                                                                    <div className="flex items-center gap-3">
                                                                                        <div className="p-2 bg-slate-100 rounded-lg">
                                                                                            {getPaymentMethodIcon(payment.paymentMode)}
                                                                                        </div>
                                                                                        <div>
                                                                                            <p className="text-sm font-medium text-slate-900">{formatLongDate(payment.paymentDate)}</p>
                                                                                            <p className="text-xs text-slate-500">{payment.paymentMode}</p>
                                                                                        </div>
                                                                                    </div>
                                                                                    <div className="text-right">
                                                                                        <p className="text-sm font-bold text-green-600">{formatCurrency(payment.amount)}</p>
                                                                                        {canDelete && (
                                                                                            <button
                                                                                                onClick={() => setConfirmDelete({ type: 'payment', id: payment.id })}
                                                                                                className="text-[10px] text-red-500 hover:underline"
                                                                                            >
                                                                                                Delete
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            ))
                                                                        }
                                                                    </div>
                                                                )}
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

                        {/* Mobile List View */}
                        <div className="md:hidden divide-y divide-slate-100">
                            {paginatedWork.map(work => {
                                const paid = getWorkPaidAmount(work.id, work.amount, work.paymentStatus);
                                const balance = work.amount - paid;
                                const status = getPaymentStatus(work.amount, paid);

                                return (
                                    <div key={work.id} className="p-4 bg-white hover:bg-slate-50">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-bold text-slate-900">{work.taskName}</h4>
                                                <div className="text-xs text-slate-500 mt-1">{formatLongDate(work.workDate)}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-extrabold text-slate-900">{formatCurrency(work.amount)}</div>
                                                <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border mt-1 ${status === 'paid' ? 'bg-green-50 text-green-700 border-green-100' :
                                                    status === 'partial' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                        'bg-red-50 text-red-700 border-red-100'
                                                    }`}>
                                                    {status}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">

                                            <div className="flex gap-2">
                                                {canRecordPayment && balance > 0 && (
                                                    <button
                                                        onClick={() => handleRecordPayment(work.id)}
                                                        className="p-2 bg-slate-900 text-white rounded-full shadow-sm"
                                                    >
                                                        <Plus className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => toggleRow(work.id)}
                                                    className={`p-2 rounded-full border transition-colors ${expandedRows.has(work.id) ? 'bg-slate-200 border-slate-300' : 'bg-white border-slate-200'}`}
                                                >
                                                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedRows.has(work.id) ? 'rotate-180' : ''}`} />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Mobile Expanded */}
                                        {expandedRows.has(work.id) && (
                                            <div className="mt-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
                                                <div className="flex justify-between text-xs font-medium text-slate-500 mb-2 uppercase">
                                                    <span>Paid: <span className="text-green-600">{formatCurrency(paid)}</span></span>
                                                    <span>Balance: <span className="text-amber-600">{formatCurrency(balance)}</span></span>
                                                </div>
                                                {/* List payments... simplified for mobile */}
                                                <div className="space-y-2">
                                                    {myPayments.filter(p => p.workEntryIds?.includes(work.id)).map(p => (
                                                        <div key={p.id} className="bg-white p-2 rounded flex justify-between items-center text-xs">
                                                            <span>{formatShortDate(p.paymentDate)}</span>
                                                            <span className="font-bold text-green-600">{formatCurrency(p.amount)}</span>
                                                        </div>
                                                    ))}
                                                    {myPayments.filter(p => p.workEntryIds?.includes(work.id)).length === 0 && (
                                                        <div className="text-center text-xs text-slate-400 py-2">No linked payments</div>
                                                    )}
                                                </div>
                                                {canDelete && (
                                                    <button
                                                        onClick={() => setConfirmDelete({ type: 'work', id: work.id })}
                                                        className="w-full mt-3 py-2 text-red-600 text-xs font-medium border border-red-200 rounded-lg bg-white"
                                                    >
                                                        Delete Work Entry
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Pagination Controls */}
            {
                filteredWork.length > itemsPerPage && (
                    <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 sm:px-6 bg-white rounded-b-lg">
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
                                    Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredWork.length)}</span> of <span className="font-medium">{filteredWork.length}</span> results
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

                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(page => {
                                            return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                                        })
                                        .map((page, index, array) => {
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
                )
            }

            {isAddWorkOpen && <AddWorkModal onClose={() => setIsAddWorkOpen(false)} memberId={member.id} memberName={member.name} />}
            {isAddPaymentOpen && <AddTeamPaymentModal onClose={() => setIsAddPaymentOpen(false)} memberId={member.id} memberName={member.name} preselectedWorkId={selectedWorkIdForPayment} />}
            {isEditMemberOpen && <AddTeamMemberModal onClose={() => setIsEditMemberOpen(false)} member={member} />}

            {
                confirmDelete && (
                    <ConfirmDeleteModal
                        open={!!confirmDelete}
                        title={confirmDelete.type === 'member' ? "Delete Team Member" : confirmDelete.type === 'payment' ? "Delete Payment" : "Delete Work Entry"}
                        message={
                            confirmDelete.type === 'member'
                                ? `Do you really want to delete this team member?`
                                : `Are you sure you want to delete this ${confirmDelete.type}?`
                        }
                        detail={confirmDelete.type === 'member' ? member.name : undefined}
                        onCancel={() => setConfirmDelete(null)}
                        onConfirm={handleDelete}
                    />
                )
            }
        </div >
    );
}

function ClockIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
    );
}
