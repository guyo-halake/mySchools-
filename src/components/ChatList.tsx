import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Chat } from '../types/chat';
import { Search, User, Calendar, Check, Users } from 'lucide-react';
import { cn } from '../utils/utils';
import { useAuth } from '../context/AuthContext';

const ChatList: React.FC<{ 
  onSelectChat: (id: string) => void; 
  selectedChatId?: string;
  filterTab?: string;
  searchQuery?: string;
  onCountsUpdate?: (counts: { all: number, unread: number, groups: number, appointments: number }) => void;
}> = ({ onSelectChat, selectedChatId, filterTab = 'all', searchQuery = '', onCountsUpdate }) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const { data: members, error: memError } = await supabase
          .from('chat_members')
          .select('chat_id')
          .eq('user_id', user.id);

        if (memError) throw memError;
        const chatIds = members.map(m => m.chat_id);
        
        if (chatIds.length === 0) {
          setChats([]);
          setLoading(false);
          return;
        }

        const { data: rawChats, error: chatsError } = await supabase
          .from('chats')
          .select(`
            *,
            last_message:messages(content, created_at, sender_id, read_at)
          `)
          .in('id', chatIds);

        if (chatsError) throw chatsError;

        // Resolve names for non-groups
        const processedChats = await Promise.all(rawChats.map(async (c) => {
          let name = c.name;
          let avatar_url = c.avatar_url;
          
          if (c.type === 'direct') {
             const { data: other } = await supabase
               .from('chat_members')
               .select('profiles(full_name, avatar_url)')
               .eq('chat_id', c.id)
               .neq('user_id', user.id)
               .single();
             if (other?.profiles) {
               name = (other.profiles as any).full_name;
               avatar_url = (other.profiles as any).avatar_url;
             }
          }

          const lastMsg = c.last_message?.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0];

          return {
            ...c,
            name,
            avatar_url,
            lastMessage: lastMsg?.content || 'No messages yet',
            time: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
            rawTime: lastMsg ? lastMsg.created_at : c.created_at,
            isUnread: lastMsg && !lastMsg.read_at && lastMsg.sender_id !== user.id,
            lastSenderId: lastMsg?.sender_id,
            isReadByOther: lastMsg?.read_at && lastMsg.sender_id === user.id
          };
        }));

        // Fetch School Appointments
        const { data: apps } = await supabase
          .from('school_calendar_events')
          .select('*')
          .eq('event_type', 'appointment')
          .order('start_date', { ascending: false });

        const processedApps = apps?.map(a => ({
          ...a,
          name: a.title,
          type: 'appointment',
          isAppointment: true,
          lastMessage: 'Appointment Scheduled',
          time: new Date(a.start_date).toLocaleDateString(),
          rawTime: a.start_date
        })) || [];

        const sorted = [...processedChats, ...processedApps].sort((a, b) => 
          new Date(b.rawTime).getTime() - new Date(a.rawTime).getTime()
        );

        setChats(sorted);

        if (onCountsUpdate) {
          onCountsUpdate({
            all: sorted.length,
            unread: sorted.filter(c => (c as any).isUnread).length, 
            groups: sorted.filter(c => c.type === 'group').length,
            appointments: processedApps.length
          });
        }
      } catch (err) {
        console.error('Fetch chats error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Subscribe to new messages
    const channel = supabase
      .channel('chat-list-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchData();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, onCountsUpdate]);

  const listToRender = chats.filter(item => {
    if (filterTab === 'groups' && item.type !== 'group') return false;
    if (filterTab === 'unread' && !(item as any).isUnread) return false;
    if (filterTab === 'appointments' && !(item as any).isAppointment) return false;
    
    if (searchQuery) {
       return item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              (item as any).lastMessage?.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar bg-white dark:bg-zinc-950">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4 opacity-50">
           <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
           <p className="text-[11px] font-inter font-bold uppercase tracking-widest">Gathering conversations...</p>
        </div>
      ) : listToRender.length > 0 ? listToRender.map((item: any) => (
        <div
          key={item.id}
          onClick={() => onSelectChat(item.id)}
          className={cn(
            "flex items-center gap-4 p-4 lg:px-6 cursor-pointer border-b border-zinc-50 dark:border-zinc-800/30 transition-all hover:bg-zinc-50 dark:hover:bg-zinc-900",
            selectedChatId === item.id ? "bg-emerald-50/50 dark:bg-emerald-950/20" : "bg-white dark:bg-zinc-950"
          )}
        >
          <div className={cn(
             "w-12 h-12 rounded-[18px] flex items-center justify-center text-zinc-400 shrink-0 overflow-hidden shadow-sm relative border border-white dark:border-zinc-800",
             item.isAppointment ? "bg-blue-50 dark:bg-blue-900/20 text-blue-500" : "bg-zinc-100 dark:bg-zinc-900"
          )}>
            {item.avatar_url ? (
              <img src={item.avatar_url} alt={item.name} className="w-full h-full object-cover" />
            ) : item.isAppointment ? (
              <Calendar size={20} strokeWidth={2.5} />
            ) : item.type === 'group' ? (
              <Users size={20} strokeWidth={2.5} className="text-emerald-600" />
            ) : (
              <User size={20} strokeWidth={2.5} className="opacity-40" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-sora font-semibold text-[14px] truncate transition-colors uppercase tracking-tight text-orange-600 dark:text-orange-500">
                {item.name}
              </h4>
              <span className={cn("text-[10px] font-inter", item.isUnread ? "text-emerald-600 font-bold" : "text-zinc-400")}>{item.time}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-1 flex-1 min-w-0">
                {item.lastSenderId === user?.id && (
                  <div className="flex items-center shrink-0">
                    <Check size={12} strokeWidth={3} className={cn(item.isReadByOther ? "text-sky-500" : "text-zinc-400")} />
                    <Check size={12} strokeWidth={3} className={cn("-ml-1.5", item.isReadByOther ? "text-sky-500" : "text-zinc-400")} />
                  </div>
                )}
                <p className={cn(
                  "text-[12px] font-inter truncate",
                  item.isUnread ? "text-zinc-900 dark:text-white font-bold" : "text-zinc-400 dark:text-zinc-500"
                )}>
                  {item.lastMessage}
                </p>
              </div>
              {item.isUnread && (
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              )}
            </div>
          </div>
        </div>
      )) : (
        <div className="flex flex-col items-center justify-center py-20 text-center px-10 opacity-30">
           <Search size={40} className="mb-4" />
           <p className="text-[12px] font-inter font-bold uppercase tracking-[0.2em]">No results found</p>
        </div>
      )}
    </div>
  );
};

export default ChatList;
