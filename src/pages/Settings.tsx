import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { 
  User, 
  Bell, 
  ShieldCheck, 
  History, 
  Users, 
  Palette, 
  ChevronRight, 
  LogOut, 
  KeyRound,
  Mail,
  HelpCircle,
  X,
  UserCircle2
} from 'lucide-react';
import { cn } from '../utils/utils';

type SettingTab = 'account' | 'activity' | 'notifications' | 'students' | 'themes' | 'legal' | 'support';

export const Settings: React.FC = () => {
  const { user, logout, isDarkMode, toggleDarkMode } = useAuth();
  const { schoolInfo } = useApp();
  const [activeTab, setActiveTab] = useState<SettingTab>('account');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: user?.full_name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleUpdate = async () => {
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ full_name: formData.fullName, phone: formData.phone }).eq('id', user?.id);
    setLoading(false);
    if (!error) setStatus('Profile Updated');
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-10 animate-in fade-in duration-700 pb-32">
      <div className="mb-12">
        <h1 className="text-4xl font-black text-zinc-900 dark:text-white font-sora">Settings and Account Privacy</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        
        {/* CATEGORY CARDS */}
        <div className="lg:col-span-5 space-y-3">
          <CategoryCard 
            id="account"
            active={activeTab === 'account'}
            onClick={() => setActiveTab('account')}
            title="My Account"
            desc="Password, security, personal details, and preferences"
            icon={<User size={18} />}
          />
          <CategoryCard 
            id="activity"
            active={activeTab === 'activity'}
            onClick={() => setActiveTab('activity')}
            title="Your activity"
            desc="Login history and recent system interactions"
            icon={<History size={18} />}
          />
          <CategoryCard 
            id="notifications"
            active={activeTab === 'notifications'}
            onClick={() => setActiveTab('notifications')}
            title="Notifications"
            desc="Control how you receive alerts and messages"
            icon={<Bell size={18} />}
          />
          {(user?.role !== 'STUDENT') && (
            <CategoryCard 
              id="students"
              active={activeTab === 'students'}
              onClick={() => setActiveTab('students')}
              title="Student management"
              desc="Oversee linked student records and progress"
              icon={<Users size={18} />}
            />
          )}
          <CategoryCard 
            id="themes"
            active={activeTab === 'themes'}
            onClick={() => setActiveTab('themes')}
            title="Themes and preferences"
            desc="Switch theme and customize viewing options"
            icon={<Palette size={18} />}
          />
          <CategoryCard 
            id="legal"
            active={activeTab === 'legal'}
            onClick={() => setActiveTab('legal')}
            title="Terms and privacy policy"
            desc="Review legal agreements and data usage"
            icon={<ShieldCheck size={18} />}
          />
          <CategoryCard 
            id="support"
            active={activeTab === 'support'}
            onClick={() => setActiveTab('support')}
            title="Support and Services"
            desc="Help center, support contact, and documentation"
            icon={<HelpCircle size={18} />}
          />
        </div>

        {/* CONTENT SIDEBAR */}
        <div className="lg:col-span-7 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-[3rem] p-10 shadow-xl shadow-black/5 animate-in slide-in-from-right-10 duration-500">
           
           {activeTab === 'account' && (
             <div className="space-y-10">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 rounded-[1.5rem] bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center shrink-0">
                    <UserCircle2 size={40} className="text-zinc-300" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight">{user?.full_name}</h2>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{user?.email}</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <InputGroup label="Full Name" value={formData.fullName} onChange={(v) => setFormData(p => ({ ...p, fullName: v }))} />
                  <InputGroup label="Email Address" value={formData.email} onChange={(v) => setFormData(p => ({ ...p, email: v }))} />
                  <div className="flex flex-col gap-4">
                    <button onClick={handleUpdate} className="w-full h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all hover:scale-[1.02]">Save Personal Details</button>
                    <button className="w-full h-14 bg-zinc-50 dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-2xl font-black uppercase text-[10px] tracking-widest border border-zinc-100 dark:border-zinc-800">Change Password</button>
                  </div>
                </div>
             </div>
           )}

           {activeTab === 'activity' && (
             <div className="space-y-8">
                <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">Recent Activity</h3>
                <div className="space-y-4">
                   <ActivityItem date="Today, 10:45 AM" action="Security login successful" device="Chrome Desktop — Windows" />
                   <ActivityItem date="Yesterday, 02:20 PM" action="Password changed successfully" device="Chrome Desktop — Windows" />
                   <ActivityItem date="22 Apr 2026" action="Student records updated" device="Admin Console" />
                </div>
             </div>
           )}

           {activeTab === 'notifications' && (
             <div className="space-y-8">
                <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">Global Notifications</h3>
                <div className="space-y-4">
                   <ToggleRow label="Institutional Alerts" desc="Receive important school announcements" enabled />
                   <ToggleRow label="Security Alerts" desc="Notifications about login attempts" enabled />
                   <ToggleRow label="Progress Reports" desc="Automated academic summaries" />
                </div>
             </div>
           )}

           {activeTab === 'students' && (
             <div className="space-y-8">
                <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">Linked Records</h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase leading-relaxed">View and manage the identities of students assigned to your profile.</p>
                <div className="p-10 border-2 border-dashed border-zinc-100 dark:border-zinc-800 rounded-3xl text-center">
                   <p className="text-[10px] font-black text-zinc-400 uppercase">Synchronizing institutional database...</p>
                </div>
             </div>
           )}

           {activeTab === 'themes' && (
             <div className="space-y-8">
                <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">Preferences</h3>
                <div className="p-8 bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                   <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-6">Visual Theme</p>
                   <button 
                  onClick={toggleDarkMode}
                  className="w-full h-14 bg-white dark:bg-zinc-800 rounded-2xl flex items-center justify-between px-8 text-[11px] font-black uppercase tracking-widest text-zinc-900 dark:text-white border border-zinc-100 dark:border-zinc-700 shadow-sm"
                >
                  {isDarkMode ? 'Solar Mode' : 'Lunar Mode'} 
                  {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                </button>
                </div>
             </div>
           )}

           {activeTab === 'legal' && (
             <div className="space-y-8">
                <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest">Terms & Compliance</h3>
                <div className="space-y-3">
                   <LinkItem label="Review Terms of Service" />
                   <LinkItem label="Privacy Policy Document" />
                   <LinkItem label="SaaS Agreement" />
                </div>
             </div>
           )}

           {activeTab === 'support' && (
             <div className="space-y-10 text-center py-10">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-3xl bg-zinc-900 text-white flex items-center justify-center shadow-2xl shadow-zinc-900/40">
                    <HelpCircle size={32} />
                  </div>
                </div>
                <div>
                   <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-widest mb-4">Request Institutional Help</h4>
                   <p className="text-[11px] text-zinc-400 leading-relaxed font-medium mb-8">Having trouble? Our technical operations team at P3l Developers is ready to assist you.</p>
                   <button className="h-12 px-10 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Start Direct Chat</button>
                </div>
             </div>
           )}

        </div>
      </div>

      {/* FOOTER */}
      <footer className="mt-32 pt-16 border-t border-zinc-100 dark:border-zinc-800 text-center sm:text-left">
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
            <div className="space-y-4">
              <p className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-[0.3em]">Developer Context</p>
              <p className="text-[11px] text-zinc-400 leading-relaxed max-w-sm">
                This system is developed and maintained by **P3l developers Matta**. All rights reserved. 
                Dedicated to building the next generation of institutional intelligence across Africa.
              </p>
            </div>
            <div className="space-y-4 sm:text-right">
              <p className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-[0.3em]">Contact Operations</p>
              <p className="text-[11px] text-zinc-400">Email: support@matta.africa</p>
              <p className="text-[11px] text-zinc-400">Headquarters: Matta Africa Hub</p>
            </div>
         </div>
      </footer>
    </div>
  );
};

