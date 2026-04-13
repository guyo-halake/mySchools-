import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  Video,
  FileText,
  Upload,
  Clock3,
  CircleDot,
  Hand,
  Star,
  Sparkles,
  Activity,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Button, Card, Badge } from '../components/UI';

type TabKey = 'LIVE' | 'RECORDINGS' | 'NOTES' | 'ASSIGNMENTS';
type SessionStatus = 'LIVE' | 'UPCOMING' | 'COMPLETED';
type AttendanceStatus = 'PRESENT' | 'LATE' | 'DISCONNECTED';

type SessionItem = {
  id: string;
  day: string;
  start: string;
  end: string;
  subject: string;
  teacher: string;
  classLabel: string;
  streamId?: string;
  subjectId?: string;
  db?: any;
};

type Participant = {
  id: string;
  name: string;
  status: AttendanceStatus;
  handRaised: boolean;
  joinedAt: string;
};

type ActivityItem = {
  id: string;
  sessionId: string;
  type: string;
  message: string;
  createdAt: string;
};

type QuestionItem = {
  id: string;
  type: 'MCQ' | 'SHORT' | 'STRUCTURED';
  concept: string;
  prompt: string;
  options?: string[];
  answerKey?: string;
  assignmentId: string;
};

type SubmissionItem = {
  id: string;
  questionId: string;
  studentId: string;
  studentName: string;
  response: string;
  autoScore?: number;
  rubricScore?: number;
  maxScore: number;
  feedback?: string;
  submittedAt: string;
};

