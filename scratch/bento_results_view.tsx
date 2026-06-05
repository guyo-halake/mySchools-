import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Search, User, ShieldAlert, Activity, FileText, BarChart3, AlertTriangle, BookOpen } from 'lucide-react';
import { cn } from '../utils/utils';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const ResultsManagement: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [students, setStudents] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  
  // Separate states for Formative and Summative data
  const [formativeAssessments, setFormativeAssessments] = useState<any[]>([]);
  const [summativeProjects, setSummativeProjects] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [streamFilter, setStreamFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [termFilter, setTermFilter] = useState('ALL');
  
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  
  // Tab State: 'formative' | 'summative' | 'analytics'
  const [activeTab, setActiveTab] = useState<'formative' | 'summative' | 'analytics'>('analytics');

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user?.school_id) return;
      try {
        const isTeacher = user?.role === 'TEACHER' || user?.role === 'teacher';
        const [strRes, subRes, assessRes, termsRes] = await Promise.all([
          isTeacher ? api.getTeacherStreams(user.id, user.school_id) : api.getStreams(user.school_id),
          api.getCBCSchoolProjectSubmissions(user.school_id),
          api.getCBCSchoolAssessments(user.school_id),
          api.getTerms(user.school_id)
        ]);

        let stQuery = supabase
            .from('students')
            .select('*, profile:profiles!students_id_fkey(*), stream:streams(*, class:classes(*))')
            .eq('school_id', user.school_id);
            
        // If teacher, only fetch students in their streams
        if (isTeacher && strRes && strRes.length > 0) {
           stQuery = stQuery.in('stream_id', strRes.map((s: any) => s.id));
        }

        const { data: stRes } = await stQuery;

        setStudents(stRes || []);
        setStreams(strRes || []);
        setSummativeProjects(subRes || []);
        setFormativeAssessments(assessRes || []);
        setTerms(termsRes || []);
        
        // Default to active term
        const active = termsRes.find((t: any) => t.is_current);
        if (active) setTermFilter(active.id);
        else if (termsRes.length > 0) setTermFilter(termsRes[0].id);

        if (strRes && strRes.length > 0) setStreamFilter(strRes[0].id);

      } catch (err) {
        console.error("Error loading Results data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [user?.school_id]);

  // Process students
  const processedStudents = useMemo(() => {
    return students.map((student) => {
      // Formative Filtering (Ignore Term Filter by default, they don't map to terms usually)
      let studentFormative = formativeAssessments.filter(a => a.student_id === student.id);
      
      // Summative Filtering (Apply Term Filter)
      let studentSummative = summativeProjects.filter(p => p.student_id === student.id);
      if (termFilter !== 'ALL') {
         studentSummative = studentSummative.filter(p => p.project?.term_id === termFilter);
      }

      // Calculate combined metrics
      let ee = 0, me = 0, ae = 0, be = 0;
      
      const countRating = (rRaw: any) => {
         const r = String(rRaw || '').toUpperCase();
         if (['EE', 'EE1', 'EE2', '4', 'EXCELLENT'].includes(r)) ee++;
         else if (['ME', 'ME1', 'ME2', '3', 'GOOD'].includes(r)) me++;
         else if (['AE', 'AE1', 'AE2', '2', 'FAIR'].includes(r)) ae++;
         else if (['BE', 'BE1', 'BE2', '1', 'POOR'].includes(r)) be++;
      };

      studentFormative.forEach(f => countRating(f.rating));
      studentSummative.forEach(s => countRating(s.rubric_rating || s.rating));

      const total = ee + me + ae + be;
      let score = 0;
      if (total > 0) {
        score = ((ee * 4) + (me * 3) + (ae * 2) + (be * 1)) / total;
      }

      let overallRating = 'Unassessed';
      if (total > 0) {
        if (score >= 3.5) overallRating = 'Exceeding Expectation';
        else if (score >= 2.5) overallRating = 'Meeting Expectation';
        else if (score >= 1.5) overallRating = 'Approaching Expectation';
        else overallRating = 'Below Expectation';
      }

      return {
        ...student,
        fullName: student.profile?.full_name || 'Unknown Student',
        streamName: `${student.stream?.class?.name || ''} ${student.stream?.name || ''}`,
        ee, me, ae, be, total, score, overallRating,
        formative: studentFormative,
        summative: studentSummative
      };
    }).sort((a, b) => {
       if (b.score !== a.score) return b.score - a.score;
       return a.fullName.localeCompare(b.fullName)
    });
  }, [students, formativeAssessments, summativeProjects, termFilter]);

  const filteredStudents = useMemo(() => {
    return processedStudents.filter(s => {
      if (streamFilter !== 'ALL' && s.stream_id !== streamFilter) return false;
      
      if (statusFilter === 'AT_RISK' && (s.be === 0 && s.ae === 0)) return false;
      if (statusFilter === 'EXCEEDING' && s.score < 3.5) return false;
      
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchName = s.fullName.toLowerCase().includes(q);
        const matchAdm = (s.adm_no || '').toLowerCase().includes(q);
        if (!matchName && !matchAdm) return false;
      }
      
      return true;
    });
  }, [processedStudents, streamFilter, statusFilter, searchQuery]);

  const selectedStudent = useMemo(() => {
    return processedStudents.find(s => s.id === selectedStudentId) || null;
  }, [processedStudents, selectedStudentId]);

  const radarData = useMemo(() => {
    if (!selectedStudent) return [];
    const laMap = new Map();
    
    // Combine both formative and summative for radar
    const allRecords = [
       ...selectedStudent.formative.map((f: any) => ({ la: f.learning_area?.name || 'General', rating: f.rating })),
       ...selectedStudent.summative.map((s: any) => ({ la: s.project?.learning_area?.name || 'General', rating: s.rubric_rating || s.rating }))
    ];

    allRecords.forEach(record => {
      const laName = record.la;
      if (!laMap.has(laName)) laMap.set(laName, { name: laName, score: 0, count: 0 });
      
      const r = String(record.rating || '').toUpperCase();
      let val = 0;
      if (['EE', '4', 'EXCELLENT', 'EE1', 'EE2'].includes(r)) val = 4;
      else if (['ME', '3', 'GOOD', 'ME1', 'ME2'].includes(r)) val = 3;
      else if (['AE', '2', 'FAIR', 'AE1', 'AE2'].includes(r)) val = 2;
      else if (['BE', '1', 'POOR', 'BE1', 'BE2'].includes(r)) val = 1;
      
      if (val > 0) {
        laMap.get(laName).score += val;
        laMap.get(laName).count += 1;
      }
    });

    return Array.from(laMap.values()).map(item => ({
      subject: item.name.substring(0, 12) + (item.name.length > 12 ? '...' : ''),
      fullSubject: item.name,
      competency: item.count > 0 ? Number((item.score / item.count).toFixed(1)) : 0,
      fullMark: 4,
    }));
  }, [selectedStudent]);

  const renderBadge = (rRaw: string) => {
     const r = String(rRaw || '').toUpperCase();
     if (['EE', 'EE1', 'EE2', '4', 'EXCELLENT'].includes(r)) return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black tracking-widest">{r}</span>;
     if (['ME', 'ME1', 'ME2', '3', 'GOOD'].includes(r)) return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black tracking-widest">{r}</span>;
     if (['AE', 'AE1', 'AE2', '2', 'FAIR'].includes(r)) return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black tracking-widest">{r}</span>;
     if (['BE', 'BE1', 'BE2', '1', 'POOR'].includes(r)) return <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-black tracking-widest">{r}</span>;
     return <span className="px-2 py-1 bg-zinc-100 text-zinc-500 rounded-lg text-[10px] font-black tracking-widest">N/A</span>;
  };

  if (user && !['TEACHER', 'PRINCIPAL', 'ADMIN'].includes(user.role?.toUpperCase())) {
    return (
      <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-xl flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-zinc-100 shadow-2xl rounded-[2.5rem] p-10 space-y-8 text-center">
           <ShieldAlert size={48} className="mx-auto text-zinc-950" />
           <h2 className="text-xl font-black text-zinc-950 tracking-tight">Access Restricted</h2>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-8 font-bold text-zinc-900 animate-pulse">Establishing Live Connection...</div>;

  return (
    <div className="max-w-[1800px] mx-auto p-4 lg:p-6 font-sans h-[calc(100vh-64px)] flex flex-col bg-white">
      
      {/* Ultra-dense Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 shrink-0 border-b border-zinc-100 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-950">Student Results Hub</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
            <input 
              type="text" 
              placeholder="Search Name or ADM..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-900 outline-none focus:border-zinc-400 w-48 transition-all"
            />
          </div>
          
          <select 
            value={termFilter} 
            onChange={(e) => setTermFilter(e.target.value)}
            className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-bold text-zinc-700 outline-none cursor-pointer"
          >
            <option value="ALL">All Historical Terms</option>
            {terms.map((t: any) => (
              <option key={t.id} value={t.id}>{t.name} {t.year}</option>
            ))}
          </select>

          <select 
            value={streamFilter} 
            onChange={(e) => setStreamFilter(e.target.value)}
            className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-bold text-zinc-700 outline-none cursor-pointer max-w-[120px] truncate"
          >
            <option value="ALL">All Streams</option>
            {streams.map(s => <option key={s.id} value={s.id}>{s.class?.name} {s.name}</option>)}
          </select>
          
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs font-bold text-zinc-700 outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="AT_RISK">At Risk (BE/AE)</option>
            <option value="EXCEEDING">Top Performers</option>
          </select>
        </div>
      </div>

      {/* Main Layout */}
      <div className="flex-1 flex gap-6 min-h-0">
        
        {/* Left Panel: Dense Roster */}
        <div className="w-[300px] shrink-0 flex flex-col border-r border-zinc-100 pr-4">
          <div className="flex-1 overflow-y-auto space-y-[4px] pr-2 hide-scrollbar">
            {filteredStudents.map(student => {
              const isSelected = selectedStudentId === student.id;
              return (
                <div 
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className={cn(
                    "p-3 rounded-2xl cursor-pointer transition-all border",
                    isSelected ? "bg-zinc-950 border-zinc-950 text-white shadow-md" : "bg-white border-zinc-100 hover:border-zinc-300 text-zinc-900"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <div className="truncate pr-2">
                      <p className="text-sm font-bold truncate">{student.fullName}</p>
                      <div className="flex flex-col gap-1 mt-1">
                         <span className={cn("text-[10px] font-black uppercase tracking-widest", isSelected ? "text-zinc-400" : "text-zinc-500")}>
                           {student.streamName} • {student.adm_no}
                         </span>
                      </div>
                    </div>
                    {/* Status Indicator */}
                    <div className="flex items-center shrink-0 gap-1 mt-1">
                       {student.be > 0 && <span className="w-2 h-2 rounded-full bg-rose-500" />}
                       {student.be === 0 && student.ae > 0 && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                       {student.be === 0 && student.ae === 0 && student.ee > 0 && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                    </div>
                  </div>
                </div>
              )
            })}
            {filteredStudents.length === 0 && (
              <div className="p-8 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest border-2 border-dashed border-zinc-100 rounded-3xl">No students match.</div>
            )}
          </div>
        </div>

        {/* Right Panel: Student Profile Tabs */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedStudent ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-8 text-center bg-zinc-50/50 rounded-3xl border border-zinc-100 border-dashed">
              <User size={48} strokeWidth={1} className="text-zinc-300 mb-4" />
              <h3 className="text-sm font-bold text-zinc-900">Select a Student</h3>
              <p className="text-xs">Choose a student to view their holistic profile.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 bg-zinc-50/50 rounded-3xl border border-zinc-100 overflow-hidden">
              
              {/* Profile Header */}
              <div className="bg-white p-6 border-b border-zinc-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 text-white flex items-center justify-center text-2xl font-black shadow-lg">
                      {selectedStudent.fullName.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-zinc-900 leading-none">{selectedStudent.fullName}</h2>
                      <p className="text-xs font-bold text-zinc-500 mt-2 tracking-widest uppercase">
                         ADM: {selectedStudent.adm_no} | {selectedStudent.streamName}
                      </p>
                    </div>
                  </div>
                  
                  <div className="text-right bg-zinc-50 px-4 py-3 rounded-2xl border border-zinc-100">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Current Standing</span>
                    <span className={cn(
                      "text-sm font-black tracking-tight uppercase",
                      selectedStudent.overallRating === 'Exceeding Expectation' ? "text-emerald-600" :
                      selectedStudent.overallRating === 'Meeting Expectation' ? "text-blue-600" :
                      selectedStudent.overallRating === 'Approaching Expectation' ? "text-amber-600" :
                      selectedStudent.overallRating === 'Below Expectation' ? "text-rose-600" : "text-zinc-600"
                    )}>{selectedStudent.overallRating}</span>
                  </div>
                </div>

                {/* Tab Strip */}
                <div className="flex mt-8 gap-8 border-b border-zinc-100">
                  {[
                    { id: 'analytics', label: 'Analytics & Overview', icon: BarChart3 },
                    { id: 'formative', label: `Formative Classwork (${selectedStudent.formative.length})`, icon: Activity },
                    { id: 'summative', label: `Summative Projects (${selectedStudent.summative.length})`, icon: BookOpen }
                  ].map(t => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id as any)}
                      className={cn(
                        "pb-3 text-[11px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border-b-2 relative top-[1px]",
                        activeTab === t.id ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400 hover:text-zinc-600"
                      )}
                    >
                      <t.icon size={14} /> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-6">
                
                {activeTab === 'analytics' && (
                  <div className="space-y-6 animate-in fade-in duration-300">
                     {selectedStudent.be > 0 && (
                       <div className="px-4 py-3 rounded-2xl bg-rose-50 border border-rose-100 flex items-center gap-3">
                          <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                          <p className="text-xs font-bold text-rose-900">Intervention Required: Student has scored "Below Expectation" in {selectedStudent.be} assessments.</p>
                       </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Competency Spread */}
                      <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6 flex items-center gap-2">
                           <Activity size={12} /> Competency Spread
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex flex-col items-center justify-center">
                              <span className="text-3xl font-black text-emerald-600">{selectedStudent.ee}</span>
                              <span className="text-[9px] font-black uppercase tracking-widest text-emerald-800 mt-1">Exceeding (EE)</span>
                           </div>
                           <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex flex-col items-center justify-center">
                              <span className="text-3xl font-black text-blue-600">{selectedStudent.me}</span>
                              <span className="text-[9px] font-black uppercase tracking-widest text-blue-800 mt-1">Meeting (ME)</span>
                           </div>
                           <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl flex flex-col items-center justify-center">
                              <span className="text-3xl font-black text-amber-600">{selectedStudent.ae}</span>
                              <span className="text-[9px] font-black uppercase tracking-widest text-amber-800 mt-1">Approaching (AE)</span>
                           </div>
                           <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-2xl flex flex-col items-center justify-center">
                              <span className="text-3xl font-black text-rose-600">{selectedStudent.be}</span>
                              <span className="text-[9px] font-black uppercase tracking-widest text-rose-800 mt-1">Below (BE)</span>
                           </div>
                        </div>
                      </div>

                      {/* Radar Chart */}
                      <div className="bg-white p-6 rounded-3xl border border-zinc-100 shadow-sm flex flex-col">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 flex items-center gap-2">
                           <BarChart3 size={12} /> Subject Mastery Radar
                        </h3>
                        <div className="flex-1 min-h-[250px] relative">
                          {radarData.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                                <PolarGrid stroke="#f4f4f5" />
                                <PolarAngleAxis dataKey="subject" tick={{ fill: '#a1a1aa', fontSize: 9, fontWeight: 800 }} />
                                <Radar name="Competency" dataKey="competency" stroke="#10b981" strokeWidth={2} fill="#10b981" fillOpacity={0.15} />
                                <Tooltip 
                                  formatter={(value: any) => {
                                    if (value >= 3.5) return ['EE', 'Rating'];
                                    if (value >= 2.5) return ['ME', 'Rating'];
                                    if (value >= 1.5) return ['AE', 'Rating'];
                                    return ['BE', 'Rating'];
                                  }}
                                  labelFormatter={(label, payload) => payload?.[0]?.payload?.fullSubject || label}
                                  contentStyle={{ borderRadius: '12px', border: '1px solid #e4e4e7', fontSize: '11px', fontWeight: 'bold', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                              </RadarChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                               <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-300 border-2 border-dashed border-zinc-100 px-6 py-3 rounded-2xl">No data for radar chart</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'formative' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between mb-4">
                       <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Classwork & Observations ({selectedStudent.formative.length})</h3>
                       <p className="text-[10px] font-medium text-zinc-400">Logged via Mass Grading</p>
                    </div>
                    {selectedStudent.formative.length === 0 ? (
                      <div className="p-12 text-center border-2 border-dashed border-zinc-200 rounded-3xl bg-white">
                         <Activity size={32} strokeWidth={1} className="mx-auto text-zinc-300 mb-3" />
                         <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">No formative assessments logged</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {selectedStudent.formative.map((f: any) => (
                           <div key={f.id} className="bg-white p-5 rounded-2xl border border-zinc-100 hover:border-zinc-300 hover:shadow-sm transition-all group">
                              <div className="flex justify-between items-start mb-3">
                                 <div>
                                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">{f.learning_area?.name || 'General'}</p>
                                    <h4 className="text-sm font-bold text-zinc-900">{f.strand || f.cbc_strands?.name || 'Observation'}</h4>
                                    <p className="text-xs text-zinc-500 mt-0.5">{f.sub_strand || f.cbc_sub_strands?.name || ''}</p>
                                 </div>
                                 {renderBadge(f.rating)}
                              </div>
                              {f.teacher_comment && (
                                 <div className="mt-4 p-3 bg-zinc-50 rounded-xl">
                                    <p className="text-xs text-zinc-600 italic">"{f.teacher_comment}"</p>
                                 </div>
                              )}
                              <div className="mt-4 text-[9px] font-bold text-zinc-300 uppercase tracking-widest text-right">
                                 Logged {new Date(f.created_at).toLocaleDateString()}
                              </div>
                           </div>
                         ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'summative' && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between mb-4">
                       <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Projects & Exams ({selectedStudent.summative.length})</h3>
                       {termFilter !== 'ALL' && <p className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Filtered by Term</p>}
                    </div>
                    {selectedStudent.summative.length === 0 ? (
                      <div className="p-12 text-center border-2 border-dashed border-zinc-200 rounded-3xl bg-white">
                         <BookOpen size={32} strokeWidth={1} className="mx-auto text-zinc-300 mb-3" />
                         <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">No summative projects submitted</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         {selectedStudent.summative.map((s: any) => {
                           const t = terms.find((term: any) => term.id === s.project?.term_id);
                           const termName = t ? `${t.name} ${t.year || ''}` : 'Unknown Term';
                           
                           return (
                             <div key={s.id} className="bg-white p-5 rounded-2xl border border-zinc-100 hover:border-zinc-300 hover:shadow-sm transition-all group">
                                <div className="flex justify-between items-start mb-3">
                                   <div>
                                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">{s.project?.learning_area?.name || 'General'}</p>
                                      <h4 className="text-sm font-bold text-zinc-900 line-clamp-2">{s.project?.title || 'Unknown Project'}</h4>
                                   </div>
                                   {renderBadge(s.rubric_rating || s.rating)}
                                </div>
                                <div className="flex justify-between items-center mt-4 pt-4 border-t border-zinc-50">
                                   <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50 px-2 py-1 rounded-md">{termName}</span>
                                   <span className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest text-right">
                                      {new Date(s.created_at).toLocaleDateString()}
                                   </span>
                                </div>
                             </div>
                           )
                         })}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsManagement;
