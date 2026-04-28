import React, { useEffect, useMemo, useState } from 'react';
import { 
   Radar, 
   RadarChart, 
   PolarGrid, 
   PolarAngleAxis, 
   ResponsiveContainer,
   PolarRadiusAxis 
} from 'recharts';
import { 
   FileText, 
   TrendingUp, 
   TrendingDown, 
   Calendar, 
   Download, 
   Filter, 
   ChevronRight, 
   Search, 
   MessageSquare,
   Mail,
   MessageCircle,
   X,
   Star,
   ArrowRight,
   Share2,
   AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { generateResultPDF } from '../utils/pdf';
import { markToGrade } from '../utils/grading';
import { useApp } from '../context/AppContext';
import { cn } from '../utils/utils';

export const ParentStudentResults: React.FC = () => {
   const { user } = useAuth();
   const { schoolInfo } = useApp();
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');
   const [students, setStudents] = useState<any[]>([]);
   const [selectedStudentId, setSelectedStudentId] = useState('');
   const [resultRows, setResultRows] = useState<any[]>([]);
   const [terms, setTerms] = useState<any[]>([]);
   const [studentDetails, setStudentDetails] = useState<any>(null);

   const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
   const [selectedTermId, setSelectedTermId] = useState<string>('ALL');
   const [selectedExamType, setSelectedExamType] = useState<string>('ALL');
   const [gradingSystem, setGradingSystem] = useState<any[]>([]);

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

   const getGradeColor = (grade: string) => {
      const g = (grade || '').toUpperCase();
      if (['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-'].includes(g)) return 'text-emerald-600 dark:text-emerald-400';
      if (['D+', 'D', 'D-'].includes(g)) return 'text-orange-500';
      if (['E', 'U'].includes(g)) return 'text-rose-500';
      return 'text-zinc-400';
   };

   const getGradeBadge = (grade: string) => {
      const g = (grade || '').toUpperCase();
      if (['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-'].includes(g)) return 'bg-emerald-500 text-white';
      if (['D+', 'D', 'D-'].includes(g)) return 'bg-orange-500 text-white';
      if (['E', 'U'].includes(g)) return 'bg-rose-500 text-white';
      return 'bg-zinc-500 text-white';
   };

   const loadData = async () => {
      if (!user?.school_id) return;
      setLoading(true);
      try {
         const [allTerms, scales] = await Promise.all([
            api.getTerms(user.school_id),
            api.getGradingSystem(user.school_id)
         ]);
         setTerms(allTerms || []);
         setGradingSystem(scales || []);

         const today = new Date();
         const current = allTerms.find(t => {
            if (!t.start_date || !t.end_date) return false;
            return new Date(t.start_date) <= today && new Date(t.end_date) >= today;
         });
         
         if (current) {
            setSelectedYear(current.year?.toString() || new Date().getFullYear().toString());
            // Only set default term if we haven't manually picked one yet
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
            const [rows, fees, subs] = await Promise.all([
               api.getStudentResultsAll(activeId),
               api.getFees(user.school_id).then(fs => fs.filter(f => f.student_id === activeId)),
               api.getStudentSubjects(activeId)
            ]);
            setResultRows(rows || []);
            setStudentDetails({ results: rows, fees: fees, subjects: subs });
         }
      } catch (err: any) { setError('Connection error'); }
      finally { setTimeout(() => setLoading(false), 300); }
   };

   useEffect(() => { loadData(); }, [user?.id, selectedStudentId]);

   const tableData = useMemo(() => {
      if (!resultRows.length) return [];
      const filtered = resultRows.filter(r => {
         const rTermId = r.term_id || r.exam?.term_id || r.exam?.term?.id || r.term?.id;
         const rYear = r.year || r.exam?.term?.year || r.term?.year || 
                       (r.created_at ? new Date(r.created_at).getFullYear() : null);
         
         const matchesYear = !selectedYear || rYear?.toString() === selectedYear;
         const matchesTerm = selectedTermId === 'ALL' || rTermId === selectedTermId;
         
         let matchesType = selectedExamType === 'ALL';
         if (!matchesType) {
            const eName = (r.exam?.name || r.exam_name || r.name || '').toUpperCase();
            const eType = (r.exam?.type || '').toUpperCase();
            if (selectedExamType === 'OPENER') matchesType = eName.includes('OPENER') || eName.includes('START');
            else if (selectedExamType === 'MID-TERM') matchesType = eName.includes('MID') || eType.includes('MID');
            else if (selectedExamType === 'END-TERM') matchesType = eName.includes('END') || eType.includes('END');
         }

         const isMatch = matchesYear && matchesTerm && matchesType;
         return isMatch;
      });
      console.log(`FILTERED RESULTS: ${filtered.length} out of ${resultRows.length}`);

      const subjectMap = new Map<string, any>();
      filtered.forEach(r => {
         const sName = r.subject?.name || 'Unknown';
         if (!subjectMap.has(sName)) {
            subjectMap.set(sName, { 
               subject: sName, 
               opener: '-', mid: '-', end: '-', 
               t1: [], t2: [], t3: [],
               remarksList: [] 
            });
         }
         const entry = subjectMap.get(sName);
         const eName = (r.exam?.name || r.exam_name || '').toUpperCase();
         const eType = (r.exam?.type || '').toUpperCase();
         const val = { marks: r.marks, grade: r.grade || markToGrade(r.marks, gradingSystem) };
         
         // Phase logic (for single term view)
         let typeLabel = '';
         if (eName.includes('OPENER') || eName.includes('START')) { entry.opener = val; typeLabel = 'Opener'; }
         else if (eName.includes('MID') || eType.includes('MID')) { entry.mid = val; typeLabel = 'Mid-Term'; }
         else if (eName.includes('END') || eType.includes('END')) { entry.end = val; typeLabel = 'End-Term'; }

         const tName = (r.exam?.term?.name || r.term?.name || '').toUpperCase();
         if (tName.includes('TERM 1')) entry.t1.push(Number(r.marks));
         else if (tName.includes('TERM 2')) entry.t2.push(Number(r.marks));
         else if (tName.includes('TERM 3')) entry.t3.push(Number(r.marks));

         if (r.remarks) {
            entry.remarksList.push({ 
               text: r.remarks, 
               teacher: r.teacher?.full_name || 'System Auto-graded',
               type: typeLabel || tName
            });
         }
      });

      return Array.from(subjectMap.values()).map(row => {
         const buildFinalRemarks = (list: any[]) => {
            if (!list.length) return null;
            return list;
         };

         if (selectedTermId === 'ALL') {
            const calcT = (arr: number[]) => {
               if (!arr.length) return '-';
               const m = arr.reduce((a, b) => a + b, 0) / arr.length;
               return { marks: m.toFixed(1), grade: markToGrade(m, gradingSystem) };
            };
            const t1Res = calcT(row.t1);
            const t2Res = calcT(row.t2);
            const t3Res = calcT(row.t3);
            const allM = [...row.t1, ...row.t2, ...row.t3];
            const avgM = allM.length ? allM.reduce((a, b) => a + b, 0) / allM.length : 0;
            return {
               ...row,
               col1: t1Res, col2: t2Res, col3: t3Res,
               avg: allM.length ? { marks: avgM.toFixed(1), grade: markToGrade(avgM, gradingSystem) } : '-',
               remarks: buildFinalRemarks(row.remarksList)
            };
         } else {
            const scores = [row.opener, row.mid, row.end].filter(s => s !== '-');
            const avgMarks = scores.length ? (scores.reduce((a, b) => a + Number(b.marks), 0) / scores.length) : 0;
            return {
               ...row,
               col1: row.opener, col2: row.mid, col3: row.end,
               avg: scores.length ? { marks: avgMarks.toFixed(1), grade: markToGrade(avgMarks, gradingSystem) } : '-',
               remarks: buildFinalRemarks(row.remarksList)
            };
         }
      });
   }, [resultRows, selectedYear, selectedTermId, selectedExamType, gradingSystem]);

   const tableTotals = useMemo(() => {
      if (!tableData.length) return null;
      const scores = tableData.filter(r => r.avg !== '-').map(r => Number(r.avg.marks));
      if (!scores.length) return null;
      const meanValue = scores.reduce((a, b) => a + b, 0) / scores.length;
      return {
         avg: {
            marks: meanValue.toFixed(1),
            grade: markToGrade(meanValue, gradingSystem)
         }
      };
   }, [tableData, gradingSystem]);

   const summary = useMemo(() => {
      if (!tableData.length || !resultRows.length) return { meanGrade: '-', meanMarks: 0, trend: null };
      
      const averages = tableData.filter(r => r.avg !== '-').map(r => Number(r.avg.marks));
      const meanMarksValue = averages.length ? (averages.reduce((a, b) => a + b, 0) / averages.length) : 0;
      const meanMarks = meanMarksValue.toFixed(1);

      let trend = null;
      if (terms.length > 1) {
         const sortedTerms = terms.sort((a,b) => new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime());
         
         if (selectedTermId !== 'ALL') {
            const currIdx = sortedTerms.findIndex(t => t.id === selectedTermId);
            const prevTerm = currIdx > 0 ? sortedTerms[currIdx - 1] : null;

            if (prevTerm) {
               const prevResults = resultRows.filter(r => r.exam?.term_id === prevTerm.id);
               if (prevResults.length) {
                  const subjectAverages: any[] = [];
                  const prevMap = new Map();
                  prevResults.forEach(r => {
                     const sId = r.subject_id;
                     if (!prevMap.has(sId)) prevMap.set(sId, []);
                     prevMap.get(sId).push(Number(r.marks || 0));
                  });
                  prevMap.forEach(marks => {
                     subjectAverages.push(marks.reduce((a:any,b:any)=>a+b,0) / marks.length);
                  });
                  const prevMean = subjectAverages.length ? (subjectAverages.reduce((a, b) => a + b, 0) / subjectAverages.length) : 0;
                  
                  if (prevMean > 0) {
                     const diff = Number(meanMarks) - prevMean;
                     trend = {
                        value: diff.toFixed(1),
                        isPositive: diff >= 0,
                        label: 'vs last term'
                     };
                  }
               }
            }
         } else {
            const currentYear = new Date().getFullYear().toString();
            const prevYear = (Number(currentYear) - 1).toString();
            
            const currentYearResults = resultRows.filter(r => r.exam?.term?.year?.toString() === currentYear);
            const prevYearResults = resultRows.filter(r => r.exam?.term?.year?.toString() === prevYear);

            if (currentYearResults.length && prevYearResults.length) {
               const calcYearMean = (rows: any[]) => {
                  const subMap = new Map();
                  rows.forEach(r => {
                     if (!subMap.has(r.subject_id)) subMap.set(r.subject_id, []);
                     subMap.get(r.subject_id).push(Number(r.marks || 0));
                  });
                  const averages:any[] = [];
                  subMap.forEach(ms => averages.push(ms.reduce((a:any,b:any)=>a+b,0) / ms.length));
                  return averages.length ? (averages.reduce((a,b)=>a+b,0) / averages.length) : 0;
               };

               const currYMean = calcYearMean(currentYearResults);
               const prevYMean = calcYearMean(prevYearResults);

               if (prevYMean > 0) {
                  const diff = currYMean - prevYMean;
                  trend = {
                     value: diff.toFixed(1),
                     isPositive: diff >= 0,
                     label: 'year progress'
                  };
               }
            }
         }
      }

      return { 
         meanGrade: markToGrade(Number(meanMarks), gradingSystem), 
         meanMarks, 
         trend,
         prevMean: terms.length > 1 && trend ? (Number(meanMarks) - Number(trend.value)).toFixed(1) : null
      };
   }, [tableData, resultRows, terms, selectedTermId]);

   const radarData = useMemo(() => {
      if (!tableData.length) return [];
      
      const categories: any = {
         'Languages': ['ENGLISH', 'SWAHILI', 'FRENCH', 'GERMAN', 'ARABIC'],
         'Sciences': ['MATHEMATICS', 'PHYSICS', 'CHEMISTRY', 'BIOLOGY', 'SCIENCE'],
         'Humanities': ['GEOGRAPHY', 'HISTORY', 'CRE', 'IRE', 'SOCIAL STUDIES'],
         'Applieds': ['BUSINESS', 'AGRICULTURE', 'COMPUTER', 'HOME SCIENCE', 'MUSIC', 'ART']
      };

      return Object.entries(categories).map(([name, subs]) => {
         const relevant = tableData.filter((r: any) => 
            (subs as string[]).includes(r.subject.toUpperCase()) && r.avg !== '-'
         );
         const score = relevant.length 
            ? (relevant.reduce((a, b) => a + Number(b.avg.marks), 0) / relevant.length)
            : 0;
         return { subject: name, A: score, fullMark: 100 };
      }).filter(d => d.A > 0);
   }, [tableData]);

   const activeTermObject = useMemo(() => {
      const today = new Date();
      const current = terms.find(t => {
         if (!t.start_date || !t.end_date) return false;
         return new Date(t.start_date) <= today && new Date(t.end_date) >= today;
      });
      return current || null;
   }, [terms]);

   const achievements = useMemo(() => {
      const list = [];
      if (!summary.meanMarks) return [];

      if (['A', 'A-'].includes(summary.meanGrade)) {
         list.push({ icon: '🏆', label: 'Performance Peak', color: 'bg-amber-100 text-amber-700 border-amber-200' });
      }

      if (summary.trend?.isPositive && Number(summary.trend.value) >= 5) {
         list.push({ icon: '🚀', label: 'Growth Master', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' });
      }

      const hasExpert = tableData.some(r => r.avg !== '-' && Number(r.avg.marks) >= 90);
      if (hasExpert) {
         list.push({ icon: '⭐', label: 'Subject Specialist', color: 'bg-blue-100 text-blue-700 border-blue-200' });
      }

      const allTimeResults = resultRows.map(r => Number(r.marks)).filter(m => !isNaN(m));
      const isTrulyConsistent = allTimeResults.length > 0 && allTimeResults.every(m => m >= 65);
      if (isTrulyConsistent) {
         list.push({ icon: '💎', label: 'Consistency Star', color: 'bg-purple-100 text-purple-700 border-purple-200' });
      }

      return list;
   }, [summary, tableData]);

   const downloadReportCard = async () => {
      if (!selectedStudent || !studentDetails) return;
      const level = selectedStudent.stream?.class?.name?.match(/\d+/);
      await generateResultPDF(selectedStudent, studentDetails, schoolInfo, (level ? parseInt(level[0]) : 'ALL') as any);
   };

    const renderMark = (val: any) => {
       if (val === '-') return <span className="text-zinc-300 font-bold text-[10px] uppercase font-inter tracking-wider">No Data</span>;
       return (
          <div className="flex flex-col items-center">
             <span className="text-[13px] font-bold text-zinc-900 dark:text-zinc-100 font-inter">{val.marks}%</span>
             <span className={cn("text-[10px] font-bold uppercase font-inter", getGradeColor(val.grade))}>{val.grade}</span>
          </div>
       );
    };

   const getCellGlow = (val: any) => {
      if (!val || val === '-' || !val.marks) return "";
      const m = Number(val.marks);
      if (m >= 80) return "bg-emerald-50/40 dark:bg-emerald-500/5";
      if (m < 40) return "bg-rose-50/40 dark:bg-rose-500/5";
      return "";
   };

   const [selectedRemark, setSelectedRemark] = useState<{subject: string, items: any[]} | null>(null);

   if (loading) return (
      <div className="max-w-6xl mx-auto p-4 space-y-4">
         <div className="h-6 w-48 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
         <div className="h-96 bg-white dark:bg-zinc-900 rounded-xl animate-pulse" />
      </div>
   );

   return (
      <div className="max-w-[1400px] mx-auto p-3 sm:p-6 space-y-4 animate-in fade-in duration-500 pb-20 overflow-x-hidden">
         
         <div className="flex flex-col gap-1 border-b border-zinc-100 dark:border-zinc-800 pb-4">
            <div className="flex items-center gap-2">
               <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", activeTermObject ? "bg-emerald-500" : "bg-orange-400")} />
               <p className="text-[10px] font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-widest">
                  {activeTermObject ? `Currently in ${activeTermObject.name} ${activeTermObject.year}` : 'Currently: School Holiday / Out of Session'}
               </p>
            </div>
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter ml-3.5">
               Date: {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
         </div>

         <div className="flex flex-col gap-8 py-8 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
               <div className="space-y-2">
                  <h1 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-white font-sora tracking-tight">
                     Results for {selectedExamType === 'ALL' ? 'Cumulative' : selectedExamType} {selectedTermId === 'ALL' ? 'Performance' : terms.find(t => t.id === selectedTermId)?.name} {selectedYear}
                  </h1>
                  <p className="text-sm font-semibold text-emerald-600 font-inter">{selectedStudent?.profile?.full_name}</p>
               </div>
               
               <div className="flex flex-wrap items-center gap-8 sm:gap-12">
                  <div className="flex items-center gap-4">
                     <div className="text-center sm:text-left">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 font-inter">Mean Grade</p>
                        <div className="flex items-baseline gap-2">
                           <span className={cn("text-5xl font-black font-sora", getGradeColor(summary.meanGrade))}>{summary.meanGrade}</span>
                           <span className="text-lg font-bold text-zinc-400">/ {summary.meanMarks}%</span>
                        </div>
                     </div>
                  </div>

                  <div className="hidden sm:block h-12 w-px bg-zinc-200 dark:bg-zinc-800" />

                  <div className="flex items-center gap-8">
                     {summary.trend ? (
                        <div className="flex items-center gap-6">
                           <div className="space-y-1">
                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-inter">Previous</p>
                              <p className="text-sm font-bold text-zinc-900 dark:text-white font-inter">{summary.prevMean}% ({markToGrade(Number(summary.prevMean), gradingSystem)})</p>
                           </div>
                           <div className={cn(
                              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold border font-inter",
                              summary.trend.isPositive ? "text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20" : "text-rose-600 bg-rose-50 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20"
                           )}>
                              {summary.trend.isPositive ? <TrendingUp size={14} /> : <TrendingUp size={14} className="rotate-180" />}
                              <span>{summary.trend.isPositive ? 'Improved' : 'Dropped'} {Math.abs(Number(summary.trend.value))}%</span>
                           </div>
                        </div>
                     ) : (
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-inter">No History Found</p>
                     )}
                  </div>
               </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 pt-4">
               <div className="flex items-center gap-4 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 font-inter">
                  <span className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 rounded-md">{selectedYear}</span>
                  <span className="w-1 h-1 rounded-full bg-zinc-300" />
                  <span className="uppercase tracking-wider">{selectedTermId === 'ALL' ? 'Cumulative Performance' : terms.find(t => t.id === selectedTermId)?.name}</span>
               </div>

               <div className="flex items-center gap-3 w-full sm:w-auto">
                  {students.length > 1 && (
                     <select 
                        value={selectedStudentId} 
                        onChange={e => setSelectedStudentId(e.target.value)}
                        className="flex-1 sm:flex-none bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs font-bold outline-none shadow-sm font-inter"
                     >
                        {students.map(s => <option key={s.id} value={s.id}>{s.profile?.full_name}</option>)}
                     </select>
                  )}
                  <button onClick={downloadReportCard} className="flex items-center justify-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-sm font-inter text-xs font-bold">
                     <Download size={14} />
                     <span className="hidden sm:inline">Save PDF Report</span>
                  </button>
               </div>
            </div>
         </div>
         
         {achievements.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-2 -mt-2">
               {achievements.map((a, i) => (
                  <div key={i} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-widest whitespace-nowrap shadow-sm animate-in slide-in-from-left-4 duration-500", a.color)}>
                     <span>{a.icon}</span>
                     {a.label}
                  </div>
               ))}
            </div>
         )}

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {radarData.length >= 3 && (
               <div className="lg:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm sticky top-4">
                  <div className="flex items-center gap-2 mb-6">
                     <div className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-100 dark:border-zinc-700">
                        <TrendingUp size={14} />
                     </div>
                     <div>
                        <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Performance DNA</h3>
                        <p className="text-[8px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-tighter">Academic Strengths Profiling</p>
                     </div>
                  </div>
                  
                  <div className="h-[240px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                           <PolarGrid stroke="#f4f4f5" strokeWidth={1} />
                           <PolarAngleAxis 
                              dataKey="subject" 
                              tick={{ fontSize: 9, fontWeight: 700, fill: '#71717a' }} 
                           />
                           <Radar
                              name="Performance"
                              dataKey="A"
                              stroke="#18181b"
                              strokeWidth={2}
                              fill="#18181b"
                              fillOpacity={0.1}
                           />
                        </RadarChart>
                     </ResponsiveContainer>
                  </div>
                  
                  <div className="mt-4 space-y-2 border-t border-zinc-100 dark:border-zinc-800 pt-4">
                     <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-tighter text-center italic">
                        * faculty strength distribution based on term averages
                     </p>
                  </div>
               </div>
            )}

            <div className={cn("space-y-4", radarData.length >= 3 ? "lg:col-span-8" : "lg:col-span-12")}>
               <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-3xl p-6 shadow-sm overflow-hidden">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-50 dark:border-zinc-900 pb-4 mb-4">
                     <div className="flex items-center gap-2">
                        <Filter size={12} className="text-zinc-300" />
                        <h2 className="text-[10px] font-bold text-zinc-400 uppercase font-sora tracking-widest">Academic Matrix</h2>
                     </div>
                     <div className="flex items-center gap-1.5 flex-wrap">
                        <select value={selectedYear} onChange={e => { setSelectedYear(e.target.value); setSelectedTermId('ALL'); }} className="bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase outline-none cursor-pointer">
                           <option value="">Year</option>
                           {years.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select value={selectedTermId} onChange={e => setSelectedTermId(e.target.value)} className="bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase outline-none cursor-pointer">
                           <option value="ALL">All Terms</option>
                           {termsForYear.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                        <select value={selectedExamType} onChange={e => setSelectedExamType(e.target.value)} className="bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase outline-none cursor-pointer">
                           <option value="ALL">Assmt.</option>
                           <option value="OPENER">Open</option>
                           <option value="MID-TERM">Mid</option>
                           <option value="END-TERM">End</option>
                        </select>
                     </div>
                  </div>

                  <div className="overflow-x-auto no-scrollbar">
                     <table className="w-full min-w-[500px] table-fixed">
                        <thead>
                           <tr className="bg-zinc-50 dark:bg-zinc-900/50">
                              <th className="px-4 py-4 text-left text-[11px] font-bold text-zinc-500 uppercase tracking-wider font-inter">Subject</th>
                              {selectedTermId === 'ALL' ? (
                                 <>
                                    <th className="px-2 py-4 text-center text-[11px] font-bold text-zinc-500 uppercase tracking-wider font-inter">Term 1</th>
                                    <th className="px-2 py-4 text-center text-[11px] font-bold text-zinc-500 uppercase tracking-wider font-inter">Term 2</th>
                                    <th className="px-2 py-4 text-center text-[11px] font-bold text-zinc-500 uppercase tracking-wider font-inter">Term 3</th>
                                 </>
                              ) : (
                                 <>
                                    {(selectedExamType === 'ALL' || selectedExamType === 'OPENER') && <th className="px-2 py-4 text-center text-[11px] font-bold text-zinc-500 uppercase tracking-wider font-inter">Opener</th>}
                                    {(selectedExamType === 'ALL' || selectedExamType === 'MID-TERM') && <th className="px-2 py-4 text-center text-[11px] font-bold text-zinc-500 uppercase tracking-wider font-inter">Mid-Term</th>}
                                    {(selectedExamType === 'ALL' || selectedExamType === 'END-TERM') && <th className="px-2 py-4 text-center text-[11px] font-bold text-zinc-500 uppercase tracking-wider font-inter">End-Term</th>}
                                 </>
                              )}
                              <th className="px-2 py-4 text-center text-[11px] font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-inter bg-zinc-100/50 dark:bg-zinc-800/50">Average</th>
                              <th className="px-4 py-4 text-right text-[11px] font-bold text-zinc-500 uppercase tracking-wider font-inter">Remarks</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                           {tableData.length > 0 ? tableData.map((row, idx) => (
                              <tr key={idx} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors border-b border-zinc-100 dark:border-zinc-800/50">
                                 <td className="px-4 py-4">
                                    <span className="text-sm font-bold text-zinc-900 dark:text-white font-sora">{row.subject}</span>
                                 </td>
                                 {selectedTermId === 'ALL' ? (
                                    <>
                                       <td className="px-2 py-4 text-center font-inter">{renderMark(row.col1)}</td>
                                       <td className="px-2 py-4 text-center font-inter">{renderMark(row.col2)}</td>
                                       <td className="px-2 py-4 text-center font-inter">{renderMark(row.col3)}</td>
                                    </>
                                 ) : (
                                    <>
                                       {(selectedExamType === 'ALL' || selectedExamType === 'OPENER') && <td className="px-2 py-4 text-center font-inter">{renderMark(row.col1)}</td>}
                                       {(selectedExamType === 'ALL' || selectedExamType === 'MID-TERM') && <td className="px-2 py-4 text-center font-inter">{renderMark(row.col2)}</td>}
                                       {(selectedExamType === 'ALL' || selectedExamType === 'END-TERM') && <td className="px-2 py-4 text-center font-inter">{renderMark(row.col3)}</td>}
                                    </>
                                 )}
                                 <td className="px-2 py-4 text-center bg-zinc-50/50 dark:bg-zinc-800/30">
                                    {row.avg === '-' ? (
                                       <span className="text-[10px] font-bold text-zinc-300 font-inter">Pending</span>
                                    ) : (
                                       <div className="flex flex-col items-center">
                                          <span className="text-sm font-bold text-zinc-900 dark:text-white font-inter">{row.avg.marks}%</span>
                                          <span className={cn("text-[10px] font-bold", getGradeColor(row.avg.grade))}>({row.avg.grade})</span>
                                       </div>
                                    )}
                                 </td>
                                 <td className="px-4 py-4 text-right">
                                    {row.remarks ? (
                                       <button 
                                          onClick={() => setSelectedRemark({ subject: row.subject, items: row.remarks })}
                                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-all border border-zinc-100 dark:border-zinc-700/50 group/btn"
                                       >
                                          <span className="hidden md:inline text-[11px] font-bold font-inter truncate max-w-[100px]">{row.remarks[0].text}</span>
                                          <MessageSquare className="w-3.5 h-3.5" />
                                       </button>
                                    ) : (
                                       <span className="text-[10px] font-bold text-zinc-300 dark:text-zinc-700 uppercase tracking-widest">No Remarks</span>
                                    )}
                                 </td>
                              </tr>
                           )) : (
                              <tr>
                                 <td colSpan={6} className="px-3 py-20 text-center text-zinc-400">
                                    <AlertCircle size={20} className="mx-auto mb-2 opacity-20" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">No results found</p>
                                 </td>
                              </tr>
                           )}
                        </tbody>
                        {tableTotals && tableData.length > 0 && (
                           <tfoot className="border-t border-zinc-100 dark:border-zinc-800">
                              <tr>
                                 <td colSpan={selectedExamType === 'ALL' ? 4 : 2} className="py-8"></td>
                                 <td className="px-6 py-8 text-center bg-zinc-50/50 dark:bg-zinc-800/20">
                                    <div className="flex flex-col items-center">
                                       <span className="text-xl font-black text-zinc-900 dark:text-white font-sora">{tableTotals.avg.marks}%</span>
                                       <span className={cn("text-[11px] font-black uppercase tracking-widest", getGradeColor(tableTotals.avg.grade))}>{tableTotals.avg.grade}</span>
                                    </div>
                                 </td>
                                 <td className="px-6 py-8 text-right">
                                    <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Mean</span>
                                 </td>
                              </tr>
                           </tfoot>
                        )}
                     </table>
                  </div>
               </div>
            </div>
         </div>

         {/* Minimalist Remarks Overlay */}
         {selectedRemark && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/20 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedRemark(null)}>
               <div 
                  className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-800 p-6 space-y-6 animate-in zoom-in-95 duration-200"
                  onClick={e => e.stopPropagation()}
               >
                  <div className="flex items-center justify-between">
                     <div>
                        <h3 className="text-lg font-bold text-zinc-900 dark:text-white font-sora">{selectedRemark.subject}</h3>
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-inter text-emerald-600">Academic Feedback</p>
                     </div>
                     <button onClick={() => setSelectedRemark(null)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400">
                        <X className="w-5 h-5" />
                     </button>
                  </div>

                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                     {selectedRemark.items.map((item, i) => (
                        <div key={i} className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 space-y-3">
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-500">{item.type}</span>
                              <span className="text-[10px] font-bold text-zinc-400 font-inter italic">from — {item.teacher}</span>
                           </div>
                           <p className="text-sm text-zinc-700 dark:text-zinc-300 font-inter leading-relaxed whitespace-pre-wrap">
                              {item.text}
                           </p>
                        </div>
                     ))}
                  </div>

                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                     <button 
                        onClick={() => setSelectedRemark(null)}
                        className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl font-bold text-sm font-inter hover:opacity-90 transition-opacity"
                     >
                        Close Feedback
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default ParentStudentResults;
