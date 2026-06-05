import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Calendar as CalendarIcon, Clock, Plus, X, BookOpen, AlertTriangle, Video, MapPin } from 'lucide-react';
import { cn } from '../utils/utils';

// Hardcoded Master Grid based on typical Kenyan CBC day
const TIME_SLOTS = [
  { id: 'p1', start: '07:30', end: '08:10', type: 'CLASS' },
  { id: 'p2', start: '08:10', end: '08:50', type: 'CLASS' },
  { id: 'p3', start: '08:50', end: '09:30', type: 'CLASS' },
  { id: 'p4', start: '09:30', end: '10:10', type: 'CLASS' },
  { id: 'break1', start: '10:10', end: '10:30', type: 'BREAK', label: 'Short Break' },
  { id: 'p5', start: '10:30', end: '11:10', type: 'CLASS' },
  { id: 'p6', start: '11:10', end: '11:50', type: 'CLASS' },
  { id: 'p7', start: '11:50', end: '12:30', type: 'CLASS' },
  { id: 'p8', start: '12:30', end: '13:10', type: 'CLASS' },
  { id: 'lunch', start: '13:10', end: '14:00', type: 'BREAK', label: 'Lunch Break' },
  { id: 'p9', start: '14:00', end: '14:40', type: 'CLASS' },
  { id: 'p10', start: '14:40', end: '15:20', type: 'CLASS' },
  { id: 'p11', start: '15:20', end: '16:00', type: 'CLASS' },
  { id: 'games', start: '16:00', end: '16:40', type: 'CO_CURRICULAR', label: 'Games / Clubs' },
];

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const Timetable: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [entries, setEntries] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{day: string, start: string, end: string} | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
     subject_id: '',
     stream_id: '',
     room: '',
     type: 'PHYSICAL' // 'PHYSICAL' or 'LIVE'
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.school_id) return;
      try {
        const [strRes, subRes] = await Promise.all([
          api.getStreams(user.school_id),
          api.getSubjects(user.school_id)
        ]);
        setStreams(strRes || []);
        setSubjects(subRes || []);

        const { data } = await supabase
          .from('physical_timetable_entries')
          .select('*, stream:streams(name, class:classes(name)), subject:subjects(name)')
          .eq('school_id', user.school_id)
          .eq('teacher_id', user.id);
          
        if (data) setEntries(data);
      } catch (err) {
        console.error("Error fetching timetable:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.school_id, user?.id]);

  const handleSlotClick = (day: string, slot: any) => {
     if (slot.type === 'BREAK') return;
     setSelectedSlot({ day, start: slot.start, end: slot.end });
     
     // Check if there's already an entry to edit
     const existing = entries.find(e => e.day_of_week === day && e.start_time === slot.start);
     if (existing) {
        setFormData({
           subject_id: existing.subject_id || '',
           stream_id: existing.stream_id || '',
           room: existing.room || '',
           type: existing.note === 'LIVE' ? 'LIVE' : 'PHYSICAL'
        });
     } else {
        setFormData({ subject_id: '', stream_id: '', room: '', type: 'PHYSICAL' });
     }
     setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!selectedSlot || !user?.school_id) return;

     const existing = entries.find(e => e.day_of_week === selectedSlot.day && e.start_time === selectedSlot.start);
     
     const payload = {
        school_id: user.school_id,
        teacher_id: user.id,
        day_of_week: selectedSlot.day,
        start_time: selectedSlot.start,
        end_time: selectedSlot.end,
        subject_id: formData.subject_id || null,
        stream_id: formData.stream_id || null,
        room: formData.room || null,
        note: formData.type === 'LIVE' ? 'LIVE' : null
     };

     try {
        if (existing) {
           await supabase.from('physical_timetable_entries').update(payload).eq('id', existing.id);
        } else {
           await supabase.from('physical_timetable_entries').insert(payload);
        }
        
        // Refresh entries
        const { data } = await supabase
          .from('physical_timetable_entries')
          .select('*, stream:streams(name, class:classes(name)), subject:subjects(name)')
          .eq('school_id', user.school_id)
          .eq('teacher_id', user.id);
        if (data) setEntries(data);
        
        setIsModalOpen(false);
     } catch (err) {
        console.error("Failed to save slot:", err);
     }
  };

  const handleDelete = async () => {
     if (!selectedSlot || !user?.school_id) return;
     const existing = entries.find(e => e.day_of_week === selectedSlot.day && e.start_time === selectedSlot.start);
     if (!existing) return;

     await supabase.from('physical_timetable_entries').delete().eq('id', existing.id);
     setEntries(prev => prev.filter(e => e.id !== existing.id));
     setIsModalOpen(false);
  };

  if (loading) return <div className="p-8 font-bold text-zinc-900 animate-pulse">Loading Timetable Grid...</div>;

  return (
    <div className="max-w-[1800px] mx-auto p-4 lg:p-6 font-sans h-[calc(100vh-64px)] flex flex-col bg-slate-50">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 font-sora">Master Timetable</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage your physical and live classes across the week.</p>
        </div>
      </div>

      {/* Grid Canvas */}
      <div className="flex-1 overflow-auto bg-white rounded-3xl border border-slate-200 shadow-sm relative no-scrollbar">
         <table className="w-full min-w-[1200px] border-collapse relative">
            <thead className="sticky top-0 z-20 bg-slate-900 text-white shadow-md">
               <tr>
                  <th className="w-24 p-4 text-center text-xs font-black uppercase tracking-widest border-r border-slate-700/50">Time</th>
                  {DAYS.map(day => (
                     <th key={day} className="p-4 text-center text-sm font-black uppercase tracking-widest border-r border-slate-700/50 last:border-0 w-1/6">
                        {day}
                     </th>
                  ))}
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {TIME_SLOTS.map(slot => (
                  <tr key={slot.id} className="group">
                     {/* Time Axis */}
                     <td className="sticky left-0 z-10 bg-slate-50 p-3 text-center border-r border-slate-200 group-hover:bg-slate-100 transition-colors">
                        <div className="flex flex-col items-center justify-center">
                           <span className="text-sm font-black text-slate-900">{slot.start}</span>
                           <span className="text-[10px] font-bold text-slate-400 mt-0.5">{slot.end}</span>
                        </div>
                     </td>

                     {/* Break Rows */}
                     {slot.type === 'BREAK' ? (
                        <td colSpan={DAYS.length} className="bg-amber-50/50 p-4 border-b border-amber-100 text-center">
                           <span className="text-xs font-black uppercase tracking-widest text-amber-600/50 flex items-center justify-center gap-2">
                              <BookOpen size={14} /> {slot.label}
                           </span>
                        </td>
                     ) : (
                        /* Class Cells */
                        DAYS.map(day => {
                           const entry = entries.find(e => e.day_of_week === day && e.start_time === slot.start);
                           const isCoCurricular = slot.type === 'CO_CURRICULAR';

                           return (
                              <td 
                                 key={`${day}-${slot.start}`} 
                                 onClick={() => handleSlotClick(day, slot)}
                                 className={cn(
                                    "p-2 border-r border-slate-100 last:border-0 relative h-24 align-top cursor-pointer transition-all",
                                    isCoCurricular ? "bg-emerald-50/30" : "hover:bg-slate-50"
                                 )}
                              >
                                 {isCoCurricular && !entry && (
                                    <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                                       <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{slot.label}</span>
                                    </div>
                                 )}

                                 {entry ? (
                                    <div className={cn(
                                       "h-full p-3 rounded-2xl border shadow-sm flex flex-col justify-between group/card transition-all hover:scale-[1.02]",
                                       entry.note === 'LIVE' 
                                          ? "bg-slate-900 border-slate-800 text-white" 
                                          : "bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md"
                                    )}>
                                       <div className="flex justify-between items-start">
                                          <div className="line-clamp-2">
                                             <span className={cn("text-xs font-black leading-tight", entry.note === 'LIVE' ? "text-white" : "text-slate-900")}>
                                                {entry.subject?.name || 'Unknown Subject'}
                                             </span>
                                          </div>
                                          {entry.note === 'LIVE' && <Video size={14} className="text-rose-500 shrink-0 ml-2 animate-pulse" />}
                                       </div>
                                       
                                       <div className="mt-2 space-y-1">
                                          <div className="flex items-center gap-1">
                                             <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-widest", entry.note === 'LIVE' ? "bg-slate-800 text-slate-300" : "bg-slate-100 text-slate-600")}>
                                                {entry.stream?.class?.name} {entry.stream?.name}
                                             </span>
                                          </div>
                                          {entry.room && (
                                             <div className={cn("flex items-center gap-1 text-[9px] font-bold", entry.note === 'LIVE' ? "text-slate-400" : "text-slate-400")}>
                                                <MapPin size={10} /> {entry.room}
                                             </div>
                                          )}
                                       </div>
                                    </div>
                                 ) : (
                                    <div className="h-full w-full rounded-2xl border-2 border-dashed border-transparent hover:border-emerald-200 flex items-center justify-center opacity-0 hover:opacity-100 transition-all bg-emerald-50/50">
                                       <Plus size={20} className="text-emerald-500" />
                                    </div>
                                 )}
                              </td>
                           )
                        })
                     )}
                  </tr>
               ))}
            </tbody>
         </table>
      </div>

      {/* Slot Editor Modal */}
      {isModalOpen && selectedSlot && (
         <div className="fixed inset-0 z-[100] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
               <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div>
                     <h2 className="text-xl font-black text-slate-900 font-sora">Assign Class</h2>
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
                        {selectedSlot.day} • {selectedSlot.start} - {selectedSlot.end}
                     </p>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
                     <X size={20} />
                  </button>
               </div>
               
               <form onSubmit={handleSave} className="p-6 space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                     <div onClick={() => setFormData(p => ({ ...p, type: 'PHYSICAL' }))} className={cn("p-4 rounded-2xl border-2 cursor-pointer transition-all", formData.type === 'PHYSICAL' ? "border-emerald-500 bg-emerald-50" : "border-slate-100 hover:border-slate-200")}>
                        <BookOpen size={24} className={cn("mb-2", formData.type === 'PHYSICAL' ? "text-emerald-600" : "text-slate-400")} />
                        <h4 className={cn("text-sm font-black", formData.type === 'PHYSICAL' ? "text-emerald-900" : "text-slate-900")}>Physical</h4>
                        <p className="text-[10px] font-medium text-slate-500 mt-1">In-person class</p>
                     </div>
                     <div onClick={() => setFormData(p => ({ ...p, type: 'LIVE' }))} className={cn("p-4 rounded-2xl border-2 cursor-pointer transition-all", formData.type === 'LIVE' ? "border-rose-500 bg-rose-50" : "border-slate-100 hover:border-slate-200")}>
                        <Video size={24} className={cn("mb-2", formData.type === 'LIVE' ? "text-rose-600" : "text-slate-400")} />
                        <h4 className={cn("text-sm font-black", formData.type === 'LIVE' ? "text-rose-900" : "text-slate-900")}>Live Stream</h4>
                        <p className="text-[10px] font-medium text-slate-500 mt-1">Virtual Jitsi session</p>
                     </div>
                  </div>

                  <div>
                     <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Subject</label>
                     <select 
                        required
                        value={formData.subject_id} 
                        onChange={e => setFormData(p => ({ ...p, subject_id: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                     >
                        <option value="">Select Subject...</option>
                        {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                     </select>
                  </div>

                  <div>
                     <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Class / Stream</label>
                     <select 
                        required
                        value={formData.stream_id} 
                        onChange={e => setFormData(p => ({ ...p, stream_id: e.target.value }))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
                     >
                        <option value="">Select Stream...</option>
                        {streams.map(s => <option key={s.id} value={s.id}>{s.class?.name} {s.name}</option>)}
                     </select>
                  </div>

                  <div>
                     <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Room / Link Info (Optional)</label>
                     <input 
                        type="text" 
                        value={formData.room} 
                        onChange={e => setFormData(p => ({ ...p, room: e.target.value }))}
                        placeholder={formData.type === 'LIVE' ? "Meeting link auto-generates" : "e.g. Block A, Room 4"}
                        disabled={formData.type === 'LIVE'}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                     />
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                     <button type="button" onClick={handleDelete} className="px-6 py-3 bg-white border border-rose-200 text-rose-600 font-black rounded-xl hover:bg-rose-50 transition-colors text-sm">
                        Clear
                     </button>
                     <button type="submit" className="flex-1 py-3 bg-slate-900 text-white font-black rounded-xl hover:bg-emerald-600 transition-colors text-sm shadow-md">
                        Save Assignment
                     </button>
                  </div>
               </form>
            </div>
         </div>
      )}
    </div>
  );
};

export default Timetable;
