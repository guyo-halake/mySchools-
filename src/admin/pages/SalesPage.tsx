import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/adminSupabase';
import { useAdminAuth } from '../context/AdminAuthContext';
import { useAdminAlert } from '../context/AdminAlertContext';
import {
  Plus, Phone, Calendar, MessageSquare, FileText, ChevronRight,
  X, AlertTriangle, Clock, User, TrendingUp, Filter, Download,
  CheckCircle2, Circle, MoreHorizontal, Activity
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type Stage = 'NEW' | 'CONTACTED' | 'DEMO' | 'NEGOTIATION' | 'WON' | 'LOST';

interface Client {
  id: string;
  name: string;
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
  stage: Stage;
  assigned_agent?: string;
  revenue_potential?: number;
  next_followup?: string;
  last_contact?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface SalesActivity {
  id: string;
  client_id: string;
  type: string;
  description: string;
  agent?: string;
  created_at: string;
  client?: { name: string };
}

interface KPIs {
  total: number;
  active: number;
  won: number;
  lost: number;
  revenue: number;
}

interface Insights {
  stuckNegotiation: number;
  inactiveLeads: number;
  missedFollowups: number;
  conversionRate: number;
  avgDealDays: number;
  winLoss: string;
}

const STAGES: { key: Stage; label: string; dot: string }[] = [
  { key: 'NEW',         label: 'New',         dot: 'bg-zinc-400'    },
  { key: 'CONTACTED',  label: 'Contacted',   dot: 'bg-blue-500'    },
  { key: 'DEMO',       label: 'Demo',        dot: 'bg-amber-500'   },
  { key: 'NEGOTIATION',label: 'Negotiation', dot: 'bg-orange-500'  },
  { key: 'WON',        label: 'Won',         dot: 'bg-emerald-500' },
  { key: 'LOST',       label: 'Lost',        dot: 'bg-red-500'     },
];

const ACTIVITY_TYPES = [
  { key: 'call',      label: 'Log Call',         icon: Phone      },
  { key: 'demo',      label: 'Schedule Demo',    icon: Calendar   },
  { key: 'message',   label: 'Send Message',     icon: MessageSquare },
  { key: 'proposal',  label: 'Create Proposal',  icon: FileText   },
  { key: 'note',      label: 'Add Note',         icon: MoreHorizontal },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysSince(iso?: string): number {
  if (!iso) return 999;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function urgencyBg(lead: Lead): string {
  const d = daysSince(lead.last_contact || lead.updated_at);
  if (d > 14) return 'border-l-4 border-l-red-400';
  if (d > 7)  return 'border-l-4 border-l-amber-400';
  return '';
}

// ─── Add Client Modal ───────────────────────────────────────────────────────────

const AddClientModal: React.FC<{ onClose: () => void; onSave: (client: Client) => void }> = ({ onClose, onSave }) => {
  const [form, setForm] = useState({ name: '', contact_name: '', contact_phone: '', contact_email: '', assigned_agent: '', revenue_potential: '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    const { data, error } = await supabase
      .from('clients')
      .insert({ ...form, revenue_potential: Number(form.revenue_potential) || 0, stage: 'NEW' })
      .select()
      .single();
    setSaving(false);
    if (!error && data) { onSave(data); onClose(); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="text-lg font-bold dark:text-white">New Client</h3>
          <button onClick={onClose}><X size={18} className="text-zinc-400" /></button>
        </div>
        <div className="p-8 space-y-4">
          {[
            { key: 'name',            label: 'Client Name *',      type: 'text'   },
            { key: 'contact_name',     label: 'Contact Person',     type: 'text'   },
            { key: 'contact_phone',    label: 'Phone',              type: 'tel'    },
            { key: 'contact_email',    label: 'Email',              type: 'email'  },
            { key: 'assigned_agent',   label: 'Assigned Agent',     type: 'text'   },
            { key: 'revenue_potential',label: 'Revenue Potential (KES)', type: 'number' },
          ].map(f => (
            <div key={f.key}>
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">{f.label}</p>
              <input
                type={f.type}
                value={(form as any)[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-orange-600/30"
              />
            </div>
          ))}
        </div>
        <div className="p-8 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-xs font-bold uppercase rounded-xl dark:text-zinc-300">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-3 bg-orange-600 text-white text-xs font-bold uppercase rounded-xl disabled:opacity-50 hover:bg-orange-700 transition-all">
            {saving ? 'Saving...' : 'Add Client'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Lead Detail Panel ────────────────────────────────────────────────────────

const LeadPanel: React.FC<{ lead: Lead; onClose: () => void; onUpdate: (l: Lead) => void }> = ({ lead, onClose, onUpdate }) => {
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [actType, setActType] = useState('call');
  const [actDesc, setActDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const { adminUser } = useAdminAuth();

  useEffect(() => {
    supabase.from('sales_activities').select('*').eq('lead_id', lead.id).order('created_at', { ascending: false })
      .then(({ data }) => setActivities(data || []));
  }, [lead.id]);

  const logActivity = async () => {
    if (!actDesc.trim()) return;
    setSaving(true);
    const { data } = await supabase.from('sales_activities').insert({
      lead_id: lead.id, type: actType, description: actDesc,
      agent: adminUser?.full_name || 'Unknown'
    }).select().single();
    if (data) setActivities(prev => [data, ...prev]);
    // Update last_contact
    const { data: updated } = await supabase.from('sales_leads').update({ last_contact: new Date().toISOString() }).eq('id', lead.id).select().single();
    if (updated) onUpdate(updated);
    setActDesc('');
    setSaving(false);
  };

  const moveStage = async (stage: Stage) => {
    const { data } = await supabase.from('sales_leads').update({ stage }).eq('id', lead.id).select().single();
    if (data) onUpdate(data);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      <div className="absolute inset-0 -left-full bg-black/10 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-950 border-l border-zinc-100 dark:border-zinc-800 shadow-2xl flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-start shrink-0">
          <div>
            <h2 className="text-xl font-bold dark:text-white leading-tight">{lead.school_name}</h2>
            <p className="text-xs text-zinc-500 mt-1">{lead.contact_name} {lead.contact_phone ? `• ${lead.contact_phone}` : ''}</p>
            <div className="flex items-center gap-2 mt-3">
              {STAGES.find(s => s.key === lead.stage) && (
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
                  <div className={`w-1.5 h-1.5 rounded-full ${STAGES.find(s => s.key === lead.stage)!.dot}`} />
                  {STAGES.find(s => s.key === lead.stage)!.label}
                </span>
              )}
              {lead.revenue_potential ? (
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                  KES {lead.revenue_potential.toLocaleString()}
                </span>
              ) : null}
            </div>
          </div>
          <button onClick={onClose}><X size={18} className="text-zinc-400" /></button>
        </div>

        {/* Move Stage */}
        <div className="px-8 py-4 border-b border-zinc-50 dark:border-zinc-800 shrink-0">
          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3">Move to Stage</p>
          <div className="flex flex-wrap gap-1.5">
            {STAGES.map(s => (
              <button
                key={s.key}
                onClick={() => moveStage(s.key)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${lead.stage === s.key ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Log Activity */}
        <div className="px-8 py-6 border-b border-zinc-50 dark:border-zinc-800 shrink-0">
          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3">Log Activity</p>
          <div className="flex gap-2 mb-3 flex-wrap">
            {ACTIVITY_TYPES.map(t => (
              <button
                key={t.key}
                onClick={() => setActType(t.key)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1.5 ${actType === t.key ? 'bg-orange-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}
              >
                <t.icon size={11} /> {t.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={actDesc}
              onChange={e => setActDesc(e.target.value)}
              placeholder="What happened?"
              className="flex-1 px-4 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-600/30 dark:text-white"
            />
            <button onClick={logActivity} disabled={saving || !actDesc.trim()} className="px-4 py-2.5 bg-orange-600 text-white text-[10px] font-black uppercase rounded-xl disabled:opacity-40">
              Log
            </button>
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-3">
          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-4">History</p>
          {activities.length === 0 ? (
            <p className="text-xs text-zinc-400">No activity logged yet.</p>
          ) : activities.map(a => (
            <div key={a.id} className="flex gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-600 mt-2 shrink-0" />
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <p className="text-xs font-bold dark:text-zinc-200 capitalize">{a.type.replace('_', ' ')}</p>
                  <p className="text-[9px] text-zinc-400 uppercase tracking-widest">{new Date(a.created_at).toLocaleDateString()}</p>
                </div>
                <p className="text-[11px] text-zinc-500 mt-0.5">{a.description}</p>
                {a.agent && <p className="text-[9px] text-zinc-400 mt-1">by {a.agent}</p>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Main Sales Page ──────────────────────────────────────────────────────────


export const SalesPage: React.FC = () => {
  const { adminUser } = useAdminAuth();
  const { showAlert } = useAdminAlert();

  const [clients, setClients] = useState<Client[]>([]);
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIs>({ total: 0, active: 0, won: 0, lost: 0, revenue: 0 });
  const [insights, setInsights] = useState<Insights>({ stuckNegotiation: 0, inactiveLeads: 0, missedFollowups: 0, conversionRate: 0, avgDealDays: 0, winLoss: '-' });
  const [tab, setTab] = useState<'pipeline' | 'clients' | 'activity'>('pipeline');
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [filterStage, setFilterStage] = useState<Stage | 'ALL'>('ALL');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState<Stage | null>(null);

  // Greeting
  const h = new Date().getHours();
  const tod = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  const surname = adminUser?.full_name?.split(' ').pop() || 'Agent';

  // Fetch schools as clients
  const loadClients = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('schools').select('*').order('updated_at', { ascending: false });
    const mapped = (data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      contact_name: s.contact_name || '',
      contact_phone: s.phone_numbers?.[0] || '',
      contact_email: s.email || '',
      stage: 'WON', // Default to WON for existing schools
      assigned_agent: s.admin_id || '',
      revenue_potential: s.revenue_potential || 0,
      next_followup: '',
      last_contact: s.updated_at,
      notes: '',
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));
    setClients(mapped);
    setKpis({ total: mapped.length, active: mapped.length, won: mapped.length, lost: 0, revenue: mapped.reduce((sum, c) => sum + (c.revenue_potential || 0), 0) });
    setLoading(false);
  }, []);

  useEffect(() => { loadClients(); }, [loadClients]);

  const loadActivities = useCallback(async () => {
    const { data } = await supabase
      .from('sales_activities')
      .select('*, lead:sales_leads(school_name)')
      .order('created_at', { ascending: false })
      .limit(20);
    setActivities(data || []);
  }, []);

  useEffect(() => { loadLeads(); loadActivities(); }, [loadLeads, loadActivities]);

  // Realtime
  useEffect(() => {
    const channel = supabase.channel('sales-crm')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_leads' }, () => loadLeads())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'sales_activities' }, () => loadActivities())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadLeads, loadActivities]);

  // Drag & drop
  const onDragStart = (e: React.DragEvent, id: string) => { e.dataTransfer.setData('leadId', id); };
  const onDrop = async (e: React.DragEvent, stage: Stage) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('leadId');
    setDragOver(null);
    if (!id) return;
    await supabase.from('sales_leads').update({ stage, updated_at: new Date().toISOString() }).eq('id', id);
    loadLeads();
  };

  const handleLeadUpdate = (updated: Lead) => {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
    if (selectedLead?.id === updated.id) setSelectedLead(updated);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredLeads = filterStage === 'ALL' ? leads : leads.filter(l => l.stage === filterStage);

  return (
    <div className="flex flex-col h-full space-y-8 max-w-[1600px] mx-auto">

      {/* 1. WELCOME + WORKLOAD */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h1 className="text-3xl font-bold dark:text-white tracking-tight">Good {tod}, {surname}</h1>
          <div className="flex flex-wrap items-center gap-6 mt-2">
            <p className="text-sm text-zinc-500 font-medium">Sales Overview</p>
            {insights.inactiveLeads > 0 && (
              <span className="text-xs text-orange-600 font-bold">{insights.inactiveLeads} leads need follow-up</span>
            )}
            {insights.stuckNegotiation > 0 && (
              <span className="text-xs text-red-500 font-bold">{insights.stuckNegotiation} deals stuck in negotiation</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowAddLead(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-95 transition-all shadow-lg shadow-orange-600/20">
            <Plus size={14} /> Add Lead
          </button>
          <button onClick={() => showAlert('Call logging: Select a lead first.', 'Log Call')}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-800 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-95 transition-all">
            <Phone size={14} /> Log Call
          </button>
          <button onClick={() => showAlert('Demo scheduling: Select a lead first.', 'Schedule Demo')}
            className="flex items-center gap-2 px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all">
            <Calendar size={14} /> Schedule Demo
          </button>
          <button onClick={() => showAlert('Select a lead to send a message.', 'Send Message')}
            className="flex items-center gap-2 px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all">
            <MessageSquare size={14} /> Send Message
          </button>
          <button onClick={() => showAlert('Select a lead to create a proposal.', 'Create Proposal')}
            className="flex items-center gap-2 px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all">
            <FileText size={14} /> Create Proposal
          </button>
        </div>
      </div>

      {/* 2. KPI ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-8">
        {[
          { label: 'Total Leads',       value: kpis.total,                  prefix: ''      },
          { label: 'Active Deals',      value: kpis.active,                 prefix: ''      },
          { label: 'Closed Won',        value: kpis.won,                    prefix: ''      },
          { label: 'Closed Lost',       value: kpis.lost,                   prefix: ''      },
          { label: 'Expected Revenue', value: kpis.revenue.toLocaleString(), prefix: 'KES ' },
        ].map((k, i) => (
          <button key={i} onClick={() => setTab('pipeline')}
            className="text-left space-y-1.5 group hover:opacity-80 transition-opacity">
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{k.label}</p>
            <p className="text-4xl font-black tabular-nums dark:text-white">{loading ? '-' : `${k.prefix}${k.value}`}</p>
            <div className="h-px bg-zinc-100 dark:bg-zinc-800" />
          </button>
        ))}
      </div>

      {/* 3. MAIN WORKSPACE + RIGHT PANEL */}
      <div className="flex gap-8 flex-1 min-h-0">

        {/* Main workspace */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Tabs */}
          <div className="flex items-center gap-1 border-b border-zinc-100 dark:border-zinc-800">
            {[{ key: 'pipeline', label: 'Pipeline' }, { key: 'clients', label: 'Client List' }, { key: 'activity', label: 'Activity' }].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key as any)}
                className={`px-6 py-3 text-[11px] font-black uppercase tracking-widest border-b-2 transition-all -mb-px ${tab === t.key ? 'border-orange-600 text-orange-600' : 'border-transparent text-zinc-400 hover:text-zinc-600'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB 1: KANBAN PIPELINE */}
          {tab === 'pipeline' && (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {STAGES.map(stage => {
                const stageLeads = leads.filter(l => l.stage === stage.key);
                const isOver = dragOver === stage.key;
                return (
                  <div
                    key={stage.key}
                    onDragOver={e => { e.preventDefault(); setDragOver(stage.key); }}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={e => onDrop(e, stage.key)}
                    className={`w-72 shrink-0 space-y-3 transition-all rounded-2xl p-2 ${isOver ? 'bg-orange-50 dark:bg-orange-900/10' : ''}`}
                  >
                    {/* Column header */}
                    <div className="flex items-center justify-between px-2 py-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${stage.dot}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{stage.label}</span>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400">{stageLeads.length}</span>
                    </div>

                    {/* Cards */}
                    {stageLeads.map(lead => {
                      const d = daysSince(lead.last_contact || lead.updated_at);
                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={e => onDragStart(e, lead.id)}
                          onClick={() => setSelectedLead(lead)}
                          className={`bg-white dark:bg-zinc-900 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 cursor-pointer hover:border-orange-300 dark:hover:border-orange-800 transition-all select-none ${urgencyBg(lead)}`}
                        >
                          <p className="text-sm font-bold dark:text-white leading-tight">{lead.school_name}</p>
                          {lead.contact_name && <p className="text-[11px] text-zinc-500 mt-1">{lead.contact_name}</p>}
                          <div className="mt-4 pt-4 border-t border-zinc-50 dark:border-zinc-800 flex items-center justify-between">
                            <span className="text-[9px] text-zinc-400 font-bold uppercase">{lead.assigned_agent || 'Unassigned'}</span>
                            <div className="flex items-center gap-1 text-[9px] text-zinc-400">
                              <Clock size={9} />
                              {d > 0 ? `${d}d ago` : 'Today'}
                            </div>
                          </div>
                          {lead.revenue_potential ? (
                            <p className="text-[10px] font-bold text-emerald-600 mt-2">KES {lead.revenue_potential.toLocaleString()}</p>
                          ) : null}
                        </div>
                      );
                    })}

                    {stageLeads.length === 0 && (
                      <div className={`py-10 text-center border-2 border-dashed rounded-2xl text-[10px] font-bold text-zinc-300 uppercase tracking-widest transition-all ${isOver ? 'border-orange-400' : 'border-zinc-100 dark:border-zinc-800'}`}>
                        Drop here
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: CLIENT LIST */}
          {tab === 'clients' && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl">
                  {[{ key: 'ALL', label: 'All' }, ...STAGES].map(s => (
                    <button key={s.key} onClick={() => setFilterStage(s.key as any)}
                      className={`px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${filterStage === s.key ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-400'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
                {selectedIds.size > 0 && (
                  <div className="flex gap-2 ml-auto">
                    <span className="text-[10px] font-bold text-orange-600 uppercase">{selectedIds.size} selected</span>
                    <button className="text-[10px] font-black text-zinc-500 hover:text-zinc-900 uppercase"
                      onClick={() => showAlert(`Assigning ${selectedIds.size} leads...`, 'Bulk Action')}>Assign</button>
                    <button className="text-[10px] font-black text-zinc-500 hover:text-zinc-900 uppercase"
                      onClick={() => showAlert(`Scheduling follow-up for ${selectedIds.size} leads...`, 'Bulk Action')}>Follow-up</button>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto rounded-2xl border border-zinc-100 dark:border-zinc-800">
                <table className="w-full text-left">
                  <thead className="bg-zinc-50 dark:bg-zinc-900">
                    <tr>
                      <th className="px-4 py-3 w-8">
                        <input type="checkbox" onChange={e => setSelectedIds(e.target.checked ? new Set(filteredLeads.map(l=>l.id)) : new Set())}
                          className="accent-orange-600" />
                      </th>
                      {['Client', 'Stage', 'Agent', 'Revenue', 'Last Contact', 'Next Follow-up'].map(h => (
                        <th key={h} className="px-4 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                    {loading ? (
                      <tr><td colSpan={7} className="px-6 py-10 text-center text-xs text-zinc-400">Loading...</td></tr>
                    ) : filteredLeads.length === 0 ? (
                      <tr><td colSpan={7} className="px-6 py-10 text-center text-xs text-zinc-400">No leads found.</td></tr>
                    ) : filteredLeads.map(lead => (
                      <tr key={lead.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer" onClick={() => setSelectedLead(lead)}>
                        <td className="px-4 py-4" onClick={e => { e.stopPropagation(); toggleSelect(lead.id); }}>
                          <input type="checkbox" checked={selectedIds.has(lead.id)} onChange={() => toggleSelect(lead.id)} className="accent-orange-600" />
                        </td>
                        <td className="px-4 py-4">
                          <p className="text-sm font-bold dark:text-white">{lead.school_name}</p>
                          {lead.contact_name && <p className="text-[11px] text-zinc-400">{lead.contact_name}</p>}
                        </td>
                        <td className="px-4 py-4">
                          {STAGES.find(s => s.key === lead.stage) && (
                            <span className="flex items-center gap-1.5 text-[10px] font-bold">
                              <div className={`w-1.5 h-1.5 rounded-full ${STAGES.find(s=>s.key===lead.stage)!.dot}`} />
                              {STAGES.find(s => s.key === lead.stage)!.label}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-xs text-zinc-600 dark:text-zinc-400">{lead.assigned_agent || '-'}</td>
                        <td className="px-4 py-4 text-xs text-zinc-600 dark:text-zinc-400">{lead.revenue_potential ? `KES ${lead.revenue_potential.toLocaleString()}` : '-'}</td>
                        <td className="px-4 py-4 text-xs text-zinc-600 dark:text-zinc-400">
                          {lead.last_contact ? new Date(lead.last_contact).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-4 text-xs text-zinc-600 dark:text-zinc-400">
                          {lead.next_followup ? new Date(lead.next_followup).toLocaleDateString() : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ACTIVITY FEED */}
          {tab === 'activity' && (
            <div className="space-y-px divide-y divide-zinc-50 dark:divide-zinc-800">
              {activities.length === 0 ? (
                <p className="text-xs text-zinc-400 py-8">No activity logged yet.</p>
              ) : activities.map(a => (
                <div key={a.id} className="flex items-start gap-4 py-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 px-2 -mx-2 cursor-pointer transition-all"
                  onClick={() => { const l = leads.find(l => l.id === a.lead_id); if (l) setSelectedLead(l); }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-600 mt-2 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-bold dark:text-zinc-200">
                      <span className="capitalize">{a.type.replace('_', ' ')}</span>
                      {a.lead?.school_name && <span className="font-normal text-zinc-500"> with {a.lead.school_name}</span>}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">{a.description}</p>
                    {a.agent && <p className="text-[10px] text-zinc-400 mt-1">by {a.agent}</p>}
                  </div>
                  <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest shrink-0 mt-1">
                    {new Date(a.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 4. RIGHT INSIGHT PANEL */}
        <div className="hidden xl:block w-72 shrink-0 space-y-8">
          
          <div className="space-y-4">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em]">Deal Insights</p>
            <div className="space-y-3">
              {insights.stuckNegotiation > 0 && (
                <div className="flex items-center gap-3 text-xs">
                  <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                  <span className="dark:text-zinc-300">{insights.stuckNegotiation} deals stuck in negotiation &gt;7 days</span>
                </div>
              )}
              {insights.inactiveLeads > 0 && (
                <div className="flex items-center gap-3 text-xs">
                  <Clock size={14} className="text-red-500 shrink-0" />
                  <span className="dark:text-zinc-300">{insights.inactiveLeads} leads inactive &gt;10 days</span>
                </div>
              )}
              {insights.stuckNegotiation === 0 && insights.inactiveLeads === 0 && (
                <div className="flex items-center gap-3 text-xs">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  <span className="text-zinc-400">Pipeline is healthy.</span>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 border-t border-zinc-100 dark:border-zinc-800 pt-8">
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em]">Performance</p>
            <div className="space-y-4">
              {[
                { label: 'Conversion Rate',  value: `${insights.conversionRate}%` },
                { label: 'Win / Loss',        value: insights.winLoss            },
                { label: 'Total Leads',       value: kpis.total                  },
              ].map(m => (
                <div key={m.label} className="flex justify-between items-center text-xs border-b border-zinc-50 dark:border-zinc-800 pb-3 last:border-0 last:pb-0">
                  <span className="text-zinc-400 uppercase font-bold text-[10px] tracking-widest">{m.label}</span>
                  <span className="font-black dark:text-white">{m.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Modals */}
      {showAddLead && <AddLeadModal onClose={() => setShowAddLead(false)} onSave={l => setLeads(prev => [l, ...prev])} />}
      {selectedLead && <LeadPanel lead={selectedLead} onClose={() => setSelectedLead(null)} onUpdate={handleLeadUpdate} />}
    </div>
  );
};
