import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Bell, BarChart3, Calendar, CreditCard, FileText, GraduationCap, MessageSquare, ShieldAlert, TrendingUp, UserCircle2, Users, ArrowUpRight, ChevronRight, LayoutDashboard, X, LineChart as LineChartIcon, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell
} from 'recharts';
import { markToGrade, gradeWeight } from '../utils/grading';
import { cn } from '../utils/utils';

const formatMoney = (value: number) => `KES ${Number(value || 0).toLocaleString()}`;
const formatDate = (date?: string | null) => {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

// Setup Recharts specific components if needed, otherwise just proceed

export const ParentStudentDashboard: React.FC<{ user: any }> = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [schoolName, setSchoolName] = useState('School');

  // UI CONTROLS
  const [graphType, setGraphType] = useState<'LINE' | 'BAR'>('LINE');
  const [viewMode, setViewMode] = useState<'PROGRESSION' | 'SUBJECTS'>('PROGRESSION');
  const [selectedSubjectId, setSelectedSubjectId] = useState<'OVERALL' | string>('OVERALL');
  const [showAllStats, setShowAllStats] = useState(false);
  const [showAppointmentsMsg, setShowAppointmentsMsg] = useState(false);
  const [showActivitiesMobile, setShowActivitiesMobile] = useState(false);
  const [showChildModal, setShowChildModal] = useState(false);
  const [selectedProfileStudent, setSelectedProfileStudent] = useState<any>(null);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [appointmentForm, setAppointmentForm] = useState({ teacherId: '', date: '', time: '', reason: '' });

  const selectedStudent = useMemo(() => students[0] || null, [students]);
  const selectedStream = useMemo(() => streams.find((s: any) => s.id === selectedStudent?.stream_id) || null, [streams, selectedStudent?.stream_id]);

  const currentGradeLabel = useMemo(() => {
    if (!results.length) return { grade: '-', mean: 0 };
    const avg = results.reduce((acc: number, row: any) => acc + Number(row.marks || 0), 0) / results.length;
    return { grade: markToGrade(avg), mean: avg.toFixed(1) };
  }, [results]);

  const feeSummary = useMemo(() => {
    const totalDue = fees.reduce((acc: number, row: any) => acc + Number(row.amount_due || 0), 0);
    const totalPaid = fees.reduce((acc: number, row: any) => acc + Number(row.amount_paid || 0), 0);
    const lastPayment = [...fees].filter(f => Number(f.amount_paid) > 0).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0];
    return { totalDue, totalPaid, balance: totalDue - totalPaid, lastPayment };
  }, [fees]);

  // DYNAMIC NOTIFICATION FEED
  const recentActivities = useMemo(() => {
    const activities: any[] = [];
    notifications.slice(0, 5).forEach(n => {
      activities.push({
        id: n.id,
        title: n.title,
        content: n.message,
        date: n.created_at,
        type: n.type?.toUpperCase() || 'INFO',
        is_read: n.is_read
      });
    });
    if (feeSummary.balance > 0 && !notifications.some(n => n.title.includes('FEES'))) {
      activities.push({
        id: 'fees-unpaid-auto',
        title: 'Outstanding Dues',
        content: `Standard balance of ${formatMoney(feeSummary.balance)} detected.`,
        date: new Date().toISOString(),
        type: 'WARNING',
        urgent: true
      });
    }
    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  }, [notifications, feeSummary]);

  // 📊 SMART GRAPH ENGINE (Sequential Terms & Grade Mapping)
  const analyticsData = useMemo(() => {
    if (!results.length) return [];

    const getLevel = (m: number) => {
      if (m >= 80) return 5;
      if (m >= 70) return 4;
      if (m >= 60) return 3;
      if (m >= 50) return 2;
      return 1;
    };

    if (viewMode === 'SUBJECTS') {
      const subjectMap = new Map();
      results.forEach(r => {
        const name = r.subject?.name || 'Unknown';
        if (!subjectMap.has(name)) subjectMap.set(name, []);
        subjectMap.get(name).push(Number(r.marks || 0));
      });

      return Array.from(subjectMap.entries()).map(([name, scores]) => {
        const avg = scores.reduce((a: any, b: any) => a + b, 0) / scores.length;
        const level = getLevel(avg);
        return {
          name,
          grade: level,
          color: level >= 4 ? '#10b981' : level >= 2 ? '#f59e0b' : '#ef4444'
        };
      });
    }

    // PERFORMANCE VIEW (Group by Term -> Exam)
    const termGrouped = results.reduce((acc: any, r) => {
      const termName = r.exam?.term?.name || 'Unknown';
      const examName = r.exam?.name || 'Exam';
      const key = `${termName}-${examName}`;
      if (!acc[key]) {
        acc[key] = {
          term: termName,
          exam: examName,
          date: new Date(r.exam?.date || 0),
          scores: []
        };
      }
      acc[key].scores.push(Number(r.marks || 0));
      return acc;
    }, {});

    const timeline = Object.values(termGrouped).sort((a: any, b: any) => a.date.getTime() - b.date.getTime());

    return timeline.map((group: any) => {
      const avg = group.scores.length ? group.scores.reduce((a: any, b: any) => a + b, 0) / group.scores.length : 0;
      const level = getLevel(avg);
      const examShort = group.exam.length > 8 ? group.exam.substring(0, 5) + '..' : group.exam;

      return {
        name: examShort,
        termLabel: group.term,
        isFirstOfTerm: true,
        grade: level,
        marks: avg.toFixed(1),
        gradeLabel: markToGrade(avg),
        color: avg > 0 ? (level >= 4 ? '#10b981' : level >= 2 ? '#f59e0b' : '#ef4444') : '#f4f4f5'
      };
    });
  }, [results, viewMode]);

  const strugglingSubjects = useMemo(() => {
    const map = new Map();
    results.forEach(r => {
      const n = r.subject?.name || 'Unknown';
      if (!map.has(n)) map.set(n, []);
      map.get(n).push(Number(r.marks || 0));
    });
    return Array.from(map.entries())
      .map(([name, scores]) => ({ name, avg: scores.reduce((a: any, b: any) => a + b, 0) / scores.length }))
      .filter(s => s.avg < 60)
      .map(s => ({ ...s, grade: s.avg >= 50 ? 'D' : 'E' }));
  }, [results]);

  const loadDashboard = async () => {
    if (!user?.school_id) return;
    try {
      setLoading(true);
      const [visible, schoolEvents, schoolAnnouncements, school, schoolStreams, userNotifs, schoolTeachers] = await Promise.all([
        user.role === 'PARENT'
          ? api.getStudentsByParentId(user.school_id, user.id)
          : api.getStudentByProfileId(user.school_id, user.id).then(s => s ? [s] : []),
        api.getEvents(user.school_id),
        api.getAnnouncements(user.school_id),
        api.getSchool(user.school_id),
        api.getStreams(user.school_id),
        api.getNotifications(user.id, user.school_id),
        api.getTeachers(user.school_id)
      ]);

      setStudents(visible || []);
      setNotifications(userNotifs || []);
      setTeachers(schoolTeachers || []);

      const now = new Date();
      const upcoming = (schoolEvents || []).filter(e => new Date(e.date) >= now);
      setEvents(upcoming.length > 0 ? upcoming : (schoolEvents || []));
      setAnnouncements(schoolAnnouncements || []);
      setSchoolName(school?.name || 'School');
      setStreams(schoolStreams || []);

      if (visible && visible[0]) {
        const student = visible[0];
        const [res, fee] = await Promise.all([
          api.getStudentResultsAll(student.id),
          api.getFees(user.school_id).then(all => all.filter((f: any) => f.student_id === student.id))
        ]);
        setResults(res || []);
        setFees(fee || []);
      }
    } catch (error) {
      console.error('Error loading parent dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!appointmentForm.teacherId || !appointmentForm.date) return;
    try {
      await api.bookAppointment({
        school_id: user.school_id,
        parent_id: user.id,
        teacher_id: appointmentForm.teacherId,
        student_id: selectedStudent?.id,
        appointment_date: appointmentForm.date,
        appointment_time: appointmentForm.time,
        reason: appointmentForm.reason
      });
      setShowAppointmentsMsg(false);
      setAppointmentForm({ teacherId: '', date: '', time: '', reason: '' });
      // Optional: Add success toast or notification
    } catch (error) {
      console.error('Failed to book appointment:', error);
    }
  };

  useEffect(() => { 
    loadDashboard(); 

    // Academic Broadcast Watchdog: Polling every 15s
    const syncInterval = setInterval(async () => {
       if (!user?.id) return;
       const notifs = await api.getNotifications(user.id, user.school_id);
       setNotifications(prev => {
          const fresh = notifs.filter(n => !n.is_read && !prev.find(p => p.id === n.id));
          fresh.forEach(n => {
             toast(n.message, {
                icon: n.type === 'EVENT' ? '📅' : '📢',
                duration: 7000,
                position: 'top-right',
                style: {
                   background: '#18181b',
                   color: '#fff',
                   fontSize: '11px',
                   fontFamily: 'Sora, sans-serif',
                   fontWeight: '900',
                   borderRadius: '20px',
                   border: '1px solid #27272a',
                   padding: '18px',
                   boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                   textTransform: 'uppercase',
                   letterSpacing: '0.05em'
                }
             });
          });
          return notifs;
       });
    }, 15000);

    return () => clearInterval(syncInterval);
  }, [user?.id, user?.school_id]);

  if (loading) return (
    <div className="max-w-[1400px] mx-auto p-4 sm:p-6 space-y-8">
      <div className="flex justify-between items-start">
        <div className="space-y-3">
          <div className="h-8 w-48 bg-zinc-100 dark:bg-zinc-800 rounded-lg animate-pulse" />
          <div className="h-4 w-32 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-10 w-24 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl animate-pulse hidden sm:block" />)}
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-28 sm:h-32 bg-zinc-50 dark:bg-zinc-800 rounded-2xl animate-pulse" />)}
      </div>
      <div className="h-[400px] bg-zinc-50 dark:bg-zinc-800 rounded-3xl animate-pulse" />
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto p-4 sm:p-6 pb-24 space-y-6 sm:space-y-8 animate-in fade-in duration-500 relative min-h-screen">

      {/* MODALS */}
      {showAppointmentsMsg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-white font-sora">Book Appointment</h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Official Engagement Request</p>
              </div>
              <button onClick={() => setShowAppointmentsMsg(false)} className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors"><X size={18} /></button>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Select Professional</label>
                <select
                  value={appointmentForm.teacherId}
                  onChange={(e) => setAppointmentForm(p => ({ ...p, teacherId: e.target.value }))}
                  className="w-full h-14 bg-zinc-50 dark:bg-zinc-900 border-none rounded-2xl px-6 text-sm font-bold text-zinc-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none"
                >
                  <option value="">Select Class Teacher or Administrator</option>
                  {teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name} — {t.title || 'Teacher'}</option>
                  ))}
                </select>
              </div>

              <textarea
                value={appointmentForm.reason}
                onChange={(e) => setAppointmentForm(p => ({ ...p, reason: e.target.value }))}
                placeholder="Briefly describe the matter..."
                className="w-full h-32 bg-zinc-50 dark:bg-zinc-900 border-none rounded-3xl p-6 text-sm font-bold resize-none"
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Preferred Date</label>
                  <input
                    type="date"
                    value={appointmentForm.date}
                    onChange={(e) => setAppointmentForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full h-14 bg-zinc-50 dark:bg-zinc-900 border-none rounded-2xl px-6 text-sm font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Preferred Time</label>
                  <input
                    type="time"
                    value={appointmentForm.time}
                    onChange={(e) => setAppointmentForm(p => ({ ...p, time: e.target.value }))}
                    className="w-full h-14 bg-zinc-50 dark:bg-zinc-900 border-none rounded-2xl px-6 text-sm font-bold"
                  />
                </div>
              </div>

              <button
                onClick={handleBookAppointment}
                className="w-full h-16 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-3xl font-black uppercase text-[11px] tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-4"
              >
                Confirm Appointment Request
              </button>
            </div>
          </div>
        </div>
      )}

      {showChildModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-lg font-black text-zinc-900 dark:text-white font-sora">Institutional Records</h3>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Dependent Profiles</p>
              </div>
              <button onClick={() => setShowChildModal(false)} className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors"><X size={18} /></button>
            </div>

            <div className="space-y-3">
              {students.map(s => (
                <div
                  key={s.id}
                  onClick={() => {
                    setSelectedProfileStudent(s);
                    // Switch actual context if needed, but the user asked for a profile popup on click in the switcher
                  }}
                  className={cn("flex items-center justify-between p-4 rounded-3xl border transition-all cursor-pointer group",
                    selectedStudent?.id === s.id ? "bg-emerald-50/50 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-800" : "bg-zinc-50/50 border-zinc-100 dark:bg-zinc-900/50 dark:border-zinc-800 hover:border-emerald-500/30")}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center overflow-hidden border-2 border-white dark:border-zinc-800 shadow-sm">
                      {s.profile?.avatar_url ? <img src={s.profile.avatar_url} className="w-full h-full object-cover" /> : <UserCircle2 size={24} className="text-zinc-400" />}
                    </div>
                    <div>
                      <p className="text-[12px] font-black text-zinc-900 dark:text-white uppercase tracking-tight">{s.profile?.full_name}</p>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">Adm: {s.adm_no || 'TBD'}</p>
                    </div>
                  </div>
                  {selectedStudent?.id === s.id && <div className="px-3 py-1 bg-emerald-500 text-white rounded-full text-[8px] font-black uppercase tracking-widest">Active</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedProfileStudent && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] p-10 max-w-lg w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center overflow-hidden border border-zinc-100 dark:border-zinc-800">
                  {selectedProfileStudent.profile?.avatar_url ? <img src={selectedProfileStudent.profile.avatar_url} className="w-full h-full object-cover" /> : <UserCircle2 size={32} className="text-zinc-300" />}
                </div>
                <div>
                  <h2 className="text-xl font-black text-zinc-900 dark:text-white font-sora uppercase">{selectedProfileStudent.profile?.full_name}</h2>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{selectedProfileStudent.stream?.name || 'Assigned Class'}</p>
                </div>
              </div>
              <button onClick={() => setSelectedProfileStudent(null)} className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors"><X size={18} /></button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                <div className="flex justify-between items-center py-3 border-b border-zinc-50 dark:border-zinc-900">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Class Teacher</span>
                  <span className="text-[11px] font-bold text-zinc-900 dark:text-white">{selectedProfileStudent.stream?.teacher?.full_name || 'Not Available'}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-zinc-50 dark:border-zinc-900">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Admission Number</span>
                  <span className="text-[11px] font-bold text-zinc-900 dark:text-white">#{selectedProfileStudent.adm_no || 'TBD'}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-zinc-50 dark:border-zinc-900">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Contact Number</span>
                  <span className="text-[11px] font-bold text-zinc-900 dark:text-white">{selectedProfileStudent.profile?.phone || 'None Registered'}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-zinc-50 dark:border-zinc-900">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Mean Grade</span>
                  <span className="text-[11px] font-black text-emerald-600">{currentGradeLabel.grade} ({currentGradeLabel.mean}%)</span>
                </div>
              </div>

              <div className="pt-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-3">Subjects Done</span>
                <div className="flex flex-wrap gap-2 text-[10px] font-bold text-zinc-500">
                  {(selectedProfileStudent.subjects || ['English', 'Mathematics', 'Science', 'Kiswahili', 'History']).join(', ')}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setStudents([selectedProfileStudent, ...students.filter(s => s.id !== selectedProfileStudent.id)]);
                setSelectedProfileStudent(null);
                setShowChildModal(false);
              }}
              className="w-full h-14 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:scale-[1.02] active:scale-95 transition-all mt-10"
            >
              Switch to this Child
            </button>
          </div>
        </div>
      )}

      {/* 1. Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 sm:gap-12">
        <div className="space-y-0.5">
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-white tracking-tight font-sora">Welcome, {user?.full_name?.split(' ')[0]}</h1>
          <p className="text-[14px] text-emerald-600 font-medium tracking-tight font-sora uppercase tracking-[0.1em]">{schoolName}</p>
          <div className="flex items-center gap-2 pt-2 font-black uppercase text-[10px] tracking-[0.2em] font-inter">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-zinc-400">{selectedStudent?.profile?.full_name}</span>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-10 pb-4 sm:pb-0 overflow-x-auto no-scrollbar">
          <NavButton onClick={() => setShowAppointmentsMsg(true)} label="Appointments" icon={<MessageSquare size={18} />} />
          <Link to="/results"><NavButton label="Results" icon={<FileText size={18} />} /></Link>
          <Link to="/fees"><NavButton label="Fees" icon={<CreditCard size={18} />} /></Link>
          <NavButton onClick={() => setShowChildModal(true)} label="My Child" icon={<Users size={18} />} />
        </div>
      </header>

      {/* 2. Stats */}
      <section className="space-y-3">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Outstanding" value={formatMoney(feeSummary.balance)} sub={feeSummary.lastPayment ? `Recent: ${formatMoney(feeSummary.lastPayment.amount_paid)}` : "No history"} trend={feeSummary.balance > 0 ? "danger" : "success"} icon={<CreditCard size={14} />} />
          <StatCard label="Current Grade" value={`${currentGradeLabel.mean}% (${currentGradeLabel.grade})`} sub="Class Position: - " trend="success" icon={<GraduationCap size={14} />} />
          <StatCard label="Attendance" value="94%" sub="Term Goal: 95%" trend="success" icon={<Users size={14} />} hideMobile={!showAllStats} />
          <StatCard label="Next Event" value={events[0]?.title || "TBD"} sub={events[0]?.date ? formatDate(events[0].date) : "—"} trend="neutral" icon={<Calendar size={14} />} hideMobile={!showAllStats} />
        </div>
        <button onClick={() => setShowAllStats(!showAllStats)} className="lg:hidden w-full py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-400">
          {showAllStats ? "Hide Detail" : "View Analytics"}
        </button>
      </section>

      {/* 3. Main Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <div className="bg-white dark:bg-zinc-950 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden mb-8">
            <div className="p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-zinc-50 dark:border-zinc-900">
              <div>
                <h2 className="text-[12px] font-black uppercase tracking-[0.4em] text-zinc-900 dark:text-white mb-1.5 font-sora">Academic Performance</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest uppercase">Institutional Progress Tracking</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex bg-zinc-50 dark:bg-zinc-900/50 p-1 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <button
                    onClick={() => setViewMode('PROGRESSION')}
                    className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                      viewMode === 'PROGRESSION' ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-400 hover:text-zinc-600")}
                  >
                    Progression
                  </button>
                  <button
                    onClick={() => setViewMode('SUBJECTS')}
                    className={cn("px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                      viewMode === 'SUBJECTS' ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-400 hover:text-zinc-600")}
                  >
                    By Subjects
                  </button>
                </div>

                <div className="inline-flex bg-zinc-50 dark:bg-zinc-900/50 p-1 rounded-xl border border-zinc-100 dark:border-zinc-800">
                  <button
                    onClick={() => setGraphType('LINE')}
                    className={cn("p-2 rounded-lg transition-all",
                      graphType === 'LINE' ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-400")}
                  >
                    <LineChartIcon size={14} />
                  </button>
                  <button
                    onClick={() => setGraphType('BAR')}
                    className={cn("p-2 rounded-lg transition-all",
                      graphType === 'BAR' ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-400")}
                  >
                    <BarChart3 size={14} />
                  </button>
                </div>
              </div>
            </div>

            <div className="p-0 sm:p-6 pb-2">
              <div className="h-[450px] sm:h-[550px] w-full mt-4">
                {results.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    {viewMode === 'PROGRESSION' && graphType === 'LINE' ? (
                      <LineChart data={analyticsData} margin={{ top: 20, right: 30, left: 40, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          interval={0}
                          padding={{ left: 50, right: 50 }}
                          tick={(props: any) => {
                            const { x, y, index } = props;
                            const data = analyticsData[index];
                            if (!data) return null;
                            return (
                              <g transform={`translate(${x},${y})`}>
                                <text x={0} y={0} dy={16} textAnchor="middle" fill="#18181b" fontSize={11} fontWeight={900}>{data.name}</text>
                                {data.isFirstOfTerm && (
                                  <text x={0} y={20} dy={22} textAnchor="middle" fill="#a1a1aa" fontSize={9} fontWeight={900} className="uppercase tracking-[0.2em]">{data.termLabel}</text>
                                )}
                              </g>
                            );
                          }}
                        />
                        <YAxis
                          domain={[0.5, 5.5]}
                          ticks={[1, 2, 3, 4, 5]}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(val) => ({ 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E' }[val] || '')}
                          tick={{ fontSize: 13, fontWeight: 900, fill: '#18181b' }}
                          label={{ value: 'GRADE', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fontWeight: 900, fill: '#a1a1aa' }}
                        />
                        <Tooltip
                          cursor={{ stroke: '#f4f4f5', strokeWidth: 2 }}
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              const prevData = data.prevIndex >= 0 ? analyticsData[data.prevIndex] : null;
                              const currentMarks = Number(data.marks);
                              const prevMarks = prevData ? Number(prevData.marks) : -1;
                              const diff = prevMarks >= 0 ? currentMarks - prevMarks : 0;

                              return (
                                <div className="bg-white border border-zinc-100 shadow-2xl rounded-3xl p-5 min-w-[180px] animate-in zoom-in-95 duration-200">
                                  <div className="flex items-center justify-between mb-4">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 font-sora">{data.termLabel} • {data.name}</span>
                                    {prevMarks >= 0 && (
                                      <div className={cn("flex items-center group", diff >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                        {diff >= 0 ? <TrendingUp size={12} /> : <ShieldAlert size={12} />}
                                        <span className="text-[10px] font-black ml-1">{Math.abs(diff).toFixed(1)}%</span>
                                      </div>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex items-end gap-2">
                                      <span className="text-4xl font-black text-zinc-900 leading-none font-sora">{data.gradeLabel}</span>
                                      <span className="text-sm font-bold text-zinc-400 mb-1">{data.marks}%</span>
                                    </div>
                                    <div className="pt-4 border-t border-zinc-50 mt-4">
                                      <p className="text-[8px] font-black text-zinc-300 uppercase tracking-widest mb-1">Historical Comparison</p>
                                      <p className="text-[10px] font-bold text-zinc-500">Previous Term: <span className="text-zinc-900">{prevData ? `${prevData.gradeLabel} (${prevData.marks}%)` : 'No Data'}</span></p>
                                    </div>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Line
                          type="monotone"
                          dataKey="grade"
                          stroke="#18181b"
                          strokeWidth={2.5}
                          connectNulls={true}
                          dot={(props: any) => {
                            const { cx, cy, payload } = props;
                            return <rect x={cx - 5} y={cy - 5} width={10} height={10} fill={payload.color} stroke="#fff" strokeWidth={2} />;
                          }}
                          activeDot={{ r: 8, strokeWidth: 0 }}
                          animationDuration={1500}
                        />
                      </LineChart>
                    ) : viewMode === 'SUBJECTS' || graphType === 'BAR' ? (
                      <BarChart data={analyticsData} margin={{ top: 20, right: 30, left: 40, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          tick={{ fontSize: 10, fontWeight: 900, fill: '#71717a' }}
                          label={{ value: viewMode === 'SUBJECTS' ? 'SUBJECTS' : 'EXAMS', position: 'insideBottom', offset: -10, fontSize: 10, fontWeight: 900, fill: '#a1a1aa' }}
                        />
                        <YAxis
                          domain={[0.5, 5.5]}
                          ticks={[1, 2, 3, 4, 5]}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(val) => ({ 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'E' }[val] || '')}
                          tick={{ fontSize: 13, fontWeight: 900, fill: '#18181b' }}
                          label={{ value: 'GRADE', angle: -90, position: 'insideLeft', offset: 10, fontSize: 10, fontWeight: 900, fill: '#a1a1aa' }}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#18181b', borderRadius: '12px', border: 'none', color: '#fff', padding: '12px' }}
                          itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                          labelStyle={{ opacity: 0.5, fontSize: '9px', marginBottom: '4px', textTransform: 'uppercase', color: '#fff' }}
                          cursor={{ stroke: '#f4f4f5', strokeWidth: 1 }}
                        />
                        <Bar dataKey="grade" radius={[8, 8, 8, 8]} barSize={viewMode === 'SUBJECTS' ? 24 : 32}>
                          {analyticsData.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                          ))}
                        </Bar>
                      </BarChart>
                    ) : null}
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-300 border border-dashed border-zinc-100 dark:border-zinc-800 rounded-2xl">
                    <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Database Empty</p>
                  </div>
                )}
              </div>

              {strugglingSubjects.length > 0 && (
                <div className="mt-8 p-6 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-center gap-8">
                  <div className="bg-rose-50 dark:bg-rose-900/20 px-4 py-2 rounded-xl text-[10px] font-black text-rose-600 uppercase tracking-widest whitespace-nowrap">Needs Improvement</div>
                  <div className="flex flex-wrap gap-6 items-center">
                    {strugglingSubjects.map(s => (
                      <div key={s.name} className="flex items-center gap-3">
                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                        <span className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-tight">{s.name}</span>
                        <span className="text-[9px] font-bold text-rose-500">Grade {s.grade}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RECENT ACTIVITIES - DESKTOP */}
        <div className="hidden lg:block lg:col-span-4">
          <ActivityFeed activities={recentActivities} />
        </div>
      </div>

      {/* MOBILE RECENT ACTIVITIES DRAWER */}
      {showActivitiesMobile && (
        <div className="fixed inset-0 z-[70] lg:hidden flex flex-col items-center justify-end animate-in fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowActivitiesMobile(false)} />
          <div className="relative w-full max-h-[80vh] bg-zinc-900 rounded-t-[32px] p-6 overflow-y-auto animate-in slide-in-from-bottom duration-500 overflow-hidden">
            <div className="w-12 h-1.5 bg-zinc-800 rounded-full mx-auto mb-8" />
            <ActivityFeed activities={recentActivities} isDrawer />
            <button onClick={() => setShowActivitiesMobile(false)} className="mt-8 w-full py-3 bg-white text-zinc-900 rounded-2xl font-black uppercase text-[10px] tracking-widest">Close Activities</button>
          </div>
        </div>
      )}

    </div>
  );
};

