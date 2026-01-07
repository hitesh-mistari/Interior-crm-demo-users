import { X, FileText, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import useEscapeKey from '../hooks/useEscapeKey';
import { useState } from 'react';
import NumericInput from './NumericInput';
import { formatLongDate } from '../utils/dates';

interface MaterialReportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MaterialReportModal({ isOpen, onClose }: MaterialReportModalProps) {
  useEscapeKey(onClose, isOpen);
  const { projects, materials, expenses, addMaterial, deleteMaterial } = useApp();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('Sq.ft');
  const [rate, setRate] = useState(0);
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]);
  const [vendor, setVendor] = useState('');

  if (!isOpen) return null;

  const projectMaterials = materials.filter((m) => m.projectId === selectedProjectId);
  const projectExpenses = expenses.filter((e) => e.projectId === selectedProjectId);
  const project = projects.find((p) => p.id === selectedProjectId);

  const totalMaterialCost = projectMaterials.reduce((sum, m) => sum + m.amount, 0);
  const totalExpenses = projectExpenses.reduce((sum, e) => sum + e.amount, 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    addMaterial({
      projectId: selectedProjectId,
      itemName,
      quantity,
      unit,
      rate,
      amount: quantity * rate,
      purchaseDate,
      vendor: vendor || undefined,
    });
    setItemName('');
    setQuantity(1);
    setRate(0);
    setVendor('');
    setShowAddForm(false);
  };

  const handleDelete = (materialId: string) => {
    if (window.confirm('Are you sure you want to delete this material?')) {
      deleteMaterial(materialId);
    }
  };

  const generatePDF = () => {
    if (!project) return;

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Material Report - ${project.projectName}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
          .company-name { font-size: 24px; font-weight: bold; color: #1e293b; margin-bottom: 5px; }
          .company-tagline { font-size: 14px; color: #64748b; }
          .report-title { font-size: 20px; font-weight: bold; margin-bottom: 20px; color: #1e293b; }
          .project-details { margin-bottom: 30px; background-color: #f8fafc; padding: 15px; border-radius: 8px; }
          .project-details table { width: 100%; }
          .project-details td { padding: 5px; }
          .section-title { font-size: 16px; font-weight: bold; margin-top: 30px; margin-bottom: 15px; color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px; }
          .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          .items-table th { background-color: #1e293b; color: white; padding: 10px; text-align: left; font-size: 12px; }
          .items-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
          .items-table tr:hover { background-color: #f8fafc; }
          .totals { float: right; width: 300px; background-color: #f1f5f9; padding: 15px; border-radius: 8px; }
          .totals table { width: 100%; }
          .totals td { padding: 8px; }
          .total-row { font-weight: bold; font-size: 16px; border-top: 2px solid #1e293b; }
          .footer { margin-top: 50px; text-align: center; color: #64748b; font-size: 12px; }
          @media print {
            body { padding: 20px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-name">Artistic Engineers</div>
          <div class="company-tagline">Interior Design & Management</div>
        </div>

        <div class="report-title">Site-wise Material Purchase Report</div>

        <div class="project-details">
          <table>
            <tr>
              <td><strong>Project:</strong> ${project.projectName}</td>
              <td style="text-align: right;"><strong>Client:</strong> ${project.clientName}</td>
            </tr>
            <tr>
              <td><strong>Project Type:</strong> ${project.projectType}</td>
              <td style="text-align: right;"><strong>Status:</strong> ${project.status}</td>
            </tr>
            <tr>
              <td><strong>Start Date:</strong> ${formatLongDate(project.startDate)}</td>
              <td style="text-align: right;"><strong>Report Date:</strong> ${formatLongDate(new Date())}</td>
            </tr>
          </table>
        </div>

        ${projectMaterials.length > 0 ? `
          <div class="section-title">Materials Purchased</div>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 25%;">Item Name</th>
                <th style="width: 10%;">Qty</th>
                <th style="width: 10%;">Unit</th>
                <th style="width: 15%;">Rate</th>
                <th style="width: 15%;">Amount</th>
                <th style="width: 10%;">Date</th>
                <th style="width: 10%;">Vendor</th>
              </tr>
            </thead>
            <tbody>
              ${projectMaterials.map((material, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${material.itemName}</td>
                  <td>${material.quantity}</td>
                  <td>${material.unit}</td>
                  <td>${formatCurrency(material.rate)}</td>
                  <td>${formatCurrency(material.amount)}</td>
                  <td>${formatLongDate(material.purchaseDate)}</td>
                  <td>${material.vendor || '-'}</td>
                </tr>
              `).join('')}
              <tr style="background-color: #f1f5f9; font-weight: bold;">
                <td colspan="5" style="text-align: right;">Total Material Cost:</td>
                <td colspan="3">${formatCurrency(totalMaterialCost)}</td>
              </tr>
            </tbody>
          </table>
        ` : '<p style="color: #64748b;">No materials recorded for this project.</p>'}

        ${projectExpenses.length > 0 ? `
          <div class="section-title">Other Expenses</div>
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 40%;">Title</th>
                <th style="width: 20%;">Amount</th>
                <th style="width: 15%;">Date</th>
                <th style="width: 20%;">Notes</th>
              </tr>
            </thead>
            <tbody>
              ${projectExpenses.map((expense, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${expense.title}</td>
                  <td>${formatCurrency(expense.amount)}</td>
                  <td>${formatLongDate(expense.expenseDate)}</td>
                  <td>${expense.notes || '-'}</td>
                </tr>
              `).join('')}
              <tr style="background-color: #f1f5f9; font-weight: bold;">
                <td colspan="2" style="text-align: right;">Total Expenses:</td>
                <td colspan="3">${formatCurrency(totalExpenses)}</td>
              </tr>
            </tbody>
          </table>
        ` : ''}

        <div style="clear: both; margin-top: 30px;"></div>

        <div class="totals">
          <table>
            <tr>
              <td>Material Cost:</td>
              <td style="text-align: right;">${formatCurrency(totalMaterialCost)}</td>
            </tr>
            <tr>
              <td>Other Expenses:</td>
              <td style="text-align: right;">${formatCurrency(totalExpenses)}</td>
            </tr>
            <tr class="total-row">
              <td>Total Project Cost:</td>
              <td style="text-align: right;">${formatCurrency(totalMaterialCost + totalExpenses)}</td>
            </tr>
          </table>
        </div>

        <div style="clear: both;"></div>

        <div class="footer">
          <p>This is a computer-generated report from Artistic Engineers</p>
          <p>Report generated on ${formatLongDate(new Date())} at ${new Date().toLocaleTimeString('en-IN')}</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex md:items-center items-end justify-center md:p-4 z-[9999] animate-in fade-in duration-200 !mt-0">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white w-full max-w-5xl md:rounded-2xl rounded-t-3xl shadow-2xl max-h-[90vh] md:max-h-[85vh] flex flex-col relative z-10 animate-in slide-in-from-bottom duration-300 md:slide-in-from-bottom-10">
        {/* Mobile Drag Handle */}
        <div className="md:hidden w-full flex items-center justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-xl font-bold text-slate-800">Site-wise Material Report</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 min-h-0">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Select Project *
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
            >
              <option value="">Choose a project...</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.projectName} - {project.clientName}
                </option>
              ))}
            </select>
          </div>

          {selectedProjectId && project && (
            <>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <h3 className="font-semibold text-slate-800 mb-2">Project Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Client:</span>
                    <span className="ml-2 font-medium text-slate-900">{project.clientName}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Type:</span>
                    <span className="ml-2 font-medium text-slate-900">{project.projectType}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Status:</span>
                    <span className="ml-2 font-medium text-slate-900">{project.status}</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Start Date:</span>
                    <span className="ml-2 font-medium text-slate-900">
                      {formatLongDate(project.startDate)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-slate-800">Materials</h3>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Material
                  </button>
                </div>

                {showAddForm && (
                  <form onSubmit={handleAddMaterial} className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Item Name *
                        </label>
                        <input
                          type="text"
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none text-sm"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none text-sm"
                          step="0.01"
                          min="0"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Unit *
                        </label>
                        <select
                          value={unit}
                          onChange={(e) => setUnit(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none text-sm"
                        >
                          <option value="Sq.ft">Sq.ft</option>
                          <option value="Sq.m">Sq.m</option>
                          <option value="Piece">Piece</option>
                          <option value="Kg">Kg</option>
                          <option value="Liter">Liter</option>
                          <option value="Box">Box</option>
                          <option value="Set">Set</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Rate *
                        </label>
                        <NumericInput
                          value={rate || null}
                          onChange={(val) => setRate(val ?? 0)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none text-sm"
                          placeholder="Rate"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Purchase Date *
                        </label>
                        <input
                          type="date"
                          value={purchaseDate}
                          onChange={(e) => setPurchaseDate(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none text-sm"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Vendor
                        </label>
                        <input
                          type="text"
                          value={vendor}
                          onChange={(e) => setVendor(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddForm(false)}
                        className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-medium text-sm"
                      >
                        Add Material
                      </button>
                    </div>
                  </form>
                )}

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full border-collapse">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">#</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Item</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Qty</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Unit</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Rate</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Vendor</th>
                        <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {projectMaterials.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-12 text-center text-slate-500 text-sm">
                            No materials recorded. Click "Add Material" to get started.
                          </td>
                        </tr>
                      ) : (
                        projectMaterials.map((material, index) => (
                          <tr key={material.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-slate-500">{index + 1}</td>
                            <td className="px-4 py-3 text-sm font-medium text-slate-800">{material.itemName}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{material.quantity}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{material.unit}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">{formatCurrency(material.rate)}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-800">{formatCurrency(material.amount)}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {formatLongDate(material.purchaseDate)}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{material.vendor || '-'}</td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => handleDelete(material.id)}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {projectMaterials.length > 0 && (
                  <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-end">
                    <div className="text-right">
                      <span className="text-sm font-medium text-slate-600 block">Total Material Cost</span>
                      <span className="text-xl font-bold text-slate-900">{formatCurrency(totalMaterialCost)}</span>
                    </div>
                  </div>
                )}
              </div>

              {projectExpenses.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 mb-4">Other Expenses</h3>
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">#</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Title</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Amount</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {projectExpenses.map((expense, index) => (
                          <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3 text-sm text-slate-500">{index + 1}</td>
                            <td className="px-4 py-3 text-sm font-medium text-slate-800">{expense.title}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-slate-800">{formatCurrency(expense.amount)}</td>
                            <td className="px-4 py-3 text-sm text-slate-600">
                              {formatLongDate(expense.expenseDate)}
                            </td>
                            <td className="px-4 py-3 text-sm text-slate-600">{expense.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 bg-slate-50 p-4 rounded-xl border border-slate-100 flex justify-end">
                    <div className="text-right">
                      <span className="text-sm font-medium text-slate-600 block">Total Expenses</span>
                      <span className="text-xl font-bold text-slate-900">{formatCurrency(totalExpenses)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl shadow-slate-900/10">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-medium opacity-90">Total Project Cost</span>
                  <span className="text-3xl font-bold">
                    {formatCurrency(totalMaterialCost + totalExpenses)}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        {selectedProjectId && project && (
          <div className="bg-white pt-4 border-t border-slate-100 px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-10 flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 md:flex-none px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
            >
              Close
            </button>
            <button
              onClick={generatePDF}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium shadow-lg shadow-slate-900/20"
            >
              <FileText className="w-5 h-5" />
              <span>Generate PDF</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
