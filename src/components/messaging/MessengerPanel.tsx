'use client';

import { useState } from 'react';

interface MessengerPanelProps {
  clientPhone?: string;
  clientTelegram?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function MessengerPanel({ 
  clientPhone, 
  clientTelegram,
  isOpen, 
  onClose 
}: MessengerPanelProps) {
  const [activeTab, setActiveTab] = useState<'telegram' | 'max'>('telegram');

  if (!isOpen) return null;

  // Формируем ссылки для мессенджеров
  const telegramWebUrl = clientTelegram 
    ? `https://web.telegram.org/k/#@${clientTelegram.replace('@', '')}`
    : clientPhone 
      ? `https://web.telegram.org/k/#?tgaddr=tg://resolve?phone=${clientPhone.replace(/\D/g, '')}`
      : 'https://web.telegram.org/k/';

  // Max (VK Teams / Mail.ru messenger) - можно заменить на актуальный URL
  const maxWebUrl = 'https://max.ru/';

  return (
    <div className="w-[400px] flex-shrink-0 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('telegram')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'telegram'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            ✈️ Telegram
          </button>
          <button
            onClick={() => setActiveTab('max')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'max'
                ? 'bg-purple-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            💬 Max
          </button>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Open in new window buttons */}
      <div className="p-2 bg-gray-50 border-b flex gap-2">
        <a
          href={telegramWebUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium rounded-lg text-center transition-colors"
        >
          Открыть Telegram ↗
        </a>
        <a
          href={maxWebUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white text-xs font-medium rounded-lg text-center transition-colors"
        >
          Открыть Max ↗
        </a>
      </div>

      {/* Messenger iframe */}
      <div className="flex-1 relative">
        {activeTab === 'telegram' ? (
          <iframe
            src={telegramWebUrl}
            className="w-full h-full border-0"
            title="Telegram Web"
            allow="microphone; camera; clipboard-write"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        ) : (
          <iframe
            src={maxWebUrl}
            className="w-full h-full border-0"
            title="Max Messenger"
            allow="microphone; camera; clipboard-write"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          />
        )}
        
        {/* Fallback message if iframe doesn't load */}
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 pointer-events-none opacity-0 transition-opacity">
          <div className="text-center p-6">
            <div className="text-4xl mb-3">🔒</div>
            <p className="text-sm text-gray-600 mb-3">
              Мессенджер может не загружаться во встроенном окне
            </p>
            <p className="text-xs text-gray-400">
              Используйте кнопку "Открыть" выше
            </p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      {clientPhone && (
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="text-xs text-gray-500 mb-2">Быстрые действия:</div>
          <div className="flex gap-2">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-messenger', { detail: { service: 'whatsapp', phone: clientPhone } }))}
              className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg text-center transition-colors"
            >
              WhatsApp
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('phone-call', { detail: { number: clientPhone } }))}
              className="flex-1 px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-xs font-medium rounded-lg text-center transition-colors"
            >
              📞 Позвонить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
