'use client';

import { useDroppable } from '@dnd-kit/core';
import { DealCard } from './DealCard';

interface Stage {
  id: string;
  name: string;
  code: string;
  color: string;
}

interface Deal {
  id: string;
  title: string;
  amount: number;
  stage_id: string;
  client?: {
    id: string;
    full_name: string;
    phone: string;
    client_type: string;
  };
  event?: {
    id: string;
    event_date: string;
    show?: {
      title: string;
    };
  };
  created_at: string;
}

interface PipelineColumnProps {
  stage: Stage;
  deals: Deal[];
  activeId: string | null;
  onClientClick?: (clientId: string) => void;
  onMoveToPipeline?: (dealId: string) => void;
}

export function PipelineColumn({ stage, deals, activeId, onClientClick, onMoveToPipeline }: PipelineColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
  });

  const totalAmount = deals.reduce((sum, d) => sum + (d.amount || 0), 0);

  const getDeclension = (n: number) => {
    if (n % 10 === 1 && n % 100 !== 11) return 'сделка';
    if ([2,3,4].includes(n % 10) && ![12,13,14].includes(n % 100)) return 'сделки';
    return 'сделок';
  };

  return (
    <div
      ref={setNodeRef}
      className={`w-[300px] flex-shrink-0 rounded-2xl flex flex-col transition-all duration-150 ${
        isOver 
          ? 'ring-2 ring-red-400 ring-offset-2 bg-red-50 scale-[1.01]' 
          : 'bg-gray-50/80'
      }`}
      style={{ maxHeight: 'calc(100vh - 140px)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-3.5 h-3.5 rounded-full shadow-sm ring-2 ring-white"
            style={{ backgroundColor: stage.color }}
          />
          <div>
            <h3 className="font-bold text-gray-900 text-sm leading-tight">
              {stage.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500">
                {deals.length} {getDeclension(deals.length)}
              </span>
              {totalAmount > 0 && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="text-xs font-semibold text-green-600">
                    {totalAmount.toLocaleString('ru-RU')} ₽
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Deals */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2.5 min-h-[150px] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {deals.map((deal) => (
          <DealCard 
            key={deal.id} 
            deal={deal} 
            isDragging={deal.id === activeId}
            onClientClick={onClientClick}
            onMoveToPipeline={onMoveToPipeline}
          />
        ))}
        
        {deals.length === 0 && (
          <div className={`flex flex-col items-center justify-center py-16 text-center min-h-[200px] rounded-xl border-2 border-dashed transition-colors ${
            isOver ? 'border-red-300 bg-red-50/50' : 'border-gray-200'
          }`}>
            <p className="text-xs text-gray-400">
              Перетащите сделку сюда
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