const CategoryCard = ({ id, active, onClick, title, desc, icon }: { id: string, active: boolean, onClick: () => void, title: string, desc: string, icon: React.ReactNode }) => (
  <button 
    onClick={onClick}
    className={cn("w-full text-left p-6 rounded-[2rem] border transition-all duration-500 group flex items-center justify-between", 
      active ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-zinc-900 dark:border-white shadow-2xl translate-x-3" : "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white border-zinc-100 dark:border-zinc-800 hover:border-emerald-500/30 shadow-sm")}
  >
    <div className="flex items-center gap-5">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-colors", 
        active ? "bg-white/10 text-white dark:bg-zinc-900/10 dark:text-zinc-900" : "bg-zinc-50 dark:bg-zinc-900 text-zinc-400")}>
        {icon}
      </div>
      <div>
        <h4 className="text-[13px] font-black uppercase tracking-tight mb-1">{title}</h4>
        <p className={cn("text-[9px] font-bold uppercase tracking-widest", active ? "text-white/60 dark:text-zinc-900/40" : "text-zinc-400")}>{desc}</p>
      </div>
    </div>
    <ChevronRight size={20} className={cn("transition-transform", active ? "rotate-180" : "group-hover:translate-x-1")} />
  </button>
);

const InputGroup = ({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">{label}</label>
    <input 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-14 bg-zinc-50 dark:bg-zinc-900/50 border-none rounded-2xl px-6 text-sm font-bold" 
    />
  </div>
);

const ActivityItem = ({ date, action, device }: { date: string, action: string, device: string }) => (
  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 flex justify-between items-center group">
    <div>
      <p className="text-[11px] font-black text-zinc-900 dark:text-white group-hover:text-emerald-500 transition-colors uppercase">{action}</p>
      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">{device}</p>
    </div>
    <p className="text-[9px] font-bold text-zinc-400 uppercase">{date}</p>
  </div>
);

const ToggleRow = ({ label, desc, enabled }: { label: string, desc: string, enabled?: boolean }) => (
  <div className="flex items-center justify-between p-4 border-b border-zinc-50 dark:border-zinc-900 last:border-0">
    <div>
      <p className="text-[11px] font-black text-zinc-900 dark:text-white uppercase">{label}</p>
      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{desc}</p>
    </div>
    <div className={cn("w-10 h-6 rounded-full transition-colors relative cursor-pointer", enabled ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800")}>
       <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-sm", enabled ? "right-1" : "left-1")} />
    </div>
  </div>
);

const LinkItem = ({ label }: { label: string }) => (
  <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-all group">
    <span className="text-[11px] font-black text-zinc-900 dark:text-white uppercase">{label}</span>
    <ChevronRight size={14} className="text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-all" />
  </div>
);

const Sun = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
);

const Moon = (props: any) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-moon"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
);
