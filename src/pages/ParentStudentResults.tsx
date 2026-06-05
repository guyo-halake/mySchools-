import React, { useEffect, useMemo, useState } from 'react';
import { 
   FileText, Calendar, Download, Filter, Search, MessageSquare, AlertCircle, UserCircle2, ChevronDown, X
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
   const [activeTab, setActiveTab] = useState<'SUMMATIVE' | 'FORMATIVE'>('FORMATIVE');
   const [students, setStudents] = useState<any[]>([]);
   const [selectedStudentId, setSelectedStudentId] = useState('');
   const [resultRows, setResultRows] = useState<any[]>([]);
   const [summativeRows, setSummativeRows] = useState<any[]>([]);
   const [terms, setTerms] = useState<any[]>([]);

   const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
   const [selectedTermId, setSelectedTermId] = useState<string>('ALL');
   const [showChildModal, setShowChildModal] = useState(false);
   const [selectedLearningArea, setSelectedLearningArea] = useState<string>('ALL');

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
            const [cbc, summative] = await Promise.all([
               api.getCBCStudentAssessments(activeId, user.school_id),
               api.getStudentResultsAll(activeId)
            ]);
            setResultRows(cbc || []);
            setSummativeRows(summative || []);
         }
      } catch (err: any) { console.error(err); }
      finally { setLoading(false); }
   };

   useEffect(() => { loadData(); }, [user?.id, selectedStudentId]);

   // Group Formative CBC Data
   const cbcData = useMemo(() => {
      if (!resultRows.length) return {};
      const filtered = resultRows.filter(r => {
         const rYear = r.created_at ? new Date(r.created_at).getFullYear() : null;
         return (!selectedYear || selectedYear === 'ALL' || rYear?.toString() === selectedYear);
      });
      const grouped: Record<string, Record<string, any[]>> = {};
      filtered.forEach(r => {
         const learningArea = r.learning_area?.name || r.learning_area_id || 'General Assessment';
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

   const availableYears = useMemo(() => {
      const years = new Set<string>();
      terms.forEach(t => { if (t.year) years.add(t.year.toString()); });
      return Array.from(years).sort().reverse();
   }, [terms]);

   // Group Summative Data
   const getCbcProficiency = (marks: number) => {
     if (marks >= 80) return { label: 'EE', grade: 'EE', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', full: 'Exceeding Expectations' };
     if (marks >= 65) return { label: 'ME', grade: 'ME', color: 'bg-blue-100 text-blue-800 border-blue-200', full: 'Meeting Expectations' };
     if (marks >= 50) return { label: 'AE', grade: 'AE', color: 'bg-amber-100 text-amber-800 border-amber-200', full: 'Approaching Expectations' };
     return { label: 'BE', grade: 'BE', color: 'bg-rose-100 text-rose-800 border-rose-200', full: 'Below Expectations' };
   };

   const summativeData = useMemo(() => {
      if (!summativeRows.length) return [];
      const currentTermExams = summativeRows.filter(r => r.exam?.term_id === selectedTermId || selectedTermId === 'ALL');
      const grouped = currentTermExams.reduce((acc: any, r) => {
         const examName = r.exam?.name || 'Unknown Exam';
         if (!acc[examName]) acc[examName] = [];
         acc[examName].push(r);
         return acc;
      }, {});
      return Object.entries(grouped).map(([examName, results]: [string, any]) => {
         const processed = results.map((r: any) => {
            const marks = Number(r.marks || 0);
            return {
               subject: r.subject?.name || 'Unknown',
               marks,
               ...getCbcProficiency(marks)
            };
         });
         return { examName, results: processed };
      });
   }, [summativeRows, selectedTermId]);

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
            <div className="flex items-center gap-4">
               <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  {selectedStudent?.profile?.avatar_url ? (
                     <img src={selectedStudent.profile.avatar_url} className="w-full h-full object-cover" />
                  ) : (
                     <UserCircle2 size={32} className="text-zinc-300" />
                  )}
               </div>
               <div>
                  <h1 className="text-2xl font-black text-zinc-900 dark:text-white font-sora tracking-tight leading-none mb-1">
                     {selectedStudent?.profile?.full_name || 'Loading...'}
                  </h1>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">
                     {selectedStudent?.stream?.name || 'Assigned Class'} • {isJuniorSecondary ? 'JSS' : 'Primary'}
                  </p>
                  {students.length > 1 && (
                     <button onClick={() => setShowChildModal(true)} className="text-[10px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-white flex items-center gap-1 transition-colors">
                        Switch Child <ChevronDown size={12} />
                     </button>
                  )}
               </div>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto mt-4 md:mt-0">
               <select value={selectedYear} onChange={e => setSelectedYear(e.target.value)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold outline-none shadow-sm cursor-pointer">
                  <option value="ALL">All Years</option>
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
               </select>
               <select value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold outline-none shadow-sm cursor-pointer">
                  <option value="ALL">All Terms</option>
                  {termsForYear.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
               </select>
               <button 
                  onClick={() => generateResultPDF(selectedStudent, { results: resultRows, fees: [] }, schoolInfo, 'ALL', summativeRows, selectedTermId)}
                  className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-black uppercase text-[10px] tracking-widest hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 shadow-sm whitespace-nowrap"
               >
                  <Download size={14} /> <span className="hidden sm:inline">Save PDF</span>
               </button>
            </div>
         </div>

         {/* Switch Child Modal */}
         {showChildModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in">
               <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowChildModal(false)} />
               <div className="relative bg-white dark:bg-zinc-950 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-zinc-100 dark:border-zinc-800 animate-in zoom-in-95">
                  <div className="flex justify-between items-center mb-6">
                     <h3 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-white">Switch Child</h3>
                     <button onClick={() => setShowChildModal(false)} className="text-zinc-400 hover:text-zinc-900"><X size={16} /></button>
                  </div>
                  <div className="space-y-3">
                     {students.map(s => (
                        <button 
                           key={s.id}
                           onClick={() => { setSelectedStudentId(s.id); setShowChildModal(false); }}
                           className={cn("w-full flex items-center gap-4 p-3 rounded-2xl border transition-all text-left", selectedStudentId === s.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" : "border-zinc-100 dark:border-zinc-800 hover:border-zinc-300")}
                        >
                           <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
                              {s.profile?.avatar_url ? <img src={s.profile.avatar_url} className="w-full h-full object-cover" /> : <UserCircle2 size={20} className="text-zinc-400" />}
                           </div>
                           <div>
                              <p className="text-xs font-black text-zinc-900 dark:text-white">{s.profile?.full_name}</p>
                              <p className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{s.stream?.name}</p>
                           </div>
                        </button>
                     ))}
                  </div>
               </div>
            </div>
         )}

         <div className="flex items-center gap-2 bg-zinc-200/50 dark:bg-zinc-800/50 p-1.5 rounded-[1.25rem] w-full sm:w-fit">
            <button onClick={() => setActiveTab('FORMATIVE')} className={cn("px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all", activeTab === 'FORMATIVE' ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700")}>
               Class Projects
            </button>
            <button onClick={() => setActiveTab('SUMMATIVE')} className={cn("px-6 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all", activeTab === 'SUMMATIVE' ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" : "text-zinc-500 hover:text-zinc-700")}>
               Exam Grades
            </button>
         </div>

         {activeTab === 'FORMATIVE' ? (
            <div className="space-y-6">
               {Object.keys(cbcData).length > 0 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                     <button 
                        onClick={() => setSelectedLearningArea('ALL')}
                        className={cn("px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border", 
                           selectedLearningArea === 'ALL' ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white shadow-md" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-700"
                        )}
                     >
                        All Areas
                     </button>
                     {Object.keys(cbcData).map(area => (
                        <button 
                           key={area}
                           onClick={() => setSelectedLearningArea(area)}
                           className={cn("px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border", 
                              selectedLearningArea === area ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white shadow-md" : "bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:border-zinc-700"
                           )}
                        >
                           {area}
                        </button>
                     ))}
                  </div>
               )}

               {Object.keys(cbcData).length === 0 || (selectedLearningArea !== 'ALL' && !cbcData[selectedLearningArea]) ? (
                  <div className="py-20 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
                     <AlertCircle size={32} className="mx-auto mb-4 text-zinc-300" />
                     <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">
                        {selectedLearningArea === 'ALL' ? 'No Projects Found' : `No Projects Found for ${selectedLearningArea}`}
                     </p>
                  </div>
               ) : (
                  <div className="space-y-12">
                     {Object.entries(cbcData).filter(([subject]) => selectedLearningArea === 'ALL' || subject === selectedLearningArea).map(([subject, strands]) => (
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
         ) : (
            summativeData.length === 0 ? (
               <div className="py-20 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl">
                  <AlertCircle size={32} className="mx-auto mb-4 text-zinc-300" />
                  <p className="text-sm font-bold text-zinc-500 uppercase tracking-widest">No Exams Found</p>
               </div>
            ) : (
               <div className="space-y-8">
                  {summativeData.map((examGroup: any) => (
                     <div key={examGroup.examName} className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 overflow-hidden shadow-sm">
                        <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                           <h2 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-tight">{examGroup.examName}</h2>
                        </div>
                        <div className="p-6">
                           <table className="w-full text-left border-collapse">
                              <thead>
                                 <tr className="border-b border-zinc-100 dark:border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                    <th className="pb-4">Learning Area</th>
                                    <th className="pb-4 text-center">Score (%)</th>
                                    <th className="pb-4 text-right">Proficiency</th>
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                                 {examGroup.results.map((r: any, idx: number) => (
                                    <tr key={idx} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors">
                                       <td className="py-4 text-xs font-bold text-zinc-900 dark:text-white">{r.subject}</td>
                                       <td className="py-4 text-xs font-bold text-zinc-600 text-center">{r.marks}</td>
                                       <td className="py-4 text-right">
                                          <span className={cn("px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2", r.color)}>
                                             {r.grade} <span className="hidden sm:inline opacity-70">({r.full})</span>
                                          </span>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  ))}
               </div>
            )
         )}
      </div>
   );
};

export default ParentStudentResults;
