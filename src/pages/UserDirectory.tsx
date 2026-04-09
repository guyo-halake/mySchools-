import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { 
  Users, Search, Filter, MoreVertical, Eye, Pencil, FileText, Download, UserPlus, 
  Mail, Phone, BookOpen, GraduationCap, CreditCard, AlertTriangle, X, Star, 
  ChevronLeft, Printer, Trash2, MessageSquare, ChevronDown, ExternalLink, Info, 
  User, MapPin, Calendar, Briefcase, Heart, TrendingUp, Activity, History, Trophy, 
  ShieldCheck, CheckCircle2, AlertCircle, Plus
} from 'lucide-react';
import { Button, Card, Badge } from '../components/UI';
import { cn } from '../utils/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const UserDirectory: React.FC = () => {
  const { students, teachers, schoolInfo, streams, results } = useApp();
  const [activeTab, setActiveTab] = useState<'STUDENT' | 'TEACHER'>('STUDENT');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'LIST' | 'DETAILS'>('LIST');
  const [detailTab, setDetailTab] = useState<'ACADEMIC' | 'EXTRA' | 'HEALTH' | 'FEES' | 'DISCIPLINE' | null>(null);
  const [transcriptForm, setTranscriptForm] = useState<number>(4);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // REAL DATA STATE
  const [studentDetails, setStudentDetails] = useState<{
    subjects: any[],
    health: any,
    discipline: any[],
    activities: any[],
    results: any[]
  }>({
    subjects: [],
    health: null,
    discipline: [],
    activities: [],
    results: []
  });

  const subjects_list = ['Mathematics', 'English', 'Kiswahili', 'Physics', 'Chemistry', 'CRE', 'Business Studies', 'History', 'Government'];
  const terms = ['Term 1', 'Term 2', 'Term 3'];

  // Fetch student specific data when viewing details
  useEffect(() => {
    if (viewMode === 'DETAILS' && selectedPerson) {
      const fetchData = async () => {
        try {
          const [subs, health, disc, acts, resultsAll] = await Promise.all([
            api.getStudentSubjects(selectedPerson.id),
            api.getHealthRecord(selectedPerson.id),
            api.getDisciplinaryRecords(selectedPerson.id),
            api.getStudentActivities(selectedPerson.id),
            api.getStudentResultsAll(selectedPerson.id)
          ]);

          setStudentDetails({
            subjects: subs || [],
            health: health || null,
            discipline: disc || [],
            activities: acts || [],
            results: resultsAll || []
          });
        } catch (err) {
          console.error("Failed to fetch student details:", err);
        }
      };
      fetchData();
    }
  }, [viewMode, selectedPerson]);

  // Search Logic
  const filteredData = useMemo(() => {
    return activeTab === 'STUDENT' 
      ? students.filter(s => (s.profile?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.adm_no || '').includes(searchQuery))
      : teachers.filter(t => (t.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()));
  }, [activeTab, students, teachers, searchQuery]);

  const generateResultPDF = (student: any) => {
    const doc = new jsPDF();
    doc.setFontSize(14); doc.text(schoolInfo?.name || "SCHOOL NAME", 105, 20, { align: 'center' });
    doc.setFontSize(10); doc.text(`TRANSCRIPT: ${student.profile?.full_name}`, 105, 30, { align: 'center' });
    autoTable(doc, {
      startY: 40,
      head: [['Subject', 'T1 MID', 'T1 END', 'T2 MID', 'T2 END', 'T3 MID', 'T3 END']],
      body: studentDetails.subjects.map(s => [s.subject?.name || 'Subject', '-', '-', '-', '-', '-', '-']),
    });
    doc.save(`${student.profile?.full_name}_Transcript.pdf`);
  };

  const StudentDetails = ({ student }: { student: any }) => (
    <div className="animate-in fade-in duration-700 max-w-7xl mx-auto py-6 px-4">
      
      {/* 1. Master Identity Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 pb-8 mb-10">
        <button onClick={() => setViewMode('LIST')} className="p-2 hover:bg-zinc-50 rounded-full transition-colors mr-6">
          <ChevronLeft size={20} className="text-zinc-600 dark:text-zinc-400" />
        </button>
        <div className="flex-1 text-left">
           <h1 className="text-xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 uppercase leading-none">{student.profile?.full_name}</h1>
           <div className="flex items-center gap-4 mt-2">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">ADM {student.adm_no}</span>
              <div className="w-1 h-1 rounded-full bg-zinc-200" />
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">FORM {student.stream?.class?.name?.slice(-1)} {student.stream?.name}</span>
              <div className="w-1 h-1 rounded-full bg-zinc-200" />
              <Badge variant="success" className="bg-emerald-50 text-emerald-600 text-[8px] border-none font-black px-3">ACTIVE</Badge>
           </div>
        </div>
        <div className="flex items-center gap-3">
           <Button variant="outline" onClick={() => generateResultPDF(student)} className="h-10 w-10 p-0 rounded-xl border-zinc-100"><Download size={16} /></Button>
           <Button className="h-10 px-6 rounded-xl bg-zinc-900 text-white text-[10px] font-black uppercase shadow-xl shadow-zinc-200">Record Mark</Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-16 items-start">
         
         {/* LEFT SECTION: Institutional Transcript (80% Width) */}
         <div className="flex-1 w-full space-y-12">
            
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left border-b border-zinc-50 pb-10">
               <div>
                  <p className="text-[8px] font-black uppercase text-zinc-400 tracking-widest mb-1">Class Teacher</p>
                  <p className="text-[11px] font-black text-zinc-800">{student.stream?.teacher?.full_name || 'Mr. Kamau'}</p>
               </div>
               <div>
                  <p className="text-[8px] font-black uppercase text-zinc-400 tracking-widest mb-1">Account Balance</p>
                  <p className="text-[11px] font-black text-amber-600">Ksh 5,000.00 DR</p>
               </div>
               <div>
                  <p className="text-[8px] font-black uppercase text-zinc-400 tracking-widest mb-1">Current Mean</p>
                  <p className="text-[11px] font-black text-zinc-800">74.2 (B+)</p>
               </div>
               <div>
                  <p className="text-[8px] font-black uppercase text-zinc-400 tracking-widest mb-1">Rank</p>
                  <p className="text-[11px] font-black text-zinc-800">4 / 240</p>
               </div>
            </div>

            {/* ALL-YEAR TRANSCRIPT PORTFOLIO */}
            <div className="space-y-24">
               {[1, 2, 3, 4].map(formNum => {
                  const formSubjects = formNum === 1 ? subjects_list.map(n => ({ subject: { name: n } })) : studentDetails.subjects;
                  
                  return (
                     <div key={formNum} className="space-y-6">
                        <div className="flex items-center justify-between border-b border-zinc-50 pb-4">
                           <div className="text-left">
                              <h3 className="text-lg font-black uppercase tracking-[0.2em] text-zinc-900">Form {formNum} Results</h3>
                           </div>
                           <Badge variant="neutral" className="bg-zinc-50 text-zinc-400 text-[10px] px-6 border-none font-black">{2022 + formNum} Academic Year</Badge>
                        </div>

                        <div className="bg-white border border-zinc-100 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-zinc-100-50">
                           <table className="w-full text-left border-collapse">
                              <thead>
                                 <tr className="bg-zinc-50/50 border-b border-zinc-100">
                                    <th rowSpan={2} className="px-8 py-6 text-[9px] font-black uppercase text-zinc-400 w-36">Subject</th>
                                    {terms.map(t => (
                                       <th key={t} colSpan={2} className="px-4 py-3 text-[9px] font-black uppercase text-zinc-600 border-l border-b border-zinc-100 text-center tracking-widest">{t}</th>
                                    ))}
                                 </tr>
                                 <tr className="bg-zinc-50/20 border-b border-zinc-100">
                                    {terms.map(t => (
                                       <React.Fragment key={t}>
                                          <th className="px-3 py-2 text-[7px] font-black uppercase text-zinc-400 text-center border-l border-zinc-100">Mid-Term</th>
                                          <th className="px-3 py-2 text-[7px] font-black uppercase text-zinc-400 text-center border-l border-zinc-100">End-Term</th>
                                       </React.Fragment>
                                    ))}
                                 </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-50">
                                 {formSubjects.map((s: any) => (
                                    <tr key={s.id || s.subject?.name} className="hover:bg-zinc-50/50 transition-colors">
                                       <td className="px-8 py-5 text-[10px] font-black text-zinc-800 uppercase leading-none tracking-tighter">
                                          {s.subject?.name}
                                       </td>
                                       {terms.map(t => {
                                          const tResults = studentDetails.results.filter(r => {
                                             const rTermName = r.exam?.term?.name || '';
                                             return rTermName.includes(t) && 
                                                    rTermName.includes('Form ' + formNum) && 
                                                    r.subject?.name === s.subject?.name;
                                          });
                                          const mid = tResults.find(r => r.exam?.type === 'MID_TERM');
                                          const end = tResults.find(r => r.exam?.type === 'END_TERM');
                                          
                                          return (
                                             <React.Fragment key={t}>
                                                <td className="px-3 py-5 text-[10px] font-black text-center text-zinc-400 border-l border-zinc-50">
                                                   {mid ? `${mid.marks} ${mid.grade}` : '-'}
                                                </td>
                                                <td className="px-3 py-5 text-[11px] font-black text-center text-zinc-900 border-l border-zinc-50">
                                                   {end ? `${end.marks} ${end.grade}` : '-'}
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
         </div>

         {/* RIGHT SIDEBAR: Action Terminal (Compact actions) */}
         <div className="w-full lg:w-80 space-y-12 lg:sticky lg:top-6">
            <div className="text-left space-y-6">
               <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 ml-2">Quick Actions Hub</p>
               <div className="flex flex-col gap-2">
                  {[
                    { id: 'ACADEMIC', label: 'Subjects', icon: BookOpen },
                    { id: 'EXTRA', label: 'Activities', icon: Trophy },
                    { id: 'HEALTH', label: 'Health', icon: Heart },
                    { id: 'FEES', label: 'Financials', icon: CreditCard },
                    { id: 'DISCIPLINE', label: 'Discipline', icon: ShieldCheck }
                  ].map(t => (
                     <button 
                        key={t.id}
                        onClick={() => setDetailTab(detailTab === t.id ? null : t.id as any)}
                        className={cn(
                           "flex items-center justify-between px-6 py-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all",
                           detailTab === t.id 
                              ? "bg-zinc-900 border-zinc-900 text-white shadow-2xl shadow-zinc-200" 
                              : "bg-white border-zinc-100 text-zinc-500 hover:border-zinc-300"
                        )}
                     >
                        <div className="flex items-center gap-4">
                           <t.icon size={14} /> {t.label}
                        </div>
                        {detailTab === t.id ? <X size={12} /> : <Plus size={12} />}
                     </button>
                  ))}
               </div>
            </div>

            {/* Expanding Action Panel (Minimalist details) */}
            {detailTab && (
               <div className="p-6 bg-zinc-50/50 border border-zinc-100 rounded-[2.5rem] animate-in slide-in-from-right-4 fade-in duration-300 text-left">
                  {detailTab === 'ACADEMIC' && (
                     <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                           <p className="text-[9px] font-black uppercase text-zinc-400">Enrollment List</p>
                           <button className="text-zinc-900"><Plus size={14}/></button>
                        </div>
                        <div className="space-y-3">
                           {studentDetails.subjects.map(s => (
                              <div key={s.id} className="text-[10px] font-black text-zinc-800 uppercase">{s.subject?.name}</div>
                           ))}
                        </div>
                     </div>
                  )}

                  {detailTab === 'HEALTH' && (
                     <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                           <p className="text-[9px] font-black uppercase text-zinc-400">Health Ledger</p>
                           <button className="text-zinc-900"><Pencil size={12}/></button>
                        </div>
                        <div className="space-y-4">
                           <div className="flex items-center gap-3">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span className="text-[10px] font-black text-zinc-900 uppercase">BLOOD: {studentDetails.health?.blood_group || 'O+'}</span>
                           </div>
                           <p className="text-[10px] font-bold text-zinc-500 italic leading-relaxed">{studentDetails.health?.emergency_notes}</p>
                        </div>
                     </div>
                  )}

                  {detailTab === 'EXTRA' && (
                     <div className="space-y-4">
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                           <p className="text-[9px] font-black uppercase text-zinc-400">Activities</p>
                           <button className="text-zinc-900"><Plus size={14}/></button>
                        </div>
                        <div className="space-y-2">
                           {studentDetails.activities.map(a => (
                              <div key={a.id} className="flex items-center gap-3">
                                 <Trophy size={14} className="text-orange-400" />
                                 <span className="text-[10px] font-black text-zinc-800 uppercase">{a.activity?.name}</span>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}

                  {detailTab === 'FEES' && (
                     <div className="space-y-6">
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                           <p className="text-[9px] font-black uppercase text-zinc-400">Financials</p>
                        </div>
                        <Button className="w-full bg-zinc-900 text-white h-11 text-[9px] font-black uppercase rounded-2xl shadow-xl shadow-zinc-200">Pay Now</Button>
                     </div>
                  )}

                  {detailTab === 'DISCIPLINE' && (
                     <div className="space-y-6 text-left">
                        <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                           <p className="text-[9px] font-black uppercase text-zinc-400">Justice Ledger</p>
                           <button className="text-zinc-900"><Plus size={14}/></button>
                        </div>
                        <div className="space-y-5">
                           {studentDetails.discipline.map(d => (
                              <div key={d.id} className="space-y-1 group">
                                 <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black uppercase text-zinc-400 leading-none">{new Date(d.incident_date).toLocaleDateString()}</span>
                                    <span className="text-[8px] font-black uppercase text-red-500">{d.action_taken}</span>
                                 </div>
                                 <p className="text-[11px] font-black text-zinc-900 uppercase tracking-tighter">{d.incident_title}</p>
                                 <p className="text-[10px] font-bold text-zinc-400 italic leading-snug">{d.description}</p>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}
               </div>
            )}
         </div>
      </div>
    </div>
  );

  return viewMode === 'DETAILS' ? <StudentDetails student={selectedPerson} /> : (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Directory Header (Master Design - Unchanged) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="text-left">
          <h1 className="text-xl font-black tracking-tight uppercase text-zinc-800">{schoolInfo?.name || 'School'} Directory</h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest leading-none">Administrative Command Center</p>
        </div>
        
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search students, ADM or teachers..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 bg-zinc-50 border border-zinc-100 rounded-2xl text-[11px] font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all placeholder:text-zinc-300 uppercase tracking-tighter"
            />
          </div>
          <Button onClick={() => setIsAddModalOpen(true)} size="sm" className="gap-2 bg-zinc-900 text-white font-black text-[10px] h-10 px-6 rounded-2xl uppercase shadow-xl shadow-zinc-200 shrink-0">
            <UserPlus size={14} /> + ADD
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-8 border-b border-zinc-100">
        <button onClick={() => setActiveTab('STUDENT')} className={cn("pb-3 text-[10px] font-black uppercase tracking-widest relative", activeTab === 'STUDENT' ? "text-zinc-900" : "text-zinc-400")}>
          Students ({students.length})
          {activeTab === 'STUDENT' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900" />}
        </button>
        <button onClick={() => setActiveTab('TEACHER')} className={cn("pb-3 text-[10px] font-black uppercase tracking-widest relative", activeTab === 'TEACHER' ? "text-zinc-900" : "text-zinc-400")}>
          Teachers ({teachers.length})
        </button>
      </div>

      <div className="bg-white dark:bg-zinc-950 border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/50 border-b border-zinc-100">
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Student Name</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">ADM No</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Parent Info</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Class</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400">Status</th>
                <th className="px-6 py-4 text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filteredData.map((person) => (
                <tr key={person.id} className="group hover:bg-zinc-50/80 transition-colors">
                  <td className="px-6 py-4 text-left">
                      <span className="text-xs font-bold text-zinc-900">{person.profile?.full_name}</span>
                  </td>
                  <td className="px-6 py-4 text-left">
                    <span className="text-[10px] font-black text-zinc-500">{person.adm_no}</span>
                  </td>
                  <td className="px-6 py-4 text-left">
                    <div className="flex flex-col text-[10px] font-bold text-zinc-400 uppercase tracking-tighter leading-tight">
                      <span>guyo.h@example.com</span>
                      <span className="opacity-60">0768141129</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-left">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter">
                      Form {person.stream?.class?.name?.slice(-1)} - {person.stream?.name || 'G'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-left">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[9px] font-black uppercase tracking-tighter text-emerald-600">Active</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setSelectedPerson(person); setViewMode('DETAILS'); }} className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900 transition-all"><Eye size={14} /></button>
                      <button className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900 transition-all"><Pencil size={14} /></button>
                      <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === person.id ? null : person.id); }} className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900 transition-all"><MoreVertical size={14} /></button>
                        {openDropdown === person.id && (
                          <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-zinc-100 rounded-xl shadow-xl z-50 overflow-hidden">
                            <button className="w-full px-4 py-2 text-[10px] font-bold hover:bg-orange-50 text-orange-600 flex items-center gap-2">Suspend</button>
                            <button className="w-full px-4 py-2 text-[10px] font-bold hover:bg-red-50 text-red-600 flex items-center gap-2">Delete</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-8 border-b border-zinc-50 pb-4">
               <h2 className="text-xl font-black uppercase tracking-tight">Enroll Student</h2>
               <button onClick={() => setIsAddModalOpen(false)}><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 gap-8">
               <div className="space-y-4">
                 <input type="text" placeholder="Full Name" className="w-full p-3 bg-zinc-50 border border-zinc-100 rounded-xl text-xs font-bold" />
                 <input type="text" placeholder="ADM (Auto)" className="w-full p-3 bg-zinc-50 border border-zinc-100 rounded-xl text-xs font-bold" />
               </div>
               <div className="space-y-4">
                 <input type="text" placeholder="Parent Name" className="w-full p-3 bg-zinc-50 border border-zinc-100 rounded-xl text-xs font-bold" />
                 <input type="text" placeholder="Phone" className="w-full p-3 bg-zinc-50 border border-zinc-100 rounded-xl text-xs font-bold" />
               </div>
            </div>
            <div className="mt-10 flex justify-end">
               <Button onClick={() => setIsAddModalOpen(false)} className="bg-zinc-900 text-white rounded-xl h-12 px-10 uppercase font-black text-[10px] tracking-widest shadow-xl shadow-zinc-200">Complete Enrollment</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
