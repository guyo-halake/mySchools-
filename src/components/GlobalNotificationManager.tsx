import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  Bell, 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  X, 
  ExternalLink,
  Zap,
  AlarmClock
} from 'lucide-react';
import { cn } from '../utils/utils';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'alarm' | 'update';
  link?: string;
  created_at: string;
}

const GlobalNotificationManager: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const myChatIds = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    // Pre-fetch my chat IDs for instant filtering
    const fetchMyChats = async () => {
      const { data } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', user.id);
      if (data) {
        myChatIds.current = new Set(data.map(d => d.chat_id));
      }
    };
    fetchMyChats();

    const channel = supabase
      .channel('global-alerts')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'in_app_notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications(prev => [newNotif, ...prev]);
          
          // Auto-dismiss after 8 seconds
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
          }, 8000);
        }
      )
      .subscribe();

    const msgChannel = supabase
      .channel('message-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const newMessage = payload.new;
          if (newMessage.sender_id === user.id) return;

          // FAST CHECK using cached IDs
          if (myChatIds.current.has(newMessage.chat_id)) {
             console.log('[AlertSystem] New Message detected for user chat:', newMessage.chat_id);
             
             // Fetch sender profile for the name
             const { data: sender } = await supabase
               .from('profiles')
               .select('full_name, avatar_url')
               .eq('id', newMessage.sender_id)
               .single();

             const notifId = Date.now().toString();
             setNotifications(prev => [{
               id: notifId,
               title: sender?.full_name || 'New Message',
               message: newMessage.content,
               type: 'message',
               link: `/my-chats`, // Redirect to chats
               avatar: sender?.avatar_url,
               created_at: new Date().toISOString()
             }, ...prev]);

             setTimeout(() => {
               setNotifications(prev => prev.filter(n => n.id !== notifId));
             }, 5000);
          }
        }
      )
      .subscribe();

    const membersChannel = supabase
      .channel('membership-updates')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_members', filter: `user_id=eq.${user.id}` },
        (payload) => {
          console.log('[AlertSystem] New chat membership detected:', payload.new.chat_id);
          myChatIds.current.add(payload.new.chat_id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(msgChannel);
      supabase.removeChannel(membersChannel);
    };
  }, [user]);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle size={18} className="text-emerald-500" />;
      case 'warning': return <AlertTriangle size={18} className="text-amber-500" />;
      case 'error': return <Zap size={18} className="text-rose-500" />;
      case 'alarm': return <AlarmClock size={18} className="text-indigo-500" />;
      case 'update': return <Zap size={18} className="text-blue-500" />;
      case 'message': return <Bell size={18} className="text-emerald-600" />;
      default: return <Info size={18} className="text-sky-500" />;
    }
  };

  const getStyles = (type: string) => {
    switch (type) {
        case 'success': return "border-emerald-100 bg-emerald-50/80 dark:bg-emerald-950/20";
        case 'message': return "border-emerald-500/30 bg-white/95 dark:bg-zinc-900/95 shadow-emerald-500/10";
        case 'warning': return "border-amber-100 bg-amber-50/80 dark:bg-amber-950/20";
        case 'error': return "border-rose-100 bg-rose-50/80 dark:bg-rose-950/20";
        case 'alarm': return "border-indigo-100 bg-indigo-50/80 dark:bg-indigo-950/20";
        default: return "border-zinc-100 bg-white/80 dark:bg-zinc-900/80";
    }
  };

  return (
    <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-4 w-full max-w-sm pointer-events-none">
      <AnimatePresence>
        {notifications.map((n) => (
          <motion.div
            key={n.id}
            initial={{ x: 100, opacity: 0, scale: 0.9 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: 100, opacity: 0, scale: 0.9 }}
            className={cn(
              "pointer-events-auto relative p-5 rounded-3xl border shadow-2xl backdrop-blur-xl flex gap-4 transition-all hover:scale-[1.02]",
              getStyles(n.type)
            )}
          >
            <div className="shrink-0 flex items-center justify-center w-12 h-12 rounded-2xl bg-white dark:bg-zinc-800 shadow-sm border border-zinc-100 dark:border-zinc-700 overflow-hidden">
               {(n as any).avatar ? (
                 <img src={(n as any).avatar} className="w-full h-full object-cover" alt="" />
               ) : getIcon(n.type)}
            </div>

            <div className="flex-1 min-w-0 pr-4">
               <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    "text-[9px] font-inter font-black uppercase tracking-[0.2em]",
                    n.type === 'message' ? "text-emerald-600" : "opacity-40"
                  )}>
                    {n.type === 'message' ? 'New Message' : n.type}
                  </span>
                  <span className="w-1 h-1 rounded-full bg-zinc-300" />
                  <span className="text-[10px] font-inter text-zinc-400">Just now</span>
               </div>
               <h4 className="text-[14px] font-sora font-bold text-zinc-900 dark:text-white leading-tight mb-1">{n.title}</h4>
               <p className="text-[12px] font-inter text-zinc-500 dark:text-zinc-400 leading-relaxed truncate-2-lines">{n.message}</p>
               
               {n.link && (
                 <a 
                   href={n.link} 
                   className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-inter font-bold text-emerald-600 hover:text-emerald-700 transition-colors uppercase tracking-wider"
                 >
                   View Details <ExternalLink size={12} />
                 </a>
               )}
            </div>

            <button 
              onClick={() => removeNotification(n.id)}
              className="absolute top-4 right-4 p-1.5 text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
               <X size={16} />
            </button>

            {/* Progress Bar */}
            <motion.div 
               initial={{ scaleX: 1 }}
               animate={{ scaleX: 0 }}
               transition={{ duration: 8, ease: "linear" }}
               className="absolute bottom-0 left-6 right-6 h-0.5 bg-emerald-500/20 origin-left rounded-full"
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default GlobalNotificationManager;
