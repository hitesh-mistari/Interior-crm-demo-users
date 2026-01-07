import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Calendar as CalendarIcon } from 'lucide-react';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import useEscapeKey from '../hooks/useEscapeKey';
import { useApp } from '../context/AppContext';
import { useSystemSettings } from '../context/SettingsContext';
import { QuotationItem } from '../types';
import NumericInput from './NumericInput';
import InlineCalendar from './InlineCalendar';

interface QuotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotationId?: string;
}

export default function QuotationModal({ isOpen, onClose, quotationId }: QuotationModalProps) {
  useEscapeKey(onClose, isOpen);
  const { quotations, addQuotation, updateQuotation, products, bankAccounts } = useApp();
  const { getSetting } = useSystemSettings();
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [projectName, setProjectName] = useState('');
  const [quotationNumber, setQuotationNumber] = useState('');
  const [quotationDate, setQuotationDate] = useState(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [additionalWork, setAdditionalWork] = useState<QuotationItem[]>([]);
  const [taxPercent, setTaxPercent] = useState(0);
  const [discountPercent, setDiscountPercent] = useState<number | null>(null);
  const [discountAmount, setDiscountAmount] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [includeBankDetails, setIncludeBankDetails] = useState<boolean>(false);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<string | undefined>(undefined);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const baseUnits = ['Sq.ft', 'Sq.m', 'Piece', 'Set', 'Unit', 'Running ft', 'Lump Sum'];
  const catalogUnits = Array.from(new Set([...(products || []).map(p => (p.unit || 'Unit'))]));
  const allUnits = Array.from(new Set([...baseUnits, ...catalogUnits]));

  const toneUrl = (import.meta.env.VITE_TONE_PATH as string) || '/tone2.wav';
  const playTone = () => {
    try {
      const a = new Audio(toneUrl);
      a.play().catch(() => { });
    } catch { }
  };

  useEffect(() => {
    if (quotationId) {
      const quotation = quotations.find((q) => q.id === quotationId);
      if (quotation) {
        setClientName(quotation.clientName);
        setClientPhone(quotation.clientPhone || '');
        setProjectName(quotation.projectName || '');
        setQuotationNumber(quotation.quotationNumber);
        setQuotationDate(quotation.quotationDate);
        setItems(quotation.items);
        setAdditionalWork(quotation.additionalWork || []);
        setDiscountPercent((quotation as any).discountPercent || null);
        setDiscountAmount((quotation as any).discountAmount || null);
        setTaxPercent(quotation.taxPercent);
        setNotes(quotation.notes || '');
        setIncludeBankDetails(!!quotation.includeBankDetails);
        setSelectedBankAccountId(quotation.bankAccountId);
      }
    } else {
      const nextNum = quotations.length + 1;
      setQuotationNumber(`QT-${new Date().getFullYear()}-${String(nextNum).padStart(4, '0')}`);
      setItems([{ id: Date.now().toString(), item: '', description: '', quantity: 1, unit: 'Sq.ft', rate: 0, amount: 0 }]);
      const defaultAccount = bankAccounts.find(b => b.isDefault) || bankAccounts[0];
      setSelectedBankAccountId(defaultAccount?.id);
    }
  }, [quotationId, quotations, bankAccounts]);

  const addItem = () => {
    const newItem: QuotationItem = { id: Date.now().toString(), item: '', description: '', quantity: 1, unit: 'Sq.ft', rate: 0, amount: 0 };
    setItems([...items, newItem]);
    playTone();
  };

  const addItemAfter = (afterId?: string) => {
    const newItem: QuotationItem = { id: Date.now().toString(), item: '', description: '', quantity: 1, unit: 'Sq.ft', rate: 0, amount: 0 };
    if (!afterId) setItems(prev => [...prev, newItem]);
    else setItems(prev => {
      const idx = prev.findIndex(i => i.id === afterId);
      if (idx === -1) return [...prev, newItem];
      return [...prev.slice(0, idx + 1), newItem, ...prev.slice(idx + 1)];
    });
    playTone();
  };

  const updateItem = (id: string, field: keyof QuotationItem, value: string | number) => {
    setItems(items.map((item) => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') updated.amount = Number(updated.quantity || 0) * Number(updated.rate || 0);
        return updated;
      }
      return item;
    }));
  };

  const deleteItem = (id: string) => setItems(items.filter((item) => item.id !== id));

  const applyProductToItem = (id: string, product: any) => {
    setItems(prev => prev.map(it => {
      if (it.id !== id) return it;
      const rawRate = product.defaultRate ?? product.default_rate;
      const parsedRate = typeof rawRate === 'number' ? rawRate : parseFloat(rawRate || '0');
      const nextRate = !isNaN(parsedRate) ? parsedRate : (it.rate ?? 0);
      return { ...it, item: product.name, unit: product.unit || it.unit, rate: nextRate, amount: Number(it.quantity || 0) * nextRate };
    }));
  };

  const applyProductToAdditionalWorkItem = (id: string, product: any) => {
    setAdditionalWork(prev => prev.map(it => {
      if (it.id !== id) return it;
      const rawRate = product.defaultRate ?? product.default_rate;
      const parsedRate = typeof rawRate === 'number' ? rawRate : parseFloat(rawRate || '0');
      const nextRate = !isNaN(parsedRate) ? parsedRate : (it.rate ?? 0);
      return { ...it, item: product.name, unit: product.unit || it.unit, rate: nextRate, amount: Number(it.quantity || 0) * nextRate };
    }));
  };

  const addAdditionalWorkItem = () => {
    const newItem: QuotationItem = { id: `aw-${Date.now()}`, item: '', description: '', quantity: 1, unit: 'Sq.ft', rate: 0, amount: 0 };
    setAdditionalWork([...additionalWork, newItem]);
    playTone();
  };

  const addAdditionalWorkItemAfter = () => {
    const newItem: QuotationItem = { id: `aw-${Date.now()}`, item: '', description: '', quantity: 1, unit: 'Sq.ft', rate: 0, amount: 0 };
    setAdditionalWork([...additionalWork, newItem]);
    playTone();
  };

  const updateAdditionalWorkItem = (id: string, field: keyof QuotationItem, value: string | number) => {
    setAdditionalWork(additionalWork.map((item) => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'rate') updated.amount = Number(updated.quantity || 0) * Number(updated.rate || 0);
        return updated;
      }
      return item;
    }));
  };

  const deleteAdditionalWorkItem = (id: string) => setAdditionalWork(additionalWork.filter((item) => item.id !== id));

  const itemsSubtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const additionalWorkSubtotal = additionalWork.reduce((sum, item) => sum + item.amount, 0);
  const subtotal = itemsSubtotal + additionalWorkSubtotal;
  const hasPercentDiscount = (discountPercent || 0) > 0;
  const hasFixedDiscount = (discountAmount || 0) > 0 && !hasPercentDiscount;
  const computedDiscount = hasPercentDiscount ? Math.min((subtotal * (discountPercent || 0)) / 100, subtotal) : (hasFixedDiscount ? Math.min(discountAmount || 0, subtotal) : 0);
  const netSubtotal = Math.max(0, subtotal - computedDiscount);
  const taxAmount = (netSubtotal * taxPercent) / 100;
  const total = netSubtotal + taxAmount;

  const discountError = (() => {
    if (discountPercent !== null && discountAmount !== null && discountPercent > 0 && discountAmount > 0) return 'Enter either Discount % or Discount Amount';
    if (discountPercent !== null && (discountPercent < 0 || discountPercent > 100)) return 'Discount % must be between 0 and 100';
    if (discountAmount !== null && discountAmount < 0) return 'Discount amount must be at least 0';
    if (discountAmount !== null && discountAmount > subtotal) return 'Discount amount cannot exceed subtotal';
    return null;
  })();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !projectName || items.length === 0) return;
    const quotationData = {
      clientName, clientPhone, projectName, quotationNumber, quotationDate, items,
      additionalWork: additionalWork.length > 0 ? additionalWork : undefined,
      subtotal, discountPercent: hasPercentDiscount ? discountPercent : 0, discountAmount: hasFixedDiscount ? discountAmount : 0,
      taxPercent, taxAmount, total, notes, includeBankDetails,
      bankAccountId: (includeBankDetails && selectedBankAccountId) ? selectedBankAccountId : undefined,
      status: quotationId ? (quotations.find(q => q.id === quotationId)?.status || 'Draft') : 'Draft',
    };

    if (discountError) {
      alert(discountError);
      return;
    }

    // Wait for the update/add to complete before closing
    if (quotationId) await updateQuotation(quotationId, quotationData);
    else await addQuotation(quotationData);

    onClose();
    resetForm();
  };

  const resetForm = () => {
    setClientName(''); setClientPhone(''); setProjectName(''); setItems([]); setAdditionalWork([]);
    setDiscountPercent(null); setDiscountAmount(null); setTaxPercent(0); setNotes('');
  };





  if (!isOpen) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex md:items-center items-end justify-center md:p-4 z-[9999] animate-in fade-in duration-200 !mt-0">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="bg-white w-full max-w-6xl md:rounded-2xl rounded-t-3xl shadow-2xl max-h-[90vh] md:max-h-[85vh] flex flex-col relative z-10 animate-in slide-in-from-bottom duration-300 md:slide-in-from-bottom-10">
        <div className="md:hidden w-full flex items-center justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full" />
        </div>
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 shrink-0">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-3">
            {quotationId ? 'Edit Quotation' : 'Create New Quotation'}
            {quotationNumber && (
              <span className="text-sm font-normal text-slate-500 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                #{quotationNumber}
              </span>
            )}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0">

          <form id="quotation-form" onSubmit={handleSubmit} className="p-4 sm:p-6" autoComplete="off">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Client Name *
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="Enter client name"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-autocomplete="none"
                  readOnly
                  onFocus={(e) => { try { (e.currentTarget as HTMLInputElement).readOnly = false; } catch { } }}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9+\-\s]/g, '');
                    setClientPhone(val);
                  }}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="Enter phone number"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-autocomplete="none"
                  inputMode="numeric"
                  name="q_client_phone"
                  readOnly
                  onFocus={(e) => { try { (e.currentTarget as HTMLInputElement).readOnly = false; } catch { } }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  placeholder="Enter project name"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-autocomplete="none"
                  name="q_project_name"
                  readOnly
                  onFocus={(e) => { try { (e.currentTarget as HTMLInputElement).readOnly = false; } catch { } }}
                  required
                />
              </div>



              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Date *
                </label>
                <div
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg flex items-center justify-between cursor-pointer hover:border-slate-400 focus-within:ring-2 focus-within:ring-slate-500 bg-white"
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  tabIndex={0}
                  onBlur={() => setTimeout(() => setShowDatePicker(false), 200)}
                >
                  <span className={`${quotationDate ? 'text-slate-800' : 'text-slate-400'}`}>
                    {quotationDate || 'Select Date'}
                  </span>
                  <CalendarIcon className="w-4 h-4 text-slate-400" />
                </div>

                {showDatePicker && (
                  <div className="absolute top-full left-0 mt-2 z-[100]" onMouseDown={(e) => e.preventDefault()}>
                    <InlineCalendar
                      value={quotationDate}
                      onPick={(val) => {
                        setQuotationDate(val);
                        setShowDatePicker(false);
                      }}
                      minDate={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-slate-800">Items</h3>
                <button
                  type="button"
                  onClick={addItem}
                  className="hidden md:flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm sm:text-base"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Item</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase align-top">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase align-top">Item</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase align-top">Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase align-top">Unit</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase align-top">Rate</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase align-top">Amount</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-slate-600 uppercase align-top">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={item.id} className="border-b border-slate-200">
                        <td className="px-3 py-2 text-slate-700 align-top">{index + 1}</td>
                        <td className="px-3 py-2 align-top" style={{ minWidth: '150px', maxWidth: '200px' }}>
                          <div className="relative">
                            <input
                              type="text"
                              value={item.item}
                              onChange={(e) => updateItem(item.id, 'item', e.target.value)}
                              onFocus={(e) => { setActiveItemId(item.id); try { (e.currentTarget as HTMLInputElement).readOnly = false; } catch { } }}
                              onBlur={() => setTimeout(() => setActiveItemId(prev => (prev === item.id ? null : prev)), 120)}
                              className="w-full px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500"
                              style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                              placeholder="Item name"
                              autoComplete="off"
                              autoCapitalize="off"
                              autoCorrect="off"
                              spellCheck={false}
                              aria-autocomplete="none"
                              name={`q_item_${item.id}`}
                              readOnly

                              required
                            />
                            {activeItemId === item.id && (products?.length || 0) > 0 && item.item.trim() ? (
                              <div className="fixed z-[100] mt-1 bg-white border border-slate-300 rounded-lg shadow-2xl max-w-md" style={{
                                top: `${(document.activeElement as HTMLElement)?.getBoundingClientRect().bottom + 4}px`,
                                left: `${(document.activeElement as HTMLElement)?.getBoundingClientRect().left}px`,
                                width: `${Math.max(300, (document.activeElement as HTMLElement)?.getBoundingClientRect().width || 300)}px`
                              }}>
                                {products
                                  .filter(p => {
                                    const term = item.item.toLowerCase();
                                    return (
                                      p.name.toLowerCase().includes(term) ||
                                      (p.sku || '').toLowerCase().includes(term) ||
                                      (p.category || '').toLowerCase().includes(term) ||
                                      (p.tags || []).some((t: string) => t.toLowerCase().includes(term))
                                    );
                                  })
                                  .slice(0, 6)
                                  .map(p => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onMouseDown={() => {
                                        applyProductToItem(item.id, p);
                                        setActiveItemId(null);
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-slate-50"
                                    >
                                      <div className="flex justify-between items-center">
                                        <div>
                                          <div className="text-sm font-medium text-slate-800">{p.name}</div>
                                          <div className="text-xs text-slate-700">
                                            {(p.sku || '').trim() ? `SKU: ${p.sku}` : ''}
                                            {((p.sku || '').trim() && (p.category || '').trim()) ? ' • ' : ''}
                                            {(p.category || '').trim()}
                                          </div>
                                        </div>
                                        <div className="text-xs text-slate-700">
                                          {p.unit || 'Unit'}
                                          {(() => {
                                            const val = (p as any).defaultRate ?? (p as any).default_rate;
                                            const num = val !== null && val !== undefined ? Number(val) : null;
                                            return (num !== null && !isNaN(num)) ? ` • ${formatCurrency(num)}` : '';
                                          })()}
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            type="text"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                            className="w-20 px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500"
                            inputMode="decimal"
                            autoComplete="off"
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck={false}
                            aria-autocomplete="none"
                            name={`q_qty_${item.id}`}
                            readOnly
                            onFocus={(e) => { try { (e.currentTarget as HTMLInputElement).readOnly = false; } catch { } }}
                            required
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <select
                            value={item.unit}
                            onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500"
                          >
                            {allUnits.map(u => (
                              <option key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <NumericInput
                            value={item.rate || null}
                            onChange={(val) => updateItem(item.id, 'rate', val ?? 0)}
                            className="w-32 px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500"
                            placeholder="Rate"
                            autoComplete="off"
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck={false}
                            aria-autocomplete="none"
                            name={`q_rate_${item.id}`}
                          />
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-700 align-top">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="px-3 py-2 text-center align-top">
                          <button
                            type="button"
                            onClick={() => deleteItem(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {items.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    No items added. Click "Add Item" to get started.
                  </div>
                )}
              </div>

              <div className="md:hidden space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} id={`item-card-${item.id}`} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold text-slate-600 bg-slate-200 px-2 py-1 rounded">#{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => deleteItem(item.id)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Item</label>
                      <input
                        type="text"
                        value={item.item}
                        onChange={(e) => updateItem(item.id, 'item', e.target.value)}
                        onFocus={() => setActiveItemId(item.id)}
                        onBlur={() => setTimeout(() => setActiveItemId(prev => (prev === item.id ? null : prev)), 120)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 text-sm"
                        style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                        placeholder="Item name"
                        required
                      />
                      {activeItemId === item.id && (products?.length || 0) > 0 && item.item.trim() ? (
                        <div className="mt-1 bg-white border border-slate-200 rounded shadow">
                          {products
                            .filter(p => {
                              const term = item.item.toLowerCase();
                              return (
                                p.name.toLowerCase().includes(term) ||
                                (p.sku || '').toLowerCase().includes(term) ||
                                (p.category || '').toLowerCase().includes(term) ||
                                (p.tags || []).some((t: string) => t.toLowerCase().includes(term))
                              );
                            })
                            .slice(0, 5)
                            .map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onMouseDown={() => {
                                  applyProductToItem(item.id, p);
                                  setActiveItemId(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50"
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="text-sm font-medium text-slate-800">{p.name}</div>
                                    <div className="text-xs text-slate-700">
                                      {(p.sku || '').trim() ? `SKU: ${p.sku}` : ''}
                                      {((p.sku || '').trim() && (p.category || '').trim()) ? ' • ' : ''}
                                      {(p.category || '').trim()}
                                    </div>
                                  </div>
                                  <div className="text-xs text-slate-700">
                                    {p.unit || 'Unit'}
                                    {(() => {
                                      const val = (p as any).defaultRate ?? (p as any).default_rate;
                                      const num = val !== null && val !== undefined ? Number(val) : null;
                                      return (num !== null && !isNaN(num)) ? ` • ${formatCurrency(num)}` : '';
                                    })()}
                                  </div>
                                </div>
                              </button>
                            ))}
                        </div>
                      ) : null}
                    </div>


                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Quantity</label>
                        <input
                          type="text"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 text-sm"
                          inputMode="decimal"
                          autoComplete="off"
                          autoCapitalize="off"
                          autoCorrect="off"
                          spellCheck={false}
                          aria-autocomplete="none"
                          name={`q_qty_m_${item.id}`}
                          readOnly
                          onFocus={(e) => { try { (e.currentTarget as HTMLInputElement).readOnly = false; } catch { } }}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
                        <select
                          value={item.unit}
                          onChange={(e) => updateItem(item.id, 'unit', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 text-sm"
                        >
                          {allUnits.map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Rate</label>
                      <NumericInput
                        value={item.rate || null}
                        onChange={(val) => updateItem(item.id, 'rate', val ?? 0)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 text-sm"
                        placeholder="Rate"
                        autoComplete="off"
                        autoCapitalize="off"
                        autoCorrect="off"
                        spellCheck={false}
                        aria-autocomplete="none"
                        name={`q_rate_m_${item.id}`}
                      />
                    </div>

                    <div className="pt-2 border-t border-slate-300">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-600">Amount:</span>
                        <span className="text-base font-bold text-slate-800">{formatCurrency(item.amount)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    No items added.
                  </div>
                )}
                <div className="sticky bottom-0 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-t border-slate-200 pt-3">
                  <button
                    type="button"
                    onClick={() => addItemAfter()}
                    className="w-full px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm"
                  >
                    <span className="inline-flex items-center"><Plus className="w-4 h-4 mr-1" /> Add Item</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-slate-800">Additional Work</h3>
                <button
                  type="button"
                  onClick={addAdditionalWorkItem}
                  className="hidden md:flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm sm:text-base"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Additional Work</span>
                  <span className="sm:hidden">Add</span>
                </button>
              </div>

              <div className="hidden md:block overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase align-top">#</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase align-top">Item</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase align-top">Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase align-top">Unit</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase align-top">Rate</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-slate-600 uppercase align-top">Amount</th>
                      <th className="px-3 py-2 text-center text-xs font-medium text-slate-600 uppercase align-top">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {additionalWork.map((item, index) => (
                      <tr key={item.id} className="border-b border-slate-200">
                        <td className="px-3 py-2 text-slate-700 align-top">{index + 1}</td>
                        <td className="px-3 py-2 align-top" style={{ minWidth: '150px', maxWidth: '200px' }}>
                          <div className="relative">
                            <input
                              type="text"
                              value={item.item}
                              onChange={(e) => updateAdditionalWorkItem(item.id, 'item', e.target.value)}
                              onFocus={(e) => { setActiveItemId(item.id); try { (e.currentTarget as HTMLInputElement).readOnly = false; } catch { } }}
                              onBlur={() => setTimeout(() => setActiveItemId(prev => (prev === item.id ? null : prev)), 120)}
                              className="w-full px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500"
                              style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                              placeholder="Item name"
                              autoComplete="off"
                              autoCapitalize="off"
                              autoCorrect="off"
                              spellCheck={false}
                              aria-autocomplete="none"
                              name={`q_aw_item_${item.id}`}
                              readOnly
                              required
                            />
                            {activeItemId === item.id && (products?.length || 0) > 0 && item.item.trim() ? (
                              <div className="fixed z-[100] mt-1 bg-white border border-slate-300 rounded-lg shadow-2xl max-w-md" style={{
                                top: `${(document.activeElement as HTMLElement)?.getBoundingClientRect().bottom + 4}px`,
                                left: `${(document.activeElement as HTMLElement)?.getBoundingClientRect().left}px`,
                                width: `${Math.max(300, (document.activeElement as HTMLElement)?.getBoundingClientRect().width || 300)}px`
                              }}>
                                {products
                                  .filter(p => {
                                    const term = item.item.toLowerCase();
                                    return (
                                      p.name.toLowerCase().includes(term) ||
                                      (p.sku || '').toLowerCase().includes(term) ||
                                      (p.category || '').toLowerCase().includes(term) ||
                                      (p.tags || []).some((t: string) => t.toLowerCase().includes(term))
                                    );
                                  })
                                  .slice(0, 6)
                                  .map(p => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onMouseDown={() => {
                                        applyProductToAdditionalWorkItem(item.id, p);
                                        setActiveItemId(null);
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-slate-50"
                                    >
                                      <div className="flex justify-between items-center">
                                        <div>
                                          <div className="text-sm font-medium text-slate-800">{p.name}</div>
                                          <div className="text-xs text-slate-700">
                                            {(p.sku || '').trim() ? `SKU: ${p.sku}` : ''}
                                            {((p.sku || '').trim() && (p.category || '').trim()) ? ' • ' : ''}
                                            {(p.category || '').trim()}
                                          </div>
                                        </div>
                                        <div className="text-xs text-slate-700">
                                          {p.unit || 'Unit'}
                                          {(() => {
                                            const val = (p as any).defaultRate ?? (p as any).default_rate;
                                            const num = val !== null && val !== undefined ? Number(val) : null;
                                            return (num !== null && !isNaN(num)) ? ` • ${formatCurrency(num)}` : '';
                                          })()}
                                        </div>
                                      </div>
                                    </button>
                                  ))}
                              </div>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <input
                            type="text"
                            value={item.quantity}
                            onChange={(e) => updateAdditionalWorkItem(item.id, 'quantity', e.target.value)}
                            className="w-20 px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500"
                            inputMode="decimal"
                          />
                        </td>
                        <td className="px-3 py-2 align-top">
                          <select
                            value={item.unit}
                            onChange={(e) => updateAdditionalWorkItem(item.id, 'unit', e.target.value)}
                            className="w-full px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500"
                          >
                            <option value="Sq.ft">Sq.ft</option>
                            <option value="Sq.m">Sq.m</option>
                            <option value="Piece">Piece</option>
                            <option value="Set">Set</option>
                            <option value="Unit">Unit</option>
                            <option value="Running ft">Running ft</option>
                            <option value="Lump Sum">Lump Sum</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <NumericInput
                            value={item.rate || null}
                            onChange={(val) => updateAdditionalWorkItem(item.id, 'rate', val ?? 0)}
                            className="w-32 px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-slate-500"
                            placeholder="Rate"
                          />
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-700 align-top">
                          {formatCurrency(item.amount)}
                        </td>
                        <td className="px-3 py-2 text-center align-top">
                          <button
                            type="button"
                            onClick={() => deleteAdditionalWorkItem(item.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {additionalWork.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    No additional work added. Click "Add Additional Work" to get started.
                  </div>
                )}
              </div>

              <div className="md:hidden space-y-3">
                {additionalWork.map((item, index) => (
                  <div key={item.id} id={`aw-card-${item.id}`} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
                    <div className="flex justify-between items-start">
                      <span className="text-xs font-semibold text-slate-600 bg-slate-200 px-2 py-1 rounded">#{index + 1}</span>
                      <button
                        type="button"
                        onClick={() => deleteAdditionalWorkItem(item.id)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Item</label>
                      <input
                        type="text"
                        value={item.item}
                        onChange={(e) => updateAdditionalWorkItem(item.id, 'item', e.target.value)}
                        onFocus={() => setActiveItemId(item.id)}
                        onBlur={() => setTimeout(() => setActiveItemId(prev => (prev === item.id ? null : prev)), 120)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 text-sm"
                        style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}
                        placeholder="Item name"
                        required
                      />
                      {activeItemId === item.id && (products?.length || 0) > 0 && item.item.trim() ? (
                        <div className="mt-1 bg-white border border-slate-200 rounded shadow">
                          {products
                            .filter(p => {
                              const term = item.item.toLowerCase();
                              return (
                                p.name.toLowerCase().includes(term) ||
                                (p.sku || '').toLowerCase().includes(term) ||
                                (p.category || '').toLowerCase().includes(term) ||
                                (p.tags || []).some((t: string) => t.toLowerCase().includes(term))
                              );
                            })
                            .slice(0, 5)
                            .map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onMouseDown={() => {
                                  applyProductToAdditionalWorkItem(item.id, p);
                                  setActiveItemId(null);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-slate-50"
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <div className="text-sm font-medium text-slate-800">{p.name}</div>
                                    <div className="text-xs text-slate-700">
                                      {(p.sku || '').trim() ? `SKU: ${p.sku}` : ''}
                                      {((p.sku || '').trim() && (p.category || '').trim()) ? ' • ' : ''}
                                      {(p.category || '').trim()}
                                    </div>
                                  </div>
                                  <div className="text-xs text-slate-700">
                                    {p.unit || 'Unit'}
                                    {(() => {
                                      const val = (p as any).defaultRate ?? (p as any).default_rate;
                                      const num = val !== null && val !== undefined ? Number(val) : null;
                                      return (num !== null && !isNaN(num)) ? ` • ${formatCurrency(num)}` : '';
                                    })()}
                                  </div>
                                </div>
                              </button>
                            ))}
                        </div>
                      ) : null}
                    </div>


                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Quantity</label>
                        <input
                          type="text"
                          value={item.quantity}
                          onChange={(e) => updateAdditionalWorkItem(item.id, 'quantity', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 text-sm"
                          inputMode="decimal"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
                        <select
                          value={item.unit}
                          onChange={(e) => updateAdditionalWorkItem(item.id, 'unit', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 text-sm"
                        >
                          {allUnits.map(u => (
                            <option key={u} value={u}>{u}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Rate</label>
                      <NumericInput
                        value={item.rate || null}
                        onChange={(val) => updateAdditionalWorkItem(item.id, 'rate', val ?? 0)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 text-sm"
                        placeholder="Rate"
                      />
                    </div>

                    <div className="pt-2 border-t border-slate-300">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-600">Amount:</span>
                        <span className="text-base font-bold text-slate-800">{formatCurrency(item.amount)}</span>
                      </div>
                    </div>
                  </div>
                ))}
                {additionalWork.length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    No additional work added.
                  </div>
                )}
                <div className="sticky bottom-0 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60 border-t border-slate-200 pt-3">
                  <button
                    type="button"
                    onClick={() => addAdditionalWorkItemAfter()}
                    className="w-full px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm"
                  >
                    <span className="inline-flex items-center"><Plus className="w-4 h-4 mr-1" /> Add Additional Work</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                  rows={4}
                  placeholder="Additional notes or terms..."
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-lg">
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        id="add-gst-checkbox"
                        type="checkbox"
                        checked={taxPercent > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setTaxPercent(parseFloat(getSetting('system_default_tax_percent', '18')));
                          } else {
                            setTaxPercent(0);
                          }
                        }}
                        className="h-4 w-4 text-slate-800 border-slate-300 rounded focus:ring-slate-500"
                      />
                      <label htmlFor="add-gst-checkbox" className="text-xs sm:text-sm font-medium text-slate-700 select-none cursor-pointer">
                        Add GST
                      </label>
                    </div>
                    {taxPercent > 0 && (
                      <div className="pl-6 animate-in fade-in slide-in-from-top-1 duration-200">
                        <label className="block text-xs text-slate-500 mb-1">
                          Tax (GST) %
                        </label>
                        <input
                          type="number"
                          value={taxPercent}
                          onChange={(e) => setTaxPercent(parseFloat(e.target.value) || 0)}
                          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                          step="0.01"
                          min="0"
                          max="100"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">Discount %</label>
                      <input
                        type="number"
                        value={discountPercent ?? ''}
                        onChange={(e) => {
                          const s = e.target.value;
                          if (s === '') {
                            setDiscountPercent(null);
                            return;
                          }
                          const v = parseFloat(s);
                          if (Number.isNaN(v)) {
                            setDiscountPercent(null);
                          } else {
                            setDiscountPercent(v);
                            if (v > 0) setDiscountAmount(null);
                          }
                        }}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                        step="0.01"
                        min="0"
                        max="100"
                        disabled={discountAmount !== null && discountAmount > 0}
                      />
                    </div>
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-slate-700 mb-2">Discount Amount</label>
                      <NumericInput
                        value={discountAmount ?? null}
                        onChange={(val) => {
                          const v = val ?? null;
                          setDiscountAmount(v);
                          if ((v ?? 0) > 0) setDiscountPercent(null);
                        }}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                        placeholder=""
                        disabled={discountPercent !== null && discountPercent > 0}
                      />
                    </div>
                  </div>
                  {discountError ? (
                    <div className="text-xs text-red-600">{discountError}</div>
                  ) : null}

                  <div className="pt-3 border-t border-slate-300">
                    <div className="flex justify-between mb-2">
                      <span className="text-sm sm:text-base text-slate-600">Original Quota:</span>
                      <span className="text-sm sm:text-base font-medium">{formatCurrency(subtotal)}</span>
                    </div>
                    {computedDiscount > 0 && (
                      <div className="flex justify-between mb-2">
                        <span className="text-sm sm:text-base text-slate-600">Discount{hasPercentDiscount ? ` (${discountPercent}%)` : ''}:</span>
                        <span className="text-sm sm:text-base font-medium">-{formatCurrency(computedDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between mb-2">
                      <span className="text-sm sm:text-base text-slate-600">Final Discounted Quote:</span>
                      <span className="text-sm sm:text-base font-medium">{formatCurrency(netSubtotal)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm sm:text-base text-slate-600">GST ({taxPercent}%):</span>
                      <span className="text-sm sm:text-base font-medium">{formatCurrency(taxAmount)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-slate-300">
                      <span className="text-base sm:text-lg font-bold text-slate-800">Total:</span>
                      <span className="text-base sm:text-lg font-bold text-slate-800">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bank details selection */}
            <div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <input
                  id="include-bank-details"
                  type="checkbox"
                  checked={includeBankDetails}
                  onChange={(e) => setIncludeBankDetails(e.target.checked)}
                  className="h-4 w-4 text-slate-800 border-slate-300 rounded"
                />
                <label htmlFor="include-bank-details" className="text-sm font-medium text-slate-700">Include Bank Details on PDF</label>
              </div>
              {includeBankDetails && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Bank Account</label>
                    <select
                      value={selectedBankAccountId || ''}
                      onChange={(e) => setSelectedBankAccountId(e.target.value || undefined)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    >
                      <option value="" disabled>Select an account</option>
                      {bankAccounts.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.bankName} • {b.accountHolderName} • ****{String(b.accountNumber).slice(-4)}
                          {b.isDefault ? ' (Default)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedBankAccountId ? (
                    (() => {
                      const b = bankAccounts.find(x => x.id === selectedBankAccountId);
                      if (!b) return null;
                      return (
                        <div className="text-sm text-slate-700 bg-white border border-slate-200 rounded p-3">
                          <div className="font-semibold mb-1">Selected Account</div>
                          <div><span className="text-slate-500">Bank:</span> {b.bankName}</div>
                          <div><span className="text-slate-500">Holder:</span> {b.accountHolderName}</div>
                          <div><span className="text-slate-500">Branch:</span> {b.branchName}, {b.branchAddress}</div>
                          <div><span className="text-slate-500">Type:</span> {b.accountType}</div>
                          <div><span className="text-slate-500">Account:</span> {b.accountNumber}</div>
                          <div><span className="text-slate-500">IFSC:</span> {b.ifscCode}</div>
                          {b.upiIdOrPhone ? <div><span className="text-slate-500">UPI / Phone:</span> {b.upiIdOrPhone}</div> : null}
                          {b.paymentInstructions ? <div className="mt-1 text-xs text-slate-500">{b.paymentInstructions}</div> : null}
                        </div>
                      );
                    })()
                  ) : (
                    <div className="text-sm text-slate-500">No bank account selected.</div>
                  )}
                </div>
              )}
            </div>

          </form>
        </div>

        <div className="bg-white border-t border-slate-200 px-6 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] z-20 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 md:flex-none px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="quotation-form"
            className="flex-1 md:flex-none px-8 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium shadow-lg shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!clientName || items.length === 0}
          >
            {quotationId ? 'Update' : 'Create'} Quotation
          </button>
        </div>
      </div >
    </div >
  );
}
