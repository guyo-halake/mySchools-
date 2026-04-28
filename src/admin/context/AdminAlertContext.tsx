import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ShieldCheck, X } from 'lucide-react';

interface Alert {
  title?: string;
  message: string;
}

interface AdminAlertContextType {
  showAlert: (message: string, title?: string) => void;
  hideAlert: () => void;
}

const AdminAlertContext = createContext<AdminAlertContextType | undefined>(undefined);

export const AdminAlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alert, setAlert] = useState<Alert | null>(null);

  const showAlert = (message: string, title?: string) => setAlert({ title, message });
  const hideAlert = () => setAlert(null);

  return (
    <AdminAlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      {alert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-white/10 dark:bg-black/20 backdrop-blur-[2px] animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl relative animate-in zoom-in-95 duration-200">
            <div className="p-10 text-center">
              {/* Subtle Icon */}
              <div className="mb-6 flex justify-center">
                <ShieldCheck size={28} className="text-zinc-900 dark:text-white" strokeWidth={1} />
              </div>

              {alert.title && (
                <h3 className="text-[10px] font-black text-orange-600 uppercase tracking-[0.2em] mb-4">{alert.title}</h3>
              )}
              
              <p className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400 leading-relaxed px-2">
                {alert.message}
              </p>

              <div className="mt-10 pt-6 flex flex-col items-center gap-6">
                 <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                   - P3L Admin
                 </p>
                 
                 <button 
                  onClick={hideAlert}
                  className="text-[11px] font-black uppercase tracking-widest text-zinc-900 dark:text-white hover:text-orange-600 transition-all underline underline-offset-8"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminAlertContext.Provider>
  );
};

export const useAdminAlert = () => {
  const context = useContext(AdminAlertContext);
  if (!context) throw new Error('useAdminAlert must be used within AdminAlertProvider');
  return context;
};
