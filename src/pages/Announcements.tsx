import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Badge, Modal, Table } from '../components/UI';
import {
  Plus,
  Search,
  Clock,
  MapPin,
  CalendarDays,
  X,
  LayoutGrid,
  List,
  CalendarCheck,
  BellRing,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Trash2,
  Bell,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Send,
  Sparkles
} from 'lucide-react';
import { formatDate, cn } from '../utils/utils';

type HubType = 'announcement' | 'event' | 'reminder';

interface HubItem {
  id: string;
  type: HubType;
  title: string;
  content: string;
  date: string;
  author?: string;
  location?: string;
  theme?: string;
  rsvps?: string[];
}

export const Announcements: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'recents' | 'announcements' | 'events' | 'calendar' | 'reminders'>('recents');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<HubItem[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'err' | 'info' } | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [reminderModal, setReminderModal] = useState<{ open: boolean; item: HubItem | null }>({ open: false, item: null });
  const [submitting, setSubmitting] = useState(false);

  const [remForm, setRemForm] = useState({ date: '', time: '08:00', offset: '0', whatsapp: true });

  const showToast = (msg: string, type: 'success' | 'err' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadHubData = async () => {
    if (!user?.school_id) return;
    setLoading(true);
    try {
      const [{ data: annData }, { data: eveData }, { data: remData }] = await Promise.all([
        supabase.from('announcements').select('*, profiles(full_name)').eq('school_id', user.school_id).order('created_at', { ascending: false }),
        supabase.from('events').select('*').eq('school_id', user.school_id).order('date', { ascending: true }),
        supabase.from('reminders').select('*').eq('user_id', user.id)
      ]);

      const normalizedAnn = (annData || []).map(a => ({
        id: a.id, type: 'announcement' as HubType, title: a.title, content: a.content,
        date: a.created_at, author: a.profiles?.full_name || 'Admin', theme: 'News'
      }));

      const normalizedEve = (eveData || []).map(e => ({
        id: e.id, type: 'event' as HubType, title: e.title, content: e.description || '',
        date: e.date, location: e.location || 'Main Campus', theme: 'Event', rsvps: e.rsvps || []
      }));

      setItems([...normalizedAnn, ...normalizedEve]);
      setReminders(remData || []);
    } catch (err) { console.error("Sync Failed", err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadHubData(); }, [user?.school_id]);

  const filteredItems = useMemo(() => {
    let source = items;
    if (activeTab === 'announcements') source = items.filter(i => i.type === 'announcement');
    else if (activeTab === 'events') source = items.filter(i => i.type === 'event');
    else if (activeTab === 'recents') source = items; 
    else if (activeTab === 'reminders') {
        source = reminders.map(r => ({
            id: r.id, type: 'reminder' as HubType, title: r.title,
            content: `Scheduled alert for ${new Date(r.remind_at).toLocaleDateString()}`,
            date: r.remind_at, theme: 'Reminder'
        }));
    }
    // Sort by recent date FIRST (Descending)
    return source.filter(i => i.title.toLowerCase().includes(searchQuery.toLowerCase()) || i.content.toLowerCase().includes(searchQuery.toLowerCase())).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [items, activeTab, searchQuery, reminders]);

  const handleSaveReminder = async () => {
    if (!user || !reminderModal.item) return;
    setSubmitting(true);
    try {
      const targetDate = new Date(`${remForm.date}T${remForm.time}`);
      const remindAt = new Date(targetDate.getTime() - parseInt(remForm.offset) * 60000).toISOString();
      const { error } = await supabase.from('reminders').insert({
        user_id: user.id, item_id: reminderModal.item.id, item_type: reminderModal.item.type,
        remind_at: remindAt, title: reminderModal.item.title, school_id: user.school_id
      });
      if (error) throw error;
      showToast("Updated!");
      setReminderModal({ open: false, item: null });
      loadHubData();
    } catch (e: any) { showToast("Error", 'err'); }
    finally { setSubmitting(false); }
  };

  const GlassCard = ({ item }: { item: HubItem }) => (
    <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-6 shadow-sm transition-all flex flex-col justify-between h-full hover:shadow-lg">
        <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 overflow-hidden">
                <Badge variant={item.type === 'event' ? 'outline' : 'info'} className="text-[7px] uppercase tracking-widest px-2 py-0.5 border-zinc-200">
                    {item.theme}
                </Badge>
                <div className="flex items-center gap-1 text-[8px] font-bold text-zinc-400 uppercase">
                    <Clock size={10}/> {formatDate(item.date)}
                </div>
            </div>
            
            <div className="space-y-1">
                <h3 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white uppercase font-sora line-clamp-1">{item.title}</h3>
                {item.type === 'event' && (
                    <div className="flex flex-col gap-1 mt-1.5 py-1.5 border-y border-zinc-50 border-dashed">
                        <div className="flex items-center gap-1.5 text-[9px] font-bold text-zinc-600">
                            <MapPin size={10} className="text-zinc-400" /> 
                            <span className="truncate">{item.location}</span>
                        </div>
                    </div>
                )}
                <p className="text-[10px] text-zinc-500 font-medium leading-relaxed line-clamp-2 mt-1">{item.content}</p>
            </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between gap-1.5">
            <div className="flex gap-2 w-full">
                <button onClick={() => {
                    setRemForm({ date: item.date.split('T')[0], time: '08:00', offset: '0', whatsapp: true });
                    setReminderModal({ open: true, item });
                }} className="flex-1 py-2 bg-zinc-900 text-white rounded-lg text-[8px] font-bold uppercase flex items-center justify-center gap-1.5 active:scale-95 transition-all"><BellRing size={10}/> Remind</button>
                
                {item.type === 'event' ? (
                    <button onClick={() => supabase.from('events').update({ rsvps: [...(item.rsvps || []), user?.id] }).eq('id', item.id).then(() => { showToast("RSVP Status Updated"); loadHubData(); })} className={cn("flex-1 py-2 rounded-lg text-[8px] font-bold uppercase flex items-center justify-center gap-1.5 active:scale-95 transition-all", item.rsvps?.includes(user?.id || '') ? "bg-zinc-100 text-zinc-900" : "bg-black text-white hover:bg-zinc-800")}>
                        <CalendarCheck size={10}/> {item.rsvps?.includes(user?.id || '') ? 'Going' : 'RSVP Now'}
                    </button>
                ) : (
                    <button onClick={() => alert(item.content)} className="flex-1 py-2 bg-zinc-50 text-zinc-600 rounded-lg text-[8px] font-bold uppercase flex items-center justify-center gap-1.5 active:scale-95 transition-all"><BookOpen size={10}/> Read News</button>
                )}
            </div>
            {(user?.role === 'ADMIN' || user?.role === 'PRINCIPAL') && (
                <button onClick={() => supabase.from(item.type === 'event' ? 'events' : 'announcements').delete().eq('id', item.id).then(() => loadHubData())} className="p-1.5 text-zinc-200 hover:text-rose-500 transition-colors"><Trash2 size={12}/></button>
            )}
        </div>
    </div>
  );

  return (
    <div className="max-w-[1200px] mx-auto p-4 sm:p-6 space-y-6 pb-24 font-inter text-zinc-900">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-zinc-100 dark:border-zinc-800 pb-6">
        <div className="space-y-4">
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white font-sora tracking-tight">School Updates</h1>
            <div className="flex flex-wrap items-center gap-1.5">
                <TabBtn active={activeTab === 'recents'} onClick={() => setActiveTab('recents')}><Sparkles size={10}/> Recents</TabBtn>
                <TabBtn active={activeTab === 'announcements'} onClick={() => setActiveTab('announcements')}>News</TabBtn>
                <TabBtn active={activeTab === 'events'} onClick={() => setActiveTab('events')}>Events</TabBtn>
                <TabBtn active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')}>Calendar</TabBtn>
                <button onClick={() => setActiveTab('reminders')} className={cn("px-4 py-2 rounded-full text-[9px] font-bold uppercase flex items-center gap-2 transition-all shadow-sm", activeTab === 'reminders' ? "bg-zinc-900 text-white" : "bg-zinc-50 text-zinc-400")}>
                    <Bell size={10}/> Saved
                </button>
            </div>
        </div>

        <div className="flex items-center gap-2">
            <div className="relative flex-1 md:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={12} />
                <input type="text" placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full md:w-56 pl-8 pr-4 py-2.5 bg-zinc-50 border-none rounded-xl text-[11px] font-medium outline-none" />
            </div>
            {(user?.role === 'ADMIN' || user?.role === 'PRINCIPAL') && (
                <button onClick={() => setIsAnnouncementModalOpen(true)} className="p-2.5 bg-zinc-900 text-white rounded-xl active:scale-95 shadow-lg"><Plus size={20}/></button>
            )}
        </div>
      </div>

      {/* LIST/GRID */}
      {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-48 bg-zinc-100 rounded-2xl" />)}
          </div>
      ) : activeTab === 'calendar' ? <CalendarView items={items} /> : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItems.map(item => <GlassCard key={item.id} item={item} />)}
          </div>
      )}

      {/* REMINDER MODAL */}
      <Modal isOpen={reminderModal.open} onClose={() => setReminderModal({ open: false, item: null })} title="Schedule Alert">
          <div className="space-y-5">
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                  <p className="text-[9px] font-black uppercase text-zinc-400 mb-1">Item Reference</p>
                  <p className="text-xs font-bold text-zinc-900 truncate uppercase">{reminderModal.item?.title}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-zinc-400 ml-1">Reminder Date</label>
                      <input type="date" value={remForm.date} onChange={e => setRemForm({...remForm, date: e.target.value})} className="w-full p-3 bg-zinc-50 border border-zinc-100 rounded-xl text-xs font-bold" />
                  </div>
                  <div className="space-y-1.5">
                      <label className="text-[9px] font-black uppercase text-zinc-400 ml-1">Reminder Time</label>
                      <input type="time" value={remForm.time} onChange={e => setRemForm({...remForm, time: e.target.value})} className="w-full p-3 bg-zinc-50 border border-zinc-100 rounded-xl text-xs font-bold" />
                  </div>
              </div>

              <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><MessageCircle size={18}/></div>
                      <div>
                          <p className="text-[10px] font-bold text-emerald-900 uppercase">WhatsApp Alert</p>
                          <p className="text-[9px] font-medium text-emerald-700/70">Send notification automatically</p>
                      </div>
                  </div>
                  <input type="checkbox" checked={remForm.whatsapp} onChange={e => setRemForm({...remForm, whatsapp: e.target.checked})} className="w-5 h-5 accent-emerald-600 cursor-pointer" />
              </div>

              <button onClick={handleSaveReminder} disabled={submitting} className="w-full py-4 bg-zinc-900 text-white rounded-2xl font-bold uppercase text-[11px] tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-all shadow-xl shadow-zinc-200">
                  <Send size={14}/> {submitting ? 'Updating...' : 'Confirm Schedule'}
              </button>
          </div>
      </Modal>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 bg-zinc-900 text-white animate-in slide-in-from-bottom-4">
            {toast.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-400"/> : <AlertCircle size={16} className="text-rose-400"/>}
            <span className="text-[10px] font-bold uppercase tracking-widest">{toast.msg}</span>
        </div>
      )}
    </div>
  );
};

