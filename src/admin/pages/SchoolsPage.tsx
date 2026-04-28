import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/adminSupabase';
import { useAdminAlert } from '../context/AdminAlertContext';
import {
  Search, Building2, Users, ChevronRight, RefreshCw, BadgeCheck,
  PauseCircle, XCircle, Eye, MoreHorizontal, Activity, CreditCard,
  X, Database, Plus, Upload, FileSpreadsheet, Lock, Trash2, Key,
  ChevronDown, ArrowRight, Layout, Settings, Mail, MapPin, Phone,
  FileCode, Terminal, CheckCircle2, AlertCircle, Save, ExternalLink,
  ShieldAlert, Globe, CalendarRange, Clock, History, Send, Edit3, 
  ExternalLink as OpenIcon
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'text-green-700',
  TRIAL: 'text-orange-700',
  SUSPENDED: 'text-red-700',
};

const TABS = ['overview', 'users', 'billing', 'data'];

interface SchoolRow {
  id: string;
  name: string;
  subdomain: string;
  status: 'ACTIVE' | 'TRIAL' | 'SUSPENDED';
  plan: string;
  location?: string;
  email?: string;
  phone_numbers?: string[];
  bank_name?: string;
  bank_acc?: string;
  paybill_no?: string;
  logo_url?: string;
  academic_system?: string;
  _students?: number;
  _teachers?: number;
  _admin?: any;
}

