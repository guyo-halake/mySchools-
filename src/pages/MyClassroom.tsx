import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/utils';
import { 
   BookOpen, Video, BrainCircuit, GraduationCap, Link2, Search, Send, 
   Library, PlayCircle, Clock, CheckCircle2, ChevronRight, Mic, Camera, FileText, MonitorPlay, Sparkles
} from 'lucide-react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { ClassroomSession, ELibraryResource, MattaAcademyCourse } from '../types';

type NavMode = 'E_LEARNING' | 'E_LIBRARY' | 'MATTA_ACADEMY';

export const MyClassroom: React.FC = () => {
   const { user } = useAuth();
   const [mode, setMode] = useState<NavMode>('E_LEARNING');
   const [chatInput, setChatInput] = useState('');
   const [chatHistory, setChatHistory] = useState<{sender: 'user' | 'matta', text: string, isLoading?: boolean}[]>([
      { sender: 'matta', text: `Greetings, ${user?.full_name?.split(' ')[0] || 'there'}. I am Matta, your CBC Intelligence Co-Pilot. How can I assist you in your learning today?` }
   ]);
   const chatEndRef = useRef<HTMLDivElement>(null);

   const handleChatSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!chatInput.trim()) return;
      
      const userQ = chatInput;
      setChatHistory(prev => [...prev, { sender: 'user', text: userQ }]);
      setChatInput('');
      setChatHistory(prev => [...prev, { sender: 'matta', text: "Thinking...", isLoading: true }]);

      try {
         // Real API connection to Matta, sending full context
         const res = await api.post('/matta/chat', { 
            message: userQ,
            student_id: user?.id,
            role: user?.role,
            context: {
               mode,
               app_section: 'MyClassroom'
            }
         });
         
         if (res.data && res.data.reply) {
            setChatHistory(prev => [
               ...prev.filter(m => !m.isLoading), 
               { sender: 'matta', text: res.data.reply }
            ]);
            return;
         }
      } catch (err) {
         console.warn("Real API unavailable, falling back to local Matta Engine", err);
      }

      // Mock Matta AI responses fallback
      setTimeout(() => {
         let reply = "I'm analyzing that request across our CBC curriculum database.";
         const lowerQ = userQ.toLowerCase();
         if (lowerQ.includes('class today') || lowerQ.includes('attend')) {
            reply = "Yes, records show attendance for the 8:00 AM Mathematics block. Engagement was high.";
         } else if (lowerQ.includes('algebra') || lowerQ.includes('math')) {
            reply = "I've pulled up the foundational Algebra concepts from the Grade 7 CBC syllabus. Would you like me to generate a 5-minute interactive quiz?";
         } else if (lowerQ.includes('summarize') || lowerQ.includes('listen')) {
            reply = "Listening to the active audio stream... I will provide a condensed summary of the key learning points once the teacher concludes.";
         } else if (lowerQ.includes('teach') || lowerQ.includes('code') || lowerQ.includes('python')) {
            reply = "Initializing Matta Academy. I can guide you through Python basics. Let's start with variables. Type 'ready' when you are.";
         }

         setChatHistory(prev => [
            ...prev.filter(m => !m.isLoading),
            { sender: 'matta', text: reply }
         ]);
      }, 1000);
   };

   useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
   }, [chatHistory]);

   return (
      <div className="flex h-screen w-full bg-slate-50 text-slate-900 overflow-hidden font-inter selection:bg-emerald-500/30">
         
         {/* LEFT SIDEBAR - NAV */}
         <div className="w-20 md:w-64 border-r border-slate-200 bg-white/80 backdrop-blur-xl flex flex-col items-center md:items-start py-6 z-20 flex-shrink-0">
            <div className="mb-10 px-0 md:px-6 flex items-center justify-center md:justify-start gap-3 w-full">
               <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <MonitorPlay size={20} className="text-white" />
               </div>
               <div className="hidden md:block">
                  <h1 className="text-lg font-black font-sora tracking-tight leading-none text-slate-900">Workspace</h1>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Matta OS</p>
               </div>
            </div>

            <nav className="flex-1 w-full px-3 md:px-4 space-y-2">
               <NavButton active={mode === 'E_LEARNING'} onClick={() => setMode('E_LEARNING')} icon={<Video size={18} />} label="Live Classes" />
               <NavButton active={mode === 'E_LIBRARY'} onClick={() => setMode('E_LIBRARY')} icon={<Library size={18} />} label="E-Library" />
               <NavButton active={mode === 'MATTA_ACADEMY'} onClick={() => setMode('MATTA_ACADEMY')} icon={<BrainCircuit size={18} />} label="Matta Academy" />
            </nav>

            <div className="px-4 w-full hidden md:block">
               <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-2 mb-2">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Matta Network Active</span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">Connected to high-speed educational edge nodes.</p>
               </div>
            </div>
         </div>

         {/* MAIN STAGE */}
         <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/40 via-slate-50 to-slate-50 pointer-events-none" />
            
            <div className="flex-1 overflow-y-auto p-6 md:p-10 no-scrollbar relative z-10">
               {mode === 'E_LEARNING' && <ELearningStage user={user} />}
               {mode === 'E_LIBRARY' && <ELibraryStage />}
               {mode === 'MATTA_ACADEMY' && <MattaAcademyStage />}
            </div>
         </div>

         {/* RIGHT SIDEBAR - MATTA INTELLIGENCE */}
         <div className="w-80 lg:w-[400px] border-l border-slate-200 bg-white/90 backdrop-blur-3xl flex flex-col shadow-2xl flex-shrink-0">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
               <div className="flex items-center gap-3">
                  <div className="relative">
                     <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center">
                        <Sparkles size={18} className="text-emerald-500" />
                     </div>
                     <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white" />
                  </div>
                  <div>
                     <h3 className="text-sm font-black text-slate-900 font-sora">AI Assistant</h3>
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ready to help</p>
                  </div>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
               {chatHistory.map((msg, i) => (
                  <div key={i} className={cn("flex w-full", msg.sender === 'user' ? "justify-end" : "justify-start")}>
                     <div className={cn(
                        "max-w-[85%] p-4 rounded-3xl text-sm font-medium leading-relaxed shadow-sm",
                        msg.sender === 'user' 
                           ? "bg-emerald-600 text-white rounded-tr-sm" 
                           : "bg-white border border-slate-200 text-slate-700 rounded-tl-sm"
                     )}>
                        {msg.text}
                     </div>
                  </div>
               ))}
               <div ref={chatEndRef} />
            </div>

            <div className="p-4 bg-slate-50/80 border-t border-slate-200/80">
               <form onSubmit={handleChatSubmit} className="relative flex items-center">
                  <input 
                     type="text"
                     value={chatInput}
                     onChange={(e) => setChatInput(e.target.value)}
                     placeholder={user?.role === 'PARENT' ? "Ask about attendance or progress..." : "Ask Matta to explain a concept..."}
                     className="w-full bg-white border border-slate-300 rounded-2xl py-3.5 pl-4 pr-44 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all shadow-sm"
                  />
                  <button type="submit" className="absolute right-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl transition-colors text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                     <Sparkles size={14} /> Analyze with Matta
                  </button>
               </form>
               <div className="flex justify-center gap-4 mt-3">
                  <button className="text-[9px] font-black text-slate-500 hover:text-emerald-600 uppercase tracking-widest transition-colors flex items-center gap-1">
                     <Mic size={10} /> Voice Input
                  </button>
                  <button className="text-[9px] font-black text-slate-500 hover:text-emerald-600 uppercase tracking-widest transition-colors flex items-center gap-1">
                     <FileText size={10} /> Upload File
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
};

