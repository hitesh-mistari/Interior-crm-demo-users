import { useMemo, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import useEscapeKey from '../hooks/useEscapeKey';
import { useApp } from '../context/AppContext';
import { PaymentType, Payment } from '../types';
import { logPaymentChange, savePaymentVersionHistory } from '../utils/versionHistory';
import { formatCurrency } from '../utils/formatters';
import NumericInput from './NumericInput';
import { normalizeToIsoMinute, isFuture, isPast, toIsoMinute } from '../utils/date';
import { detectPreferredChannel, composePaymentConfirmation, buildWhatsAppUrl, buildSmsUrl, tryOpen } from '../utils/messages';
import { maskSensitive } from '../utils/security';

interface PaymentModalProps {
  payment?: Payment | null;
  onClose: () => void;
}

export default function PaymentModal({ payment, onClose }: PaymentModalProps) {
  useEscapeKey(onClose);
  const { projects, payments, addPayment, updatePayment, currentUser, addNotification } = useApp();

  const initialProjectId = payment?.projectId || (projects.length > 0 ? projects[0].id : '');
  const isEditMode = !!payment;

  // Pre-calc initial remaining for default amount (mirrors supplier modal behavior)

  // Get current Indian time (IST = UTC+5:30)


  const initialIso = normalizeToIsoMinute(payment?.paymentDate || toIsoMinute());
  const [formData, setFormData] = useState({
    projectId: initialProjectId,
    amount: payment?.amount ?? null,
    paymentDate: initialIso.slice(0, 10),
    paymentTime: initialIso.slice(11, 16),
    paymentType: (payment?.paymentType || 'Installment') as PaymentType,
    notes: payment?.notes || '',
    paymentMode: payment?.paymentMode || 'Cash',
    referenceNumber: payment?.referenceNumber || '',
    sendConfirmation: true,
  });

  // Derived amounts (update dynamically as project or amount changes)
  const selectedProject = useMemo(
    () => projects.find((p) => p.id === formData.projectId),
    [projects, formData.projectId]
  );

  const dueAmount = (selectedProject?.projectAmount ?? selectedProject?.quotationAmount ?? 0) || 0;
  const alreadyReceived = useMemo(() => {
    return payments
      .filter((p) => p.projectId === formData.projectId && !p.deleted)
      .reduce((sum, p) => sum + (isEditMode && payment?.id === p.id ? 0 : p.amount), 0);
  }, [payments, formData.projectId, isEditMode, payment?.id]);

  const remainingBalance = Math.max(dueAmount - alreadyReceived, 0);
  const remainingAfterThisPayment = Math.max(remainingBalance - (formData.amount ?? 0), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId) {
      alert('Please create a project first');
      return;
    }

    // Validation: do not exceed outstanding balance (unless it's an Advance payment)
    if (formData.paymentType !== 'Advance' && (formData.amount ?? 0) > remainingBalance) {
      alert(`Payment amount cannot exceed remaining balance of ${formatCurrency(remainingBalance)}`);
      return;
    }
    if (formData.amount === null) {
      alert('Please enter a payment amount');
      return;
    }

    const combinedIsoMinute = normalizeToIsoMinute(`${formData.paymentDate}T${formData.paymentTime}`);
    if (isFuture(combinedIsoMinute)) {
      alert('Payment date/time cannot be in the future');
      return;
    }

    // Validate payment method details
    if (!formData.paymentMode) {
      alert('Please select a payment method');
      return;
    }

    if (isEditMode && payment && currentUser) {
      const isNonAdmin = currentUser.role !== 'admin';
      const currentCount = payment.editCount || 0;
      if (isNonAdmin && currentCount >= 3) {
        addNotification(
          `Edit limit reached for payment in project: ${payment.projectId}`
        );
        alert('You have reached the maximum edit limit for this payment.');
        return;
      }
      const updatedData = { ...formData, amount: formData.amount ?? 0, paymentDate: combinedIsoMinute, referenceNumber: maskSensitive(formData.referenceNumber) };
      const changes = logPaymentChange(
        payment.id,
        payment,
        updatedData,
        currentUser.id,
        currentUser.name || 'Unknown'
      );
      if (changes.length > 0) {
        savePaymentVersionHistory(payment.id, changes);
      }
      updatePayment(payment.id, updatedData);
    } else {
      addPayment({ ...formData, amount: formData.amount ?? 0, paymentDate: combinedIsoMinute, referenceNumber: maskSensitive(formData.referenceNumber) });
    }

    // Visual confirmation via notification if balance is fully covered
    if (remainingAfterThisPayment === 0 && dueAmount > 0) {
      addNotification(
        `Balance fully covered for project: ${selectedProject?.projectName}`
      );
    }

    // Compose and send WhatsApp/SMS confirmation
    try {
      const clientName = selectedProject?.clientName || 'Client';
      const amountReceivedLabel = formatCurrency(formData.amount ?? 0);
      const amountLeftLabel = formatCurrency(remainingAfterThisPayment);
      const paymentLink = `${window.location.origin}/?projectId=${encodeURIComponent(formData.projectId)}#payments`;
      const message = composePaymentConfirmation(clientName, amountReceivedLabel, amountLeftLabel, paymentLink);

      const contact = selectedProject?.clientContact || '';
      const channel = detectPreferredChannel(contact);
      if (formData.sendConfirmation && channel !== 'none') {
        const targetUrl = channel === 'whatsapp' ? buildWhatsAppUrl(contact, message) : buildSmsUrl(contact, message);
        const ok = tryOpen(targetUrl);
        addNotification(
          ok ? `Payment confirmation prepared via ${channel.toUpperCase()} for ${clientName}` : `Unable to open ${channel.toUpperCase()} window; copy message manually`
        );
      } else if (formData.sendConfirmation) {
        addNotification(
          `No valid client contact available to send confirmation for ${clientName}`
        );
      }
    } catch (err) {
      console.error('Message delivery failed', err);
      addNotification(
        `Message delivery failed due to an unexpected error`
      );
    }
    onClose();
  };

  if (projects.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-slate-800">{isEditMode ? 'Edit Payment' : 'Add Payment'}</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <p className="text-slate-600 text-center py-8">
            Please create a project first before adding payments.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex md:items-center items-end justify-center md:p-4 z-[9999] animate-in fade-in duration-200 !mt-0">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white w-full max-w-2xl md:rounded-2xl rounded-t-3xl shadow-2xl max-h-[90vh] md:max-h-[85vh] flex flex-col relative z-10 animate-in slide-in-from-bottom duration-300 md:slide-in-from-bottom-10">
        {/* Mobile Drag Handle */}
        <div className="md:hidden w-full flex items-center justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 shrink-0">
          <h3 className="text-xl font-semibold text-slate-800">{isEditMode ? 'Edit Payment' : 'Add Payment'}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          <form id="payment-form" onSubmit={handleSubmit} className="p-6 space-y-4 pb-6">
            {/* Balance summary */}
            {dueAmount > 0 && (
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-slate-600">Total Amount</p>
                    <p className="font-semibold text-slate-800">{formatCurrency(dueAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Already Received</p>
                    <p className="font-semibold text-green-600">{formatCurrency(alreadyReceived)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600">Remaining Balance</p>
                    <p className="font-bold text-amber-600">{formatCurrency(remainingBalance)}</p>
                  </div>
                </div>
                {(formData.amount ?? 0) > 0 && (
                  <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-slate-200">
                    <div className="col-span-3">
                      <p className="text-xs text-slate-600">Remaining After This Payment</p>
                      <p className={`font-semibold ${remainingAfterThisPayment === 0 ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {formatCurrency(remainingAfterThisPayment)}
                        {remainingAfterThisPayment === 0 && (
                          <span className="ml-2 inline-flex items-center text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">Covers full balance</span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Project *
              </label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                required
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projectName} - {project.clientName}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Amount (₹) *
                </label>
                <NumericInput
                  value={formData.amount}
                  onChange={(val) => setFormData({ ...formData, amount: val })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  placeholder="Amount"
                  required
                />
                {(formData.amount ?? 0) > remainingBalance && (
                  <p className="text-xs text-red-600 mt-1">Exceeds balance</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Type *
                </label>
                <select
                  value={formData.paymentType}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentType: e.target.value as PaymentType })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  required
                >
                  <option value="Advance">Advance</option>
                  <option value="Installment">Installment</option>
                  <option value="Final">Final Payment</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Payment Date & Time *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  required
                />
                <input
                  type="time"
                  value={formData.paymentTime}
                  onChange={(e) => setFormData({ ...formData, paymentTime: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  required
                />
              </div>
              {isPast(normalizeToIsoMinute(`${formData.paymentDate}T${formData.paymentTime}`)) && (
                <div className="mt-2 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700">
                  <AlertTriangle className="w-3 h-3" />
                  Backdated entry
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Payment Method *</label>
                <select
                  value={formData.paymentMode}
                  onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as any })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  required
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Banking">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Reference Number</label>
                <input
                  type="text"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  placeholder="Txn/Ref ID (required for UPI/Bank/Cheque)"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                />
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs text-slate-600">
                Client: <span className="font-medium text-slate-800">{selectedProject?.clientName || 'Unknown'}</span> • Contact: <span className="font-medium text-slate-800">{selectedProject?.clientContact || '-'}</span>
              </p>
              <label className="inline-flex items-center mt-2 gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.sendConfirmation}
                  onChange={(e) => setFormData({ ...formData, sendConfirmation: e.target.checked })}
                />
                <span>Send confirmation via WhatsApp/SMS</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                rows={3}
                placeholder="Additional details about this payment"
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
              form="payment-form"
              className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium shadow-lg shadow-slate-900/10"
            >
              {isEditMode ? 'Update Payment' : 'Add Payment'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
