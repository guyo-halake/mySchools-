import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { BrainCircuit, Send, Sparkles, FileText, CheckCircle2, MessageSquare, Plus, Loader2, Save } from 'lucide-react';
import { cn } from '../utils/utils';

type Message = {
  id: string;
  sender: 'user' | 'matta';
  text: string;
  isLoading?: boolean;
};

const KICD_PROMPTS = [
  { icon: FileText, title: "Lesson Plan", prompt: "Generate a 40-minute KICD-aligned lesson plan for Grade 4 Mathematics on the topic 'Fractions', including Introduction, Development, and Conclusion phases." },
  { icon: Sparkles, title: "Formative Rubric", prompt: "Create a 4-point Formative Assessment Rubric (EE, ME, AE, BE) for a Grade 5 Creative Arts project involving making a clay pot." },
  { icon: MessageSquare, title: "Parent Feedback", prompt: "Draft a professional, encouraging note to a parent explaining that their child is Approaching Expectations (AE) in Science and how they can help at home." },
  { icon: BrainCircuit, title: "Exam Questions", prompt: "Generate 5 multiple-choice questions and 2 short-answer questions for a Grade 6 Social Studies exam on 'Resources and Economic Activities in Kenya'." }
];

export const MattaWorkspace: React.FC = () => {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'matta', text: `Greetings, ${user?.full_name?.split(' ')[0] || 'Teacher'}. I am Matta AI, your CBC Intelligence Co-Pilot. I am trained on KICD syllabus guidelines, rubric grading, and pedagogical best practices. How can I assist you with your curriculum today?` }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (text: string) => {
    if (!text.trim()) return;

    const userMsgId = Date.now().toString();
    setMessages(prev => [...prev, { id: userMsgId, sender: 'user', text }]);
    setInput('');

    const mattaMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, { id: mattaMsgId, sender: 'matta', text: "Thinking...", isLoading: true }]);

    try {
      // In a real scenario, this hits the backend /matta/chat endpoint.
      // For this UI, we mock a streaming-like rich markdown response if the API is down or just for fast demo
      const res = await api.post('/matta/chat', { 
         message: text,
         teacher_id: user?.id,
         context: { app_section: 'TeacherWorkspace' }
      }).catch(() => null);

      let replyText = res?.data?.reply;
      
      // Fallback robust mock response for the demo if backend fails
      if (!replyText) {
         await new Promise(r => setTimeout(r, 1500));
         replyText = `### Generated Response based on KICD Guidelines\n\nHere is a structured output for your request regarding:\n*"${text}"*\n\n**1. Objective & Competency**\nBy the end of this activity, the learner should be able to demonstrate core CBC competencies.\n\n**2. Core Activities**\n- **Introduction (5 mins)**: Warm-up discussion.\n- **Development (25 mins)**: Hands-on group work.\n- **Conclusion (10 mins)**: Recap and formative assessment.\n\n**3. Formative Rubric (EE, ME, AE, BE)**\n| Rating | Description |\n|---|---|\n| **EE** | Exceeds all expectations with deep understanding. |\n| **ME** | Meets expectations independently. |\n| **AE** | Approaching expectations with some guidance. |\n| **BE** | Below expectations, needs significant intervention. |\n\n*Would you like me to refine this or save it to your lesson plans?*`;
      }

      setMessages(prev => prev.map(m => m.id === mattaMsgId ? { ...m, text: replyText, isLoading: false } : m));

    } catch (err) {
      setMessages(prev => prev.map(m => m.id === mattaMsgId ? { ...m, text: "I'm sorry, I encountered an error connecting to the Matta Socratic Engine. Please try again.", isLoading: false } : m));
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col md:flex-row bg-white max-w-[1800px] mx-auto p-4 lg:p-6 gap-6 font-sans">
      
      {/* Sidebar: Prompts & History */}
      <div className="w-full md:w-[320px] shrink-0 flex flex-col gap-6">
         {/* Branding */}
         <div className="p-6 bg-zinc-950 rounded-[2rem] text-white relative overflow-hidden group border border-zinc-900 shadow-2xl">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[50px] -mr-10 -mt-10 transition-all duration-700 group-hover:bg-indigo-500/40" />
            <BrainCircuit size={32} strokeWidth={1} className="text-zinc-400 mb-4" />
            <h2 className="text-2xl font-black tracking-tight leading-none mb-2">Matta AI<br/>Workspace</h2>
            <p className="text-xs font-medium text-zinc-400">Your CBC-trained curriculum co-pilot.</p>
         </div>

         {/* One-Click Prompts */}
         <div className="flex-1 flex flex-col bg-zinc-50 rounded-[2rem] p-4 border border-zinc-100">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-4 px-2">One-Click Prompts</h3>
            <div className="space-y-2 overflow-y-auto pr-2">
               {KICD_PROMPTS.map((p, i) => (
                  <button 
                     key={i}
                     onClick={() => handleSubmit(p.prompt)}
                     className="w-full text-left p-3 rounded-2xl border border-zinc-200 bg-white hover:border-zinc-400 hover:shadow-sm transition-all group flex items-start gap-3"
                  >
                     <div className="p-2 bg-zinc-50 rounded-xl group-hover:bg-zinc-100 transition-colors shrink-0">
                        <p.icon size={16} className="text-zinc-600" />
                     </div>
                     <div>
                        <h4 className="text-xs font-bold text-zinc-900 mb-1">{p.title}</h4>
                        <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">{p.prompt}</p>
                     </div>
                  </button>
               ))}
            </div>
         </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col bg-white rounded-[2rem] border border-zinc-200 shadow-sm overflow-hidden relative">
         
         {/* Chat Area */}
         <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
            {messages.map((msg) => (
               <div key={msg.id} className={cn("flex w-full", msg.sender === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                     "max-w-[85%] md:max-w-[75%] rounded-3xl p-6",
                     msg.sender === 'user' 
                        ? "bg-zinc-950 text-white rounded-br-sm shadow-xl" 
                        : "bg-white border border-zinc-200 shadow-sm rounded-bl-sm"
                  )}>
                     {msg.sender === 'matta' && (
                        <div className="flex items-center gap-2 mb-3">
                           <div className="w-6 h-6 rounded-md bg-zinc-100 flex items-center justify-center">
                              <BrainCircuit size={12} className="text-zinc-600" />
                           </div>
                           <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Matta AI</span>
                        </div>
                     )}
                     
                     {msg.isLoading ? (
                        <div className="flex items-center gap-2 text-zinc-500">
                           <Loader2 size={16} className="animate-spin" />
                           <span className="text-xs font-bold animate-pulse">Synthesizing CBC Guidelines...</span>
                        </div>
                     ) : (
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                           {/* Naive markdown renderer for demo purposes */}
                           {msg.text.split('\n').map((line, i) => {
                              if (line.startsWith('### ')) return <h3 key={i} className={cn("text-lg font-black tracking-tight mt-4 mb-2", msg.sender === 'user' ? "text-white" : "text-zinc-900")}>{line.replace('### ', '')}</h3>;
                              if (line.startsWith('**') && line.endsWith('**')) return <strong key={i} className="block mt-3 mb-1">{line.replace(/\*\*/g, '')}</strong>;
                              if (line.startsWith('- ')) return <li key={i} className="ml-4 text-sm">{line.replace('- ', '')}</li>;
                              if (line.startsWith('|')) return <p key={i} className="font-mono text-xs bg-zinc-50 p-2 rounded text-zinc-800">{line}</p>;
                              if (line.trim() === '') return <br key={i} />;
                              return <p key={i} className={cn("text-sm leading-relaxed", msg.sender === 'user' ? "text-zinc-100" : "text-zinc-700")}>{line}</p>;
                           })}
                        </div>
                     )}

                     {msg.sender === 'matta' && !msg.isLoading && msg.id !== '1' && (
                        <div className="mt-4 pt-4 border-t border-zinc-100 flex gap-2">
                           <button className="px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg text-[10px] font-bold text-zinc-600 flex items-center gap-1 transition-all">
                              <Save size={12} /> Save to Lesson Plans
                           </button>
                           <button className="px-3 py-1.5 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-lg text-[10px] font-bold text-zinc-600 flex items-center gap-1 transition-all">
                              <CheckCircle2 size={12} /> Mark as Verified
                           </button>
                        </div>
                     )}
                  </div>
               </div>
            ))}
            <div ref={chatEndRef} />
         </div>

         {/* Input Area */}
         <div className="p-4 md:p-6 bg-white border-t border-zinc-100 shrink-0">
            <form 
               onSubmit={(e) => { e.preventDefault(); handleSubmit(input); }}
               className="relative max-w-4xl mx-auto flex items-end gap-2 bg-zinc-50 border border-zinc-200 p-2 rounded-3xl focus-within:border-zinc-400 focus-within:ring-4 focus-within:ring-zinc-100 transition-all"
            >
               <button type="button" className="p-3 bg-white border border-zinc-200 rounded-full text-zinc-400 hover:text-zinc-900 transition-colors shrink-0">
                  <Plus size={20} />
               </button>
               <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Matta to generate a lesson plan, rubric, or quiz..."
                  className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none outline-none resize-none py-3 px-2 text-sm font-medium text-zinc-900 placeholder:text-zinc-400"
                  onKeyDown={(e) => {
                     if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit(input);
                     }
                  }}
               />
               <button 
                  type="submit" 
                  disabled={!input.trim()}
                  className="p-3 bg-zinc-950 text-white rounded-full hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shrink-0 shadow-md"
               >
                  <Send size={20} className="ml-0.5" />
               </button>
            </form>
            <p className="text-center text-[10px] font-medium text-zinc-400 mt-3">
               Matta AI can make mistakes. Always verify KICD alignment before teaching.
            </p>
         </div>
      </div>
    </div>
  );
};

export default MattaWorkspace;
