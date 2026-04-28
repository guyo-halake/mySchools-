import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Message } from '../types/chat';
import { 
  Send, Smile, Paperclip, MoreVertical, Phone, Video, Search, CheckCheck, 
  Mic, Plus, User, Image, FileText, CreditCard, BarChart2, ArrowLeft, Calendar, Check,
  Users, Info, MessageSquare, Volume2, UserPlus, HardDrive, Bell, Palette, Clock, Lock, ShieldCheck, ChevronRight
} from 'lucide-react';
import { cn } from '../utils/utils';
import { useAuth } from '../context/AuthContext';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import { motion, AnimatePresence } from 'motion/react';

const ChatScreen: React.FC<{ chatId: string; onBack?: () => void }> = ({ chatId, onBack }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [chatData, setChatData] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [showProfile, setShowProfile] = useState(false);

  const { user: currentUser } = useAuth();
  const currentUserId = currentUser?.id || null;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initChat = async () => {
      if (chatId.startsWith('app-')) {
        setMessages([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      
      // Fetch Chat Info
      const { data: chatInfo } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single();
      
      if (chatInfo) {
        setChatData(chatInfo);
        if (chatInfo.type === 'group') {
           const { data: mems } = await supabase
             .from('chat_members')
             .select('profiles(*)')
             .eq('chat_id', chatId);
           setMembers(mems?.map(m => (m as any).profiles) || []);
        } else {
           // One-on-one: find other participant
           const { data: otherMember } = await supabase
             .from('chat_members')
             .select('profiles(*)')
             .eq('chat_id', chatId)
             .neq('user_id', currentUser?.id);
           if (otherMember?.[0]) setChatData({ ...chatInfo, profile: (otherMember[0] as any).profiles });
        }
      }

      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      
      if (!error && data) {
        setMessages(data);
        
        // Mark messages as read immediately
        if (currentUser) {
          await supabase
            .from('messages')
            .update({ read_at: new Date().toISOString() })
            .eq('chat_id', chatId)
            .neq('sender_id', currentUser.id)
            .is('read_at', null);
        }
      }
      setLoading(false);
    };

    initChat();

    if (!chatId.startsWith('app-')) {
      const channel = supabase
        .channel(`chat:${chatId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` },
          (payload) => {
            const newMessage = payload.new as Message;
            setMessages((prev) => {
              if (prev.some(m => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [chatId, currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || !currentUserId) return;

    const tempId = 'temp-' + Date.now();
    const tempInput = input;
    
    const newMessage = {
      id: tempId,
      chat_id: chatId,
      sender_id: currentUserId,
      content: tempInput,
      created_at: new Date().toISOString(),
      read_at: null
    };

    // Immediate local update for speed
    setMessages(prev => [...prev, newMessage]);
    setInput('');

    const { data: sentMsg, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: currentUserId,
        content: tempInput,
        type: 'text',
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setInput(tempInput);
    } else {
      // Successfully sent! Remove the temporary placeholder.
      // The real-time listener will add the official record with the correct database ID.
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };


  const addEmoji = (emoji: string) => {
    setInput(prev => prev + emoji);
    setShowEmoji(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col bg-[#efeae2] dark:bg-zinc-950">
        <div className="h-16 bg-[#f0f2f5] dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-6 gap-4">
           <div className="w-11 h-11 rounded-full bg-zinc-200 dark:bg-zinc-800 animate-pulse" />
           <div className="space-y-2 flex-1">
              <div className="h-4 w-12 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
              <div className="h-2 w-8 bg-emerald-100 dark:bg-emerald-900/40 rounded animate-pulse" />
           </div>
        </div>
        <div className="flex-1 p-8 space-y-6 overflow-hidden">
           {[1, 2, 3].map(i => (
             <div key={i} className={cn("max-w-[70%] h-14 rounded-2xl animate-pulse shadow-sm", i === 2 ? "ml-auto bg-emerald-100/50" : "bg-white border border-zinc-100")} />
           ))}
        </div>
      </div>
    );
  }

  if (chatId.startsWith('app-')) {
    return (
      <div className="flex-1 flex flex-col h-full bg-white dark:bg-zinc-950">
        <header className="h-16 bg-[#f0f2f5] dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-6 gap-4 shrink-0">
           {onBack && <button onClick={onBack} className="lg:hidden p-2 text-zinc-500"><ArrowLeft size={24} /></button>}
           <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center border border-white dark:border-zinc-700 shadow-sm overflow-hidden shrink-0">
              <Calendar size={20} />
           </div>
           <h3 className="font-sora font-semibold text-[15px] text-zinc-900 dark:text-zinc-100 truncate uppercase">Appointment Details</h3>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-zinc-50/50 dark:bg-zinc-950">
           <div className="w-24 h-24 bg-white dark:bg-zinc-900 rounded-3xl shadow-xl flex items-center justify-center text-blue-500 mb-8 border border-zinc-50 dark:border-zinc-800">
              <Calendar size={48} />
           </div>
           <div className="space-y-4 max-w-sm">
              <h2 className="text-2xl font-sora font-bold text-zinc-900 dark:text-white uppercase tracking-tight">Scheduled Meeting</h2>
              <p className="font-inter text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed uppercase tracking-widest opacity-70">
                This is a scheduled school event. Please refer to your institutional calendar for the specific agenda.
              </p>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#efeae2] dark:bg-zinc-950 relative overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-[#f0f2f5] dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 lg:px-6 z-20 shadow-sm shrink-0">
        <div 
          className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
          onClick={() => setShowProfile(true)}
        >
          {onBack && (
            <button 
              onClick={(e) => { e.stopPropagation(); onBack(); }}
              className="lg:hidden p-2 text-zinc-600 dark:text-zinc-400 active:scale-90 transition-transform"
            >
               <ArrowLeft size={24} />
            </button>
          )}
          <div className="w-10 h-10 rounded-[14px] bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 border border-white dark:border-zinc-700 shadow-sm overflow-hidden shrink-0">
              {chatData?.type === 'group' ? (
                <Users size={20} strokeWidth={2.5} />
              ) : chatData?.profile?.avatar_url ? (
                <img src={chatData.profile.avatar_url} className="w-full h-full object-cover" />
              ) : (
                <User size={20} strokeWidth={2.5} />
              )}
          </div>
          <div className="min-w-0">
            <h3 className="font-sora font-semibold text-[15px] text-zinc-900 dark:text-zinc-100 leading-tight truncate">
               {chatData?.type === 'group' ? chatData.name : (chatData?.profile?.full_name || 'Messaging')}
            </h3>
            <p className="text-[10px] font-inter font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider mt-1 opacity-80">
               {chatData?.type === 'group' 
                 ? `Created ${new Date(chatData.created_at).toLocaleDateString()}` 
                 : 'Online'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-5 text-zinc-500 dark:text-zinc-400">
           <Video size={18} className="cursor-pointer hover:text-zinc-900 transition-colors" />
           <Phone size={16} className="cursor-pointer hover:text-zinc-900 transition-colors" />
           <div className="w-[1px] h-6 bg-zinc-300 dark:bg-zinc-800 mx-1" />
           <MoreVertical size={18} className="cursor-pointer hover:text-zinc-900" />
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-4 bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
        {messages.map((msg, idx) => {
          const isMe = msg.sender_id === currentUserId;
          return (
            <div key={msg.id || idx} className={cn("flex w-full mb-1", isMe ? "justify-end" : "justify-start")}>
              <div className={cn(
                "relative max-w-[85%] md:max-w-[70%] px-4 py-2 rounded-2xl shadow-sm text-[14px] font-inter leading-relaxed animate-in fade-in slide-in-from-bottom-1 duration-300",
                isMe 
                  ? "bg-[#dcf8c6] dark:bg-emerald-900/50 text-zinc-900 dark:text-emerald-50 rounded-tr-none" 
                  : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-none border border-zinc-100 dark:border-zinc-700/50"
              )}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <div className="flex items-center justify-end gap-1 mt-1 opacity-60">
                  <span className="text-[10px] font-bold">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                   {isMe && (
                    <div className="flex items-center -mr-1">
                      <Check size={14} strokeWidth={3} className={cn(msg.read_at ? "text-sky-500" : "text-zinc-500")} />
                      <Check size={14} strokeWidth={3} className={cn("-ml-2", msg.read_at ? "text-sky-500" : "text-zinc-500")} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Popovers */}
      {showEmoji && (
        <div className="absolute bottom-20 left-4 z-50 animate-in slide-in-from-bottom-2 duration-300">
           <EmojiPicker 
             theme={document.documentElement.classList.contains('dark') ? EmojiTheme.DARK : EmojiTheme.LIGHT}
             onEmojiClick={(emojiData) => {
               setInput(prev => prev + emojiData.emoji);
               setShowEmoji(false);
             }}
             lazyLoadEmojis={true}
             searchPlaceholder="Search all emojis..."
             width={320}
             height={400}
           />
        </div>
      )}

      {showAttach && (
        <div className="absolute bottom-20 left-16 z-50 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-2xl p-4 grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-5 duration-300">
           {[
             { label: 'Gallery', icon: <Image size={24} className="text-purple-500" /> },
             { label: 'Document', icon: <FileText size={24} className="text-blue-500" /> },
             { label: 'Fees Structure', icon: <CreditCard size={24} className="text-emerald-500" /> },
             { label: 'Results', icon: <BarChart2 size={24} className="text-orange-500" /> }
           ].map(item => (
             <button key={item.label} onClick={() => handleAttachClick(item.label)} className="flex flex-col items-center gap-2 p-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors">
                <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-800 rounded-full flex items-center justify-center shadow-inner">{item.icon}</div>
                <span className="text-[10px] font-inter font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-tighter">{item.label}</span>
             </button>
           ))}
        </div>
      )}

      {/* Input Section */}
      <form onSubmit={sendMessage} className="p-4 bg-[#f0f2f5] dark:bg-zinc-900 flex items-center gap-4 z-20 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-1 text-zinc-500">
           <button type="button" onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false); }} className={cn("p-2.5 rounded-full transition-all", showEmoji ? "bg-zinc-200 text-zinc-900" : "hover:bg-zinc-200")}><Smile size={24} /></button>
           <button type="button" onClick={() => { setShowAttach(!showAttach); setShowEmoji(false); }} className={cn("p-2.5 rounded-full transition-all text-[#54656f]", showAttach ? "bg-zinc-200 dark:bg-zinc-800" : "hover:bg-zinc-200")}>
              <Plus size={24} className={cn("transition-transform", showAttach && "rotate-45")} />
           </button>
        </div>
        
        <input 
          type="text" 
          placeholder="Type a message" 
          value={input} 
          onChange={e => setInput(e.target.value)} 
          className="flex-1 bg-white dark:bg-zinc-800 border-none rounded-xl px-5 py-3.5 text-[15px] font-inter outline-none shadow-sm" 
        />
        
        <div className="flex items-center gap-2">
           {input.trim() ? (
              <button type="submit" className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center hover:bg-emerald-700 transition-all shadow-md active:scale-95"><Send size={22} fill="currentColor" className="ml-1" /></button>
           ) : (
              <button type="button" className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-500 flex items-center justify-center hover:bg-zinc-300 transition-all active:scale-95"><Mic size={22} /></button>
           )}
        </div>
      </form>
      {/* Group Profile Modal */}
      <AnimatePresence>
        {showProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfile(false)}
              className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm pointer-events-auto"
            />
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] pointer-events-auto border border-zinc-100 dark:border-zinc-800"
            >
               {/* MODAL HEADER */}
               <div className="p-8 bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 flex flex-col items-center text-center">
                  <div className="w-20 h-20 rounded-3xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-4 overflow-hidden border border-zinc-200 dark:border-zinc-700">
                     {chatData?.type === 'group' ? (
                        <Users size={32} strokeWidth={1.5} />
                     ) : chatData?.profile?.avatar_url ? (
                        <img src={chatData.profile.avatar_url} className="w-full h-full object-cover" />
                     ) : (
                        <User size={32} strokeWidth={1.5} />
                     )}
                  </div>
                  <h2 className="text-lg font-sora font-bold text-zinc-900 dark:text-white uppercase tracking-tight">
                     {chatData?.type === 'group' ? chatData.name : chatData?.profile?.full_name}
                  </h2>
                  <p className="text-[10px] font-inter font-bold text-zinc-400 uppercase tracking-widest mt-1">
                     {chatData?.type === 'group' ? `${members.length} Members` : 'Chat Info'}
                  </p>

                  {/* QUICK ACTIONS */}
                  <div className="flex items-center gap-4 mt-8">
                     {[
                       { icon: Volume2, label: 'Audio' },
                       { icon: Video, label: 'Video' },
                       { icon: UserPlus, label: 'Add' },
                       { icon: Search, label: 'Search' }
                     ].map((action, i) => (
                       <button key={i} className="flex flex-col items-center gap-1.5 px-4">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:text-emerald-600 transition-colors">
                             <action.icon size={18} />
                          </div>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">{action.label}</span>
                       </button>
                     ))}
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                  {/* UTILITY TABS */}
                  <div className="flex gap-2 overflow-x-auto no-scrollbar pb-6 border-b border-zinc-100 dark:border-zinc-800">
                     {[
                       { icon: Image, label: 'Media' },
                       { icon: HardDrive, label: 'Storage' },
                       { icon: Bell, label: 'Alerts' },
                       { icon: Palette, label: 'Theme' }
                     ].map((tab, i) => (
                       <button key={i} className="shrink-0 px-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center gap-2 hover:bg-zinc-100 transition-all">
                          <tab.icon size={14} className="text-zinc-400" />
                          <span className="text-[10px] font-bold text-zinc-600 dark:text-zinc-400 uppercase">{tab.label}</span>
                       </button>
                     ))}
                  </div>

                  {/* SETTINGS */}
                  <div className="py-6 space-y-1">
                     <div className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer group">
                        <div className="flex items-center gap-3">
                           <Clock size={16} className="text-zinc-400" />
                           <p className="text-[13px] font-inter font-medium text-zinc-700 dark:text-zinc-300">Disappearing Messages</p>
                        </div>
                        <span className="text-[10px] font-bold text-zinc-400 uppercase">Off</span>
                     </div>

                     <div className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer group">
                        <div className="flex items-center gap-3">
                           <ShieldCheck size={16} className="text-zinc-400" />
                           <p className="text-[13px] font-inter font-medium text-zinc-700 dark:text-zinc-300">Permissions</p>
                        </div>
                        <ChevronRight size={14} className="text-zinc-300" />
                     </div>

                     <div className="flex items-center justify-between p-3 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all cursor-pointer group">
                        <div className="flex items-center gap-3">
                           <Lock size={16} className="text-zinc-400" />
                           <p className="text-[13px] font-inter font-medium text-zinc-700 dark:text-zinc-300">Lock Chat</p>
                        </div>
                        <div className="w-8 h-4 bg-zinc-200 dark:bg-zinc-700 rounded-full" />
                     </div>
                  </div>

                  {/* MEMBERS */}
                  <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-4">
                     <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-4">Group Members</h4>
                     {members.map((m) => (
                       <div key={m.id} className="flex items-center justify-between py-1">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 border border-zinc-100 dark:border-zinc-700 overflow-hidden shrink-0">
                                {m.avatar_url ? (
                                  <img src={m.avatar_url} className="w-full h-full object-cover" />
                                ) : (
                                  <User size={18} className="opacity-30" />
                                )}
                             </div>
                             <div>
                                <p className="font-sora font-semibold text-[13px] text-zinc-800 dark:text-zinc-200">{m.full_name}</p>
                                <p className="text-[10px] text-zinc-500 font-inter">{m.phone || 'Member'}</p>
                             </div>
                          </div>
                          <span className={cn(
                            "px-2 py-1 rounded text-[9px] font-bold uppercase",
                            m.role === 'ADMIN' || m.role === 'PRINCIPAL' ? "text-emerald-600 bg-emerald-50" : "text-zinc-400"
                          )}>
                             {m.role === 'ADMIN' || m.role === 'PRINCIPAL' || m.role === 'TEACHER' ? 'Admin' : 'Member'}
                          </span>
                       </div>
                     ))}
                  </div>
               </div>

               <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
                  <button 
                    onClick={() => setShowProfile(false)}
                    className="w-full py-4 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-2xl font-bold text-[11px] uppercase tracking-widest border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 transition-all"
                  >
                     Close
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChatScreen;
