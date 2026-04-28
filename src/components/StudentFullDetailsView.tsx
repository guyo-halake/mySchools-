import React, { useState, useEffect } from 'react';
import { 
  Eye, Pencil, FileText, Download, UserPlus, 
  Mail, Phone, BookOpen, GraduationCap, CreditCard, AlertTriangle, X, Star, 
  ChevronLeft, Printer, Trash2, MessageSquare, ChevronDown, ExternalLink, Info, 
  User, MapPin, Calendar, Briefcase, Heart, TrendingUp, Activity, History, Trophy, 
  ShieldCheck, CheckCircle2, AlertCircle, Plus
} from 'lucide-react';
import { Button, Badge } from './UI';
import { cn } from '../utils/utils';
import { generateResultPDF } from '../utils/pdf';
import { api } from '../lib/api';
import { useApp } from '../context/AppContext';
import { formatCurrency } from '../utils/utils';

interface StudentFullDetailsViewProps {
  student: any;
  onClose: () => void;
}

export const StudentFullDetailsView: React.FC<StudentFullDetailsViewProps> = ({ student: initialStudent, onClose }) => {
  const { schoolInfo } = useApp();
  const [detailTab, setDetailTab] = useState<'ACADEMIC' | 'EXTRA' | 'HEALTH' | 'FEES' | 'DISCIPLINE' | null>(null);
  const [downloadMenu, setDownloadMenu] = useState(false);
  const [student, setStudent] = useState<any>(initialStudent);
  const [loading, setLoading] = useState(true);
  
  const [studentDetails, setStudentDetails] = useState<{
    subjects: any[],
    health: any,
    discipline: any[],
    activities: any[],
    results: any[],
    fees: any[]
  }>({
    subjects: [],
    health: null,
    discipline: [],
    activities: [],
    results: [],
    fees: []
  });

  const subjects_list = ['Mathematics', 'English', 'Kiswahili', 'Physics', 'Chemistry', 'CRE', 'Business Studies', 'History', 'Government'];
  const terms = ['Term 1', 'Term 2', 'Term 3'];

  useEffect(() => {
    if (initialStudent) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [fullStudent, subs, health, disc, acts, resultsAll, fees] = await Promise.all([
            api.getStudentById(initialStudent.id),
            api.getStudentSubjects(initialStudent.id),
            api.getHealthRecord(initialStudent.id),
            api.getDisciplinaryRecords(initialStudent.id),
            api.getStudentActivities(initialStudent.id),
            api.getStudentResultsAll(initialStudent.id),
            api.getStudentFees(initialStudent.id)
          ]);

          if (fullStudent) setStudent(fullStudent);
          
          setStudentDetails({
            subjects: subs || [],
            health: health || null,
            discipline: disc || [],
            activities: acts || [],
            results: resultsAll || [],
            fees: fees || []
          });
        } catch (err) {
          console.error("Failed to fetch student details:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [initialStudent]);


  return (
    <div className="animate-in fade-in duration-700 max-w-[1600px] mx-auto py-6 px-4 bg-white dark:bg-zinc-950 min-h-screen">
      
      {/* 1. Master Identity Header */}
      {/* 1. Master Identity Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-8 mb-6">
        <button onClick={onClose} className="p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-full transition-colors mr-6">
          <ChevronLeft size={20} className="text-zinc-600 dark:text-zinc-400" />
        </button>
        <div className="flex-1 text-left">
           <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 uppercase leading-none">{student.profile?.full_name || student.name}</h1>
           <div className="flex items-center gap-4 mt-3">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">REG: {student.adm_no}</span>
              <div className="w-1 h-1 rounded-full bg-zinc-200" />
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                {student.stream?.class?.name} {student.stream?.name}
              </span>
              <div className="w-1 h-1 rounded-full bg-zinc-200" />
              <Badge variant="neutral" className="bg-zinc-900 text-white text-[8px] border-none font-black px-3 rounded-full uppercase">INSTITUTIONAL DOSSIER</Badge>
           </div>
        </div>
      </div>

         {/* MASTER CONTENT AREA */}
         <div className="flex-1 w-full space-y-8">
            
            {/* Minimalist Top Navigation Row */}
            <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-zinc-50 dark:border-zinc-900 pb-2">
               {[
                 { id: 'TRANSCRIPT', label: 'Transcript', icon: FileText },
                 { id: 'ACADEMIC', label: 'Subjects', icon: BookOpen },
                 { id: 'EXTRA', label: 'Activities', icon: Trophy },
                 { id: 'HEALTH', label: 'Health', icon: Heart },
                 { id: 'FEES', label: 'Financials', icon: CreditCard },
                 { id: 'DISCIPLINE', label: 'Discipline', icon: ShieldCheck }
               ].map(t => (
                  <button 
                     key={t.id}
                     onClick={() => setDetailTab(t.id === 'TRANSCRIPT' ? null : t.id as any)}
                     className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all",
                        (t.id === 'TRANSCRIPT' && !detailTab) || detailTab === t.id 
                           ? "bg-zinc-900 text-white" 
                           : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                     )}
                  >
                     <t.icon size={11} /> {t.label}
                  </button>
               ))}

               <div className="flex-1" />

               <div className="relative">
                  <button 
                     onClick={() => setDownloadMenu(!downloadMenu)}
                     className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 text-[10px] font-black uppercase tracking-widest transition-colors"
                   >
                     <Download size={14} /> 
                     Download Results
                     <ChevronDown size={12} className={cn("transition-transform duration-300", downloadMenu && "rotate-180")} />
                  </button>

                   {downloadMenu && (
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-in slide-in-from-top-2 duration-300">
                         {[
                            { id: 'ALL', label: 'All Results' },
                            { id: 1, label: 'Form 1' },
                            { id: 2, label: 'Form 2' },
                            { id: 3, label: 'Form 3' },
                            { id: 4, label: 'Form 4' }
                         ].map(opt => (
                            <button 
                               key={opt.id}
                               onClick={() => {
                                  generateResultPDF(student, studentDetails, schoolInfo, opt.id as any);
                                  setDownloadMenu(false);
                               }}
                               className="w-full px-6 py-4 text-left text-[9px] font-black uppercase text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors border-b border-zinc-50 dark:border-zinc-800 last:border-none"
                            >
                               {opt.label}
                            </button>
                         ))}
                      </div>
                   )}
               </div>
            </div>

            {/* Ultra-Minimalist Stats Row */}
            <div className="flex flex-wrap gap-x-12 gap-y-6 pb-12 border-b border-zinc-50 dark:border-zinc-900">
               {(() => {
                  const totalDue = studentDetails.fees.reduce((acc, f) => acc + (f.amount_due || 0), 0);
                  const totalPaid = studentDetails.fees.reduce((acc, f) => acc + (f.amount_paid || 0), 0);
                  const balance = totalDue - totalPaid;
                  
                  const avg = studentDetails.results.length > 0 
                     ? (studentDetails.results.reduce((acc, r) => acc + Number(r.marks || 0), 0) / studentDetails.results.length).toFixed(1) 
                     : '0.0';

                  return (
                     <>
                        <div className="space-y-1">
                           <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Mean Mark</p>
                           <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{avg}%</p>
                        </div>

                        <div className="space-y-1">
                           <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Fees Balance</p>
                           <p className={cn("text-sm font-black", balance > 0 ? "text-amber-600" : "text-emerald-600")}>
                                {formatCurrency(Math.abs(balance))} {balance > 0 ? 'DR' : 'CR'}
                           </p>
                        </div>

                        <div className="space-y-1">
                           <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Class Teacher</p>
                           <p className="text-sm font-black text-zinc-800 dark:text-zinc-200 uppercase tracking-tighter">
                                {student.stream?.teacher?.full_name || 'NONE'}
                           </p>
                        </div>

                        <div className="space-y-1">
                           <p className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Discipline</p>
                           <p className={cn("text-sm font-black uppercase tracking-tighter", studentDetails.discipline.length > 0 ? "text-amber-600" : "text-zinc-900 dark:text-zinc-100")}>
                                {studentDetails.discipline.length > 0 ? `${studentDetails.discipline.length} Records` : 'CLEAN'}
                           </p>
                        </div>
                     </>
                  );
               })()}
            </div>
            
            {/* Sections Content */}
            {detailTab === 'ACADEMIC' && (
              <div className="space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Enrolled Subjects</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(studentDetails.subjects.length > 0 ? studentDetails.subjects : subjects_list.map(n => ({ subject: { name: n } }))).map((s: any) => (
                    <div key={s.id || s.subject.name} className="p-6 bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                      <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">Subject</p>
                      <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{s.subject?.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailTab === 'EXTRA' && (
              <div className="space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Co-Curricular Activities</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {studentDetails.activities.map((a: any) => (
                    <div key={a.id} className="p-6 bg-emerald-50/30 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
                      <Trophy size={20} className="text-emerald-500 mb-4" />
                      <p className="text-sm font-black text-emerald-900 dark:text-emerald-100">{a.activity?.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailTab === 'HEALTH' && (
              <div className="space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Medical Record</h3>
                {studentDetails.health ? (
                  <div className="p-10 bg-rose-50/30 dark:bg-rose-900/10 rounded-3xl border border-rose-100 dark:border-rose-900/30">
                     <Heart size={24} className="text-rose-500 mb-4" />
                     <p className="text-lg font-black text-rose-900 dark:text-rose-100 mb-2">Patient Dossier</p>
                     <p className="text-[10px] font-black uppercase text-rose-400 mb-4 tracking-widest">Blood Group: {studentDetails.health.blood_group || 'O+'}</p>
                     <p className="text-sm text-rose-800/70 dark:text-rose-200/50 leading-relaxed font-medium">
                       {studentDetails.health.emergency_notes || 'No critical emergency notes currently on file.'}
                     </p>
                  </div>
                ) : <p className="text-zinc-400 font-bold uppercase text-[10px]">No medical alerts found.</p>}
              </div>
            )}

            {detailTab === 'FEES' && (
              <div className="space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Financial Statement</h3>
                <div className="bg-zinc-50 dark:bg-zinc-900 rounded-3xl overflow-hidden border border-zinc-100 dark:border-zinc-800">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-zinc-100 dark:border-zinc-800">
                        <th className="px-8 py-4 text-[9px] font-black uppercase text-zinc-400">Reference</th>
                        <th className="px-8 py-4 text-[9px] font-black uppercase text-zinc-400">Description</th>
                        <th className="px-8 py-4 text-[9px] font-black uppercase text-zinc-400 text-right">Amount</th>
                        <th className="px-8 py-4 text-[9px] font-black uppercase text-zinc-400 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {studentDetails.fees.length > 0 ? studentDetails.fees.map((f: any) => (
                        <tr key={f.id}>
                          <td className="px-8 py-4 text-[10px] font-black text-zinc-400 uppercase">{f.id.slice(0, 8)}</td>
                          <td className="px-8 py-4 text-[11px] font-black text-zinc-900 dark:text-zinc-100">{f.description || 'Institutional Payment'}</td>
                          <td className="px-8 py-4 text-[11px] font-black text-zinc-900 dark:text-zinc-100 text-right">Ksh {Number(f.amount_paid).toLocaleString()}</td>
                          <td className="px-8 py-4 text-center">
                            <Badge variant="success" className="bg-emerald-100 text-emerald-700 text-[8px] border-none font-bold">{f.status || 'PAID'}</Badge>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4} className="px-8 py-10 text-center text-zinc-400 font-black uppercase text-[10px]">No transaction history.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {detailTab === 'DISCIPLINE' && (
              <div className="space-y-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-zinc-400">Conduct Report</h3>
                {studentDetails.discipline.length > 0 ? (
                  <div className="space-y-4">
                    {studentDetails.discipline.map((d: any) => (
                      <div key={d.id} className="p-6 bg-amber-50/30 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-900/30">
                        <ShieldCheck size={20} className="text-amber-500 mb-4" />
                        <p className="text-sm font-black text-amber-900 dark:text-amber-100">{d.violation_type}</p>
                        <p className="text-xs text-amber-800/60 dark:text-amber-200/50 mt-1">{d.action_taken}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-10 bg-zinc-50 dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 text-center">
                    <p className="text-[10px] font-black uppercase text-zinc-400">Exemplary conduct. No records found.</p>
                  </div>
                )}
              </div>
            )}

            {/* ALL-YEAR TRANSCRIPT PORTFOLIO - Only visible when NO tab is selected */}
            {!detailTab && (
              <div className="space-y-20">
               {[1, 2, 3, 4].map(formNum => {
                  const formSubjects = studentDetails.subjects.length > 0 ? studentDetails.subjects : subjects_list.map(n => ({ subject: { name: n } }));
                  
                  // Calculate the specific year for this Form level
                  const currentFormLevel = parseInt(student.stream?.class?.level || student.stream?.class?.name?.slice(-1) || '4');
                  // Use the latest result year if available, otherwise default to a reasonable current year (2025 is common in this DB)
                  const latestResultYear = studentDetails.results.length > 0 
                    ? Math.max(...studentDetails.results.map(r => r.exam?.term?.year || 0)) 
                    : 2025;
                  
                  const targetYear = latestResultYear - (currentFormLevel - formNum);

                  return (
                     <div key={formNum} className="space-y-6">
                        <div className="flex items-center justify-between border-b border-zinc-50 dark:border-zinc-900 pb-4">
                           <div className="text-left">
                              <h3 className="text-lg font-black uppercase tracking-[0.2em] text-zinc-900 dark:text-zinc-100">Form {formNum} Results</h3>
                           </div>
                           <Badge variant="neutral" className="bg-zinc-50 dark:bg-zinc-900 text-zinc-400 text-[10px] px-6 border-none font-black">{targetYear} Academic Year</Badge>
                        </div>

                        <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-zinc-100/50 dark:shadow-none">
                           <table className="w-full text-left border-collapse">
                              <thead>
                                 <tr className="bg-zinc-50/50 dark:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800">
                                    <th rowSpan={2} className="px-8 py-6 text-[9px] font-black uppercase text-zinc-400 w-36">Subject</th>
                                    {terms.map(t => (
                                       <th key={t} colSpan={2} className="px-4 py-3 text-[9px] font-black uppercase text-zinc-600 dark:text-zinc-300 border-l border-b border-zinc-100 dark:border-zinc-800 text-center tracking-widest">{t}</th>
                                    ))}
                                 </tr>
                                 <tr className="bg-zinc-50/20 dark:bg-zinc-800/20 border-b border-zinc-100 dark:border-zinc-800">
                                    {terms.map(t => (
                                       <React.Fragment key={t}>
                                          <th className="px-3 py-2 text-[7px] font-black uppercase text-zinc-400 text-center border-l border-zinc-100 dark:border-zinc-800">Mid-Term</th>
                                          <th className="px-3 py-2 text-[7px] font-black uppercase text-zinc-400 text-center border-l border-zinc-100 dark:border-zinc-800">End-Term</th>
                                       </React.Fragment>
                                    ))}
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                                 {formSubjects.map((s: any) => (
                                    <tr key={s.id || s.subject?.name} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                                       <td className="px-8 py-5 text-[10px] font-black text-zinc-800 dark:text-zinc-200 uppercase leading-none tracking-tighter">
                                          {s.subject?.name}
                                       </td>
                                       {terms.map(t => {
                                           const tResults = studentDetails.results.filter(r => {
                                             const rTermName = (r.exam?.term?.name || '').toUpperCase();
                                             const rExamName = (r.exam?.name || '').toUpperCase();
                                             const searchTerm = t.toUpperCase();
                                             
                                             const termMatches = rTermName.includes(searchTerm) || rExamName.includes(searchTerm);
                                             const subjectMatches = r.subject?.name?.trim().toLowerCase() === s.subject?.name?.trim().toLowerCase();
                                             
                                             // Resilient Year/Form Matching:
                                             const rYear = r.exam?.term?.year;
                                             const yearMatches = rYear === targetYear || rYear === (targetYear + 1) || rYear === (targetYear - 1);
                                             const nameExplicitMatch = rTermName.includes('FORM ' + formNum) || rExamName.includes('FORM ' + formNum);
                                             
                                             return subjectMatches && termMatches && (yearMatches || nameExplicitMatch);
                                          });
                                          const mid = tResults.find(r => r.exam?.type === 'MID_TERM' || r.exam?.name?.toUpperCase().includes('MID') || r.exam?.type === 'MIDTERM');
                                          const end = tResults.find(r => r.exam?.type === 'END_TERM' || r.exam?.name?.toUpperCase().includes('END') || r.exam?.type === 'ENDTERM');
                                          
                                          return (
                                             <React.Fragment key={t}>
                                                <td className="px-3 py-5 text-[10px] font-black text-center text-zinc-400 border-l border-zinc-50 dark:border-zinc-800">
                                                   {mid ? `${mid.marks}${mid.grade ? ' ' + mid.grade : ''}` : '-'}
                                                </td>
                                                <td className="px-3 py-5 text-[11px] font-black text-center text-zinc-900 dark:text-zinc-100 border-l border-zinc-50 dark:border-zinc-800">
                                                   {end ? `${end.marks}${end.grade ? ' ' + end.grade : ''}` : '-'}
                                                </td>
                                             </React.Fragment>
                                          );
                                       })}
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     </div>
                  );
                })}
              </div>
            )}
         </div>


         {/* 4. Institutional Signature Footer */}
         <div className="mt-24 pt-10 border-t border-zinc-100 dark:border-zinc-900 grid grid-cols-2 gap-20 opacity-40 mb-10">
            <div className="text-left space-y-4">
               <div className="h-0.5 w-48 bg-zinc-200 dark:bg-zinc-800" />
               <p className="text-[8px] font-black uppercase text-zinc-500">Principal Signature</p>
            </div>
            <div className="text-right space-y-4">
               <div className="h-0.5 w-48 bg-zinc-200 dark:bg-zinc-800 ml-auto" />
               <p className="text-[8px] font-black uppercase text-zinc-500">Official Stamp</p>
            </div>
         </div>
         
         <div className="mt-10 py-4 text-center border-t border-zinc-50 dark:border-zinc-900 opacity-30">
            <p className="text-[7px] font-black uppercase tracking-[0.4em] text-zinc-400">P3L School Management System | Matta Develops</p>
         </div>
      </div>
  );
};
