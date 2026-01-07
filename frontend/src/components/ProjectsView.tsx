import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Filter, X } from 'lucide-react';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { useApp } from '../context/AppContext';
import { Project, ProjectStatus } from '../types';
import ProjectModal from './ProjectModal';
import { formatCurrency } from '../utils/formatters';
import ProjectDashboard from './ProjectDashboard';
import { formatLongDate } from '../utils/dates';
import PaginationControls from './PaginationControls';


export default function ProjectsView() {
  const { projects, deleteProject, quotations, hasPermission, payments } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'All'>('All');
  const [viewingQuotationId, setViewingQuotationId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; title: string } | null>(null);
  const [routeProjectId, setRouteProjectId] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Simple route handling for /projects/:id
  useEffect(() => {
    const applyRoute = () => {
      const path = window.location.pathname;
      const match = path.match(/^\/projects\/(.+)$/);
      setRouteProjectId(match ? decodeURIComponent(match[1]) : null);
    };
    applyRoute();
    const onPop = () => applyRoute();
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const openProjectDetails = (projectId: string) => {
    window.history.pushState({}, '', `/projects/${projectId}`);
    const event = new Event('popstate');
    window.dispatchEvent(event);
  };

  const closeProjectDetails = () => {
    window.history.pushState({}, '', `/projects`);
    const event = new Event('popstate');
    window.dispatchEvent(event);
  };

  const canCreate = hasPermission('projects', 'create');
  const canUpdate = hasPermission('projects', 'update');
  const canDelete = hasPermission('projects', 'delete');
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const name = project.projectName?.toLowerCase() ?? "";
      const client = project.clientName?.toLowerCase() ?? "";
      const type = project.projectType?.toLowerCase() ?? "";
      const search = searchTerm.toLowerCase();

      const matchesSearch =
        name.includes(search) ||
        client.includes(search) ||
        type.includes(search);

      const status = project.status ?? "";
      const matchesStatus =
        statusFilter === "All" ||
        status.toLowerCase() === statusFilter.toLowerCase();

      const notDeleted = !project.deleted;

      return matchesSearch && matchesStatus && notDeleted;
    });
  }, [projects, searchTerm, statusFilter]);


  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    const p = projects.find((x) => x.id === id);
    const label = p ? `${p.projectName} • ${p.clientName || ''}` : '';
    setConfirmDelete({ id, title: label });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
  };

  const viewingQuotation = viewingQuotationId
    ? quotations.find((q) => q.id === viewingQuotationId)
    : null;

  const fmtDate = (dateString: string) => formatLongDate(dateString);

  if (routeProjectId) {
    return (
      <ProjectDashboard projectId={routeProjectId} onClose={closeProjectDetails} />
    );
  }



  const totalItems = filteredProjects.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 p-[15px] sm:p-0">
      <div className="flex flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Projects</h2>
          <p className="text-slate-600 mt-1">{filteredProjects.length} total projects</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Project
          </button>
        )}
      </div>



      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
        <div className="flex flex-row gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search projects, clients, or types..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
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
                  {(['All', 'Ongoing', 'Completed', 'Cancelled'] as const).map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setStatusFilter(status === 'All' ? 'All' : status as ProjectStatus);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${statusFilter === status ? 'text-blue-600 font-medium bg-blue-50' : 'text-slate-700'
                        }`}
                    >
                      {status === 'All' ? 'All Status' : status}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 xl:grid-cols-3 lg:gap-6">
          {paginatedProjects.length === 0 ? (
            <div className="lg:col-span-2 xl:col-span-3 bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
              <p className="text-slate-500">No projects found. {canCreate && 'Create your first project to get started.'}</p>
            </div>
          ) : (
            paginatedProjects.map((project) => (
              <div
                key={project.id}
                className="bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-slate-800">
                        <button
                          className="hover:underline hover:text-slate-900"
                          onClick={() => openProjectDetails(project.id)}
                        >
                          {project.projectName}
                        </button>
                      </h3>
                      <p className="text-sm text-slate-600 mt-1">{project.clientName}</p>
                      <p className="text-sm text-slate-500 mt-0.5">{project.projectType}</p>
                    </div>
                    <span
                      className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${project.status === 'Ongoing'
                        ? 'bg-blue-100 text-blue-700'
                        : project.status === 'Completed'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                        }`}
                    >
                      {project.status}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Contact:</span>
                      <span className="font-medium text-slate-800">{project.clientContact}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Start Date:</span>
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 font-medium text-sm">
                        {fmtDate(project.startDate)}
                      </span>
                    </div>
                    {project.deadline && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-600">Deadline:</span>
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 font-medium text-sm">
                          {fmtDate(project.deadline)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-600">Project Amount:</span>
                      <span className="font-medium text-slate-800">
                        {formatCurrency(project.projectAmount ?? project.quotationAmount ?? 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Payments Received:</span>
                      <span className="font-medium text-slate-800">
                        {formatCurrency(
                          payments
                            .filter(p => p.projectId === project.id && !p.deleted)
                            .reduce((sum, p) => sum + (p.amount || 0), 0)
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
                    {(() => {
                      const totalTasks = project.totalTasks || 0;
                      const completedTasks = project.completedTasks || 0;
                      const completionPct = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

                      return (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="text-slate-600 text-sm">Tasks</div>
                            <div className="text-slate-800 text-sm font-medium">{completedTasks}/{totalTasks} ({Math.round(completionPct)}%)</div>
                          </div>
                          <div className="bg-slate-100 rounded-full h-2">
                            <div className="h-2 bg-green-600" style={{ width: `${completionPct}%` }} />
                          </div>

                        </>
                      );
                    })()}
                  </div>


                  {(canUpdate || canDelete) && (
                    <div className="flex gap-2 mt-4 pt-4 border-t border-slate-200">
                      {project.quotationId && (
                        <button
                          onClick={() => setViewingQuotationId(project.quotationId!)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
                        >
                          View Quote
                        </button>
                      )}
                      <button
                        onClick={() => openProjectDetails(project.id)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium"
                      >
                        View Details
                      </button>
                      {canUpdate && (
                        <button
                          onClick={() => handleEdit(project)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                        >
                          Edit
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={totalItems}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      {isModalOpen && (
        <ProjectModal project={editingProject} onClose={handleCloseModal} />
      )}

      <ConfirmDeleteModal
        open={!!confirmDelete}
        title="Delete Project"
        message="Are you sure you want to move this project to trash?"
        detail={confirmDelete?.title}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => { if (confirmDelete) { deleteProject(confirmDelete.id); setConfirmDelete(null); } }}
      />

      {viewingQuotation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">Quotation Details</h3>
              <button
                onClick={() => setViewingQuotationId(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Quotation Number
                  </label>
                  <p className="text-slate-800 font-semibold">{viewingQuotation.quotationNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Quotation Date
                  </label>
                  <p className="text-slate-800">{fmtDate(viewingQuotation.quotationDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Client Name
                  </label>
                  <p className="text-slate-800">{viewingQuotation.clientName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Project Name
                  </label>
                  <p className="text-slate-800">{viewingQuotation.projectName}</p>
                </div>
                {viewingQuotation.clientContact && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      Contact Email
                    </label>
                    <p className="text-slate-800">{viewingQuotation.clientContact}</p>
                  </div>
                )}
                {viewingQuotation.clientPhone && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">
                      Phone Number
                    </label>
                    <p className="text-slate-800">{viewingQuotation.clientPhone}</p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    Status
                  </label>
                  <span
                    className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${viewingQuotation.status === 'Draft'
                      ? 'bg-slate-100 text-slate-700'
                      : viewingQuotation.status === 'Sent'
                        ? 'bg-blue-100 text-blue-700'
                        : viewingQuotation.status === 'Approved'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                  >
                    {viewingQuotation.status}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-slate-800 mb-3">Items</h4>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Unit
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Rate
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {viewingQuotation.items.map((item: any) => (
                        <tr key={item.id}>
                          <td className="px-4 py-3 text-sm text-slate-800">{item.item}</td>
                          <td className="px-4 py-3 text-sm text-center text-slate-800">
                            {item.quantity}
                          </td>
                          <td className="px-4 py-3 text-sm text-center text-slate-800">{item.unit}</td>
                          <td className="px-4 py-3 text-sm text-right text-slate-800">
                            {formatCurrency(item.rate)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-slate-800">
                            {formatCurrency(item.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {viewingQuotation.additionalWork && viewingQuotation.additionalWork.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-slate-800 mb-3">Additional Work</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Item
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Qty
                          </th>
                          <th className="px-4 py-3 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Unit
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Rate
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider">
                            Amount
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {viewingQuotation.additionalWork.map((item: any) => (
                          <tr key={item.id}>
                            <td className="px-4 py-3 text-sm text-slate-800">{item.item}</td>
                            <td className="px-4 py-3 text-sm text-center text-slate-800">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-3 text-sm text-center text-slate-800">{item.unit}</td>
                            <td className="px-4 py-3 text-sm text-right text-slate-800">
                              {formatCurrency(item.rate)}
                            </td>
                            <td className="px-4 py-3 text-sm text-right font-semibold text-slate-800">
                              {formatCurrency(item.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="border-t border-slate-200 pt-4">
                <div className="flex justify-end space-y-2">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Subtotal:</span>
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(viewingQuotation.subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Tax ({viewingQuotation.taxPercent}%):</span>
                      <span className="font-semibold text-slate-800">
                        {formatCurrency(viewingQuotation.taxAmount)}
                      </span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t border-slate-200 pt-2">
                      <span className="text-slate-800">Total:</span>
                      <span className="text-slate-900">{formatCurrency(viewingQuotation.total)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {viewingQuotation.notes && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">Notes</label>
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
                    {viewingQuotation.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
