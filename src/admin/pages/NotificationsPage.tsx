import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/adminSupabase';
import { useAdminAuth } from '../context/AdminAuthContext';
import { Send, Bell, RefreshCw, X, CheckCircle2 } from 'lucide-react';

interface Notification {
  id: string;
  title: string;
  content: string;
  created_at: string;
  target_roles: string[];
  author_id?: string;
  school_id?: string;
}

export const NotificationsPage: React.FC = () => {
  const { adminUser } = useAdminAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [bTitle, setBTitle]               = useState('');
  const [bContent, setBContent]           = useState('');
  const [bRoles, setBRoles]               = useState<string[]>(['ADMIN', 'PRINCIPAL', 'TEACHER', 'PARENT', 'STUDENT']);
  const [sending, setSending]             = useState(false);
  const [sent, setSent]                   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    setNotifications(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase.channel('notifications-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcements' }, (p) => {
        setNotifications(prev => [p.new as Notification, ...prev]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const sendBroadcast = async () => {
    if (!bTitle.trim() || !bContent.trim()) return;
    setSending(true);

    // We write to the announcements table with no school_id (global broadcast)
    const { error } = await supabase.from('announcements').insert({
      title: bTitle,
      content: bContent,
      target_roles: bRoles,
      author_id: adminUser?.id || null,
      school_id: null, // null = global
    });

    setSending(false);
    if (!error) {
      setSent(true);
      setBTitle('');
      setBContent('');
      setTimeout(() => { setSent(false); setShowBroadcast(false); }, 1500);
    }
  };

  const ROLES = ['ADMIN', 'PRINCIPAL', 'TEACHER', 'PARENT', 'STUDENT'];

  return (
    <div className="space-y-10 max-w-[900px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h1 className="text-3xl font-bold dark:text-white tracking-tight">Notifications</h1>
          <p className="text-xs text-zinc-500 mt-1 uppercase font-bold tracking-widest">System-wide announcements & alerts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-100 dark:border-zinc-800 rounded-xl transition-all">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowBroadcast(true)}
            className="flex items-center gap-2 px-5 py-2 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-95 transition-all shadow-lg shadow-orange-600/20"
          >
            <Send size={14} /> Broadcast
          </button>
        </div>
      </div>

      {/* Live Feed */}
      <div className="space-y-px divide-y divide-zinc-50 dark:divide-zinc-800">
        {loading ? (
          <p className="text-xs text-zinc-400 py-8 text-center uppercase font-bold tracking-widest">Loading...</p>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center">
            <Bell size={32} className="text-zinc-200 mx-auto mb-4" />
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">No notifications yet.</p>
            <p className="text-xs text-zinc-400 mt-2">Use Broadcast to send a message to all users.</p>
          </div>
        ) : notifications.map(n => (
          <div key={n.id} className="flex gap-4 py-5 px-2 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-all">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-600 mt-2 shrink-0" />
            <div className="flex-1">
              <div className="flex justify-between items-start gap-4">
                <p className="text-sm font-bold dark:text-zinc-100">{n.title}</p>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest shrink-0">
                  {new Date(n.created_at).toLocaleDateString()}
                </p>
              </div>
              <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{n.content}</p>
              {n.target_roles?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {n.target_roles.map(r => (
                    <span key={r} className="text-[8px] font-black uppercase tracking-widest text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded">
                      {r}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Broadcast Modal */}
      {showBroadcast && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
              <h3 className="text-lg font-bold dark:text-white">Send Broadcast</h3>
              <button onClick={() => setShowBroadcast(false)}><X size={18} className="text-zinc-400" /></button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Title</p>
                <input
                  value={bTitle}
                  onChange={e => setBTitle(e.target.value)}
                  placeholder="e.g. System maintenance tonight"
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-orange-600/30"
                />
              </div>
              <div>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-2">Message</p>
                <textarea
                  value={bContent}
                  onChange={e => setBContent(e.target.value)}
                  rows={4}
                  placeholder="Write your message here..."
                  className="w-full px-4 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-orange-600/30 resize-none"
                />
              </div>
              <div>
                <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-3">Send To</p>
                <div className="flex flex-wrap gap-2">
                  {ROLES.map(r => (
                    <button
                      key={r}
                      onClick={() => setBRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${bRoles.includes(r) ? 'bg-orange-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-8 pt-0">
              <button
                onClick={sendBroadcast}
                disabled={sending || sent || !bTitle.trim() || !bContent.trim()}
                className="w-full py-4 bg-orange-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl disabled:opacity-50 hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
              >
                {sent ? <><CheckCircle2 size={16} /> Sent!</> : sending ? 'Sending...' : <><Send size={14} /> Send Broadcast</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
