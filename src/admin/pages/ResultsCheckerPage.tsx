import React, { useState, useEffect } from 'react';
import { useAdminAlert } from '../context/AdminAlertContext';
import { supabase } from '../lib/adminSupabase';
import { Building2, Users as UsersIcon, Loader2, Search, AlertCircle, Plus, Upload, Inbox, ChevronLeft, MoreHorizontal, CheckCircle2 } from 'lucide-react';

interface School { id: string; name: string; }
interface Stream { id: string; name: string; classes: { name: string, level: number, category: string }; }
interface LearningArea { id: string; name: string; category: string; }
interface Student { id: string; adm_no: string; profiles: { full_name: string }; }
interface Strand { id: string; name: string; }
interface SubStrand { id: string; name: string; strand_id: string; }
interface Assessment { 
  id?: string; 
  student_id: string; 
  learning_area_id: string;
  strand_id: string; 
  sub_strand_id: string; 
  rating: string; 
  teacher_comment?: string; 
  cbc_strands?: { name: string };
  cbc_sub_strands?: { name: string };
}

const RATING_COLORS: Record<string, string> = {
  // Primary (4 Levels)
  'EE': 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  'ME': 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  'AE': 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  'BE': 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
  // JSS / High School (8 Levels)
  'EE1': 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 font-black',
  'EE2': 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
  'ME1': 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30 font-black',
  'ME2': 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
  'AE1': 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 font-black',
  'AE2': 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
  'BE1': 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 font-black',
  'BE2': 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20',
};

const getRatingColor = (rating: string) => {
  return RATING_COLORS[rating] || 'bg-zinc-50 text-zinc-400 border-zinc-100';
};

const RATING_POINTS: Record<string, number> = { 
  'EE': 4, 'ME': 3, 'AE': 2, 'BE': 1,
  'EE1': 8, 'EE2': 7, 'ME1': 6, 'ME2': 5, 'AE1': 4, 'AE2': 3, 'BE1': 2, 'BE2': 1
};
const POINTS_TO_RATING: Record<number, string> = { 
  4: 'EE', 3: 'ME', 2: 'AE', 1: 'BE',
  8: 'EE1', 7: 'EE2', 6: 'ME1', 5: 'ME2'
};

