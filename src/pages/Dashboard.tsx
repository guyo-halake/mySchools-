import React, { useState, useEffect, useMemo } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { ParentStudentDashboard } from './ParentStudentDashboard';
import {
  Users,
  CreditCard,
  MessageSquare,
  Calendar,
  Activity,
  ArrowUpRight,
  ShieldAlert,
  Target,
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Download,
  Bell,
  CheckCircle,
  AlertTriangle,
  Plus,
  ArrowRight,
  ChevronRight,
  MoreHorizontal,
  ShieldCheck,
  Award,
  FileText,
  ExternalLink,
  Edit3,
  AlertCircle,
  Clock,
  RefreshCcw,
  BarChart2,
  DollarSign,
  Search,
  Database,
  Monitor
} from 'lucide-react';
import { formatCurrency, cn, formatDate } from '../utils/utils';
import { Link } from 'react-router-dom';
import { Badge, Button, Modal, Card } from '../components/UI';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  PieChart, Pie, Cell
} from 'recharts';

const getDisplayName = (value?: string | null, fallback = 'Student') => value || fallback;



/* -------------------------------------------------------------------------- */
/*                               PERSONAL PORTAL                              */
/* -------------------------------------------------------------------------- */
const PersonalPortal = ({ user }: any) => {
  const [activeTab, setActiveTab] = useState('home');
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkNotice, setLinkNotice] = useState<string | null>(null);

  const [envData, setEnvData] = useState<any>({
    student: null,
    resultsHistory: [],
    fees: [],
    health: null,
    discipline: [],
    assignments: [],
    events: [],
    announcements: []
  });

  useEffect(() => {
    const fetchPortalData = async () => {
      try {
        setLoading(true);
        const visibleStudents = user.role === 'PARENT'
          ? await api.getStudentsByParentId(user.school_id, user.id)
          : await api.getStudentByProfileId(user.school_id, user.id).then(s => s ? [s] : []);

        setChildren(visibleStudents);

        const mainChild = visibleStudents[selectedChildIndex] || visibleStudents[0] || null;
        const [events, announcements] = await Promise.allSettled([
          api.getEvents(user.school_id),
          api.getAnnouncements(user.school_id)
        ]);

        if (mainChild) {
          const [results, fees, health, discipline, assignments] = await Promise.allSettled([
            api.getStudentResultsAll(mainChild.id),
            api.getFees(user.school_id).then(all => all.filter((f: any) => f.student_id === mainChild.id)),
            api.getHealthRecord(mainChild.id),
            api.getDisciplinaryRecords(mainChild.id),
            api.getAssignmentsByStream(mainChild.stream_id)
          ]);

          setEnvData({
            student: mainChild,
            resultsHistory: results.status === 'fulfilled' ? results.value : [],
            fees: fees.status === 'fulfilled' ? fees.value : [],
            health: health.status === 'fulfilled' ? health.value : null,
            discipline: discipline.status === 'fulfilled' ? discipline.value : [],
            assignments: assignments.status === 'fulfilled' ? assignments.value : [],
            events: events.status === 'fulfilled' ? events.value : [],
            announcements: announcements.status === 'fulfilled' ? announcements.value : []
          });
          setLinkNotice(null);
        } else {
          setEnvData({
            student: {
              id: user.id,
              profile: {
                full_name: user.full_name,
                email: user.email,
                role: user.role
              },
              adm_no: 'Pending link',
              stream: null
            },
            resultsHistory: [],
            fees: [],
            health: null,
            discipline: [],
            assignments: [],
            events: events.status === 'fulfilled' ? events.value : [],
            announcements: announcements.status === 'fulfilled' ? announcements.value : []
          });
          setLinkNotice('Your student record is not linked yet. Showing the shared portal while the account is being matched.');
        }
      } catch (err: any) {
        console.error("Portal Data Engine Fault:", err);
        setError("Could not load the portal right now.");
      } finally {
        setLoading(false);
      }
    };
    fetchPortalData();
  }, [user, selectedChildIndex]);

  if (loading) return (
    <div className="space-y-12 animate-pulse px-4 pt-10">
      <div className="h-8 w-64 bg-zinc-100 rounded-xl mb-4" />
      <div className="h-40 w-full bg-zinc-900 rounded-[3rem] mb-12" />
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-zinc-50 rounded-2xl" />)}
      </div>
    </div>
  );

  const { student } = envData;

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {linkNotice && (
        <div className="mx-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-600 dark:text-zinc-300">
          {linkNotice}
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
        <div className="text-left space-y-1">
          <h1 className="text-xl font-black tracking-tight text-zinc-900 leading-none uppercase">
            {activeTab === 'home' && `Welcome, ${user.full_name?.split(' ')[0]}`}
            {activeTab === 'learning' && "Learning Hub"}
            {activeTab === 'results' && "Academic Trace"}
            {activeTab === 'fees' && "Financial Ledger"}
            {activeTab === 'events' && "School Calendar"}
            {activeTab === 'more' && "Campus Services"}
          </h1>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest italic">
            {getDisplayName(student?.profile?.full_name, user.full_name)} • {student?.adm_no || 'Pending link'}
          </p>
        </div>

        {children.length > 1 && (
          <div className="flex bg-zinc-100 p-1 rounded-xl self-start md:self-auto border border-zinc-200 shadow-sm">
            {children.map((child, idx) => (
              <button
                key={child.id}
                onClick={() => setSelectedChildIndex(idx)}
                className={`px-4 py-2 text-[10px] font-black rounded-lg transition-all ${selectedChildIndex === idx ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
              >
                {getDisplayName(child?.profile?.full_name, user.full_name).split(' ')[0]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pb-32 md:pb-12 px-2 md:px-4">
        {activeTab === 'home' && <HomePortal env={envData} setActiveTab={setActiveTab} userName={user.full_name} />}
        {activeTab === 'learning' && <LearningPortal env={envData} />}
        {activeTab === 'results' && <ResultsPortal env={envData} />}
        {activeTab === 'fees' && <FeesPortal env={envData} />}
        {activeTab === 'events' && <EventsPortal env={envData} />}
        {activeTab === 'more' && <MorePortal env={envData} />}
      </div>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-zinc-800 p-2 rounded-[2.5rem] shadow-2xl flex items-center justify-around z-50 md:hidden animate-in slide-in-from-bottom-10 duration-1000">
        <PortalNavBtn active={activeTab === 'home'} icon={<LayoutDashboard size={18} />} label="Home" onClick={() => setActiveTab('home')} />
        <PortalNavBtn active={activeTab === 'learning'} icon={<BookOpen size={18} />} label="Learn" onClick={() => setActiveTab('learning')} />
        <PortalNavBtn active={activeTab === 'results'} icon={<Target size={18} />} label="Results" onClick={() => setActiveTab('results')} />
        <PortalNavBtn active={activeTab === 'fees'} icon={<CreditCard size={18} />} label="Fees" onClick={() => setActiveTab('fees')} />
        <PortalNavBtn active={activeTab === 'events'} icon={<Calendar size={18} />} label="Events" onClick={() => setActiveTab('events')} />
        <PortalNavBtn active={activeTab === 'more'} icon={<MoreHorizontal size={18} />} label="More" onClick={() => setActiveTab('more')} />
      </nav>

      <div className="hidden md:flex gap-10 border-b border-zinc-100 mb-8 sticky top-0 bg-white z-10 py-6 px-4">
        {[
          { id: 'home', label: 'Dashboard' },
          { id: 'learning', label: 'Learning Hub' },
          { id: 'results', label: 'Results' },
          { id: 'fees', label: 'Billing' },
          { id: 'events', label: 'Calendar' },
          { id: 'more', label: 'Services' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-[10px] font-black uppercase tracking-[0.2em] pb-2 relative transition-colors ${activeTab === tab.id ? 'text-zinc-950' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-950 rounded-full animate-in fade-in zoom-in duration-300" />}
          </button>
        ))}
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                                PORTAL VIEWS                                */
/* -------------------------------------------------------------------------- */

const HomePortal = ({ env, setActiveTab, userName }: any) => {
  const { student, fees, resultsHistory, assignments } = env;
  const balance = (fees || []).reduce((acc: number, f: any) => acc + (f.amount_due - f.amount_paid), 0);
  const latestGrade = resultsHistory?.[0]?.grade || 'N/A';

  return (
    <div className="space-y-12">
      {/* 🏢 ELITE HERO CARD */}
      <div className="bg-zinc-950 rounded-[3rem] p-10 text-white relative overflow-hidden group shadow-2xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-zinc-100 flex items-center justify-center text-3xl font-black text-zinc-900 shadow-2xl">
              {getDisplayName(student?.profile?.full_name, userName).charAt(0)}
            </div>
            <div className="text-left space-y-2">
              <h2 className="text-3xl font-black tracking-tight leading-none uppercase">{getDisplayName(student?.profile?.full_name, userName)}</h2>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">
                {(student?.stream?.class?.name || 'Unassigned')} {(student?.stream?.name || '')} • ADM {student?.adm_no || 'Pending link'}
              </p>
              <div className="flex gap-4 pt-2">
                <Badge variant="success">🟢 Good Standing</Badge>
                <Badge variant="info">Verified Student</Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-12 border-t md:border-t-0 md:border-l border-white/10 pt-8 md:pt-0 md:pl-12">
            <StatBlock label="Mean Grade" value={latestGrade} sub="Target: A-" />
            <StatBlock label="Fee Balance" value={`KES ${(balance / 1000).toFixed(1)}k`} sub="Current Term" highlight={balance > 0} />
          </div>
        </div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-zinc-100/5 blur-[120px] -mr-40 -mt-40 rounded-full" />
      </div>

      {/* 🧠 SMART INSIGHTS */}
      <div className="space-y-6">
        <h3 className="px-4 text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em] flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-zinc-900" />
          Smart Performance Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InsightItem
            variant="blue" icon={<TrendingUp size={16} />}
            title="Academic Trajectory"
            desc="Math performance has surged by 12% following recent lab assessments." />
          <InsightItem
            variant="rose" icon={<ArrowRight size={16} />}
            title="Cognitive Shift"
            desc="Consistent excellence in Humanities, but Chemistry requires lab focus." />
          <InsightItem
            variant="amber" icon={<AlertTriangle size={16} />}
            title="Engagement Alert"
            desc={`${(assignments || []).filter((a: any) => !a.is_submitted).length || 2} assignments are pending final submission.`} />
          <InsightItem
            variant="emerald" icon={<ShieldCheck size={16} />}
            title="Institutional Standing"
            desc="Maintained a 100% disciplinary clearance rate throughout this academic year." />
        </div>
      </div>

      {/* ⚡ QUICK ACTIONS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <ActionIconCard icon={<Target size={24} />} label="Academic History" onClick={() => setActiveTab('results')} />
        <ActionIconCard icon={<CreditCard size={24} />} label="Direct Payment" onClick={() => setActiveTab('fees')} />
        <ActionIconCard icon={<BookOpen size={24} />} label="Digital Library" onClick={() => setActiveTab('learning')} />
        <ActionIconCard icon={<Plus size={24} />} label="More Services" onClick={() => setActiveTab('more')} />
      </div>

      {/* 📅 TIMELINE */}
      <div className="space-y-6 pt-4 text-left">
        <h3 className="px-4 text-[10px] font-black text-zinc-400 uppercase tracking-[0.4em]">Campus Timeline • Upcoming</h3>
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[3rem] p-10 space-y-12 shadow-sm">
          {env.events && env.events.length > 0 ? (
            env.events.slice(0, 3).map((e: any) => (
              <TimelineItem
                key={e.id}
                time={new Date(e.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                title={e.title}
                type="Institutional"
              />
            ))
          ) : (
            <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest text-center py-10 italic">No upcoming events scheduled.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const ResultsPortal = ({ env }: any) => {
  const { resultsHistory } = env;
  const groups = (resultsHistory || []).reduce((acc: any, r: any) => {
    const key = `${r.exam?.term?.year || '2024'} - ${r.exam?.term?.name || 'Term 1'}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-12 text-left animate-in slide-in-from-bottom-4 duration-1000">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-zinc-100 pb-10">
        <div className="space-y-2 text-left">
          <h2 className="text-4xl font-black tracking-tight text-zinc-900 uppercase">Academic Trace</h2>
          <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.4em]">Multi-term Subject Progression Ledger</p>
        </div>
        <button className="flex items-center gap-3 px-8 py-4 bg-zinc-950 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-2xl hover:scale-105 transition-all">
          <Download size={16} /> Export Transcript
        </button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        <MetricBox label="Mean Grade" value="B+" sub="Improving" />
        <MetricBox label="Class Rank" value="12 / 142" sub="Top 10%" />
        <MetricBox label="Best Stream" value="Languages" sub="A Average" />
        <MetricBox label="Subject Count" value="8" sub="Full Load" />
      </div>

      {Object.entries(groups).map(([term, termResults]: any) => (
        <div key={term} className="space-y-6">
          <h3 className="px-4 text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">{term}</h3>
          <div className="bg-white border border-zinc-100 rounded-[3rem] overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>
                  <th className="px-10 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Subject</th>
                  <th className="px-10 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Score</th>
                  <th className="px-10 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Grade</th>
                  <th className="px-10 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {termResults.map((r: any) => (
                  <tr key={r.id} className="hover:bg-zinc-50/50 transition-all group">
                    <td className="px-10 py-8">
                      <p className="text-sm font-black text-zinc-900 uppercase leading-none">{r.subject?.name}</p>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase mt-2">Verified Academic Entry</p>
                    </td>
                    <td className="px-10 py-8 text-center text-sm font-black text-zinc-600">{r.marks}%</td>
                    <td className="px-10 py-8 text-center text-sm font-black text-zinc-950">{r.grade}</td>
                    <td className="px-10 py-8 text-right">
                      <span className={`text-[10px] font-black ${r.marks >= 80 ? 'text-emerald-500' : 'text-blue-500'}`}>
                        {r.marks >= 80 ? '↑ Improving' : '→ Consistent'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
};

const FeesPortal = ({ env }: any) => {
  const { fees } = env;
  const balance = (fees || []).reduce((acc: number, f: any) => acc + (f.amount_due - f.amount_paid), 0);

  return (
    <div className="space-y-12 text-left animate-in slide-in-from-bottom-4 duration-1000">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-10 border-b border-zinc-100 pb-10">
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tight text-zinc-900 uppercase">Financial Ledger</h2>
          <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.4em]">Accounts Receivable & Settlements Hub</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 opacity-50">Current Balance</p>
          <h3 className={`text-5xl font-black tracking-tighter ${balance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
            KES {balance.toLocaleString()}
          </h3>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* 💳 SETTLEMENT CARD */}
        <div className="bg-zinc-950 rounded-[3.5rem] p-12 text-white space-y-12 relative overflow-hidden group shadow-2xl">
          <div className="relative z-10 space-y-12">
            <div className="space-y-2">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Electronic Settlement</p>
              <h4 className="text-2xl font-black uppercase tracking-tight">M-Pesa Express (STK)</h4>
            </div>
            <div className="space-y-6">
              <div className="bg-white/5 border border-white/5 p-8 rounded-[2.5rem] flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-emerald-500 rounded-3xl flex items-center justify-center text-xl font-black text-white shadow-xl shadow-emerald-500/20">M</div>
                  <div className="text-left">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Billing Phone</p>
                    <p className="text-lg font-black tracking-tight">07XX XXX XXX</p>
                  </div>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
              <button
                disabled={balance <= 0}
                className="w-full py-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-20 transition-all text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-2xl active:scale-95"
              >
                Confirm Payment Request
              </button>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 blur-[120px] rounded-full" />
        </div>

        {/* 🧾 RECEIPT STACK */}
        <div className="space-y-8">
          <h4 className="px-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Transaction Vault</h4>
          <div className="bg-white border border-zinc-100 rounded-[3.5rem] p-6 divide-y divide-zinc-50 shadow-sm">
            {(fees || []).map((f: any) => (
              <div key={f.id} className="p-8 flex items-center justify-between hover:bg-zinc-50/50 rounded-3xl transition-all">
                <div className="text-left space-y-2">
                  <p className="text-xs font-black text-zinc-900 uppercase tracking-tight leading-none">{f.type || 'Institutional Fees'}</p>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">Receipt: INV-{f.id.slice(0, 6)}</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-sm font-black text-zinc-900 tracking-tight">KES {f.amount_paid.toLocaleString()}</p>
                  <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Verified</span>
                </div>
              </div>
            ))}
            {(!fees || fees.length === 0) && <p className="py-20 text-center text-[10px] font-black text-zinc-300 uppercase italic">No historical transactions detected.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

const LearningPortal = ({ env }: any) => {
  const [tab, setTab] = useState('active');
  return (
    <div className="space-y-12 text-left animate-in slide-in-from-bottom-4 duration-1000">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-10 border-b border-zinc-100 pb-10">
        <div className="space-y-2">
          <h2 className="text-4xl font-black tracking-tight text-zinc-900 uppercase">Learning Hub</h2>
          <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.4em]">Digital Classroom & Resource Registry</p>
        </div>
        <div className="flex bg-zinc-100 p-1.5 rounded-2xl">
          {['active', 'recordings', 'assignments', 'library'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-6 py-3 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${tab === t ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <DigitalResource title="Pure Maths: Advanced Geometry" category="LIVE CLASS" instructor="Mr. Rotich" status="Streaming" isLive color="bg-zinc-900" />
        <DigitalResource title="Bio: Ecosystem Dynamics" category="ASSIGNMENT" status="Due Tomorrow" color="bg-blue-600" />
        <DigitalResource title="Chem: Ionic Bonding" category="NOTES" status="PDF Resource" color="bg-indigo-600" />
      </div>

      <div className="pt-10 space-y-8">
        <h4 className="px-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Active Engagement Tracker</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ActivityTile title="Joined Pure Maths Session" meta="Today, 08:35" duration="45m" />
          <ActivityTile title="Biology Lab Work Submitted" meta="Yesterday, 14:12" status="Success" />
        </div>
      </div>
    </div>
  );
};

const EventsPortal = ({ env }: any) => {
  const { events } = env;
  return (
    <div className="space-y-12 text-left animate-in slide-in-from-bottom-4 duration-1000">
      <header className="border-b border-zinc-100 pb-10">
        <h2 className="text-4xl font-black tracking-tight text-zinc-900 uppercase">School Calendar</h2>
        <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.4em]">Official Term Dates & Special Functions</p>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {(events || []).map((ev: any) => (
          <EventCard key={ev.id} ev={ev} />
        ))}
        {(!events || events.length === 0) && <p className="col-span-full py-20 text-center text-zinc-300 font-bold uppercase text-[10px] tracking-[0.3em]">Institutional calendar currently clear.</p>}
      </div>
    </div>
  );
};

const MorePortal = ({ env }: any) => {
  const { health, discipline } = env;
  return (
    <div className="space-y-16 text-left animate-in slide-in-from-bottom-4 duration-1000 pb-32">
      <header className="border-b border-zinc-100 pb-10">
        <h2 className="text-4xl font-black tracking-tight text-zinc-900 uppercase">Campus Services</h2>
        <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.4em]">Admin, Medical identity & Conduct ledger</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* 🏥 MEDICAL MODULE */}
        <section className="space-y-8">
          <h4 className="px-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Medical Registry</h4>
          <div className="bg-white border border-zinc-100 rounded-[3.5rem] p-12 space-y-10 relative overflow-hidden group shadow-sm">
            <div className="flex items-center gap-6 relative z-10">
              <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-500 flex items-center justify-center shadow-inner group-hover:scale-110 transition-all duration-700">
                <Activity size={32} />
              </div>
              <div>
                <p className="text-lg font-black text-zinc-900 uppercase leading-none">Blood Group: {health?.blood_group || 'O+'}</p>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] mt-3">Verified Medical Profile</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-8 relative z-10">
              <VitalsMetric label="Allergies" value={health?.allergies || 'Non-disclosed'} />
              <VitalsMetric label="Status" value="Healthy" />
              <VitalsMetric label="Last Visit" value="14 FEB" />
              <VitalsMetric label="Clinical Record" value="Enabled" />
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/5 blur-[100px] rounded-full" />
          </div>
        </section>

        {/* 🛡️ CONDUCT MODULE */}
        <section className="space-y-8">
          <h4 className="px-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Conduct Ledger</h4>
          <div className="bg-zinc-950 rounded-[3.5rem] p-12 flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden group shadow-2xl">
            {(discipline || []).length > 0 ? (
              <div className="w-full space-y-6 relative z-10">
                {discipline.map((d: any) => (
                  <div key={d.id} className="p-8 bg-white/5 border border-white/5 rounded-[2.5rem] space-y-2">
                    <h5 className="text-[11px] font-black text-white uppercase tracking-widest">{d.incident_title}</h5>
                    <p className="text-[10px] font-medium text-zinc-500 leading-relaxed uppercase tracking-tighter">{d.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center space-y-6 relative z-10">
                <ShieldCheck size={80} className="mx-auto text-emerald-500 opacity-60 group-hover:scale-110 transition-transform duration-1000" />
                <div className="space-y-2">
                  <h4 className="text-2xl font-black text-white uppercase tracking-tight">Exemplary Conduct</h4>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest max-w-[200px] leading-relaxed mx-auto opacity-60">High-integrity academic standing maintained.</p>
                </div>
              </div>
            )}
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 blur-[120px] rounded-full" />
          </div>
        </section>

        {/* 🤝 CONCIERGE HUB */}
        <section className="lg:col-span-2 bg-blue-600 rounded-[4rem] p-16 text-white relative overflow-hidden group shadow-2xl shadow-blue-500/20">
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-16 text-center md:text-left">
            <div className="space-y-10">
              <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center text-white/50 group-hover:scale-110 transition-all duration-700">
                <Users size={36} />
              </div>
              <div className="space-y-3">
                <h3 className="text-4xl font-black uppercase leading-none tracking-tight">Institutional Concierge</h3>
                <p className="text-blue-100 text-sm font-medium max-w-sm leading-relaxed opacity-70">Book a private consultation with school leadership or subject educators for performance auditing.</p>
              </div>
              <button
                className="px-12 py-6 bg-white text-blue-600 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all"
              >
                Request Consultation
              </button>
            </div>
            <div className="hidden lg:block w-80 h-80 border-[24px] border-white/5 rounded-full mr-12 opacity-40 group-hover:scale-110 transition-all duration-1000" />
          </div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 blur-[120px] rounded-full" />
        </section>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                               SHARED COMPONENTS                            */
/* -------------------------------------------------------------------------- */

const PortalNavBtn = ({ active, icon, label, onClick }: any) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center gap-1.5 transition-all duration-500 flex-1 py-1 ${active ? 'text-zinc-950 scale-110' : 'text-zinc-400 hover:text-zinc-600'}`}
  >
    <div className={`p-2.5 rounded-2xl transition-all duration-500 ${active ? 'bg-zinc-100 shadow-inner' : 'bg-transparent'}`}>
      {React.cloneElement(icon, { size: active ? 22 : 18, strokeWidth: active ? 3 : 2 })}
    </div>
    <span className={`text-[8.5px] font-black uppercase tracking-[0.2em] transition-opacity duration-500 ${active ? 'opacity-100' : 'opacity-0'}`}>{label}</span>
  </button>
);

const ActionIconCard = ({ icon, label, onClick }: any) => (
  <button onClick={onClick} className="bg-white border border-zinc-100 p-8 rounded-[3rem] flex flex-col items-center justify-center gap-5 group hover:shadow-2xl hover:shadow-zinc-200/50 hover:border-zinc-300 active:scale-95 transition-all duration-500">
    <div className={`w-16 h-16 rounded-3xl bg-zinc-50 flex items-center justify-center transition-all duration-700 group-hover:scale-110 group-hover:bg-zinc-100 text-zinc-400 group-hover:text-zinc-900`}>
      {icon}
    </div>
    <span className="text-[9px] font-black text-zinc-400 group-hover:text-zinc-900 uppercase tracking-widest transition-colors">{label}</span>
  </button>
);

const InsightItem = ({ variant, icon, title, desc }: any) => {
  const styles: any = {
    blue: 'bg-blue-50/50 text-blue-600 border-blue-100',
    rose: 'bg-rose-50/50 text-rose-600 border-rose-100',
    amber: 'bg-amber-50/50 text-amber-600 border-amber-100',
    emerald: 'bg-emerald-50/50 text-emerald-600 border-emerald-100'
  };
  return (
    <div className={`p-8 rounded-[2.5rem] border flex gap-8 text-left group hover:scale-[1.02] transition-all duration-500 ${styles[variant]}`}>
      <div className="shrink-0 w-14 h-14 rounded-3xl bg-white flex items-center justify-center shadow-sm text-xl">{icon}</div>
      <div className="space-y-1">
        <h4 className="text-[11px] font-black uppercase tracking-tight group-hover:translate-x-1 transition-transform">{title}</h4>
        <p className="text-[10px] font-medium leading-relaxed opacity-80 uppercase tracking-tighter">{desc}</p>
      </div>
    </div>
  );
};

const TimelineItem = ({ time, title, type, isLive, isEvent }: any) => (
  <div className="flex gap-10 items-start group">
    <div className="shrink-0 w-20 pt-1 text-right">
      <p className="text-[11px] font-black text-zinc-400 uppercase tracking-widest leading-none">{time}</p>
    </div>
    <div className="relative pl-10 border-l border-zinc-100 pb-2 w-full">
      <div className={`absolute left-[-5px] top-2 w-2.5 h-2.5 rounded-full ${isLive ? 'bg-blue-600 animate-pulse ring-4 ring-blue-50' : isEvent ? 'bg-zinc-900 ring-4 ring-zinc-100' : 'bg-zinc-200'}`} />
      <div className="text-left space-y-2">
        <h4 className="text-sm font-black text-zinc-900 uppercase leading-none group-hover:text-blue-600 transition-colors tracking-tight">{title}</h4>
        <div className="flex items-center gap-4">
          <span className="px-3 py-1 bg-zinc-50 border border-zinc-100 rounded-lg text-[8px] font-black text-zinc-400 uppercase tracking-widest">{type}</span>
          {isLive && <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Ongoing Now</span>}
        </div>
      </div>
    </div>
  </div>
);

const MetricBox = ({ label, value, sub }: any) => (
  <div className="bg-zinc-50 border border-zinc-100 p-8 rounded-[2.5rem] text-left group hover:bg-white hover:shadow-xl transition-all duration-700">
    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-3 opacity-60">{label}</p>
    <h4 className="text-2xl font-black leading-none uppercase tracking-tight text-zinc-900">{value}</h4>
    <p className="text-[9px] font-black text-zinc-400 mt-3 uppercase tracking-widest opacity-40">{sub}</p>
  </div>
);

const DigitalResource = ({ title, instructor, status, category, isLive, color }: any) => (
  <div className="bg-white border border-zinc-100 rounded-[3rem] p-10 flex flex-col h-full text-left group hover:border-zinc-900 hover:shadow-2xl hover:shadow-zinc-200 transition-all duration-700 relative overflow-hidden">
    <div className={`w-16 h-16 rounded-3xl ${color} flex items-center justify-center text-white mb-8 shadow-2xl shadow-current/20 group-hover:scale-110 duration-700`}>
      <BookOpen size={32} />
    </div>
    <div className="flex-1 space-y-3 relative z-10">
      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{category}</span>
      <h4 className="text-xl font-black leading-tight uppercase tracking-tight group-hover:text-blue-600 transition-colors">
        {title} {isLive && <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block ml-2 animate-pulse" />}
      </h4>
      {instructor && <p className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">Authored by {instructor}</p>}
    </div>
    <div className="mt-12 flex items-center justify-between border-t border-zinc-50 pt-8 relative z-10">
      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{status}</span>
      <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Access</button>
    </div>
  </div>
);

const ActivityTile = ({ title, meta, duration, status }: any) => (
  <div className="p-8 bg-white border border-zinc-100 rounded-[3rem] flex items-center justify-between hover:scale-105 hover:shadow-xl transition-all group">
    <div className="text-left space-y-2">
      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{meta}</p>
      <p className="text-sm font-black text-zinc-900 uppercase leading-none tracking-tight group-hover:text-blue-600 transition-colors">{title}</p>
    </div>
    <div className="text-right">
      <span className={`text-[9px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl ${duration ? 'bg-zinc-50 text-zinc-400' : 'bg-emerald-50 text-emerald-600'}`}>
        {duration || status}
      </span>
    </div>
  </div>
);

const EventCard = ({ ev }: any) => (
  <div className="bg-white border border-zinc-100 rounded-[3rem] p-10 space-y-8 group hover:border-zinc-900 transition-all duration-700 shadow-sm relative overflow-hidden">
    <div className="space-y-4 relative z-10">
      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-600 bg-blue-50 px-4 py-2 rounded-2xl">{new Date(ev.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
      <h4 className="text-2xl font-black leading-tight uppercase group-hover:text-blue-600 transition-all tracking-tight">{ev.title}</h4>
      <p className="text-xs font-medium text-zinc-500 leading-relaxed uppercase tracking-tighter opacity-80">{ev.description || "General institutional event. Participation is mandatory for relevant stakeholders."}</p>
    </div>
    <div className="flex items-center justify-between border-t border-zinc-50 pt-8 relative z-10">
      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Institutional Notice</p>
      <div className="w-10 h-10 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-300 group-hover:bg-zinc-900 group-hover:text-white transition-all duration-700">
        <ArrowRight size={20} />
      </div>
    </div>
    <div className="absolute top-0 right-0 w-64 h-64 bg-zinc-50 blur-[80px] rounded-full group-hover:bg-blue-500/5 duration-700" />
  </div>
);

const VitalsMetric = ({ label, value }: any) => (
  <div className="p-6 rounded-[2.5rem] bg-zinc-50/50 border border-zinc-50 text-left group hover:bg-white hover:shadow-xl transition-all duration-500">
    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2 opacity-60">{label}</p>
    <p className={`text-[11px] font-black text-zinc-900 uppercase leading-relaxed tracking-tight group-hover:translate-x-1 transition-transform`}>{value}</p>
  </div>
);

const StatBlock = ({ label, value, sub, highlight }: any) => (
  <div className="text-left space-y-1">
    <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1.5 opacity-50">{label}</p>
    <h4 className={`text-4xl font-black leading-none tracking-tighter ${highlight ? 'text-rose-500' : 'text-white'}`}>{value}</h4>
    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-2">{sub}</p>
  </div>
);

const DesktopNavTab = ({ active, label, onClick }: any) => (
  <button
    onClick={onClick}
    className={`px-8 py-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all relative ${active ? 'text-zinc-950' : 'text-zinc-400 hover:text-zinc-600'}`}
  >
    {label}
    {active && <div className="absolute bottom-0 left-8 right-8 h-1 bg-zinc-950 rounded-full" />}
  </button>
);

const LearningMat = ({ title, teacher, type, count, isLive, action, color }: any) => (
  <div className="bg-white border border-zinc-100 rounded-3xl p-6 flex flex-col h-full text-left">
    <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white mb-6`}>
      <BookOpen size={20} />
    </div>
    <div className="flex-1 space-y-1">
      <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
        {title} {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
      </h4>
      <p className="text-[10px] text-zinc-500 font-medium">with {teacher}</p>
    </div>
    <div className="mt-8 flex items-center justify-between border-t border-zinc-50 pt-4">
      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{type}</span>
      <button className="text-[10px] font-black text-blue-600 uppercase hover:underline">{action}</button>
    </div>
  </div>
);

const StatItem = ({ label, value }: any) => (
  <div className="bg-zinc-50 rounded-2xl p-6 text-left border border-zinc-100">
    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mb-1.5">{label}</p>
    <p className="text-sm font-black text-zinc-900 uppercase tracking-tight">{value}</p>
  </div>
);

const ActivityRow = ({ label, activity, duration, status }: any) => (
  <div className="p-4 bg-white border border-zinc-100 rounded-2xl flex items-center justify-between group">
    <div className="text-left space-y-1">
      <p className="text-[9px] font-bold text-zinc-400 uppercase">{label}</p>
      <p className="text-[11px] font-black text-zinc-900 tracking-tight uppercase group-hover:text-blue-600 transition-colors">{activity}</p>
    </div>
    {duration && <span className="text-[9px] font-bold text-zinc-400 uppercase">{duration}</span>}
    {status && <span className="text-[9px] font-bold text-emerald-600 uppercase">Success</span>}
  </div>
);


const InsightCard = ({ icon, title, desc, variant }: any) => {
  const variants: any = {
    emerald: 'bg-emerald-50/30 border-emerald-100 text-emerald-600',
    rose: 'bg-rose-50/30 border-rose-100 text-rose-600',
    indigo: 'bg-indigo-50/30 border-indigo-100 text-indigo-600',
    amber: 'bg-amber-50/30 border-amber-100 text-amber-600',
  };
  return (
    <div className="bg-white dark:bg-zinc-900 p-6 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-sm flex gap-6 group hover:translate-y-[-4px] transition-all duration-500">
      <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner transition-transform group-hover:scale-110 duration-500 ${variants[variant]}`}>
        {icon}
      </div>
      <div className="space-y-1">
        <h4 className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight">{title}</h4>
        <p className="text-[10px] font-medium text-zinc-500 leading-relaxed uppercase tracking-tighter">{desc}</p>
      </div>
    </div>
  );
};

const ActionTile = ({ icon, label, onClick }: any) => (
  <button
    onClick={onClick}
    className="bg-white dark:bg-zinc-900 p-5 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm flex flex-col items-center justify-center gap-4 group transition-all duration-500 hover:shadow-2xl hover:shadow-zinc-200 hover:border-zinc-300 active:scale-95"
  >
    <div className="w-14 h-14 rounded-3xl bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:bg-zinc-100">
      {React.cloneElement(icon, { size: 28, strokeWidth: 2.5 })}
    </div>
    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 group-hover:text-zinc-900 transition-colors">{label}</span>
  </button>
);

const TimelineEntry = ({ time, title, category, color, isLive }: any) => (
  <div className="flex gap-6 items-start relative px-1">
    <div className={`shrink-0 w-2.5 h-2.5 rounded-full ${color} mt-1.5 relative z-10 border-2 border-white dark:border-zinc-900 ring-4 ring-zinc-50 dark:ring-zinc-800/20`} />
    <div className="space-y-1">
      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none bg-zinc-50 dark:bg-zinc-800/50 px-2 py-1 rounded inline-block">{time}</p>
      <div className="flex items-center gap-3">
        <h4 className="text-sm font-black text-zinc-900 dark:text-white uppercase leading-none">{title}</h4>
        {isLive && <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500 text-[8px] font-black text-white animate-pulse">LIVE NOW</span>}
      </div>
      <p className="text-[9px] text-blue-600 font-black uppercase tracking-widest">{category}</p>
    </div>
  </div>
);

const StatCard = ({ label, value, icon, highlight }: any) => (
  <div className="bg-white dark:bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-sm relative overflow-hidden group">
    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] relative z-10">{label}</p>
    <p className={`text-2xl font-black mt-2 relative z-10 tracking-tight ${highlight ? 'text-rose-600' : 'text-zinc-900 dark:text-white'}`}>{value}</p>
    <div className="absolute bottom-[-10px] right-[-10px] opacity-10 group-hover:scale-110 transition-transform duration-700">
      {React.cloneElement(icon, { size: 80, strokeWidth: 3 })}
    </div>
  </div>
);

const MaterialTile = ({ title, subject, type, due, color }: any) => (
  <div className="bg-white dark:bg-zinc-900 p-8 rounded-[3rem] border border-zinc-100 dark:border-zinc-800 shadow-sm group hover:border-zinc-900 transition-all duration-500">
    <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center text-white mb-6 shadow-2xl shadow-current/20 group-hover:scale-110 duration-500`}>
      <BookOpen size={24} />
    </div>
    <h5 className="text-lg font-black leading-tight uppercase mb-2">{title}</h5>
    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-6">{subject}</p>
    <div className="flex items-center justify-between">
      <span className={`text-[9px] font-black uppercase tracking-widest ${due.includes('DUE') || due.includes('HOUR') ? 'text-rose-500' : 'text-emerald-500'}`}>{due}</span>
      <button className="text-[10px] font-black text-blue-600 uppercase hover:underline flex items-center gap-1">GO <ChevronRight size={14} /></button>
    </div>
  </div>
);

const EngagementRow = ({ title, time, subject }: any) => (
  <div className="py-2 first:pt-0 last:pb-0 group">
    <div className="flex items-center justify-between mb-1">
      <p className="text-xs font-black text-zinc-900 dark:text-white uppercase leading-none group-hover:text-blue-600 transition-colors">{title}</p>
      <span className="text-[8px] font-black text-zinc-300 uppercase">{time}</span>
    </div>
    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{subject}</p>
  </div>
);

const VitalsBox = ({ label, value }: any) => (
  <div className="space-y-1.5 p-4 rounded-2xl bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-50 dark:border-zinc-800/50">
    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none">{label}</p>
    <p className="text-xs font-black text-zinc-800 dark:text-zinc-100 uppercase leading-none tracking-tight">{value}</p>
  </div>
);


const StatBox = ({ label, value }: any) => (
  <div className="space-y-1">
    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">{label}</p>
    <p className="text-3xl font-bold tracking-tight text-zinc-900">{value}</p>
  </div>
);

const SimpleButton = ({ to, label, icon }: any) => (
  <Link
    to={to}
    className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm"
  >
    <span className="text-zinc-400">{icon}</span>
    <span>{label}</span>
  </Link>
);

const InputRow = ({ label, value, onChange, placeholder, type = "number" }: any) => (
  <div className="space-y-1.5">
    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-11 px-4 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
    />
  </div>
);


const TeacherView = ({ user }: any) => {
  const [allStreams, setAllStreams] = useState<any[]>([]);
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(localStorage.getItem('teacher_stream_id'));
  const [students, setStudents] = useState<any[]>([]);
  
  // Data States
  const [assessments, setAssessments] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [learningAreas, setLearningAreas] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<{ present: number; absent: number }>({ present: 0, absent: 0 });

  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('results'); // results, projects, appointments
  const [selectedLearningAreaId, setSelectedLearningAreaId] = useState<string>('ALL');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  
  const selectedStream = allStreams.find(s => s.id === selectedStreamId);
  const hour = currentTime.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = user.full_name?.split(' ')[0] || 'Teacher';

  const dateString = currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeString = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    if (selectedStreamId) localStorage.setItem('teacher_stream_id', selectedStreamId);
  }, [selectedStreamId]);

  const hydrate = async () => {
    if (!user.school_id) return;
    setIsLoading(true);
    try {
      const [streamRows, apps, laRes] = await Promise.all([
        api.getTeacherStreams(user.id, user.school_id),
        api.getAppointmentsByTeacher(user.id),
        supabase.from('learning_areas').select('*').eq('school_id', user.school_id).order('name')
      ]);
      setAllStreams(streamRows);
      setAppointments(apps || []);
      setLearningAreas(laRes.data || []);
      
      if (!selectedStreamId && streamRows.length > 0) setSelectedStreamId(streamRows[0].id);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { hydrate(); }, [user.id]);

  useEffect(() => {
    if (!selectedStreamId || !user.school_id) return;
    const load = async () => {
      try {
        const studs = await api.getStudentsByStream(selectedStreamId);
        setStudents(studs || []);

        if (studs && studs.length > 0) {
          const studentIds = studs.map((s: any) => s.id);
          
          // Fetch Assessments
          const { data: assessData } = await supabase
            .from('cbc_student_assessments')
            .select('*, learning_area:learning_areas(name)')
            .eq('school_id', user.school_id)
            .in('student_id', studentIds)
            .order('created_at', { ascending: false });
          
          setAssessments(assessData || []);

          // Fetch Attendance for today
          const todayStr = new Date().toISOString().split('T')[0];
          const { data: attData } = await supabase
            .from('attendance')
            .select('student_id, status')
            .eq('date', todayStr)
            .in('student_id', studentIds);
            
          let p = 0; let a = 0;
          (attData || []).forEach(record => {
            if (record.status === 'present' || record.status === 'late') p++;
            if (record.status === 'absent') a++;
          });
          setAttendance({ present: p, absent: a });
        } else {
          setAssessments([]);
          setAttendance({ present: 0, absent: 0 });
        }

        // Fetch Projects
        const { data: projData } = await supabase
          .from('cbc_projects')
          .select('*, learning_area:learning_areas(name)')
          .eq('school_id', user.school_id)
          .order('due_date', { ascending: true });
        setProjects(projData || []);

      } catch (e) { console.error(e); }
    };
    load();
  }, [selectedStreamId, user.school_id]);

  const updateAppStatus = async (id: string, status: string) => {
    try {
      await api.updateAppointmentStatus(id, status);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      toast.success(`Appointment ${status}`);
    } catch { toast.error('Failed'); }
  };

  // Derive Results View
  const filteredAssessments = useMemo(() => {
    if (selectedLearningAreaId === 'ALL') return assessments;
    return assessments.filter(a => a.learning_area_id === selectedLearningAreaId);
  }, [assessments, selectedLearningAreaId]);

  // We want the LATEST assessment per student for the selected scope
  const studentLatestAssessments = useMemo(() => {
    const map = new Map<string, any>();
    // Since ordered by created_at desc, the first we encounter is latest
    filteredAssessments.forEach(a => {
      if (!map.has(a.student_id)) map.set(a.student_id, a);
    });
    return map;
  }, [filteredAssessments]);

  const resultsStats = useMemo(() => {
    const stats = { EE: 0, ME: 0, AE: 0, BE: 0, total: 0 };
    studentLatestAssessments.forEach(a => {
      if (stats[a.rating as keyof typeof stats] !== undefined) {
        stats[a.rating as keyof typeof stats]++;
        stats.total++;
      }
    });
    return stats;
  }, [studentLatestAssessments]);

  if (isLoading) return (
    <div className="space-y-6 p-8 animate-pulse">
      <div className="h-8 w-64 bg-zinc-100 rounded-xl" />
      <div className="grid grid-cols-2 gap-4"><div className="h-48 bg-zinc-50 rounded-2xl" /><div className="h-48 bg-zinc-50 rounded-2xl" /></div>
      <div className="h-64 bg-zinc-50 rounded-2xl" />
    </div>
  );

  return (
    <div className="w-full flex flex-col gap-0 animate-in fade-in duration-500 bg-zinc-50/50 min-h-screen">
      
      {/* HEADER & STREAM SELECTOR */}
      <div className="px-6 pt-6 pb-6 bg-white border-b border-zinc-100">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-0.5 rounded-full inline-block">{greeting}</span>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{dateString} • {timeString}</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-950">Welcome, {name}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {selectedStream ? `${selectedStream.class?.name} ${selectedStream.name}` : 'Matta OS'} · Teacher Dashboard
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedStreamId || ''}
              onChange={e => setSelectedStreamId(e.target.value)}
              className="appearance-none bg-white border border-zinc-200 rounded-xl px-4 py-2 pr-8 text-[10px] font-black uppercase tracking-widest text-zinc-900 outline-none cursor-pointer shadow-sm hover:border-zinc-300 transition-all"
            >
              <option value="" disabled>Select Stream</option>
              {allStreams.map(s => (
                <option key={s.id} value={s.id}>
                  {s.class?.name} {s.name} {s.class_teacher_id === user.id ? '★' : ''}
                </option>
              ))}
            </select>
            <button onClick={hydrate} className="p-2 bg-white border border-zinc-200 rounded-xl text-zinc-400 hover:text-zinc-900 shadow-sm transition-all">
              <RefreshCcw size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        
        {/* TOP BENTO GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* CARD 1: Class Overview */}
          <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 text-zinc-100 pointer-events-none">
              <Users size={80} strokeWidth={0.5} className="-rotate-12" />
            </div>
            <div className="relative z-10">
              <h2 className="text-sm font-bold text-zinc-900 mb-6">Class Overview</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total Enrolled</p>
                  <p className="text-3xl font-black text-zinc-900">{students.length}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Present Today</p>
                  <p className="text-3xl font-black text-emerald-600">{attendance.present}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Absent Today</p>
                  <p className="text-3xl font-black text-rose-500">{attendance.absent}</p>
                </div>
              </div>
            </div>
            
            {/* QUICK ACTIONS ROW */}
            <div className="relative z-10 mt-6 pt-6 border-t border-zinc-100 flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
              <Link to="/my-classroom" className="shrink-0 flex items-center gap-2 px-4 py-2 bg-zinc-950 text-white rounded-xl hover:bg-zinc-800 transition-all text-xs font-bold shadow-sm">
                <Monitor size={14} /> Start Virtual Class
              </Link>
              <Link to="/suspensions" className="shrink-0 flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-xl hover:bg-zinc-50 transition-all text-xs font-bold shadow-sm">
                <AlertTriangle size={14} className="text-rose-500" /> Log Behavior
              </Link>
              <Link to="/chat" className="shrink-0 flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-xl hover:bg-zinc-50 transition-all text-xs font-bold shadow-sm">
                <MessageSquare size={14} className="text-blue-500" /> Message Parents
              </Link>
            </div>
          </div>

          {/* CARD 2: Active Projects / Assessments */}
          <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-zinc-900">Active CBC Projects</h2>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all rounded-lg text-[10px] font-black uppercase tracking-widest">
                <Plus size={12} strokeWidth={3} /> Add Project
              </button>
            </div>
            
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[160px] hide-scrollbar pr-2">
              {projects.length > 0 ? projects.slice(0, 3).map((p: any) => (
                <div key={p.id} className="p-3 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center justify-between hover:border-zinc-300 transition-all cursor-pointer group">
                  <div>
                    <p className="text-xs font-bold text-zinc-900">{p.title}</p>
                    <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{p.learning_area?.name}</p>
                  </div>
                  {p.due_date && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-amber-600 transition-colors bg-white px-2 py-1 rounded-lg border border-zinc-200">
                      Due {new Date(p.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-2">
                  <FileText size={24} strokeWidth={1.5} className="opacity-50" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No active projects</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* BOTTOM TABBED SECTION */}
        <div className="bg-white border border-zinc-100 rounded-3xl shadow-sm overflow-hidden min-h-[500px]">
          
          {/* TAB STRIP */}
          <div className="flex border-b border-zinc-100 bg-zinc-50/50 px-6 pt-4 gap-8 overflow-x-auto hide-scrollbar">
            {[
              { id: 'results', label: 'Class Results' },
              { id: 'projects', label: 'Assessments & Projects' },
              { id: 'appointments', label: 'My Appointments' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  'pb-3 text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-b-2 relative top-[1px]',
                  activeTab === t.id ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            
            {/* RESULTS TAB */}
            {activeTab === 'results' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-zinc-900">Learning Area:</span>
                    <select
                      value={selectedLearningAreaId}
                      onChange={e => setSelectedLearningAreaId(e.target.value)}
                      className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 pr-8 text-xs font-bold text-zinc-900 outline-none hover:border-zinc-300 transition-all"
                    >
                      <option value="ALL">All Subjects</option>
                      {learningAreas.map(la => (
                        <option key={la.id} value={la.id}>{la.name}</option>
                      ))}
                    </select>
                  </div>
                  <Link to="/results-management" className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all rounded-xl text-xs font-bold">
                    <Edit3 size={14} /> Log Rubrics
                  </Link>
                </div>

                {/* GRADES OVERVIEW CARD */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Exceeding (EE)', count: resultsStats.EE, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                    { label: 'Meeting (ME)', count: resultsStats.ME, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
                    { label: 'Approaching (AE)', count: resultsStats.AE, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' },
                    { label: 'Below (BE)', count: resultsStats.BE, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-100' },
                  ].map(m => (
                    <div key={m.label} className={`${m.bg} ${m.border} border rounded-2xl p-4 flex flex-col items-center justify-center text-center`}>
                      <span className={`text-3xl font-black ${m.color} leading-none`}>{m.count}</span>
                      <span className={`text-[9px] font-black uppercase tracking-widest mt-2 ${m.color} opacity-80`}>{m.label}</span>
                    </div>
                  ))}
                </div>

                {/* STUDENTS TABLE */}
                <div className="border border-zinc-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      <tr>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3 text-center">Current Level</th>
                        <th className="px-4 py-3 hidden sm:table-cell">Last Assessment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {students.length > 0 ? students.map(s => {
                        const assess = studentLatestAssessments.get(s.id);
                        return (
                          <tr key={s.id} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-4 py-3 font-bold text-zinc-900">{s.profile?.full_name}</td>
                            <td className="px-4 py-3 text-center">
                              {assess ? (
                                <span className={cn(
                                  'px-2.5 py-1 text-[10px] font-black rounded-lg',
                                  assess.rating === 'EE' ? 'bg-emerald-100 text-emerald-700' :
                                  assess.rating === 'ME' ? 'bg-blue-100 text-blue-700' :
                                  assess.rating === 'AE' ? 'bg-amber-100 text-amber-700' :
                                  'bg-rose-100 text-rose-700'
                                )}>{assess.rating}</span>
                              ) : (
                                <span className="text-zinc-300">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell text-xs text-zinc-500">
                              {assess ? new Date(assess.created_at).toLocaleDateString() : 'No data'}
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest">
                            No students found in stream
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PROJECTS TAB */}
            {activeTab === 'projects' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-zinc-900">All Projects & Assignments</h3>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white hover:bg-zinc-800 transition-all rounded-lg text-[10px] font-black uppercase tracking-widest">
                    <Plus size={12} strokeWidth={3} /> Create New
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.length > 0 ? projects.map(p => (
                    <div key={p.id} className="border border-zinc-200 rounded-2xl p-5 hover:border-zinc-300 transition-all bg-white group">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1">{p.learning_area?.name}</p>
                          <h4 className="text-sm font-bold text-zinc-900 leading-tight">{p.title}</h4>
                        </div>
                        {p.due_date && (
                          <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg">Due {new Date(p.due_date).toLocaleDateString()}</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 line-clamp-2 mb-4">{p.description || 'No description provided.'}</p>
                      <div className="flex gap-2">
                        <button className="text-[10px] font-black uppercase text-zinc-500 hover:text-zinc-900 px-3 py-1.5 bg-zinc-100 rounded-lg transition-all">Edit</button>
                        <button className="text-[10px] font-black uppercase text-rose-500 hover:text-rose-700 px-3 py-1.5 bg-rose-50 rounded-lg transition-all">Delete</button>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-full py-16 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest border-2 border-dashed border-zinc-100 rounded-3xl">
                      No projects logged for this class
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* APPOINTMENTS TAB */}
            {activeTab === 'appointments' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                 <h3 className="text-sm font-bold text-zinc-900 mb-4">Parent Appointments</h3>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {appointments.length > 0 ? appointments.map((app: any) => (
                    <div key={app.id} className="p-5 bg-white border border-zinc-200 rounded-2xl flex flex-col justify-between hover:shadow-md transition-all">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center font-black text-lg', app.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500')}>
                          {app.parent?.full_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{app.parent?.full_name}</p>
                          <p className="text-xs text-zinc-500">{new Date(app.appointment_date).toLocaleString()}</p>
                        </div>
                      </div>
                      <p className="text-sm text-zinc-700 bg-zinc-50 p-3 rounded-xl mb-4 italic">"{app.reason}"</p>
                      <div className="flex gap-2 mt-auto">
                        <button onClick={() => updateAppStatus(app.id, 'approved')} className="flex-1 py-2 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase rounded-xl hover:bg-emerald-100 transition-all border border-emerald-100">Approve</button>
                        <button onClick={() => updateAppStatus(app.id, 'holding')} className="flex-1 py-2 bg-zinc-50 text-zinc-500 text-xs font-bold uppercase rounded-xl hover:bg-zinc-100 transition-all border border-zinc-200">Hold</button>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-full py-16 text-center border-2 border-dashed border-zinc-100 rounded-3xl">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">No pending appointments</p>
                    </div>
                  )}
                 </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};


const AlertItem = ({ type, text, color = "text-zinc-600" }: any) => (
  <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-100 space-y-1">
    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{type}</p>
    <p className={`text-sm font-medium leading-relaxed ${color}`}>{text}</p>
  </div>
);


/* -------------------------------------------------------------------------- */
/*                               PRINCIPAL VIEW                               */
/* -------------------------------------------------------------------------- */

const PrincipalView = ({ user }: any) => {
  // Main Dashboard Switchable Tab
  const [activeMainTab, setActiveMainTab] = useState('operations'); // 'operations', 'academics', 'finance'
  
  // School Performance Dynamic Filters
  const [perfGradeFilter, setPerfGradeFilter] = useState('ALL');
  const [perfStreamFilter, setPerfStreamFilter] = useState('ALL');

  // Results Filters
  const [activeFormTab, setActiveFormTab] = useState(1);
  const [activeGradeTab, setActiveGradeTab] = useState('Grade 7');
  const [selectedAcademicTerm, setSelectedAcademicTerm] = useState('CURRENT');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(new Date().getFullYear());
  const [fetchError, setFetchError] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activityFilter, setActivityFilter] = useState('ALL');
  const [drillDown, setDrillDown] = useState<{ open: boolean; title: string; students: any[] }>({ open: false, title: '', students: [] });

  // Results Filters
  const [resultsSearch, setResultsSearch] = useState('');
  const [resFormId, setResFormId] = useState('ALL');
  const [resStreamId, setResStreamId] = useState('ALL');
  const [resGradeFilter, setResGradeFilter] = useState('ALL');

  const [showArrears, setShowArrears] = useState(false);
  const [selectedFinanceTerm, setSelectedFinanceTerm] = useState('CURRENT');
  const [financeCategory, setFinanceCategory] = useState('ALL'); // 'ALL', 'FORM', 'STREAM', 'TYPE'
  const [financeValue, setFinanceValue] = useState('ALL');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Quick Action States
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form States
  const [eventForm, setEventForm] = useState({ title: '', description: '', date: '', location: '' });
  const [announceForm, setAnnounceForm] = useState({ title: '', content: '', target: 'ALL' });


  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const { currentTerm, prevTerm, nextTerm } = useMemo(() => {
    if (!data?.terms || data.terms.length === 0) return { currentTerm: null, prevTerm: null, nextTerm: null };
    
    // Prioritize the term marked as is_current in the database
    const active = data.terms.find((t: any) => t.is_current) || data.terms[0];
    
    const sortedTerms = [...data.terms].sort((a, b) => b.start_date.localeCompare(a.start_date));
    const activeIndex = sortedTerms.findIndex(t => t.id === active.id);
    
    const prev = sortedTerms[activeIndex + 1] || null;
    const next = sortedTerms[activeIndex - 1] || null;

    return { currentTerm: active, prevTerm: prev, nextTerm: next };
  }, [data?.terms]);

  // --- Advanced Financial Filtering Logic ---
  const filteredFinanceFees = useMemo(() => {
    if (!data?.fees) return [];

    let filtered = [...data.fees];

    // 1. Term Filter
    if (selectedFinanceTerm === 'CURRENT') {
      const activeTerm = data.terms?.find((t: any) => t.is_current) || data.terms?.[0];
      if (activeTerm) {
        filtered = filtered.filter((f: any) => f.term_id === activeTerm.id);
      }
    } else if (selectedFinanceTerm !== 'YEAR') {
      filtered = filtered.filter((f: any) => f.term_id === selectedFinanceTerm);
    }

    // 2. Category Filter
    if (financeCategory === 'FORM' && financeValue !== 'ALL') {
      filtered = filtered.filter((f: any) => f.student?.stream?.class_id === financeValue);
    } else if (financeCategory === 'STREAM' && financeValue !== 'ALL') {
      filtered = filtered.filter((f: any) => f.student?.stream_id === financeValue);
    } else if (financeCategory === 'TYPE' && financeValue !== 'ALL') {
      filtered = filtered.filter((f: any) => f.type === financeValue);
    }

    return filtered;
  }, [data?.fees, selectedFinanceTerm, financeCategory, financeValue, data?.terms]);

  const streamArrears = useMemo(() => {
    if (!data?.streams || !filteredFinanceFees) return [];

    // Performance Optimization: Map streams to arrears in O(n)
    const arrearsMap = new Map();
    filteredFinanceFees.forEach((f: any) => {
      const sid = f.student?.stream_id;
      if (!sid) return;
      const current = arrearsMap.get(sid) || { due: 0, paid: 0 };
      arrearsMap.set(sid, {
        due: current.due + (Number(f.amount_due) || 0),
        paid: current.paid + (Number(f.amount_paid) || 0)
      });
    });

    return data.streams.map((s: any) => {
      const stats = arrearsMap.get(s.id) || { due: 0, paid: 0 };
      return {
        id: s.id,
        name: s.name,
        className: s.class?.name || 'Unknown',
        arrears: stats.due - stats.paid,
        percentage: stats.due > 0 ? Math.round((stats.paid / stats.due) * 100) : 0
      };
    }).filter((s: any) => s.arrears > 0 || financeCategory === 'STREAM').sort((a, b) => b.arrears - a.arrears);
  }, [data?.streams, filteredFinanceFees, financeCategory]);

  const academicHub = useMemo(() => {
    if (!data?.results || !data?.classes || !currentTerm) {
      console.log('[ACADEMIC AUDIT] Missing base data or terms. Results won\'t load.');
      return null;
    }
    
    const activeTermId = selectedAcademicTerm === 'CURRENT' ? currentTerm.id : selectedAcademicTerm;
    const activeYear = selectedAcademicYear;

    console.log('[ACADEMIC AUDIT] Filtering Form', activeFormTab, 'for Term', activeTermId, 'Year', activeYear);
    
    const formResults = data.results.filter((r: any) => {
       const classLevel = r.class_level || r.student?.stream?.class?.level || r.student?.stream?.class_level;
       return Number(classLevel) === Number(activeFormTab);
    });

    const termFilteredResults = formResults.filter((r: any) => {
       const exam = r.exam || r.exams;
       const resultTermId = exam?.term_id || r.term_id;
       if (!resultTermId) return false;
       
       const term = data.terms?.find((t: any) => t.id === resultTermId);
       return (resultTermId === activeTermId) && term && (term.year === Number(activeYear));
    });

    const prevResults = prevTerm ? formResults.filter((r: any) => (r.term_id || r.exam?.term_id) === prevTerm.id) : [];

    const calculateMean = (res: any[]) => {
      if (res.length === 0) return '0.0';
      
      const totalPoints = res.reduce((acc, r) => {
        const m = Number(r.marks) || 0;
        const customGrade = data.gradingScales?.find((s: any) => m >= s.min_mark && m <= s.max_mark);
        const p = Number(r.points) || Number(customGrade?.grade_point) || 0;
        return acc + p;
      }, 0);
      
      return (totalPoints / res.length).toFixed(2);
    };

    const currentMean = calculateMean(termFilteredResults);
    const prevMean = calculateMean(prevResults);
    const improvement = (Number(currentMean) - Number(prevMean)).toFixed(2);

    const formStreams = data.streams.filter((s: any) => s.class?.level === activeFormTab || s.class_level === activeFormTab);
    const leaderboard = formStreams.map((s: any) => {
       const sResults = termFilteredResults.filter((r: any) => r.student?.stream_id === s.id);
       return {
         id: s.id,
         name: s.name,
         mean: calculateMean(sResults),
         count: sResults.length
       };
    }).sort((a, b) => Number(b.mean) - Number(a.mean));

    return {
      currentMean,
      prevMean,
      improvement,
      leader: leaderboard[0] || null,
      leaderboard,
      aCount: termFilteredResults.filter((r: any) => ['A', 'A-'].includes(r.grade)).length,
      criticalCount: termFilteredResults.filter((r: any) => ['D+', 'D', 'D-', 'E'].includes(r.grade)).length,
      allResults: termFilteredResults
    };
  }, [data?.results, data?.classes, data?.streams, data?.terms, currentTerm, prevTerm, activeFormTab, selectedAcademicTerm, selectedAcademicYear]);

  const fetchInitialData = async () => {
    setFetchError(null);
    try {
      // TIER 1: Core Institutional Config
      const [terms, stats, school, scales] = await Promise.all([
        api.getTerms(user.school_id),
        api.getFinancialSummary(user.school_id), 
        api.getSchool(user.school_id),
        api.getGradingSystem(user.school_id)
      ]);

      const currentTermRes = terms?.find((t: any) => t.is_current) || terms?.[0];
      setData((prev: any) => ({ ...prev, terms, school, financialSummary: stats, gradingScales: scales }));

      // TIER 2: Secondary Metadata
      const [students, teachers, classes, streams] = await Promise.all([
        api.getStudents(user.school_id),
        api.getTeachers(user.school_id),
        api.getClasses(user.school_id),
        api.getStreamsWithDetails(user.school_id)
      ]);

      setData((prev: any) => ({ ...prev, students, teachers, classes, streams }));

      // TIER 3: Heavy Ledgers & CBC
      const [results, fees, events, announcements, discipline, cbcAssessments, cbcProjectSubmissions, todayAttendance, todayPayments, todayExpenses] = await Promise.all([
        api.getResults(user.school_id),
        api.getFeesFull(user.school_id),
        api.getEvents(user.school_id),
        api.getAnnouncements(user.school_id),
        api.getDisciplinarySchoolWide(user.school_id),
        api.getCBCSchoolAssessments(user.school_id),
        api.getCBCSchoolProjectSubmissions(user.school_id),
        api.getTodayAttendanceSchoolWide(user.school_id),
        api.getTodayPayments(user.school_id),
        api.getTodayExpenses(user.school_id)
      ]);
      
      const arrearsByStream = await api.getArrearsByStream(user.school_id, currentTermRes?.id);
      
      setData((prev: any) => ({ 
        ...prev, 
        results, fees, events, announcements,
        discipline, arrearsByStream, cbcAssessments, cbcProjectSubmissions,
        todayAttendance, todayPayments, todayExpenses
      }));
    } catch (err: any) {
      console.error('CRITICAL DATABASE ERROR:', err);
      setFetchError({
        message: err.message || 'Unknown database connection error',
        details: err.details || 'The system could not synchronize with the central data server.',
        hint: err.hint || 'Check if the institutional credentials are still valid.'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [user.school_id]);


  const handleDataCleanup = async () => {
    if (!data?.classes || !data?.streams) return;
    setLoading(true);
    try {
      console.log('[CLEANUP] Initializing Aggressive Level-Lock Consolidation...');

      const levels = [1, 2, 3, 4];
      let fixedCount = 0;

      for (const level of levels) {
        const levelClasses = data.classes.filter((c: any) => c.level === level);

        if (levelClasses.length > 1) {
          console.log(`[CLEANUP] Found ${levelClasses.length} duplicates for Level ${level}. Consolidating...`);

          const counts = levelClasses.map((c: any) => ({
            ...c,
            streamCount: data.streams.filter((s: any) => s.class_id === c.id).length
          }));

          counts.sort((a, b) => b.streamCount - a.streamCount);
          const master = counts[0];
          const orphans = counts.slice(1);

          for (const orphan of orphans) {
            const orphanStreams = data.streams.filter((s: any) => s.class_id === orphan.id);
            for (const s of orphanStreams) {
              console.log(`[CLEANUP] Re-linking Stream ${s.name} to Master ID: ${master.id}`);
              await api.updateStreamClass(s.id, master.id);
            }
            console.log(`[CLEANUP] Purging Redundant Level ${level} Record: ${orphan.id}`);
            await api.deleteClass(orphan.id);
            fixedCount++;
          }
        }
      }

      if (fixedCount > 0) {
        console.log(`[CLEANUP] Optimization finished. ${fixedCount} records purged.`);
        window.location.reload();
      } else {
        console.log('[CLEANUP] Institutional structure is already optimal.');
      }
    } catch (err) {
      console.error('[CLEANUP FATAL ERROR]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (data?.streams && data.streams.length > 0 && resFormId !== 'ALL') {
      const streamsInForm = data.streams.filter((s: any) => s.class_id === resFormId);
      console.log(`[AUDIT] Form Filter Changed (${resFormId}). Streams found:`, streamsInForm.map(s => s.name));
    }
  }, [resFormId, data?.streams]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!announceForm.title || !announceForm.content) return;
    setIsSaving(true);
    try {
      await api.createAnnouncement({
        school_id: user.school_id,
        title: announceForm.title,
        content: announceForm.content,
        author_id: user.id,
        target_roles: announceForm.target === 'ALL' ? ['TEACHER', 'PARENT', 'STUDENT'] : [announceForm.target] as any
      });

      // Broadcast Notification
      const targetRoles = announceForm.target === 'ALL' ? ['TEACHER', 'PARENT', 'STUDENT'] : [announceForm.target];
      await api.broadcastNotification(
        user.school_id, 
        targetRoles, 
        'New Announcement',
        announceForm.title,
        'ANNOUNCEMENT'
      );

      const targetLabel = announceForm.target === 'ALL' ? 'Institution' : `${announceForm.target.toLowerCase()}s`;
      toast.success(`Announcement broadcast to ${targetLabel}!`, {
         icon: '📢',
         duration: 5000
      });

      setShowAnnounceModal(false);
      setAnnounceForm({ title: '', content: '', target: 'ALL' });
      fetchInitialData(); 
    } catch (err) {
      console.error("Failed to create announcement:", err);
      toast.error('Failed to broadcast announcement.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventForm.title || !eventForm.date) return;
    setIsSaving(true);
    try {
      await api.createEvent({
        school_id: user.school_id,
        ...eventForm,
        rsvps: []
      });

      // Broadcast Notification
      await api.broadcastNotification(
        user.school_id, 
        ['TEACHER', 'PARENT', 'STUDENT'], 
        'New School Event',
        `${eventForm.title} on ${eventForm.date}`,
        'EVENT'
      );

      toast.success('Official Event Scheduled & Broadcast Sent!', {
         icon: '📅',
         duration: 5000
      });

      setShowEventModal(false);
      setEventForm({ title: '', description: '', date: '', location: '' });
      fetchInitialData(); 
    } catch (err) {
      console.error("Failed to create event:", err);
      toast.error('Failed to schedule event. Please check permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  // --- CBC Calculations & Memoized Metrics ---
  const { primaryCount, jssCount } = useMemo(() => {
    if (!data?.students) return { primaryCount: 0, jssCount: 0 };
    const jss = data.students.filter((s: any) => {
      const c = s.stream?.class?.name || s.class_name || '';
      return c.includes('7') || c.includes('8') || c.includes('9') || c.toLowerCase().includes('jss') || c.toLowerCase().includes('junior');
    }).length;
    const prim = data.students.length - jss;
    return { primaryCount: prim > 0 ? prim : data.students.length, jssCount: jss };
  }, [data?.students]);

  const cbcMetrics = useMemo(() => {
    if (!data?.cbcAssessments) return { eeCount: 0, meCount: 0, aeCount: 0, beCount: 0, eeMePercentage: 0, totalAssessments: 0, gradeAssessments: [], pacingText: 'No assessments logged yet', pacingPercentage: 0 };
    
    const all = data.cbcAssessments || [];
    const totalAssessments = all.length;
    
    const eeCount = all.filter((a: any) => ['EE', 'EE1', 'EE2', '4'].includes(String(a.rating))).length;
    const meCount = all.filter((a: any) => ['ME', 'ME1', 'ME2', '3'].includes(String(a.rating))).length;
    const aeCount = all.filter((a: any) => ['AE', 'AE1', 'AE2', '2'].includes(String(a.rating))).length;
    const beCount = all.filter((a: any) => ['BE', 'BE1', 'BE2', '1'].includes(String(a.rating))).length;
    
    const eeMePercentage = totalAssessments > 0 ? Math.round(((eeCount + meCount) / totalAssessments) * 100) : 0;
    
    const gradeAssessments = all.filter((a: any) => {
      const g = a.grade_level_at_time || a.student?.stream?.class?.name || '';
      return g.toLowerCase().includes(activeGradeTab.toLowerCase()) || activeGradeTab.toLowerCase().includes(g.toLowerCase());
    });
    
    const distinctSubStrands = new Set(gradeAssessments.map((a: any) => a.sub_strand_id || a.sub_strand)).size;
    const expectedSubStrands = 6;
    const pacingPercentage = Math.min(100, Math.round((distinctSubStrands / expectedSubStrands) * 100));
    const pacingText = `${activeGradeTab} Curriculum: ${distinctSubStrands} of ${expectedSubStrands} Sub-strands Assessed this term (${pacingPercentage}% Pacing)`;
    
    return {
      eeCount,
      meCount,
      aeCount,
      beCount,
      eeMePercentage,
      totalAssessments,
      gradeAssessments,
      pacingText,
      pacingPercentage
    };
  }, [data?.cbcAssessments, activeGradeTab]);

  const cbcProjectsHub = useMemo(() => {
    if (!data?.cbcProjectSubmissions) return { activeProjects: [], submissionRate: 0, rubricBreakdown: { exceeding: 0, meeting: 0, approaching: 0, below: 0 } };
    const subs = data.cbcProjectSubmissions || [];
    const totalSubs = subs.length;
    
    const projMap = new Map();
    subs.forEach((s: any) => {
      if (!s.project) return;
      const pid = s.project.id;
      if (!projMap.has(pid)) {
        projMap.set(pid, { ...s.project, submissionCount: 0 });
      }
      projMap.get(pid).submissionCount += 1;
    });
    const activeProjects = Array.from(projMap.values());
    
    const totalStudents = data?.students?.length || 1;
    const submissionRate = Math.min(100, Math.round((totalSubs / (activeProjects.length ? activeProjects.length * 30 : totalStudents)) * 100));
    
    const exceeding = subs.filter((s: any) => ['4', 'EE', 'Excellent'].includes(String(s.rubric_rating))).length;
    const meeting = subs.filter((s: any) => ['3', 'ME', 'Good'].includes(String(s.rubric_rating))).length;
    const approaching = subs.filter((s: any) => ['2', 'AE', 'Fair'].includes(String(s.rubric_rating))).length;
    const below = subs.filter((s: any) => ['1', 'BE', 'Poor'].includes(String(s.rubric_rating))).length;
    
    return {
      activeProjects,
      submissionRate,
      rubricBreakdown: { exceeding, meeting, approaching, below }
    };
  }, [data?.cbcProjectSubmissions, data?.students]);

  const metrics = useMemo(() => {
    if (!data) return { feesCollected: 0, totalDue: 0, arrears: 0, efficiency: 0 };
    const collected = filteredFinanceFees.reduce((acc: number, f: any) => acc + (Number(f.amount_paid) || 0), 0);
    const due = filteredFinanceFees.reduce((acc: number, f: any) => acc + (Number(f.amount_due) || 0), 0);
    const balance = due - collected;
    const efficiency = due > 0 ? Math.round((collected / due) * 100) : 0;
    return { feesCollected: collected, totalDue: due, arrears: balance, efficiency };
  }, [filteredFinanceFees, data]);

  const { feesCollected, totalDue, arrears, efficiency: financeEfficiency } = metrics;

  const cashFlowSparkline = useMemo(() => {
    return [
      { week: 'W1', amount: 120000 },
      { week: 'W2', amount: 250000 },
      { week: 'W3', amount: 410000 },
      { week: 'W4', amount: 380000 },
      { week: 'W5', amount: 620000 },
      { week: 'W6', amount: feesCollected || 750000 }
    ];
  }, [feesCollected]);

  const cbcComplianceAlerts = useMemo(() => {
    if (!data?.streams) return [];
    return data.streams.map((s: any) => {
      const sAssessments = (data?.cbcProjectSubmissions || []).filter((a: any) => a.student?.stream_id === s.id || a.stream_id === s.id);
      if (sAssessments.length === 0) {
        return {
          title: `Formative Assessment Lag: ${s.class?.name || ''} ${s.name}`,
          content: `No formative CBC assessments have been logged for this stream in the last 14 days. Immediate follow-up with the class facilitator is required.`,
          created_at: new Date().toISOString(),
          type: 'CBC_ALERT',
          author_id: s.teacher?.id || 'system',
          author_name: s.teacher?.full_name || 'System Monitor'
        };
      }
      return null;
    }).filter(Boolean);
  }, [data?.streams, data?.cbcProjectSubmissions]);

  const aggregatedStudents = useMemo(() => {
    if (!data?.students || !data?.cbcProjectSubmissions) return [];

    const scoreMap: Record<string, number> = {
      'EE': 4, 'EE1': 4, 'EE2': 4, '4': 4, 'EXCELLENT': 4,
      'ME': 3, 'ME1': 3, 'ME2': 3, '3': 3, 'GOOD': 3,
      'AE': 2, 'AE1': 2, 'AE2': 2, '2': 2, 'FAIR': 2,
      'BE': 1, 'BE1': 1, 'BE2': 1, '1': 1, 'POOR': 1
    };

    const studentScores: Record<string, number[]> = {};
    data.cbcProjectSubmissions.forEach((a: any) => {
      if (!a.student_id) return;
      const score = scoreMap[String(a.rubric_rating || a.rating || '').toUpperCase()];
      if (score !== undefined) {
        if (!studentScores[a.student_id]) {
          studentScores[a.student_id] = [];
        }
        studentScores[a.student_id].push(score);
      }
    });

    return data.students.map((student: any) => {
      const scores = studentScores[student.id];
      let rating: 'EE' | 'ME' | 'AE' | 'BE' | 'UNASSESSED' = 'UNASSESSED';
      let avg = 0;

      if (scores && scores.length > 0) {
        avg = scores.reduce((sum: number, val: number) => sum + val, 0) / scores.length;
        if (avg >= 3.5) rating = 'EE';
        else if (avg >= 2.5) rating = 'ME';
        else if (avg >= 1.5) rating = 'AE';
        else rating = 'BE';
      }

      return {
        ...student,
        overallRating: rating,
        averageScore: avg,
        className: student.stream?.class?.name || student.class_name || 'Unknown Class',
        streamName: student.stream?.name || student.stream_name || 'Unknown Stream',
        classId: student.stream?.class_id || student.class_id,
        streamId: student.stream_id
      };
    });
  }, [data?.students, data?.cbcProjectSubmissions]);

  const filteredPerfStudents = useMemo(() => {
    let list = aggregatedStudents;
    if (perfGradeFilter !== 'ALL') {
      list = list.filter((s: any) => s.className === perfGradeFilter);
      if (perfStreamFilter !== 'ALL') {
        list = list.filter((s: any) => s.streamName === perfStreamFilter);
      }
    }
    return list;
  }, [aggregatedStudents, perfGradeFilter, perfStreamFilter]);

  const classRatingCounts = useMemo(() => {
    let ee = 0, me = 0, ae = 0, be = 0, total = 0;
    filteredPerfStudents.forEach((s: any) => {
      const r = s.overallRating;
      if (r === 'EE') ee++;
      else if (r === 'ME') me++;
      else if (r === 'AE') ae++;
      else if (r === 'BE') be++;
      
      if (r !== 'UNASSESSED') total++;
    });
    return { ee, me, ae, be, total };
  }, [filteredPerfStudents]);

  const perfGrades = useMemo(() => {
    const grades = new Set<string>();
    aggregatedStudents.forEach((s: any) => {
      if (s.className) grades.add(s.className);
    });
    return Array.from(grades).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [aggregatedStudents]);

  const perfStreams = useMemo(() => {
    if (perfGradeFilter === 'ALL') return [];
    const streams = new Set<string>();
    aggregatedStudents.forEach((s: any) => {
      if (s.className === perfGradeFilter && s.streamName) {
        streams.add(s.streamName);
      }
    });
    return Array.from(streams).sort();
  }, [aggregatedStudents, perfGradeFilter]);

  const gradeSummaryRows = useMemo(() => {
    const summary: Record<string, { className: string, EE: number, ME: number, AE: number, BE: number, total: number }> = {};
    
    perfGrades.forEach(grade => {
      summary[grade] = { className: grade, EE: 0, ME: 0, AE: 0, BE: 0, total: 0 };
    });

    aggregatedStudents.forEach((s: any) => {
      if (!s.className || s.className === 'Unknown Class') return;
      if (!summary[s.className]) {
        summary[s.className] = { className: s.className, EE: 0, ME: 0, AE: 0, BE: 0, total: 0 };
      }
      const rating = s.overallRating;
      if (rating !== 'UNASSESSED') {
        summary[s.className][rating as 'EE'|'ME'|'AE'|'BE'] += 1;
        summary[s.className].total += 1;
      }
    });

    return Object.values(summary).sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }));
  }, [aggregatedStudents, perfGrades]);

  if (loading || !data) return <DashboardSkeleton />;

  const downloadStreamArrears = (streamId: string, streamName: string) => {
    const streamFees = filteredFinanceFees.filter((f: any) => f.student?.stream_id === streamId && (Number(f.amount_due) - Number(f.amount_paid)) > 0);
    if (streamFees.length === 0) { alert('No students with arrears found in this stream.'); return; }

    const headers = ['Admission Number', 'Student Name', 'Total Due', 'Amount Paid', 'Arrears'];
    const rows = streamFees.map((f: any) => [
      f.student?.admission_no || 'N/A',
      f.student?.full_name || 'N/A',
      f.amount_due,
      f.amount_paid,
      Number(f.amount_due) - Number(f.amount_paid)
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${streamName}_Arrears_Audit.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPrefix = (name: any) => {
    if (!name || typeof name !== 'string') return 'Mr./Ms.';
    const n = name.toLowerCase();
    if (n.includes('mrs') || n.includes('lady') || n.includes('jane') || n.endsWith('a') || n.includes('mary')) return 'Mrs.';
    return 'Mr.';
  };

  const handleCellClick = (className: string, rating: 'EE' | 'ME' | 'AE' | 'BE', count: number) => {
    if (count === 0) return;
    
    const studentsList = aggregatedStudents.filter((s: any) => 
      s.className === className && s.overallRating === rating
    );
    
    const ratingLabels: Record<string, string> = {
      'EE': 'Exceeding Expectation (EE)',
      'ME': 'Meeting Expectation (ME)',
      'AE': 'Approaching Expectation (AE)',
      'BE': 'Below Expectation (BE)'
    };
    
    setDrillDown({
      open: true,
      title: `${className} — ${ratingLabels[rating]} Students`,
      students: studentsList
    });
  };

  const handleClassCardClick = (rating: 'EE' | 'ME' | 'AE' | 'BE', count: number) => {
    if (count === 0) return;
    
    const studentsList = filteredPerfStudents.filter((s: any) => s.overallRating === rating);
    
    const ratingLabels: Record<string, string> = {
      'EE': 'Exceeding Expectation (EE)',
      'ME': 'Meeting Expectation (ME)',
      'AE': 'Approaching Expectation (AE)',
      'BE': 'Below Expectation (BE)'
    };
    
    const titleStr = perfStreamFilter !== 'ALL' 
      ? `${perfGradeFilter} ${perfStreamFilter} — ${ratingLabels[rating]} Students`
      : `${perfGradeFilter} (All Streams) — ${ratingLabels[rating]} Students`;

    setDrillDown({
      open: true,
      title: titleStr,
      students: studentsList
    });
  };

  return (
    <div className="w-full px-4 lg:px-8 pt-2 pb-6 flex flex-col gap-0 animate-in fade-in duration-700 font-inter text-zinc-900 bg-white">

      {/* WELCOME SECTION + METRIC BLOCKS + TABS — all one compact header */}
      <div className="pb-0">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-5 border-b border-zinc-100">
          {/* WELCOME TEXT */}
          <div className="space-y-0.5">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-0.5 rounded-full inline-block mb-1">
               {getGreeting()}
            </span>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-zinc-950 leading-tight">
              Welcome, {user?.full_name}
            </h1>
            <p className="text-base text-zinc-500 font-serif italic">
              Principal, {data?.school?.name || 'Giakanja Boys High School'}
            </p>
          </div>

          {/* METRIC BLOCKS */}
          <div className="flex flex-col sm:flex-row items-center gap-8 lg:gap-12">
             <div className="space-y-0.5 text-center sm:text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Total Students</p>
                <h3 className="text-2xl font-black tracking-tight text-zinc-950 tabular-nums">{data?.students?.length || 0}</h3>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Pri: {primaryCount} | JSS: {jssCount}</p>
             </div>
             <div className="space-y-0.5 text-center sm:text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Active Staff</p>
                <h3 className="text-2xl font-black tracking-tight text-zinc-950 tabular-nums">{data?.teachers?.length || 0}</h3>
                <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{data?.teachers?.length || 0} Active Today</p>
             </div>
             <div className="space-y-0.5 text-center sm:text-left">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Fees Collected</p>
                <h3 className="text-2xl font-black tracking-tight text-zinc-950 tabular-nums">{feesCollected > 0 ? `KSh ${feesCollected.toLocaleString()}` : `KSh 0`}</h3>
                <p className="text-[9px] font-black text-purple-600 uppercase tracking-widest">This Term</p>
             </div>
          </div>
        </div>

        {/* TAB STRIP — sits immediately under the metrics */}
        <div className="flex items-center gap-1 border-b border-zinc-100">
          {[
            { key: 'operations', label: 'Daily Operations' },
            { key: 'academics',  label: 'CBC & Academics'  },
            { key: 'finance',    label: 'Finance'          },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveMainTab(tab.key)}
              className={cn(
                "px-5 py-2.5 text-sm font-medium transition-all duration-200 border-b-2 -mb-px",
                activeMainTab === tab.key
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-400 hover:text-zinc-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* REACTIVE BIG PAGE & ACTIVITY FEED */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-4 flex-1">
         
         {/* THE BIG PAGE (Main Content Canvas) */}
         <div className="lg:col-span-8 space-y-5 pb-6">
             
             {/* 1. OPERATIONS TAB */}
             {activeMainTab === 'operations' && (
                <div data-ai-context="operations-hub-canvas" className="space-y-5 animate-in fade-in duration-500">
                   <div>
                      <p className="text-xs text-zinc-400 uppercase tracking-widest">{new Date().toLocaleDateString('en-KE', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</p>
                   </div>

                   {/* 3 KEY STAT CARDS */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* Present Teachers */}
                      <div className="p-6 rounded-2xl border border-zinc-200 bg-white">
                         <p className="text-xs text-zinc-400 mb-3">Teachers Present Today</p>
                         {data?.todayAttendance === undefined ? (
                            <p className="text-xs text-zinc-300">Loading...</p>
                         ) : (
                            <>
                              <p className="text-4xl font-light text-zinc-900 tabular-nums">
                                {data?.teachers?.length || 0}
                              </p>
                              <p className="text-xs text-zinc-400 mt-2">of {data?.teachers?.length || 0} on staff &mdash; attendance not tracked per teacher yet</p>
                            </>
                         )}
                      </div>

                      {/* Present Students */}
                      <div className="p-6 rounded-2xl border border-zinc-200 bg-white">
                         <p className="text-xs text-zinc-400 mb-3">Students Present Today</p>
                         {(() => {
                            const present = (data?.todayAttendance || []).filter((a: any) => a.status === 'present' || a.status === 'PRESENT').length;
                            const total = data?.students?.length || 0;
                            const pct = total > 0 ? Math.round((present / total) * 100) : 0;
                            return (
                               <>
                                  <p className="text-4xl font-light text-zinc-900 tabular-nums">
                                     {present > 0 ? `${present}` : '—'}
                                     <span className="text-lg text-zinc-400 font-light"> / {total}</span>
                                  </p>
                                  {present > 0 ? (
                                     <p className="text-xs text-zinc-400 mt-2">{pct}% attendance rate today</p>
                                  ) : (
                                     <p className="text-xs text-zinc-300 mt-2">No attendance marked today yet</p>
                                  )}
                               </>
                            );
                         })()}
                      </div>

                      {/* Payments Today */}
                      <div className="p-6 rounded-2xl border border-zinc-200 bg-white">
                         <p className="text-xs text-zinc-400 mb-3">Payments Today</p>
                         {(() => {
                            const payments = data?.todayPayments || [];
                            const expenses = data?.todayExpenses || [];
                            const totalIn = payments.reduce((acc: number, p: any) => acc + (Number(p.amount_paid) || 0), 0);
                            const totalOut = expenses.reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0);
                            if (payments.length === 0 && expenses.length === 0) {
                               return (
                                  <>
                                    <p className="text-sm font-medium text-zinc-400">No Payments Today</p>
                                    <p className="text-xs text-zinc-300 mt-2">No fee receipts or expenses recorded yet</p>
                                  </>
                               );
                            }
                            return (
                               <>
                                  {totalIn > 0 && <p className="text-2xl font-light text-emerald-700 tabular-nums">+ KES {formatCurrency(totalIn).replace(/[^\d.,]/g,'')}</p>}
                                  {totalOut > 0 && <p className="text-2xl font-light text-rose-600 tabular-nums mt-1">&minus; KES {formatCurrency(totalOut).replace(/[^\d.,]/g,'')}</p>}
                                  <p className="text-xs text-zinc-400 mt-2">{payments.length} receipt{payments.length !== 1 ? 's' : ''}{expenses.length > 0 ? `, ${expenses.length} expense${expenses.length !== 1 ? 's' : ''}` : ''}</p>
                               </>
                            );
                         })()}
                      </div>
                   </div>

                   {/* Teacher List */}
                   <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white">
                      <div className="px-5 py-3 border-b border-zinc-100 flex justify-between items-center">
                         <p className="text-xs font-medium text-zinc-700">Teaching Staff</p>
                         <span className="text-xs text-zinc-400">{data?.teachers?.length || 0} registered</span>
                      </div>
                      <div className="divide-y divide-zinc-100 max-h-[300px] overflow-y-auto">
                         {(data?.teachers || []).length === 0 ? (
                            <div className="p-6 text-center text-xs text-zinc-400">No teachers found.</div>
                         ) : (data?.teachers || []).map((t: any) => (
                            <div key={t.id} className="px-5 py-3 flex items-center justify-between">
                               <div>
                                  <p className="text-sm text-zinc-900">{t.full_name}</p>
                                  <p className="text-xs text-zinc-400">{t.subject || 'Class Teacher'}</p>
                               </div>
                               <span className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">Active</span>
                            </div>
                         ))}
                      </div>
                   </div>

                   {/* Events */}
                   {[...(data?.events || []), ...(data?.announcements || [])].length > 0 && (
                      <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white">
                         <div className="px-5 py-3 border-b border-zinc-100">
                            <p className="text-xs font-medium text-zinc-700">Upcoming Events & Announcements</p>
                         </div>
                         <div className="divide-y divide-zinc-100 max-h-[200px] overflow-y-auto">
                            {[...(data?.events || []), ...(data?.announcements || [])].slice(0, 8).map((e: any, i: number) => (
                               <div key={e.id || i} className="px-5 py-3 flex items-start gap-2">
                                  <div className="w-1 h-1 rounded-full bg-zinc-300 mt-2 shrink-0"></div>
                                  <div>
                                     <p className="text-sm text-zinc-900">{e.title}</p>
                                     <p className="text-xs text-zinc-400">{e.date ? new Date(e.date).toLocaleDateString('en-KE') : 'Ongoing'}</p>
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                   )}
                </div>
             )}

             {/* 2. CBC & ACADEMICS TAB */}
             {activeMainTab === 'academics' && (
                <div data-ai-context="academics-canvas" className="space-y-6 animate-in fade-in duration-500">
                   <div>
                      <h3 className="text-base font-semibold text-zinc-900 dark:text-white">CBC & Academics</h3>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Competency-Based Curriculum — {currentTerm?.name || 'Current Term'}</p>
                   </div>

                   {/* CBC Summary Row */}
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[{label:'Exceeding (EE)', count: cbcMetrics.eeCount, color:'emerald'},{label:'Meeting (ME)', count: cbcMetrics.meCount, color:'blue'},{label:'Approaching (AE)', count: cbcMetrics.aeCount, color:'amber'},{label:'Below (BE)', count: cbcMetrics.beCount, color:'rose'}].map(({label,count,color}) => (
                         <div key={label} className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>
                            <p className={`text-3xl font-semibold text-${color}-600 dark:text-${color}-400`}>{count}</p>
                            <p className="text-xs text-zinc-400 mt-1">{cbcMetrics.totalAssessments > 0 ? Math.round((count/cbcMetrics.totalAssessments)*100) : 0}% of all</p>
                         </div>
                      ))}
                   </div>

                   {/* Competency bar */}
                   <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 space-y-3">
                      <div className="flex justify-between">
                         <p className="text-sm font-medium text-zinc-900 dark:text-white">School-Wide Competency Spread</p>
                         <p className="text-sm text-zinc-500">{cbcMetrics.totalAssessments} total observations</p>
                      </div>
                      <div className="flex h-3 w-full rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                         <div style={{width:`${Math.max(2,(cbcMetrics.eeCount/Math.max(1,cbcMetrics.totalAssessments))*100)}%`}} className="bg-emerald-500 h-full" title="Exceeding"></div>
                         <div style={{width:`${Math.max(2,(cbcMetrics.meCount/Math.max(1,cbcMetrics.totalAssessments))*100)}%`}} className="bg-blue-500 h-full" title="Meeting"></div>
                         <div style={{width:`${Math.max(2,(cbcMetrics.aeCount/Math.max(1,cbcMetrics.totalAssessments))*100)}%`}} className="bg-amber-500 h-full" title="Approaching"></div>
                         <div style={{width:`${Math.max(2,(cbcMetrics.beCount/Math.max(1,cbcMetrics.totalAssessments))*100)}%`}} className="bg-rose-500 h-full" title="Below"></div>
                      </div>
                      <div className="flex gap-4 text-xs text-zinc-400">
                         <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>EE</span>
                         <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>ME</span>
                         <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>AE</span>
                         <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"></span>BE</span>
                      </div>
                   </div>

                   {/* Grade-by-Grade CBC Table */}
                   <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-950">
                      <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
                         <h4 className="text-sm font-medium text-zinc-900 dark:text-white">Competency Results by Grade</h4>
                      </div>
                      {gradeSummaryRows.length === 0 ? (
                         <div className="p-8 text-center text-sm text-zinc-400">No CBC assessments have been logged yet. Teachers need to record formative observations.</div>
                      ) : (
                         <table className="w-full text-left">
                            <thead>
                               <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                                  <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Grade</th>
                                  <th className="px-6 py-3 text-xs font-medium text-emerald-600 uppercase tracking-wider text-center">EE</th>
                                  <th className="px-6 py-3 text-xs font-medium text-blue-600 uppercase tracking-wider text-center">ME</th>
                                  <th className="px-6 py-3 text-xs font-medium text-amber-600 uppercase tracking-wider text-center">AE</th>
                                  <th className="px-6 py-3 text-xs font-medium text-rose-600 uppercase tracking-wider text-center">BE</th>
                                  <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">Total</th>
                               </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                               {gradeSummaryRows.map((row: any) => (
                                  <tr key={row.className} className="hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                                     <td className="px-6 py-3 text-sm font-medium text-zinc-900 dark:text-white">{row.className}</td>
                                     <td className="px-6 py-3 text-sm text-emerald-600 font-semibold text-center">{row.EE || '—'}</td>
                                     <td className="px-6 py-3 text-sm text-blue-600 font-semibold text-center">{row.ME || '—'}</td>
                                     <td className="px-6 py-3 text-sm text-amber-600 font-semibold text-center">{row.AE || '—'}</td>
                                     <td className="px-6 py-3 text-sm text-rose-600 font-semibold text-center">{row.BE || '—'}</td>
                                     <td className="px-6 py-3 text-sm text-zinc-500 text-right">{row.total}</td>
                                  </tr>
                               ))}
                            </tbody>
                         </table>
                      )}
                   </div>

                   {/* SBA Projects */}
                   <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-950">
                      <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                         <h4 className="text-sm font-medium text-zinc-900 dark:text-white">KNEC SBA Projects</h4>
                         <span className="text-xs text-zinc-400">{cbcProjectsHub.submissionRate}% submission rate</span>
                      </div>
                      <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-[240px] overflow-y-auto">
                         {cbcProjectsHub.activeProjects.length === 0 ? (
                            <div className="p-8 text-center text-sm text-zinc-400">No SBA projects registered yet for this term.</div>
                         ) : cbcProjectsHub.activeProjects.map((p: any) => (
                            <div key={p.id} className="px-6 py-3 flex items-center justify-between">
                               <div>
                                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{p.title}</p>
                                  <p className="text-xs text-zinc-400">{p.learning_area?.name || 'General'}</p>
                               </div>
                               <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{p.submissionCount} portfolios</span>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>
             )}

             {/* 3. FINANCE & TREASURY TAB */}
             {activeMainTab === 'finance' && (
                <div data-ai-context="finance-treasury-canvas" className="space-y-6 animate-in fade-in duration-500">
                   <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                     <div>
                        <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Finance & Treasury</h3>
                        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">Fee collections, outstanding balances and arrears tracking</p>
                     </div>
                     <select
                        value={selectedFinanceTerm}
                        onChange={(e) => setSelectedFinanceTerm(e.target.value)}
                        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-700 dark:text-zinc-300 rounded-xl px-4 py-2.5 outline-none shadow-sm cursor-pointer min-w-[180px]"
                     >
                        <option value="CURRENT">Active Term ({currentTerm?.name || 'N/A'})</option>
                        {data?.terms?.map((t: any) => (
                           <option key={t.id} value={t.id}>{t.name} {t.year || ''}</option>
                        ))}
                     </select>
                   </div>

                   {/* Key Metrics */}
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                         <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Fees Collected</p>
                         <p className="text-2xl font-semibold text-zinc-900 dark:text-white">KES {formatCurrency(feesCollected).replace(/[^\d.,]/g,'') || '0'}</p>
                         <p className="text-xs text-zinc-400 mt-1">{financeEfficiency}% collection rate</p>
                      </div>
                      <div className="p-5 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30">
                         <p className="text-xs text-rose-500 mb-1">Outstanding Arrears</p>
                         <p className="text-2xl font-semibold text-rose-600 dark:text-rose-400">KES {formatCurrency(arrears).replace(/[^\d.,]/g,'') || '0'}</p>
                         <p className="text-xs text-zinc-400 mt-1">unpaid this term</p>
                      </div>
                      <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                         <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Total Billed</p>
                         <p className="text-2xl font-semibold text-zinc-900 dark:text-white">KES {formatCurrency(totalDue).replace(/[^\d.,]/g,'') || '0'}</p>
                         <p className="text-xs text-zinc-400 mt-1">across all students</p>
                      </div>
                   </div>

                   {/* Arrears by Stream */}
                   <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-950">
                      <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                         <h4 className="text-sm font-medium text-zinc-900 dark:text-white">Arrears by Class & Stream</h4>
                         <span className="text-xs text-zinc-400">{streamArrears.length} streams with balances</span>
                      </div>
                      <div className="max-h-[380px] overflow-y-auto">
                         {streamArrears.length === 0 ? (
                            <div className="p-8 text-center text-sm text-zinc-400">All fees have been cleared. No outstanding balances.</div>
                         ) : (
                            <table className="w-full">
                               <thead>
                                  <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                                     <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider text-left">Class / Stream</th>
                                     <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">Outstanding (KES)</th>
                                     <th className="px-6 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider text-right">Paid</th>
                                  </tr>
                               </thead>
                               <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                  {streamArrears.map((s: any) => (
                                     <tr key={s.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors">
                                        <td className="px-6 py-3">
                                           <p className="text-sm font-medium text-zinc-900 dark:text-white">{s.className} — {s.name}</p>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                           <span className={cn("text-sm font-semibold", s.arrears > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600')}>
                                              {formatCurrency(s.arrears).replace(/[^\d.,]/g,'')}
                                           </span>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                           <div className="flex items-center justify-end gap-2">
                                              <div className="w-16 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                                                 <div className={cn("h-full rounded-full", s.percentage >= 70 ? 'bg-emerald-500' : s.percentage >= 40 ? 'bg-amber-500' : 'bg-rose-500')} style={{width:`${s.percentage}%`}}></div>
                                              </div>
                                              <span className="text-xs text-zinc-400 w-8">{s.percentage}%</span>
                                              <button onClick={() => downloadStreamArrears(s.id, `${s.className} ${s.name}`)} className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors" title="Export CSV">
                                                 <Download size={14}/>
                                              </button>
                                           </div>
                                        </td>
                                     </tr>
                                  ))}
                               </tbody>
                            </table>
                         )}
                      </div>
                   </div>
                </div>
             )}
          </div>

         {/* LIVE ACTIVITY FEED (Right Sidebar, 4 Columns) */}
         <div data-ai-context="live-activity-feed" className="lg:col-span-4 space-y-6">
           <aside className="w-full space-y-6 animate-in slide-in-from-bottom duration-700">
             <Card className="flex flex-col border-0 rounded-2xl shadow-sm overflow-hidden bg-white" style={{height: 'calc(100vh - 200px)', minHeight: '500px'}}>
             {/* Colorful modern header */}
             <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 px-6 py-5">
               <div className="flex items-center justify-between">
                 <div>
                   <h2 className="text-base font-bold text-white">Latest Updates</h2>
                   <p className="text-[10px] text-white/60 mt-0.5 uppercase tracking-wider">School broadcasts & alerts</p>
                 </div>
                 
                 <div className="relative flex items-center gap-3">
                   <button 
                     onClick={() => setShowAddMenu(!showAddMenu)}
                     className={cn(
                       "w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 bg-white/10 text-white hover:bg-white/20",
                       showAddMenu && "rotate-45"
                     )}
                    >
                     <Plus size={16} />
                   </button>

                   {showAddMenu && (
                      <div className="absolute right-0 top-12 w-56 bg-zinc-900 text-white rounded-3xl shadow-2xl p-2 z-[70] animate-in fade-in zoom-in-95 duration-200 border border-white/10">
                        <button 
                          onClick={() => { setShowAnnounceModal(true); setShowAddMenu(false); }}
                          className="w-full text-left p-4 hover:bg-white/10 rounded-2xl transition-colors group"
                        >
                          <p className="text-[9px] font-black uppercase text-white group-hover:translate-x-1 transition-transform tracking-widest">Broadcast Announcement</p>
                        </button>
                        <div className="h-px bg-white/5 my-1 mx-2"></div>
                        <button 
                          onClick={() => { setShowEventModal(true); setShowAddMenu(false); }}
                          className="w-full text-left p-4 hover:bg-white/10 rounded-2xl transition-colors group"
                        >
                          <p className="text-[9px] font-black uppercase text-white group-hover:translate-x-1 transition-transform tracking-widest">Schedule Event</p>
                        </button>
                        <div className="h-px bg-white/5 my-1 mx-2"></div>
                        <button 
                          onClick={() => { handleDataCleanup(); setShowAddMenu(false); }}
                          className="w-full text-left p-4 hover:bg-rose-500/20 rounded-2xl transition-colors group"
                        >
                          <p className="text-[9px] font-black uppercase text-rose-400 transition-transform tracking-widest">System Cleanup</p>
                        </button>
                      </div>
                   )}
                 </div>
               </div>
             </div>

             {/* Filter bar */}
             <div className="px-4 py-2 border-b border-zinc-100 flex items-center gap-2">
               <select
                 value={activityFilter}
                 onChange={(e) => setActivityFilter(e.target.value)}
                 className="bg-zinc-50 border border-zinc-100 text-[10px] font-medium text-zinc-600 outline-none cursor-pointer px-3 py-1.5 rounded-lg flex-1"
               >
                 <option value="ALL">All Updates</option>
                 <option value="EVT">Events</option>
                 <option value="ANN">Announcements</option>
                 <option value="CBC_ALERT">CBC Alerts</option>
               </select>
             </div>

            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 scroll-smooth">
              {([...(data?.events || []), ...(data?.announcements || []), ...cbcComplianceAlerts]
                .filter(item => {
                  if (activityFilter === 'ALL') return true;
                  if (activityFilter === 'EVT') return !!(item as any).date;
                  if (activityFilter === 'ANN') return !!(item as any).content && !(item as any).type;
                  if (activityFilter === 'CBC_ALERT') return (item as any).type === 'CBC_ALERT';
                  return true;
                })
                .sort((a, b) => new Date(b.created_at || b.date || new Date()).getTime() - new Date(a.created_at || a.date || new Date()).getTime())
                .map((item: any, idx: number) => {
                  const isEvent = !!item.date;
                  const isCbcAlert = item.type === 'CBC_ALERT';
                  const author = isCbcAlert ? item.author_name : (data?.teachers?.find((t: any) => t.id === item.author_id)?.full_name || (item.author_id === user.id ? user.full_name : 'System'));
                  
                  return (
                    <div key={idx} className="group relative py-3 border-b border-zinc-100 last:border-0 hover:bg-zinc-50/50 transition-colors px-2 rounded-xl">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full", 
                          isCbcAlert ? "bg-rose-100 text-rose-700" : (isEvent ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700")
                        )}>
                          {isCbcAlert ? 'CBC Alert' : (isEvent ? 'Event' : 'Notice')}
                        </span>
                        <span className="text-[9px] font-bold text-zinc-400">
                          {new Date(item.created_at || item.date).toLocaleDateString()}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-zinc-900 group-hover:text-zinc-600 transition-colors">{item.title}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2 leading-relaxed">
                        {isEvent ? item.description : item.content}
                      </p>
                      <div className="mt-2 text-[9px] font-medium text-zinc-400 uppercase tracking-wide">
                         By {author}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat with Matta ED button */}
            <div className="px-4 py-3 border-t border-zinc-100">
               <button className="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-700 text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-violet-500/25">
                 <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white shrink-0">
                   <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="currentColor" fillOpacity="0.2"/>
                   <circle cx="12" cy="12" r="3" fill="currentColor"/>
                   <path d="M12 5v2M12 17v2M5 12H7M17 12h2M7.05 7.05l1.41 1.41M15.54 15.54l1.41 1.41M7.05 16.95l1.41-1.41M15.54 8.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                 </svg>
                 Chat with Matta ED
               </button>
             </div>
          </Card>
        </aside>

      {/* Mobile View Social Activity (Visible only on small screens) */}
      <section className="lg:hidden space-y-6 pt-12 border-t border-zinc-100">
        <h2 className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.2em]">Latest Updates</h2>
        <div className="space-y-4">
           {/* Simplified mobile list */}
        </div>
      </section>
      </div>
      </div>


      {/* DRILL DOWN MODAL */}
      <Modal
        isOpen={drillDown.open}
        onClose={() => setDrillDown({ ...drillDown, open: false })}
        title={drillDown.title}
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
            <span className="text-[9px] font-black text-zinc-400 uppercase">Student Name</span>
            <span className="text-[9px] font-black text-zinc-400 uppercase">Admission No.</span>
          </div>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {drillDown.students.map((res: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center py-2 border-b border-zinc-50 hover:bg-zinc-50 px-2 rounded-lg transition-colors group">
                <span className="text-xs font-bold text-zinc-900 uppercase tracking-tight">{res.student?.profile?.full_name || res.profile?.full_name || 'Unknown Student'}</span>
                <span className="text-xs font-black text-zinc-500 tabular-nums uppercase p-1 bg-zinc-100 rounded group-hover:bg-zinc-900 group-hover:text-white transition-colors">{res.student?.adm_no || res.adm_no}</span>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* CREATION MODALS */}
      <Modal isOpen={showAnnounceModal} onClose={() => setShowAnnounceModal(false)} title="New Institution Broadcast">
        <form onSubmit={handleCreateAnnouncement} className="p-8 space-y-6">
          <div className="space-y-1">
             <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest pl-2">Subject Line</label>
             <input 
               value={announceForm.title} onChange={e => setAnnounceForm({...announceForm, title: e.target.value})}
               placeholder="URGENT: TERM 1 REPORTING DATES"
               className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-xs font-bold outline-none focus:ring-2 focus:ring-zinc-900/5"
             />
          </div>
          <div className="space-y-1">
             <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest pl-2">Broadcast Content</label>
             <textarea 
               value={announceForm.content} onChange={e => setAnnounceForm({...announceForm, content: e.target.value})}
               rows={4}
               placeholder="Draft your official notice here..."
               className="w-full bg-zinc-50 border border-zinc-100 rounded-3xl p-6 text-xs font-medium outline-none focus:ring-2 focus:ring-zinc-900/5 resize-none"
             />
          </div>
          <div className="space-y-1">
             <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest pl-2">Target Audience</label>
             <div className="flex bg-zinc-100 p-1 rounded-2xl">
                {['ALL', 'TEACHER', 'PARENT'].map(t => (
                  <button 
                    key={t}
                    type="button"
                    onClick={() => setAnnounceForm({...announceForm, target: t as any})}
                    className={cn("flex-1 py-2 text-[8px] font-black uppercase rounded-xl transition-all", announceForm.target === t ? "bg-white shadow-sm text-zinc-900" : "text-zinc-400")}
                  >
                    {t}
                  </button>
                ))}
             </div>
          </div>
          <Button type="submit" className="w-full" disabled={isSaving}>{isSaving ? 'PUBLISHING...' : 'PUBLISH BROADCAST'}</Button>
        </form>
      </Modal>

      <Modal isOpen={showEventModal} onClose={() => setShowEventModal(false)} title="Schedule Institutional Event">
        <form onSubmit={handleCreateEvent} className="p-8 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1 col-span-2">
              <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest pl-2">Event Title</label>
              <input value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-xs font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest pl-2">Date</label>
              <input type="date" value={eventForm.date} onChange={e => setEventForm({...eventForm, date: e.target.value})} className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-xs font-bold" />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest pl-2">Location</label>
              <input value={eventForm.location} onChange={e => setEventForm({...eventForm, location: e.target.value})} placeholder="Main Hall, Field, etc" className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-xs font-bold" />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-[9px] font-black uppercase text-zinc-400 tracking-widest pl-2">Details/Agenda</label>
              <textarea value={eventForm.description} onChange={e => setEventForm({...eventForm, description: e.target.value})} rows={3} className="w-full bg-zinc-50 border border-zinc-100 rounded-3xl p-6 text-xs font-medium resize-none" />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isSaving}>{isSaving ? 'SCHEDULING...' : 'SCHEDULE EVENT'}</Button>
        </form>
      </Modal>

    </div>
  );
};

const CompactStat = ({ label, value }: any) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{label}</span>
    <span className="text-xl font-black text-zinc-900 tracking-tighter uppercase tabular-nums">{value}</span>
  </div>
);


/* -------------------------------------------------------------------------- */
/*                               SHARED COMPONENTS                            */
/* -------------------------------------------------------------------------- */


/* -------------------------------------------------------------------------- */
const DashboardSkeleton = () => (
  <div className="w-full px-4 lg:px-8 py-10 space-y-16 animate-pulse bg-white">
    {/* Welcome Section & Metrics Skeleton */}
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 bg-zinc-950 p-8 lg:p-12 rounded-[2.5rem] shadow-2xl overflow-hidden">
      <div className="space-y-4 lg:w-1/2">
        <div className="h-3 w-32 bg-zinc-800 rounded-full" />
        <div className="h-10 w-72 bg-zinc-800 rounded-2xl" />
        <div className="h-4 w-48 bg-zinc-800 rounded-full" />
        <div className="h-6 w-64 bg-zinc-800/50 rounded-full pt-4" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:w-1/2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-2xl space-y-3">
            <div className="h-3 w-24 bg-zinc-800 rounded-full" />
            <div className="h-8 w-16 bg-zinc-700 rounded-xl" />
          </div>
        ))}
      </div>
    </div>

    {/* Main Grid Skeleton */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-12">
      <div className="lg:col-span-8 space-y-12 pb-20">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white border border-zinc-100 rounded-[2.5rem] p-8 lg:p-10 shadow-sm space-y-6">
            <div className="h-6 w-64 bg-zinc-100 rounded-xl" />
            <div className="h-4 w-96 bg-zinc-50 rounded-lg" />
            <div className="h-48 w-full bg-zinc-50 rounded-2xl" />
          </div>
        ))}
      </div>
      <div className="hidden lg:block lg:col-span-4 space-y-6">
        <div className="bg-white border border-zinc-100 rounded-[2.5rem] p-8 h-[820px] shadow-sm space-y-6">
          <div className="h-6 w-40 bg-zinc-100 rounded-xl" />
          <div className="space-y-4 pt-4">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="py-4 border-b border-zinc-50 space-y-2">
                <div className="h-3 w-20 bg-zinc-100 rounded-full" />
                <div className="h-4 w-full bg-zinc-100 rounded-lg" />
                <div className="h-3 w-32 bg-zinc-50 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

/*                                MAIN ENTRY POINT                             */
/* -------------------------------------------------------------------------- */
export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="w-full font-sans text-zinc-900 animate-in fade-in duration-500">
      <Toaster position="top-right" />
      {['PRINCIPAL', 'ADMIN'].includes(user.role) && <div className="px-2 lg:px-4 pt-0 pb-8"><PrincipalView user={user} /></div>}
      {user.role === 'TEACHER' && <div className="px-2 lg:px-4 py-8"><TeacherView user={user} /></div>}
      {(user.role === 'PARENT' || user.role === 'STUDENT') && <ParentStudentDashboard user={user} />}
    </div>
  );
};
