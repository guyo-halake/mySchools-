import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Card, Table, Badge, Button } from '../components/UI';
import { TrendingUp, TrendingDown, Download, Save, User as UserIcon, Minus } from 'lucide-react';
import { cn } from '../utils/utils';

const ALL_SUBJECTS = [
  'Mathematics', 'English', 'Swahili', 'Geography', 'History', 
  'CRE', 'IRE', 'Physics', 'Chemistry', 'Computer', 'Business', 'Agriculture'
];

export const Results: React.FC = () => {
  const { user } = useAuth();
  const { results, students, updateResult, addResult, getResultWorkflowStatus, setResultWorkflowStatus, gradingSystem, setGradingSystem, calculateGrade } = useApp();
  const [selectedYear, setSelectedYear] = useState<number | 'ALL'>(2024);
  const [selectedTerm, setSelectedTerm] = useState('All Terms');
  const [selectedForm, setSelectedForm] = useState<'ALL' | 'FORM_1' | 'FORM_2' | 'FORM_3' | 'FORM_4'>('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, Record<string, { marks: string; remarks: string }>>>({});
  const [workflowStatus, setWorkflowStatus] = useState<'DRAFT' | 'TEACHER_SUBMITTED' | 'HOD_APPROVED' | 'DOS_APPROVED' | 'FINALIZED'>('DRAFT');

  useEffect(() => {
    if (user?.studentId) {
      setSelectedStudentId(user.studentId);
    } else if (students.length > 0 && !selectedStudentId) {
      setSelectedStudentId(students[0].id);
    }
  }, [user, students]);

  const student = students.find(s => s.id === selectedStudentId);
  const studentAllResults = student ? results.filter(r => r.studentId === student.id) : [];
  const yearsSet = new Set<number>(studentAllResults.map((r) => Number(r.year)));
  const availableYears = Array.from(yearsSet).sort((a, b) => b - a);
  const rankYear = selectedYear === 'ALL' ? (availableYears[0] || 2024) : selectedYear;
  const allStudentResults = student
    ? studentAllResults.filter(r => (selectedYear === 'ALL' || r.year === selectedYear) && (selectedForm === 'ALL' || r.formLevel === selectedForm))
    : [];

  const { getStudentRank } = useApp();
  
  const latestTermWithResults = ['Term 3', 'Term 2', 'Term 1'].find(t => 
    allStudentResults.some(r => r.term === t)
  ) || 'Term 3';
  const selectedWorkflowTerm = selectedTerm === 'All Terms' ? latestTermWithResults : selectedTerm;
  const selectedWorkflowYear = selectedYear === 'ALL' ? rankYear : selectedYear;
  const workflowKey = `workflow_${selectedStudentId}_${selectedWorkflowTerm}_${selectedYear}`;

  const currentRank = student ? getStudentRank(
    student.id, 
    selectedTerm === 'All Terms' ? latestTermWithResults : selectedTerm, 
    rankYear
  ) : null;

  const terms = ['Term 1', 'Term 2', 'Term 3'];

  useEffect(() => {
    if (!selectedStudentId) return;
    setWorkflowStatus(getResultWorkflowStatus(selectedStudentId, selectedWorkflowTerm, selectedWorkflowYear));
  }, [workflowKey, selectedStudentId, selectedWorkflowTerm, selectedWorkflowYear, getResultWorkflowStatus]);

  const isFinalized = workflowStatus === 'FINALIZED';

  const getKcsePoints = (grade: string) => {
    const pointsMap: Record<string, number> = {
      A: 12,
      'A-': 11,
      'B+': 10,
      B: 9,
      'B-': 8,
      'C+': 7,
      C: 6,
      'C-': 5,
      'D+': 4,
      D: 3,
      'D-': 2,
      E: 1,
    };
    return pointsMap[grade] || (grade === 'A' ? 12 : grade === 'B' ? 9 : grade === 'C' ? 6 : grade === 'D' ? 3 : 1);
  };

  const getMeanGrade = (average: number) => calculateGrade(average);

  const getResult = (subject: string, term: string) => {
    return allStudentResults.find(r => r.subject === subject && r.term === term);
  };

  const handleEditToggle = () => {
    if (!isEditing) {
      // Initialize edit data
      const initialData: any = {};
      ALL_SUBJECTS.forEach(sub => {
        initialData[sub] = {};
        terms.forEach(term => {
          const res = getResult(sub, term);
          initialData[sub][term] = {
            marks: res ? res.marks.toString() : '',
            remarks: res ? res.remarks || '' : ''
          };
        });
      });
      setEditData(initialData);
    }
    setIsEditing(!isEditing);
  };

  const handleSave = () => {
    if (!selectedStudentId) return;
    if (selectedYear === 'ALL') return;
    if (isFinalized) return;

    Object.entries(editData).forEach(([subject, termData]) => {
      Object.entries(termData).forEach(([term, data]) => {
        const { marks: marksStr, remarks } = data;
        if (marksStr === '') return;

        const marks = parseInt(marksStr);
        const grade = calculateGrade(marks);
        
        const existing = results.find(r => 
          r.studentId === selectedStudentId && 
          r.subject === subject && 
          r.term === term && 
          r.year === selectedYear
        );

        if (existing) {
          if (existing.marks !== marks || existing.remarks !== remarks) {
            updateResult(existing.id, { marks, grade, remarks });
          }
        } else {
          addResult({
            studentId: selectedStudentId,
            subject,
            marks,
            grade,
            term,
            year: selectedYear,
            remarks
          });
        }
      });
    });
    
    setIsEditing(false);
  };

  const updateWorkflowStatus = (status: 'DRAFT' | 'TEACHER_SUBMITTED' | 'HOD_APPROVED' | 'DOS_APPROVED' | 'FINALIZED') => {
    setWorkflowStatus(status);
    if (selectedStudentId) {
      setResultWorkflowStatus(selectedStudentId, selectedWorkflowTerm, selectedWorkflowYear, status);
    }
    if (status === 'FINALIZED') {
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Academic Performance</h1>
          <p className="text-xs text-zinc-500">Comprehensive view of all terms and subjects</p>
        </div>
        <div className="flex items-center gap-2">
          {(user?.role === 'TEACHER' || user?.role === 'ADMIN') && (
            <div className="flex items-center gap-2 mr-4">
              <UserIcon size={14} className="text-zinc-400" />
              <select 
                className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs outline-none"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.admissionNumber})</option>
                ))}
              </select>
            </div>
          )}
          {(user?.role === 'PARENT' || user?.role === 'STUDENT') && (
            <select
              className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs outline-none"
              value={selectedForm}
              onChange={(e) => setSelectedForm(e.target.value as 'ALL' | 'FORM_1' | 'FORM_2' | 'FORM_3' | 'FORM_4')}
            >
              <option value="ALL">All Forms</option>
              <option value="FORM_1">Form 1</option>
              <option value="FORM_2">Form 2</option>
              <option value="FORM_3">Form 3</option>
              <option value="FORM_4">Form 4</option>
            </select>
          )}
          <select 
            className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs outline-none"
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value))}
          >
            <option value="ALL">All Years</option>
            {availableYears.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
            <option value={2024}>2024</option>
            <option value={2023}>2023</option>
          </select>
          <select 
            className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs outline-none"
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
          >
            <option value="All Terms">All Terms</option>
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>
          {user?.role === 'ADMIN' && (
            <select
              className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-xs outline-none"
              value={gradingSystem}
              onChange={(e) => setGradingSystem(e.target.value as 'KENYAN' | 'BRITISH')}
            >
              <option value="KENYAN">Kenyan Grading</option>
              <option value="BRITISH">British Grading</option>
            </select>
          )}
          {user?.role === 'ADMIN' && selectedYear !== 'ALL' && !isFinalized && (
            <Button 
              variant={isEditing ? "secondary" : "primary"} 
              onClick={isEditing ? handleSave : handleEditToggle}
              className="h-8 text-[10px]"
            >
              {isEditing ? <><Save size={14} /> Save Changes</> : 'Edit Results'}
            </Button>
          )}
          <Button variant="outline" className="h-8 text-[10px]"><Download size={14} /> Export PDF</Button>
        </div>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">Moderation: {workflowStatus}</Badge>
          <Badge variant="neutral">System: {gradingSystem}</Badge>
          {user?.role === 'TEACHER' && workflowStatus === 'DRAFT' && (
            <Button variant="outline" onClick={() => updateWorkflowStatus('TEACHER_SUBMITTED')}>Submit to HOD</Button>
          )}
          {user?.role === 'ADMIN' && workflowStatus === 'TEACHER_SUBMITTED' && (
            <Button variant="outline" onClick={() => updateWorkflowStatus('HOD_APPROVED')}>Approve as HOD</Button>
          )}
          {user?.role === 'ADMIN' && workflowStatus === 'HOD_APPROVED' && (
            <Button onClick={() => updateWorkflowStatus('FINALIZED')}>Finalize as DOS</Button>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {currentRank && (
          <>
            <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/20">
              <p className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 mb-1">Class Position</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{currentRank.classRank}</p>
                <p className="text-xs text-blue-600/60 font-medium">out of {currentRank.classTotal}</p>
              </div>
            </Card>
            <Card className="bg-emerald-50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-800/20">
              <p className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 mb-1">Form Position</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{currentRank.formRank}</p>
                <p className="text-xs text-emerald-600/60 font-medium">out of {currentRank.formTotal}</p>
              </div>
            </Card>
            <Card className="bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/20">
              <p className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 mb-1">Mean Score</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{currentRank.averageMarks.toFixed(1)}%</p>
                <p className="text-xs text-amber-600/60 font-medium">Overall Average</p>
              </div>
            </Card>
            <Card className="bg-violet-50 dark:bg-violet-900/10 border-violet-100 dark:border-violet-800/20">
              <p className="text-[10px] font-bold uppercase text-violet-600 dark:text-violet-400 mb-1">{gradingSystem === 'KENYAN' ? 'KCSE Projection' : 'British Projection'}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">{getMeanGrade(currentRank.averageMarks)}</p>
                <p className="text-xs text-violet-600/60 font-medium">{gradingSystem === 'KENYAN' ? `${getKcsePoints(getMeanGrade(currentRank.averageMarks))} points` : 'GCSE style band'}</p>
              </div>
            </Card>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card 
          title={student ? `${student.name}'s Results` : "Results Summary"} 
          subtitle={selectedTerm === 'All Terms' 
            ? `Performance across all terms for ${selectedYear === 'ALL' ? 'all years' : selectedYear}` 
            : `Performance for ${selectedTerm}, ${selectedYear === 'ALL' ? 'all years' : selectedYear}`}
        >
          <div className="overflow-x-auto">
            {(() => {
              const displayTerms = selectedTerm === 'All Terms' ? terms : [selectedTerm];
              const headers = ['Subject', ...displayTerms];
              if (selectedTerm === 'All Terms') {
                headers.push('Final Grade', 'Remarks');
              } else {
                headers.push('Grade', 'Remarks');
              }

              return (
                <Table headers={headers}>
                  {ALL_SUBJECTS.map(sub => (
                    <tr key={sub}>
                      <td className="px-3 py-3 font-bold text-xs">{sub}</td>
                      {displayTerms.map(term => {
                        const res = getResult(sub, term);
                        if (isEditing) {
                          return (
                            <td key={term} className="px-3 py-3">
                              <input 
                                type="number"
                                min="0"
                                max="100"
                                className="w-12 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded px-1 py-0.5 text-[10px] outline-none focus:border-zinc-400"
                                value={editData[sub]?.[term]?.marks || ''}
                                onChange={(e) => setEditData({
                                  ...editData,
                                  [sub]: {
                                    ...editData[sub],
                                    [term]: { ...editData[sub][term], marks: e.target.value }
                                  }
                                })}
                              />
                            </td>
                          );
                        }
                        return (
                          <td key={term} className="px-3 py-3">
                            {res ? (
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <span className={cn(
                                    "font-bold text-xs",
                                    res.marks < 50 ? "text-rose-500" : "text-zinc-900 dark:text-white"
                                  )}>
                                    {res.marks}%
                                  </span>
                                  <Badge variant={res.marks >= 80 ? 'success' : res.marks >= 50 ? 'info' : 'danger'}>
                                    {res.grade}
                                  </Badge>
                                </div>
                                {(() => {
                                  const termIndex = terms.indexOf(term);
                                  const prevTerm = termIndex > 0 ? terms[termIndex - 1] : null;
                                  const prevRes = prevTerm ? getResult(sub, prevTerm) : null;
                                  if (!prevRes) return null;
                                  const diff = res.marks - prevRes.marks;
                                  
                                  // Check if they failed this term but passed last term
                                  const justFailed = res.marks < 50 && prevRes.marks >= 50;
                                  
                                  if (diff === 0) return <div className="flex items-center gap-0.5 text-[8px] text-zinc-400"><Minus size={8} /> 0</div>;
                                  return (
                                    <div className={cn(
                                      "flex items-center gap-0.5 text-[8px] font-bold",
                                      diff > 0 ? "text-emerald-500" : "text-rose-500"
                                    )}>
                                      {diff > 0 ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                                      {diff > 0 ? `+${diff}` : diff}
                                      {justFailed && <span className="ml-1 text-[7px] bg-rose-100 text-rose-600 px-1 rounded">FAILED</span>}
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              <span className="text-zinc-300">-</span>
                            )}
                          </td>
                        );
                      })}
                      
                      {selectedTerm === 'All Terms' ? (
                        <td className="px-3 py-3">
                          {(() => {
                            const subjectResults = allStudentResults.filter(r => r.subject === sub);
                            if (subjectResults.length === 0) return <span className="text-zinc-300">-</span>;
                            const avg = subjectResults.reduce((acc, r) => acc + r.marks, 0) / subjectResults.length;
                            const grade = calculateGrade(avg);
                            return (
                              <div className="flex flex-col">
                                <span className="font-bold text-xs">{avg.toFixed(0)}%</span>
                                <span className="text-[9px] font-bold text-zinc-500">{grade}</span>
                              </div>
                            );
                          })()}
                        </td>
                      ) : (
                        <td className="px-3 py-3">
                          {(() => {
                            const res = getResult(sub, selectedTerm);
                            if (!res) return <span className="text-zinc-300">-</span>;
                            return <Badge variant={res.marks >= 80 ? 'success' : res.marks >= 50 ? 'info' : 'danger'}>{res.grade}</Badge>;
                          })()}
                        </td>
                      )}

                      <td className="px-3 py-3 text-[10px] text-zinc-500 max-w-[250px]">
                        {isEditing ? (
                          <div className="flex flex-col gap-2">
                            {displayTerms.map(term => (
                              <div key={term} className="flex items-center gap-2">
                                <span className="text-[8px] font-bold text-zinc-400 w-8">T{term.split(' ')[1]}</span>
                                <input 
                                  type="text"
                                  placeholder={`${term} Remark...`}
                                  className="flex-1 bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded px-2 py-0.5 text-[10px] outline-none focus:border-zinc-400"
                                  value={editData[sub]?.[term]?.remarks || ''}
                                  onChange={(e) => setEditData({
                                    ...editData,
                                    [sub]: {
                                      ...editData[sub],
                                      [term]: { ...editData[sub][term], remarks: e.target.value }
                                    }
                                  })}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {displayTerms.map(term => {
                              const res = getResult(sub, term);
                              if (!res?.remarks) return null;
                              return (
                                <div key={term} className="truncate block text-[9px]">
                                  {selectedTerm === 'All Terms' && <span className="font-bold text-zinc-400 mr-1">T{term.split(' ')[1]}:</span>}
                                  {res.remarks}
                                </div>
                              );
                            })}
                            {allStudentResults.filter(r => (selectedTerm === 'All Terms' || r.term === selectedTerm) && r.subject === sub && r.remarks).length === 0 && (
                              <span className="text-zinc-300 italic">No remarks</span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </Table>
              );
            })()}
          </div>
        </Card>

        {/* Detailed Remarks for Parents */}
        {(user?.role === 'PARENT' || user?.role === 'STUDENT') && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card title="Areas of Concern" icon={TrendingDown} className="border-l-2 border-l-rose-500">
              <div className="space-y-3">
                {allStudentResults.filter(r => r.marks < 50).map(r => (
                  <div key={r.id} className="p-2 rounded bg-rose-50 dark:bg-rose-900/10">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-xs text-rose-700 dark:text-rose-400">{r.subject}</span>
                      <span className="text-[10px] font-bold text-rose-600">{r.marks}%</span>
                    </div>
                    <p className="text-[10px] text-rose-600/80 italic">Teacher: {r.remarks}</p>
                  </div>
                ))}
                {allStudentResults.filter(r => r.marks < 50).length === 0 && (
                  <p className="text-xs text-zinc-400 italic">No failing subjects. Great job!</p>
                )}
              </div>
            </Card>
            <Card title="Teacher Recommendations" icon={TrendingUp} className="border-l-2 border-l-emerald-500">
              <div className="space-y-3">
                <p className="text-xs text-zinc-500 leading-relaxed">
                  The student is performing well overall. Focus should be maintained on technical subjects like Physics and Computer Studies where practical application is key.
                </p>
                <Button variant="outline" className="w-full text-[10px]">Request Meeting with Teacher</Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
