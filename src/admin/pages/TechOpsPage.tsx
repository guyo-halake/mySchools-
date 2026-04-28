import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/adminSupabase';
import { useAdminAlert } from '../context/AdminAlertContext';
import { InfrastructureAPI } from '../lib/admin_api';
import {
  Globe, Github, RefreshCw, Terminal, 
  GitPullRequest, GitCommit, AlertCircle, Play,
  Power, ExternalLink, GitMerge, FileCode2,
  ServerCrash, Settings, RotateCcw, GitBranch,
  Activity, Search, RotateCcw as RollbackIcon,
  LayoutGrid, ShieldCheck, History, X
} from 'lucide-react';

export const TechOpsPage: React.FC = () => {
  const { showAlert } = useAdminAlert();

  const [activeTab, setActiveTab] = useState<'Vercel' | 'GitHub' | 'Scripts' | 'Security'>('Vercel');
  
  // Real Data State
  const [deployments, setDeployments] = useState<any[]>([]);
  const [domains, setDomains] = useState<any[]>([]);
  const [pulls, setPulls] = useState<any[]>([]);
  const [commits, setCommits] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [repoInfo, setRepoInfo] = useState<any>(null);
  const [maintenance, setMaintenance] = useState(false);
  
  const [loading, setLoading] = useState(true);

  // Log viewer state
  const [showLogs, setShowLogs] = useState<string | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Script Runner State
  const [scripts, setScripts] = useState<string[]>([]);
  const [activeScript, setActiveScript] = useState<string | null>(null);
  const [scriptOutput, setScriptOutput] = useState<string>('Select a script from the left to execute it on the server.');
  const [isExecuting, setIsExecuting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    
    // 1. Get Kill Switch Status
    const { data: mData } = await supabase.from('system_settings').select('value').eq('id', 'maintenance_mode').single();
    if (mData) setMaintenance(mData.value.enabled);

    // 2. Fetch Vercel & GitHub Data concurrently
    const [verDeploys, verDomains, ghPulls, ghCommits, ghIssues, ghWorkflows, ghRepo] = await Promise.all([
      InfrastructureAPI.getVercelDeployments(),
      InfrastructureAPI.getProjectDomains(),
      InfrastructureAPI.getPullRequests(),
      InfrastructureAPI.getCommits(),
      InfrastructureAPI.getIssues(),
      InfrastructureAPI.getWorkflows(),
      InfrastructureAPI.getRepoInfo()
    ]);

    setDeployments(Array.isArray(verDeploys) ? verDeploys : []);
    setDomains(Array.isArray(verDomains) ? verDomains : []);
    setPulls(Array.isArray(ghPulls) ? ghPulls : []);
    setCommits(Array.isArray(ghCommits) ? ghCommits : []);
    setIssues(Array.isArray(ghIssues) ? ghIssues : []);
    setWorkflows(Array.isArray(ghWorkflows) ? ghWorkflows : []);
    setRepoInfo(ghRepo);

    // 3. Fetch OS Scripts from backend
    try {
      const res = await fetch('http://localhost:5000/api/techops/scripts');
      const data = await res.json();
      if (data.success && data.scripts) {
        setScripts(data.scripts);
      }
    } catch (e) {
      console.error('Failed to load scripts from backend:', e);
    }

    setLoading(false);
  }, []);

  useEffect(() => { 
    loadData(); 
    const interval = setInterval(() => {
      loadData();
    }, 10000); 
    return () => clearInterval(interval);
  }, [loadData]);

  const toggleMaintenance = async () => {
    const next = !maintenance;
    const { error } = await supabase.from('system_settings')
      .update({ value: { enabled: next, message: 'System under maintenance' } })
      .eq('id', 'maintenance_mode');
    
    if (!error) {
      setMaintenance(next);
      showAlert(`System Kill Switch: ${next ? 'ACTIVATED' : 'DEACTIVATED'}`, next ? 'Danger' : 'Success');
    }
  };

  const redeploy = async (id: string) => {
    showAlert('Redeploying...', 'System');
    await InfrastructureAPI.triggerRedeploy(id);
    loadData();
  };

  const viewLogs = async (id: string) => {
    setShowLogs(id);
    setLoadingLogs(true);
    const data = await InfrastructureAPI.getVercelLogs(id);
    setLogs(Array.isArray(data) ? data : []);
    setLoadingLogs(false);
  };

  const rollback = async (id: string) => {
    const domain = domains.find(d => !d.name.includes('vercel.app'))?.name || 'p3lschools.vercel.app';
    showAlert('Rolling back...', 'System');
    await InfrastructureAPI.rollbackDeployment(id, domain);
    loadData();
  };

  const runScript = async () => {
    if (!activeScript) return;
    setIsExecuting(true);
    setScriptOutput(`> Executing ${activeScript}...\n`);
    try {
      const res = await fetch('http://localhost:5000/api/techops/run-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptName: activeScript })
      });
      if (!res.body) throw new Error('Stream error');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setScriptOutput(prev => prev + decoder.decode(value));
      }
    } catch (err: any) {
       setScriptOutput(prev => prev + `\n> Error: ${err.message}`);
    } finally {
       setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-20 px-4">

      {/* Header */}
      <div className="flex items-center justify-between pb-8 border-b border-zinc-100 dark:border-zinc-800">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold dark:text-white tracking-tight font-sora">Tech Ops</h1>
          <p className="text-[10px] text-zinc-400 uppercase font-black tracking-[0.2em]">Infrastructure Command Center</p>
        </div>
        <div className="flex gap-4">
           <button 
             onClick={toggleMaintenance}
             className={`flex items-center gap-2 px-8 py-3 rounded-[1.5rem] text-[11px] font-black uppercase tracking-widest transition-all ${maintenance ? 'bg-red-600 text-white shadow-xl shadow-red-600/30' : 'bg-zinc-50 text-zinc-500 border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700'}`}
           >
             <Power size={14} /> {maintenance ? 'Disable Kill Switch' : 'Enable Kill Switch'}
           </button>
           <button onClick={loadData} className="p-4 bg-zinc-900 text-white dark:bg-zinc-800 rounded-[1.5rem] group hover:scale-105 transition-transform">
             <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
           </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-100 dark:border-zinc-800 gap-10">
        {[
          { id: 'Vercel', icon: Globe, label: 'Vercel' },
          { id: 'GitHub', icon: Github, label: 'GitHub' },
          { id: 'Scripts', icon: Terminal, label: 'Scripts' },
          { id: 'Security', icon: ServerCrash, label: 'Security' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 pb-6 text-[11px] font-black uppercase tracking-[0.15em] border-b-2 transition-all ${activeTab === tab.id ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-white' : 'border-transparent text-zinc-400'}`}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'Vercel' && (
        <div className="space-y-10 animate-in fade-in duration-500">
           
           {/* SYSTEM INFORMATION CARD */}
           <div className="bg-white dark:bg-zinc-900 rounded-[2.5rem] overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-xl shadow-zinc-200/20 dark:shadow-none">
              <div className="p-10 flex flex-col lg:flex-row justify-between items-start gap-12">
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <p className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-400">Project Information</p>
                       <h2 className="text-3xl font-bold text-zinc-900 dark:text-white font-sora">MySchools - resultsystem</h2>
                       <p className="text-sm text-zinc-500 font-medium font-inter">v1.2.4 • Production OS • Managed by P3L Developers</p>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-2">
                       {['Vercel Edge', 'Postgres 15', 'Node 24.x', 'GitHub Actions'].map(t => (
                          <span key={t} className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/50 dark:border-zinc-700/50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{t}</span>
                       ))}
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-x-16 gap-y-8 text-sm w-full lg:w-auto">
                    <div>
                       <p className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-400 mb-2">Repository</p>
                       <p className="font-bold text-zinc-900 dark:text-zinc-200 font-inter">{repoInfo?.full_name || 'guyo-halake/resultsystem'}</p>
                       <a href={repoInfo?.html_url || '#'} target="_blank" className="text-[10px] text-blue-600 hover:text-blue-700 mt-1 font-black uppercase tracking-wider inline-flex items-center gap-1">Open Repo <ExternalLink size={10} /></a>
                    </div>
                    <div>
                       <p className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-400 mb-2">Build Health</p>
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <p className="font-bold text-zinc-900 dark:text-zinc-200">System Ready</p>
                       </div>
                    </div>
                    <div>
                       <p className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-400 mb-2">Deployments</p>
                       <p className="font-bold text-zinc-900 dark:text-zinc-200 font-inter">{deployments.length} Active</p>
                    </div>
                    <div>
                       <p className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-400 mb-2">Region</p>
                       <p className="font-bold text-zinc-900 dark:text-zinc-200 uppercase tracking-widest">iad1 (Edge)</p>
                    </div>
                 </div>
              </div>
           </div>

           {/* ENVIRONMENTS GRID */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Production Environment Card */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col">
                 <div className="p-8 border-b border-zinc-50 dark:border-zinc-800/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-zinc-900 text-white rounded-xl"><ShieldCheck size={18} /></div>
                       <h3 className="text-lg font-bold text-zinc-900 dark:text-white font-sora">Production</h3>
                    </div>
                    {(() => {
                       const prod = deployments.find(d => d.target === 'production');
                       if(!prod) return null;
                       return (
                          <div className="flex gap-2">
                             <button onClick={() => redeploy(prod.uid)} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-900 hover:text-white text-zinc-900 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Redeploy</button>
                             <a href={`https://github.com/${prod.meta?.githubCommitRepo}`} target="_blank" className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-900 hover:text-white text-zinc-900 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Repository</a>
                             <a href={`https://${domains.find(d => !d.name.includes('vercel.app'))?.name || prod.url}`} target="_blank" className="px-4 py-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Visit</a>
                          </div>
                       );
                    })()}
                 </div>
                 <div className="p-10 space-y-8 flex-1">
                    {(() => {
                       const prod = deployments.find(d => d.target === 'production');
                       if (!prod) return <p className="text-sm text-zinc-500 italic">Connecting to production edge...</p>;
                       return (
                          <div className="space-y-8">
                             <div className="space-y-1">
                                <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">Domain Alias</p>
                                <a href={`https://${domains.find(d => !d.name.includes('vercel.app'))?.name || prod.url}`} target="_blank" className="text-xl font-bold text-zinc-900 dark:text-white hover:text-blue-600 transition-colors block">{domains.find(d => !d.name.includes('vercel.app'))?.name || 'p3lschools.vercel.app'}</a>
                             </div>
                             <div className="grid grid-cols-2 gap-6 pt-6 border-t border-zinc-50 dark:border-zinc-800">
                                <div>
                                   <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em] mb-1">Branch</p>
                                   <div className="flex items-center gap-2">
                                      <GitBranch size={14} className="text-zinc-400" />
                                      <span className="text-sm font-bold text-zinc-900 dark:text-white">{prod.meta?.githubCommitRef || 'Develop'}</span>
                                   </div>
                                </div>
                                <div>
                                   <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em] mb-1">Status</p>
                                   <div className="flex items-center gap-2">
                                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                                      <span className="text-[11px] font-black uppercase text-zinc-900 dark:text-white">{prod.state}</span>
                                   </div>
                                </div>
                             </div>
                             <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                                <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 italic line-clamp-2">"{prod.meta?.githubCommitMessage}"</p>
                             </div>
                          </div>
                       );
                    })()}
                 </div>
              </div>

              {/* Preview Environment Card (Staging) */}
              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-sm flex flex-col">
                 <div className="p-8 border-b border-zinc-50 dark:border-zinc-800/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-blue-600 text-white rounded-xl"><LayoutGrid size={18} /></div>
                       <h3 className="text-lg font-bold text-zinc-900 dark:text-white font-sora">Staging / Preview</h3>
                    </div>
                    {(() => {
                       const prev = deployments.find(d => d.target !== 'production');
                       if(!prev) return null;
                       return (
                          <div className="flex gap-2">
                             <button onClick={() => redeploy(prev.uid)} className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-900 hover:text-white text-zinc-900 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Redeploy</button>
                             <a href={`https://github.com/${prev.meta?.githubCommitRepo}`} target="_blank" className="px-4 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-900 hover:text-white text-zinc-900 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Repository</a>
                             <a href={`https://${prev.url}`} target="_blank" className="px-4 py-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Visit</a>
                          </div>
                       );
                    })()}
                 </div>
                 <div className="p-10 space-y-8 flex-1">
                    {(() => {
                       const prev = deployments.find(d => d.target !== 'production');
                       if (!prev) return <p className="text-sm text-zinc-500 italic">Scanning for preview artifacts...</p>;
                       return (
                          <div className="space-y-8">
                             <div className="space-y-1">
                                <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em]">Deployment URL</p>
                                <a href={`https://${prev.url}`} target="_blank" className="text-xl font-bold text-zinc-900 dark:text-white hover:text-blue-600 transition-colors block truncate">{prev.url}</a>
                             </div>
                             <div className="grid grid-cols-2 gap-6 pt-6 border-t border-zinc-50 dark:border-zinc-800">
                                <div>
                                   <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em] mb-1">Active Branch</p>
                                   <div className="flex items-center gap-2">
                                      <GitMerge size={14} className="text-zinc-400" />
                                      <span className="text-sm font-bold text-zinc-900 dark:text-white">{prev.meta?.githubCommitRef || 'pschoolv1.2.1'}</span>
                                   </div>
                                </div>
                                <div>
                                   <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em] mb-1">State</p>
                                   <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${prev.state === 'READY' ? 'bg-blue-500 shadow-lg shadow-blue-500/50' : 'bg-amber-500'}`} />
                                      <span className="text-[11px] font-black uppercase text-zinc-900 dark:text-white">{prev.state}</span>
                                   </div>
                                </div>
                             </div>
                             <div className="p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800/50">
                                <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 italic line-clamp-2">"{prev.meta?.githubCommitMessage}"</p>
                             </div>
                          </div>
                       );
                    })()}
                 </div>
              </div>
           </div>

           {/* DEPLOYMENT HISTORY & OBSERVABILITY */}
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                 <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-sm">
                    <div className="p-8 border-b border-zinc-50 dark:border-zinc-800/50 flex items-center justify-between">
                       <h3 className="text-lg font-bold text-zinc-900 dark:text-white font-sora">Recent Deployments</h3>
                       <div className="relative">
                          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
                          <input type="text" placeholder="Search..." className="bg-zinc-50 dark:bg-zinc-800 rounded-xl pl-10 pr-6 py-2 text-[11px] font-bold outline-none w-64" />
                       </div>
                    </div>
                    <div className="overflow-x-auto">
                       <table className="w-full text-left">
                          <thead>
                             <tr className="border-b border-zinc-50 dark:border-zinc-800">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Target</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Env</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Actions</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                             {deployments.map(d => (
                                <tr key={d.uid} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                                   <td className="px-8 py-6">
                                      <div className="flex flex-col">
                                         <span className="text-[13px] font-bold text-zinc-900 dark:text-white line-clamp-1">{d.meta?.githubCommitMessage || 'Deployment'}</span>
                                         <span className="text-[10px] text-zinc-500 font-mono mt-1">{d.meta?.githubCommitSha?.substring(0,7)}</span>
                                      </div>
                                   </td>
                                   <td className="px-8 py-6">
                                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md text-zinc-500">
                                         {d.target === 'production' ? 'PROD' : 'PREV'}
                                      </span>
                                   </td>
                                   <td className="px-8 py-6">
                                      <div className="flex items-center gap-2">
                                         <div className={`w-1.5 h-1.5 rounded-full ${d.state === 'READY' ? 'bg-blue-500' : 'bg-red-500'}`} />
                                         <span className="text-[11px] font-black uppercase tracking-widest text-zinc-900 dark:text-white">{d.state}</span>
                                      </div>
                                   </td>
                                   <td className="px-8 py-6 text-right">
                                      <div className="flex items-center justify-end gap-3">
                                         <a href={`https://${d.url}`} target="_blank" className="text-[10px] font-black uppercase text-blue-600">Visit</a>
                                         <a href={`https://github.com/${d.meta?.githubCommitRepo}`} target="_blank" className="text-[10px] font-black uppercase text-zinc-400">Repo</a>
                                         {d.state === 'READY' && (
                                            <button onClick={() => rollback(d.uid)} className="text-[10px] font-black uppercase text-red-600">Rollback</button>
                                         )}
                                      </div>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>

              <div className="space-y-8">
                 <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] p-8 shadow-sm">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white font-sora mb-6">Observability</h3>
                    <div className="space-y-4">
                       <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Edge Requests</span>
                          <span className="text-base font-black text-zinc-900 dark:text-white">0</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Error Rate</span>
                          <span className="text-base font-black text-zinc-900 dark:text-white">0%</span>
                       </div>
                    </div>
                 </div>
                 <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] p-8 shadow-sm">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-white font-sora mb-6">Node Config</h3>
                    <div className="space-y-4">
                       <div>
                          <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em] mb-1">Architecture</p>
                          <p className="text-sm font-bold text-zinc-900 dark:text-white">4 vCPU • 8 GB RAM</p>
                       </div>
                       <div>
                          <p className="text-[10px] text-zinc-400 font-black uppercase tracking-[0.2em] mb-1">Region</p>
                          <p className="text-sm font-bold text-zinc-900 dark:text-white uppercase font-mono tracking-widest">iad1</p>
                       </div>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Other Tabs simplified for restoration */}
      {activeTab === 'GitHub' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] p-10 animate-in fade-in">
           <h3 className="text-xl font-bold mb-8">Source Control</h3>
           <div className="space-y-6">
              {commits.slice(0, 10).map((c: any) => (
                 <div key={c.sha} className="flex gap-4">
                    <img src={c.author?.avatar_url} className="w-8 h-8 rounded-full" alt=""/>
                    <div>
                       <p className="text-sm font-bold">{c.commit.message}</p>
                       <p className="text-[10px] text-zinc-400 uppercase font-black">{c.commit.author.name} • {new Date(c.commit.author.date).toLocaleString()}</p>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'Scripts' && (
        <div className="h-[600px] border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden flex bg-white dark:bg-zinc-900">
           <div className="w-64 border-r border-zinc-100 dark:border-zinc-800 p-6 space-y-2">
              <p className="text-[10px] font-black text-zinc-400 uppercase mb-4">OS Scripts</p>
              {scripts.map(s => (
                 <button key={s} onClick={() => setActiveScript(s)} className={`w-full text-left p-3 rounded-xl text-xs font-bold ${activeScript === s ? 'bg-zinc-900 text-white' : 'text-zinc-500'}`}>{s}</button>
              ))}
           </div>
           <div className="flex-1 flex flex-col bg-[#09090b]">
              <div className="p-6 border-b border-zinc-800 flex justify-between items-center">
                 <p className="text-[10px] text-zinc-500 font-mono">{activeScript || 'IDLE'}</p>
                 <button onClick={runScript} disabled={!activeScript || isExecuting} className="px-6 py-2 bg-white text-black rounded-xl text-[10px] font-black uppercase">Run</button>
              </div>
              <pre className="flex-1 p-8 overflow-auto font-mono text-[13px] text-emerald-400">{scriptOutput}</pre>
           </div>
        </div>
      )}

      {activeTab === 'Security' && (
        <div className="max-w-2xl bg-red-50/30 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30 rounded-[3rem] p-12 space-y-6">
           <h3 className="text-2xl font-bold text-red-900 dark:text-red-400">Global Overrides</h3>
           <p className="text-sm text-red-700/80 leading-relaxed">Triggering the kill switch will lock all user access across the platform.</p>
           <button onClick={toggleMaintenance} className="px-8 py-3 bg-red-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest">{maintenance ? 'Disable Kill Switch' : 'ACTIVATE KILL SWITCH'}</button>
        </div>
      )}

      {/* Log Modal */}
      {showLogs && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-zinc-950/80 backdrop-blur-xl">
           <div className="w-full max-w-4xl bg-black border border-zinc-800 rounded-[3rem] overflow-hidden flex flex-col h-[70vh]">
              <div className="p-10 border-b border-zinc-800 flex justify-between items-center">
                 <h3 className="text-lg font-bold text-white uppercase tracking-widest font-mono">{showLogs.substring(0,12)}</h3>
                 <button onClick={() => setShowLogs(null)} className="p-3 bg-zinc-900 rounded-full text-white"><X size={20}/></button>
              </div>
              <pre className="flex-1 p-10 overflow-auto font-mono text-xs text-zinc-400">
                 {loadingLogs ? 'Streaming logs...' : logs.length === 0 ? 'No log events.' : logs.map(l => l.text).join('\n')}
              </pre>
           </div>
        </div>
      )}

    </div>
  );
};
