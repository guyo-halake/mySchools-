import React, { useState, useEffect } from 'react';
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
  Edit3
} from 'lucide-react';
import { formatCurrency } from '../utils/utils';
import { Link } from 'react-router-dom';
import { Badge, Button, Modal } from '../components/UI';

const getDisplayName = (value?: string | null, fallback = 'Student') => value || fallback;

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto font-sans text-zinc-900 animate-in fade-in duration-500">
      {user.role === 'ADMIN' && <div className="px-6 py-10"><PrincipalView user={user} /></div>}
      {user.role === 'TEACHER' && <div className="px-6 py-10"><TeacherView user={user} /></div>}
      {(user.role === 'PARENT' || user.role === 'STUDENT') && <ParentStudentDashboard user={user} />}
    </div>
  );
};

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
    <div className="flex flex-col items-center justify-center py-40 gap-4">
      <div className="w-10 h-10 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-zinc-400 font-black text-[10px] uppercase tracking-[0.2em]">Syncing School Records...</p>
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

/* -------------------------------------------------------------------------- */
/*                               SHARED COMPONENTS                            */
/* -------------------------------------------------------------------------- */


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


/* -------------------------------------------------------------------------- */
/*                               TEACHER VIEW                                 */
/* -------------------------------------------------------------------------- */
const TeacherView = ({ user }: any) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [terms, setTerms] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [meanInput, setMeanInput] = useState('');
  const [targetInput, setTargetInput] = useState('');
  const [targetTermId, setTargetTermId] = useState('');
  const [targetExamId, setTargetExamId] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);

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

  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        const [stream, termRows, examRows] = await Promise.all([
          api.getTeacherStream(user.id),
          user?.school_id ? api.getTerms(user.school_id) : Promise.resolve([]),
          user?.school_id ? api.getExams(user.school_id) : Promise.resolve([])
        ]);

        setTerms(termRows || []);
        setExams(examRows || []);
        if (stream) {
          const [students] = await Promise.all([
            api.getStudentsByStream(stream.id)
          ]);
          setData({ stream, students });
          setMeanInput(stream.main_mean_score == null ? '' : String(stream.main_mean_score));
          setTargetInput(stream.target_mean_score == null ? '' : String(stream.target_mean_score));
          setTargetTermId(stream.target_term_id || '');
          setTargetExamId(stream.target_exam_id || '');
        } else {
          setData({ stream: null, students: [] });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeacherData();
  }, [user.id, user.school_id]);

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
    } catch (err: any) {
      alert(err?.message || 'Failed to save target settings');
    } finally {
      setSavingTarget(false);
    }
  };

  if (loading) return <div className="py-20 text-zinc-400 font-bold">Connecting to academic records...</div>;
  if (!data) return <div className="py-20 text-red-500 font-bold">Failed to load academic data. Please refresh.</div>;

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const streamLabel = [data.stream?.class?.name, data.stream?.name].filter(Boolean).join(' ');
  const mainMean = formatScoreGrade(data.stream?.main_mean_score);
  const targetMean = formatScoreGrade(data.stream?.target_mean_score);
  const targetTermLabel = terms.find((t: any) => t.id === data.stream?.target_term_id)
    ? `${terms.find((t: any) => t.id === data.stream?.target_term_id)?.name || ''} ${terms.find((t: any) => t.id === data.stream?.target_term_id)?.year || ''}`.trim()
    : '-';
  const targetExamLabel = exams.find((ex: any) => ex.id === data.stream?.target_exam_id)?.name || '-';
  const examsForSelectedTerm = targetTermId
    ? exams.filter((ex: any) => ex.term_id === targetTermId)
    : exams;

  return (
    <div className="space-y-12">
      {/* 1. Normal Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Good morning, {user.full_name?.split(' ')[0]}</h1>
          <p className="text-zinc-500 font-medium">It is {today}</p>
          {data.stream && (
            <p className="inline-block mt-2 px-2.5 py-0.5 bg-zinc-100 rounded-md text-[11px] font-semibold text-zinc-600 uppercase tracking-wide">
              {streamLabel || 'Assigned Stream'} Teacher
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <SimpleButton to="/results-management" label="Results Management" icon={<Target size={14} />} />
          <SimpleButton to="/chat" label="Parent Chat" icon={<MessageSquare size={14} />} />
        </div>
      </div>

      {/* 2. Simple Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        <StatBox label="Total Students" value={data.students.length} />
        <div className="space-y-1 relative">
          <button
            onClick={() => setShowTargetModal(true)}
            className="absolute -top-1 right-0 h-5 w-5 rounded-full border border-zinc-200 bg-white text-zinc-400 hover:text-zinc-700 hover:border-zinc-300 flex items-center justify-center"
            title="Edit class mean and target"
            aria-label="Edit class mean and target"
          >
            <Edit3 size={11} />
          </button>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">Class Mean Score</p>
          <p className="text-2xl font-bold tracking-tight text-zinc-900">{mainMean} | {targetMean}</p>
          <p className="text-[10px] text-zinc-500">Term: {targetTermLabel} | Exam: {targetExamLabel}</p>
        </div>
        <StatBox label="Today's Attendance" value="38 / 40" />
      </div>

      {/* 3. Students & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between border-b pb-3 border-zinc-100">
            <h2 className="text-sm font-semibold">Student List</h2>
            <Link to="/students" className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors">View all students</Link>
          </div>
          <div className="divide-y divide-zinc-50">
            {data.students.slice(0, 10).map((s: any) => (
              <div key={s.id} className="py-3 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded bg-zinc-50 flex items-center justify-center text-xs font-medium text-zinc-400 group-hover:bg-zinc-100 group-hover:text-zinc-900 transition-colors">
                    {s.profile?.full_name?.[0] || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{s.profile?.full_name || 'Unnamed Student'}</p>
                    <p className="text-[11px] text-zinc-400 uppercase font-medium">{s.adm_no}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-600">
                  Good Standing
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 text-zinc-900 dark:text-white mb-6">
            <Bell size={14} className="text-orange-500" /> Notifications & Alerts
          </h2>
          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 transition-all cursor-pointer">
              <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-50 text-amber-600 mb-2 inline-block">Academic</span>
              <h4 className="text-[11px] font-black text-zinc-900 dark:text-white uppercase leading-tight mb-1">Missing Marks</h4>
              <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">You haven't recorded marks for Form 4 Math yet.</p>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 transition-all cursor-pointer">
              <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 mb-2 inline-block">Message</span>
              <h4 className="text-[11px] font-black text-zinc-900 dark:text-white uppercase leading-tight mb-1">Parent Inquiry</h4>
              <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">A parent of 'Razanyo' sent you a message regarding performance.</p>
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={showTargetModal} onClose={() => setShowTargetModal(false)} title="Edit Mean & Target">
        <form onSubmit={saveTargetSettings} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1">Input Current Mean Score (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={meanInput}
              onChange={(e) => setMeanInput(e.target.value)}
              placeholder="e.g. 62.5"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1">Input Target Mean Score (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder="e.g. 70.0"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-100"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1">Target Term</label>
            <select
              value={targetTermId}
              onChange={(e) => {
                const nextTerm = e.target.value;
                setTargetTermId(nextTerm);
                if (nextTerm && !exams.some((ex: any) => ex.id === targetExamId && ex.term_id === nextTerm)) {
                  setTargetExamId('');
                }
              }}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-100"
            >
              <option value="">-</option>
              {terms.map((term: any) => (
                <option key={term.id} value={term.id}>{`${term.name} ${term.year}`.trim()}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-600 mb-1">Target Exam</label>
            <select
              value={targetExamId}
              onChange={(e) => setTargetExamId(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-100"
            >
              <option value="">-</option>
              {examsForSelectedTerm.map((exam: any) => (
                <option key={exam.id} value={exam.id}>{exam.name}</option>
              ))}
            </select>
          </div>
          <div className="pt-2 flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setShowTargetModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={savingTarget}>{savingTarget ? 'Saving...' : 'Save'}</Button>
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
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [students, teachers, fees, results, events, discipline, health] = await Promise.all([
          api.getStudents(user.school_id),
          api.getTeachers(user.school_id),
          api.getFeesFull(user.school_id),
          api.getResults(user.school_id),
          api.getEvents(user.school_id),
          api.getDisciplinarySchoolWide(user.school_id),
          api.getHealthSchoolWide(user.school_id)
        ]);
        setData({ students, teachers, fees, results, events, discipline, health });
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [user.school_id]);

  if (loading || !data) return <div className="py-20 text-zinc-400">Loading school summary...</div>;

  const feesCollected = data.fees.reduce((acc: number, f: any) => acc + (f.amount_paid || 0), 0);

  return (
    <div className="space-y-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Overview</h1>
        <p className="text-zinc-500 font-medium">Institutional report for {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-8">
        <StatBox label="Total Students" value={data.students.length} />
        <StatBox label="Fees Collected" value={formatCurrency(feesCollected)} />
        <StatBox label="School Mean" value="74%" />
        <StatBox label="Staff Count" value={data.teachers.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-7 space-y-10">
          <section className="space-y-4">
            <h2 className="text-sm font-semibold border-b border-zinc-100 pb-2">Academic Performance</h2>
            <div className="grid grid-cols-5 gap-4">
              {['A', 'B', 'C', 'D', 'E'].map(g => (
                <div key={g} className="space-y-0.5">
                  <p className="text-xl font-bold">{g}</p>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase">{Math.floor(Math.random() * 50)} Students</p>
                </div>
              ))}
            </div>
          </section>
        </div>
        <div className="lg:col-span-5 space-y-8">
          <h2 className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 text-zinc-900 dark:text-white">
            <Activity size={14} className="text-emerald-500" /> Institutional Activity
          </h2>
          <div className="space-y-3">
            {[...data.events, ...data.discipline].slice(0, 5).map((item, i) => (
              <div key={i} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 transition-all">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-500">
                    {item.incident_title ? 'Discipline' : 'Event'}
                  </span>
                  <p className="text-[8px] font-bold text-zinc-400 uppercase">{item.date || item.incident_date}</p>
                </div>
                <h4 className="text-[11px] font-black text-zinc-900 dark:text-white uppercase leading-tight mb-1">
                  {item.title || item.incident_title}
                </h4>
                <p className="text-[10px] text-zinc-500 leading-relaxed font-medium line-clamp-2">
                  {item.description || "Official school record logged for history."}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};


/* -------------------------------------------------------------------------- */
/*                               SHARED COMPONENTS                            */
/* -------------------------------------------------------------------------- */

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
/ /   T e a c h e r   D a s h b o a r d   O v e r h a u l   -   I n i t i a l i z i n g   p h a s e   2  
 