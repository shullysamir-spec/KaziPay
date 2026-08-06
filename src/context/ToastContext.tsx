/**
 * @license
 * NovarisPay - HR & Payroll Management System
 * 
 * SYSTEME GLOBAL DE NOTIFICATIONS TOAST
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success', title?: string, duration: number = 4000) => {
      const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]); // keep max 5 active toasts

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((message: string, title?: string) => showToast(message, 'success', title), [showToast]);
  const error = useCallback((message: string, title?: string) => showToast(message, 'error', title), [showToast]);
  const info = useCallback((message: string, title?: string) => showToast(message, 'info', title), [showToast]);
  const warning = useCallback((message: string, title?: string) => showToast(message, 'warning', title), [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, success, error, info, warning }}>
      {children}
      {/* Global Toast Render Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-2 sm:px-0">
        {toasts.map((t) => {
          const getIcon = () => {
            switch (t.type) {
              case 'success':
                return <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />;
              case 'error':
                return <XCircle className="w-5 h-5 text-red-600 shrink-0" />;
              case 'warning':
                return <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />;
              case 'info':
              default:
                return <Info className="w-5 h-5 text-blue-600 shrink-0" />;
            }
          };

          const getBgStyle = () => {
            switch (t.type) {
              case 'success':
                return 'bg-emerald-50 border-emerald-300 text-emerald-950 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-100';
              case 'error':
                return 'bg-red-50 border-red-300 text-red-950 dark:bg-red-950 dark:border-red-800 dark:text-red-100';
              case 'warning':
                return 'bg-amber-50 border-amber-300 text-amber-950 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-100';
              case 'info':
              default:
                return 'bg-blue-50 border-blue-300 text-blue-950 dark:bg-slate-900 dark:border-blue-800 dark:text-blue-100';
            }
          };

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start space-x-3 p-3.5 rounded-xl border shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${getBgStyle()}`}
            >
              {getIcon()}
              <div className="flex-1 min-w-0 pr-1 space-y-0.5">
                {t.title && <div className="font-extrabold text-xs tracking-tight">{t.title}</div>}
                <div className="text-xs font-medium leading-snug">{t.message}</div>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
