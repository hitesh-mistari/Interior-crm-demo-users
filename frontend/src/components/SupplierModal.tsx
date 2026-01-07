import { useState } from 'react';
import { X } from 'lucide-react';
import useEscapeKey from '../hooks/useEscapeKey';
import { useApp } from '../context/AppContext';

interface SupplierModalProps {
  onClose: () => void;
  supplierId?: string | null;
}

const SUPPLIER_CATEGORIES = [
  'Wood',
  'Electrical',
  'Furniture',
  'Plumbing',
  'Paint',
  'Hardware',
  'Tiles',
  'Lighting',
  'Fabric',
  'Other',
];

export default function SupplierModal({ onClose, supplierId }: SupplierModalProps) {
  useEscapeKey(onClose);
  const { addSupplier, updateSupplier, suppliers } = useApp();
  const existingSupplier = supplierId
    ? suppliers.find((s) => s.id === supplierId)
    : null;

  const [formData, setFormData] = useState({
    supplierName: existingSupplier?.supplierName || '',
    companyName: existingSupplier?.companyName || '',
    phone: existingSupplier?.phone || '',
    alternatePhone: existingSupplier?.alternatePhone || '',
    address: existingSupplier?.address || '',
    gstNumber: existingSupplier?.gstNumber || '',
    category: existingSupplier?.category || '',
    notes: existingSupplier?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (supplierId) {
      updateSupplier(supplierId, formData);
    } else {
      addSupplier(formData);
    }

    onClose();
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
            {supplierId ? 'Edit Supplier' : 'Add New Supplier'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">
          <form id="supplier-form" onSubmit={handleSubmit} className="p-6 space-y-4 pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Supplier Name *
                </label>
                <input
                  type="text"
                  value={formData.supplierName}
                  onChange={(e) =>
                    setFormData({ ...formData, supplierName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  placeholder="e.g., Rajesh Kumar"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  placeholder="e.g., Kumar Furniture Mart"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  placeholder="+91 98765 43210"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Alternate Number
                </label>
                <input
                  type="tel"
                  value={formData.alternatePhone}
                  onChange={(e) =>
                    setFormData({ ...formData, alternatePhone: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  placeholder="+91 98765 43211"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                rows={2}
                placeholder="Full address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  GST Number
                </label>
                <input
                  type="text"
                  value={formData.gstNumber}
                  onChange={(e) =>
                    setFormData({ ...formData, gstNumber: e.target.value.toUpperCase() })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                  placeholder="27AABCU9603R1ZM"
                  maxLength={15}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Category
                </label>
                <select
                  value={SUPPLIER_CATEGORIES.includes(formData.category) ? formData.category : (formData.category ? 'Other' : '')}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'Other') {
                      if (SUPPLIER_CATEGORIES.includes(formData.category)) {
                        setFormData({ ...formData, category: '' });
                      }
                    } else {
                      setFormData({ ...formData, category: val });
                    }
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                >
                  <option value="">Select Category</option>
                  {SUPPLIER_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                {((!SUPPLIER_CATEGORIES.includes(formData.category) && formData.category !== '') || formData.category === 'Other') && (
                  <div className="mt-2">
                    <input
                      type="text"
                      value={formData.category === 'Other' ? '' : formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value || 'Other' })}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                      placeholder="Enter category name"
                      autoFocus
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Notes / Comments
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                rows={3}
                placeholder="Any additional notes about this supplier..."
              />
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
              form="supplier-form"
              className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium shadow-lg shadow-slate-900/10"
            >
              {supplierId ? 'Update Supplier' : 'Add Supplier'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
