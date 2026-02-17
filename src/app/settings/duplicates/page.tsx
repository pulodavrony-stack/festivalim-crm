'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface Client {
  id: string;
  full_name: string;
  phone: string;
  phone_normalized?: string;
  email?: string;
  client_type: 'lead' | 'pk' | 'kb';
  total_purchases: number;
  total_revenue: number;
  created_at: string;
  city?: { name: string } | { name: string }[];
}

interface DuplicateGroup {
  phone: string;
  clients: Client[];
}

const clientTypeLabels = {
  lead: { label: 'Лид', color: 'bg-blue-100 text-blue-700' },
  pk: { label: 'ПК', color: 'bg-purple-100 text-purple-700' },
  kb: { label: 'КБ', color: 'bg-green-100 text-green-700' },
};

export default function DuplicatesPage() {
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null);
  const [searchPhone, setSearchPhone] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);

  useEffect(() => {
    loadDuplicates();
  }, []);

  async function loadDuplicates() {
    setLoading(true);
    
    // Get all clients with their phones
    const { data: clients } = await supabase
      .from('clients')
      .select(`
        id, full_name, phone, phone_normalized, email, client_type, 
        total_purchases, total_revenue, created_at,
        city:cities(name)
      `)
      .not('phone_normalized', 'is', null)
      .order('created_at', { ascending: false });
    
    if (clients) {
      // Group by normalized phone
      const phoneGroups = new Map<string, Client[]>();
      
      clients.forEach((client) => {
        if (!client.phone_normalized) return;
        
        const existing = phoneGroups.get(client.phone_normalized) || [];
        existing.push(client);
        phoneGroups.set(client.phone_normalized, existing);
      });
      
      // Filter groups with more than 1 client
      const duplicateGroups: DuplicateGroup[] = [];
      phoneGroups.forEach((groupClients, phone) => {
        if (groupClients.length > 1) {
          duplicateGroups.push({
            phone,
            clients: groupClients.sort((a, b) => {
              // Sort by type priority (kb > pk > lead) then by purchases
              const typePriority = { kb: 3, pk: 2, lead: 1 };
              const diff = typePriority[b.client_type] - typePriority[a.client_type];
              if (diff !== 0) return diff;
              return b.total_purchases - a.total_purchases;
            }),
          });
        }
      });
      
      setDuplicates(duplicateGroups.slice(0, 50)); // Limit to 50 groups
    }
    
    setLoading(false);
  }

  async function searchByPhone() {
    if (!searchPhone.trim()) return;
    
    const { data } = await supabase
      .from('clients')
      .select(`
        id, full_name, phone, phone_normalized, email, client_type, 
        total_purchases, total_revenue, created_at,
        city:cities(name)
      `)
      .ilike('phone', `%${searchPhone}%`)
      .limit(20);
    
    if (data) {
      setSearchResults(data);
    }
  }

  async function mergeClients(mainId: string, duplicateId: string, phone: string) {
    if (!confirm(`Объединить клиентов? Все данные будут перенесены в основную запись.`)) {
      return;
    }
    
    setMerging(duplicateId);
    
    const { data, error } = await supabase.rpc('merge_clients', {
      p_main_id: mainId,
      p_duplicate_id: duplicateId,
    });
    
    if (!error && data?.success) {
      // Remove from duplicates list
      setDuplicates(prev => 
        prev.map(group => {
          if (group.phone === phone) {
            return {
              ...group,
              clients: group.clients.filter(c => c.id !== duplicateId),
            };
          }
          return group;
        }).filter(group => group.clients.length > 1)
      );
    } else {
      alert('Ошибка объединения: ' + (error?.message || data?.error || 'Unknown error'));
    }
    
    setMerging(null);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl">🎭</Link>
              <h1 className="text-xl font-bold text-gray-900">Объединение дубликатов</h1>
            </div>
            <Link href="/" className="text-gray-600 hover:text-gray-900">← Назад</Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="font-semibold text-gray-900 mb-4">Поиск по телефону</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchByPhone()}
              placeholder="Введите телефон..."
              className="flex-1 px-4 py-2 border rounded-lg focus:border-red-500 outline-none"
            />
            <button
              onClick={searchByPhone}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium"
            >
              Найти
            </button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="mt-4 space-y-2">
              {searchResults.map((client) => (
                <div key={client.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="font-medium text-gray-900">{client.full_name}</span>
                    <span className="ml-2 text-sm text-gray-500">{client.phone}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${clientTypeLabels[client.client_type].color}`}>
                      {clientTypeLabels[client.client_type].label}
                    </span>
                  </div>
                  <Link
                    href={`/clients/${client.id}`}
                    className="text-sm text-red-500 hover:text-red-600"
                  >
                    Открыть
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Duplicates list */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b">
            <h3 className="font-semibold text-gray-900">
              Найдено дубликатов: {duplicates.length}
            </h3>
            <p className="text-sm text-gray-500">
              Контакты с одинаковым номером телефона. Первый в списке рекомендуется как основная запись.
            </p>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500 mx-auto"></div>
            </div>
          ) : duplicates.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Дубликатов не найдено
            </div>
          ) : (
            <div className="divide-y">
              {duplicates.map((group) => (
                <div key={group.phone} className="p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-sm font-medium text-gray-500">Телефон:</span>
                    <span className="font-mono text-gray-900">{group.clients[0]?.phone || group.phone}</span>
                    <span className="text-sm text-gray-400">({group.clients.length} записей)</span>
                  </div>
                  
                  <div className="space-y-2">
                    {group.clients.map((client, index) => {
                      const cityData = Array.isArray(client.city) ? client.city[0] : client.city;
                      return (
                      <div 
                        key={client.id} 
                        className={`flex items-center justify-between p-4 rounded-lg ${
                          index === 0 ? 'bg-green-50 border-2 border-green-200' : 'bg-gray-50'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">{client.full_name}</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs ${clientTypeLabels[client.client_type].color}`}>
                              {clientTypeLabels[client.client_type].label}
                            </span>
                            {index === 0 && (
                              <span className="px-2 py-0.5 bg-green-500 text-white rounded-full text-xs">
                                Рекомендуемая
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-gray-500 flex gap-4">
                            <span>Покупок: {client.total_purchases}</span>
                            <span>Сумма: {client.total_revenue.toLocaleString('ru-RU')} ₽</span>
                            <span>{cityData?.name || 'Без города'}</span>
                            <span>Создан: {new Date(client.created_at).toLocaleDateString('ru-RU')}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Link
                            href={`/clients/${client.id}`}
                            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                          >
                            Открыть
                          </Link>
                          {index > 0 && (
                            <button
                              onClick={() => mergeClients(group.clients[0].id, client.id, group.phone)}
                              disabled={merging === client.id}
                              className="px-3 py-1.5 text-sm bg-red-100 text-red-600 hover:bg-red-200 rounded font-medium disabled:opacity-50"
                            >
                              {merging === client.id ? 'Объединение...' : 'Объединить →'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
