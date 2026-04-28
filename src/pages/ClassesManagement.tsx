import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Card, Button, Badge, Modal } from '../components/UI';
import { Search, Plus, Save, Edit, Users, School, TrendingUp, Target, UserCircle2, ChevronRight } from 'lucide-react';
import { cn } from '../utils/utils';

export const ClassesManagement: React.FC = () => {
  const { user } = useAuth();
  const [streams, setStreams] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<any | null>(null);
  const [selectedTeacherId, setSelectedTeacherId] = useState('');
  const [mainMeanScore, setMainMeanScore] = useState('');
  const [targetMeanScore, setTargetMeanScore] = useState('');

  const gradeFromScore = (value?: number | null) => {
    if (value == null || Number.isNaN(value)) return '-';
    if (value >= 80) return 'A';
    if (value >= 70) return 'B';
    if (value >= 60) return 'C';
    if (value >= 50) return 'D';
    return 'E';
  };

  const fetchClassesData = async () => {
    if (!user?.school_id) return;
    try {
      const [streamsData, teachersData] = await Promise.all([
        api.getStreamsWithDetails(user.school_id),
        api.getTeachers(user.school_id)
      ]);
      setStreams(streamsData || []);
      setTeachers(teachersData || []);
    } catch (error) {
      console.error('Failed to fetch class data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassesData();
  }, [user?.school_id]);

  const filteredStreams = streams.filter(s => 
    `${s.class?.name} ${s.name}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (s: any) => {
    setEditingStream(s);
    setSelectedTeacherId(s.class_teacher_id || '');
    setMainMeanScore(s.main_mean_score == null ? '' : String(s.main_mean_score));
    setTargetMeanScore(s.target_mean_score == null ? '' : String(s.target_mean_score));
    setIsModalOpen(true);
  };

  const handleUpdateTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStream) return;
    try {
      const parseScore = (value: string) => {
        if (!value.trim()) return null;
        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
          throw new Error('Scores must be between 0 and 100.');
        }
        return parsed;
      };

      await api.updateStreamProfile(editingStream.id, {
        class_teacher_id: selectedTeacherId || null,
        main_mean_score: parseScore(mainMeanScore),
        target_mean_score: parseScore(targetMeanScore)
      });
      await fetchClassesData();
      setIsModalOpen(false);
    } catch (error: any) {
      alert(error?.message || 'Failed to update class profile');
    }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-zinc-100 border-t-zinc-900 rounded-full animate-spin" />
      <p className="text-sm text-zinc-500 font-medium">Synchronizing school structures...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-10 py-6 animate-in fade-in duration-700">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-zinc-900 uppercase">Classes & Streams</h1>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mt-1">Institutional Academic Framework</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group flex-1 md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text" 
              placeholder="Search classes or teachers..." 
              className="w-full pl-12 pr-4 py-3 rounded-2xl border border-zinc-100 bg-white shadow-sm text-xs font-bold outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button className="rounded-2xl h-12 px-6 bg-zinc-900 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-zinc-200 hover:scale-105 active:scale-95 transition-all">
            <Plus size={16} className="mr-2" /> Add Class
          </Button>
        </div>
      </div>

      {/* Grid of Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4">
        {filteredStreams.map(s => (
          <div 
            key={s.id} 
            className="group relative overflow-hidden bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] p-8 shadow-sm transition-all hover:shadow-2xl hover:shadow-black/[0.03] hover:-translate-y-1"
          >
            {/* Top Row: Class Identification */}
            <div className="flex items-start justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-3xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center text-zinc-900 dark:text-white transition-colors group-hover:bg-zinc-900 group-hover:text-white dark:group-hover:bg-white dark:group-hover:text-black">
                  <School size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-zinc-900 dark:text-white uppercase tracking-tight leading-none">
                    Form {s.class?.name} {s.name}
                  </h3>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mt-1.5">
                    Active Academic Stream
                  </p>
                </div>
              </div>
              <button 
                onClick={() => handleEdit(s)}
                className="p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all opacity-0 group-hover:opacity-100"
              >
                <Edit size={16} />
              </button>
            </div>

            {/* Middle Section: Teacher & Students */}
            <div className="space-y-6 mb-8">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800/50">
                 <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center text-zinc-400 font-black text-xs">
                    {s.teacher?.full_name?.charAt(0) || <UserCircle2 size={16} />}
                 </div>
                 <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest leading-none mb-1">Class Teacher</p>
                    <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">{s.teacher?.full_name || 'Unassigned'}</p>
                 </div>
              </div>

              <div className="flex items-center justify-between px-2">
                 <div className="flex items-center gap-2">
                    <Users size={14} className="text-zinc-400" />
                    <span className="text-sm font-black text-zinc-900 dark:text-white tabular-nums">{s.students?.[0]?.count || 0}</span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Students</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/20" />
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Active Status</span>
                 </div>
              </div>
            </div>

            {/* Bottom Row: Performance Metrics */}
            <div className="grid grid-cols-2 gap-4 pt-6 border-t border-zinc-100 dark:border-zinc-800">
               <div className="space-y-1">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
                    <TrendingUp size={10} /> Mean
                  </p>
                  <p className="text-base font-black text-zinc-900 dark:text-white">
                    {s.main_mean_score != null ? `${s.main_mean_score.toFixed(1)}%` : '--'}
                    <span className="text-[10px] text-zinc-400 ml-1">({gradeFromScore(s.main_mean_score)})</span>
                  </p>
               </div>
               <div className="space-y-1 text-right">
                  <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest flex items-center justify-end gap-1.5">
                    <Target size={10} /> Target
                  </p>
                  <p className="text-base font-black text-zinc-900 dark:text-white">
                    {s.target_mean_score != null ? `${s.target_mean_score.toFixed(1)}%` : '--'}
                    <span className="text-[10px] text-zinc-400 ml-1">({gradeFromScore(s.target_mean_score)})</span>
                  </p>
               </div>
            </div>
            
            {/* Hover Indicator */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-900 translate-y-1 group-hover:translate-y-0 transition-transform" />
          </div>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Modify Institutional Structure">
        <div className="space-y-8">
          <div className="flex items-center gap-4 p-6 bg-zinc-900 text-white rounded-[2rem] shadow-xl">
             <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
                <School size={20} />
             </div>
             <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Selected Unit</p>
                <h3 className="text-xl font-black uppercase tracking-tight">Form {editingStream?.class?.name} - {editingStream?.name}</h3>
             </div>
          </div>
          
          <form onSubmit={handleUpdateTeacher} className="space-y-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">Assigned Class Teacher</label>
              <select 
                className="w-full px-5 py-4 rounded-2xl border border-zinc-200 bg-zinc-50 text-xs font-bold shadow-sm outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all appearance-none"
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                required
              >
                <option value="">Select a teacher...</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">Current Mean (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={mainMeanScore}
                  onChange={(e) => setMainMeanScore(e.target.value)}
                  placeholder="e.g. 62.5"
                  className="w-full px-5 py-4 rounded-2xl border border-zinc-200 bg-zinc-50 text-xs font-bold shadow-sm outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">Target Score (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={targetMeanScore}
                  onChange={(e) => setTargetMeanScore(e.target.value)}
                  placeholder="e.g. 70.0"
                  className="w-full px-5 py-4 rounded-2xl border border-zinc-200 bg-zinc-50 text-xs font-bold shadow-sm outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all"
                />
              </div>
            </div>
            
            <div className="flex gap-4 pt-4">
              <Button variant="outline" className="flex-1 rounded-2xl h-14 font-black text-[10px] uppercase tracking-widest" type="button" onClick={() => setIsModalOpen(false)}>Abort</Button>
              <Button type="submit" className="flex-[2] rounded-2xl h-14 bg-zinc-900 text-white font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-zinc-200"><Save size={16} className="mr-2" /> Commit Changes</Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
