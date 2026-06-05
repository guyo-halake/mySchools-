import React, { useState, useEffect } from 'react';
import { 
  Eye, Pencil, FileText, Download, UserPlus, 
  Mail, Phone, BookOpen, GraduationCap, CreditCard, AlertTriangle, X, Star, 
  ChevronLeft, Printer, Trash2, MessageSquare, ChevronDown, ExternalLink, Info, 
  User, MapPin, Calendar, Briefcase, Heart, TrendingUp, Activity, History, Trophy, 
  ShieldCheck, CheckCircle2, AlertCircle, Plus, Sparkles
} from 'lucide-react';
import { Button, Badge } from './UI';
import { cn, formatCurrency } from '../utils/utils';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface StudentFullDetailsViewProps {
  student: any;
  onClose: () => void;
}

export const StudentFullDetailsView: React.FC<StudentFullDetailsViewProps> = ({ student: initialStudent, onClose }) => {
  const { user } = useAuth();
  const [detailTab, setDetailTab] = useState<'CBC_FORMATIVE' | 'CBC_SUMMATIVE' | 'HEALTH' | 'FEES' | 'DISCIPLINE' | null>(null);
  const [downloadMenu, setDownloadMenu] = useState(false);
  const [student, setStudent] = useState<any>(initialStudent);
  const [loading, setLoading] = useState(true);
  
  const [details, setDetails] = useState<{
    cbcFormative: any[],
    cbcSummative: any[],
    health: any,
    discipline: any[],
    fees: any[]
  }>({
    cbcFormative: [],
    cbcSummative: [],
    health: null,
    discipline: [],
    fees: []
  });

  useEffect(() => {
    if (initialStudent && user?.school_id) {
      const fetchData = async () => {
        setLoading(true);
        try {
          const [
            fullStudent, 
            formative, 
            summative, 
            health, 
            disc, 
            fees
          ] = await Promise.all([
            api.getStudentById(initialStudent.id),
            api.getCBCStudentAssessments(initialStudent.id, user.school_id),
            api.getCBCProjectSubmissions(initialStudent.id),
            api.getHealthRecord(initialStudent.id),
            api.getDisciplinaryRecords(initialStudent.id),
            api.getStudentFees(initialStudent.id)
          ]);

          if (fullStudent) setStudent(fullStudent);
          
          setDetails({
            cbcFormative: formative || [],
            cbcSummative: summative || [],
            health: health || null,
            discipline: disc || [],
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
  }, [initialStudent, user?.school_id]);

  const getRatingBadge = (rating: string) => {
    if (!rating) return 'bg-zinc-100 text-zinc-600';
    if (rating.startsWith('EE')) return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    if (rating.startsWith('ME')) return 'bg-blue-50 text-blue-600 border-blue-200';
    if (rating.startsWith('AE')) return 'bg-amber-50 text-amber-600 border-amber-200';
    if (rating.startsWith('BE')) return 'bg-rose-50 text-rose-600 border-rose-200';
    return 'bg-zinc-100 text-zinc-600';
  };

  const getRatingLabel = (rating: string) => {
    if (!rating) return 'Unrated';
    if (rating.startsWith('EE')) return 'Exceeding';
    if (rating.startsWith('ME')) return 'Meeting';
    if (rating.startsWith('AE')) return 'Approaching';
    if (rating.startsWith('BE')) return 'Below';
    return rating;
  };

  const streamName = student.stream ? `${student.stream.class?.name?.replace(/Form/gi, 'Grade') || ''} ${student.stream.name}` : 'Unassigned';
  const totalDue = details.fees.reduce((acc, f) => acc + (f.amount_due || 0), 0);
  const totalPaid = details.fees.reduce((acc, f) => acc + (f.amount_paid || 0), 0);
  const balance = totalDue - totalPaid;

  return (
    <div className="animate-in fade-in duration-700 max-w-[1600px] mx-auto py-6 px-4 bg-white min-h-screen" data-ai-context="student_profile" data-ai-student-id={student.id}>
      
      {/* 1. Master Identity Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 pb-8 mb-6">
        <button onClick={onClose} className="p-2 hover:bg-zinc-50 rounded-full transition-colors mr-6">
          <ChevronLeft size={20} className="text-zinc-600" />
        </button>
        <div className="flex-1 text-left" data-ai-metric="true" data-ai-category="identity">
           <h1 className="text-3xl font-black tracking-tight text-zinc-950 uppercase leading-none">
              {student.profile?.full_name || student.name}
           </h1>
           <div className="flex items-center gap-4 mt-3">
              <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">ADM: {student.adm_no || student.admissionNumber}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
              <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">{streamName}</span>
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-200" />
              <Badge variant="neutral" className="bg-amber-100 text-amber-700 text-[10px] border-none font-black px-3 rounded-full uppercase">CBC DOSSIER</Badge>
           </div>
        </div>
      </div>

      <div className="flex-1 w-full space-y-8">
          
          {/* Navigation Row */}
          <div className="flex flex-wrap items-center gap-2 mb-8 border-b border-zinc-100 pb-2">
              {[
                { id: 'CBC_FORMATIVE', label: 'Formative (Classwork)', icon: Activity },
                { id: 'CBC_SUMMATIVE', label: 'Summative (Projects)', icon: FileText },
                { id: 'HEALTH', label: 'Health Records', icon: Heart },
                { id: 'FEES', label: 'Financials', icon: CreditCard },
                { id: 'DISCIPLINE', label: 'Discipline', icon: ShieldCheck }
              ].map(t => (
                <button 
                    key={t.id}
                    onClick={() => setDetailTab(t.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                      (!detailTab && t.id === 'CBC_FORMATIVE') || detailTab === t.id 
                          ? "bg-zinc-950 text-white shadow-md" 
                          : "text-zinc-500 hover:bg-zinc-100"
                    )}
                >
                    <t.icon size={14} /> {t.label}
                </button>
              ))}
          </div>

          {/* AI Metrics Row */}
          {loading ? (
             <div className="h-20 animate-pulse bg-zinc-50 rounded-2xl border border-zinc-100" />
          ) : (
            <div className="flex flex-wrap gap-x-12 gap-y-6 pb-12 border-b border-zinc-100" data-ai-metric="true" data-ai-category="quick_stats">
                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Fees Balance</p>
                  <p className={cn("text-lg font-black", balance > 0 ? "text-rose-600" : "text-emerald-600")}>
                      Ksh {Math.abs(balance).toLocaleString()} {balance > 0 ? 'Arrears' : 'Cleared'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">CBC Formative Logs</p>
                  <p className="text-lg font-black text-zinc-950">{details.cbcFormative.length} Observations</p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Summative Projects</p>
                  <p className="text-lg font-black text-zinc-950">{details.cbcSummative.length} Submissions</p>
                </div>

                <div className="space-y-1.5">
                  <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Conduct Status</p>
                  <p className={cn("text-lg font-black uppercase tracking-tighter", details.discipline.length > 0 ? "text-rose-600" : "text-emerald-600")}>
                      {details.discipline.length > 0 ? `${details.discipline.length} Violations` : 'Exemplary'}
                  </p>
                </div>
            </div>
          )}
          
          {/* Main Content Area */}
          {(!detailTab || detailTab === 'CBC_FORMATIVE') && (
            <div className="space-y-6 animate-in fade-in" data-ai-metric="true" data-ai-category="academic_formative">
              <div className="flex items-center gap-3">
                 <Sparkles size={20} className="text-amber-500" />
                 <h3 className="text-lg font-black uppercase tracking-tight text-zinc-950">Formative Competencies</h3>
              </div>
              
              {details.cbcFormative.length === 0 ? (
                 <div className="p-16 text-center border border-zinc-200 rounded-3xl bg-zinc-50">
                    <Activity size={40} className="mx-auto text-zinc-300 mb-4" />
                    <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">No formative observations recorded yet.</p>
                 </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {details.cbcFormative.map((f: any) => (
                    <div key={f.id} className="p-6 bg-white rounded-3xl border border-zinc-200 shadow-sm hover:border-zinc-300 transition-colors flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between">
                          <span className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded-md text-[9px] font-black uppercase tracking-widest">
                            {f.learning_area?.name || 'General Area'}
                          </span>
                          <span className={cn("px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border", getRatingBadge(f.rubric_rating))}>
                            {f.rubric_rating} - {getRatingLabel(f.rubric_rating)}
                          </span>
                        </div>
                        <div>
                           <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Strand: {f.cbc_strands?.name}</p>
                           <p className="text-sm font-black text-zinc-900 mt-0.5 leading-tight">{f.cbc_sub_strands?.name}</p>
                        </div>
                        <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                           <p className="text-xs font-medium text-zinc-600 italic">"{f.teacher_comment || 'No facilitator remarks provided.'}"</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-zinc-100 flex items-center justify-between">
                         <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                           {new Date(f.created_at).toLocaleDateString()}
                         </span>
                         {f.evidence_url && (
                            <a href={f.evidence_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] font-black text-blue-600 hover:underline">
                               <ExternalLink size={12} /> Evidence
                            </a>
                         )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {detailTab === 'CBC_SUMMATIVE' && (
            <div className="space-y-6 animate-in fade-in" data-ai-metric="true" data-ai-category="academic_summative">
              <div className="flex items-center gap-3">
                 <FileText size={20} className="text-blue-600" />
                 <h3 className="text-lg font-black uppercase tracking-tight text-zinc-950">Summative Projects</h3>
              </div>

              {details.cbcSummative.length === 0 ? (
                 <div className="p-16 text-center border border-zinc-200 rounded-3xl bg-zinc-50">
                    <FileText size={40} className="mx-auto text-zinc-300 mb-4" />
                    <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">No summative projects evaluated yet.</p>
                 </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {details.cbcSummative.map((sub: any) => (
                     <div key={sub.id} className="flex gap-6 p-6 bg-white rounded-3xl border border-zinc-200 shadow-sm">
                        <div className="flex-1 space-y-3">
                           <div className="flex items-center gap-2">
                              <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-[9px] font-black uppercase tracking-widest">
                                 {sub.project?.learning_area?.name || 'Project'}
                              </span>
                           </div>
                           <h4 className="text-base font-black text-zinc-950 leading-tight">{sub.project?.title}</h4>
                           <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-100">
                              <p className="text-xs font-medium text-zinc-600">"{sub.teacher_comment || 'No facilitator remarks.'}"</p>
                           </div>
                        </div>
                        <div className="w-32 shrink-0 flex flex-col items-end gap-2">
                           <span className={cn("px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-widest border text-center w-full", getRatingBadge(sub.rubric_rating))}>
                             {sub.rubric_rating}
                           </span>
                           {sub.evidence_url && (
                              <a href={sub.evidence_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded w-full justify-center">
                                 <ExternalLink size={12} /> View Art
                              </a>
                           )}
                           <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-auto">
                              {new Date(sub.created_at).toLocaleDateString()}
                           </span>
                        </div>
                     </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {detailTab === 'HEALTH' && (
            <div className="space-y-6 animate-in fade-in" data-ai-metric="true" data-ai-category="health">
              <h3 className="text-lg font-black uppercase tracking-tight text-zinc-950">Medical Record</h3>
              {details.health ? (
                <div className="p-10 bg-rose-50/50 rounded-3xl border border-rose-100 max-w-2xl">
                   <Heart size={28} className="text-rose-500 mb-6" />
                   <p className="text-[10px] font-black uppercase text-rose-500 mb-2 tracking-widest">Blood Group</p>
                   <p className="text-2xl font-black text-rose-950 mb-6">{details.health.blood_group || 'Not Recorded'}</p>
                   
                   <p className="text-[10px] font-black uppercase text-rose-500 mb-2 tracking-widest">Emergency Directives & Allergies</p>
                   <div className="p-4 bg-white/60 rounded-2xl border border-rose-200/50">
                     <p className="text-sm text-rose-900 leading-relaxed font-medium">
                       {details.health.emergency_notes || 'No critical emergency notes currently on file.'}
                     </p>
                   </div>
                </div>
              ) : <p className="text-zinc-400 font-bold uppercase text-[10px]">No medical alerts found.</p>}
            </div>
          )}

          {detailTab === 'FEES' && (
            <div className="space-y-6 animate-in fade-in" data-ai-metric="true" data-ai-category="financials">
              <h3 className="text-lg font-black uppercase tracking-tight text-zinc-950">Financial Statement</h3>
              <div className="bg-white rounded-3xl overflow-hidden border border-zinc-200 shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200">
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Transaction Ref</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Description</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right">Billed</th>
                      <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right">Paid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {details.fees.length > 0 ? details.fees.map((f: any) => (
                      <tr key={f.id} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-4 text-xs font-mono font-bold text-zinc-400">{f.id.slice(0, 8)}</td>
                        <td className="px-6 py-4 text-xs font-black text-zinc-900">{f.description || 'Institutional Payment'}</td>
                        <td className="px-6 py-4 text-xs font-black text-zinc-900 text-right">Ksh {(f.amount_due || 0).toLocaleString()}</td>
                        <td className="px-6 py-4 text-xs font-black text-emerald-600 text-right">Ksh {(f.amount_paid || 0).toLocaleString()}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-zinc-400 font-black uppercase tracking-widest text-[10px]">No transaction history found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {detailTab === 'DISCIPLINE' && (
            <div className="space-y-6 animate-in fade-in" data-ai-metric="true" data-ai-category="discipline">
              <h3 className="text-lg font-black uppercase tracking-tight text-zinc-950">Conduct Report</h3>
              {details.discipline.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {details.discipline.map((d: any) => (
                    <div key={d.id} className="p-6 bg-white rounded-3xl border border-rose-100 shadow-sm border-l-4 border-l-rose-500">
                      <div className="flex items-center gap-2 mb-3">
                         <ShieldCheck size={16} className="text-rose-500" />
                         <span className="text-[9px] font-black uppercase tracking-widest text-rose-500">Violation Record</span>
                      </div>
                      <p className="text-base font-black text-zinc-950 leading-tight mb-2">{d.violation_type}</p>
                      <p className="text-xs text-zinc-600 font-medium bg-zinc-50 p-3 rounded-xl border border-zinc-100">Action: {d.action_taken}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 bg-emerald-50 rounded-3xl border border-emerald-100 text-center max-w-2xl">
                  <CheckCircle2 size={40} className="mx-auto text-emerald-400 mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest text-emerald-700">Exemplary conduct. No records found.</p>
                </div>
              )}
            </div>
          )}
      </div>

      {/* Footer */}
      <div className="mt-20 pt-8 border-t border-zinc-100 grid grid-cols-2 gap-12 opacity-40">
         <div className="space-y-3">
            <div className="h-0.5 w-32 bg-zinc-300" />
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Authorized Signature</p>
         </div>
      </div>
    </div>
  );
};

