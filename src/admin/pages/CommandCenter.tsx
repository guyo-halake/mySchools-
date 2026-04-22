import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/adminSupabase';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useAdminAlert } from '../context/AdminAlertContext';
import { InfrastructureAPI } from '../lib/admin_api';
import {
  Globe, Github, Rocket, Eye, Terminal, 
  ExternalLink, Database as DbIcon, Shield,
  RefreshCw, Plus, X, ArrowRight, Activity, 
  Code, FlaskConical, AlertCircle, CheckCircle2,
  Building2, Users, DollarSign, Briefcase, ChevronDown,
  UserPlus, Ticket, Layout, Layers, ShieldAlert, ChevronUp,
  RotateCcw, Clock, User as UserIcon, GitBranch, GitPullRequest,
  AlertOctagon, PlayCircle, Tag, Star, GitFork, Mail, Check, Bell, Lock,
  MapPin, Landmark, CreditCard, Upload
} from 'lucide-react';

const AddSchoolModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { showAlert } = useAdminAlert();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '', subdomain: '', email: '', location: '', phone_numbers: [''],
    admin_name: '', admin_email: '', admin_pass: '', confirm_pass: '',
    bank_name: '', bank_acc: '', paybill: '', logo_url: ''
  });

  const update = (obj: any) => setForm(p => ({ ...p, ...obj }));

  const handleAddSchool = async () => {
    if (!form.name) { showAlert('School name is required.', 'Error'); return; }
    if (form.admin_pass && form.admin_pass !== form.confirm_pass) { showAlert('Passwords do not match.', 'Error'); return; }

    setLoading(true);
    try {
      const { data: school, error: sErr } = await supabase.from('schools').insert({
        name: form.name,
        subdomain: form.subdomain || form.name.toLowerCase().replace(/\s+/g, '-'),
        email: form.email,
        location: form.location,
        phone_numbers: form.phone_numbers.filter(p => p.trim()),
        bank_name: form.bank_name,
        bank_acc: form.bank_acc,
        paybill_no: form.paybill,
        logo_url: form.logo_url
      }).select().single();

      if (sErr) throw sErr;

      // 2. Create Admin Profile if provided
      if (form.admin_email && form.admin_pass) {
        const { error: pErr } = await supabase.from('profiles').insert({
          id: window.crypto.randomUUID ? window.crypto.randomUUID() : undefined, // Browser internal UUID generator
          school_id: school.id,
          full_name: form.admin_name || 'School Admin',
          email: form.admin_email,
          password: form.admin_pass,
          role: 'ADMIN'
        });
        if (pErr) throw pErr;
      }

      // 3. Dispatch Emails (Background)
      InfrastructureAPI.sendOnboardingEmails({
        schoolName: form.name,
        schoolEmail: form.email,
        adminName: form.admin_name,
        adminEmail: form.admin_email,
        adminPass: form.admin_pass
      });

      showAlert(`${form.name} added please complete onboarding.`, 'Success');
      onClose();
    } catch (e: any) {
      if (e.code === '23505') {
        if (e.message?.toLowerCase().includes('subdomain')) {
          showAlert('This subdomain is already taken. Please choose a different one.', 'Overlap Error');
        } else {
          showAlert('This school or administrator already exists. Please check your entries.', 'Duplicate Error');
        }
      } else {
        showAlert(e.message, 'Operation Error');
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm px-4 py-3 rounded-xl outline-none focus:border-orange-600 transition-all placeholder:text-zinc-400";
  const labelClass = "text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5 block";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-zinc-950/20 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="w-full max-w-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
         
         <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
            <div>
               <h3 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Onboard Institution</h3>
               <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Step {step} of 3</p>
            </div>
            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-zinc-600 transition-colors"><X size={20} /></button>
         </div>

         <div className="p-8 max-h-[60vh] overflow-y-auto space-y-8">
            
            {step === 1 && (
               <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label className={labelClass}>School Name *</label>
                        <input value={form.name} onChange={e => update({ name: e.target.value })} className={inputClass} placeholder="" />
                     </div>
                     <div>
                        <label className={labelClass}>Preferred Subdomain</label>
                        <input value={form.subdomain} onChange={e => update({ subdomain: e.target.value })} className={inputClass} placeholder="id-slug" />
                     </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label className={labelClass}>Institution Email</label>
                        <input value={form.email} onChange={e => update({ email: e.target.value })} className={inputClass} placeholder="mail@institution.sc.ke" />
                     </div>
                     <div>
                        <label className={labelClass}>Location</label>
                        <input value={form.location} onChange={e => update({ location: e.target.value })} className={inputClass} placeholder="Street, City" />
                     </div>
                  </div>
                  <div className="space-y-3">
                     <label className={labelClass}>Phone Numbers</label>
                     {form.phone_numbers.map((p, i) => (
                        <div key={i} className="flex gap-2">
                           <input value={p} onChange={e => { const n = [...form.phone_numbers]; n[i] = e.target.value; update({ phone_numbers: n }); }} className={inputClass} placeholder="+254 000 000" />
                           {i === form.phone_numbers.length - 1 && (
                             <button onClick={() => update({ phone_numbers: [...form.phone_numbers, ''] })} className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-400 hover:text-orange-600 transition-all font-bold">
                               <Plus size={18} />
                             </button>
                           )}
                        </div>
                     ))}
                  </div>
               </div>
            )}

            {step === 2 && (
               <div className="space-y-6">
                  <div>
                     <label className={labelClass}>Admin Full Name</label>
                     <input value={form.admin_name} onChange={e => update({ admin_name: e.target.value })} className={inputClass} placeholder="Full Name" />
                  </div>
                  <div>
                     <label className={labelClass}>Admin Email (Login)</label>
                     <input value={form.admin_email} onChange={e => update({ admin_email: e.target.value })} className={inputClass} placeholder="admin@domain.com" />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label className={labelClass}>Password</label>
                        <input type="password" value={form.admin_pass} onChange={e => update({ admin_pass: e.target.value })} className={inputClass} placeholder="••••••••" />
                     </div>
                     <div>
                        <label className={labelClass}>Confirm Password</label>
                        <input type="password" value={form.confirm_pass} onChange={e => update({ confirm_pass: e.target.value })} className={inputClass} placeholder="••••••••" />
                     </div>
                  </div>
               </div>
            )}

            {step === 3 && (
               <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div>
                        <label className={labelClass}>Bank Name</label>
                        <input value={form.bank_name} onChange={e => update({ bank_name: e.target.value })} className={inputClass} placeholder="Financial Institution" />
                     </div>
                     <div>
                        <label className={labelClass}>Account Number</label>
                        <input value={form.bank_acc} onChange={e => update({ bank_acc: e.target.value })} className={inputClass} placeholder="000 000 000" />
                     </div>
                  </div>
                  <div>
                     <label className={labelClass}>Paybill Number</label>
                     <input value={form.paybill} onChange={e => update({ paybill: e.target.value })} className={inputClass} placeholder="000000" />
                  </div>
                  <div>
                     <label className={labelClass}>School Logo URL</label>
                     <div className="flex gap-2">
                        <input value={form.logo_url} onChange={e => update({ logo_url: e.target.value })} className={inputClass} placeholder="https://image-url" />
                        <button className="p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-400 hover:text-orange-600 transition-all font-bold">
                           <Upload size={18} />
                        </button>
                     </div>
                  </div>
               </div>
            )}

         </div>

         <div className="p-8 border-t border-zinc-100 dark:border-zinc-800 flex gap-4 bg-zinc-50/50 dark:bg-zinc-900/50">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="flex-1 py-3 text-zinc-600 dark:text-zinc-400 text-xs font-bold uppercase rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">Back</button>
            )}
            {step < 3 ? (
               <button onClick={() => setStep(step + 1)} className="flex-1 py-3 bg-orange-600 text-white text-xs font-bold uppercase rounded-xl shadow-lg shadow-orange-600/20 hover:bg-orange-700 transition-all">Continue</button>
            ) : (
               <div className="flex-1 flex gap-4">
                  <button onClick={() => showAlert('Lead sales added.', 'Info')} className="flex-1 py-3 text-zinc-600 dark:text-zinc-400 text-xs font-bold uppercase rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all">Add Lead Sales</button>
                  <button onClick={handleAddSchool} disabled={loading} className="flex-1 py-3 bg-orange-600 text-white text-xs font-bold uppercase rounded-xl shadow-lg shadow-orange-600/20 hover:bg-orange-700 transition-all">
                     {loading ? 'Creating...' : 'Add School'}
                  </button>
               </div>
            )}
         </div>
      </div>
    </div>
  );
};

