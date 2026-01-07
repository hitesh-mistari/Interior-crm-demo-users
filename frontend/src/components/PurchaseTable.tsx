import { useState, useMemo } from 'react';
import {
    ChevronDown,
    ChevronUp,
    Plus,
    Banknote,
    Smartphone,
    Building,
    CreditCard,
    Calendar,
    User,
    FileText,
} from 'lucide-react';
import PaymentItem from './PaymentItem';
import { formatCurrency } from '../utils/formatters';
import { formatLongDate } from '../utils/dates';

// Types matching your existing PERN stack structure
export interface Purchase {
    id: string;
    date: string;
    projectId: string;
    projectName: string;
    description: string;
    amount: number;
    paid: number;
    balance: number;
    status: 'paid' | 'partial' | 'pending';
    addedBy: string;
    notes?: string;
}

export interface PaymentHistory {
    id: string;
    purchaseId: string;
    paymentDate: string;
    amountPaid: number;
    method: 'Cash' | 'UPI' | 'Bank' | 'Cheque';
    addedBy: string;
    addedByName: string;
    prevBalance: number;
    newBalance: number;
    note?: string;
    status: 'completed' | 'pending' | 'failed';
}

interface PurchaseTableProps {
    purchases: Purchase[];
    onFetchPayments?: (purchaseId: string) => Promise<PaymentHistory[]>;
    onAddPayment?: (purchaseId: string) => void;
    canAddPayment?: boolean;
}