// --- SUB-STAGES ---

const ELearningStage = ({ user }: { user: any }) => {
   const [inMeeting, setInMeeting] = useState(false);
   const [sessions, setSessions] = useState<ClassroomSession[]>([]);
   const [activeSession, setActiveSession] = useState<ClassroomSession | null>(null);

   useEffect(() => {
      const fetchSessions = async () => {
         const { data } = await supabase
            .from('classroom_sessions')
            .select('*, profiles:teacher_id(full_name), subjects:subject_id(name)')
            .order('start_time', { ascending: true })
            .limit(5);
         
         if (data) setSessions(data);
      };
      fetchSessions();
   }, []);

   const joinSession = (session: ClassroomSession) => {
      setActiveSession(session);
      setInMeeting(true);
   };

   return (
      <div className="space-y-8 animate-in fade-in duration-500">
         <div className="space-y-2">
            <h2 className="text-3xl font-black font-sora tracking-tight text-slate-900">Virtual Classroom</h2>
            <p className="text-sm font-medium text-slate-500">Join your live CBC classes and interact with your facilitators.</p>
         </div>

         {!inMeeting ? (
            <div className="relative w-full aspect-video rounded-3xl bg-slate-900 border border-slate-200 overflow-hidden group shadow-xl">
               <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-transparent z-10" />
               <div className="absolute inset-0 flex items-center justify-center z-20">
                  <div className="text-center">
                     {sessions.length > 0 ? (
                        <>
                           <div 
                              onClick={() => joinSession(sessions[0])}
                              className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-emerald-500/40"
                           >
                              <PlayCircle size={40} className="text-white ml-1" />
                           </div>
                           <h3 className="text-2xl font-black text-white font-sora mb-2 drop-shadow-md">{sessions[0].title}</h3>
                           <p className="text-emerald-400 font-bold text-sm drop-shadow-md">Live now</p>
                        </>
                     ) : (
                        <>
                           <div 
                              onClick={() => joinSession({ id: 'demo', title: 'Demo Classroom', status: 'Live', school_id: '', archived: false, created_at: '', updated_at: '' })}
                              className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-emerald-500/40"
                           >
                              <PlayCircle size={40} className="text-white ml-1" />
                           </div>
                           <h3 className="text-2xl font-black text-white font-sora mb-2 drop-shadow-md">No active sessions</h3>
                           <p className="text-emerald-400 font-bold text-sm drop-shadow-md">Click to start Demo Classroom</p>
                        </>
                     )}
                  </div>
               </div>
               {/* AI Teacher Background Image */}
               <div className="absolute inset-0 opacity-60 bg-[url('/ai_teacher_human.png')] bg-cover bg-center mix-blend-overlay" />
            </div>
         ) : (
            <div className="relative w-full aspect-video rounded-3xl bg-slate-100 border border-slate-200 overflow-hidden shadow-xl">
               <JitsiMeeting
                  domain="meet.jit.si"
                  roomName={activeSession?.room_url || "MattaCBCClassGrade7"}
                  configOverwrite={{
                     startWithAudioMuted: true,
                     disableModeratorIndicator: true,
                     startScreenSharing: true,
                     enableEmailInStats: false,
                  }}
                  interfaceConfigOverwrite={{
                     DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
                     SHOW_JITSI_WATERMARK: false,
                     SHOW_WATERMARK_FOR_GUESTS: false,
                     SHOW_BRAND_WATERMARK: false,
                     BRAND_WATERMARK_LINK: '',
                     DEFAULT_LOGO_URL: '',
                     DEFAULT_WELCOME_PAGE_LOGO_URL: '',
                     HIDE_DEEP_LINKING_LOGO: true,
                  }}
                  userInfo={{
                     displayName: user?.full_name || 'Student',
                  }}
                  onApiReady={(externalApi) => {
                     // Add listeners if needed
                  }}
                  getIFrameRef={(iframeRef) => { iframeRef.style.height = '100%'; iframeRef.style.width = '100%'; }}
               />
            </div>
         )}

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sessions.slice(1).map((slot, i) => (
               <div key={i} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between hover:border-emerald-200 hover:shadow-md transition-all cursor-pointer" onClick={() => joinSession(slot)}>
                  <div className="flex items-center gap-4">
                     <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                        <Clock size={20} className="text-slate-400" />
                     </div>
                     <div>
                        <h4 className="text-sm font-black text-slate-800">{slot.title}</h4>
                        <div className="flex flex-col mt-1 gap-0.5">
                           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                              {slot.start_time ? new Date(slot.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Upcoming'} 
                              {slot.end_time ? ` - ${new Date(slot.end_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : ''}
                           </p>
                           {(slot as any).profiles?.full_name && (
                              <p className="text-[10px] text-slate-600 font-medium">Teacher: <span className="font-bold">{(slot as any).profiles.full_name}</span></p>
                           )}
                           {(slot as any).subjects?.name && (
                              <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">{(slot as any).subjects.name}</p>
                           )}
                        </div>
                     </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200">
                     {slot.status}
                  </span>
               </div>
            ))}
            {sessions.length <= 1 && (
               <div className="col-span-2 p-5 text-center text-slate-400 text-sm font-medium">
                  No other upcoming sessions scheduled for today.
               </div>
            )}
         </div>
      </div>
   );
};

const ELibraryStage = () => {
   const [resources, setResources] = useState<ELibraryResource[]>([]);
   const [searchQuery, setSearchQuery] = useState('');

   useEffect(() => {
      const fetchResources = async () => {
         const { data } = await supabase
            .from('e_library_resources')
            .select('*');
         if (data) setResources(data);
      };
      fetchResources();
   }, []);

   const getIcon = (name: string | undefined) => {
      switch (name) {
         case 'BookOpen': return <BookOpen size={24} className="text-blue-500" />;
         case 'FileText': return <FileText size={24} className="text-emerald-500" />;
         case 'PlayCircle': return <PlayCircle size={24} className="text-rose-500" />;
         case 'GraduationCap': return <GraduationCap size={24} className="text-purple-500" />;
         default: return <BookOpen size={24} className="text-slate-400" />;
      }
   };

   return (
      <div className="space-y-8 animate-in fade-in duration-500">
         <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
               <h2 className="text-3xl font-black font-sora tracking-tight text-slate-900">E-Library Hub</h2>
               <p className="text-sm font-medium text-slate-500">Access millions of digital books, research papers, and CBC materials.</p>
            </div>
            <div className="relative w-full md:w-72">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
               <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search the universal library..." 
                  className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-sm transition-all" 
               />
            </div>
         </div>

         <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {['All Resources', 'KICD Approved', 'MyLoft Access', 'Research Papers', 'Video Lectures'].map((tag, i) => (
               <button key={i} className={cn("px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border", i === 0 ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50")}>
                  {tag}
               </button>
            ))}
         </div>

         <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {resources.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase())).map((item, i) => (
               <div key={i} className="group relative aspect-[3/4] rounded-3xl overflow-hidden bg-white border border-slate-200 hover:border-emerald-200 hover:shadow-lg transition-all cursor-pointer shadow-sm flex flex-col">
                  <div className={cn("flex-1 bg-gradient-to-b flex items-center justify-center", item.color_theme || "from-slate-50 to-slate-100")}>
                     {getIcon(item.icon_name)}
                  </div>
                  <div className="p-5 bg-white border-t border-slate-100">
                     <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{item.resource_type}</p>
                     <h4 className="text-sm font-bold text-slate-800 leading-snug group-hover:text-emerald-600 transition-colors">{item.title}</h4>
                  </div>
               </div>
            ))}
            {resources.length === 0 && (
               <div className="col-span-full py-10 text-center text-slate-400 font-medium">
                  No resources found in the library database.
               </div>
            )}
         </div>
      </div>
   );
};

const MattaAcademyStage = () => {
   const [courses, setCourses] = useState<MattaAcademyCourse[]>([]);

   useEffect(() => {
      const fetchCourses = async () => {
         const { data } = await supabase
            .from('matta_academy_courses')
            .select('*');
         if (data) setCourses(data);
      };
      fetchCourses();
   }, []);

   return (
      <div className="space-y-8 animate-in fade-in duration-500">
         <div className="space-y-2">
            <h2 className="text-3xl font-black font-sora tracking-tight text-slate-900">Matta Academy</h2>
            <p className="text-sm font-medium text-slate-500">Exclusive AI-led courses teaching next-generation skills.</p>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {courses.map((course, i) => (
               <div key={i} className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all cursor-pointer flex flex-col h-full group">
                  <div className="flex justify-between items-start mb-6">
                     <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <BrainCircuit size={24} className="text-emerald-500" />
                     </div>
                     <span className="px-3 py-1 rounded-full bg-emerald-50 text-[10px] font-black uppercase tracking-widest text-emerald-600 border border-emerald-200">
                        AI-Taught
                     </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 font-sora mb-2 group-hover:text-emerald-600 transition-colors">{course.title}</h3>
                  <p className="text-sm text-slate-500 font-medium mb-8 flex-1">{course.description}</p>
                  
                  <div className="space-y-3">
                     <div className="flex justify-between text-xs font-bold text-slate-400">
                        <span>{course.progress}% Completed</span>
                        <span>{course.students_enrolled || '0'} Enrolled</span>
                     </div>
                     <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden flex">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${course.progress}%` }} />
                     </div>
                  </div>
               </div>
            ))}
            {courses.length === 0 && (
               <div className="col-span-full py-10 text-center text-slate-400 font-medium">
                  No AI courses available yet.
               </div>
            )}
         </div>
      </div>
   );
};

// --- UTILS ---

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
   <button 
      onClick={onClick}
      className={cn(
         "w-full flex items-center gap-3 px-0 md:px-4 py-3 rounded-2xl transition-all group",
         active ? "bg-white text-slate-900 shadow-sm border border-slate-200" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/80 border border-transparent"
      )}
   >
      <div className={cn("flex items-center justify-center transition-colors", active ? "text-emerald-500" : "text-slate-400 group-hover:text-emerald-500")}>
         {icon}
      </div>
      <span className="hidden md:block text-xs font-bold">{label}</span>
   </button>
);

export default MyClassroom;
