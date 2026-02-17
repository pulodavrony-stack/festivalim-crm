'use client';

import { useState, useEffect, useRef } from 'react';
import { useSchemaClient, useTeam } from '@/components/providers/TeamProvider';
import { useToast } from '@/components/ui/Toast';

interface QuickAddContactProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (clientId: string) => void;
}

export default function QuickAddContact({ isOpen, onClose, onSuccess }: QuickAddContactProps) {
  const supabase = useSchemaClient();
  const { managerId } = useTeam();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    position: '',
  });

  // Focus first input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset form when closed
  useEffect(() => {
    if (!isOpen) {
      setFormData({ full_name: '', phone: '', position: '' });
    }
  }, [isOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleSave();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, formData]);

  async function handleSave() {
    if (!formData.full_name.trim() && !formData.phone.trim()) {
      toast.error('Введите ФИО или телефон');
      return;
    }

    setSaving(true);
    try {
      // Clean phone number
      const cleanPhone = formData.phone.replace(/\D/g, '');
      
      // Check for duplicate by phone
      if (cleanPhone) {
        const { data: existing } = await supabase
          .from('clients')
          .select('id')
          .eq('phone', cleanPhone)
          .maybeSingle();
        
        if (existing) {
          toast.error('Контакт с таким телефоном уже существует');
          setSaving(false);
          return;
        }
      }

      // Create client
      const { data: newClient, error } = await supabase
        .from('clients')
        .insert({
          full_name: formData.full_name.trim() || `Контакт ${cleanPhone}`,
          phone: cleanPhone || null,
          notes: formData.position.trim() ? `Должность: ${formData.position.trim()}` : null,
          client_type: 'lead',
          status: 'new',
          manager_id: managerId,
        })
        .select('id')
        .single();

      if (error) throw error;

      // Log activity
      await supabase.from('activities').insert({
        client_id: newClient.id,
        manager_id: managerId,
        activity_type: 'note',
        content: 'Контакт создан через быстрое добавление',
      });

      toast.success('Контакт добавлен');
      onClose();
      
      if (onSuccess) {
        onSuccess(newClient.id);
      }
    } catch (error: any) {
      console.error('Error creating contact:', error);
      toast.error(error.message || 'Ошибка создания контакта');
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-20">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <h2 className="text-lg font-bold text-white">Быстрое добавление</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          {/* ФИО */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              1. ФИО
            </label>
            <input
              ref={inputRef}
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Иванов Иван Иванович"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
            />
          </div>

          {/* Телефон */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              2. Телефон
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+7 (999) 123-45-67"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
            />
          </div>

          {/* Должность */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              3. Должность
            </label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              placeholder="Директор, Менеджер, и т.д."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-gray-50 border-t flex items-center justify-between">
          <span className="text-xs text-gray-400">
            Ctrl+Enter для сохранения
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Сохранение...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Сохранить
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Floating button component for triggering quick add
export function QuickAddButton() {
  const [isOpen, setIsOpen] = useState(false);

  // Global keyboard shortcut (Ctrl/Cmd + K)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center group"
        title="Быстрое добавление (Ctrl+K)"
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        
        {/* Tooltip */}
        <div className="absolute right-full mr-3 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Быстрое добавление
          <span className="ml-2 text-gray-400">Ctrl+K</span>
        </div>
      </button>

      <QuickAddContact 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
