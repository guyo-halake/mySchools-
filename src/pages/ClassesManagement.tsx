import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Table, Button, Badge, Modal } from '../components/UI';
import { Search, Plus, Save, Trash2, Edit, BookOpen } from 'lucide-react';

export const ClassesManagement: React.FC = () => {
  const { classes, teachers, students, addClass, updateClass, deleteClass } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    teacherId: ''
  });

  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const existingClassCount = students.filter(s => s.classId === editingId || s.classId === '').length;
    if (!editingId && existingClassCount > 60) {
      setError('Class size appears to exceed 60 students. Split into streams before saving.');
      return;
    }

    if (editingId) {
      updateClass(editingId, formData);
    } else {
      addClass(formData);
    }

    setError('');
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', teacherId: '' });
  };

  const handleEdit = (c: any) => {
    setError('');
    setEditingId(c.id);
    setFormData({ ...c });
    setIsModalOpen(true);
  };

  const handleDeleteClass = (classId: string) => {
    const enrolledCount = students.filter(s => s.classId === classId).length;
    if (enrolledCount > 0) {
      setError('Cannot delete class with enrolled students. Reassign students first.');
      return;
    }
    deleteClass(classId);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manage Classes</h1>
          <p className="text-gray-500 dark:text-zinc-400">Organize students and assign class teachers</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}><Plus size={18} /> Create Class</Button>
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search classes..." 
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Table headers={['Class Name', 'Class Teacher', 'Students Count', 'Actions']}>
          {filteredClasses.map(c => (
            <tr key={c.id}>
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600">
                    <BookOpen size={20} />
                  </div>
                  <span className="font-bold">{c.name}</span>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-[10px] font-bold">
                    {teachers.find(t => t.id === c.teacherId)?.name.charAt(0)}
                  </div>
                  <span className="text-sm">{teachers.find(t => t.id === c.teacherId)?.name || 'Unassigned'}</span>
                </div>
              </td>
              <td className="px-4 py-4">
                <Badge variant="neutral">{students.filter(s => s.classId === c.id).length} Students</Badge>
              </td>
              <td className="px-4 py-4">
                <div className="flex gap-2">
                  <Button variant="ghost" className="p-2 h-auto" onClick={() => handleEdit(c)}><Edit size={16} /></Button>
                  <Button variant="ghost" className="p-2 h-auto text-red-500" onClick={() => handleDeleteClass(c.id)}><Trash2 size={16} /></Button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
        {error && <p className="text-xs text-red-500 mt-4">{error}</p>}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Class" : "Create New Class"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Class Name</label>
            <input 
              type="text" 
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Form 4 East"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Assign Class Teacher</label>
            <select 
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
              value={formData.teacherId}
              onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
              required
            >
              <option value="">Select a teacher...</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <Button type="submit" className="w-full py-4 mt-4"><Save size={18} /> {editingId ? "Update Class" : "Create Class"}</Button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </form>
      </Modal>
    </div>
  );
};
