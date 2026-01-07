import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import useEscapeKey from '../hooks/useEscapeKey';
import { useApp } from '../context/AppContext';
import { Lead, LeadStatus, LeadType, LeadSource } from '../types';

interface LeadModalProps {
  lead: Lead | null;
  onClose: () => void;
}

export default function LeadModal({ lead, onClose }: LeadModalProps) {
  useEscapeKey(onClose);
  const { addLead, updateLead, users, currentUser } = useApp();
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    location: '',
    source: 'Manual' as LeadSource,
    status: 'New' as LeadStatus,
    lead_type: 'Warm' as LeadType,
    remarks: '',
    assigned_to: '',
    estimated_value: '',
    referralName: '',
  });

  useEffect(() => {
    if (lead) {
      let remarks = lead.remarks || '';
      let referralName = '';
      if (lead.source === 'Referral' && remarks.startsWith('Referral: ')) {
        const parts = remarks.split('\n');
        referralName = parts[0].replace('Referral: ', '');
        remarks = parts.slice(1).join('\n');
      }

      setFormData({
        name: lead.name,
        phone: lead.phone,
        location: lead.location || '',
        source: lead.source,
        status: lead.status,
        lead_type: lead.lead_type,
        remarks: remarks,
        assigned_to: lead.assigned_to || '',
        estimated_value: lead.estimated_value?.toString() || '',
        referralName,
      });
    }
  }, [lead]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.phone.trim()) {
      alert('Please fill in name and phone number');
      return;
    }

    let finalRemarks = formData.remarks.trim();
    if (formData.source === 'Referral' && formData.referralName.trim()) {
      finalRemarks = `Referral: ${formData.referralName.trim()}\n${finalRemarks}`;
    }

    const leadData: Partial<Lead> = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      location: formData.location.trim() || undefined,
      source: formData.source,
      status: formData.status,
      lead_type: formData.lead_type,
      remarks: finalRemarks.trim() || undefined,
      assigned_to: formData.assigned_to || undefined,
      estimated_value: formData.estimated_value ? parseFloat(formData.estimated_value) : undefined,
    };

    if (lead) {
      updateLead(lead.id, leadData);
    } else {
      addLead({
        ...leadData,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        created_by: currentUser!.id,
        deleted: false,
      } as Lead);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-[2px] flex md:items-center items-end justify-center md:p-4 z-[9999] animate-in fade-in duration-300 !mt-0">
      {/* Overlay click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="bg-white w-full max-w-2xl md:rounded-3xl rounded-t-[2.5rem] shadow-2xl max-h-[92vh] md:max-h-[85vh] flex flex-col relative z-10 animate-in slide-in-from-bottom duration-500 md:slide-in-from-bottom-10 md:zoom-in-95">
        {/* Mobile Drag Handle */}
        <div className="md:hidden w-full flex items-center justify-center pt-4 pb-2">
          <div className="w-16 h-1.5 bg-slate-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 shrink-0">
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            {lead ? 'Edit Lead' : 'Add New Lead'}
          </h2>
          <button
            onClick={onClose}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 hover:text-slate-600 transition-all active:scale-90"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-6 min-h-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 ml-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all placeholder:text-slate-400 font-medium"
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 ml-1">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all placeholder:text-slate-400 font-medium"
                  placeholder="Enter phone number"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 ml-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all placeholder:text-slate-400 font-medium"
                  placeholder="City or area"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 ml-1">
                  Source
                </label>
                <div className="relative">
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value as LeadSource })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all appearance-none font-medium text-slate-700"
                  >
                    <option value="Manual">Manual</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Referral">Referral</option>
                  </select>
                  <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              {formData.source === 'Referral' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-1.5">
                  <label className="block text-sm font-semibold text-slate-700 ml-1">
                    Referred By
                  </label>
                  <input
                    type="text"
                    value={formData.referralName}
                    onChange={(e) => setFormData({ ...formData, referralName: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all placeholder:text-slate-400 font-medium"
                    placeholder="Enter referrer name"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 ml-1">
                  Status
                </label>
                <div className="relative">
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as LeadStatus })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all appearance-none font-medium text-slate-700"
                  >
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Converted">Converted</option>
                    <option value="Lost">Lost</option>
                  </select>
                  <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 ml-1">
                  Lead Type
                </label>
                <div className="relative">
                  <select
                    value={formData.lead_type}
                    onChange={(e) => setFormData({ ...formData, lead_type: e.target.value as LeadType })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all appearance-none font-medium text-slate-700"
                  >
                    <option value="Hot">Hot</option>
                    <option value="Warm">Warm</option>
                    <option value="Cold">Cold</option>
                  </select>
                  <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 ml-1">
                  Assign To
                </label>
                <div className="relative">
                  <select
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all appearance-none font-medium text-slate-700"
                  >
                    <option value="">Unassigned</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.fullName}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-slate-700 ml-1">
                  Estimated Value
                </label>
                <input
                  type="number"
                  value={formData.estimated_value}
                  onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all placeholder:text-slate-400 font-medium"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-slate-700 ml-1">
                Remarks
              </label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={3}
                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-800 focus:border-transparent outline-none transition-all placeholder:text-slate-400 font-medium resize-none shadow-sm"
                placeholder="Add any notes about this lead..."
              />
            </div>
          </div>

          <div className="p-6 md:p-8 border-t border-slate-100 bg-white pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
            <div className="flex md:justify-end gap-3 sm:gap-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 md:flex-none px-8 py-4 text-slate-600 bg-slate-50 rounded-2xl font-bold hover:bg-slate-100 transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 md:flex-none px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/20"
              >
                {lead ? 'Update Lead' : 'Add Lead'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
