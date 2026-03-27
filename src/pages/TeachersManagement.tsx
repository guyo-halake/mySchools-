import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Table, Button, Badge, Modal } from '../components/UI';
import { Search, Plus, Save, Trash2, Edit, Mail, Book } from 'lucide-react';

export const TeachersManagement: React.FC = () => {
  const { teachers, classes, addTeacher, updateTeacher, deleteTeacher } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subjects: [] as string[],
    classId: '',
    department: '',
    isHod: false,
    maxLessonsPerWeek: 30,
    currentLessonsPerWeek: 0
  });
  const [subjectInput, setSubjectInput] = useState('');

  const filteredTeachers = teachers.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateTeacher(editingId, formData);
    } else {
      addTeacher(formData);
    }
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', email: '', subjects: [], classId: '', department: '', isHod: false, maxLessonsPerWeek: 30, currentLessonsPerWeek: 0 });
  };

  const handleEdit = (t: any) => {
    setEditingId(t.id);
    setFormData({ ...t });
    setIsModalOpen(true);
  };

  const addSubject = () => {
    if (subjectInput && !formData.subjects.includes(subjectInput)) {
      setFormData({ ...formData, subjects: [...formData.subjects, subjectInput] });
      setSubjectInput('');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manage Teachers</h1>
          <p className="text-gray-500 dark:text-zinc-400">Manage faculty members and assignments</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}><Plus size={18} /> Add Teacher</Button>
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search teachers..." 
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Table headers={['Teacher', 'Email', 'Subjects', 'Assigned Class', 'Dept/HOD', 'Workload', 'Actions']}>
          {filteredTeachers.map(t => (
            <tr key={t.id}>
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 font-bold">
                    {t.name.charAt(0)}
                  </div>
                  <span className="font-bold">{t.name}</span>
                </div>
              </td>
              <td className="px-4 py-4 text-sm text-gray-500">{t.email}</td>
              <td className="px-4 py-4">
                <div className="flex flex-wrap gap-1">
                  {t.subjects.map(s => <Badge key={s} variant="neutral">{s}</Badge>)}
                </div>
              </td>
              <td className="px-4 py-4">
                <Badge variant="success">{classes.find(c => c.id === t.classId)?.name || 'None'}</Badge>
              </td>
              <td className="px-4 py-4 text-xs">
                <div>{t.department || 'General'}</div>
                {t.isHod && <Badge variant="info">HOD</Badge>}
              </td>
              <td className="px-4 py-4 text-xs">
                {(t.currentLessonsPerWeek || 0)}/{t.maxLessonsPerWeek || 30}
              </td>
              <td className="px-4 py-4">
                <div className="flex gap-2">
                  <Button variant="ghost" className="p-2 h-auto" onClick={() => handleEdit(t)}><Edit size={16} /></Button>
                  <Button variant="ghost" className="p-2 h-auto text-red-500" onClick={() => deleteTeacher(t.id)}><Trash2 size={16} /></Button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Teacher" : "Add New Teacher"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Full Name</label>
            <input 
              type="text" 
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Email Address</label>
            <input 
              type="email" 
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Subjects</label>
            <div className="flex gap-2 mb-2">
              <input 
                type="text" 
                className="flex-1 p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
                value={subjectInput}
                onChange={(e) => setSubjectInput(e.target.value)}
                placeholder="e.g. History"
              />
              <Button type="button" onClick={addSubject} variant="outline">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.subjects.map(s => (
                <Badge key={s} variant="info">
                  <span className="flex items-center gap-1">
                    {s} 
                    <button type="button" onClick={() => setFormData({...formData, subjects: formData.subjects.filter(sub => sub !== s)})}>×</button>
                  </span>
                </Badge>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Assigned Class</label>
            <select 
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
              value={formData.classId}
              onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
            >
              <option value="">None</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Department</label>
              <input type="text" className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none" value={formData.department} onChange={(e) => setFormData({ ...formData, department: e.target.value })} placeholder="Sciences" />
            </div>
            <label className="text-sm flex items-center gap-2 pt-8">
              <input type="checkbox" checked={formData.isHod} onChange={(e) => setFormData({ ...formData, isHod: e.target.checked })} />
              Department HOD
            </label>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Max Lessons/Week</label>
              <input type="number" className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none" value={formData.maxLessonsPerWeek} onChange={(e) => setFormData({ ...formData, maxLessonsPerWeek: Number(e.target.value) })} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Current Lessons/Week</label>
              <input type="number" className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none" value={formData.currentLessonsPerWeek} onChange={(e) => setFormData({ ...formData, currentLessonsPerWeek: Number(e.target.value) })} />
            </div>
          </div>
          <Button type="submit" className="w-full py-4 mt-4"><Save size={18} /> {editingId ? "Update Teacher" : "Create Teacher"}</Button>
        </form>
      </Modal>
    </div>
  );
};
