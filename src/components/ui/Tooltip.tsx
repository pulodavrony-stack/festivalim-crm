'use client';

import { useState, useRef, useEffect, ReactNode } from 'react';

interface TooltipProps {
  children: ReactNode;
  content: string;
  shortcut?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  className?: string;
}

export default function Tooltip({ 
  children, 
  content, 
  shortcut,
  position = 'top', 
  delay = 400,
  className,
}: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  function show() {
    timeoutRef.current = setTimeout(() => {
      setVisible(true);
    }, delay);
  }

  function hide() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setVisible(false);
  }

  useEffect(() => {
    if (visible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      let top = 0;
      let left = 0;

      switch (position) {
        case 'top':
          top = triggerRect.top - tooltipRect.height - 8;
          left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          break;
        case 'bottom':
          top = triggerRect.bottom + 8;
          left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
          break;
        case 'left':
          top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          left = triggerRect.left - tooltipRect.width - 8;
          break;
        case 'right':
          top = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
          left = triggerRect.right + 8;
          break;
      }

      if (left < 8) left = 8;
      if (left + tooltipRect.width > window.innerWidth - 8) {
        left = window.innerWidth - tooltipRect.width - 8;
      }
      if (top < 8) {
        top = triggerRect.bottom + 8;
      }

      setCoords({ top, left });
    }
  }, [visible, position]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className={className || 'inline-flex'}
      >
        {children}
      </div>

      {visible && (
        <div
          ref={tooltipRef}
          className="fixed z-[100] px-3 py-1.5 bg-gray-900 text-white text-xs rounded-lg shadow-lg pointer-events-none whitespace-nowrap animate-in fade-in duration-150"
          style={{ top: coords.top, left: coords.left }}
        >
          <span>{content}</span>
          {shortcut && (
            <span className="ml-2 text-gray-400 font-mono text-[10px]">{shortcut}</span>
          )}
          <div
            className={`absolute w-2 h-2 bg-gray-900 rotate-45 ${
              position === 'top' ? '-bottom-1 left-1/2 -translate-x-1/2' :
              position === 'bottom' ? '-top-1 left-1/2 -translate-x-1/2' :
              position === 'left' ? '-right-1 top-1/2 -translate-y-1/2' :
              '-left-1 top-1/2 -translate-y-1/2'
            }`}
          />
        </div>
      )}
    </>
  );
}
