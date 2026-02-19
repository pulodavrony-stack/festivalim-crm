'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import OrgotdelEvents from '@/components/orgotdel/OrgotdelEvents';
import OrgotdelPlanning from '@/components/orgotdel/OrgotdelPlanning';
import OrgotdelSvedenie from '@/components/orgotdel/OrgotdelSvedenie';
import OrgotdelPayments from '@/components/orgotdel/OrgotdelPayments';
import OrgotdelDirectories from '@/components/orgotdel/OrgotdelDirectories';
import OrgotdelTasks from '@/components/orgotdel/OrgotdelTasks';
import OrgotdelAnalytics from '@/components/orgotdel/OrgotdelAnalytics';

type TabType = 'events' | 'planning' | 'svedenie' | 'payments' | 'directories' | 'tasks' | 'analytics';

const tabs: { id: TabType; label: string; icon: string }[] = [
  { id: 'planning', label: 'Планирование', icon: '📅' },
  { id: 'events', label: 'События', icon: '🎭' },
  { id: 'svedenie', label: 'Сведение', icon: '📝' },
  { id: 'payments', label: 'Оплаты', icon: '💰' },
  { id: 'directories', label: 'Справочники', icon: '📚' },
  { id: 'tasks', label: 'Задачи', icon: '✅' },
  { id: 'analytics', label: 'Аналитика', icon: '📊' },
];

export default function OrgotdelPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('events');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const tab = searchParams.get('tab') as TabType;
    if (tab && tabs.some(t => t.id === tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    router.push(`/orgotdel?tab=${tab}`, { scroll: false });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'planning':
        return <OrgotdelPlanning />;
      case 'events':
        return <OrgotdelEvents />;
      case 'svedenie':
        return <OrgotdelSvedenie />;
      case 'payments':
        return <OrgotdelPayments />;
      case 'directories':
        return <OrgotdelDirectories />;
      case 'tasks':
        return <OrgotdelTasks />;
      case 'analytics':
        return <OrgotdelAnalytics />;
      default:
        return <OrgotdelEvents />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      <main className="flex-1 lg:ml-0">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-30 bg-white border-b px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-bold text-gray-900">Орготдел</h1>
        </div>

        {/* Page Header */}
        <div className="bg-white border-b">
          <div className="px-4 lg:px-6 py-4">
            <h1 className="text-2xl font-bold text-gray-900 hidden lg:block">Орготдел</h1>
            <p className="text-gray-500 text-sm mt-1 hidden lg:block">
              Управление событиями, планирование гастролей, платежи
            </p>
          </div>
          
          {/* Tabs */}
          <div className="px-4 lg:px-6 overflow-x-auto">
            <div className="flex gap-1 min-w-max pb-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-red-500 text-red-600 bg-red-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 lg:p-6">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
