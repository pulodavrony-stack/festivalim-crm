'use client';

import { useState, useEffect, useRef } from 'react';

interface MessengerState {
  isOpen: boolean;
  service: 'whatsapp' | 'max' | null;
  url: string;
  phone?: string;
}

export default function EmbeddedMessenger() {
  const [state, setState] = useState<MessengerState>({
    isOpen: false,
    service: null,
    url: '',
  });
  const [iframeError, setIframeError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleOpen = (e: CustomEvent) => {
      const { service, phone, username } = e.detail;
      let url = '';
      
      if (service === 'whatsapp') {
        const cleanPhone = phone?.replace(/\D/g, '') || '';
        url = `https://web.whatsapp.com/send?phone=${cleanPhone}`;
      } else if (service === 'max') {
        // MAX через reverse proxy (обходит CSP frame-ancestors)
        url = '/max-proxy/';
      }

      setIframeError(false);
      setState({ isOpen: true, service, url, phone });
    };

    window.addEventListener('open-messenger', handleOpen as EventListener);
    return () => window.removeEventListener('open-messenger', handleOpen as EventListener);
  }, []);

  if (!state.isOpen || !state.url) return null;

  const serviceName = state.service === 'whatsapp' ? 'WhatsApp' : 'MAX';
  const serviceColor = state.service === 'whatsapp' ? 'bg-green-600' : 'bg-purple-600';

  return (
    <div className="fixed inset-0 z-[60] flex">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30"
        onClick={() => setState({ isOpen: false, service: null, url: '' })}
      />
      
      {/* Panel — right side, full height */}
      <div className="relative ml-auto w-full max-w-3xl h-full bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-2.5 ${serviceColor} text-white flex-shrink-0`}>
          <div className="flex items-center gap-2">
            <span className="text-lg">
              {state.service === 'whatsapp' ? '💬' : '💜'}
            </span>
            <span className="font-medium">{serviceName}</span>
            {state.phone && (
              <span className="text-white/70 text-sm ml-2">
                {state.phone}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => window.open(state.url, '_blank')}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-xs flex items-center gap-1"
              title="Открыть в новой вкладке"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
            <button
              onClick={() => setState({ isOpen: false, service: null, url: '' })}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Iframe content */}
        <div className="flex-1 relative overflow-hidden">
          <iframe
            ref={iframeRef}
            src={state.url}
            className="w-full h-full border-0"
            allow="camera; microphone; clipboard-write; clipboard-read"
            onError={() => setIframeError(true)}
          />
        </div>
      </div>
    </div>
  );
}
