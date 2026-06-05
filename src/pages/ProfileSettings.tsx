import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/UI';
import { KeyRound, LogOut, FileText, UserCircle2, ArrowLeft } from 'lucide-react';
import { ParentStudentProfileSettings } from './ParentStudentProfileSettings';

export const ProfileSettings: React.FC = () => {
  const { user, logout } = useAuth();
  if (user?.role === 'PARENT' || user?.role === 'STUDENT') {
    return <ParentStudentProfileSettings />;
  }

  const navigate = useNavigate();
  const [statusMessage, setStatusMessage] = useState('');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [loadingProfileData, setLoadingProfileData] = useState(true);

  useEffect(() => {
    const loadTeachingData = async () => {
      if (!user?.school_id || !user?.id || (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'PRINCIPAL')) {
        setLoadingProfileData(false);
        return;
      }
      setLoadingProfileData(true);
      try {
        const [assignmentsRes, classTeacherRes] = await Promise.all([
          supabase.from('teacher_subject_stream_assignments').select('class_id, subject_id').eq('school_id', user.school_id).eq('teacher_id', user.id),
          supabase.from('streams').select('id, class_teacher_id, class:classes(name)').eq('school_id', user.school_id).eq('class_teacher_id', user.id)
        ]);
        if (assignmentsRes.error) throw assignmentsRes.error;
        if (classTeacherRes.error) throw classTeacherRes.error;

        const assignmentRows = assignmentsRes.data || [];
        const classIds = Array.from(new Set(assignmentRows.map((row) => row.class_id).filter(Boolean)));
        const subjectIds = Array.from(new Set(assignmentRows.map((row) => row.subject_id).filter(Boolean)));

        const [classRowsRes, subjectRowsRes] = await Promise.all([
          classIds.length ? supabase.from('classes').select('id, name').in('id', classIds) : Promise.resolve({ data: [] }),
          subjectIds.length ? supabase.from('subjects').select('id, name').in('id', subjectIds) : Promise.resolve({ data: [] })
        ]);
        setClasses(classRowsRes.data || []);
        setSubjects(subjectRowsRes.data || []);
        setIsClassTeacher((classTeacherRes.data || []).length > 0);
      } catch (error: any) {
        setStatusMessage(error?.message || 'Could not load profile details.');
      } finally {
        setLoadingProfileData(false);
      }
    };
    loadTeachingData();
  }, [user?.id, user?.school_id, user?.role]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    if (passwordForm.newPassword !== passwordForm.confirmPassword) return setStatusMessage('Confirmation does not match.');
    if (passwordForm.newPassword.length < 6) return setStatusMessage('Minimum 6 characters required.');
    
    setSavingPassword(true);
    const { data: current, error: currentErr } = await supabase.from('profiles').select('password').eq('id', user.id).maybeSingle();
    if (currentErr) {
      setSavingPassword(false);
      return setStatusMessage(`Auth Error: ${currentErr.message}`);
    }
    if (current?.password && current.password !== passwordForm.currentPassword) {
      setSavingPassword(false);
      return setStatusMessage('Current password incorrect.');
    }
    const { error } = await supabase.from('profiles').update({ password: passwordForm.newPassword }).eq('id', user.id);
    setSavingPassword(false);
    
    if (error) return setStatusMessage(`Update failed: ${error.message}`);
    
    setIsPasswordModalOpen(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    alert('Security credentials updated successfully.');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 font-inter space-y-12 animate-in fade-in bg-white min-h-screen text-black">
      
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-black pb-4">
         <div>
            <button 
               onClick={() => window.history.back()}
               className="flex items-center gap-2 text-zinc-400 hover:text-black transition-colors text-[10px] font-black uppercase tracking-widest mb-4"
            >
               <ArrowLeft size={14} /> Return
            </button>
            <h1 className="text-3xl font-normal tracking-tight text-black" style={{ fontFamily: 'Sora' }}>
               Personnel Profile
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-2">
               Identity & Security Settings
            </p>
         </div>
         <button 
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 border border-black text-black text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-colors"
         >
            <LogOut size={14} /> End Session
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
         {/* Identity Information */}
         <div className="space-y-6">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100 pb-2">Verified Identity</h2>
            
            <div className="flex items-start gap-6 border border-zinc-200 p-6">
               <UserCircle2 size={48} className="text-zinc-300" />
               <div>
                  <p className="text-xl font-normal text-black" style={{ fontFamily: 'Sora' }}>{user?.full_name}</p>
                  <p className="text-xs font-bold text-zinc-500 mt-1">{user?.role}</p>
                  <div className="mt-4 space-y-2">
                     <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Email: <span className="text-black font-medium">{user?.email}</span></p>
                     <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Phone: <span className="text-black font-medium">{user?.phone || 'N/A'}</span></p>
                     <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">UID: <span className="text-black font-medium">{user?.id?.split('-')[0]}***</span></p>
                  </div>
               </div>
            </div>

            {loadingProfileData ? (
               <p className="text-xs font-bold text-zinc-400">Syncing assignment records...</p>
            ) : (user?.role === 'TEACHER' || user?.role === 'PRINCIPAL') ? (
               <div className="border border-zinc-200 p-6 space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-widest text-black">Academic Assignments</h3>
                  <div className="space-y-3 pt-2 border-t border-zinc-100">
                     <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Classes</p>
                        <p className="text-xs font-bold text-black">{classes.length ? classes.map(c => c.name).join(', ') : 'Global Oversight'}</p>
                     </div>
                     <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Subjects</p>
                        <p className="text-xs font-bold text-black">{subjects.length ? subjects.map(c => c.name).join(', ') : 'All Subjects'}</p>
                     </div>
                     {isClassTeacher && (
                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-1 inline-block mt-2">Class Teacher Confirmed</p>
                     )}
                  </div>
               </div>
            ) : null}
         </div>

         {/* Security & System */}
         <div className="space-y-6">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100 pb-2">Security Parameters</h2>
            
            <div className="border border-zinc-200 p-6 space-y-4">
               <div className="flex items-center gap-3 mb-4">
                  <KeyRound size={20} className="text-black" />
                  <div>
                     <p className="text-sm font-bold text-black">Authentication Key</p>
                     <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest mt-1">Last updated: N/A</p>
                  </div>
               </div>
               <button 
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="w-full py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors"
               >
                  Modify Credentials
               </button>
            </div>

            <div className="border border-zinc-200 p-6 space-y-4">
               <div className="flex items-center gap-3 mb-4">
                  <FileText size={20} className="text-black" />
                  <div>
                     <p className="text-sm font-bold text-black">System Agreements</p>
                     <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest mt-1">Compliance & Policies</p>
                  </div>
               </div>
               <div className="space-y-2 flex flex-col">
                  <a href="#" className="text-xs font-bold text-zinc-400 hover:text-black underline">Terms of Service</a>
                  <a href="#" className="text-xs font-bold text-zinc-400 hover:text-black underline">Privacy Policy</a>
               </div>
            </div>
         </div>
      </div>

      <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title="Modify Authentication Key">
         <div className="p-6 bg-white font-inter">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6">Enter current and new security keys</p>
            <form onSubmit={handleChangePassword} className="space-y-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black">Current Key</label>
                  <input type="password" value={passwordForm.currentPassword} onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})} required className="w-full px-4 py-3 bg-white border border-zinc-200 text-sm font-bold text-black focus:outline-none focus:border-black transition-colors" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black">New Key</label>
                  <input type="password" value={passwordForm.newPassword} onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})} required className="w-full px-4 py-3 bg-white border border-zinc-200 text-sm font-bold text-black focus:outline-none focus:border-black transition-colors" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black">Verify Key</label>
                  <input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})} required className="w-full px-4 py-3 bg-white border border-zinc-200 text-sm font-bold text-black focus:outline-none focus:border-black transition-colors" />
               </div>
               {statusMessage && <p className="text-xs font-bold text-rose-500 mt-2">{statusMessage}</p>}
               <button type="submit" disabled={savingPassword} className="w-full mt-6 py-4 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors disabled:opacity-50">
                  {savingPassword ? 'Processing...' : 'Apply Security Update'}
               </button>
            </form>
         </div>
      </Modal>

    </div>
  );
};
