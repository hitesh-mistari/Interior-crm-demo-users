therimport { Calendar, User, FileText, TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import { formatLongDate } from '../utils/dates';
import { PaymentHistory } from './PurchaseTable';

interface PaymentItemProps {
    payment: PaymentHistory;
    index: number;
    getPaymentMethodIcon: (method: string) => JSX.Element;
}

export default function PaymentItem({
    payment,
    index,
    getPaymentMethodIcon,
}: PaymentItemProps) {
    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-700 border-green-200';
            case 'pending':
                return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'failed':
                return 'bg-red-100 text-red-700 border-red-200';
            default:
                return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div
            className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-all duration-300 transform hover:-translate-y-0.5"
            style={{
                animation: `slideIn 0.3s ease-out ${index * 0.1}s both`,
            }}
        >
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Payment Date & Method */}
                <div className="flex items-center gap-3 lg:w-48">
                    <div className="p-2.5 bg-slate-100 rounded-lg">
                        {getPaymentMethodIcon(payment.method)}
                    </div>
                    <div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                            <Calendar className="w-3 h-3" />
                            {formatLongDate(payment.paymentDate)}
                        </div>
                        <p className="text-sm font-medium text-slate-900">{payment.method}</p>
                    </div>
                </div>

                {/* Amount Paid */}
                <div className="lg:w-32">
                    <p className="text-xs text-slate-500 mb-1">Amount Paid</p>
                    <p className="text-lg font-bold text-green-600">
                        {formatCurrency(payment.amountPaid)}
                    </p>
                </div>

                {/* Balance Changes */}
                <div className="flex-1 grid grid-cols-2 gap-4 lg:gap-6">
                    <div>
                        <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" />
                            Prev Balance
                        </p>
                        <p className="text-sm font-semibold text-slate-700">
                            {formatCurrency(payment.prevBalance)}
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 mb-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            New Balance
                        </p>
                        <p className="text-sm font-semibold text-amber-600">
                            {formatCurrency(payment.newBalance)}
                        </p>
                    </div>
                </div>

                {/* Added By & Status */}
                <div className="lg:w-48 flex items-center justify-between lg:justify-end gap-3">
                    <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-xs text-slate-600">{payment.addedByName}</span>
                    </div>
                    <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusBadgeClass(
                            payment.status
                        )}`}
                    >
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </span>
                </div>
            </div>

            {/* Note */}
            {payment.note && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-start gap-2">
                        <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-slate-600 leading-relaxed">{payment.note}</p>
                    </div>
                </div>
            )}

            <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
        </div>
    );
}
