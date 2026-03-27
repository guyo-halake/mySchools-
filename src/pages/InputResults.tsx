import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Card, Table, Button, Badge } from '../components/UI';
import { Save, Upload } from 'lucide-react';

export const InputResults: React.FC = () => {
  const { user } = useAuth();
  const { students, results, updateResult, addResult, teachers, getResultWorkflowStatus, setResultWorkflowStatus, calculateGrade } = useApp();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('Term 1');
  const [selectedYear, setSelectedYear] = useState(2024);
  const [error, setError] = useState('');
  const [csvData, setCsvData] = useState('');
  const [workflowStatus, setWorkflowStatus] = useState<'DRAFT' | 'TEACHER_SUBMITTED' | 'HOD_APPROVED' | 'DOS_APPROVED' | 'FINALIZED'>('DRAFT');
  
  const subjects = [
    'Mathematics', 'English', 'Swahili', 'Geography', 'History', 
    'CRE', 'IRE', 'Physics', 'Chemistry', 'Computer', 'Business', 'Agriculture'
  ];

  const [inputData, setInputData] = useState<{ [key: string]: { marks: string; remarks: string } }>(
    subjects.reduce((acc, sub) => ({ ...acc, [sub]: { marks: '', remarks: '' } }), {})
  );


  const teacherProfile = teachers.find(t => t.id === user?.teacherId);
  const allowedStudents = user?.role === 'TEACHER' && teacherProfile?.classId
    ? students.filter(s => s.classId === teacherProfile.classId)
    : students;
  const allowedSubjects = user?.role === 'TEACHER' && teacherProfile
    ? teacherProfile.subjects
    : subjects;

  useEffect(() => {
    if (!selectedStudentId && allowedStudents.length > 0) {
      setSelectedStudentId(allowedStudents[0].id);
    }
  }, [allowedStudents, selectedStudentId]);

  useEffect(() => {
    if (!selectedStudentId) {
      setWorkflowStatus('DRAFT');
      return;
    }
    setWorkflowStatus(getResultWorkflowStatus(selectedStudentId, selectedTerm, selectedYear));
  }, [selectedStudentId, selectedTerm, selectedYear, getResultWorkflowStatus]);

  useEffect(() => {
    if (selectedStudentId) {
      const studentResults = results.filter(r => 
        r.studentId === selectedStudentId && 
        r.term === selectedTerm && 
        r.year === selectedYear
      );
      
      const newData = subjects.reduce((acc, sub) => {
        const res = studentResults.find(r => r.subject === sub);
        return { 
          ...acc, 
          [sub]: { 
            marks: res ? res.marks.toString() : '', 
            remarks: res ? res.remarks || '' : '' 
          } 
        };
      }, {});
      setInputData(newData);
    }
  }, [selectedStudentId, selectedTerm, selectedYear, results]);

  const handleSave = () => {
    if (!selectedStudentId) return;
    setError('');

    if (workflowStatus === 'FINALIZED') {
      setError('This report card is finalized and cannot be edited.');
      return;
    }

    Object.entries(inputData).forEach(([subject, data]) => {
      const { marks: marksStr, remarks } = data as { marks: string; remarks: string };
      if (marksStr === '') return;

      const marks = parseInt(marksStr);
      if (Number.isNaN(marks) || marks < 0 || marks > 100) {
        setError(`Invalid marks for ${subject}. Enter values between 0 and 100.`);
        return;
      }
      const grade = calculateGrade(marks);
      
      const existing = results.find(r => 
        r.studentId === selectedStudentId && 
        r.subject === subject && 
        r.term === selectedTerm && 
        r.year === selectedYear
      );

      if (existing) {
        updateResult(existing.id, { marks, grade, remarks, moderationStatus: workflowStatus });
      } else {
        addResult({
          studentId: selectedStudentId,
          subject,
          marks,
          grade,
          term: selectedTerm,
          year: selectedYear,
          remarks,
          moderationStatus: workflowStatus
        });
      }
    });
    
    alert('Results saved successfully');
  };

  const handleBulkImport = () => {
    setError('');
    if (!csvData.trim()) {
      setError('Paste CSV rows first. Format: Subject,Marks,Remarks');
      return;
    }

    const lines = csvData.split('\n').map(line => line.trim()).filter(Boolean);
    const nextData = { ...inputData };

    for (const line of lines) {
      const [subjectRaw, marksRaw, ...remarksParts] = line.split(',');
      const subject = (subjectRaw || '').trim();
      const marks = (marksRaw || '').trim();
      const remarks = remarksParts.join(',').trim();

      if (!allowedSubjects.includes(subject)) {
        continue;
      }
      nextData[subject] = { marks, remarks };
    }

    setInputData(nextData);
  };

  const updateWorkflowStatus = (status: 'DRAFT' | 'TEACHER_SUBMITTED' | 'HOD_APPROVED' | 'DOS_APPROVED' | 'FINALIZED') => {
    setWorkflowStatus(status);
    if (selectedStudentId) {
      setResultWorkflowStatus(selectedStudentId, selectedTerm, selectedYear, status);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Input Results</h1>
          <p className="text-xs text-zinc-500">Record academic performance and teacher remarks</p>
        </div>
        <Button onClick={handleSave} disabled={!selectedStudentId}>
          <Save size={14} /> Save All
        </Button>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">Workflow: {workflowStatus}</Badge>
          {user?.role === 'TEACHER' && workflowStatus === 'DRAFT' && (
            <Button variant="outline" onClick={() => updateWorkflowStatus('TEACHER_SUBMITTED')}>Submit to HOD</Button>
          )}
          {user?.role === 'ADMIN' && workflowStatus === 'TEACHER_SUBMITTED' && (
            <Button variant="outline" onClick={() => updateWorkflowStatus('HOD_APPROVED')}>Approve as HOD</Button>
          )}
          {user?.role === 'ADMIN' && workflowStatus === 'HOD_APPROVED' && (
            <Button onClick={() => updateWorkflowStatus('FINALIZED')}>Finalize as DOS</Button>
          )}
          {(user?.role === 'ADMIN' || user?.role === 'TEACHER') && workflowStatus !== 'FINALIZED' && (
            <Button variant="ghost" onClick={() => updateWorkflowStatus('DRAFT')}>Reset to Draft</Button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-zinc-400">Student</label>
          <select 
            className="w-full bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
          >
            <option value="">Select Student</option>
            {allowedStudents.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.admissionNumber})</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-zinc-400">Term</label>
          <select 
            className="w-full bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none"
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
          >
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-zinc-400">Year</label>
          <select 
            className="w-full bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none"
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
          >
            <option value={2024}>2024</option>
            <option value={2023}>2023</option>
          </select>
        </div>
      </div>

      <Card title="Bulk Import (CSV)" subtitle="Paste Subject,Marks,Remarks per line">
        <div className="space-y-3">
          <textarea
            className="w-full min-h-[100px] bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded px-3 py-2 text-xs outline-none focus:border-zinc-400"
            placeholder="Mathematics,78,Improved solving speed"
            value={csvData}
            onChange={(e) => setCsvData(e.target.value)}
          />
          <Button variant="outline" onClick={handleBulkImport}>
            <Upload size={14} /> Apply CSV to Form
          </Button>
        </div>
      </Card>

      <Card>
        <Table headers={['Subject', 'Marks (0-100)', 'Grade', 'Teacher Remarks']}>
          {allowedSubjects.map(sub => {
            const marks = parseInt(inputData[sub]?.marks || '0');
            const grade = inputData[sub]?.marks ? calculateGrade(marks) : '-';
            
            return (
              <tr key={sub}>
                <td className="px-3 py-3 font-bold text-xs">{sub}</td>
                <td className="px-3 py-3">
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    disabled={workflowStatus === 'FINALIZED'}
                    className="w-16 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded px-2 py-1 text-xs outline-none focus:border-zinc-400"
                    value={inputData[sub]?.marks || ''}
                    onChange={(e) => setInputData({
                      ...inputData,
                      [sub]: { ...inputData[sub], marks: e.target.value }
                    })}
                  />
                </td>
                <td className="px-3 py-3">
                  <Badge variant={grade === 'A' ? 'success' : grade === 'E' ? 'danger' : 'neutral'}>
                    {grade}
                  </Badge>
                </td>
                <td className="px-3 py-3">
                  <input 
                    type="text"
                    placeholder="Enter feedback..."
                    disabled={workflowStatus === 'FINALIZED'}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded px-3 py-1 text-xs outline-none focus:border-zinc-400"
                    value={inputData[sub]?.remarks || ''}
                    onChange={(e) => setInputData({
                      ...inputData,
                      [sub]: { ...inputData[sub], remarks: e.target.value }
                    })}
                  />
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
};
