import React from 'react';
import { cn } from '../utils/utils';
import { Sparkles } from 'lucide-react';

export const PageHeader: React.FC<{
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  accentLabel?: string;
}> = ({ title, subtitle, actions, accentLabel = 'Overview' }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
    <div>
      <span className="header-chip">
        <Sparkles size={12} /> {accentLabel}
      </span>
      <h1 className="page-title">{title}</h1>
      {subtitle && <p className="section-subtitle mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

export const Card: React.FC<{ 
  children: React.ReactNode; 
  className?: string;
  title?: string;
  subtitle?: string;
  icon?: any;
  onClick?: () => void;
}> = ({ children, className, title, subtitle, icon: Icon, onClick }) => (
  <div onClick={onClick} className={cn("bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-[0_12px_30px_-26px_rgba(15,23,42,0.42)] overflow-hidden", className)}>
    {(title || Icon) && (
      <div className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
        <div>
          {title && <h3 className="section-title text-gray-900 dark:text-zinc-50">{title}</h3>}
          {subtitle && <p className="micro-label text-gray-600 dark:text-zinc-400 mt-1">{subtitle}</p>}
        </div>
        {Icon && <Icon size={16} className="text-cyan-600 dark:text-cyan-300" />}
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
}> = ({ children, variant = 'primary', onClick, className, type = 'button', disabled }) => {
  const variants = {
    primary: "bg-cyan-700 text-white hover:bg-cyan-800 dark:bg-cyan-500 dark:text-zinc-950 dark:hover:bg-cyan-400",
    secondary: "bg-amber-100 text-amber-900 hover:bg-amber-200 dark:bg-amber-800/40 dark:text-amber-200 dark:hover:bg-amber-800/60",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30",
    ghost: "bg-transparent hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400",
    outline: "bg-transparent border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1.5",
        variants[variant],
        className
      )}
    >
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
    warning: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
    danger: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400",
    info: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300",
    neutral: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
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
    <table className="w-full text-left border-collapse min-w-[640px]">
      <thead className="sticky top-0 z-10 bg-white dark:bg-zinc-900">
        <tr className="border-b border-gray-200 dark:border-zinc-800">
          {headers.map((header, i) => (
            <th key={i} className={cn("px-3 py-3 micro-label text-gray-500 uppercase tracking-tight", header.toLowerCase().includes('action') ? 'text-right' : 'text-left')}>
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 [&>tr:nth-child(odd)]:bg-gray-50/35 dark:[&>tr:nth-child(odd)]:bg-zinc-800/20 [&>tr:hover]:bg-blue-50/40 dark:[&>tr:hover]:bg-zinc-800/40 [&>tr>td:last-child]:text-right [&>tr>td:last-child>div]:justify-end">
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