type OrchestrationState = {
  isActive: boolean;
  sessionId: string;
  roomUrl: string;
  startedAt: string;
  closesAt: string;
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const SLOT_PAIRS = [
  ['08:00', '08:40'],
  ['10:00', '10:40'],
  ['12:00', '12:40'],
  ['14:00', '14:40'],
  ['15:20', '16:00']
] as const;

const REMEDIAL_LIBRARY: Record<string, { note: string; video: string }> = {
  Algebra: {
    note: 'Algebra Foundations - simplifying expressions and balancing equations',
    video: 'https://www.youtube.com/watch?v=NybHckSEQBI'
  },
  Grammar: {
    note: 'Grammar Repair Pack - tenses, sentence structure and punctuation',
    video: 'https://www.youtube.com/watch?v=8M2r9P6JfJQ'
  },
  Mechanics: {
    note: 'Mechanics Remedial - motion, force and momentum quick guide',
    video: 'https://www.youtube.com/watch?v=HEfHFsfGXjs'
  },
  General: {
    note: 'Study Skills Booster - revision cycle and active recall',
    video: 'https://www.youtube.com/watch?v=ukLnPbIffxE'
  }
};

const seedStudents = [
  { id: 'st-1', name: 'Razanyo Noor' },
  { id: 'st-2', name: 'Linet Achieng' },
  { id: 'st-3', name: 'Samuel Maina' },
  { id: 'st-4', name: 'Imran Yusuf' },
  { id: 'st-5', name: 'Joy Wambui' }
];

const parseClock = (base: Date, hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
};

const startOfWeekMonday = (now: Date) => {
  const d = new Date(now);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const randomFrom = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const CLASSROOM_STORAGE_BUCKET = 'classroom-files';

const sanitizeFileName = (name: string) => {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
};

export const MyClassroom: React.FC = () => {
  const { user } = useAuth();

  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [schemaReady, setSchemaReady] = useState(true);

  const [streams, setStreams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [assignmentRows, setAssignmentRows] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<TabKey>('LIVE');
  const [selectedSessionId, setSelectedSessionId] = useState('');

  const [recordings, setRecordings] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentFiles, setAssignmentFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);

  const [questionType, setQuestionType] = useState<'MCQ' | 'SHORT' | 'STRUCTURED'>('MCQ');
  const [questionConcept, setQuestionConcept] = useState('General');
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [mcqOptions, setMcqOptions] = useState('A|B|C|D');
  const [mcqAnswerKey, setMcqAnswerKey] = useState('A');

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [attendance, setAttendance] = useState<Participant[]>([]);
  const [spotlightStudentId, setSpotlightStudentId] = useState<string | null>(null);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [orchestration, setOrchestration] = useState<OrchestrationState | null>(null);

  const classroomChannelRef = useRef<any>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!user?.school_id) return;
      setLoading(true);

      try {
        const [schoolStreams, schoolSubjects] = await Promise.all([
          api.getStreams(user.school_id),
          api.getSubjects(user.school_id)
        ]);

        setStreams(schoolStreams || []);
        setSubjects(schoolSubjects || []);

        if (user.role === 'TEACHER') {
          const { data } = await supabase
            .from('teacher_subject_stream_assignments')
            .select('stream_id, class_id, subject_id')
            .eq('school_id', user.school_id)
            .eq('teacher_id', user.id)
            .eq('active', true);
          setAssignmentRows(data || []);
        }
      } catch (error) {
        console.error('Failed to initialize classroom page', error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [user]);

  const teacherStreams = useMemo(() => {
    if (!user) return [];
    const streamIds = new Set((assignmentRows || []).map((row: any) => row.stream_id).filter(Boolean));

    if (streamIds.size > 0) {
      const scoped = streams.filter((s: any) => streamIds.has(s.id));
      if (scoped.length > 0) return scoped;
    }

    return streams.filter((s: any) => s.class_teacher_id === user.id);
  }, [assignmentRows, streams, user]);

  const teacherSubjects = useMemo(() => {
    const subjectIds = new Set((assignmentRows || []).map((row: any) => row.subject_id).filter(Boolean));
    if (subjectIds.size === 0) return subjects.slice(0, 6);
    return subjects.filter((sub: any) => subjectIds.has(sub.id));
  }, [assignmentRows, subjects]);

  const sessions = useMemo(() => {
    const list: SessionItem[] = [];

    let index = 0;
    for (const stream of teacherStreams) {
      for (const subject of teacherSubjects) {
        const day = DAYS[index % DAYS.length];
        const [start, end] = SLOT_PAIRS[Math.floor(index / DAYS.length) % SLOT_PAIRS.length];

        list.push({
          id: `${stream.id}-${subject.id}-${index}`,
          day,
          start,
          end,
          subject: subject.name,
          teacher: user?.full_name || 'Teacher',
          classLabel: `${stream.class?.name || 'Form'} ${stream.name || ''}`.trim(),
          streamId: stream.id,
          subjectId: subject.id
        });

        index += 1;
        if (index >= 12) return list;
      }
    }

    if (list.length === 0) {
      list.push({
        id: 'fallback-1',
        day: DAYS[now.getDay() === 0 ? 0 : now.getDay() - 1] || 'Monday',
        start: '08:00',
        end: '08:40',
        subject: 'General Classroom',
        teacher: user?.full_name || 'Teacher',
        classLabel: 'No assigned stream yet'
      });
    }

    return list;
  }, [now, teacherStreams, teacherSubjects, user]);

  const syncSessionsToDb = async (source: SessionItem[]) => {
    if (!user?.school_id || !source.length) return;

    const rows = source.map((s) => ({
      id: s.id,
      school_id: user.school_id,
      teacher_id: user.id,
      stream_id: s.streamId || null,
      subject_id: s.subjectId || null,
      title: s.subject,
      class_label: s.classLabel,
      day_name: s.day,
      start_time: s.start,
      end_time: s.end,
      status: 'SCHEDULED'
    }));

    const { error } = await supabase
      .from('classroom_sessions')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      const message = String(error.message || '').toLowerCase();
      if (message.includes('classroom_sessions')) {
        setSchemaReady(false);
        return;
      }
      throw error;
    }

    setSchemaReady(true);
  };

  useEffect(() => {
    syncSessionsToDb(sessions).catch((err) => console.error('Failed to sync sessions', err));
  }, [sessions]);

  const getSessionMoment = (session: SessionItem) => {
    const monday = startOfWeekMonday(now);
    const dayOffset = Math.max(0, DAYS.indexOf(session.day));
    const sessionDate = new Date(monday);
    sessionDate.setDate(monday.getDate() + dayOffset);
    const start = parseClock(sessionDate, session.start);
    const end = parseClock(sessionDate, session.end);
    return { start, end };
  };

  const sessionStatus = (session: SessionItem): SessionStatus => {
    const { start, end } = getSessionMoment(session);
    if (now >= start && now <= end) return 'LIVE';
    if (now < start) return 'UPCOMING';
    return 'COMPLETED';
  };

  const orderedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => getSessionMoment(a).start.getTime() - getSessionMoment(b).start.getTime());
  }, [sessions]);

  const currentClass = orderedSessions.find((session) => sessionStatus(session) === 'LIVE') || null;
  const nextClass = orderedSessions.find((session) => sessionStatus(session) === 'UPCOMING') || null;

  useEffect(() => {
    if (!selectedSessionId && orderedSessions.length) {
      setSelectedSessionId((currentClass || nextClass || orderedSessions[0]).id);
    }
  }, [selectedSessionId, orderedSessions, currentClass, nextClass]);

  const selectedSession = orderedSessions.find((item) => item.id === selectedSessionId) || null;

  const loadSessionData = async (sessionId: string) => {
    if (!user?.school_id) return;

    const [
      attendanceRes,
      spotlightRes,
      notesRes,
      recordingsRes,
      assignmentsRes,
      assignmentFilesRes,
      activityRes
    ] = await Promise.all([
      supabase.from('classroom_attendance').select('*').eq('session_id', sessionId).order('student_name', { ascending: true }),
      supabase.from('classroom_spotlight').select('*').eq('session_id', sessionId).maybeSingle(),
      supabase.from('classroom_notes').select('*').eq('session_id', sessionId).order('updated_at', { ascending: false }),
      supabase.from('classroom_recordings').select('*').eq('session_id', sessionId).order('recorded_at', { ascending: false }),
      supabase.from('classroom_assignments').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }),
      supabase.from('classroom_assignment_files').select('*').eq('session_id', sessionId).order('uploaded_at', { ascending: false }),
      supabase.from('classroom_activity_feed').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(50)
    ]);

    if (attendanceRes.error || notesRes.error || recordingsRes.error || assignmentsRes.error || assignmentFilesRes.error || activityRes.error) {
      console.error('Failed to load one or more classroom entities', attendanceRes.error || notesRes.error || recordingsRes.error || assignmentsRes.error || assignmentFilesRes.error || activityRes.error);
      return;
    }

    const attendanceRows = attendanceRes.data || [];
    if (attendanceRows.length === 0) {
      const seedRows = seedStudents.map((student, idx) => ({
        school_id: user.school_id,
        session_id: sessionId,
        student_id: student.id,
        student_name: student.name,
        status: idx === 0 ? 'PRESENT' : idx % 3 === 0 ? 'LATE' : 'DISCONNECTED',
        hand_raised: false,
        joined_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString()
      }));

      const { error } = await supabase.from('classroom_attendance').upsert(seedRows, { onConflict: 'session_id,student_id' });
      if (!error) {
        setAttendance(seedRows.map((r) => ({ id: r.student_id, name: r.student_name, status: r.status as AttendanceStatus, handRaised: r.hand_raised, joinedAt: r.joined_at || new Date().toISOString() })));
      }
    } else {
      setAttendance(attendanceRows.map((row: any) => ({
        id: row.student_id,
        name: row.student_name,
        status: row.status as AttendanceStatus,
        handRaised: !!row.hand_raised,
        joinedAt: row.joined_at || new Date().toISOString()
      })));
    }

    setSpotlightStudentId(spotlightRes.data?.student_id || null);
    setNotes(notesRes.data || []);
    setRecordings(recordingsRes.data || []);

    const assignmentRows = assignmentsRes.data || [];
    setAssignments(assignmentRows);
    setAssignmentFiles(assignmentFilesRes.data || []);

    if (assignmentRows.length > 0) {
      const assignmentIds = assignmentRows.map((a: any) => a.id);
      const [qRes, sRes] = await Promise.all([
        supabase.from('classroom_assignment_questions').select('*').in('assignment_id', assignmentIds).order('created_at', { ascending: false }),
        supabase.from('classroom_assignment_submissions').select('*').eq('session_id', sessionId).order('submitted_at', { ascending: false })
      ]);

      if (!qRes.error) {
        setQuestions((qRes.data || []).map((q: any) => ({
          id: q.id,
          type: q.question_type,
          concept: q.concept || 'General',
          prompt: q.prompt,
          options: Array.isArray(q.options) ? q.options : undefined,
          answerKey: q.answer_key || undefined,
          assignmentId: q.assignment_id
        })));
      }

      if (!sRes.error) {
        setSubmissions((sRes.data || []).map((s: any) => ({
          id: s.id,
          questionId: s.question_id,
          studentId: s.student_id,
          studentName: s.student_name,
          response: s.response_choice || s.response_text || '',
          autoScore: s.auto_score ?? undefined,
          rubricScore: s.rubric_score ?? undefined,
          maxScore: Number(s.max_score || 10),
          feedback: s.feedback || undefined,
          submittedAt: s.submitted_at
        })));
      }
    } else {
      setQuestions([]);
      setSubmissions([]);
    }

    setActivityFeed((activityRes.data || []).map((a: any) => ({
      id: a.id,
      sessionId: a.session_id,
      type: a.event_type,
      message: a.message,
      createdAt: a.created_at
    })));

    const sessionRow = await supabase.from('classroom_sessions').select('*').eq('id', sessionId).maybeSingle();
    const row = sessionRow.data;
    if (row && row.status === 'LIVE' && row.room_url && row.template_started_at && row.auto_close_at) {
      setOrchestration({
        isActive: true,
        sessionId,
        roomUrl: row.room_url,
        startedAt: row.template_started_at,
        closesAt: row.auto_close_at
      });
    } else {
      setOrchestration(null);
    }
  };

  useEffect(() => {
    if (!selectedSession?.id || !schemaReady) return;
    loadSessionData(selectedSession.id).catch((err) => console.error('Failed loading session data', err));
  }, [selectedSession?.id, schemaReady]);

  const addActivity = async (sessionId: string, type: string, message: string, payload?: any) => {
    if (!user?.school_id) return;

    const { data, error } = await supabase
      .from('classroom_activity_feed')
      .insert({
        school_id: user.school_id,
        session_id: sessionId,
        actor_id: user.id,
        actor_name: user.full_name,
        event_type: type,
        message,
        payload: payload || null
      })
      .select('*')
      .single();

    if (error) {
      console.error('Failed to persist activity', error);
      return;
    }

    const entry = {
      id: data.id,
      sessionId: data.session_id,
      type: data.event_type,
      message: data.message,
      createdAt: data.created_at
    } as ActivityItem;

    setActivityFeed((prev) => [entry, ...prev].slice(0, 120));

    const channel = classroomChannelRef.current;
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'classroom-activity',
        payload: entry
      });
    }
  };

  useEffect(() => {
    if (!user?.school_id) return;

    const channel = supabase
      .channel(`my-classroom-live-${user.school_id}`)
      .on('broadcast', { event: 'classroom-activity' }, ({ payload }: any) => {
        if (!payload || !selectedSession || payload.sessionId !== selectedSession.id) return;
        setActivityFeed((prev) => {
          if (prev.some((item) => item.id === payload.id)) return prev;
          return [payload as ActivityItem, ...prev].slice(0, 120);
        });
      })
      .subscribe();

    classroomChannelRef.current = channel;
    return () => {
      classroomChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [user, selectedSession?.id]);

  const setParticipantStatus = async (studentId: string, status: AttendanceStatus) => {
    if (!selectedSession || !user?.school_id) return;
    const participant = attendance.find((p) => p.id === studentId);
    if (!participant) return;

    const { error } = await supabase
      .from('classroom_attendance')
      .upsert({
        school_id: user.school_id,
        session_id: selectedSession.id,
        student_id: participant.id,
        student_name: participant.name,
        status,
        hand_raised: status === 'DISCONNECTED' ? false : participant.handRaised,
        joined_at: participant.joinedAt,
        last_seen_at: new Date().toISOString()
      }, { onConflict: 'session_id,student_id' });

    if (error) return;

    setAttendance((prev) => prev.map((p) => p.id === studentId ? { ...p, status, handRaised: status === 'DISCONNECTED' ? false : p.handRaised } : p));
  };

  const simulateStudentJoin = async () => {
    if (!selectedSession) return;
    const candidates = attendance.filter((p) => p.status === 'DISCONNECTED');
    if (!candidates.length) return;

    const chosen = randomFrom(candidates);
    await setParticipantStatus(chosen.id, 'PRESENT');
    await addActivity(selectedSession.id, 'JOIN', `${chosen.name} joined the class.`);
  };

  const toggleRaiseHand = async (studentId: string) => {
    if (!selectedSession || !user?.school_id) return;
    const participant = attendance.find((p) => p.id === studentId);
    if (!participant) return;

    const nextRaised = !participant.handRaised;

    await supabase
      .from('classroom_attendance')
      .upsert({
        school_id: user.school_id,
        session_id: selectedSession.id,
        student_id: participant.id,
        student_name: participant.name,
        status: participant.status,
        hand_raised: nextRaised,
        joined_at: participant.joinedAt,
        last_seen_at: new Date().toISOString()
      }, { onConflict: 'session_id,student_id' });

    if (nextRaised) {
      await supabase.from('classroom_hand_queue').insert({
        school_id: user.school_id,
        session_id: selectedSession.id,
        student_id: participant.id,
        student_name: participant.name,
        is_active: true
      });
    } else {
      await supabase
        .from('classroom_hand_queue')
        .update({ is_active: false, lowered_at: new Date().toISOString() })
        .eq('session_id', selectedSession.id)
        .eq('student_id', participant.id)
        .eq('is_active', true);
    }

    setAttendance((prev) => prev.map((p) => p.id === studentId ? { ...p, handRaised: nextRaised } : p));
    await addActivity(selectedSession.id, 'HAND_RAISED', nextRaised ? `${participant.name} raised hand.` : `${participant.name} lowered hand.`);
  };

  const setSpotlight = async (studentId: string | null) => {
    if (!selectedSession || !user?.school_id) return;

    const participant = studentId ? attendance.find((p) => p.id === studentId) : null;

    await supabase
      .from('classroom_spotlight')
      .upsert({
        school_id: user.school_id,
        session_id: selectedSession.id,
        student_id: studentId,
        student_name: participant?.name || null,
        set_at: new Date().toISOString()
      }, { onConflict: 'session_id' });

    setSpotlightStudentId(studentId);
    await addActivity(selectedSession.id, 'SPOTLIGHT_SET', studentId ? `Spotlight set to ${participant?.name || 'Student'}.` : 'Spotlight cleared.');
  };

  const createSessionAssignment = async (sessionId: string) => {
    if (!user?.school_id) return null;
    const due = new Date(Date.now() + 45 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('classroom_assignments')
      .insert({
        school_id: user.school_id,
        session_id: sessionId,
        teacher_id: user.id,
        title: 'Live Class Assignment',
        description: 'Generated from session template',
        due_at: due,
        status: 'OPEN'
      })
      .select('*')
      .single();

    if (error) return null;
    setAssignments((prev) => [data, ...prev]);
    return data;
  };

  const getActiveAssignment = async (sessionId: string) => {
    const existing = assignments.find((a) => a.session_id === sessionId && a.status === 'OPEN');
    if (existing) return existing;
    return createSessionAssignment(sessionId);
  };

  const uploadFileToStorage = async (file: File, folder: 'recordings' | 'notes' | 'assignment-files') => {
    if (!user?.school_id) throw new Error('Missing school context');

    const safe = sanitizeFileName(file.name);
    const path = `${user.school_id}/${folder}/${Date.now()}-${safe}`;

    const { error: uploadError } = await supabase
      .storage
      .from(CLASSROOM_STORAGE_BUCKET)
      .upload(path, file, { upsert: false });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(CLASSROOM_STORAGE_BUCKET).getPublicUrl(path);
    return { filePath: path, fileUrl: data.publicUrl };
  };

  const handleRecordingUpload = async (file: File) => {
    if (!selectedSession || !user?.school_id) return;
    setUploading(true);
    try {
      const uploaded = await uploadFileToStorage(file, 'recordings');
      const { data, error } = await supabase
        .from('classroom_recordings')
        .insert({
          school_id: user.school_id,
          session_id: selectedSession.id,
          teacher_id: user.id,
          title: file.name,
          file_url: uploaded.fileUrl,
          recording_url: uploaded.fileUrl,
          recorded_at: new Date().toISOString()
        })
        .select('*')
        .single();

      if (!error && data) {
        setRecordings((prev) => [data, ...prev]);
        await addActivity(selectedSession.id, 'ASSIGNMENT_SUBMITTED', `Uploaded recording: ${file.name}`);
      }
    } catch (error) {
      console.error('Recording upload failed', error);
    } finally {
      setUploading(false);
    }
  };

  const handleNotePdfUpload = async (file: File) => {
    if (!selectedSession || !user?.school_id) return;
    setUploading(true);
    try {
      const uploaded = await uploadFileToStorage(file, 'notes');
      const { data, error } = await supabase
        .from('classroom_notes')
        .insert({
          school_id: user.school_id,
          session_id: selectedSession.id,
          teacher_id: user.id,
          title: file.name,
          note_type: 'PDF',
          file_url: uploaded.fileUrl
        })
        .select('*')
        .single();

      if (!error && data) {
        setNotes((prev) => [data, ...prev]);
        await addActivity(selectedSession.id, 'FEEDBACK_SENT', `Uploaded PDF note: ${file.name}`);
      }
    } catch (error) {
      console.error('Note PDF upload failed', error);
    } finally {
      setUploading(false);
    }
  };

  const handleAssignmentFileUpload = async (file: File) => {
    if (!selectedSession || !user?.school_id) return;
    setUploading(true);
    try {
      const assignment = await getActiveAssignment(selectedSession.id);
      if (!assignment) return;

      const uploaded = await uploadFileToStorage(file, 'assignment-files');
      const { data, error } = await supabase
        .from('classroom_assignment_files')
        .insert({
          school_id: user.school_id,
          session_id: selectedSession.id,
          assignment_id: assignment.id,
          teacher_id: user.id,
          title: file.name,
          file_url: uploaded.fileUrl,
          file_path: uploaded.filePath,
          file_type: file.type || 'application/octet-stream'
        })
        .select('*')
        .single();

      if (!error && data) {
        setAssignmentFiles((prev) => [data, ...prev]);
        await addActivity(selectedSession.id, 'ASSIGNMENT_SUBMITTED', `Uploaded assignment file: ${file.name}`);
      }
    } catch (error) {
      console.error('Assignment file upload failed', error);
    } finally {
      setUploading(false);
    }
  };

  const startSessionTemplate = async () => {
    if (!selectedSession || !user?.school_id) return;

    const startTime = new Date();
    const closeTime = new Date(startTime.getTime() + 45 * 60 * 1000);
    const roomUrl = `https://meet.jit.si/${selectedSession.id.replace(/[^a-zA-Z0-9-]/g, '-')}`;

    await supabase
      .from('classroom_sessions')
      .update({
        status: 'LIVE',
        room_url: roomUrl,
        template_started_at: startTime.toISOString(),
        auto_close_at: closeTime.toISOString(),
        archived: false,
        closed_at: null
      })
      .eq('id', selectedSession.id);

    const { data: noteRow } = await supabase
      .from('classroom_notes')
      .insert({
        school_id: user.school_id,
        session_id: selectedSession.id,
        teacher_id: user.id,
        title: `${selectedSession.subject} Live Session Notes`,
        note_type: 'TEXT',
        content: 'Session notes created by template.'
      })
      .select('*')
      .single();

    if (noteRow) setNotes((prev) => [noteRow, ...prev]);

    const assignment = await getActiveAssignment(selectedSession.id);

    setOrchestration({
      isActive: true,
      sessionId: selectedSession.id,
      roomUrl,
      startedAt: startTime.toISOString(),
      closesAt: closeTime.toISOString()
    });

    await addActivity(selectedSession.id, 'SESSION_STARTED', 'Session template started. Live room opened.');
    await addActivity(selectedSession.id, 'FEEDBACK_SENT', 'Session notes posted to class.');
    await addActivity(selectedSession.id, 'ASSIGNMENT_SUBMITTED', assignment ? 'Assignment opened with deadline.' : 'Assignment open action attempted.');
  };

  const closeSessionAndArchive = async (reason: 'AUTO' | 'MANUAL') => {
    if (!orchestration?.isActive || !selectedSession || !user?.school_id) return;

    const nowIso = new Date().toISOString();

    await supabase
      .from('classroom_sessions')
      .update({
        status: 'COMPLETED',
        closed_at: nowIso,
        archived: true
      })
      .eq('id', selectedSession.id);

    const { data: rec } = await supabase
      .from('classroom_recordings')
      .insert({
        school_id: user.school_id,
        session_id: selectedSession.id,
        teacher_id: user.id,
        title: `${selectedSession.subject} Session Recording`,
        recording_url: orchestration.roomUrl,
        recorded_at: nowIso
      })
      .select('*')
      .single();

    if (rec) setRecordings((prev) => [rec, ...prev]);

    await supabase
      .from('classroom_notes')
      .update({ archived: true })
      .eq('session_id', selectedSession.id);

    setNotes((prev) => prev.map((n) => n.session_id === selectedSession.id ? { ...n, archived: true } : n));

    setOrchestration(null);
    await addActivity(selectedSession.id, 'SESSION_CLOSED', reason === 'AUTO' ? 'Session auto-closed and archived.' : 'Session closed and archived.');
  };

  useEffect(() => {
    if (!orchestration?.isActive) return;
    const remaining = new Date(orchestration.closesAt).getTime() - now.getTime();
    if (remaining <= 0) {
      closeSessionAndArchive('AUTO').catch(() => {});
    }
  }, [now, orchestration]);

  const addQuestion = async () => {
    if (!selectedSession || !user?.school_id) return;
    const prompt = questionPrompt.trim();
    if (!prompt) return;

    const assignment = await getActiveAssignment(selectedSession.id);
    if (!assignment) return;

    const options = questionType === 'MCQ'
      ? mcqOptions.split('|').map((s) => s.trim()).filter(Boolean)
      : null;

    const maxScore = questionType === 'MCQ' ? 1 : 10;

    const { data, error } = await supabase
      .from('classroom_assignment_questions')
      .insert({
        assignment_id: assignment.id,
        question_type: questionType,
        concept: questionConcept || 'General',
        prompt,
        options,
        answer_key: questionType === 'MCQ' ? mcqAnswerKey.trim() : null,
        max_score: maxScore
      })
      .select('*')
      .single();

    if (error || !data) return;

    setQuestions((prev) => [{
      id: data.id,
      type: data.question_type,
      concept: data.concept || 'General',
      prompt: data.prompt,
      options: Array.isArray(data.options) ? data.options : undefined,
      answerKey: data.answer_key || undefined,
      assignmentId: data.assignment_id
    }, ...prev]);

    setQuestionPrompt('');
    await addActivity(selectedSession.id, 'QUESTION_SUBMITTED', `Teacher posted ${questionType} question.`);
  };

  const simulateStudentSubmission = async (question: QuestionItem) => {
    if (!selectedSession || !user?.school_id) return;

    const eligible = attendance.filter((p) => p.status !== 'DISCONNECTED');
    if (!eligible.length) return;

    const student = randomFrom(eligible);
    let response = 'Sample response';

    if (question.type === 'MCQ') {
      const options = question.options || ['A', 'B', 'C', 'D'];
      response = randomFrom(options);
    }

    const isCorrect = question.type === 'MCQ' && question.answerKey && response === question.answerKey;
    const autoScore = question.type === 'MCQ' ? (isCorrect ? 1 : 0) : null;

    const { data, error } = await supabase
      .from('classroom_assignment_submissions')
      .insert({
        school_id: user.school_id,
        session_id: selectedSession.id,
        assignment_id: question.assignmentId,
        question_id: question.id,
        student_id: student.id,
        student_name: student.name,
        response_text: question.type === 'MCQ' ? null : response,
        response_choice: question.type === 'MCQ' ? response : null,
        auto_score: autoScore,
        max_score: question.type === 'MCQ' ? 1 : 10
      })
      .select('*')
      .single();

    if (error || !data) return;

    setSubmissions((prev) => [{
      id: data.id,
      questionId: data.question_id,
      studentId: data.student_id,
      studentName: data.student_name,
      response: data.response_choice || data.response_text || '',
      autoScore: data.auto_score ?? undefined,
      rubricScore: data.rubric_score ?? undefined,
      maxScore: Number(data.max_score || 10),
      feedback: data.feedback || undefined,
      submittedAt: data.submitted_at
    }, ...prev]);

    await addActivity(selectedSession.id, question.type === 'MCQ' ? 'QUESTION_SUBMITTED' : 'ASSIGNMENT_SUBMITTED', `${student.name} submitted ${question.type === 'MCQ' ? 'MCQ' : 'assignment'} response.`);
  };

  const applyRubricScore = async (submissionId: string, understanding: number, structure: number, clarity: number) => {
    if (!selectedSession) return;
    const weighted = understanding * 0.5 + structure * 0.3 + clarity * 0.2;
    const score = Number((weighted * 10).toFixed(1));

    const { data, error } = await supabase
      .from('classroom_assignment_submissions')
      .update({ rubric_score: score, feedback: 'Rubric applied: understanding, structure, clarity.' })
      .eq('id', submissionId)
      .select('*')
      .single();

    if (error || !data) return;

    setSubmissions((prev) => prev.map((sub) => sub.id === submissionId ? { ...sub, rubricScore: score, feedback: data.feedback } : sub));
    await addActivity(selectedSession.id, 'FEEDBACK_SENT', `Rubric feedback sent to ${data.student_name}.`);
  };

  const weakConceptInsights = useMemo(() => {
    const questionById = new Map(questions.map((q) => [q.id, q]));
    const weaknessByStudentConcept = new Map<string, { student: string; concept: string; misses: number; total: number }>();

    submissions.forEach((sub) => {
      const q = questionById.get(sub.questionId);
      if (!q) return;

      const concept = q.concept || 'General';
      const key = `${sub.studentName}::${concept}`;
      const current = weaknessByStudentConcept.get(key) || { student: sub.studentName, concept, misses: 0, total: 0 };

      current.total += 1;
      if (q.type === 'MCQ') {
        if ((sub.autoScore || 0) < 1) current.misses += 1;
      } else if (typeof sub.rubricScore === 'number') {
        if (sub.rubricScore < 6) current.misses += 1;
      }

      weaknessByStudentConcept.set(key, current);
    });

    return [...weaknessByStudentConcept.values()]
      .map((item) => {
        const ratio = item.total === 0 ? 0 : item.misses / item.total;
        const library = REMEDIAL_LIBRARY[item.concept] || REMEDIAL_LIBRARY.General;
        return {
          student: item.student,
          concept: item.concept,
          score: Number((ratio * 100).toFixed(0)),
          note: library.note,
          video: library.video
        };
      })
      .filter((row) => row.score >= 50)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [questions, submissions]);

  const presentCount = attendance.filter((p) => p.status === 'PRESENT').length;
  const lateCount = attendance.filter((p) => p.status === 'LATE').length;
  const disconnectedCount = attendance.filter((p) => p.status === 'DISCONNECTED').length;
  const handQueue = attendance.filter((p) => p.handRaised);

  const orchestrationForSelected = orchestration && selectedSession && orchestration.sessionId === selectedSession.id ? orchestration : null;

  if (loading) {
    return <div className="py-14 text-sm font-semibold text-zinc-500">Loading My Classroom...</div>;
  }

  return (
    <div className="space-y-6">
      {!schemaReady && (
        <Card className="border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-800">
            Classroom persistence tables are not ready yet. Apply migration file 20260413_my_classroom.sql first.
          </p>
        </Card>
      )}

      <Card className="bg-gradient-to-r from-zinc-900 to-zinc-700 text-white border-none">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-300">My Classroom</p>
            <h1 className="text-2xl font-bold mt-1">
              {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </h1>
            <p className="text-sm text-zinc-200 mt-2">
              {currentClass ? `Now: ${currentClass.subject} • ${currentClass.classLabel}` : nextClass ? `Next: ${nextClass.subject} at ${nextClass.start}` : 'No active class right now'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {currentClass ? (
              <Button className="bg-emerald-500 hover:bg-emerald-600 text-white">
                <Video size={14} /> Join Live Class
              </Button>
            ) : (
              <Button variant="outline" className="border-zinc-300 text-zinc-100 hover:bg-white/10">
                <Clock3 size={14} /> Awaiting Live Session
              </Button>
            )}
            <Button variant="outline" className="border-zinc-300 text-zinc-100 hover:bg-white/10" onClick={startSessionTemplate}>
              <Sparkles size={14} /> Start Session Template
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-5">
          <Card title="Schedule Timeline" subtitle="Interactive daily class flow" icon={CalendarDays}>
            <div className="space-y-3">
              {orderedSessions.map((session) => {
                const status = sessionStatus(session);
                const selected = selectedSession?.id === session.id;
                const tone = status === 'LIVE' ? 'border-red-300 bg-red-50' : status === 'UPCOMING' ? 'border-amber-300 bg-amber-50' : 'border-zinc-200 bg-zinc-50';

                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`w-full text-left rounded-xl border px-3 py-3 transition ${tone} ${selected ? 'ring-2 ring-zinc-900/20' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs text-zinc-500">{session.day} • {session.start} - {session.end}</p>
                        <p className="font-semibold text-sm mt-0.5">{session.subject}</p>
                        <p className="text-xs text-zinc-600 mt-0.5">{session.teacher} • {session.classLabel}</p>
                      </div>
                      <Badge variant={status === 'LIVE' ? 'danger' : status === 'UPCOMING' ? 'warning' : 'neutral'}>
                        <CircleDot size={10} /> {status}
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        </div>

        <div className="xl:col-span-7 space-y-6">
          <Card title={selectedSession ? `${selectedSession.subject} Classroom` : 'Classroom'} subtitle={selectedSession ? `${selectedSession.classLabel} • ${selectedSession.day} ${selectedSession.start}-${selectedSession.end}` : 'Select a class from timeline'}>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {([
                ['LIVE', 'Live Class'],
                ['RECORDINGS', 'Recordings'],
                ['NOTES', 'Notes'],
                ['ASSIGNMENTS', 'Assignments']
              ] as Array<[TabKey, string]>).map(([key, label]) => (
                <Button key={key} variant={activeTab === key ? 'primary' : 'outline'} onClick={() => setActiveTab(key)}>
                  {label}
                </Button>
              ))}
            </div>

            {orchestrationForSelected && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 mb-4 text-xs text-emerald-700">
                Template active. Live room: {orchestrationForSelected.roomUrl} • auto closes at {new Date(orchestrationForSelected.closesAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}

            {activeTab === 'LIVE' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-zinc-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">Live Session Control</p>
                      <p className="text-xs text-zinc-500 mt-1">Presence, hand queue and spotlight mode.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button onClick={simulateStudentJoin} variant="outline">Simulate Join</Button>
                      <Button onClick={() => closeSessionAndArchive('MANUAL')} variant="outline">Close & Archive</Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <Badge variant="success">Present {presentCount}</Badge>
                    <Badge variant="warning">Late {lateCount}</Badge>
                    <Badge variant="danger">Disconnected {disconnectedCount}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {attendance.map((student) => (
                    <div key={student.id} className={`rounded-lg border p-3 ${spotlightStudentId === student.id ? 'border-emerald-400 bg-emerald-50' : 'border-zinc-200'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{student.name}</p>
                          <p className="text-xs text-zinc-500 mt-0.5">Joined {new Date(student.joinedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <Badge variant={student.status === 'PRESENT' ? 'success' : student.status === 'LATE' ? 'warning' : 'danger'}>{student.status}</Badge>
                      </div>

                      <div className="flex flex-wrap gap-1 mt-2">
                        <Button variant="ghost" className="h-7 px-2" onClick={() => setParticipantStatus(student.id, 'PRESENT')}>Present</Button>
                        <Button variant="ghost" className="h-7 px-2" onClick={() => setParticipantStatus(student.id, 'LATE')}>Late</Button>
                        <Button variant="ghost" className="h-7 px-2" onClick={() => setParticipantStatus(student.id, 'DISCONNECTED')}>Disconnect</Button>
                        <Button variant="outline" className="h-7 px-2" onClick={() => toggleRaiseHand(student.id)}><Hand size={12} /> {student.handRaised ? 'Lower' : 'Raise'}</Button>
                        <Button variant="outline" className="h-7 px-2" onClick={() => setSpotlight(student.id)}><Star size={12} /> Spotlight</Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-zinc-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Raise-hand Queue</p>
                    <Button variant="outline" className="h-7 px-2" onClick={() => setSpotlight(null)}>Clear Spotlight</Button>
                  </div>
                  <div className="mt-2 space-y-1">
                    {handQueue.length === 0 && <p className="text-xs text-zinc-400">No raised hands.</p>}
                    {handQueue.map((p) => <div key={p.id} className="text-xs text-zinc-700">• {p.name}</div>)}
                    {spotlightStudentId && <p className="text-xs text-emerald-700 mt-2">Spotlight: {attendance.find((s) => s.id === spotlightStudentId)?.name}</p>}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'RECORDINGS' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400 cursor-pointer inline-flex items-center gap-1.5">
                    <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload Recording'}
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleRecordingUpload(file);
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                </div>
                {recordings.map((item) => (
                  <div key={item.id} className="rounded-xl border border-zinc-200 p-3">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-zinc-500 mt-1">{new Date(item.recorded_at || item.at).toLocaleString('en-GB')}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'NOTES' && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400 cursor-pointer inline-flex items-center gap-1.5">
                    <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload PDF Note'}
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleNotePdfUpload(file);
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                  <Button variant="outline" onClick={async () => {
                    if (!selectedSession || !user?.school_id) return;
                    const { data } = await supabase.from('classroom_notes').insert({
                      school_id: user.school_id,
                      session_id: selectedSession.id,
                      teacher_id: user.id,
                      title: `${selectedSession.subject} Text Note`,
                      note_type: 'TEXT',
                      content: 'Text note from classroom panel.'
                    }).select('*').single();
                    if (data) setNotes((prev) => [data, ...prev]);
                  }}><FileText size={14} /> Add Text Note</Button>
                </div>
                {notes.map((item) => (
                  <div key={item.id} className="rounded-xl border border-zinc-200 p-3">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-zinc-500 mt-1">{item.note_type || item.type} • Updated {new Date(item.updated_at || item.updatedAt).toLocaleString('en-GB')} {item.archived ? '• Archived' : ''}</p>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'ASSIGNMENTS' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-zinc-200 p-4 space-y-3">
                  <p className="text-sm font-semibold">Assignment Intelligence</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <select value={questionType} onChange={(e) => setQuestionType(e.target.value as 'MCQ' | 'SHORT' | 'STRUCTURED')} className="px-3 py-2 rounded-lg border border-zinc-200 text-xs">
                      <option value="MCQ">Multiple Choice</option>
                      <option value="SHORT">Short Answer</option>
                      <option value="STRUCTURED">Structured Question</option>
                    </select>
                    <input value={questionConcept} onChange={(e) => setQuestionConcept(e.target.value)} className="px-3 py-2 rounded-lg border border-zinc-200 text-xs" placeholder="Concept e.g. Algebra" />
                  </div>

                  <input value={questionPrompt} onChange={(e) => setQuestionPrompt(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-xs" placeholder="Question prompt" />

                  {questionType === 'MCQ' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <input value={mcqOptions} onChange={(e) => setMcqOptions(e.target.value)} className="px-3 py-2 rounded-lg border border-zinc-200 text-xs" placeholder="Options separated by |" />
                      <input value={mcqAnswerKey} onChange={(e) => setMcqAnswerKey(e.target.value)} className="px-3 py-2 rounded-lg border border-zinc-200 text-xs" placeholder="Correct option" />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Button onClick={addQuestion}>Add Question</Button>
                    <Button variant="outline" onClick={() => questions[0] && simulateStudentSubmission(questions[0])}>Simulate Submission</Button>
                    <label className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-400 cursor-pointer inline-flex items-center gap-1.5">
                      <Upload size={14} /> {uploading ? 'Uploading...' : 'Attach Assignment File'}
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleAssignmentFileUpload(file);
                          e.currentTarget.value = '';
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 p-4 space-y-2">
                  <p className="text-sm font-semibold">Assignment Files</p>
                  {assignmentFiles.length === 0 && <p className="text-xs text-zinc-400">No attached files yet.</p>}
                  {assignmentFiles.map((f) => (
                    <div key={f.id} className="rounded-lg border border-zinc-200 p-3">
                      <p className="text-sm font-medium">{f.title}</p>
                      <p className="text-xs text-zinc-500 mt-1">{new Date(f.uploaded_at || f.created_at).toLocaleString('en-GB')}</p>
                      {f.file_url && (
                        <a href={f.file_url} target="_blank" rel="noreferrer" className="text-xs text-emerald-700 mt-1 inline-block">Open file</a>
                      )}
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-zinc-200 p-4 space-y-2">
                  <p className="text-sm font-semibold">Questions</p>
                  {questions.length === 0 && <p className="text-xs text-zinc-400">No questions yet for this class.</p>}
                  {questions.map((q) => (
                    <div key={q.id} className="rounded-lg border border-zinc-200 p-3">
                      <p className="text-xs text-zinc-500">{q.type} • {q.concept}</p>
                      <p className="text-sm font-medium mt-0.5">{q.prompt}</p>
                      {q.options && <p className="text-xs text-zinc-500 mt-1">Options: {q.options.join(' | ')}</p>}
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-zinc-200 p-4 space-y-2">
                  <p className="text-sm font-semibold">Submissions & Marking</p>
                  {submissions.length === 0 && <p className="text-xs text-zinc-400">No submissions yet.</p>}
                  {submissions.map((sub) => (
                    <div key={sub.id} className="rounded-lg border border-zinc-200 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{sub.studentName}</p>
                        {typeof sub.autoScore === 'number' ? (
                          <Badge variant={sub.autoScore === sub.maxScore ? 'success' : 'danger'}>
                            <CheckCircle2 size={10} /> Auto {sub.autoScore}/{sub.maxScore}
                          </Badge>
                        ) : (
                          <Badge variant="neutral">Structured</Badge>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">Response: {sub.response}</p>

                      {typeof sub.autoScore !== 'number' && (
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" className="h-7 px-2" onClick={() => applyRubricScore(sub.id, 0.9, 0.8, 0.8)}>High Rubric</Button>
                          <Button variant="outline" className="h-7 px-2" onClick={() => applyRubricScore(sub.id, 0.6, 0.6, 0.5)}>Mid Rubric</Button>
                          <Button variant="outline" className="h-7 px-2" onClick={() => applyRubricScore(sub.id, 0.4, 0.4, 0.3)}>Low Rubric</Button>
                        </div>
                      )}

                      {typeof sub.rubricScore === 'number' && (
                        <p className="text-xs text-zinc-600">Rubric score: {sub.rubricScore}/10 • {sub.feedback}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-zinc-200 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-600" />
                    <p className="text-sm font-semibold">Weak Concepts & Remedial Suggestions</p>
                  </div>

                  {weakConceptInsights.length === 0 && <p className="text-xs text-zinc-400">No high-risk concept detected yet.</p>}

                  {weakConceptInsights.map((insight, idx) => (
                    <div key={`${insight.student}-${insight.concept}-${idx}`} className="rounded-lg border border-zinc-200 p-3">
                      <p className="text-sm font-medium">{insight.student} • {insight.concept}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">Weakness risk: {insight.score}%</p>
                      <p className="text-xs text-zinc-600 mt-1">Remedial note: {insight.note}</p>
                      <a className="text-xs text-emerald-700 mt-1 inline-block" href={insight.video} target="_blank" rel="noreferrer">Suggested video</a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card title="Realtime Classroom Feed" subtitle="All activity in this class block" icon={Activity}>
            <div className="space-y-2">
              {activityFeed.length === 0 && <p className="text-xs text-zinc-400">No activity yet.</p>}
              {activityFeed.map((item) => (
                <div key={item.id} className="rounded-lg border border-zinc-200 p-3">
                  <p className="text-sm text-zinc-800">{item.message}</p>
                  <p className="text-[11px] text-zinc-500 mt-1">{new Date(item.createdAt).toLocaleString('en-GB')}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
