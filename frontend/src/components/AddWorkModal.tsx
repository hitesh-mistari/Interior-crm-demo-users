import { useState } from 'react';
import { useApp } from '../context/AppContext';
import useEscapeKey from '../hooks/useEscapeKey';
import { X, Save, Calendar, FileText, IndianRupee, FolderKanban, Upload } from 'lucide-react';

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

interface AddWorkModalProps {
    onClose: () => void;
    memberId: string;
    memberName: string;
}

export default function AddWorkModal({ onClose, memberId, memberName }: AddWorkModalProps) {
    useEscapeKey(onClose);
    const { addTeamWork, projects } = useApp();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [receiptUrl, setReceiptUrl] = useState('');
    const [uploading, setUploading] = useState(false);

    const [formData, setFormData] = useState({
        projectId: '',
        workDate: new Date().toISOString().split('T')[0],
        taskName: '',
        notes: '',
        amount: '',
    });

    const activeProjects = projects.filter(p => !p.deleted && p.status !== 'Completed');

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const form = new FormData();
            form.append('images', file);

            const res = await fetch(`${API_ENDPOINT} /expenses/upload`, {
                method: 'POST',
                body: form,
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to upload');
            }

            const data = await res.json();
            setReceiptUrl(data.urls[0]);
        } catch (error) {
            console.error('Image upload error:', error);
            alert(`Failed to upload: ${error instanceof Error ? error.message : 'Unknown error'} `);
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.taskName.trim() || !formData.amount || !formData.projectId) {
            setError('Project, Work Title and Amount are required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await addTeamWork({
                teamMemberId: memberId,
                projectId: formData.projectId,
                workDate: formData.workDate,
                taskName: formData.taskName, // New field mapped to taskName
                notes: formData.notes,       // Description mapped to notes
                rate: parseFloat(formData.amount),
                quantity: 1,
                amount: parseFloat(formData.amount),
                receiptUrl: receiptUrl || undefined,
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
            <div className="bg-white w-full max-w-md md:rounded-2xl rounded-t-3xl shadow-2xl max-h-[90vh] md:max-h-[85vh] flex flex-col relative z-10 animate-in slide-in-from-bottom duration-300 md:slide-in-from-bottom-10">
                {/* Mobile Drag Handle */}
                <div className="md:hidden w-full flex items-center justify-center pt-3 pb-1">
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                </div>

                <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-900">Add Work</h2>
                        <p className="text-sm text-slate-500">For {memberName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                    <form id="add-work-form" onSubmit={handleSubmit} className="p-6 space-y-4 pb-6">
                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Project *</label>
                            <div className="relative">
                                <FolderKanban className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                                <select
                                    required
                                    value={formData.projectId}
                                    onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                                    className="w-full pl-10 pr-10 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none bg-white appearance-none"
                                >
                                    <option value="">Select Project</option>
                                    {activeProjects.map(p => (
                                        <option key={p.id} value={p.id}>{p.projectName}</option>
                                    ))}
                                </select>
                                {/* Custom dropdown arrow to ensure visibility */}
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Work Title *</label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="text"
                                    required
                                    value={formData.taskName}
                                    onChange={(e) => setFormData({ ...formData, taskName: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                                    placeholder="e.g. Paint to hall"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Date *</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="date"
                                    required
                                    value={formData.workDate}
                                    onChange={(e) => setFormData({ ...formData, workDate: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Description / Notes</label>
                            <textarea
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none resize-none"
                                placeholder="Additional details (optional)..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹) *</label>
                            <div className="relative">
                                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Receipt / Estimate (Optional)</label>
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:border-slate-400 transition-colors">
                                {!receiptUrl ? (
                                    <label className="cursor-pointer">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="hidden"
                                            disabled={uploading}
                                        />
                                        <div className="flex flex-col items-center gap-2">
                                            <Upload className="w-8 h-8 text-slate-400" />
                                            <span className="text-sm text-slate-600">
                                                {uploading ? 'Uploading...' : 'Click to upload receipt'}
                                            </span>
                                            <span className="text-xs text-slate-400">PNG, JPG up to 10MB</span>
                                        </div>
                                    </label>
                                ) : (
                                    <div className="relative">
                                        <img
                                            src={receiptUrl}
                                            alt="Receipt"
                                            className="max-h-32 mx-auto rounded"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setReceiptUrl('')}
                                            className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                    </form>
                </div>

                <div className="p-4 border-t border-slate-100 bg-white pb-[calc(1rem+env(safe-area-inset-bottom))] z-10">
                    <div className="flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 text-slate-700 hover:bg-slate-100 rounded-xl font-medium transition-colors border border-slate-200"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="add-work-form"
                            className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-slate-900/10"
                            disabled={loading}
                        >
                            <Save className="w-4 h-4" />
                            {loading ? 'Saving...' : 'Save Work'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
