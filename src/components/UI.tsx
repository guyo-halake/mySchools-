import React from 'react';
import { cn } from '../utils/utils';

export const Card: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: any;
  onClick?: (e: React.MouseEvent) => void;
  [key: string]: any;
}> = ({ children, className, title, subtitle, icon: Icon, onClick, ...props }) => (
  <div 
    onClick={onClick}
    {...props}
    className={cn("bg-white dark:bg-zinc-900 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm overflow-hidden", className)}
  >
    {(title || Icon) && (
      <div className="px-4 py-3 border-b border-gray-50 dark:border-zinc-800 flex items-center justify-between">
        <div>
          {title && <h3 className="font-bold text-sm text-gray-900 dark:text-zinc-100">{title}</h3>}
          {subtitle && <p className="text-[10px] text-gray-400 dark:text-zinc-500">{subtitle}</p>}
        </div>
        {Icon && <Icon size={16} className="text-gray-300" />}
      </div>
    )}
    <div className="p-4">
      {children}
    </div>
  </div>
);

export const Button: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  loading?: boolean;
  title?: string;
}> = ({ children, variant = 'primary', onClick, className, type = 'button', disabled, loading, title }) => {
  const variants = {
    primary: "bg-zinc-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-black dark:hover:bg-white",
    secondary: "bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30",
    ghost: "bg-transparent hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400",
    outline: "bg-transparent border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      className={cn(
        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1.5",
        variants[variant],
        className
      )}
    >
      {loading && (
        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </button>
  );
};

export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  className?: string;
}> = ({ children, variant = 'neutral', className }) => {
  const variants = {
    success: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    warning: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
    danger: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400",
    info: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    neutral: "bg-gray-50 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400"
  };

  return (
    <span className={cn("px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-tight", variants[variant], className)}>
      {children}
    </span>
  );
};

export const Table: React.FC<{
  headers: string[];
  children: React.ReactNode;
}> = ({ headers, children }) => (
  <div className="overflow-x-auto -mx-4 px-4">
    <table className="w-full text-left border-collapse min-w-[600px]">
      <thead>
        <tr className="border-b border-gray-50 dark:border-zinc-800">
          {headers.map((header, i) => (
            <th key={i} className="px-3 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-tight">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50 dark:divide-zinc-800/50">
        {children}
      </tbody>
    </table>
  </div>
);

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-8 py-6 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
          <h3 className="text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full">
            <X size={20} />
          </button>
        </div>
        <div className="p-8">
          {children}
        </div>
      </div>
    </div>
  );
};

import { X } from 'lucide-react';
