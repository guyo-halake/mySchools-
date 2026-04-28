import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Table, Button, Badge } from '../components/UI';
import { Save } from 'lucide-react';

export const InputResults: React.FC = () => {
  const { students: contextStudents, results, updateResult, addResult, terms } = useApp();
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');
  
  // Initialize with current term
  useEffect(() => {
    if (terms && terms.length > 0 && !selectedTermId) {
      const today = new Date();
      const current = terms.find((t: any) => {
        if (!t.start_date || !t.end_date) return false;
        return new Date(t.start_date) <= today && new Date(t.end_date) >= today;
      });
      if (current) setSelectedTermId(current.id);
      else setSelectedTermId(terms[0]?.id || '');
    }
  }, [terms, selectedTermId]);

  const subjects = [
    'Mathematics', 'English', 'Swahili', 'Geography', 'History', 
    'CRE', 'IRE', 'Physics', 'Chemistry', 'Computer', 'Business', 'Agriculture'
  ];

  const [inputData, setInputData] = useState<{ [key: string]: { marks: string; remarks: string } }>(
    subjects.reduce((acc, sub) => ({ ...acc, [sub]: { marks: '', remarks: '' } }), {})
  );

  useEffect(() => {
    if (selectedStudentId && selectedTermId) {
      const studentResults = results.filter(r => 
        r.studentId === selectedStudentId && 
        r.termId === selectedTermId
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
  }, [selectedStudentId, selectedTermId, results]);

  const handleSave = () => {
    if (!selectedStudentId || !selectedTermId) return;

    Object.entries(inputData).forEach(([subject, data]) => {
      const { marks: marksStr, remarks } = data as { marks: string; remarks: string };
      if (marksStr === '') return;

      const marks = parseInt(marksStr);
      const grade = marks >= 80 ? 'A' : marks >= 70 ? 'B' : marks >= 60 ? 'C' : marks >= 50 ? 'D' : 'E';
      
      const existing = results.find(r => 
        r.studentId === selectedStudentId && 
        r.subject === subject && 
        r.termId === selectedTermId
      );

      if (existing) {
        updateResult(existing.id, { marks, grade, remarks });
      } else {
        addResult({
          studentId: selectedStudentId,
          subject,
          marks,
          grade,
          termId: selectedTermId,
          remarks
        });
      }
    });
    
    alert('Results saved successfully');
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-zinc-400">Student</label>
          <select 
            className="w-full bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none"
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
          >
            <option value="">Select Student</option>
            {(contextStudents || []).map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.admissionNumber})</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase text-zinc-400">Term</label>
          <select 
            className="w-full bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs outline-none"
            value={selectedTermId}
            onChange={(e) => setSelectedTermId(e.target.value)}
          >
            <option value="">Select Term</option>
            {(terms || []).map((t: any) => (
              <option key={t.id} value={t.id}>{t.name} ({t.year})</option>
            ))}
          </select>
        </div>
      </div>

      <Card>
        <Table headers={['Subject', 'Marks (0-100)', 'Grade', 'Teacher Remarks']}>
          {subjects.map(sub => {
            const marks = parseInt(inputData[sub]?.marks || '0');
            const grade = inputData[sub]?.marks ? (marks >= 80 ? 'A' : marks >= 70 ? 'B' : marks >= 60 ? 'C' : marks >= 50 ? 'D' : 'E') : '-';
            
            return (
              <tr key={sub}>
                <td className="px-3 py-3 font-bold text-xs">{sub}</td>
                <td className="px-3 py-3">
                  <input 
                    type="number"
                    min="0"
                    max="100"
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
    </div>
  );
};

import { Trash2 } from 'lucide-react';
