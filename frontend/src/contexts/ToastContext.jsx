import { useState, useCallback, useMemo } from 'react';
import { ToastContext } from './ToastContextStore';
import { HiCheckCircle, HiExclamationCircle, HiInformationCircle, HiExclamation } from 'react-icons/hi';

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  }, []);

  const toast = useMemo(() => ({
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
    info: (msg) => addToast(msg, 'info'),
    warning: (msg) => addToast(msg, 'warning'),
  }), [addToast]);

  const icons = {
    success: <HiCheckCircle className="text-emerald-400 shrink-0" size={18} />,
    error: <HiExclamationCircle className="text-red-400 shrink-0" size={18} />,
    warning: <HiExclamation className="text-amber-400 shrink-0" size={18} />,
    info: <HiInformationCircle className="text-indigo-400 shrink-0" size={18} />,
  };

  const styles = {
    success: 'bg-emerald-950/80 text-emerald-200 border-emerald-500/30 shadow-emerald-500/10',
    error: 'bg-red-950/80 text-red-200 border-red-500/30 shadow-red-500/10',
    warning: 'bg-amber-950/80 text-amber-200 border-amber-500/30 shadow-amber-500/10',
    info: 'bg-indigo-950/80 text-indigo-200 border-indigo-500/30 shadow-indigo-500/10',
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl animate-scale-in text-xs font-semibold leading-relaxed ${styles[t.type] || styles.info}`}
          >
            {icons[t.type]}
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
