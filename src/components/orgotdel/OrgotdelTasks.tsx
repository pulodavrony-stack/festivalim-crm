'use client';

import { useState, useEffect } from 'react';
import { format, parseISO, isBefore, startOfToday } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Task {
  id: string;
  title: string;
  purpose?: string;
  measurement?: string;
  due_date?: string;
  assignee_id?: string;
  department?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: number;
  link?: string;
  comments?: string;
  related_event_id?: string;
  created_at?: string;
  completed_at?: string;
}

const statusLabels: Record<string, string> = {
  pending: 'Ожидает',
  in_progress: 'В работе',
  completed: 'Выполнено',
  cancelled: 'Отменено',
};

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const priorityLabels: Record<number, string> = {
  1: 'Срочно',
  2: 'Обычный',
  3: 'Низкий',
};

const priorityColors: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-yellow-500',
  3: 'bg-gray-400',
};

export default function OrgotdelTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const res = await fetch('/api/orgotdel/tasks');
      if (res.ok) {
        setTasks(await res.json());
      }
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (id: string, status: Task['status']) => {
    try {
      const res = await fetch(`/api/orgotdel/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        loadTasks();
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const deleteTask = async (id: string) => {
    if (!confirm('Удалить задачу?')) return;
    try {
      const res = await fetch(`/api/orgotdel/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setTasks(tasks.filter(t => t.id !== id));
      }
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const createTask = async (data: Partial<Task>) => {
    try {
      const res = await fetch('/api/orgotdel/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        loadTasks();
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const updateTask = async (id: string, data: Partial<Task>) => {
    try {
      const res = await fetch(`/api/orgotdel/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        loadTasks();
        setEditingTask(null);
      }
    } catch (error) {
      console.error('Failed to update task:', error);
    }
  };

  const today = startOfToday();
  
  const filteredTasks = tasks.filter(task => {
    if (filter === 'active') return task.status !== 'completed' && task.status !== 'cancelled';
    if (filter === 'completed') return task.status === 'completed';
    return true;
  });

  const overdueTasks = filteredTasks.filter(
    t => t.due_date && t.status !== 'completed' && isBefore(parseISO(t.due_date), today)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex gap-2">
          {(['active', 'completed', 'all'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg ${
                filter === f ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {f === 'active' ? 'Активные' : f === 'completed' ? 'Выполненные' : 'Все'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="ml-auto px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Новая задача
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-lg p-4">
          <div className="text-2xl font-bold text-gray-900">
            {tasks.filter(t => t.status === 'pending').length}
          </div>
          <div className="text-sm text-gray-500">Ожидает</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-700">
            {tasks.filter(t => t.status === 'in_progress').length}
          </div>
          <div className="text-sm text-blue-600">В работе</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-700">
            {tasks.filter(t => t.status === 'completed').length}
          </div>
          <div className="text-sm text-green-600">Выполнено</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-700">{overdueTasks.length}</div>
          <div className="text-sm text-red-600">Просрочено</div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="divide-y">
          {filteredTasks.map(task => {
            const isOverdue = task.due_date && task.status !== 'completed' && isBefore(parseISO(task.due_date), today);
            
            return (
              <div 
                key={task.id} 
                className={`p-4 hover:bg-gray-50 ${isOverdue ? 'bg-red-50' : ''}`}
              >
                <div className="flex items-start gap-4">
                  {/* Priority indicator */}
                  <div className={`w-1 h-12 rounded-full ${priorityColors[task.priority]}`} />
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{task.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[task.status]}`}>
                        {statusLabels[task.status]}
                      </span>
                      {isOverdue && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-500 text-white">
                          Просрочено
                        </span>
                      )}
                    </div>
                    {task.purpose && (
                      <div className="text-sm text-gray-600 mb-1">{task.purpose}</div>
                    )}
                    {task.due_date && (
                      <div className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                        📅 {format(parseISO(task.due_date), 'd MMMM yyyy', { locale: ru })}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {task.status === 'pending' && (
                      <button
                        onClick={() => updateTaskStatus(task.id, 'in_progress')}
                        className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                      >
                        Начать
                      </button>
                    )}
                    {task.status === 'in_progress' && (
                      <button
                        onClick={() => updateTaskStatus(task.id, 'completed')}
                        className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                      >
                        Выполнено
                      </button>
                    )}
                    <button
                      onClick={() => setEditingTask(task)}
                      className="p-1 text-gray-400 hover:text-blue-500"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="p-1 text-gray-400 hover:text-red-500"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredTasks.length === 0 && (
            <div className="p-8 text-center text-gray-400">
              Нет задач
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {(isModalOpen || editingTask) && (
        <TaskModal
          task={editingTask}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTask(null);
          }}
          onSave={(data) => {
            if (editingTask) {
              updateTask(editingTask.id, data);
            } else {
              createTask(data);
            }
          }}
        />
      )}
    </div>
  );
}

function TaskModal({
  task,
  onClose,
  onSave,
}: {
  task: Task | null;
  onClose: () => void;
  onSave: (data: Partial<Task>) => void;
}) {
  const [title, setTitle] = useState(task?.title || '');
  const [purpose, setPurpose] = useState(task?.purpose || '');
  const [dueDate, setDueDate] = useState(task?.due_date || '');
  const [priority, setPriority] = useState(task?.priority || 2);
  const [comments, setComments] = useState(task?.comments || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      purpose,
      due_date: dueDate || null,
      priority,
      comments,
      status: task?.status || 'pending',
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-lg w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              {task ? 'Редактировать задачу' : 'Новая задача'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Название</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Цель / Описание</label>
              <textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Дедлайн</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Приоритет</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value={1}>🔴 Срочно</option>
                  <option value={2}>🟡 Обычный</option>
                  <option value={3}>⚪ Низкий</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Комментарии</label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                rows={2}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50">
                Отмена
              </button>
              <button type="submit" className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600">
                {task ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
