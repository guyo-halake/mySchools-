import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/utils';
import { 
   BookOpen, Video, BrainCircuit, GraduationCap, Search, Send, 
   Library, PlayCircle, Clock, CheckCircle2, Mic, FileText, MonitorPlay, Sparkles, Plus, Calendar as CalendarIcon, VideoIcon
} from 'lucide-react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { ClassroomSession, ELibraryResource, MattaAcademyCourse } from '../types';

type NavMode = 'E_LEARNING' | 'E_LIBRARY' | 'MATTA_ACADEMY' | 'LIVE_STUDIO' | 'SCHEDULE_CLASS';

export const MyClassroom: React.FC = () => {
   const { user } = useAuth();
   const isTeacher = ['TEACHER', 'PRINCIPAL', 'ADMIN'].includes(user?.role || '');
   const [mode, setMode] = useState<NavMode>(isTeacher ? 'LIVE_STUDIO' : 'E_LEARNING');
   
   const [chatInput, setChatInput] = useState('');
   const [chatHistory, setChatHistory] = useState<{sender: 'user' | 'matta', text: string, isLoading?: boolean}[]>([
      { sender: 'matta', text: `Greetings, ${user?.full_name?.split(' ')[0] || 'there'}. I am Matta, your CBC Intelligence Co-Pilot. ${isTeacher ? 'I am here to assist you during your live sessions.' : 'How can I assist you in your learning today?'}` }
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
         const res = await api.post('/matta/chat', { 
            message: userQ,
            student_id: user?.id,
            role: user?.role,
            context: { mode, app_section: 'MyClassroom' }
         });
         
         if (res.data && res.data.reply) {
            setChatHistory(prev => [
               ...prev.filter(m => !m.isLoading), 
               { sender: 'matta', text: res.data.reply }
            ]);
            return;
         }
      } catch (err) {
         console.warn("API unavailable, fallback");
      }

      setTimeout(() => {
         let reply = "I'm analyzing that request across our CBC curriculum database.";
         setChatHistory(prev => [...prev.filter(m => !m.isLoading), { sender: 'matta', text: reply }]);
      }, 1000);
   };

   useEffect(() => {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
   }, [chatHistory]);

   return (
      <div className="flex h-[calc(100vh-64px)] w-full bg-slate-50 text-slate-900 overflow-hidden font-inter">
         
         {/* LEFT SIDEBAR - NAV */}
         <div className="w-20 md:w-64 border-r border-slate-200 bg-white/80 backdrop-blur-xl flex flex-col items-center md:items-start py-6 z-20 flex-shrink-0">
            <div className="mb-10 px-0 md:px-6 flex items-center justify-center md:justify-start gap-3 w-full">
               <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                  <MonitorPlay size={20} className="text-white" />
               </div>
               <div className="hidden md:block">
                  <h1 className="text-lg font-black font-sora tracking-tight leading-none text-slate-900">{isTeacher ? 'Teaching Hub' : 'Workspace'}</h1>
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Matta OS</p>
               </div>
            </div>

            <nav className="flex-1 w-full px-3 md:px-4 space-y-2">
               {isTeacher ? (
                  <>
                     <NavButton active={mode === 'LIVE_STUDIO'} onClick={() => setMode('LIVE_STUDIO')} icon={<Video size={18} />} label="Live Studio" />
                     <NavButton active={mode === 'SCHEDULE_CLASS'} onClick={() => setMode('SCHEDULE_CLASS')} icon={<CalendarIcon size={18} />} label="Schedule Class" />
                  </>
               ) : (
                  <>
                     <NavButton active={mode === 'E_LEARNING'} onClick={() => setMode('E_LEARNING')} icon={<Video size={18} />} label="Live Classes" />
                     <NavButton active={mode === 'E_LIBRARY'} onClick={() => setMode('E_LIBRARY')} icon={<Library size={18} />} label="E-Library" />
                     <NavButton active={mode === 'MATTA_ACADEMY'} onClick={() => setMode('MATTA_ACADEMY')} icon={<BrainCircuit size={18} />} label="Matta Academy" />
                  </>
               )}
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
               {mode === 'E_LEARNING' && !isTeacher && <ELearningStage user={user} />}
               {mode === 'E_LIBRARY' && !isTeacher && <ELibraryStage />}
               {mode === 'MATTA_ACADEMY' && !isTeacher && <MattaAcademyStage />}
               
               {mode === 'LIVE_STUDIO' && isTeacher && <TeacherLiveStudio user={user} />}
               {mode === 'SCHEDULE_CLASS' && isTeacher && <TeacherScheduleClass user={user} setMode={setMode} />}
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
                     placeholder={isTeacher ? "Ask Matta during class..." : "Ask Matta to explain a concept..."}
                     className="w-full bg-white border border-slate-300 rounded-2xl py-3.5 pl-4 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all shadow-sm"
                  />
                  <button type="submit" className="absolute right-2 w-10 h-10 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl transition-colors flex items-center justify-center shadow-sm">
                     <Send size={16} className="ml-1" />
                  </button>
               </form>
            </div>
         </div>
      </div>
   );
};

