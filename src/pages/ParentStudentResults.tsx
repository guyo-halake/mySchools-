import React, { useEffect, useMemo, useState } from 'react';
import { Download, Share2, FileText, TrendingUp, Filter, AlertCircle } from 'lucide-react';
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
   const [studentDetails, setStudentDetails] = useState<any>(null);

   const [selectedForm, setSelectedForm] = useState<string>('ALL');
   const [selectedTerm, setSelectedTerm] = useState<string>('ALL');
   const [selectedExamType, setSelectedExamType] = useState<string>('ALL');

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

   const filterOptions = useMemo(() => {
      const forms = new Set<string>();
      const terms = new Set<string>();
      ['TERM 1', 'TERM 2', 'TERM 3'].forEach(t => terms.add(t));

      resultRows.forEach(r => {
         const termName = (r.exam?.term?.name || '').toUpperCase();
         const examName = (r.exam?.name || '').toUpperCase();
         const streamClass = (r.student?.stream?.class?.name || '').toUpperCase();
         const combined = (termName + " " + examName + " " + streamClass);

         const formMatch = combined.match(/FORM\s*(\d+)/i) || combined.match(/CLASS\s*(\d+)/i);
         if (formMatch) forms.add(`FORM ${formMatch[1]}`);
         else if (streamClass) forms.add(streamClass);

         if (termName.includes('TERM 1')) terms.add('TERM 1');
         if (termName.includes('TERM 2')) terms.add('TERM 2');
         if (termName.includes('TERM 3')) terms.add('TERM 3');
      });

      return {
         forms: [...forms].sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
         terms: [...terms].sort(),
         examTypes: ['OPENER', 'MID-TERM', 'END-TERM']
      };
   }, [resultRows]);

   const tableData = useMemo(() => {
      if (!resultRows.length) return [];

      const filtered = resultRows.filter(r => {
         const termName = (r.exam?.term?.name || '').toUpperCase();
         const examName = (r.exam?.name || '').toUpperCase();
         const streamClass = (r.student?.stream?.class?.name || '').toUpperCase();
         const combined = (termName + " " + examName + " " + streamClass).toUpperCase();

         const formTarget = (selectedForm || 'ALL').toUpperCase();
         const termTarget = (selectedTerm || 'ALL').toUpperCase();

         let formMatchOk = formTarget === 'ALL';
         if (!formMatchOk) {
            const digitMatch = formTarget.match(/\d+/);
            if (digitMatch) {
               const digit = digitMatch[0];
               formMatchOk = combined.includes(`FORM ${digit}`) ||
                  combined.includes(`FORM${digit}`) ||
                  streamClass.includes(digit);
            } else {
               formMatchOk = combined.includes(formTarget);
            }
         }

         const termMatchOk = termTarget === 'ALL' || combined.includes(termTarget);

         let typeMatchOk = true;
         if (selectedExamType && selectedExamType !== 'ALL') {
            const typeTarget = selectedExamType.toUpperCase();
            if (typeTarget === 'OPENER') typeMatchOk = examName.includes('OPENER') || examName.includes('START');
            else if (typeTarget === 'MID-TERM') typeMatchOk = examName.includes('MID') || (r.exam?.type || '').toUpperCase().includes('MID');
            else if (typeTarget === 'END-TERM') typeMatchOk = examName.includes('END') || (r.exam?.type || '').toUpperCase().includes('END');
         }

         return formMatchOk && termMatchOk && typeMatchOk;
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
   }, [resultRows, selectedForm, selectedTerm, selectedExamType]);

   const summary = useMemo(() => {
      if (!tableData.length) return { meanGrade: '-', meanMarks: 0 };
      const averages = tableData.filter(r => r.avg !== '-').map(r => Number(r.avg.marks));
      const meanMarks = averages.length ? (averages.reduce((a, b) => a + b, 0) / averages.length).toFixed(1) : 0;
      return { meanGrade: markToGrade(Number(meanMarks)), meanMarks };
   }, [tableData]);

   const loadData = async () => {
      if (!user?.school_id) return;
      setLoading(true);
      try {
         const allStudents = await api.getStudents(user.school_id);
         const scopedStudents = user.role === 'PARENT' ? allStudents.filter((row: any) => row.parent_id === user.id) : allStudents.filter((row: any) => row.id === user.id);
         setStudents(scopedStudents);
         const activeStudentId = selectedStudentId && scopedStudents.some((row: any) => row.id === selectedStudentId) ? selectedStudentId : (scopedStudents[0]?.id || '');
         setSelectedStudentId(activeStudentId);
         if (activeStudentId) {
            const rows = await api.getStudentResultsAll(activeStudentId);
            const fees = await api.getFees(user.school_id).then(fs => fs.filter(f => f.student_id === activeStudentId));
            const subs = await api.getStudentSubjects(activeStudentId);
            setResultRows(rows || []);
            setStudentDetails({ results: rows, fees: fees, subjects: subs });

            if (rows?.length) {
               const latest = [...rows].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
               const termName = (latest.exam?.term?.name || '').toUpperCase();
               if (termName.includes('TERM 1')) setSelectedTerm('TERM 1');
               else if (termName.includes('TERM 2')) setSelectedTerm('TERM 2');
               else if (termName.includes('TERM 3')) setSelectedTerm('TERM 3');

               const formMatch = (termName + " " + (latest.exam?.name || '')).match(/FORM\s*(\d+)/i);
               if (formMatch) setSelectedForm(`FORM ${formMatch[1]}`);
            }
         }
      } catch (err: any) { setError('Connection error'); }
      finally { setTimeout(() => setLoading(false), 300); }
   };

   useEffect(() => { loadData(); }, [user?.id, selectedStudentId]);

   const downloadReportCard = async () => {
      if (!selectedStudent || !studentDetails) return;
      const mode = parseInt((selectedForm || '4').replace(/\D/g, '')) || 4;
      await generateResultPDF(selectedStudent, studentDetails, schoolInfo, mode);
   };

   const renderMark = (val: any) => {
      if (val === '-') return <span className="text-zinc-300 font-medium text-[8px]">No data</span>;
      return (
         <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100">{val.marks}%</span>
            <span className={cn("text-[9px] font-bold leading-none", getGradeColor(val.grade))}>({val.grade})</span>
         </div>
      );
   };

   if (loading) return (
      <div className="max-w-6xl mx-auto p-4 space-y-4">
         <div className="h-6 w-48 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
         <div className="h-96 bg-white dark:bg-zinc-900 rounded-xl animate-pulse" />
      </div>
   );

   return (
      <div className="max-w-[1400px] mx-auto p-3 sm:p-6 space-y-6 animate-in fade-in duration-500 pb-20 overflow-x-hidden">

         {/* 1. MINIMALIST HEADER */}
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
               <div className="flex items-center gap-3">
                  <h1 className="text-lg sm:text-2xl font-bold text-zinc-900 dark:text-white font-sora lowercase capitalize">Exams & Results</h1>
                  <div className={cn("px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase", getGradeBadge(summary.meanGrade))}>
                     {summary.meanGrade} ({summary.meanMarks}%)
                  </div>
               </div>
               <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-0.5 font-inter">
                  {selectedStudent?.profile?.full_name} <span className="mx-2 opacity-30 text-zinc-300">|</span> {selectedForm} {selectedTerm}
               </p>
            </div>
            <div className="flex items-center gap-2">
               <button onClick={downloadReportCard} title="Download Report" className="p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all shadow-md">
                  <Download size={14} />
               </button>
               <button title="Share" className="p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-lg border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 transition-all">
                  <Share2 size={14} />
               </button>
            </div>
         </div>

         {/* 2. FILTERS */}
         <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-3">
               <div className="flex items-center gap-2">
                  <Filter size={12} className="text-emerald-600" />
                  <h2 className="text-[10px] font-bold text-zinc-900 dark:text-white uppercase font-sora">Grade Filters</h2>
               </div>
               <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <select value={selectedForm} onChange={e => setSelectedForm(e.target.value)} className="bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase outline-none cursor-pointer">
                     <option value="ALL">All Forms</option>
                     {filterOptions.forms.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <select value={selectedTerm} onChange={e => setSelectedTerm(e.target.value)} className="bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase outline-none cursor-pointer">
                     <option value="ALL">All Terms</option>
                     {filterOptions.terms.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <select value={selectedExamType} onChange={e => setSelectedExamType(e.target.value)} className="bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg px-2.5 py-1.5 text-[10px] font-bold uppercase outline-none cursor-pointer">
                     <option value="ALL">All Exams</option>
                     {filterOptions.examTypes.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
               </div>
            </div>

            {/* 3. MATRIX TABLE */}
            <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
               <div className="w-full">
                  <table className="w-full table-fixed">
                     <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 font-bold uppercase text-[9px] text-zinc-400">
                           <th className="w-[30%] px-3 py-4 text-left">Subject</th>
                           <th className="w-[13%] px-1 py-4 text-center border-l border-zinc-100 dark:border-zinc-800/50">Opener</th>
                           <th className="w-[13%] px-1 py-4 text-center border-l border-zinc-100 dark:border-zinc-800/50">Mid</th>
                           <th className="w-[13%] px-1 py-4 text-center border-l border-zinc-100 dark:border-zinc-800/50">End</th>
                           <th className="w-[13%] px-1 py-4 text-center border-l border-zinc-100 dark:border-zinc-800/50 text-zinc-900 dark:text-white">Avg</th>
                           <th className="w-[18%] px-2 py-4 text-left border-l border-zinc-100 dark:border-zinc-800/50">Details</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {tableData.length > 0 ? tableData.map((row, i) => (
                           <tr key={i} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/10 transition-colors">
                              <td className="px-3 py-3 sm:py-4 text-[10px] sm:text-[12px] font-bold text-zinc-900 dark:text-zinc-100 uppercase truncate" title={row.subject}>{row.subject}</td>
                              <td className="px-1 py-3 sm:py-4 text-center border-l border-zinc-100 dark:border-zinc-800/50">{renderMark(row.opener)}</td>
                              <td className="px-1 py-3 sm:py-4 text-center border-l border-zinc-100 dark:border-zinc-800/50">{renderMark(row.mid)}</td>
                              <td className="px-1 py-3 sm:py-4 text-center border-l border-zinc-100 dark:border-zinc-800/50">{renderMark(row.end)}</td>
                              <td className="px-1 py-3 sm:py-4 text-center border-l border-zinc-100 dark:border-zinc-800/50 bg-zinc-50/10 dark:bg-zinc-800/20 font-bold">{renderMark(row.avg)}</td>
                              <td className="px-2 py-3 sm:py-4 text-[9px] sm:text-[10px] font-medium text-zinc-400 border-l border-zinc-100 dark:border-zinc-800/50 truncate">
                                 {row.remarks ? "Read" : <span className="opacity-30">—</span>}
                              </td>
                           </tr>
                        )) : (
                           <tr>
                              <td colSpan={6} className="px-3 py-20 text-center">
                                 <div className="flex flex-col items-center gap-2">
                                    <AlertCircle size={24} className="text-zinc-200" />
                                    <p className="text-[10px] font-bold uppercase text-zinc-400 tracking-tight">No results found for {selectedForm} / {selectedTerm}</p>
                                    <button onClick={() => { setSelectedForm('ALL'); setSelectedTerm('ALL'); }} className="text-[10px] font-bold text-emerald-600 uppercase underline mt-2">Reset Filters</button>
                                 </div>
                              </td>
                           </tr>
                        )}
                     </tbody>
                     <tfoot>
                        <tr className="bg-emerald-600 dark:bg-emerald-700 text-white font-bold">
                           <td className="px-3 py-4 text-[11px] uppercase">Mean Score</td>
                           <td colSpan={3} className="px-1 py-4 border-l border-white/10"></td>
                           <td className="px-1 py-4 text-center border-l border-white/10 bg-emerald-700/50">
                              <div className="flex flex-col items-center">
                                 <span className="text-[12px]">{summary.meanMarks}%</span>
                                 <span className="text-[10px] leading-none">({summary.meanGrade})</span>
                              </div>
                           </td>
                           <td className="px-2 py-4 text-[10px] uppercase border-l border-white/10">—</td>
                        </tr>
                     </tfoot>
                  </table>
               </div>
            </div>
         </div>

      </div>
   );
};
