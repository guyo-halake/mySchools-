import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Search, User, ShieldAlert, Award, Activity, TrendingUp, AlertTriangle } from 'lucide-react';
import { cn } from '../utils/utils';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

export const ResultsManagement: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const [students, setStudents] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [streamFilter, setStreamFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [termFilter, setTermFilter] = useState('ALL');
  
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!user?.school_id) return;
      try {
        const [stRes, strRes, subRes, termsRes] = await Promise.all([
          supabase
            .from('students')
            .select('*, profile:profiles!students_id_fkey(*), stream:streams(*, class:classes(*))')
            .eq('school_id', user.school_id),
          api.getStreams(user.school_id),
          api.getCBCSchoolProjectSubmissions(user.school_id),
          api.getTerms(user.school_id)
        ]);

        setStudents(stRes.data || []);
        setStreams(strRes || []);
        setSubmissions(subRes || []);
        setTerms(termsRes || []);
        
        // Default to active term or latest term
        const active = termsRes.find((t: any) => t.is_current);
        if (active) setTermFilter(active.id);
        else if (termsRes.length > 0) setTermFilter(termsRes[0].id);

        // Default to Grade 1 stream
        const g1Stream = (strRes || []).find((s: any) => s.class?.level === 1 || String(s.class?.name).toLowerCase().includes('grade 1'));
        if (g1Stream) setStreamFilter(g1Stream.id);
        else if (strRes && strRes.length > 0) setStreamFilter(strRes[0].id);

      } catch (err) {
        console.error("Error loading 360 data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [user?.school_id]);

  // Process students based on selected term filter
  const processedStudents = useMemo(() => {
    return students.map((student) => {
      let studentSubs = submissions.filter(s => s.student_id === student.id);
      
      // Filter subs by term if not ALL
      if (termFilter !== 'ALL') {
         studentSubs = studentSubs.filter(s => s.project?.term_id === termFilter);
      }

      let ee = 0, me = 0, ae = 0, be = 0;
      studentSubs.forEach(s => {
        const r = String(s.rubric_rating || s.rating || '').toUpperCase();
        if (['EE', 'EE1', 'EE2', '4', 'EXCELLENT'].includes(r)) ee++;
        else if (['ME', 'ME1', 'ME2', '3', 'GOOD'].includes(r)) me++;
        else if (['AE', 'AE1', 'AE2', '2', 'FAIR'].includes(r)) ae++;
        else if (['BE', 'BE1', 'BE2', '1', 'POOR'].includes(r)) be++;
      });

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
        subs: studentSubs
      };
    }).sort((a, b) => {
       // Sort by score descending
       if (b.score !== a.score) return b.score - a.score;
       return a.fullName.localeCompare(b.fullName)
    });
  }, [students, submissions, termFilter]);

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
    
    selectedStudent.subs.forEach((s: any) => {
      const laName = s.project?.learning_area?.name || 'General';
      if (!laMap.has(laName)) laMap.set(laName, { name: laName, score: 0, count: 0 });
      
      const r = String(s.rubric_rating || '').toUpperCase();
      let val = 0;
      if (['EE', '4', 'EXCELLENT'].includes(r)) val = 4;
      else if (['ME', '3', 'GOOD'].includes(r)) val = 3;
      else if (['AE', '2', 'FAIR'].includes(r)) val = 2;
      else if (['BE', '1', 'POOR'].includes(r)) val = 1;
      
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

  if (user && !['TEACHER', 'PRINCIPAL', 'ADMIN'].includes(user.role)) {
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
    <div className="max-w-[1800px] mx-auto p-4 lg:p-6 font-sans h-[calc(100vh-64px)] flex flex-col bg-white" data-ai-context="student-360">
      
      {/* Ultra-dense Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 shrink-0 border-b border-zinc-100 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-950">Student 360</h1>
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
        <div className="w-[280px] shrink-0 flex flex-col border-r border-zinc-100 pr-4">
          <div className="flex-1 overflow-y-auto space-y-[2px] pr-2">
            {filteredStudents.map(student => {
              const isSelected = selectedStudentId === student.id;
              return (
                <div 
                  key={student.id}
                  onClick={() => setSelectedStudentId(student.id)}
                  className={cn(
                    "px-3 py-2 rounded-lg cursor-pointer transition-all flex items-center justify-between group",
                    isSelected ? "bg-zinc-950 text-white" : "hover:bg-zinc-50 text-zinc-900"
                  )}
                >
                  <div className="truncate pr-2">
                    <p className="text-xs font-bold truncate">{student.fullName}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                       <span className={cn("text-[9px] font-black uppercase tracking-widest", isSelected ? "text-zinc-400" : "text-zinc-500")}>
                         {student.streamName}
                       </span>
                       <span className={cn("text-[9px] font-black uppercase tracking-widest", isSelected ? "text-zinc-500" : "text-zinc-300")}>
                         • {student.adm_no}
                       </span>
                    </div>
                  </div>
                  {/* Status Indicator */}
                  <div className="flex items-center shrink-0 gap-1">
                     {student.be > 0 && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
                     {student.be === 0 && student.ae > 0 && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                     {student.be === 0 && student.ae === 0 && student.ee > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  </div>
                </div>
              )
            })}
            {filteredStudents.length === 0 && (
              <div className="p-4 text-center text-zinc-400 text-xs font-bold">No students match.</div>
            )}
          </div>
        </div>

        {/* Right Panel: High-Density Student HUD */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selectedStudent ? (
            <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-8 text-center bg-zinc-50/50 rounded-2xl border border-zinc-100 border-dashed">
              <User size={32} className="text-zinc-300 mb-2" />
              <h3 className="text-sm font-bold text-zinc-900">Select a Student</h3>
              <p className="text-xs">Choose a student to view their holistic profile.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-2">
              
              {/* Dense Header */}
              <div className="flex items-start justify-between mb-6 bg-zinc-50 rounded-2xl p-5 border border-zinc-100" data-ai-student-name={selectedStudent.fullName} data-ai-student-adm={selectedStudent.adm_no} data-ai-student-rating={selectedStudent.overallRating}>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-zinc-950 text-white flex items-center justify-center text-xl font-black">
                    {selectedStudent.fullName.charAt(0)}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight text-zinc-900 leading-none">{selectedStudent.fullName}</h2>
                    <p className="text-xs font-bold text-zinc-500 mt-2 tracking-widest uppercase">
                       ADM: {selectedStudent.adm_no} | {selectedStudent.streamName}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Current Standing</span>
                  <span className={cn(
                    "text-lg font-black tracking-tight",
                    selectedStudent.overallRating === 'Exceeding Expectation' ? "text-emerald-600" :
                    selectedStudent.overallRating === 'Meeting Expectation' ? "text-blue-600" :
                    selectedStudent.overallRating === 'Approaching Expectation' ? "text-amber-600" :
                    selectedStudent.overallRating === 'Below Expectation' ? "text-rose-600" : "text-zinc-600"
                  )}>{selectedStudent.overallRating}</span>
                </div>
              </div>

              {selectedStudent.be > 0 && (
                 <div className="mb-6 px-4 py-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-3">
                    <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                    <p className="text-xs font-bold text-rose-900">Intervention Required: Student has scored "Below Expectation" in {selectedStudent.be} assessments.</p>
                 </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Visual Analytics */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Competency Distribution */}
                  <div data-ai-metrics="competency-spread" data-ai-ee={selectedStudent.ee} data-ai-me={selectedStudent.me} data-ai-ae={selectedStudent.ae} data-ai-be={selectedStudent.be}>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 border-b border-zinc-100 pb-1">Competency Spread</h3>
                    <div className="grid grid-cols-2 gap-2">
                       <div className="p-3 bg-emerald-50 rounded-xl flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-900">EE</span>
                          <span className="text-sm font-black text-emerald-700">{selectedStudent.ee}</span>
                       </div>
                       <div className="p-3 bg-blue-50 rounded-xl flex items-center justify-between">
                          <span className="text-xs font-bold text-blue-900">ME</span>
                          <span className="text-sm font-black text-blue-700">{selectedStudent.me}</span>
                       </div>
                       <div className="p-3 bg-amber-50 rounded-xl flex items-center justify-between">
                          <span className="text-xs font-bold text-amber-900">AE</span>
                          <span className="text-sm font-black text-amber-700">{selectedStudent.ae}</span>
                       </div>
                       <div className="p-3 bg-rose-50 rounded-xl flex items-center justify-between">
                          <span className="text-xs font-bold text-rose-900">BE</span>
                          <span className="text-sm font-black text-rose-700">{selectedStudent.be}</span>
                       </div>
                    </div>
                  </div>

                  {/* Radar Chart */}
                  <div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 border-b border-zinc-100 pb-1">Subject Mastery</h3>
                    <div className="h-[240px] bg-zinc-50 rounded-2xl border border-zinc-100 flex items-center justify-center p-2">
                      {radarData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                            <PolarGrid stroke="#e4e4e7" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 9, fontWeight: 800 }} />
                            <Radar name="Competency" dataKey="competency" stroke="#18181b" strokeWidth={1.5} fill="#18181b" fillOpacity={0.08} />
                            <Tooltip 
                              formatter={(value: any) => {
                                if (value >= 3.5) return ['EE', 'Rating'];
                                if (value >= 2.5) return ['ME', 'Rating'];
                                if (value >= 1.5) return ['AE', 'Rating'];
                                return ['BE', 'Rating'];
                              }}
                              labelFormatter={(label, payload) => payload?.[0]?.payload?.fullSubject || label}
                              contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', fontSize: '11px', fontWeight: 'bold' }}
                            />
                          </RadarChart>
                        </ResponsiveContainer>
                      ) : (
                        <span className="text-xs font-bold text-zinc-400">No data for radar chart</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dense Assessment Datatable */}
                <div className="lg:col-span-2" data-ai-component="assessment-log">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-3 border-b border-zinc-100 pb-1">Assessment Log</h3>
                  {selectedStudent.subs.length === 0 ? (
                     <p className="text-xs font-bold text-zinc-400 py-4">No assessments recorded.</p>
                  ) : (
                     <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
                        <table className="w-full text-left border-collapse">
                           <thead>
                              <tr className="bg-zinc-50 border-b border-zinc-200">
                                 <th className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Project / Learning Area</th>
                                 <th className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Term</th>
                                 <th className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Rating</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-zinc-100">
                              {selectedStudent.subs.map((sub: any) => {
                                 const r = String(sub.rubric_rating || sub.rating || '').toUpperCase();
                                 let bg = 'bg-zinc-100 text-zinc-700';
                                 if (['EE', '4', 'EXCELLENT'].includes(r)) bg = 'bg-emerald-100 text-emerald-800';
                                 else if (['ME', '3', 'GOOD'].includes(r)) bg = 'bg-blue-100 text-blue-800';
                                 else if (['AE', '2', 'FAIR'].includes(r)) bg = 'bg-amber-100 text-amber-800';
                                 else if (['BE', '1', 'POOR'].includes(r)) bg = 'bg-rose-100 text-rose-800';

                                 return (
                                    <tr key={sub.id} className="hover:bg-zinc-50" data-ai-log-entry={sub.project?.title} data-ai-log-rating={r}>
                                       <td className="px-4 py-3">
                                          <p className="text-xs font-bold text-zinc-900">{sub.project?.title || 'Unknown Project'}</p>
                                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">{sub.project?.learning_area?.name || 'General'}</p>
                                          {sub.teacher_comment && (
                                             <p className="text-[10px] font-medium text-zinc-500 italic mt-1 bg-zinc-50 p-1.5 rounded">"{sub.teacher_comment}"</p>
                                          )}
                                       </td>
                                       <td className="px-4 py-3 text-xs font-bold text-zinc-500">
                                          {(() => {
                                             const t = terms.find((term: any) => term.id === sub.project?.term_id);
                                             return t ? `${t.name} ${t.year || ''}` : 'Unknown Term';
                                          })()}
                                       </td>
                                       <td className="px-4 py-3">
                                          <span className={cn("px-2 py-1 rounded text-[10px] font-black tracking-widest", bg)}>
                                             {r || 'N/A'}
                                          </span>
                                       </td>
                                    </tr>
                                 )
                              })}
                           </tbody>
                        </table>
                     </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