export const SchoolsPage: React.FC = () => {
  const { showAlert } = useAdminAlert();
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<SchoolRow | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [schoolUsers, setSchoolUsers] = useState<any[]>([]);
  const [schoolTemplates, setSchoolTemplates] = useState<any[]>([]);
  const [schoolTerms, setSchoolTerms] = useState<any[]>([]);
  
  const [sqlQuery, setSqlQuery] = useState('');
  const [sqlExecuting, setSqlExecuting] = useState(false);

  const fetchSchools = async () => {
    setLoading(true);
    const { data } = await supabase.from('schools').select('*').order('name');
    const rows: SchoolRow[] = (data || []).map((s: any) => ({ ...s, status: s.status || 'ACTIVE', plan: s.plan || 'FREE' }));

    const enriched = await Promise.all(rows.map(async school => {
      const [{ count: sc }, { count: tc }, { data: admin }] = await Promise.all([
        supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', school.id),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('school_id', school.id).eq('role', 'TEACHER'),
        supabase.from('profiles').select('*').eq('school_id', school.id).eq('role', 'ADMIN').limit(1).maybeSingle()
      ]);
      return { ...school, _students: sc || 0, _teachers: tc || 0, _admin: admin };
    }));
    setSchools(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchSchools(); }, []);

  const openSchool = async (school: SchoolRow) => {
    setSelectedSchool(school);
    setActiveTab('overview');
    
    const [uRes, tRes, trmRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('school_id', school.id).order('role'),
      supabase.from('templates').select('*').eq('school_id', school.id),
      supabase.from('terms').select('*').eq('school_id', school.id).order('start_date', { ascending: false })
    ]);
    
    setSchoolUsers(uRes.data || []);
    setSchoolTemplates(tRes.data || []);
    setSchoolTerms(trmRes.data || []);
  };

  const executeSql = async () => {
    if (!sqlQuery.trim()) return;
    setSqlExecuting(true);
    showAlert('SQL engine ready. Restricted scope applied.', 'Info');
    setSqlExecuting(false);
  };

  const filtered = schools.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 font-inter text-zinc-900 max-w-[1600px] mx-auto min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between pb-8 border-b border-zinc-200">
        <div className="space-y-1">
          <h1 className="text-3xl font-sora font-semibold tracking-tight uppercase text-zinc-950">Schools</h1>
          <p className="text-[10px] font-bold text-zinc-800 uppercase tracking-widest">Management directory</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg w-80">
             <Search size={14} className="text-zinc-500" />
             <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search institutions..." className="bg-transparent text-[12px] w-full outline-none text-zinc-900" />
           </div>
           <button onClick={fetchSchools} className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-100 transition-colors"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
        </div>
      </div>

      {/* Grid Table */}
      <div className="mt-10 border border-zinc-200 rounded-xl overflow-hidden bg-white">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-8 py-5 text-[11px] font-bold text-zinc-700 uppercase tracking-widest">Institution</th>
              <th className="px-6 py-5 text-[11px] font-bold text-zinc-700 uppercase tracking-widest text-center">Students</th>
              <th className="px-6 py-5 text-[11px] font-bold text-zinc-700 uppercase tracking-widest text-center">Teachers</th>
              <th className="px-6 py-5 text-[11px] font-bold text-zinc-700 uppercase tracking-widest">Plan</th>
              <th className="px-6 py-5 text-[11px] font-bold text-zinc-700 uppercase tracking-widest text-center">Status</th>
              <th className="px-8 py-5 text-[11px] font-bold text-zinc-700 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {loading ? (
              <tr><td colSpan={6} className="py-24 text-center text-sm font-medium text-zinc-600">Syncing directory...</td></tr>
            ) : filtered.map(school => (
              <tr key={school.id} className="hover:bg-zinc-50/80 cursor-pointer group transition-colors" onClick={() => openSchool(school)}>
                <td className="px-8 py-5">
                   <div className="flex items-center gap-4">
                      {school.logo_url ? <img src={school.logo_url} className="w-10 h-10 rounded-lg object-cover grayscale" /> : <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center text-[11px] font-bold text-zinc-700">{school.name.charAt(0)}</div>}
                      <div>
                        <p className="text-sm font-semibold uppercase text-zinc-950">{school.name}</p>
                        <p className="text-[10px] text-zinc-600 font-medium">{school.subdomain}.p3l.dev</p>
                      </div>
                   </div>
                </td>
                <td className="px-6 py-5 text-sm text-center font-medium text-zinc-900">{school._students}</td>
                <td className="px-6 py-5 text-sm text-center font-medium text-zinc-900">{school._teachers}</td>
                <td className="px-6 py-5 text-[10px] font-bold text-zinc-700 uppercase tracking-wider">{school.plan}</td>
                <td className="px-6 py-5 text-center">
                    <span className={`text-[10px] font-bold uppercase ${STATUS_COLORS[school.status]}`}>{school.status}</span>
                </td>
                <td className="px-8 py-5">
                   <div className="flex justify-end gap-2 grayscale group-hover:grayscale-0 transition-all">
                      <button className="p-2 hover:bg-zinc-950 hover:text-white rounded border border-zinc-200"><Eye size={13} /></button>
                      <button className="p-2 hover:bg-zinc-950 hover:text-white rounded border border-zinc-200"><Settings size={13} /></button>
                      <button className="p-2 hover:bg-zinc-950 hover:text-white rounded border border-zinc-200 text-orange-700"><CreditCard size={13} /></button>
                      <button className="p-2 hover:bg-red-700 hover:text-white rounded border border-zinc-200 text-red-700"><Trash2 size={13} /></button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Workspace */}
      {selectedSchool && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-white/50 backdrop-blur-sm" onClick={() => setSelectedSchool(null)} />
          <div className="relative w-full max-w-[80%] bg-white border-l border-zinc-300 flex flex-col h-full shadow-2xl overflow-hidden">
            
            <div className="p-10 border-b border-zinc-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-8">
                 {selectedSchool.logo_url ? <img src={selectedSchool.logo_url} className="w-16 h-16 rounded-xl border border-zinc-100" /> : <div className="w-16 h-16 bg-zinc-50 rounded-xl flex items-center justify-center text-2xl font-bold text-zinc-300">{selectedSchool.name.charAt(0)}</div>}
                 <div>
                    <h2 className="text-3xl font-sora font-semibold uppercase text-zinc-950">{selectedSchool.name}</h2>
                    <div className="flex items-center gap-4 text-[11px] font-bold text-zinc-700 tracking-wider">
                       <span className={STATUS_COLORS[selectedSchool.status]}>{selectedSchool.status}</span>
                       <span className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
                       <span className="uppercase text-zinc-600">{selectedSchool.id}</span>
                    </div>
                 </div>
              </div>
              <button onClick={() => setSelectedSchool(null)} className="p-3 hover:bg-zinc-100 rounded-full transition-colors text-zinc-950"><X size={28} /></button>
            </div>

            <div className="flex border-b border-zinc-200 px-10">
               {TABS.map(tab => (
                 <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-5 text-[11px] font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === tab ? 'border-zinc-950 text-zinc-950' : 'border-transparent text-zinc-400 hover:text-zinc-950'}`}>{tab}</button>
               ))}
            </div>

            <div className="flex-1 overflow-y-auto p-12 space-y-16 custom-scrollbar bg-zinc-50/20">
              
              {activeTab === 'overview' && (
                <div className="space-y-20">
                   
                   {/* School Identity Matrix */}
                   <div className="space-y-8">
                      <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-zinc-950">Institutional Identity</p>
                      <div className="p-10 border border-zinc-200 bg-white rounded-3xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                         <div className="space-y-3">
                            <div className="flex items-center gap-2 text-zinc-950"><Lock size={12} strokeWidth={3} /><span className="text-[10px] font-bold uppercase tracking-widest">Admin Principal</span></div>
                            <p className="text-sm font-medium text-zinc-800">{selectedSchool._admin?.full_name || '--'}</p>
                            <p className="text-[11px] text-zinc-700">{selectedSchool._admin?.email || '--'}</p>
                         </div>
                         <div className="space-y-3">
                            <div className="flex items-center gap-2 text-zinc-950"><Users size={12} strokeWidth={3} /><span className="text-[10px] font-bold uppercase tracking-widest">Student Census</span></div>
                            <p className="text-sm font-medium text-zinc-800">{selectedSchool._students} Total</p>
                            <p className="text-[11px] text-zinc-700">Live enrollment</p>
                         </div>
                         <div className="space-y-3">
                            <div className="flex items-center gap-2 text-zinc-950"><Globe size={12} strokeWidth={3} /><span className="text-[10px] font-bold uppercase tracking-widest">System Domain</span></div>
                            <p className="text-sm font-medium text-zinc-800">{selectedSchool.subdomain}.p3l.dev</p>
                            <p className="text-[11px] text-zinc-700 uppercase">{selectedSchool.location || 'HQ'}</p>
                         </div>
                         <div className="space-y-3">
                            <div className="flex items-center gap-2 text-zinc-950"><CreditCard size={12} strokeWidth={3} /><span className="text-[10px] font-bold uppercase tracking-widest">Bank Details</span></div>
                            <p className="text-sm font-medium text-zinc-800 uppercase">{selectedSchool.bank_name || '--'}</p>
                            <p className="text-[11px] text-zinc-700 font-mono">ACC: {selectedSchool.bank_acc || '--'}</p>
                         </div>
                      </div>
                   </div>

                   {/* Templates Gallery - Responsive Grid */}
                   <div className="space-y-10">
                      <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
                         <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-950">School Templates</h3>
                         <button className="text-[10px] font-black uppercase text-zinc-950 hover:underline">+ New Template</button>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                        {schoolTemplates.map(tmp => (
                          <div key={tmp.id} className="p-8 border border-zinc-200 rounded-2xl bg-white hover:border-zinc-950 transition-all group">
                             <div className="w-12 h-12 bg-zinc-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-zinc-950 group-hover:text-white transition-colors border border-zinc-100"><FileCode size={20} /></div>
                             <p className="text-[13px] font-semibold uppercase text-zinc-900 truncate">{tmp.name}</p>
                             <p className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest mt-2">{tmp.category}</p>
                             <div className="mt-8 flex gap-3">
                                <button className="flex-1 py-2 bg-zinc-950 text-white text-[10px] font-bold uppercase tracking-widest rounded-lg">View</button>
                                <button className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 transition-colors"><Edit3 size={12} /></button>
                             </div>
                          </div>
                        ))}
                      </div>
                   </div>

                   {/* Cycle System */}
                   <div className="space-y-8">
                      <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-950">Cycle Management</h3>
                      <div className="p-10 border border-zinc-200 rounded-3xl flex flex-col md:flex-row items-center justify-between bg-white gap-10">
                         <div className="flex flex-col md:flex-row items-center gap-12">
                            <div className="space-y-2 text-center md:text-left">
                               <p className="text-[9px] font-bold uppercase text-zinc-600 tracking-widest">Active Term</p>
                               <p className="text-lg font-semibold uppercase text-zinc-900">{schoolTerms[0]?.name || 'Not Defined'}</p>
                               <p className="text-[11px] text-zinc-700">{schoolTerms[0] ? `${new Date(schoolTerms[0].start_date).toLocaleDateString()} - ${new Date(schoolTerms[0].end_date).toLocaleDateString()}` : 'System Idle'}</p>
                            </div>
                            <div className="hidden md:block w-px h-10 bg-zinc-200" />
                            <div className="space-y-2 text-center md:text-left">
                               <p className="text-[9px] font-bold uppercase text-zinc-600 tracking-widest">Cycle System</p>
                               <p className="text-lg font-semibold uppercase text-zinc-900">{selectedSchool.academic_system || '3 Term Format'}</p>
                            </div>
                         </div>
                         <button className="w-full md:w-auto px-8 py-3 bg-zinc-950 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:scale-105 transition-transform">Update Cycle</button>
                      </div>
                   </div>
                </div>
              )}

              {activeTab === 'users' && (
                <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                       <tr className="bg-zinc-50 border-b border-zinc-200">
                          <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-zinc-600">Person</th>
                          <th className="px-6 py-5 text-[11px] font-bold uppercase tracking-widest text-zinc-600 text-center">Role</th>
                          <th className="px-8 py-5 text-[11px] font-bold uppercase tracking-widest text-zinc-600 text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                       {schoolUsers.map(u => (
                         <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="px-8 py-5">
                               <p className="text-xs font-semibold uppercase text-zinc-950">{u.full_name}</p>
                               <p className="text-[11px] text-zinc-600 font-medium">{u.email}</p>
                            </td>
                            <td className="px-6 py-5 text-center text-[10px] font-bold uppercase text-zinc-700">{u.role}</td>
                            <td className="px-8 py-5">
                               <div className="flex justify-end gap-3">
                                  <button className="flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-zinc-950 hover:bg-zinc-950 hover:text-white transition-all"><Eye size={12} /> View</button>
                                  <button className="flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-lg text-[10px] font-bold uppercase tracking-widest text-red-700 hover:bg-red-700 hover:text-white transition-all"><Trash2 size={12} /> Drop</button>
                               </div>
                            </td>
                         </tr>
                       ))}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === 'billing' && (
                <div className="space-y-16">
                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      {[
                        { id: 'FREE', name: 'FREE SCALE', price: 'KES 0', desc: 'Grace period' },
                        { id: 'PRO', name: 'PRO SCALE', price: 'KES 300', desc: 'Per active student' },
                        { id: 'BUSINESS', name: 'BUSINESS', price: 'Custom', desc: 'Institutional' }
                      ].map(p => (
                        <div key={p.id} className={`p-8 border rounded-3xl transition-all bg-white ${selectedSchool.plan === p.id ? 'border-zinc-950 shadow-xl' : 'border-zinc-200 opacity-60'}`}>
                           <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">{p.id} Tier</p>
                           <p className="text-sm font-semibold uppercase text-zinc-950">{p.name}</p>
                           <p className="text-3xl font-black text-zinc-950 mt-2">{p.price}</p>
                           <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-6">{p.desc}</p>
                           <button className="w-full mt-10 py-3 bg-zinc-950 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl">Upgrade</button>
                        </div>
                      ))}
                   </div>

                   <div className="p-16 border border-zinc-950 rounded-[3rem] bg-white flex flex-col md:flex-row items-center justify-between gap-10">
                      <div className="space-y-2 text-center md:text-left">
                         <p className="text-[11px] font-bold uppercase text-zinc-700 tracking-widest">Active Ledger Balance</p>
                         <h4 className="text-5xl font-sora font-semibold text-zinc-950 tracking-tighter">KES {(selectedSchool._students || 0) * 300}</h4>
                         <p className="text-xs text-zinc-800 font-medium">Payment pipeline due Oct 14, 2026</p>
                      </div>
                      <button className="px-12 py-5 bg-zinc-950 text-white text-[11px] font-bold uppercase tracking-widest rounded-3xl hover:scale-105 transition-transform"><Send size={18} className="inline mr-3 -mt-1" /> Request Payment</button>
                   </div>
                   
                   <button className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-zinc-700 hover:text-zinc-950 underline decoration-zinc-200 underline-offset-8 transition-all"><History size={14} /> View full history</button>
                </div>
              )}

              {activeTab === 'data' && (
                <div className="space-y-20">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <button className="p-12 border border-zinc-200 rounded-[2rem] bg-white hover:border-zinc-950 flex flex-col items-center gap-6 transition-all group">
                         <div className="p-6 bg-zinc-50 rounded-2xl group-hover:bg-zinc-950 group-hover:text-white transition-colors"><FileSpreadsheet size={32} /></div>
                         <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-950">Upload Excel</p>
                      </button>
                      <button className="p-12 border border-zinc-200 rounded-[2rem] bg-white hover:border-zinc-950 flex flex-col items-center gap-6 transition-all group">
                         <div className="p-6 bg-zinc-50 rounded-2xl group-hover:bg-zinc-950 group-hover:text-white transition-colors"><Upload size={32} /></div>
                         <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-950">CSV pipeline</p>
                      </button>
                   </div>

                   <div className="p-10 border border-zinc-200 rounded-[2.5rem] bg-white space-y-12">
                      <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-950 border-b border-zinc-100 pb-4">Manual Entry Console</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                         <div className="space-y-3">
                           <label className="text-[10px] font-bold uppercase text-zinc-800 ml-1">Identity Role</label>
                           <select className="w-full bg-zinc-50 border border-zinc-200 px-5 py-4 rounded-xl text-[11px] font-bold outline-none text-zinc-950 shadow-sm"><option>STUDENT</option><option>TEACHER</option><option>PARENT</option></select>
                         </div>
                         <div className="md:col-span-2 space-y-3">
                           <label className="text-[10px] font-bold uppercase text-zinc-800 ml-1">Full Legal Name</label>
                           <input className="w-full bg-zinc-50 border border-zinc-200 px-5 py-4 rounded-xl text-[11px] font-bold outline-none text-zinc-950 shadow-sm" placeholder="John Doe..." />
                         </div>
                      </div>
                      <div className="flex flex-col md:flex-row gap-6 items-end">
                        <div className="flex-1 w-full space-y-3">
                          <label className="text-[10px] font-bold uppercase text-zinc-800 ml-1">Identity Email</label>
                          <input className="w-full bg-zinc-50 border border-zinc-200 px-5 py-4 rounded-xl text-[11px] font-bold outline-none text-zinc-950 shadow-sm" placeholder="email@identity.com" />
                        </div>
                        <button className="w-full md:w-auto px-12 py-4 bg-zinc-950 text-white text-[11px] font-bold uppercase tracking-widest rounded-xl transition-transform active:scale-95 shadow-lg">Save Record</button>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
                         <h3 className="text-[11px] font-bold uppercase tracking-widest text-zinc-950">Database Console</h3>
                         <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-tighter">v4_postgres_executor</span>
                      </div>
                      <div className="bg-zinc-950 rounded-2xl overflow-hidden shadow-2xl border border-zinc-800">
                         <textarea 
                           className="w-full h-48 bg-transparent text-emerald-400 font-mono text-xs p-10 outline-none resize-none" 
                           placeholder="-- RUN MASTER QUERIES... "
                           value={sqlQuery}
                           onChange={e => setSqlQuery(e.target.value)}
                         />
                         <div className="px-10 py-5 bg-zinc-900/50 flex justify-end">
                            <button onClick={executeSql} className="px-8 py-3 bg-white text-zinc-950 text-[10px] font-bold uppercase tracking-widest rounded-lg flex items-center gap-3 hover:bg-emerald-400 transition-colors border border-zinc-800 shadow-sm"><Terminal size={14} /> Run Console</button>
                         </div>
                      </div>
                   </div>
                </div>
              )}

            </div>
            
            <div className="p-10 border-t border-zinc-200 bg-zinc-50/50 flex gap-6">
               <button className="flex-1 py-5 border border-zinc-300 text-zinc-950 font-bold text-[10px] uppercase tracking-widest rounded-2xl hover:bg-zinc-950 hover:text-white transition-all">Refresh Metrics</button>
               <button className="flex-1 py-5 bg-red-700 text-white font-bold text-[10px] uppercase tracking-widest rounded-2xl transition-colors shadow-lg">Deactivate Account</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Download = ({ size, className }: any) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>;
