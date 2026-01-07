import { useState, useEffect, useRef } from 'react';
import { Settings, Bell, User, Users, LayoutDashboard, FolderKanban, Receipt, CreditCard, FileText, BarChart2, Building, Box, Menu, X, Plus, FolderPlus, UserPlus, RefreshCw } from 'lucide-react';
import '../styles/mobileNav.css';
import { useApp } from '../context/AppContext';
import ProjectsView from './ProjectsView';
import ExpensesView from './ExpensesView';
import PaymentsView from './PaymentsView';
import UsersView from './UsersView';
import TabbedDashboard from './TabbedDashboard';
import QuotationsView from './QuotationsView';
import ReportsView from './ReportsView';
import TrashView from './TrashView';
import SuppliersView from './SuppliersView';
import SettingsView from './SettingsView';
import MediaView from './MediaView';
import ProductsView from './ProductsView';
import TeamsView from './TeamsView';

// TaskQuickAdd removed from here as it is no longer triggered by the bottom nav
import ExpenseModal from './ExpenseModal';
import PaymentModal from './PaymentModal';
import ProjectModal from './ProjectModal';
import AddTeamMemberModal from './AddTeamMemberModal';
import UserModal from './UserModal';


type View = 'overview' | 'projects' | 'expenses' | 'payments' | 'quotations' | 'reports' | 'suppliers' | 'users' | 'settings' | 'trash' | 'media' | 'products' | 'teams';

