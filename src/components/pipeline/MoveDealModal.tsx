'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface Pipeline {
  id: string;
  name: string;
  code: string;
}

interface Stage {
  id: string;
  pipeline_id: string;
  name: string;
  sort_order: number;
}

interface MoveDealModalProps {
  isOpen: boolean;
  dealId: string;
  currentPipelineId: string;
  onClose: () => void;
  onMoved: () => void;
}

export default function MoveDealModal({
  isOpen,
  dealId,
  currentPipelineId,
  onClose,
  onMoved,
}: MoveDealModalProps) {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загружаем воронки при открытии
  useEffect(() => {
    if (isOpen) {
      loadPipelines();
    }
  }, [isOpen]);

  // Загружаем этапы при выборе воронки
  useEffect(() => {
    if (selectedPipelineId) {
      loadStages(selectedPipelineId);
    } else {
      setStages([]);
      setSelectedStageId('');
    }
  }, [selectedPipelineId]);

  async function loadPipelines() {
    const { data } = await supabase
      .from('pipelines')
      .select('id, name, code')
      .lt('sort_order', 10)
      .order('sort_order');

    if (data) {
      // Исключаем текущую воронку
      const filtered = data.filter(p => p.id !== currentPipelineId);
      setPipelines(filtered);
    }
  }

  async function loadStages(pipelineId: string) {
    const { data } = await supabase
      .from('pipeline_stages')
      .select('id, pipeline_id, name, sort_order')
      .eq('pipeline_id', pipelineId)
      .order('sort_order');

    if (data) {
      setStages(data);
      // Выбираем первый этап по умолчанию
      if (data.length > 0) {
        setSelectedStageId(data[0].id);
      }
    }
  }

  async function handleMove() {
    if (!selectedPipelineId || !selectedStageId) {
      setError('Выберите воронку и этап');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('deals')
        .update({
          pipeline_id: selectedPipelineId,
          stage_id: selectedStageId,
        })
        .eq('id', dealId);

      if (updateError) {
        throw updateError;
      }

      onMoved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Ошибка при перемещении');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            Переместить в воронку
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {/* Выбор воронки */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Воронка
            </label>
            <select
              value={selectedPipelineId}
              onChange={(e) => setSelectedPipelineId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="">Выберите воронку</option>
              {pipelines.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Выбор этапа */}
          {selectedPipelineId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Этап
              </label>
              <select
                value={selectedStageId}
                onChange={(e) => setSelectedStageId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Ошибка */}
          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleMove}
            disabled={loading || !selectedPipelineId || !selectedStageId}
            className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Перемещение...' : 'Переместить'}
          </button>
        </div>
      </div>
    </div>
  );
}