const NavButton = ({ active, onClick, icon, label }: any) => (
   <button
      onClick={onClick}
      className={cn(
         "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group",
         active 
            ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" 
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      )}
   >
      <div className={cn("transition-transform duration-300", active ? "scale-110" : "group-hover:scale-110")}>
         {icon}
      </div>
      <span className="text-xs font-bold tracking-wide hidden md:block">{label}</span>
   </button>
);

// --- TEACHER STAGES ---

const TeacherLiveStudio = ({ user }: { user: any }) => {
   const [inMeeting, setInMeeting] = useState(false);
   const [roomName, setRoomName] = useState('');
   const [sessions, setSessions] = useState<ClassroomSession[]>([]);

   useEffect(() => {
      const fetchSessions = async () => {
         const { data } = await supabase
            .from('classroom_sessions')
            .select('*, profiles:teacher_id(full_name), subjects:subject_id(name)')
            .eq('teacher_id', user.id)
            .order('start_time', { ascending: true })
            .limit(10);
         if (data) setSessions(data);
      };
      fetchSessions();
   }, [user.id]);

   const startInstantClass = async () => {
      const newRoom = `MattaCBC_${user.school_id}_${Date.now()}`;
      setRoomName(newRoom);
      
      // Save to database
      await supabase.from('classroom_sessions').insert({
         school_id: user.school_id,
         teacher_id: user.id,
         title: 'Instant Live Class',
         room_url: newRoom,
         status: 'Live',
         start_time: new Date().toISOString()
      });

      setInMeeting(true);
   };

   const startScheduledClass = async (session: ClassroomSession) => {
      setRoomName(session.room_url || `MattaCBC_${session.id}`);
      await supabase.from('classroom_sessions').update({ status: 'Live' }).eq('id', session.id);
      setInMeeting(true);
   };

   if (inMeeting) {
      return (
         <div className="w-full h-full flex flex-col gap-4 animate-in fade-in">
            <div className="flex items-center justify-between">
               <div>
                  <h2 className="text-xl font-black text-slate-900">Live Session in Progress</h2>
                  <p className="text-sm text-emerald-600 font-bold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Recording active</p>
               </div>
               <button onClick={() => setInMeeting(false)} className="px-4 py-2 bg-rose-500 text-white font-bold rounded-xl text-xs hover:bg-rose-600 transition-colors">
                  End Session
               </button>
            </div>
            <div className="flex-1 rounded-3xl bg-slate-900 border border-slate-200 overflow-hidden shadow-2xl relative">
               <JitsiMeeting
                  domain="meet.jit.si"
                  roomName={roomName}
                  configOverwrite={{ startWithAudioMuted: false, startWithVideoMuted: false }}
                  interfaceConfigOverwrite={{ DISABLE_JOIN_LEAVE_NOTIFICATIONS: true, SHOW_PROMOTIONAL_CLOSE_PAGE: false }}
                  userInfo={{ displayName: user?.full_name || 'Teacher' }}
                  getIFrameRef={(iframeRef) => { iframeRef.style.height = '100%'; iframeRef.style.width = '100%'; }}
               />
            </div>
         </div>
      );
   }

   return (
      <div className="space-y-8 animate-in fade-in duration-500">
         <div className="space-y-2">
            <h2 className="text-3xl font-black font-sora tracking-tight text-slate-900">Live Studio</h2>
            <p className="text-sm font-medium text-slate-500">Manage and broadcast your live CBC classes to students.</p>
         </div>

         <div className="p-8 bg-zinc-950 rounded-3xl flex flex-col items-center justify-center text-center relative overflow-hidden border border-zinc-800 shadow-2xl">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
            <div className="relative z-10 space-y-6">
               <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
                  <VideoIcon size={32} className="text-emerald-400" />
               </div>
               <div>
                  <h3 className="text-2xl font-black text-white mb-2">Start an Instant Class</h3>
                  <p className="text-zinc-400 text-sm max-w-md mx-auto">Create a secure Jitsi meeting immediately. Students can join via their E-Learning portal.</p>
               </div>
               <button onClick={startInstantClass} className="px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 mx-auto">
                  <MonitorPlay size={20} /> GO LIVE NOW
               </button>
            </div>
         </div>

         <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Your Scheduled Sessions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {sessions.map((slot) => (
                  <div key={slot.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between hover:border-emerald-200 hover:shadow-md transition-all">
                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                           <Clock size={20} className="text-slate-400" />
                        </div>
                        <div>
                           <h4 className="text-sm font-black text-slate-800">{slot.title}</h4>
                           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                              {slot.start_time ? new Date(slot.start_time).toLocaleString() : 'Upcoming'}
                           </p>
                        </div>
                     </div>
                     <button onClick={() => startScheduledClass(slot)} className="px-4 py-2 bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest rounded-xl hover:bg-emerald-600 transition-colors">
                        Start
                     </button>
                  </div>
               ))}
               {sessions.length === 0 && (
                  <div className="col-span-full p-8 text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl">
                     <p className="text-slate-400 font-bold text-sm">No scheduled sessions found.</p>
                  </div>
               )}
            </div>
         </div>
      </div>
   );
};

const TeacherScheduleClass = ({ user, setMode }: { user: any, setMode: any }) => {
   const [title, setTitle] = useState('');
   const [startTime, setStartTime] = useState('');
   const [loading, setLoading] = useState(false);

   const handleSchedule = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title || !startTime) return;
      setLoading(true);
      await supabase.from('classroom_sessions').insert({
         school_id: user.school_id,
         teacher_id: user.id,
         title,
         status: 'Scheduled',
         start_time: new Date(startTime).toISOString(),
         room_url: `MattaCBC_${user.school_id}_${Date.now()}`
      });
      setLoading(false);
      setMode('LIVE_STUDIO');
   };

   return (
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
         <div className="space-y-2">
            <h2 className="text-3xl font-black font-sora tracking-tight text-slate-900">Schedule Class</h2>
            <p className="text-sm font-medium text-slate-500">Plan ahead and notify students of upcoming sessions.</p>
         </div>

         <form onSubmit={handleSchedule} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <div>
               <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Session Title</label>
               <input 
                  type="text" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  required
                  placeholder="e.g. Grade 4 Math Revision"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-slate-400"
               />
            </div>
            <div>
               <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Start Time</label>
               <input 
                  type="datetime-local" 
                  value={startTime} 
                  onChange={e => setStartTime(e.target.value)} 
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-slate-400"
               />
            </div>
            <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50">
               {loading ? 'SCHEDULING...' : 'SCHEDULE SESSION'}
            </button>
         </form>
      </div>
   );
};

// --- STUDENT STAGES (PRESERVED) ---

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
                           <div onClick={() => joinSession(sessions[0])} className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-emerald-500/40">
                              <PlayCircle size={40} className="text-white ml-1" />
                           </div>
                           <h3 className="text-2xl font-black text-white font-sora mb-2 drop-shadow-md">{sessions[0].title}</h3>
                           <p className="text-emerald-400 font-bold text-sm drop-shadow-md">Live now</p>
                        </>
                     ) : (
                        <>
                           <div onClick={() => joinSession({ id: 'demo', title: 'Demo Classroom', status: 'Live', school_id: '', archived: false, created_at: '', updated_at: '' } as any)} className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-emerald-500/40">
                              <PlayCircle size={40} className="text-white ml-1" />
                           </div>
                           <h3 className="text-2xl font-black text-white font-sora mb-2 drop-shadow-md">No active sessions</h3>
                           <p className="text-emerald-400 font-bold text-sm drop-shadow-md">Click to start Demo Classroom</p>
                        </>
                     )}
                  </div>
               </div>
               <div className="absolute inset-0 opacity-60 bg-[url('/ai_teacher_human.png')] bg-cover bg-center mix-blend-overlay" />
            </div>
         ) : (
            <div className="relative w-full aspect-video rounded-3xl bg-slate-100 border border-slate-200 overflow-hidden shadow-xl">
               <JitsiMeeting
                  domain="meet.jit.si"
                  roomName={activeSession?.room_url || "MattaCBCClassGrade7"}
                  configOverwrite={{ startWithAudioMuted: true }}
                  userInfo={{ displayName: user?.full_name || 'Student' }}
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
                           <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{slot.start_time ? new Date(slot.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Upcoming'}</p>
                           {(slot as any).profiles?.full_name && <p className="text-[10px] text-slate-600 font-medium">Teacher: <span className="font-bold">{(slot as any).profiles.full_name}</span></p>}
                        </div>
                     </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-200">{slot.status}</span>
               </div>
            ))}
         </div>
      </div>
   );
};

