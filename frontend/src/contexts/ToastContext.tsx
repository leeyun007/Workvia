import React, { createContext, useContext, useState, useCallback } from 'react';
import { XCircle, AlertTriangle, CheckCircle2, Eye, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'permission';

interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextType {
  toast: (type: ToastType, title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback((type: ToastType, title: string, description?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, title, description }]);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const getToastConfig = (type: ToastType) => {
    switch (type) {
      case 'error':
        return { icon: <XCircle className="w-5 h-5 text-red-500" />, bg: 'bg-red-50 dark:bg-red-500/10' };
      case 'warning':
        return { icon: <AlertTriangle className="w-5 h-5 text-amber-500" />, bg: 'bg-amber-50 dark:bg-amber-500/10' };
      case 'permission':
        return { icon: <Eye className="w-5 h-5 text-amber-500" />, bg: 'bg-amber-50 dark:bg-amber-500/10' };
      case 'success':
        return { icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, bg: 'bg-emerald-50 dark:bg-emerald-500/10' };
      default:
        return { icon: <CheckCircle2 className="w-5 h-5 text-blue-500" />, bg: 'bg-blue-50 dark:bg-blue-500/10' };
    }
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Fixed top-right toast list */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none">
        {toasts.map((t) => {
          const config = getToastConfig(t.type);
          return (
            <div 
              key={t.id} 
              className="pointer-events-auto flex items-start gap-3 w-80 bg-white dark:bg-[#18181b] border border-gray-100 dark:border-gray-800 shadow-xl rounded-2xl p-4 animate-in slide-in-from-right-8 fade-in duration-300"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${config.bg}`}>
                {config.icon}
              </div>
              
              <div className="flex-1 min-w-0 mt-0.5">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white mb-1">{t.title}</h4>
                {t.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    {t.description}
                  </p>
                )}
              </div>

              <button 
                onClick={() => removeToast(t.id)} 
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};