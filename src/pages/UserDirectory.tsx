import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye,
  Pencil,
  FileText, 
  Download, 
  UserPlus, 
  Mail,
  Phone,
  BookOpen,
  GraduationCap,
  CreditCard,
  AlertTriangle,
  X,
  Star,
  ChevronLeft,
  Printer,
  Trash2,
  MessageSquare,
  ChevronDown,
  ExternalLink,
  Info,
  User,
  MapPin,
  Calendar,
  Briefcase,
  Heart,
  TrendingUp,
  Activity,
  History,
  Trophy,
  ShieldCheck
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
  const [detailTab, setDetailTab] = useState<'ACADEMIC' | 'EXTRA' | 'HEALTH' | 'FEES' | 'DISCIPLINE'>('ACADEMIC');
  const [transcriptForm, setTranscriptForm] = useState<number>(4);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Search Logic
  const filteredData = useMemo(() => {
    return activeTab === 'STUDENT' 
      ? students.filter(s => (s.profile?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || s.adm_no.includes(searchQuery))
      : teachers.filter(t => (t.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()));
  }, [activeTab, students, teachers, searchQuery]);

  const subjects = ['Mathematics', 'English', 'Kiswahili', 'Physics', 'Chemistry', 'Biology', 'History', 'Geography', 'C.R.E'];
  const terms = ['Term 1', 'Term 2', 'Term 3'];

  const getStudentResult = (studentId: string, subject: string, term: string, type: string, form: number) => {
    return '-'; 
  };

  const generateResultPDF = (student: any) => {
    const doc = new jsPDF();
    doc.setFontSize(14); doc.text(schoolInfo?.name || "SCHOOL NAME", 105, 20, { align: 'center' });
    doc.setFontSize(10); doc.text(`TRANSCRIPT: ${student.profile?.full_name}`, 105, 30, { align: 'center' });
    autoTable(doc, {
      startY: 40,
      head: [['Subject', 'T1 MID', 'T1 END', 'T2 MID', 'T2 END', 'T3 MID', 'T3 END']],
      body: subjects.map(s => [s, '-', '-', '-', '-', '-', '-']),
    });
    doc.save(`${student.profile?.full_name}_Transcript.pdf`);
  };

  const StudentDetails = ({ student }: { student: any }) => (
    <div className="space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto py-8 text-zinc-900 border-zinc-100">
      
      {/* Detail Header */}
      <div className="flex items-center justify-between pb-6 border-b border-zinc-100 dark:border-zinc-800">
        <button onClick={() => setViewMode('LIST')} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 transition-all">
          <ChevronLeft size={14} /> Back to Directory
        </button>
        <div className="flex items-center gap-3">
          <button className="w-9 h-9 rounded-full border border-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-all" onClick={() => generateResultPDF(student)}><Download size={16} /></button>
          <button className="w-9 h-9 rounded-full border border-zinc-100 flex items-center justify-center text-emerald-500 hover:bg-emerald-50 transition-all"><MessageSquare size={16} /></button>
          <button className="w-9 h-9 rounded-full border border-zinc-100 flex items-center justify-center text-orange-400 hover:bg-orange-50 transition-all"><AlertTriangle size={16} /></button>
        </div>
      </div>

      {/* Identity Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-start">
        <div className="md:col-span-2 space-y-4 text-left">
          <h1 className="text-4xl font-black tracking-tighter text-zinc-800 dark:text-zinc-100">{student.profile?.full_name}</h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="space-y-0.5">
              <p className="text-[9px] font-black uppercase text-zinc-300">Admission No</p>
              <p className="text-sm font-bold">{student.adm_no}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] font-black uppercase text-zinc-300">Class</p>
              <p className="text-sm font-bold">Form {student.stream?.class?.name?.slice(-1)} - {student.stream?.name || 'G'}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] font-black uppercase text-zinc-300">Teacher</p>
              <p className="text-sm font-bold">{student.stream?.teacher?.full_name || 'Mr. Kamau'}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] font-black uppercase text-zinc-300">Guardian</p>
              <p className="text-sm font-bold">Guyo Halake (F)</p>
            </div>
          </div>
        </div>
        <div className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-3xl border border-zinc-100">
           <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black uppercase text-zinc-400">Current Standing</p>
              <Badge className="bg-emerald-500 text-white font-black uppercase text-[8px]">Active</Badge>
           </div>
           <div className="space-y-3">
              <div className="flex justify-between items-center"><span className="text-xs font-bold text-zinc-500">Academic Trend</span><TrendingUp size={14} className="text-emerald-500" /></div>
              <div className="flex justify-between items-center"><span className="text-xs font-bold text-zinc-500">Attendance</span><span className="text-xs font-black">98.2%</span></div>
           </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-10 border-b border-zinc-50 overflow-x-auto no-scrollbar">
        {[
          { id: 'ACADEMIC', label: 'Subjects & Academics', icon: BookOpen },
          { id: 'EXTRA', label: 'Extra-Curricular', icon: Trophy },
          { id: 'HEALTH', label: 'Health Records', icon: Heart },
          { id: 'FEES', label: 'Financials', icon: CreditCard },
          { id: 'DISCIPLINE', label: 'Disciplinary', icon: ShieldCheck }
        ].map(t => (
          <button key={t.id} onClick={() => setDetailTab(t.id as any)} className={cn("flex items-center gap-2 pb-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all relative", detailTab === t.id ? "text-zinc-900 border-b-2 border-zinc-900" : "text-zinc-300 hover:text-zinc-500")}>
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[200px] text-left">
         {detailTab === 'ACADEMIC' && (
           <div className="grid grid-cols-2 gap-4">
             {subjects.map(s => <div key={s} className="p-3 bg-white border border-zinc-100 rounded-xl text-xs font-bold">{s}</div>)}
           </div>
         )}
         {detailTab === 'FEES' && <div className="text-2xl font-black">Fee Balance: <span className="text-emerald-500">Ksh 0.00</span></div>}
      </div>

      {/* Master Transcript Bottom */}
      <div className="space-y-6 pt-12 border-t border-zinc-100">
        <div className="flex items-center justify-between">
           <h3 className="text-xl font-black uppercase tracking-tight text-left">Academic History</h3>
           <div className="flex bg-zinc-100 p-1 rounded-xl">
              {[1, 2, 3, 4].map(f => (
                <button key={f} onClick={() => setTranscriptForm(f)} className={cn("px-6 py-2 rounded-lg text-xs font-black uppercase transition-all", transcriptForm === f ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-400")}>Form {f}</button>
              ))}
           </div>
        </div>
        <div className="overflow-x-auto bg-white rounded-2xl border border-zinc-100 overflow-hidden text-left shadow-sm">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-zinc-50/50">
                <th rowSpan={2} className="px-6 py-4 text-[10px] font-black uppercase text-zinc-400 border-r border-zinc-100 w-48">Subject</th>
                {terms.map(term => (<th key={term} colSpan={2} className="px-5 py-2 text-[9px] font-black uppercase text-center text-zinc-300 border-b border-r border-zinc-100">{term}</th>))}
                <th rowSpan={2} className="px-5 py-4 text-[10px] font-black uppercase text-zinc-400 border-l border-zinc-100">Remarks</th>
              </tr>
              <tr className="bg-zinc-50/20 border-b border-zinc-100">
                {terms.map(t => (
                  <React.Fragment key={t}>
                    <th className="px-3 py-2 text-[8px] font-black uppercase text-zinc-400 text-center border-r border-zinc-100">Mid</th>
                    <th className="px-3 py-2 text-[8px] font-black uppercase text-zinc-400 text-center border-r border-zinc-100">End</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 text-[10px] font-bold text-zinc-600 uppercase">
              {subjects.map(s => (
                <tr key={s} className="hover:bg-zinc-50"><td className="px-6 py-3 border-r border-zinc-100">{s}</td><td className="px-3 py-3 text-center border-r text-zinc-300">-</td><td className="px-3 py-3 text-center border-r text-zinc-300">-</td><td className="px-3 py-3 text-center border-r text-zinc-300">-</td><td className="px-3 py-3 text-center border-r text-zinc-300">-</td><td className="px-3 py-3 text-center border-r text-zinc-300">-</td><td className="px-3 py-3 text-center border-r text-zinc-300">-</td><td className="px-5 py-3 text-center text-zinc-200">-</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return viewMode === 'DETAILS' ? <StudentDetails student={selectedPerson} /> : (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Directory Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="text-left">
          <h1 className="text-xl font-black tracking-tight uppercase text-zinc-800">{schoolInfo?.name || 'School'} Directory</h1>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest leading-none">Administrative Command Center</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAddModalOpen(true)} size="sm" className="gap-2 bg-zinc-900 text-white font-black text-[10px] h-9 px-6 rounded-xl uppercase shadow-xl shadow-zinc-200">
            <UserPlus size={14} /> + ADD STUDENT
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-8 border-b border-zinc-100">
        <button onClick={() => setActiveTab('STUDENT')} className={cn("pb-3 text-[10px] font-black uppercase tracking-widest relative", activeTab === 'STUDENT' ? "text-zinc-900" : "text-zinc-400")}>
          Students ({students.length})
          {activeTab === 'STUDENT' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900" />}
        </button>
        <button onClick={() => setActiveTab('TEACHER')} className={cn("pb-3 text-[10px] font-black uppercase tracking-widest relative", activeTab === 'TEACHER' ? "text-zinc-900" : "text-zinc-400")}>
          Teachers ({teachers.length})
        </button>
      </div>

      {/* EXACT STUDENT TABLE RESTORED FOR THE LAST TIME */}
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
                      <button onClick={() => { setSelectedPerson(person); setViewMode('DETAILS'); }} className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900"><Eye size={14} /></button>
                      <button className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900"><Pencil size={14} /></button>
                      <div className="relative">
                        <button onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === person.id ? null : person.id); }} className="p-1.5 hover:bg-zinc-100 rounded-lg text-zinc-400 hover:text-zinc-900"><MoreVertical size={14} /></button>
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
                 <input type="text" placeholder="Full Name" className="w-full p-3 bg-zinc-50 border border-zinc-100 rounded-xl text-xs font-bold" value={newStudent.name} onChange={e => setNewStudent({...newStudent, name: e.target.value})} />
                 <input type="text" placeholder="ADM (Auto)" className="w-full p-3 bg-zinc-50 border border-zinc-100 rounded-xl text-xs font-bold" value={newStudent.adm_no} onChange={e => setNewStudent({...newStudent, adm_no: e.target.value})} />
               </div>
               <div className="space-y-4">
                 <input type="text" placeholder="Parent Name" className="w-full p-3 bg-zinc-50 border border-zinc-100 rounded-xl text-xs font-bold" value={newStudent.parent_name} onChange={e => setNewStudent({...newStudent, parent_name: e.target.value})} />
                 <input type="text" placeholder="Phone" className="w-full p-3 bg-zinc-50 border border-zinc-100 rounded-xl text-xs font-bold" value={newStudent.parent_phone} onChange={e => setNewStudent({...newStudent, parent_phone: e.target.value})} />
               </div>
            </div>
            <div className="mt-10 flex justify-end">
               <Button onClick={() => alert('Enrolled!')} className="bg-zinc-900 text-white rounded-xl h-12 px-10 uppercase font-black text-[10px] tracking-widest shadow-xl shadow-zinc-200">Complete Enrollment</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
