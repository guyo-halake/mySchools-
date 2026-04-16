import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button, Modal } from '../components/UI';
import { Shield, KeyRound, LogOut, MoonStar, Sun, LifeBuoy, FileText, UserCircle2 } from 'lucide-react';

type AssignmentRow = {
  class_id: string | null;
  subject_id: string | null;
};

type SubjectRow = { id: string; name: string };
type ClassRow = { id: string; name: string };
type StreamRow = { id: string; class_teacher_id: string | null; class: { name: string } | null };

export const ProfileSettings: React.FC = () => {
  const { user, logout, isDarkMode, toggleDarkMode } = useAuth();
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
    <div className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="w-20 h-20 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-200">
            <UserCircle2 size={48} />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">Profile and settings</h1>
            <p className="text-sm text-zinc-500">Manage your account, security, and preferences.</p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-zinc-500">Name</p>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{user?.full_name || '-'}</p>
              </div>
              <div>
                <p className="text-zinc-500">Email</p>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{user?.email || '-'}</p>
              </div>
              <div>
                <p className="text-zinc-500">Phone Number</p>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{user?.phone || '-'}</p>
              </div>
              <div>
                <p className="text-zinc-500">Role</p>
                <p className="font-medium text-zinc-900 dark:text-zinc-100">{user?.role || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold">Teaching details</h2>
        {loadingProfileData ? (
          <p className="mt-3 text-sm text-zinc-500">Loading...</p>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-zinc-500">Classes taught</p>
              <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{classNames.length ? classNames.join(', ') : 'No class assigned'}</p>
            </div>
            <div>
              <p className="text-zinc-500">Subjects taught</p>
              <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{subjectNames.length ? subjectNames.join(', ') : 'No subject assigned'}</p>
            </div>
            <div>
              <p className="text-zinc-500">Class teacher</p>
              <p className="mt-1 font-medium text-zinc-900 dark:text-zinc-100">{isClassTeacher ? 'Yes' : 'No'}</p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold">Security and account actions</h2>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Button variant="outline" className="justify-start h-10" onClick={() => setIsPasswordModalOpen(true)}>
            <KeyRound size={15} /> Change Password
          </Button>
          <Button variant="outline" className="justify-start h-10" onClick={toggleDarkMode}>
            {isDarkMode ? <Sun size={15} /> : <MoonStar size={15} />} Theme: {isDarkMode ? 'Dark' : 'Light'}
          </Button>
          <Button variant="danger" className="justify-start h-10" onClick={handleLogout}>
            <LogOut size={15} /> Log Out
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
            <p className="font-medium text-zinc-900 dark:text-zinc-100 inline-flex items-center gap-2"><Shield size={14} /> Security settings</p>
            <p className="mt-1 text-zinc-500">Session controls, account safety checks, and login activity.</p>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
            <p className="font-medium text-zinc-900 dark:text-zinc-100 inline-flex items-center gap-2"><FileText size={14} /> Privacy policy</p>
            <p className="mt-1 text-zinc-500">Read how your data is collected and protected in this system.</p>
          </div>
          <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-3">
            <p className="font-medium text-zinc-900 dark:text-zinc-100 inline-flex items-center gap-2"><LifeBuoy size={14} /> Contact support</p>
            <p className="mt-1 text-zinc-500">Get help for account access, technical issues, and profile updates.</p>
          </div>
        </div>

        {statusMessage && (
          <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300">
            {statusMessage}
          </div>
        )}
      </section>

      <Modal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} title="Change Password">
        <form className="space-y-4" onSubmit={handleChangePassword}>
          <div>
            <label className="block text-sm font-semibold mb-1">Current Password</label>
            <input
              type="password"
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">New Password</label>
            <input
              type="password"
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
              value={passwordForm.newPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Confirm New Password</label>
            <input
              type="password"
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
              value={passwordForm.confirmPassword}
              onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              required
            />
          </div>

          <Button type="submit" className="w-full py-4" disabled={savingPassword}>
            <KeyRound size={15} /> {savingPassword ? 'Saving...' : 'Save Password'}
          </Button>
        </form>
      </Modal>
    </div>
  );
};