const CalendarView = ({ items }: { items: HubItem[] }) => {
    const [curr, setCurr] = useState(new Date());
    const year = curr.getFullYear();
    const month = curr.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= totalDays; i++) days.push(i);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold font-sora text-zinc-900">{curr.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                <div className="flex items-center gap-1 bg-zinc-50 p-1 rounded-xl">
                    <button onClick={() => setCurr(new Date(year, month - 1, 1))} className="p-1.5 hover:bg-white rounded-lg text-zinc-400"><ChevronLeft size={16}/></button>
                    <button onClick={() => setCurr(new Date(year, month + 1, 1))} className="p-1.5 hover:bg-white rounded-lg text-zinc-400"><ChevronRight size={16}/></button>
                </div>
            </div>
            <div className="bg-white border border-zinc-100 rounded-3xl overflow-hidden shadow-sm overflow-x-auto">
                <div className="min-w-[500px]">
                    <div className="grid grid-cols-7 bg-zinc-50/10">
                        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="py-3 text-center text-[9px] font-black uppercase text-zinc-400 tracking-widest">{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 auto-rows-[70px] sm:auto-rows-[110px]">
                        {days.map((d, idx) => {
                            const dateStr = `${year}-${String(month + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                            const dayEvents = items.filter(i => i.date.startsWith(dateStr));
                            return (
                                <div key={idx} className="p-2 border-r border-b border-zinc-50 last:border-r-0 relative group hover:bg-zinc-50/50 transition-colors">
                                    {d && (
                                        <>
                                            <span className="text-[9px] font-bold text-zinc-400">{d}</span>
                                            <div className="mt-1 space-y-1">
                                                {dayEvents.slice(0, 3).map((e, i) => (
                                                    <div key={i} className={cn("px-1.5 py-1 rounded-md text-[7px] font-bold truncate tracking-tight uppercase shadow-sm", e.type === 'event' ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700")}>{e.title}</div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

const TabBtn = ({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) => (
    <button onClick={onClick} className={cn("px-5 py-2.5 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all flex items-center gap-1.5", active ? "bg-zinc-900 text-white shadow-xl shadow-zinc-200" : "text-zinc-500 hover:bg-zinc-50")}>
        {children}
    </button>
);
