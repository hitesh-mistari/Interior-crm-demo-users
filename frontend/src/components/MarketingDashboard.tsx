import { useMemo, useState } from 'react';
import { Users, TrendingUp, Target, Clock, DollarSign, Plus, Filter, Phone, MessageCircle, Instagram, X, Pencil, Check, XCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Lead, LeadStatus, LeadType, LeadSource } from '../types';
import { formatCurrency } from '../utils/formatters';
import LeadModal from './LeadModal';
import EditableCell from './EditableCell';
import EditableSelect from './EditableSelect';
import InteractionModal from './InteractionModal';
import PaginationControls from './PaginationControls';

const leadSourceOptions = ['Instagram', 'Manual'];
const leadStatusOptions = ['New', 'Contacted', 'Converted', 'Lost'];
const leadTypeOptions = ['Hot', 'Warm', 'Cold'];

export default function MarketingDashboard() {
  const { leads, leadInteractions, users, updateLead, hasPermission } = useApp();
  const canCreate = hasPermission('marketing', 'create');
  const canUpdate = hasPermission('marketing', 'update');
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [filterStatus, setFilterStatus] = useState<LeadStatus | 'All'>('All');
  const [filterType, setFilterType] = useState<LeadType | 'All'>('All');
  const [filterSource, setFilterSource] = useState<LeadSource | 'All'>('All');
  const [filterAssigned, setFilterAssigned] = useState<string>('All');
  const [isTableEditMode, setIsTableEditMode] = useState(false);
  const [editedLeads, setEditedLeads] = useState<Record<string, Partial<Lead>>>({});

  const activeFiltersCount = [
    filterStatus !== 'All',
    filterType !== 'All',
    filterSource !== 'All',
    filterAssigned !== 'All'
  ].filter(Boolean).length;

  const today = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    const todayLeads = leads.filter(l => l.created_at.split('T')[0] === today);
    const hotLeads = leads.filter(l => l.lead_type === 'Hot');
    const convertedLeads = leads.filter(l => l.status === 'Converted');
    const pendingFollowUps = leads.filter(l => l.status === 'New' || l.status === 'Contacted');
    const totalEstimatedValue = leads
      .filter(l => l.status !== 'Lost')
      .reduce((sum, l) => sum + (l.estimated_value || 0), 0);

    const instagramLeads = leads.filter(l => l.source === 'Instagram');
    const manualLeads = leads.filter(l => l.source === 'Manual');
    const instagramConverted = instagramLeads.filter(l => l.status === 'Converted').length;
    const manualConverted = manualLeads.filter(l => l.status === 'Converted').length;

    const instagramConversionRate = instagramLeads.length > 0
      ? ((instagramConverted / instagramLeads.length) * 100).toFixed(1)
      : '0';
    const manualConversionRate = manualLeads.length > 0
      ? ((manualConverted / manualLeads.length) * 100).toFixed(1)
      : '0';

    return {
      todayLeads: todayLeads.length,
      hotLeads: hotLeads.length,
      convertedLeads: convertedLeads.length,
      pendingFollowUps: pendingFollowUps.length,
      totalEstimatedValue,
      instagramConversionRate,
      manualConversionRate,
      totalLeads: leads.length,
    };
  }, [leads, today]);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      if (filterStatus !== 'All' && lead.status !== filterStatus) return false;
      if (filterType !== 'All' && lead.lead_type !== filterType) return false;
      if (filterSource !== 'All' && lead.source !== filterSource) return false;
      if (filterAssigned !== 'All' && lead.assigned_to !== filterAssigned) return false;
      return true;
    });
  }, [leads, filterStatus, filterType, filterSource, filterAssigned]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [filterStatus, filterType, filterSource, filterAssigned]);

  const totalItems = filteredLeads.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedLeads = filteredLeads.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsLeadModalOpen(true);
  };

  const handleAddInteraction = (lead: Lead) => {
    setSelectedLead(lead);
    setIsInteractionModalOpen(true);
  };

  const handleWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const handleChange = (leadId: string, field: keyof Lead, value: string | number) => {
    setEditedLeads(prev => ({
      ...prev,
      [leadId]: {
        ...prev[leadId],
        [field]: value,
      },
    }));
  };

  const handleSave = () => {
    Object.entries(editedLeads).forEach(([leadId, updates]) => {
      updateLead(leadId, updates);
    });
    setEditedLeads({});
    setIsTableEditMode(false);
  };

  const handleCancel = () => {
    setEditedLeads({});
    setIsTableEditMode(false);
  };

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`;
  };

  const getLeadInteractions = (leadId: string) => {
    return leadInteractions.filter(i => i.lead_id === leadId);
  };

  const renderBadge = (type: 'source' | 'status' | 'type', value: string) => {
    let colorClasses = '';
    switch (type) {
      case 'source':
        colorClasses = value === 'Instagram' ? 'bg-pink-100 text-pink-700' : 'bg-blue-100 text-blue-700';
        break;
      case 'status':
        if (value === 'New') colorClasses = 'bg-yellow-100 text-yellow-700';
        else if (value === 'Contacted') colorClasses = 'bg-yellow-100 text-yellow-700';
        else if (value === 'Converted') colorClasses = 'bg-green-100 text-green-700';
        else if (value === 'Lost') colorClasses = 'bg-red-100 text-red-700';
        break;
      case 'type':
        if (value === 'Hot') colorClasses = 'bg-red-100 text-red-700';
        else if (value === 'Warm') colorClasses = 'bg-orange-100 text-orange-700';
        else if (value === 'Cold') colorClasses = 'bg-blue-100 text-blue-700';
        break;
    }
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClasses}`}>{value}</span>;
  };

  return (
    <div className="space-y-[clamp(1rem,3vw,1.5rem)] px-4  max-w-full mx-auto">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-[clamp(1.25rem,3vw,1.5rem)] font-bold text-slate-800">Marketing Dashboard</h2>
          <p className="text-slate-600 mt-1 text-sm sm:text-base">Manage all your leads in one place</p>
        </div>
        {canCreate && (
          <button
            onClick={() => {
              setSelectedLead(null);
              setIsLeadModalOpen(true);
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-800 text-white px-4 py-2.5 rounded-lg hover:bg-slate-700 transition-colors min-h-[44px]"
            aria-label="Add new lead manually"
          >
            <Plus className="w-5 h-5" aria-hidden="true" />
            <span>Add Lead</span>
          </button>
        )}
      </header>


      <section aria-labelledby="stats-heading" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <h3 id="stats-heading" className="sr-only">Lead Statistics</h3>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 h-full" aria-label="Today's leads count">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-slate-600 font-medium">Today's Leads</p>
              <p className="text-[clamp(1.5rem,4vw,2rem)] font-bold text-slate-800 mt-1" role="status" aria-live="polite">{stats.todayLeads}</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 h-full" aria-label="Hot leads count">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-slate-600 font-medium">Hot Leads</p>
              <p className="text-[clamp(1.5rem,4vw,2rem)] font-bold text-red-600 mt-1" role="status" aria-live="polite">{stats.hotLeads}</p>
            </div>
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <Target className="w-5 h-5 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 h-full" aria-label="Converted leads count">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-slate-600 font-medium">Converted</p>
              <p className="text-[clamp(1.5rem,4vw,2rem)] font-bold text-green-600 mt-1" role="status" aria-live="polite">{stats.convertedLeads}</p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 h-full" aria-label="Pending follow-ups count">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-slate-600 font-medium">Pending Follow-ups</p>
              <p className="text-[clamp(1.5rem,4vw,2rem)] font-bold text-orange-600 mt-1" role="status" aria-live="polite">{stats.pendingFollowUps}</p>
            </div>
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 h-full" aria-label="Estimated value total">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-xs text-slate-600 font-medium">Est. Value</p>
              <p className="text-[clamp(1.125rem,3.5vw,1.25rem)] font-bold text-slate-800 mt-1" role="status" aria-live="polite">{formatCurrency(stats.totalEstimatedValue)}</p>
            </div>
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
          </div>
        </div>
      </section>


      <section aria-labelledby="conversion-heading" className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6">
        <h3 id="conversion-heading" className="text-[clamp(1rem,2.5vw,1.125rem)] font-semibold text-slate-800 mb-4">Conversion Analytics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-lg p-4 min-h-[120px]">
            <div className="flex items-center gap-2 mb-2">
              <Instagram className="w-5 h-5 text-pink-600" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-700">Instagram Ads</p>
            </div>
            <p className="text-[clamp(1.5rem,4vw,2rem)] font-bold text-slate-800" role="status" aria-live="polite">{stats.instagramConversionRate}%</p>
            <p className="text-xs text-slate-500 mt-1">Conversion Rate</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 min-h-[120px]">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-600" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-700">Manual Entry</p>
            </div>
            <p className="text-[clamp(1.5rem,4vw,2rem)] font-bold text-slate-800" role="status" aria-live="polite">{stats.manualConversionRate}%</p>
            <p className="text-xs text-slate-500 mt-1">Conversion Rate</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-4 min-h-[120px]">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-slate-600" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-700">Total Leads</p>
            </div>
            <p className="text-[clamp(1.5rem,4vw,2rem)] font-bold text-slate-800" role="status" aria-live="polite">{stats.totalLeads}</p>
            <p className="text-xs text-slate-500 mt-1">All Time</p>
          </div>
        </div>
      </section>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[clamp(1rem,2.5vw,1.125rem)] font-semibold text-slate-800 flex items-center gap-2">
                <Filter className="w-5 h-5" aria-hidden="true" />
                All Leads
              </h3>

              <div className="flex items-center gap-2">
                {/* Mobile Filter Toggle */}
                <button
                  onClick={() => setIsFilterDrawerOpen(true)}
                  className="md:hidden flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <span className="bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                      {activeFiltersCount}
                    </span>
                  )}
                </button>

                {isTableEditMode ? (
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 min-h-[40px] min-w-[40px]"
                      aria-label="Save changes"
                    >
                      <Check className="w-4 h-4" />
                      <span className="hidden md:inline">Save</span>
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 min-h-[40px] min-w-[40px]"
                      aria-label="Cancel editing"
                    >
                      <XCircle className="w-4 h-4" />
                      <span className="hidden md:inline">Cancel</span>
                    </button>
                  </div>
                ) : (
                  canUpdate && (
                    <button
                      onClick={() => setIsTableEditMode(true)}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 min-h-[40px] min-w-[40px]"
                      aria-label="Edit leads"
                    >
                      <Pencil className="w-4 h-4" />
                      <span className="hidden md:inline">Edit</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Desktop Filters - Hidden on Mobile */}
            <div className="hidden md:flex flex-wrap gap-3">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as LeadStatus | 'All')}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none bg-white min-w-[140px]"
                aria-label="Filter by status"
              >
                <option value="All">All Status</option>
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Converted">Converted</option>
                <option value="Lost">Lost</option>
              </select>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as LeadType | 'All')}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none bg-white min-w-[140px]"
                aria-label="Filter by type"
              >
                <option value="All">All Types</option>
                <option value="Hot">Hot</option>
                <option value="Warm">Warm</option>
                <option value="Cold">Cold</option>
              </select>
              <select
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value as LeadSource | 'All')}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none bg-white min-w-[140px]"
                aria-label="Filter by source"
              >
                <option value="All">All Sources</option>
                <option value="Instagram">Instagram</option>
                <option value="Manual">Manual</option>
              </select>
              <select
                value={filterAssigned}
                onChange={(e) => setFilterAssigned(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none bg-white min-w-[140px]"
                aria-label="Filter by team member"
              >
                <option value="All">All Team</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>{user.fullName}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Mobile Filter Drawer */}
        {isFilterDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-labelledby="filter-drawer-title">
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsFilterDrawerOpen(false)} aria-hidden="true" />
            <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-xl p-4 shadow-xl animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between mb-4">
                <h3 id="filter-drawer-title" className="text-lg font-semibold text-slate-800">Filters</h3>
                <button
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-full"
                  aria-label="Close filters"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 pb-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as LeadStatus | 'All')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="All">All Status</option>
                    <option value="New">New</option>
                    <option value="Contacted">Contacted</option>
                    <option value="Converted">Converted</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Type</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as LeadType | 'All')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="All">All Types</option>
                    <option value="Hot">Hot</option>
                    <option value="Warm">Warm</option>
                    <option value="Cold">Cold</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Source</label>
                  <select
                    value={filterSource}
                    onChange={(e) => setFilterSource(e.target.value as LeadSource | 'All')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="All">All Sources</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Manual">Manual</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Assigned To</label>
                  <select
                    value={filterAssigned}
                    onChange={(e) => setFilterAssigned(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="All">All Team</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>{user.fullName}</option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => setIsFilterDrawerOpen(false)}
                  className="w-full mt-4 bg-slate-800 text-white py-3 rounded-lg font-medium"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="md:hidden divide-y divide-slate-200">
          {paginatedLeads.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No leads found. Add your first lead to get started.
            </div>
          ) : (
            paginatedLeads.map((lead) => {
              const interactions = getLeadInteractions(lead.id);
              return (
                <article key={lead.id} className="p-4 bg-white" aria-labelledby={`lead-${lead.id}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 id={`lead-${lead.id}`} className="font-semibold text-slate-900">{lead.name}</h4>
                      <p className="text-sm text-slate-500 mt-0.5">{lead.phone}</p>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      {renderBadge('status', lead.status)}
                      {renderBadge('type', lead.lead_type)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm mb-4">
                    <div className="col-span-2 sm:col-span-1">
                      <span className="text-slate-500 block text-xs">Location</span>
                      <span className="text-slate-700">{lead.location || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs">Source</span>
                      <div className="mt-0.5">{renderBadge('source', lead.source)}</div>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-xs">Est. Value</span>
                      <span className="font-medium text-slate-900">{formatCurrency(lead.estimated_value || 0)}</span>
                    </div>
                    {lead.assigned_to && (
                      <div className="col-span-2">
                        <span className="text-slate-500 block text-xs">Assigned To</span>
                        <span className="text-slate-700">
                          {users.find(u => u.id === lead.assigned_to)?.fullName || 'Unknown'}
                        </span>
                      </div>
                    )}
                    {interactions.length > 0 && (
                      <div className="col-span-2 bg-slate-50 p-2 rounded text-xs text-slate-600 mt-1">
                        {interactions.length} interaction{interactions.length !== 1 ? 's' : ''} logged
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => handleCall(lead.phone)}
                      className="flex-1 flex items-center justify-center gap-2 p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors min-h-[44px]"
                      aria-label={`Call ${lead.name}`}
                    >
                      <Phone className="w-4 h-4" />
                      <span className="text-sm font-medium">Call</span>
                    </button>
                    <button
                      onClick={() => handleWhatsApp(lead.phone)}
                      className="flex-1 flex items-center justify-center gap-2 p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors min-h-[44px]"
                      aria-label={`WhatsApp ${lead.name}`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">WhatsApp</span>
                    </button>
                    {canUpdate && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAddInteraction(lead)}
                          className="flex items-center justify-center p-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors min-h-[44px] min-w-[44px]"
                          aria-label={`Log interaction for ${lead.name}`}
                        >
                          <Clock className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleEditLead(lead)}
                          className="flex items-center justify-center p-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg transition-colors min-h-[44px] min-w-[44px]"
                          aria-label={`Edit ${lead.name}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Location</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Assigned To</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Est. Value</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {paginatedLeads.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    No leads found. Add your first lead to get started.
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => {
                  const interactions = getLeadInteractions(lead.id);
                  return (
                    <tr key={lead.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <EditableCell
                          value={editedLeads[lead.id]?.name ?? lead.name}
                          onChange={(value) => handleChange(lead.id, 'name', value)}
                          isEditing={isTableEditMode}
                          className="font-medium text-slate-800"
                        />
                        {interactions.length > 0 && (
                          <div className="text-xs text-slate-500 mt-1">
                            {interactions.length} interaction{interactions.length !== 1 ? 's' : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        <EditableCell
                          value={editedLeads[lead.id]?.phone ?? lead.phone}
                          onChange={(value) => handleChange(lead.id, 'phone', value)}
                          isEditing={isTableEditMode}
                        />
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <EditableCell
                          value={editedLeads[lead.id]?.location ?? (lead.location ?? '')}
                          onChange={(value) => handleChange(lead.id, 'location', value)}
                          isEditing={isTableEditMode}
                        />
                      </td>
                      <td className="px-4 py-3">
                        {isTableEditMode ? (
                          <EditableSelect
                            value={editedLeads[lead.id]?.source ?? lead.source}
                            onChange={(value) => handleChange(lead.id, 'source', value)}
                            isEditing={isTableEditMode}
                            options={leadSourceOptions.map(s => ({ value: s, label: s }))}
                          />
                        ) : (
                          renderBadge('source', lead.source)
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isTableEditMode ? (
                          <EditableSelect
                            value={editedLeads[lead.id]?.status ?? lead.status}
                            onChange={(value) => handleChange(lead.id, 'status', value)}
                            isEditing={isTableEditMode}
                            options={leadStatusOptions.map(s => ({ value: s, label: s }))}
                          />
                        ) : (
                          renderBadge('status', lead.status)
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isTableEditMode ? (
                          <EditableSelect
                            value={editedLeads[lead.id]?.lead_type ?? lead.lead_type}
                            onChange={(value) => handleChange(lead.id, 'lead_type', value)}
                            isEditing={isTableEditMode}
                            options={leadTypeOptions.map(t => ({ value: t, label: t }))}
                          />
                        ) : (
                          renderBadge('type', lead.lead_type)
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        <EditableSelect
                          value={editedLeads[lead.id]?.assigned_to ?? (lead.assigned_to ?? '')}
                          onChange={(value) => handleChange(lead.id, 'assigned_to', value)}
                          isEditing={isTableEditMode}
                          options={users.map(u => ({ value: u.id, label: u.fullName }))}
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">
                        <EditableCell
                          value={editedLeads[lead.id]?.estimated_value ?? (lead.estimated_value ?? 0)}
                          onChange={(value) => handleChange(lead.id, 'estimated_value', Number(value))}
                          isEditing={isTableEditMode}
                          type="number"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-2 flex-nowrap whitespace-nowrap">
                          <button
                            onClick={() => handleCall(lead.phone)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Call"
                          >
                            <Phone className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleWhatsApp(lead.phone)}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                            title="WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          {canUpdate && (
                            <>
                              <button
                                onClick={() => handleAddInteraction(lead)}
                                className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
                              >
                                Log
                              </button>
                              <button
                                onClick={() => handleEditLead(lead)}
                                className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                              >
                                Edit
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="px-4 pb-4">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      </div>

      {isLeadModalOpen && (
        <LeadModal
          lead={selectedLead}
          onClose={() => {
            setIsLeadModalOpen(false);
            setSelectedLead(null);
          }}
        />
      )}

      {isInteractionModalOpen && selectedLead && (
        <InteractionModal
          lead={selectedLead}
          onClose={() => {
            setIsInteractionModalOpen(false);
            setSelectedLead(null);
          }}
        />
      )}
    </div>
  );
}
