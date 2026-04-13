import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Video,
  FileText,
  Upload,
  CircleDot,
  Hand,
  Star,
  Sparkles,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  Save,
  Share2,
  NotebookPen,
  Eraser,
  X,
  Mic,
  MicOff,
  VideoOff,
  Send,
  Check,
  Bookmark,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Button, Card, Badge, Modal } from '../components/UI';

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
  topic?: string;
  scheduledStartAt?: string;
  scheduledEndAt?: string;
  source?: 'TIMETABLE' | 'CUSTOM';
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
  actorName?: string | null;
  payload?: any;
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

type MomentTag = 'IMPORTANT' | 'REPEAT_THIS' | 'EXAM_TIP';

type MomentBookmark = {
  id: string;
  sessionId: string;
  tag: MomentTag;
  note: string;
  createdAt: string;
};

type BreakoutRoom = {
  id: string;
  sessionId: string;
  roomLabel: string;
  roomUrl: string;
  endsAt: string;
  isActive: boolean;
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
  const navigate = useNavigate();

  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [schemaReady, setSchemaReady] = useState(true);

  const [streams, setStreams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [assignmentRows, setAssignmentRows] = useState<any[]>([]);

  const [activeTab, setActiveTab] = useState<TabKey>('LIVE');
  const [workspaceMode, setWorkspaceMode] = useState<'LIVE' | 'LIBRARY'>('LIVE');
  const [libraryTab, setLibraryTab] = useState<'VIDEOS' | 'NOTES' | 'ASSIGNMENTS'>('VIDEOS');
  const [livePaused, setLivePaused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
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
  const [chatMessage, setChatMessage] = useState('');
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [isStartClassModalOpen, setIsStartClassModalOpen] = useState(false);
  const [startClassMode, setStartClassMode] = useState<'CHOICE' | 'CUSTOM'>('CHOICE');
  const [customSessions, setCustomSessions] = useState<SessionItem[]>([]);
  const [customClassForm, setCustomClassForm] = useState({
    streamId: '',
    subjectId: '',
    topic: '',
    startAt: '',
    endAt: ''
  });

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [attendance, setAttendance] = useState<Participant[]>([]);
  const [spotlightStudentId, setSpotlightStudentId] = useState<string | null>(null);
  const [activityFeed, setActivityFeed] = useState<ActivityItem[]>([]);
  const [orchestration, setOrchestration] = useState<OrchestrationState | null>(null);
  const [closedSummary, setClosedSummary] = useState<any | null>(null);
  const [momentBookmarks, setMomentBookmarks] = useState<MomentBookmark[]>([]);
  const [breakoutRooms, setBreakoutRooms] = useState<BreakoutRoom[]>([]);
  const [breakoutMinutes, setBreakoutMinutes] = useState(8);
  const [breakoutCount, setBreakoutCount] = useState(3);

  const classroomChannelRef = useRef<any>(null);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const defaultStart = new Date(Date.now() + 5 * 60 * 1000);
    const defaultEnd = new Date(defaultStart.getTime() + 45 * 60 * 1000);
    const toInputValue = (value: Date) => {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}T${pad(value.getHours())}:${pad(value.getMinutes())}`;
    };

    setCustomClassForm((prev: typeof customClassForm) => {
      if (prev.startAt && prev.endAt) return prev;
      return {
        ...prev,
        startAt: prev.startAt || toInputValue(defaultStart),
        endAt: prev.endAt || toInputValue(defaultEnd)
      };
    });
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

        const { data: dbCustomSessions } = await supabase
          .from('classroom_sessions')
          .select('*')
          .eq('school_id', user.school_id)
          .eq('teacher_id', user.id)
          .eq('template_key', 'CLASSROOM_CUSTOM')
          .in('status', ['SCHEDULED', 'LIVE'])
          .order('scheduled_start_at', { ascending: true });

        const mappedCustom = (dbCustomSessions || []).map((row: any) => ({
          id: row.id,
          day: row.day_name || 'Monday',
          start: row.start_time || '08:00',
          end: row.end_time || '08:40',
          subject: row.title || 'Custom Class',
          teacher: user?.full_name || 'Teacher',
          classLabel: row.class_label || 'Custom class',
          streamId: row.stream_id || undefined,
          subjectId: row.subject_id || undefined,
          topic: row.topic || undefined,
          scheduledStartAt: row.scheduled_start_at || undefined,
          scheduledEndAt: row.scheduled_end_at || undefined,
          source: 'CUSTOM' as const,
          db: row
        }));
        setCustomSessions(mappedCustom);
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

  useEffect(() => {
    if (!isStartClassModalOpen || startClassMode !== 'CUSTOM') return;

    setCustomClassForm((prev: typeof customClassForm) => ({
      ...prev,
      streamId: prev.streamId || teacherStreams[0]?.id || '',
      subjectId: prev.subjectId || subjects[0]?.id || ''
    }));
  }, [isStartClassModalOpen, startClassMode, subjects, teacherStreams]);

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
          subjectId: subject.id,
          source: 'TIMETABLE'
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
        classLabel: 'No assigned stream yet',
        source: 'TIMETABLE'
      });
    }

    return [...list, ...customSessions];
  }, [customSessions, now, teacherStreams, teacherSubjects, user]);

  const syncSessionsToDb = async (source: SessionItem[]) => {
    if (!user?.school_id || !source.length) {
      console.log('ℹ️ syncSessionsToDb skipped:', { hasSchoolId: !!user?.school_id, sourceLength: source.length });
      return;
    }

    const timetableSource = source.filter((s) => s.source !== 'CUSTOM');
    if (!timetableSource.length) return;

    console.log('🔄 Syncing sessions to DB:', timetableSource.map(s => ({ id: s.id, subject: s.subject })));

    const rows = timetableSource.map((s) => ({
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
      console.error('❌ Session sync failed:', error);
      const message = String(error.message || '').toLowerCase();
      if (message.includes('classroom_sessions')) {
        console.warn('⚠️ classroom_sessions table not found - schema not ready');
        setSchemaReady(false);
        return;
      }
      throw error;
    }

    console.log('✅ Sessions synced to DB successfully');
    setSchemaReady(true);
  };

  useEffect(() => {
    syncSessionsToDb(sessions).catch((err) => {
      console.error('❌ Failed to sync sessions:', err);
      // Don't block the app - continue with client-side state
    });
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
      activityRes,
      bookmarksRes,
      breakoutsRes
    ] = await Promise.all([
      supabase.from('classroom_attendance').select('*').eq('session_id', sessionId).order('student_name', { ascending: true }),
      supabase.from('classroom_spotlight').select('*').eq('session_id', sessionId).maybeSingle(),
      supabase.from('classroom_notes').select('*').eq('session_id', sessionId).order('updated_at', { ascending: false }),
      supabase.from('classroom_recordings').select('*').eq('session_id', sessionId).order('recorded_at', { ascending: false }),
      supabase.from('classroom_assignments').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }),
      supabase.from('classroom_assignment_files').select('*').eq('session_id', sessionId).order('uploaded_at', { ascending: false }),
      supabase.from('classroom_activity_feed').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(50),
      supabase.from('classroom_moment_bookmarks').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(20),
      supabase.from('classroom_breakout_rooms').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(10)
    ]);

    if (attendanceRes.error || notesRes.error || recordingsRes.error || assignmentsRes.error || assignmentFilesRes.error || activityRes.error) {
      console.warn('Classroom persistence tables are unavailable; using local classroom fallback state.');

      const fallbackAttendance = seedStudents.map((student, idx) => ({
        id: student.id,
        name: student.name,
        status: idx === 0 ? 'PRESENT' : idx % 3 === 0 ? 'LATE' : 'DISCONNECTED',
        handRaised: false,
        joinedAt: new Date().toISOString()
      }));

      setAttendance(fallbackAttendance);
      setSpotlightStudentId(null);
      setNotes([]);
      setRecordings([]);
      setAssignments([]);
      setAssignmentFiles([]);
      setQuestions([]);
      setSubmissions([]);
      setActivityFeed([]);
      setMomentBookmarks([]);
      setBreakoutRooms([]);
      setOrchestration(null);
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
      createdAt: a.created_at,
      actorName: a.actor_name,
      payload: a.payload
    })));

    setMomentBookmarks((bookmarksRes.data || []).map((b: any) => ({
      id: b.id,
      sessionId: b.session_id,
      tag: b.tag as MomentTag,
      note: b.note || '',
      createdAt: b.created_at
    })));

    setBreakoutRooms((breakoutsRes.data || []).map((r: any) => ({
      id: r.id,
      sessionId: r.session_id,
      roomLabel: r.room_label,
      roomUrl: r.room_url,
      endsAt: r.ends_at,
      isActive: !!r.is_active
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
    if (!selectedSession?.id) return;
    loadSessionData(selectedSession.id).catch((err) => console.error('Failed loading session data', err));
  }, [selectedSession?.id]);

  const addActivity = async (sessionId: string, type: string, message: string, payload?: any) => {
    console.log('addActivity called:', { sessionId, type, message, userSchoolId: user?.school_id, userId: user?.id });
    if (!user?.school_id) {
      console.error('❌ addActivity BLOCKED: user.school_id is missing!', { userId: user?.id, userName: user?.full_name });
      return;
    }
    if (!sessionId) {
      console.error('❌ addActivity BLOCKED: sessionId is missing!');
      return;
    }

    // Defensive: Verify session exists, or create it if it's the fallback
    const sessionExists = await supabase
      .from('classroom_sessions')
      .select('id')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionExists.error && !sessionExists.error.message?.includes('expected one result')) {
      console.error('❌ Failed to check if session exists:', sessionExists.error);
      return;
    }

    if (!sessionExists.data) {
      console.warn('⚠️ Session does not exist in DB:', sessionId);
      
      // If it's the fallback session, try to create it
      if (sessionId === 'fallback-1') {
        console.log('🆕 Creating fallback session...');
        const { error: createError } = await supabase
          .from('classroom_sessions')
          .insert({
            id: sessionId,
            school_id: user.school_id,
            teacher_id: user.id,
            title: 'General Classroom',
            class_label: 'No assigned stream yet',
            day_name: 'Monday',
            start_time: '08:00',
            end_time: '08:40',
            status: 'SCHEDULED'
          });

        if (createError) {
          console.error('❌ Failed to create fallback session:', createError);
          return;
        }
        console.log('✅ Fallback session created');
      } else {
        console.error('❌ addActivity BLOCKED: session does not exist and is not fallback', { sessionId });
        return;
      }
    }

    console.log('✅ Inserting activity to Supabase...');
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
      console.error('❌ Supabase insert failed:', error);
      return;
    }
    console.log('✅ Activity saved to DB:', data);

    const entry = {
      id: data.id,
      sessionId: data.session_id,
      type: data.event_type,
      message: data.message,
      createdAt: data.created_at,
      actorName: data.actor_name,
      payload: data.payload
    } as ActivityItem;

    console.log('📥 Adding entry to local feed state:', { entrySessionId: entry.sessionId, currentSelectedSessionId: selectedSession?.id });
    setActivityFeed((prev) => {
      const updated = [entry, ...prev].slice(0, 120);
      console.log('📥 Feed state updated. New feed size:', updated.length, 'Filtered for session:', updated.filter((i) => i.sessionId === selectedSession?.id).length);
      return updated;
    });

    const channel = classroomChannelRef.current;
    console.log('📡 Broadcasting to channel:', { channelExists: !!channel, channelId: channel?.topic || 'none' });
    if (channel) {
      channel.send({
        type: 'broadcast',
        event: 'classroom-activity',
        payload: entry
      });
      console.log('📡 Broadcast sent');
    } else {
      console.warn('⚠️ No channel to broadcast to');
    }
  };

  const addMomentBookmark = async (tag: MomentTag) => {
    if (!selectedSession || !user?.school_id || !orchestrationForSelected) return;

    const labels: Record<MomentTag, string> = {
      IMPORTANT: 'important',
      REPEAT_THIS: 'repeat this',
      EXAM_TIP: 'exam tip'
    };
    const note = `Marked as ${labels[tag]} at ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}.`;

    const { data, error } = await supabase
      .from('classroom_moment_bookmarks')
      .insert({
        school_id: user.school_id,
        session_id: selectedSession.id,
        teacher_id: user.id,
        tag,
        note,
        marker_time_seconds: Math.max(0, Math.floor((Date.now() - new Date(orchestrationForSelected.startedAt).getTime()) / 1000))
      })
      .select('*')
      .single();

    if (!error && data) {
      setMomentBookmarks((prev: MomentBookmark[]) => [{
        id: data.id,
        sessionId: data.session_id,
        tag: data.tag as MomentTag,
        note: data.note,
        createdAt: data.created_at
      }, ...prev].slice(0, 20));
    }

    await addActivity(selectedSession.id, 'BOOKMARK_ADDED', `Bookmark added: ${labels[tag]}.`, { tag });
  };

  const generateCatchUpPack = async () => {
    if (!selectedSession || !user?.school_id) return;

    const absent = attendance.filter((p) => p.status === 'DISCONNECTED');
    if (absent.length === 0) {
      await addActivity(selectedSession.id, 'FEEDBACK_SENT', 'Catch-up pack skipped: no absent learners.');
      return;
    }

    const latestRecording = recordings[0] || null;
    const latestNote = notes[0] || null;
    const latestAssignment = assignments.find((a: any) => a.status === 'OPEN') || assignments[0] || null;
    const dueAt = latestAssignment?.due_at || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

    const payload = {
      sessionId: selectedSession.id,
      sessionTitle: selectedSession.subject,
      absentStudents: absent.map((s) => ({ id: s.id, name: s.name })),
      recording: latestRecording ? { id: latestRecording.id, title: latestRecording.title, url: latestRecording.file_url || latestRecording.recording_url } : null,
      note: latestNote ? { id: latestNote.id, title: latestNote.title, url: latestNote.file_url || null } : null,
      assignment: latestAssignment ? { id: latestAssignment.id, title: latestAssignment.title, dueAt } : null,
      deadline: dueAt
    };

    await supabase.from('classroom_catchup_packs').insert({
      school_id: user.school_id,
      session_id: selectedSession.id,
      teacher_id: user.id,
      payload,
      deadline: dueAt
    });

    await addActivity(selectedSession.id, 'CATCHUP_PACK_CREATED', `Catch-up pack generated for ${absent.length} absent learner(s).`, {
      absentCount: absent.length,
      deadline: dueAt
    });
  };

  const startBreakoutRooms = async () => {
    if (!selectedSession || !user?.school_id || breakoutCount < 1 || breakoutMinutes < 1) return;

    const endsAt = new Date(Date.now() + breakoutMinutes * 60 * 1000).toISOString();
    const rooms = Array.from({ length: breakoutCount }).map((_, idx) => {
      const roomLabel = `Room ${idx + 1}`;
      const roomId = `${selectedSession.id}-breakout-${idx + 1}-${Date.now()}`;
      return {
        school_id: user.school_id,
        session_id: selectedSession.id,
        room_label: roomLabel,
        room_url: `https://meet.jit.si/${roomId}`,
        ends_at: endsAt,
        is_active: true
      };
    });

    const { data } = await supabase.from('classroom_breakout_rooms').insert(rooms).select('*');
    if (data) {
      setBreakoutRooms((data as any[]).map((r: any) => ({
        id: r.id,
        sessionId: r.session_id,
        roomLabel: r.room_label,
        roomUrl: r.room_url,
        endsAt: r.ends_at,
        isActive: !!r.is_active
      })));
    }

    await addActivity(selectedSession.id, 'BREAKOUT_STARTED', `Started ${breakoutCount} breakout room(s) for ${breakoutMinutes} minutes.`, {
      breakoutCount,
      breakoutMinutes,
      endsAt
    });
  };

  const returnFromBreakouts = async () => {
    if (!selectedSession) return;
    await supabase.from('classroom_breakout_rooms').update({ is_active: false }).eq('session_id', selectedSession.id).eq('is_active', true);
    setBreakoutRooms((prev: BreakoutRoom[]) => prev.map((r) => ({ ...r, isActive: false })));
    await addActivity(selectedSession.id, 'BREAKOUT_ENDED', 'Breakout rooms ended. Everyone return to main room.');
  };

  useEffect(() => {
    if (!user?.school_id) {
      console.log('⏸️ Channel subscription skipped: no school_id');
      return;
    }

    console.log('🔌 Setting up realtime channel:', `my-classroom-live-${user.school_id}`);
    const channel = supabase
      .channel(`my-classroom-live-${user.school_id}`)
      .on('broadcast', { event: 'classroom-activity' }, ({ payload }: any) => {
        console.log('📨 Broadcast received:', payload);
        console.log('📋 Current selectedSession:', selectedSession?.id, 'Payload sessionId:', payload?.sessionId);
        
        if (!payload) {
          console.warn('⚠️ Broadcast rejected: no payload');
          return;
        }
        if (!selectedSession) {
          console.warn('⚠️ Broadcast rejected: no selected session');
          return;
        }
        if (payload.sessionId !== selectedSession.id) {
          console.warn('⚠️ Broadcast rejected: session mismatch', { payloadSessionId: payload.sessionId, selectedSessionId: selectedSession.id });
          return;
        }
        
        console.log('✅ Broadcast accepted, updating feed');
        setActivityFeed((prev) => {
          if (prev.some((item) => item.id === payload.id)) {
            console.log('⏭️  Item already in feed, skipping duplicate');
            return prev;
          }
          console.log('✨ Adding broadcast item to feed');
          return [payload as ActivityItem, ...prev].slice(0, 120);
        });
      })
      .subscribe((status) => {
        console.log('📡 Channel subscription status:', status);
      });

    classroomChannelRef.current = channel;
    return () => {
      console.log('🔌 Cleaning up realtime channel');
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

  const handleSaveClassRecording = async () => {
    if (!selectedSession || !user?.school_id || !orchestrationForSelected) return;

    const { data, error } = await supabase
      .from('classroom_recordings')
      .insert({
        school_id: user.school_id,
        session_id: selectedSession.id,
        teacher_id: user.id,
        title: `${selectedSession.subject} Live Recording`,
        recording_url: orchestrationForSelected.roomUrl,
        file_url: orchestrationForSelected.roomUrl,
        recorded_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (error || !data) return;

    setRecordings((prev) => [data, ...prev]);
    await addActivity(selectedSession.id, 'FEEDBACK_SENT', 'Saved live class recording.');
  };

  const sendChatMessage = async () => {
    const targetSessionId = selectedSession?.id || selectedSessionId;
    if (!targetSessionId || !chatMessage.trim()) {
      console.warn('⚠️ sendChatMessage blocked:', { targetSessionId, hasMessage: !!chatMessage.trim() });
      return;
    }
    const message = chatMessage.trim();
    console.log('📤 Sending chat:', { message, targetSessionId });

    await addActivity(targetSessionId, 'CHAT_MESSAGE', message, {
      kind: 'teacher-chat'
    });

    setChatMessage('');
  };

  const raiseHandFromComposer = async () => {
    const targetSessionId = selectedSession?.id || selectedSessionId;
    if (!targetSessionId) {
      console.warn('⚠️ raiseHandFromComposer blocked: no session ID');
      return;
    }
    console.log('✋ Raising hand:', { targetSessionId, attendanceCount: attendance.length });

    const liveStudents = attendance.filter((student) => student.status === 'PRESENT' || student.status === 'LATE');
    if (liveStudents.length === 0) {
      console.warn('⚠️ No live students to raise hand for');
      return;
    }

    const student = randomFrom(liveStudents as Participant[]);
    if (!student.handRaised) {
      await toggleRaiseHand(student.id);
    }

    console.log('📢 Recording hand raise activity:', { studentName: student.name, studentId: student.id });
    await addActivity(targetSessionId, 'HAND_RAISED', `${student.name} raised his hand.`, {
      kind: 'hand-raise',
      studentId: student.id,
      studentName: student.name,
      accepted: false
    });
  };

  const acceptRaisedHand = async (studentId: string, studentName: string) => {
    if (!selectedSession || !user?.school_id) return;

    await supabase
      .from('classroom_attendance')
      .update({ hand_raised: false, last_seen_at: new Date().toISOString() })
      .eq('session_id', selectedSession.id)
      .eq('student_id', studentId);

    await supabase
      .from('classroom_hand_queue')
      .update({ is_active: false, lowered_at: new Date().toISOString() })
      .eq('session_id', selectedSession.id)
      .eq('student_id', studentId)
      .eq('is_active', true);

    setAttendance((prev) => prev.map((student) => student.id === studentId ? { ...student, handRaised: false } : student));
    await setSpotlight(studentId);
    await addActivity(selectedSession.id, 'HAND_ACCEPTED', `${user.full_name || 'Teacher'} accepted ${studentName}'s hand.`, {
      kind: 'hand-accepted',
      studentId,
      studentName
    });
  };

  const persistClassTemplateRegistry = async () => {
    if (!user?.school_id) return;

    await supabase
      .from('templates')
      .upsert({
        school_id: user.school_id,
        key: 'CLASSROOM_START',
        name: 'Classroom Start Template',
        category: 'CLASSROOM',
        config: {
          modes: ['CUSTOM', 'TEMPLATE'],
          fields: ['stream', 'subject', 'topic', 'startAt', 'endAt']
        },
        active: true,
        updated_by: user.id
      }, { onConflict: 'school_id,key' });

    await supabase
      .from('template_permissions')
      .upsert([
        { school_id: user.school_id, template_key: 'CLASSROOM_START', role: 'TEACHER', can_view: true, can_use: true, can_edit: false },
        { school_id: user.school_id, template_key: 'CLASSROOM_START', role: 'ADMIN', can_view: true, can_use: true, can_edit: true },
        { school_id: user.school_id, template_key: 'CLASSROOM_START', role: 'PRINCIPAL', can_view: true, can_use: true, can_edit: true }
      ], { onConflict: 'school_id,template_key,role' });
  };

  useEffect(() => {
    persistClassTemplateRegistry().catch((err) => {
      console.warn('Template registry tables unavailable yet:', err?.message || err);
    });
  }, [user?.id, user?.school_id]);

  const startSessionLive = async (session: SessionItem, topic?: string) => {
    if (!user?.school_id) return;

    const startTime = new Date();
    const closeTime = new Date(startTime.getTime() + 45 * 60 * 1000);
    const roomUrl = `https://meet.jit.si/${session.id.replace(/[^a-zA-Z0-9-]/g, '-')}`;

    await supabase
      .from('classroom_sessions')
      .update({
        status: 'LIVE',
        room_url: roomUrl,
        template_started_at: startTime.toISOString(),
        auto_close_at: closeTime.toISOString(),
        archived: false,
        closed_at: null,
        topic: topic || null
      })
      .eq('id', session.id);

    setSelectedSessionId(session.id);
    setOrchestration({
      isActive: true,
      sessionId: session.id,
      roomUrl,
      startedAt: startTime.toISOString(),
      closesAt: closeTime.toISOString()
    });
    setClosedSummary(null);
    setLivePaused(false);
    setWorkspaceMode('LIVE');
    setIsStartClassModalOpen(false);
    setStartClassMode('CHOICE');

    await addActivity(session.id, 'SESSION_STARTED', topic ? `Class started: ${topic}` : 'Class started. Live room opened.');
  };

  const handleStartNowCustom = async () => {
    if (!user?.school_id) return;
    const stream = teacherStreams.find((s: any) => s.id === customClassForm.streamId);
    const subject = subjects.find((s: any) => s.id === customClassForm.subjectId);
    if (!stream || !subject || !customClassForm.startAt || !customClassForm.endAt) return;

    const startDate = new Date(customClassForm.startAt);
    const endDate = new Date(customClassForm.endAt);
    const day = startDate.toLocaleDateString('en-GB', { weekday: 'long' });
    const fmt = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const id = `custom-${Date.now()}`;
    const classLabel = `${stream.class?.name || 'Form'} ${stream.name || ''}`.trim();
    const topic = customClassForm.topic.trim();

    const sessionItem: SessionItem = {
      id,
      day,
      start: fmt(startDate),
      end: fmt(endDate),
      subject: subject.name,
      teacher: user.full_name || 'Teacher',
      classLabel,
      streamId: stream.id,
      subjectId: subject.id,
      topic: topic || undefined,
      scheduledStartAt: startDate.toISOString(),
      scheduledEndAt: endDate.toISOString(),
      source: 'CUSTOM'
    };

    await supabase
      .from('classroom_sessions')
      .insert({
        id,
        school_id: user.school_id,
        teacher_id: user.id,
        stream_id: stream.id,
        subject_id: subject.id,
        title: subject.name,
        class_label: classLabel,
        day_name: day,
        start_time: fmt(startDate),
        end_time: fmt(endDate),
        status: 'SCHEDULED',
        topic: topic || null,
        template_key: 'CLASSROOM_CUSTOM',
        scheduled_start_at: startDate.toISOString(),
        scheduled_end_at: endDate.toISOString()
      });

    setCustomSessions((prev: SessionItem[]) => [sessionItem, ...prev]);
    await startSessionLive(sessionItem, topic || undefined);
  };

  const handleSaveCustomForLater = async () => {
    if (!user?.school_id) return;
    const stream = teacherStreams.find((s: any) => s.id === customClassForm.streamId);
    const subject = subjects.find((s: any) => s.id === customClassForm.subjectId);
    if (!stream || !subject || !customClassForm.startAt || !customClassForm.endAt) return;

    const startDate = new Date(customClassForm.startAt);
    const endDate = new Date(customClassForm.endAt);
    const day = startDate.toLocaleDateString('en-GB', { weekday: 'long' });
    const fmt = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const id = `custom-${Date.now()}`;
    const classLabel = `${stream.class?.name || 'Form'} ${stream.name || ''}`.trim();
    const topic = customClassForm.topic.trim();

    const sessionItem: SessionItem = {
      id,
      day,
      start: fmt(startDate),
      end: fmt(endDate),
      subject: subject.name,
      teacher: user.full_name || 'Teacher',
      classLabel,
      streamId: stream.id,
      subjectId: subject.id,
      topic: topic || undefined,
      scheduledStartAt: startDate.toISOString(),
      scheduledEndAt: endDate.toISOString(),
      source: 'CUSTOM'
    };

    await supabase
      .from('classroom_sessions')
      .insert({
        id,
        school_id: user.school_id,
        teacher_id: user.id,
        stream_id: stream.id,
        subject_id: subject.id,
        title: subject.name,
        class_label: classLabel,
        day_name: day,
        start_time: fmt(startDate),
        end_time: fmt(endDate),
        status: 'SCHEDULED',
        topic: topic || null,
        template_key: 'CLASSROOM_CUSTOM',
        scheduled_start_at: startDate.toISOString(),
        scheduled_end_at: endDate.toISOString()
      });

    setCustomSessions((prev: SessionItem[]) => [sessionItem, ...prev]);
    setIsStartClassModalOpen(false);
    setStartClassMode('CHOICE');
  };

  useEffect(() => {
    if (!user?.school_id || orchestration?.isActive) return;

    const timer = setInterval(async () => {
      const { data, error } = await supabase
        .from('classroom_sessions')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('teacher_id', user.id)
        .eq('status', 'SCHEDULED')
        .eq('template_key', 'CLASSROOM_CUSTOM')
        .lte('scheduled_start_at', new Date().toISOString())
        .order('scheduled_start_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (error || !data) return;

      const dueSession: SessionItem = {
        id: data.id,
        day: data.day_name || 'Monday',
        start: data.start_time || '08:00',
        end: data.end_time || '08:40',
        subject: data.title || 'Custom Class',
        teacher: user.full_name || 'Teacher',
        classLabel: data.class_label || 'Custom class',
        streamId: data.stream_id || undefined,
        subjectId: data.subject_id || undefined,
        topic: data.topic || undefined,
        scheduledStartAt: data.scheduled_start_at || undefined,
        scheduledEndAt: data.scheduled_end_at || undefined,
        source: 'CUSTOM'
      };

      await startSessionLive(dueSession, data.topic || undefined);
    }, 30000);

    return () => clearInterval(timer);
  }, [orchestration?.isActive, user?.id, user?.school_id]);

  const startSessionTemplate = async () => {
    if (!selectedSession || !user?.school_id) return;
    await startSessionLive(selectedSession);
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
    setClosedSummary({
      sessionTitle: selectedSession.subject,
      sessionLabel: selectedSession.classLabel,
      closedAt: nowIso,
      present: attendance.filter((p) => p.status === 'PRESENT'),
      late: attendance.filter((p) => p.status === 'LATE'),
      disconnected: attendance.filter((p) => p.status === 'DISCONNECTED'),
      recordings: recordings.length,
      notes: notes.length,
      submissions: submissions.length
    });
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

  // Initialize Jitsi Meet when class goes live
  useEffect(() => {
    if (!orchestrationForSelected || !jitsiContainerRef.current || !selectedSession) {
      console.log('⏸️  Jitsi setup skipped:', { hasOrchestration: !!orchestrationForSelected, hasContainer: !!jitsiContainerRef.current, hasSession: !!selectedSession });
      return;
    }

    console.log('🎥 Initializing Jitsi Meet for room:', selectedSession.id);

    // Load Jitsi API script if not already loaded
    if (!(window as any).JitsiMeetExternalAPI) {
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => {
        console.log('✅ Jitsi API loaded');
      };
      document.head.appendChild(script);
    }

    // Give Jitsi API time to load
    const initTimer = setTimeout(() => {
      const JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI;
      if (!JitsiMeetExternalAPI) {
        console.error('❌ Jitsi API not available');
        return;
      }

      try {
        const roomName = selectedSession.id.replace(/[^a-zA-Z0-9-]/g, '-');
        const options = {
          roomName: roomName,
          parentNode: jitsiContainerRef.current,
          configOverwrite: {
            disableAudioLevels: false,
            startAudioMuted: !micEnabled,
            startVideoMuted: !cameraEnabled,
            enableLobbyChat: false,
            prejoinPageEnabled: false
          },
          interfaceConfigOverwrite: {
            DEFAULT_WELCOME_PAGE_LOGO_URL: '',
            TOOLBAR_BUTTONS: [
              'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
              'foyer', 'hangup', 'help', 'highlight', 'raisehand', 'recording',
              'settings', 'shareaudio', 'sharedvideo', 'stats', 'tileview',
              'toggle-camera', 'videoquality'
            ],
            SHOW_BRAND_WATERMARK: false,
            MOBILE_APP_PROMO: false,
            ENABLE_DESKTOP_DEEPLINK: false
          },
          userInfo: {
            displayName: user?.full_name || 'Teacher',
            email: user?.email || 'teacher@school.com'
          }
        };

        const api = new JitsiMeetExternalAPI('meet.jit.si', options);
        console.log('✅ Jitsi conference initialized:', roomName);

        // Listen for hand raise events
        api.addEventListener('raiseHandUpdated', (data: any) => {
          console.log('✋ Hand raised event from Jitsi:', data);
        });

        // Listen for recording updates
        api.addEventListener('recordingStatusChanged', (data: any) => {
          console.log('📹 Recording status:', data);
        });

        // Cleanup on unmount or when orchestration ends
        return () => {
          console.log('🔌 Cleaning up Jitsi');
          api.dispose();
        };
      } catch (error) {
        console.error('❌ Failed to initialize Jitsi:', error);
      }
    }, 500);

    return () => clearTimeout(initTimer);
  }, [orchestrationForSelected?.sessionId, selectedSession?.id, user, micEnabled, cameraEnabled]);

  const downloadPresentList = () => {
    if (!selectedSession) return;
    const rows = ['Student,Status,Joined At'];
    attendance.forEach((student) => {
      rows.push(`${student.name},${student.status},${student.joinedAt || ''}`);
    });
    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${selectedSession.subject.replace(/\s+/g, '_')}_attendance.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const printPresentList = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow || !selectedSession) return;
    const presentRows = attendance.filter((student) => student.status === 'PRESENT' || student.status === 'LATE');
    printWindow.document.write(`
      <html>
        <head>
          <title>Attendance Summary</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 20px; margin-bottom: 8px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border-bottom: 1px solid #ddd; text-align: left; padding: 8px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>${selectedSession.subject} Attendance Summary</h1>
          <p>${selectedSession.classLabel}</p>
          <table>
            <thead><tr><th>Student</th><th>Status</th><th>Joined</th></tr></thead>
            <tbody>
              ${presentRows.map((student) => `<tr><td>${student.name}</td><td>${student.status}</td><td>${student.joinedAt || '-'}</td></tr>`).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const MeetingControl: React.FC<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    variant?: 'outline' | 'danger';
  }> = ({ label, icon, onClick, disabled, variant = 'outline' }) => (
    <Button
      title={label}
      aria-label={label}
      variant={variant}
      className="group relative h-10 w-10 justify-center px-0"
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      <span className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100 dark:bg-white dark:text-zinc-900">
        {label}
      </span>
    </Button>
  );

  const relativeTime = (iso: string) => {
    const diffMs = Math.max(0, Date.now() - new Date(iso).getTime());
    const sec = Math.floor(diffMs / 1000);
    if (sec < 5) return 'just now';
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const days = Math.floor(hr / 24);
    return `${days}d ago`;
  };

  const customClassFormValid = Boolean(
    customClassForm.streamId &&
    customClassForm.subjectId &&
    customClassForm.startAt &&
    customClassForm.endAt &&
    new Date(customClassForm.endAt).getTime() > new Date(customClassForm.startAt).getTime()
  );

  if (loading) {
    return <div className="py-14 text-sm font-semibold text-zinc-500">Loading My Classroom...</div>;
  }

  return (
    <div className="space-y-6">
      <style>{`
        @keyframes liveFeedPopIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .live-feed-pop {
          animation: liveFeedPopIn 220ms ease-out;
        }
      `}</style>
      <Card className="border-none bg-white dark:bg-zinc-900">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-zinc-400">My Classroom</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Teacher studio</h1>
            <p className="mt-1 text-xs text-zinc-500">{now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              title="Start Live Class"
              variant="primary"
              onClick={() => {
                setIsStartClassModalOpen(true);
                setStartClassMode('CHOICE');
              }}
              disabled={!!orchestrationForSelected}
            >
              <Sparkles size={14} /> Start Live Class
            </Button>
            <Button
              title="Upload"
              variant="outline"
              onClick={() => {
                setWorkspaceMode('LIBRARY');
                setActiveTab('RECORDINGS');
                setLibraryTab('VIDEOS');
              }}
            >
              <Upload size={14} /> Upload
            </Button>
            <Button title="My Timetable" variant="outline" onClick={() => navigate('/timetable')}>
              <CalendarDays size={14} /> My Timetable
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <Button title="Live Class" variant={workspaceMode === 'LIVE' ? 'primary' : 'outline'} onClick={() => setWorkspaceMode('LIVE')}>
            Live Class
          </Button>
          <Button title="Recordings & Uploads" variant={workspaceMode === 'LIBRARY' ? 'primary' : 'outline'} onClick={() => setWorkspaceMode('LIBRARY')}>
            Recordings & Uploads
          </Button>
          {workspaceMode === 'LIBRARY' && (
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Button title="Videos" variant={libraryTab === 'VIDEOS' ? 'primary' : 'outline'} onClick={() => setLibraryTab('VIDEOS')}>Videos</Button>
              <Button title="Notes & PDFs" variant={libraryTab === 'NOTES' ? 'primary' : 'outline'} onClick={() => setLibraryTab('NOTES')}>Notes & PDFs</Button>
              <Button title="Assignments" variant={libraryTab === 'ASSIGNMENTS' ? 'primary' : 'outline'} onClick={() => setLibraryTab('ASSIGNMENTS')}>Assignments</Button>
            </div>
          )}
        </div>
      </Card>

      {closedSummary && (
        <Card className="border-zinc-200 bg-zinc-50 dark:bg-zinc-900/60">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Session summary</p>
              <p className="text-sm font-semibold mt-1">{closedSummary.sessionTitle} • {closedSummary.sessionLabel}</p>
              <p className="text-xs text-zinc-500 mt-1">Closed {new Date(closedSummary.closedAt).toLocaleString('en-GB')}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={downloadPresentList}>Download present list</Button>
              <Button variant="outline" onClick={printPresentList}>Print attendance</Button>
              <Button variant="outline" onClick={() => setClosedSummary(null)}>Hide summary</Button>
            </div>
          </div>
        </Card>
      )}

      <Modal
        isOpen={isStartClassModalOpen}
        onClose={() => {
          setIsStartClassModalOpen(false);
          setStartClassMode('CHOICE');
        }}
        title="Start Class"
      >
        {startClassMode === 'CHOICE' ? (
          <div className="space-y-3">
            <Button
              variant="primary"
              className="w-full justify-center py-2"
              onClick={() => setStartClassMode('CUSTOM')}
            >
              Start a custom class
            </Button>
            <Button
              variant="outline"
              className="w-full justify-center py-2"
              disabled={!selectedSession}
              onClick={() => startSessionTemplate().catch((err) => console.error('Failed to start from template', err))}
            >
              Start from template
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Class (stream)</label>
                      <select
                        value={customClassForm.streamId}
                        onChange={(e) => setCustomClassForm((prev: typeof customClassForm) => ({ ...prev, streamId: e.target.value }))}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <option value="">Select class and stream</option>
                {teacherStreams.map((stream: any) => (
                  <option key={stream.id} value={stream.id}>{`${stream.class?.name || 'Form'} ${stream.name || ''}`.trim()}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Subject</label>
              <select
                value={customClassForm.subjectId}
                onChange={(e) => setCustomClassForm((prev: typeof customClassForm) => ({ ...prev, subjectId: e.target.value }))}
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <option value="">Select subject</option>
                {subjects.map((subject: any) => (
                  <option key={subject.id} value={subject.id}>{subject.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Today's topic (optional)</label>
              <input
                value={customClassForm.topic}
                onChange={(e) => setCustomClassForm((prev: typeof customClassForm) => ({ ...prev, topic: e.target.value }))}
                placeholder="Enter topic"
                className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">Start date & time</label>
                <input
                  type="datetime-local"
                  value={customClassForm.startAt}
                  onChange={(e) => setCustomClassForm((prev: typeof customClassForm) => ({ ...prev, startAt: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-300">End date & time</label>
                <input
                  type="datetime-local"
                  value={customClassForm.endAt}
                  onChange={(e) => setCustomClassForm((prev: typeof customClassForm) => ({ ...prev, endAt: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setStartClassMode('CHOICE')}>Back</Button>
              <Button
                variant="outline"
                disabled={!customClassFormValid}
                onClick={() => handleSaveCustomForLater().catch((err) => console.error('Failed to save class for later', err))}
              >
                Save for later
              </Button>
              <Button
                variant="primary"
                disabled={!customClassFormValid}
                onClick={() => handleStartNowCustom().catch((err) => console.error('Failed to start custom class', err))}
              >
                Start now
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {workspaceMode === 'LIVE' ? (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <div className="xl:col-span-9">
            <Card
              title={selectedSession ? `${selectedSession.subject} live room` : 'No live class available.'}
              subtitle={selectedSession ? `${selectedSession.classLabel} • ${selectedSession.day} ${selectedSession.start}-${selectedSession.end}` : 'Choose a class or start one from the top bar.'}
              className="border-zinc-200 bg-white dark:bg-zinc-900"
            >
              <div className="rounded-[28px] border border-zinc-200 bg-zinc-50 p-5 text-zinc-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
                {orchestrationForSelected ? (
                  <div
                    ref={jitsiContainerRef}
                    className="flex aspect-video rounded-[28px] overflow-hidden border border-zinc-200 bg-black shadow-sm dark:border-zinc-800"
                    style={{ minHeight: '500px' }}
                  />
                ) : (
                  <div className="flex aspect-video items-center justify-center rounded-[28px] border border-zinc-200 bg-gradient-to-br from-white via-zinc-50 to-slate-100 text-center shadow-sm dark:border-zinc-800 dark:from-zinc-950 dark:via-zinc-950 dark:to-zinc-900">
                    <div>
                      <Video size={46} className="mx-auto text-zinc-400 dark:text-zinc-500" />
                      <p className="mt-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">No live class available</p>
                      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Start a live class from the top bar when you are ready.</p>
                    </div>
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900">
                  <MeetingControl label={micEnabled ? 'Mute microphone' : 'Unmute microphone'} icon={micEnabled ? <Mic size={16} /> : <MicOff size={16} />} onClick={() => setMicEnabled((prev) => !prev)} />
                  <MeetingControl label={cameraEnabled ? 'Turn camera off' : 'Turn camera on'} icon={cameraEnabled ? <Video size={16} /> : <VideoOff size={16} />} onClick={() => setCameraEnabled((prev) => !prev)} />
                  <MeetingControl label={livePaused ? 'Play' : 'Pause'} icon={livePaused ? <Play size={16} /> : <Pause size={16} />} onClick={() => setLivePaused((prev) => !prev)} />
                  <MeetingControl label="Save recording" icon={<Save size={16} />} onClick={handleSaveClassRecording} disabled={!orchestrationForSelected} />
                  <MeetingControl label="Share screen" icon={<Share2 size={16} />} onClick={() => addActivity(selectedSession?.id || 'none', 'SESSION_STARTED', 'Screen share started.')} disabled={!selectedSession} />
                  <MeetingControl label="Bookmark: important" icon={<Bookmark size={16} />} onClick={() => addMomentBookmark('IMPORTANT')} disabled={!orchestrationForSelected} />
                  <MeetingControl label="Bookmark: repeat this" icon={<Bookmark size={16} />} onClick={() => addMomentBookmark('REPEAT_THIS')} disabled={!orchestrationForSelected} />
                  <MeetingControl label="Bookmark: exam tip" icon={<Bookmark size={16} />} onClick={() => addMomentBookmark('EXAM_TIP')} disabled={!orchestrationForSelected} />
                  <MeetingControl label="Mark students" icon={<NotebookPen size={16} />} onClick={simulateStudentJoin} disabled={!selectedSession} />
                  <MeetingControl label="Clear spotlight" icon={<Eraser size={16} />} onClick={() => setSpotlight(null)} disabled={!selectedSession} />
                  <MeetingControl label="End class" icon={<X size={16} />} onClick={() => closeSessionAndArchive('MANUAL')} disabled={!orchestrationForSelected} variant="danger" />
                </div>
              </div>
            </Card>
          </div>

          <div className="xl:col-span-3">
            <Card title="Live room" subtitle="Chat and activity">
              <div className="space-y-4">
                <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">Catch-up and breakouts</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button variant="outline" className="h-8 px-2" onClick={() => generateCatchUpPack().catch((err) => console.error('Failed generating catch-up pack', err))}>
                      Generate catch-up pack
                    </Button>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min={1}
                      max={8}
                      value={breakoutCount}
                      onChange={(e) => setBreakoutCount(Math.max(1, Math.min(8, Number(e.target.value) || 1)))}
                      className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                      placeholder="Rooms"
                    />
                    <input
                      type="number"
                      min={1}
                      max={60}
                      value={breakoutMinutes}
                      onChange={(e) => setBreakoutMinutes(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                      className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                      placeholder="Minutes"
                    />
                  </div>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button variant="outline" className="h-8 px-2" onClick={() => startBreakoutRooms().catch((err) => console.error('Failed starting breakouts', err))}>
                      <Users size={12} /> Start breakouts
                    </Button>
                    <Button variant="outline" className="h-8 px-2" onClick={() => returnFromBreakouts().catch((err) => console.error('Failed ending breakouts', err))}>
                      Return all
                    </Button>
                  </div>

                  {breakoutRooms.filter((room) => room.isActive).length > 0 && (
                    <div className="mt-2 space-y-1">
                      {breakoutRooms.filter((room) => room.isActive).map((room) => (
                        <p key={room.id} className="text-[11px] text-zinc-500">
                          {room.roomLabel}: ends {new Date(room.endsAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="flex items-center justify-between gap-2">
                    <Button
                      title="Raise hand"
                      aria-label="Raise hand"
                      variant="outline"
                      className="group relative h-11 w-11 justify-center px-0"
                      onClick={() => raiseHandFromComposer().catch((err) => console.error('Failed to raise hand', err))}
                    >
                      <Hand size={18} />
                      <span className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition group-hover:opacity-100 dark:bg-white dark:text-zinc-900">
                        Raise hand
                      </span>
                    </Button>
                  </div>

                  <div className="mt-2 flex gap-2">
                    <input
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendChatMessage().catch((err) => console.error('Failed to send chat', err));
                        }
                      }}
                      className="h-10 flex-1 rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                      placeholder="Send a message to the class..."
                    />
                    <Button title="Send chat" aria-label="Send chat" variant="primary" className="h-10 w-10 justify-center px-0" onClick={() => sendChatMessage().catch((err) => console.error('Failed to send chat', err))} disabled={!chatMessage.trim()}>
                      <Send size={14} />
                    </Button>
                  </div>
                </div>

                <div>
                  <div className="mt-2 space-y-2">
                    {(() => {
                      const filtered = activityFeed.filter((item) => item.sessionId === selectedSession?.id);
                      console.log('🎨 Rendering activity feed:', { totalItems: activityFeed.length, filteredItems: filtered.length, selectedSessionId: selectedSession?.id });
                      if (filtered.length === 0) {
                        return <p className="text-xs text-zinc-400">No activity yet.</p>;
                      }
                      return filtered
                        .slice(0, 30)
                        .reverse()
                        .map((item) => (
                      <div key={item.id} className={`live-feed-pop rounded-2xl border p-3 shadow-sm ${item.type === 'CHAT_MESSAGE' || item.type === 'HAND_RAISED' ? 'border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/50' : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'}`}>
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                            {(item.actorName || 'T').slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm leading-5 text-zinc-700 dark:text-zinc-200">
                              <span className="font-semibold text-zinc-800 dark:text-zinc-100">{item.actorName || 'Teacher'}:</span> {item.message}
                            </p>
                            <p className="mt-1 text-[11px] text-zinc-500">{relativeTime(item.createdAt)}</p>
                            {item.type === 'HAND_RAISED' && item.payload?.studentId && (
                              <div className="mt-2">
                                <Button
                                  title="Accept hand"
                                  aria-label="Accept hand"
                                  variant="outline"
                                  className="h-7 px-2"
                                  onClick={() => acceptRaisedHand(item.payload.studentId, item.payload.studentName || 'Student').catch((err) => console.error('Failed to accept hand', err))}
                                >
                                  <Check size={12} /> Accept
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                        ));
                    })()}
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {libraryTab === 'VIDEOS' && (
            <Card title="Video recordings" subtitle="Stored recordings from class sessions" icon={Video}>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800">
                  <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload a Video'}
                  <input type="file" accept="video/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleRecordingUpload(file); e.currentTarget.value = ''; }} />
                </label>
                <Button variant="outline" onClick={() => setWorkspaceMode('LIVE')}>Back to live</Button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {recordings.map((item) => (
                  <div key={item.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:bg-zinc-900">
                    <div className="flex aspect-video items-center justify-center bg-zinc-950 text-zinc-100">
                      <div className="text-center">
                        <Video size={20} className="mx-auto text-zinc-300" />
                        <p className="mt-2 text-xs text-zinc-300">Video thumbnail</p>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-xs text-zinc-500">Uploaded {new Date(item.recorded_at || item.at).toLocaleString('en-GB')}</p>
                      <p className="mt-1 text-xs text-zinc-500">Teacher: {user?.full_name || 'Teacher'} • Students joined: {presentCount + lateCount}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {libraryTab === 'NOTES' && (
            <Card title="Notes & PDFs" subtitle="Readable class notes and downloadable PDFs" icon={FileText}>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800">
                  <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload PDF Note'}
                  <input type="file" accept="application/pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleNotePdfUpload(file); e.currentTarget.value = ''; }} />
                </label>
                <Button variant="outline" onClick={async () => {
                  if (!selectedSession || !user?.school_id) return;
                  const { data } = await supabase.from('classroom_notes').insert({ school_id: user.school_id, session_id: selectedSession.id, teacher_id: user.id, title: `${selectedSession.subject} Text Note`, note_type: 'TEXT', content: 'Text note from classroom panel.' }).select('*').single();
                  if (data) setNotes((prev) => [data, ...prev]);
                }}><FileText size={14} /> Add Text Note</Button>
                <Button variant="outline" onClick={() => setWorkspaceMode('LIVE')}>Back to live</Button>
              </div>
              <div className="space-y-3">
                {notes.map((item) => (
                  <div key={item.id} className="rounded-xl border border-zinc-200 p-3">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="mt-1 text-xs text-zinc-500">{item.note_type || item.type} • {item.file_url ? 'PDF upload' : 'Text note'} {item.archived ? '• Archived' : ''}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {libraryTab === 'ASSIGNMENTS' && (
            <Card title="Assignments" subtitle="Holiday PDF tasks and in-app questions" icon={Sparkles}>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800">
                  <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload Assignment PDF'}
                  <input type="file" accept="application/pdf" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleAssignmentFileUpload(file); e.currentTarget.value = ''; }} />
                </label>
                <Button variant="outline" onClick={() => setWorkspaceMode('LIVE')}>Back to live</Button>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 p-4 space-y-3">
                  <p className="text-sm font-semibold">Holiday assignment upload</p>
                  <p className="text-xs text-zinc-500">Upload PDF homework or revision packs for students to print or complete later.</p>
                  <div className="space-y-2">
                    {assignmentFiles.length === 0 && <p className="text-xs text-zinc-400">No attached assignment files yet.</p>}
                    {assignmentFiles.map((f) => (
                      <div key={f.id} className="rounded-lg border border-zinc-200 p-3">
                        <p className="text-sm font-medium">{f.title}</p>
                        <p className="mt-1 text-xs text-zinc-500">Uploaded {new Date(f.uploaded_at || f.created_at).toLocaleString('en-GB')}</p>
                        {f.file_url && <a href={f.file_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-emerald-700">Open file</a>}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-200 p-4 space-y-3">
                  <p className="text-sm font-semibold">In-app assignment builder</p>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <select value={questionType} onChange={(e) => setQuestionType(e.target.value as 'MCQ' | 'SHORT' | 'STRUCTURED')} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs">
                      <option value="MCQ">Multiple Choice</option>
                      <option value="SHORT">Short Answer</option>
                      <option value="STRUCTURED">Structured Question</option>
                    </select>
                    <input value={questionConcept} onChange={(e) => setQuestionConcept(e.target.value)} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs" placeholder="Concept e.g. Algebra" />
                  </div>
                  <input value={questionPrompt} onChange={(e) => setQuestionPrompt(e.target.value)} className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-xs" placeholder="Question prompt" />
                  {questionType === 'MCQ' && (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      <input value={mcqOptions} onChange={(e) => setMcqOptions(e.target.value)} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs" placeholder="Options separated by |" />
                      <input value={mcqAnswerKey} onChange={(e) => setMcqAnswerKey(e.target.value)} className="rounded-lg border border-zinc-200 px-3 py-2 text-xs" placeholder="Correct option" />
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <Button onClick={addQuestion}>Publish Question</Button>
                    <Button variant="outline" onClick={() => questions[0] && simulateStudentSubmission(questions[0])}>Simulate Submission</Button>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-zinc-200 p-4 space-y-2">
                <p className="text-sm font-semibold">Questions in app</p>
                {questions.length === 0 && <p className="text-xs text-zinc-400">No in-app questions yet.</p>}
                {questions.map((q) => (
                  <div key={q.id} className="rounded-lg border border-zinc-200 p-3">
                    <p className="text-xs text-zinc-500">{q.type} • {q.concept}</p>
                    <p className="mt-0.5 text-sm font-medium">{q.prompt}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
