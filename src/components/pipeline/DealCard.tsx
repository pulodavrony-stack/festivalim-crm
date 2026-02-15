'use client';

import { useRef } from 'react';
import { useDraggable } from '@dnd-kit/core';

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

interface DealCardProps {
  deal: Deal;
  isDragging?: boolean;
  isOverlay?: boolean;
  onClientClick?: (clientId: string) => void;
  onMoveToPipeline?: (dealId: string) => void;
}

const clientTypeBadges: Record<string, { label: string; dot: string }> = {
  lead: { label: 'Лид', dot: 'bg-blue-500' },
  pk: { label: 'ПК', dot: 'bg-purple-500' },
  kb: { label: 'КБ', dot: 'bg-green-500' },
};

export function DealCard({ deal, isDragging, isOverlay, onClientClick, onMoveToPipeline }: DealCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
  } = useDraggable({ id: deal.id });

  const clickStartPos = useRef<{ x: number; y: number } | null>(null);

  // Извлекаем данные клиента (Supabase может вернуть объект или массив)
  const rawClient = (deal as any).client;
  const clientData = Array.isArray(rawClient) ? rawClient[0] : rawClient;
  const clientType = clientData?.client_type || 'lead';
  const badge = clientTypeBadges[clientType] || clientTypeBadges.lead;
  const clientName = clientData?.full_name || 'Без клиента';
  const clientPhone = clientData?.phone;
  const clientId = clientData?.id;
  
  const rawEvent = (deal as any).event;
  const eventData = Array.isArray(rawEvent) ? rawEvent[0] : rawEvent;
  const rawShow = eventData?.show;
  const showData = Array.isArray(rawShow) ? rawShow[0] : rawShow;
  const showTitle = showData?.title;

  // Когда карточка перетаскивается, скрываем оригинал (DragOverlay показывает копию)
  const style: React.CSSProperties = isDragging
    ? { opacity: 0.3, pointerEvents: 'none' }
    : {};

  const handleMouseDown = (e: React.MouseEvent) => {
    clickStartPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!clickStartPos.current) return;
    
    const dx = Math.abs(e.clientX - clickStartPos.current.x);
    const dy = Math.abs(e.clientY - clickStartPos.current.y);
    
    // Если движение < 5px — это клик, не перетаскивание
    if (dx < 5 && dy < 5 && clientId && onClientClick) {
      onClientClick(clientId);
    }
    
    clickStartPos.current = null;
  };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('7')) {
      return `+7 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    if (days < 0) return { text: 'Прошло', color: 'text-red-500', urgent: true };
    if (days === 0) return { text: 'Сегодня', color: 'text-orange-500', urgent: true };
    if (days === 1) return { text: 'Завтра', color: 'text-yellow-600', urgent: false };
    return { 
      text: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }), 
      color: days <= 7 ? 'text-blue-500' : 'text-gray-400',
      urgent: false 
    };
  };

  const eventInfo = eventData?.event_date ? formatEventDate(eventData.event_date) : null;

  // Overlay (призрак при перетаскивании) — без ref/listeners
  if (isOverlay) {
    return (
      <div className="w-[276px] bg-white rounded-xl shadow-2xl border-2 border-red-400 opacity-90 rotate-2 scale-105">
        <div className="p-3.5 pb-2">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="font-semibold text-gray-900 text-sm leading-tight truncate">{clientName}</span>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
              <span className="text-[10px] font-semibold text-gray-400">{badge.label}</span>
            </div>
          </div>
          {deal.amount > 0 && (
            <span className="text-sm font-bold text-green-600">{deal.amount.toLocaleString('ru-RU')} ₽</span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 transition-shadow hover:shadow-md hover:border-gray-200 cursor-pointer ${
        isDragging ? 'opacity-30 shadow-none' : ''
      } ${eventInfo?.urgent ? 'border-l-2 border-l-orange-400' : ''}`}
    >
      {/* Drag handle — вся верхняя часть карточки */}
      <div 
        {...attributes}
        {...listeners}
        className="p-3.5 pb-2 cursor-grab active:cursor-grabbing touch-none"
      >
        {/* Row 1: Client name + type */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span className="font-semibold text-gray-900 text-sm leading-tight truncate">
            {clientName}
          </span>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
            <span className="text-[10px] font-semibold text-gray-400">{badge.label}</span>
          </div>
        </div>

        {/* Row 2: Event (compact) */}
        {eventData && (
          <div className="flex items-center gap-1.5 mb-1.5 text-xs">
            <span className="text-sm">🎭</span>
            <span className="text-gray-700 font-medium truncate flex-1">
              {showTitle || 'Спектакль'}
            </span>
            <span className={`font-medium flex-shrink-0 ${eventInfo?.color}`}>
              {eventInfo?.urgent && '⚡'}
              {eventInfo?.text}
            </span>
          </div>
        )}

        {/* Row 3: Amount */}
        <div className="flex items-center justify-between">
          {deal.amount > 0 ? (
            <span className="text-sm font-bold text-green-600">
              {deal.amount.toLocaleString('ru-RU')} ₽
            </span>
          ) : (
            <span className="text-xs text-gray-300">—</span>
          )}
          <span className="text-[10px] text-gray-400">
            {deal.title && <span className="mr-1">{deal.title.substring(0, 15)}{deal.title.length > 15 ? '…' : ''}</span>}
            {new Date(deal.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      </div>

      {/* Action bar — НЕ перетаскивается, кликабельная */}
      <div className="px-3.5 pb-2.5 pt-1 flex items-center gap-1.5 border-t border-gray-50">
        {clientId && onClientClick && (
          <button
            onPointerDown={(e) => {
              e.stopPropagation();
              e.nativeEvent.stopImmediatePropagation();
            }}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onClientClick(clientId);
            }}
            className="text-[11px] text-gray-400 hover:text-red-500 transition-colors font-medium cursor-pointer select-none"
          >
            Открыть →
          </button>
        )}
        <div className="flex items-center gap-1 ml-auto">
          {/* Кнопка перемещения между воронками */}
          {onMoveToPipeline && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onMoveToPipeline(deal.id);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              className="text-[13px] text-gray-400 hover:text-blue-600 transition-colors p-0.5"
              title="Переместить в другую воронку"
            >
              ↗️
            </button>
          )}
          {clientPhone && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('phone-call', { detail: { number: clientPhone } }));
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              className="text-[13px] text-gray-400 hover:text-green-600 transition-colors p-0.5"
              title="Позвонить"
            >
              📞
            </button>
          )}
          {clientPhone && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('open-messenger', { detail: { service: 'whatsapp', phone: clientPhone } }));
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              className="text-[13px] text-gray-400 hover:text-green-600 transition-colors p-0.5"
              title="WhatsApp"
            >
              💬
            </button>
          )}
          {clientPhone && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.dispatchEvent(new CustomEvent('open-messenger', { detail: { service: 'max', phone: clientPhone } }));
              }}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseUp={(e) => e.stopPropagation()}
              className="text-[13px] text-gray-400 hover:text-purple-500 transition-colors p-0.5"
              title="MAX"
            >
              💜
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
