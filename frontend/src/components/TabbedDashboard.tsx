import { useState, useRef, useEffect } from 'react';
import { LayoutDashboard, ListTodo, Target, Shield } from 'lucide-react';
import OverviewDashboard from './OverviewDashboard';
import TodoListView from './TodoListView';
import MarketingDashboard from './MarketingDashboard';
import AdminSummary from './AdminSummary';
import { useApp } from '../context/AppContext';
import useShowScrollbarOnScroll from '../hooks/useShowScrollbarOnScroll';

type TabType = 'overview' | 'todo' | 'marketing' | 'summary';

export default function TabbedDashboard() {
  const { currentUser } = useApp();
  const isAdmin = currentUser?.role === 'admin';
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('dashboard_active_tab');
    return (saved as TabType) || 'todo';
  });

  useEffect(() => {
    localStorage.setItem('dashboard_active_tab', activeTab);
  }, [activeTab]);
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  useShowScrollbarOnScroll(tabsScrollRef);

  // Default order (To-Do first, Overview last)
  const defaultOrder: TabType[] = ['todo', 'marketing', 'summary', 'overview'];

  // Start with default order; user can still drag to reorder and it will be saved
  const [tabOrder, setTabOrder] = useState<TabType[]>(defaultOrder);

  // Save to localStorage whenever order changes
  useEffect(() => {
    localStorage.setItem('dashboard_tab_order', JSON.stringify(tabOrder));
  }, [tabOrder]);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLButtonElement>, position: number) => {
    dragItem.current = position;
    e.dataTransfer.effectAllowed = "move";
    // Make the drag image transparent or styled if needed, 
    // but default browser behavior is usually fine for tabs.
  };

  const handleDragEnter = (e: React.DragEvent<HTMLButtonElement>, position: number) => {
    dragOverItem.current = position;
    e.preventDefault();

    // Optional: Reorder on hover (smoother) vs on drop
    // Implementing reorder on hover for better UX:
    if (dragItem.current !== null && dragItem.current !== dragOverItem.current) {
      const newOrder = [...tabOrder];
      const draggedItemContent = newOrder[dragItem.current];
      newOrder.splice(dragItem.current, 1);
      newOrder.splice(dragOverItem.current, 0, draggedItemContent);

      setTabOrder(newOrder);
      dragItem.current = dragOverItem.current;
    }
  };

  const handleDragEnd = () => {
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const allTabs: Record<TabType, { label: string; icon: any }> = {
    overview: { label: 'Performance', icon: LayoutDashboard },
    todo: { label: 'To-Do List', icon: ListTodo },
    marketing: { label: 'Marketing', icon: Target },
    summary: { label: 'Summary', icon: Shield },
  };

  // Filter tabs based on permissions
  const { hasPermission } = useApp();
  const visibleTabs = tabOrder.filter(id => {
    if (id === 'overview') return hasPermission('dashboard', 'read');
    if (id === 'summary') return isAdmin; // Summary is Admin only
    return hasPermission(id as any, 'read');
  });

  // Ensure active tab is visible
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0]);
    }
  }, [visibleTabs, activeTab]);

  return (
    <div className="space-y-0 md:space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 hidden md:block">
        <div ref={tabsScrollRef} className="border-b border-slate-200 overflow-x-auto thin-scrollbar">
          <div className="flex">
            {visibleTabs.map((tabId, index) => {
              const tab = allTabs[tabId];
              const Icon = tab.icon;
              return (
                <button
                  key={tabId}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onClick={() => setActiveTab(tabId)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${activeTab === tabId
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
          {activeTab === 'overview' && <OverviewDashboard />}

          {activeTab === 'todo' && <TodoListView />}

          {activeTab === 'marketing' && <MarketingDashboard />}

          {activeTab === 'summary' && <AdminSummary />}
        </div>
      </div>

      {/* Mobile Tab Navigation */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex justify-between items-center gap-2 px-1">
          {visibleTabs.map((tabId) => {
            const tab = allTabs[tabId];
            const isActive = activeTab === tabId;
            return (
              <button
                key={tabId}
                onClick={() => setActiveTab(tabId)}
                className={`flex-1 px-1 py-3 text-sm font-semibold whitespace-nowrap transition-colors border-b-2 ${isActive
                  ? 'border-slate-800 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content for both desktop and mobile, adjusted for mobile spacing */}
      <div className="md:hidden pt-14 pb-20">
        {activeTab === 'overview' && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <OverviewDashboard />
          </div>
        )}
        {activeTab === 'todo' && (
          <div className="bg-white md:rounded-lg md:shadow-sm md:border md:border-slate-200">
            <TodoListView isActive={true} />
          </div>
        )}
        {activeTab === 'marketing' && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <MarketingDashboard />
          </div>
        )}
        {activeTab === 'summary' && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <AdminSummary />
          </div>
        )}
      </div>
    </div>
  );
}
