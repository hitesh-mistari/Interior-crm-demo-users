import { useState } from 'react';
import { useApp } from '../context/AppContext';
import useEscapeKey from '../hooks/useEscapeKey';
import { X, Save, Upload, Trash2, User } from 'lucide-react';
import { TeamMember } from '../types';

interface AddTeamMemberModalProps {
    onClose: () => void;
    member?: TeamMember; // If provided, we are in edit mode
}

export default function AddTeamMemberModal({ onClose, member }: AddTeamMemberModalProps) {
    useEscapeKey(onClose);
    const { teams, addTeamMember, updateTeamMember } = useApp();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        name: member?.name || '',
        skill: member?.skills?.[0] || '', // Fix: Access first skill from array
        phone: member?.contact || '',     // Fix: Map contact to phone
        notes: member?.notes || '',       // Fix: Map notes
        photoUrl: member?.photoUrl || '',
    });

    const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const data = new FormData();
        data.append('file', file);

        const uploadUrl = `${API_ENDPOINT}/upload`;
        console.log('Uploading to:', uploadUrl);
        console.log('API_ENDPOINT:', API_ENDPOINT);

        try {
            setError(''); // Clear any previous errors
            const res = await fetch(uploadUrl, {
                method: 'POST',
                body: data,
            });

            if (!res.ok) {
                const errData = await res.json().catch(() => ({ error: 'Upload failed' }));
                throw new Error(errData.error || `Upload failed with status ${res.status}`);
            }

            const json = await res.json();
            console.log('Upload successful:', json);
            setFormData(prev => ({ ...prev, photoUrl: json.url }));
        } catch (err: any) {
            console.error('Upload error:', err);
            const errorMessage = err.message || 'Failed to upload photo. Please check your connection.';
            setError(errorMessage);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.skill.trim()) {
            setError('Name and Skill are required');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Transform frontend data to match backend schema
            // Try to find any existing team ID from other members if available
            const anyMember = teams.find(t => !t.deleted && t.teamId);

            // Prioritize existing team ID for updates, fallback to existing team from other members
            const targetTeamId = member?.teamId || anyMember?.teamId;

            // Backend handles default team creation if no team exists
            // if (!targetTeamId) { ... } validation removed

            const payload = {
                teamId: targetTeamId, // Use resolved valid team ID
                name: formData.name,
                skills: [formData.skill], // Backend expects array
                contact: formData.phone, // phone -> contact
                employmentStatus: 'Full-Time' as const, // Backend expects Full-Time/Part-Time/Contractor
                photoUrl: formData.photoUrl || null,
                notes: formData.notes, // Include notes
            };

            console.log('📤 Sending team member payload:', payload);

            if (member) {
                await updateTeamMember(member.id, payload);
            } else {
                await addTeamMember(payload);
            }
            onClose();
        } catch (err: any) {
            console.error('❌ Team member creation failed:', err);
            setError(err.message || 'Failed to save');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex md:items-center items-end justify-center md:p-4 z-[9999] animate-in fade-in duration-200 !mt-0">
            <div className="absolute inset-0" onClick={onClose} />
            <div className="bg-white w-full max-w-md md:rounded-2xl rounded-t-3xl shadow-2xl flex flex-col relative z-10 animate-in slide-in-from-bottom duration-300 md:slide-in-from-bottom-10 max-h-[90vh] md:max-h-[85vh]">
                {/* Mobile Drag Handle */}
                <div className="md:hidden w-full flex items-center justify-center pt-3 pb-1">
                    <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
                </div>

                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
                    <h2 className="text-lg font-semibold text-slate-900">
                        {member ? 'Edit Team Member' : 'Add New Member'}
                    </h2>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
                    <form id="add-member-form" onSubmit={handleSubmit} className="p-6 space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                                placeholder="e.g. Raju Carpenter"
                            />

                        </div>

                        <div className="flex items-center gap-4">
                            <div className="shrink-0">
                                {formData.photoUrl ? (
                                    <div className="relative w-24 h-24 rounded-full overflow-hidden border border-slate-200 group">
                                        <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, photoUrl: '' })}
                                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-slate-400">
                                        <User className="w-8 h-8" />
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Profile Photo</label>
                                <label className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
                                    <Upload className="w-4 h-4" />
                                    <span>Upload Photo</span>
                                    <input type="file" className="hidden" accept="image/*" onChange={handlePhotoUpload} />
                                </label>
                                <p className="text-xs text-slate-500 mt-1">Optional. Recommended size: 200x200px.</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Skill / Role *</label>
                            <select
                                value={formData.skill}
                                onChange={(e) => setFormData({ ...formData, skill: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                            >
                                <option value="">Select Skill</option>
                                <option value="Carpenter">Carpenter</option>
                                <option value="Painter">Painter</option>
                                <option value="Electrician">Electrician</option>
                                <option value="Plumber">Plumber</option>
                                <option value="Mason">Mason</option>
                                <option value="Helper">Helper</option>
                                <option value="Supervisor">Supervisor</option>
                                <option value="Other">Other</option>
                            </select>
                            {/* If 'Other' is selected, maybe show text input? Simplified for now */}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                                placeholder="+91..."
                            />
                        </div>



                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                            <textarea
                                rows={3}
                                value={formData.notes}
                                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none resize-none"
                                placeholder="Any additional details..."
                            />
                        </div>
                    </form>
                </div>

                <div className="p-4 border-t border-slate-100 flex gap-3 bg-white pb-[calc(1rem+env(safe-area-inset-bottom))] z-10">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-3 text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-xl font-medium transition-colors"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="add-member-form"
                        className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
                        disabled={loading}
                    >
                        <Save className="w-4 h-4" />
                        {loading ? 'Saving...' : 'Save Member'}
                    </button>
                </div>
            </div>
        </div>
    );
}
