import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Button, Badge, Modal } from '../components/UI';
import { StudentFullDetailsView } from '../components/StudentFullDetailsView';
import { Eye, PencilLine, Download, Save, Pause, ArrowUpRight } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

type WorkflowStatus = 'DRAFT' | 'SUBMITTED' | 'NEEDS_REVISION' | 'APPROVED' | 'PUBLISHED';
type WorkflowMode = 'MY_ENTRIES' | 'CLASS_INBOX';

type EntryDraft = {
  marks: string;
  remarks: string;
};

const EXAM_TYPES = ['MID_TERM', 'END_TERM', 'SPECIAL', 'INTERNAL'];

const statusBadge: Record<WorkflowStatus, 'neutral' | 'warning' | 'danger' | 'info' | 'success'> = {
  DRAFT: 'neutral',
  SUBMITTED: 'warning',
  NEEDS_REVISION: 'danger',
  APPROVED: 'info',
  PUBLISHED: 'success'
};

const toGrade = (marks: number) => {
  if (marks >= 80) return 'A';
  if (marks >= 70) return 'B';
  if (marks >= 60) return 'C';
  if (marks >= 50) return 'D';
  return 'E';
};

const makeBatchId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const parseTermNumber = (name?: string) => {
  const match = String(name || '').match(/term\s*([123])/i);
  return match ? Number(match[1]) : null;
};

const examTypeLabel = (value: string) => {
  if (value === 'END_TERM') return 'End Term Exams';
  if (value === 'MID_TERM') return 'Mid Term Exams';
  if (value === 'SPECIAL') return 'Special Exams';
  if (value === 'INTERNAL') return 'Internal Exams';
  return value;
};

const resolveCurrentTerm = (terms: any[]) => {
  if (!terms.length) return null;

  const today = new Date();
  const inRange = terms.find((term: any) => {
    if (!term.start_date || !term.end_date) return false;
    const start = new Date(term.start_date);
    const end = new Date(term.end_date);
    return start <= today && today <= end;
  });

  if (inRange) return inRange;

  return [...terms].sort((a: any, b: any) => {
    if (b.year !== a.year) return b.year - a.year;
    return String(b.end_date || '').localeCompare(String(a.end_date || ''));
  })[0] || null;
};

