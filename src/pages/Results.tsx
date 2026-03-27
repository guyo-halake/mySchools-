import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Card, Table, Badge, Button, PageHeader } from '../components/UI';
import { TrendingUp, TrendingDown, Download, Save, User as UserIcon, Minus } from 'lucide-react';
import { cn } from '../utils/utils';
import { jsPDF } from 'jspdf';

const ALL_SUBJECTS = [
  'Mathematics', 'English', 'Swahili', 'Geography', 'History', 
  'CRE', 'IRE', 'Physics', 'Chemistry', 'Computer', 'Business', 'Agriculture'
];

export const Results: React.FC = () => {
  const { user } = useAuth();
  const { results, students, classes, updateResult, addResult, getResultWorkflowStatus, setResultWorkflowStatus, gradingSystem, setGradingSystem, calculateGrade } = useApp();
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

  const downloadPdfReport = () => {
    if (!student) return;

    const classInfo = classes.find((c) => c.id === student.classId);
    const reportTerm = selectedTerm === 'All Terms' ? 'All Terms' : selectedTerm;
    const reportYearLabel = selectedYear === 'ALL' ? 'All Years' : String(selectedYear);
    const reportRows = allStudentResults
      .filter((r) => selectedTerm === 'All Terms' || r.term === selectedTerm)
      .sort((a, b) => {
        if (a.subject === b.subject) {
          const termOrder = ['Term 1', 'Term 2', 'Term 3'];
          return termOrder.indexOf(a.term) - termOrder.indexOf(b.term);
        }
        return a.subject.localeCompare(b.subject);
      });

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 14;

    doc.setFillColor(245, 248, 250);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Vector logo mark to avoid dependency on external image files.
    doc.setFillColor(14, 116, 144);
    doc.circle(marginX + 8, 16, 6, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.text('SR', marginX + 8, 17, { align: 'center' });

    doc.setTextColor(20, 23, 28);
    doc.setFontSize(14);
    doc.text('School Results System', marginX + 18, 13);
    doc.setFontSize(10);
    doc.setTextColor(82, 90, 102);
    doc.text('Academic Report Form', marginX + 18, 18);

    doc.setDrawColor(210, 214, 220);
    doc.line(marginX, 24, pageWidth - marginX, 24);

    doc.setFontSize(9);
    doc.setTextColor(32, 36, 42);
    doc.text(`Student: ${student.name}`, marginX, 32);
    doc.text(`Admission No: ${student.admissionNumber}`, marginX, 37);
    doc.text(`Class: ${classInfo?.name || student.classId}`, marginX, 42);
    doc.text(`Form: ${student.formLevel.replace('_', ' ')}`, marginX, 47);

    doc.text(`Year: ${reportYearLabel}`, pageWidth / 2 + 8, 32);
    doc.text(`Term: ${reportTerm}`, pageWidth / 2 + 8, 37);
    doc.text(`Grading: ${gradingSystem}`, pageWidth / 2 + 8, 42);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth / 2 + 8, 47);

    doc.setDrawColor(210, 214, 220);
    doc.line(marginX, 52, pageWidth - marginX, 52);

    let y = 60;
    const rowHeight = 7;
    const colSubject = marginX;
    const colTerm = marginX + 70;
    const colMarks = marginX + 98;
    const colGrade = marginX + 120;
    const colRemarks = marginX + 142;

    doc.setFontSize(9);
    doc.setTextColor(23, 27, 34);
    doc.text('Subject', colSubject, y);
    doc.text('Term', colTerm, y);
    doc.text('Marks', colMarks, y);
    doc.text('Grade', colGrade, y);
    doc.text('Remarks', colRemarks, y);
    y += 3;
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 4;

    if (reportRows.length === 0) {
      doc.setTextColor(120, 126, 136);
      doc.text('No results available for the selected filters.', marginX, y + 2);
      y += 10;
    } else {
      reportRows.forEach((row) => {
        if (y > pageHeight - 20) {
          doc.addPage();
          doc.setFillColor(245, 248, 250);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
          y = 20;
        }

        const remark = row.remarks || '-';
        const shortRemark = remark.length > 38 ? `${remark.slice(0, 38)}...` : remark;

        doc.setTextColor(35, 41, 49);
        doc.text(row.subject, colSubject, y);
        doc.text(row.term, colTerm, y);
        doc.text(`${row.marks}%`, colMarks, y);
        doc.text(row.grade, colGrade, y);
        doc.text(shortRemark, colRemarks, y);
        y += rowHeight;
      });
    }

    const subjectAverages = ALL_SUBJECTS.map((subject) => {
      const entries = reportRows.filter((r) => r.subject === subject);
      if (entries.length === 0) return null;
      const avg = entries.reduce((acc, r) => acc + r.marks, 0) / entries.length;
      return avg;
    }).filter((value): value is number => value !== null);

    const overallAverage = subjectAverages.length > 0
      ? subjectAverages.reduce((acc, value) => acc + value, 0) / subjectAverages.length
      : 0;

    const overallGrade = calculateGrade(overallAverage);
    if (y > pageHeight - 28) {
      doc.addPage();
      doc.setFillColor(245, 248, 250);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');
      y = 20;
    }

    doc.line(marginX, y + 2, pageWidth - marginX, y + 2);
    doc.setFontSize(10);
    doc.setTextColor(20, 24, 30);
    doc.text(`Overall Mean: ${overallAverage.toFixed(1)}%`, marginX, y + 10);
    doc.text(`Overall Grade: ${overallGrade}`, marginX + 70, y + 10);

    doc.setFontSize(8);
    doc.setTextColor(105, 112, 122);
    doc.text('Official school report generated from School Results System.', marginX, pageHeight - 10);

    const fileName = `${student.name.replace(/\s+/g, '_')}_${reportYearLabel}_${reportTerm}_Report.pdf`;
    doc.save(fileName);
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
      <PageHeader
        title="Academic Performance"
        subtitle="Comprehensive multi-year performance by term, subject, and grading system"
        actions={<div className="flex items-center gap-2">
          {(user?.role === 'TEACHER' || user?.role === 'ADMIN') && (
            <div className="flex items-center gap-2 mr-4">
              <UserIcon size={14} className="text-zinc-400" />
              <select 
                className="form-control-sm"
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
              className="form-control-sm"
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
            className="form-control-sm"
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
            className="form-control-sm"
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
              className="form-control-sm"
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
              className="h-8"
            >
              {isEditing ? <><Save size={14} /> Save Changes</> : 'Edit Results'}
            </Button>
          )}
          <Button variant="outline" className="h-8" onClick={downloadPdfReport}><Download size={14} /> Export PDF</Button>
        </div>}
      />

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

      <Card title="System Legend" subtitle="Kenyan and British grade mappings">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
            <p className="section-title mb-1">Kenyan (KCSE-style)</p>
            <p>A: 80-100, B: 70-79, C: 60-69, D: 50-59, E: below 50</p>
          </div>
          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
            <p className="section-title mb-1">British (GCSE-style)</p>
            <p>A*: 90+, A: 80+, B: 70+, C: 60+, D: 50+, E: 40+, U: below 40</p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {currentRank && (
          <>
            <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/20 md:col-span-2">
              <p className="micro-label text-blue-600 mb-2">Results Snapshot</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-2 rounded bg-white/70 dark:bg-zinc-900/50">
                  <p className="micro-label text-zinc-500">Class Position</p>
                  <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{currentRank.classRank}/{currentRank.classTotal}</p>
                </div>
                <div className="p-2 rounded bg-white/70 dark:bg-zinc-900/50">
                  <p className="micro-label text-zinc-500">Form Position</p>
                  <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{currentRank.formRank}/{currentRank.formTotal}</p>
                </div>
                <div className="p-2 rounded bg-white/70 dark:bg-zinc-900/50">
                  <p className="micro-label text-zinc-500">Mean Score</p>
                  <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{currentRank.averageMarks.toFixed(1)}%</p>
                </div>
                <div className="p-2 rounded bg-white/70 dark:bg-zinc-900/50">
                  <p className="micro-label text-zinc-500">Projected Grade</p>
                  <p className="text-xl font-bold text-violet-700 dark:text-violet-300">{getMeanGrade(currentRank.averageMarks)}</p>
                </div>
              </div>
            </Card>
            <Card className="bg-violet-50 dark:bg-violet-900/10 border-violet-100 dark:border-violet-800/20">
              <p className="micro-label text-violet-600 mb-1">Current Grading System</p>
              <p className="text-2xl font-bold text-violet-700 dark:text-violet-300">{gradingSystem}</p>
              <p className="text-xs text-violet-700/70 mt-1">{gradingSystem === 'KENYAN' ? `${getKcsePoints(getMeanGrade(currentRank.averageMarks))} points projection` : 'GCSE-style projection active'}</p>
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
