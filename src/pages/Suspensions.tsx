import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button, Modal } from '../components/UI';
import { Plus, Save } from 'lucide-react';
import { ParentStudentDiscipline } from './ParentStudentDiscipline';

type DisciplinaryRow = {
  id: string;
  school_id: string;
  student_id: string | null;
  student_name: string | null;
  incident_title: string;
  incident_at: string | null;
  reported_by: string | null;
  suspended_by: string | null;
  verdict: string | null;
  created_at: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value?: string | null) => Boolean(value && UUID_RE.test(value));

export const Suspensions: React.FC = () => {
  const { user } = useAuth();
  if (user?.role === 'PARENT' || user?.role === 'STUDENT') {
    return <ParentStudentDiscipline />;
  }

  const canCreate = user?.role === 'TEACHER' || user?.role === 'ADMIN' || user?.role === 'PRINCIPAL';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [records, setRecords] = useState<DisciplinaryRow[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    studentName: '',
    offense: '',
    incidentDate: new Date().toISOString().slice(0, 10),
    incidentTime: '08:00',
    verdict: ''
  });

  const loadRecords = async () => {
    if (!user?.school_id) {
      setRecords([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('disciplinary_records')
      .select('id, school_id, student_id, student_name, incident_title, incident_at, reported_by, suspended_by, verdict, created_at')
      .eq('school_id', user.school_id)
      .order('incident_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      setStatusMessage(`Could not load records: ${error.message}`);
      setLoading(false);
      return;
    }

    setRecords((data || []) as DisciplinaryRow[]);
    setLoading(false);
  };

  useEffect(() => {
    loadRecords();
  }, [user?.id, user?.school_id]);

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.school_id || !canCreate) return;

    const incidentAt = new Date(`${formData.incidentDate}T${formData.incidentTime}:00`);
    if (Number.isNaN(incidentAt.getTime())) {
      setStatusMessage('Please enter a valid date and time.');
      return;
    }

    setSaving(true);

    let studentId: string | null = null;
    if (formData.studentName.trim()) {
      const { data: profileMatch } = await supabase
        .from('profiles')
        .select('id')
        .eq('school_id', user.school_id)
        .eq('role', 'STUDENT')
        .ilike('full_name', formData.studentName.trim())
        .maybeSingle();

      if (profileMatch?.id && isUuid(profileMatch.id)) {
        studentId = profileMatch.id;
      }
    }

    const reporterName = user.full_name || 'School Staff';

    const { error } = await supabase
      .from('disciplinary_records')
      .insert({
        school_id: user.school_id,
        student_id: studentId,
        student_name: formData.studentName.trim() || null,
        incident_title: formData.offense.trim(),
        incident_date: formData.incidentDate,
        incident_at: incidentAt.toISOString(),
        description: formData.offense.trim(),
        reported_by: reporterName,
        suspended_by: isUuid(user.id) ? user.id : null,
        verdict: formData.verdict.trim() || null,
        action_taken: 'Suspension',
        status: 'OPEN'
      });

    setSaving(false);

    if (error) {
      setStatusMessage(`Could not save record: ${error.message}`);
      return;
    }

    setIsModalOpen(false);
    setFormData({
      studentName: '',
      offense: '',
      incidentDate: new Date().toISOString().slice(0, 10),
      incidentTime: '08:00',
      verdict: ''
    });
    setStatusMessage('Record saved.');
    await loadRecords();
  };

  const rows = useMemo(() => {
    return records.map((record) => {
      const dateObj = record.incident_at ? new Date(record.incident_at) : (record.created_at ? new Date(record.created_at) : null);
      const dateLabel = dateObj && Number.isFinite(dateObj.getTime()) ? dateObj.toLocaleDateString('en-GB') : '-';
      const timeLabel = dateObj && Number.isFinite(dateObj.getTime())
        ? dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        : '-';

      return {
        ...record,
        studentLabel: record.student_name || 'Student',
        reasonLabel: record.incident_title || '-',
        teacherLabel: record.reported_by || 'School Staff',
        dateLabel,
        timeLabel
      };
    });
  }, [records]);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Disciplinary</h1>
            <p className="text-sm text-zinc-500">Suspension records and disciplinary notes.</p>
          </div>
          {canCreate && (
            <Button onClick={() => setIsModalOpen(true)}>
              <Plus size={16} /> New Suspension
            </Button>
          )}
        </div>
        {statusMessage && (
          <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300">
            {statusMessage}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40">
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Student Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Reason for Suspension</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Teacher</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500">Loading...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-zinc-500">No records yet.</td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
                    <td className="px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100">{row.studentLabel}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200">{row.reasonLabel}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200">{row.dateLabel}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200">{row.timeLabel}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200">{row.teacherLabel}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Suspension">
        <form onSubmit={handleCreateRecord} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Student Name</label>
            <input
              type="text"
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
              value={formData.studentName}
              onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Offense</label>
            <input
              type="text"
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
              value={formData.offense}
              onChange={(e) => setFormData({ ...formData, offense: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Date</label>
              <input
                type="date"
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
                value={formData.incidentDate}
                onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Time</label>
              <input
                type="time"
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
                value={formData.incidentTime}
                onChange={(e) => setFormData({ ...formData, incidentTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">Verdict</label>
            <textarea
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none min-h-[90px]"
              value={formData.verdict}
              onChange={(e) => setFormData({ ...formData, verdict: e.target.value })}
              required
            />
          </div>

          <Button type="submit" className="w-full py-4" disabled={saving}>
            <Save size={16} /> {saving ? 'Saving...' : 'Save'}
          </Button>
        </form>
      </Modal>
    </div>
  );
};
