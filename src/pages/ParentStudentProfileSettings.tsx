import React, { useEffect, useState } from 'react';
import { Bell, Lock, MoonStar, Sun, UserCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Button, Badge } from '../components/UI';

export const ParentStudentProfileSettings: React.FC = () => {
  const { user, isDarkMode, toggleDarkMode } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.school_id) return;
      setLoading(true);
      try {
        const allStudents = await api.getStudents(user.school_id);
        if (user.role === 'PARENT') {
          setStudents((allStudents || []).filter((row: any) => row.parent_id === user.id));
        } else {
          setStudents((allStudents || []).filter((row: any) => row.id === user.id));
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id, user?.school_id, user?.role]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Profile Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 shadow-2xl shadow-black/[0.03]">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="relative p-8 flex flex-col md:flex-row items-center gap-8">
          <div className="relative">
            <div className="w-24 h-24 md:w-32 md:h-32 rounded-[2rem] bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 border-4 border-white dark:border-zinc-900 shadow-xl">
              <UserCircle2 size={56} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-emerald-500 border-4 border-white dark:border-zinc-900 rounded-full"></div>
          </div>
          
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">
              {user?.role} ACCOUNT
            </div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white" style={{ fontFamily: 'Sora' }}>
              {user?.full_name || 'Portal User'}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 font-medium mt-1">Official School Repository Record</p>
          </div>
        </div>

        <div className="border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-zinc-100 dark:divide-zinc-800">
          <StatItem label="Profile Email" value={user?.email} />
          <StatItem label="Verified Phone" value={user?.phone || 'No phone'} />
          <StatItem label="Account Status" value="Active" color="text-emerald-600" />
          <StatItem label="Access Level" value={user?.role} />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Linked Students Section */}
        <div className="lg:col-span-7 space-y-6">
          <section className="rounded-[2.5rem] border border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white" style={{ fontFamily: 'Sora' }}>Family Records</h2>
              <Badge variant="outline" className="rounded-full px-3 py-1">Linked Entities</Badge>
            </div>

            {loading ? (
              <div className="flex items-center gap-3 py-12 text-zinc-400">
                <div className="w-5 h-5 border-2 border-zinc-200 border-t-zinc-900 dark:border-t-white rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Syncing school records...</span>
              </div>
            ) : (
              <div className="grid gap-4">
                {students.length === 0 && (
                  <div className="text-center py-12 rounded-3xl bg-zinc-50 dark:bg-zinc-800/30 border border-dashed border-zinc-200 dark:border-zinc-700">
                    <p className="text-sm text-zinc-500">No linked student records found.</p>
                  </div>
                )}
                {students.map((row: any) => (
                  <div key={row.id} className="group p-5 rounded-3xl border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-800/50 hover:shadow-xl hover:shadow-black/[0.02] transition-all flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center text-zinc-500 font-bold text-lg">
                      {row.profile?.full_name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-zinc-900 dark:text-white">{row.profile?.full_name || '-'}</p>
                      <p className="text-xs text-zinc-500 font-medium">Admission No: {row.adm_no || '-'}</p>
                    </div>
                    <div className="text-emerald-500">
                      <Lock size={14} className="opacity-20 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Preferences Section */}
        <div className="lg:col-span-5 space-y-6">
          <section className="rounded-[2.5rem] border border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl p-8 shadow-sm">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-8" style={{ fontFamily: 'Sora' }}>Interface Controls</h2>
            <div className="space-y-3">
              <ActionRow 
                icon={isDarkMode ? <Sun size={18} /> : <MoonStar size={18} />} 
                label={isDarkMode ? 'Solar Interface' : 'Lunar Interface'} 
                onClick={toggleDarkMode} 
              />
              <ActionRow icon={<Bell size={18} />} label="Notification Feed" onClick={() => {}} />
              <ActionRow icon={<Lock size={18} />} label="Security Protocols" onClick={() => {}} />
            </div>
          </section>

          <footer className="px-4 py-8 text-center border border-zinc-100 dark:border-zinc-800 rounded-[2rem]">
            <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1 leading-none">Institutional Portal</p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">Secure Encrypted Environment. Build 2.0.4</p>
          </footer>
        </div>
      </div>
    </div>
  );
};

const StatItem = ({ label, value, color }: { label: string, value: string, color?: string }) => (
  <div className="p-6">
    <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-1.5">{label}</p>
    <p className={`text-sm font-bold ${color || 'text-zinc-900 dark:text-white'}`}>{value || '-'}</p>
  </div>
);

const ActionRow = ({ icon, label, onClick }: { icon: React.ReactNode, label: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="w-full p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-900 dark:hover:bg-white text-zinc-900 dark:text-zinc-100 hover:text-white dark:hover:text-black transition-all flex items-center gap-4 group active:scale-[0.98]"
  >
    <div className="transition-colors">{icon}</div>
    <span className="text-sm font-bold flex-1 text-left">{label}</span>
  </button>
);
