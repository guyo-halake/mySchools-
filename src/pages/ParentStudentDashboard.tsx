import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, BarChart3, Calendar, CreditCard, FileText, GraduationCap, MessageSquare, ShieldAlert, TrendingUp, UserCircle2, Users, ArrowUpRight, ChevronRight, LayoutDashboard, X, LineChart as LineChartIcon, Activity } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

import { markToGrade, gradeWeight } from '../utils/grading';
import { cn } from '../utils/utils';

const formatMoney = (value: number) => `KES ${Number(value || 0).toLocaleString()}`;
const formatDate = (date?: string | null) => {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend, Filler);

export const ParentStudentDashboard: React.FC<{ user: any }> = ({ user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [schoolName, setSchoolName] = useState('School');

  // UI CONTROLS
  const [graphType, setGraphType] = useState<'LINE' | 'BAR'>('LINE');
  const [timelineView, setTimelineView] = useState<'MULTI_YEAR' | 'YEAR' | 'TERM 1' | 'TERM 2' | 'TERM 3'>('YEAR');
  const [selectedSubjectId, setSelectedSubjectId] = useState<'OVERALL' | string>('OVERALL');
  const [showAllStats, setShowAllStats] = useState(false);
  const [showAppointmentsMsg, setShowAppointmentsMsg] = useState(false);
  const [showActivitiesMobile, setShowActivitiesMobile] = useState(false);

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

  // DYNAMIC ACTIVITY FEED
  const recentActivities = useMemo(() => {
    const activities: any[] = [];

    // Results Activities
    results.slice(0, 3).forEach(r => {
      activities.push({
        id: `res-${r.id}`,
        title: `RESULTS PUBLISHED: ${r.subject?.name}`,
        content: `Score: ${r.marks}% (${r.grade || markToGrade(r.marks)}) for ${r.exam?.name}`,
        date: r.created_at,
        type: 'RESULTS'
      });
    });

    // Fee Activities
    if (feeSummary.balance > 0) {
      activities.push({
        id: 'fees-unpaid',
        title: 'UNPAID FEES BALANCE',
        content: `Outstanding balance of ${formatMoney(feeSummary.balance)}. Please clear to avoid inconvenience.`,
        date: new Date().toISOString(),
        type: 'FEES',
        urgent: true
      });
    }
    if (feeSummary.lastPayment) {
      activities.push({
        id: `fee-pay-${feeSummary.lastPayment.id}`,
        title: 'PAYMENT RECEIVED',
        content: `Receipt of ${formatMoney(feeSummary.lastPayment.amount_paid)} processed successfully on ${formatDate(feeSummary.lastPayment.created_at)}.`,
        date: feeSummary.lastPayment.created_at,
        type: 'FEES'
      });
    }

    // School Events/Anns
    events.slice(0, 2).forEach(e => {
      activities.push({ id: `ev-${e.id}`, title: e.title, content: e.description, date: e.date, type: 'EVENT' });
    });
    announcements.slice(0, 2).forEach(a => {
      activities.push({ id: `ann-${a.id}`, title: a.title, content: a.content, date: a.created_at, type: 'ANNOUNCEMENT' });
    });

    return activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);
  }, [results, fees, events, announcements, feeSummary]);

  // GRAPH ENGINE
  const analyticsData = useMemo(() => {
    if (!results.length) return { labels: [], datasets: [] };
    let labels: string[] = [];
    let processedData: number[] = [];
    const filteredResults = selectedSubjectId === 'OVERALL' ? results : results.filter(r => r.subject_id === selectedSubjectId);

    if (timelineView === 'YEAR') {
      labels = ['Term 1', 'Term 2', 'Term 3'];
      processedData = labels.map((termName, idx) => {
        const matches = filteredResults.filter(r => {
          const rTerm = (r.exam?.term?.name || '').toUpperCase();
          const num = (idx + 1).toString();
          const words = ['FIRST', 'SECOND', 'THIRD'];
          return rTerm.includes(num) || rTerm.includes(termName.toUpperCase()) || rTerm.includes(words[idx]);
        });
        if (!matches.length) return 0;
        return matches.reduce((acc, r) => acc + Number(r.marks || 0), 0) / matches.length;
      });
    } else if (timelineView === 'MULTI_YEAR') {
      const yearTerms = [...new Set(results.map(r => `${r.exam?.term?.year || '2026'} ${r.exam?.term?.name || 'T1'}`))].sort();
      labels = yearTerms;
      processedData = labels.map(yt => {
        const matches = filteredResults.filter(r => `${r.exam?.term?.year || '2026'} ${r.exam?.term?.name || 'T1'}` === yt);
        if (!matches.length) return 0;
        return matches.reduce((acc, r) => acc + Number(r.marks || 0), 0) / matches.length;
      });
    } else {
      labels = ['Opener', 'Mid', 'End'];
      processedData = labels.map(examKey => {
        const matches = filteredResults.filter(r => {
          const rTerm = (r.exam?.term?.name || '').toUpperCase();
          const rExamName = (r.exam?.name || '').toUpperCase();
          const rExamType = (r.exam?.type || '').toUpperCase();
          const termNum = timelineView.slice(-1);
          const isTerm = rTerm.includes(termNum) || rTerm.includes(timelineView.toUpperCase());
          if (!isTerm) return false;
          const query = examKey.toUpperCase();
          const isOpener = query === 'OPENER' && (rExamName.includes('OPENER') || rExamName.includes('START') || rExamType.includes('OPENER'));
          const isMid = query === 'MID' && (rExamName.includes('MID') || rExamType.includes('MID'));
          const isEnd = query === 'END' && (rExamName.includes('END') || rExamName.includes('FINAL') || rExamType.includes('END'));
          return isOpener || isMid || isEnd;
        });
        if (!matches.length) return 0;
        return matches.reduce((acc, r) => acc + Number(r.marks || 0), 0) / matches.length;
      });
    }

    const subName = selectedSubjectId === 'OVERALL' ? 'Overall Average' : results.find(r => r.subject_id === selectedSubjectId)?.subject?.name || 'Subject';

    return {
      labels,
      datasets: [{
        label: subName,
        data: processedData,
        borderColor: '#10b981',
        backgroundColor: graphType === 'BAR' ? processedData.map(v => v >= 70 ? '#10b981' : v >= 50 ? '#3b82f6' : '#ef4444') : '#10b98122',
        fill: graphType === 'LINE',
        borderWidth: 2,
        tension: 0.4,
        pointRadius: processedData.map(v => v > 0 ? 5 : 0),
        pointBackgroundColor: '#10b981',
        borderRadius: graphType === 'BAR' ? 6 : 0,
        barThickness: processedData.length > 5 ? 18 : 30,
        spanGaps: true
      }]
    };
  }, [results, timelineView, selectedSubjectId, graphType]);

  const loadDashboard = async () => {
    if (!user?.school_id) return;
    try {
      const { data: profile } = await supabase.from('profiles').select('school_id').eq('id', user.id).single();
      const schoolId = profile?.school_id || user.school_id;

      const [allStudents, schoolEvents, schoolAnnouncements, school, schoolStreams] = await Promise.all([
        api.getStudents(schoolId),
        api.getEvents(schoolId),
        api.getAnnouncements(schoolId),
        api.getSchool(schoolId),
        api.getStreams(schoolId)
      ]);

      const visible = user.role === 'PARENT' ? allStudents.filter((s: any) => s.parent_id === user.id) : allStudents.filter((s: any) => s.id === user.id);
      setStudents(visible);
      setEvents(schoolEvents);
      setAnnouncements(schoolAnnouncements);
      setSchoolName(school?.name || 'School');
      setStreams(schoolStreams);

      if (visible[0]) {
        const student = visible[0];
        const [res, fee] = await Promise.all([
          api.getResults(schoolId).then(all => all.filter((r: any) => r.student_id === student.id)),
          api.getFees(schoolId).then(all => all.filter((f: any) => f.student_id === student.id))
        ]);
        setResults(res); setFees(fee);
      }
    } catch (err) { }
    finally { setLoading(false); }
  };

  useEffect(() => { loadDashboard(); }, [user?.id]);

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

      {showAppointmentsMsg && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 max-w-sm w-full shadow-2xl scale-in duration-300">
            <div className="flex justify-between items-center mb-6">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600"><ShieldAlert size={20} /></div>
              <button onClick={() => setShowAppointmentsMsg(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"><X size={18} /></button>
            </div>
            <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight mb-2">Notice</h3>
            <p className="text-sm text-zinc-500 leading-relaxed">Appointments are currently unavailable. Please contact the teacher directly.</p>
          </div>
        </div>
      )}

      {/* 1. Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-0.5">
          <h1 className="text-xl sm:text-2xl font-black text-zinc-900 dark:text-white tracking-tight font-sora">Welcome, {user?.full_name?.split(' ')[0]}</h1>
          <p className="text-[13px] sm:text-[14px] text-emerald-600 font-medium tracking-tight font-sora">{schoolName}</p>
          <div className="flex items-center gap-2 pt-1 font-black uppercase text-[9px] tracking-[0.2em] font-inter">
            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-zinc-400">{selectedStudent?.profile?.full_name}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-8">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <HeaderAction onClick={() => setShowAppointmentsMsg(true)} label="Appointments" icon={<MessageSquare size={14} />} />
            <Link to="/results"><HeaderAction label="Results" icon={<FileText size={14} />} /></Link>
            <Link to="/fees"><HeaderAction label="Fees" icon={<CreditCard size={14} />} /></Link>
            <HeaderAction onClick={() => setShowActivitiesMobile(true)} label="Recent Activity" icon={<Activity size={14} />} />
            <HeaderAction onClick={() => students.length > 1 && setStudents([...students.slice(1), students[0]])} label="My Child" icon={<Users size={14} />} />
          </div>
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
          <section className="bg-white dark:bg-zinc-950 rounded-2xl sm:rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-[10px] font-black text-zinc-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2 font-sora">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Academic Performance
              </h2>
              <div className="flex items-center gap-2">
                <div className="flex bg-zinc-50 dark:bg-zinc-900 p-0.5 rounded-lg border border-zinc-100 dark:border-zinc-800">
                  <GraphToggle active={graphType === 'LINE'} onClick={() => setGraphType('LINE')} label="Line" />
                  <GraphToggle active={graphType === 'BAR'} onClick={() => setGraphType('BAR')} label="Bar" />
                </div>
                <select value={timelineView} onChange={e => setTimelineView(e.target.value as any)} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg px-2 py-1 text-[9px] font-black uppercase outline-none cursor-pointer">
                  <option value="YEAR">Timeline</option>
                  <option value="TERM 1">Term 1</option>
                  <option value="TERM 2">Term 2</option>
                  <option value="TERM 3">Term 3</option>
                  <option value="MULTI_YEAR">History</option>
                </select>
                <select value={selectedSubjectId} onChange={e => setSelectedSubjectId(e.target.value)} className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-lg px-2 py-1 text-[9px] font-black uppercase outline-none cursor-pointer">
                  <option value="OVERALL">Mean</option>
                  {[...new Map(results.map(r => [r.subject_id, r.subject?.name])).entries()].map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="p-4 sm:p-6 h-[280px] sm:h-[380px]">
              {results.length > 0 ? (
                graphType === 'LINE' ? <Line data={analyticsData} options={graphOptions as any} /> : <Bar data={analyticsData} options={graphOptions as any} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-300 border border-dashed border-zinc-100 dark:border-zinc-800 rounded-2xl font-inter">
                  <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Loading records...</p>
                </div>
              )}
            </div>
          </section>
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
  <section className={cn("bg-zinc-900 rounded-3xl p-6 text-white h-full", !isDrawer && "shadow-xl shadow-zinc-900/10")}>
    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2.5 mb-8 font-sora">
      <Activity size={14} className="text-emerald-400" /> Recent Updates
    </h3>
    <div className="space-y-6">
      {activities.length > 0 ? activities.map(item => (
        <div key={item.id} className={cn("pb-5 border-b border-white/5 last:border-0 last:pb-0 group")}>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[7.5px] font-black text-emerald-500 uppercase tracking-widest">{formatDate(item.date)}</p>
            {item.urgent && <span className="text-[7px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded uppercase">Urgent</span>}
          </div>
          <h4 className={cn("text-[10.5px] font-black leading-tight uppercase group-hover:text-emerald-400 transition-colors", item.urgent && "text-rose-400")}>{item.title}</h4>
          <p className="text-[9.5px] text-zinc-400 line-clamp-2 leading-relaxed font-bold mt-1.5 opacity-80">{item.content}</p>
        </div>
      )) : (
        <p className="text-[10px] font-black uppercase text-zinc-600 text-center py-12">No recent activity detected</p>
      )}
    </div>
  </section>
);

const StatCard: React.FC<{ label: string; value: string; sub: string; trend: 'success' | 'warning' | 'danger' | 'neutral'; icon: React.ReactNode; hideMobile?: boolean }> = ({ label, value, sub, trend, icon, hideMobile }) => (
  <div className={cn("rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-2.5 sm:p-5 shadow-sm transition-all hover:shadow-md", hideMobile ? "hidden lg:block" : "block")}>
    <div className="flex items-center justify-between mb-1.5 sm:mb-4">
      <div className={cn("p-1 sm:p-2 rounded-lg", trend === 'success' ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/10 dark:text-emerald-400" : trend === 'danger' ? "bg-rose-50 text-rose-700 dark:bg-rose-900/10 dark:text-rose-400" : "bg-zinc-50 text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400")}>{icon}</div>
      <div className={cn("px-1.5 py-0.5 rounded-full text-[6px] sm:text-[7px] font-black uppercase tracking-[0.1em]", trend === 'success' ? "bg-emerald-500/10 text-emerald-600" : trend === 'danger' ? "bg-rose-500/10 text-rose-600" : "bg-zinc-500/10 text-zinc-500")}>{trend}</div>
    </div>
    <p className="text-[7.5px] sm:text-[8.5px] font-black text-zinc-400 uppercase tracking-widest">{label}</p>
    <p className="text-xs sm:text-lg font-black text-zinc-900 dark:text-zinc-100 mt-0.5 leading-none">{value}</p>
    <p className="mt-2 text-[7px] sm:text-[8.5px] font-bold uppercase text-zinc-500 truncate bg-zinc-50 dark:bg-zinc-800/50 py-1 px-1.5 rounded-md border border-zinc-100 dark:border-zinc-800/50">{sub || "No history"}</p>
  </div>
);

const HeaderAction: React.FC<{ label: string; icon: React.ReactNode; onClick?: () => void }> = ({ label, icon, onClick }) => (
  <button onClick={onClick} className="flex items-center gap-1.5 group">
    <span className="text-zinc-400 group-hover:text-emerald-600 transition-colors shrink-0">{icon}</span>
    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-white transition-all whitespace-nowrap">{label}</span>
  </button>
);

const GraphToggle: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({ active, label, onClick }) => (
  <button onClick={onClick} className={cn("px-2 py-1 rounded-md transition-all text-[8px] font-black uppercase", active ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-400 hover:text-zinc-600")}>
    {label}
  </button>
);

const graphOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { mode: 'index' as const, intersect: false, backgroundColor: '#18181b', titleFont: { size: 9, weight: 'bold' }, bodyFont: { size: 9 }, padding: 10, cornerRadius: 8 } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 8, weight: 'bold' }, color: '#a1a1aa' } },
    y: { min: 0, max: 100, border: { display: false }, grid: { color: 'rgba(244, 244, 245, 0.4)', drawBorder: false }, ticks: { stepSize: 20, font: { size: 8 }, color: '#a1a1aa' } }
  }
};
