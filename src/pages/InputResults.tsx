import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Save, Loader2, Users, CheckCircle } from 'lucide-react';
import { cn } from '../utils/utils';

interface StudentGradeState {
  rating: string;
  raw_score: string;
  remarks: string;
}

const BAND_4_SCALES = [
  { value: 'EE', label: 'EE' },
  { value: 'ME', label: 'ME' },
  { value: 'AE', label: 'AE' },
  { value: 'BE', label: 'BE' }
];

const BAND_8_SCALES = [
  { value: 'EE1', label: 'EE1' },
  { value: 'EE2', label: 'EE2' },
  { value: 'ME1', label: 'ME1' },
  { value: 'ME2', label: 'ME2' },
  { value: 'AE1', label: 'AE1' },
  { value: 'AE2', label: 'AE2' },
  { value: 'BE1', label: 'BE1' },
  { value: 'BE2', label: 'BE2' }
];

export const InputResults: React.FC = () => {
  const { user } = useAuth();
  
  // Context Data
  const [terms, setTerms] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [learningAreas, setLearningAreas] = useState<any[]>([]);
  const [strands, setStrands] = useState<any[]>([]);
  const [subStrands, setSubStrands] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);

  // Selected Filters
  const [selectedTermId, setSelectedTermId] = useState('');
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [selectedLearningAreaId, setSelectedLearningAreaId] = useState('');
  const [selectedStrandId, setSelectedStrandId] = useState('');
  const [selectedSubStrandId, setSelectedSubStrandId] = useState('');

  // UI State
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  // Grading State
  const [grades, setGrades] = useState<Record<string, StudentGradeState>>({});

  useEffect(() => {
    const fetchInitial = async () => {
      if (!user?.school_id) return;
      try {
        const [t, s, la] = await Promise.all([
          api.getTerms(user.school_id),
          api.getStreams(user.school_id),
          api.getLearningAreas(user.school_id)
        ]);
        setTerms(t || []);
        setStreams(s || []);
        setLearningAreas(la || []);

        const activeTerm = (t || []).find((x: any) => x.is_current);
        if (activeTerm) setSelectedTermId(activeTerm.id);
        else if (t && t.length > 0) setSelectedTermId(t[0].id);

      } catch (err) {
        console.error(err);
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchInitial();
  }, [user?.school_id]);

  useEffect(() => {
    const fetchStrands = async () => {
      if (!selectedLearningAreaId) {
        setStrands([]);
        setSelectedStrandId('');
        return;
      }
      const { data } = await supabase.from('cbc_strands').select('*').eq('learning_area_id', selectedLearningAreaId).order('name');
      setStrands(data || []);
      setSelectedStrandId('');
    };
    fetchStrands();
  }, [selectedLearningAreaId]);

  useEffect(() => {
    const fetchSubStrands = async () => {
      if (!selectedStrandId) {
        setSubStrands([]);
        setSelectedSubStrandId('');
        return;
      }
      const { data } = await supabase.from('cbc_sub_strands').select('*').eq('strand_id', selectedStrandId).order('name');
      setSubStrands(data || []);
      setSelectedSubStrandId('');
    };
    fetchSubStrands();
  }, [selectedStrandId]);

  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedStreamId || !user?.school_id) {
        setStudents([]);
        return;
      }
      setLoadingStudents(true);
      const { data } = await supabase
        .from('students')
        .select('*, profile:profiles!students_id_fkey(*)')
        .eq('stream_id', selectedStreamId)
        .order('adm_no');
      
      const sorted = (data || []).sort((a: any, b: any) => {
         const nameA = a.profile?.full_name || '';
         const nameB = b.profile?.full_name || '';
         return nameA.localeCompare(nameB);
      });
      setStudents(sorted);
      
      // Initialize grading state
      const initialGrades: Record<string, StudentGradeState> = {};
      sorted.forEach((s: any) => {
        initialGrades[s.id] = { rating: '', raw_score: '', remarks: '' };
      });
      setGrades(initialGrades);
      
      setLoadingStudents(false);
    };
    fetchStudents();
  }, [selectedStreamId, user?.school_id]);

  const selectedStream = useMemo(() => {
    return streams.find(s => s.id === selectedStreamId);
  }, [streams, selectedStreamId]);

  const studentGradeLevel = useMemo(() => {
    if (!selectedStream || !selectedStream.class?.level) return 0;
    return parseInt(selectedStream.class.level.toString());
  }, [selectedStream]);

  const isJuniorSecondary = studentGradeLevel >= 7 && studentGradeLevel <= 9;
  const ratingScales = isJuniorSecondary ? BAND_8_SCALES : BAND_4_SCALES;

  const handleGradeChange = (studentId: string, field: keyof StudentGradeState, value: string) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  const setAllToRating = (rating: string) => {
    const updated = { ...grades };
    Object.keys(updated).forEach(id => {
      updated[id].rating = rating;
    });
    setGrades(updated);
  };

  const handleSave = async () => {
    if (!user?.school_id || !selectedTermId || !selectedLearningAreaId || !selectedStrandId || !selectedSubStrandId) return;
    
    // Filter out empty grades
    const toSave = Object.entries(grades).filter(([_, state]) => state.rating !== '');
    if (toSave.length === 0) {
      alert("No grades inputted to save.");
      return;
    }

    setSaving(true);
    try {
      const strand = strands.find(s => s.id === selectedStrandId);
      const subStrand = subStrands.find(s => s.id === selectedSubStrandId);
      const term = terms.find(t => t.id === selectedTermId);

      const promises = toSave.map(([studentId, state]) => {
        return api.saveCBCStudentAssessment({
          school_id: user.school_id,
          student_id: studentId,
          learning_area_id: selectedLearningAreaId,
          strand_id: selectedStrandId,
          sub_strand_id: selectedSubStrandId,
          rating: state.rating,
          raw_score: state.raw_score ? parseInt(state.raw_score) : null,
          teacher_comment: state.remarks,
          grade_level_at_time: studentGradeLevel,
          strand: strand?.name || 'Unknown',
          sub_strand: subStrand?.name || 'Unknown',
          updated_at: new Date().toISOString()
        });
      });

      await Promise.all(promises);
      alert(`Successfully published grades for ${toSave.length} students!`);
      
      // Clear grades on success
      const cleared: Record<string, StudentGradeState> = {};
      Object.keys(grades).forEach(id => {
        cleared[id] = { rating: '', raw_score: '', remarks: '' };
      });
      setGrades(cleared);

    } catch (err) {
      console.error(err);
      alert("Failed to save some assessments.");
    } finally {
      setSaving(false);
    }
  };

  const isFormValid = selectedTermId && selectedStreamId && selectedLearningAreaId && selectedStrandId && selectedSubStrandId;
  const gradedCount = Object.values(grades).filter(g => g.rating !== '').length;

  if (loadingInitial) return <div className="p-8 font-bold text-zinc-900 animate-pulse">Initializing Mass Grading...</div>;

  return (
    <div className="max-w-[1400px] mx-auto p-4 lg:p-6 font-sans h-[calc(100vh-64px)] flex flex-col bg-white">
      
      {/* Header */}
      <div className="flex items-end justify-between mb-6 pb-4 border-b border-zinc-100 shrink-0">
         <div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-950">Formative Mass Grading</h1>
            <p className="text-sm font-medium text-zinc-500 mt-1">Rapidly input classwork observations across a specific sub-strand.</p>
         </div>
         <button 
            onClick={handleSave} 
            disabled={!isFormValid || gradedCount === 0 || saving}
            className="px-6 py-2.5 bg-zinc-950 hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-zinc-950 rounded-xl text-sm font-bold text-white transition-all shadow-sm flex items-center gap-2"
         >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} 
            Publish ({gradedCount})
         </button>
      </div>

      <div className="flex gap-6 min-h-0 flex-1">
         {/* Left Panel: Subject Setup */}
         <div className="w-[320px] shrink-0 flex flex-col gap-6">
            <div className="p-5 bg-zinc-50 border border-zinc-100 rounded-2xl space-y-4">
               <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">Context</label>
                  <div className="space-y-2">
                     <select 
                        value={selectedTermId} 
                        onChange={e => setSelectedTermId(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold text-zinc-700 outline-none"
                     >
                        <option value="">Select Term</option>
                        {terms.map(t => <option key={t.id} value={t.id}>{t.name} {t.year}</option>)}
                     </select>
                     <select 
                        value={selectedStreamId} 
                        onChange={e => setSelectedStreamId(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold text-zinc-700 outline-none"
                     >
                        <option value="">Select Class/Stream</option>
                        {streams.map(s => <option key={s.id} value={s.id}>{s.class?.name} {s.name}</option>)}
                     </select>
                  </div>
               </div>
            </div>

            <div className="p-5 bg-zinc-50 border border-zinc-100 rounded-2xl space-y-4">
               <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1.5 block">Curriculum Area</label>
                  <div className="space-y-2">
                     <select 
                        value={selectedLearningAreaId} 
                        onChange={e => setSelectedLearningAreaId(e.target.value)}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold text-zinc-700 outline-none"
                     >
                        <option value="">Select Learning Area</option>
                        {learningAreas.map(la => <option key={la.id} value={la.id}>{la.name}</option>)}
                     </select>
                     <select 
                        value={selectedStrandId} 
                        onChange={e => setSelectedStrandId(e.target.value)}
                        disabled={!selectedLearningAreaId}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold text-zinc-700 outline-none disabled:opacity-50"
                     >
                        <option value="">Select Strand</option>
                        {strands.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                     </select>
                     <select 
                        value={selectedSubStrandId} 
                        onChange={e => setSelectedSubStrandId(e.target.value)}
                        disabled={!selectedStrandId}
                        className="w-full bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-bold text-zinc-700 outline-none disabled:opacity-50"
                     >
                        <option value="">Select Sub-Strand</option>
                        {subStrands.map(ss => <option key={ss.id} value={ss.id}>{ss.name}</option>)}
                     </select>
                  </div>
               </div>
            </div>
            
            {isFormValid && (
               <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl text-center">
                  <CheckCircle size={24} className="mx-auto text-emerald-600 mb-2" />
                  <h3 className="text-xs font-black text-emerald-900 uppercase tracking-widest">Ready for Grading</h3>
                  <p className="text-[10px] font-bold text-emerald-700 mt-1">Scale: {isJuniorSecondary ? '8-Level JSS' : '4-Band Primary'}</p>
               </div>
            )}
         </div>

         {/* Right Panel: Mass Grid */}
         <div className="flex-1 border border-zinc-200 rounded-3xl overflow-hidden flex flex-col bg-white">
            {!isFormValid ? (
               <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 p-8 text-center bg-zinc-50/50">
                  <Users size={32} className="text-zinc-300 mb-2" />
                  <h3 className="text-sm font-bold text-zinc-900">Configure Context</h3>
                  <p className="text-xs max-w-xs">Select a Term, Stream, and Sub-Strand on the left to load the class roster.</p>
               </div>
            ) : loadingStudents ? (
               <div className="flex-1 flex items-center justify-center text-xs font-bold text-zinc-400 animate-pulse uppercase tracking-widest">
                  Loading Roster...
               </div>
            ) : (
               <>
                  {/* Bulk Actions Bar */}
                  <div className="bg-zinc-50 border-b border-zinc-200 p-3 flex items-center justify-between">
                     <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Roster ({students.length})</span>
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase mr-1">Set All To:</span>
                        {ratingScales.map(scale => (
                           <button 
                              key={scale.value}
                              onClick={() => setAllToRating(scale.value)}
                              className="px-2 py-1 bg-white border border-zinc-200 hover:border-zinc-300 rounded text-[9px] font-black tracking-widest transition-all"
                           >
                              {scale.label}
                           </button>
                        ))}
                     </div>
                  </div>

                  {/* Datatable */}
                  <div className="flex-1 overflow-y-auto">
                     <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white/90 backdrop-blur z-10 shadow-sm">
                           <tr className="border-b border-zinc-200">
                              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 w-1/3">Student</th>
                              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 w-[180px]">Rating</th>
                              {isJuniorSecondary && <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 w-[80px]">Raw %</th>}
                              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400">Remarks (Optional)</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                           {students.map(student => {
                              const state = grades[student.id];
                              if (!state) return null;

                              return (
                                 <tr key={student.id} className={cn("hover:bg-zinc-50 transition-colors", state.rating ? "bg-zinc-50/50" : "")}>
                                    <td className="px-4 py-3">
                                       <p className="text-xs font-bold text-zinc-900">{student.profile?.full_name}</p>
                                       <p className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase mt-0.5">{student.adm_no}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                       <div className="flex gap-1 flex-wrap">
                                          {ratingScales.map(scale => {
                                             const isSelected = state.rating === scale.value;
                                             let bg = 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300';
                                             if (isSelected) {
                                                if (scale.value.startsWith('EE')) bg = 'bg-emerald-600 text-white border-emerald-600 shadow-sm shadow-emerald-600/20';
                                                else if (scale.value.startsWith('ME')) bg = 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/20';
                                                else if (scale.value.startsWith('AE')) bg = 'bg-amber-600 text-white border-amber-600 shadow-sm shadow-amber-600/20';
                                                else if (scale.value.startsWith('BE')) bg = 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-600/20';
                                             }
                                             return (
                                                <button
                                                   key={scale.value}
                                                   onClick={() => handleGradeChange(student.id, 'rating', scale.value)}
                                                   className={cn("px-2 py-1 rounded border text-[9px] font-black tracking-wider transition-all", bg)}
                                                >
                                                   {scale.label}
                                                </button>
                                             );
                                          })}
                                       </div>
                                    </td>
                                    {isJuniorSecondary && (
                                       <td className="px-4 py-3">
                                          <input 
                                             type="number" min="0" max="100" placeholder="%"
                                             value={state.raw_score}
                                             onChange={(e) => handleGradeChange(student.id, 'raw_score', e.target.value)}
                                             className="w-14 bg-white border border-zinc-200 focus:border-zinc-400 rounded-md px-2 py-1.5 text-xs font-bold text-center outline-none transition-all"
                                          />
                                       </td>
                                    )}
                                    <td className="px-4 py-3">
                                       <input 
                                          type="text" placeholder="Teacher comment..."
                                          value={state.remarks}
                                          onChange={(e) => handleGradeChange(student.id, 'remarks', e.target.value)}
                                          className="w-full bg-white border border-zinc-200 focus:border-zinc-400 rounded-lg px-3 py-1.5 text-xs font-medium outline-none transition-all"
                                       />
                                    </td>
                                 </tr>
                              );
                           })}
                        </tbody>
                     </table>
                  </div>
               </>
            )}
         </div>
      </div>
    </div>
  );
};

export default InputResults;
