import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Table, Button, Badge, Modal } from '../components/UI';
import { Search, Plus, Upload, Save, UserPlus, Trash2, Edit, Eye } from 'lucide-react';
import { StudentFullDetailsView } from '../components/StudentFullDetailsView';

export const StudentsManagement: React.FC = () => {
  const { students, classes, teachers, addStudent, updateStudent, deleteStudent } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fullViewStudent, setFullViewStudent] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    admissionNumber: '',
    classId: '',
    teacherId: '',
    parentEmail: '',
    photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=New'
  });

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateStudent(editingId, formData);
    } else {
      addStudent(formData);
    }
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({ name: '', admissionNumber: '', classId: '', teacherId: '', parentEmail: '', photo: 'https://api.dicebear.com/7.x/avataaars/svg?seed=New' });
  };

  const handleEdit = (s: any) => {
    setEditingId(s.id);
    setFormData({ ...s });
    setIsModalOpen(true);
  };

  if (fullViewStudent) {
    return (
      <StudentFullDetailsView 
        student={fullViewStudent} 
        onClose={() => setFullViewStudent(null)} 
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Manage Students</h1>
          <p className="text-gray-500 dark:text-zinc-400">Add, edit or remove students from the system</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline"><Upload size={18} /> Import CSV</Button>
          <Button onClick={() => setIsModalOpen(true)}><UserPlus size={18} /> Add Student</Button>
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search students..." 
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Table headers={['Student', 'Admission', 'Class', 'Parent Email', 'Actions']}>
          {filteredStudents.map(s => (
            <tr key={s.id}>
              <td className="px-4 py-4">
                <div className="flex items-center gap-3">
                  <img src={s.photo} className="w-10 h-10 rounded-full border border-gray-100" />
                  <span className="font-bold">{s.name}</span>
                </div>
              </td>
              <td className="px-4 py-4 text-sm font-mono">{s.admissionNumber}</td>
              <td className="px-4 py-4">
                <Badge variant="info">{classes.find(c => c.id === s.classId)?.name || 'Unassigned'}</Badge>
              </td>
              <td className="px-4 py-4 text-sm text-gray-500">{s.parentEmail}</td>
              <td className="px-4 py-4">
                <div className="flex gap-2">
                  <Button variant="ghost" className="p-2 h-auto" onClick={() => setFullViewStudent(s)}><Eye size={16} /></Button>
                  <Button variant="ghost" className="p-2 h-auto" onClick={() => handleEdit(s)}><Edit size={16} /></Button>
                  <Button variant="ghost" className="p-2 h-auto text-red-500" onClick={() => deleteStudent(s.id)}><Trash2 size={16} /></Button>
                </div>
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? "Edit Student" : "Add New Student"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <label className="block text-sm font-semibold mb-1">Admission No.</label>
              <input 
                type="text" 
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
                value={formData.admissionNumber}
                onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Parent Email</label>
            <input 
              type="email" 
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
              value={formData.parentEmail}
              onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Class</label>
              <select 
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                required
              >
                <option value="">Select Class</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Class Teacher</label>
              <select 
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
                value={formData.teacherId}
                onChange={(e) => setFormData({ ...formData, teacherId: e.target.value })}
                required
              >
                <option value="">Select Teacher</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>
          <Button type="submit" className="w-full py-4 mt-4"><Save size={18} /> {editingId ? "Update Student" : "Create Student"}</Button>
        </form>
      </Modal>
    </div>
  );
};
