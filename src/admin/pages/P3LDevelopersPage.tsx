import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/adminSupabase';
import { useAdminAlert } from '../context/AdminAlertContext';
import { 
  Users, 
  Shield, 
  Plus, 
  Search, 
  Mail, 
  Phone, 
  Key, 
  Trash2, 
  X,
  Send,
  UserCheck,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Zap,
  Globe,
  Github
} from 'lucide-react';

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  password: string;
  admin_role: string;
  department?: string;
  is_active: boolean;
  created_at: string;
}

export const P3LDevelopersPage: React.FC = () => {
  const { showAlert } = useAdminAlert();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});

  // Form State
  const [form, setForm] = useState({ full_name: '', email: '', password: '', admin_role: 'SUPER_ADMIN', department: 'Engineering' });
  const [saving, setSaving] = useState(false);

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false });
    setAdmins(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadAdmins(); }, [loadAdmins]);

  const togglePassword = (id: string) => {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddAdmin = async () => {
    if (!form.full_name || !form.email || !form.password) {
      showAlert('Full Name, Email and Password are required.', 'Missing Data');
      return;
    }
    
    setSaving(true);
    try {
      // 1. Save to database
      const { data, error } = await supabase
        .from('admin_users')
        .insert([{ ...form, is_active: true }])
        .select()
        .single();

      if (error) throw error;

      // 2. Send Welcome Email via Backend
      await fetch('http://localhost:5000/api/welcome-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminName: form.full_name,
          adminEmail: form.email,
          adminPassword: form.password
        })
      });

      showAlert(`${form.full_name} has been registered and notified.`, 'Admin Created');
      setShowAddModal(false);
      setForm({ full_name: '', email: '', password: '', admin_role: 'SUPER_ADMIN', department: 'Engineering' });
      loadAdmins();
    } catch (err: any) {
      showAlert(err.message, 'Database Error');
    } finally {
      setSaving(false);
    }
  };

  const deleteAdmin = async (id: string) => {
    if (!confirm('Destroy this administrative identity? This cannot be undone.')) return;
    const { error } = await supabase.from('admin_users').delete().eq('id', id);
    if (!error) {
      setAdmins(prev => prev.filter(a => a.id !== id));
      showAlert('Identity purged from system.', 'Success');
    }
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-20 px-4">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-8 border-b border-zinc-100 dark:border-zinc-800">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold dark:text-white tracking-tight font-sora flex items-center gap-4">
             <div className="w-12 h-12 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-2xl flex items-center justify-center shadow-2xl">
                <Shield size={24} />
             </div>
             P3L Developers
          </h1>
          <p className="text-[10px] text-zinc-400 uppercase font-black tracking-[0.2em]">Super-Admin & Core System Infrastructure Access</p>
        </div>
        <button 
           onClick={() => setShowAddModal(true)}
           className="flex items-center gap-3 px-8 py-4 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-zinc-200/20 dark:shadow-none"
        >
           <Plus size={16} /> Register New Admin
        </button>
      </div>

      {/* Admin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] p-8 space-y-4">
            <div className="flex items-center gap-2 text-zinc-400">
               <ShieldCheck size={16} />
               <p className="text-[10px] font-black uppercase tracking-widest">Total Super Admins</p>
            </div>
            <p className="text-5xl font-black tabular-nums dark:text-white">{admins.length}</p>
         </div>
         <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] p-8 space-y-4">
            <div className="flex items-center gap-2 text-emerald-500">
               <Zap size={16} />
               <p className="text-[10px] font-black uppercase tracking-widest">Active Access Nodes</p>
            </div>
            <p className="text-5xl font-black tabular-nums dark:text-white">{admins.filter(a => a.is_active).length}</p>
         </div>
         <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] p-8 space-y-4">
            <div className="flex items-center gap-2 text-blue-500">
               <Globe size={16} />
               <p className="text-[10px] font-black uppercase tracking-widest">Regional Deployment</p>
            </div>
            <p className="text-5xl font-black tabular-nums dark:text-white uppercase tracking-tighter">IAD1</p>
         </div>
      </div>

      {/* Main Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-sm">
         <div className="p-8 border-b border-zinc-50 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/30 dark:bg-zinc-800/20">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white font-sora">Administrative Registry</h3>
            <div className="relative">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
               <input 
                  type="text" 
                  placeholder="Filter by name..." 
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-xl pl-10 pr-6 py-2.5 text-xs outline-none w-64"
               />
            </div>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-left">
               <thead>
                  <tr className="border-b border-zinc-50 dark:border-zinc-800">
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Identity</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Credentials</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Role/Dept</th>
                     <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                  {admins.filter(a => a.full_name.toLowerCase().includes(search.toLowerCase())).map(a => (
                     <tr key={a.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-all">
                        <td className="px-8 py-6">
                           <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-zinc-900 text-white rounded-xl flex items-center justify-center text-xs font-black uppercase shadow-lg shadow-zinc-900/20">{a.full_name.slice(0,2)}</div>
                              <div>
                                 <p className="text-sm font-bold text-zinc-900 dark:text-white">{a.full_name}</p>
                                 <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{a.id.substring(0,8)}</p>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                 <Mail size={12} className="text-zinc-400" /> {a.email}
                              </div>
                              <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300">
                                 <Key size={12} className="text-zinc-400" /> 
                                 <div className="flex items-center gap-2">
                                    <span className="font-mono">{showPassword[a.id] ? a.password : '••••••••••••'}</span>
                                    <button onClick={() => togglePassword(a.id)} className="text-zinc-400 hover:text-orange-600">
                                       {showPassword[a.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                 </div>
                              </div>
                           </div>
                        </td>
                        <td className="px-8 py-6">
                           <div className="space-y-1">
                              <span className="text-[9px] font-black uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md text-zinc-600 dark:text-zinc-400">{a.admin_role}</span>
                              <p className="text-[10px] text-zinc-400 uppercase tracking-widest">{a.department || 'Management'}</p>
                           </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                           <div className="flex justify-end gap-3">
                              <button className="p-2 text-zinc-300 hover:text-zinc-900 dark:hover:text-white"><MoreVertical size={16} /></button>
                              <button onClick={() => deleteAdmin(a.id)} className="p-2 text-zinc-300 hover:text-red-600 transition-all"><Trash2 size={16} /></button>
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* Add Admin Modal */}
      {showAddModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/50 backdrop-blur-md">
            <div className="w-full max-w-xl bg-white dark:bg-zinc-900 rounded-[3rem] border border-zinc-100 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in duration-300">
               <div className="p-10 border-b border-zinc-50 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-800/30">
                  <div>
                     <h3 className="text-2xl font-bold dark:text-white font-sora">Register Administrative Identity</h3>
                     <p className="text-xs text-zinc-500 font-medium mt-1">This user will receive a system-generated welcome email.</p>
                  </div>
                  <button onClick={() => setShowAddModal(false)} className="p-3 bg-white dark:bg-zinc-800 rounded-full shadow-sm hover:scale-110 transition-transform"><X size={20} /></button>
               </div>
               
               <div className="p-12 space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                     <div className="space-y-2">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Full Legal Name</p>
                        <input 
                           type="text" 
                           value={form.full_name}
                           onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                           className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-[1.25rem] text-sm outline-none focus:ring-4 focus:ring-zinc-900/5 dark:focus:ring-white/5 transition-all"
                           placeholder="Razak Guyo"
                        />
                     </div>
                     <div className="space-y-2">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Official Email</p>
                        <input 
                           type="email" 
                           value={form.email}
                           onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                           className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-[1.25rem] text-sm outline-none focus:ring-4 focus:ring-zinc-900/5 dark:focus:ring-white/5 transition-all"
                           placeholder="razak@p3l.dev"
                        />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8">
                     <div className="space-y-2">
                        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Secure Password</p>
                        <input 
                           type="text" 
                           value={form.password}
                           onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                           className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-[1.25rem] text-sm outline-none focus:ring-4 focus:ring-zinc-900/5 dark:focus:ring-white/5 transition-all"
                           placeholder="••••••••"
                        />
                     </div>
                  </div>

                  <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-[1.5rem] flex items-start gap-4 border border-zinc-100 dark:border-zinc-800">
                     <AlertCircle className="text-orange-500 shrink-0" size={18} />
                     <p className="text-[11px] text-zinc-500 leading-relaxed">
                        <strong>Security Protocol:</strong> Registration will trigger an automated welcome sequence including an access key and infrastructure briefing via the Matta AI systems bridge.
                     </p>
                  </div>
               </div>

               <div className="p-12 pt-0 flex gap-4">
                  <button onClick={() => setShowAddModal(false)} className="flex-1 py-5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-zinc-200 transition-all">Cancel</button>
                  <button 
                     onClick={handleAddAdmin}
                     disabled={saving}
                     className="flex-1 py-5 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-black uppercase tracking-widest rounded-2xl shadow-2xl hover:scale-[0.98] transition-all disabled:opacity-50"
                  >
                     {saving ? 'Synchronizing Database...' : 'Register Access Node'}
                  </button>
               </div>
            </div>
         </div>
      )}

    </div>
  );
};

const MoreVertical = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
);