export const ResultsCheckerPage: React.FC = () => {
  const { showAlert } = useAdminAlert();
  
  const [schools, setSchools] = useState<School[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [learningAreas, setLearningAreas] = useState<LearningArea[]>([]);
  const [selectedSchool, setSelectedSchool] = useState('');
  const [selectedStream, setSelectedStream] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [detailedAreaId, setDetailedAreaId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingAreaId, setRecordingAreaId] = useState('');
  const [recordingStrandId, setRecordingStrandId] = useState('');
  const [recordingSubStrandId, setRecordingSubStrandId] = useState('');
  const [strands, setStrands] = useState<Strand[]>([]);
  const [subStrands, setSubStrands] = useState<SubStrand[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [localChanges, setLocalChanges] = useState<Record<string, { rating?: string, comment?: string }>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [viewMode, setViewMode] = useState<'formative' | 'summative'>('formative');
  const [projects, setProjects] = useState<any[]>([]);
  const [projectSubmissions, setProjectSubmissions] = useState<any[]>([]);

  useEffect(() => {
    supabase.from('schools').select('id, name').order('name').then(({ data }) => {
      setSchools(data || []);
      setInitialLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedSchool) {
      setStreams([]); setLearningAreas([]); setSelectedStream(''); setDetailedAreaId(null);
      return;
    }
    const fetchContext = async () => {
      const [{ data: st }, { data: la }] = await Promise.all([
        supabase.from('streams').select('id, name, classes(name, level, category)').eq('school_id', selectedSchool),
        supabase.from('learning_areas').select('id, name, category').eq('school_id', selectedSchool).order('name')
      ]);
      setStreams(st as any || []);
      setLearningAreas(la || []);
    };
    fetchContext();
  }, [selectedSchool]);

  useEffect(() => {
    if (!selectedStream) {
      setStudents([]); setAssessments([]); setDetailedAreaId(null);
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const { data: studs } = await supabase.from('students')
          .select('id, adm_no, profiles!students_id_fkey(full_name)')
          .eq('school_id', selectedSchool)
          .eq('stream_id', selectedStream)
          .order('adm_no');
          
        const studentIds = (studs || []).map(s => s.id);
        console.log(`[DEBUG] Found ${studs?.length} students. Fetching assessments for school ${selectedSchool}...`);
        
        let resultsData: any[] = [];
        if (studentIds.length > 0) {
          const { data: results, error } = await supabase.from('cbc_student_assessments')
            .select('*, cbc_strands(name), cbc_sub_strands(name)')
            .eq('school_id', selectedSchool)
            .in('student_id', studentIds);
          
          if (error) console.error('[DEBUG] Fetch Error:', error);
          console.log(`[DEBUG] Fetched ${results?.length} assessment records.`);
          resultsData = results || [];
        }

        setStudents(studs as any || []);
        setAssessments(resultsData);
      } catch (err) {
        console.error('[DEBUG] Exception:', err);
        showAlert('Failed to fetch CBC records', 'Error');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [selectedStream, selectedSchool]);

  useEffect(() => {
    if (!searchQuery || !selectedSchool) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data } = await supabase.from('students')
          .select('id, adm_no, profiles!students_id_fkey(full_name)')
          .eq('school_id', selectedSchool)
          .or(`adm_no.ilike.%${searchQuery}%,profiles.full_name.ilike.%${searchQuery}%`)
          .limit(20);
        
        setSearchResults(data as any || []);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, selectedSchool]);

  useEffect(() => {
    if (!selectedSchool || viewMode !== 'summative') return;
    
    const fetchProjects = async () => {
      const { data: proj } = await supabase.from('cbc_projects').select('*').eq('school_id', selectedSchool);
      const { data: subs } = await supabase.from('cbc_project_submissions').select('*');
      setProjects(proj || []);
      setProjectSubmissions(subs || []);
    };
    fetchProjects();
  }, [selectedSchool, viewMode]);

  const streamObj = streams.find(s => s.id === selectedStream);
  const activeAreas = streamObj ? learningAreas.filter(la => la.category === streamObj.classes.category) : [];

  const getSummaryRating = (studentId: string, areaId: string) => {
    const areaAssessments = assessments.filter(a => a.student_id === studentId && a.learning_area_id === areaId);
    if (areaAssessments.length === 0) return null;
    let totalPoints = 0;
    let validCount = 0;
    areaAssessments.forEach(a => {
      const p = RATING_POINTS[a.rating] || RATING_POINTS[a.rating.substring(0, 2)];
      if (p) { totalPoints += p; validCount++; }
    });
    if (validCount === 0) return null;
    const average = Math.round(totalPoints / validCount);
    return POINTS_TO_RATING[average];
  };

  const detailedAssessments = detailedAreaId ? assessments.filter(a => a.learning_area_id === detailedAreaId) : [];
  const uniqueColumns = detailedAreaId ? Array.from(new Set(detailedAssessments.map(a => `${a.cbc_strands?.name || 'Unknown'}::${a.cbc_sub_strands?.name || 'Unknown'}`))).sort() : [];
  const activeDetailedArea = learningAreas.find(la => la.id === detailedAreaId);

  useEffect(() => {
    if (!recordingAreaId) {
      setStrands([]); setSubStrands([]); setRecordingStrandId(''); setRecordingSubStrandId('');
      return;
    }
    const fetchCurriculum = async () => {
      const { data: st } = await supabase.from('cbc_strands').select('id, name').eq('learning_area_id', recordingAreaId).order('name');
      setStrands(st || []);
    };
    fetchCurriculum();
  }, [recordingAreaId]);

  useEffect(() => {
    if (!recordingStrandId) {
      setSubStrands([]); setRecordingSubStrandId('');
      return;
    }
    const fetchSubStrands = async () => {
      const { data: sub } = await supabase.from('cbc_sub_strands').select('id, name, strand_id').eq('strand_id', recordingStrandId).order('name');
      setSubStrands(sub || []);
    };
    fetchSubStrands();
  }, [recordingStrandId]);

  const handleRate = (studentId: string, rating: string) => {
    setLocalChanges(prev => ({
      ...prev,
      [studentId]: { ...prev[studentId], rating }
    }));
  };

  const commitRow = async (studentId: string) => {
    const draft = localChanges[studentId];
    if (!draft || !recordingSubStrandId || !selectedSchool) return;

    const activeStrand = strands.find(s => s.id === recordingStrandId);
    const activeSubStrand = subStrands.find(ss => ss.id === recordingSubStrandId);

    setSavingId(studentId);
    try {
      const existing = assessments.find(a => 
        a.student_id === studentId && 
        a.learning_area_id === recordingAreaId && 
        a.strand_id === recordingStrandId && 
        a.sub_strand_id === recordingSubStrandId
      );

      const payload = {
        school_id: selectedSchool,
        student_id: studentId,
        learning_area_id: recordingAreaId,
        strand_id: recordingStrandId,
        sub_strand_id: recordingSubStrandId,
        rating: draft.rating || existing?.rating || '',
        teacher_comment: draft.comment !== undefined ? draft.comment : (existing?.teacher_comment || ''),
        grade_level_at_time: streamObj?.classes?.level || 0,
        strand: activeStrand?.name || '',
        sub_strand: activeSubStrand?.name || '',
        updated_at: new Date().toISOString()
      };

      if (!payload.rating) {
        setSavingId(null);
        return showAlert('Please select a rating first', 'Info');
      }

      console.log('[DEBUG] Saving assessment...', payload);

      if (existing?.id) {
        const { error } = await supabase.from('cbc_student_assessments').update(payload).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('cbc_student_assessments').insert(payload);
        if (error) throw error;
      }

      const { data: updated } = await supabase.from('cbc_student_assessments')
        .select('*, cbc_strands(name), cbc_sub_strands(name)')
        .eq('school_id', selectedSchool)
        .eq('student_id', studentId)
        .eq('sub_strand_id', recordingSubStrandId)
        .single();

      if (updated) {
        setAssessments(prev => {
          const filtered = prev.filter(a => !(a.student_id === studentId && a.sub_strand_id === recordingSubStrandId));
          return [...filtered, updated];
        });
      }

      setLocalChanges(prev => {
        const next = { ...prev };
        delete next[studentId];
        return next;
      });

      showAlert('Assessment saved', 'Success');
    } catch (err) {
      showAlert('Failed to save', 'Error');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="font-inter max-w-[1400px] mx-auto space-y-6 animate-in fade-in duration-700 pb-20 px-6">
      
      {/* Vercel-Style Nav Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 py-6 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-zinc-900 dark:bg-white rounded-xl flex items-center justify-center">
            <Building2 className="text-white dark:text-zinc-900" size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">CBC Gradebook</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Term 2, 2026</span>
              <span className="w-1 h-1 rounded-full bg-zinc-200" />
              <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Giakanja Primary</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-zinc-100 transition-colors" size={14} />
            <input 
              type="text"
              placeholder="Search entire school..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs font-medium outline-none focus:ring-2 ring-zinc-100 transition-all w-[240px]"
            />
          </div>

          <div className="flex items-center bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800 shadow-sm focus-within:border-zinc-400 transition-all">
            <select value={selectedSchool} onChange={e => setSelectedSchool(e.target.value)} disabled={initialLoading} className="bg-transparent text-xs font-medium outline-none text-zinc-600 dark:text-zinc-400">
              <option value="">School</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex items-center bg-white dark:bg-zinc-900 rounded-lg px-3 py-2 border border-zinc-200 dark:border-zinc-800 shadow-sm focus-within:border-zinc-400 transition-all">
            <select value={selectedStream} onChange={e => setSelectedStream(e.target.value)} disabled={!selectedSchool} className="bg-transparent text-xs font-medium outline-none text-zinc-600 dark:text-zinc-400">
              <option value="">Stream</option>
              {streams.map(s => <option key={s.id} value={s.id}>{s.classes?.name} - {s.name}</option>)}
            </select>
          </div>
          <button 
            onClick={() => {
              if (!selectedStream) return showAlert('Please select a stream first', 'Info');
              setIsRecording(!isRecording);
              setDetailedAreaId(null);
            }} 
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${isRecording ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100' : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg shadow-zinc-200 dark:shadow-none'}`}
          >
            {isRecording ? <ChevronLeft size={16} /> : <Plus size={16} />} {isRecording ? 'Exit' : 'Record'}
          </button>
        </div>
      </div>

        <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-900/50 p-1 rounded-xl border border-zinc-100 dark:border-zinc-800">
          <button 
            onClick={() => setViewMode('formative')}
            className={`px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all ${viewMode === 'formative' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            Formative
          </button>
          <button 
            onClick={() => setViewMode('summative')}
            className={`px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all ${viewMode === 'summative' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            Summative
          </button>
        </div>

        {!isRecording ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {detailedAreaId && (
                  <>
                    <button onClick={() => setDetailedAreaId(null)} className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                      <ChevronLeft size={18} />
                      <span className="text-sm font-medium">Back to Summary</span>
                    </button>
                    <div className="h-4 w-[1px] bg-zinc-200" />
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{activeDetailedArea?.name}</h2>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-100 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xl shadow-zinc-100/50 dark:shadow-none flex flex-col min-h-[500px]">
               {(!selectedStream && !searchQuery) ? (
                 <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
                   <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-900 rounded-2xl flex items-center justify-center mb-6">
                     <Search size={24} className="text-zinc-300" strokeWidth={1.5} />
                   </div>
                   <p className="text-sm font-medium text-zinc-500">Select a stream or search to view assessment records</p>
                 </div>
               ) : (loading || isSearching) ? (
                 <div className="flex-1 flex items-center justify-center p-20">
                   <Loader2 size={24} className="text-zinc-900 dark:text-white animate-spin" />
                 </div>
               ) : (
                 <div className="flex-1 overflow-auto">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                      <thead>
                         <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 z-20">
                            <th className="px-6 py-4 min-w-[250px] sticky left-0 bg-zinc-50/50 dark:bg-zinc-900/50 z-30 backdrop-blur-md">
                               <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Learner Name</p>
                            </th>
                            {!detailedAreaId ? (
                              viewMode === 'formative' ? (
                                activeAreas.map(area => (
                                  <th key={area.id} onClick={() => setDetailedAreaId(area.id)} className="px-3 py-4 text-center cursor-pointer hover:bg-zinc-100/50 transition-colors group">
                                    <p className="text-[11px] font-semibold text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors" title={area.name}>{area.name}</p>
                                  </th>
                                ))
                              ) : (
                                projects.filter(p => activeAreas.some(a => a.id === p.learning_area_id)).map(proj => (
                                  <th key={proj.id} className="px-3 py-4 text-center">
                                    <p className="text-[11px] font-semibold text-zinc-500" title={proj.title}>{proj.title}</p>
                                  </th>
                                ))
                              )
                            ) : (
                              uniqueColumns.map(col => {
                                 const [strand, subStrand] = col.split('::');
                                 return (
                                   <th key={col} className="px-4 py-3 border-r border-zinc-100 dark:border-zinc-800">
                                      <p className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate" title={subStrand}>{subStrand}</p>
                                      <p className="text-[9px] font-medium text-zinc-400 truncate uppercase tracking-tighter" title={strand}>{strand}</p>
                                   </th>
                                 );
                              })
                            )}
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50 dark:divide-zinc-900">
                         {(searchQuery ? searchResults : students).map(student => (
                           <tr key={student.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/20 transition-colors">
                              <td className="px-6 py-4 sticky left-0 bg-white dark:bg-[#0a0a0a] z-10 transition-colors">
                                 <div className="flex items-center gap-3">
                                   <div className="w-8 h-8 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 overflow-hidden flex-shrink-0">
                                      <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${student.profiles?.full_name}`} alt="Avatar" className="w-full h-full object-cover" />
                                   </div>
                                   <div>
                                     <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 capitalize">{student.profiles?.full_name?.toLowerCase() || 'Unknown'}</p>
                                     <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">{student.adm_no}</p>
                                   </div>
                                 </div>
                              </td>
                              {!detailedAreaId ? (
                                viewMode === 'formative' ? (
                                  activeAreas.map(area => {
                                    const rating = getSummaryRating(student.id, area.id);
                                    return (
                                      <td key={area.id} onClick={() => setDetailedAreaId(area.id)} className="px-3 py-4 text-center cursor-pointer">
                                        {rating ? (
                                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${getRatingColor(rating)}`}>
                                            {rating}
                                          </span>
                                        ) : (
                                          <span className="text-zinc-200 dark:text-zinc-800 text-[10px] font-bold">-</span>
                                        )}
                                      </td>
                                    );
                                  })
                                ) : (
                                  projects.filter(p => activeAreas.some(a => a.id === p.learning_area_id)).map(proj => {
                                    const sub = projectSubmissions.find(s => s.project_id === proj.id && s.student_id === student.id);
                                    return (
                                      <td key={proj.id} className="px-3 py-4 text-center">
                                        {sub ? (
                                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${getRatingColor(sub.rubric_rating)}`}>
                                            {sub.rubric_rating}
                                          </span>
                                        ) : (
                                          <span className="text-zinc-200 dark:text-zinc-800">-</span>
                                        )}
                                      </td>
                                    );
                                  })
                                )
                              ) : (
                                uniqueColumns.map(col => {
                                   const [strand, subStrand] = col.split('::');
                                   const assessment = detailedAssessments.find(a => 
                                     a.student_id === student.id && 
                                     (a.cbc_strands?.name || 'Unknown') === strand && 
                                     (a.cbc_sub_strands?.name || 'Unknown') === subStrand
                                   );
                                   return (
                                     <td key={col} className="px-4 py-4 text-center">
                                        {assessment ? (
                                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold border ${getRatingColor(assessment.rating)}`}>
                                            {assessment.rating}
                                          </span>
                                        ) : (
                                          <span className="text-zinc-200 dark:text-zinc-800">-</span>
                                        )}
                                     </td>
                                   );
                                })
                              )}
                           </tr>
                         ))}
                      </tbody>
                    </table>
                 </div>
               )}
            </div>
          </>
        ) : (
          <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-700">
            {/* 3-Step Minimalist Selector Bar */}
            <div className="flex flex-wrap items-center gap-3 bg-zinc-50/50 dark:bg-zinc-900/50 p-2 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              
              {/* Step 1: Learning Area */}
              <div className="flex-1 min-w-[200px]">
                <select 
                  value={recordingAreaId} 
                  onChange={e => {
                    setRecordingAreaId(e.target.value);
                    setRecordingStrandId('');
                    setRecordingSubStrandId('');
                  }} 
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:ring-2 ring-zinc-100 transition-all cursor-pointer"
                >
                  <option value="">1. Learning Area</option>
                  {activeAreas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>

              {/* Step 2: Strand */}
              <div className="flex-1 min-w-[200px]">
                <select 
                  value={recordingStrandId} 
                  onChange={e => {
                    setRecordingStrandId(e.target.value);
                    setRecordingSubStrandId('');
                  }} 
                  disabled={!recordingAreaId}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:ring-2 ring-zinc-100 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <option value="">2. Strand</option>
                  {strands.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {/* Step 3: Sub-Strand */}
              <div className="flex-1 min-w-[200px]">
                <select 
                  value={recordingSubStrandId} 
                  onChange={e => setRecordingSubStrandId(e.target.value)} 
                  disabled={!recordingStrandId}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-semibold outline-none focus:ring-2 ring-zinc-100 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <option value="">3. Sub-Strand</option>
                  {subStrands.map(ss => <option key={ss.id} value={ss.id}>{ss.name}</option>)}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => showAlert('Local drafts saved', 'Success')} 
                  className="px-4 py-2 text-[10px] font-bold text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  Draft All
                </button>
                <button 
                  onClick={() => showAlert('Pushing all records to database...', 'Success')} 
                  className="px-6 py-2.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-[10px] font-bold shadow-lg shadow-zinc-200 dark:shadow-none transition-all active:scale-95"
                >
                  Push All
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0a0a0a] border border-zinc-100 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-2xl shadow-zinc-100/50 dark:shadow-none flex flex-col min-h-[500px]">
              {!recordingSubStrandId ? (
                <div className="flex-1 flex flex-col items-center justify-center p-32 text-center">
                  <div className="w-20 h-20 bg-zinc-50 dark:bg-zinc-900 rounded-3xl flex items-center justify-center mb-8">
                    <CheckCircle2 size={32} className="text-zinc-200" strokeWidth={1} />
                  </div>
                  <p className="text-sm font-medium text-zinc-400">Select a sub-strand to begin assessment</p>
                </div>
              ) : (
                <div className="flex-1 overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800">
                        <th className="px-8 py-5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Learner</th>
                        <th className="px-8 py-5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 text-center">Competency</th>
                        <th className="px-8 py-5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Feedback / Remarks</th>
                        <th className="px-8 py-5 text-[11px] font-semibold uppercase tracking-wider text-zinc-400 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50 dark:divide-zinc-900">
                      {students.map(student => {
                        const assessment = assessments.find(a => 
                          a.student_id === student.id && 
                          a.learning_area_id === recordingAreaId && 
                          a.strand_id === recordingStrandId && 
                          a.sub_strand_id === recordingSubStrandId
                        );
                        
                        const draft = localChanges[student.id];
                        const currentRating = draft?.rating || assessment?.rating;
                        const currentComment = draft?.comment !== undefined ? draft.comment : (assessment?.teacher_comment || '');

                        return (
                          <tr key={student.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/20 transition-colors">
                            <td className="px-8 py-4">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                                  <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${student.profiles?.full_name}`} alt="Avatar" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 capitalize">{student.profiles?.full_name?.toLowerCase() || 'Unknown'}</p>
                                  <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">{student.adm_no}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-4">
                              <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-[280px] mx-auto">
                                {(streamObj?.classes?.level && streamObj.classes.level >= 7 ? ['EE1', 'EE2', 'ME1', 'ME2', 'AE1', 'AE2', 'BE1', 'BE2'] : ['EE', 'ME', 'AE', 'BE']).map(r => (
                                  <button
                                    key={r}
                                    onClick={() => handleRate(student.id, r)}
                                    disabled={savingId === student.id}
                                    className={`px-2 py-1.5 min-w-[36px] rounded-lg text-[10px] font-black border transition-all ${
                                      currentRating === r 
                                      ? getRatingColor(r) + ' shadow-sm scale-110 z-10'
                                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:border-zinc-400'
                                    } ${savingId === student.id ? 'opacity-30 cursor-wait' : ''}`}
                                  >
                                    {r}
                                  </button>
                                ))}
                              </div>
                            </td>
                            <td className="px-8 py-4 min-w-[250px]">
                              <input 
                                type="text"
                                placeholder="Add descriptive feedback..."
                                value={currentComment}
                                onChange={(e) => setLocalChanges(prev => ({
                                  ...prev,
                                  [student.id]: { ...prev[student.id], comment: e.target.value }
                                }))}
                                className="w-full bg-zinc-50/50 dark:bg-zinc-900/50 border border-transparent hover:border-zinc-100 dark:hover:border-zinc-800 focus:border-zinc-200 dark:focus:border-zinc-700 px-3 py-2.5 rounded-xl text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none transition-all placeholder:text-zinc-300"
                              />
                            </td>
                            <td className="px-8 py-4 text-right">
                               <div className="flex items-center justify-end gap-2">
                                  <button 
                                    onClick={() => {
                                      setLocalChanges(prev => {
                                        const next = { ...prev };
                                        delete next[student.id];
                                        return next;
                                      });
                                      showAlert('Draft cleared', 'Info');
                                    }}
                                    className="px-3 py-1.5 rounded-lg border border-zinc-100 dark:border-zinc-800 text-[10px] font-bold text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-all"
                                  >
                                    Draft
                                  </button>
                                  <button 
                                    onClick={() => commitRow(student.id)}
                                    disabled={!localChanges[student.id]}
                                    className={`px-4 py-2 rounded-lg text-[10px] font-bold transition-all ${
                                      !localChanges[student.id] 
                                      ? 'bg-zinc-50 dark:bg-zinc-900 text-zinc-300 cursor-not-allowed'
                                      : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:shadow-lg active:scale-95'
                                    }`}
                                  >
                                    {savingId === student.id ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
                                  </button>
                               </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };
