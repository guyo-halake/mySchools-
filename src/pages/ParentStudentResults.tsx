import React, { useEffect, useMemo, useState } from 'react';
import { 
   Radar, 
   RadarChart, 
   PolarGrid, 
   PolarAngleAxis, 
   ResponsiveContainer,
   PolarRadiusAxis 
} from 'recharts';
import { Download, Share2, FileText, TrendingUp, Filter, AlertCircle, Mail, MessageCircle, X, Info } from 'lucide-react';
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
         const allTerms = await api.getTerms(user.school_id);
         setTerms(allTerms || []);

         const today = new Date();
         const current = allTerms.find(t => {
            if (!t.start_date || !t.end_date) return false;
            return new Date(t.start_date) <= today && new Date(t.end_date) >= today;
         });
         
         if (current) {
            setSelectedYear(current.year?.toString() || new Date().getFullYear().toString());
            if (selectedTermId === 'ALL') setSelectedTermId(current.id);
         } else {
            setSelectedYear(new Date().getFullYear().toString());
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
         const matchesYear = !selectedYear || r.exam?.term?.year?.toString() === selectedYear;
         const matchesTerm = selectedTermId === 'ALL' || r.exam?.term_id === selectedTermId;
         let matchesType = selectedExamType === 'ALL';
         if (!matchesType) {
            const eName = (r.exam?.name || '').toUpperCase();
            const eType = (r.exam?.type || '').toUpperCase();
            if (selectedExamType === 'OPENER') matchesType = eName.includes('OPENER') || eName.includes('START');
            else if (selectedExamType === 'MID-TERM') matchesType = eName.includes('MID') || eType.includes('MID');
            else if (selectedExamType === 'END-TERM') matchesType = eName.includes('END') || eType.includes('END');
         }
         return matchesYear && matchesTerm && matchesType;
      });

      const subjectMap = new Map<string, any>();
      filtered.forEach(r => {
         const sName = r.subject?.name || 'Unknown';
         if (!subjectMap.has(sName)) subjectMap.set(sName, { subject: sName, opener: '-', mid: '-', end: '-', remarks: '' });
         const entry = subjectMap.get(sName);
         const eName = (r.exam?.name || '').toUpperCase();
         const eType = (r.exam?.type || '').toUpperCase();
         const val = { marks: r.marks, grade: r.grade || markToGrade(r.marks) };
         if (eName.includes('OPENER') || eName.includes('START')) entry.opener = val;
         else if (eName.includes('MID') || eType.includes('MID')) entry.mid = val;
         else if (eName.includes('END') || eType.includes('END')) entry.end = val;
         if (r.remarks) entry.remarks = r.remarks;
      });

      return Array.from(subjectMap.values()).map(row => {
         const scores = [row.opener, row.mid, row.end].filter(s => s !== '-');
         const avgMarks = scores.length ? (scores.reduce((a, b) => a + Number(b.marks), 0) / scores.length) : 0;
         const avg = scores.length ? { marks: avgMarks.toFixed(1), grade: markToGrade(avgMarks) } : '-';
         return { ...row, avg };
      });
   }, [resultRows, selectedYear, selectedTermId, selectedExamType]);

   const summary = useMemo(() => {
      if (!tableData.length || !resultRows.length) return { meanGrade: '-', meanMarks: 0, trend: null };
      
      // 1. Current Mean
      const averages = tableData.filter(r => r.avg !== '-').map(r => Number(r.avg.marks));
      const meanMarksValue = averages.length ? (averages.reduce((a, b) => a + b, 0) / averages.length) : 0;
      const meanMarks = meanMarksValue.toFixed(1);

      // 2. Trend Calculation (Compare with Previous Term or Year chronologically)
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
            // ALL TERMS selected: Compare Current Year with Previous Year
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

      return { meanGrade: markToGrade(Number(meanMarks)), meanMarks, trend };
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

      // 1. Performance Peak
      if (['A', 'A-'].includes(summary.meanGrade)) {
         list.push({ icon: '🏆', label: 'Performance Peak', color: 'bg-amber-100 text-amber-700 border-amber-200' });
      }

      // 2. Growth Master
      if (summary.trend?.isPositive && Number(summary.trend.value) >= 5) {
         list.push({ icon: '🚀', label: 'Growth Master', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' });
      }

      // 3. Subject Specialist (Any mark > 90)
      const hasExpert = tableData.some(r => r.avg !== '-' && Number(r.avg.marks) >= 90);
      if (hasExpert) {
         list.push({ icon: '⭐', label: 'Subject Specialist', color: 'bg-blue-100 text-blue-700 border-blue-200' });
      }

      // 4. Consistency Star (All subjects > 60)
      const isConsistent = tableData.length > 0 && tableData.every(r => r.avg !== '-' && Number(r.avg.marks) >= 60);
      if (isConsistent) {
         list.push({ icon: '💎', label: 'Consistency Star', color: 'bg-purple-100 text-purple-700 border-purple-200' });
      }

      return list;
   }, [summary, tableData]);

   const downloadReportCard = async () => {
      if (!selectedStudent || !studentDetails) return;
      await generateResultPDF(selectedStudent, studentDetails, schoolInfo, 4);
   };

   const renderMark = (val: any) => {
      if (val === '-') return <span className="text-zinc-300 font-medium text-[8px]">No data</span>;
      return (
         <div className="flex flex-col items-center">
            <span className="text-[11px] font-bold text-zinc-900 dark:text-zinc-100">{val.marks}%</span>
            <span className={cn("text-[9px] font-bold leading-none", getGradeColor(val.grade))}>({val.grade})</span>
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

   const [selectedRemark, setSelectedRemark] = useState<{subject: string, text: string} | null>(null);

   if (loading) return (
      <div className="max-w-6xl mx-auto p-4 space-y-4">
         <div className="h-6 w-48 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
         <div className="h-96 bg-white dark:bg-zinc-900 rounded-xl animate-pulse" />
      </div>
   );

   return (
      <div className="max-w-[1400px] mx-auto p-3 sm:p-6 space-y-4 animate-in fade-in duration-500 pb-20 overflow-x-hidden">
         
         {/* 0. CURRENT CALENDAR CONTEXT */}
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

         {/* 1. ORIGINAL DESIGN: HEADER */}
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
               <div className="flex items-center gap-3">
                  <h1 className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white font-sora lowercase capitalize">Exams & Results</h1>
                  <div className="flex items-center gap-1.5 flex-wrap">
                     <div className={cn("px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase", getGradeBadge(summary.meanGrade))}>
                        {summary.meanGrade} ({summary.meanMarks}%)
                     </div>
                     
                     {summary.trend && (
                        <div className={cn(
                           "flex items-center gap-0.5 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tighter",
                           summary.trend.isPositive ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10" : "bg-rose-50 text-rose-600 dark:bg-rose-500/10"
                        )}>
                           {summary.trend.isPositive ? <TrendingUp size={10} /> : <TrendingUp size={10} className="rotate-180" />}
                           {summary.trend.isPositive ? '+' : ''}{summary.trend.value}% 
                           <span className="opacity-60 font-medium lowercase ml-0.5 whitespace-nowrap">{summary.trend.label}</span>
                        </div>
                     )}
                  </div>
               </div>
               <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-0.5 font-inter">
                  {selectedStudent?.profile?.full_name}
               </p>
            </div>
            
            <div className="flex items-center gap-2">
               {students.length > 1 && (
                  <select 
                     value={selectedStudentId} 
                     onChange={e => setSelectedStudentId(e.target.value)}
                     className="bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase outline-none"
                  >
                     {students.map(s => <option key={s.id} value={s.id}>{s.profile?.full_name}</option>)}
                  </select>
               )}
               <button onClick={downloadReportCard} title="Download Report" className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-md">
                  <Download size={14} />
               </button>
            </div>
         </div>
         
         {/* 1b. ACHIEVEMENT BADGES */}
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

         {/* 1. ANALYTICS & FILTERS GRID */}
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Visual Analytics (Radar Chart) */}
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

            {/* Results Filters & Table */}
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
                           <tr className="bg-zinc-50/50 dark:bg-zinc-800/30 border-b border-zinc-100 dark:border-zinc-800 font-bold uppercase text-[9px] text-zinc-400">
                              <th className="w-[30%] px-3 py-4 text-left">Subject</th>
                              <th className="w-[13%] px-1 py-4 text-center border-l border-zinc-100 dark:border-zinc-800/50">Opener</th>
                              <th className="w-[13%] px-1 py-4 text-center border-l border-zinc-100 dark:border-zinc-800/50">Mid</th>
                              <th className="w-[13%] px-1 py-4 text-center border-l border-zinc-100 dark:border-zinc-800/50">End</th>
                              <th className="w-[13%] px-1 py-4 text-center border-l border-zinc-100 dark:border-zinc-800/50 text-zinc-900 dark:text-white bg-zinc-50/10">Avg</th>
                              <th className="w-[18%] px-2 py-4 text-center border-l border-zinc-100 dark:border-zinc-800/50">Feed</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                           {tableData.length > 0 ? tableData.map((row, i) => (
                              <tr key={i} className="hover:bg-zinc-50/20 dark:hover:bg-zinc-800/5 transition-colors">
                                 <td className="px-3 py-3 sm:py-4 text-[10px] sm:text-[12px] font-bold text-zinc-900 dark:text-zinc-100 uppercase truncate" title={row.subject}>{row.subject}</td>
                                 <td className={cn("px-1 py-3 sm:py-4 text-center border-l border-zinc-100 dark:border-zinc-800/50", getCellGlow(row.opener))}>{renderMark(row.opener)}</td>
                                 <td className={cn("px-1 py-3 sm:py-4 text-center border-l border-zinc-100 dark:border-zinc-800/50", getCellGlow(row.mid))}>{renderMark(row.mid)}</td>
                                 <td className={cn("px-1 py-3 sm:py-4 text-center border-l border-zinc-100 dark:border-zinc-800/50", getCellGlow(row.end))}>{renderMark(row.end)}</td>
                                 <td className={cn("px-1 py-3 sm:py-4 text-center border-l border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/10 font-bold", getCellGlow(row.avg))}>{renderMark(row.avg)}</td>
                                 <td className="px-2 py-3 sm:py-4 text-center border-l border-zinc-100 dark:border-zinc-800/50">
                                    {row.remarks ? (
                                       <button 
                                          onClick={() => setSelectedRemark({ subject: row.subject, text: row.remarks })}
                                          className="p-1.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors animate-pulse"
                                          title="Read Teacher's Remark"
                                       >
                                          <Mail size={12} />
                                       </button>
                                    ) : (
                                       <span className="opacity-20">—</span>
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
                        {tableData.length > 0 && (
                           <tfoot>
                              <tr className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold">
                                 <td className="px-3 py-4 text-[10px] uppercase tracking-widest">Mean Score</td>
                                 <td colSpan={3} className="px-1 py-4"></td>
                                 <td className="px-1 py-4 text-center border-l border-white/10 dark:border-black/5 bg-white/5 dark:bg-black/5">
                                    <div className="flex flex-col items-center">
                                       <span className="text-[12px]">{summary.meanMarks}%</span>
                                       <span className="text-[10px] leading-none opacity-60">({summary.meanGrade})</span>
                                    </div>
                                 </td>
                                 <td className="px-2 py-4 text-center border-l border-white/10 dark:border-black/5 font-black uppercase text-[8px]">Overview</td>
                              </tr>
                           </tfoot>
                        )}
                     </table>
                  </div>
               </div>
            </div>
         </div>

         {/* REMARK MODAL */}
         {selectedRemark && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm animate-in fade-in duration-200">
               <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600">
                           <MessageCircle size={18} />
                        </div>
                        <div>
                           <h3 className="text-[12px] font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">Teacher's Corner</h3>
                           <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-tighter">{selectedRemark.subject}</p>
                        </div>
                     </div>
                     <button onClick={() => setSelectedRemark(null)} className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors">
                        <X size={18} />
                     </button>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 border border-zinc-100 dark:border-zinc-700/50">
                     <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 italic leading-relaxed">
                        "{selectedRemark.text}"
                     </p>
                  </div>
                  <div className="mt-6">
                     <button 
                        onClick={() => setSelectedRemark(null)}
                        className="w-full py-2.5 bg-zinc-900 dark:bg-white dark:text-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all"
                     >
                        Close Remark
                     </button>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};
