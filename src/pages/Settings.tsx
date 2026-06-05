import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { 
  Save, 
  Building,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Settings as SettingsIcon,
  UserCircle2,
  KeyRound,
  LogOut,
  RefreshCw
} from 'lucide-react';
import { ParentStudentProfileSettings } from './ParentStudentProfileSettings';

export const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  
  if (user?.role === 'PARENT' || user?.role === 'STUDENT') {
    return <ParentStudentProfileSettings />;
  }

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [school, setSchool] = useState<any>({});
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const fetchData = async () => {
    if (!user?.school_id) return;
    setLoading(true);
    try {
      const schoolData = await api.getSchoolSettings(user.school_id);
      setSchool(schoolData || {});
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.school_id]);

  const handleSaveSchoolSettings = async () => {
    if (!user?.school_id) return;
    setSaving(true);
    try {
      await api.updateSchoolSettings(user.school_id, {
        name: school.name,
        type: school.type,
        paybill_no: school.paybill_no,
        email: school.email,
        phone: school.phone,
        address: school.address
      });
      showToast('School settings updated successfully', 'success');
    } catch (err) {
      showToast('Failed to update school settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
       showToast('Passwords do not match', 'error');
       return;
    }
    if (passwordForm.newPassword.length < 6) {
       showToast('Password must be at least 6 characters', 'error');
       return;
    }
    
    setSaving(true);
    const { data: current, error: currentErr } = await supabase.from('profiles').select('password').eq('id', user.id).maybeSingle();
    if (currentErr) {
      setSaving(false);
      return showToast(`Auth Error: ${currentErr.message}`, 'error');
    }
    if (current?.password && current.password !== passwordForm.currentPassword) {
      setSaving(false);
      return showToast('Current password incorrect', 'error');
    }
    const { error } = await supabase.from('profiles').update({ password: passwordForm.newPassword }).eq('id', user.id);
    setSaving(false);
    
    if (error) return showToast(`Update failed: ${error.message}`, 'error');
    
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    showToast('Security credentials updated successfully', 'success');
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <RefreshCw className="animate-spin text-zinc-300" size={24} />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto py-10 px-6 font-inter space-y-12 animate-in fade-in bg-white text-black min-h-screen">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black pb-6">
         <div>
            <h1 className="text-3xl font-normal tracking-tight text-black" style={{ fontFamily: 'Sora' }}>
               System Configurations
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-2">
               Manage School and Personal Identity
            </p>
         </div>
         <button 
            onClick={logout}
            className="flex items-center gap-2 px-6 py-3 border border-black text-black text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-colors"
         >
            <LogOut size={14} /> Log Out
         </button>
      </div>

      <div className="space-y-12">
         {/* SECTION 1: PERSONAL PROFILE */}
         <section className="space-y-6">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100 pb-2">1. Personal Profile</h2>
            <div className="p-8 border border-zinc-200 grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="flex items-start gap-4">
                  <UserCircle2 size={48} className="text-zinc-300" />
                  <div>
                     <p className="text-xl font-normal text-black" style={{ fontFamily: 'Sora' }}>{user?.full_name}</p>
                     <p className="text-xs font-bold text-zinc-500 mt-1">{user?.role}</p>
                     <div className="mt-4 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Email: <span className="text-black font-medium">{user?.email}</span></p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Phone: <span className="text-black font-medium">{user?.phone || 'N/A'}</span></p>
                     </div>
                  </div>
               </div>
               
               <div className="border-l border-zinc-100 pl-8">
                  <h3 className="text-xs font-black uppercase tracking-widest text-black mb-4 flex items-center gap-2">
                     <KeyRound size={14}/> Change Password
                  </h3>
                  <form onSubmit={handleChangePassword} className="space-y-3">
                     <input type="password" placeholder="Current Password" value={passwordForm.currentPassword} onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})} required className="w-full px-3 py-2 border border-zinc-200 text-xs font-bold text-black focus:outline-none focus:border-black" />
                     <input type="password" placeholder="New Password" value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} required className="w-full px-3 py-2 border border-zinc-200 text-xs font-bold text-black focus:outline-none focus:border-black" />
                     <input type="password" placeholder="Confirm Password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} required className="w-full px-3 py-2 border border-zinc-200 text-xs font-bold text-black focus:outline-none focus:border-black" />
                     <button type="submit" disabled={saving} className="w-full mt-2 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50">
                        Update Password
                     </button>
                  </form>
               </div>
            </div>
         </section>

         {/* SECTION 2: SCHOOL SETTINGS */}
         {(user?.role === 'PRINCIPAL' || user?.role === 'ADMIN') && (
            <section className="space-y-6">
               <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                  <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">2. Institutional Identity & Settings</h2>
                  <button 
                     onClick={handleSaveSchoolSettings}
                     disabled={saving}
                     className="flex items-center gap-2 px-4 py-2 bg-black text-white text-[9px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors disabled:opacity-50"
                  >
                     {saving ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                     Save School Info
                  </button>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border border-zinc-200 p-8">
                  <div className="space-y-4">
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-2"><Building size={12}/> Registered Name</label>
                        <input 
                           type="text" 
                           value={school.name || ''} 
                           onChange={e => setSchool({...school, name: e.target.value})}
                           className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-sm font-bold text-black focus:outline-none focus:border-black"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-2"><SettingsIcon size={12}/> Admissions Logic (Type)</label>
                        <select 
                           value={school.type || 'PUBLIC'} 
                           onChange={e => setSchool({...school, type: e.target.value})}
                           className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-sm font-bold text-black focus:outline-none focus:border-black"
                        >
                           <option value="PUBLIC">Public / Capitation</option>
                           <option value="PRIVATE">Private / Independent</option>
                        </select>
                     </div>
                     <div className="space-y-2 pt-4 border-t border-zinc-100">
                        <label className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-2"><CreditCard size={12}/> Primary Paybill Number</label>
                        <input 
                           type="text" 
                           value={school.paybill_no || ''} 
                           onChange={e => setSchool({...school, paybill_no: e.target.value})}
                           placeholder="e.g. 222111"
                           className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-xl tracking-[0.2em] font-normal text-black focus:outline-none focus:border-black"
                           style={{ fontFamily: 'Sora' }}
                        />
                        <p className="text-[9px] font-medium text-zinc-400 mt-1">This number is pushed to the Parent/Student Billing Portal.</p>
                     </div>
                  </div>
                  
                  <div className="space-y-4">
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-2"><Phone size={12}/> Primary Phone</label>
                        <input 
                           type="tel" 
                           value={school.phone || ''} 
                           onChange={e => setSchool({...school, phone: e.target.value})}
                           className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-sm font-bold text-black focus:outline-none focus:border-black"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-2"><Mail size={12}/> Official Email</label>
                        <input 
                           type="email" 
                           value={school.email || ''} 
                           onChange={e => setSchool({...school, email: e.target.value})}
                           className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-sm font-bold text-black focus:outline-none focus:border-black"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-2"><MapPin size={12}/> Physical Address</label>
                        <input 
                           type="text" 
                           value={school.address || ''} 
                           onChange={e => setSchool({...school, address: e.target.value})}
                           className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-sm font-bold text-black focus:outline-none focus:border-black"
                        />
                     </div>
                  </div>
               </div>
            </section>
         )}
      </div>

    </div>
  );
};
