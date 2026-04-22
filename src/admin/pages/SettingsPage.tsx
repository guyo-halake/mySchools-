import React from 'react';
import { Settings as SettingsIcon, Shield, Key, Bell, Palette, Cloud, Save, HardDrive, Cpu } from 'lucide-react';

export const SettingsPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">General Settings</h1>
        <p className="text-sm text-zinc-500 mt-1">Configure platform identity and security rules.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Sidenav */}
        <div className="space-y-1">
          {[
            { label: 'General', icon: SettingsIcon, active: true },
            { label: 'Security', icon: Shield },
            { label: 'Integrations', icon: Key },
            { label: 'Branding', icon: Palette },
            { label: 'Server', icon: Cloud },
          ].map(i => (
            <button key={i.label} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${i.active ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
              <i.icon size={16} />
              {i.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="md:col-span-3 space-y-6">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 space-y-8 shadow-sm">
            <div className="space-y-4">
               <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Platform Identity</h3>
               <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">System Name</label>
                    <input defaultValue="Matta Admin" className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm p-3 rounded-xl outline-none focus:border-blue-600 transition-all dark:text-white" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Domain</label>
                    <input defaultValue="admin.matta.africa" className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-sm p-3 rounded-xl outline-none focus:border-blue-600 transition-all dark:text-white" />
                  </div>
               </div>
            </div>

            <div className="pt-8 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
               <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Security Controls</h3>
               <div className="space-y-3">
                  {[
                    { label: 'Two-Factor Authentication', val: true },
                    { label: 'Auto-Logout (30 mins)', val: true },
                    { label: 'Restrict by IP', val: false },
                  ].map(s => (
                    <div key={s.label} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                       <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{s.label}</span>
                       <div className={`w-10 h-5 rounded-full relative cursor-pointer ${s.val ? 'bg-blue-600' : 'bg-zinc-200 dark:bg-zinc-700'}`}>
                          <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${s.val ? 'right-1' : 'left-1'}`} />
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <div className="flex justify-end pt-4">
               <button className="px-8 py-3 bg-blue-600 text-white font-bold text-xs uppercase tracking-widest rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center gap-2">
                 <Save size={16} /> Save Changes
               </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
                <HardDrive size={24} className="text-blue-600" />
                <div>
                   <p className="text-[10px] font-bold text-zinc-400 uppercase">Database</p>
                   <p className="text-sm font-bold dark:text-white">4.2 GB Used</p>
                </div>
             </div>
             <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-center gap-4">
                <Cpu size={24} className="text-emerald-500" />
                <div>
                   <p className="text-[10px] font-bold text-zinc-400 uppercase">CPU Load</p>
                   <p className="text-sm font-bold dark:text-white">12% Normal</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};
