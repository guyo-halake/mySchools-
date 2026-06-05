import React, { useEffect, useMemo, useState } from 'react';
import { 
   FileText, Calendar, Download, Filter, Search, MessageSquare, AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { generateResultPDF } from '../utils/pdf';
import { useApp } from '../context/AppContext';
import { cn } from '../utils/utils';

const BAND_4_LABELS: Record<string, string> = {
  'EE': 'Exceeding Expectation',
  'ME': 'Meeting Expectation',
  'AE': 'Approaching Expectation',
  'BE': 'Below Expectation'
};

const BAND_8_LABELS: Record<string, string> = {
  'EE1': 'Exceptional', 'EE2': 'Excellent',
  'ME1': 'Good', 'ME2': 'Satisfactory',
  'AE1': 'Fair', 'AE2': 'Developing',
  'BE1': 'Needs Help', 'BE2': 'Beginner'
};

export const ParentStudentResults: React.FC = () => {
   const { user } = useAuth();
   const { schoolInfo } = useApp();
   const [loading, setLoading] = useState(true);
   const [students, setStudents] = useState<any[]>([]);
   const [selectedStudentId, setSelectedStudentId] = useState('');
   const [resultRows, setResultRows] = useState<any[]>([]);
   const [terms, setTerms] = useState<any[]>([]);
   const [studentDetails, setStudentDetails] = useState<any>(null);

   const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
   const [selectedTermId, setSelectedTermId] = useState<string>('ALL');

   const years = useMemo(() => {
      const ySet = new Set<string>();
      terms.forEach(t => t.year && ySet.add(t.year.toString()));
      return Array.from(ySet).sort((a,b) => b.localeCompare(a));
   }, [terms]);

   const termsForYear = useMemo(() => {
      const filtered = terms.filter(t => t.year?.toString() === selectedYear);
      return filtered.sort((a,b) => new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime());
   }, [terms, selectedYear]);

   const selectedStudent = useMemo(() => students.find(s => s.id === selectedStudentId) || null, [students, selectedStudentId]);

   const studentGradeLevel = useMemo(() => {
      if (!selectedStudent || !selectedStudent.stream?.class?.level) return 0;
      return parseInt(selectedStudent.stream.class.level.toString());
   }, [selectedStudent]);

   const isJuniorSecondary = studentGradeLevel >= 7 && studentGradeLevel <= 9;

   const loadData = async () => {
      if (!user?.school_id) return;
      setLoading(true);
      try {
         const allTerms = await api.getTerms(user.school_id);
         setTerms(allTerms || []);

         const today = new Date();
         const current = allTerms.find(t => t.start_date && t.end_date && new Date(t.start_date) <= today && new Date(t.end_date) >= today);
         
         if (current) {
            setSelectedYear(current.year?.toString() || new Date().getFullYear().toString());
            setSelectedTermId(current.id);
         } else if (allTerms.length > 0) {
            const latest = allTerms.sort((a,b) => new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime())[0];
            setSelectedYear(latest.year?.toString() || new Date().getFullYear().toString());
            setSelectedTermId(latest.id);
         }

         const allStudents = await api.getStudents(user.school_id);
         const scopedStudents = user.role === 'PARENT' ? allStudents.filter((row: any) => row.parent_id === user.id) : allStudents.filter((row: any) => row.id === user.id);
         setStudents(scopedStudents);
         
         const activeId = selectedStudentId && scopedStudents.some(s => s.id === selectedStudentId) ? selectedStudentId : (scopedStudents[0]?.id || '');
         if (activeId !== selectedStudentId) setSelectedStudentId(activeId);

         if (activeId) {
            const rows = await api.getCBCStudentAssessments(activeId, user.school_id);
            setResultRows(rows || []);
            setStudentDetails({ results: rows });
         }
      } catch (err: any) { console.error(err); }
      finally { setLoading(false); }
   };

   useEffect(() => { loadData(); }, [user?.id, selectedStudentId]);

   // Group CBC Data
   const cbcData = useMemo(() => {
      if (!resultRows.length) return {};
      
      const filtered = resultRows.filter(r => {
         const rYear = r.created_at ? new Date(r.created_at).getFullYear() : null;
         return (!selectedYear || rYear?.toString() === selectedYear);
      });

      // Group by Learning Area -> Strand
      const grouped: Record<string, Record<string, any[]>> = {};
      
      filtered.forEach(r => {
         const learningArea = r.learning_area?.name || r.learning_area_id || 'Unknown Area';
         const strand = r.cbc_strands?.name || r.strand || 'General';
         
         if (!grouped[learningArea]) grouped[learningArea] = {};
         if (!grouped[learningArea][strand]) grouped[learningArea][strand] = [];
         
         grouped[learningArea][strand].push({
            id: r.id,
            sub_strand: r.cbc_sub_strands?.name || r.sub_strand || 'Overall',
            rating: r.rating || 'N/A',
            remarks: r.teacher_comment || ''
         });
      });

      return grouped;
   }, [resultRows, selectedYear]);

   const getRatingBadge = (rating: string) => {
      const r = rating.toUpperCase();
      if (r.includes('EE') || ['A', 'A-'].includes(r)) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      if (r.includes('ME') || ['B+', 'B', 'B-', 'C+'].includes(r)) return 'bg-blue-100 text-blue-800 border-blue-200';
      if (r.includes('AE') || ['C', 'C-', 'D+'].includes(r)) return 'bg-amber-100 text-amber-800 border-amber-200';
      if (r.includes('BE') || ['D', 'D-', 'E'].includes(r)) return 'bg-rose-100 text-rose-800 border-rose-200';
      return 'bg-zinc-100 text-zinc-800 border-zinc-200';
   };

   const getRatingLabel = (rating: string) => {
      const r = rating.toUpperCase();
      return BAND_8_LABELS[r] || BAND_4_LABELS[r] || 'Assessed';
   };

   if (loading) return <div className="p-8 text-center animate-pulse text-zinc-400">Loading assessments...</div>;

   return (
      <div className="max-w-[1200px] mx-auto p-4 sm:p-6 space-y-8 animate-in fade-in duration-500 pb-20">
         
         <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-zinc-100 dark:border-zinc-800 pb-6">
            <div className="space-y-2">
               <h1 className="text-3xl font-black text-zinc-900 dark:text-white font-sora tracking-tight">Competency Report</h1>
               <p className="text-sm font-bold text-emerald-600 font-inter">{selectedStudent?.profile?.full_name}</p>
               <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mt-2">
                  {isJuniorSecondary ? 'Junior Secondary Pathway' : 'Primary Education Pathway'}
               </p>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
               <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs font-bold outline-none shadow-sm">
                  {students.map(s => <option key={s.id} value={s.id}>{s.profile?.full_name}</option>)}
               </select>
               <select value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs font-bold outline-none shadow-sm">
                  <option value="ALL">All Terms</option>
                  {terms.map(t => <option key={t.id} value={t.id}>{t.name} {t.year}</option>)}
               </select>
               <button className="px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-xs hover:opacity-90 flex items-center gap-2">
                  <Download size={14} /> <span className="hidden sm:inline">Save PDF</span>
               </button>
            </div>
         </div>

         {Object.keys(cbcData).length === 0 ? (
            <div className="py-20 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
               <AlertCircle size={32} className="mx-auto mb-4 text-zinc-300" />
               <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">No Competency Data Found</p>
            </div>
         ) : (
            <div className="space-y-12">
               {Object.entries(cbcData).map(([subject, strands]) => (
                  <div key={subject} className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm">
                     <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                        <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight">{subject}</h2>
                     </div>
                     
                     <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {Object.entries(strands).map(([strand, assessments]) => (
                           <div key={strand} className="p-6">
                              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest mb-4">Strand: {strand}</h3>
                              
                              <div className="space-y-4">
                                 {assessments.map((a: any, idx) => (
                                    <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-900/50 p-4 rounded-2xl border border-zinc-50 dark:border-zinc-800">
                                       <div className="flex-1">
                                          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{a.sub_strand}</p>
                                          {a.remarks && (
                                             <p className="text-xs text-zinc-500 mt-1 italic">"{a.remarks}"</p>
                                          )}
                                       </div>
                                       <div className="flex items-center gap-3">
                                          {isJuniorSecondary && (
                                             <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Score Level:</span>
                                          )}
                                          <span className={cn("px-3 py-1.5 rounded-lg border text-xs font-black uppercase tracking-widest", getRatingBadge(a.rating))}>
                                             {a.rating} — {getRatingLabel(a.rating)}
                                          </span>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               ))}
            </div>
         )}
      </div>
   );
};

export default ParentStudentResults;
