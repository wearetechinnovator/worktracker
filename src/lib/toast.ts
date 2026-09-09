export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  message: string;
  title?: string;
  type: ToastType;
  duration?: number;
}

export const toast = {
  success: (message: string, title?: string, duration = 3500) => {
    if (typeof window !== 'undefined') {
      const id = Math.random().toString(36).substring(2, 9);
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: { id, message, title, type: 'success', duration },
        })
      );
    }
  },
  error: (message: string, title?: string, duration = 4500) => {
    if (typeof window !== 'undefined') {
      const id = Math.random().toString(36).substring(2, 9);
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: { id, message, title, type: 'error', duration },
        })
      );
    }
  },
  info: (message: string, title?: string, duration = 3500) => {
    if (typeof window !== 'undefined') {
      const id = Math.random().toString(36).substring(2, 9);
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: { id, message, title, type: 'info', duration },
        })
      );
    }
  },
  warning: (message: string, title?: string, duration = 4000) => {
    if (typeof window !== 'undefined') {
      const id = Math.random().toString(36).substring(2, 9);
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: { id, message, title, type: 'warning', duration },
        })
      );
    }
  },
};
