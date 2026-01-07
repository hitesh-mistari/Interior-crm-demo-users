import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import useEscapeKey from '../hooks/useEscapeKey';
import { useApp } from '../context/AppContext';
import NumericInput from './NumericInput';

interface ProductModalProps {
  productId: string | null;
  onClose: () => void;
}

export default function ProductModal({ productId, onClose }: ProductModalProps) {
  useEscapeKey(onClose);
  const { products, addProduct, updateProduct, hasPermission } = useApp();
  const isEditing = !!productId;
  const canCreate = hasPermission('products', 'create');
  const canUpdate = hasPermission('products', 'update');

  const existing = useMemo(() => products.find((p) => p.id === productId) || null, [products, productId]);

  const [name, setName] = useState(existing?.name || '');
  const [category, setCategory] = useState(existing?.category || '');
  const [unit, setUnit] = useState(existing?.unit || 'Sq.ft');
  const [defaultRate, setDefaultRate] = useState<number | null>(existing ? ((existing as any).defaultRate ?? (existing as any).default_rate ?? null) : null);

  const [description, setDescription] = useState(existing?.description || '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existing) {
      setName(existing.name || '');
      setCategory(existing.category || '');
      setUnit(existing.unit || 'Sq.ft');
      setDefaultRate((existing as any).defaultRate ?? (existing as any).default_rate ?? null);
    }
  }, [existing]);

  const units = ['Sq.ft', 'Sq.m', 'Piece', 'Set', 'Unit', 'Running ft', 'Lump Sum'];

  const CATEGORIES = [
    "Modular Furniture",
    "Modular Kitchen",
    "Doors & Shutters",
    "POP & Ceiling Work",
    "Partitions & Space Division",
    "Fabrication & Grill Work",
    "Civil & Flooring Work",
    "Painting & Finishing",
    "Utilities & Accessories"
  ];

  const onSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!unit.trim()) {
      setError('Unit is required');
      return;
    }
    // NumericInput ensures numeric-only; allow blank as undefined
    if (isEditing && !canUpdate) {
      setError('You do not have permission to update products');
      return;
    }
    if (!isEditing && !canCreate) {
      setError('You do not have permission to create products');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        category: category.trim() || undefined,
        unit: unit.trim(),
        defaultRate: defaultRate === null ? undefined : Number(defaultRate),
        description: description.trim() || undefined,
      };

      if (isEditing && existing) {
        await updateProduct(existing.id, payload);
      } else {
        await addProduct(payload);
      }
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Failed to save product');
    } finally {
      setSaving(false);
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

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 shrink-0">
          <h3 className="text-xl font-semibold text-slate-800">
            {isEditing ? 'Edit Product' : 'Add Product'}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        {/* Scrollable Content */}
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 min-h-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="e.g., Concrete, Consultation"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              >
                <option value="">Select Category</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Unit *</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
              >
                {units.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Default Rate</label>
              <NumericInput
                value={defaultRate}
                onChange={(val) => setDefaultRate(val)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="e.g., 1,000"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:border-transparent outline-none"
                placeholder="Optional notes"
                rows={3}
              />
            </div>
            {error && (
              <div className="md:col-span-2">
                <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex gap-3 pb-[calc(1rem+env(safe-area-inset-bottom))] z-10">
          <button
            onClick={onClose}
            className="flex-1 md:flex-none px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-white hover:border-slate-400 transition-all font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={saving || (!isEditing && !canCreate) || (isEditing && !canUpdate)}
            className="flex-1 md:flex-none px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-900/10 active:scale-95 transform duration-100"
          >
            {saving ? 'Saving...' : isEditing ? 'Update Product' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  );
}
