import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button, Modal, Badge } from '../components/UI';
import { Shield, KeyRound, LogOut, MoonStar, Sun, LifeBuoy, FileText, UserCircle2 } from 'lucide-react';
import { ParentStudentProfileSettings } from './ParentStudentProfileSettings';

type AssignmentRow = {
  class_id: string | null;
  subject_id: string | null;
};

type SubjectRow = { id: string; name: string };
type ClassRow = { id: string; name: string };
type StreamRow = { id: string; class_teacher_id: string | null; class: { name: string } | null };

export const ProfileSettings: React.FC = () => {
  const { user, logout, isDarkMode, toggleDarkMode } = useAuth();
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

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [loadingProfileData, setLoadingProfileData] = useState(true);

  useEffect(() => {
    const loadTeachingData = async () => {
      if (!user?.school_id || !user?.id) {
        setLoadingProfileData(false);
        return;
      }

      if (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'PRINCIPAL') {
        setLoadingProfileData(false);
        return;
      }

      setLoadingProfileData(true);
      try {
        const [assignmentsRes, classTeacherRes] = await Promise.all([
          supabase
            .from('teacher_subject_stream_assignments')
            .select('class_id, subject_id')
            .eq('school_id', user.school_id)
            .eq('teacher_id', user.id),
          supabase
            .from('streams')
            .select('id, class_teacher_id, class:classes(name)')
            .eq('school_id', user.school_id)
            .eq('class_teacher_id', user.id)
        ]);

        if (assignmentsRes.error) throw assignmentsRes.error;
        if (classTeacherRes.error) throw classTeacherRes.error;

        const assignmentRows = (assignmentsRes.data || []) as AssignmentRow[];
        const classIds = Array.from(new Set(assignmentRows.map((row) => row.class_id).filter(Boolean))) as string[];
        const subjectIds = Array.from(new Set(assignmentRows.map((row) => row.subject_id).filter(Boolean))) as string[];

        const [classRowsRes, subjectRowsRes] = await Promise.all([
          classIds.length
            ? supabase.from('classes').select('id, name').in('id', classIds)
            : Promise.resolve({ data: [], error: null }),
          subjectIds.length
            ? supabase.from('subjects').select('id, name').in('id', subjectIds)
            : Promise.resolve({ data: [], error: null })
        ]);

        if (classRowsRes.error) throw classRowsRes.error;
        if (subjectRowsRes.error) throw subjectRowsRes.error;

        setClasses((classRowsRes.data || []) as ClassRow[]);
        setSubjects((subjectRowsRes.data || []) as SubjectRow[]);
        setIsClassTeacher(((classTeacherRes.data || []) as StreamRow[]).length > 0);
      } catch (error: any) {
        setStatusMessage(error?.message ? `Could not load profile details: ${error.message}` : 'Could not load profile details.');
      } finally {
        setLoadingProfileData(false);
      }
    };

    loadTeachingData();
  }, [user?.id, user?.school_id, user?.role]);

  const classNames = useMemo(() => classes.map((c) => c.name), [classes]);
  const subjectNames = useMemo(() => subjects.map((s) => s.name), [subjects]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setStatusMessage('New password and confirmation do not match.');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setStatusMessage('New password should be at least 6 characters.');
      return;
    }

    setSavingPassword(true);

    const { data: current, error: currentErr } = await supabase
      .from('profiles')
      .select('password')
      .eq('id', user.id)
      .maybeSingle();

    if (currentErr) {
      setSavingPassword(false);
      setStatusMessage(`Could not verify current password: ${currentErr.message}`);
      return;
    }

    if (current?.password && current.password !== passwordForm.currentPassword) {
      setSavingPassword(false);
      setStatusMessage('Current password is incorrect.');
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ password: passwordForm.newPassword })
      .eq('id', user.id);

    setSavingPassword(false);

    if (error) {
      setStatusMessage(`Could not update password: ${error.message}`);
      return;
    }

    setStatusMessage('Password updated.');
    setIsPasswordModalOpen(false);
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in duration-700">
      {/* Header Profile Card */}
      <section className="relative overflow-hidden rounded-[2.5rem] border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)]">
        {/* Abstract Background Decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-emerald-500/10 to-transparent rounded-full blur-3xl -ml-20 -mb-20"></div>
        
        <div className="relative p-8 md:p-12">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12">
            <div className="relative group">
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-800 shadow-2xl flex items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-105">
                <UserCircle2 size={96} className="text-zinc-400 dark:text-zinc-500 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 transition-colors" />
                {/* Status Indicator */}
                <div className="absolute bottom-2 right-2 w-6 h-6 bg-emerald-500 border-4 border-white dark:border-zinc-900 rounded-full"></div>
              </div>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="inline-flex px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">
                Institutional Account
              </div>
              <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-zinc-900 dark:text-white mb-2" style={{ fontFamily: 'Sora' }}>
                {user?.full_name || 'Administrator'}
              </h1>
              <p className="text-lg text-zinc-500 dark:text-zinc-400 font-medium mb-8">
                {user?.role === 'PRINCIPAL' ? 'Head of Institution' : user?.role || 'Staff Member'}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                <InfoItem icon={<Shield size={16} />} label="Email Address" value={user?.email} />
                <InfoItem icon={<LifeBuoy size={16} />} label="Contact Line" value={user?.phone || 'No phone linked'} />
                <InfoItem icon={<FileText size={16} />} label="Access Level" value={user?.role} />
                <InfoItem icon={<KeyRound size={16} />} label="Last Login" value="Recently active" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Teaching Details & Actions */}
        <div className="lg:col-span-2 space-y-8">
          <section className="rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white" style={{ fontFamily: 'Sora' }}>Assignment Details</h2>
              <Badge variant="outline" className="px-3 py-1">Institutional Data</Badge>
            </div>
            
            {loadingProfileData ? (
              <div className="flex items-center gap-3 py-8 text-zinc-400">
                <div className="w-5 h-5 border-2 border-zinc-300 border-t-zinc-900 rounded-full animate-spin"></div>
                <span className="text-sm font-medium">Synchronizing profile...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DetailCard title="Classes In Charge" content={classNames.length ? classNames.join(', ') : 'Direct Administration'} />
                <DetailCard title="Primary Subjects" content={subjectNames.length ? subjectNames.join(', ') : 'Administrative Control'} />
                <DetailCard title="Special Roles" content={isClassTeacher ? 'Class Teacher Assigned' : 'Institutional Oversight'} />
              </div>
            )}
          </section>

          <section className="rounded-[2rem] border border-zinc-200/50 dark:border-zinc-800/50 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md p-8 shadow-sm">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-8" style={{ fontFamily: 'Sora' }}>Security & Platform</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <ActionButton 
                icon={<KeyRound size={18} />} 
                label="Update Security Key" 
                desc="Change your authentication password" 
                onClick={() => setIsPasswordModalOpen(true)} 
              />
              <ActionButton 
                icon={isDarkMode ? <Sun size={18} /> : <MoonStar size={18} />} 
                label={isDarkMode ? 'Lunar Mode' : 'Solar Mode'} 
                desc="Toggle institutional interface theme" 
                onClick={toggleDarkMode} 
              />
            </div>
          </section>
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-rose-100 dark:border-rose-900/30 bg-rose-50/50 dark:bg-rose-950/20 p-8">
            <h3 className="text-sm font-bold text-rose-900 dark:text-rose-400 mb-4 uppercase tracking-widest">Danger Zone</h3>
            <p className="text-xs text-rose-600/80 dark:text-rose-400/60 mb-6 leading-relaxed">Ensure you have saved all changes before terminating your current professional session.</p>
            <button 
              onClick={handleLogout}
              className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold shadow-lg shadow-rose-600/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <LogOut size={18} /> Sign Out
            </button>
          </div>

          <div className="p-4">
             <div className="flex flex-col gap-4 text-[11px] text-zinc-400 dark:text-zinc-600 font-medium uppercase tracking-tighter">
                <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-2 underline decoration-zinc-200 dark:decoration-zinc-800">Legal Agreements</a>
                <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-2 underline decoration-zinc-200 dark:decoration-zinc-800">Privacy Compliance</a>
                <a href="#" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-2 underline decoration-zinc-200 dark:decoration-zinc-800">Institutional Support</a>
             </div>
          </div>
        </div>
      </div>

      <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title="Security Update">
        <div className="p-4">
          <form className="space-y-5" onSubmit={handleChangePassword}>
            <div className="space-y-4">
              <InputField 
                label="Existing Key" 
                type="password" 
                value={passwordForm.currentPassword} 
                onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} 
              />
              <InputField 
                label="New Secure Key" 
                type="password" 
                value={passwordForm.newPassword} 
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} 
              />
              <InputField 
                label="Verify Key" 
                type="password" 
                value={passwordForm.confirmPassword} 
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} 
              />
            </div>

            <button 
              type="submit" 
              className="w-full py-5 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-[1.5rem] font-bold shadow-xl shadow-black/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4" 
              disabled={savingPassword}
            >
              <KeyRound size={18} /> {savingPassword ? 'Processing...' : 'Apply Security Update'}
            </button>
          </form>
          {statusMessage && (
            <div className="mt-6 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700 text-xs font-medium text-center text-zinc-500">
              {statusMessage}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

const InfoItem = ({ icon, label, value }: { icon: React.ReactNode, label: string, value?: string }) => (
  <div className="flex items-start gap-4">
    <div className="mt-1 text-zinc-400 dark:text-zinc-500">{icon}</div>
    <div>
      <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest leading-none mb-1.5">{label}</p>
      <p className="text-zinc-900 dark:text-zinc-100 font-semibold">{value || '-'}</p>
    </div>
  </div>
);

const DetailCard = ({ title, content }: { title: string, content: string }) => (
  <div className="group p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-700/50 transition-all hover:bg-white dark:hover:bg-zinc-800 hover:shadow-xl hover:shadow-black/5">
    <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">{title}</p>
    <p className="text-zinc-900 dark:text-zinc-100 font-bold text-lg leading-snug">{content}</p>
  </div>
);

const ActionButton = ({ icon, label, desc, onClick }: { icon: React.ReactNode, label: string, desc: string, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="group p-6 text-left rounded-3xl border border-zinc-200/50 dark:border-zinc-800/50 bg-white dark:bg-zinc-900 hover:border-zinc-900 dark:hover:border-white transition-all shadow-sm active:scale-[0.98]"
  >
    <div className="mb-4 p-3 w-fit rounded-2xl bg-zinc-100 dark:bg-zinc-800 transition-colors group-hover:bg-zinc-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black">
      {icon}
    </div>
    <p className="text-sm font-bold text-zinc-900 dark:text-white" style={{ fontFamily: 'Sora' }}>{label}</p>
    <p className="text-xs text-zinc-500 font-medium mt-1">{desc}</p>
  </button>
);

const InputField = ({ label, type, value, onChange }: { label: string, type: string, value: string, onChange: (e: any) => void }) => (
  <div className="space-y-2">
    <label className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1">{label}</label>
    <input
      type={type}
      className="w-full p-4 md:p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/50 outline-none focus:ring-2 focus:ring-zinc-900/5 dark:focus:ring-white/5 transition-all font-medium"
      value={value}
      onChange={onChange}
      required
    />
  </div>
);
