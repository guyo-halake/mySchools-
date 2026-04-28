import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, Users, Search, GraduationCap } from 'lucide-react';

export const MyStudents = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStream, setSelectedStream] = useState<any>(null);

  useEffect(() => {
    const streamId = localStorage.getItem('selectedStreamId');
    if (!streamId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [studentRows, streamData] = await Promise.all([
          api.getStudentsByStream(streamId),
          api.getStreamById(streamId)
        ]);
        setStudents(studentRows || []);
        setSelectedStream(streamData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredStudents = students.filter(s => 
    s.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.admission_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto py-10 px-6 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <button 
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-colors"
          >
            <ChevronLeft size={14} />
            Back to Dashboard
          </button>
          <div className="space-y-1">
             <div className="flex items-center gap-2 mb-1">
                <GraduationCap size={16} className="text-zinc-400" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Class Registry</p>
             </div>
             <h1 className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight leading-none">
               My <span className="text-zinc-400">Students</span>
             </h1>
             {selectedStream && (
                <p className="text-sm font-medium text-zinc-500 mt-2 italic">
                  Currently viewing roster for {selectedStream.class?.name} {selectedStream.name}
                </p>
             )}
          </div>
        </div>

        <div className="relative group w-full md:w-80">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 transition-colors" />
          <input 
            type="text" 
            placeholder="SEARCH BY NAME OR ADM..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-12 pl-12 pr-6 bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all"
          />
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
           <div className="w-8 h-8 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin" />
           <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Synchronizing Roster...</p>
        </div>
      ) : filteredStudents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student) => (
            <div 
              key={student.id}
              className="p-6 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-3xl hover:shadow-xl hover:translate-y-[-4px] transition-all group"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center border border-zinc-100 dark:border-zinc-800 overflow-hidden group-hover:bg-zinc-900 transition-all">
                   {student.profile?.avatar_url ? (
                     <img src={student.profile.avatar_url} alt="" className="w-full h-full object-cover" />
                   ) : (
                     <Users size={24} className="text-zinc-300 group-hover:text-white transition-colors" />
                   )}
                </div>
                <div className="space-y-1">
                   <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight leading-tight">
                     {student.profile?.full_name}
                   </h3>
                   <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                     ADM: {student.admission_number || 'PENDING'}
                   </p>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-zinc-50 dark:border-zinc-900 flex justify-between items-center text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">
                 <span>Status: Active</span>
                 <button className="text-zinc-900 dark:text-white opacity-0 group-hover:opacity-100 transition-opacity">View Profile</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-32 flex flex-col items-center justify-center text-zinc-200 gap-6 border-2 border-dashed border-zinc-50 dark:border-zinc-900 rounded-[3rem]">
           <Users size={64} strokeWidth={1} />
           <div className="text-center">
             <p className="text-sm font-black uppercase tracking-[0.3em]">No Students Found</p>
             <p className="text-[10px] mt-2 font-medium">Try refining your search or contact the registrar.</p>
           </div>
        </div>
      )}
    </div>
  );
};
