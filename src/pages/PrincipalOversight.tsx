import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Card, Button, Badge, Modal } from '../components/UI';
import {
  History,
  Users,
  Calendar,
  ShieldCheck,
  FileCheck,
  Clock,
  ArrowUpRight,
  TrendingDown,
  Activity,
  UserCheck,
  Search,
  Filter,
  DollarSign
} from 'lucide-react';
import { formatCurrency, cn, formatDate } from '../utils/utils';

type OversightTab = 'submissions' | 'staff' | 'financials' | 'institutional';

export const PrincipalOversight: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<OversightTab>('submissions');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    submissions: [],
    staff: [],
    calendar: [],
    terms: []
  });

  const fetchData = async () => {
    if (!user?.school_id) return;
    setLoading(true);
    try {
      const [subs, staff, cal, terms] = await Promise.all([
        api.getResultsWorkflow({ schoolId: user.school_id }),
        api.getStaffActivity(user.school_id),
        api.getSchoolCalendar(user.school_id),
        api.getTerms(user.school_id)
      ]);
      setData({ submissions: subs, staff, calendar: cal, terms });
    } catch (err) {
      console.error("Oversight data error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.school_id]);

  if (loading) return <OversightSkeleton />;

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 animate-in fade-in duration-700">

      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-100 pb-8">
        <div className="space-y-1">
          <Badge variant="neutral" className="bg-zinc-100 text-zinc-600 border-none font-black text-[9px] tracking-[0.2em] uppercase px-3">Command & Control</Badge>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 font-sora uppercase">Executive Oversight</h1>
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-tighter">Real-time institutional audit and operational monitoring</p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <TabButton active={activeTab === 'submissions'} onClick={() => setActiveTab('submissions')} icon={FileCheck} label="Results Ledger" />
          <TabButton active={activeTab === 'staff'} onClick={() => setActiveTab('staff')} icon={UserCheck} label="Staff Activity" />
          <TabButton active={activeTab === 'financials'} onClick={() => setActiveTab('financials')} icon={DollarSign} label="Financials Admin" />
          <TabButton active={activeTab === 'institutional'} onClick={() => setActiveTab('institutional')} icon={Calendar} label="Institutional Hub" />
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="min-h-[600px]">
        {activeTab === 'submissions' && <SubmissionsLedger data={data.submissions} onRefresh={fetchData} />}
        {activeTab === 'staff' && <StaffActivityLog data={data.staff} />}
        {activeTab === 'financials' && <FinancialsHub schoolId={user.school_id} terms={data.terms} />}
        {activeTab === 'institutional' && <InstitutionalHub data={data} />}
      </div>

    </div>
  );
};

const TabButton = ({ active, icon: Icon, label, onClick }: any) => (
  <button
    onClick={onClick}
    className={cn(
      "whitespace-nowrap px-5 py-3 rounded-2xl flex items-center gap-2.5 transition-all active:scale-95",
      active
        ? "bg-zinc-900 text-white shadow-xl shadow-zinc-200"
        : "bg-white text-zinc-400 hover:text-zinc-900 border border-zinc-100"
    )}
  >
    <Icon size={16} />
    <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
  </button>
);

const SubmissionsLedger = ({ data, onRefresh }: any) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center px-4">
        <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Live Submission Feed</h3>
        <button onClick={onRefresh} className="p-2 hover:bg-zinc-100 rounded-full transition-colors">
          <Activity size={16} className="text-zinc-400" />
        </button>
      </div>

      <Card className="p-0 overflow-hidden rounded-[2.5rem] border-zinc-100 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-zinc-50 bg-zinc-50/50">
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Teacher</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Subject & Stream</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Timestamp</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {data.map((row: any) => (
                <tr key={row.id} className="hover:bg-zinc-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-zinc-900 flex items-center justify-center text-white text-[10px] font-black uppercase">
                        {row.submitted_by_profile?.full_name?.charAt(0) || 'T'}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-zinc-900 uppercase tracking-tight">{row.submitted_by_profile?.full_name || 'Staff Member'}</span>
                        <span className="text-[9px] text-zinc-400 font-bold uppercase">Authorized Educator</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex flex-col">
                      <span className="text-xs font-black text-zinc-900 uppercase tracking-tight">{row.subject?.name}</span>
                      <span className="text-[9px] text-zinc-400 font-bold uppercase">{row.exam_name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-xs font-black text-zinc-900 uppercase tabular-nums">{formatDate(row.updated_at)}</span>
                      <span className="text-[9px] text-zinc-400 font-bold uppercase italic">Recorded Log</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center">
                    <Badge variant={row.status === 'PUBLISHED' ? 'success' : 'info'} className="text-[8px] uppercase tracking-widest font-black py-1 px-3">
                      {row.status}
                    </Badge>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <Button variant="ghost" className="text-[10px] font-black uppercase text-zinc-400 hover:text-zinc-900">Audit Details</Button>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr className="border-none">
                  <td colSpan={5} className="py-20 text-center text-[10px] font-black text-zinc-400 uppercase italic">
                    No submission activity recorded in the current term cycle.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

const StaffActivityLog = ({ data }: any) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {data.map((staff: any) => (
        <Card key={staff.id} className="p-6 rounded-[2rem] border-zinc-100 hover:border-zinc-900 transition-all group relative overflow-hidden">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center text-zinc-900 font-black group-hover:bg-zinc-900 group-hover:text-white transition-colors">
              {staff.full_name?.charAt(0)}
            </div>
            <div>
              <h4 className="text-xs font-black text-zinc-900 uppercase tracking-tight">{staff.full_name}</h4>
              <Badge variant="neutral" className="text-[7px] border-none uppercase tracking-widest p-0 mt-1">{staff.role}</Badge>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-zinc-50">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Last Synced</span>
              <span className="text-[9px] font-bold text-zinc-900 uppercase">{formatDate(staff.updated_at)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Status</span>
              <div className="flex items-center gap-1.5 grayscale group-hover:grayscale-0 transition-all">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[9px] font-bold text-emerald-600 uppercase">Authenticated</span>
              </div>
            </div>
          </div>

          <button className="absolute bottom-4 right-4 p-2 opacity-0 group-hover:opacity-100 transition-all">
            <ShieldCheck size={16} className="text-zinc-300 hover:text-zinc-900" />
          </button>
        </Card>
      ))}
    </div>
  );
};

const InstitutionalHub = ({ data }: any) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

      {/* TERM SETTINGS */}
      <div className="lg:col-span-12">
        <div className="bg-zinc-950 rounded-[3rem] p-12 text-white flex flex-col md:flex-row justify-between items-center gap-12 relative overflow-hidden">
          <div className="space-y-6 relative z-10 text-center md:text-left">
            <Badge variant="success" className="bg-emerald-500/20 text-emerald-400 border-none text-[8px] uppercase tracking-widest px-4">Cycle Management</Badge>
            <h3 className="text-4xl font-black uppercase tracking-tight">Set Academic <br /> Term Boundaries</h3>
            <div className="flex gap-4 justify-center md:justify-start">
              <Button className="bg-white text-zinc-900 hover:bg-zinc-100 px-8 py-6 rounded-2xl text-xs font-black uppercase tracking-widest">Update Term Dates</Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-8 relative z-10">
            <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-md">
              <p className="text-[9px] font-black text-zinc-400 uppercase mb-4 tracking-widest">Current Cycle</p>
              <h4 className="text-2xl font-black uppercase tracking-tighter tabular-nums">Term 2, 2024</h4>
            </div>
            <div className="p-8 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md">
              <p className="text-[9px] font-black text-emerald-400 uppercase mb-4 tracking-widest">System Status</p>
              <h4 className="text-2xl font-black uppercase tracking-tighter">Recording Open</h4>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-[500px] h-full bg-emerald-500/5 blur-[120px] rounded-full -mr-40" />
        </div>
      </div>

      {/* CALENDAR & FEES MNGT */}
      <div className="lg:col-span-8">
        <Card className="rounded-[2.5rem] p-8 border-zinc-100 bg-white space-y-6">
          <div className="flex justify-between items-center">
            <h4 className="text-[10px] font-black text-zinc-900 uppercase tracking-widest px-2">Operational Calendar</h4>
            <Button variant="ghost" className="text-[9px] font-bold uppercase">Full Calendar</Button>
          </div>
          <div className="space-y-3">
            {data.calendar.slice(0, 5).map((ev: any) => (
              <div key={ev.id} className="flex items-center justify-between p-4 rounded-2xl bg-zinc-50 border border-zinc-100 group hover:border-zinc-900 transition-all">
                <div className="flex items-center gap-4">
                  <div className="text-center w-12 py-2 rounded-xl bg-white border border-zinc-100 font-black">
                    <p className="text-[8px] text-zinc-400 uppercase tracking-tighter">
                      {new Date(ev.date).toLocaleDateString('en-US', { month: 'short' })}
                    </p>
                    <p className="text-lg leading-none uppercase">{new Date(ev.date).getDate()}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black text-zinc-900 uppercase tracking-tight">{ev.title}</p>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase italic">{ev.location || 'Institution Grounds'}</p>
                  </div>
                </div>
                <ArrowUpRight size={16} className="text-zinc-200 group-hover:text-zinc-900 transition-colors" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="lg:col-span-4">
        <div className="bg-blue-600 rounded-[2.5rem] p-10 text-white space-y-8 shadow-xl shadow-blue-500/10 h-full flex flex-col justify-between">
          <div className="space-y-4">
            <Badge variant="info" className="bg-white/10 text-blue-100 border-none text-[8px] uppercase tracking-widest px-3 py-1">Treasury Operations</Badge>
            <h4 className="text-3xl font-black uppercase tracking-tighter leading-none">Global Fee <br /> Architect</h4>
            <p className="text-[10px] text-blue-100/60 font-medium uppercase leading-relaxed tracking-tighter">Modify the primary institutional fee schedule for the upcoming cycle.</p>
          </div>
          <Button className="bg-white text-blue-600 hover:bg-blue-50 py-7 rounded-2xl text-[10px] font-black uppercase tracking-widest">Access Fee Manager</Button>
        </div>
      </div>

    </div>
  );
};

const FinancialsHub = ({ schoolId, terms }: any) => {
  const [selectedTerm, setSelectedTerm] = useState('CURRENT');
  const [stats, setStats] = useState<any>(null);
  const [arrears, setArrears] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFinanceData = async () => {
    setLoading(true);
    try {
      const activeTermId = selectedTerm === 'CURRENT' 
        ? terms.find((t: any) => t.is_current)?.id || terms[0]?.id 
        : selectedTerm;
      
      const [sum, heatmap] = await Promise.all([
        api.getFinancialSummary(schoolId, activeTermId),
        api.getArrearsByStream(schoolId, activeTermId)
      ]);
      setStats(sum);
      setArrears(heatmap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, [selectedTerm, schoolId]);

  if (loading) return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-pulse">
      {[1, 2, 3].map(i => <div key={i} className="h-40 bg-zinc-50 rounded-[2.5rem]" />)}
      <div className="md:col-span-3 h-96 bg-zinc-50 rounded-[3rem]" />
    </div>
  );

  return (
    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-1200">
       {/* HIGH LEVEL ARREARS STATUS */}
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FinanceMetricCard 
            label="Total Revenue" 
            value={`KES ${(stats?.collected || 0).toLocaleString()}`} 
            sub={`Target: KES ${(stats?.target || 0).toLocaleString()}`}
            icon={DollarSign}
            color="text-emerald-600 bg-emerald-50"
          />
          <FinanceMetricCard 
            label="Outstanding Arrears" 
            value={`KES ${((stats?.target || 0) - (stats?.collected || 0)).toLocaleString()}`} 
            sub="Term Receivable"
            icon={TrendingDown}
            color="text-rose-600 bg-rose-50"
          />
          <FinanceMetricCard 
            label="Collection Efficiency" 
            value={`${stats?.efficiency || 0}%`} 
            sub="Fiscal Standing"
            icon={Activity}
            color="text-blue-600 bg-blue-50"
          />
       </div>

       {/* ARREARS BREAKDOWN */}
       <Card className="rounded-[3rem] overflow-hidden border-zinc-100 bg-white shadow-sm">
          <div className="px-10 py-8 border-b border-zinc-50 bg-zinc-50/30 flex justify-between items-center">
             <div className="flex items-center gap-3">
                <Search size={16} className="text-zinc-400" />
                <h4 className="text-[10px] font-black text-zinc-900 uppercase tracking-[0.3em]">Arrears Heatmap by Stream</h4>
             </div>
             <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-zinc-100">
               <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Audit Cycle:</span>
               <select 
                  value={selectedTerm} 
                  onChange={(e) => setSelectedTerm(e.target.value)}
                  className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer border-none text-zinc-900"
               >
                  <option value="CURRENT">Active Term</option>
                  {(terms || []).map((t: any) => <option key={t.id} value={t.id}>{t.name} {t.year}</option>)}
               </select>
             </div>
          </div>
          <div className="overflow-x-auto">
             <table className="w-full text-left">
                <thead>
                   <tr className="border-b border-zinc-50">
                      <th className="px-10 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Institutional Stream</th>
                      <th className="px-10 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-right">Outstanding (KES)</th>
                      <th className="px-10 py-6 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Collection Delta</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                   {arrears.map((a: any) => (
                      <tr key={a.id} className="hover:bg-zinc-50/50 transition-all group">
                         <td className="px-10 py-6">
                            <span className="text-xs font-black text-zinc-900 uppercase tracking-tight group-hover:text-zinc-600">{a.name}</span>
                            <p className="text-[9px] font-bold text-zinc-400 uppercase mt-1">Verified Audit Record</p>
                         </td>
                         <td className="px-10 py-6 text-right font-black text-sm tabular-nums text-rose-600">
                            {a.arrears.toLocaleString()}
                         </td>
                         <td className="px-10 py-6">
                            <div className="flex items-center justify-center gap-4">
                               <div className="w-24 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                  <div className={cn("h-full transition-all duration-1000", a.percentage > 70 ? "bg-emerald-500" : "bg-rose-500")} style={{ width: `${a.percentage}%` }} />
                               </div>
                               <span className="text-[10px] font-black text-zinc-400 tabular-nums w-8">{a.percentage}%</span>
                            </div>
                         </td>
                      </tr>
                   ))}
                   {arrears.length === 0 && (
                     <tr>
                       <td colSpan={3} className="py-20 text-center text-[10px] font-black text-zinc-300 uppercase italic">
                         No financial deviations detected for the selected period.
                       </td>
                     </tr>
                   )}
                </tbody>
             </table>
          </div>
       </Card>
    </div>
  );
};

const OversightSkeleton = () => (
  <div className="space-y-10 animate-pulse">
    <div className="h-10 w-64 bg-zinc-100 rounded-2xl mb-12" />
    <div className="flex gap-4 mb-12">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-10 w-32 bg-zinc-100 rounded-xl" />)}
    </div>
    <div className="h-[600px] bg-zinc-50 rounded-[3rem]" />
  </div>
);

const FinanceMetricCard = ({ label, value, sub, icon: Icon, color }: any) => (
  <Card className="p-10 rounded-[3rem] border-zinc-100 bg-white space-y-6 hover:shadow-2xl hover:shadow-zinc-100 transition-all group overflow-hidden relative">
     <div className="flex justify-between items-start relative z-10">
        <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em]">{label}</p>
        <div className={cn("p-4 rounded-2xl transition-all duration-700 group-hover:scale-110 group-hover:bg-zinc-900 group-hover:text-white", color)}>
           <Icon size={24} />
        </div>
     </div>
     <div className="space-y-1 relative z-10">
        <h4 className="text-4xl font-black tracking-tighter text-zinc-900 tabular-nums uppercase">{value}</h4>
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">{sub}</p>
     </div>
     <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-50 opacity-0 group-hover:opacity-100 blur-[60px] rounded-full transition-opacity duration-1000" />
  </Card>
);