const ActivityFeed: React.FC<{ activities: any[]; isDrawer?: boolean }> = ({ activities, isDrawer }) => (
  <section className={cn("bg-zinc-50 dark:bg-zinc-900/50 rounded-3xl p-6 h-full border border-zinc-100 dark:border-zinc-800 animate-in fade-in slide-in-from-right-4 duration-1000", isDrawer && "bg-white dark:bg-zinc-950 border-0 p-0")}>
    <div className="flex items-center justify-between mb-8 px-1">
      <h3 className="text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3 text-zinc-900 dark:text-white font-sora">
        <Bell size={14} className="text-orange-500" /> Notifications
      </h3>
      <span className="text-[9px] font-bold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">{activities.length} New</span>
    </div>

    <div className="space-y-3">
      {activities.length > 0 ? activities.map(item => (
        <div key={item.id} className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 group hover:border-orange-500/30 transition-all cursor-pointer relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md",
              item.type === 'ERROR' || item.urgent ? "bg-rose-50 text-rose-600" :
                item.type === 'WARNING' ? "bg-amber-50 text-amber-600" :
                  item.type === 'SUCCESS' ? "bg-emerald-50 text-emerald-600" :
                    "bg-zinc-100 text-zinc-500")}>
              {item.type}
            </span>
            <p className="text-[8px] font-bold text-zinc-400 uppercase">{formatDate(item.date)}</p>
          </div>
          <h4 className="text-[11px] font-black text-zinc-900 dark:text-white uppercase leading-tight tracking-tight mb-1">{item.title}</h4>
          <p className="text-[10px] text-zinc-500 leading-relaxed font-medium line-clamp-2">{item.content}</p>
          {!item.is_read && item.id.length > 15 && <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-orange-500 rounded-full" />}
        </div>
      )) : (
        <div className="py-20 flex flex-col items-center justify-center opacity-20 transform scale-75">
          <Bell size={40} className="mb-4" />
          <p className="text-[10px] font-black uppercase tracking-widest">Inbox Zero</p>
        </div>
      )}
    </div>
  </section>
);

