import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Card, Button, Badge, Modal } from './UI';
import { 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Users, 
  Award, 
  Search, 
  Filter,
  ArrowUpRight,
  Target,
  FileText,
  AlertCircle
} from 'lucide-react';
import { cn, formatDate } from '../utils/utils';

export const ClassTeacherConsole: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [streams, setStreams] = useState<any[]>([]);
  const [selectedStreamId, setSelectedStreamId] = useState<string>('');
  const [workflowRows, setWorkflowRows] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [stats, setStats] = useState({ mean: 0, count: 0, target: 75.0 });

  useEffect(() => {
    const init = async () => {
      if (!user?.school_id) return;
      setLoading(true);
      try {
        const [myStreams, allTerms] = await Promise.all([
          api.getTeacherStreams(user.id),
          api.getTerms(user.school_id)
        ]);
        setStreams(myStreams);
        setTerms(allTerms);
        if (myStreams.length > 0) setSelectedStreamId(myStreams[0].id);
        const current = allTerms.find(t => t.is_current) || allTerms[0];
        if (current) setSelectedTermId(current.id);
      } catch (err) {
        console.error('Init error:', err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user?.id, user?.school_id]);

  useEffect(() => {
    if (!selectedStreamId || !selectedTermId) return;
    const fetchData = async () => {
      try {
        const [workflow, stRanks] = await Promise.all([
          api.getResultsWorkflow({ 
             schoolId: user!.school_id, 
             streamId: selectedStreamId, 
             termId: selectedTermId 
          }),
          api.getStudentTermAveragesByStudents(user!.school_id, selectedTermId, []) // We'll fix this to fetch for stream
        ]);

        // Fix: Since getStudentTermAveragesByStudents needs IDs, we fetch stream students first
        const streamStudents = await api.getWorkflowStudents(selectedStreamId);
        const studentIds = streamStudents.map((s: any) => s.id);
        const averages = await api.getStudentTermAveragesByStudents(user!.school_id, selectedTermId, studentIds);
        
        setWorkflowRows(workflow.filter((r: any) => r.status === 'SUBMITTED'));
        
        const sorted = (averages || []).sort((a,b) => b.average_mark - a.average_mark);
        setRankings(sorted.map((r, i) => ({ ...r, position: i + 1, student: streamStudents.find((s: any) => s.id === r.student_id) })));
        
        const total = sorted.reduce((acc, r) => acc + Number(r.average_mark), 0);
        setStats(prev => ({ ...prev, mean: sorted.length ? (total / sorted.length) : 0, count: sorted.length }));

      } catch (err) {
        console.error('Fetch error:', err);
      }
    };
    fetchData();
  }, [selectedStreamId, selectedTermId]);

  const handleApproveAll = async () => {
    if (!workflowRows.length) return;
    try {
      await api.updateWorkflowStatus(workflowRows.map(r => r.id), { status: 'APPROVED' });
      setWorkflowRows([]);
      // Refresh logic would go here
    } catch (err) {
      alert('Failed to approve results');
    }
  };

  const handleStatusUpdate = async (id: string, status: 'APPROVED' | 'NEEDS_REVISION') => {
    try {
      await api.updateWorkflowStatus([id], { status });
      setWorkflowRows(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert('Update failed');
    }
  };

  if (loading) return <div className="p-12 animate-pulse text-zinc-400 font-black uppercase text-[10px] tracking-widest">Initialising Oversight Console...</div>;

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-20">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-zinc-100 pb-8">
        <div className="space-y-1">
          <Badge variant="neutral" className="bg-zinc-950 text-white border-none font-black text-[8px] tracking-[0.2em] uppercase px-3 py-1">Class Teacher Command</Badge>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 font-sora uppercase mt-2">Submission & Upload</h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Oversight, Validations and Performance Rankings</p>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-1">Managed Stream</span>
              <select 
                value={selectedStreamId} 
                onChange={(e) => setSelectedStreamId(e.target.value)}
                className="bg-white border border-zinc-200 rounded-xl px-4 py-2 text-xs font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all"
              >
                {streams.map(s => <option key={s.id} value={s.id}>{s.class?.name} {s.name}</option>)}
              </select>
           </div>
           <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest px-1">Assessment Term</span>
              <select 
                value={selectedTermId} 
                onChange={(e) => setSelectedTermId(e.target.value)}
                className="bg-white border border-zinc-200 rounded-xl px-4 py-2 text-xs font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all"
              >
                {terms.map(t => <option key={t.id} value={t.id}>{t.name} {t.year}</option>)}
              </select>
           </div>
        </div>
      </div>

      {/* DASHBOARD STATS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Class Mean Score" value={stats.mean.toFixed(2)} icon={TrendingUp} color="emerald" sub="Live performance average" />
        <StatCard label="Ranked Students" value={stats.count} icon={Users} color="zinc" sub="Total enrollment synced" />
        <StatCard label="Pending Approval" value={workflowRows.length} icon={AlertCircle} color={workflowRows.length > 0 ? "amber" : "zinc"} sub="Awaiting verification" />
        <div className="bg-zinc-950 rounded-[2rem] p-6 text-white flex flex-col justify-between group relative overflow-hidden">
           <div className="flex justify-between items-start relative z-10">
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Mean Target</span>
              <Target size={16} className="text-emerald-400" />
           </div>
           <div className="mt-4 relative z-10">
              <div className="flex items-baseline gap-2">
                 <h2 className="text-3xl font-black tabular-nums">{stats.target.toFixed(1)}</h2>
                 <span className="text-[10px] font-bold text-emerald-400">/ 100.0</span>
              </div>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Institutional Goal</p>
           </div>
           <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-[40px] rounded-full -mr-10 -mt-10" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* APPROVAL LEDGER */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Pending Submissions</h3>
            {workflowRows.length > 0 && (
              <button onClick={handleApproveAll} className="text-[9px] font-black text-emerald-600 uppercase tracking-widest hover:underline transition-all">Approve All Batch</button>
            )}
          </div>
          <Card className="p-0 overflow-hidden rounded-[2rem] border-zinc-100 bg-white shadow-xl shadow-zinc-200/20">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-zinc-50/50 border-b border-zinc-100">
                  <tr>
                    <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Student</th>
                    <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Subject</th>
                    <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-center">Mark</th>
                    <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {workflowRows.map(row => (
                    <tr key={row.id} className="hover:bg-zinc-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <p className="text-xs font-black text-zinc-900 uppercase">{row.student?.profile?.full_name}</p>
                        <p className="text-[9px] text-zinc-400 font-bold uppercase">{row.student?.adm_no}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-black text-zinc-900 uppercase">{row.subject?.name}</p>
                        <p className="text-[9px] text-zinc-400 font-bold uppercase">{row.exam_name}</p>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant="neutral" className="bg-zinc-100 border-none font-black tabular-nums">{row.marks}</Badge>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleStatusUpdate(row.id, 'APPROVED')} className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-sm">
                               <CheckCircle size={14} />
                            </button>
                            <button onClick={() => handleStatusUpdate(row.id, 'NEEDS_REVISION')} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                               <XCircle size={14} />
                            </button>
                         </div>
                      </td>
                    </tr>
                  ))}
                  {workflowRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-20 text-center text-[10px] font-black text-zinc-400 uppercase italic">All submissions have been processed.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        {/* RANKINGS BOARD */}
        <div className="lg:col-span-5 space-y-4">
           <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Class Rankings</h3>
            <div className="flex items-center gap-1.5">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
               <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Live Sorting</span>
            </div>
          </div>
          <Card className="p-6 rounded-[2rem] border-zinc-100 bg-white space-y-6 shadow-xl shadow-zinc-200/20">
             <div className="space-y-3">
                {rankings.map((rank) => (
                   <div key={rank.student_id} className="flex items-center justify-between p-3 rounded-2xl border border-zinc-50 hover:border-zinc-200 hover:bg-zinc-50/50 transition-all group">
                      <div className="flex items-center gap-4">
                         <div className={cn(
                           "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-all",
                           rank.position === 1 ? "bg-amber-100 text-amber-600 scale-110 shadow-lg shadow-amber-200" :
                           rank.position === 2 ? "bg-zinc-100 text-zinc-600" :
                           rank.position === 3 ? "bg-orange-100 text-orange-600" :
                           "bg-zinc-50 text-zinc-400"
                         )}>
                            {rank.position}
                         </div>
                         <div>
                            <p className="text-xs font-black text-zinc-900 uppercase truncate max-w-[150px]">{rank.student?.profile?.full_name}</p>
                            <p className="text-[9px] text-zinc-400 font-bold uppercase">{rank.student?.adm_no}</p>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-sm font-black text-zinc-900 tabular-nums">{Number(rank.average_mark).toFixed(1)}%</p>
                         <Badge variant="neutral" className="text-[8px] font-black p-0 border-none uppercase text-zinc-400 tracking-tighter">Grade: {rank.average_grade}</Badge>
                      </div>
                   </div>
                ))}
                {rankings.length === 0 && (
                  <div className="py-20 text-center text-[10px] font-black text-zinc-400 uppercase italic border border-dashed border-zinc-100 rounded-2xl">
                    Generate rankings to see class positions.
                  </div>
                )}
             </div>
          </Card>
        </div>

      </div>

    </div>
  );
};

const StatCard = ({ label, value, icon: Icon, color, sub }: any) => {
  const colors: any = {
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    zinc: "bg-zinc-50 text-zinc-600",
    rose: "bg-rose-50 text-rose-600"
  };
  return (
    <Card className="p-6 rounded-[2rem] border-zinc-100 flex flex-col justify-between hover:border-zinc-200 transition-all group">
      <div className="flex justify-between items-start">
        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">{label}</span>
        <div className={cn("p-2 rounded-xl transition-all group-hover:scale-110", colors[color])}>
           <Icon size={16} />
        </div>
      </div>
      <div className="mt-4">
        <h2 className="text-3xl font-black text-zinc-900 tabular-nums">{value}</h2>
        <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest mt-1">{sub}</p>
      </div>
    </Card>
  );
};
