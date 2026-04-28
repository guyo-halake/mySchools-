import React, { useEffect, useState } from 'react';
import { Badge, Button, Modal } from '../components/UI';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export const AdminOS: React.FC = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') return;
    setLoading(true);
    api.getIssues()
      .then(setIssues)
      .catch(() => setError('Failed to load issues'))
      .finally(() => setLoading(false));
  }, [user]);

  const updateIssueStatus = async (id: string, status: string) => {
    setUpdating(true);
    try {
      await api.updateIssueStatus(id, status);
      setIssues(issues => issues.map(i => i.id === id ? { ...i, status } : i));
      setSelectedIssue(null);
    } catch {
      setError('Failed to update issue');
    } finally {
      setUpdating(false);
    }
  };

  if (!user || user.role !== 'ADMIN') return null;

  return (
    <div className="max-w-5xl mx-auto py-10 px-4 space-y-10 animate-in fade-in duration-500">
      <h1 className="text-2xl font-black tracking-tight mb-6">Admin OS: Issue Center</h1>
      {loading ? (
        <div className="py-20 text-zinc-400 font-bold">Loading issues...</div>
      ) : error ? (
        <div className="py-20 text-red-500 font-bold">{error}</div>
      ) : (
        <div className="bg-white border border-zinc-100 rounded-3xl shadow-sm divide-y divide-zinc-50">
          {issues.length === 0 && <div className="py-20 text-center text-zinc-300 font-bold uppercase text-[10px] tracking-[0.3em]">No issues reported.</div>}
          {issues.map(issue => (
            <div key={issue.id} className="p-8 flex items-center justify-between hover:bg-zinc-50/50 transition-all">
              <div className="text-left space-y-1">
                <h2 className="text-lg font-black text-zinc-900 uppercase">{issue.title}</h2>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{issue.type} • {issue.created_at && new Date(issue.created_at).toLocaleString()}</p>
                <p className="text-sm text-zinc-600 mt-2">{issue.description}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Badge variant={issue.status === 'RESOLVED' ? 'success' : 'warning'}>{issue.status}</Badge>
                <Button size="sm" variant="outline" onClick={() => setSelectedIssue(issue)}>Manage</Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal isOpen={!!selectedIssue} onClose={() => setSelectedIssue(null)} title="Manage Issue">
        {selectedIssue && (
          <div className="space-y-4">
            <h2 className="text-lg font-black">{selectedIssue.title}</h2>
            <p className="text-sm text-zinc-600">{selectedIssue.description}</p>
            <div className="flex gap-2">
              <Button disabled={updating} onClick={() => updateIssueStatus(selectedIssue.id, 'RESOLVED')}>Mark Resolved</Button>
              <Button disabled={updating} variant="outline" onClick={() => updateIssueStatus(selectedIssue.id, 'OPEN')}>Reopen</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminOS;
