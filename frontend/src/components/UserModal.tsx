import { useState, useEffect } from 'react';
import { X, Eye, EyeOff } from 'lucide-react';
import useEscapeKey from '../hooks/useEscapeKey';
import ConfirmDeleteModal from './ConfirmDeleteModal';
import { useApp } from '../context/AppContext';
import { User, UserRole, ModuleKey, PermissionAction, Permissions } from '../types';
import { ALL_MODULES, emptyPermissions, togglePermission } from '../utils/permissions';

interface UserModalProps {
  user: Partial<User> | null;
  onClose: () => void;
  isProfileMode?: boolean;
}

const API_ENDPOINT = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';


export default function UserModal({ user, onClose, isProfileMode = false }: UserModalProps) {
  useEscapeKey(onClose);
  const { addUser, updateUser, deleteUser } = useApp();
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    photoUrl: undefined as string | undefined,
    role: 'employee' as UserRole,
    phone: '',
    isActive: true,
    roleMode: 'custom' as 'default' | 'custom',
    permissions: emptyPermissions() as Permissions, // Start with NO permissions - admin must grant them
  });



  useEffect(() => {
    if (user) {
      const roleMode = 'custom'; // Force custom mode to allow editing permissions
      const permissions = user.permissions || emptyPermissions(); // Use user's permissions or empty

      setFormData({
        username: user.username || '',
        password: user.password || '', // Password might be empty/hashed, fine for update if left blank (handled by backend usually)
        fullName: user.fullName || '',
        photoUrl: user.photoUrl,
        role: (user.role as UserRole) || 'employee',
        phone: user.phone || '',
        isActive: user.isActive ?? true,
        roleMode,
        permissions,
      });
    }
  }, [user]);

  // Removed automatic permission reset effect to allow manual control.
  // Permissions are now updated either via the Role select or the "Reset to Defaults" button.

  const handleRoleChange = (newRole: UserRole) => {
    // When role changes, keep current permissions - don't auto-reset
    // Admin must manually set permissions
    setFormData((prev) => ({
      ...prev,
      role: newRole,
      // permissions stay the same - admin controls them
    }));
  };

  const handleCheckAll = () => {
    const allTrue: Permissions = {} as Permissions;
    ALL_MODULES.forEach(module => {
      allTrue[module] = { create: true, read: true, update: true, delete: true };
    });
    setFormData(prev => ({ ...prev, permissions: allTrue }));
  };

  const handleUncheckAll = () => {
    setFormData(prev => ({ ...prev, permissions: emptyPermissions() }));
  };

  const handleTogglePermission = (module: ModuleKey, action: PermissionAction, value: boolean) => {
    setFormData((prev) => ({
      ...prev,
      permissions: togglePermission(prev.permissions, module, action, value),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // CRITICAL: Always set roleMode to 'custom' when updating permissions
    // This ensures the system uses user.permissions instead of falling back to role defaults
    const payload = {
      ...formData,
      roleMode: 'custom' as 'default' | 'custom'
    };

    console.log('[UserModal] Submitting user with roleMode:', payload.roleMode, 'permissions:', JSON.stringify(payload.permissions).substring(0, 100));

    if (user && user.id) {
      updateUser(user.id, payload);
    } else {
      addUser(payload);
    }
    onClose();
  };

  const handleDelete = () => {
    if (!user || !user.id) return;
    setConfirmDeleteOpen(true);
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
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-slate-800">
              {isProfileMode ? 'My Profile' : (user ? 'Edit User' : 'Add New User')}
            </h3>
            <p className="text-sm text-slate-500">
              {isProfileMode ? 'Update your personal details' : 'Manage user details and permissions'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 min-h-0">
          <form id="user-form" onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info Section */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <span className="w-1 h-4 bg-blue-600 rounded-full"></span>
                Basic Information
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className={`w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${isProfileMode ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                    placeholder="johndoe"
                    required
                    readOnly={isProfileMode}
                    disabled={isProfileMode}
                  />
                  {isProfileMode && <p className="text-xs text-slate-400 mt-1">Username cannot be changed.</p>}
                </div>

                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Profile Photo
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="shrink-0">
                      {formData.photoUrl ? (
                        <div className="w-16 h-16 rounded-full overflow-hidden border border-slate-200">
                          <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200 border-dashed">
                          <span className="text-xs">No Photo</span>
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

                          try {
                            const res = await fetch(`${API_ENDPOINT}/upload`, {
                              method: 'POST',
                              body: data,
                            });

                            if (!res.ok) {
                              const errData = await res.json().catch(() => ({ error: 'Upload failed' }));
                              throw new Error(errData.error || 'Upload failed');
                            }
                            const json = await res.json();
                            setFormData(prev => ({ ...prev, photoUrl: json.url }));
                          } catch (err: any) {
                            console.error('Upload error:', err);
                            alert(`Failed to upload photo: ${err.message}`);
                          }
                        }}
                        className="block w-full text-sm text-slate-500
                          file:mr-4 file:py-2 file:px-4
                          file:rounded-full file:border-0
                          file:text-sm file:font-semibold
                          file:bg-slate-100 file:text-slate-700
                          hover:file:bg-slate-200
                          transition-colors"
                      />
                      <p className="text-xs text-slate-500 mt-1">Upload a photo. Leave empty to use initials.</p>
                      {formData.photoUrl && (
                        <button
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, photoUrl: '' }))}
                          className="text-xs text-red-600 hover:text-red-700 mt-1 font-medium"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Role & Permissions Section - HIDDEN IN PROFILE MODE */}
            {!isProfileMode && (
              <>
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-1 h-4 bg-purple-600 rounded-full"></span>
                    Role & Permissions
                  </h4>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">User Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                      required
                    >
                      <option value="admin">Admin (Full Access)</option>
                      <option value="accountant">Accountant (Expenses & Payments)</option>
                      <option value="sales">Sales (Projects & Payments)</option>
                      <option value="employee">Employee (Basic Access)</option>
                    </select>
                  </div>

                  <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                    <div className="flex border-b border-slate-200 bg-white items-center justify-between px-4 py-3">
                      <h5 className="text-sm font-medium text-slate-800">Module Permissions</h5>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCheckAll}
                          className="text-xs px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-md font-medium transition-colors border border-green-200"
                        >
                          ✓ Check All
                        </button>
                        <button
                          type="button"
                          onClick={handleUncheckAll}
                          className="text-xs px-3 py-1.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-md font-medium transition-colors border border-red-200"
                        >
                          ✗ Uncheck All
                        </button>
                      </div>
                    </div>

                    <div className="p-4">
                      {/* Desktop view - Table layout */}
                      <div className="hidden md:block overflow-x-auto">
                        <div className="min-w-[600px]">
                          <div className="grid grid-cols-[1fr,repeat(4,60px)] gap-4 mb-2 px-2">
                            <div className="text-xs font-semibold text-slate-500 uppercase">Module</div>
                            {['Create', 'Read', 'Update', 'Delete'].map(action => (
                              <div key={action} className="text-xs font-semibold text-slate-500 uppercase text-center">{action}</div>
                            ))}
                          </div>
                          <div className="space-y-1">
                            {ALL_MODULES.map((module) => (
                              <div key={module} className="grid grid-cols-[1fr,repeat(4,60px)] gap-4 items-center p-2 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-slate-100">
                                <div className="text-sm font-medium text-slate-700 capitalize">
                                  {module === 'todo' ? 'My Tasks' : module === 'todo_team' ? 'Team Tasks' : module === 'dashboard' ? 'Performance' : module.replace(/_/g, ' ')}
                                </div>
                                {(['create', 'read', 'update', 'delete'] as PermissionAction[]).map((action) => (
                                  <div key={action} className="flex justify-center">
                                    <input
                                      type="checkbox"
                                      checked={!!formData.permissions?.[module]?.[action]}
                                      onChange={(e) => handleTogglePermission(module, action, e.target.checked)}
                                      className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500 cursor-pointer"
                                    />
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Mobile view - Card layout */}
                      <div className="md:hidden space-y-3">
                        {ALL_MODULES.map((module) => (
                          <div key={module} className="bg-white border border-slate-200 rounded-lg p-3">
                            <div className="text-sm font-semibold text-slate-800 mb-3 capitalize">
                              {module === 'todo' ? 'My Tasks' : module === 'todo_team' ? 'Team Tasks' : module === 'dashboard' ? 'Performance' : module.replace(/_/g, ' ')}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {(['create', 'read', 'update', 'delete'] as PermissionAction[]).map((action) => (
                                <label key={action} className="flex items-center space-x-2 p-2 bg-slate-50 rounded-md cursor-pointer hover:bg-slate-100 transition-colors">
                                  <input
                                    type="checkbox"
                                    checked={!!formData.permissions?.[module]?.[action]}
                                    onChange={(e) => handleTogglePermission(module, action, e.target.checked)}
                                    className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500 cursor-pointer"
                                  />
                                  <span className="text-xs font-medium text-slate-700 capitalize">{action}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Section */}
                <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div>
                    <h4 className="text-sm font-medium text-slate-900">Account Status</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Disable to prevent user login</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                </div>
              </>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-between pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {user && !isProfileMode && (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-3 border border-red-300 text-red-700 rounded-xl hover:bg-red-50 transition-all font-medium text-sm"
            >
              Delete User
            </button>
          )}
          <div className="flex gap-3 ml-auto flex-1 md:flex-none justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-white transition-all font-medium text-sm flex-1 md:flex-none"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all font-medium text-sm flex-1 md:flex-none"
            >
              {isProfileMode ? 'Update Profile' : (user ? 'Update User' : 'Create User')}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        open={confirmDeleteOpen}
        title="Delete User"
        message={`Are you sure you want to permanently delete user "${formData.fullName}"?`}
        detail={undefined}
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={() => { if (user && user.id) { deleteUser(user.id); setConfirmDeleteOpen(false); onClose(); } }}
        confirmLabel="Delete"
      />
    </div>
  );
}
