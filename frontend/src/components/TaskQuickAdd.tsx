import { useMemo, useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { CalendarDays, Flag, User, X, Folder } from 'lucide-react';
import InlineCalendar from './InlineCalendar';
import { formatShortDate } from '../utils/dates';
import { Task } from '../types';

interface TaskQuickAddProps {
  open: boolean;
  onClose: () => void;
  task?: Task | null;
}

export default function TaskQuickAdd({ open, onClose, task }: TaskQuickAddProps) {
  const { currentUser, projects, users, teams, addTask, updateTask } = useApp();
  const activeUsers = useMemo(() => {
    const baseUsers = Array.isArray(users) && users.length > 0 ? users : (currentUser ? [{ ...currentUser, fullName: (currentUser as any).fullName || (currentUser as any).name || (currentUser as any).email, isActive: true }] as any[] : []);
    const filteredUsers = baseUsers.filter((u: any) => u.isActive !== false);

    const activeTeams = (teams || []).map(t => ({
      id: t.id,
      fullName: t.name,
      photoUrl: t.photoUrl,
      isActive: true,
      role: 'Team Member',
      phone: t.phone
    }));

    return [...filteredUsers, ...activeTeams];
  }, [users, teams, currentUser]);

  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'Urgent' | 'High' | 'Medium' | 'Low'>('Medium');
  const [status, setStatus] = useState<'Not Started' | 'In Progress' | 'Completed'>('Not Started');
  const [assignee, setAssignee] = useState<string | ''>(currentUser?.id || '');
  const [projectId, setProjectId] = useState<string | ''>('');

  const [showPriority, setShowPriority] = useState(false);
  const [showProject, setShowProject] = useState(false);
  const [showInlineCal, setShowInlineCal] = useState(false);
  const [showAssignee, setShowAssignee] = useState(false);

  // Refs for positioning fixed dropdowns
  const assigneeRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLButtonElement>(null);
  const priorityRef = useRef<HTMLDivElement>(null);
  const projectRef = useRef<HTMLDivElement>(null);

  const activeProjects = useMemo(() => projects.filter(p => !p.deleted && p.status === 'Ongoing'), [projects]);

  // Initialize from task prop
  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title);
        setDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
        setPriority((task.priority as any) || 'Medium');
        setStatus((task.status as any) || 'Not Started');
        setAssignee(task.assignedTo || '');
        setProjectId(task.projectId || '');
      } else {
        setTitle('');
        setDueDate('');
        setPriority('Medium');
        setStatus('Not Started');
        setAssignee(currentUser?.id || '');
        setProjectId('');
      }
    }
  }, [task, open, currentUser]);

  const priorityColor = (p: 'Urgent' | 'High' | 'Medium' | 'Low') => (
    p === 'Urgent' ? '#dc2626' : p === 'High' ? '#f59e0b' : p === 'Medium' ? '#facc15' : '#22c55e'
  );

  const priorityLabel = (p: 'Urgent' | 'High' | 'Medium' | 'Low') => (
    p === 'Urgent' ? 'Priority 1' : p === 'High' ? 'Priority 2' : p === 'Medium' ? 'Priority 3' : 'Priority 4'
  );

  const formatWhatsappPhone = (raw?: string | null) => {
    if (!raw) return null;
    const digits = String(raw).replace(/\D/g, '');
    if (digits.startsWith('91')) return digits;
    if (digits.length === 10) return `91${digits}`;
    return digits || null;
  };

  const findAssignee = () => activeUsers.find((u: any) => u.id === assignee) || currentUser;

  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/);
    const first = parts[0]?.[0] || '';
    const last = parts[1]?.[0] || '';
    return (first + last).toUpperCase() || first.toUpperCase();
  };

  const getProjectName = () => {
    const p = projects.find(p => p.id === projectId);
    return p ? p.projectName : 'Project';
  };

  const getDropdownStyle = (ref: React.RefObject<HTMLElement>) => {
    if (!ref.current) return {};
    const rect = ref.current.getBoundingClientRect();
    const dropdownWidth = 260; // Approximate max width
    // Prevent overflow on right
    const left = rect.left + dropdownWidth > window.innerWidth ? window.innerWidth - dropdownWidth - 16 : rect.left;

    return {
      position: 'fixed' as const,
      bottom: (window.innerHeight - rect.top) + 8, // Position above the button
      left: Math.max(16, left),
      zIndex: 11005,
      animation: 'slideUp 160ms ease-out both'
    };
  };

  const closeMenus = () => {
    setShowAssignee(false);
    setShowInlineCal(false);
    setShowPriority(false);
    setShowProject(false);
  };

  if (!open) return null;

  const save = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const payload: any = {
      title: trimmed,
      dueDate: dueDate || null,
      priority,
      status,
      projectId: projectId || '',
      assignedTo: assignee || currentUser?.id,
    };

    if (!task) {
      payload.createdBy = currentUser?.id;
    }

    try {
      if (task) {
        await updateTask(task.id, payload);
      } else {
        await addTask(payload);
      }
    } catch { }
    onClose();
  };

  const saveAndNotify = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    const payload: any = {
      title: trimmed,
      dueDate: dueDate || null,
      priority,
      status,
      projectId: projectId || '',
      assignedTo: assignee || currentUser?.id,
    };

    if (!task) {
      payload.createdBy = currentUser?.id;
    }

    try {
      if (task) {
        await updateTask(task.id, payload);
      } else {
        await addTask(payload);
      }
    } catch { }

    const a: any = findAssignee();
    const phone = formatWhatsappPhone(a?.phone);
    if (phone) {
      const msg = `${task ? 'Task Updated' : 'New Task Assigned'}\nTitle: ${trimmed}\nPriority: ${priorityLabel(priority)}\nDue: ${dueDate || 'Not set'}`;
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
      try { window.open(url, '_blank'); } catch { }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[11000] pointer-events-none">
      <div className="absolute inset-0 bg-transparent pointer-events-auto" onClick={onClose} aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-[11001] p-4 pointer-events-auto">
        <div className="mx-auto max-w-xl bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 relative overflow-visible">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="text-sm font-medium">{task ? 'Edit Task' : 'Create Task'}</div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="px-4 pb-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Submit report by Thursday p1"
              className="w-full bg-white text-slate-900 placeholder-slate-400 rounded-xl px-3 py-3 text-sm border border-slate-300"
            />

            {/* Chips Container - Scrollable Horizontally */}
            <div
              className="mt-3 flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              onScroll={closeMenus}
            >
              {/* Assignee */}
              <div className="relative flex-shrink-0" ref={assigneeRef}>
                <button
                  onClick={() => { closeMenus(); setShowAssignee((v) => !v); }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 min-w-0"
                  style={{ maxWidth: '160px' }}
                >
                  {(() => {
                    const a: any = findAssignee();
                    if (a?.photoUrl) {
                      return <img src={a.photoUrl} alt="avatar" className="w-5 h-5 rounded-full object-cover flex-shrink-0" />
                    }
                    if (a?.fullName || a?.name) {
                      return <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold flex-shrink-0">{getInitials(a.fullName || a.name)}</span>
                    }
                    return <User className="w-4 h-4 flex-shrink-0" />
                  })()}
                  <span className="truncate">{(findAssignee() as any)?.fullName || (findAssignee() as any)?.name || 'Assign'}</span>
                </button>
                {showAssignee && (
                  <div
                    className="w-64 bg-white border border-slate-300 rounded-lg shadow-xl overflow-y-auto"
                    style={{ ...getDropdownStyle(assigneeRef), maxHeight: '240px' }}
                  >
                    <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                      Users
                    </div>
                    {activeUsers.filter((u: any) => !u.role || u.role !== 'Team Member').map((u: any) => (
                      <button
                        key={u.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setAssignee(u.id); setShowAssignee(false); }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-800 border-b border-slate-50 last:border-0"
                      >
                        {u.photoUrl ? (
                          <img src={u.photoUrl} alt="avatar" className="w-5 h-5 rounded-full object-cover" />
                        ) : (
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold">{getInitials(u.fullName || u.name || u.username || u.email)}</span>
                        )}
                        <span className="truncate">{u.fullName || u.name || u.username || u.email}</span>
                      </button>
                    ))}
                    {activeUsers.some((u: any) => u.role === 'Team Member') && (
                      <>
                        <div className="px-3 py-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border-y border-slate-100 mt-1">
                          Team Members
                        </div>
                        {activeUsers.filter((u: any) => u.role === 'Team Member').map((u: any) => (
                          <button
                            key={u.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => { setAssignee(u.id); setShowAssignee(false); }}
                            className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-800 border-b border-slate-50 last:border-0"
                          >
                            {u.photoUrl ? (
                              <img src={u.photoUrl} alt="avatar" className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-xs font-semibold">{getInitials(u.fullName || u.name)}</span>
                            )}
                            <span className="truncate">{u.fullName || u.name}</span>
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Date */}
              <button
                ref={dateRef}
                onClick={() => { closeMenus(); setShowInlineCal((v) => !v); }}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 min-w-0 flex-shrink-0"
              >
                <CalendarDays className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{dueDate ? formatShortDate(dueDate) : 'Date'}</span>
              </button>
              {showInlineCal && (
                <div style={getDropdownStyle(dateRef)}>
                  <InlineCalendar
                    value={dueDate}
                    minDate={new Date().toISOString().split('T')[0]}
                    onPick={(val) => { setDueDate(val); setShowInlineCal(false); }}
                  />
                </div>
              )}

              {/* Priority */}
              <div className="relative flex-shrink-0" ref={priorityRef}>
                <button
                  onClick={() => { closeMenus(); setShowPriority((v) => !v); }}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 min-w-0 w-full truncate"
                  style={{ maxWidth: '140px' }}
                >
                  <Flag className="w-4 h-4 flex-shrink-0" style={{ color: priorityColor(priority) }} />
                  <span className="truncate">{priorityLabel(priority)}</span>
                </button>
                {showPriority && (
                  <div
                    className="w-40 bg-white border border-slate-300 rounded-lg shadow-xl"
                    style={getDropdownStyle(priorityRef)}
                  >
                    {['Urgent', 'High', 'Medium', 'Low'].map((p: any) => (
                      <button
                        key={p}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setPriority(p); setShowPriority(false); }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Flag className="w-4 h-4" style={{ color: priorityColor(p) }} /> {priorityLabel(p)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Project Selection */}
              <div className="relative flex-shrink-0" ref={projectRef}>
                <button
                  onClick={() => { closeMenus(); setShowProject((v) => !v); }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-700 text-sm hover:bg-slate-50 w-full truncate"
                  style={{ maxWidth: '180px' }}
                >
                  <Folder className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{getProjectName()}</span>
                </button>
                {showProject && (
                  <div
                    className="w-60 bg-white border border-slate-300 rounded-lg shadow-xl max-h-56 overflow-y-auto"
                    style={getDropdownStyle(projectRef)}
                  >
                    <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => { setProjectId(''); setShowProject(false); }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-800"
                    >
                      No Project
                    </button>
                    {activeProjects.map((p) => (
                      <button
                        key={p.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => { setProjectId(p.id); setShowProject(false); }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-slate-800 truncate"
                      >
                        {p.projectName}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {(showAssignee || showInlineCal || showProject || showPriority) && (
                <div className="fixed inset-0 z-[9998]" onClick={closeMenus} aria-hidden="true" />
              )}
            </div>

          </div>
          <div className="px-4 pb-4">
            <div className="flex items-center gap-2">
              <button onClick={saveAndNotify} className="w-1/2 px-4 py-3 rounded-lg bg-emerald-600 text-white font-medium">{task ? 'Update & Notify' : 'Save & Notify'}</button>
              <button onClick={save} className="w-1/2 px-4 py-3 rounded-lg bg-slate-800 text-white font-medium">{task ? 'Update' : 'Save'}</button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(8px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
