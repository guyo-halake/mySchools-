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
import { StudentFullDetailsView } from '../components/StudentFullDetailsView';
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

  // Removed redundant fetchData logic as it is now handled by StudentFullDetailsView

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

  return viewMode === 'DETAILS' ? <StudentFullDetailsView student={selectedPerson} onClose={() => setViewMode('LIST')} /> : (
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
