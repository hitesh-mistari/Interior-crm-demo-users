import { useMemo, useState, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Task } from '../types';
import { Maximize2, X, GripVertical, Check, Phone, Trash2, ChevronUp, ChevronDown, ChevronsUpDown, Plus, Search, Filter, Calendar as CalendarIcon } from 'lucide-react';
import '../styles/animations.css';
import '../styles/submenus.css';
import TaskQuickAdd from './TaskQuickAdd';
import MobileTodoList from './MobileTodoList';
import { FaWhatsapp } from 'react-icons/fa';
import ConfirmDeleteModal from './ConfirmDeleteModal'; // Added this import
import InlineCalendar from './InlineCalendar';

const getPriorityOrder = (priority: string | null | undefined): number => {
  switch (priority) {
    case 'Urgent': return 1;
    case 'High': return 2;
    case 'Medium': return 3;
    case 'Low': return 4;
    default: return 5;
  }
};

interface TodoListViewProps {
  isActive?: boolean;
}

export default function TodoListView({ isActive }: TodoListViewProps) {
  const { tasks, users, projects, teams, addTask, updateTask, deleteTask, currentUser, hasPermission } = useApp();
  const isAdmin = currentUser?.role === 'admin';
  // Own permissions
  const canCreateOwn = hasPermission('todo', 'create');
  const canUpdateOwn = hasPermission('todo', 'update');
  const canDeleteOwn = hasPermission('todo', 'delete');
  // Team permissions
  const canViewTeam = hasPermission('todo_team', 'read');
  const canCreateTeam = hasPermission('todo_team', 'create');
  const canUpdateTeam = hasPermission('todo_team', 'update');
  const canDeleteTeam = hasPermission('todo_team', 'delete');
  const [fullscreenUserId, setFullscreenUserId] = useState<string | null>(null);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all'); // Used in submitNewTask and filtering
  const [cardWidths, setCardWidths] = useState<Record<string, number>>({});
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [statusMenuTask, setStatusMenuTask] = useState<string | null>(null);
  const [sortState, setSortState] = useState<Record<string, { column?: 'dueDate' | 'priority' | 'status'; direction?: 'asc' | 'desc' | 'none' }>>({});
  const [rowAnim, setRowAnim] = useState<Record<string, 'up' | 'down' | undefined>>({});
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});
  const priorityRefs = useRef<Record<string, HTMLSelectElement | null>>({});
  const [priorityMenuTask, setPriorityMenuTask] = useState<string | null>(null);
  const [projectMenuTask, setProjectMenuTask] = useState<string | null>(null);
  const [assigneeMenuTask, setAssigneeMenuTask] = useState<string | null>(null);
  const [dueDateMenuTask, setDueDateMenuTask] = useState<string | null>(null);

  // Filter State
  const [cardFilters, setCardFilters] = useState<Record<string, {
    monthStart?: string; // YYYY-MM
    monthEnd?: string;   // YYYY-MM
    search?: string;     // Text
  }>>({});
  const [activeFilterMenu, setActiveFilterMenu] = useState<string | null>(null);

  const handleFilterChange = (userId: string, field: 'monthStart' | 'monthEnd' | 'search', value: string) => {
    setCardFilters(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value
      }
    }));
  };

  const filterTasks = (tasks: Task[], userId: string) => {
    const filters = cardFilters[userId];
    if (!filters) return tasks;

    return tasks.filter(task => {
      // Text Filter
      if (filters.search && !task.title.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // Date Range Filter
      if (task.dueDate) {
        if (filters.monthStart) {
          const start = new Date(filters.monthStart + '-01'); // Start of month
          const taskDate = new Date(task.dueDate);
          if (taskDate < start) return false;
        }
        if (filters.monthEnd) {
          // End of the selected month
          const parts = filters.monthEnd.split('-');
          // Next month 0th day is the last day of current month
          const end = new Date(parseInt(parts[0]), parseInt(parts[1]), 0, 23, 59, 59);
          const taskDate = new Date(task.dueDate);
          if (taskDate > end) return false;
        }
      }

      return true;
    });
  };

  // New state for confirm modal
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);

  const handleResizeStart = (e: React.MouseEvent, userId: string) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = cardWidths[userId] || 600; // Default width 600px

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      setCardWidths(prev => ({
        ...prev,
        [userId]: Math.max(300, startWidth + deltaX) // Min width 300px
      }));
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const statusPillStyle = (status: string | null | undefined) => {
    if (status === 'Done' || status === 'Completed') {
      return { bg: '#dbeee0', text: '#2f6b4f', dot: '#5c8f72' };
    }
    if (status === 'In Progress') {
      return { bg: '#e8f0ff', text: '#1d4ed8', dot: '#60a5fa' };
    }
    // Not Started (pale red)
    return { bg: '#fdeaea', text: '#7a2e2e', dot: '#ef6b6b' };
  };

  const statusOptions: Array<{ value: string; label: string }> = [
    { value: 'Not Started', label: 'Not Started' },
    { value: 'In Progress', label: 'In Progress' },
    { value: 'Done', label: 'Done' },
  ];
  const activeProjects = useMemo(() => {
    return projects.filter(p => !p.deleted);
  }, [projects]);

  const getProjectName = (projectId?: string) => {
    if (!projectId) return '';
    const project = activeProjects.find(p => p.id === projectId);
    return project?.projectName || '';
  };

  const formatLongDate = (iso?: string) => {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '-';
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString(undefined, { month: 'long' });
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const sendWhatsAppMessage = (user: { fullName: string; phone?: string }, task: Task) => {
    if (!user.phone) {
      alert(`No phone number available for ${user.fullName}`);
      return;
    }
    const projectName = getProjectName(task.projectId);
    const message = encodeURIComponent(
      `Hi ${user.fullName},\n\nYou have been assigned a new task:\n\n` +
      `Task: ${task.title}\n` +
      (projectName ? `Project: ${projectName}\n` : '') +
      `Priority: ${task.priority || 'Not set'}\n` +
      `Due Date: ${task.dueDate || 'Not set'}\n\n` +
      `Please check the system for more details.`
    );
    const phoneNumber = user.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${phoneNumber}?text=${message}`, '_blank');
  };

  const callUser = (user: { fullName: string; phone?: string }) => {
    if (!user.phone) {
      alert(`No phone number available for ${user.fullName}`);
      return;
    }
    const phoneNumber = user.phone.replace(/\D/g, '');
    window.open(`tel:${phoneNumber}`, '_self');
  };

  const activeUsers = useMemo(() => {
    const base = users && users.length > 0
      ? users
      : (currentUser ? [{ ...currentUser, fullName: (currentUser as any).fullName || (currentUser as any).name || (currentUser as any).email, isActive: true }] as any[] : []);
    const allActiveUsers = base.filter((u: any) => u.isActive !== false);

    // Merge active teams if available
    const combined = [...allActiveUsers];

    if (!isAdmin && currentUser) {
      if (!canViewTeam) {
        // Only show self if no permission to view team
        return combined.filter((u: any) => u.id === currentUser.id);
      }
      // If not admin, hide Admin users (so can't assign to them) but show everyone else (collaboration)
      return combined.filter((u: any) => u.role !== 'admin');
    }

    // Fallback for admin
    const sortedUsers = [...combined].sort((a, b) => {
      if (!currentUser) return 0;
      if (a.id === currentUser.id) return -1;
      if (b.id === currentUser.id) return 1;
      return 0;
    });
    return sortedUsers;
  }, [users, teams, isAdmin, currentUser]);

  const tasksByUser = useMemo(() => {
    const grouped: Record<string, Task[]> = {};

    activeUsers.forEach(user => {
      grouped[user.id] = filterTasks(tasks, user.id)
        // Filter by User AND Project (if selected) AND ensure project exists
        .filter(t => {
          // Must be assigned to this user and not deleted
          if (t.assignedTo !== user.id || t.deleted) return false;

          // If task has a projectId, verify the project exists and is not deleted
          if (t.projectId) {
            const project = activeProjects.find(p => p.id === t.projectId);
            if (!project) return false;
          }

          // Apply project filter if selected
          if (selectedProjectFilter !== 'all' && t.projectId !== selectedProjectFilter) return false;

          return true;
        })
        .sort((a, b) => {
          const priorityA = getPriorityOrder(a.priority);
          const priorityB = getPriorityOrder(b.priority);

          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }

          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          return dateA - dateB;
        });
    });

    return grouped;
  }, [tasks, activeUsers, selectedProjectFilter]); // added selectedProjectFilter

  const applySort = (items: Task[], cfg?: { column?: 'dueDate' | 'priority' | 'status'; direction?: 'asc' | 'desc' | 'none' }) => {
    if (!cfg || !cfg.column || cfg.direction === 'none') return items;
    const arr = [...items];
    if (cfg.column === 'dueDate') {
      const dir = cfg.direction === 'asc' ? 1 : -1;
      arr.sort((a, b) => {
        const da = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        const db = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
        return (da - db) * dir;
      });
      return arr;
    }
    if (cfg.column === 'priority') {
      const rank = (p?: string | null) => (p === 'High' ? 3 : p === 'Medium' ? 2 : p === 'Low' ? 1 : 0);
      // Ascending: High > Medium > Low (as requested)
      arr.sort((a, b) => {
        const ra = rank(a.priority);
        const rb = rank(b.priority);
        if (cfg.direction === 'asc') return rb - ra; // High first
        return ra - rb; // Low first
      });
      return arr;
    }
    if (cfg.column === 'status') {
      arr.sort((a, b) => {
        const sa = (a.status || '').toLowerCase();
        const sb = (b.status || '').toLowerCase();
        if (!sa && sb) return 1; // empty at end
        if (sa && !sb) return -1;
        return cfg.direction === 'asc' ? sa.localeCompare(sb) : sb.localeCompare(sa);
      });
      return arr;
    }
    return items;
  };

  const handleSortClick = (userId: string, column: 'dueDate' | 'priority' | 'status') => {
    setSortState(prev => {
      const curr = prev[userId];
      if (!curr || curr.column !== column) {
        return { ...prev, [userId]: { column, direction: 'asc' } };
      }
      const nextDir = curr.direction === 'asc' ? 'desc' : curr.direction === 'desc' ? 'none' : 'asc';
      return { ...prev, [userId]: { column: nextDir === 'none' ? undefined : column, direction: nextDir } };
    });
  };

  // New Tasks Input State
  const [newTaskInputs, setNewTaskInputs] = useState<Record<string, string>>({});

  const submitNewTask = (userId: string, key: string) => {
    const title = newTaskInputs[key]?.trim();
    if (!title) {
      // If empty, just clear the input state (cancel)
      setNewTaskInputs(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
      return;
    }
    // For team aggregate card, assign to first available team member
    let assignTo = userId;
    if (userId === 'team-aggregate-card') {
      const teamMemberIds = (teams || []).map(t => t.id);
      if (teamMemberIds.length > 0) {
        assignTo = teamMemberIds[0];
      } else {
        alert('No team members available to assign task');
        return;
      }
    }

    const newTask: any = {
      assignedTo: assignTo,
      projectId: selectedProjectFilter !== 'all' ? selectedProjectFilter : '',
      dueDate: new Date().toISOString().split('T')[0],
      title: title,
      status: 'Not Started',
      priority: 'Medium',
    };
    addTask(newTask);

    // Clear input
    setNewTaskInputs(prev => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleNewTaskKeyDown = (e: React.KeyboardEvent, userId: string, key: string) => {
    if (e.key === 'Enter') {
      submitNewTask(userId, key);
    } else if (e.key === 'Escape') {
      setNewTaskInputs(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const getCompletedCount = (userId: string) => {
    const userTasks = tasksByUser[userId] || [];
    const completed = userTasks.filter(t => t.status === 'Done').length;
    return `${completed}/${userTasks.length}`;
  };

  const handleUpdateTask = async (taskId: string, field: keyof Task, value: any) => {
    // Priority change animation direction
    if (field === 'priority') {
      const current = tasks.find(t => t.id === taskId);
      if (current) {
        const prevRank = getPriorityOrder(current.priority);
        const nextRank = getPriorityOrder(value);
        const direction: 'up' | 'down' | undefined = nextRank < prevRank ? 'up' : nextRank > prevRank ? 'down' : undefined;
        if (direction) {
          setRowAnim(prev => ({ ...prev, [taskId]: direction }));
          setTimeout(() => {
            setRowAnim(prev => {
              const copy = { ...prev };
              delete copy[taskId];
              return copy;
            });
          }, 500);
          const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          const rowEl = rowRefs.current[taskId];
          const prEl = priorityRefs.current[taskId];
          if (!reduce && rowEl && prEl && direction) {
            const kf = direction === 'up'
              ? [
                { transform: 'translateY(0)', filter: 'blur(0px)', boxShadow: 'none' },
                { transform: 'translateY(-14px)', filter: 'blur(0.6px)', boxShadow: '0 8px 14px rgba(0,0,0,0.08)' },
                { transform: 'translateY(-4px)', filter: 'blur(0.3px)', boxShadow: '0 4px 10px rgba(0,0,0,0.06)' },
                { transform: 'translateY(0)', filter: 'blur(0px)', boxShadow: 'none' }
              ]
              : [
                { transform: 'translateY(0)', filter: 'blur(0px)', boxShadow: 'none' },
                { transform: 'translateY(14px)', filter: 'blur(0.6px)', boxShadow: '0 8px 14px rgba(0,0,0,0.08)' },
                { transform: 'translateY(3px)', filter: 'blur(0.3px)', boxShadow: '0 4px 10px rgba(0,0,0,0.06)' },
                { transform: 'translateY(0)', filter: 'blur(0px)', boxShadow: 'none' }
              ];
            (rowEl as any).animate(kf, { duration: 450, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)', fill: 'both' });
            // Apply a quick flash to the priority cell
            prEl.animate([
              { backgroundColor: 'rgba(59, 130, 246, 0.2)' },
              { backgroundColor: 'transparent' }
            ], { duration: 400, easing: 'ease-out' });
          }
        }
      }
    }

    try {
      await updateTask(taskId, { [field]: value });
    } catch (err) {
      console.error('updateTask failed', err);
    }
  };

  const handleDeleteTask = (taskId: string, taskTitle: string) => {
    setConfirmDelete({ id: taskId, title: taskTitle });
  };





  const getPriorityColor = (priority: string | null | undefined): string => {
    switch (priority) {
      case 'Urgent': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-amber-100 text-amber-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const renderTable = (userTasks: Task[], userId: string, isFullscreen: boolean) => {
    const maxRows = Math.max(20, userTasks.length + 5);
    const cfg = sortState[userId];
    const sortedTasks = applySort(userTasks, cfg);

    const isOwn = userId === currentUser?.id;
    // Determine effective permissions for this column/table
    const canCreate = isOwn ? canCreateOwn : canCreateTeam;
    const canUpdate = isOwn ? canUpdateOwn : canUpdateTeam;
    const canDelete = isOwn ? canDeleteOwn : canDeleteTeam;
    const ariaSortValue = (col: 'dueDate' | 'priority' | 'status'): 'none' | 'ascending' | 'descending' => {
      if (!cfg || cfg.column !== col || cfg.direction === 'none') return 'none';
      return cfg.direction === 'asc' ? 'ascending' : 'descending';
    };

    return (
      <div className="border border-slate-200 rounded-lg overflow-visible">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="w-72 p-3 text-left text-xs font-semibold text-slate-500 uppercase border-r border-slate-200">Task</th>
              <th className={`${isFullscreen ? 'w-40' : 'w-24'} p-3 text-left text-xs font-semibold text-slate-500 uppercase border-r border-slate-200`}>Project</th>
              <th className="w-14 p-2 text-center text-xs font-semibold text-slate-500 uppercase border-r border-slate-200">Assignee</th>
              <th
                className="w-24 p-3 text-left text-xs font-semibold text-slate-500 uppercase border-r border-slate-200 cursor-pointer select-none"
                onClick={() => handleSortClick(userId, 'dueDate')}
                aria-sort={ariaSortValue('dueDate')}
                title="Sort by Due Date"
              >
                <span className="inline-flex items-center gap-1">
                  Due Date
                  {ariaSortValue('dueDate') === 'ascending' && <ChevronUp className="w-3 h-3 text-slate-400" />}
                  {ariaSortValue('dueDate') === 'descending' && <ChevronDown className="w-3 h-3 text-slate-400" />}
                  {ariaSortValue('dueDate') === 'none' && <ChevronsUpDown className="w-3 h-3 text-slate-300" />}
                </span>
              </th>
              <th
                className="w-16 p-3 text-left text-xs font-semibold text-slate-500 uppercase border-r border-slate-200 cursor-pointer select-none"
                onClick={() => handleSortClick(userId, 'priority')}
                aria-sort={ariaSortValue('priority')}
                title="Sort by Priority"
              >
                <span className="inline-flex items-center gap-1">
                  Priority
                  {ariaSortValue('priority') === 'ascending' && <ChevronUp className="w-3 h-3 text-slate-400" />}
                  {ariaSortValue('priority') === 'descending' && <ChevronDown className="w-3 h-3 text-slate-400" />}
                  {ariaSortValue('priority') === 'none' && <ChevronsUpDown className="w-3 h-3 text-slate-300" />}
                </span>
              </th>
              <th
                className="w-28 p-3 text-left text-xs font-semibold text-slate-500 uppercase border-r border-slate-200 cursor-pointer select-none"
                onClick={() => handleSortClick(userId, 'status')}
                aria-sort={ariaSortValue('status')}
                title="Sort by Status"
              >
                <span className="inline-flex items-center gap-1">
                  Status
                  {ariaSortValue('status') === 'ascending' && <ChevronUp className="w-3 h-3 text-slate-400" />}
                  {ariaSortValue('status') === 'descending' && <ChevronDown className="w-3 h-3 text-slate-400" />}
                  {ariaSortValue('status') === 'none' && <ChevronsUpDown className="w-3 h-3 text-slate-300" />}
                </span>
              </th>
              <th className="w-20 p3 text-center text-xs font-semibold text-slate-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: maxRows }).map((_, index) => {
              const task = sortedTasks[index];

              if (task) {
                const isDone = (task.status as string) === 'Completed' || task.status === 'Done';

                return (
                  <tr
                    key={task.id}
                    className={`border-b border-slate-200 group hover:bg-slate-50 transition-colors ${isDone ? 'bg-slate-50' : 'bg-white'} ${rowAnim[task.id] === 'up' ? 'priority-slide-up' : rowAnim[task.id] === 'down' ? 'priority-slide-down' : ''}`}
                    style={{ willChange: 'transform' }}
                    ref={(el) => { rowRefs.current[task.id] = el; }}
                  >
                    <td className={`p-2 border-r border-slate-200 ${isDone ? 'opacity-50' : ''}`}>
                      <div className="flex items-center gap-2">
                        {/* Status Icon/Checkbox */}
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center cursor-pointer transition-colors ${isDone
                            ? 'bg-green-500 border-green-500 text-white'
                            : task.status === 'In Progress'
                              ? 'border-blue-500 text-blue-500'
                              : 'border-red-400 text-red-500'
                            }`}
                          onClick={() => {
                            if (!canUpdate) return;
                            const nextStatus = isDone ? 'Not Started' : 'Done';
                            handleUpdateTask(task.id, 'status', nextStatus);
                          }}
                          style={{ cursor: canUpdate ? 'pointer' : 'default' }}
                          title={task.status || 'Not Started'}
                        >
                          {isDone && <Check size={10} strokeWidth={3} />}
                          {task.status === 'In Progress' && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                          {(task.status === 'Not Started' || task.status === 'To Do' || !task.status) && (
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#ef6b6b' }} />
                          )}
                        </div>

                        <input
                          type="text"
                          value={task.title}
                          onChange={(e) => handleUpdateTask(task.id, 'title', e.target.value)}
                          readOnly={!canUpdate}
                          placeholder="Task name"
                          className={`w-full text-sm border-0 bg-transparent p-0 focus:ring-0 focus:outline-none text-slate-700 placeholder:text-slate-400 font-medium ${isDone ? 'line-through text-slate-400' : ''} ${!canUpdate ? 'cursor-default' : ''}`}
                        />
                      </div>
                    </td>
                    <td className={`p-2 border-r border-slate-200 align-top ${isDone && projectMenuTask !== task.id ? 'opacity-50' : ''}`}>
                      <div
                        className={`relative inline-flex items-center px-3 py-1 rounded-md text-xs font-medium text-slate-700 bg-white border border-slate-200 ${canUpdate ? 'cursor-pointer' : 'cursor-default'}`}
                        onClick={() => canUpdate && setProjectMenuTask(projectMenuTask === task.id ? null : task.id)}
                        onBlur={() => setProjectMenuTask(null)}
                        tabIndex={0}
                        aria-haspopup="listbox"
                        aria-expanded={projectMenuTask === task.id}
                        title={getProjectName(task.projectId) || '-'}
                      >
                        <span className="truncate max-w-[160px]">{getProjectName(task.projectId) || '-'}</span>
                        {projectMenuTask === task.id && (
                          <div className="submenu absolute bottom-full left-0 mb-2 z-50" role="listbox">
                            <button
                              role="option"
                              aria-selected={!task.projectId}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => { handleUpdateTask(task.id, 'projectId', ''); setProjectMenuTask(null); }}
                              className={`submenu-item ${!task.projectId ? 'is-active' : ''}`}
                            >
                              -
                            </button>
                            {activeProjects.map((project) => (
                              <button
                                key={project.id}
                                role="option"
                                aria-selected={task.projectId === project.id}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => { handleUpdateTask(task.id, 'projectId', project.id); setProjectMenuTask(null); }}
                                className={`submenu-item ${task.projectId === project.id ? 'is-active' : ''}`}
                              >
                                {project.projectName}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={`p-1 border-r border-slate-200 align-top ${isDone && assigneeMenuTask !== task.id ? 'opacity-50' : ''}`}>
                      <div className={`relative w-7 h-7 mx-auto shrink-0 outline-none ${canUpdate ? 'cursor-pointer' : 'cursor-default'}`}
                        onClick={() => canUpdate && setAssigneeMenuTask(assigneeMenuTask === task.id ? null : task.id)}
                        onBlur={() => setAssigneeMenuTask(null)}
                        tabIndex={0}
                        aria-haspopup="listbox"
                        aria-expanded={assigneeMenuTask === task.id}
                      >
                        <div className="w-full h-full rounded-full bg-slate-100 border border-slate-200 overflow-hidden group-hover:border-slate-300">
                          {(() => {
                            const u = activeUsers.find(user => user.id === task.assignedTo);
                            if (!u) {
                              return (
                                <div className="w-full h-full flex items-center justify-center bg-red-100 border border-red-300 text-red-700 text-[10px] font-bold">
                                  UN
                                </div>
                              );
                            }
                            if (u.photoUrl) {
                              return <img src={u.photoUrl} alt={u.fullName} className="w-full h-full object-cover" />;
                            }
                            return (
                              <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-600 text-[10px] font-bold">
                                {u.fullName.substring(0, 2).toUpperCase()}
                              </div>
                            );
                          })()}
                        </div>
                        {assigneeMenuTask === task.id && (
                          <div className="submenu absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 min-w-[200px]" role="listbox">
                            {activeUsers.map((u) => (
                              <button
                                key={u.id}
                                role="option"
                                aria-selected={task.assignedTo === u.id}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => { handleUpdateTask(task.id, 'assignedTo', u.id); setAssigneeMenuTask(null); }}
                                className={`submenu-item ${task.assignedTo === u.id ? 'is-active' : ''} flex items-center gap-2`}
                              >
                                <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-200 shrink-0 flex items-center justify-center">
                                  {u.photoUrl ? (
                                    <img src={u.photoUrl} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <span className="text-[9px] font-bold text-slate-600">
                                      {u.fullName.substring(0, 2).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <span className="truncate">{u.fullName}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={`p-2 border-r border-slate-200 align-top ${isDone && dueDateMenuTask !== task.id ? 'opacity-50' : ''}`}>
                      <div
                        className={`relative w-full text-xs px-2 py-1 rounded border border-transparent hover:border-slate-200 flex items-center justify-between group/date ${canUpdate ? 'cursor-pointer' : 'cursor-default'}`}
                        onClick={() => canUpdate && setDueDateMenuTask(dueDateMenuTask === task.id ? null : task.id)}
                        onBlur={() => setDueDateMenuTask(null)}
                        tabIndex={0}
                      >
                        <span className="font-medium text-slate-600">
                          {formatLongDate(task.dueDate || undefined)}
                        </span>
                        <CalendarIcon className="w-3 h-3 text-slate-400 opacity-0 group-hover/date:opacity-100 transition-opacity" />

                        {dueDateMenuTask === task.id && (
                          <div className="absolute top-full left-0 mt-2 z-[60]" onMouseDown={(e) => e.preventDefault()}>
                            <InlineCalendar
                              value={task.dueDate || undefined}
                              onPick={(val) => {
                                handleUpdateTask(task.id, 'dueDate', val);
                                setDueDateMenuTask(null);
                              }}
                              minDate={new Date().toISOString().split('T')[0]}
                            />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={`p-2 border-r border-slate-200 align-top ${isDone && priorityMenuTask !== task.id ? 'opacity-50' : ''}`}>
                      <div
                        className={`relative inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium min-w-[80px] ${getPriorityColor(task.priority)} ${canUpdate ? 'cursor-pointer' : 'cursor-default'}`}
                        onClick={() => canUpdate && setPriorityMenuTask(priorityMenuTask === task.id ? null : task.id)}
                        onBlur={() => setPriorityMenuTask(null)}
                        tabIndex={0}
                        aria-haspopup="listbox"
                        aria-expanded={priorityMenuTask === task.id}
                        ref={(el) => { priorityRefs.current[task.id] = el as any; }}
                        style={{ willChange: 'transform' }}
                      >
                        <span>{task.priority || 'Medium'}</span>
                        {priorityMenuTask === task.id && (
                          <div className="submenu absolute bottom-full left-0 mb-2 z-50" role="listbox">
                            {['High', 'Medium', 'Low'].map((p) => (
                              <button
                                key={p}
                                role="option"
                                aria-selected={task.priority === p}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => { handleUpdateTask(task.id, 'priority', p); setPriorityMenuTask(null); }}
                                className={`submenu-item ${task.priority === p ? 'is-active' : ''}`}
                              >
                                {p}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={`p-2 border-r border-slate-200 align-top ${isDone && statusMenuTask !== task.id ? 'opacity-50' : ''}`}>
                      <div
                        className={`relative inline-flex items-center gap-2 px-3 py-1 rounded-full font-medium text-xs ${canUpdate ? 'cursor-pointer' : 'cursor-default'}`}
                        style={{ backgroundColor: statusPillStyle(task.status).bg, color: statusPillStyle(task.status).text }}
                        onClick={() => canUpdate && setStatusMenuTask(statusMenuTask === task.id ? null : task.id)}
                        onBlur={() => setStatusMenuTask(null)}
                        tabIndex={0}
                        aria-haspopup="listbox"
                        aria-expanded={statusMenuTask === task.id}
                      >
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: statusPillStyle(task.status).dot }} />
                        <span>{task.status || 'Not Started'}</span>
                        {statusMenuTask === task.id && (
                          <div className="submenu absolute bottom-full left-0 mb-2 z-50" role="listbox">
                            {statusOptions.map((opt) => (
                              <button
                                key={opt.value}
                                role="option"
                                aria-selected={task.status === opt.value}
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => { handleUpdateTask(task.id, 'status', opt.value); setStatusMenuTask(null); }}
                                className={`submenu-item ${task.status === opt.value ? 'is-active' : ''}`}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={`p-2 text-center flex items-center justify-center gap-2 ${isDone ? 'opacity-50' : ''}`}>
                      {activeUsers.find(u => u.id === task.assignedTo) && (
                        <>
                          <button
                            onClick={() => sendWhatsAppMessage(activeUsers.find(u => u.id === task.assignedTo)!, task)}
                            className="text-slate-400 hover:text-green-600 transition-colors"
                          >
                            <FaWhatsapp size={14} />
                          </button>
                          <button
                            onClick={() => callUser(activeUsers.find(u => u.id === task.assignedTo)!)}
                            className="text-slate-400 hover:text-blue-600 transition-colors"
                          >
                            <Phone size={14} />
                          </button>
                        </>
                      )}

                      {canDelete && (
                        <button
                          onClick={() => handleDeleteTask(task.id, task.title)}
                          className="text-slate-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              }

              if (!canCreate) return null;

              return (
                <tr
                  key={`input-${userId}-${index}`}
                  className="border-b border-slate-100 bg-slate-50/50"
                >
                  <td className="p-2 border-r border-slate-200 text-center">
                    <Plus size={14} className={`mx-auto ${newTaskInputs[`${userId}-${index}`] !== undefined ? 'text-blue-500' : 'text-slate-300'}`} />
                  </td>
                  <td className="p-2 border-r border-slate-200" colSpan={7}>
                    <input
                      type="text"
                      placeholder="Click to add task..."
                      value={newTaskInputs[`${userId}-${index}`] || ''}
                      onChange={(e) => setNewTaskInputs(prev => ({ ...prev, [`${userId}-${index}`]: e.target.value }))}
                      onKeyDown={(e) => handleNewTaskKeyDown(e, userId, `${userId}-${index}`)}
                      onBlur={() => submitNewTask(userId, `${userId}-${index}`)}
                      className="w-full bg-transparent outline-none text-sm placeholder:text-slate-400 placeholder:italic focus:text-slate-700"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const fullscreenUser = activeUsers.find(u => u.id === fullscreenUserId);

  if (fullscreenUser) {
    const userTasks = tasksByUser[fullscreenUser.id] || [];
    return (
      <div className="fixed inset-0 bg-slate-100 z-50 overflow-auto">
        <div className="min-h-screen p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-2xl font-bold tracking-wide">To Do List</h3>
                  <div className="flex items-center gap-3">
                    <span className="px-4 py-2 bg-white/20 rounded-full text-base font-medium backdrop-blur-sm">
                      {getCompletedCount(fullscreenUser.id)} completed
                    </span>
                    <button
                      onClick={() => setFullscreenUserId(null)}
                      className="p-2 hover:bg-white/20 rounded transition-colors"
                      title="Close fullscreen"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                <div className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300 flex items-center justify-between">
                  <span>{fullscreenUser.fullName}</span>

                  {/* Filter Toggle */}
                  <div className="relative">
                    <button
                      onClick={() => setActiveFilterMenu(activeFilterMenu === 'fullscreen' ? null : 'fullscreen')}
                      className={`p-2 rounded transition-colors flex items-center gap-2 ${activeFilterMenu === 'fullscreen' || Object.values(cardFilters[fullscreenUser.id] || {}).some(v => v) ? 'bg-white text-slate-800' : 'bg-white/10 hover:bg-white/20'}`}
                      title="Filter tasks"
                    >
                      <Filter className="w-4 h-4" />
                      {(cardFilters[fullscreenUser.id]?.search || cardFilters[fullscreenUser.id]?.monthStart || cardFilters[fullscreenUser.id]?.monthEnd) && (
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      )}
                    </button>

                    {activeFilterMenu === 'fullscreen' && (
                      <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border border-slate-200 p-4 z-50 text-slate-800">
                        <div className="flex flex-col gap-3">
                          <h4 className="font-semibold text-sm border-b border-slate-100 pb-2">Filter Tasks</h4>

                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-medium">Date Range</label>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="relative">
                                <input
                                  type="text"
                                  onFocus={(e) => (e.target.type = 'month')}
                                  onBlur={(e) => (e.target.type = 'text')}
                                  value={cardFilters[fullscreenUser.id]?.monthStart || ''}
                                  onChange={(e) => handleFilterChange(fullscreenUser.id, 'monthStart', e.target.value)}
                                  className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="Start Month"
                                />
                              </div>
                              <div className="relative">
                                <input
                                  type="text"
                                  onFocus={(e) => (e.target.type = 'month')}
                                  onBlur={(e) => (e.target.type = 'text')}
                                  value={cardFilters[fullscreenUser.id]?.monthEnd || ''}
                                  onChange={(e) => handleFilterChange(fullscreenUser.id, 'monthEnd', e.target.value)}
                                  className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                  placeholder="End Month"
                                />
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-medium">Search</label>
                            <div className="relative">
                              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                              <input
                                type="text"
                                placeholder="Search by task name..."
                                value={cardFilters[fullscreenUser.id]?.search || ''}
                                onChange={(e) => handleFilterChange(fullscreenUser.id, 'search', e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                              />
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex justify-end">
                            <button
                              onClick={() => {
                                setCardFilters(prev => {
                                  const copy = { ...prev };
                                  delete copy[fullscreenUser.id];
                                  return copy;
                                });
                                setActiveFilterMenu(null);
                              }}
                              className="text-xs text-red-500 hover:text-red-600 font-medium"
                            >
                              Clear Filters
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-6">
                {renderTable(userTasks, fullscreenUser.id, true)}
              </div>
            </div>
            <div className="mt-4 text-sm text-slate-600 text-center">
              <p>Click on empty rows to add new tasks. All fields are directly editable.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="md:hidden">
        <MobileTodoList isActive={isActive} />
      </div>
      <div className="hidden md:block space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">To-Do List</h2>
            <p className="text-slate-600 mt-1">
              {isAdmin ? 'Manage tasks for all team members' : 'Manage your tasks'}
            </p>
          </div>

          {/* Project Filter Dropdown */}
          <div className="flex items-center gap-3">
            <label htmlFor="project-filter" className="text-sm font-medium text-slate-700">
              Filter by Project:
            </label>
            <select
              id="project-filter"
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 bg-white hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-colors"
            >
              <option value="all">All Projects</option>
              {activeProjects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-full">
            {activeUsers.map((user) => {
              const userTasks = tasksByUser[user.id] || [];
              return (
                <div
                  key={user.id}
                  className="flex-shrink-0 rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden"
                  style={{ width: cardWidths[user.id] !== undefined ? cardWidths[user.id] : '100%' }}
                >
                  <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-5 relative">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold tracking-wide">To Do List</h3>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">
                          {getCompletedCount(user.id)} completed
                        </span>
                        <button
                          onClick={() => setFullscreenUserId(user.id)}
                          className="p-1.5 hover:bg-white/20 rounded transition-colors"
                          title="Open fullscreen"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                        <div
                          className="cursor-ew-resize p-1.5 hover:bg-white/20 rounded transition-colors touch-none"
                          onMouseDown={(e) => handleResizeStart(e, user.id)}
                          title="Drag to resize"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>

                        {/* Filter Toggle */}
                        <div className="relative">
                          <button
                            onClick={() => setActiveFilterMenu(activeFilterMenu === user.id ? null : user.id)}
                            className={`p-1.5 rounded transition-colors flex items-center gap-1 ${activeFilterMenu === user.id || Object.values(cardFilters[user.id] || {}).some(v => v) ? 'bg-white text-slate-800' : 'hover:bg-white/20'}`}
                            title="Filter tasks"
                          >
                            <Filter className="w-4 h-4" />
                            {(cardFilters[user.id]?.search || cardFilters[user.id]?.monthStart || cardFilters[user.id]?.monthEnd) && (
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                            )}
                          </button>

                          {activeFilterMenu === user.id && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 p-3 z-50 text-slate-800 text-left">
                              <div className="flex flex-col gap-3">
                                <div className="space-y-1">
                                  <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Date Range</label>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      onFocus={(e) => (e.target.type = 'month')}
                                      onBlur={(e) => (e.target.type = 'text')}
                                      value={cardFilters[user.id]?.monthStart || ''}
                                      onChange={(e) => handleFilterChange(user.id, 'monthStart', e.target.value)}
                                      className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                      placeholder="Start Month"
                                    />
                                    <input
                                      type="text"
                                      onFocus={(e) => (e.target.type = 'month')}
                                      onBlur={(e) => (e.target.type = 'text')}
                                      value={cardFilters[user.id]?.monthEnd || ''}
                                      onChange={(e) => handleFilterChange(user.id, 'monthEnd', e.target.value)}
                                      className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                      placeholder="End Month"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Search</label>
                                  <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                    <input
                                      type="text"
                                      placeholder="Task name..."
                                      value={cardFilters[user.id]?.search || ''}
                                      onChange={(e) => handleFilterChange(user.id, 'search', e.target.value)}
                                      className="w-full pl-7 pr-2 py-1 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                </div>
                                <div className="pt-2 border-t border-slate-100 flex justify-end">
                                  <button
                                    onClick={() => {
                                      setCardFilters(prev => {
                                        const copy = { ...prev };
                                        delete copy[user.id];
                                        return copy;
                                      });
                                      setActiveFilterMenu(null);
                                    }}
                                    className="text-[10px] text-red-500 hover:text-red-600 font-bold uppercase tracking-wider"
                                  >
                                    Clear
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-300">
                      {user.fullName}
                    </div>
                  </div>
                  <div className="p-">
                    {renderTable(userTasks, user.id, false)}
                  </div>
                </div>
              );
            })}

            {/* Single Team Task Card (Aggregated) */}
            {(() => {
              const activeTeamIds = (teams || []).map(t => t.id);
              if (activeTeamIds.length === 0) return null;

              // Filter tasks assigned to ANY active team member
              // Also apply our search/date filters
              const rawTeamTasks = tasks.filter(t => t.assignedTo && activeTeamIds.includes(t.assignedTo) && !t.deleted);
              const teamCardId = 'team-aggregate-card';
              const teamTasks = filterTasks(rawTeamTasks, teamCardId);

              // Sort tasks
              const sortedTeamTasks = teamTasks.sort((a, b) => {
                const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                if (dateA !== dateB) return dateA - dateB;
                return 0;
              });

              // Special ID for the team card to handle "Add Task"
              // When adding a task here, we'll need to handle it in submitNewTask or let it be unassigned.
              // For now, we use a unique ID 'team-aggregate-card'
              // Special ID for the team card to handle "Add Task"
              // When adding a task here, we'll need to handle it in submitNewTask or let it be unassigned.
              // For now, we use a unique ID 'team-aggregate-card'
              // const teamCardId = 'team-aggregate-card'; // Moved up for filter logic

              return (
                <div
                  key={teamCardId}
                  className="flex-shrink-0 rounded-lg bg-white shadow-sm border border-slate-200 overflow-hidden"
                  style={{ width: cardWidths[teamCardId] !== undefined ? cardWidths[teamCardId] : '100%' }}
                >
                  <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 text-white p-5 relative">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold tracking-wide">Team Task</h3>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">
                          {teamTasks.filter(t => (t.status as string) === 'Completed' || t.status === 'Done').length} completed
                        </span>
                        <div
                          className="cursor-ew-resize p-1.5 hover:bg-white/20 rounded transition-colors touch-none"
                          onMouseDown={(e) => handleResizeStart(e, teamCardId)}
                          title="Drag to resize"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>

                        {/* Filter Toggle */}
                        <div className="relative">
                          <button
                            onClick={() => setActiveFilterMenu(activeFilterMenu === teamCardId ? null : teamCardId)}
                            className={`p-1.5 rounded transition-colors flex items-center gap-1 ${activeFilterMenu === teamCardId || Object.values(cardFilters[teamCardId] || {}).some(v => v) ? 'bg-white text-emerald-800' : 'hover:bg-white/20'}`}
                            title="Filter tasks"
                          >
                            <Filter className="w-4 h-4" />
                            {(cardFilters[teamCardId]?.search || cardFilters[teamCardId]?.monthStart || cardFilters[teamCardId]?.monthEnd) && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            )}
                          </button>

                          {activeFilterMenu === teamCardId && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-slate-200 p-3 z-50 text-slate-800 text-left">
                              <div className="flex flex-col gap-3">
                                <div className="space-y-1">
                                  <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Date Range</label>
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      onFocus={(e) => (e.target.type = 'month')}
                                      onBlur={(e) => (e.target.type = 'text')}
                                      value={cardFilters[teamCardId]?.monthStart || ''}
                                      onChange={(e) => handleFilterChange(teamCardId, 'monthStart', e.target.value)}
                                      className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                                      placeholder="Start Month"
                                    />
                                    <input
                                      type="text"
                                      onFocus={(e) => (e.target.type = 'month')}
                                      onBlur={(e) => (e.target.type = 'text')}
                                      max={new Date().toISOString().slice(0, 7)}
                                      value={cardFilters[teamCardId]?.monthEnd || ''}
                                      onChange={(e) => handleFilterChange(teamCardId, 'monthEnd', e.target.value)}
                                      className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                                      placeholder="End Month"
                                    />
                                  </div>
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Search</label>
                                  <div className="relative">
                                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
                                    <input
                                      type="text"
                                      placeholder="Task name..."
                                      value={cardFilters[teamCardId]?.search || ''}
                                      onChange={(e) => handleFilterChange(teamCardId, 'search', e.target.value)}
                                      className="w-full pl-7 pr-2 py-1 text-xs border border-slate-200 rounded focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                                    />
                                  </div>
                                </div>
                                <div className="pt-2 border-t border-slate-100 flex justify-end">
                                  <button
                                    onClick={() => {
                                      setCardFilters(prev => {
                                        const copy = { ...prev };
                                        delete copy[teamCardId];
                                        return copy;
                                      });
                                      setActiveFilterMenu(null);
                                    }}
                                    className="text-[10px] text-red-500 hover:text-red-600 font-bold uppercase tracking-wider"
                                  >
                                    Clear
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-emerald-100">
                      Team / Karagir
                    </div>
                  </div>
                  <div className="p-0">
                    {/* passing teamCardId as userId. submitNewTask will need to handle this or generic 'add' will fail assignment if not handled */}
                    {renderTable(sortedTeamTasks, teamCardId, false)}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="text-sm text-slate-600">
          <p>Tip: Click on empty rows to add new tasks. All fields are directly editable. Use the WhatsApp button to notify team members.</p>
        </div>
        {false && showQuickAdd && <TaskQuickAdd open={showQuickAdd} onClose={() => setShowQuickAdd(false)} />}
      </div >

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
    </>
  );
}
