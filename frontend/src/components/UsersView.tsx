import { useState } from 'react';
import { Plus, CreditCard as Edit2, UserCheck, UserX } from 'lucide-react';
import { useApp } from '../context/AppContext';
import UserModal from './UserModal';
import { User } from '../types';
import PaginationControls from './PaginationControls';

export default function UsersView() {
  const { users, updateUser, hasPermission } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const totalItems = users.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginatedUsers = users.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Permission gating
  const canAdd = hasPermission('users', 'create');
  const canEdit = hasPermission('users', 'update');
  const canToggle = hasPermission('users', 'update');

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleToggleStatus = (user: User) => {
    updateUser(user.id, { isActive: !user.isActive });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-700';
      case 'accountant':
        return 'bg-blue-100 text-blue-700';
      case 'sales':
        return 'bg-green-100 text-green-700';
      case 'employee':
        return 'bg-slate-100 text-slate-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-4 p-[15px] sm:p-0">
      <div className="flex flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Users</h2>
          <p className="text-slate-600 mt-1">{users.length} total users</p>
        </div>
        {canAdd && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </button>
        )}
      </div>

      <div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedUsers.map((user) => (
            <div
              key={user.id}
              className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow "
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-3 items-center flex-1">
                  {/* Avatar / Initials */}
                  <div className="w-12 h-12 shrink-0 rounded-full bg-slate-200 border border-slate-300 overflow-hidden flex items-center justify-center">
                    {user.photoUrl ? (
                      <img
                        src={user.photoUrl}
                        alt={user.fullName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-lg font-bold text-slate-600">
                        {user.fullName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-800">{user.fullName}</h3>
                    <p className="text-sm text-slate-600">@{user.username}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {user.isActive ? (
                    <UserCheck className="w-5 h-5 text-green-600" />
                  ) : (
                    <UserX className="w-5 h-5 text-red-600" />
                  )}
                  <span
                    className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full capitalize ${getRoleBadgeColor(
                      user.role
                    )}`}
                  >
                    {user.role}
                  </span>
                </div>
              </div>

              {user.phone && (
                <div className="mb-4">
                  <p className="text-sm text-slate-600">
                    Phone: <span className="text-slate-800 font-medium">{user.phone}</span>
                  </p>
                </div>
              )}

              <div className="mb-4">
                <p className="text-sm">
                  <span className="text-slate-600">Status: </span>
                  <span
                    className={`font-medium ${user.isActive ? 'text-green-600' : 'text-red-600'
                      }`}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-200">
                {canEdit && (
                  <button
                    onClick={() => handleEdit(user)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Edit
                  </button>
                )}
                {canToggle && (
                  <button
                    onClick={() => handleToggleStatus(user)}
                    className={`flex-1 inline-flex items-center justify-center px-3 py-2 rounded-lg transition-colors text-sm font-medium ${user.isActive
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                  >
                    {user.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            totalItems={totalItems}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      </div>

      {isModalOpen && <UserModal user={editingUser} onClose={handleCloseModal} />}
    </div>
  );
}
