const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api";
const API_BASE = API_ENDPOINT.replace(/\/api$/, ""); // Root URL for images

import { useState, useMemo } from 'react';
import { X, Plus, Trash2, Upload, AlertTriangle, Image } from 'lucide-react';
import useEscapeKey from '../hooks/useEscapeKey';
import { useApp } from '../context/AppContext';
import { ExpenseItem, PaymentMode, Expense } from '../types';
import { logExpenseChange, saveExpenseVersionHistory } from '../utils/versionHistory';
import NumericInput from './NumericInput';
import { normalizeToIsoMinute, isFuture, isPast } from '../utils/date';

interface ExpenseModalProps {
  expense?: Expense | null;
  onClose: () => void;
}


const COMMON_EXPENSES = [
  'Cement',
  'Pipes',
  'Furniture',
  'Paint',
  'Tiles',
  'Electrical',
  'Plumbing',
  'Labor',
  'Transport',
  'Hardware',
  'Plywood',
  'Other',
];

export default function ExpenseModal({ expense, onClose }: ExpenseModalProps) {
  useEscapeKey(onClose);
  const { projects, addExpense, updateExpense, suppliers, expenses, currentUser, addNotification, teams } = useApp();

  // Get current system time (uses the browser's local timezone)
  const getIndianTime = () => {
    return new Date().toISOString();
  };

  const initialIso = normalizeToIsoMinute(expense?.expenseDate || getIndianTime());
  const [formData, setFormData] = useState({
    projectId: expense?.projectId || (projects.length > 0 ? projects[0].id : ''),
    title: expense?.title || '',
    amount: expense?.amount ?? null,
    expenseDate: initialIso.slice(0, 10),
    expenseTime: initialIso.slice(11, 16),
    notes: expense?.notes || '',
    paymentMode: (expense?.paymentMode || 'Cash') as PaymentMode,
    paymentStatus: (expense as any)?.paymentStatus || 'Unpaid',
  });
  const [items, setItems] = useState<ExpenseItem[]>(expense?.items || []);
  const [receiptImages, setReceiptImages] = useState<string[]>(expense?.receiptImages || []);

  // Expense type: 'supplier', 'team', or 'other'
  const [expenseType, setExpenseType] = useState<'supplier' | 'team' | 'other'>(
    expense?.teamMemberId ? 'team' : expense?.supplierId || expense?.tempSupplierName ? 'supplier' : 'other'
  );

  const [supplierId, setSupplierId] = useState<string>(expense?.supplierId || '');
  const [tempSupplierName, setTempSupplierName] = useState<string>(expense?.tempSupplierName || '');
  const [teamMemberId, setTeamMemberId] = useState<string>(expense?.teamMemberId || '');
  const [tempSupplierError, setTempSupplierError] = useState<string>('');
  const TEMP_OPTION_VALUE = 'OTHER';

  const tempNamesIndex = useMemo(() => {
    const idx = new Map<string, string>();
    expenses.forEach((e) => {
      const name = e.tempSupplierName?.trim();
      if (name) {
        const key = name.toLowerCase();
        if (!idx.has(key)) idx.set(key, name);
      }
    });
    return idx;
  }, [expenses]);

  const isEditMode = !!expense;
  const [showDetails, setShowDetails] = useState<boolean>(!!expense);

  const activeSuppliers = suppliers.filter((s) => !s.deleted);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectId) {
      alert('Please create a project first');
      return;
    }

    const totalAmount = items.length > 0
      ? items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0)
      : (formData.amount ?? 0);

    const combinedIsoMinute = normalizeToIsoMinute(`${formData.expenseDate}T${formData.expenseTime}`);
    if (isFuture(combinedIsoMinute)) {
      alert('Expense date/time cannot be in the future');
      return;
    }

    // Determine if using temporary supplier
    const useTempSupplier = supplierId === TEMP_OPTION_VALUE;
    const enteredTempName = tempSupplierName.trim();
    if (useTempSupplier) {
      if (enteredTempName.length < 3 || enteredTempName.length > 50) {
        setTempSupplierError('Name must be 3–50 characters');
        return;
      }
      const conflict = activeSuppliers.some(
        (s) => s.supplierName.trim().toLowerCase() === enteredTempName.toLowerCase()
      );
      if (conflict) {
        setTempSupplierError('This matches an existing supplier. Please select from the list.');
        return;
      }
      const existing = tempNamesIndex.get(enteredTempName.toLowerCase());
      if (existing) {
        setTempSupplierName(existing);
      }
      setTempSupplierError('');
    }

    const updatedData = {
      ...formData,
      amount: totalAmount,
      expenseDate: combinedIsoMinute,
      items: items.length > 0 ? items : undefined,
      receiptImages: receiptImages.length > 0 ? receiptImages : undefined,
      supplierId: expenseType === 'supplier' && !useTempSupplier ? (supplierId || undefined) : undefined,
      tempSupplierName: expenseType === 'supplier' && useTempSupplier ? (tempNamesIndex.get(enteredTempName.toLowerCase()) || enteredTempName) : undefined,
      teamMemberId: expenseType === 'team' ? (teamMemberId || undefined) : undefined,
    };

    if (isEditMode && expense && currentUser) {
      const isNonAdmin = currentUser.role !== 'admin';
      const currentCount = expense.editCount || 0;
      if (isNonAdmin && currentCount >= 3) {
        addNotification(
          `Expense edit limit reached for project: ${expense.projectId || 'unknown'}`
        );
        alert('You have reached the maximum edit limit for this expense.');
        return;
      }
      const changes = logExpenseChange(
        expense.id,
        expense,
        updatedData,
        currentUser.id,
        currentUser.username || 'Unknown'
      );
      if (changes.length > 0) {
        saveExpenseVersionHistory(expense.id, changes);
      }
      updateExpense(expense.id, updatedData);
    } else {
      addExpense(updatedData);
    }
    onClose();
  };

  const quickAddExpense = (title: string) => {
    setFormData({ ...formData, title });
  };

  const addItem = () => {
    const newItem: ExpenseItem = {
      id: Date.now().toString(),
      description: '',
      amount: 0,
    };
    setItems([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof ExpenseItem, value: string | number) => {
    setItems(items.map((item) =>
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const deleteItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    try {
      const form = new FormData();
      Array.from(files).forEach((file) => {
        form.append("images", file);
      });

      const res = await fetch(`${API_ENDPOINT}/expenses/upload`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to upload images");
      }

      const data = await res.json();

      // Add image URLs to state
      setReceiptImages((prev) => [...(prev || []), ...data.urls]);
    } catch (error) {
      console.error("Image upload error:", error);
      alert(`Failed to upload images: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };


  const removeImage = (index: number) => {
    setReceiptImages(receiptImages.filter((_, i) => i !== index));
  };

  const totalAmount = items.length > 0
    ? items.reduce((sum, item) => sum + item.amount, 0)
    : (formData.amount ?? 0);

  if (projects.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-slate-800">{isEditMode ? 'Edit Expense' : 'Add Expense'}</h3>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X className="w-5 h-5 text-slate-600" />
            </button>
          </div>
          <p className="text-slate-600 text-center py-8">
            Please create a project first before adding expenses.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex md:items-center items-end justify-center md:p-4 z-[9999] animate-in fade-in duration-200 !mt-0">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white w-full max-w-2xl md:rounded-2xl rounded-t-3xl shadow-2xl max-h-[90vh] md:max-h-[85vh] flex flex-col relative z-10 animate-in slide-in-from-bottom duration-300 md:slide-in-from-bottom-10">
        {/* Mobile Drag Handle */}
        <div className="md:hidden w-full flex items-center justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>

        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 shrink-0">
          <h3 className="text-xl font-semibold text-slate-800">{isEditMode ? 'Edit Expense' : 'Add Expense'}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          <form id="expense-form" onSubmit={handleSubmit} className="p-6 space-y-4 pb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Project *
              </label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                required
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projectName} - {project.clientName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Expense Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                placeholder="e.g., Pipes, Cement, Furniture"
                required
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {COMMON_EXPENSES.map((expense) => (
                  <button
                    key={expense}
                    type="button"
                    onClick={() => quickAddExpense(expense)}
                    className="px-3 py-1 text-sm bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200 transition-colors"
                  >
                    {expense}
                  </button>
                ))}
              </div>
            </div>

            {/* Expense Type Selector */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Expense Type
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExpenseType('supplier');
                    setTeamMemberId('');
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${expenseType === 'supplier'
                    ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                >
                  Supplier
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExpenseType('team');
                    setSupplierId('');
                    setTempSupplierName('');
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${expenseType === 'team'
                    ? 'border-green-500 bg-green-50 text-green-700 font-medium'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                >
                  Team
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setExpenseType('other');
                    setSupplierId('');
                    setTempSupplierName('');
                    setTeamMemberId('');
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg border-2 transition-all ${expenseType === 'other'
                    ? 'border-purple-500 bg-purple-50 text-purple-700 font-medium'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                >
                  Other Expense
                </button>
              </div>
            </div>

            {/* Team Member Dropdown (shown when Team is selected) */}
            {expenseType === 'team' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Team Member *
                </label>
                <select
                  value={teamMemberId}
                  onChange={(e) => setTeamMemberId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="">Select Team Member</option>
                  {teams
                    .filter((member) => !member.deleted && member.employmentStatus === 'Full-Time')
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} {member.skills && member.skills.length > 0 ? `- ${member.skills.join(', ')}` : ''}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Supplier Dropdown (shown when Supplier is selected) */}
            {expenseType === 'supplier' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Supplier (Optional)
                </label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                >
                  <option value="">No Supplier</option>
                  {activeSuppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.supplierName} {supplier.companyName ? `- ${supplier.companyName}` : ''}
                    </option>
                  ))}
                  <option value={TEMP_OPTION_VALUE}>Other (temporary)</option>
                </select>
                {supplierId === TEMP_OPTION_VALUE && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Temporary Supplier Name
                    </label>
                    <input
                      type="text"
                      value={tempSupplierName}
                      onChange={(e) => setTempSupplierName(e.target.value)}
                      onBlur={() => {
                        const val = tempSupplierName.trim();
                        if (val.length > 0) {
                          const existing = tempNamesIndex.get(val.toLowerCase());
                          if (existing) setTempSupplierName(existing);
                        }
                      }}
                      minLength={3}
                      maxLength={50}
                      placeholder="Enter supplier name (3–50 characters)"
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                      required
                    />
                    <div className="mt-2 text-xs text-slate-500">
                      This temporary supplier will not be added to the database.
                    </div>
                    {tempSupplierError && (
                      <div className="mt-2 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-50 text-red-700">
                        <AlertTriangle className="w-3 h-3" />
                        {tempSupplierError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Expense Items
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              {items.length > 0 && (
                <div className="space-y-2 mb-4">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-2">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                        placeholder="Item description"
                        required
                      />
                      <NumericInput
                        value={item.amount === 0 ? null : item.amount}
                        onChange={(val) => updateItem(item.id, 'amount', val ?? 0)}
                        className="w-32 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                        placeholder="Amount"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => deleteItem(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <div className="text-right font-semibold text-slate-800">
                    Total: ₹{totalAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              )}
            </div>

            {items.length === 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Amount (₹) *
                </label>
                <NumericInput
                  value={formData.amount}
                  onChange={(val) => setFormData({ ...formData, amount: val })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                  placeholder="Amount"
                  required
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-sm text-slate-600">More details</span>
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="px-2 py-1 text-xs border border-slate-300 rounded hover:bg-slate-50"
              >
                {showDetails ? 'Hide' : 'Show'}
              </button>
            </div>

            {showDetails && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Receipt Images (Optional)
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-slate-400 transition-colors">
                      <Upload className="w-5 h-5 mr-2 text-slate-500" />
                      <span className="text-sm text-slate-600">Upload receipt images</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>

                    {receiptImages.length > 0 && (
                      <div className="space-y-3 mt-3">
                        {receiptImages.map((image, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg group">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg overflow-hidden bg-white border border-slate-200 flex-shrink-0">
                                <img
                                  src={`${API_BASE}${image.startsWith('/') ? image : `/${image}`}`}
                                  alt={`Receipt ${index + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="text-sm text-slate-600 truncate max-w-[150px] sm:max-w-[200px]">
                                Receipt {index + 1}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <a
                                href={`${API_BASE}${image}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                                title="View Image"
                              >
                                <Image className="w-4 h-4" />
                              </a>
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="p-2 bg-white border border-slate-200 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors"
                                title="Delete Image"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                    rows={3}
                    placeholder="Additional details about this expense"
                  />
                </div>
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Date & Time *</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                    required
                  />
                  <input
                    type="time"
                    value={formData.expenseTime}
                    onChange={(e) => setFormData({ ...formData, expenseTime: e.target.value })}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                    required
                  />
                </div>
                {isPast(normalizeToIsoMinute(`${formData.expenseDate}T${formData.expenseTime}`)) && (
                  <div className="mt-2 inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-700">
                    <AlertTriangle className="w-3 h-3" />
                    Backdated entry
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Mode *
                </label>
                <select
                  value={formData.paymentMode}
                  onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as PaymentMode })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="Cash">Cash</option>
                  <option value="Cheque">Cheque</option>
                  <option value="UPI">UPI</option>
                  <option value="Banking">Banking</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Payment Status *
                </label>
                <select
                  value={formData.paymentStatus}
                  onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
                  required
                >
                  <option value="Unpaid">Unpaid</option>
                  <option value="Paid">Paid</option>
                </select>
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
              form="expense-form"
              className="flex-1 px-4 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors font-medium shadow-lg shadow-slate-900/10"
            >
              {isEditMode ? 'Update Expense' : 'Add Expense'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