export const CommandCenter: React.FC = () => {
  const { adminUser, isDarkMode } = useAdminAuth();
  const { showAlert } = useAdminAlert();

  const [stats, setStats] = useState({ 
    schoolsTotal: 0, 
    studentsTotal: 0, 
    revenue: 0,
    leads: 0,
    deals: 0
  });
  const [loading, setLoading] = useState(true);

  // app controls
  const [configTab, setConfigTab] = useState<'frontend' | 'github' | 'database'>('frontend');
  const [ghInnerTab, setGhInnerTab] = useState<'pulls' | 'issues' | 'releases' | 'env'>('pulls');
  const [addModalOpen, setAddModalOpen] = useState(false);
  
  // infrastructure
  const [vProject, setVProject]     = useState<any>(null);
  const [vDomains, setVDomains]     = useState<any[]>([]);
  const [vDeployments, setVDeployments] = useState<any[]>([]);
  const [activeEnv, setActiveEnv]   = useState<'production' | 'preview'>('production');
  const [envMenuOpen, setEnvMenuOpen] = useState(false);
  const [showAllBranches, setShowAllBranches] = useState(false);

  // github state
  const [ghRepo, setGhRepo]         = useState<any>(null);
  const [ghBranches, setGhBranches] = useState<any[]>([]);
  const [ghIssues, setGhIssues]     = useState<any[]>([]);
  const [ghPulls, setGhPulls]       = useState<any[]>([]);
  const [ghReleases, setGhReleases] = useState<any[]>([]);
  const [ghEnvs, setGhEnvs]         = useState<any[]>([]);

  const [showInlineLogs, setShowInlineLogs] = useState(false);
  const [logs, setLogs]                     = useState<any[]>([]);
  const [logLoading, setLogLoading]         = useState(false);
  const [showRestriction, setShowRestriction] = useState(false);
  const [dbTables, setDbTables]             = useState<any[]>([]);

  const colors = {
    text: isDarkMode ? '#FFFFFF' : '#000000',
    background: isDarkMode ? '#F8F9FA' : '#FFFBFE',
    surface: isDarkMode ? '#FFFFFF' : '#FFFFFF',
    accent: '#FCA311',
    link: '#2563EB',
    border: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  };

  const getGreeting = () => {
    const hr = new Date().getHours();
    if (hr < 12) return 'good morning';
    if (hr < 18) return 'good afternoon';
    return 'good evening';
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { count: sc }, { count: st }, { data: f },
        { count: leads }, { count: deals },
        proj, domains, deploys,
        repo, branches, issues, pulls, releases, envs
      ] = await Promise.all([
        supabase.from('schools').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'STUDENT'),
        supabase.from('fees').select('amount_paid'),
        supabase.from('sales_leads').select('*', { count: 'exact', head: true }),
        supabase.from('sales_leads').select('*', { count: 'exact', head: true }).in('stage', ['NEGOTIATION', 'WON', 'DEMO']),
        InfrastructureAPI.getVercelProject(),
        InfrastructureAPI.getProjectDomains(),
        InfrastructureAPI.getVercelDeployments(),
        InfrastructureAPI.getRepoInfo(),
        InfrastructureAPI.getBranches(),
        InfrastructureAPI.getIssues(),
        InfrastructureAPI.getPullRequests(),
        InfrastructureAPI.getReleases(),
        InfrastructureAPI.getEnvironments()
      ]);

      setStats({ 
        schoolsTotal: sc || 0, 
        studentsTotal: st || 0, 
        revenue: 0, 
        leads: leads || 0,
        deals: deals || 0
      });

      setVProject(proj);
      setVDomains(domains || []);
      
      const uniqueDeploys: any[] = [];
      const seenBranches = new Set();
      (deploys || []).forEach((d: any) => {
         const b = d.meta?.githubCommitRef || 'main';
         if (!seenBranches.has(b)) { seenBranches.add(b); uniqueDeploys.push(d); }
      });
      setVDeployments(uniqueDeploys);
      
      setGhRepo(repo);
      setGhBranches(branches || []);
      setGhIssues(issues || []);
      setGhPulls(pulls || []);
      setGhReleases(releases || []);
      setGhEnvs(envs || []);

      setDbTables([
        { name: 'schools', rows: sc },
        { name: 'profiles', rows: st },
        { name: 'fees', rows: (f || []).length },
        { name: 'sales_leads', rows: leads }
      ]);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [activeEnv]);

  const envDeployments = vDeployments.filter(d => 
    activeEnv === 'production' ? d.target === 'production' : d.target !== 'production'
  );
  const currentDeploy = envDeployments[0] || vDeployments[0];

  const renderBranchEntry = (d: any) => (
    <div key={d.uid} className="py-5 border-b last:border-0" style={{ borderColor: colors.border }}>
        <div className="flex items-center justify-between group">
           <div className="space-y-1">
              <div className="flex items-center gap-2">
                 <GitBranch size={13} className="opacity-40" />
                 <span className="text-sm font-bold lowercase">{d.meta?.githubCommitRef || 'main'}</span>
              </div>
              <div className="flex items-center gap-6 text-[10px] font-bold lowercase opacity-40">
                 <span className="flex items-center gap-1.5">status: <span className={d.state === 'READY' ? 'text-green-600 font-bold' : 'text-red-500'}>{d.state?.toLowerCase()}</span></span>
                 <span className="flex items-center gap-1.5">author: {d.creator?.username?.toLowerCase()}</span>
              </div>
           </div>
           <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
              <button onClick={() => setShowRestriction(true)} className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg"><RotateCcw size={13} /></button>
              <a href={`https://${d.url}`} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg"><Eye size={13} /></a>
           </div>
        </div>
    </div>
  );

  return (
    <div className="font-inter min-h-screen pb-32 transition-colors duration-300" style={{ backgroundColor: colors.background, color: colors.text }}>
      <div className="max-w-5xl mx-auto px-8 py-12 space-y-20">
        
        {/* Header */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 pb-10 border-b border-black/10">
          <div className="space-y-2">
             <h1 className="text-4xl font-bold tracking-tight font-sora lowercase text-black dark:text-white">
               {getGreeting()}, {adminUser?.full_name?.split(' ')[0] || 'admin'}
             </h1>
             <p className="text-xs font-bold lowercase tracking-[0.2em] opacity-40">Welcome to p3l developers.</p>
          </div>
          <div className="flex items-center gap-2">
             <button className="flex items-center gap-2 px-6 py-2.5 bg-black/5 dark:bg-white/5 border border-black/5 rounded-xl text-xs font-bold lowercase"><Ticket size={14} /> tickets</button>
             <button className="flex items-center gap-2 px-6 py-2.5 bg-black/5 dark:bg-white/5 border border-black/5 rounded-xl text-xs font-bold lowercase"><UserPlus size={14} /> onboard</button>
             <button onClick={() => setAddModalOpen(true)} className="flex items-center gap-2 px-6 py-3 text-black text-xs font-bold rounded-xl shadow-lg lowercase active:scale-95" style={{ backgroundColor: colors.accent }}><Plus size={14} /> add</button>
          </div>
        </header>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { label: 'total schools', val: stats.schoolsTotal, sub: `${stats.studentsTotal.toLocaleString()} students registered`, icon: Building2 },
            { label: 'active sales', val: stats.deals, sub: `${stats.leads} pipeline candidates`, icon: Briefcase },
            { label: 'realtime revenue', val: `KES ${stats.revenue.toLocaleString()}`, sub: 'net collections (live)', icon: DollarSign }
          ].map(c => (
            <div key={c.label} className="p-10 rounded-[2.5rem] space-y-6 border border-black/5 shadow-sm bg-white dark:bg-zinc-900 transition-all">
              <div className="flex items-center gap-3 opacity-30">
                <c.icon size={13} /><span className="text-[10px] font-bold uppercase tracking-widest">{c.label}</span>
              </div>
              <div className="space-y-1">
                 <p className="text-4xl font-bold tracking-tighter">{loading ? '...' : c.val}</p>
                 <p className="text-[11px] font-medium lowercase tracking-wide opacity-40">{c.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Controls */}
        <section className="space-y-12">
           <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold lowercase tracking-tight">ecosystem operations</h2>
              <div className="flex gap-2">
                {['frontend', 'github', 'database'].map(tab => (
                  <button key={tab} onClick={() => setConfigTab(tab as any)} className={`px-5 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${configTab === tab ? 'text-black shadow-lg bg-[#FCA311]' : 'opacity-40 hover:opacity-100'}`}>{tab === 'github' ? 'Github & Repositories' : tab === 'frontend' ? 'infrastructure' : tab}</button>
                ))}
              </div>
           </div>

           <div className="min-h-[600px] animate-in fade-in duration-500">
              {configTab === 'frontend' && (
                <div className="space-y-16">
                   <div className="flex items-end justify-between border-b pb-8" style={{ borderColor: colors.border }}>
                      <div className="space-y-2">
                         <h3 className="text-2xl font-bold tracking-tight lowercase">{vProject?.name || 'resultsystem'}</h3>
                         <div className="flex items-center gap-3 text-xs font-bold opacity-30 lowercase"><Github size={14} /> {ghRepo?.full_name || '...'}</div>
                      </div>
                      <div className="relative">
                         <div onClick={() => setEnvMenuOpen(!envMenuOpen)} className="flex items-center gap-3 px-5 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl text-xs font-bold lowercase tracking-widest cursor-pointer">env: {activeEnv} <ChevronDown size={14} /></div>
                         {envMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/10 shadow-2xl rounded-2xl p-1.5 z-50 overflow-hidden">
                               {['production', 'preview'].map(env => (
                                 <button key={env} onClick={() => { setActiveEnv(env as any); setEnvMenuOpen(false); }} className={`w-full text-left px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${activeEnv === env ? 'bg-[#FCA311] text-black shadow-md' : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>{env}</button>
                               ))}
                            </div>
                         )}
                      </div>
                   </div>

                   <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                      <div className="space-y-6">
                         <span className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em]">Live Branches</span>
                         <div className="space-y-1">
                            {envDeployments.length > 0 ? envDeployments.slice(0, showAllBranches ? 10 : 3).map(renderBranchEntry) : <p className="text-xs opacity-20 py-10 text-center border-2 border-dashed rounded-3xl" style={{ borderColor: colors.border }}>syncing build pipeline...</p>}
                         </div>
                         <button onClick={() => setShowAllBranches(!showAllBranches)} className="text-[10px] font-bold lowercase opacity-40 hover:opacity-100">{showAllBranches ? 'show less' : 'view full history'}</button>
                      </div>
                      <div className="space-y-12">
                         <div className="space-y-6">
                            <span className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em]">Public Connectivity</span>
                            <div className="space-y-4">
                               {vDomains.filter(d => !d.redirect).slice(0, 3).map(d => (
                                  <a key={d.name} href={`https://${d.name}`} target="_blank" rel="noreferrer" className="block text-sm font-bold hover:underline lowercase" style={{ color: colors.link }}>https://{d.name}</a>
                               ))}
                            </div>
                         </div>
                         <div className="space-y-4 pt-8 border-t border-black/5">
                            <span className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em]">Deployment URL</span>
                            <a href={`https://${currentDeploy?.url}`} target="_blank" rel="noreferrer" className="block text-sm font-bold underline truncate lowercase" style={{ color: colors.link }}>https://{currentDeploy?.url || '...'}</a>
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {configTab === 'github' && (
                <div className="space-y-12">
                   <div className="space-y-3 pb-8 border-b" style={{ borderColor: colors.border }}>
                      <h3 className="text-3xl font-bold tracking-tight lowercase">{ghRepo?.name || 'resultsystem'}</h3>
                      <p className="text-sm font-medium opacity-50 lowercase max-w-2xl">{ghRepo?.description || 'educational results and school management ecosystem core.'}</p>
                      <div className="flex items-center gap-6 pt-4 text-xs font-bold lowercase opacity-40">
                         <div className="flex items-center gap-2"><Code size={14} /> language: {ghRepo?.language || 'typescript'}</div>
                         <div className="flex items-center gap-2"><UserIcon size={14} /> owner: {ghRepo?.owner?.login || 'guyo'}</div>
                      </div>
                   </div>

                   <div className="flex gap-4 border-b" style={{ borderColor: colors.border }}>
                      {[
                        { id: 'pulls', label: 'Pull Requests', icon: GitPullRequest, count: ghPulls.length },
                        { id: 'issues', label: 'Issues', icon: AlertOctagon, count: ghIssues.length },
                        { id: 'env', label: 'Environments', icon: Globe, count: ghEnvs.length },
                        { id: 'releases', label: 'Releases', icon: Tag, count: ghReleases.length }
                      ].map(t => (
                        <button key={t.id} onClick={() => setGhInnerTab(t.id as any)} className={`pb-3 px-2 flex items-center gap-2 text-xs font-bold transition-all border-b-2 ${ghInnerTab === t.id ? 'border-[#FCA311] text-black dark:text-white' : 'border-transparent opacity-40 hover:opacity-100'}`}>
                           <t.icon size={14} /> {t.label} <span className="px-1.5 py-0.5 bg-black/5 dark:bg-white/5 rounded-md text-[10px]">{t.count}</span>
                        </button>
                      ))}
                   </div>

                   <div className="animate-in slide-in-from-top-4 duration-300">
                      {ghInnerTab === 'pulls' && (
                        <div className="space-y-4">
                           {ghPulls.length > 0 ? ghPulls.map(pr => (
                             <div key={pr.id} className="flex items-center justify-between p-6 bg-white dark:bg-zinc-900 border rounded-3xl group shadow-sm" style={{ borderColor: colors.border }}>
                                <div className="space-y-1 min-w-0">
                                   <p className="text-sm font-bold lowercase truncate group-hover:text-[#FCA311] transition-colors">{pr.title}</p>
                                   <p className="text-[10px] font-bold opacity-40 lowercase">#{pr.number} by {pr.user?.login} • opened {new Date(pr.created_at).toLocaleDateString()}</p>
                                </div>
                                <div className="flex gap-2">
                                   <button className="px-4 py-2 bg-black text-white text-[10px] font-bold uppercase rounded-lg hover:opacity-80 transition-all">Merge</button>
                                   <button className="p-2 border rounded-lg opacity-40 hover:opacity-100 transition-all" title="remind me"><Bell size={14} /></button>
                                </div>
                             </div>
                           )) : <p className="text-xs opacity-20 py-20 text-center uppercase tracking-widest font-black">syncing pull requests...</p>}
                        </div>
                      )}
                   </div>
                </div>
              )}

              {configTab === 'database' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                   {dbTables.map(t => (
                     <div key={t.name} className="p-8 border rounded-[2rem] space-y-4 bg-white dark:bg-zinc-900 shadow-sm" style={{ borderColor: colors.border }}>
                        <div className="flex items-center justify-between text-black/30"><DbIcon size={14} /><span className="text-[10px] font-bold uppercase tracking-widest">schema</span></div>
                        <div className="space-y-0.5"><p className="text-xl font-bold lowercase">{t.name}</p><p className="text-[11px] font-bold opacity-40">{t.rows} total records</p></div>
                     </div>
                   ))}
                </div>
              )}
           </div>
        </section>
      </div>

      <footer className="fixed bottom-0 left-0 right-0 z-40 px-8 py-8 pointer-events-none">
        <a href="https://p3ldevelopers.vercel.app" target="_blank" rel="noreferrer" className="max-w-5xl mx-auto flex flex-col items-center justify-center pointer-events-auto">
           <p className="text-[10px] font-bold lowercase opacity-40">by razak guyo, P3L Developers</p>
           <p className="text-[10px] font-bold lowercase opacity-40 mt-1">© matta africa</p>
        </a>
      </footer>

      {addModalOpen && <AddSchoolModal onClose={() => { setAddModalOpen(false); fetchData(); }} />}

    </div>
  );
};