const ELibraryStage = () => {
   const [resources, setResources] = useState<ELibraryResource[]>([]);
   const [searchQuery, setSearchQuery] = useState('');

   useEffect(() => {
      const fetchResources = async () => {
         const { data } = await supabase.from('e_library_resources').select('*');
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
               <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search the universal library..." className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-11 pr-4 text-sm text-slate-900 focus:outline-none focus:border-emerald-500" />
            </div>
         </div>
         <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {resources.filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase())).map((item, i) => (
               <div key={i} className="group relative aspect-[3/4] rounded-3xl overflow-hidden bg-white border border-slate-200 hover:border-emerald-200 hover:shadow-lg transition-all cursor-pointer shadow-sm flex flex-col">
                  <div className={cn("flex-1 bg-gradient-to-b flex items-center justify-center", item.color_theme || "from-slate-50 to-slate-100")}>{getIcon(item.icon_name)}</div>
                  <div className="p-5 bg-white border-t border-slate-100">
                     <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">{item.resource_type}</p>
                     <h4 className="text-sm font-bold text-slate-800 leading-snug group-hover:text-emerald-600 transition-colors">{item.title}</h4>
                  </div>
               </div>
            ))}
         </div>
      </div>
   );
};

const MattaAcademyStage = () => {
   const [courses, setCourses] = useState<MattaAcademyCourse[]>([]);
   useEffect(() => {
      const fetchCourses = async () => {
         const { data } = await supabase.from('matta_academy_courses').select('*');
         if (data) setCourses(data);
      };
      fetchCourses();
   }, []);
   return (
      <div className="space-y-8 animate-in fade-in duration-500">
         <div className="space-y-2">
            <h2 className="text-3xl font-black font-sora tracking-tight text-slate-900">Matta Academy</h2>
            <p className="text-sm font-medium text-slate-500">Learn to code, build AI, and design the future with Matta.</p>
         </div>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course, i) => (
               <div key={i} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center mb-6 group-hover:bg-emerald-500 transition-colors">
                     <BrainCircuit size={24} className="text-white" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 mb-2">{course.title}</h3>
                  <p className="text-sm text-slate-500 mb-6 line-clamp-2">{course.description}</p>
                  <div className="flex items-center justify-between">
                     <span className="px-3 py-1 rounded-full bg-slate-100 text-[10px] font-black text-slate-600">{course.level}</span>
                     <span className="text-emerald-600 text-sm font-bold flex items-center gap-1 group-hover:gap-2 transition-all">Start <span className="text-lg leading-none">→</span></span>
                  </div>
               </div>
            ))}
         </div>
      </div>
   );
};

export default MyClassroom;
