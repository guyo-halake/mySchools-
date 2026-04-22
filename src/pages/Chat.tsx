import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Search, 
  MoreVertical, 
  Smile, 
  Paperclip, 
  Mic, 
  Send, 
  CheckCheck, 
  Users, 
  Phone, 
  Video,
  ChevronLeft,
  X,
  MessageSquare,
  User as UserIcon
} from 'lucide-react';
import { cn, formatDate } from '../utils/utils';

interface Message {
  id: string;
  sender_id: string;
  receiver_id?: string;
  group_id?: string;
  content: string;
  created_at: string;
  status: 'sent' | 'delivered' | 'read';
}

interface ChatSession {
  id: string;
  name: string;
  avatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount?: number;
  type: 'private' | 'group';
  role?: string;
}

export const Chat: React.FC = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileListOpen, setIsMobileListOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // MOCK DATA for initial rendering
  useEffect(() => {
    const mockSessions: ChatSession[] = [
      { id: '1', name: 'Form 3 North - Parent Group', lastMessage: 'Please remember to sign the report cards.', lastMessageTime: '10:45 AM', type: 'group', unreadCount: 3 },
      { id: '2', name: 'Mr. David (Math Teacher)', lastMessage: 'The assignment is ready.', lastMessageTime: '09:12 AM', type: 'private', role: 'Teacher' },
      { id: '3', name: 'Mrs. Sarah (Class Teacher)', lastMessage: 'Thank you for the update.', lastMessageTime: 'Yesterday', type: 'private', role: 'Teacher' },
      { id: '4', name: 'Sports Committee', lastMessage: 'Meeting tomorrow at 4 PM.', lastMessageTime: 'Yesterday', type: 'group' },
    ];
    setSessions(mockSessions);
  }, []);

  // MOCK MESSAGES for active session
  useEffect(() => {
    if (activeSession) {
      const mockMsgs: Message[] = [
        { id: 'm1', sender_id: 'other', content: `Hello! Regarding the ${activeSession.name} update...`, created_at: '2026-04-19T08:00:00Z', status: 'read' },
        { id: 'm2', sender_id: user?.id || 'me', content: 'I am well, thank you. I received the message.', created_at: '2026-04-19T08:05:00Z', status: 'read' },
        { id: 'm3', sender_id: 'other', content: 'Great. Let me know if you need anything else.', created_at: '2026-04-19T08:10:00Z', status: 'read' },
      ];
      setMessages(mockMsgs);
      setIsMobileListOpen(false);
    }
  }, [activeSession, user?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeSession) return;

    const msg: Message = {
      id: Date.now().toString(),
      sender_id: user?.id || 'me',
      content: newMessage,
      created_at: new Date().toISOString(),
      status: 'sent'
    };

    setMessages([...messages, msg]);
    setNewMessage('');
  };

  const filteredSessions = sessions.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-140px)] flex bg-white dark:bg-zinc-950 rounded-3xl overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-2xl relative">
      
      {/* SESSION LIST */}
      <div className={cn(
        "w-full md:w-80 lg:w-96 flex flex-col border-r border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 transition-all duration-300",
        !isMobileListOpen && "hidden md:flex"
      )}>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold font-sora">Messages</h1>
            <div className="flex items-center gap-2">
               <button className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"><Users size={18}/></button>
               <button className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"><MoreVertical size={18}/></button>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input 
              type="text" 
              placeholder="Search chats..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-zinc-800 border-none rounded-xl text-xs font-medium outline-none shadow-sm focus:ring-2 focus:ring-emerald-500/20"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredSessions.map(session => (
            <div 
              key={session.id} 
              onClick={() => setActiveSession(session)}
              className={cn(
                "flex items-center gap-3 p-4 cursor-pointer transition-all border-b border-zinc-50 dark:border-zinc-800/30 hover:bg-white dark:hover:bg-zinc-800",
                activeSession?.id === session.id && "bg-white dark:bg-zinc-800 border-l-4 border-l-emerald-500"
              )}
            >
              <div className="w-12 h-12 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-400 relative">
                {session.type === 'group' ? <Users size={20}/> : <UserIcon size={20}/>}
                {session.unreadCount && (
                  <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[8px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900">
                    {session.unreadCount}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <h4 className="text-sm font-bold font-sora truncate">{session.name}</h4>
                  <span className="text-[9px] font-medium text-zinc-400 uppercase">{session.lastMessageTime}</span>
                </div>
                <p className="text-[10px] text-zinc-500 font-medium truncate">{session.lastMessage}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className={cn(
        "flex-1 flex flex-col bg-white dark:bg-zinc-950",
        isMobileListOpen && "hidden md:flex"
      )}>
        {activeSession ? (
          <>
            {/* CHAT HEADER */}
            <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20">
              <div className="flex items-center gap-3">
                <button onClick={() => setIsMobileListOpen(true)} className="md:hidden p-2 -ml-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                  <ChevronLeft size={20}/>
                </button>
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-400">
                  {activeSession.type === 'group' ? <Users size={16}/> : <UserIcon size={16}/>}
                </div>
                <div>
                  <h3 className="text-sm font-bold font-sora leading-none">{activeSession.name}</h3>
                  <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-tight mt-1">Online</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"><Video size={18}/></button>
                <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"><Phone size={18}/></button>
                <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"><Search size={18}/></button>
                <button className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"><MoreVertical size={18}/></button>
              </div>
            </div>

            {/* MESSAGES AREA */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-zinc-50/30 dark:bg-zinc-900/10 bg-[url('https://i.pinimg.com/originals/ab/ab/60/abab60f38a6a6e553a1a97d9196b42b7.png')] bg-repeat bg-[length:400px]"
            >
              <div className="flex justify-center my-4">
                 <span className="px-3 py-1 bg-zinc-200 dark:bg-zinc-800 text-[9px] font-bold uppercase text-zinc-500 rounded-md shadow-sm">Today</span>
              </div>

              {messages.map((msg) => {
                const isMe = msg.sender_id === user?.id || msg.sender_id === 'me';
                return (
                  <div key={msg.id} className={cn(
                    "flex flex-col max-w-[85%] md:max-w-[70%]",
                    isMe ? "ml-auto items-end" : "mr-auto items-start"
                  )}>
                    <div className={cn(
                      "px-4 py-2.5 rounded-2xl text-[12px] font-medium leading-relaxed shadow-sm relative",
                      isMe 
                        ? "bg-emerald-600 text-white rounded-tr-none" 
                        : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-tl-none border border-zinc-100 dark:border-zinc-700/50"
                    )}>
                      {msg.content}
                      <div className={cn(
                        "flex items-center gap-1.5 mt-1.5 justify-end",
                        isMe ? "text-emerald-100" : "text-zinc-400"
                      )}>
                        <span className="text-[8px] font-semibold">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {isMe && <CheckCheck size={12} className={cn(msg.status === 'read' ? "text-white" : "text-emerald-200")}/>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* INPUT AREA */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 flex items-center gap-3">
              <div className="flex items-center gap-1">
                <button type="button" className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"><Smile size={20}/></button>
                <button type="button" className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"><Paperclip size={20}/></button>
              </div>
              <input 
                type="text" 
                placeholder="Type a message..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                className="flex-1 bg-zinc-100 dark:bg-zinc-900 border-none rounded-2xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              {newMessage.trim() ? (
                <button type="submit" className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center hover:bg-emerald-700 transition-all active:scale-90 shadow-lg shadow-emerald-600/20">
                  <Send size={18} />
                </button>
              ) : (
                <button type="button" className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"><Mic size={20}/></button>
              )}
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
            <div className="w-24 h-24 bg-zinc-50 dark:bg-zinc-900 rounded-full flex items-center justify-center text-zinc-200 dark:text-zinc-800">
               <MessageSquare size={48} />
            </div>
            <div>
               <h3 className="text-xl font-bold font-sora text-zinc-900 dark:text-white">Select a Chat</h3>
               <p className="text-sm font-medium text-zinc-400 mt-2 max-w-xs mx-auto">Choose a conversation from the list to start messaging.</p>
            </div>
            <button 
               onClick={() => setIsMobileListOpen(true)}
               className="md:hidden bg-zinc-900 text-white px-6 py-2.5 rounded-full text-xs font-bold shadow-xl"
            >
               Open Chats
            </button>
            <div className="pt-12 flex items-center gap-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest opacity-50">
               <CheckCheck size={14}/> Secure Messaging Enabled
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
