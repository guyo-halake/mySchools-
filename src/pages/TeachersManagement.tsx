import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Search, UserPlus, ArrowRight, BookOpen, User, Mail, GraduationCap } from 'lucide-react';
import { cn } from '../utils/utils';

export const TeachersManagement: React.FC = () => {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.school_id) return;
      setLoading(true);
      try {
        const [tchData, strData] = await Promise.all([
          api.getTeachers(user.school_id),
          api.getStreams(user.school_id) // We need streams to know who is a homeroom teacher
        ]);
        setTeachers(tchData || []);
        setStreams(strData || []);
      } catch (err) {
        console.error('Failed to fetch teachers:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.school_id]);

  const processedTeachers = useMemo(() => {
    return teachers.map(t => {
      // Find if they are a class teacher for any stream
      const homeroomStream = streams.find(s => s.class_teacher_id === t.id);
      
      return {
        ...t,
        fullName: t.full_name || 'Unknown',
        photo: t.avatar_url || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + t.id,
        homeroom: homeroomStream ? `${homeroomStream.class?.name || ''} ${homeroomStream.name}` : null,
        phone: t.phone || 'N/A'
      };
    });
  }, [teachers, streams]);

  const filteredTeachers = useMemo(() => {
    if (!searchTerm) return processedTeachers;
    const query = searchTerm.toLowerCase();
    return processedTeachers.filter(t => 
      t.fullName.toLowerCase().includes(query) || 
      (t.email || '').toLowerCase().includes(query)
    );
  }, [processedTeachers, searchTerm]);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-in fade-in duration-300 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white border-b border-zinc-200 pb-5 pt-2 sticky top-0 z-20">
         <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-zinc-950 uppercase">Faculty Directory</h1>
            <p className="text-sm font-medium text-zinc-500">Manage teaching staff, homeroom assignments, and faculty profiles.</p>
         </div>
         <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-zinc-950 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm">
               <UserPlus size={16} /> Add Faculty
            </button>
         </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm flex flex-col h-[calc(100vh-220px)]">
         {/* Toolbar */}
         <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full sm:w-96">
               <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
               <input
                 type="text"
                 placeholder="Search by name or email..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:border-zinc-400 transition-colors"
               />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-200/50 px-3 py-1.5 rounded-md">
               Total Faculty: {processedTeachers.length}
            </span>
         </div>

         {/* Roster Grid */}
         {loading ? (
            <div className="flex-1 flex items-center justify-center text-xs font-bold text-zinc-400 animate-pulse uppercase tracking-widest">
               Loading Faculty...
            </div>
         ) : (
            <div className="flex-1 overflow-y-auto">
               <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead className="sticky top-0 bg-white/90 backdrop-blur z-10 shadow-sm">
                     <tr className="border-b border-zinc-200">
                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Faculty Profile</th>
                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Role & Assignments</th>
                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Contact Details</th>
                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                     {filteredTeachers.length === 0 ? (
                        <tr><td colSpan={4} className="p-12 text-center text-xs font-bold text-zinc-400 uppercase tracking-widest">No faculty found.</td></tr>
                     ) : filteredTeachers.map((t) => (
                        <tr key={t.id} className="hover:bg-zinc-50 transition-colors group">
                           <td className="px-5 py-4">
                              <div className="flex items-center gap-4">
                                 <img src={t.photo} alt={t.fullName} className="w-10 h-10 rounded-xl border border-zinc-200 object-cover bg-zinc-100" />
                                 <div>
                                    <p className="text-sm font-black text-zinc-900 group-hover:text-blue-600 transition-colors">{t.fullName}</p>
                                    <span className={cn(
                                       "mt-1 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border",
                                       t.role === 'ADMIN' || t.role === 'PRINCIPAL' 
                                          ? "bg-amber-50 text-amber-600 border-amber-200"
                                          : "bg-blue-50 text-blue-600 border-blue-200"
                                    )}>
                                       {t.role}
                                    </span>
                                 </div>
                              </div>
                           </td>
                           <td className="px-5 py-4 space-y-1.5">
                              {t.homeroom ? (
                                 <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 w-fit px-2.5 py-1 rounded-md border border-emerald-100">
                                    <User size={12} /> Homeroom: {t.homeroom}
                                 </div>
                              ) : (
                                 <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 bg-zinc-100 w-fit px-2.5 py-1 rounded-md">
                                    <User size={12} /> No Homeroom
                                 </div>
                              )}
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                 <BookOpen size={10} /> TSC / Staff ID: {t.staff_id || 'N/A'}
                              </div>
                           </td>
                           <td className="px-5 py-4 space-y-1">
                              <div className="flex items-center gap-2">
                                 <Mail size={12} className="text-zinc-400" />
                                 <span className="text-xs font-bold text-zinc-700">{t.email || 'N/A'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                 <Phone size={12} className="text-zinc-400" />
                                 <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t.phone}</span>
                              </div>
                           </td>
                           <td className="px-5 py-4 text-right">
                              <button className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-end gap-1 ml-auto">
                                 Manage <ArrowRight size={12} />
                              </button>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}
      </div>
    </div>
  );
};

export default TeachersManagement;
