'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import type { ToastItem } from '@/lib/toast';

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    const handleToastEvent = (event: Event) => {
      const customEvent = event as CustomEvent<ToastItem>;
      if (!customEvent.detail) return;

      const newToast = customEvent.detail;
      setToasts((prev) => [...prev, newToast]);

      const duration = newToast.duration || 3500;
      setTimeout(() => {
        removeToast(newToast.id);
      }, duration);
    };

    window.addEventListener('app-toast', handleToastEvent);
    return () => {
      window.removeEventListener('app-toast', handleToastEvent);
    };
  }, [removeToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        pointerEvents: 'none',
        maxWidth: '380px',
        width: 'calc(100vw - 40px)',
      }}
    >
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        const bg = isSuccess
          ? 'linear-gradient(135deg, #065f46 0%, #047857 100%)'
          : isError
          ? 'linear-gradient(135deg, #991b1b 0%, #dc2626 100%)'
          : isWarning
          ? 'linear-gradient(135deg, #b45309 0%, #d97706 100%)'
          : 'linear-gradient(135deg, #1e293b 0%, #334155 100%)';

        return (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '8px',
              background: bg,
              color: '#ffffff',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.2)',
              fontSize: '0.84rem',
              fontWeight: 600,
              lineHeight: 1.4,
              animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
              {isSuccess && <CheckCircle2 size={18} style={{ color: '#a7f3d0', flexShrink: 0 }} />}
              {isError && <AlertCircle size={18} style={{ color: '#fecaca', flexShrink: 0 }} />}
              {isWarning && <AlertTriangle size={18} style={{ color: '#fde68a', flexShrink: 0 }} />}
              {!isSuccess && !isError && !isWarning && <Info size={18} style={{ color: '#bae6fd', flexShrink: 0 }} />}

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {toast.title && (
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, opacity: 0.9 }}>
                    {toast.title}
                  </span>
                )}
                <span style={{ wordBreak: 'break-word' }}>{toast.message}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.7)',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                flexShrink: 0,
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)')}
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
