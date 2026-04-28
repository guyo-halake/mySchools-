import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Button, Badge, Modal } from '../components/UI';
import { StudentFullDetailsView } from '../components/StudentFullDetailsView';
import { Eye, Pencil, PencilLine, Upload, Maximize2, Minimize2, Download, Save, Pause, ArrowUpRight, X, ChevronRight, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type WorkflowStatus = 'DRAFT' | 'SUBMITTED' | 'NEEDS_REVISION' | 'APPROVED' | 'PUBLISHED' | 'ALL';
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
  PUBLISHED: 'success',
  ALL: 'info'
};

const toGrade = (marks: number) => {
  if (marks >= 80) return 'A';
  if (marks >= 70) return 'B';
  if (marks >= 60) return 'C';
  if (marks >= 50) return 'D';
  return 'E';
};

const makeBatchId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const getDraftKey = (studentId: string, subjectId: string) => `${studentId}::${subjectId}`;

const examTypeLabel = (value: string) => {
  if (value === 'END_TERM') return 'End Term Exams';
  if (value === 'MID_TERM') return 'Mid Term Exams';
  if (value === 'SPECIAL') return 'Special Exams';
  if (value === 'INTERNAL') return 'Internal Exams';
  return value;
};

const resolveCurrentTerm = (terms: any[]) => {
  const today = new Date();
  const current = terms.find(t => t.is_current === true || t.status === 'ACTIVE');
  if (current) return current;

  const inRange = terms.find(t => {
    if (!t.start_date || !t.end_date) return false;
    return new Date(t.start_date) <= today && new Date(t.end_date) >= today;
  });
  if (inRange) return inRange;

  // Holiday Fallback: Find the most recently finished term
  return [...terms]
    .filter(t => t.end_date && new Date(t.end_date) < today)
    .sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())[0];
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
  const [importing, setImporting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [pendingMappings, setPendingMappings] = useState<Record<string, string>>({});
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedStream = useMemo(
    () => streams.find((s: any) => s.id === selection.streamId),
    [streams, selection.streamId]
  );
  const currentTerm = useMemo(() => {
    return resolveCurrentTerm(terms);
  }, [terms]);

  const termOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return terms
      .filter(t => t.year >= currentYear - 1 && t.year <= currentYear + 1)
      .sort((a, b) => new Date(b.start_date || 0).getTime() - new Date(a.start_date || 0).getTime());
  }, [terms]);

  const activeTerm = useMemo(
    () => terms.find((term: any) => term.id === selection.termId) || currentTerm || null,
    [terms, selection.termId, currentTerm]
  );

  const activeTermLabel = useMemo(() => {
    if (!activeTerm && !currentTerm) return 'On Holiday';
    const term = activeTerm || currentTerm;
    if (!term) return 'Select Term';

    const name = term.name || '';
    const year = term.year?.toString() || '';

    // Prevent "Term 1 2026 2026" duplication
    if (year && name.includes(year)) return name;
    return `${name} ${year}`.trim();
  }, [activeTerm, currentTerm]);

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
      ...Array.from(seen.entries()).map(([id, klass]) => ({ id, name: klass?.name || 'Form' }))
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

  useEffect(() => {
    if (terms && terms.length > 0 && !selection.termId) {
      const current = resolveCurrentTerm(terms);
      if (current) setSelection(prev => ({ ...prev, termId: current.id }));
      else setSelection(prev => ({ ...prev, termId: terms[0]?.id || '' }));
    }
  }, [terms, selection.termId]);

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
        const defaultTerm = resolvedCurrentTerm?.id || '';
        const defaultTermName = resolvedCurrentTerm?.name || t[0]?.name || 'Term';
        const defaultTermYear = resolvedCurrentTerm?.year || t[0]?.year || new Date().getFullYear();

        setFormClassId('ALL');
        setSelection(prev => ({
          ...prev,
          streamId: 'ALL',
          subjectId: 'ALL',
          termId: defaultTerm,
          examType: 'MID_TERM',
          examName: `Mid Term - ${defaultTermName} ${defaultTermYear}`
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
          setTeacherSubjectIds(Array.from(taught));
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

        console.log(`🔍 [DEBUG] RAW WORKFLOW DATA: Found ${queue?.length || 0} rows in database.`);

        const normalizedQueue = (queue || [])
          .filter((r: any) => {
            if (workflowMode === 'CLASS_INBOX') return true;
            if (!selection.examName) return true;
            const normalize = (s: string) => s.trim().toLowerCase().replace(/-/g, ' ');
            return normalize(r.exam_name || '') === normalize(selection.examName);
          })
          .filter((r: any) => {
            if (workflowMode === 'CLASS_INBOX') return r.class_teacher_id === user?.id;
            return r.submitted_by === user?.id;
          });

        setWorkflowRows(normalizedQueue);
        setWorkflowUnavailable(false);
      } catch (workflowErr: any) {
        console.error("❌ [DEBUG] WORKFLOW FETCH ERROR:", workflowErr);
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
      const termLabel = currentTerm.name;
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

      if (statusFilter === 'ALL') {
        if (studentTargetMode === 'UNRECORDED') {
          const row = rowsByStudent.get(s.id);
          const localDraftKey = getDraftKey(s.id, selection.subjectId);
          return !row && !draftInputs[localDraftKey];
        }
        return true;
      }

      const hasDbEntry = selection.subjectId === 'ALL'
        ? Array.from(workflowByStudentSubject.keys()).some(key => key.startsWith(`${s.id}::`) && (workflowByStudentSubject.get(key).status === statusFilter))
        : !!workflowByStudentSubject.get(getDraftKey(s.id, selection.subjectId));

      const hasLocalEntry = selection.subjectId === 'ALL'
        ? Object.keys(draftInputs).some(key => key.startsWith(`${s.id}::`))
        : !!draftInputs[getDraftKey(s.id, selection.subjectId)];

      const row = selection.subjectId === 'ALL'
        ? rowsByStudent.get(s.id)
        : workflowByStudentSubject.get(getDraftKey(s.id, selection.subjectId));

      if (statusFilter === 'UNRECORDED') {
        const hasHistory = publishedByStudentSubject.get(selection.subjectId === 'ALL' ? s.id : `${s.id}::${selection.subjectId}`);
        return !row && !hasLocalEntry && !hasHistory;
      }

      if (statusFilter === 'DRAFT') {
        const hasDbDraft = selection.subjectId === 'ALL'
          ? Array.from(workflowByStudentSubject.values()).some(r => r.student_id === s.id && r.status === 'DRAFT')
          : workflowByStudentSubject.get(getDraftKey(s.id, selection.subjectId))?.status === 'DRAFT';
        return hasDbDraft || hasLocalEntry;
      }


      return hasDbEntry;
    });
  }, [students, statusFilter, rowsByStudent, workflowByStudentSubject, search, studentTargetMode, workflowMode, draftInputs, selection.subjectId, publishedByStudentSubject]);

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
      class_teacher_id: selectedStream?.class_teacher_id || students.find(st => st.id === studentId)?.stream?.class_teacher_id || null,
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

    const updates: any[] = [];

    if (edit.fullName && edit.fullName !== (student.profile?.full_name || '')) {
      updates.push(
        supabase
          .from('profiles')
          .update({ full_name: edit.fullName })
          .eq('id', student.id)
          .then()
      );
    }

    if (edit.admNo && edit.admNo !== (student.adm_no || '')) {
      updates.push(
        supabase
          .from('students')
          .update({ adm_no: edit.admNo })
          .eq('id', student.id)
          .then()
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
          .then()
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
    if (!selection.subjectId) return [];

    const batchId = makeBatchId();
    const inferredScope = scope || (ids.length === 1 ? 'SINGLE' : 'GROUP');

    return ids
      .map((id) => {
        // Handle both simple studentId and composite key (studentId::subjectId)
        const studentId = id.includes('::') ? id.split('::')[0] : id;
        const subjectId = id.includes('::') ? id.split('::')[1] : selection.subjectId;

        const key = getDraftKey(studentId, subjectId);
        const draft = draftInputs[key];
        const marks = Number(draft?.marks);
        if (!Number.isFinite(marks)) {
          console.log(`⚠️ [DEBUG] Skipping student ${studentId} for subject ${subjectId}: Mark is ${draft?.marks} (NaN)`);
          return null;
        }
        if (marks < 0 || marks > 100) return null;

        const payloadRow = {
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
          class_teacher_id: selectedStream?.class_teacher_id || students.find(st => st.id === studentId)?.stream?.class_teacher_id || null,
          review_note: `scope:${inferredScope};count:${ids.length};batch:${batchId}`
        };
        console.log(`✅ [DEBUG] Generated payload for ${studentId}:`, payloadRow);
        return payloadRow;
      })
      .filter(Boolean);
  };

  const saveDraft = async () => {
    // Collect targets from selected students OR all pending draft items in the form
    const targets = selectedStudentIds.length
      ? selectedStudentIds
      : Object.keys(draftInputs).filter(k => k.includes('::'));

    if (!targets.length) {
      showToast("No marks found to save. Please enter marks first.", 'warning');
      return;
    }

    const payload = buildPayload('DRAFT', targets, targets.length === visibleStudents.length ? 'CLASS' : (targets.length === 1 ? 'SINGLE' : 'GROUP'));
    console.log(`🚀 [DEBUG] SENDING DRAFT PAYLOAD (Size: ${payload.length}):`, payload);
    if (!payload.length) {
      console.warn("🛑 [DEBUG] Payload is empty. Check if marks are valid (0-100).");
      return;
    }
    setSaving(true);
    try {
      const response = await api.upsertResultsWorkflow(payload);
      console.log("📥 [DEBUG] DATABASE RESPONSE:", response);
      await refreshLiveData();
      setSelectedStudentIds([]);
      showToast(`Results Saved as Draft for ${payload.length} records in ${selectedStream?.name || 'Class'}`, 'success');
      setDraftInputs({});
    } catch (err: any) {
      console.error(err);
      const msg = err.message || '';
      if (msg.includes('exam window')) {
        showToast(`Recording Locked: The window for ${examTypeLabel(selection.examType)} is currently closed. Please contact your DOS/Admin to open it.`, 'error');
      } else {
        showToast(`Result saving failed: ${msg || 'Unknown error'}, please try again.`, 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const submitForReview = async () => {
    // Collect targets from selected students OR all pending draft items in the form
    const targets = selectedStudentIds.length
      ? selectedStudentIds
      : Object.keys(draftInputs).filter(k => k.includes('::'));

    if (!targets.length) {
      showToast("No marks found to submit. Please enter marks first.", 'warning');
      return;
    }

    const payload = buildPayload('SUBMITTED', targets, targets.length === visibleStudents.length ? 'CLASS' : (targets.length === 1 ? 'SINGLE' : 'GROUP'));
    if (!payload.length) return;
    setSubmitting(true);
    try {
      await api.upsertResultsWorkflow(payload);
      await refreshLiveData();
      setSelectedStudentIds([]);
      showToast(`Results Submitted for ${payload.length} records in ${selectedStream?.name || 'Class'}`, 'success');
      setDraftInputs({});
    } catch (err: any) {
      console.error(err);
      const msg = err.message || '';
      if (msg.includes('exam window')) {
        showToast(`Recording Locked: The window for ${examTypeLabel(selection.examType)} is currently closed. Please contact your DOS/Admin to open it.`, 'error');
      } else {
        showToast(`Result submission failed: ${msg || 'Unknown error'}, please try again.`, 'error');
      }
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
    } catch (err: any) {
      console.error(err);
      showToast('Failed to update review. Please check your connection.', 'error');
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

  const saveOne = async (studentId: string, subjectId: string) => {
    await saveRowResult(studentId, subjectId, 'DRAFT');
  };

  const getActiveExamLabel = () => {
    if (!selection.examName) return 'Academic Results';
    return selection.examName;
  };

  console.log('[ACCESS CHECK] Role:', user?.role, 'Restricted:', user?.role !== 'TEACHER');

  if (user && user.role !== 'TEACHER') {
    return (
      <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-xl flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white border border-zinc-100 shadow-2xl rounded-[2.5rem] p-10 space-y-8 animate-in zoom-in-95 duration-300">
           <div className="w-16 h-16 rounded-3xl bg-zinc-950 flex items-center justify-center text-white mx-auto shadow-xl">
              <ShieldAlert size={32} />
           </div>
           
           <div className="text-center space-y-3">
              <h2 className="text-xl font-black text-zinc-950 tracking-tight">Access Restricted</h2>
              <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                Sorry, you can't access this page unless you are a teacher. Please ensure your logged in and your role is set to teacher.
              </p>
           </div>

           <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => window.history.back()}
                className="px-6 py-4 rounded-2xl bg-zinc-50 text-zinc-600 text-xs font-bold uppercase tracking-widest hover:bg-zinc-100 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => window.location.href = '/principal-oversight'}
                className="px-6 py-4 rounded-2xl bg-zinc-950 text-white text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-200"
              >
                I am a Principal
              </button>
           </div>
        </div>
      </div>
    );
  }

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

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.school_id || !selection.termId) {
      alert('Please ensure you are logged in and a Term is selected.');
      return;
    }

    setImporting(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const dataBuffer = evt.target?.result;
        if (!dataBuffer) return;

        const wb = XLSX.read(dataBuffer, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        if (!data.length) {
          throw new Error('The selected file appears to be empty.');
        }

        const normalize = (s: any) => (s || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '').trim();
        const firstRow = data[0] || {};
        const headers = Object.keys(firstRow);

        // --- PREPARE INITIAL MAPPINGS ---
        let isLongFormat = false;
        const initialMappings: Record<string, string> = {};

        // Detect "Long Format" (Subject/Marks in single columns)
        const SUBJECT_HEADER_VARIANTS = ['SUBJECT', 'UNIT', 'COURSE', 'SUBJECTNAME'].map(v => normalize(v));
        const MARKS_HEADER_VARIANTS = ['MARKS', 'MARK', 'SCORE', 'RESULT', 'TOTAL'].map(v => normalize(v));

        const subjectColHead = headers.find(h => SUBJECT_HEADER_VARIANTS.includes(normalize(h)));
        const marksColHead = headers.find(h => MARKS_HEADER_VARIANTS.includes(normalize(h)));

        if (subjectColHead && marksColHead) {
          isLongFormat = true;
          console.log('📑 [IMPORT DEBUG] Long Format detected (one subject per row)');
        }

        headers.forEach(h => {
          const normH = normalize(h);

          // ADM column
          const ADM_VARIANTS = ['ADMNO', 'ADM', 'ADMISSIONNO', 'REGNO', 'REGISTRATIONNUMBER', 'STUDENTID', 'ADMISSION', 'STUDENTADM', 'ADMNUMBER'].map(v => normalize(v));
          if (ADM_VARIANTS.includes(normH)) {
            initialMappings[h] = 'ADM_NO';
            return;
          }

          // Remarks
          const REMARKS_VARIANTS = ['REMARKS', 'REMARK', 'COMMENT', 'TEACHERREMARK', 'FEEDBACK', 'TEACHERSREMARKS'].map(v => normalize(v));
          if (REMARKS_VARIANTS.includes(normH)) {
            initialMappings[h] = 'REMARKS';
            return;
          }

          if (isLongFormat) {
            if (h === subjectColHead) initialMappings[h] = 'SUBJECT_VALUE';
            else if (h === marksColHead) initialMappings[h] = 'MARK_VALUE';
          } else {
            // Try to find Subject match for "Wide Format"
            const matchedSub = subjects.find(s => {
              const normSName = normalize(s.name);
              const normSCode = s.code ? normalize(s.code) : '';
              return normSName === normH || normSCode === normH || (normH.length >= 3 && normSName.startsWith(normH)) || (normSName.length >= 3 && normH.startsWith(normSName));
            });
            if (matchedSub) initialMappings[h] = matchedSub.id;
          }
        });

        setImportData(data);
        setExcelHeaders(headers);
        setPendingMappings(initialMappings);
        setShowMappingDialog(true);

      } catch (err: any) {
        console.error('🔥 [IMPORT FATAL ERROR]', err);
        alert(`❌ Import Failed: ${err.message}`);
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const processImport = () => {
    if (!importData.length) return;

    setImporting(true);
    const normalize = (s: any) => (s || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '').trim();

    const admKey = Object.keys(pendingMappings).find(k => pendingMappings[k] === 'ADM_NO');
    const remarkKey = Object.keys(pendingMappings).find(k => pendingMappings[k] === 'REMARKS');

    const subjectValueKey = Object.keys(pendingMappings).find(k => pendingMappings[k] === 'SUBJECT_VALUE');
    const markValueKey = Object.keys(pendingMappings).find(k => pendingMappings[k] === 'MARK_VALUE');
    const isLongFormat = !!(subjectValueKey && markValueKey);

    const subjectMappings = Object.keys(pendingMappings)
      .filter(k => !['ADM_NO', 'REMARKS', 'SUBJECT_VALUE', 'MARK_VALUE', 'NONE'].includes(pendingMappings[k]))
      .map(k => ({ header: k, subjectId: pendingMappings[k] }));

    if (!admKey) {
      alert('Please select which column contains the Admission Numbers.');
      setImporting(false);
      return;
    }

    const newDrafts: Record<string, EntryDraft> = {};
    let matchedStudents = 0;
    let totalMarksImported = 0;

    importData.forEach((row, rowIndex) => {
      const rawAdm = row[admKey]?.toString() || '';
      const admValue = normalize(rawAdm);

      const student = students.find(s => {
        const dbAdm = normalize(s.adm_no || '');
        const dbAdmRaw = (s.adm_no || '').toString().trim();
        const excelAdmRaw = rawAdm.trim();
        return dbAdm === admValue || dbAdmRaw === excelAdmRaw || (dbAdmRaw.length > 3 && excelAdmRaw.endsWith(dbAdmRaw));
      });

      if (!student) {
        console.warn(`⚠️ [IMPORT DEBUG] Row ${rowIndex + 1}: No student found for ADM "${rawAdm}"`);
        return;
      }

      console.log(`✅ [IMPORT DEBUG] Row ${rowIndex + 1}: Found student ${student.profiles?.full_name} (${student.adm_no})`);
      matchedStudents++;

      if (isLongFormat) {
        const subNameRaw = row[subjectValueKey];
        const normSubName = normalize(subNameRaw);
        const mark = Number(row[markValueKey]);

        const matchedSub = subjects.find(s =>
          normalize(s.name) === normSubName ||
          (s.code && normalize(s.code) === normSubName) ||
          (normSubName.length >= 3 && normalize(s.name).startsWith(normSubName))
        );

        if (!matchedSub) {
          console.warn(`❓ [IMPORT DEBUG] Row ${rowIndex + 1}: Could not match subject name "${subNameRaw}" to system subjects.`);
        } else if (!Number.isFinite(mark)) {
          console.warn(`❌ [IMPORT DEBUG] Row ${rowIndex + 1}: Invalid mark "${row[markValueKey]}" for student ${student.adm_no}`);
        } else {
          const key = getDraftKey(student.id, matchedSub.id);
          newDrafts[key] = {
            marks: mark.toString(),
            remarks: remarkKey ? (row[remarkKey] || '').toString() : ''
          };
          totalMarksImported++;
          // Auto-select this subject for the row view
          if (!rowSubjectByStudent[student.id]) {
            setRowSubjectByStudent(prev => ({ ...prev, [student.id]: matchedSub.id }));
          }
        }
      } else {
        subjectMappings.forEach(m => {
          const rawVal = row[m.header];
          const mark = Number(rawVal);
          if (rawVal !== undefined && rawVal !== '' && Number.isFinite(mark)) {
            const key = getDraftKey(student.id, m.subjectId);
            newDrafts[key] = {
              marks: mark.toString(),
              remarks: remarkKey ? (row[remarkKey] || '').toString() : ''
            };
            totalMarksImported++;
            if (!rowSubjectByStudent[student.id]) {
              setRowSubjectByStudent(prev => ({ ...prev, [student.id]: m.subjectId }));
            }
          }
        });
      }
    });

    console.log(`📊 [IMPORT SUMMARY] Processed ${importData.length} rows. Matched ${matchedStudents} students. Total Marks: ${totalMarksImported}`);

    if (totalMarksImported > 0) {
      setDraftInputs(prev => ({ ...prev, ...newDrafts }));
      setShowRecordForm(true);
      setWorkflowMode('MY_ENTRIES');
      if (search) setSearch('');
      alert(`🎯 SUCCESS: Imported ${totalMarksImported} marks for ${matchedStudents} students.`);
      setShowMappingDialog(false);
    } else {
      alert(`❌ No marks were imported. Open Console (F12) to see why rows were skipped.`);
    }
    setImporting(false);
  };


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
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Results & Student Management</h1>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-medium tracking-wide">
              {selectedStream?.class_teacher_id === user?.id
                ? `Class Teacher Dashboard: ${selectedStream?.class?.name || ''} ${selectedStream?.name || ''}`
                : `Teacher Page: ${selectedStream?.name || 'Class Console'}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".xlsx, .xls, .csv"
            onChange={handleImport}
          />

          <Button
            variant="outline"
            onClick={() => setFormClassId('ALL')}
            className="text-xs border-zinc-200"
          >
            Switch Class
          </Button>

          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            loading={importing}
            className="text-xs border-zinc-200"
          >
            <Upload size={14} className="mr-2 opacity-60" /> Import Excel
          </Button>

          <Button
            variant={statusFilter === 'DRAFT' ? 'primary' : 'outline'}
            onClick={() => {
              setWorkflowMode('MY_ENTRIES');
              setStatusFilter('DRAFT');
            }}
            className="text-xs"
          >
            My Drafts
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              setWorkflowMode('MY_ENTRIES');
              setIsExpanded(false);
              setShowRecordForm((prev) => !prev);
            }}
            className="text-xs border-zinc-200"
          >
            {showRecordForm ? 'Hide Form' : 'Record Results'}
          </Button>

          <div className="h-6 w-px bg-zinc-200 mx-2 hidden md:block" />

          <Button
            variant="outline"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 border-zinc-200"
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </Button>

          {isClassTeacher && (
            <Button
              variant={workflowMode === 'CLASS_INBOX' ? 'primary' : 'outline'}
              onClick={() => {
                setWorkflowMode('CLASS_INBOX');
                setStatusFilter('ALL');
                // Auto-select the teacher's own stream if available
                const myStream = streams.find(s => s.class_teacher_id === user?.id);
                if (myStream) {
                   setFormClassId(myStream.class_id);
                   setSelection(prev => ({ ...prev, streamId: myStream.id }));
                }
              }}
              className="text-xs"
            >
              Class Inbox
            </Button>
          )}
        </div>
      </div>


      {workflowUnavailable && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          Workflow features require database migration 20260410_results_workflow.sql
        </div>
      )}

      {/* Minimalist Filter Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 py-2 border-b border-zinc-100">
        <div className="flex flex-wrap items-center gap-6">
          {/* Class Selector */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Form</span>
            <select
              value={formClassId}
              onChange={(e) => { setFormClassId(e.target.value); setSelection(prev => ({ ...prev, streamId: 'ALL' })); }}
              className="bg-transparent text-sm font-medium text-zinc-900 outline-none pr-4 cursor-pointer"
            >
              <option value="ALL">All Classes</option>
              {formOptions.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Stream</span>
            <select
              value={selection.streamId}
              onChange={(e) => setSelection(prev => ({ ...prev, streamId: e.target.value }))}
              className="bg-transparent text-sm font-medium text-zinc-900 outline-none pr-4 cursor-pointer"
            >
              <option value="ALL">All Streams</option>
              {streamsForSelectedForm.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.name}</option>
              ))}
            </select>
          </div>

          {/* Minimalist Status Tabs */}
          <div className="flex items-center gap-4 border-l border-zinc-100 pl-6">
            {['ALL', 'DRAFT', 'SUBMITTED', 'PUBLISHED'].map((st) => {
              const count = st === 'SUBMITTED' ? queueCounts.submitted : st === 'PUBLISHED' ? queueCounts.published : null;
              const isActive = statusFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st as any)}
                  className={`relative py-1 text-[11px] font-semibold uppercase tracking-wider transition-all duration-200 ${isActive ? 'text-zinc-900' : 'text-zinc-400 hover:text-zinc-600'}`}
                >
                  <span className="flex items-center gap-1.5">
                    {st}
                    {count !== null && count > 0 && (
                      <span className="text-[9px] opacity-60">({count})</span>
                    )}
                  </span>
                  {isActive && <div className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-zinc-900 rounded-full" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="relative group w-full lg:max-w-xs">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-300" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search students..."
            className="w-full h-10 pl-6 bg-transparent border-0 text-sm font-medium text-zinc-700 placeholder:text-zinc-300 outline-none transition-all"
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {showRecordForm && workflowMode === 'MY_ENTRIES' && !isExpanded && (
          <div className="xl:col-span-4 bg-white border border-zinc-100 rounded-2xl p-5 space-y-4 shadow-sm animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">Reporting Sidebar</p>
              <Pencil size={14} className="text-zinc-300" />
            </div>

            <div className="space-y-3">
              <SelectField
                label="Subject"
                value={selection.subjectId}
                onChange={(v: string) => setSelection((prev) => ({ ...prev, subjectId: v }))}
                options={recordingSubjectOptions}
              />
              <div className="grid grid-cols-2 gap-2">
                <SelectField
                  label="Term"
                  value={selection.termId}
                  onChange={(v: string) => setSelection((prev) => ({ ...prev, termId: v }))}
                  options={termOptions.map((t) => ({ id: t.id, name: t.name }))}
                />
                <SelectField
                  label="Exam Type"
                  value={selection.examType}
                  onChange={(v: string) => setSelection((prev) => ({ ...prev, examType: v }))}
                  options={EXAM_TYPES.map((t) => ({ id: t, name: examTypeLabel(t) }))}
                />
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Exam Name</span>
                <input
                  value={selection.examName}
                  onChange={(e) => setSelection((prev) => ({ ...prev, examName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-100 bg-zinc-50/30 text-xs font-medium outline-none"
                />
              </label>

              <div className="rounded-xl border border-zinc-100 p-4 space-y-3 bg-zinc-50/20">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Selection Mode</p>
                <div className="grid grid-cols-1 gap-2">
                  <button onClick={() => setStudentTargetMode('ALL')} className={`w-full rounded-lg px-3 py-2 text-left text-xs font-bold transition-all ${studentTargetMode === 'ALL' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 border border-zinc-100'}`}>All Students</button>
                  <button onClick={() => setStudentTargetMode('UNRECORDED')} className={`w-full rounded-lg px-3 py-2 text-left text-xs font-bold transition-all ${studentTargetMode === 'UNRECORDED' ? 'bg-zinc-900 text-white' : 'bg-white text-zinc-600 border border-zinc-100'}`}>Unrecorded Only</button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button className="flex-1 shadow-sm" onClick={saveDraft} disabled={saving || loading}>Save Draft</Button>
              <Button variant="outline" className="flex-1" onClick={submitForReview} disabled={submitting || loading}>Submit</Button>
            </div>
          </div>
        )}

        <div className={`${(showRecordForm && workflowMode === 'MY_ENTRIES' && !isExpanded) ? 'xl:col-span-8' : 'xl:col-span-12'} bg-white border border-zinc-100 rounded-2xl p-0 overflow-hidden shadow-sm`}>
          <div className="px-6 py-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/20">
            <h2 className="text-sm font-semibold text-zinc-900 tracking-tight">
              Results for {selectedStream?.class?.name || ''} {selectedStream?.name || ''},
              For {activeTermLabel} - {examTypeLabel(selection.examType)}
            </h2>
          </div>

          <div className="overflow-x-auto">
            {formClassId === 'ALL' ? (
              <div className="flex flex-col items-center justify-center py-20 bg-zinc-50/10">
                <div className="p-4 rounded-full bg-zinc-100 mb-4">
                  <ChevronRight size={24} className="text-zinc-400 rotate-90" />
                </div>
                <h3 className="text-sm font-semibold text-zinc-900">Choose a Class to View Results</h3>
                <p className="text-xs text-zinc-500 mt-1">Select a form and stream above to start reviewing records.</p>
              </div>
            ) : workflowMode === 'CLASS_INBOX' ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="px-5 py-3 text-[10px] uppercase text-zinc-400 font-semibold">Student</th>
                    <th className="px-5 py-3 text-[10px] uppercase text-zinc-400 font-semibold">Subject</th>
                    <th className="px-5 py-3 text-[10px] uppercase text-zinc-400 font-semibold text-center">Marks</th>
                    <th className="px-5 py-3 text-[10px] uppercase text-zinc-400 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inboxRows.map((r: any) => (
                    <tr key={r.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                      <td className="px-5 py-3 text-xs font-semibold">{r.student?.profile?.full_name}</td>
                      <td className="px-5 py-3 text-xs text-zinc-500 uppercase">{r.subject?.name}</td>
                      <td className="px-5 py-3 text-xs text-center font-semibold">{r.marks}</td>
                      <td className="px-5 py-3">
                        <div className="flex gap-1">
                          <button onClick={() => reviewOne(r.id, 'APPROVED')} className="text-[10px] font-semibold text-emerald-600 hover:underline">Approve</button>
                          <button onClick={() => reviewOne(r.id, 'NEEDS_REVISION')} className="text-[10px] font-semibold text-rose-600 hover:underline">Deny</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left border-separate border-spacing-0">
                <thead>
                  <tr className="bg-zinc-50/50">
                    <th className="sticky left-0 z-20 bg-zinc-50 px-6 py-4 text-[10px] uppercase text-zinc-500 font-semibold tracking-wider border-b border-zinc-100 min-w-[220px]">Student & ADM</th>
                    {selection.subjectId === 'ALL' ? (
                      [...subjects].sort((a, b) => {
                        if (a.code === 'MAT' || a.name.toUpperCase().startsWith('MAT')) return -1;
                        if (b.code === 'MAT' || b.name.toUpperCase().startsWith('MAT')) return 1;
                        return a.name.localeCompare(b.name);
                      }).map(sub => (
                        <th key={sub.id} className="px-4 py-4 text-[10px] uppercase text-zinc-400 font-semibold text-center border-b border-zinc-100 min-w-[120px]">
                          {sub.code || sub.name.substring(0, 3).toUpperCase()}
                        </th>
                      ))
                    ) : (
                      <>
                        <th className="px-6 py-4 text-[10px] uppercase text-zinc-500 font-semibold tracking-wider text-center border-b border-zinc-100">Prv Mark</th>
                        <th className="px-6 py-4 text-[10px] uppercase text-zinc-500 font-semibold tracking-wider text-center border-b border-zinc-100">New Mark</th>
                        <th className="px-6 py-4 text-[10px] uppercase text-zinc-500 font-semibold tracking-wider border-b border-zinc-100">Remarks</th>
                      </>
                    )}
                    <th className="sticky right-0 z-20 bg-zinc-50 px-6 py-4 text-[10px] uppercase text-zinc-500 font-semibold tracking-wider text-right border-b border-zinc-100 shadow-[-4px_0_8px_rgba(0,0,0,0.02)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {visibleStudents.map((s: any) => {
                    return (
                      <tr key={s.id} className="group hover:bg-zinc-50/50 transition-colors">
                        <td className="sticky left-0 z-10 bg-white group-hover:bg-zinc-50/50 px-6 py-4 border-r border-zinc-100/50">
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-zinc-900 leading-tight">{s.profile?.full_name}</span>
                            <span className="text-[10px] text-zinc-400 font-medium mt-0.5">{s.adm_no}</span>
                          </div>
                        </td>

                        {selection.subjectId === 'ALL' ? (
                          [...subjects].sort((a, b) => {
                            if (a.code === 'MAT' || a.name.toUpperCase().startsWith('MAT')) return -1;
                            if (b.code === 'MAT' || b.name.toUpperCase().startsWith('MAT')) return 1;
                            return a.name.localeCompare(b.name);
                          }).map(sub => {
                            const key = getDraftKey(s.id, sub.id);
                            const result = publishedByStudentSubject.get(key);
                            const workflow = workflowByStudentSubject.get(key);
                            const draft = draftInputs[key];

                            const mark = draft?.marks || workflow?.marks?.toString() || (result?.marks !== undefined ? result.marks.toString() : '');
                            const grade = mark ? toGrade(Number(mark)) : (result?.grade || '');
                            const remark = draft?.remarks || workflow?.remarks || result?.remarks;

                            return (
                              <td key={sub.id} className="px-4 py-4 text-center border-l border-zinc-100/30">
                                <div className="flex flex-col items-center gap-1">
                                  {showRecordForm ? (
                                    <div className="flex items-center justify-center gap-1">
                                      <input
                                        value={mark}
                                        onChange={(e) => setDraftValueForSubject(s.id, sub.id, { marks: e.target.value })}
                                        className="w-12 px-1 py-1 rounded border border-zinc-200 text-[10px] font-semibold text-center outline-none focus:border-zinc-900 transition-all"
                                        type="number"
                                      />
                                      {grade && <span className="text-[9px] font-semibold text-zinc-400 w-4">{grade}</span>}
                                    </div>
                                  ) : mark !== undefined ? (
                                    <>
                                      <div className={`px-2 py-0.5 rounded-md flex flex-col items-center ${grade === 'A' || grade === 'B' ? 'bg-emerald-50/40 text-emerald-700' :
                                          grade === 'C' ? 'bg-lime-50/30 text-lime-700' :
                                            'bg-zinc-50 text-zinc-500'
                                        }`}>
                                        <span className="text-xs font-semibold leading-none">{mark} {grade}</span>
                                      </div>
                                      {remark && <span className="text-[9px] text-zinc-400 italic line-clamp-1 max-w-[100px]">{remark}</span>}
                                    </>
                                  ) : (
                                    <span className="text-zinc-200 text-xs">–</span>
                                  )}
                                </div>
                              </td>
                            );
                          })
                        ) : (() => {
                          const key = getDraftKey(s.id, selection.subjectId);
                          const workflow = workflowByStudentSubject.get(key);
                          const draft = draftInputs[key] || { marks: workflow?.marks?.toString() || '', remarks: workflow?.remarks || '' };
                          const prev = publishedByStudentSubject.get(`${s.id}::${selection.subjectId}`);
                          const markNum = Number(draft.marks);
                          const grade = Number.isFinite(markNum) ? toGrade(markNum) : '-';

                          return (
                            <>
                              <td className="px-6 py-4 text-xs font-semibold text-zinc-400 text-center">{prev?.marks ?? '-'}</td>
                              <td className="px-6 py-4 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <input
                                    value={draft.marks}
                                    onChange={(e) => setDraftValueForSubject(s.id, selection.subjectId, { marks: e.target.value })}
                                    className="w-14 px-2 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold text-center outline-none focus:ring-4 focus:ring-zinc-900/5 transition-all"
                                    type="number"
                                  />
                                  <span className={`text-[10px] font-semibold w-6 h-6 flex items-center justify-center rounded-md ${grade === 'A' || grade === 'B' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-50 text-zinc-400'
                                    }`}>{grade}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <input
                                  value={draft.remarks}
                                  onChange={(e) => setDraftValueForSubject(s.id, selection.subjectId, { remarks: e.target.value })}
                                  placeholder="Observation..."
                                  className="w-full min-w-[120px] px-3 py-1.5 rounded-lg border border-zinc-100 bg-zinc-50/30 text-xs outline-none focus:bg-white transition-all"
                                />
                              </td>
                            </>
                          );
                        })()}

                        <td className="sticky right-0 z-10 bg-white group-hover:bg-zinc-50/50 px-6 py-4 shadow-[-4px_0_8px_rgba(0,0,0,0.02)] border-l border-zinc-100/50 text-right">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => setFullViewStudent(s)} className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-900 transition-all hover:scale-110">
                              <Eye size={16} />
                            </button>
                            <button onClick={() => { setShowRecordForm(true); setWorkflowMode('MY_ENTRIES'); }} className="p-2 hover:bg-zinc-100 rounded-xl text-zinc-400 hover:text-blue-600 transition-all hover:scale-110">
                              <Pencil size={16} />
                            </button>
                            {selection.subjectId !== 'ALL' && (
                              <button onClick={() => saveOne(s.id, selection.subjectId)} className="p-2 hover:bg-emerald-50 rounded-xl text-emerald-600 transition-all hover:scale-110">
                                <Save size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {showMappingDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
              <h3 className="text-xl font-bold tracking-tight">Manual Header Mapping</h3>
              <button onClick={() => setShowMappingDialog(false)}><X size={20} className="text-zinc-400" /></button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-3">
              {excelHeaders.map((header) => (
                <div key={header} className="grid grid-cols-2 gap-4 items-center p-3 rounded-xl border border-zinc-100 bg-zinc-50/20">
                  <span className="text-xs font-bold text-zinc-600 truncate">{header}</span>
                  <select className="w-full px-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs" value={pendingMappings[header] || 'NONE'} onChange={(e) => setPendingMappings(p => ({ ...p, [header]: e.target.value }))}>
                    <option value="NONE">Ignore</option>
                    <option value="ADM_NO">Admission No</option>
                    <option value="REMARKS">Global Remarks</option>
                    <option value="SUBJECT_VALUE">Vertical Subject</option>
                    <option value="MARK_VALUE">Vertical Marks</option>
                    {subjects.map(sub => <option key={sub.id} value={sub.id}>Wide: {sub.name}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-zinc-100 flex justify-end gap-3 bg-zinc-50/30">
              <Button variant="ghost" onClick={() => setShowMappingDialog(false)}>Cancel</Button>
              <Button onClick={processImport} loading={importing}>Import Results</Button>
            </div>
          </div>
        </div>
      )}

      <Modal
        isOpen={!!selectedViewStudent}
        onClose={() => {
          setViewStudentId('');
          setViewStudentResults([]);
          setViewStudentSubjects([]);
        }}
        title="Student Profile Report"
      >
        {selectedViewStudent && (
          <div className="space-y-4 text-sm py-2">
            <div>
              <p className="text-xs text-zinc-500 uppercase font-black">Student</p>
              <p className="font-bold text-lg">{selectedViewStudent.profile?.full_name || '-'}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-zinc-500 uppercase font-black">ADM No</p>
                <p className="font-bold">{selectedViewStudent.adm_no || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase font-black">Average Mark</p>
                <p className="font-bold">{averageByStudent.get(selectedViewStudent.id)?.average_mark ?? '-'}</p>
              </div>
            </div>
            <div className="border border-zinc-100 rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-zinc-50 z-10">
                  <tr className="border-b border-zinc-100">
                    <th className="px-3 py-2 text-[10px] uppercase text-zinc-400 font-black">Subject</th>
                    <th className="px-3 py-2 text-[10px] uppercase text-zinc-400 font-black text-center">Marks</th>
                    <th className="px-3 py-2 text-[10px] uppercase text-zinc-400 font-black text-center">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {viewStudentResults.map((row: any) => (
                    <tr key={row.id} className="border-b border-zinc-50">
                      <td className="px-3 py-2 text-xs font-bold">{row.subject?.name || '-'}</td>
                      <td className="px-3 py-2 text-xs text-center font-black">{row.marks ?? '-'}</td>
                      <td className="px-3 py-2 text-xs text-center"><Badge variant="neutral">{row.grade || '-'}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>
    </div >
  );
};

const SelectField = ({ label, value, options, onChange }: any) => (
  <div className="flex flex-col gap-1 min-w-[140px]">
    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{label}</span>
    <select
      className="px-3 py-2 bg-white border border-zinc-200 rounded-lg text-xs font-bold text-zinc-700 outline-none hover:border-zinc-300 transition-all cursor-pointer"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((opt: any) => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
    </select>
  </div>
);
