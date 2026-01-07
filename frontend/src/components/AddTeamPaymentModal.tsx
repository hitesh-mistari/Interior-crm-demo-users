import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import useEscapeKey from '../hooks/useEscapeKey';
import { X, Save, FolderKanban, CreditCard } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

interface AddTeamPaymentModalProps {
    onClose: () => void;
    memberId: string;
    memberName: string;
    preselectedWorkId?: string | null;
}

export default function AddTeamPaymentModal({ onClose, memberId, memberName, preselectedWorkId }: AddTeamPaymentModalProps) {
    useEscapeKey(onClose);
    const { addTeamPayment, projects, teamWork, teamPayments } = useApp();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        projectId: '',
        paymentDate: new Date().toISOString().split('T')[0],
        amount: '',
        paymentMode: 'Cash',
        paymentType: 'Instalment',
        notes: '',
    });

    // Calculate total work value and paid amount for this member
    const memberWork = useMemo(() => teamWork.filter(w => w.teamMemberId === memberId && !w.deleted), [teamWork, memberId]);
    const memberPayments = useMemo(() => teamPayments.filter(p => p.teamMemberId === memberId && !p.deleted), [teamPayments, memberId]);

    const totalWorkValue = memberWork.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
    const totalPaid = memberPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const remainingBalance = totalWorkValue - totalPaid;

    const activeProjects = projects.filter(p => !p.deleted && p.status !== 'Completed');

    // Pre-select project if preselectedWorkId is passed
    useEffect(() => {
        if (preselectedWorkId) {
            const work = teamWork.find(w => w.id === preselectedWorkId);
            if (work) {
                setFormData(prev => ({
                    ...prev,
                    projectId: work.projectId || '',
                    amount: work.amount.toString() // Auto-fill amount if single work item
                }));
            }
        }
    }, [preselectedWorkId, teamWork]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.amount || !formData.projectId) {
            setError('Project and Amount are required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await addTeamPayment({
                teamMemberId: memberId,
                projectId: formData.projectId,
                paymentDate: formData.paymentDate,
                amount: parseFloat(formData.amount),
                paymentMode: formData.paymentMode,
                paymentType: formData.paymentType,
                notes: formData.notes,
                workEntryIds: preselectedWorkId ? [preselectedWorkId] : [], // Only link if specifically pre-selected
            });
            onClose();
        } catch (err: any) {
            setError(err.message || 'Failed to save');
        } finally {
            setLoading(false);
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

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
                    <h3 className="text-lg font-bold text-slate-800">Has to Pay</h3>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0 p-6 space-y-4">

                    {/* Info Block - Compact */}
                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                            <div>
                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Team Member</p>
                                <p className="text-base font-bold text-slate-800 leading-tight">{memberName}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-slate-500 mb-0.5">Outstanding</p>
                                <p className="text-sm font-bold text-amber-600">{formatCurrency(remainingBalance)}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-2">
                            <div>
                                <p className="text-[10px] text-slate-500 mb-0.5">Total Work</p>
                                <p className="text-sm font-semibold text-slate-900">{formatCurrency(totalWorkValue)}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 mb-0.5">Total Paid</p>
                                <p className="text-sm font-semibold text-green-600">{formatCurrency(totalPaid)}</p>
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="p-2.5 bg-red-50 text-red-600 text-xs rounded-lg border border-red-100 flex items-center gap-2">
                            <span className="font-medium">Error:</span> {error}
                        </div>
                    )}

                    <form id="payment-form" onSubmit={handleSubmit} className="space-y-4">

                        {/* Project & Payment Type - Row on Desktop */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Project Selection */}
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Project *</label>
                                <div className="relative">
                                    <FolderKanban className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <select
                                        required
                                        value={formData.projectId}
                                        onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none appearance-none bg-white text-sm"
                                    >
                                        <option value="">Select Project</option>
                                        {activeProjects.map(p => (
                                            <option key={p.id} value={p.id}>{p.projectName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Payment Type */}
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Payment Type</label>
                                <div className="relative">
                                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <select
                                        required
                                        value={formData.paymentType}
                                        onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none appearance-none bg-white text-sm"
                                    >
                                        <option value="Instalment">Installment</option>
                                        <option value="Full Payment">Full Payment</option>
                                        <option value="Final">Final Payment</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Grid for Amount, Date, Mode */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-1">
                                <label className="block text-xs font-medium text-slate-700 mb-1">Amount (₹) *</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        step="0.01"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none font-semibold text-slate-900 text-sm"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Date *</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        required
                                        value={formData.paymentDate}
                                        onChange={(e) => setFormData({ ...formData, paymentDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none text-sm"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Payment Mode *</label>
                                <select
                                    value={formData.paymentMode}
                                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none bg-white appearance-none text-sm"
                                >
                                    <option value="Cash">Cash</option>
                                    <option value="UPI">UPI</option>
                                    <option value="Bank Transfer">Bank Transfer</option>
                                    <option value="Cheque">Cheque</option>
                                </select>
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-xs font-medium text-slate-700 mb-1">Notes (Optional)</label>
                            <textarea
                                rows={2}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none resize-none text-sm"
                                placeholder="Details..."
                            />
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 pb-[calc(1rem+env(safe-area-inset-bottom))]">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 md:flex-none px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-white hover:border-slate-400 transition-all font-medium text-sm"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="payment-form"
                        className="flex-1 md:flex-none px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-medium flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10 active:scale-95 transform duration-100 text-sm"
                        disabled={loading}
                    >
                        <Save className="w-4 h-4" />
                        {loading ? 'Saving...' : 'Record Payment'}
                    </button>
                </div>
            </div>
        </div>
    );
}
