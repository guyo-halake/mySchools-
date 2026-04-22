import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/adminSupabase';
import { useAdminAlert } from '../context/AdminAlertContext';
import { InfrastructureAPI, IntegrityAuditor } from '../lib/admin_api';
import {
  Database, Shield, Activity, Globe, Github,
  RefreshCw, CheckCircle2, AlertTriangle, Play,
  Terminal, ShieldAlert, GitPullRequest, GitBranch,
  Rocket, Server, Monitor, XCircle, Power, X
} from 'lucide-react';

export const TechOpsPage: React.FC = () => {
  const { showAlert } = useAdminAlert();

  const [activeTab, setActiveTab] = useState<'Infrastructure' | 'Environments' | 'Security' | 'Audits'>('Infrastructure');
  
  // Real Data State
  const [deployments, setDeployments] = useState<any[]>([]);
  const [pulls, setPulls] = useState<any[]>([]);
  const [auditResults, setAuditResults] = useState<any>(null);
  const [maintenance, setMaintenance] = useState(false);
  
  const [loading, setLoading]     = useState(true);
  const [infraStatus, setInfraStatus] = useState<any[]>([]);

  // Log viewer state
  const [showLogs, setShowLogs] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    
    // 1. Get Maintenance Status
    const { data: mData } = await supabase.from('system_settings').select('value').eq('id', 'maintenance_mode').single();
    if (mData) setMaintenance(mData.value.enabled);

    // 2. Infrastructure Health & External APIs
    const [vercel, github] = await Promise.all([
      InfrastructureAPI.getVercelDeployments(),
      InfrastructureAPI.getPullRequests()
    ]);

    setDeployments(vercel);
    setPulls(github);

    // 3. Local DB Health
    const { error: dbErr } = await supabase.from('schools').select('id').limit(1);
    
    setInfraStatus([
      { label: 'Database (Supabase)', status: !dbErr ? 'ok' : 'down', icon: Database, detail: !dbErr ? 'Connected' : 'Connection Failed' },
      { label: 'Vercel API', status: vercel.length > 0 ? 'ok' : 'warn', icon: Globe, detail: vercel.length > 0 ? 'Active' : 'Auth Required' },
      { label: 'GitHub API', status: Array.isArray(github) ? 'ok' : 'warn', icon: Github, detail: Array.isArray(github) ? 'Connected' : 'Auth Required' },
    ]);

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const toggleMaintenance = async () => {
    const next = !maintenance;
    const { error } = await supabase.from('system_settings')
      .update({ value: { enabled: next, message: 'System under maintenance' } })
      .eq('id', 'maintenance_mode');
    
    if (!error) {
      setMaintenance(next);
      showAlert(`System Kill Switch: ${next ? 'ACTIVATED (All users locked)' : 'DEACTIVATED (Users permitted)'}`, next ? 'Danger' : 'Success');
    }
  };

  const redeploy = async (id: string) => {
    showAlert('Triggering force redeploy on Vercel...', 'Vercel Deployment');
    const res = await InfrastructureAPI.triggerRedeploy(id);
    if (!res?.error) {
      showAlert('Redeploy triggered successfully.', 'Done');
      loadData();
    }
  };

  const viewLogs = async (id: string) => {
    setShowLogs(id);
    setLoadingLogs(true);
    const data = await InfrastructureAPI.getVercelLogs(id);
    setLogs(Array.isArray(data) ? data : []);
    setLoadingLogs(false);
  };

  const runAudit = async () => {
    setLoading(true);
    const res = await IntegrityAuditor.runFullAudit(supabase);
    setAuditResults(res);
    setLoading(false);
    showAlert('System Integrity Audit Complete.', 'Audit');
  };

  return (
    <div className="space-y-10 max-w-[1200px] mx-auto pb-20">

      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h1 className="text-3xl font-bold dark:text-white tracking-tight">System Engineering</h1>
          <p className="text-xs text-zinc-500 mt-1 uppercase font-bold tracking-widest font-mono">Infrastructure & Data Integrity Control</p>
        </div>
        <div className="flex gap-3">
           <button 
             onClick={toggleMaintenance}
             className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${maintenance ? 'bg-red-600 text-white shadow-lg shadow-red-600/30' : 'bg-emerald-600/10 text-emerald-600 border border-emerald-600/20'}`}
           >
             <Power size={14} /> {maintenance ? 'Disable Kill Switch' : 'Enable Kill Switch'}
           </button>
           <button onClick={loadData} className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-xl text-zinc-400 group">
             <RefreshCw size={16} className={loading ? 'animate-spin' : 'group-active:rotate-180 transition-transform'} />
           </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-50 dark:border-zinc-800 overflow-x-auto scroller-hidden">
        {['Infrastructure', 'Environments', 'Audits', 'Security'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-8 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${activeTab === tab ? 'border-orange-600 text-orange-600' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'Infrastructure' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 animate-in fade-in duration-300">
          <div className="space-y-8">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Global Service Health</p>
            <div className="space-y-4">
              {infraStatus.map(s => (
                <div key={s.label} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] flex items-center gap-5">
                  <div className="p-3 bg-zinc-50 dark:bg-zinc-800 rounded-2xl"><s.icon size={20} className="text-zinc-400" /></div>
                  <div className="flex-1">
                    <p className="text-xs font-bold dark:text-white uppercase tracking-wider">{s.label}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{s.detail}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${s.status === 'ok' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-8">
            <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Real-time Vercel Deployments</p>
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] overflow-hidden">
               {deployments.length === 0 ? (
                 <p className="p-8 text-center text-xs text-zinc-400 font-bold uppercase tracking-widest">No deployments found</p>
               ) : deployments.map(d => (
                 <div key={d.uid} className="px-8 py-5 border-b border-zinc-50 dark:border-zinc-800 last:border-0 flex items-center justify-between group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-all">
                    <div>
                      <div className="flex items-center gap-2">
                         <p className="text-[12px] font-bold dark:text-zinc-200">{d.name}</p>
                         <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${d.state === 'READY' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>{d.state}</span>
                      </div>
                      <p className="text-[9px] text-zinc-400 font-mono mt-1 uppercase tracking-tighter">{d.url}</p>
                      <p className="text-[9px] text-zinc-500 uppercase font-bold mt-2">{new Date(d.created).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => viewLogs(d.uid)} className="opacity-0 group-hover:opacity-100 p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-lg scale-90 hover:scale-100 transition-all">
                        <Terminal size={14} />
                      </button>
                      <button onClick={() => redeploy(d.uid)} className="opacity-0 group-hover:opacity-100 p-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg scale-90 hover:scale-100 transition-all">
                        <RefreshCw size={14} />
                      </button>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'Environments' && (
        <div className="space-y-12 animate-in fade-in duration-300">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">GitHub Pull Requests</p>
                <div className="space-y-3">
                   {pulls.length === 0 ? (
                     <p className="text-xs text-zinc-400 font-bold uppercase">No pending pull requests</p>
                   ) : pulls.map(pr => (
                     <div key={pr.id} className="p-6 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl flex items-center justify-between group">
                        <div>
                          <p className="text-sm font-bold dark:text-zinc-200">#{pr.number} {pr.title}</p>
                          <p className="text-[10px] text-zinc-500 mt-1 uppercase font-black tracking-widest">{pr.user.login} wants to merge into {pr.base.ref}</p>
                        </div>
                        <a href={pr.html_url} target="_blank" className="p-2 border border-zinc-100 dark:border-zinc-800 rounded-xl text-zinc-400 group-hover:border-blue-600 group-hover:text-blue-600 transition-all">
                          <GitPullRequest size={16} />
                        </a>
                     </div>
                   ))}
                </div>
              </div>

              <div className="space-y-6">
                 <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Environment Strategy</p>
                 <div className="p-8 bg-zinc-900 text-white rounded-[2rem] space-y-8">
                    <div className="flex items-center gap-6">
                       <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center font-black">1</div>
                       <div>
                         <p className="text-xs font-black uppercase tracking-widest">Development</p>
                         <p className="text-xs text-zinc-400 mt-1">Codes pushed to GitHub branches</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-6 translate-x-4">
                       <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black">2</div>
                       <div>
                         <p className="text-xs font-black uppercase tracking-widest">Preview (Staging)</p>
                         <p className="text-xs text-zinc-400 mt-1">Automatic Vercel deployment on PR</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-6 translate-x-8">
                       <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center font-black">3</div>
                       <div>
                         <p className="text-xs font-black uppercase tracking-widest">Production (Live)</p>
                         <p className="text-xs text-zinc-400 mt-1">Auto-deploy on merge to Main</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'Audits' && (
        <div className="max-w-2xl mx-auto space-y-12 animate-in fade-in duration-300">
           <div className="text-center space-y-4">
              <Shield size={48} className="text-orange-600 mx-auto" />
              <h2 className="text-2xl font-bold dark:text-white">Full System Integrity Audit</h2>
              <p className="text-sm text-zinc-500 max-w-sm mx-auto">Cross-check database business logic, fee calculations, and security configurations.</p>
              <button 
                onClick={runAudit}
                disabled={loading}
                className="px-10 py-4 bg-orange-600 text-white text-[11px] font-black uppercase tracking-widest rounded-2xl hover:scale-95 transition-all shadow-xl shadow-orange-600/20 disabled:opacity-50"
              >
                {loading ? 'Analyzing...' : 'Run Audit Now'}
              </button>
           </div>

           {auditResults && (
             <div className="grid grid-cols-1 gap-6">
                {[
                  { label: 'Fee Integrity', key: 'fees' },
                  { label: 'Exam Results Logic', key: 'results' },
                  { label: 'Security (RLS)', key: 'security' },
                ].map(a => (
                  <div key={a.key} className={`p-8 rounded-[2rem] border ${auditResults[a.key].ok ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/20' : 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-black uppercase tracking-widest dark:text-zinc-400">{a.label}</p>
                      {auditResults[a.key].ok ? <CheckCircle2 size={16} className="text-emerald-600" /> : <XCircle size={16} className="text-red-600" />}
                    </div>
                    <div className="flex items-baseline gap-2">
                       <p className="text-3xl font-black dark:text-white">{auditResults[a.key].ok ? 'Passed' : 'Issues Found'}</p>
                       <p className="text-xs text-zinc-500 font-bold uppercase">{auditResults[a.key].errors} Errors</p>
                    </div>
                    {!auditResults[a.key].ok && <p className="text-xs text-red-600 dark:text-red-400 mt-4 font-medium leading-relaxed">{auditResults[a.key].detail}</p>}
                  </div>
                ))}
             </div>
           )}
        </div>
      )}

      {/* Log Viewer Modal */}
      {showLogs && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
           <div className="w-full max-w-4xl bg-zinc-900 border border-zinc-800 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
              <div className="p-8 border-b border-zinc-800 flex items-center justify-between shrink-0">
                 <div>
                    <h3 className="text-lg font-bold text-white">Vercel Deployment Logs</h3>
                    <p className="text-[10px] text-zinc-500 font-mono mt-1">{showLogs}</p>
                 </div>
                 <button onClick={() => setShowLogs(null)} className="p-2 text-zinc-400 hover:text-white"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 font-mono text-[11px] space-y-1 bg-black/50">
                 {loadingLogs ? (
                   <p className="text-zinc-500 animate-pulse">Fetching event stream...</p>
                 ) : logs.length === 0 ? (
                   <p className="text-zinc-600 italic">No events recorded for this deployment.</p>
                 ) : logs.map((log, i) => (
                   <div key={i} className="flex gap-4 group">
                      <span className="text-zinc-700 shrink-0 select-none">[{new Date(log.created).toLocaleTimeString()}]</span>
                      <span className={log.type === 'error' ? 'text-red-400' : 'text-emerald-400 opacity-80'}>{log.text || log.payload?.text}</span>
                   </div>
                 ))}
              </div>
              <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex justify-end shrink-0">
                 <button onClick={() => viewLogs(showLogs)} className="px-5 py-2 bg-zinc-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-zinc-700 transition-all">Refresh Logs</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};
