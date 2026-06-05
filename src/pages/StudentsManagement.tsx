import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Search, UserPlus, FileText, ArrowRight, Wallet, CheckCircle, AlertCircle, Phone, Mail } from 'lucide-react';
import { cn } from '../utils/utils';
import { StudentFullDetailsView } from '../components/StudentFullDetailsView';

export const StudentsManagement: React.FC = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fullViewStudent, setFullViewStudent] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.school_id) return;
      setLoading(true);
      try {
        const [stData, feesData] = await Promise.all([
          api.getStudents(user.school_id),
          api.getFeesFull(user.school_id)
        ]);
        setStudents(stData || []);
        setFees(feesData || []);
      } catch (err) {
        console.error('Failed to fetch students:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user?.school_id]);

  const processedStudents = useMemo(() => {
    return students.map(s => {
      // Calculate financial status
      const studentFees = fees.filter(f => f.student_id === s.id);
      let totalDue = 0;
      let totalPaid = 0;
      studentFees.forEach(f => {
        totalDue += f.amount_due || 0;
        totalPaid += f.amount_paid || 0;
      });
      const balance = totalDue - totalPaid;
      
      let className = s.stream?.class?.name || '';
      className = className.replace(/Form/gi, 'Grade');
      
      return {
        ...s,
        fullName: s.profile?.full_name || s.name || 'Unknown',
        photo: s.profile?.avatar_url || s.photo || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + s.id,
        parentName: s.parent?.full_name || s.parentEmail || 'No Parent Linked',
        parentPhone: s.parent?.phone || 'N/A',
        streamName: s.stream ? `${className} ${s.stream.name}` : 'Unassigned',
        balance
      };
    });
  }, [students, fees]);

  const filteredStudents = useMemo(() => {
    if (!searchTerm) return processedStudents;
    const query = searchTerm.toLowerCase();
    return processedStudents.filter(s => 
      s.fullName.toLowerCase().includes(query) || 
      (s.adm_no || s.admissionNumber || '').toLowerCase().includes(query)
    );
  }, [processedStudents, searchTerm]);

  if (fullViewStudent) {
    return <StudentFullDetailsView student={fullViewStudent} onClose={() => setFullViewStudent(null)} />;
  }

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 animate-in fade-in duration-300 font-sans">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white border-b border-zinc-200 pb-5 pt-2 sticky top-0 z-20">
         <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-zinc-950 uppercase">Student Directory</h1>
            <p className="text-sm font-medium text-zinc-500">Manage enrollment, track live financial status, and parent details.</p>
         </div>
         <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm">
               <FileText size={16} /> Export CSV
            </button>
            <button className="flex items-center gap-2 bg-zinc-950 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm">
               <UserPlus size={16} /> Enroll Student
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
                 placeholder="Search by name or admission number..."
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
                 className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:border-zinc-400 transition-colors"
               />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 bg-zinc-200/50 px-3 py-1.5 rounded-md">
               Total Enrolled: {processedStudents.length}
            </span>
         </div>

         {/* Roster Grid */}
         {loading ? (
            <div className="flex-1 flex items-center justify-center text-xs font-bold text-zinc-400 animate-pulse uppercase tracking-widest">
               Loading Roster...
            </div>
         ) : (
            <div className="flex-1 overflow-y-auto">
               <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead className="sticky top-0 bg-white/90 backdrop-blur z-10 shadow-sm">
                     <tr className="border-b border-zinc-200">
                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Student Profile</th>
                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Class/Stream</th>
                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Guardian Contact</th>
                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Financial Status</th>
                        <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Actions</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                     {filteredStudents.length === 0 ? (
                        <tr><td colSpan={5} className="p-12 text-center text-xs font-bold text-zinc-400 uppercase tracking-widest">No students found.</td></tr>
                     ) : filteredStudents.map((s) => (
                        <tr key={s.id} className="hover:bg-zinc-50 transition-colors group">
                           <td className="px-5 py-4">
                              <div className="flex items-center gap-4">
                                 <img src={s.photo} alt={s.fullName} className="w-10 h-10 rounded-xl border border-zinc-200 object-cover bg-zinc-100" />
                                 <div>
                                    <p className="text-sm font-black text-zinc-900 group-hover:text-blue-600 transition-colors">{s.fullName}</p>
                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">ADM: {s.adm_no || s.admissionNumber || 'N/A'}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="px-5 py-4">
                              <span className="px-3 py-1 bg-zinc-100 text-zinc-700 rounded-md text-[10px] font-black uppercase tracking-widest">
                                 {s.streamName}
                              </span>
                           </td>
                           <td className="px-5 py-4">
                              <p className="text-xs font-bold text-zinc-700">{s.parentName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                 <Phone size={10} className="text-zinc-400" />
                                 <span className="text-[10px] font-bold text-zinc-500">{s.parentPhone}</span>
                              </div>
                           </td>
                           <td className="px-5 py-4">
                              {s.balance > 0 ? (
                                 <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 px-3 py-1 rounded-full w-fit border border-rose-100">
                                    <AlertCircle size={12} /> Arrears: Ksh {s.balance.toLocaleString()}
                                 </div>
                              ) : (
                                 <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full w-fit border border-emerald-100">
                                    <CheckCircle size={12} /> Cleared
                                 </div>
                              )}
                           </td>
                           <td className="px-5 py-4 text-right">
                              <button 
                                 onClick={() => setFullViewStudent(s)}
                                 className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center justify-end gap-1 ml-auto"
                              >
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

export default StudentsManagement;
