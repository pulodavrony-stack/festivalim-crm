'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSchemaClient, useTeam } from '@/components/providers/TeamProvider';
import { useToast } from '@/components/ui/Toast';
import Tooltip from '@/components/ui/Tooltip';
import { schemaInsert } from '@/lib/schema-api';

interface ContactRow {
  id: number;
  full_name: string;
  phone: string;
  position: string;
  status: 'idle' | 'saving' | 'saved' | 'error';
  errorMsg?: string;
}

const MAX_ROWS = 30;

function createEmptyRow(id: number): ContactRow {
  return { id, full_name: '', phone: '', position: '', status: 'idle' };
}

interface QuickAddContactProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  parentClientId?: string;
  parentName?: string;
}

export default function QuickAddContact({ isOpen, onClose, onSuccess, parentClientId, parentName }: QuickAddContactProps) {
  const supabase = useSchemaClient();
  const { managerId, teamSchema } = useTeam();
  const toast = useToast();
  const firstInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [rows, setRows] = useState<ContactRow[]>([createEmptyRow(1)]);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const nextIdRef = useRef(2);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => firstInputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setRows([createEmptyRow(1)]);
      nextIdRef.current = 2;
      setSavedCount(0);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSaveAll();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, rows]);

  const addRow = useCallback(() => {
    if (rows.length >= MAX_ROWS) {
      toast.error(`Максимум ${MAX_ROWS} контактов за раз`);
      return;
    }
    const newId = nextIdRef.current++;
    setRows(prev => [...prev, createEmptyRow(newId)]);
    setTimeout(() => {
      scrollContainerRef.current?.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }, 50);
  }, [rows.length]);

  function removeRow(id: number) {
    if (rows.length === 1) {
      setRows([createEmptyRow(nextIdRef.current++)]);
      return;
    }
    setRows(prev => prev.filter(r => r.id !== id));
  }

  function updateRow(id: number, field: keyof ContactRow, value: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value, status: 'idle', errorMsg: undefined } : r));
  }

  function handleTabOnLastField(e: React.KeyboardEvent, rowIndex: number) {
    if (e.key === 'Tab' && !e.shiftKey && rowIndex === rows.length - 1) {
      const currentRow = rows[rowIndex];
      if (currentRow.full_name.trim() || currentRow.phone.trim()) {
        e.preventDefault();
        addRow();
        setTimeout(() => {
          const inputs = document.querySelectorAll<HTMLInputElement>('[data-quick-add-name]');
          inputs[inputs.length - 1]?.focus();
        }, 100);
      }
    }
  }

  async function handleSaveAll() {
    const validRows = rows.filter(r => r.full_name.trim() || r.phone.trim());
    if (validRows.length === 0) {
      toast.error('Заполните хотя бы один контакт');
      return;
    }

    setSaving(true);
    let saved = 0;
    let errors = 0;

    for (const row of validRows) {
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: 'saving' } : r));

      try {
        const cleanPhone = row.phone.replace(/\D/g, '');

        if (cleanPhone) {
          const { data: existing } = await supabase
            .from('clients')
            .select('id')
            .eq('phone', cleanPhone)
            .maybeSingle();

          if (existing) {
            setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: 'error', errorMsg: 'Дубликат телефона' } : r));
            errors++;
            continue;
          }
        }

        const notesLines: string[] = [];
        if (row.position.trim()) notesLines.push(`Должность: ${row.position.trim()}`);
        if (parentClientId && parentName) notesLines.push(`Организация: ${parentName}`);

        const { data: newClientData, error: insertError } = await schemaInsert(teamSchema, 'clients', {
          full_name: row.full_name.trim() || `Контакт ${cleanPhone}`,
          phone: cleanPhone || null,
          notes: notesLines.length > 0 ? notesLines.join('\n') : null,
          client_type: 'lead',
          status: 'new',
          manager_id: managerId,
        }, 'id');

        if (insertError) throw new Error(insertError);

        const newClientId = Array.isArray(newClientData) ? newClientData[0]?.id : newClientData?.id;
        if (newClientId) {
          await schemaInsert(teamSchema, 'activities', {
            client_id: newClientId,
            manager_id: managerId,
            activity_type: 'note',
            content: parentName
              ? `Контакт создан через быстрое добавление (${parentName})`
              : 'Контакт создан через быстрое добавление',
          });
        }

        setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: 'saved' } : r));
        saved++;
      } catch (err: any) {
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, status: 'error', errorMsg: err.message || 'Ошибка' } : r));
        errors++;
      }
    }

    setSavedCount(saved);
    setSaving(false);

    if (saved > 0 && errors === 0) {
      toast.success(`Добавлено контактов: ${saved}`);
      setTimeout(() => {
        onClose();
        onSuccess?.();
      }, 600);
    } else if (saved > 0 && errors > 0) {
      toast.success(`Добавлено: ${saved}, ошибок: ${errors}`);
    } else {
      toast.error(`Не удалось сохранить. Ошибок: ${errors}`);
    }
  }

  if (!isOpen) return null;

  const filledRows = rows.filter(r => r.full_name.trim() || r.phone.trim());

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center pt-10 sm:pt-16">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-5 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <div>
                <h2 className="text-lg font-bold text-white">Быстрое добавление контактов</h2>
                {parentName && (
                  <p className="text-sm text-white/80">{parentName}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tooltip content="Количество заполненных строк" position="bottom">
                <span className="bg-white/20 text-white text-xs font-medium px-2.5 py-1 rounded-full">
                  {filledRows.length} / {MAX_ROWS}
                </span>
              </Tooltip>
              <Tooltip content="Закрыть" shortcut="Esc" position="bottom">
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[1fr_140px_140px_36px] gap-2 px-5 py-2.5 bg-gray-50 border-b text-xs font-semibold text-gray-500 uppercase tracking-wider flex-shrink-0">
          <span>ФИО</span>
          <span>Телефон</span>
          <span>Должность</span>
          <span></span>
        </div>

        {/* Rows */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-5 py-2 space-y-1.5">
          {rows.map((row, index) => (
            <div 
              key={row.id}
              className={`grid grid-cols-[1fr_140px_140px_36px] gap-2 items-center rounded-lg transition-colors ${
                row.status === 'saved' ? 'bg-green-50 ring-1 ring-green-200' :
                row.status === 'error' ? 'bg-red-50 ring-1 ring-red-200' :
                row.status === 'saving' ? 'bg-yellow-50 ring-1 ring-yellow-200' :
                'hover:bg-gray-50'
              }`}
            >
              <input
                data-quick-add-name
                ref={index === 0 ? firstInputRef : undefined}
                type="text"
                value={row.full_name}
                onChange={(e) => updateRow(row.id, 'full_name', e.target.value)}
                disabled={row.status === 'saved' || row.status === 'saving'}
                placeholder="Фамилия Имя Отчество"
                className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:text-gray-500"
              />
              <input
                type="tel"
                value={row.phone}
                onChange={(e) => updateRow(row.id, 'phone', e.target.value)}
                disabled={row.status === 'saved' || row.status === 'saving'}
                placeholder="+7..."
                className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:text-gray-500"
              />
              <input
                type="text"
                value={row.position}
                onChange={(e) => updateRow(row.id, 'position', e.target.value)}
                onKeyDown={(e) => handleTabOnLastField(e, index)}
                disabled={row.status === 'saved' || row.status === 'saving'}
                placeholder="Должность"
                className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100 disabled:text-gray-500"
              />
              <div className="flex justify-center">
                {row.status === 'saved' ? (
                  <Tooltip content="Сохранено" position="left">
                    <span className="text-green-500 text-lg">✓</span>
                  </Tooltip>
                ) : row.status === 'saving' ? (
                  <div className="w-4 h-4 border-2 border-green-300 border-t-green-600 rounded-full animate-spin" />
                ) : row.status === 'error' ? (
                  <Tooltip content={row.errorMsg || 'Ошибка сохранения'} position="left">
                    <span className="text-red-500 text-lg cursor-help">✕</span>
                  </Tooltip>
                ) : (
                  <Tooltip content="Удалить строку" position="left">
                    <button
                      onClick={() => removeRow(row.id)}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </Tooltip>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Add row button */}
        <div className="px-5 py-2 border-t flex-shrink-0">
          <Tooltip content={`Добавить строку (макс. ${MAX_ROWS})`} shortcut="Tab" position="top">
            <button
              onClick={addRow}
              disabled={rows.length >= MAX_ROWS}
              className="w-full py-2 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Добавить ещё строку
            </button>
          </Tooltip>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-gray-50 border-t flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Tooltip content="Сохранить все заполненные контакты" shortcut="Ctrl+Enter" position="top">
              <span className="text-xs text-gray-400 cursor-help border-b border-dashed border-gray-300">
                ⌨️ Ctrl+Enter — сохранить
              </span>
            </Tooltip>
            <Tooltip content="Закрыть окно без сохранения" shortcut="Esc" position="top">
              <span className="text-xs text-gray-400 cursor-help border-b border-dashed border-gray-300">
                Esc — закрыть
              </span>
            </Tooltip>
          </div>
          <div className="flex gap-2">
            <Tooltip content="Закрыть без сохранения" position="top">
              <button
                onClick={onClose}
                className="px-4 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors text-sm"
              >
                Отмена
              </button>
            </Tooltip>
            <Tooltip content={`Сохранить ${filledRows.length} контакт(ов)`} shortcut="Ctrl+Enter" position="top">
              <button
                onClick={handleSaveAll}
                disabled={saving || filledRows.length === 0}
                className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2 text-sm"
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
                    Сохранить {filledRows.length > 0 ? `(${filledRows.length})` : ''}
                  </>
                )}
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

export function QuickAddButton() {
  const [isOpen, setIsOpen] = useState(false);

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
      <Tooltip content="Быстрое добавление контактов" shortcut="Ctrl+K" position="left">
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </Tooltip>

      <QuickAddContact
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
