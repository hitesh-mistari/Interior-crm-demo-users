import { useState, useEffect, useRef } from 'react';
import {
  Building2,
  Plug,
  FileText,
  Share2,
  Settings as SettingsIcon,
  Save,
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Info,
  Landmark,
  Plus,
  Pencil,
  Trash2,
  Star,
} from 'lucide-react';
import { useSystemSettings } from '../context/SettingsContext';
import useShowScrollbarOnScroll from '../hooks/useShowScrollbarOnScroll';
import { useApp } from '../context/AppContext';
import { maskSensitive } from '../utils/security';
import { BankAccountType, BankAccount } from '../types';

type SettingsTab =
  | 'company'
  | 'api'
  | 'document'
  | 'social'
  | 'system'
  | 'bank';

interface SettingField {
  key: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'url' | 'number' | 'textarea' | 'password' | 'color' | 'image';
  placeholder?: string;
  description?: string;
  required?: boolean;
  sensitive?: boolean;
}

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export default function SettingsView() {
  const { updateMultipleSettings, getSetting } = useSystemSettings();
  const { bankAccounts, createBankAccount, updateBankAccount, deleteBankAccount } = useApp();
  const [activeTab, setActiveTab] = useState<SettingsTab>('company');
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});

  // Bank account form state
  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountHolderName: '',
    branchName: '',
    branchAddress: '',
    accountType: 'Current' as BankAccountType,
    accountNumber: '',
    ifscCode: '',
    upiIdOrPhone: '',
    paymentInstructions: '',
    isDefault: false,
  });
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [bankSaveStatus, setBankSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [bankSaveMessage, setBankSaveMessage] = useState('');
  const [bankErrors, setBankErrors] = useState<Record<string, string>>({});

  // Ref for tabs container to control scrollbar visibility
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  useShowScrollbarOnScroll(tabsScrollRef);

  const tabs = [
    { id: 'company' as SettingsTab, label: 'Company Info', icon: Building2 },
    { id: 'api' as SettingsTab, label: 'API Integration', icon: Plug },
    { id: 'document' as SettingsTab, label: 'Documents', icon: FileText },
    { id: 'social' as SettingsTab, label: 'Social Media', icon: Share2 },
    { id: 'system' as SettingsTab, label: 'System', icon: SettingsIcon },
    { id: 'bank' as SettingsTab, label: 'Bank Details', icon: Landmark },
  ];

  const categoryFields: Record<SettingsTab, SettingField[]> = {
    company: [
      { key: 'company_name', label: 'Company Name', type: 'text', required: true },
      { key: 'company_tagline', label: 'Tagline', type: 'text' },
      { key: 'company_phone', label: 'Phone Number', type: 'tel' },
      { key: 'company_alternate_phone', label: 'Alternate Phone', type: 'tel' },
      // { key: 'company_email', label: 'Email Address', type: 'email' },
      { key: 'company_address', label: 'Address', type: 'textarea' },
      { key: 'company_gst_number', label: 'GST Number', type: 'text' },
      { key: 'company_registration_number', label: 'Registration Number', type: 'text' },
    ],

    api: [
      { key: 'instagram_app_id', label: 'Meta App ID', type: 'text', sensitive: true },
      { key: 'instagram_app_secret', label: 'Meta App Secret', type: 'password', sensitive: true },
      { key: 'instagram_access_token', label: 'Access Token', type: 'password', sensitive: true },
      { key: 'instagram_page_id', label: 'Instagram Page ID', type: 'text', sensitive: true },
      { key: 'instagram_webhook_url', label: 'Webhook URL', type: 'url' },
    ],
    document: [
      { key: 'pdf_company_name', label: 'Company Name for PDFs', type: 'text' },
      { key: 'pdf_terms_conditions', label: 'Terms & Conditions', type: 'textarea' },
      { key: 'pdf_footer_text', label: 'Footer Text', type: 'text' },
      { key: 'pdf_signature_image', label: 'Signature Image', type: 'image', placeholder: 'Upload signature image' },
    ],
    social: [
      { key: 'social_instagram_url', label: 'Instagram URL', type: 'url' },
      { key: 'social_facebook_url', label: 'Facebook URL', type: 'url' },
      { key: 'social_whatsapp_number', label: 'WhatsApp Number', type: 'tel' },
      { key: 'social_linkedin_url', label: 'LinkedIn URL', type: 'url' },
    ],

    system: [
      { key: 'system_default_tax_percent', label: 'Default Tax %', type: 'number' },
      { key: 'system_currency_code', label: 'Currency Code', type: 'text' },
      { key: 'system_currency_symbol', label: 'Currency Symbol', type: 'text' },
      { key: 'system_date_format', label: 'Date Format', type: 'text' },
      { key: 'system_timezone', label: 'Timezone', type: 'text' },
      { key: 'system_language', label: 'Language Code', type: 'text' },
    ],
    bank: [],
  };

  useEffect(() => {
    const fields = categoryFields[activeTab];
    const data: Record<string, string> = {};
    fields.forEach((field) => {
      data[field.key] = getSetting(field.key);
    });
    setFormData(data);
    setSaveStatus('idle');
  }, [activeTab]);

  const handleInputChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('idle');
    setSaveMessage('');

    try {
      const updates = Object.entries(formData).map(([key, value]) => ({
        key,
        value,
      }));

      await updateMultipleSettings(updates);

      setSaveStatus('success');
      setSaveMessage('Settings saved successfully!');

      setTimeout(() => {
        setSaveStatus('idle');
        setSaveMessage('');
      }, 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
      setSaveMessage('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleSensitiveVisibility = (key: string) => {
    setShowSensitive((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const renderField = (field: SettingField) => {
    const value = formData[field.key] || '';
    const isPasswordField = field.type === 'password';
    const shouldShowValue = isPasswordField && showSensitive[field.key];
    const inputType = shouldShowValue ? 'text' : field.type;

    if (field.type === 'textarea') {
      return (
        <textarea
          value={value}
          onChange={(e) => handleInputChange(field.key, e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          rows={4}
          placeholder={field.placeholder}
        />
      );
    }

    if (field.type === 'image') {
      return (
        <div className="flex items-center gap-4">
          <div className="shrink-0">
            {value ? (
              <div className="w-32 h-16 border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center relative group">
                <img src={value} alt="Preview" className="w-full h-full object-contain" />
                <button
                  type="button"
                  onClick={() => handleInputChange(field.key, '')}
                  className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="w-32 h-16 border border-slate-200 border-dashed rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                <span className="text-xs">No Image</span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;

                const data = new FormData();
                data.append('file', file);

                // Show uploading state if you want, or just wait
                try {
                  const res = await fetch(`${API_ENDPOINT}/upload`, {
                    method: 'POST',
                    body: data,
                  });
                  if (!res.ok) throw new Error('Upload failed');
                  const json = await res.json();
                  handleInputChange(field.key, json.url);
                } catch (err: any) {
                  alert('Upload failed: ' + err.message);
                }
              }}
              className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 transition-colors"
            />
            <p className="text-xs text-slate-500 mt-1">{field.placeholder}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="relative">
        <input
          type={inputType}
          value={field.type === 'color' && !value ? '#000000' : value}
          onChange={(e) => handleInputChange(field.key, e.target.value)}
          className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
          placeholder={field.placeholder}
          required={field.required}
        />
        {isPasswordField && (
          <button
            type="button"
            onClick={() => toggleSensitiveVisibility(field.key)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          >
            {shouldShowValue ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        )}
      </div>
    );
  };

  const currentFields = categoryFields[activeTab];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
            <SettingsIcon className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800 mb-2">System Settings</h2>
            <p className="text-slate-600">
              Configure your system settings, API integrations, and preferences. These settings are
              only accessible to administrators.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200">
        <div ref={tabsScrollRef} className="border-b border-slate-200 overflow-x-auto thin-scrollbar">
          <div className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                    ? 'border-slate-800 text-slate-800'
                    : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'bank' && (
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-slate-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Landmark className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Bank Accounts</h3>
                  <p className="text-slate-600 text-sm">Manage multiple bank accounts for quotations. Sensitive fields are masked when not editing.</p>
                </div>
              </div>

              <div className="space-y-3">
                {bankAccounts.length === 0 ? (
                  <div className="text-sm text-slate-600">No bank accounts added yet. Add one below.</div>
                ) : (
                  bankAccounts.map((b: BankAccount) => (
                    <div key={b.id} className="border border-slate-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-800 font-semibold">{b.bankName}</span>
                          {b.isDefault && (
                            <span className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded">
                              <Star className="w-3 h-3" /> Default
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-600">Account Holder: {b.accountHolderName}</div>
                        <div className="text-sm text-slate-600">Account No.: {maskSensitive(b.accountNumber)}</div>
                        <div className="text-sm text-slate-600">IFSC: {b.ifscCode} • Type: {b.accountType}</div>
                        <div className="text-sm text-slate-600">Branch: {b.branchName}, {b.branchAddress}</div>
                        {b.upiIdOrPhone && (
                          <div className="text-sm text-slate-600">UPI/Phone: {b.upiIdOrPhone}</div>
                        )}
                        {b.paymentInstructions && (
                          <div className="text-sm text-slate-600">Instructions: {b.paymentInstructions}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!b.isDefault && (
                          <button
                            type="button"
                            className="px-3 py-1.5 text-xs bg-amber-600 text-white rounded hover:bg-amber-500"
                            onClick={async () => {
                              try {
                                await updateBankAccount(b.id, { isDefault: true });
                                const others = bankAccounts.filter((acc: BankAccount) => acc.id !== b.id && acc.isDefault);
                                await Promise.all(others.map((acc: BankAccount) => updateBankAccount(acc.id, { isDefault: false })));
                              } catch (e) {
                                alert('Failed to set default');
                              }
                            }}
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          type="button"
                          className="px-3 py-1.5 text-xs bg-slate-800 text-white rounded hover:bg-slate-700 inline-flex items-center gap-1"
                          onClick={() => {
                            setEditingBankId(b.id);
                            setBankForm({
                              bankName: b.bankName,
                              accountHolderName: b.accountHolderName,
                              branchName: b.branchName,
                              branchAddress: b.branchAddress,
                              accountType: b.accountType,
                              accountNumber: b.accountNumber,
                              ifscCode: b.ifscCode,
                              upiIdOrPhone: b.upiIdOrPhone || '',
                              paymentInstructions: b.paymentInstructions || '',
                              isDefault: !!b.isDefault,
                            });
                          }}
                        >
                          <Pencil className="w-4 h-4" /> Edit
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-500 inline-flex items-center gap-1"
                          onClick={async () => {
                            if (!confirm('Delete this bank account?')) return;
                            try {
                              await deleteBankAccount(b.id);
                            } catch (e) {
                              alert('Failed to delete bank account');
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="border border-slate-200 rounded-lg">
                <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-slate-700" />
                    <span className="text-sm font-medium text-slate-700">{editingBankId ? 'Edit Bank Account' : 'Add Bank Account'}</span>
                  </div>
                  {!editingBankId && (
                    <button
                      type="button"
                      className="text-xs px-3 py-1 bg-slate-800 text-white rounded hover:bg-slate-700 inline-flex items-center gap-1"
                      onClick={() => {
                        setBankForm({
                          bankName: '',
                          accountHolderName: '',
                          branchName: '',
                          branchAddress: '',
                          accountType: 'Current',
                          accountNumber: '',
                          ifscCode: '',
                          upiIdOrPhone: '',
                          paymentInstructions: '',
                          isDefault: false,
                        });
                        setEditingBankId(null);
                        setBankErrors({});
                        setBankSaveStatus('idle');
                        setBankSaveMessage('');
                      }}
                    >
                      <Plus className="w-4 h-4" /> New
                    </button>
                  )}
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name<span className="text-red-500 ml-1">*</span></label>
                    <input
                      type="text"
                      value={bankForm.bankName}
                      onChange={(e) => setBankForm((p) => ({ ...p, bankName: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    />
                    {bankErrors.bankName && <p className="mt-1 text-xs text-red-600">{bankErrors.bankName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Account Holder Name<span className="text-red-500 ml-1">*</span></label>
                    <input
                      type="text"
                      value={bankForm.accountHolderName}
                      onChange={(e) => setBankForm((p) => ({ ...p, accountHolderName: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    />
                    {bankErrors.accountHolderName && <p className="mt-1 text-xs text-red-600">{bankErrors.accountHolderName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Branch Name<span className="text-red-500 ml-1">*</span></label>
                    <input
                      type="text"
                      value={bankForm.branchName}
                      onChange={(e) => setBankForm((p) => ({ ...p, branchName: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    />
                    {bankErrors.branchName && <p className="mt-1 text-xs text-red-600">{bankErrors.branchName}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Branch Address<span className="text-red-500 ml-1">*</span></label>
                    <input
                      type="text"
                      value={bankForm.branchAddress}
                      onChange={(e) => setBankForm((p) => ({ ...p, branchAddress: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    />
                    {bankErrors.branchAddress && <p className="mt-1 text-xs text-red-600">{bankErrors.branchAddress}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Account Type</label>
                    <select
                      value={bankForm.accountType}
                      onChange={(e) => setBankForm((p) => ({ ...p, accountType: e.target.value as BankAccountType }))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    >
                      <option value="Current">Current</option>
                      <option value="Savings">Savings</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Account Number<span className="text-red-500 ml-1">*</span></label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={bankForm.accountNumber}
                      onChange={(e) => setBankForm((p) => ({ ...p, accountNumber: e.target.value.replace(/\s+/g, '') }))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    />
                    {bankErrors.accountNumber && <p className="mt-1 text-xs text-red-600">{bankErrors.accountNumber}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">IFSC Code<span className="text-red-500 ml-1">*</span></label>
                    <input
                      type="text"
                      value={bankForm.ifscCode}
                      onChange={(e) => setBankForm((p) => ({ ...p, ifscCode: e.target.value.toUpperCase() }))}
                      onBlur={() => {
                        if (bankForm.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankForm.ifscCode)) {
                          setBankErrors((prev) => ({ ...prev, ifscCode: 'Invalid IFSC format (e.g., UBIN0576981)' }));
                        } else {
                          setBankErrors((prev) => ({ ...prev, ifscCode: '' }));
                        }
                      }}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    />
                    {bankErrors.ifscCode && <p className="mt-1 text-xs text-red-600">{bankErrors.ifscCode}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">UPI ID/Phone</label>
                    <input
                      type="text"
                      value={bankForm.upiIdOrPhone}
                      onChange={(e) => setBankForm((p) => ({ ...p, upiIdOrPhone: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Payment Instructions</label>
                    <textarea
                      value={bankForm.paymentInstructions}
                      onChange={(e) => setBankForm((p) => ({ ...p, paymentInstructions: e.target.value }))}
                      className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center justify-between">
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={bankForm.isDefault}
                        onChange={(e) => setBankForm((p) => ({ ...p, isDefault: e.target.checked }))}
                      />
                      Set as default account
                    </label>

                    <div className="flex items-center gap-2">
                      {editingBankId && (
                        <button
                          type="button"
                          className="px-4 py-2 text-sm bg-slate-100 text-slate-700 rounded hover:bg-slate-200"
                          onClick={() => {
                            setEditingBankId(null);
                            setBankErrors({});
                            setBankSaveStatus('idle');
                            setBankSaveMessage('');
                          }}
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        type="button"
                        className="px-4 py-2 text-sm bg-slate-800 text-white rounded hover:bg-slate-700"
                        onClick={async () => {
                          const errs: Record<string, string> = {};
                          if (!bankForm.bankName.trim()) errs.bankName = 'Required';
                          if (!bankForm.accountHolderName.trim()) errs.accountHolderName = 'Required';
                          if (!bankForm.branchName.trim()) errs.branchName = 'Required';
                          if (!bankForm.branchAddress.trim()) errs.branchAddress = 'Required';
                          if (!bankForm.accountNumber.trim()) errs.accountNumber = 'Required';
                          if (!bankForm.ifscCode.trim()) errs.ifscCode = 'Required';
                          else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(bankForm.ifscCode.trim())) errs.ifscCode = 'Invalid IFSC format';
                          setBankErrors(errs);
                          if (Object.keys(errs).length > 0) return;

                          setBankSaveStatus('saving');
                          setBankSaveMessage('');
                          try {
                            if (editingBankId) {
                              await updateBankAccount(editingBankId, {
                                bankName: bankForm.bankName,
                                accountHolderName: bankForm.accountHolderName,
                                branchName: bankForm.branchName,
                                branchAddress: bankForm.branchAddress,
                                accountType: bankForm.accountType,
                                accountNumber: bankForm.accountNumber,
                                ifscCode: bankForm.ifscCode,
                                upiIdOrPhone: bankForm.upiIdOrPhone || undefined,
                                paymentInstructions: bankForm.paymentInstructions || undefined,
                                isDefault: bankForm.isDefault,
                              });
                              setEditingBankId(null);
                            } else {
                              await createBankAccount({
                                bankName: bankForm.bankName,
                                accountHolderName: bankForm.accountHolderName,
                                branchName: bankForm.branchName,
                                branchAddress: bankForm.branchAddress,
                                accountType: bankForm.accountType,
                                accountNumber: bankForm.accountNumber,
                                ifscCode: bankForm.ifscCode,
                                upiIdOrPhone: bankForm.upiIdOrPhone || undefined,
                                paymentInstructions: bankForm.paymentInstructions || undefined,
                                isDefault: bankForm.isDefault,
                              });
                            }
                            setBankSaveStatus('success');
                            setBankSaveMessage('Bank account saved');
                            setBankForm({
                              bankName: '',
                              accountHolderName: '',
                              branchName: '',
                              branchAddress: '',
                              accountType: 'Current',
                              accountNumber: '',
                              ifscCode: '',
                              upiIdOrPhone: '',
                              paymentInstructions: '',
                              isDefault: false,
                            });
                            setTimeout(() => {
                              setBankSaveStatus('idle');
                              setBankSaveMessage('');
                            }, 2500);
                          } catch (e) {
                            console.error(e);
                            setBankSaveStatus('error');
                            setBankSaveMessage('Failed to save bank account');
                          }
                        }}
                      >
                        {editingBankId ? 'Update Account' : 'Save Account'}
                      </button>
                    </div>
                  </div>
                </div>

                {bankSaveStatus !== 'idle' && (
                  <div
                    className={`mx-4 my-4 flex items-center gap-2 p-3 rounded ${bankSaveStatus === 'success'
                      ? 'bg-green-50 border border-green-200 text-green-800'
                      : bankSaveStatus === 'error'
                        ? 'bg-red-50 border border-red-200 text-red-800'
                        : 'bg-blue-50 border border-blue-200 text-blue-800'
                      }`}
                  >
                    {bankSaveStatus === 'success' ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : bankSaveStatus === 'error' ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <Info className="w-5 h-5" />
                    )}
                    <span className="text-sm">{bankSaveMessage || (bankSaveStatus === 'saving' ? 'Saving...' : '')}</span>
                  </div>
                )}
              </div>
            </div>
          )}


          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentFields.map((field) => (
              <div
                key={field.key}
                className={field.type === 'textarea' ? 'md:col-span-2' : ''}
              >
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                  {field.sensitive && (
                    <span className="ml-2 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                      Sensitive
                    </span>
                  )}
                </label>
                {renderField(field)}
                {field.description && (
                  <p className="mt-1 text-xs text-slate-500">{field.description}</p>
                )}
              </div>
            ))}
          </div>

          {saveStatus !== 'idle' && (
            <div
              className={`mt-6 flex items-center gap-2 p-4 rounded-lg ${saveStatus === 'success'
                ? 'bg-green-50 border border-green-200 text-green-800'
                : 'bg-red-50 border border-red-200 text-red-800'
                }`}
            >
              {saveStatus === 'success' ? (
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              )}
              <p className="text-sm font-medium">{saveMessage}</p>
            </div>
          )}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || activeTab === 'bank'}
              className="flex items-center gap-2 px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
