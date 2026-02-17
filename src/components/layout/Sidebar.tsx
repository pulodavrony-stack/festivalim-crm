'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTeam } from '@/components/providers/TeamProvider';
import { useAuth } from '@/components/providers/AuthProvider';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  badge?: number;
}

const mainNav: NavItem[] = [
  { href: '/', label: 'Главная', icon: '🏠' },
  { href: '/pipeline', label: 'Воронка', icon: '📊' },
  { href: '/clients', label: 'Клиенты', icon: '👥' },
  { href: '/companies', label: 'B2B Компании', icon: '🏢' },
  { href: '/tasks', label: 'Задачи', icon: '📋' },
  { href: '/messages', label: 'Сообщения', icon: '💬' },
  { href: '/events', label: 'События', icon: '📅' },
  { href: '/shows', label: 'Спектакли', icon: '🎭' },
  { href: '/analytics', label: 'Аналитика', icon: '📈' },
  { href: '/email', label: 'Email рассылки', icon: '✉️' },
];

const settingsNav: NavItem[] = [
  { href: '/settings/managers', label: 'Менеджеры', icon: '👤' },
  { href: '/settings/routing', label: 'Распределение', icon: '🎯' },
  { href: '/settings/duplicates', label: 'Дубликаты', icon: '🔄' },
  { href: '/settings/transfer', label: 'Перевалка', icon: '👥' },
  { href: '/settings/managers-access', label: 'Права доступа', icon: '🔐' },
  { href: '/settings/teams', label: 'Команды', icon: '🏢' },
  { href: '/settings/data', label: 'Импорт/Экспорт', icon: '📥' },
  { href: '/settings/profile', label: 'Мой профиль', icon: '⚙️' },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { team, canSwitchTeams, allTeams, switchTeam } = useTeam();
  const { signOut } = useAuth();
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-64 bg-white border-r shadow-lg z-50 transform transition-transform lg:translate-x-0 lg:static lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo + Team Switcher */}
        <div className="h-auto border-b">
          <div className="h-16 flex items-center px-6">
            <Link href="/" className="flex items-center gap-3">
              <span className="text-3xl">🎭</span>
              <span className="font-bold text-xl text-gray-900">Фестивалим</span>
            </Link>
          </div>
          
          {/* Team Switcher */}
          {team && (
            <div className="px-4 pb-3">
              {canSwitchTeams && allTeams.length > 1 ? (
                <div className="relative">
                  <button
                    onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
                    className="w-full flex items-center justify-between px-3 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100 hover:border-indigo-200 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏢</span>
                      <span className="font-medium text-sm text-gray-900 truncate">{team.name}</span>
                    </div>
                    <svg className={`w-4 h-4 text-gray-500 transition-transform ${teamDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  
                  {teamDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border z-50">
                      {allTeams.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            switchTeam(t.id);
                            setTeamDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2 ${
                            t.id === team.id ? 'bg-indigo-50' : ''
                          }`}
                        >
                          <span className="text-lg">🏢</span>
                          <span className={`text-sm ${t.id === team.id ? 'font-semibold text-indigo-600' : 'text-gray-700'}`}>
                            {t.name}
                          </span>
                          {t.id === team.id && (
                            <svg className="w-4 h-4 text-indigo-600 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg">
                  <span className="text-lg">🏢</span>
                  <span className="font-medium text-sm text-gray-700 truncate">{team.name}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {mainNav.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`ml-auto px-2 py-0.5 rounded-full text-xs font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Settings Section */}
        <div className="px-4 mt-4">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-4 mb-2">
            Настройки
          </div>
          <nav className="space-y-1">
            {settingsNav.map((item) => {
              const isActive = pathname === item.href;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all text-sm ${
                    isActive
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
                  }`}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Info */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t bg-gray-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 shrink-0 rounded-full bg-red-500 flex items-center justify-center text-white text-sm font-bold">
              {team?.name?.[0] || 'М'}
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="text-sm font-medium text-gray-900 truncate leading-tight">{team?.name || 'Команда'}</div>
              <div className="text-xs text-gray-400 truncate leading-tight">{team?.schema_name || ''}</div>
            </div>
            <button 
              onClick={() => signOut()}
              className="shrink-0 p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-white transition-colors"
              title="Выйти"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
