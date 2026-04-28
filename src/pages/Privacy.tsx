import React from 'react';
import { ShieldCheck, Lock, Eye, FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Privacy: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-12 animate-in fade-in duration-700">
      <div className="mb-12 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-4">
          <Link to="/settings" className="flex items-center gap-2 text-[10px] font-black uppercase text-zinc-400 hover:text-emerald-500 transition-colors">
            <ArrowLeft size={14} /> Return to Account
          </Link>
          <h1 className="text-4xl font-black text-zinc-900 dark:text-white font-sora uppercase">Privacy Policy</h1>
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">Institutional Data Protection Standards</p>
        </div>
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center border border-emerald-500/20">
          <ShieldCheck size={32} />
        </div>
      </div>

      <div className="space-y-12">
        <PolicySection 
          icon={<Lock size={20} />} 
          title="Data Encryption" 
          content="All institutional data, including student academic records, staff profiles, and financial transactions, are encrypted at rest and in transit using industry-standard AES-256 and TLS protocols. Your sensitive information is never accessible to unauthorized third parties." 
        />

        <PolicySection 
          icon={<Eye size={20} />} 
          title="Visibility Controls" 
          content="We operate on a 'Principle of Least Privilege'. Parents can only view records of their direct dependents. Teachers can only access reports for assigned streams. Academic performance is only visible to authorized personnel and guardians." 
        />

        <PolicySection 
          icon={<FileText size={20} />} 
          title="Information Usage" 
          content="Your data is used solely for the purpose of school management and educational progress tracking. We do not sell user data to advertisers or external entities. Internal analytics are anonymized to protect personal identification." 
        />

        <PolicySection 
            icon={<ShieldCheck size={20} />} 
            title="SaaS Compliance" 
            content="Our infrastructure complies with global data protection regulations. Regular security audits are conducted to ensure that our school management ecosystem remains a fortress for your records." 
        />
      </div>

      <footer className="mt-20 pt-10 border-t border-zinc-100 dark:border-zinc-800 text-center">
         <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Institutional Privacy Hub</p>
         <p className="text-[10px] text-zinc-400 mt-2">© 2026 Matta Africa. All digital records are protected by law.</p>
      </footer>
    </div>
  );
};

const PolicySection = ({ icon, title, content }: { icon: React.ReactNode, title: string, content: string }) => (
  <section className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] p-8 sm:p-10 shadow-sm relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-8 text-zinc-50 dark:text-zinc-900/40 group-hover:text-emerald-500/10 transition-colors animate-pulse">
       {icon}
    </div>
    <div className="relative z-10 flex gap-6 items-start">
      <div className="shrink-0 w-12 h-12 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-500 transition-colors">
        {icon}
      </div>
      <div className="space-y-4">
        <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight font-sora">{title}</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed font-medium">{content}</p>
      </div>
    </div>
  </section>
);
