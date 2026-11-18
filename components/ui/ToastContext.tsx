'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const showSuccess = useCallback((message: string) => {
    showToast(message, 'success');
  }, [showToast]);

  const showError = useCallback((message: string) => {
    showToast(message, 'error');
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-[#FFFFFF] border border-[rgba(26,19,12,0.12)] border-l-4 shadow-xl transition-all duration-200 text-sm text-[#1E2A22] ${
              toast.type === 'success'
                ? 'border-l-[#2F5D46]'
                : toast.type === 'error'
                ? 'border-l-[#B3261E]'
                : 'border-l-[#5b6f8a]'
            }`}
          >
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[#2F5D46] shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-[#B3261E] shrink-0 mt-0.5" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-[#5b6f8a] shrink-0 mt-0.5" />}
            <div className="flex-1 text-xs sm:text-sm font-medium leading-snug">{toast.message}</div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[#5E6B62] hover:text-[#1E2A22] transition-colors p-0.5 rounded-full"
              aria-label="Bağla"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
