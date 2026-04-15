import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Card, Table, Button, Badge, Modal } from '../components/UI';
import { Search, Plus, Save, Edit, Users, School } from 'lucide-react';

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

  const formatScoreWithGrade = (value?: number | null) => {
    if (value == null || Number.isNaN(value)) return '-';
    const safe = Number(value);
    return `${safe.toFixed(1)}% (${gradeFromScore(safe)})`;
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
      <p className="text-sm text-zinc-500 font-medium">Loading classes...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-10 py-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">Classes</h1>
          <p className="text-zinc-500 mt-2 font-medium">Manage student groups and teacher assignments</p>
        </div>
        <Button className="rounded-2xl px-6 py-6 h-auto bg-zinc-900 hover:bg-zinc-800 shadow-xl shadow-zinc-200/50">
          <Plus size={20} className="mr-2" /> New Class
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <Card className="border-zinc-100/80 shadow-sm rounded-[2rem] overflow-hidden p-0 bg-white">
          <div className="p-8 border-b border-zinc-50 flex items-center gap-4 bg-zinc-50/30">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by class or stream name..." 
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-transparent bg-white shadow-sm text-zinc-600 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-zinc-100 transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table headers={['Level', 'Stream', 'Class Teacher', 'Students', 'Mean Score', 'Target Score', 'Actions']}>
              {filteredStreams.map(s => (
                <tr key={s.id} className="group hover:bg-zinc-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-50 group-hover:bg-white rounded-2xl shadow-sm flex items-center justify-center text-zinc-900 transition-colors border border-zinc-100">
                        <School size={20} />
                      </div>
                      <span className="font-semibold text-zinc-900 text-lg">Form {s.class?.level}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                     <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-zinc-100 text-zinc-700 text-sm font-semibold border border-zinc-200/50">
                       {s.name}
                     </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 border border-zinc-200/50 flex items-center justify-center text-zinc-500 font-bold text-xs shadow-inner">
                        {s.teacher?.full_name?.charAt(0) || '?'}
                      </div>
                      <span className="text-zinc-700 font-medium">{s.teacher?.full_name || 'Unassigned'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
                      <span className="text-zinc-900 font-bold text-lg">{s.students?.[0]?.count || 0}</span>
                      <span className="text-zinc-400 font-medium text-sm">Students</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-zinc-700 font-semibold">{formatScoreWithGrade(s.main_mean_score)}</span>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-zinc-700 font-semibold">{formatScoreWithGrade(s.target_mean_score)}</span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <Button variant="ghost" className="h-10 px-4 rounded-xl hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-zinc-100" onClick={() => handleEdit(s)}>
                      <Edit size={18} className="text-zinc-400 group-hover:text-zinc-900 transition-colors" />
                      <span className="ml-2 text-zinc-500 group-hover:text-zinc-900 font-medium">Edit</span>
                    </Button>
                  </td>
                </tr>
              ))}
            </Table>
          </div>
        </Card>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Change Class Teacher">
        <div className="space-y-6">
          <div className="p-6 bg-zinc-50 rounded-[1.5rem] border border-zinc-100/50">
             <p className="text-xs text-zinc-400 font-semibold mb-1 uppercase tracking-wider">Current Selection</p>
             <p className="text-xl font-bold text-zinc-900">Form {editingStream?.class?.level} - {editingStream?.name}</p>
          </div>
          
          <form onSubmit={handleUpdateTeacher} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-zinc-700 mb-2 ml-1">New Class Teacher</label>
              <select 
                className="w-full px-5 py-4 rounded-2xl border border-zinc-200 bg-white text-zinc-800 shadow-sm outline-none focus:ring-2 focus:ring-zinc-100 transition-all appearance-none"
                value={selectedTeacherId}
                onChange={(e) => setSelectedTeacherId(e.target.value)}
                required
              >
                <option value="">Select a teacher...</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2 ml-1">Main Mean Score (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={mainMeanScore}
                  onChange={(e) => setMainMeanScore(e.target.value)}
                  placeholder="e.g. 62.5"
                  className="w-full px-5 py-4 rounded-2xl border border-zinc-200 bg-white text-zinc-800 shadow-sm outline-none focus:ring-2 focus:ring-zinc-100 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-700 mb-2 ml-1">Target Mean Score (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  value={targetMeanScore}
                  onChange={(e) => setTargetMeanScore(e.target.value)}
                  placeholder="e.g. 70.0"
                  className="w-full px-5 py-4 rounded-2xl border border-zinc-200 bg-white text-zinc-800 shadow-sm outline-none focus:ring-2 focus:ring-zinc-100 transition-all"
                />
              </div>
            </div>
            
            <div className="pt-4 flex gap-3">
              <Button variant="outline" className="flex-1 py-4 border-2 rounded-2xl font-semibold" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" className="flex-2 py-4 rounded-2xl bg-zinc-900 shadow-xl shadow-zinc-200 font-semibold px-8"><Save size={18} className="mr-2" /> Update Assignment</Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
