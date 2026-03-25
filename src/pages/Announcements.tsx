import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { Card, Badge, Button, Modal } from '../components/UI';
import { Bell, User, Clock, Plus, Save } from 'lucide-react';
import { formatDate } from '../utils/utils';

export const Announcements: React.FC = () => {
  const { announcements, addAnnouncement } = useApp();
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    author: user?.name || 'School Admin',
    targetRoles: ['PARENT', 'STUDENT', 'TEACHER'] as any[],
    date: new Date().toISOString()
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addAnnouncement(formData);
    setIsModalOpen(false);
    setFormData({
      title: '',
      content: '',
      author: user?.name || 'School Admin',
      targetRoles: ['PARENT', 'STUDENT', 'TEACHER'],
      date: new Date().toISOString()
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-gray-500 dark:text-zinc-400">Official updates and news from school administration</p>
        </div>
        {user?.role === 'ADMIN' && (
          <Button onClick={() => setIsModalOpen(true)}><Plus size={18} /> Create Announcement</Button>
        )}
      </div>

      <div className="space-y-6">
        {announcements.map(announcement => (
          <Card key={announcement.id} className="hover:border-blue-200 dark:hover:border-blue-900/30 transition-colors">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="md:w-48 shrink-0">
                <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                  <Clock size={14} />
                  <span className="text-xs font-bold uppercase tracking-wider">{formatDate(announcement.date)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 dark:text-zinc-400">
                  <User size={14} />
                  <span className="text-sm">{announcement.author}</span>
                </div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h3 className="text-xl font-bold">{announcement.title}</h3>
                  <div className="flex gap-1">
                    {announcement.targetRoles.map(role => (
                      <Badge key={role} variant="neutral">{role}</Badge>
                    ))}
                  </div>
                </div>
                <p className="text-gray-600 dark:text-zinc-400 leading-relaxed">
                  {announcement.content}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Announcement">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Title</label>
            <input 
              type="text" 
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Content</label>
            <textarea 
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none min-h-[120px]"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              required
            />
          </div>
          <Button type="submit" className="w-full py-4 mt-4"><Save size={18} /> Post Announcement</Button>
        </form>
      </Modal>

      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-gray-400 mx-auto mb-4">
            <Bell size={32} />
          </div>
          <p className="text-gray-500 dark:text-zinc-400">You've reached the end of announcements.</p>
        </div>
      </div>
    </div>
  );
};
