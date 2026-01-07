import { useState } from 'react';
import { X, Phone, MessageCircle, Mail, Calendar, FileText } from 'lucide-react';
import useEscapeKey from '../hooks/useEscapeKey';
import { useApp } from '../context/AppContext';
import { Lead, LeadInteraction, InteractionType } from '../types';

interface InteractionModalProps {
  lead: Lead;
  onClose: () => void;
}

export default function InteractionModal({ lead, onClose }: InteractionModalProps) {
  useEscapeKey(onClose);
  const { addLeadInteraction, leadInteractions, currentUser, users } = useApp();
  const [formData, setFormData] = useState({
    interaction_type: 'Call' as InteractionType,
    remarks: '',
  });

  const leadHistory = leadInteractions
    .filter(i => i.lead_id === lead.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.remarks.trim()) {
      alert('Please add remarks');
      return;
    }

    const interaction: LeadInteraction = {
      id: crypto.randomUUID(),
      lead_id: lead.id,
      interaction_type: formData.interaction_type,
      remarks: formData.remarks.trim(),
      created_at: new Date().toISOString(),
      created_by: currentUser!.id,
    };

    addLeadInteraction(interaction);
    setFormData({ ...formData, remarks: '' });
  };

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.fullName || 'Unknown';
  };

  const getInteractionIcon = (type: InteractionType) => {
    switch (type) {
      case 'Call':
        return <Phone className="w-4 h-4" />;
      case 'WhatsApp':
        return <MessageCircle className="w-4 h-4" />;
      case 'Email':
        return <Mail className="w-4 h-4" />;
      case 'Meeting':
        return <Calendar className="w-4 h-4" />;
      case 'Note':
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex md:items-center items-end justify-center md:p-4 z-[9999] animate-in fade-in duration-200 !mt-0">
      {/* Overlay click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      <div className="bg-white w-full max-w-2xl md:rounded-2xl rounded-t-3xl shadow-2xl max-h-[90vh] md:max-h-[85vh] flex flex-col relative z-10 animate-in slide-in-from-bottom duration-300 md:slide-in-from-bottom-10">
        {/* Mobile Drag Handle */}
        <div className="md:hidden w-full flex items-center justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Lead Interactions</h2>
            <p className="text-sm text-slate-600 mt-1">
              {lead.name} • {lead.phone}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar min-h-0">
          <form onSubmit={handleSubmit} className="mb-6 bg-slate-50 p-4 rounded-lg">
            <h3 className="text-sm font-semibold text-slate-800 mb-3">Log New Interaction</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Interaction Type
                </label>
                <select
                  value={formData.interaction_type}
                  onChange={(e) => setFormData({ ...formData, interaction_type: e.target.value as InteractionType })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                >
                  <option value="Call">Call</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Email">Email</option>
                  <option value="Meeting">Meeting</option>
                  <option value="Note">Note</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Remarks / Conversation Summary <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none resize-none"
                  placeholder="What was discussed? Key points, follow-ups, etc..."
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                Add Interaction
              </button>
            </div>
          </form>

          <div>
            <h3 className="text-sm font-semibold text-slate-800 mb-3">
              Interaction History ({leadHistory.length})
            </h3>
            {leadHistory.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No interactions yet. Log your first interaction above.
              </div>
            ) : (
              <div className="space-y-3">
                {leadHistory.map((interaction) => (
                  <div
                    key={interaction.id}
                    className="bg-white border border-slate-200 rounded-lg p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg flex-shrink-0 ${interaction.interaction_type === 'Call' ? 'bg-blue-100 text-blue-600' :
                        interaction.interaction_type === 'WhatsApp' ? 'bg-green-100 text-green-600' :
                          interaction.interaction_type === 'Email' ? 'bg-purple-100 text-purple-600' :
                            interaction.interaction_type === 'Meeting' ? 'bg-orange-100 text-orange-600' :
                              'bg-slate-100 text-slate-600'
                        }`}>
                        {getInteractionIcon(interaction.interaction_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${interaction.interaction_type === 'Call' ? 'bg-blue-100 text-blue-700' :
                            interaction.interaction_type === 'WhatsApp' ? 'bg-green-100 text-green-700' :
                              interaction.interaction_type === 'Email' ? 'bg-purple-100 text-purple-700' :
                                interaction.interaction_type === 'Meeting' ? 'bg-orange-100 text-orange-700' :
                                  'bg-slate-100 text-slate-700'
                            }`}>
                            {interaction.interaction_type}
                          </span>
                          <span className="text-xs text-slate-500">
                            {formatDateTime(interaction.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-slate-800 whitespace-pre-wrap mb-2">
                          {interaction.remarks}
                        </p>
                        <p className="text-xs text-slate-500">
                          By {getUserName(interaction.created_by)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-slate-100 p-4 bg-white pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 text-slate-700 bg-slate-100 rounded-xl font-medium hover:bg-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
