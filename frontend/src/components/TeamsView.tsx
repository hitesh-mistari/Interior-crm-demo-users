import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Search, Filter } from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import AddTeamMemberModal from './AddTeamMemberModal';
import TeamDetailsView from './TeamDetailsView';
import PaginationControls from './PaginationControls';
import TeamCard from './TeamCard';
import ConfirmDeleteModal from './ConfirmDeleteModal';

export default function TeamsView() {
    const { teams, teamWork, teamPayments, expenses, projects, hasPermission } = useApp();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('Active');
    const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<any | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

    const canCreate = hasPermission('teams', 'create');
    const canEdit = hasPermission('teams', 'update');
    const canDelete = hasPermission('teams', 'delete');
    // Also get deleteTeamMember from context
    const { deleteTeamMember } = useApp();

    const handleEditMember = (member: any) => {
        setEditingMember(member);
    };

    const handleDeleteMember = (member: any) => {
        setConfirmDelete({ id: member.id, name: member.name });
    };

    const confirmDeleteMember = async () => {
        if (!confirmDelete) return;
        try {
            await deleteTeamMember(confirmDelete.id);
        } catch (err) {
            console.error('Failed to delete team member:', err);
        } finally {
            setConfirmDelete(null);
        }
    };


    // Compute stats for each member
    const membersWithStats = useMemo(() => {
        return teams.map(member => {
            // Filter work entries: not deleted AND project exists and is not deleted
            const myWork = teamWork.filter(w => {
                if (w.deleted) return false;
                if (w.projectId) {
                    const project = projects.find(p => p.id === w.projectId);
                    if (!project || project.deleted) return false;
                }
                return w.teamMemberId === member.id;
            });

            // Get valid work entry IDs (from active projects)
            const validWorkIds = new Set(myWork.map(w => w.id));

            // Filter payments: not deleted AND either has no work entries OR all work entries are from active projects
            const myPayments = teamPayments.filter(p => {
                if (p.deleted) return false;
                if (p.teamMemberId !== member.id) return false;

                // If payment has linked work entries, check if any are still valid
                if (p.workEntryIds && Array.isArray(p.workEntryIds) && p.workEntryIds.length > 0) {
                    // Only include payment if at least one of its work entries is still valid
                    const hasValidWork = p.workEntryIds.some((workId: string) => validWorkIds.has(workId));
                    if (!hasValidWork) return false;
                }

                return true;
            });

            // Filter expenses: not deleted AND project exists and is not deleted
            const myExpenses = expenses.filter(e => {
                if (e.deleted) return false;
                if (e.projectId) {
                    const project = projects.find(p => p.id === e.projectId);
                    if (!project || project.deleted) return false;
                }
                return e.teamMemberId === member.id;
            });

            const workValue = myWork.reduce((sum, w) => sum + (Number(w.amount) || 0), 0);
            const expensesValue = myExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
            const totalWorkValue = workValue + expensesValue;

            const paymentsValue = myPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            const paidExpensesValue = myExpenses
                .filter(e => e.paymentStatus === 'Paid')
                .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

            const totalPaid = paymentsValue + paidExpensesValue;
            const pendingAmount = totalWorkValue - totalPaid;

            return {
                ...member,
                totalWorkValue,
                totalPaid,
                pendingAmount
            };
        });
    }, [teams, teamWork, teamPayments, expenses, projects]);

    const filteredMembers = useMemo(() => {
        return membersWithStats.filter(m => {
            if (m.deleted) return false;

            // Backend returns 'skills' as array, 'contact' instead of 'phone'
            const skillsStr = Array.isArray(m.skills) ? m.skills.join(' ') : '';
            const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                skillsStr.toLowerCase().includes(searchTerm.toLowerCase());

            // Backend returns 'employmentStatus', map 'Active' filter to 'Full-Time'
            let matchesStatus = true;
            if (statusFilter !== 'All') {
                // Map frontend filter to backend values
                if (statusFilter === 'Active') {
                    matchesStatus = m.employmentStatus === 'Full-Time';
                } else if (statusFilter === 'Inactive') {
                    matchesStatus = m.employmentStatus === 'Part-Time' || m.employmentStatus === 'Contractor';
                }
            }

            return matchesSearch && matchesStatus;
        });
    }, [membersWithStats, searchTerm, statusFilter]);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Reset page when filters change
    useMemo(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    const totalItems = filteredMembers.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const paginatedMembers = filteredMembers.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    if (selectedMemberId) {
        return <TeamDetailsView memberId={selectedMemberId} onBack={() => setSelectedMemberId(null)} />;
    }

    return (
        <div className="space-y-6 p-[15px] sm:p-0">
            <div className="flex flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Team</h1>
                    <p className="text-slate-500">Manage labor & payments</p>
                </div>
                {canCreate && (
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Add Member</span>
                    </button>
                )}
            </div>

            {/* Team Overview Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-xs font-medium text-slate-500 uppercase mb-1">Total Work Value</div>
                    <div className="text-2xl font-bold text-slate-900">
                        {formatCurrency(membersWithStats.filter(m => !m.deleted).reduce((sum, m) => sum + m.totalWorkValue, 0))}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-xs font-medium text-slate-500 uppercase mb-1">Total Paid</div>
                    <div className="text-2xl font-bold text-slate-900">
                        {formatCurrency(membersWithStats.filter(m => !m.deleted).reduce((sum, m) => sum + m.totalPaid, 0))}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-xs font-medium text-slate-500 uppercase mb-1">Outstanding</div>
                    <div className="text-2xl font-bold text-red-600">
                        {formatCurrency(membersWithStats.filter(m => !m.deleted).reduce((sum, m) => sum + m.pendingAmount, 0))}
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
                    <div className="text-xs font-medium text-slate-500 uppercase mb-1">Active Team Members</div>
                    <div className="text-2xl font-bold text-slate-900">
                        {teams.filter(m => !m.deleted && m.employmentStatus === 'Full-Time').length}/{teams.filter(m => !m.deleted).length}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-row gap-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name or skill..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-slate-900"
                    />
                </div>
                <div className="relative">
                    <button
                        onClick={() => setIsFilterOpen(!isFilterOpen)}
                        className={`p-2 rounded-lg border transition-colors ${statusFilter !== 'All'
                            ? 'bg-slate-100 border-slate-300 text-slate-900'
                            : 'bg-white border-transparent hover:bg-slate-50 text-slate-400'
                            }`}
                        title="Filter by status"
                    >
                        <Filter className="w-5 h-5" />
                    </button>

                    {isFilterOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-10"
                                onClick={() => setIsFilterOpen(false)}
                            />
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 animate-in fade-in zoom-in-95 duration-100">
                                {(['All', 'Active', 'Inactive'] as const).map(status => (
                                    <button
                                        key={status}
                                        onClick={() => {
                                            setStatusFilter(status);
                                            setIsFilterOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${statusFilter === status ? 'text-blue-600 font-medium bg-blue-50' : 'text-slate-700'
                                            }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {paginatedMembers.map(member => (
                    <TeamCard
                        key={member.id}
                        member={member}
                        onClick={() => setSelectedMemberId(member.id)}
                        onEdit={canEdit ? () => handleEditMember(member) : undefined}
                        onDelete={canDelete ? () => handleDeleteMember(member) : undefined}
                    />
                ))}

                {filteredMembers.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-500">
                        No team members found.
                    </div>
                )}
            </div>

            {/* Pagination Controls */}
            <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                totalItems={totalItems}
                onItemsPerPageChange={setItemsPerPage}
            />

            {(isAddModalOpen || editingMember) && (
                <AddTeamMemberModal
                    onClose={() => {
                        setIsAddModalOpen(false);
                        setEditingMember(null);
                    }}
                    member={editingMember || undefined}
                />
            )}

            {confirmDelete && (
                <ConfirmDeleteModal
                    open={!!confirmDelete}
                    title="Delete Team Member"
                    message="Do you really want to delete this team member?"
                    detail={confirmDelete.name}
                    onCancel={() => setConfirmDelete(null)}
                    onConfirm={confirmDeleteMember}
                />
            )}
        </div>
    );
}
