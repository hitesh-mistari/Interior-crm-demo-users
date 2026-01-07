import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import useEscapeKey from '../hooks/useEscapeKey';
import { useApp } from '../context/AppContext';
import { Project, ProjectStatus } from '../types';
import NumericInput from './NumericInput';

interface ProjectModalProps {
  project: Project | null;
  onClose: () => void;
}

const PROJECT_TYPES = [
  'Hospital Interior',
  'Home Interior',
  'Kitchen Interior',
  'Office Interior',
  'Restaurant Interior',
  'Retail Store',
  'Hotel Interior',
  'Other',
];

// Convert ISO date → yyyy-MM-dd for input[type=date]
function toDateInputValue(dateStr?: string | null) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().split("T")[0];
}

export default function ProjectModal({ project, onClose }: ProjectModalProps) {
  useEscapeKey(onClose);
  const { addProject, updateProject } = useApp();

  const [formData, setFormData] = useState({
    projectName: "",
    clientName: "",
    clientContact: "",
    projectType: "Home Interior",
    startDate: new Date().toISOString().split("T")[0],
    deadline: "",
    projectAmount: null as number | null,
    orderCostToMe: undefined as number | null | undefined,

    // FIXED FIELD NAME HERE  ⬇⬇⬇
    expectedProfitPercentage: null as number | null,

    status: "Ongoing" as ProjectStatus,
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (project) {
      setFormData({
        projectName: project.projectName || "",
        clientName: project.clientName || "",
        clientContact: project.clientContact || "",
        projectType: project.projectType || "Home Interior",

        startDate: toDateInputValue(project.startDate),
        deadline: toDateInputValue(project.deadline),

        projectAmount: Number(project.projectAmount) || 0,
        orderCostToMe: project.orderCostToMe !== undefined
          ? Number(project.orderCostToMe)
          : undefined,

        // FIXED: use correct field from DB
        expectedProfitPercentage: Number(project.expectedProfitPercentage) || 0,

        status: project.status || "Ongoing",
      });
    }
  }, [project]);

  // Removed auto-calculation: Cost to Company is a predicted, editable value

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (project) {
        const updatePayload = { ...formData } as any;
        // Normalize date strings to YYYY-MM-DD or null
        updatePayload.startDate = updatePayload.startDate ? String(updatePayload.startDate).slice(0, 10) : null;
        updatePayload.deadline = updatePayload.deadline ? String(updatePayload.deadline).slice(0, 10) : null;
        if (updatePayload.orderCostToMe === undefined) delete updatePayload.orderCostToMe;
        await updateProject(project.id, updatePayload);
      } else {
        const createPayload = { ...formData } as any;
        createPayload.startDate = createPayload.startDate ? String(createPayload.startDate).slice(0, 10) : null;
        createPayload.deadline = createPayload.deadline ? String(createPayload.deadline).slice(0, 10) : null;
        if (createPayload.orderCostToMe === undefined) delete createPayload.orderCostToMe;
        await addProject(createPayload);
      }
    } catch (err) {
      console.error('Project save failed', err);
    } finally {
      setSubmitting(false);
      onClose();
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

        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 shrink-0">
          <h3 className="text-xl font-semibold text-slate-800">
            {project ? "Edit Project" : "New Project"}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          <form id="project-form" onSubmit={handleSubmit} className="p-6 space-y-4 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Project Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-2 text-slate-700">Project Name *</label>
                <input
                  type="text"
                  required
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  placeholder="Project name (e.g., Kitchen Modular)"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>

              {/* Client Name */}
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">Client Name *</label>
                <input
                  type="text"
                  required
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="Client full name (e.g., Mr. Verma)"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>

              {/* Client Contact */}
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">Contact (Phone) *</label>
                <input
                  type="tel"
                  required
                  value={formData.clientContact}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9+\-\s]/g, '');
                    setFormData({ ...formData, clientContact: val });
                  }}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>

              {/* Project Type */}
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">Project Type</label>
                <select
                  value={formData.projectType}
                  onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                >
                  {PROJECT_TYPES.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">Status *</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                >
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">Start Date *</label>
                <input
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">Deadline</label>
                <input
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                  placeholder="YYYY-MM-DD"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>

              {/* Project Amount */}
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">Project Amount (₹)</label>
                <NumericInput
                  value={formData.projectAmount}
                  onChange={(val) => setFormData({ ...formData, projectAmount: val })}
                  placeholder="Total amount (e.g., 120000)"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>


              {/* Expected Profit (%) */}
              <div>
                <label className="block text-sm font-medium mb-2 text-slate-700">Expected Profit (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={formData.expectedProfitPercentage ?? ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      expectedProfitPercentage: e.target.value ? Number(e.target.value) : null,
                    })
                  }
                  placeholder="e.g., 18"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none"
                />
              </div>

            </div>
          </form>
        </div>

        <div className="p-4 border-t border-slate-100 bg-white pb-[calc(1rem+env(safe-area-inset-bottom))] z-10">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="project-form"
              disabled={submitting}
              className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium disabled:opacity-60 shadow-lg shadow-slate-900/10"
            >
              {project ? "Update Project" : "Create Project"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
