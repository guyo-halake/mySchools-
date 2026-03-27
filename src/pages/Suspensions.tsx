import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Card, Table, Badge, Button, Modal } from '../components/UI';
import { AlertTriangle, CheckCircle, MessageSquare, Plus } from 'lucide-react';
import { formatDate } from '../utils/utils';

export const Suspensions: React.FC = () => {
  const { user } = useAuth();
  const { suspensions, students, updateSuspension, addSuspension } = useApp();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [formData, setFormData] = React.useState({
    studentId: '',
    type: 'SUSPENSION' as 'SUSPENSION' | 'COMPLAINT',
    category: 'MISCONDUCT' as 'BULLYING' | 'ABSENTEEISM' | 'DRUGS' | 'CHEATING' | 'MISCONDUCT' | 'OTHER',
    issue: '',
    evidenceUrl: '',
    meetingNotes: '',
    issuedBy: user?.name || 'Teacher',
    escalationLevel: 'CLASS_TEACHER' as 'CLASS_TEACHER' | 'DEAN' | 'DEPUTY_PRINCIPAL' | 'PRINCIPAL',
    date: new Date().toISOString().split('T')[0],
    status: 'ACTIVE' as const,
  });

  const student = user?.studentId ? students.find(s => s.id === user.studentId) : null;
  const filteredSuspensions = user?.role === 'TEACHER' || user?.role === 'ADMIN'
    ? suspensions
    : suspensions.filter(s => s.studentId === student?.id);

  const handleAcknowledge = (id: string) => {
    updateSuspension(id, { status: 'ACKNOWLEDGED' });
  };

  const handleCreateIssue = (e: React.FormEvent) => {
    e.preventDefault();
    addSuspension(formData);
    setIsModalOpen(false);
    setFormData({
      studentId: '',
      type: 'SUSPENSION',
      category: 'MISCONDUCT',
      issue: '',
      evidenceUrl: '',
      meetingNotes: '',
      issuedBy: user?.name || 'Teacher',
      escalationLevel: 'CLASS_TEACHER',
      date: new Date().toISOString().split('T')[0],
      status: 'ACTIVE',
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Suspensions & Complaints</h1>
          <p className="text-gray-500 dark:text-zinc-400">Track and manage disciplinary issues</p>
        </div>
        {(user?.role === 'TEACHER' || user?.role === 'ADMIN') && (
          <Button onClick={() => setIsModalOpen(true)}><Plus size={18} /> New Issue</Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredSuspensions.length > 0 ? (
          <Card>
            <Table headers={['Date', 'Student', 'Type', 'Category', 'Issue', 'Escalation', 'Status', 'Actions']}>
              {filteredSuspensions.map(s => {
                const studentInfo = students.find(st => st.id === s.studentId);
                return (
                  <tr key={s.id}>
                    <td className="px-4 py-4 text-sm text-gray-500">{formatDate(s.date)}</td>
                    <td className="px-4 py-4 font-semibold">{studentInfo?.name || 'Unknown'}</td>
                    <td className="px-4 py-4">
                      <Badge variant={s.type === 'SUSPENSION' ? 'danger' : 'warning'}>
                        {s.type}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-sm">{s.category || 'OTHER'}</td>
                    <td className="px-4 py-4 text-sm max-w-xs truncate">{s.issue}</td>
                    <td className="px-4 py-4 text-sm">{s.escalationLevel || 'CLASS_TEACHER'}</td>
                    <td className="px-4 py-4">
                      <Badge variant={s.status === 'RESOLVED' ? 'success' : s.status === 'ACKNOWLEDGED' ? 'info' : 'danger'}>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        {user?.role === 'PARENT' && s.status === 'ACTIVE' && (
                          <Button 
                            variant="outline" 
                            className="text-xs py-1 px-2"
                            onClick={() => handleAcknowledge(s.id)}
                          >
                            <CheckCircle size={14} /> Acknowledge
                          </Button>
                        )}
                        <Button variant="ghost" className="p-2 h-auto text-gray-400"><MessageSquare size={14} /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </Table>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-gray-200 dark:border-zinc-800">
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center text-emerald-600 mb-4">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-xl font-bold">No Disciplinary Issues</h3>
            <p className="text-gray-500 dark:text-zinc-400 mt-1">Everything looks good! No active suspensions or complaints.</p>
          </div>
        )}
      </div>

      {user?.role === 'PARENT' && (
        <Card className="bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg text-amber-600">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 dark:text-amber-400">Important Note</h4>
              <p className="text-sm text-amber-700 dark:text-amber-500/80 mt-1">
                Acknowledging a suspension or complaint confirms that you have received the notification. 
                Please schedule a meeting with the class teacher if you wish to discuss any issue further.
              </p>
            </div>
          </div>
        </Card>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Incident">
        <form onSubmit={handleCreateIssue} className="space-y-3">
          <select className="w-full p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900" value={formData.studentId} onChange={(e) => setFormData({ ...formData, studentId: e.target.value })} required>
            <option value="">Select Student</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.admissionNumber})</option>)}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select className="w-full p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as 'SUSPENSION' | 'COMPLAINT' })}>
              <option value="SUSPENSION">SUSPENSION</option>
              <option value="COMPLAINT">COMPLAINT</option>
            </select>
            <select className="w-full p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900" value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value as 'BULLYING' | 'ABSENTEEISM' | 'DRUGS' | 'CHEATING' | 'MISCONDUCT' | 'OTHER' })}>
              <option value="MISCONDUCT">MISCONDUCT</option>
              <option value="BULLYING">BULLYING</option>
              <option value="ABSENTEEISM">ABSENTEEISM</option>
              <option value="CHEATING">CHEATING</option>
              <option value="DRUGS">DRUGS</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>
          <textarea className="w-full min-h-[90px] p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900" placeholder="Incident details" value={formData.issue} onChange={(e) => setFormData({ ...formData, issue: e.target.value })} required />
          <input className="w-full p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900" placeholder="Evidence URL (optional)" value={formData.evidenceUrl} onChange={(e) => setFormData({ ...formData, evidenceUrl: e.target.value })} />
          <textarea className="w-full min-h-[70px] p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900" placeholder="Meeting notes" value={formData.meetingNotes} onChange={(e) => setFormData({ ...formData, meetingNotes: e.target.value })} />
          <select className="w-full p-2 rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900" value={formData.escalationLevel} onChange={(e) => setFormData({ ...formData, escalationLevel: e.target.value as 'CLASS_TEACHER' | 'DEAN' | 'DEPUTY_PRINCIPAL' | 'PRINCIPAL' })}>
            <option value="CLASS_TEACHER">CLASS_TEACHER</option>
            <option value="DEAN">DEAN</option>
            <option value="DEPUTY_PRINCIPAL">DEPUTY_PRINCIPAL</option>
            <option value="PRINCIPAL">PRINCIPAL</option>
          </select>
          <Button type="submit" className="w-full">Create Incident</Button>
        </form>
      </Modal>
    </div>
  );
};
