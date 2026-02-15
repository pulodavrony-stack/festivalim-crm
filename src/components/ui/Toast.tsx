'use client';

import { useState, useEffect, useCallback, createContext, useContext } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  removing?: boolean;
}

interface ToastContextType {
  addToast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Return no-op functions if outside provider
    return {
      addToast: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
      warning: () => {},
    };
  }
  return ctx;
}

const icons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '⚠',
};

// Notification sound
function playSound(type: ToastType) {
  if (typeof window === 'undefined') return;
  
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    gainNode.gain.value = 0.1;
    
    if (type === 'success') {
      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
    } else if (type === 'error') {
      oscillator.frequency.value = 300;
      oscillator.type = 'square';
    } else if (type === 'warning') {
      oscillator.frequency.value = 600;
      oscillator.type = 'triangle';
    } else {
      oscillator.frequency.value = 520;
      oscillator.type = 'sine';
    }
    
    oscillator.start();
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Audio not supported
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, removing: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration: number = 4000) => {
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const toast: Toast = { id, message, type, duration };
    
    setToasts(prev => [...prev, toast]);
    playSound(type);
    
    // Auto-remove
    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  const success = useCallback((msg: string) => addToast(msg, 'success'), [addToast]);
  const error = useCallback((msg: string) => addToast(msg, 'error', 6000), [addToast]);
  const info = useCallback((msg: string) => addToast(msg, 'info'), [addToast]);
  const warning = useCallback((msg: string) => addToast(msg, 'warning', 5000), [addToast]);

  return (
    <ToastContext.Provider value={{ addToast, success, error, info, warning }}>
      {children}
      
      {/* Toast Container */}
      {toasts.length > 0 && (
        <div className="toast-container">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`toast toast-${toast.type} ${toast.removing ? 'animate-slide-out' : ''}`}
              onClick={() => removeToast(toast.id)}
            >
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                toast.type === 'success' ? 'bg-green-500 text-white' :
                toast.type === 'error' ? 'bg-red-500 text-white' :
                toast.type === 'warning' ? 'bg-yellow-500 text-white' :
                'bg-blue-500 text-white'
              }`}>
                {icons[toast.type]}
              </span>
              <span className="flex-1">{toast.message}</span>
              <button className="text-gray-400 hover:text-gray-600 text-lg leading-none">&times;</button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}