const StatCard: React.FC<{ label: string; value: string; sub: string; trend: 'success' | 'warning' | 'danger' | 'neutral'; icon: React.ReactNode; hideMobile?: boolean }> = ({ label, value, sub, trend, icon, hideMobile }) => (
  <div className={cn("rounded-[2rem] border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm transition-all hover:shadow-xl", hideMobile ? "hidden lg:block" : "block")}>
    <div className="flex items-center justify-between mb-6">
      <div className={cn("p-2 rounded-xl", trend === 'success' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/10 dark:text-emerald-400" : trend === 'danger' ? "bg-rose-50 text-rose-700 dark:bg-rose-900/10 dark:text-rose-400" : "bg-zinc-50 text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400")}>{icon}</div>
      <div className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-[0.1em]", trend === 'success' ? "bg-emerald-500/10 text-emerald-600" : trend === 'danger' ? "bg-rose-500/10 text-rose-600" : "bg-zinc-500/10 text-zinc-500")}>{trend}</div>
    </div>
    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-1 font-sora">{label}</p>
    <p className="text-xl font-black text-zinc-900 dark:text-zinc-100 leading-none">{value}</p>
    <p className="mt-3 text-[9px] font-bold uppercase text-zinc-500 truncate bg-zinc-50 dark:bg-zinc-800/50 py-1.5 px-2 rounded-lg border border-zinc-50 dark:border-zinc-800/50">{sub || "No records"}</p>
  </div>
);

const NavButton: React.FC<{ label: string; icon: React.ReactNode; onClick?: () => void }> = ({ label, icon, onClick }) => (
  <button
    onClick={onClick}
    className="flex flex-col items-center gap-2 min-w-[70px] group active:scale-95 transition-transform"
  >
    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[1.25rem] bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 group-hover:text-emerald-500 group-hover:bg-emerald-500/5 transition-all shadow-sm group-hover:shadow-emerald-500/10 border border-transparent group-hover:border-emerald-500/10">
      {icon}
    </div>
    <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.1em] text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors font-sora">{label}</span>
  </button>
);