export const ResultsManagement: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [streams, setStreams] = useState<any[]>([]);
  const [formClassId, setFormClassId] = useState('');
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [workflowRows, setWorkflowRows] = useState<any[]>([]);
  const [publishedResults, setPublishedResults] = useState<any[]>([]);
  const [termAverages, setTermAverages] = useState<any[]>([]);
  const [draftInputs, setDraftInputs] = useState<Record<string, EntryDraft>>({});
  const [rowSubjectByStudent, setRowSubjectByStudent] = useState<Record<string, string>>({});
  const [rowEditModeByStudent, setRowEditModeByStudent] = useState<Record<string, boolean>>({});
  const [rowEditValuesByStudent, setRowEditValuesByStudent] = useState<Record<string, { fullName: string; admNo: string; previousMarks: string }>>({});
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [viewStudentId, setViewStudentId] = useState('');
  const [viewStudentResults, setViewStudentResults] = useState<any[]>([]);
  const [viewStudentSubjects, setViewStudentSubjects] = useState<any[]>([]);
  const [viewStudentLoading, setViewStudentLoading] = useState(false);
  const [fullViewStudent, setFullViewStudent] = useState<any>(null);
  const [onlyMySubjects, setOnlyMySubjects] = useState(false);
  const [teacherSubjectIds, setTeacherSubjectIds] = useState<string[]>([]);
  const [studentTargetMode, setStudentTargetMode] = useState<'ALL' | 'SUBJECT_GROUP' | 'UNRECORDED'>('ALL');
  const [subjectGroupId, setSubjectGroupId] = useState('ALL');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'UNRECORDED' | WorkflowStatus>('ALL');

  const [selection, setSelection] = useState({
    streamId: '',
    subjectId: 'ALL',
    termId: '',
    examType: 'MID_TERM',
    examName: ''
  });

  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [workflowUnavailable, setWorkflowUnavailable] = useState(false);
  const [workflowMode, setWorkflowMode] = useState<WorkflowMode>('MY_ENTRIES');

  const selectedStream = useMemo(
    () => streams.find((s: any) => s.id === selection.streamId),
    [streams, selection.streamId]
  );
  const currentTerm = useMemo(() => {
    return resolveCurrentTerm(terms);
  }, [terms]);

  const activeTerm = useMemo(
    () => terms.find((term: any) => term.id === selection.termId) || currentTerm || null,
    [terms, selection.termId, currentTerm]
  );
  const isClassTeacher = useMemo(
    () => streams.some((stream: any) => stream.class_teacher_id === user?.id),
    [streams, user?.id]
  );
  const formOptions = useMemo(() => {
    const seen = new Map<string, any>();
    streams.forEach((stream: any) => {
      if (stream.class_id && !seen.has(stream.class_id)) {
        seen.set(stream.class_id, stream.class);
      }
    });
    return [
      { id: 'ALL', name: 'All Classes' },
      ...[...seen.entries()].map(([id, klass]) => ({ id, name: klass?.name || 'Form' }))
    ];
  }, [streams]);

  const streamsForSelectedForm = useMemo(
    () => (formClassId === 'ALL' ? streams : streams.filter((stream: any) => stream.class_id === formClassId)),
    [streams, formClassId]
  );
  const recordingSubjectOptions = useMemo(() => {
    const source = onlyMySubjects
      ? subjects.filter((subject: any) => teacherSubjectIds.includes(subject.id))
      : subjects;
    return [{ id: 'ALL', name: 'All subjects' }, ...source.map((subject: any) => ({ id: subject.id, name: subject.name }))];
  }, [subjects, onlyMySubjects, teacherSubjectIds]);
  const rowSubjectOptions = useMemo(() => {
    return onlyMySubjects
      ? subjects.filter((subject: any) => teacherSubjectIds.includes(subject.id))
      : subjects;
  }, [subjects, onlyMySubjects, teacherSubjectIds]);

  const termOptions = useMemo(() => {
    const thisYear = new Date().getFullYear();
    const byKey = new Map<string, any>();

    for (const term of terms) {
      const year = Number(term.year);
      const termNo = parseTermNumber(term.name);
      if (!year || !termNo) continue;
      if (year < 2023 || year > thisYear) continue;
      const key = `${year}-${termNo}`;
      if (!byKey.has(key)) {
        byKey.set(key, term);
      }
    }

    const options: Array<{ id: string; name: string; year: number; termNo: number }> = [];
    for (let year = thisYear; year >= 2023; year -= 1) {
      for (let termNo = 1; termNo <= 3; termNo += 1) {
        const key = `${year}-${termNo}`;
        const term = byKey.get(key);
        if (!term) continue;
        options.push({
          id: term.id,
          name: `Term ${termNo} - ${year}`,
          year,
          termNo
        });
      }
    }
    return options;
  }, [terms]);

  const selectedTermOption = useMemo(
    () => termOptions.find((term) => term.id === selection.termId) || null,
    [termOptions, selection.termId]
  );
  const activeTermLabel = useMemo(() => {
    if (selectedTermOption) return selectedTermOption.name;
    if (!activeTerm) return 'Current Term';
    const termNo = parseTermNumber(activeTerm.name) || 1;
    return `Term ${termNo} - ${activeTerm.year}`;
  }, [selectedTermOption, activeTerm]);

  useEffect(() => {
    if (!isClassTeacher && workflowMode === 'CLASS_INBOX') {
      setWorkflowMode('MY_ENTRIES');
    }
  }, [isClassTeacher, workflowMode]);

  useEffect(() => {
    const init = async () => {
      if (!user?.school_id) return;
      try {
        const [s, sub, t] = await Promise.all([
          api.getStreams(user.school_id),
          api.getSubjects(user.school_id),
          api.getTerms(user.school_id)
        ]);

        const sortedStreams = [...s].sort((a: any, b: any) => {
          const aIsMine = a.class_teacher_id === user.id ? 0 : 1;
          const bIsMine = b.class_teacher_id === user.id ? 0 : 1;
          if (aIsMine !== bIsMine) return aIsMine - bIsMine;
          return `${a.class?.name || ''} ${a.name || ''}`.localeCompare(`${b.class?.name || ''} ${b.name || ''}`);
        });

        let scopedStreams = sortedStreams;
        if (user.role === 'TEACHER') {
          const { data: assignments } = await supabase
            .from('teacher_subject_stream_assignments')
            .select('stream_id, class_id')
            .eq('school_id', user.school_id)
            .eq('teacher_id', user.id)
            .eq('active', true);

          const allowedStreamIds = new Set<string>();
          for (const a of assignments || []) {
            if (a.stream_id) {
              allowedStreamIds.add(a.stream_id);
              continue;
            }
            if (a.class_id) {
              for (const st of sortedStreams) {
                if (st.class_id === a.class_id) {
                  allowedStreamIds.add(st.id);
                }
              }
            }
          }

          for (const st of sortedStreams) {
            if (st.class_teacher_id === user.id) {
              allowedStreamIds.add(st.id);
            }
          }

          if (allowedStreamIds.size > 0) {
            scopedStreams = sortedStreams.filter((st: any) => allowedStreamIds.has(st.id));
          } else {
            scopedStreams = sortedStreams.filter((st: any) => st.class_teacher_id === user.id);
          }
        }

        setStreams(scopedStreams);
        setSubjects(sub);
        setTerms(t);

        const defaultStream = scopedStreams[0]?.id || '';
        const defaultClassId = scopedStreams[0]?.class_id || '';
        const resolvedCurrentTerm = resolveCurrentTerm(t);
        const defaultTerm = resolvedCurrentTerm?.id || t[0]?.id || '';
        const defaultTermName = resolvedCurrentTerm?.name || t[0]?.name || 'Term';
        const defaultTermYear = resolvedCurrentTerm?.year || t[0]?.year || new Date().getFullYear();
        const defaultTermNo = parseTermNumber(defaultTermName) || 1;

        setFormClassId(defaultClassId);
        setSelection(prev => ({
          ...prev,
          streamId: defaultStream,
          subjectId: 'ALL',
          termId: defaultTerm,
          examType: 'MID_TERM',
          examName: `Mid Term - Term ${defaultTermNo} ${defaultTermYear}`
        }));

        if (user?.id) {
          const [fromWorkflow, fromResults] = await Promise.all([
            supabase
              .from('results_workflow')
              .select('subject_id')
              .eq('school_id', user.school_id)
              .eq('submitted_by', user.id),
            supabase
              .from('exam_results')
              .select('subject_id')
              .eq('school_id', user.school_id)
              .eq('teacher_id', user.id)
          ]);

          const taught = new Set<string>();
          (fromWorkflow.data || []).forEach((row: any) => row.subject_id && taught.add(row.subject_id));
          (fromResults.data || []).forEach((row: any) => row.subject_id && taught.add(row.subject_id));
          setTeacherSubjectIds([...taught]);
        }

      } catch (err) {
        console.error("Critical Load Error:", err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [user]);

  const refreshLiveData = async () => {
    if (!user?.school_id) return;

    setLoading(true);
    try {
      const listSubjectFilter = studentTargetMode === 'SUBJECT_GROUP' && subjectGroupId !== 'ALL'
        ? subjectGroupId
        : (selection.subjectId !== 'ALL' ? selection.subjectId : undefined);

      const stList = (selection.streamId && selection.streamId !== 'ALL')
        ? await api.getWorkflowStudents(
            selection.streamId,
            listSubjectFilter,
            search || undefined
          )
        : [];
      setStudents(stList || []);

      try {
        const queue = await api.getResultsWorkflow({
          schoolId: user.school_id,
          streamId: (selection.streamId && selection.streamId !== 'ALL') ? selection.streamId : undefined,
          subjectId: (workflowMode === 'MY_ENTRIES' && selection.subjectId !== 'ALL') ? selection.subjectId : undefined,
          termId: selection.termId || undefined,
          examType: selection.examType || undefined
        });

        const normalizedQueue = (queue || [])
          .filter((r: any) => {
            if (workflowMode === 'CLASS_INBOX') return true;
            return !selection.examName || r.exam_name === selection.examName;
          })
          .filter((r: any) => {
            if (workflowMode === 'CLASS_INBOX') return r.class_teacher_id === user?.id;
            return r.submitted_by === user?.id;
          });
        setWorkflowRows(normalizedQueue);
        setWorkflowUnavailable(false);
      } catch (workflowErr: any) {
        const msg = String(workflowErr?.message || '');
        if (msg.includes('results_workflow')) {
          setWorkflowUnavailable(true);
          setWorkflowRows([]);
        } else {
          throw workflowErr;
        }
      }

      const ids = (stList || []).map((s: any) => s.id);
      const latest = await api.getLatestPublishedByStudents(ids);
      setPublishedResults(latest || []);

      if (selection.termId && ids.length) {
        const avgRows = await api.getStudentTermAveragesByStudents(user.school_id, selection.termId, ids);
        setTermAverages(avgRows || []);
      } else {
        setTermAverages([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshLiveData();
  }, [selection.streamId, selection.subjectId, selection.termId, selection.examType, selection.examName, search, workflowMode, studentTargetMode, subjectGroupId]);

  useEffect(() => {
    if (!terms.length || selection.termId) return;
    if (currentTerm) {
      const termNo = parseTermNumber(currentTerm.name) || 1;
      const termLabel = `Term ${termNo}`;
      setSelection(prev => ({
        ...prev,
        termId: currentTerm.id,
        examName: `Mid Term - ${termLabel} ${currentTerm.year}`
      }));
    }
  }, [terms, currentTerm, selection.termId]);

  useEffect(() => {
    if (!onlyMySubjects) return;
    if (selection.subjectId === 'ALL') return;
    if (teacherSubjectIds.includes(selection.subjectId)) return;
    setSelection((prev) => ({ ...prev, subjectId: 'ALL' }));
  }, [onlyMySubjects, teacherSubjectIds, selection.subjectId]);

  useEffect(() => {
    const channel = supabase
      .channel(`results-workflow-${selection.streamId || 'ALL'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'results_workflow' }, () => {
        refreshLiveData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'exam_results' }, () => {
        refreshLiveData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selection.streamId, selection.subjectId, selection.termId, selection.examType, selection.examName, search, workflowMode]);

  const rowsByStudent = useMemo(() => {
    const map = new Map<string, any>();
    workflowRows.forEach((r: any) => {
      const current = map.get(r.student_id);
      if (!current || new Date(r.updated_at).getTime() > new Date(current.updated_at).getTime()) {
        map.set(r.student_id, r);
      }
    });
    return map;
  }, [workflowRows]);

  const publishedByStudentSubject = useMemo(() => {
    const map = new Map<string, any>();
    for (const r of publishedResults) {
      const key = `${r.student_id}::${r.subject_id}`;
      if (!map.has(key)) map.set(key, r);
    }
    return map;
  }, [publishedResults]);

  const latestByStudent = useMemo(() => {
    const map = new Map<string, any>();
    for (const r of publishedResults) {
      if (!map.has(r.student_id)) map.set(r.student_id, r);
    }
    return map;
  }, [publishedResults]);

  const averageByStudent = useMemo(() => {
    const map = new Map<string, any>();
    for (const r of termAverages) {
      map.set(r.student_id, r);
    }
    return map;
  }, [termAverages]);

  const workflowByStudentSubject = useMemo(() => {
    const map = new Map<string, any>();
    for (const row of workflowRows) {
      const key = `${row.student_id}::${row.subject_id}`;
      const current = map.get(key);
      if (!current || new Date(row.updated_at).getTime() > new Date(current.updated_at).getTime()) {
        map.set(key, row);
      }
    }
    return map;
  }, [workflowRows]);

  const visibleStudents = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return students.filter((s: any) => {
      if (needle) {
        const full = (s.profile?.full_name || '').toLowerCase();
        const adm = (s.adm_no || '').toLowerCase();
        if (!full.includes(needle) && !adm.includes(needle)) return false;
      }

      if (studentTargetMode === 'UNRECORDED') {
        const row = rowsByStudent.get(s.id);
        return !row;
      }

      if (statusFilter === 'ALL' || workflowMode === 'MY_ENTRIES') return true;
      const row = rowsByStudent.get(s.id);
      if (statusFilter === 'UNRECORDED') return !row;
      return row?.status === statusFilter;
    });
  }, [students, statusFilter, rowsByStudent, search, studentTargetMode, workflowMode]);

  const selectedViewStudent = useMemo(
    () => visibleStudents.find((student: any) => student.id === viewStudentId) || null,
    [visibleStudents, viewStudentId]
  );

  const setDraftValue = (studentId: string, patch: Partial<EntryDraft>) => {
    setDraftInputs(prev => ({
      ...prev,
      [studentId]: {
        marks: prev[studentId]?.marks || '',
        remarks: prev[studentId]?.remarks || '',
        ...patch
      }
    }));
  };

  const getDraftKey = (studentId: string, subjectId: string) => `${studentId}::${subjectId}`;

  const setDraftValueForSubject = (studentId: string, subjectId: string, patch: Partial<EntryDraft>) => {
    const key = getDraftKey(studentId, subjectId);
    setDraftInputs((prev) => ({
      ...prev,
      [key]: {
        marks: prev[key]?.marks || '',
        remarks: prev[key]?.remarks || '',
        ...patch
      }
    }));
  };

  const buildSinglePayload = (studentId: string, subjectId: string, status: WorkflowStatus) => {
    if (!user?.school_id || !selection.streamId || selection.streamId === 'ALL' || !selection.termId || !selection.examName) return null;
    if (!subjectId || subjectId === 'ALL') return null;

    const key = getDraftKey(studentId, subjectId);
    const draft = draftInputs[key];
    const marks = Number(draft?.marks);
    if (!Number.isFinite(marks) || marks < 0 || marks > 100) return null;

    return {
      school_id: user.school_id,
      stream_id: selection.streamId,
      student_id: studentId,
      subject_id: subjectId,
      term_id: selection.termId,
      exam_type: selection.examType,
      exam_name: selection.examName,
      marks,
      grade: toGrade(marks),
      remarks: draft?.remarks || null,
      status,
      submitted_by: user.id,
      class_teacher_id: selectedStream?.class_teacher_id || null,
      review_note: `scope:SINGLE;count:1;batch:${makeBatchId()}`
    };
  };

  const saveRowResult = async (studentId: string, subjectId: string, status: WorkflowStatus) => {
    const payload = buildSinglePayload(studentId, subjectId, status);
    if (!payload) {
      alert('Choose subject and enter valid marks first.');
      return;
    }

    try {
      if (status === 'DRAFT') setSaving(true);
      if (status === 'SUBMITTED') setSubmitting(true);
      await api.upsertResultsWorkflow([payload]);
      await refreshLiveData();
    } catch (error) {
      console.error(error);
      alert(status === 'DRAFT' ? 'Failed to save draft' : 'Failed to submit result');
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };

  const setRowEditValue = (studentId: string, patch: Partial<{ fullName: string; admNo: string; previousMarks: string }>) => {
    setRowEditValuesByStudent((prev) => ({
      ...prev,
      [studentId]: {
        fullName: prev[studentId]?.fullName || '',
        admNo: prev[studentId]?.admNo || '',
        previousMarks: prev[studentId]?.previousMarks || '',
        ...patch
      }
    }));
  };

  const persistRowEdits = async (student: any, subjectId: string) => {
    const edit = rowEditValuesByStudent[student.id];
    if (!edit) return;

    const updates: Promise<any>[] = [];

    if (edit.fullName && edit.fullName !== (student.profile?.full_name || '')) {
      updates.push(
        supabase
          .from('profiles')
          .update({ full_name: edit.fullName })
          .eq('id', student.id)
      );
    }

    if (edit.admNo && edit.admNo !== (student.adm_no || '')) {
      updates.push(
        supabase
          .from('students')
          .update({ adm_no: edit.admNo })
          .eq('id', student.id)
      );
    }

    const prev = publishedByStudentSubject.get(`${student.id}::${subjectId}`);
    const prevMarkNum = Number(edit.previousMarks);
    if (prev?.id && Number.isFinite(prevMarkNum) && prevMarkNum >= 0 && prevMarkNum <= 100 && prevMarkNum !== Number(prev.marks)) {
      updates.push(
        supabase
          .from('exam_results')
          .update({
            marks: prevMarkNum,
            grade: toGrade(prevMarkNum)
          })
          .eq('id', prev.id)
      );
    }

    if (updates.length) {
      await Promise.all(updates);
    }
  };

  const handleRowSave = async (student: any, subjectId: string, status: WorkflowStatus) => {
    await persistRowEdits(student, subjectId);
    await saveRowResult(student.id, subjectId, status);
    setRowEditModeByStudent((prev) => ({ ...prev, [student.id]: false }));
  };

  const buildPayload = (status: WorkflowStatus, ids: string[], scope?: 'CLASS' | 'SINGLE' | 'GROUP') => {
    if (!user?.school_id || !selection.streamId || selection.streamId === 'ALL' || !selection.termId || !selection.examName) return [];
    if (!selection.subjectId || selection.subjectId === 'ALL') return [];

    const batchId = makeBatchId();
    const inferredScope = scope || (ids.length === 1 ? 'SINGLE' : 'GROUP');

    return ids
      .map((studentId) => {
        const key = getDraftKey(studentId, selection.subjectId);
        const draft = draftInputs[key];
        const marks = Number(draft?.marks);
        if (!Number.isFinite(marks)) return null;
        if (marks < 0 || marks > 100) return null;

        return {
          school_id: user.school_id,
          stream_id: selection.streamId,
          student_id: studentId,
          subject_id: selection.subjectId,
          term_id: selection.termId,
          exam_type: selection.examType,
          exam_name: selection.examName,
          marks,
          grade: toGrade(marks),
          remarks: draft?.remarks || null,
          status,
          submitted_by: user.id,
          class_teacher_id: selectedStream?.class_teacher_id || null,
          review_note: `scope:${inferredScope};count:${ids.length};batch:${batchId}`
        };
      })
      .filter(Boolean);
  };

  const saveDraft = async () => {
    const targets = selectedStudentIds.length ? selectedStudentIds : Object.keys(draftInputs);
    const payload = buildPayload('DRAFT', targets, targets.length === visibleStudents.length ? 'CLASS' : (targets.length === 1 ? 'SINGLE' : 'GROUP'));
    if (!payload.length) return;
    setSaving(true);
    try {
      await api.upsertResultsWorkflow(payload);
      await refreshLiveData();
      setSelectedStudentIds([]);
    } catch (err) {
      console.error(err);
      alert('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const submitForReview = async () => {
    const targets = selectedStudentIds.length ? selectedStudentIds : Object.keys(draftInputs);
    const payload = buildPayload('SUBMITTED', targets, targets.length === visibleStudents.length ? 'CLASS' : (targets.length === 1 ? 'SINGLE' : 'GROUP'));
    if (!payload.length) return;
    setSubmitting(true);
    try {
      await api.upsertResultsWorkflow(payload);
      await refreshLiveData();
      setSelectedStudentIds([]);
    } catch (err) {
      console.error(err);
      alert('Failed to submit results');
    } finally {
      setSubmitting(false);
    }
  };

  const reviewOne = async (rowId: string, status: 'APPROVED' | 'NEEDS_REVISION') => {
    if (!user?.id) return;
    try {
      await api.updateWorkflowStatus([rowId], {
        status,
        reviewed_by: user.id
      });
      await refreshLiveData();
    } catch (err) {
      console.error(err);
      alert('Failed to update review');
    }
  };

  const publishApproved = async () => {
    if (!isClassTeacher || !user?.id) return;
    const approved = workflowRows.filter((r: any) => r.status === 'APPROVED').map((r: any) => r.id);
    if (!approved.length) return;

    setPublishing(true);
    try {
      await api.publishWorkflow(approved, user.id);
      await refreshLiveData();
    } catch (err) {
      console.error(err);
      alert('Failed to publish approved results');
    } finally {
      setPublishing(false);
    }
  };

  if (fullViewStudent) {
    return (
      <StudentFullDetailsView 
        student={fullViewStudent} 
        onClose={() => setFullViewStudent(null)} 
      />
    );
  }

  if (loading && streams.length === 0) return <div className="p-10 font-sans font-bold text-zinc-900 animate-pulse">Establishing Live Connection...</div>;

  const selectedSubject = subjects.find((s: any) => s.id === selection.subjectId);
  const queueCounts = {
    submitted: workflowRows.filter((r: any) => r.status === 'SUBMITTED').length,
    revision: workflowRows.filter((r: any) => r.status === 'NEEDS_REVISION').length,
    approved: workflowRows.filter((r: any) => r.status === 'APPROVED').length,
    published: workflowRows.filter((r: any) => r.status === 'PUBLISHED').length
  };

  const inboxRows = workflowRows.filter((r: any) => {
    const needle = search.trim().toLowerCase();
    if (needle) {
      const studentName = (r.student?.profile?.full_name || '').toLowerCase();
      const adm = (r.student?.adm_no || '').toLowerCase();
      const subject = (r.subject?.name || '').toLowerCase();
      const sender = (r.submitted_by_profile?.full_name || '').toLowerCase();
      if (!studentName.includes(needle) && !adm.includes(needle) && !subject.includes(needle) && !sender.includes(needle)) {
        return false;
      }
    }

    if (statusFilter === 'ALL' || statusFilter === 'UNRECORDED') return true;
    return r.status === statusFilter;
  });

  const parseReviewMeta = (note?: string) => {
    const raw = note || '';
    const parts = raw.split(';').reduce((acc: Record<string, string>, item) => {
      const [k, v] = item.split(':');
      if (k && v) acc[k.trim()] = v.trim();
      return acc;
    }, {});
    return {
      scope: parts.scope || '-',
      count: parts.count || '-'
    };
  };

  const exportStudentSummary = (student: any) => {
    if (!student) return;
    const reportRows = viewStudentId === student.id ? viewStudentResults : [];
    const avg = averageByStudent.get(student.id);

    const doc = new jsPDF();
    const schoolName = user?.school_id ? 'Student Results Report' : 'Student Report';
    doc.setFontSize(14);
    doc.text(schoolName, 105, 16, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Student: ${student.profile?.full_name || '-'}`, 14, 28);
    doc.text(`ADM: ${student.adm_no || '-'}`, 14, 34);
    doc.text(`Term: ${activeTermLabel}`, 14, 40);
    doc.text(`Average: ${avg?.average_mark ?? '-'} (${avg?.average_grade || '-'})`, 14, 46);

    const body = reportRows.length
      ? reportRows.map((r: any) => {
          const examType = r.exam?.type === 'MID_TERM'
            ? 'Mid Term'
            : r.exam?.type === 'END_TERM'
              ? 'End Term'
              : r.exam?.type || '-';
          const termName = r.exam?.term?.name || activeTermLabel;
          return [r.subject?.name || '-', termName, examType, r.marks ?? '-', r.grade || '-'];
        })
      : [[
          selectedSubject?.name || 'Subject',
          activeTermLabel,
          examTypeLabel(selection.examType),
          latestByStudent.get(student.id)?.marks ?? '-',
          latestByStudent.get(student.id)?.grade || '-'
        ]];

    autoTable(doc, {
      startY: 54,
      head: [['Subject', 'Term', 'Exam', 'Marks', 'Grade']],
      body
    });

    const safeName = (student.profile?.full_name || student.adm_no || 'student').replace(/\s+/g, '_');
    doc.save(`${safeName}_report.pdf`);
  };

  const openStudentDetails = async (student: any) => {
    if (!student?.id) return;
    setViewStudentId(student.id);
    setViewStudentLoading(true);

    try {
      const [subs, allResults] = await Promise.all([
        api.getStudentSubjects(student.id),
        api.getStudentResultsAll(student.id)
      ]);
      setViewStudentSubjects(subs || []);
      setViewStudentResults(allResults || []);
    } catch (error) {
      console.error(error);
      setViewStudentSubjects([]);
      setViewStudentResults([]);
    } finally {
      setViewStudentLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-8 font-sans text-zinc-900 min-h-screen space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Results & Student Management</h1>
          <p className="text-xs text-zinc-500 mt-1">Record, submit, review and publish results in real time.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={() => setShowRecordForm((prev) => !prev)}>
            {showRecordForm ? 'Hide Form' : 'Record Results'}
          </Button>
          {isClassTeacher && (
            <>
              <Button
                variant={workflowMode === 'MY_ENTRIES' ? 'primary' : 'outline'}
                onClick={() => setWorkflowMode('MY_ENTRIES')}
              >
                Regular Teacher
              </Button>
              <Button
                variant={workflowMode === 'CLASS_INBOX' ? 'primary' : 'outline'}
                onClick={() => setWorkflowMode('CLASS_INBOX')}
              >
                Class Teacher Inbox
              </Button>
            </>
          )}
          {isClassTeacher ? <Badge variant="info">Class Teacher Mode</Badge> : <Badge variant="neutral">Subject Teacher Mode</Badge>}
          <Badge variant="warning">Pending {queueCounts.submitted}</Badge>
          <Badge variant="success">Published {queueCounts.published}</Badge>
        </div>
      </div>

      {workflowUnavailable && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          Workflow table is not ready yet. Student list still works. Apply migration file <span className="font-semibold">20260410_results_workflow.sql</span> to enable draft, submit, review and publish.
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <SelectField
            label="Form"
            value={formClassId}
            onChange={(v) => {
              setFormClassId(v);
              if (v === 'ALL') {
                setSelection((prev) => ({ ...prev, streamId: 'ALL' }));
                return;
              }
              const nextStream = streams.find((stream: any) => stream.class_id === v);
              setSelection((prev) => ({ ...prev, streamId: nextStream?.id || 'ALL' }));
            }}
            options={formOptions}
          />

          <SelectField
            label="Stream"
            value={selection.streamId}
            onChange={(v) => {
              if (v === 'ALL') {
                setFormClassId('ALL');
                setSelection((prev) => ({ ...prev, streamId: 'ALL' }));
                return;
              }
              const nextStream = streams.find((stream: any) => stream.id === v);
              setFormClassId(nextStream?.class_id || formClassId);
              setSelection((prev) => ({ ...prev, streamId: v }));
            }}
            options={[
              { id: 'ALL', name: 'All Streams' },
              ...streamsForSelectedForm.map((s: any) => ({
                id: s.id,
                name: `${s.name}${s.class_teacher_id === user?.id ? ' (My class)' : ''}`
              }))
            ]}
          />

          <label className="flex flex-col gap-1 min-w-[160px]">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Search Student</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or ADM"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-medium outline-none focus:ring-2 focus:ring-zinc-900/10"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {showRecordForm && workflowMode === 'MY_ENTRIES' && (
          <div className="xl:col-span-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 space-y-4">
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Record Results</p>
            <p className="text-xs text-zinc-500">Use this form and filters to filter your students, choose how to save draft or send to class teacher.</p>

            <div className="grid grid-cols-1 gap-3">
              <SelectField
                label="Class"
                value={formClassId}
                onChange={(v) => {
                  setFormClassId(v);
                  if (v === 'ALL') {
                    setSelection((prev) => ({ ...prev, streamId: 'ALL' }));
                    return;
                  }
                  const nextStream = streams.find((stream: any) => stream.class_id === v);
                  setSelection((prev) => ({ ...prev, streamId: nextStream?.id || 'ALL' }));
                }}
                options={formOptions}
              />

              <SelectField
                label="Stream"
                value={selection.streamId}
                onChange={(v) => {
                  if (v === 'ALL') {
                    setFormClassId('ALL');
                    setSelection((prev) => ({ ...prev, streamId: 'ALL' }));
                    return;
                  }
                  const nextStream = streams.find((stream: any) => stream.id === v);
                  setFormClassId(nextStream?.class_id || formClassId);
                  setSelection((prev) => ({ ...prev, streamId: v }));
                }}
                options={[
                  { id: 'ALL', name: 'All Streams' },
                  ...streamsForSelectedForm.map((s: any) => ({
                    id: s.id,
                    name: `${s.name}${s.class_teacher_id === user?.id ? ' (My class)' : ''}`
                  }))
                ]}
              />

              <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium">
                <span>Only classes I teach</span>
                <button
                  type="button"
                  onClick={() => setOnlyMySubjects((prev) => !prev)}
                  className={`relative h-6 w-11 rounded-full transition-colors ${onlyMySubjects ? 'bg-zinc-900' : 'bg-zinc-300'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${onlyMySubjects ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </label>

              <SelectField
                label="Subject"
                value={selection.subjectId}
                onChange={(v) => setSelection((prev) => ({ ...prev, subjectId: v }))}
                options={recordingSubjectOptions}
              />

              <SelectField
                label="Term"
                value={selection.termId}
                onChange={(v) => {
                  const term = termOptions.find((t) => t.id === v);
                  const termLabel = term ? `Term ${term.termNo}` : 'Term';
                  const examLabel = examTypeLabel(selection.examType).replace(' Exams', '');
                  setSelection((prev) => ({
                    ...prev,
                    termId: v,
                    examName: `${examLabel} - ${termLabel} ${term?.year || new Date().getFullYear()}`
                  }));
                }}
                options={termOptions.map((t) => ({ id: t.id, name: t.name }))}
              />

              <SelectField
                label="Exam Type"
                value={selection.examType}
                onChange={(v) => {
                  const term = selectedTermOption;
                  const termLabel = term ? `Term ${term.termNo}` : 'Term';
                  const examLabel = examTypeLabel(v).replace(' Exams', '');
                  setSelection((prev) => ({ ...prev, examType: v, examName: `${examLabel} - ${termLabel} ${term?.year || new Date().getFullYear()}` }));
                }}
                options={EXAM_TYPES.map((t) => ({ id: t, name: examTypeLabel(t) }))}
              />

              <label className="flex flex-col gap-1 min-w-[140px]">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Exam Name</span>
                <input
                  value={selection.examName}
                  onChange={(e) => setSelection((prev) => ({ ...prev, examName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-xs font-medium outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
              </label>

              <div className="rounded-xl border border-zinc-200 p-3 space-y-2">
                <p className="text-[11px] font-bold text-zinc-500 uppercase">Choose students to change results for</p>
                <div className="grid grid-cols-1 gap-2">
                  {[{ id: 'ALL', label: 'All students' }, { id: 'SUBJECT_GROUP', label: 'Subject group students' }, { id: 'UNRECORDED', label: 'Unrecorded results' }].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setStudentTargetMode(option.id as any)}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-xs font-medium transition ${studentTargetMode === option.id ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                {studentTargetMode === 'SUBJECT_GROUP' && (
                  <SelectField
                    label="Choose Subject"
                    value={subjectGroupId}
                    onChange={(value) => setSubjectGroupId(value)}
                    options={[
                      { id: 'ALL', name: 'All subject students' },
                      ...subjects.map((subject: any) => ({ id: subject.id, name: `${subject.name} students` }))
                    ]}
                  />
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button className="flex-1" onClick={saveDraft} disabled={saving || loading || selection.subjectId === 'ALL'}>{saving ? 'Saving...' : 'Save Draft'}</Button>
              <Button variant="outline" className="flex-1" onClick={submitForReview} disabled={submitting || loading || selection.subjectId === 'ALL'}>{submitting ? 'Submitting...' : 'Submit'}</Button>
            </div>

            <p className="text-[11px] text-zinc-500 pt-2">Use row actions to Save Draft or Submit for each student-subject entry.</p>

            {isClassTeacher && (
              <div className="pt-2 border-t border-zinc-100">
                <Button variant="secondary" className="w-full" onClick={publishApproved} disabled={publishing || queueCounts.approved === 0}>
                  {publishing ? 'Publishing...' : `Publish Approved (${queueCounts.approved})`}
                </Button>
              </div>
            )}
          </div>
        )}

        <div className={`${showRecordForm && workflowMode === 'MY_ENTRIES' ? 'xl:col-span-8' : 'xl:col-span-12'} bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl p-4 space-y-4`}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              {workflowMode === 'CLASS_INBOX'
                ? `Inbox (${inboxRows.length})`
                : `${selection.subjectId === 'ALL' ? 'All Subjects' : (selectedSubject?.name || 'Subject')} - Students (${visibleStudents.length})`}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {showRecordForm && workflowMode === 'MY_ENTRIES' && (
                <label className="flex items-center gap-2 rounded-lg border border-zinc-200 px-2 py-1.5 text-xs min-w-[250px]">
                  <span className="text-zinc-500">Search</span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search student name or ADM"
                    className="w-full bg-transparent outline-none"
                  />
                </label>
              )}
              {workflowMode === 'CLASS_INBOX' && (
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 rounded-lg border border-zinc-200 text-xs font-medium outline-none"
                >
                  <option value="ALL">All</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="NEEDS_REVISION">Needs Revision</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              )}
              {workflowMode === 'CLASS_INBOX' && isClassTeacher && (
                <Button variant="secondary" onClick={publishApproved} disabled={publishing || queueCounts.approved === 0}>
                  {publishing ? 'Publishing...' : `Publish Approved (${queueCounts.approved})`}
                </Button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            {workflowMode === 'CLASS_INBOX' ? (
              <table className="w-full min-w-[980px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="px-2 py-2 text-[10px] uppercase text-zinc-500">Student</th>
                    <th className="px-2 py-2 text-[10px] uppercase text-zinc-500">ADM</th>
                    <th className="px-2 py-2 text-[10px] uppercase text-zinc-500">Status</th>
                    <th className="px-2 py-2 text-[10px] uppercase text-zinc-500">Subject</th>
                    <th className="px-2 py-2 text-[10px] uppercase text-zinc-500">Marks</th>
                    <th className="px-2 py-2 text-[10px] uppercase text-zinc-500">Grade</th>
                    <th className="px-2 py-2 text-[10px] uppercase text-zinc-500">From Teacher</th>
                    <th className="px-2 py-2 text-[10px] uppercase text-zinc-500">Scope</th>
                    <th className="px-2 py-2 text-[10px] uppercase text-zinc-500">Review</th>
                  </tr>
                </thead>
                <tbody>
                  {inboxRows.map((r: any) => {
                    const meta = parseReviewMeta(r.review_note);
                    return (
                      <tr key={r.id} className="border-b border-zinc-50">
                        <td className="px-2 py-2 text-xs font-semibold">{r.student?.profile?.full_name || '-'}</td>
                        <td className="px-2 py-2 text-xs text-zinc-500">{r.student?.adm_no || '-'}</td>
                        <td className="px-2 py-2"><Badge variant={statusBadge[r.status as WorkflowStatus]}>{r.status}</Badge></td>
                        <td className="px-2 py-2 text-xs">{r.subject?.name || '-'}</td>
                        <td className="px-2 py-2 text-xs">{r.marks}</td>
                        <td className="px-2 py-2 text-xs font-bold">{r.grade || toGrade(Number(r.marks))}</td>
                        <td className="px-2 py-2 text-xs text-zinc-500">{r.submitted_by_profile?.full_name || '-'}</td>
                        <td className="px-2 py-2 text-xs text-zinc-500">{meta.scope} {meta.count !== '-' ? `(${meta.count})` : ''}</td>
                        <td className="px-2 py-2">
                          {(r.status === 'SUBMITTED' || r.status === 'NEEDS_REVISION') ? (
                            <div className="flex gap-1">
                              <Button className="h-7 px-2" onClick={() => reviewOne(r.id, 'APPROVED')}>Approve</Button>
                              <Button variant="outline" className="h-7 px-2" onClick={() => reviewOne(r.id, 'NEEDS_REVISION')}>Deny</Button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-zinc-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table className="w-full min-w-[1180px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="px-2 py-2 text-[10px] uppercase text-zinc-500">Student</th>
                    <th className="px-2 py-2 text-[10px] uppercase text-zinc-500">ADM</th>
                    {showRecordForm ? (
                      <>
                        <th className="px-2 py-2 text-[10px] uppercase text-zinc-500">Subject</th>
                        <th className="px-2 py-2 text-[10px] uppercase text-zinc-500">Prv Marks</th>
                        <th className="px-2 py-2 text-[10px] uppercase text-zinc-500">Prv Grade</th>
                        <th className="px-2 py-2 text-[10px] uppercase text-zinc-500">New Mark</th>
                        <th className="px-2 py-2 text-[10px] uppercase text-zinc-500">New Grade</th>
                        <th className="px-2 py-2 text-[10px] uppercase text-zinc-500">Remarks</th>
                      </>
                    ) : (
                      <th className="px-2 py-2 text-[10px] uppercase text-zinc-500" colSpan={2}>
                        <div className="flex flex-col items-center leading-tight">
                          <span>{activeTermLabel}</span>
                          <span className="text-[9px] text-zinc-400 normal-case">Avg Mark / Avg Grade</span>
                        </div>
                      </th>
                    )}
                    <th className="px-2 py-2 text-[10px] uppercase text-zinc-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.map((s: any) => {
                    const selectedSubjectId = showRecordForm ? (rowSubjectByStudent[s.id] || (selection.subjectId !== 'ALL' ? selection.subjectId : '')) : '';
                    const draftKey = selectedSubjectId ? getDraftKey(s.id, selectedSubjectId) : '';
                    const workflowForSubject = selectedSubjectId ? workflowByStudentSubject.get(draftKey) : null;
                    const draft = draftKey
                      ? (draftInputs[draftKey] || { marks: workflowForSubject?.marks?.toString?.() || '', remarks: workflowForSubject?.remarks || '' })
                      : { marks: '', remarks: '' };
                    const marksNum = Number(draft.marks);
                    const avg = averageByStudent.get(s.id);
                    const prev = selectedSubjectId ? publishedByStudentSubject.get(`${s.id}::${selectedSubjectId}`) : null;
                    const newGrade = Number.isFinite(marksNum) ? toGrade(marksNum) : '-';
                    const isEditing = !!rowEditModeByStudent[s.id];
                    const rowEdit = rowEditValuesByStudent[s.id] || {
                      fullName: s.profile?.full_name || '',
                      admNo: s.adm_no || '',
                      previousMarks: prev?.marks?.toString?.() || ''
                    };

                    return (
                      <tr key={s.id} className="border-b border-zinc-50">
                        <td className="px-2 py-2 text-xs font-semibold">
                          {showRecordForm && isEditing ? (
                            <input
                              value={rowEdit.fullName}
                              onChange={(e) => setRowEditValue(s.id, { fullName: e.target.value })}
                              className="w-full rounded border border-zinc-200 px-2 py-1 text-xs outline-none"
                            />
                          ) : (
                            s.profile?.full_name
                          )}
                        </td>
                        <td className="px-2 py-2 text-xs text-zinc-500">
                          {showRecordForm && isEditing ? (
                            <input
                              value={rowEdit.admNo}
                              onChange={(e) => setRowEditValue(s.id, { admNo: e.target.value })}
                              className="w-full rounded border border-zinc-200 px-2 py-1 text-xs outline-none"
                            />
                          ) : (
                            s.adm_no
                          )}
                        </td>

                        {showRecordForm ? (
                          <>
                            <td className="px-2 py-2">
                              <select
                                value={selectedSubjectId}
                                onChange={(e) => setRowSubjectByStudent((prevRows) => ({ ...prevRows, [s.id]: e.target.value }))}
                                className="w-full rounded border border-zinc-200 px-2 py-1 text-xs outline-none"
                              >
                                <option value="">Choose subject</option>
                                {rowSubjectOptions.map((subject: any) => (
                                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="px-2 py-2 text-xs text-zinc-500">
                              {isEditing ? (
                                <input
                                  value={rowEdit.previousMarks}
                                  onChange={(e) => setRowEditValue(s.id, { previousMarks: e.target.value })}
                                  className="w-20 rounded border border-zinc-200 px-2 py-1 text-xs outline-none"
                                  type="number"
                                  min={0}
                                  max={100}
                                    disabled={!selectedSubjectId || !isEditing}
                                />
                              ) : (
                                prev?.marks ?? '-'
                              )}
                            </td>
                            <td className="px-2 py-2 text-xs font-semibold">{isEditing && rowEdit.previousMarks ? toGrade(Number(rowEdit.previousMarks)) : (prev?.grade || '-')}</td>
                            <td className="px-2 py-2">
                              <input
                                value={draft.marks}
                                onChange={(e) => selectedSubjectId && setDraftValueForSubject(s.id, selectedSubjectId, { marks: e.target.value })}
                                className="w-20 px-2 py-1 rounded border border-zinc-200 text-xs outline-none focus:ring-2 focus:ring-zinc-900/10"
                                type="number"
                                min={0}
                                max={100}
                                disabled={!selectedSubjectId}
                              />
                            </td>
                            <td className="px-2 py-2 text-xs font-bold">{newGrade}</td>
                            <td className="px-2 py-2">
                              <input
                                value={draft.remarks}
                                onChange={(e) => selectedSubjectId && setDraftValueForSubject(s.id, selectedSubjectId, { remarks: e.target.value })}
                                className="w-full px-2 py-1 rounded border border-zinc-200 text-xs outline-none focus:ring-2 focus:ring-zinc-900/10"
                                placeholder="Optional"
                                disabled={!selectedSubjectId || !isEditing}
                              />
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-2 py-2 text-xs text-zinc-500">{avg?.average_mark ?? '-'}</td>
                            <td className="px-2 py-2 text-xs font-bold">{avg?.average_grade || '-'}</td>
                          </>
                        )}

                        <td className="px-2 py-2">
                          {showRecordForm ? (
                            <div className="flex flex-wrap items-center gap-1">
                              <Button
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => selectedSubjectId && handleRowSave(s, selectedSubjectId, 'DRAFT')}
                                disabled={!selectedSubjectId || saving}
                                type="button"
                                title="Save Draft"
                              >
                                <span className="flex items-center gap-0.5"><Save size={13} /><Pause size={11} /></span>
                              </Button>
                              <Button
                                className="h-8 w-8 p-0"
                                onClick={() => selectedSubjectId && handleRowSave(s, selectedSubjectId, 'SUBMITTED')}
                                disabled={!selectedSubjectId || submitting}
                                type="button"
                                title="Save and Push"
                              >
                                <span className="flex items-center gap-0.5"><Save size={13} /><ArrowUpRight size={11} /></span>
                              </Button>
                              <Button
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setRowEditModeByStudent((prevState) => ({ ...prevState, [s.id]: !prevState[s.id] }));
                                  setRowEditValuesByStudent((prevState) => ({
                                    ...prevState,
                                    [s.id]: {
                                      fullName: s.profile?.full_name || '',
                                      admNo: s.adm_no || '',
                                      previousMarks: prev?.marks?.toString?.() || ''
                                    }
                                  }));
                                }}
                                type="button"
                                title="Edit Row"
                              >
                                <PencilLine size={14} />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => setFullViewStudent(s)} type="button"><Eye size={14} /></Button>
                              <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => { setShowRecordForm(true); setWorkflowMode('MY_ENTRIES'); setSelectedStudentIds([s.id]); }} type="button"><PencilLine size={14} /></Button>
                              <Button variant="ghost" className="h-8 w-8 p-0" onClick={() => exportStudentSummary(s)} type="button"><Download size={14} /></Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {loading && <p className="text-xs text-zinc-400">Syncing...</p>}
          {!loading && workflowMode === 'MY_ENTRIES' && visibleStudents.length === 0 && (
            <div className="py-10 text-center text-xs text-zinc-400">No students match this filter.</div>
          )}
          {!loading && workflowMode === 'CLASS_INBOX' && inboxRows.length === 0 && (
            <div className="py-10 text-center text-xs text-zinc-400">No submitted results in inbox for this filter.</div>
          )}
        </div>
      </div>

      <Modal
        isOpen={!!selectedViewStudent}
        onClose={() => {
          setViewStudentId('');
          setViewStudentResults([]);
          setViewStudentSubjects([]);
        }}
        title="Student Profile & Results"
      >
        {selectedViewStudent && (
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-xs text-zinc-500 uppercase">Student</p>
              <p className="font-semibold">{selectedViewStudent.profile?.full_name || '-'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-zinc-500 uppercase">ADM No</p>
                <p className="font-semibold">{selectedViewStudent.adm_no || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase">Term</p>
                <p className="font-semibold">{activeTermLabel}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase">Average Mark</p>
                <p className="font-semibold">{averageByStudent.get(selectedViewStudent.id)?.average_mark ?? '-'}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase">Average Grade</p>
                <p className="font-semibold">{averageByStudent.get(selectedViewStudent.id)?.average_grade || '-'}</p>
              </div>
            </div>
            <div className="flex items-center justify-end">
              <Button variant="outline" onClick={() => exportStudentSummary(selectedViewStudent)}>
                Download PDF Report
              </Button>
            </div>
            <div className="border border-zinc-200 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/60">
                    <th className="px-3 py-2 text-[10px] uppercase text-zinc-500">Subject</th>
                    <th className="px-3 py-2 text-[10px] uppercase text-zinc-500">Term</th>
                    <th className="px-3 py-2 text-[10px] uppercase text-zinc-500">Exam</th>
                    <th className="px-3 py-2 text-[10px] uppercase text-zinc-500">Marks</th>
                    <th className="px-3 py-2 text-[10px] uppercase text-zinc-500">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {viewStudentLoading && (
                    <tr>
                      <td colSpan={5} className="px-3 py-3 text-xs text-zinc-500">Loading student results...</td>
                    </tr>
                  )}
                  {!viewStudentLoading && viewStudentResults.length > 0 && viewStudentResults.map((row: any) => (
                    <tr key={row.id} className="border-b border-zinc-50">
                      <td className="px-3 py-2 text-xs font-medium">{row.subject?.name || '-'}</td>
                      <td className="px-3 py-2 text-xs text-zinc-600">{row.exam?.term?.name || '-'}</td>
                      <td className="px-3 py-2 text-xs text-zinc-600">{examTypeLabel(row.exam?.type || '')}</td>
                      <td className="px-3 py-2 text-xs">{row.marks ?? '-'}</td>
                      <td className="px-3 py-2 text-xs font-semibold">{row.grade || '-'}</td>
                    </tr>
                  ))}
                  {!viewStudentLoading && viewStudentResults.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-3 text-xs text-zinc-500">
                        No published results found. Enrolled subjects: {viewStudentSubjects.length}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

const SelectField = ({ label, value, options, onChange }: any) => (
  <div className="flex flex-col gap-1 min-w-[140px]">
    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</span>
    <select
      className="px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-zinc-900/10 transition-all cursor-pointer"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((opt: any) => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
    </select>
  </div>
);