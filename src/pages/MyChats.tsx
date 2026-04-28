import React, { useState, useEffect, useMemo } from 'react';
import ChatList from '../components/ChatList';
import ChatScreen from '../components/ChatScreen';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { 
  Menu, 
  Users, 
  CircleDashed, 
  Camera, 
  Plus, 
  Search,
  ArrowLeft,
  Shield,
  Calendar,
  Undo2,
  Check,
  Settings,
  MoreVertical
} from 'lucide-react';
import { cn } from '../utils/utils';
import { motion, AnimatePresence } from 'motion/react';

const MyChats: React.FC = () => {
  const [selectedChatId, setSelectedChatId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [counts, setCounts] = useState({ all: 0, unread: 0, groups: 0, appointments: 0 });
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newChatTab, setNewChatTab] = useState<'TEACHERS' | 'OTHERS'>('TEACHERS');
  const [newChatSearchQuery, setNewChatSearchQuery] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showMyClassOnly, setShowMyClassOnly] = useState(false);
  const [teacherStreamId, setTeacherStreamId] = useState<string | null>(null);
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([]);

  const { teachers, students, parents } = useApp();
  const { user: currentUser } = useAuth();
  const isTeacher = currentUser?.role === 'TEACHER';

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleStartChat = async (targetUserId: string) => {
    if (!currentUser) return;
    setIsCreatingChat(true);

    try {
      const { data: matchedChats } = await supabase
        .from('chat_members')
        .select('chat_id, chats!inner(type)')
        .eq('user_id', currentUser.id)
        .eq('chats.type', 'direct');

      const { data: targetInvolvement } = await supabase
        .from('chat_members')
        .select('chat_id')
        .eq('user_id', targetUserId)
        .in('chat_id', matchedChats?.map(c => c.chat_id) || []);

      if (targetInvolvement && targetInvolvement.length > 0) {
        setSelectedChatId(targetInvolvement[0].chat_id);
      } else {
        const { data: newChat, error: chatError } = await supabase
          .from('chats')
          .insert({ type: 'direct' })
          .select()
          .single();

        if (chatError) throw chatError;

        await supabase.from('chat_members').insert([
          { chat_id: newChat.id, user_id: currentUser.id },
          { chat_id: newChat.id, user_id: targetUserId }
        ]);

        setSelectedChatId(newChat.id);
      }
    } catch (err) {
      console.error('Chat error:', err);
    } finally {
      setIsCreatingChat(false);
      setIsNewChatOpen(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!currentUser || !newGroupName.trim()) return;
    setIsCreatingChat(true);
    try {
      const { data: group, error } = await supabase
        .from('chats')
        .insert({ type: 'group', name: newGroupName })
        .select()
        .single();
      if (error) throw error;

      const members = [...selectedGroupMembers, currentUser.id];
      const memberInserts = members.map(uid => ({ chat_id: group.id, user_id: uid }));
      
      await supabase.from('chat_members').insert(memberInserts);
      
      setSelectedChatId(group.id);
      setIsCreateGroupOpen(false);
      setNewGroupName('');
      setSelectedGroupMembers([]);
    } catch (err) {
      console.error('Group creation error:', err);
    } finally {
      setIsCreatingChat(false);
    }
  };

  const handleSyncMyClass = () => {
    if (!teacherStreamId) return;
    const classParentIds = students
      .filter(s => s.stream_id === teacherStreamId)
      .map(s => s.parent_id)
      .filter(Boolean) as string[];
    
    setSelectedGroupMembers(prev => Array.from(new Set([...prev, ...classParentIds])));
  };

  // GLOBAL MESSAGE LISTENER
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase
      .channel('global-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const newMessage = payload.new;
          if (newMessage.sender_id === currentUser.id) return;
          const { data: member } = await supabase
            .from('chat_members')
            .select('chat_id')
            .match({ chat_id: newMessage.chat_id, user_id: currentUser.id })
            .single();

          if (member) {
            if (newMessage.chat_id !== selectedChatId) {
               const id = Date.now();
               setNotifications(prev => [...prev, { id, ...newMessage }]);
               setTimeout(() => {
                 setNotifications(prev => prev.filter(n => n.id !== id));
               }, 5000);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, selectedChatId]);

  useEffect(() => {
    if (isTeacher) {
      setNewChatTab('OTHERS');
      const fetchStream = async () => {
         const { data } = await supabase
           .from('streams')
           .select('id')
           .eq('class_teacher_id', currentUser.id)
           .maybeSingle();
         if (data) setTeacherStreamId(data.id);
      };
      fetchStream();
    }
  }, [isTeacher, currentUser]);

  const contactList = useMemo(() => {
    let list = newChatTab === 'TEACHERS' ? teachers : parents;
    
    if (isTeacher) {
       list = parents;
       if (showMyClassOnly && teacherStreamId) {
          const classParentIds = students
            .filter(s => s.stream_id === teacherStreamId)
            .map(s => s.parent_id);
          list = list.filter(p => classParentIds.includes(p.id));
       }
    }

    const q = newChatSearchQuery.toLowerCase();
    return list.filter((p: any) => 
      p.full_name?.toLowerCase().includes(q) || 
      p.email?.toLowerCase().includes(q) || 
      p.phone?.toLowerCase().includes(q)
    );
  }, [newChatTab, teachers, parents, students, newChatSearchQuery, isTeacher, showMyClassOnly, teacherStreamId]);

  return (
    <div className="h-[calc(100vh-130px)] flex bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
      
      {/* SIDEBAR: CHAT LIST */}
      <div className={cn(
        "w-full lg:w-[450px] flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950",
        isMobile && selectedChatId ? "hidden" : "flex"
      )}>
        
        <div className="p-5 flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
           <div className="flex items-center gap-3">
              <button 
                onClick={() => window.history.back()}
                className="p-2 -ml-2 text-zinc-400 hover:text-orange-600 transition-colors"
              >
                 <Undo2 size={22} className="scale-x-[-1]" />
              </button>
              <h1 className="text-xl font-sora font-black text-zinc-900 dark:text-white uppercase tracking-tighter">Messaging</h1>
           </div>
           <div className="flex items-center gap-2">
              <button className="p-2 text-zinc-400"><Settings size={18} /></button>
              <button 
                onClick={() => setIsNewChatOpen(true)}
                className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
              >
                 <Plus size={20} />
              </button>
           </div>
        </div>

        {/* SEARCH */}
        <div className="p-4">
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
              <input 
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-zinc-100 dark:bg-zinc-800/80 border-none rounded-2xl text-[14px] font-inter outline-none"
              />
           </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex px-4 pb-4 gap-2 overflow-x-auto no-scrollbar border-b border-zinc-50 dark:border-zinc-800">
           {['All', 'Unread', 'Groups', 'Appointments'].map(key => {
             const tabKey = key.toLowerCase();
             const count = (counts as any)[tabKey];
             return (
               <button
                 key={key}
                 onClick={() => setActiveTab(tabKey)}
                 className={cn(
                   "px-4 py-2 rounded-full text-[12px] font-inter font-bold whitespace-nowrap transition-all",
                   activeTab === tabKey 
                     ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20" 
                     : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                 )}
               >
                 {key} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
               </button>
             );
           })}
        </div>

        <div className="flex-1 overflow-y-auto">
            {activeTab === 'groups' && isTeacher && (
               <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                  <button 
                    onClick={() => setIsCreateGroupOpen(true)}
                    className="w-full py-3 bg-emerald-600/10 text-emerald-600 rounded-2xl font-inter font-bold text-[12px] uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> Create Group
                  </button>
               </div>
            )}
           <ChatList 
             onSelectChat={setSelectedChatId} 
             selectedChatId={selectedChatId} 
             filterTab={activeTab}
             searchQuery={searchQuery}
             onCountsUpdate={setCounts}
           />
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 bg-[#efeae2] dark:bg-zinc-950 transition-all",
        isMobile && !selectedChatId ? "hidden" : "flex"
      )}>
        {selectedChatId ? (
          <div className="flex flex-col h-full overflow-hidden">
             <ChatScreen 
               chatId={selectedChatId} 
               onBack={isMobile ? () => setSelectedChatId(undefined) : undefined} 
             />
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 flex-col items-center justify-center p-12 text-center bg-[#f8f9fa] dark:bg-zinc-950">
            <div className="w-20 h-20 bg-zinc-100 dark:bg-zinc-900 rounded-full flex items-center justify-center text-zinc-300 mb-8">
               <Shield size={40} />
            </div>
            <div className="space-y-3 max-w-xs">
               <h2 className="text-xl font-sora font-bold text-zinc-900 dark:text-white leading-tight">Secure messaging</h2>
               <p className="font-inter text-[13px] text-zinc-500 dark:text-zinc-400 leading-relaxed uppercase tracking-widest opacity-60">
                 Choose a conversation or check your appointments to start messaging.
               </p>
            </div>
          </div>
        )}
      </div>

      {/* NEW CHAT MODAL */}
      {isNewChatOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={() => setIsNewChatOpen(false)} />
           <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in duration-300">
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
                 <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-sora font-bold text-zinc-900 dark:text-white">Start a new chat</h2>
                    {isCreatingChat && <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />}
                 </div>

                 <div className="relative group mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input 
                      type="text"
                      placeholder="Search contacts..."
                      autoFocus
                      value={newChatSearchQuery}
                      onChange={(e) => setNewChatSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl text-[14px] font-inter outline-none focus:ring-1 focus:ring-emerald-500/20"
                    />
                 </div>

                 <div className="flex gap-4">
                    {!isTeacher && (
                      <button 
                        onClick={() => setNewChatTab('TEACHERS')}
                        className={cn(
                          "flex-1 py-2 text-[11px] font-inter font-bold uppercase tracking-widest border-b-2 transition-all",
                          newChatTab === 'TEACHERS' ? "border-emerald-600 text-emerald-600" : "border-transparent text-zinc-400"
                        )}
                      >
                        Teachers
                      </button>
                    )}
                    <button 
                      onClick={() => setNewChatTab('OTHERS')}
                      className={cn(
                        "flex-1 py-2 text-[11px] font-inter font-bold uppercase tracking-widest border-b-2 transition-all",
                        newChatTab === 'OTHERS' ? "border-emerald-600 text-emerald-600" : "border-transparent text-zinc-400"
                      )}
                    >
                      {isTeacher ? 'Parents' : 'Others'}
                    </button>
                 </div>

                 {isTeacher && newChatTab === 'OTHERS' && (
                    <div className="mt-4 flex items-center gap-2 px-2">
                       <input 
                         type="checkbox" 
                         id="myClass"
                         checked={showMyClassOnly}
                         onChange={(e) => setShowMyClassOnly(e.target.checked)}
                         className="w-4 h-4 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
                       />
                       <label htmlFor="myClass" className="text-[11px] font-inter font-bold text-zinc-500 uppercase tracking-wider cursor-pointer">
                          Show parents from My Class only
                       </label>
                    </div>
                 )}
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                 {contactList.length > 0 ? contactList.map((person: any) => {
                   const profile = person.profile || person;
                   return (
                     <div 
                       key={profile.id} 
                       onClick={() => handleStartChat(profile.id)}
                       className="flex items-center gap-4 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all rounded-2xl cursor-pointer group"
                     >
                        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 font-sora font-bold shadow-inner overflow-hidden shrink-0">
                           {profile.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : profile.full_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                           <h4 className="font-sora font-semibold text-[14px] text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 transition-colors uppercase tracking-tight">{profile.full_name}</h4>
                           <div className="flex items-center gap-3 text-[11px] font-inter text-zinc-400 dark:text-zinc-500 mt-0.5">
                              <span>{profile.phone || 'No phone'}</span>
                              <span className="opacity-30">•</span>
                              <span className="truncate">{profile.email || 'No email'}</span>
                           </div>
                        </div>
                     </div>
                   );
                 }) : (
                    <div className="py-20 text-center opacity-40">
                       <p className="font-inter text-[12px] uppercase tracking-widest">No contacts found</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}
      {/* NEW CHAT MODAL ... (rest of the code) */}
      
      {/* CREATE GROUP MODAL */}
      {isCreateGroupOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={() => setIsCreateGroupOpen(false)} />
           <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800">
                 <h2 className="text-lg font-sora font-bold text-zinc-900 dark:text-white mb-6">Create New Group</h2>
                 <input 
                   type="text"
                   placeholder="Enter Group Name..."
                   value={newGroupName}
                   onChange={(e) => setNewGroupName(e.target.value)}
                   className="w-full px-5 py-4 bg-zinc-100 dark:bg-zinc-800 border-none rounded-2xl text-[14px] font-inter outline-none focus:ring-1 focus:ring-emerald-500/20 mb-4"
                 />
                 <div className="flex gap-2">
                    <button 
                      onClick={handleSyncMyClass}
                      className="flex-1 py-3 bg-emerald-50 text-emerald-600 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-emerald-100 transition-colors"
                    >
                      Sync My Class
                    </button>
                    <button className="flex-1 py-3 bg-zinc-50 text-zinc-500 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-zinc-100 transition-colors">
                      Invite via Link
                    </button>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2 scrollbar-thin">
                 <p className="px-4 py-2 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Select Members ({selectedGroupMembers.length})</p>
                 {parents.map((p) => (
                    <div 
                      key={p.id}
                      onClick={() => {
                        setSelectedGroupMembers(prev => 
                          prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                        );
                      }}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all mb-1",
                        selectedGroupMembers.includes(p.id) ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100" : "hover:bg-zinc-50 dark:hover:bg-zinc-800"
                      )}
                    >
                       <div className={cn(
                         "w-10 h-10 rounded-full flex items-center justify-center text-white text-[12px] font-bold",
                         selectedGroupMembers.includes(p.id) ? "bg-emerald-600" : "bg-zinc-200 text-zinc-400"
                       )}>
                          {selectedGroupMembers.includes(p.id) ? <Check size={16} /> : p.full_name[0]}
                       </div>
                       <div className="flex-1">
                          <h4 className="text-[14px] font-sora font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">{p.full_name}</h4>
                          <p className="text-[11px] text-zinc-500 font-inter">{p.role}</p>
                       </div>
                    </div>
                 ))}
              </div>

              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/50 border-t dark:border-zinc-800">
                 <button 
                   onClick={handleCreateGroup}
                   disabled={!newGroupName.trim() || selectedGroupMembers.length === 0 || isCreatingChat}
                   className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-[14px] uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50 disabled:grayscale transition-all shadow-lg"
                 >
                    {isCreatingChat ? 'Creating...' : 'Create Group'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* GLOBAL NOTIFICATIONS */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[200] flex flex-col gap-3 w-full max-w-sm px-4 pointer-events-none">
        <AnimatePresence>
           {notifications.map((n) => (
             <motion.div
               key={n.id}
               initial={{ opacity: 0, y: -20, scale: 0.9 }}
               animate={{ opacity: 1, y: 0, scale: 1 }}
               exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
               onClick={() => {
                 setSelectedChatId(n.chat_id);
                 setNotifications(prev => prev.filter(x => x.id !== n.id));
               }}
               className="pointer-events-auto bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 shadow-2xl rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all group"
             >
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center shrink-0">
                   <User size={20} />
                </div>
                <div className="flex-1 min-w-0">
                   <div className="flex items-center justify-between">
                      <span className="text-[10px] font-inter font-bold text-emerald-600 uppercase tracking-widest">New Message</span>
                      <span className="text-[9px] text-zinc-400">Just now</span>
                   </div>
                   <p className="text-[13px] font-inter text-zinc-600 dark:text-zinc-300 truncate mt-0.5 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">
                      {n.content}
                   </p>
                </div>
             </motion.div>
           ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MyChats;
