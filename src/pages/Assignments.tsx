import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Card, Table, Badge, Button } from '../components/UI';
import { BookOpen, Calendar, MessageSquare, Plus } from 'lucide-react';
import { formatDate } from '../utils/utils';

export const Assignments: React.FC = () => {
  const { user } = useAuth();
  
  const assignments = [
    { id: 'as1', title: 'Calculus Worksheet', subject: 'Mathematics', dueDate: '2024-03-28', status: 'PENDING', submittedAt: null, score: null, feedback: 'Awaiting submission' },
    { id: 'as2', title: 'Physics Lab Report', subject: 'Physics', dueDate: '2024-03-30', status: 'SUBMITTED', submittedAt: '2024-03-29T14:30:00Z', score: 82, feedback: 'Good experimental method, improve conclusion depth.' },
    { id: 'as3', title: 'English Essay', subject: 'English', dueDate: '2024-04-02', status: 'PENDING', submittedAt: null, score: null, feedback: 'Pending review' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Assignments & Holiday Work</h1>
          <p className="text-gray-500 dark:text-zinc-400">Track your academic tasks and deadlines</p>
        </div>
        {user?.role === 'TEACHER' && (
          <Button><Plus size={18} /> New Assignment</Button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <Table headers={['Subject', 'Title', 'Due Date', 'Submission', 'Score', 'Status', 'Actions']}>
            {assignments.map(a => (
              <tr key={a.id}>
                <td className="px-4 py-4 font-bold">{a.subject}</td>
                <td className="px-4 py-4">{a.title}</td>
                <td className="px-4 py-4 text-sm text-gray-500">{formatDate(a.dueDate)}</td>
                <td className="px-4 py-4 text-sm text-gray-500">{a.submittedAt ? new Date(a.submittedAt).toLocaleString() : 'Not submitted'}</td>
                <td className="px-4 py-4 text-sm">{a.score ?? '-'}</td>
                <td className="px-4 py-4">
                  <Badge variant={a.status === 'SUBMITTED' ? 'success' : 'warning'}>
                    {a.status}
                  </Badge>
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <Button variant="outline" className="text-xs py-1 px-2">Download</Button>
                    <Button variant="ghost" className="p-2 h-auto text-blue-600"><MessageSquare size={14} /></Button>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1">Feedback: {a.feedback}</p>
                </td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card title="Holiday Work" icon={BookOpen}>
          <p className="text-sm text-gray-500 mb-4">No holiday work assigned yet. Check back during the break!</p>
          <Button variant="secondary" className="w-full" disabled>View Holiday Portal</Button>
        </Card>
        <Card title="Study Resources" icon={Calendar}>
          <p className="text-sm text-gray-500 mb-4">Access shared textbooks, notes and revision materials.</p>
          <Button variant="outline" className="w-full">Open Library</Button>
        </Card>
      </div>
    </div>
  );
};
