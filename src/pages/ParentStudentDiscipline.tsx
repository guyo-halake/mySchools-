import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Badge } from '../components/UI';

export const ParentStudentDiscipline: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [rows, setRows] = useState<any[]>([]);

  const selectedStudent = useMemo(() => students.find((row: any) => row.id === selectedStudentId) || null, [students, selectedStudentId]);

  const loadData = async () => {
    if (!user?.school_id) return;
    setLoading(true);
    setError('');
    try {
      const allStudents = await api.getStudents(user.school_id);
      const scopedStudents = user.role === 'PARENT'
        ? allStudents.filter((row: any) => row.parent_id === user.id)
        : allStudents.filter((row: any) => row.id === user.id);

      const activeStudentId = selectedStudentId && scopedStudents.some((row: any) => row.id === selectedStudentId)
        ? selectedStudentId
        : (scopedStudents[0]?.id || '');

      setStudents(scopedStudents);
      setSelectedStudentId(activeStudentId);

      if (!activeStudentId) {
        setRows([]);
        return;
      }

      const records = await api.getDisciplinaryRecords(activeStudentId);
      setRows(records || []);
    } catch (err: any) {
      setError(err?.message || 'Could not load discipline records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id, user?.school_id]);

  useEffect(() => {
    if (!selectedStudentId) return;
    api.getDisciplinaryRecords(selectedStudentId)
      .then((records) => setRows(records || []))
      .catch((err) => setError(err?.message || 'Could not load discipline records.'));
  }, [selectedStudentId]);

  useEffect(() => {
    if (!user?.school_id) return;
    const channel = supabase
      .channel(`parent-student-discipline-${user.school_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'disciplinary_records' }, loadData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.school_id, user?.id, selectedStudentId]);

  if (loading) {
    return <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-sm text-zinc-500">Loading discipline records...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-8">
      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700">{error}</div>}

      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between border-b border-zinc-100 dark:border-zinc-800 pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-zinc-900 dark:text-white font-sora tracking-tight">Digital Diary</h1>
          <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Behavior & Values Tracking</p>
        </div>
        {students.length > 1 && (
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs font-bold outline-none shadow-sm"
          >
            {students.map((row: any) => (
              <option key={row.id} value={row.id}>{row.profile?.full_name || row.adm_no}</option>
            ))}
          </select>
        )}
      </div>

      <div className="rounded-[2rem] border border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Date</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Observation / Activity</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Value / Competency</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest text-center">Engagement Level</th>
                <th className="px-6 py-4 text-[10px] font-black text-zinc-400 uppercase tracking-widest">Teacher Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800/50">
              {rows.length === 0 && <tr><td colSpan={5} className="px-6 py-20 text-[10px] font-bold text-zinc-300 uppercase tracking-widest text-center">No Diary Entries Recorded.</td></tr>}
              {rows.map((row: any) => (
                <tr key={row.id} className="group hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors">
                  <td className="px-6 py-4 text-xs font-bold text-zinc-400 uppercase tracking-tight">{row.incident_at ? new Date(row.incident_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : (row.incident_date || '-')}</td>
                  <td className="px-6 py-4 text-xs font-black text-zinc-900 dark:text-white uppercase tracking-tight">{row.incident_title || '-'}</td>
                  <td className="px-6 py-4 text-xs font-bold text-emerald-600">{row.action_taken || 'General Behavior'}</td>
                  <td className="px-6 py-4 text-center">
                     <span className={cn("px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest", String(row.status || '').toUpperCase() === 'RESOLVED' ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600")}>
                        {String(row.status || '').toUpperCase() === 'RESOLVED' ? 'Positive' : 'Needs Attention'}
                     </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-zinc-500 font-medium italic">"{row.verdict || row.description || '-'}"</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
