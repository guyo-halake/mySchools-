import React, { useState, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
import { cn, formatCurrency } from '../utils/utils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const UserDirectory: React.FC = () => {
  const { students, teachers, schoolInfo, streams, results, fees, classes } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'STUDENT' | 'TEACHER'>(
    location.pathname.includes('teacher') ? 'TEACHER' : 'STUDENT'
  );

  useEffect(() => {
    if (location.pathname.includes('teacher')) setActiveTab('TEACHER');
    else if (location.pathname.includes('student')) setActiveTab('STUDENT');
  }, [location.pathname]);

  const handleTabChange = (tab: 'STUDENT' | 'TEACHER') => {
    setActiveTab(tab);
    navigate(tab === 'TEACHER' ? '/teachers' : '/students', { replace: true });
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'LIST' | 'DETAILS'>('LIST');
  const [detailTab, setDetailTab] = useState<'ACADEMIC' | 'EXTRA' | 'HEALTH' | 'FEES' | 'DISCIPLINE' | null>(null);
  const [transcriptForm, setTranscriptForm] = useState<number>(4);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  // Advanced Filter States
  const [streamFilter, setStreamFilter] = useState<string>('ALL');
  const [financialFilter, setFinancialFilter] = useState<'ALL' | 'PAID' | 'ARREARS'>('ALL');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'MALE' | 'FEMALE'>('ALL');
  // const [performanceFilter, setPerformanceFilter] = useState<'ALL' | 'TOP_20' | 'BOTTOM_20'>('ALL');

  // Academic Analysis: Group results by student and calculate averages
  // const studentPerformance = useMemo(() => {
  //   const stats: Record<string, { total: number; count: number }> = {};
  //   results.forEach(r => {
  //     // Robust ID extraction: handles string ID, nested object ID, or joined profile ID
  //     let sid = "";
  //     if (typeof r.student_id === 'string') sid = r.student_id;
  //     else if (r.student_id && typeof r.student_id === 'object') sid = (r.student_id as any).id;
  //     else if (r.student && typeof r.student === 'object') sid = (r.student as any).id;
  //     
  //     if (!sid) return;
  //     if (!stats[sid]) stats[sid] = { total: 0, count: 0 };
  //     stats[sid].total += Number(r.marks || 0);
  //     stats[sid].count += 1;
  //   });
  //   
  //   const averages: Record<string, number> = {};
  //   Object.keys(stats).forEach(sid => {
  //     if (stats[sid].count > 0) {
  //       averages[sid] = stats[sid].total / stats[sid].count;
  //     }
  //   });
  //   return averages;
  // }, [results]);

  // Removed redundant fetchData logic as it is now handled by StudentFullDetailsView

  // Search & Advanced Filter Logic
  const filteredData = useMemo(() => {
    if (activeTab === 'TEACHER') {
      return teachers.filter(t => (t.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()));
    }

    return students.filter(s => {
      // Basic Search
      const searchMatch = (s.profile?.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (s.adm_no || '').includes(searchQuery);
      if (!searchMatch) return false;

      // Stream/Grade Filter
      if (streamFilter !== 'ALL' && s.stream_id !== streamFilter) return false;

      // Gender Filter
      // (Assuming gender might be in profile or we add it) - for now placeholder
      // if (genderFilter !== 'ALL' && s.profile?.gender !== genderFilter) return false;

      // Financial Filter
      if (financialFilter !== 'ALL') {
        const studentFees = fees.filter(f => f.student_id === s.id);
        const totalDue = studentFees.reduce((acc, f) => acc + (f.amount_due || 0), 0);
        const totalPaid = studentFees.reduce((acc, f) => acc + (f.amount_paid || 0), 0);
        const hasArrears = totalPaid < totalDue;

        if (financialFilter === 'PAID' && hasArrears) return false;
        if (financialFilter === 'ARREARS' && !hasArrears) return false;
      }

      return true;
    });

    // Academic Ranking Filter (Applied after basic filters)
    // if (performanceFilter === 'ALL' || activeTab === 'TEACHER') return afterBasics;

    // const ranked = [...afterBasics]
    //   .filter(s => studentPerformance[s.id] !== undefined)
    //   .sort((a, b) => {
    //     const avgA = studentPerformance[a.id] || 0;
    //     const avgB = studentPerformance[b.id] || 0;
    //     return performanceFilter === 'TOP_20' ? avgB - avgA : avgA - avgB;
    //   });

    // return ranked.slice(0, 20);
    return afterBasics;
  }, [activeTab, students, teachers, searchQuery, streamFilter, financialFilter, fees]);

  // local generateResultPDF removed in favor of utilities/pdf.ts to avoid conflict

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
        <button onClick={() => handleTabChange('STUDENT')} className={cn("pb-3 text-[10px] font-black uppercase tracking-widest relative", activeTab === 'STUDENT' ? "text-zinc-900" : "text-zinc-400")}>
          Students ({students.length})
          {activeTab === 'STUDENT' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900" />}
        </button>
        <button onClick={() => handleTabChange('TEACHER')} className={cn("pb-3 text-[10px] font-black uppercase tracking-widest relative", activeTab === 'TEACHER' ? "text-zinc-900" : "text-zinc-400")}>
          Teachers ({teachers.length})
          {activeTab === 'TEACHER' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900" />}
        </button>
      </div>

      {activeTab === 'STUDENT' && (
        <div className="flex flex-wrap items-center gap-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Stream:</span>
            <select 
              value={streamFilter}
              onChange={(e) => setStreamFilter(e.target.value)}
              className="bg-transparent text-[10px] font-bold text-zinc-900 outline-none cursor-pointer hover:text-zinc-600 transition-colors"
            >
              <option value="ALL">All Streams</option>
              {streams.map(st => (
                <option key={st.id} value={st.id}>
                  {st.full_name}
                </option>
              ))}
            </select>
          </div>

          <div className="w-px h-3 bg-zinc-100 mx-2 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Fees:</span>
            <select 
              value={financialFilter}
              onChange={(e) => setFinancialFilter(e.target.value as any)}
              className="bg-transparent text-[10px] font-bold text-zinc-900 outline-none cursor-pointer hover:text-zinc-600 transition-colors"
            >
              <option value="ALL">Status - All</option>
              <option value="PAID">Paid in Full</option>
              <option value="ARREARS">With Arrears</option>
            </select>
          </div>

          {/* <div className="w-px h-3 bg-zinc-100 mx-2 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black uppercase text-zinc-400 tracking-widest">Performance:</span>
            <select 
              value={performanceFilter}
              onChange={(e) => setPerformanceFilter(e.target.value as any)}
              className="bg-transparent text-[10px] font-bold text-zinc-900 outline-none cursor-pointer hover:text-zinc-600 transition-colors"
            >
              <option value="ALL">School Avg (Full)</option>
              <option value="TOP_20">Top 20 Performers</option>
              <option value="BOTTOM_20">Bottom 20 (Support Priority)</option>
            </select>
          </div> */}
          
          <button 
            onClick={() => {
              setSearchQuery('');
              setStreamFilter('ALL');
              setFinancialFilter('ALL');
              // setPerformanceFilter('ALL');
            }}
            className="ml-auto text-[9px] font-black uppercase text-zinc-400 hover:text-rose-500 transition-colors tracking-widest"
          >
            Clear Filters
          </button>
        </div>
      )}

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
                      <div className="flex items-center gap-2">
                         <span className="text-xs font-bold text-zinc-900">{person.profile?.full_name}</span>
                         {/* {studentPerformance[person.id] !== undefined && (
                           <span className={cn(
                             "text-[8px] font-black px-1.5 py-0.5 rounded-full",
                             Number(studentPerformance[person.id]) >= 75 ? "bg-emerald-50 text-emerald-600" :
                             Number(studentPerformance[person.id]) < 40 ? "bg-rose-50 text-rose-600" :
                             "bg-zinc-100 text-zinc-400"
                           )}>
                             {Number(studentPerformance[person.id]).toFixed(1)}%
                           </span>
                         )} */}
                      </div>
                  </td>
                  <td className="px-6 py-4 text-left">
                    <span className="text-[10px] font-black text-zinc-500">{person.adm_no}</span>
                  </td>
                  <td className="px-6 py-4 text-left">
                    <div className="flex flex-col text-[10px] font-bold text-zinc-400 uppercase tracking-tighter leading-tight">
                      <span className="text-zinc-600">{person.parent?.full_name || 'No Parent'}</span>
                      <span className="opacity-60">{person.parent?.phone || 'No Phone'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-left">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-tighter">
                      {person.stream?.class?.name || 'Form ?'} - {person.stream?.name || 'G'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-left">
                    {(() => {
                      const studentFees = fees.filter(f => f.student_id === person.id);
                      const totalDue = studentFees.reduce((acc, f) => acc + (f.amount_due || 0), 0);
                      const totalPaid = studentFees.reduce((acc, f) => acc + (f.amount_paid || 0), 0);
                      const balance = totalDue - totalPaid;
                      const hasArrears = balance > 0;
                      
                      return (
                        <div className="flex items-center gap-2">
                          <div className={cn("w-1.5 h-1.5 rounded-full", hasArrears ? "bg-amber-500" : "bg-emerald-500")} />
                          <span className={cn("text-[8px] font-black uppercase tracking-widest", hasArrears ? "text-amber-600" : "text-emerald-600")}>
                            {hasArrears ? `Arrears: ${formatCurrency(balance)}` : 'Cleared'}
                          </span>
                        </div>
                      );
                    })()}
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
