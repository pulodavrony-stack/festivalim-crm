'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSchemaClient, useTeam } from '@/components/providers/TeamProvider';

interface Task {
  id: string;
  title: string;
  description: string;
  task_type: string;
  priority: string;
  status: string;
  due_date: string;
  due_time: string;
  completed_at: string | null;
  client: {
    id: string;
    full_name: string;
    phone: string;
  } | null;
  deal: {
    id: string;
    title: string;
  } | null;
  created_at: string;
}

interface TaskStats {
  today: number;
  overdue: number;
  upcoming: number;
  completed_today: number;
}

const taskTypeLabels: Record<string, { label: string; icon: string }> = {
  call: { label: 'Позвонить', icon: '📞' },
  callback: { label: 'Перезвонить', icon: '🔄' },
  meeting: { label: 'Встреча', icon: '🤝' },
  email: { label: 'Email', icon: '📧' },
  whatsapp: { label: 'WhatsApp', icon: '💬' },
  other: { label: 'Другое', icon: '📋' },
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

export default function TasksPage() {
  const supabase = useSchemaClient();
  const { teamSchema, isLoading: teamLoading } = useTeam();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats>({ today: 0, overdue: 0, upcoming: 0, completed_today: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'today' | 'overdue' | 'upcoming' | 'completed'>('today');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const loadTasks = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    
    let query = supabase
      .from('tasks')
      .select(`
        *,
        client:clients(id, full_name, phone),
        deal:deals(id, title)
      `)
      .order('due_date', { ascending: true })
      .order('due_time', { ascending: true });

    if (filter === 'today') {
      query = query.eq('due_date', today).neq('status', 'completed');
    } else if (filter === 'overdue') {
      query = query.lt('due_date', today).neq('status', 'completed');
    } else if (filter === 'upcoming') {
      query = query.gt('due_date', today).neq('status', 'completed');
    } else if (filter === 'completed') {
      query = query.eq('status', 'completed').order('completed_at', { ascending: false });
    }

    const { data } = await query.limit(100);
    if (data) setTasks(data);
    setLoading(false);
  }, [filter]);

  const loadStats = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayResult, overdueResult, upcomingResult, completedResult] = await Promise.all([
      supabase.from('tasks').select('id', { count: 'exact', head: true })
        .eq('due_date', today).neq('status', 'completed'),
      supabase.from('tasks').select('id', { count: 'exact', head: true })
        .lt('due_date', today).neq('status', 'completed'),
      supabase.from('tasks').select('id', { count: 'exact', head: true })
        .gt('due_date', today).neq('status', 'completed'),
      supabase.from('tasks').select('id', { count: 'exact', head: true })
        .eq('status', 'completed').gte('completed_at', todayStart.toISOString()),
    ]);

    setStats({
      today: todayResult.count || 0,
      overdue: overdueResult.count || 0,
      upcoming: upcomingResult.count || 0,
      completed_today: completedResult.count || 0,
    });
  }, []);

  useEffect(() => {
    if (!teamLoading) {
      loadTasks();
      loadStats();
    }
  }, [loadTasks, loadStats, teamLoading]);

  async function completeTask(taskId: string) {
    await supabase
      .from('tasks')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', taskId);
    
    loadTasks();
    loadStats();
  }

  async function snoozeTask(taskId: string, days: number) {
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    
    await supabase
      .from('tasks')
      .update({ due_date: newDate.toISOString().split('T')[0] })
      .eq('id', taskId);
    
    loadTasks();
    loadStats();
  }

  function formatDueDate(date: string, time?: string) {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    let dateStr = '';
    if (date === today) {
      dateStr = 'Сегодня';
    } else if (date === tomorrowStr) {
      dateStr = 'Завтра';
    } else if (date < today) {
      const daysAgo = Math.floor((new Date().getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
      dateStr = `${daysAgo} дн. назад`;
    } else {
      dateStr = new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    }

    if (time) {
      dateStr += ` в ${time.slice(0, 5)}`;
    }

    return dateStr;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl">🎭</Link>
              <h1 className="text-xl font-bold text-gray-900">Задачи</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                + Новая задача
              </button>
              <Link href="/" className="text-gray-600 hover:text-gray-900">← Назад</Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <button
            onClick={() => setFilter('overdue')}
            className={`bg-white rounded-xl p-4 text-left transition-all ${
              filter === 'overdue' ? 'ring-2 ring-red-500' : 'hover:shadow-md'
            }`}
          >
            <div className="text-3xl font-bold text-red-500">{stats.overdue}</div>
            <div className="text-sm text-gray-500">Просрочено</div>
          </button>
          <button
            onClick={() => setFilter('today')}
            className={`bg-white rounded-xl p-4 text-left transition-all ${
              filter === 'today' ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
            }`}
          >
            <div className="text-3xl font-bold text-blue-500">{stats.today}</div>
            <div className="text-sm text-gray-500">На сегодня</div>
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`bg-white rounded-xl p-4 text-left transition-all ${
              filter === 'upcoming' ? 'ring-2 ring-purple-500' : 'hover:shadow-md'
            }`}
          >
            <div className="text-3xl font-bold text-purple-500">{stats.upcoming}</div>
            <div className="text-sm text-gray-500">Предстоящие</div>
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`bg-white rounded-xl p-4 text-left transition-all ${
              filter === 'completed' ? 'ring-2 ring-green-500' : 'hover:shadow-md'
            }`}
          >
            <div className="text-3xl font-bold text-green-500">{stats.completed_today}</div>
            <div className="text-sm text-gray-500">Выполнено сегодня</div>
          </button>
        </div>

        {/* Task List */}
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900">
              {filter === 'today' && 'Задачи на сегодня'}
              {filter === 'overdue' && 'Просроченные задачи'}
              {filter === 'upcoming' && 'Предстоящие задачи'}
              {filter === 'completed' && 'Выполненные задачи'}
            </h2>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-500"></div>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'completed' ? 'Нет выполненных задач' : 'Нет задач'}
              </h3>
              <p className="text-gray-500">
                {filter === 'today' && 'Все задачи на сегодня выполнены!'}
                {filter === 'overdue' && 'Нет просроченных задач'}
                {filter === 'upcoming' && 'Нет предстоящих задач'}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    task.status === 'completed' ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    {task.status !== 'completed' && (
                      <button
                        onClick={() => completeTask(task.id)}
                        className="mt-1 w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 transition-colors flex-shrink-0"
                      />
                    )}
                    {task.status === 'completed' && (
                      <div className="mt-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    {/* Task Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{taskTypeLabels[task.task_type]?.icon || '📋'}</span>
                        <span className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                          {task.title}
                        </span>
                        {task.priority && task.priority !== 'medium' && (
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${priorityColors[task.priority]}`}>
                            {task.priority === 'urgent' ? 'Срочно' : task.priority === 'high' ? 'Важно' : 'Низкий'}
                          </span>
                        )}
                      </div>

                      {task.description && (
                        <p className="text-sm text-gray-500 mb-2">{task.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-sm">
                        {task.client && (
                          <Link
                            href={`/clients/${task.client.id}`}
                            className="text-blue-600 hover:underline"
                          >
                            👤 {task.client.full_name}
                          </Link>
                        )}
                        {task.client?.phone && (
                          <button 
                            onClick={() => window.dispatchEvent(new CustomEvent('phone-call', { detail: { number: task.client!.phone } }))}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            📞 {task.client.phone}
                          </button>
                        )}
                        {task.deal && (
                          <span className="text-gray-500">🎫 {task.deal.title}</span>
                        )}
                      </div>
                    </div>

                    {/* Due Date & Actions */}
                    <div className="flex items-center gap-3">
                      <div className={`text-sm font-medium ${
                        task.due_date < new Date().toISOString().split('T')[0] && task.status !== 'completed'
                          ? 'text-red-500'
                          : 'text-gray-500'
                      }`}>
                        {formatDueDate(task.due_date, task.due_time)}
                      </div>

                      {task.status !== 'completed' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => snoozeTask(task.id, 1)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                            title="Перенести на завтра"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          {task.client && (
                            <button
                              onClick={() => window.dispatchEvent(new CustomEvent('phone-call', { detail: { number: task.client!.phone } }))}
                              className="p-1.5 text-green-500 hover:text-green-600 hover:bg-green-50 rounded"
                              title="Позвонить"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create Task Modal */}
      {showCreateModal && (
        <CreateTaskModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadTasks();
            loadStats();
          }}
        />
      )}
    </div>
  );
}

// Create Task Modal Component
function CreateTaskModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<{ id: string; full_name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({
    title: '',
    description: '',
    task_type: 'call',
    priority: 'medium',
    due_date: new Date().toISOString().split('T')[0],
    due_time: '10:00',
    client_id: '',
  });

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchClients();
    }
  }, [searchQuery]);

  async function searchClients() {
    const { data } = await supabase
      .from('clients')
      .select('id, full_name')
      .or(`full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
      .limit(10);
    if (data) setClients(data);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from('tasks').insert({
      title: form.title,
      description: form.description || null,
      task_type: form.task_type,
      priority: form.priority,
      due_date: form.due_date,
      due_time: form.due_time || null,
      client_id: form.client_id || null,
      status: 'pending',
    });

    if (error) {
      alert('Ошибка: ' + error.message);
      setLoading(false);
      return;
    }

    onCreated();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Новая задача</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Task Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Тип задачи</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(taskTypeLabels).map(([value, { label, icon }]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setForm({ ...form, task_type: value })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    form.task_type === value
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Например: Позвонить и уточнить детали"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Client Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Контакт</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по имени или телефону..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            {clients.length > 0 && searchQuery.length >= 2 && (
              <div className="mt-1 border rounded-lg divide-y max-h-40 overflow-y-auto">
                {clients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => {
                      setForm({ ...form, client_id: client.id });
                      setSearchQuery(client.full_name);
                      setClients([]);
                    }}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm"
                  >
                    {client.full_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата *</label>
              <input
                type="date"
                required
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Время</label>
              <input
                type="time"
                value={form.due_time}
                onChange={(e) => setForm({ ...form, due_time: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Приоритет</label>
            <div className="flex gap-2">
              {[
                { value: 'low', label: 'Низкий' },
                { value: 'medium', label: 'Средний' },
                { value: 'high', label: 'Высокий' },
                { value: 'urgent', label: 'Срочно' },
              ].map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setForm({ ...form, priority: p.value })}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    form.priority === p.value
                      ? priorityColors[p.value]
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Создание...' : 'Создать задачу'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
