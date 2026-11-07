import { createContext, useContext, useState, useCallback } from 'react';
import { Check } from 'lucide-react';

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((message, onUndo) => {
    const id = crypto.randomUUID();
    setToasts(t => [...t, { id, message, onUndo }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 5000);
  }, []);

  const dismiss = (id) => setToasts(t => t.filter(x => x.id !== id));

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map(t => (
          <div
            key={t.id}
            className="bg-panel border border-border-strong rounded-xl px-4 py-3 text-sm flex items-center gap-3 shadow-2xl animate-slide-in"
          >
            <div className="w-6 h-6 rounded-full bg-success/20 flex items-center justify-center flex-shrink-0">
              <Check size={14} className="text-success" />
            </div>
            <span className="flex-1">{t.message}</span>
            {t.onUndo && (
              <button
                onClick={() => { t.onUndo(); dismiss(t.id); }}
                className="text-accent font-medium hover:underline"
              >
                Undo
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}