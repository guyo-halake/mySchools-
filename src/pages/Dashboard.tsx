import React, { useState, useEffect, useMemo } from 'react';
import { toast, Toaster } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
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
  Search
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
  const [data, setData] = useState<any>(null);
  const [targetTermId, setTargetTermId] = useState('');
  const [targetExamId, setTargetExamId] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [terms, setTerms] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [gradeBreakdown, setGradeBreakdown] = useState<any>(null);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
  const [meanInput, setMeanInput] = useState('');
  const [targetInput, setTargetInput] = useState('');

  const gradeFromScore = (value?: number | null) => {
    if (value == null || Number.isNaN(value)) return '-';
    if (value >= 80) return 'A';
    if (value >= 70) return 'B';
    if (value >= 60) return 'C';
    if (value >= 50) return 'D';
    return 'E';
  };

  const formatScoreGrade = (value?: number | null) => {
    if (value == null || Number.isNaN(value)) return '-';
    const score = Number(value);
    return `${score.toFixed(1)}% (${gradeFromScore(score)})`;
  };

  const parseScore = (value: string) => {
    if (!value.trim()) return null;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      throw new Error('Scores must be between 0 and 100.');
    }
    return parsed;
  };

  const [allStreams, setAllStreams] = useState<any[]>([]);
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(localStorage.getItem('selectedStreamId'));

  // Persist class selection
  useEffect(() => {
    if (selectedStreamId) {
      localStorage.setItem('selectedStreamId', selectedStreamId);
    }
  }, [selectedStreamId]);

  const [performanceTrend, setPerformanceTrend] = useState<any[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);
  const [subjectData, setSubjectData] = useState<any[]>([]);
  const [rankingData, setRankingData] = useState<any[]>([]);
  const [activeGraphTab, setActiveGraphTab] = useState<'trends' | 'comparison' | 'subjects' | 'rankings'>('trends');
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const capitalizedName = user.username || user.full_name?.split(' ')[0] || 'User';
  const mainMean = formatScoreGrade(data?.stream?.main_mean_score);
  const targetMean = formatScoreGrade(data?.stream?.target_mean_score);

  // 1. Core Data Hydration (Institutional Constants)
  const hydrate = async () => {
    setIsInitialLoading(true);
    try {
      const [streamRows, termRows, examRows, apps, notifs] = await Promise.all([
        api.getTeacherStreams(user.id),
        user.school_id ? api.getTerms(user.school_id) : Promise.resolve([]),
        user.school_id ? api.getExams(user.school_id) : Promise.resolve([]),
        api.getAppointmentsByTeacher(user.id),
        api.getNotifications(user.id)
      ]);

      setAllStreams(streamRows);
      setTerms(termRows || []);
      setExams(examRows || []);
      setNotifications(notifs || []);
      setData(prev => ({ ...prev, appointments: apps || [] }));

      if (streamRows.length > 0) {
        const savedStreamId = localStorage.getItem('teacher_dashboard_stream_id');
        const defaultStream = streamRows.find(s => s.id === savedStreamId) || streamRows[0];
        setSelectedStreamId(defaultStream.id);
      }
    } catch (err) {
      console.error("Hydration Error:", err);
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    hydrate();
    
    // Notification Watchdog: Polling for new broadcasts every 15s
    const pollInterval = setInterval(async () => {
       const notifs = await api.getNotifications(user.id);
       setNotifications(prev => {
          const newNotifs = notifs.filter(n => !n.is_read && !prev.find(p => p.id === n.id));
          newNotifs.forEach(n => {
             toast(n.message, {
                icon: n.type === 'EVENT' ? '📅' : '📢',
                duration: 6000,
                position: 'top-right',
                style: {
                   background: '#09090b',
                   color: '#fff',
                   fontSize: '11px',
                   lineHeight: '1.4',
                   fontWeight: '900',
                   borderRadius: '16px',
                   border: '1px solid #27272a',
                   padding: '16px',
                   boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                   textTransform: 'uppercase',
                   letterSpacing: '0.05em'
                }
             });
          });
          return notifs;
       });
    }, 15000);

    return () => clearInterval(pollInterval);
  }, [user.id, user.school_id]);

  const refreshDashboard = () => hydrate();

  // 2. Class Selection Differential (Performance Hub)
  useEffect(() => {
    if (!selectedStreamId) return;
    localStorage.setItem('teacher_dashboard_stream_id', selectedStreamId);

    const syncClassMetadata = async () => {
      try {
        const stream = allStreams.find(s => s.id === selectedStreamId);
        if (!stream) return;

        const [students, trend, comp, subjects, rankings] = await Promise.all([
          api.getStudentsByStream(selectedStreamId),
          api.getStreamPerformanceTrend(selectedStreamId),
          api.getStreamVsFormComparison(selectedStreamId),
          api.getStreamSubjectBreakdown(selectedStreamId),
          api.getStreamStudentRankings(selectedStreamId)
        ]);

        setData(prev => ({
          ...prev,
          stream,
          students
        }));

        setPerformanceTrend(trend || []);
        setComparisonData(comp || []);
        setSubjectData(subjects || []);
        setRankingData(rankings || []);

        setMeanInput(stream.main_mean_score?.toString() || '');
        setTargetInput(stream.target_mean_score?.toString() || '');
        setTargetTermId(stream.target_term_id || '');
        setTargetExamId(stream.target_exam_id || '');
      } catch (err) {
        console.error("Class Sync Error:", err);
      }
    };
    syncClassMetadata();
  }, [selectedStreamId, allStreams]);

  const saveTargetSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data?.stream?.id) return;
    try {
      setSavingTarget(true);
      const updated = await api.updateStreamProfile(data.stream.id, {
        main_mean_score: parseScore(meanInput),
        target_mean_score: parseScore(targetInput),
        target_term_id: targetTermId || null,
        target_exam_id: targetExamId || null
      });
      setData((prev: any) => ({ ...prev, stream: updated || prev.stream }));
      setShowTargetModal(false);
    } catch (err: any) { alert('Failed to save settings'); }
    finally { setSavingTarget(false); }
  };

  const handlePointClick = async (point: any) => {
    if (!point || !point.activePayload || !point.activePayload[0]) return;
    const examName = point.activePayload[0].payload.name;
    const exam = exams.find(e => e.name === examName);
    if (exam && selectedStreamId) {
      setSelectedPointId(examName);
      try {
        const breakdown = await api.getExamGradeBreakdown(exam.id, selectedStreamId);
        setGradeBreakdown(breakdown);
        setShowGradeModal(true);
      } catch (err) {
        toast.error("Failed to load grade breakdown");
      }
    }
  };

  const updateAppStatus = async (appId: string, status: string) => {
    try {
      await api.updateAppointmentStatus(appId, status);
      toast.success(`Appointment ${status}`);
      // Refresh apps
      const apps = await api.getAppointmentsByTeacher(user.id);
      setData((prev: any) => ({ ...prev, appointments: apps }));
    } catch (err) {
      toast.error("Update failed");
    }
  };

  // If no streams are assigned at all
  if (!isInitialLoading && allStreams.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-zinc-400 gap-4">
        <Activity size={48} strokeWidth={1} />
        <div className="text-center">
          <p className="text-sm font-bold uppercase tracking-widest">No Assigned Streams Found</p>
          <p className="text-[10px] mt-2 opacity-60">Please contact the admin to be assigned as a Class Teacher.</p>
        </div>
      </div>
    );
  }

  if (!data || isInitialLoading) return (
    <div className="space-y-10 animate-pulse px-6 py-10">
      <div className="flex justify-between items-center mb-12">
        <div className="h-8 w-32 bg-zinc-100 rounded-xl" />
        <div className="h-8 w-32 bg-zinc-100 rounded-xl" />
      </div>
      <div className="h-10 w-64 bg-zinc-100 rounded-xl mb-8" />
      <div className="grid grid-cols-3 gap-8">
        {[1, 2, 3].map(i => <div key={i} className="h-32 bg-zinc-50 rounded-2xl" />)}
      </div>
      <div className="h-96 w-full bg-zinc-50 rounded-[2.5rem]" />
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* 0. Context Switcher (Top Bar) */}
      <div className="flex items-center justify-between">
        <div className="relative group">
          <select
            value={selectedStreamId || ''}
            onChange={(e) => setSelectedStreamId(e.target.value)}
            className="appearance-none bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-2 pr-10 text-[10px] font-black uppercase tracking-widest text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all cursor-pointer shadow-sm hover:shadow-md hover:translate-y-[-1px]"
          >
            <option value="" disabled>Select Class</option>
            {allStreams.map(s => (
              <option key={s.id} value={s.id}>
                {s.class?.name} {s.name}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
            <ChevronRight size={14} className="rotate-90" />
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={refreshDashboard}
            className="p-2 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all shadow-sm hover:shadow-md"
            title="Refresh Dashboard"
          >
            <RefreshCcw size={14} className={isInitialLoading ? 'animate-spin' : ''} />
          </button>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Live Analytics</span>
          </div>
        </div>
      </div>

      {/* 1. Normal Greetings */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950 capitalize">{getGreeting()}, {capitalizedName}</h1>
          <p className="text-zinc-500 font-medium">Teacher Dashboard • {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          {data?.stream && (
            <div className="mt-4 flex items-center gap-2">
              <span className="px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md text-[10px] font-bold uppercase tracking-wider uppercase">
                {data.stream.class?.name} {data.stream.name} Lead
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <SimpleButton to="/results-management" label="Record Results" icon={<Target size={14} />} />
          <SimpleButton to="/my-students" label="My Students" icon={<Users size={14} />} />
          <SimpleButton to="/my-class" label="Classroom" icon={<BookOpen size={14} />} />
        </div>
      </div>

      {/* 2. Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        <StatBox label="My Students" value={data.students?.length || 0} />
        <div className="space-y-1 relative group">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">Class Mean Score</p>
          <p className="text-2xl font-bold tracking-tight text-zinc-900">{mainMean}</p>
          <button
            onClick={() => setShowTargetModal(true)}
            className="text-[9px] font-bold text-zinc-400 uppercase hover:text-zinc-900 transition-colors"
          >
            Edit Mean & Target
          </button>
        </div>
        <StatBox label="Target Mean" value={targetMean} />
      </div>

      {/* 3. Performance Tests Hub */}
      <div className="bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">Performance Tests</h2>
            <p className="text-[10px] text-zinc-400 font-medium uppercase mt-1">Classroom Analytics & Benchmarking</p>
          </div>

          <div className="flex p-1 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
            {(['trends', 'comparison', 'subjects', 'rankings'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setActiveGraphTab(t)}
                className={`px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${activeGraphTab === t
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-600"
                  }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className={`${activeGraphTab === 'trends' && performanceTrend.length === 0 ? 'h-[150px]' : 'h-[350px]'} w-full transition-all duration-500`}>
          <ResponsiveContainer width="100%" height="100%">
            {activeGraphTab === 'trends' ? (
              performanceTrend.length > 0 ? (
                <AreaChart data={performanceTrend} onClick={handlePointClick}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} dy={10} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} dx={-10} />
                  <Tooltip
                    cursor={{ stroke: '#3b82f6', strokeWidth: 1 }}
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 shadow-xl scale-110 transition-transform">
                            <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">{payload[0].payload.name}</p>
                            <p className="text-lg font-black text-zinc-900 dark:text-white">{payload[0].value}%</p>
                            <p className="text-[9px] text-zinc-400 font-bold uppercase mt-2">Click to view grade breakdown</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="score"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorScore)"
                    activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                  />
                </AreaChart>
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-300 flex-col gap-2">
                  <Activity size={32} strokeWidth={1} />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No historical data available</p>
                </div>
              )
            ) : activeGraphTab === 'comparison' ? (
              <LineChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} dy={10} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} dx={-10} />
                <Tooltip />
                <Line type="monotone" dataKey="myClass" name="My Class" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="gradeAvg" name="Grade Average" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} />
              </LineChart>
            ) : activeGraphTab === 'subjects' ? (
              <BarChart data={subjectData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} dy={10} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} dx={-10} />
                <Tooltip cursor={{ fill: '#f8fafc' }} />
                <Bar dataKey="score" name="Mean Score" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            ) : (
              <BarChart data={rankingData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} width={80} />
                <Tooltip />
                <Bar dataKey="score" name="Overall Mean" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* 4. Appointments & Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-8 space-y-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-zinc-400" />
              <h2 className="text-sm font-semibold">Teacher Appointments</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {(data.appointments || []).length > 0 ? (data.appointments || []).map((app: any) => (
              <div key={app.id} className="p-6 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md transition-all group">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black ${app.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-50 text-zinc-400'}`}>
                    {app.parent?.full_name?.[0]}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-white">{app.parent?.full_name}</h4>
                      {app.status === 'approved' && <Badge label="Approved" variant="emerald" />}
                      {app.status === 'holding' && <Badge label="On Hold" variant="warning" />}
                    </div>
                    <p className="text-[10px] text-zinc-400 font-medium uppercase mt-0.5">{app.reason}</p>
                    <div className="flex gap-4 mt-2 text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1.5"><Clock size={10} /> {app.appointment_time}</span>
                      <span className="flex items-center gap-1.5"><Calendar size={10} /> {new Date(app.appointment_date).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1.5"><Bell size={10} /> {app.parent?.phone || app.parent?.email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateAppStatus(app.id, 'approved')}
                    className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => updateAppStatus(app.id, 'holding')}
                    className="px-4 py-2 bg-zinc-50 dark:bg-zinc-900 text-zinc-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-zinc-600 transition-all border border-zinc-100 dark:border-zinc-800"
                  >
                    Hold
                  </button>
                  <Link
                    to={`/chat?parent=${app.parent_id}`}
                    className="p-2.5 bg-zinc-50 dark:bg-zinc-900 text-zinc-400 rounded-xl border border-zinc-100 dark:border-zinc-800 hover:text-zinc-900 dark:hover:text-white transition-all"
                  >
                    <MessageSquare size={16} />
                  </Link>
                </div>
              </div>
            )) : (
              <div className="py-12 text-center border-2 border-dashed border-zinc-50 rounded-3xl">
                <Calendar size={32} className="mx-auto text-zinc-200 mb-2" />
                <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">No upcoming records</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={14} className="text-zinc-400" />
            <h2 className="text-sm font-semibold">Notifications</h2>
          </div>
          <div className="space-y-3">
            {notifications.length > 0 ? notifications.slice(0, 5).map((notif: any) => (
              <div key={notif.id} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 space-y-1 group hover:border-zinc-200 transition-all">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex justify-between">
                  {notif.type || 'Alert'}
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">Just Now</span>
                </p>
                <p className="text-xs font-semibold text-zinc-900 dark:text-white">{notif.title}</p>
                <p className="text-[10px] font-medium text-zinc-500 leading-relaxed line-clamp-2">{notif.message}</p>
              </div>
            )) : (
              <div className="py-8 text-center bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-100">
                <p className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">No new notifications</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={showGradeModal} onClose={() => setShowGradeModal(false)} title={`Grade Breakdown: ${selectedPointId}`}>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-5 gap-4">
            {gradeBreakdown && Object.entries(gradeBreakdown).map(([grade, count]: any) => (
              <div key={grade} className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-2xl text-center border border-zinc-100 dark:border-zinc-800">
                <p className="text-2xl font-black text-zinc-900 dark:text-white">{count}</p>
                <p className="text-[10px] font-black text-zinc-400 uppercase mt-1">{grade}</p>
              </div>
            ))}
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <p className="text-[11px] font-medium text-zinc-500 leading-relaxed text-center">
              This breakdown represents the performance distribution of all students in {data.stream?.name} for this specific assessment.
            </p>
          </div>
          <Button onClick={() => setShowGradeModal(false)} fullWidth>Close Details</Button>
        </div>
      </Modal>

      <Modal isOpen={showTargetModal} onClose={() => setShowTargetModal(false)} title="Class Target Settings">
        <form onSubmit={saveTargetSettings} className="space-y-4 p-2">
          <InputRow label="Current Mean Score (%)" value={meanInput} onChange={setMeanInput} />
          <InputRow label="Target Mean Score (%)" value={targetInput} onChange={setTargetInput} />
          <div className="pt-4 grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" onClick={() => setShowTargetModal(false)}>Cancel</Button>
            <Button type="submit" disabled={savingTarget}>{savingTarget ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>
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
  // Results Filters
  const [activeFormTab, setActiveFormTab] = useState(1);
  const [selectedAcademicTerm, setSelectedAcademicTerm] = useState('CURRENT');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState(new Date().getFullYear());
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
    if (!data?.terms) return { currentTerm: null, prevTerm: null, nextTerm: null };
    const now = new Date().toISOString().slice(0, 10);
    
    // Sort terms to find relative positions
    const sortedTerms = [...data.terms].sort((a, b) => b.start_date.localeCompare(a.start_date));
    
    // Current Active Term
    const active = sortedTerms.find(t => now >= t.start_date && now <= t.end_date) || sortedTerms.find(t => t.start_date <= now) || sortedTerms[0];
    const activeIndex = sortedTerms.indexOf(active);
    
    // Previous Term (for trends)
    const prev = sortedTerms[activeIndex + 1] || null;
    
    // Next Term (for upcoming view)
    const next = data.terms.filter((t: any) => t.start_date > now).sort((a: any, b: any) => a.start_date.localeCompare(b.start_date))[0] || null;

    return { currentTerm: active, prevTerm: prev, nextTerm: next };
  }, [data?.terms]);

  // --- Advanced Financial Filtering Logic ---
  const filteredFinanceFees = useMemo(() => {
    if (!data?.fees) return [];

    let filtered = [...data.fees];

    // 1. Term Filter
    if (selectedFinanceTerm === 'CURRENT') {
      const now = new Date().toISOString().slice(0, 10);
      const activeTerm = data.terms?.find((t: any) => now >= t.start_date && now <= t.end_date)
        || data.terms?.filter((t: any) => t.start_date <= now).sort((a: any, b: any) => b.start_date.localeCompare(a.start_date))[0]
        || data.terms?.[0];
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

    console.log(`[ACADEMIC AUDIT] Filtering Form ${activeFormTab} for Term ${activeTermId}, Year ${activeYear}`);
    
    const formResults = data.results.filter((r: any) => {
       const classLevel = r.student?.stream?.class?.level;
       return classLevel === activeFormTab;
    });

    const termFilteredResults = formResults.filter((r: any) => {
       // Support both published exams and live workflow entries
       const exam = r.exam || r.exams;
       const resultTermId = exam?.term_id || r.term_id;
       
       if (!resultTermId) return false;
       
       const term = data.terms?.find((t: any) => t.id === resultTermId);
       const matchesTerm = (resultTermId === activeTermId);
       const matchesYear = term && (term.year === Number(activeYear));
       
       return matchesTerm && matchesYear;
    });

    console.log(`[ACADEMIC AUDIT] Found ${termFilteredResults.length} records matching Term/Year criteria.`);

    const prevResults = prevTerm ? formResults.filter((r: any) => r.term_id === prevTerm.id) : [];

    const calculateMean = (res: any[]) => res.length > 0 ? (res.reduce((acc, r) => acc + (Number(r.points) || 0), 0) / res.length).toFixed(1) : '0.0';

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
    try {
      // TIER 1: Essential Config & High-Level Metrics
      const [terms, stats, school] = await Promise.all([
        api.getTerms(user.school_id),
        api.getFinancialSummary(user.school_id), // Simplified call
        api.getSchool(user.school_id)
      ]);

      const currentTermRes = terms?.find((t: any) => t.is_current) || terms?.[0];
      
      // Update first-render data
      setData((prev: any) => ({ ...prev, terms, school, financialSummary: stats }));

      // TIER 2: Secondary Metadata (Parallel background)
      const [students, teachers, classes, streams] = await Promise.all([
        api.getStudents(user.school_id),
        api.getTeachers(user.school_id),
        api.getClasses(user.school_id),
        api.getStreamsWithDetails(user.school_id)
      ]);

      setData((prev: any) => ({ ...prev, students, teachers, classes, streams }));

      // TIER 3: Heavy Ledgers (Lazy)
      const [results, fees, events, announcements, discipline] = await Promise.all([
        api.getResults(user.school_id),
        api.getFeesFull(user.school_id),
        api.getEvents(user.school_id),
        api.getAnnouncements(user.school_id),
        api.getDisciplinarySchoolWide(user.school_id)
      ]);
      
      const arrearsByStream = await api.getArrearsByStream(user.school_id, currentTermRes?.id);

      // Principal/Admin Sync: Mapping UI 'PRINCIPAL' to DB 'ADMIN' for operations
      // const effectiveRole = user.role === 'PRINCIPAL' ? 'ADMIN' : user.role;
      setData((prev: any) => ({ 
        ...prev, 
        results, fees, events, announcements,
        discipline, arrearsByStream 
      }));
    } catch (err) {
      console.error('Data acquisition failed:', err);
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
        rsvps: [],
        theme: 'standard'
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

  const metrics = useMemo(() => {
    if (!data) return { feesCollected: 0, totalDue: 0, arrears: 0, efficiency: 0 };
    const collected = filteredFinanceFees.reduce((acc: number, f: any) => acc + (Number(f.amount_paid) || 0), 0);
    const due = filteredFinanceFees.reduce((acc: number, f: any) => acc + (Number(f.amount_due) || 0), 0);
    const balance = due - collected;
    const efficiency = due > 0 ? Math.round((collected / due) * 100) : 0;
    return { feesCollected: collected, totalDue: due, arrears: balance, efficiency };
  }, [filteredFinanceFees, data]);



  const { feesCollected, totalDue, arrears, efficiency: financeEfficiency } = metrics;

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

  // --- Results Aggregation & Filtering ---
  const getGradeCount = (streamId: string, grade: string) => {
    return (data.results || []).filter((r: any) => r.stream_id === streamId && r.grade === grade);
  };

  const filteredStreams = data.streams.filter((s: any) => {
    const matchesForm = resFormId === 'ALL' || s.class_id === resFormId;
    const matchesStream = resStreamId === 'ALL' || s.id === resStreamId;
    const matchesSearch = !resultsSearch ||
      s.class?.name?.toLowerCase().includes(resultsSearch.toLowerCase()) ||
      s.teacher?.full_name?.toLowerCase().includes(resultsSearch.toLowerCase()) ||
      s.name?.toLowerCase().includes(resultsSearch.toLowerCase());

    const matchesGrade = resGradeFilter === 'ALL' ||
      (data.results || []).some((r: any) => r.stream_id === s.id && r.grade === resGradeFilter);

    return matchesForm && matchesStream && matchesSearch && matchesGrade;
  });

  const getPrefix = (name: any) => {
    if (!name || typeof name !== 'string') return 'Mr./Ms.';
    const n = name.toLowerCase();
    if (n.includes('mrs') || n.includes('lady') || n.includes('jane') || n.endsWith('a') || n.includes('mary')) return 'Mrs.';
    return 'Mr.';
  };

  return (
    <div className="w-full px-4 lg:px-8 py-10 space-y-16 animate-in fade-in duration-700 font-inter text-zinc-900 bg-white">

      {/* WELCOME SECTION */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-900"></div>
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">School Management</span>
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-zinc-900">
            {getGreeting()}, {getPrefix(user?.full_name)} {user?.full_name?.split(' ')[0]}
          </h1>
          <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.2em] italic">Principal's Overview</p>
        </div>

        <div className="text-right space-y-1 border-l-0 md:border-l border-zinc-100 md:pl-8">
          <p className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">
            Today is {currentTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
          </p>
          <p className="text-[11px] font-black text-zinc-400 tabular-nums uppercase">
            {currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <div className="pt-2 flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-[8px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em]",
                (currentTerm && new Date().toISOString().slice(0, 10) >= currentTerm.start_date && new Date().toISOString().slice(0, 10) <= currentTerm.end_date)
                  ? "bg-zinc-900 text-white"
                  : "bg-rose-50 text-rose-500 border border-rose-100"
              )}>
                {(currentTerm && new Date().toISOString().slice(0, 10) >= currentTerm.start_date && new Date().toISOString().slice(0, 10) <= currentTerm.end_date)
                  ? `${currentTerm.name} ${currentTerm.year}`
                  : 'System on Break / Holiday'}
              </span>
              {!(currentTerm && new Date().toISOString().slice(0, 10) >= currentTerm.start_date && new Date().toISOString().slice(0, 10) <= currentTerm.end_date) && nextTerm && (
                <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                  Next term would be <span className="text-zinc-900">{nextTerm.name}</span> starting {new Date(nextTerm.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long' })}
                </p>
              )}
            </div>
            <Link to="/calendar" className="text-[8px] font-black text-zinc-400 hover:text-zinc-900 transition-colors uppercase tracking-[0.2em] border-b border-transparent hover:border-zinc-200 pb-0.5">
              {(!currentTerm || (new Date().toISOString().slice(0, 10) > currentTerm.end_date))
                ? 'Manage Next Term Schedule'
                : 'Manage Calendar'}
            </Link>
          </div>
        </div>
      </section>

      {/* 1. DATA STRIP */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-y border-zinc-100 py-8">
        <div className="space-y-0.5">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-black tracking-tight text-zinc-900 uppercase">School Population</h2>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <p className="text-[9px] font-black text-zinc-900 uppercase tracking-[0.2em] px-4 py-2 bg-zinc-50 rounded-full border border-zinc-100">Live Status: Operational</p>
        </div>
        <div className="flex flex-wrap gap-12">
          <CompactStat label="Students" value={data.students?.length || 0} />
          <CompactStat label="Staff" value={data.teachers?.length || 0} />
          <CompactStat label="Revenue" value={`${data.financialSummary?.efficiency || 0}%`} />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mt-12">
        <div className="lg:col-span-8 space-y-12 pb-20">
          {/* 2. FINANCIAL STATUS (ADVANCED FILTERS) */}
          <section className="space-y-8">

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-50 pb-6">
          <div className="space-y-1">
            <h2 className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.3em]">School Finance</h2>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* TERM PICKER */}
            <select
              value={selectedFinanceTerm}
              onChange={(e) => setSelectedFinanceTerm(e.target.value)}
              className="bg-transparent border-none text-[9px] font-black uppercase tracking-widest outline-none cursor-pointer text-zinc-500 hover:text-zinc-900 transition-colors py-2"
            >
              <option value="CURRENT">This Term</option>
              <option value="YEAR">This Year (All Terms)</option>
              <optgroup label="Select Term">
                {data.terms?.filter((t: any, i: number, arr: any[]) => arr.findIndex(x => x.name === t.name && x.year === t.year) === i)
                  .sort((a: any, b: any) => b.year - a.year)
                  .map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name.includes(String(t.year)) ? t.name : `${t.name} ${t.year}`}
                    </option>
                  ))}
              </optgroup>
            </select>

            <div className="w-[1px] h-3 bg-zinc-100 hidden md:block"></div>

            {/* FILTER CATEGORY */}
            <select
              value={financeCategory}
              onChange={(e) => { setFinanceCategory(e.target.value); setFinanceValue('ALL'); }}
              className="bg-transparent border-none text-[9px] font-black uppercase tracking-widest outline-none cursor-pointer text-zinc-500 hover:text-zinc-900 transition-colors py-2"
            >
              <option value="ALL">Filter By: None</option>
              <option value="FORM">By Form (Class)</option>
              <option value="STREAM">By Stream</option>
              <option value="TYPE">By Fee Type</option>
            </select>

            {/* FILTER VALUE */}
            {financeCategory !== 'ALL' && (
              <select
                value={financeValue}
                onChange={(e) => setFinanceValue(e.target.value)}
                className="bg-white border border-zinc-100 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest outline-none cursor-pointer"
              >
                <option value="ALL">Select {financeCategory}</option>
                {financeCategory === 'FORM' && data.classes?.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                {financeCategory === 'STREAM' && data.streams?.map((s: any) => <option key={s.id} value={s.id}>{s.class?.name} - {s.name}</option>)}
                {financeCategory === 'TYPE' && Array.from(new Set(data.fees?.map((f: any) => f.type))).map((t: any) => <option key={t} value={t}>{t}</option>)}
              </select>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
          <div className="space-y-2 group cursor-default">
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest transition-colors group-hover:text-zinc-900">
              Collections {selectedFinanceTerm === 'CURRENT' ? 'this term' : 'selected period'}
            </p>
            <h3 className="text-4xl font-black tracking-tighter text-zinc-900 tabular-nums">
              {formatCurrency(feesCollected).replace(/[^\d.,]/g, '').trim() || '0.00'}<span className="text-sm ml-2 text-zinc-300 font-bold uppercase">KES</span>
            </h3>
          </div>

          <div className="space-y-2 group cursor-default">
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest transition-colors group-hover:text-rose-500">
              Arrears {selectedFinanceTerm === 'CURRENT' ? 'this term' : 'selected period'}
            </p>
            <h3 className={cn("text-4xl font-black tracking-tighter tabular-nums", arrears > 0 ? "text-rose-500" : "text-zinc-900")}>
              {formatCurrency(arrears).replace(/[^\d.,]/g, '').trim() || '0.00'}<span className="text-sm ml-2 text-zinc-300 font-bold uppercase">KES</span>
            </h3>
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <button
            onClick={() => setShowArrears(!showArrears)}
            className="text-[9px] font-black uppercase text-zinc-400 hover:text-zinc-900 transition-colors border border-zinc-100 px-4 py-2 rounded-full flex items-center gap-2"
          >
            <div className={cn("w-1 h-1 rounded-full", showArrears ? "bg-zinc-900" : "bg-zinc-200")}></div>
            {showArrears ? 'Hide Detailed Breakdown' : 'Show Arrears Heat Map'}
          </button>
          <Link to="/principal-oversight" className="text-[9px] font-black uppercase text-zinc-400 hover:text-zinc-900 transition-colors">Launch Full Treasury Audit</Link>
        </div>

        {showArrears && (
          <div className="pt-10 space-y-4 animate-in slide-in-from-top-4 duration-500">
            <div className="bg-white border border-zinc-100 rounded-3xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-zinc-50 bg-zinc-50/30 flex justify-between items-center">
                <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">Stream Arrears Ledger</h4>
                <span className="text-[9px] font-bold text-zinc-400 uppercase italic">Sorted by highest outstanding balance</span>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-50">
                      <th className="px-6 py-3 text-[9px] font-black uppercase text-zinc-400 tracking-widest">Class & Stream</th>
                      <th className="px-6 py-3 text-[9px] font-black uppercase text-zinc-400 tracking-widest text-right">Outstanding (KES)</th>
                      <th className="px-6 py-3 text-[9px] font-black uppercase text-zinc-400 tracking-widest text-center">Collection Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {streamArrears.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-20 text-center text-[10px] font-bold text-zinc-300 uppercase tracking-widest">No arrears detected for the selected filters</td>
                      </tr>
                    ) : (
                      streamArrears.map((s: any) => (
                        <tr key={s.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-[11px] font-black text-zinc-900 uppercase tracking-tight">{s.className}</p>
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{s.name}</p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <p className="text-sm font-black text-zinc-900 tabular-nums">
                              {formatCurrency(s.arrears).replace(/[^\d.,]/g, '').replace('.00', '')}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-6 justify-end">
                              <div className="flex items-center gap-3">
                                <div className="w-24 h-1 bg-zinc-100 rounded-full overflow-hidden text-center justify-center">
                                  <div className={cn("h-full", s.percentage < 40 ? "bg-rose-500" : "bg-zinc-900")} style={{ width: `${s.percentage}%` }} />
                                </div>
                                <span className="text-[9px] font-black text-zinc-400 tabular-nums w-8">{s.percentage}%</span>
                              </div>
                              <button
                                onClick={() => downloadStreamArrears(s.id, `${s.className} ${s.name}`)}
                                className="p-2 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900 transition-all group relative"
                                title="Download Arrears List"
                              >
                                <ExternalLink size={14} />
                                <span className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-zinc-900 text-white text-[7px] font-bold rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap uppercase tracking-widest">Download List</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. EXAM SCORES */}
      <section className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-zinc-100 pb-6 gap-6">
           <h2 className="text-[11px] font-black text-zinc-900 uppercase tracking-[0.2em]">Exam Scores</h2>
           
           <div className="flex items-center gap-6">
              <div className="flex bg-zinc-50 p-1 rounded-xl border border-zinc-100">
                {[1, 2, 3, 4].map(form => (
                  <button
                    key={form}
                    onClick={() => setActiveFormTab(form)}
                    className={cn(
                      "px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      activeFormTab === form 
                        ? "bg-white shadow-sm text-zinc-900" 
                        : "text-zinc-400 hover:text-zinc-600"
                    )}
                  >
                    Form {form}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                 <select 
                   value={selectedAcademicYear} 
                   onChange={(e) => setSelectedAcademicYear(Number(e.target.value))}
                   className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none border-none py-1 cursor-pointer"
                 >
                    {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                 </select>
                 <div className="w-[1px] h-3 bg-zinc-200" />
                 <select 
                   value={selectedAcademicTerm} 
                   onChange={(e) => setSelectedAcademicTerm(e.target.value)}
                   className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none border-none py-1 cursor-pointer"
                 >
                    <option value="CURRENT">Active Term</option>
                    {data?.terms?.filter((t: any) => t.year === Number(selectedAcademicYear)).map((t: any) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                 </select>
              </div>
           </div>
        </div>

        {!academicHub || academicHub.allResults.length === 0 ? (
          <div className="py-24 text-center border border-zinc-100 rounded-[32px] bg-zinc-50/20">
             <div className="w-12 h-12 rounded-2xl bg-white border border-zinc-100 flex items-center justify-center mx-auto mb-4 text-zinc-300">
                <FileText size={20} />
             </div>
             <p className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">No results found for Form {activeFormTab}</p>
             <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Please ensure results are uploaded for this term/year</p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-700">
             {/* CONSOLIDATED OVERVIEW */}
             <div className="bg-white border border-zinc-100 rounded-[32px] p-10 shadow-sm relative overflow-hidden group">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 divide-y md:divide-y-0 md:divide-x divide-zinc-50 relative z-10">
                   <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-3 text-zinc-400 mb-2">
                         <BarChart2 size={16} />
                         <span className="text-[10px] font-black uppercase tracking-widest">Average Score</span>
                      </div>
                      <div className="flex items-baseline gap-3">
                         <h3 className="text-5xl font-black text-zinc-900 tabular-nums tracking-tighter">{academicHub.currentMean}</h3>
                         <span className={cn(
                           "text-[10px] font-black px-2 py-0.5 rounded-full",
                           Number(academicHub.improvement) >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500"
                         )}>
                            {Number(academicHub.improvement) > 0 ? '+' : ''}{academicHub.improvement}
                         </span>
                      </div>
                   </div>

                   <div className="flex flex-col gap-1 md:pl-10 pt-8 md:pt-0">
                      <div className="flex items-center gap-3 text-zinc-400 mb-2">
                         <Award size={16} />
                         <span className="text-[10px] font-black uppercase tracking-widest">Top Students (A)</span>
                      </div>
                      <h3 className="text-5xl font-black text-zinc-900 tabular-nums tracking-tighter">{academicHub.aCount}</h3>
                   </div>

                   <div className="flex flex-col gap-1 md:pl-10 pt-8 md:pt-0">
                      <div className="flex items-center gap-3 text-zinc-400 mb-2">
                         <ShieldAlert size={16} />
                         <span className="text-[10px] font-black uppercase tracking-widest">Low Scores</span>
                      </div>
                      <h3 className={cn("text-5xl font-black tabular-nums tracking-tighter", academicHub.criticalCount > 0 ? "text-rose-500" : "text-zinc-900")}>
                        {academicHub.criticalCount}
                      </h3>
                   </div>

                   <div className="flex flex-col gap-1 md:pl-10 pt-8 md:pt-0">
                      <div className="flex items-center gap-3 text-zinc-400 mb-2">
                         <Target size={16} />
                         <span className="text-[10px] font-black uppercase tracking-widest">Top Class</span>
                      </div>
                      <h3 className="text-xl font-black text-zinc-900 uppercase tracking-tight truncate leading-tight pt-2">
                        {academicHub.leader?.name || '---'}
                      </h3>
                   </div>
                </div>
                <div className="absolute right-[-2%] bottom-[-10%] text-zinc-50/50 text-[180px] font-black italic select-none pointer-events-none">
                  {activeFormTab}
                </div>
             </div>

             {/* STREAM BREAKDOWN */}
             <div className="bg-white border border-zinc-100 rounded-[32px] overflow-hidden shadow-sm">
                <div className="px-8 py-5 border-b border-zinc-50 flex justify-between items-center bg-zinc-100/10">
                   <h4 className="text-[10px] font-black uppercase text-zinc-400 tracking-[0.2em]">Stream Rankings</h4>
                   <button 
                     onClick={() => setDrillDown({ 
                        open: true, 
                        title: `Form ${activeFormTab} Student Roll`, 
                        students: academicHub.allResults 
                     })}
                     className="text-[9px] font-black uppercase text-zinc-900 underline underline-offset-4"
                   >
                     Full Roll
                   </button>
                </div>
                <table className="w-full text-left">
                   <thead>
                      <tr>
                         <th className="px-8 py-4 text-[9px] font-black uppercase text-zinc-300 tracking-widest">Stream</th>
                         <th className="px-8 py-4 text-[9px] font-black uppercase text-zinc-300 tracking-widest text-center">Score</th>
                         <th className="px-8 py-4 text-[9px] font-black uppercase text-zinc-300 tracking-widest text-right">View</th>
                      </tr>
                   </thead>
                   <tbody>
                      {academicHub.leaderboard.map((s: any) => (
                        <tr key={s.id} className="border-b border-zinc-50 last:border-0 hover:bg-zinc-50/50 transition-colors group">
                           <td className="px-8 py-6">
                              <span className="text-sm font-black text-zinc-900 uppercase tracking-tight">{s.name}</span>
                           </td>
                           <td className="px-8 py-6 text-center">
                              <span className="text-sm font-black text-zinc-900 tabular-nums">{s.mean}</span>
                           </td>
                           <td className="px-8 py-6 text-right">
                              <button 
                                onClick={() => setDrillDown({ 
                                  open: true, 
                                  title: `Form ${activeFormTab} ${s.name} - Students`, 
                                  students: academicHub.allResults.filter((r: any) => r.student?.stream_id === s.id)
                                })}
                                className="text-[9px] font-black text-zinc-400 group-hover:text-zinc-900 transition-colors uppercase tracking-widest"
                              >
                                View List
                              </button>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
          )}
      </section>
      </div>
      <aside className="hidden lg:block lg:col-span-4 space-y-6 animate-in slide-in-from-right duration-700">
        <Card className="p-6 h-[750px] flex flex-col border-none shadow-zinc-200/50 overflow-hidden">
          <div className="flex items-center justify-between mb-8">
             <div>
               <h2 className="text-lg font-bold tracking-tight">Latest Updates</h2>
               <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mt-1">School activities & notices</p>
             </div>
             
             <div className="relative flex items-center gap-3">
               <button 
                 onClick={() => setShowAddMenu(!showAddMenu)}
                 className={cn(
                   "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300",
                   showAddMenu ? "bg-zinc-900 text-white rotate-45 shadow-xl" : "bg-zinc-50 text-zinc-500 hover:bg-zinc-100 border border-zinc-100"
                 )}
                >
                 <Plus size={18} />
               </button>

               {showAddMenu && (
                  <div className="absolute right-0 top-12 w-56 bg-zinc-900 text-white rounded-3xl shadow-2xl p-2 z-[70] animate-in fade-in zoom-in-95 duration-200">
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
               <select
                 value={activityFilter}
                 onChange={(e) => setActivityFilter(e.target.value)}
                 className="bg-transparent text-[9px] font-black uppercase text-zinc-500 hover:text-zinc-900 outline-none cursor-pointer tracking-widest px-2"
               >
                 <option value="ALL">All Updates</option>
                 <option value="EVT">Events Only</option>
                 <option value="ANN">Announcements</option>
               </select>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 scroll-smooth">
            {([...(data?.events || []), ...(data?.announcements || [])]
              .filter(item => {
                if (activityFilter === 'ALL') return true;
                if (activityFilter === 'EVT') return (item as any).date;
                if (activityFilter === 'ANN') return (item as any).content;
                return true;
              })
              .sort((a, b) => new Date(b.created_at || new Date()).getTime() - new Date(a.created_at || new Date()).getTime())
              .map((item: any, idx: number) => {
                const isEvent = !!item.date;
                const author = data?.teachers?.find((t: any) => t.id === item.author_id)?.full_name || (item.author_id === user.id ? user.full_name : 'System');
                
                return (
                  <div key={idx} className="group relative py-4 border-b border-zinc-100 last:border-0 hover:bg-zinc-50/30 transition-colors px-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className={cn("text-[9px] font-black uppercase tracking-widest", isEvent ? "text-amber-500" : "text-blue-500")}>
                        {isEvent ? 'Event' : 'Announcement'}
                      </span>
                      <span className="text-[9px] font-bold text-zinc-400">
                        {new Date(item.created_at || item.date).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-zinc-900 group-hover:text-zinc-600 transition-colors">{item.title}</h3>
                    <p className="text-xs text-zinc-500 mt-1 line-clamp-2 leading-relaxed">
                      {isEvent ? item.description : item.content}
                    </p>
                    <div className="mt-2 text-[9px] font-bold text-zinc-400">
                       By {author}
                    </div>
                  </div>
                );
              })
            )}
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
                <span className="text-xs font-bold text-zinc-900 uppercase tracking-tight">{res.student?.profile?.full_name || 'Unknown Student'}</span>
                <span className="text-xs font-black text-zinc-500 tabular-nums uppercase p-1 bg-zinc-100 rounded group-hover:bg-zinc-900 group-hover:text-white transition-colors">{res.student?.adm_no}</span>
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
          <Button type="submit" fullWidth disabled={isSaving}>{isSaving ? 'PUBLISHING...' : 'PUBLISH BROADCAST'}</Button>
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
          <Button type="submit" fullWidth disabled={isSaving}>{isSaving ? 'SCHEDULING...' : 'SCHEDULE EVENT'}</Button>
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
  <div className="space-y-10 animate-pulse">
    <header className="flex justify-between items-center bg-white p-10 rounded-[3rem] border border-zinc-100 shadow-sm">
      <div className="space-y-3">
        <div className="h-4 w-48 bg-zinc-100 rounded-full" />
        <div className="h-10 w-64 bg-zinc-100 rounded-2xl" />
      </div>
      <div className="flex gap-12">
        <div className="h-12 w-24 bg-zinc-100 rounded-xl" />
        <div className="h-12 w-24 bg-zinc-100 rounded-xl" />
        <div className="h-12 w-24 bg-zinc-100 rounded-xl" />
      </div>
    </header>

    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className="h-48 bg-white border border-zinc-100 rounded-[2.5rem] shadow-sm" />
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 h-[500px] bg-white border border-zinc-100 rounded-[3rem] shadow-sm" />
      <div className="h-[500px] bg-white border border-zinc-100 rounded-[3rem] shadow-sm" />
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
      {['PRINCIPAL', 'ADMIN'].includes(user.role) && <div className="px-2 lg:px-4 py-8"><PrincipalView user={user} /></div>}
      {user.role === 'TEACHER' && <div className="px-2 lg:px-4 py-8"><TeacherView user={user} /></div>}
      {(user.role === 'PARENT' || user.role === 'STUDENT') && <ParentStudentDashboard user={user} />}
    </div>
  );
};
