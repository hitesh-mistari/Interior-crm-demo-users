import { useMemo, useState } from 'react';
import { Plus, Search, Filter, Edit3, Trash2, RefreshCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import ProductModal from './ProductModal';
import PaginationControls from './PaginationControls';
import { formatCurrency } from '../utils/formatters';

type CategoryFilter = 'All' | string;

export default function ProductsView() {
  const { products, hasPermission, deleteProduct, restoreProduct } = useApp();
  const [showModal, setShowModal] = useState<{ id: string | null } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('All');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const canAdd = hasPermission('products', 'create');
  const canUpdate = hasPermission('products', 'update');
  const canDelete = hasPermission('products', 'delete');

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => { if (p.category) set.add(p.category); });
    return Array.from(set).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (categoryFilter !== 'All' && p.category !== categoryFilter) return false;
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        const tags = (p.tags || []).join(' ').toLowerCase();
        return (
          p.name.toLowerCase().includes(term) ||
          (p.sku || '').toLowerCase().includes(term) ||
          (p.description || '').toLowerCase().includes(term) ||
          tags.includes(term)
        );
      })
      .sort((a, b) => (a.deleted === b.deleted ? 0 : a.deleted ? 1 : -1));
  }, [products, categoryFilter, searchTerm]);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Reset page when filters change
  useMemo(() => {
    setCurrentPage(1);
  }, [categoryFilter, searchTerm]);

  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const openAddModal = () => setShowModal({ id: null });
  const openEditModal = (id: string) => setShowModal({ id });
  const closeModal = () => setShowModal(null);


  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-800">Products</h2>
        {canAdd && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700"
          >
            <Plus className="w-4 h-4" /> Add Product
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 mb-4">
        <div className="flex flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name, SKU, tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="relative">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-2 rounded-lg border transition-colors ${categoryFilter !== 'All'
                ? 'bg-slate-100 border-slate-300 text-slate-900'
                : 'bg-white border-transparent hover:bg-slate-50 text-slate-400'
                }`}
              title="Filter by category"
            >
              <Filter className="w-5 h-5" />
            </button>

            {isFilterOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsFilterOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20 animate-in fade-in zoom-in-95 duration-100 max-h-64 overflow-y-auto">
                  <button
                    onClick={() => {
                      setCategoryFilter('All');
                      setIsFilterOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${categoryFilter === 'All' ? 'text-blue-600 font-medium bg-blue-50' : 'text-slate-700'
                      }`}
                  >
                    All Categories
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => {
                        setCategoryFilter(cat);
                        setIsFilterOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors truncate ${categoryFilter === cat ? 'text-blue-600 font-medium bg-blue-50' : 'text-slate-700'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
            <p className="text-slate-500">No products found. {canAdd && 'Add your first product to get started.'}</p>
          </div>
        ) : (
          paginatedProducts.map((p) => (
            <div key={p.id} className={`bg-white rounded-lg shadow-sm border ${p.deleted ? 'border-red-200' : 'border-slate-200'} p-4`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">{p.name}</h3>
                  <p className="text-sm text-slate-500">{p.category || 'Uncategorized'} • {p.unit}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-500">Default Rate</p>
                  <p className="text-base font-medium text-slate-800">{(p as any).defaultRate || (p as any).default_rate ? formatCurrency((p as any).defaultRate || (p as any).default_rate) : '-'}</p>
                </div>
              </div>
              {(p.sku || p.tags?.length || p.description) && (
                <div className="mt-3 text-sm text-slate-600">
                  {p.sku && <p>SKU: {p.sku}</p>}
                  {p.tags && p.tags.length > 0 && (
                    <p>Tags: {p.tags.join(', ')}</p>
                  )}
                  {p.description && <p className="line-clamp-2">{p.description}</p>}
                </div>
              )}
              <div className="mt-4 flex items-center justify-end gap-2">
                {canUpdate && (
                  <button
                    onClick={() => openEditModal(p.id)}
                    className="inline-flex items-center gap-1 px-3 py-2 text-slate-700 border border-slate-300 rounded hover:bg-slate-50"
                  >
                    <Edit3 className="w-4 h-4" /> Edit
                  </button>
                )}
                {p.deleted ? (
                  canUpdate && (
                    <button
                      onClick={() => restoreProduct(p.id)}
                      className="inline-flex items-center gap-1 px-3 py-2 text-green-700 border border-green-300 rounded hover:bg-green-50"
                    >
                      <RefreshCcw className="w-4 h-4" /> Restore
                    </button>
                  )
                ) : (
                  canDelete && (
                    <button
                      onClick={() => deleteProduct(p.id)}
                      className="inline-flex items-center gap-1 px-3 py-2 text-red-700 border border-red-300 rounded hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  )
                )}
              </div>
            </div>
          ))
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

      {showModal && (
        <ProductModal onClose={closeModal} productId={showModal.id} />
      )}
    </div>
  );
}
