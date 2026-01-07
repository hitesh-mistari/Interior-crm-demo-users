import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { CheckCircle, Circle, Plus, Trash2, Users, Filter } from 'lucide-react';
import TaskQuickAdd from './TaskQuickAdd';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { Task } from '../types';
import TaskCompletionEffect from './TaskCompletionEffect';
import PaginationControls from './PaginationControls';

interface MobileTodoListProps {
  isActive?: boolean;
}

export default function MobileTodoList({ isActive = true }: MobileTodoListProps) {
  const { tasks, currentUser, updateTask, deleteTask, users, projects, teams } = useApp(); // Added projects, teams
  const [selectedUserId, setSelectedUserId] = useState<string>('mine'); // 'mine' | 'all' | userId | teamMemberId
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all'); // Project filter state
  const [isProjectFilterOpen, setIsProjectFilterOpen] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [animatingTaskId, setAnimatingTaskId] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'admin';

  const getPriorityOrder = (priority: string | null | undefined): number => {
    switch (priority) {
      case 'High': return 2;
      case 'Medium': return 3;
      case 'Low': return 4;
      default: return 5;
    }
  };

  const displayedTasks = useMemo(() => {
    let filtered = tasks.filter(t => !t.deleted);

    // Filter by Project
    if (selectedProjectId !== 'all') {
      filtered = filtered.filter(t => t.projectId === selectedProjectId);
    }

    // Filter by User (Admin logic vs Regular logic)
    if (!isAdmin) {
      filtered = filtered.filter(t => t.assignedTo === currentUser?.id);
    } else {
      if (selectedUserId === 'mine') {
        filtered = filtered.filter(t => t.assignedTo === currentUser?.id);
      } else if (selectedUserId === 'team') {
        const activeTeamIds = teams.filter(t => t.status === 'Active').map(t => t.id);
        filtered = filtered.filter(t => t.assignedTo && activeTeamIds.includes(t.assignedTo));
      } else if (selectedUserId !== 'all') {
        filtered = filtered.filter(t => t.assignedTo === selectedUserId);
      }
      // if 'all', show everything
    }

    return filtered.sort((a, b) => {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      if (dateA !== dateB) return dateA - dateB;
      return getPriorityOrder(a.priority) - getPriorityOrder(b.priority);
    });
  }, [tasks, currentUser, selectedUserId, selectedProjectId, isAdmin]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [selectedUserId, selectedProjectId]); // utilizing useMemo side-effect or useEffect

  const totalItems = displayedTasks.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedTasks = displayedTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const toggleStatus = (id: string, status?: string | null) => {
    // Single click completion: If already Done -> Not Started, else -> Done
    // We skip 'In Progress' for the mobile checkbox interaction to make it faster
    const isDone = status === 'Completed' || status === 'Done';
    const next = isDone ? 'Not Started' : 'Done';

    updateTask(id, { status: next });

    // Trigger sparkles occasionaly when completing
    if (next === 'Done' && Math.random() < 0.4) {
      setAnimatingTaskId(id);
      setTimeout(() => setAnimatingTaskId(null), 2000);
    }
  };



  const openEdit = (task: Task) => {
    setEditingTask(task);
    setShowQuickAdd(true);
  };

  const handleCloseQuickAdd = () => {
    setShowQuickAdd(false);
    setEditingTask(null);
  };

  return (
    <div className="space-y-3 px-4 pb-28">

      <div className="flex items-start gap-2 px-2 pt-6">
        {/* User Scrollable List (Admin only) */}
        {isAdmin ? (
          <div className="flex-1 overflow-x-auto pb-4 scrollbar-hide p-2">
            <div className="flex gap-3">
              {/* ALL Button */}
              <button
                onClick={() => setSelectedUserId('all')}
                className="flex flex-col items-center gap-1 min-w-[48px] transition-all group"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${selectedUserId === 'all'
                  ? 'bg-slate-900 text-white ring-2 ring-offset-2 ring-slate-900 scale-105'
                  : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200 group-hover:bg-slate-200'
                  }`}>
                  <Users className="w-5 h-5" />
                </div>
                <span className={`text-[10px] transition-colors ${selectedUserId === 'all'
                  ? 'font-bold text-slate-900'
                  : 'font-medium text-slate-500'
                  }`}>
                  All
                </span>
              </button>

              {/* ME Button */}
              <button
                onClick={() => setSelectedUserId('mine')}
                className="flex flex-col items-center gap-1 min-w-[48px] transition-all group"
              >
                <div className={`w-10 h-10 rounded-full overflow-hidden transition-all duration-200 ${selectedUserId === 'mine'
                  ? 'ring-2 ring-offset-2 ring-slate-900 scale-105'
                  : 'ring-1 ring-slate-200 group-hover:ring-slate-300'
                  }`}>
                  {/* Find current user in users array to get full profile including photoUrl */}
                  {(() => {
                    const me = users.find(u => u.id === currentUser?.id);
                    if (me?.photoUrl) {
                      return <img src={me.photoUrl} className="w-full h-full object-cover" />;
                    }
                    return (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-600 font-bold text-xs">
                        {currentUser?.fullName?.slice(0, 2).toUpperCase()}
                      </div>
                    );
                  })()}
                </div>
                <span className={`text-[10px] transition-colors ${selectedUserId === 'mine'
                  ? 'font-bold text-slate-900'
                  : 'font-medium text-slate-500'
                  }`}>
                  Me
                </span>
              </button>

              {/* User List */}
              {users.filter(u => u.id !== currentUser?.id).map(u => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUserId(u.id)}
                  className="flex flex-col items-center gap-1 min-w-[48px] transition-all group"
                >
                  <div className={`w-10 h-10 rounded-full overflow-hidden transition-all duration-200 ${selectedUserId === u.id
                    ? 'ring-2 ring-offset-2 ring-slate-900 scale-105'
                    : 'ring-1 ring-slate-200 group-hover:ring-slate-300'
                    }`}>
                    {u.photoUrl ? (
                      <img src={u.photoUrl} alt={u.fullName || u.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-500 text-[10px] font-bold">
                        {(u.fullName || u.name || '??').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] truncate w-full text-center max-w-[50px] transition-colors ${selectedUserId === u.id
                    ? 'font-bold text-slate-900'
                    : 'font-medium text-slate-500'
                    }`}>
                    {(u.fullName || u.name)?.split(' ')[0]}
                  </span>
                </button>
              ))}

              {/* Team Members */}
              {teams.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedUserId(t.id)}
                  className="flex flex-col items-center gap-1 min-w-[48px] transition-all group"
                >
                  <div className={`w-10 h-10 rounded-full overflow-hidden transition-all duration-200 ${selectedUserId === t.id
                    ? 'ring-2 ring-offset-2 ring-slate-900 scale-105'
                    : 'ring-1 ring-slate-200 group-hover:ring-slate-300'
                    }`}>
                    {t.photoUrl ? (
                      <img src={t.photoUrl} alt={t.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-sky-100 text-sky-600 text-[10px] font-bold">
                        {(t.name || '??').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] truncate w-full text-center max-w-[50px] transition-colors ${selectedUserId === t.id
                    ? 'font-bold text-slate-900'
                    : 'font-medium text-slate-500'
                    }`}>
                    {t.name?.split(' ')[0]}
                  </span>
                </button>
              ))}

              {/* Team Filter Button (Consolidated) */}
              <button
                onClick={() => setSelectedUserId('team')}
                className="flex flex-col items-center gap-1 min-w-[48px] transition-all group"
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${selectedUserId === 'team'
                  ? 'bg-emerald-600 text-white ring-2 ring-offset-2 ring-emerald-600 scale-105'
                  : 'bg-emerald-100 text-emerald-600 ring-1 ring-slate-200 group-hover:bg-emerald-200'
                  }`}>
                  <Users className="w-5 h-5" />
                </div>
                <span className={`text-[10px] transition-colors ${selectedUserId === 'team'
                  ? 'font-bold text-slate-900'
                  : 'font-medium text-slate-500'
                  }`}>
                  Team
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1"></div>
        )}

        {/* Project Filter Icon (Fixed Right) */}
        <div className="shrink-0 relative z-30">
          <button
            onClick={() => setIsProjectFilterOpen(!isProjectFilterOpen)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 border ${selectedProjectId !== 'all'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
              }`}
          >
            <Filter className="w-5 h-5" />
          </button>

          {/* Dropdown */}
          {isProjectFilterOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsProjectFilterOpen(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-2 max-h-[60vh] overflow-y-auto">
                <button
                  onClick={() => { setSelectedProjectId('all'); setIsProjectFilterOpen(false); }}
                  className={`w-full text-left px-4 py-3 text-sm flex items-center justify-between ${selectedProjectId === 'all' ? 'bg-slate-50 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                  All Projects
                  {selectedProjectId === 'all' && <CheckCircle className="w-4 h-4 text-slate-900" />}
                </button>
                <div className="h-px bg-slate-100 my-1" />
                {projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedProjectId(p.id); setIsProjectFilterOpen(false); }}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between ${selectedProjectId === p.id ? 'bg-slate-50 text-slate-900 font-medium' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <span className="truncate">{p.projectName || p.name}</span>
                    {selectedProjectId === p.id && <CheckCircle className="w-4 h-4 text-slate-900" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {paginatedTasks.map(t => {
        const isDone = t.status === 'Completed' || t.status === 'Done';
        return (
          <div
            key={t.id}
            className="bg-white rounded-xl border border-slate-200 p-3 flex flex-col gap-3 active:bg-slate-50 transition-colors cursor-pointer relative overflow-visible"
            onClick={() => openEdit(t)}
          >
            {animatingTaskId === t.id && <TaskCompletionEffect />}
            <div className="flex items-start gap-3">
              <button
                onClick={(e) => { e.stopPropagation(); toggleStatus(t.id, t.status); }}
                className="mt-0.5 text-slate-600"
              >
                {isDone ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Circle className="w-5 h-5" />}
              </button>
              <div className="flex-1">
                <div className={`text-sm font-medium ${isDone ? 'line-through text-slate-400' : 'text-slate-800'}`}>{t.title}</div>
              </div>

              {/* Assignee Avatar */}
              {t.assignedTo && (
                <div className="shrink-0">
                  {(() => {
                    const assignee = users.find(u => u.id === t.assignedTo) || teams.find(tm => tm.id === t.assignedTo);
                    if (!assignee) return null;

                    // Check if it's a team member (has name) or user (has fullName)
                    const displayName = (assignee as any).fullName || (assignee as any).name || 'Unknown';

                    if (assignee.photoUrl) {
                      return (
                        <img
                          src={assignee.photoUrl}
                          alt={displayName}
                          className="w-6 h-6 rounded-full object-cover border border-slate-200"
                        />
                      );
                    }

                    return (
                      <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                        <span className="text-[9px] font-bold text-slate-500">
                          {displayName.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              <button
                onClick={(e) => { e.stopPropagation(); setConfirmDelete({ id: t.id, title: t.title }); }}
                className="ml-auto p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>


          </div>
        );
      })}

      {/* Pagination Controls */}
      <div className="pb-4">
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>
      {isActive && (
        <div className="fixed bottom-[85px] right-4 z-30">
          <button
            onClick={() => { setEditingTask(null); setShowQuickAdd(true); }}
            className="bg-slate-900 text-white p-4 rounded-full shadow-lg hover:bg-slate-800 transition-colors"
            title="Add Task"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}
      {showQuickAdd && <TaskQuickAdd open={showQuickAdd} onClose={handleCloseQuickAdd} task={editingTask} />}

      <ConfirmDeleteModal
        open={!!confirmDelete}
        title="Delete Task"
        message="Do you really want to delete this task?"
        detail={confirmDelete?.title ? `Task: ${confirmDelete.title}` : undefined}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) {
            deleteTask(confirmDelete.id);
            setConfirmDelete(null);
          }
        }}
      />
    </div>
  );
}