export default function Dashboard() {
  const { currentUser, logout, hasPermission, notifications, markNotificationRead, markAllNotificationsRead } = useApp();
  const isAdmin = currentUser?.role === 'admin';

  // console.log("DASHBOARD MOUNTED");
  // console.log("currentUser =", currentUser);
  // console.log("hasPermission =", hasPermission);
  // console.log("notifications =", notifications);
  // console.log("markNotificationRead =", markNotificationRead);
  // console.log("markAllNotificationsRead =", markAllNotificationsRead);
  const getInitialView = (): View => {
    const path = window.location.pathname;
    if (path.startsWith('/projects')) return 'projects';
    if (path.startsWith('/expenses')) return 'expenses';
    if (path.startsWith('/payments')) return 'payments';
    if (path.startsWith('/quotations')) return 'quotations';
    if (path.startsWith('/reports')) return 'reports';
    if (path.startsWith('/suppliers')) return 'suppliers';
    if (path.startsWith('/products')) return 'products';
    if (path.startsWith('/teams')) return 'teams';
    if (path.startsWith('/users')) return 'users';
    if (path.startsWith('/settings')) return 'settings';
    if (path.startsWith('/trash')) return 'trash';
    return 'overview';
  };

  const [currentView, setCurrentView] = useState<View>(getInitialView);

  // Handle URL changes/back button
  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(getInitialView());
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isBellHover, setIsBellHover] = useState(false);
  const [isDropdownHover, setIsDropdownHover] = useState(false);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  // const [isQuickAddOpen, setIsQuickAddOpen] = useState(false); // Removed

  // Quick Action States
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close persistent open dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotificationsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll to top when view changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentView]);

  // removed settings event; filter uses local icon menu in Overview module

  const showNotificationsDropdown = isNotificationsOpen || isBellHover || isDropdownHover;

  if (!currentUser) return null;

  const canAccessUsers = hasPermission('users', 'read');
  const canAccessExpenses = hasPermission('expenses', 'read');
  const canAccessPayments = hasPermission('payments', 'read');
  const canAccessQuotations = hasPermission('quotations', 'read');
  const canAccessReports = hasPermission('reports', 'read');
  const canAccessSuppliers = hasPermission('suppliers', 'read');
  const canAccessProducts = hasPermission('products', 'read');
  const canAccessTeams = hasPermission('teams', 'read');
  const canAccessProjects = hasPermission('projects', 'read');

  const canAccessSettings = hasPermission('settings', 'read');
  const canAccessTrash = hasPermission('trash', 'read');

  const renderView = () => {
    switch (currentView) {
      case 'overview':
        return <TabbedDashboard />;
      case 'projects':
        return (isAdmin || canAccessProjects) ? <ProjectsView /> : <TabbedDashboard />;
      case 'expenses':
        return canAccessExpenses ? <ExpensesView /> : <TabbedDashboard />;
      case 'payments':
        return canAccessPayments ? <PaymentsView /> : <TabbedDashboard />;
      case 'quotations':
        return canAccessQuotations ? <QuotationsView /> : <TabbedDashboard />;
      case 'reports':
        return canAccessReports ? <ReportsView /> : <TabbedDashboard />;
      // Client Reports consolidated under Reports view
      case 'suppliers':
        return canAccessSuppliers ? <SuppliersView /> : <TabbedDashboard />;
      case 'products':
        return canAccessProducts ? <ProductsView /> : <TabbedDashboard />;
      case 'teams':
        return canAccessTeams ? <TeamsView /> : <TabbedDashboard />;
      case 'users':
        return canAccessUsers ? <UsersView /> : <TabbedDashboard />;
      case 'settings':
        return canAccessSettings ? <SettingsView /> : <TabbedDashboard />;
      case 'trash':
        return canAccessTrash ? <TrashView /> : <TabbedDashboard />;
      case 'media':
        return canAccessSettings ? <MediaView /> : <TabbedDashboard />;
      default:
        return <TabbedDashboard />;
    }
  };

  const navigate = (view: View) => {
    setCurrentView(view);
  };


  // Determine a dot color for notifications without a typed severity
  const getNotificationDotClass = (message: string) => {
    const m = (message || '').toLowerCase();
    if (m.includes('error') || m.includes('failed') || m.includes('failure')) return 'bg-red-500';
    if (m.includes('warn') || m.includes('caution')) return 'bg-amber-500';
    if (m.includes('success') || m.includes('saved') || m.includes('updated')) return 'bg-emerald-500';
    return 'bg-slate-400';
  };

  const quickActions = [
    {
      label: 'Add Team Member',
      icon: UserPlus,
      color: 'bg-indigo-600',
      delay: 'delay-[150ms]',
      action: () => setIsTeamModalOpen(true),
      show: canAccessTeams || isAdmin
    },
    {
      label: 'Add Project',
      icon: FolderPlus,
      color: 'bg-blue-600',
      delay: 'delay-[100ms]',
      action: () => setIsProjectModalOpen(true),
      show: isAdmin
    },
    {
      label: 'Add Payment',
      icon: CreditCard,
      color: 'bg-purple-600',
      delay: 'delay-[50ms]',
      action: () => setIsPaymentModalOpen(true),
      show: canAccessPayments
    },
    {
      label: 'Add Expense',
      icon: Receipt,
      color: 'bg-emerald-600',
      delay: 'delay-[0ms]',
      action: () => setIsExpenseModalOpen(true),
      show: canAccessExpenses
    }
  ].filter(action => action.show);

  return (
    <div className="min-h-screen bg-slate-50">

      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="w-full px-0 sm:px-6 lg:px-8">
          <div className="relative flex items-center justify-between h-16">
            {/* Hamburger (mobile) */}
            <div className="md:hidden absolute left-3 top-1/2 -translate-y-1/2">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 rounded-lg text-slate-700 hover:bg-slate-100"
                title="Menu"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
            <div className="md:static absolute left-1/2 -translate-x-1/2 md:transform-none">
              <img
                src="/logo.png"
                alt="Artistic Engineers logo"
                className="h-8 sm:h-9 md:h-10 w-auto object-contain select-none shrink-0"
                draggable="false"
              />
            </div>

            <div className="hidden md:flex space-x-1 justify-center flex-1">
              <button
                onClick={() => navigate('overview')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentView === 'overview'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                Overview
              </button>
              {(isAdmin || canAccessProjects) && (
                <button
                  onClick={() => navigate('projects')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentView === 'projects'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  Projects
                </button>
              )}
              {canAccessExpenses && (
                <button
                  onClick={() => navigate('expenses')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentView === 'expenses'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  Expense
                </button>
              )}
              {canAccessPayments && (
                <button
                  onClick={() => navigate('payments')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentView === 'payments'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  Payments
                </button>
              )}
              {isAdmin && canAccessQuotations && (
                <button
                  onClick={() => navigate('quotations')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentView === 'quotations'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  Quotations
                </button>
              )}
              {canAccessReports && (
                <button
                  onClick={() => navigate('reports')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentView === 'reports'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  Reports
                </button>
              )}
              {/* Client Reports removed — unified under Reports */}
              {canAccessSuppliers && (
                <button
                  onClick={() => navigate('suppliers')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentView === 'suppliers'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  Suppliers
                </button>
              )}
              {isAdmin && canAccessProducts && (
                <button
                  onClick={() => navigate('products')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentView === 'products'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  Products
                </button>
              )}
              {canAccessTeams && (
                <button
                  onClick={() => navigate('teams')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${currentView === 'teams'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                    }`}
                >
                  Teams
                </button>
              )}

            </div>

            <div className="flex items-center gap-2 md:static absolute right-3 top-2">
              {/* Notification Bell + Dropdown (hover/click) */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setIsNotificationsOpen(true)}
                  onMouseEnter={() => setIsBellHover(true)}
                  onMouseLeave={() => setIsBellHover(false)}
                  className="relative p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {notifications.filter((n) => !n.read).length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                      {notifications.filter((n) => !n.read).length}
                    </span>
                  )}
                </button>
                {showNotificationsDropdown && (
                  <div
                    className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg z-50"
                    onMouseEnter={() => setIsDropdownHover(true)}
                    onMouseLeave={() => setIsDropdownHover(false)}
                  >
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200">
                      <span className="text-sm font-medium text-slate-700">Notifications</span>
                      <button
                        onClick={() => markAllNotificationsRead()}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        Mark all read
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-slate-500">No notifications</div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className={`px-3 py-2 flex items-start gap-2 ${n.read ? 'bg-white' : 'bg-slate-50'}`}>
                            <div className={`mt-1 w-2 h-2 rounded-full ${getNotificationDotClass(n.message)}`}></div>
                            <div className="flex-1">
                              <div className="text-sm text-slate-800">{n.message}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{new Date(n.createdAt).toLocaleString('en-IN')}</div>
                            </div>
                            {!n.read && (
                              <button
                                onClick={() => markNotificationRead(n.id)}
                                className="text-xs text-slate-500 hover:text-slate-700"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>


              {canAccessSettings && (
                <button
                  onClick={() => setCurrentView('settings')}
                  className={`hidden md:inline-flex p-2 rounded-lg transition-colors ${currentView === 'settings'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              )}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className={`p-1 rounded-lg transition-colors ${currentView === 'users'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  title="User"
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen}
                >
                  {(() => {
                    return currentUser?.photoUrl ? (
                      <img
                        src={currentUser.photoUrl}
                        alt={currentUser.name || 'User'}
                        className="w-8 h-8 rounded-full object-cover border-2 border-slate-200"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-slate-700 text-white flex items-center justify-center text-sm font-medium">
                        {(currentUser?.name || 'U').charAt(0).toUpperCase()}
                      </div>
                    );
                  })()}
                </button>
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-50">
                    <div className="px-3 py-2 border-b border-slate-200">
                      <div className="text-sm font-medium text-slate-800">{currentUser?.name || 'User'}</div>
                      <div className="text-xs text-slate-500">{currentUser?.email || ''}</div>
                    </div>

                    <div className="py-2">
                      <button
                        onClick={() => { setIsProfileModalOpen(true); setIsUserMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700 block md:hidden"
                      >
                        My Profile
                      </button>
                      <button
                        onClick={() => { setIsProfileModalOpen(true); setIsUserMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700 hidden md:block"
                      >
                        My Profile
                      </button>
                    </div>

                    {canAccessUsers && (
                      <div className="py-2 border-t border-slate-100">
                        <button
                          onClick={() => { setCurrentView('users'); setIsUserMenuOpen(false); }}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700"
                        >
                          Manage Users
                        </button>
                      </div>
                    )}
                    <div className="px-3 py-2 border-t border-slate-200">
                      <button
                        onClick={() => { setIsUserMenuOpen(false); logout(); }}
                        className="w-full px-3 py-2 text-sm rounded-md bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                        title="Logout"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer (full names) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/30 mobile-drawer-overlay"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute top-0 bottom-0 left-0 w-64 bg-white border-r border-slate-200 shadow-xl mobile-drawer">
            <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">Menu</span>
              <button className="p-2 rounded-lg text-slate-700 hover:bg-slate-100" onClick={() => setIsMobileMenuOpen(false)} aria-label="Close menu">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="py-2">
              <button onClick={() => { navigate('overview'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-2 flex items-center gap-2 ${currentView === 'overview' ? 'bg-slate-800 text-white' : 'hover:bg-slate-50 text-slate-700'}`}>
                <LayoutDashboard className="w-5 h-5" />
                <span>Overview</span>
              </button>
              {(isAdmin || canAccessProjects) && (
                <button onClick={() => { navigate('projects'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-2 flex items-center gap-2 ${currentView === 'projects' ? 'bg-slate-800 text-white' : 'hover:bg-slate-50 text-slate-700'}`}>
                  <FolderKanban className="w-5 h-5" />
                  <span>Projects</span>
                </button>
              )}
              {canAccessExpenses && (
                <button onClick={() => { navigate('expenses'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-2 flex items-center gap-2 ${currentView === 'expenses' ? 'bg-slate-800 text-white' : 'hover:bg-slate-50 text-slate-700'}`}>
                  <Receipt className="w-5 h-5" />
                  <span>Expense</span>
                </button>
              )}
              {canAccessPayments && (
                <button onClick={() => { navigate('payments'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-2 flex items-center gap-2 ${currentView === 'payments' ? 'bg-slate-800 text-white' : 'hover:bg-slate-50 text-slate-700'}`}>
                  <CreditCard className="w-5 h-5" />
                  <span>Payments</span>
                </button>
              )}
              {isAdmin && canAccessQuotations && (
                <button onClick={() => { navigate('quotations'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-2 flex items-center gap-2 ${currentView === 'quotations' ? 'bg-slate-800 text-white' : 'hover:bg-slate-50 text-slate-700'}`}>
                  <FileText className="w-5 h-5" />
                  <span>Quotations</span>
                </button>
              )}
              {canAccessReports && (
                <button onClick={() => { navigate('reports'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-2 flex items-center gap-2 ${currentView === 'reports' ? 'bg-slate-800 text-white' : 'hover:bg-slate-50 text-slate-700'}`}>
                  <BarChart2 className="w-5 h-5" />
                  <span>Reports</span>
                </button>
              )}
              {canAccessSuppliers && (
                <button onClick={() => { navigate('suppliers'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-2 flex items-center gap-2 ${currentView === 'suppliers' ? 'bg-slate-800 text-white' : 'hover:bg-slate-50 text-slate-700'}`}>
                  <Building className="w-5 h-5" />
                  <span>Suppliers</span>
                </button>
              )}
              {isAdmin && canAccessProducts && (
                <button onClick={() => { navigate('products'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-2 flex items-center gap-2 ${currentView === 'products' ? 'bg-slate-800 text-white' : 'hover:bg-slate-50 text-slate-700'}`}>
                  <Box className="w-5 h-5" />
                  <span>Products</span>
                </button>
              )}
              {canAccessTeams && (
                <button onClick={() => { navigate('teams'); setIsMobileMenuOpen(false); }} className={`w-full text-left px-4 py-2 flex items-center gap-2 ${currentView === 'teams' ? 'bg-slate-800 text-white' : 'hover:bg-slate-50 text-slate-700'}`}>
                  <Users className="w-5 h-5" />
                  <span>Teams</span>
                </button>
              )}

              <div className="mt-4 pt-4 border-t border-slate-100">
                <button
                  onClick={() => { setIsMobileMenuOpen(false); logout(); }}
                  className="w-full text-left px-4 py-2 flex items-center gap-2 text-rose-600 hover:bg-rose-50"
                  title="Logout"
                >
                  <User className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Mobile top tabs removed in favor of bottom navigation */}

      <main className="w-full px-0 sm:px-6 lg:px-8 py-0 sm:py-8 pb-24">{renderView()}</main>


      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4"></div>
      </footer>

      {/* Quick Action Overlay & Menu */}
      {isQuickActionsOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center pb-24 md:hidden bg-slate-900/30 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setIsQuickActionsOpen(false)}>
          <div className="relative flex flex-col items-center">
            {quickActions.map((item, index) => {
              const Icon = item.icon;
              const totalActions = quickActions.length;
              // Calculate arc position (spread from -60deg to +60deg)
              const angle = -60 + (120 / (totalActions - 1)) * index;
              const radius = 100; // Distance from center
              const x = Math.sin((angle * Math.PI) / 180) * radius;
              const y = -Math.cos((angle * Math.PI) / 180) * radius;

              return (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    item.action();
                    setIsQuickActionsOpen(false);
                  }}
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                  }}
                  className={`absolute w-14 h-14 rounded-full shadow-lg text-white font-medium transition-all duration-300 hover:scale-110 active:scale-95 animate-in zoom-in fade-in fill-mode-backwards flex items-center justify-center ${item.color} ${item.delay}`}
                  title={item.label}
                >
                  <Icon className="w-6 h-6" />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav fixed bottom-0 inset-x-0 md:hidden z-[60]">
        <div className="px-3 py-2 pb-[calc(22px+env(safe-area-inset-bottom))] bg-white/95 backdrop-blur shadow-[0_-1px_10px_rgba(0,0,0,0.05)] border-t border-slate-100">
          <div className="flex items-center gap-1.5 justify-between">
            {(() => {
              const items: JSX.Element[] = [];
              items.push(
                <button
                  key="overview"
                  onClick={() => { setCurrentView('overview'); setIsQuickActionsOpen(false); }}
                  className={`mobile-nav-btn ${currentView === 'overview' ? 'is-active' : ''}`}
                  title="Overview"
                >
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="label">Overview</span>
                </button>
              );
              if (isAdmin || canAccessProjects) {
                items.push(
                  <button
                    key="projects"
                    onClick={() => { setCurrentView('projects'); setIsQuickActionsOpen(false); }}
                    className={`mobile-nav-btn ${currentView === 'projects' ? 'is-active' : ''}`}
                    title="Projects"
                  >
                    <FolderKanban className="w-5 h-5" />
                    <span className="label">Projects</span>
                  </button>
                );
              }
              if (canAccessExpenses) {
                items.push(
                  <button
                    key="expenses"
                    onClick={() => { setCurrentView('expenses'); setIsQuickActionsOpen(false); }}
                    className={`mobile-nav-btn ${currentView === 'expenses' ? 'is-active' : ''}`}
                    title="Expenses"
                  >
                    <Receipt className="w-5 h-5" />
                    <span className="label">Expense</span>
                  </button>
                );
              }
              if (canAccessPayments) {
                items.push(
                  <button
                    key="payments"
                    onClick={() => { setCurrentView('payments'); setIsQuickActionsOpen(false); }}
                    className={`mobile-nav-btn ${currentView === 'payments' ? 'is-active' : ''}`}
                    title="Payments"
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="label">Payments</span>
                  </button>
                );
              }
              const addBtn = (
                <button
                  key="quick-add"
                  onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
                  className={`mobile-nav-btn ${isQuickActionsOpen ? 'text-slate-900' : ''}`}
                  title="Quick Add"
                  aria-label="Quick Add"
                  style={{ overflow: 'visible' }}
                >
                  <div className={`p-1.5 rounded-full transition-all duration-300 ${isQuickActionsOpen ? 'bg-slate-100 rotate-45' : 'bg-transparent'}`}>
                    <Plus className="w-7 h-7" />
                  </div>
                  <span className="label">{isQuickActionsOpen ? 'Close' : 'Add'}</span>
                </button>
              );
              const insertIndex = 2;
              const arranged = items.slice(0);
              arranged.splice(Math.min(insertIndex, arranged.length), 0, addBtn);
              return arranged;
            })()}
          </div>
        </div>
      </nav>

      {/* TaskQuickAdd removed */}

      {/* Render Modals */}
      {isExpenseModalOpen && (
        <ExpenseModal
          onClose={() => setIsExpenseModalOpen(false)}
        />
      )}
      {isPaymentModalOpen && (
        <PaymentModal
          onClose={() => setIsPaymentModalOpen(false)}
        />
      )}
      {/* Profile Modal - Reusing UserModal in Profile Mode */}
      {isProfileModalOpen && currentUser && (
        <UserModal // Changed from UserModal to UserModal component usage
          user={currentUser}
          onClose={() => setIsProfileModalOpen(false)}
          isProfileMode={true}
        />
      )}
      {isProjectModalOpen && (
        <ProjectModal
          project={null}
          onClose={() => setIsProjectModalOpen(false)}
        />
      )}
      {/* Team Member Modal */}
      {isTeamModalOpen && (
        <AddTeamMemberModal
          onClose={() => setIsTeamModalOpen(false)}
        />
      )}

      {/* Mobile Refresh Button - Sticky on left side */}
      {!isExpenseModalOpen && !isPaymentModalOpen && !isProjectModalOpen && !isTeamModalOpen && !isMobileMenuOpen && !isQuickActionsOpen && (
        <button
          onClick={() => window.location.reload()}
          className="fixed left-4 bottom-24 md:bottom-6 z-40 p-3 md:px-4 md:py-2.5 rounded-full md:rounded-xl shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
          style={{ backgroundColor: '#D1FAE5' }}
          title="Reload Page"
          aria-label="Reload page"
        >
          <RefreshCw className="w-5 h-5" style={{ color: '#16A34A' }} />
          <span className="hidden md:block font-bold text-emerald-700 text-sm">Reload</span>
        </button>
      )}

    </div>
  );
}
