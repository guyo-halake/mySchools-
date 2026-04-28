import React, { useState, useEffect, createContext, useContext } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '../utils/utils';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-8 right-8 z-[200] flex flex-col gap-3 max-w-sm w-full">
        {toasts.map((toast) => (
          <div 
            key={toast.id}
            className={cn(
              "p-4 rounded-2xl border shadow-2xl flex items-start gap-3 animate-in slide-in-from-right-full duration-300",
              toast.type === 'success' ? "bg-emerald-50 border-emerald-100 text-emerald-900" :
              toast.type === 'error' ? "bg-rose-50 border-rose-100 text-rose-900" :
              toast.type === 'warning' ? "bg-amber-50 border-amber-100 text-amber-900" :
              "bg-white border-zinc-100 text-zinc-900"
            )}
          >
            <div className="mt-0.5">
              {toast.type === 'success' && <CheckCircle2 size={18} className="text-emerald-500" />}
              {toast.type === 'error' && <AlertCircle size={18} className="text-rose-500" />}
              {toast.type === 'warning' && <AlertTriangle size={18} className="text-amber-500" />}
              {toast.type === 'info' && <Info size={18} className="text-blue-500" />}
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold leading-tight">{toast.message}</p>
            </div>
            <button onClick={() => removeToast(toast.id)} className="text-zinc-400 hover:text-black">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
