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
    <div className="space-y-6">
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Disciplinary</h1>
            <p className="text-xs text-zinc-500">Live discipline timeline</p>
          </div>
          {students.length > 1 && (
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs outline-none"
            >
              {students.map((row: any) => (
                <option key={row.id} value={row.id}>{row.profile?.full_name || row.adm_no}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-x-auto">
        <table className="w-full min-w-[760px]">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Incident</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Notes</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-sm text-zinc-500 text-center">No disciplinary records.</td></tr>}
            {rows.map((row: any) => (
              <tr key={row.id} className="border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
                <td className="px-4 py-3 text-sm font-medium">{row.incident_title || '-'}</td>
                <td className="px-4 py-3 text-sm text-zinc-500">{row.incident_at ? new Date(row.incident_at).toLocaleString() : (row.incident_date || '-')}</td>
                <td className="px-4 py-3 text-sm">{row.action_taken || '-'}</td>
                <td className="px-4 py-3 text-sm"><Badge variant={String(row.status || '').toUpperCase() === 'RESOLVED' ? 'success' : 'warning'}>{row.status || 'OPEN'}</Badge></td>
                <td className="px-4 py-3 text-sm text-zinc-500">{row.verdict || row.description || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-xs text-zinc-500 flex items-center gap-2">
        <AlertTriangle size={13} className="text-zinc-400" />
        <span>Student: {selectedStudent?.profile?.full_name || '-'}</span>
      </div>
    </div>
  );
};
