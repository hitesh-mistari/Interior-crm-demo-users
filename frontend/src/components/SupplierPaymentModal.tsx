import { useState } from 'react';
import { X } from 'lucide-react';
import useEscapeKey from '../hooks/useEscapeKey';
import { useApp } from '../context/AppContext';
import { PaymentMode } from '../types';
import { formatCurrency } from '../utils/formatters';
import NumericInput from './NumericInput';

interface SupplierPaymentModalProps {
  supplierId: string;
  expenseId?: string | null;
  onClose: () => void;
}

export default function SupplierPaymentModal({
  supplierId,
  expenseId,
  onClose,
}: SupplierPaymentModalProps) {
  useEscapeKey(onClose);
  const { addSupplierPayment, expenses, supplierPayments, suppliers } = useApp();

  const supplier = suppliers.find((s) => s.id === supplierId);
  const expense = expenseId ? expenses.find((e) => e.id === expenseId) : null;

  const existingPayments = expenseId
    ? supplierPayments.filter((p) => p.expenseId === expenseId && !p.deleted)
    : [];
  const totalPaid = existingPayments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = expense ? expense.amount - totalPaid : 0;

  const [formData, setFormData] = useState<{
    amount: number | null;
    paymentDate: string;
    paymentMode: PaymentMode | 'Other';
    notes: string;
  }>({
    amount: null,
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMode: 'Cash',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Prevent duplicate submissions
    if (submitting) return;

    if (expense && (formData.amount ?? 0) > remainingBalance) {
      alert(
        `Payment amount cannot exceed remaining balance of ${formatCurrency(remainingBalance)}`
      );
      return;
    }

    if (formData.amount === null) {
      alert('Please enter a payment amount');
      return;
    }

    setSubmitting(true); // Set submitting to true here, before the try block
    try {
      await addSupplierPayment({
        supplierId,
        expenseId: expenseId || undefined,
        amount: formData.amount,
        paymentDate: formData.paymentDate,
        paymentMode: formData.paymentMode,
        notes: formData.notes || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Error adding supplier payment:', error);
      alert('Failed to record payment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex md:items-center items-end justify-center md:p-4 z-[9999] animate-in fade-in duration-200 !mt-0">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white w-full max-w-2xl md:rounded-2xl rounded-t-3xl shadow-2xl max-h-[90vh] md:max-h-[85vh] flex flex-col relative z-10 animate-in slide-in-from-bottom duration-300 md:slide-in-from-bottom-10">
        {/* Mobile Drag Handle */}
        <div className="md:hidden w-full flex items-center justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 shrink-0">
          <h3 className="text-xl font-semibold text-slate-800">Record Payment</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          <form id="supplier-payment-form" onSubmit={handleSubmit} className="p-6 space-y-4 pb-6">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Supplier</p>
                  <p className="font-semibold text-slate-800">{supplier?.supplierName}</p>
                  {supplier?.companyName && (
                    <p className="text-sm text-slate-600">{supplier.companyName}</p>
                  )}
                </div>
                {expense && (
                  <div>
                    <p className="text-sm text-slate-600">Expense</p>
                    <p className="font-medium text-slate-800">{expense.title}</p>
                  </div>
                )}
              </div>
              {expense && (
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-200">
                  <div>
                    <p className="text-xs text-slate-600">Total Amount</p>
                    <p className="font-semibold text-slate-800">
                      {formatCurrency(expense.amount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Already Paid</p>
                    <p className="font-semibold text-green-600">
                      {formatCurrency(totalPaid)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Remaining Balance</p>
                    <p className="font-bold text-amber-600">
                      {formatCurrency(remainingBalance - (formData.amount || 0))}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Amount (₹) *
                </label>
                <NumericInput
                  value={formData.amount}
                  onChange={(val) => setFormData({ ...formData, amount: val })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  placeholder="Amount"
                  required
                />
                {expense && (formData.amount ?? 0) > remainingBalance && (
                  <p className="text-xs text-red-600 mt-1">
                    Exceeds balance
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Mode *
                </label>
                <select
                  value={formData.paymentMode}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      paymentMode: e.target.value as PaymentMode | 'Other',
                    })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  required
                >
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="UPI">UPI</option>
                  <option value="Banking">Banking</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                rows={2}
                placeholder="Payment reference or additional details..."
              />
            </div>

          </form>
        </div>

        <div className="p-4 border-t border-slate-100 bg-white pb-[calc(1rem+env(safe-area-inset-bottom))] z-10">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              form="supplier-payment-form"
              className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/10"
            >
              {submitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