export default function PurchaseTable({
    purchases,
    onFetchPayments,
    onAddPayment,
    canAddPayment = true,
}: PurchaseTableProps) {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
    const [paymentData, setPaymentData] = useState<Record<string, PaymentHistory[]>>({});
    const [loadingPayments, setLoadingPayments] = useState<Set<string>>(new Set());

    const toggleRow = async (purchaseId: string) => {
        const newExpanded = new Set(expandedRows);

        if (newExpanded.has(purchaseId)) {
            newExpanded.delete(purchaseId);
        } else {
            newExpanded.add(purchaseId);

            // Fetch payments if not already loaded
            if (!paymentData[purchaseId] && onFetchPayments) {
                setLoadingPayments(new Set(loadingPayments).add(purchaseId));
                try {
                    const payments = await onFetchPayments(purchaseId);
                    setPaymentData({ ...paymentData, [purchaseId]: payments });
                } catch (error) {
                    console.error('Error fetching payments:', error);
                } finally {
                    const newLoading = new Set(loadingPayments);
                    newLoading.delete(purchaseId);
                    setLoadingPayments(newLoading);
                }
            }
        }

        setExpandedRows(newExpanded);
    };

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'paid':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'partial':
                return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'pending':
                return 'bg-red-100 text-red-700 border-red-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getPaymentMethodIcon = (method: string) => {
        switch (method.toLowerCase()) {
            case 'cash':
                return <Banknote className="w-4 h-4" />;
            case 'upi':
                return <Smartphone className="w-4 h-4" />;
            case 'bank':
            case 'banking':
                return <Building className="w-4 h-4" />;
            case 'cheque':
                return <FileText className="w-4 h-4" />;
            default:
                return <CreditCard className="w-4 h-4" />;
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
                <table className="w-full border-collapse border border-slate-200 rounded-lg">
                    <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border border-slate-200">
                                Date
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border border-slate-200">
                                Project
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border border-slate-200">
                                Description
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider border border-slate-200">
                                Amount
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider border border-slate-200">
                                Paid
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider border border-slate-200">
                                Balance
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider border border-slate-200">
                                Status
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider border border-slate-200">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {purchases.map((purchase) => {
                            const isExpanded = expandedRows.has(purchase.id);
                            const payments = paymentData[purchase.id] || [];
                            const isLoading = loadingPayments.has(purchase.id);

                            return (
                                <>
                                    {/* Parent Row */}
                                    <tr
                                        key={purchase.id}
                                        className="hover:bg-slate-50 transition-colors duration-150"
                                    >
                                        <td className="px-6 py-4 text-sm text-slate-800 whitespace-nowrap border border-slate-200">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-slate-400" />
                                                {formatLongDate(purchase.date)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900 border border-slate-200">
                                            {purchase.projectName}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-700 border border-slate-200">
                                            <div className="max-w-xs">
                                                <p className="font-medium">{purchase.description}</p>
                                                {purchase.notes && (
                                                    <p className="text-xs text-slate-500 mt-1 truncate">
                                                        {purchase.notes}
                                                    </p>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-slate-900 text-right border border-slate-200">
                                            {formatCurrency(purchase.amount)}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-green-600 text-right border border-slate-200">
                                            {formatCurrency(purchase.paid)}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-amber-600 text-right border border-slate-200">
                                            {formatCurrency(purchase.balance)}
                                        </td>
                                        <td className="px-6 py-4 text-center border border-slate-200">
                                            <span
                                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(
                                                    purchase.status
                                                )}`}
                                            >
                                                {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 border border-slate-200">
                                            <div className="flex items-center justify-center gap-2">
                                                {canAddPayment && purchase.balance > 0 && (
                                                    <button
                                                        onClick={() => onAddPayment?.(purchase.id)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg hover:bg-slate-700 transition-all duration-200 hover:shadow-md"
                                                    >
                                                        <Plus className="w-3.5 h-3.5" />
                                                        Add Payment
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => toggleRow(purchase.id)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-200 transition-all duration-200"
                                                >
                                                    {isExpanded ? (
                                                        <>
                                                            <ChevronUp className="w-3.5 h-3.5 transition-transform duration-300" />
                                                            Hide
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ChevronDown className="w-3.5 h-3.5 transition-transform duration-300" />
                                                            Show
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Expanded Payment History Row */}
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan={8} className="px-0 py-0 border-t border-slate-200">
                                                <div
                                                    className="overflow-hidden transition-all duration-500 ease-in-out"
                                                    style={{
                                                        maxHeight: isExpanded ? '1000px' : '0px',
                                                    }}
                                                >
                                                    <div className="bg-gradient-to-br from-slate-50 to-slate-100/50 px-6 py-6 border-t border-slate-200">
                                                        <div className="mb-4 flex items-center justify-between">
                                                            <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                                                <CreditCard className="w-4 h-4 text-slate-600" />
                                                                Payment History
                                                            </h4>
                                                            {payments.length > 0 && (
                                                                <span className="text-xs text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200">
                                                                    {payments.length} payment{payments.length !== 1 ? 's' : ''}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {isLoading ? (
                                                            <div className="flex items-center justify-center py-8">
                                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-800"></div>
                                                            </div>
                                                        ) : payments.length === 0 ? (
                                                            <div className="text-center py-8 text-slate-500 text-sm bg-white rounded-lg border border-slate-200">
                                                                No payments recorded yet
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-3">
                                                                {payments.map((payment, index) => (
                                                                    <PaymentItem
                                                                        key={payment.id}
                                                                        payment={payment}
                                                                        index={index}
                                                                        getPaymentMethodIcon={getPaymentMethodIcon}
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
                {purchases.map((purchase) => {
                    const isExpanded = expandedRows.has(purchase.id);
                    const payments = paymentData[purchase.id] || [];
                    const isLoading = loadingPayments.has(purchase.id);

                    return (
                        <div key={purchase.id} className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-colors">
                            {/* Mobile Purchase Card */}
                            <div className="space-y-3">
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-slate-900">{purchase.projectName}</h3>
                                        <p className="text-sm text-slate-600 mt-1">{purchase.description}</p>
                                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                            <Calendar className="w-3.5 h-3.5" />
                                            {formatLongDate(purchase.date)}
                                        </div>
                                    </div>
                                    <span
                                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(
                                            purchase.status
                                        )}`}
                                    >
                                        {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-200">
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Amount</p>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {formatCurrency(purchase.amount)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Paid</p>
                                        <p className="text-sm font-semibold text-green-600">
                                            {formatCurrency(purchase.paid)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500 mb-1">Balance</p>
                                        <p className="text-sm font-semibold text-amber-600">
                                            {formatCurrency(purchase.balance)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-2 pt-3">
                                    {canAddPayment && purchase.balance > 0 && (
                                        <button
                                            onClick={() => onAddPayment?.(purchase.id)}
                                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-all"
                                        >
                                            <Plus className="w-4 h-4" />
                                            Add Payment
                                        </button>
                                    )}
                                    <button
                                        onClick={() => toggleRow(purchase.id)}
                                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 transition-all"
                                    >
                                        {isExpanded ? (
                                            <>
                                                <ChevronUp className="w-4 h-4" />
                                                Hide Payments
                                            </>
                                        ) : (
                                            <>
                                                <ChevronDown className="w-4 h-4" />
                                                Show Payments
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Expanded Payment History */}
                            {isExpanded && (
                                <div
                                    className="overflow-hidden transition-all duration-500 ease-in-out"
                                    style={{
                                        maxHeight: isExpanded ? '1000px' : '0px',
                                    }}
                                >
                                    <div className="mt-4 pt-4 border-t border-slate-200">
                                        <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-slate-600" />
                                            Payment History
                                            {payments.length > 0 && (
                                                <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                                                    {payments.length}
                                                </span>
                                            )}
                                        </h4>

                                        {isLoading ? (
                                            <div className="flex items-center justify-center py-6">
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-800"></div>
                                            </div>
                                        ) : payments.length === 0 ? (
                                            <div className="text-center py-6 text-slate-500 text-sm bg-slate-50 rounded-lg border border-slate-200">
                                                No payments recorded yet
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {payments.map((payment, index) => (
                                                    <PaymentItem
                                                        key={payment.id}
                                                        payment={payment}
                                                        index={index}
                                                        getPaymentMethodIcon={getPaymentMethodIcon}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {purchases.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm">No purchases found</p>
                </div>
            )}
        </div>
    );
}
