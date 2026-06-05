import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toast';
import { 
  FolderKanban, 
  Plus, 
  Clock, 
  User, 
  Award, 
  Sparkles, 
  ArrowLeft,
  BookOpen,
  Calendar as CalendarIcon,
  Search,
  Check,
  Save,
  Loader2
} from 'lucide-react';
import { cn } from '../utils/utils';

interface GradingState {
  rubric_rating: string;
  teacher_comment: string;
  evidence_url: string;
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

export const ProjectSubmissions: React.FC = () => {
  const { user } = useAuth();
  const { students: contextStudents, terms } = useApp();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [learningAreas, setLearningAreas] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  
  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  
  // Modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    learning_area_id: '',
    term_id: '',
    class_id: '',
    deadline: ''
  });
  const [creatingProject, setCreatingProject] = useState(false);

  // Grading state
  const [gradingLoading, setGradingLoading] = useState(false);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [grades, setGrades] = useState<Record<string, GradingState>>({});
  const [originalGrades, setOriginalGrades] = useState<Record<string, GradingState>>({});

  const fetchInitialData = async () => {
    if (!user?.school_id) return;
    setLoading(true);
    try {
      const [projData, areasData, clsData] = await Promise.all([
        api.getCBCProjects(user.school_id),
        api.getLearningAreas(user.school_id),
        api.getClasses(user.school_id)
      ]);
      setProjects(projData || []);
      setLearningAreas(areasData || []);
      setClasses(clsData || []);
    } catch (err) {
      console.error('Failed to fetch initial data:', err);
      showToast('Failed to load projects', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, [user?.school_id]);

  const handleSelectProject = async (proj: any) => {
    setSelectedProject(proj);
    setGradingLoading(true);
    try {
      const subs = await api.getCBCProjectSubmissionsByProject(proj.id);
      
      const initialGrades: Record<string, GradingState> = {};
      (subs || []).forEach(sub => {
        initialGrades[sub.student_id] = {
          rubric_rating: sub.rubric_rating || '',
          teacher_comment: sub.teacher_comment || '',
          evidence_url: sub.evidence_url || ''
        };
      });
      setGrades({ ...initialGrades });
      setOriginalGrades({ ...initialGrades });
      
    } catch (err) {
      console.error('Failed to load submissions:', err);
      showToast('Failed to load student submissions', 'error');
    } finally {
      setGradingLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.school_id) return;
    if (!newProject.title || !newProject.learning_area_id || !newProject.term_id || !newProject.class_id || !newProject.deadline) {
      showToast('Please fill in all required fields', 'warning');
      return;
    }

    setCreatingProject(true);
    try {
      await api.createCBCProject({
        school_id: user.school_id,
        title: newProject.title,
        description: newProject.description,
        learning_area_id: newProject.learning_area_id,
        term_id: newProject.term_id,
        class_id: newProject.class_id,
        deadline: newProject.deadline
      });

      showToast('Summative project assigned successfully!', 'success');
      setShowAssignModal(false);
      setNewProject({ title: '', description: '', learning_area_id: '', term_id: '', class_id: '', deadline: '' });
      await fetchInitialData();
    } catch (err) {
      console.error('Failed to create project:', err);
      showToast('Failed to assign project. Is the class_id column added to the database?', 'error');
    } finally {
      setCreatingProject(false);
    }
  };

  const handleGradeChange = (studentId: string, field: keyof GradingState, value: string) => {
    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { rubric_rating: '', teacher_comment: '', evidence_url: '' }),
        [field]: value
      }
    }));
  };

  const setAllToRating = (rating: string) => {
    const updated = { ...grades };
    filteredStudents.forEach(s => {
      if (!updated[s.id]) updated[s.id] = { rubric_rating: '', teacher_comment: '', evidence_url: '' };
      updated[s.id].rubric_rating = rating;
    });
    setGrades(updated);
  };

  const handleSaveAllGrades = async () => {
    if (!selectedProject?.id) return;
    
    // Only save grades that have actually been touched/have a rating
    const toSave = Object.entries(grades).filter(([studentId, state]) => {
      const isModified = JSON.stringify(state) !== JSON.stringify(originalGrades[studentId] || {});
      return state.rubric_rating && isModified;
    });

    if (toSave.length === 0) {
      showToast('No new or modified grades to save.', 'info');
      return;
    }

    setSavingGlobal(true);
    try {
      const promises = toSave.map(([studentId, state]) => 
        api.saveCBCProjectSubmission({
          project_id: selectedProject.id,
          student_id: studentId,
          rubric_rating: state.rubric_rating,
          teacher_comment: state.teacher_comment,
          evidence_url: state.evidence_url
        })
      );
      await Promise.all(promises);

      // Update original state
      const newOriginals = { ...originalGrades };
      toSave.forEach(([studentId, state]) => {
        newOriginals[studentId] = { ...state };
      });
      setOriginalGrades(newOriginals);

      showToast(`Successfully published grades for ${toSave.length} students!`, 'success');
    } catch (err) {
      console.error('Failed to save grades:', err);
      showToast('Failed to save some grades', 'error');
    } finally {
      setSavingGlobal(false);
    }
  };

  const filteredStudents = useMemo(() => {
    if (!contextStudents || !selectedProject?.class_id) return [];
    
    let roster = contextStudents.filter(s => {
      // Find stream, then check stream's class_id
      if (!s.stream_id) return false;
      const streamClassId = s.stream?.class_id || s.stream?.class?.id;
      return streamClassId === selectedProject.class_id;
    });

    if (studentSearch) {
      const query = studentSearch.toLowerCase();
      roster = roster.filter(s => {
        const name = (s.profile?.full_name || (s as any).name || '').toLowerCase();
        const adm = (s.adm_no || (s as any).admissionNumber || '').toLowerCase();
        return name.includes(query) || adm.includes(query);
      });
    }
    
    return roster.sort((a, b) => {
      const nA = a.profile?.full_name || '';
      const nB = b.profile?.full_name || '';
      return nA.localeCompare(nB);
    });
  }, [contextStudents, selectedProject, studentSearch]);

  const isJuniorSecondary = selectedProject?.class?.level >= 7 && selectedProject?.class?.level <= 9;
  const ratingScales = isJuniorSecondary ? BAND_8_SCALES : BAND_4_SCALES;

  // Render ...
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-300 font-sans">
      
      {/* Dynamic Header */}
      <div className="flex items-end justify-between bg-white border-b border-zinc-200 pb-5 pt-2 sticky top-0 z-20">
         <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-amber-50 rounded-md text-[10px] font-black uppercase tracking-widest text-amber-700">
              <Sparkles size={12} className="text-amber-500" /> CBC Summative Evaluation
            </div>
            <h1 className="text-2xl font-black tracking-tight text-zinc-950 uppercase">
              {selectedProject ? selectedProject.title : "Project Manager"}
            </h1>
         </div>
         <div className="flex items-center gap-3">
            {!selectedProject ? (
              <button
                onClick={() => setShowAssignModal(true)}
                className="flex items-center gap-2 bg-zinc-950 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm"
              >
                <Plus size={16} /> New Project
              </button>
            ) : (
               <>
                  <button
                     onClick={() => setSelectedProject(null)}
                     className="flex items-center gap-2 bg-white border border-zinc-200 hover:bg-zinc-50 text-zinc-700 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                  >
                     <ArrowLeft size={16} /> Back
                  </button>
                  <button
                     onClick={handleSaveAllGrades}
                     disabled={savingGlobal}
                     className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-sm"
                  >
                     {savingGlobal ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Publish Grades
                  </button>
               </>
            )}
         </div>
      </div>

      {loading ? (
        <div className="p-20 text-center font-bold text-zinc-400 uppercase tracking-widest animate-pulse text-xs">
          Loading Framework...
        </div>
      ) : !selectedProject ? (
        
        /* Active Projects Dashboard */
        <div className="space-y-4">
           {projects.length === 0 ? (
             <div className="text-center p-20 bg-zinc-50 border border-zinc-100 rounded-3xl space-y-4">
               <FolderKanban size={48} className="mx-auto text-zinc-300" />
               <h3 className="text-sm font-black text-zinc-900 uppercase tracking-tight">No Active Projects</h3>
               <button onClick={() => setShowAssignModal(true)} className="text-xs font-bold text-blue-600 hover:underline">Create your first project &rarr;</button>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
               {projects.map((proj) => (
                 <div 
                   key={proj.id}
                   onClick={() => handleSelectProject(proj)}
                   className="bg-white rounded-3xl border border-zinc-200 p-6 hover:border-zinc-400 hover:shadow-xl transition-all cursor-pointer group flex flex-col justify-between h-[240px]"
                 >
                   <div className="space-y-4">
                     <div className="flex items-start justify-between gap-2">
                       <span className="px-2.5 py-1 bg-zinc-100 text-zinc-600 rounded-md text-[10px] font-black uppercase tracking-widest">
                         {proj.class?.name || 'School-Wide'}
                       </span>
                       <span className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                         <Clock size={12} /> {proj.deadline ? new Date(proj.deadline).toLocaleDateString() : 'N/A'}
                       </span>
                     </div>
                     <div>
                        <h3 className="text-lg font-black text-zinc-900 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                           {proj.title}
                        </h3>
                        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-1 truncate">
                           {proj.learning_area?.name || 'General Area'}
                        </p>
                     </div>
                     <p className="text-xs font-medium text-zinc-500 line-clamp-2">
                       {proj.description || 'No description provided.'}
                     </p>
                   </div>
                   <div className="pt-4 border-t border-zinc-100 flex items-center justify-between mt-auto">
                     <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-zinc-400">
                       <Award size={14} className="text-amber-500" /> Grade Roster
                     </div>
                     <div className="w-8 h-8 rounded-full bg-zinc-50 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-zinc-400 transition-colors">
                       &rarr;
                     </div>
                   </div>
                 </div>
               ))}
             </div>
           )}
        </div>

      ) : (

        /* High-Speed Grading Grid */
        <div className="space-y-6">
          <div className="bg-zinc-50 rounded-2xl p-5 border border-zinc-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               <div className="w-12 h-12 bg-white rounded-xl border border-zinc-200 flex items-center justify-center text-blue-600">
                  <BookOpen size={20} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-0.5">{selectedProject.learning_area?.name}</p>
                  <p className="text-sm font-black text-zinc-900">Target: {selectedProject.class?.name || 'All Students'}</p>
               </div>
            </div>
            <div className="relative w-full md:w-72">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Search roster..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:border-zinc-400 transition-colors"
              />
            </div>
          </div>

          <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden flex flex-col h-[calc(100vh-320px)]">
             {gradingLoading ? (
                <div className="flex-1 flex items-center justify-center text-xs font-bold text-zinc-400 animate-pulse uppercase tracking-widest">
                   Compiling Roster...
                </div>
             ) : (
                <>
                   {/* Bulk Actions */}
                   <div className="bg-zinc-50 border-b border-zinc-200 p-3 flex items-center justify-between">
                     <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-2">Class Roster ({filteredStudents.length})</span>
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase mr-1">Set All To:</span>
                        {ratingScales.map(scale => (
                           <button 
                              key={scale.value}
                              onClick={() => setAllToRating(scale.value)}
                              className="px-2.5 py-1.5 bg-white border border-zinc-200 hover:border-zinc-300 rounded-md text-[9px] font-black tracking-widest transition-all"
                           >
                              {scale.label}
                           </button>
                        ))}
                     </div>
                  </div>

                  {/* Grid */}
                  <div className="flex-1 overflow-y-auto">
                     <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-white/90 backdrop-blur z-10 shadow-sm">
                           <tr className="border-b border-zinc-200">
                              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 w-1/4">Student</th>
                              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 w-[200px]">Summative Rating</th>
                              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400">Teacher Remarks</th>
                              <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 w-[150px]">Evidence URL</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                           {filteredStudents.length === 0 && (
                              <tr><td colSpan={4} className="p-8 text-center text-xs font-bold text-zinc-400">No students found in this class.</td></tr>
                           )}
                           {filteredStudents.map(student => {
                              const state = grades[student.id] || { rubric_rating: '', teacher_comment: '', evidence_url: '' };
                              const original = originalGrades[student.id] || {};
                              const isUnsaved = JSON.stringify(state) !== JSON.stringify(original) && state.rubric_rating;

                              return (
                                 <tr key={student.id} className={cn("hover:bg-zinc-50 transition-colors", state.rubric_rating ? "bg-zinc-50/30" : "")}>
                                    <td className="px-4 py-3">
                                       <div className="flex items-center gap-2">
                                          <p className="text-xs font-bold text-zinc-900">{student.profile?.full_name}</p>
                                          {isUnsaved && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" title="Unsaved changes" />}
                                       </div>
                                       <p className="text-[10px] font-bold text-zinc-400 tracking-widest uppercase mt-0.5">{student.adm_no}</p>
                                    </td>
                                    <td className="px-4 py-3">
                                       <div className="flex gap-1 flex-wrap">
                                          {ratingScales.map(scale => {
                                             const isSelected = state.rubric_rating === scale.value;
                                             let bg = 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300';
                                             if (isSelected) {
                                                if (scale.value.startsWith('EE')) bg = 'bg-emerald-600 text-white border-emerald-600';
                                                else if (scale.value.startsWith('ME')) bg = 'bg-blue-600 text-white border-blue-600';
                                                else if (scale.value.startsWith('AE')) bg = 'bg-amber-600 text-white border-amber-600';
                                                else if (scale.value.startsWith('BE')) bg = 'bg-rose-600 text-white border-rose-600';
                                             }
                                             return (
                                                <button
                                                   key={scale.value}
                                                   onClick={() => handleGradeChange(student.id, 'rubric_rating', scale.value)}
                                                   className={cn("px-2 py-1 rounded border text-[9px] font-black tracking-wider transition-all", bg)}
                                                >
                                                   {scale.label}
                                                </button>
                                             );
                                          })}
                                       </div>
                                    </td>
                                    <td className="px-4 py-3">
                                       <input 
                                          type="text" placeholder="Add specific feedback..."
                                          value={state.teacher_comment}
                                          onChange={(e) => handleGradeChange(student.id, 'teacher_comment', e.target.value)}
                                          className="w-full bg-white border border-zinc-200 focus:border-zinc-400 rounded-lg px-3 py-1.5 text-xs font-medium outline-none transition-all"
                                       />
                                    </td>
                                    <td className="px-4 py-3">
                                       <input 
                                          type="text" placeholder="https://..."
                                          value={state.evidence_url}
                                          onChange={(e) => handleGradeChange(student.id, 'evidence_url', e.target.value)}
                                          className="w-full bg-white border border-zinc-200 focus:border-zinc-400 rounded-lg px-3 py-1.5 text-[10px] font-medium outline-none transition-all"
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
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-zinc-200 p-8 max-w-lg w-full space-y-6 shadow-2xl">
            <h3 className="text-lg font-black text-zinc-900 uppercase tracking-tight border-b border-zinc-100 pb-4">
              Initialize Summative Project
            </h3>
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Target Class *</label>
                   <select
                     value={newProject.class_id}
                     onChange={(e) => setNewProject(prev => ({ ...prev, class_id: e.target.value }))}
                     className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600"
                     required
                   >
                     <option value="">Select Class...</option>
                     {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                   </select>
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Term *</label>
                   <select
                     value={newProject.term_id}
                     onChange={(e) => setNewProject(prev => ({ ...prev, term_id: e.target.value }))}
                     className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600"
                     required
                   >
                     <option value="">Select Term...</option>
                     {terms.map((t: any) => <option key={t.id} value={t.id}>{t.name} ({t.year})</option>)}
                   </select>
                 </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Learning Area *</label>
                <select
                  value={newProject.learning_area_id}
                  onChange={(e) => setNewProject(prev => ({ ...prev, learning_area_id: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600"
                  required
                >
                  <option value="">Select Learning Area...</option>
                  {learningAreas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Project Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Kitchen Garden Setup"
                  value={newProject.title}
                  onChange={(e) => setNewProject(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Submission Deadline *</label>
                <input
                  type="date"
                  value={newProject.deadline}
                  onChange={(e) => setNewProject(prev => ({ ...prev, deadline: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold outline-none focus:border-blue-600"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-6">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider text-zinc-500 hover:bg-zinc-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingProject}
                  className="px-5 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2"
                >
                  {creatingProject ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectSubmissions;
