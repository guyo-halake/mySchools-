import React, { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../utils/utils';
import * as tus from 'tus-js-client';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays,
  Video,
  FileText,
  BookOpen,
  Upload,
  CircleDot,
  Hand,
  Link2,
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
  Users,
  Plus,
  Trash2,
  Clock,
  Download,
  Monitor,
  PhoneOff,
  Loader2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { supabase, supabaseAnonKey, supabaseUrl } from '../lib/supabase';
import { Button, Card, Badge, Modal } from '../components/UI';

type TabKey = 'LIVE' | 'RECORDINGS' | 'NOTES' | 'ASSIGNMENTS';
type LibraryTab = 'ALL' | 'RECORDINGS_VIDEOS' | 'NOTES_PDFS' | 'ARCHIVE';
type SessionStatus = 'LIVE' | 'UPCOMING' | 'COMPLETED';
type AttendanceStatus = 'PRESENT' | 'LATE' | 'DISCONNECTED';

type ContentFeedItem = {
  id: string;
  title: string;
  type: 'RECORDING' | 'NOTE' | 'ASSIGNMENT' | 'HOLIDAY_WORK' | 'SHARED_FILE' | 'LINK';
  postedAt: string;
  dueAt?: string;
  fileUrl?: string;
  preview?: string;
  archived?: boolean;
};

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
  actorId?: string | null;
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

type UploadChoice = 'VIDEO' | 'YOUTUBE' | 'PDF' | 'PACK' | 'LINK';

type DraftResource = {
  id: string;
  mode: UploadChoice;
  title: string;
  file?: File;
  url?: string;
  addedAt: string;
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
const DIRECT_UPLOAD_MAX_BYTES = 45 * 1024 * 1024;
const ABSOLUTE_UPLOAD_MAX_BYTES = 2 * 1024 * 1024 * 1024;
const SUPABASE_STORAGE_RESUMABLE_ENDPOINT = `${supabaseUrl.replace('.supabase.co', '.storage.supabase.co')}/storage/v1/upload/resumable`;
const SUPABASE_ANON_KEY = supabaseAnonKey;

const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
};

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
  const [classes, setClasses] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [assignmentRows, setAssignmentRows] = useState<any[]>([]);
  const [sessionClassLabelByStream, setSessionClassLabelByStream] = useState<Record<string, string>>({});

  const [activeTab, setActiveTab] = useState<TabKey>('LIVE');
  const [workspaceMode, setWorkspaceMode] = useState<'LIVE' | 'LIBRARY'>('LIVE');
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('ALL');
  const [livePaused, setLivePaused] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState('');

  const [recordings, setRecordings] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignmentFiles, setAssignmentFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('Ready');
  const [uploadChoice, setUploadChoice] = useState<UploadChoice | ''>('');
  const [uploadName, setUploadName] = useState('');
  const [uploadAudience, setUploadAudience] = useState<'WHOLE_CLASS' | 'SUBJECT_STUDENTS'>('WHOLE_CLASS');
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [useMyClassesOnly, setUseMyClassesOnly] = useState(true);
  const [isSelectClassOpen, setIsSelectClassOpen] = useState(false);
  const [draftResources, setDraftResources] = useState<DraftResource[]>([]);
  const [packTitle, setPackTitle] = useState('');
  const [targetClassId, setTargetClassId] = useState('');
  const [targetStreamId, setTargetStreamId] = useState('');
  const [targetSubjectId, setTargetSubjectId] = useState('');
  const [targetStudentIds, setTargetStudentIds] = useState<string[]>([]);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isMySubjectsModalOpen, setIsMySubjectsModalOpen] = useState(false);
  const [linkResourceTitle, setLinkResourceTitle] = useState('');
  const [linkResourceUrl, setLinkResourceUrl] = useState('');
  const [linkResourceKind, setLinkResourceKind] = useState<'YOUTUBE' | 'EXTERNAL'>('EXTERNAL');

  const [questionType, setQuestionType] = useState<'MCQ' | 'SHORT' | 'STRUCTURED'>('MCQ');
  const [questionConcept, setQuestionConcept] = useState('General');
  const [questionPrompt, setQuestionPrompt] = useState('');
  const [mcqOptions, setMcqOptions] = useState('A|B|C|D');
  const [mcqAnswerKey, setMcqAnswerKey] = useState('A');
  const [chatMessage, setChatMessage] = useState('');
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [isStartClassModalOpen, setIsStartClassModalOpen] = useState(false);
  const [startClassMode, setStartClassMode] = useState<'CHOICE' | 'CUSTOM' | 'SCHEDULE_DETAILS'>('CHOICE');
  const [customSessions, setCustomSessions] = useState<SessionItem[]>([]);
  const [customClassForm, setCustomClassForm] = useState({
    streamId: '',
    subjectId: '',
    topic: '',
    startAt: '',
    endAt: '',
    reminderEnabled: false,
    scheduledDate: '',
    scheduledTime: ''
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
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [lowDataMode, setLowDataMode] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [starredResources, setStarredResources] = useState<string[]>([]);
  const [sessionDurationSec, setSessionDurationSec] = useState(0);
  const [activeInteractionTab, setActiveInteractionTab] = useState<'CHAT' | 'USERS' | 'FEED' | 'TASKS'>('CHAT');
  const [isStartingClass, setIsStartingClass] = useState(false);
  const [startingClassText, setStartingClassText] = useState('');
  const [incomingClassSignal, setIncomingClassSignal] = useState<SessionItem | null>(null);
  const [studentScheduledSessions, setStudentScheduledSessions] = useState<SessionItem[]>([]);

  const classroomChannelRef = useRef<any>(null);
  const jitsiContainerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const recordingInputRef = useRef<HTMLInputElement>(null);
  const studioUploadInputRef = useRef<HTMLInputElement>(null);
  const notesInputRef = useRef<HTMLInputElement>(null);
  const assignmentInputRef = useRef<HTMLInputElement>(null);
  const sharedInputRef = useRef<HTMLInputElement>(null);
  const uploadScopeHydratedRef = useRef(false);

  const uploadScopeStorageKey = useMemo(() => {
    if (!user?.school_id || !user?.id) return '';
    return `myclassroom.uploadScope.v1:${user.school_id}:${user.id}`;
  }, [user?.school_id, user?.id]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(timer);
  }, []);

  // Fetch upcoming scheduled sessions for students so the Radar HUD can show them
  useEffect(() => {
    const streamId = targetStreamId;
    if (!user?.school_id || !streamId) return;
    // Only run for students — teachers use their own orderedSessions list
    if (user.role !== 'STUDENT' && user.role !== 'PARENT') return;

    const fetchScheduled = async () => {
      const { data, error } = await supabase
        .from('classroom_sessions')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('stream_id', streamId)
        .in('status', ['SCHEDULED', 'UPCOMING', 'LIVE'])
        .order('scheduled_start_at', { ascending: true })
        .limit(10);

      if (error || !data) return;

      setStudentScheduledSessions(data.map((d: any) => ({
        id: d.id,
        day: d.day_name || 'Today',
        start: d.start_time || '08:00',
        end: d.end_time || '08:40',
        subject: d.title || 'Upcoming Class',
        teacher: d.teacher_name || 'Teacher',
        classLabel: d.class_label || '',
        streamId: d.stream_id || undefined,
        subjectId: d.subject_id || undefined,
        topic: d.topic || undefined,
        scheduledStartAt: d.scheduled_start_at || undefined,
        scheduledEndAt: d.scheduled_end_at || undefined,
        status: d.status as any,
        source: 'CUSTOM' as const
      })));
    };

    fetchScheduled();
    const interval = setInterval(fetchScheduled, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [user?.school_id, user?.role, targetStreamId]);

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
        const [
          schoolStreams,
          schoolSubjects,
          schoolStudents,
          schoolClassesResult,
          sessionClassLabelsResult,
          physicalClassLabelsResult,
          liveClassLabelsResult
        ] = await Promise.all([
          api.getStreams(user.school_id),
          api.getSubjects(user.school_id),
          api.getStudents(user.school_id),
          supabase
            .from('classes')
            .select('id, name, level')
            .eq('school_id', user.school_id),
          supabase
            .from('classroom_sessions')
            .select('stream_id, class_label')
            .eq('school_id', user.school_id)
            .not('stream_id', 'is', null)
            .not('class_label', 'is', null),
          supabase
            .from('physical_timetable_entries')
            .select('stream_id, class_label')
            .eq('school_id', user.school_id)
            .not('stream_id', 'is', null)
            .not('class_label', 'is', null),
          supabase
            .from('live_timetable_entries')
            .select('stream_id, class_label')
            .eq('school_id', user.school_id)
            .not('stream_id', 'is', null)
            .not('class_label', 'is', null)
        ]);

        if (schoolClassesResult.error) throw schoolClassesResult.error;

        setStreams(schoolStreams || []);
        setClasses(schoolClassesResult.data || []);
        setSubjects(schoolSubjects || []);
        setStudents(schoolStudents || []);

        const byStream: Record<string, string> = {};
        const allLabelRows = [
          ...(sessionClassLabelsResult.error ? [] : (sessionClassLabelsResult.data || [])),
          ...(physicalClassLabelsResult.error ? [] : (physicalClassLabelsResult.data || [])),
          ...(liveClassLabelsResult.error ? [] : (liveClassLabelsResult.data || []))
        ];

        for (const row of allLabelRows) {
          if (!row?.stream_id || !row?.class_label) continue;
          if (!byStream[row.stream_id]) {
            byStream[row.stream_id] = String(row.class_label);
          }
        }
        setSessionClassLabelByStream(byStream);

        if (user.role === 'TEACHER') {
          const { data } = await supabase
            .from('teacher_subject_stream_assignments')
            .select('stream_id, class_id, subject_id')
            .eq('school_id', user.school_id)
            .eq('teacher_id', user.id)
            .eq('active', true);
          setAssignmentRows(data || []);
        } else if (user.role === 'STUDENT' || user.role === 'PARENT') {
          // Find student stream
          let sId = user.id;
          if (user.role === 'PARENT') {
            const { data: linked } = await supabase.from('students').select('id').eq('parent_id', user.id).limit(1).maybeSingle();
            if (linked) sId = linked.id;
          }
          
          const { data: sData } = await supabase.from('students').select('stream_id').eq('id', sId).maybeSingle();
          if (sData?.stream_id) {
             setTargetStreamId(sData.stream_id);
             // Also find class for this stream
             const streamObj = schoolStreams.find(s => s.id === sData.stream_id);
             if (streamObj) setTargetClassId(streamObj.class_id);
          }
        }

        let customQuery = supabase
          .from('classroom_sessions')
          .select('*')
          .eq('school_id', user.school_id)
          .in('status', ['SCHEDULED', 'LIVE']);

        if (user.role === 'TEACHER') {
          customQuery = customQuery.eq('teacher_id', user.id);
        } else if (targetStreamId) {
          customQuery = customQuery.eq('stream_id', targetStreamId);
        }

        const { data: dbCustomSessions } = await customQuery.order('scheduled_start_at', { ascending: true });

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
    
    // First priority: assigned streams
    const streamIds = new Set((assignmentRows || []).map((row: any) => row.stream_id).filter(Boolean));
    if (streamIds.size > 0) {
      const scoped = streams.filter((s: any) => streamIds.has(s.id));
      if (scoped.length > 0) return scoped;
    }

    // Second priority: class teacher streams
    const classTeacherStreams = streams.filter((s: any) => s.class_teacher_id === user.id);
    if (classTeacherStreams.length > 0) return classTeacherStreams;

    // Fallback: All streams (for admins, principals, or teachers switching classes)
    return streams;
  }, [assignmentRows, streams, user]);

  const teacherSubjects = useMemo(() => {
    const subjectIds = new Set((assignmentRows || []).map((row: any) => row.subject_id).filter(Boolean));
    if (subjectIds.size === 0) return subjects; // Show all subjects instead of just 6
    return subjects.filter((sub: any) => subjectIds.has(sub.id));
  }, [assignmentRows, subjects]);

  const uploadAudienceSubjects = useMemo(() => {
    return subjects
      .filter((sub: any) => sub?.active !== false)
      .filter((sub: any) => sub?.is_compulsory !== true)
      .sort((a: any, b: any) => String(a?.name || '').localeCompare(String(b?.name || '')));
  }, [subjects]);

  const classById = useMemo(() => {
    const classMap = new Map<string, any>();

    (Array.isArray(classes) ? classes : []).forEach((classRow: any) => {
      if (!classRow?.id) return;
      classMap.set(classRow.id, classRow);
    });

    streams.forEach((stream: any) => {
      const classId = stream.class_id || stream.class?.id;
      if (!classId) return;

      const existing = classMap.get(classId);
      const existingName = String(existing?.name || '').trim().toLowerCase();
      const candidate = stream.class || null;
      const candidateName = String(candidate?.name || '').trim().toLowerCase();

      if (!existing) {
        classMap.set(classId, candidate || { id: classId, level: stream.class?.level });
        return;
      }

      if ((!existingName || existingName === 'class') && candidate && candidateName && candidateName !== 'class') {
        classMap.set(classId, candidate);
      }
    });

    return classMap;
  }, [classes, streams]);

  const resolveClassForStream = (stream: any) => {
    const classId = stream?.class_id || stream?.class?.id;
    if (!classId) return null;
    const resolved = classById.get(classId) || stream?.class || null;
    if (!resolved) return null;

    const normalizedName = String(resolved.name || '').trim();
    const hasLevel = typeof resolved.level === 'number' && Number.isFinite(resolved.level);
    if (!normalizedName && !hasLevel) return null;

    return {
      ...resolved,
      id: resolved.id || classId
    };
  };

  const formatClassName = (c: any) => {
    if (!c) return '';
    const normalizedName = String(c.name || '').trim();
    if (normalizedName && normalizedName.toLowerCase() !== 'class') return normalizedName;
    const levelNumber = Number(c.level);
    if (Number.isFinite(levelNumber) && levelNumber > 0) return `Form ${levelNumber}`;
    return '';
  };

  const formatStreamName = (s: any) => {
    if (!s) return '';
    const name = String(s.name || '').trim();
    return name || '';
  };

  const fallbackClassNameFromSessionLabel = (stream: any) => {
    const streamId = String(stream?.id || '');
    const raw = String(sessionClassLabelByStream[streamId] || '').trim();
    const streamName = String(stream?.name || '').trim();
    if (!raw) return '';
    if (!streamName) return raw;

    const escaped = streamName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tailPattern = new RegExp(`\\s*[-]?\\s*${escaped}$`, 'i');
    const cleaned = raw.replace(tailPattern, '').trim();
    return cleaned || raw;
  };

  const selectableStreams = useMemo(() => {
    const teacherScoped = Array.isArray(teacherStreams) ? teacherStreams : [];
    const schoolWide = Array.isArray(streams) ? streams : [];
    const source = useMyClassesOnly
      ? (teacherScoped.length > 0 ? teacherScoped : schoolWide)
      : schoolWide;
    return source;
  }, [useMyClassesOnly, teacherStreams, streams]);

  const classOptions = useMemo(() => {
    const unique = new Map<string, any>();
    selectableStreams.forEach((stream: any) => {
      const resolvedClass = resolveClassForStream(stream);
      const classId = resolvedClass?.id || stream?.class_id || stream?.class?.id;
      if (classId && !unique.has(classId)) {
        unique.set(classId, resolvedClass || { id: classId, level: stream?.class?.level });
      }
    });
    return Array.from(unique.values());
  }, [classById, selectableStreams]);

  const scopedStreams = useMemo(() => {
    if (!targetClassId) return selectableStreams;
    return selectableStreams.filter((stream: any) => (stream.class_id || stream.class?.id) === targetClassId);
  }, [targetClassId, selectableStreams]);

  useEffect(() => {
    uploadScopeHydratedRef.current = false;
  }, [uploadScopeStorageKey]);

  useEffect(() => {
    if (loading || !uploadScopeStorageKey || uploadScopeHydratedRef.current) return;

    try {
      const raw = localStorage.getItem(uploadScopeStorageKey);
      if (!raw) {
        uploadScopeHydratedRef.current = true;
        return;
      }

      const saved = JSON.parse(raw) as {
        useMyClassesOnly?: boolean;
        uploadAudience?: 'WHOLE_CLASS' | 'SUBJECT_STUDENTS';
        targetClassId?: string;
        targetStreamId?: string;
        targetSubjectId?: string;
      };

      if (typeof saved.useMyClassesOnly === 'boolean') {
        setUseMyClassesOnly(saved.useMyClassesOnly);
      }

      if (saved.uploadAudience === 'WHOLE_CLASS' || saved.uploadAudience === 'SUBJECT_STUDENTS') {
        setUploadAudience(saved.uploadAudience);
      }

      if (saved.targetClassId && classOptions.some((c: any) => c.id === saved.targetClassId)) {
        setTargetClassId(saved.targetClassId);
      }

      if (saved.targetStreamId && selectableStreams.some((s: any) => s.id === saved.targetStreamId)) {
        setTargetStreamId(saved.targetStreamId);
      }

      if (saved.targetSubjectId && uploadAudienceSubjects.some((s: any) => s.id === saved.targetSubjectId)) {
        setTargetSubjectId(saved.targetSubjectId);
      }
    } catch (error) {
      console.warn('Failed to restore MyClassroom upload scope', error);
    } finally {
      uploadScopeHydratedRef.current = true;
    }
  }, [loading, uploadScopeStorageKey, classOptions, selectableStreams, uploadAudienceSubjects]);

  useEffect(() => {
    if (!uploadScopeStorageKey || !uploadScopeHydratedRef.current) return;

    try {
      localStorage.setItem(uploadScopeStorageKey, JSON.stringify({
        useMyClassesOnly,
        uploadAudience,
        targetClassId,
        targetStreamId,
        targetSubjectId
      }));
    } catch (error) {
      console.warn('Failed to persist MyClassroom upload scope', error);
    }
  }, [
    uploadScopeStorageKey,
    useMyClassesOnly,
    uploadAudience,
    targetClassId,
    targetStreamId,
    targetSubjectId
  ]);

  useEffect(() => {
    if (loading) return;

    const unresolved = selectableStreams
      .map((stream: any) => {
        const classId = stream?.class_id || stream?.class?.id || null;
        const resolved = resolveClassForStream(stream);
        const fromSession = fallbackClassNameFromSessionLabel(stream);
        if (resolved || fromSession) return null;

        let reason = 'unknown';
        if (!classId) reason = 'stream has no class_id';
        else if (!classById.get(classId) && !stream?.class) reason = 'class join missing and classes map has no class_id';
        else reason = 'class exists but has empty name/level';

        return {
          stream_id: stream?.id || null,
          stream_name: stream?.name || null,
          class_id: classId,
          reason
        };
      })
      .filter(Boolean);

    console.group('[MyClassroom Debug] Class/Stream Dropdown Diagnostics');
    console.info('Summary', {
      schoolId: user?.school_id || null,
      streamsLoaded: streams.length,
      teacherStreams: teacherStreams.length,
      selectableStreams: selectableStreams.length,
      classesLoaded: classes.length,
      classOptions: classOptions.length,
      sessionClassLabels: Object.keys(sessionClassLabelByStream).length,
      unresolvedStreams: unresolved.length,
      useMyClassesOnly,
      targetClassId,
      targetStreamId
    });

    if (classes.length === 0 && streams.length > 0) {
      console.error('[MyClassroom Debug] Classes list is empty while streams exist. Possible RLS/policy issue or classes query returned no rows.');
    }

    if (classOptions.length === 0 && selectableStreams.length > 0) {
      console.error('[MyClassroom Debug] Class options are empty even though streams exist. Dropdown will look broken.');
    }

    if (unresolved.length > 0) {
      console.error('[MyClassroom Debug] Streams missing form/class resolution:', unresolved);
    } else {
      console.info('[MyClassroom Debug] All selectable streams resolved to class/form labels.');
    }

    console.groupEnd();
  }, [
    loading,
    user?.school_id,
    streams,
    classes,
    teacherStreams,
    selectableStreams,
    classOptions,
    sessionClassLabelByStream,
    targetClassId,
    targetStreamId,
    useMyClassesOnly,
    classById
  ]);

  useEffect(() => {
    if (targetStreamId && !scopedStreams.some((stream: any) => stream.id === targetStreamId)) {
      setTargetStreamId('');
      setTargetStudentIds([]);
    }
  }, [scopedStreams, targetStreamId]);

  useEffect(() => {
    if (targetStreamId && !selectableStreams.some((stream: any) => stream.id === targetStreamId)) {
      setTargetClassId('');
      setTargetStreamId('');
      setTargetStudentIds([]);
    }
  }, [selectableStreams, targetStreamId]);

  useEffect(() => {
    if (!targetSubjectId && teacherSubjects[0]?.id) {
      setTargetSubjectId(teacherSubjects[0].id);
    }
  }, [targetSubjectId, teacherSubjects]);

  useEffect(() => {
    if (!uploadAudienceSubjects.length) {
      if (targetSubjectId) setTargetSubjectId('');
      return;
    }
    if (!targetSubjectId || !uploadAudienceSubjects.some((subject: any) => subject.id === targetSubjectId)) {
      setTargetSubjectId(uploadAudienceSubjects[0].id);
    }
  }, [targetSubjectId, uploadAudienceSubjects]);

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
    const stableTeacherStreams = [...teacherStreams].sort((a: any, b: any) => String(a?.id || '').localeCompare(String(b?.id || '')));
    const stableTeacherSubjects = [...teacherSubjects].sort((a: any, b: any) => String(a?.id || '').localeCompare(String(b?.id || '')));

    let index = 0;
    for (const stream of stableTeacherStreams) {
      for (const subject of stableTeacherSubjects) {
        if (index >= 20) break; // Increased cap but don't return early
        const day = DAYS[index % DAYS.length];
        const [start, end] = SLOT_PAIRS[Math.floor(index / DAYS.length) % SLOT_PAIRS.length];

        list.push({
          id: `${stream.id}-${subject.id}-${index}`,
          day,
          start,
          end,
          subject: subject.name,
          teacher: user?.full_name || 'Teacher',
          classLabel: `${formatClassName(resolveClassForStream(stream))} ${formatStreamName(stream)}`.trim() || 'Unassigned stream',
          streamId: stream.id,
          subjectId: subject.id,
          source: 'TIMETABLE'
        });

        index += 1;
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
  }, [classById, customSessions, now, teacherStreams, teacherSubjects, user]);

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
    if (!orderedSessions.length) return;

    const currentSelectedExists = Boolean(selectedSessionId && orderedSessions.some((item) => item.id === selectedSessionId));
    if (currentSelectedExists) return;

    const scopedMatch = orderedSessions.find((session) => {
      if (!targetStreamId) return false;
      if (session.streamId !== targetStreamId) return false;
      if (targetSubjectId) return session.subjectId === targetSubjectId;
      return true;
    });

    setSelectedSessionId((scopedMatch || currentClass || nextClass || orderedSessions[0]).id);
  }, [selectedSessionId, orderedSessions, currentClass, nextClass, targetStreamId, targetSubjectId]);

  const selectedSession = orderedSessions.find((item) => item.id === selectedSessionId) || null;

  const loadSessionData = async (session: SessionItem) => {
    if (!user?.school_id) return;
    const sessionId = session.id;

    // Fetch the session data globally (ignore teacher_id filter here so students can see it)
    const { data: row, error: sessionError } = await supabase
      .from('classroom_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (sessionError) {
      console.error('❌ Data Engine: Session fetch failed', sessionError);
      return;
    }

    if (row && row.status === 'LIVE') {
       console.log('✅ Data Engine: Session is LIVE. Syncing orchestration...');
       setOrchestration({
          isActive: true,
          sessionId: row.id,
          roomUrl: row.room_url,
          startedAt: row.template_started_at,
          closesAt: row.auto_close_at
       });
       setWorkspaceMode('LIVE');
    } else {
       console.log('ℹ️ Data Engine: Session is not live yet.', row?.status);
       setOrchestration(null);
    }

    const effectiveStreamId = targetStreamId || session.streamId || null;
    const effectiveSubjectId = targetSubjectId || session.subjectId || null;

    let notesScopedPromise: any = Promise.resolve({ data: [], error: null });
    let recordingsScopedPromise: any = Promise.resolve({ data: [], error: null });

    if (effectiveStreamId) {
      let notesScopeQuery = supabase
        .from('classroom_notes')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('stream_id', effectiveStreamId);

      let recordingsScopeQuery = supabase
        .from('classroom_recordings')
        .select('*')
        .eq('school_id', user.school_id)
        .eq('stream_id', effectiveStreamId);

      if (effectiveSubjectId && !isStudent) {
        notesScopeQuery = notesScopeQuery.eq('subject_id', effectiveSubjectId);
        recordingsScopeQuery = recordingsScopeQuery.eq('subject_id', effectiveSubjectId);
      }

      notesScopedPromise = notesScopeQuery.order('updated_at', { ascending: false });
      recordingsScopedPromise = recordingsScopeQuery.order('recorded_at', { ascending: false });
    }

    const [
      attendanceRes,
      spotlightRes,
      notesSessionRes,
      recordingsSessionRes,
      notesScopedRes,
      recordingsScopedRes,
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
      notesScopedPromise,
      recordingsScopedPromise,
      supabase.from('classroom_assignments').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }),
      supabase.from('classroom_assignment_files').select('*').eq('session_id', sessionId).order('uploaded_at', { ascending: false }),
      supabase.from('classroom_activity_feed').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(50),
      supabase.from('classroom_moment_bookmarks').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(20),
      supabase.from('classroom_breakout_rooms').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(10)
    ]);

    if (attendanceRes.error || notesSessionRes.error || recordingsSessionRes.error || assignmentsRes.error || assignmentFilesRes.error || activityRes.error) {
      console.warn('Classroom persistence tables are unavailable; using local classroom fallback state.');

      const fallbackAttendance = seedStudents.map((student, idx) => ({
        id: student.id,
        name: student.name,
        status: (idx === 0 ? 'PRESENT' : idx % 3 === 0 ? 'LATE' : 'DISCONNECTED') as AttendanceStatus,
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

    const mergedNotes = new Map<string, any>();
    (notesSessionRes.data || []).forEach((row: any) => mergedNotes.set(row.id, row));
    (notesScopedRes.data || []).forEach((row: any) => mergedNotes.set(row.id, row));

    const mergedRecordings = new Map<string, any>();
    (recordingsSessionRes.data || []).forEach((row: any) => mergedRecordings.set(row.id, row));
    (recordingsScopedRes.data || []).forEach((row: any) => mergedRecordings.set(row.id, row));

    const sortedNotes = Array.from(mergedNotes.values()).sort((a: any, b: any) => {
      const aTime = new Date(a?.updated_at || a?.created_at || 0).getTime();
      const bTime = new Date(b?.updated_at || b?.created_at || 0).getTime();
      return bTime - aTime;
    });

    const sortedRecordings = Array.from(mergedRecordings.values()).sort((a: any, b: any) => {
      const aTime = new Date(a?.recorded_at || a?.created_at || 0).getTime();
      const bTime = new Date(b?.recorded_at || b?.created_at || 0).getTime();
      return bTime - aTime;
    });

    setSpotlightStudentId(spotlightRes.data?.student_id || null);
    setNotes(sortedNotes);
    setRecordings(sortedRecordings);

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

  };

  useEffect(() => {
    if (!selectedSession?.id) return;
    loadSessionData(selectedSession).catch((err) => console.error('Failed loading session data', err));
  }, [selectedSession?.id, targetStreamId, targetSubjectId]);

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
      actorId: data.actor_id,
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
        
        if (!payload) return;
        
        // Ensure student is looking at the same session
        if (selectedSession && payload.sessionId === selectedSession.id) {
           setActivityFeed((prev) => {
             if (prev.some((item) => item.id === payload.id)) return prev;
             return [payload as ActivityItem, ...prev].slice(0, 120);
           });

           if (payload.type === 'SESSION_STARTED' || payload.type === 'RESOURCE_SHARED' || payload.type === 'FEEDBACK_SENT') {
             loadSessionData(selectedSession).catch(err => console.error('Failed syncing live state', err));
           }
        } else if (payload.type === 'SESSION_STARTED' && (isStudent)) {
           // Handle classes starting when the student is not in that specific session tab
           // We signal the "Incoming Class" on the Standby Screen
           setIncomingClassSignal({
              id: payload.sessionId,
              subject: payload.payload?.subject || 'Class Starting',
              classLabel: payload.payload?.classLabel || 'Live Room',
              day: 'Today',
              start: 'Now',
              end: '',
              teacher: payload.actorName || 'Teacher',
              streamId: payload.payload?.streamId,
              subjectId: payload.payload?.subjectId,
              source: 'CUSTOM'
           });
        }
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
    if (file.size > ABSOLUTE_UPLOAD_MAX_BYTES) {
      throw new Error(`File too large (${formatBytes(file.size)}). Max upload is ${formatBytes(ABSOLUTE_UPLOAD_MAX_BYTES)}.`);
    }

    const safe = sanitizeFileName(file.name);
    const path = `${user.school_id}/${folder}/${Date.now()}-${safe}`;

    logPublishDiagnostics('storage:upload:start', {
      bucket: CLASSROOM_STORAGE_BUCKET,
      folder,
      path,
      fileName: file.name,
      fileType: file.type,
      fileSizeBytes: file.size,
      fileSizeLabel: formatBytes(file.size)
    });

    let uploadError: any = null;

    if (file.size <= DIRECT_UPLOAD_MAX_BYTES) {
      const result = await supabase
        .storage
        .from(CLASSROOM_STORAGE_BUCKET)
        .upload(path, file, { upsert: false });
      uploadError = result.error;
    } else {
      logPublishDiagnostics('storage:upload:resumable:start', {
        endpoint: SUPABASE_STORAGE_RESUMABLE_ENDPOINT,
        path,
        fileSizeBytes: file.size,
        fileSizeLabel: formatBytes(file.size)
      });

      if (!SUPABASE_ANON_KEY || !supabaseUrl) {
        throw new Error('Missing Supabase environment variables for resumable upload.');
      }

      uploadError = await new Promise<any>((resolve) => {
        const upload = new tus.Upload(file, {
          endpoint: SUPABASE_STORAGE_RESUMABLE_ENDPOINT,
          chunkSize: 6 * 1024 * 1024,
          retryDelays: [0, 2000, 5000, 10000],
          uploadDataDuringCreation: true,
          removeFingerprintOnSuccess: true,
          headers: {
            authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            apikey: SUPABASE_ANON_KEY,
            'x-upsert': 'false'
          },
          metadata: {
            bucketName: CLASSROOM_STORAGE_BUCKET,
            objectName: path,
            contentType: file.type || 'application/octet-stream',
            cacheControl: '3600'
          },
          onError: (error) => {
            resolve(error);
          },
          onSuccess: () => {
            resolve(null);
          }
        });

        upload.findPreviousUploads().then((previousUploads) => {
          if (previousUploads.length > 0) {
            upload.resumeFromPreviousUpload(previousUploads[0]);
          }
          upload.start();
        }).catch((error) => {
          resolve(error);
        });
      });
    }

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from(CLASSROOM_STORAGE_BUCKET).getPublicUrl(path);
    logPublishDiagnostics('storage:upload:done', {
      path,
      publicUrl: data.publicUrl
    });
    return { filePath: path, fileUrl: data.publicUrl };
  };

  const acceptForUploadChoice = (choice: UploadChoice | '') => {
    if (!choice) return '*';
    if (choice === 'VIDEO') return 'video/*';
    if (choice === 'PDF') return 'application/pdf,.pdf';
    if (choice === 'PACK') return 'video/*,application/pdf,.pdf';
    if (choice === 'LINK' || choice === 'YOUTUBE') return '*';
    return '*';
  };

  const isFileAllowedForChoice = (file: File, choice: UploadChoice | '') => {
    const mime = String(file.type || '').toLowerCase();
    const ext = String(file.name || '').toLowerCase().split('.').pop() || '';

    if (choice === 'VIDEO') {
      return mime.startsWith('video/');
    }
    if (choice === 'PDF') {
      return mime === 'application/pdf' || ext === 'pdf';
    }
    if (choice === 'PACK') {
      return mime.startsWith('video/') || mime === 'application/pdf' || ext === 'pdf';
    }
    if (choice === 'LINK' || choice === 'YOUTUBE') {
      return false;
    }
    return false;
  };

  const queueFileResource = (file: File) => {
    if (!uploadChoice) {
      setUploadStatus('Choose what to upload');
      return;
    }

    if (file.size > ABSOLUTE_UPLOAD_MAX_BYTES) {
      setUploadStatus(`File too large (${formatBytes(file.size)}). Max upload is ${formatBytes(ABSOLUTE_UPLOAD_MAX_BYTES)}.`);
      logPublishDiagnostics('blocked', {
        reason: 'file_too_large',
        fileName: file.name,
        fileType: file.type,
        fileSizeBytes: file.size,
        fileSizeLabel: formatBytes(file.size),
        maxAllowedBytes: ABSOLUTE_UPLOAD_MAX_BYTES,
        maxAllowedLabel: formatBytes(ABSOLUTE_UPLOAD_MAX_BYTES)
      });
      return;
    }

    if (file.size > DIRECT_UPLOAD_MAX_BYTES) {
      setUploadStatus(`Large file queued (${formatBytes(file.size)}). Resumable upload will be used on publish.`);
      logPublishDiagnostics('info', {
        reason: 'large_file_resumable_path',
        fileName: file.name,
        fileSizeBytes: file.size,
        fileSizeLabel: formatBytes(file.size),
        directLimitBytes: DIRECT_UPLOAD_MAX_BYTES,
        directLimitLabel: formatBytes(DIRECT_UPLOAD_MAX_BYTES)
      });
    }

    if (!isFileAllowedForChoice(file, uploadChoice)) {
      if (uploadChoice === 'VIDEO') {
        setUploadStatus('Only video files are allowed for Video upload');
      } else if (uploadChoice === 'PDF') {
        setUploadStatus('Only PDF files are allowed for PDF upload');
      } else if (uploadChoice === 'PACK') {
        setUploadStatus('Pack accepts only video or PDF files');
      } else {
        setUploadStatus('Invalid file for selected upload type');
      }
      return;
    }

    const mode: UploadChoice = uploadChoice;
    setDraftResources((prev) => [
      {
        id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        mode,
        title: uploadName.trim() || file.name,
        file,
        addedAt: new Date().toISOString()
      },
      ...prev
    ]);
    setUploadName('');
    setUploadStatus('Draft updated');
  };

  const removeDraftResource = (id: string) => {
    setDraftResources((prev) => prev.filter((item) => item.id !== id));
  };

  const classIdForStream = (streamId?: string | null) => {
    if (!streamId) return null;
    const stream = streams.find((s: any) => s.id === streamId)
      || teacherStreams.find((s: any) => s.id === streamId)
      || selectableStreams.find((s: any) => s.id === streamId)
      || scopedStreams.find((s: any) => s.id === streamId);
    return stream?.class_id || stream?.class?.id || null;
  };

  const buildUploadContext = (session: SessionItem) => {
    const streamId = targetStreamId || session.streamId || null;
    const classId = targetClassId || classIdForStream(streamId) || null;
    const subjectId = targetSubjectId || session.subjectId || null;

    return {
      stream_id: streamId,
      class_id: classId,
      subject_id: subjectId,
      audience_scope: uploadAudience,
      target_student_ids: targetStudentIds,
      uploaded_by_name: user?.full_name || null
    };
  };

  const resolvePublishSession = () => {
    const byScope = orderedSessions.find((s) => s.streamId === targetStreamId && s.subjectId === targetSubjectId);
    return byScope || selectedSession || orderedSessions[0] || null;
  };

  const withTimeout = async <T,>(promise: PromiseLike<T>, ms: number, label: string): Promise<T> => {
    let timer: number | null = null;
    try {
      const timeoutPromise = new Promise<T>((_, reject) => {
        timer = window.setTimeout(() => {
          reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`));
        }, ms);
      });

      return await Promise.race([Promise.resolve(promise), timeoutPromise]);
    } finally {
      if (timer !== null) window.clearTimeout(timer);
    }
  };

  const getPublishValidationIssues = (session: SessionItem | null, uploadContext: ReturnType<typeof buildUploadContext> | null) => {
    const issues: string[] = [];
    if (!user?.id) issues.push('missing_user_id');
    if (!user?.school_id) issues.push('missing_school_id');
    if (!session) issues.push('missing_target_session');
    if (!draftResources.length) issues.push('no_draft_resources');
    if (uploading) issues.push('already_uploading');
    if (!uploadContext?.stream_id) issues.push('missing_stream_id');
    if (uploadAudience === 'SUBJECT_STUDENTS' && !uploadContext?.subject_id) issues.push('missing_subject_id_for_subject_students');
    if (draftResources.some((r) => (r.file?.size || 0) > ABSOLUTE_UPLOAD_MAX_BYTES)) issues.push('file_too_large_for_upload');
    return issues;
  };

  const logPublishDiagnostics = (stage: string, payload: Record<string, unknown>) => {
    console.log(`[MyClassroom Publish][${stage}]`, payload);
  };

  const publishDraftResources = async () => {
    const session = resolvePublishSession();
    const uploadContext = session ? buildUploadContext(session) : null;
    const validationIssues = getPublishValidationIssues(session, uploadContext);

    logPublishDiagnostics('preflight', {
      userId: user?.id || null,
      schoolId: user?.school_id || null,
      selectedSessionId,
      resolvedSessionId: session?.id || null,
      targetClassId,
      targetStreamId,
      targetSubjectId,
      uploadAudience,
      targetStudentIdsCount: targetStudentIds.length,
      draftResourcesCount: draftResources.length,
      draftResources: draftResources.map((item) => ({
        id: item.id,
        mode: item.mode,
        title: item.title,
        hasFile: Boolean(item.file),
        fileName: item.file?.name || null,
        fileType: item.file?.type || null,
        fileSize: item.file?.size || null,
        hasUrl: Boolean(item.url)
      })),
      uploadContext,
      validationIssues
    });

    if (!user?.school_id || draftResources.length === 0) {
      const reason = !user?.school_id ? 'Missing school context' : 'No resources in draft';
      setUploadStatus(reason);
      logPublishDiagnostics('blocked', { reason, validationIssues });
      return;
    }

    if (!session) {
      setUploadStatus('No target class session found');
      logPublishDiagnostics('blocked', { reason: 'No target class session found', validationIssues });
      return;
    }

    if (!uploadContext?.stream_id) {
      setUploadStatus('Select class/stream before publishing');
      logPublishDiagnostics('blocked', { reason: 'Select class/stream before publishing', validationIssues });
      return;
    }

    if (uploadAudience === 'SUBJECT_STUDENTS' && !uploadContext?.subject_id) {
      setUploadStatus('Choose subject before publishing to subject students');
      logPublishDiagnostics('blocked', { reason: 'Choose subject before publishing to subject students', validationIssues });
      return;
    }

    if (!uploadContext) {
      setUploadStatus('Missing upload context');
      logPublishDiagnostics('blocked', { reason: 'Missing upload context', validationIssues });
      return;
    }

    const publishContext = uploadContext;

    const oversized = draftResources.find((r) => (r.file?.size || 0) > ABSOLUTE_UPLOAD_MAX_BYTES);
    if (oversized?.file) {
      const reason = `File too large (${formatBytes(oversized.file.size)}): ${oversized.file.name}. Max upload is ${formatBytes(ABSOLUTE_UPLOAD_MAX_BYTES)}.`;
      setUploadStatus(reason);
      logPublishDiagnostics('blocked', {
        reason: 'file_too_large_for_upload',
        fileName: oversized.file.name,
        fileSizeBytes: oversized.file.size,
        fileSizeLabel: formatBytes(oversized.file.size),
        maxAllowedBytes: ABSOLUTE_UPLOAD_MAX_BYTES,
        maxAllowedLabel: formatBytes(ABSOLUTE_UPLOAD_MAX_BYTES)
      });
      return;
    }

    setUploading(true);
    setUploadStatus('Publishing...');
    logPublishDiagnostics('started', { sessionId: session.id, uploadContext: publishContext });

    try {
      let createdCount = 0;
      for (const item of draftResources) {
        logPublishDiagnostics('item:start', {
          itemId: item.id,
          mode: item.mode,
          title: item.title,
          hasFile: Boolean(item.file),
          fileName: item.file?.name || null,
          fileType: item.file?.type || null,
          fileSize: item.file?.size || null,
          hasUrl: Boolean(item.url)
        });

        if (item.mode === 'VIDEO' && item.file) {
          const uploaded = await withTimeout(uploadFileToStorage(item.file, 'recordings'), 90000, 'Video file upload');
          logPublishDiagnostics('item:uploaded', { itemId: item.id, filePath: uploaded.filePath, fileUrl: uploaded.fileUrl });

          const { data, error } = await withTimeout(supabase
            .from('classroom_recordings')
            .insert({
              school_id: user.school_id,
              session_id: session.id,
              teacher_id: user.id,
              title: item.title,
              file_url: uploaded.fileUrl,
              recording_url: uploaded.fileUrl,
              recorded_at: new Date().toISOString(),
              ...publishContext
            })
            .select('*')
            .single(), 45000, 'Video database insert');
          if (error) throw error;
          if (data) setRecordings((prev) => [data, ...prev]);
          if (data) createdCount += 1;
          logPublishDiagnostics('item:done', { itemId: item.id, createdCount, table: 'classroom_recordings' });
          continue;
        }

        if (item.mode === 'PDF' && item.file) {
          const uploaded = await withTimeout(uploadFileToStorage(item.file, 'notes'), 90000, 'PDF file upload');
          logPublishDiagnostics('item:uploaded', { itemId: item.id, filePath: uploaded.filePath, fileUrl: uploaded.fileUrl });

          const { data, error } = await withTimeout(supabase
            .from('classroom_notes')
            .insert({
              school_id: user.school_id,
              session_id: session.id,
              teacher_id: user.id,
              title: item.title,
              note_type: 'PDF',
              file_url: uploaded.fileUrl,
              content: item.title,
              ...publishContext
            })
            .select('*')
            .single(), 45000, 'PDF database insert');
          if (error) throw error;
          if (data) setNotes((prev) => [data, ...prev]);
          if (data) createdCount += 1;
          logPublishDiagnostics('item:done', { itemId: item.id, createdCount, table: 'classroom_notes', noteType: 'PDF' });
          continue;
        }

        if ((item.mode === 'YOUTUBE' || item.mode === 'LINK') && item.url) {
          const { data, error } = await withTimeout(supabase
            .from('classroom_notes')
            .insert({
              school_id: user.school_id,
              session_id: session.id,
              teacher_id: user.id,
              title: item.title,
              note_type: item.mode === 'YOUTUBE' ? 'YOUTUBE_LINK' : 'LINK',
              content: item.url,
              file_url: item.url,
              ...publishContext
            })
            .select('*')
            .single(), 45000, 'Link database insert');
          if (error) throw error;
          if (data) setNotes((prev) => [data, ...prev]);
          if (data) createdCount += 1;
          logPublishDiagnostics('item:done', { itemId: item.id, createdCount, table: 'classroom_notes', noteType: item.mode });
          continue;
        }

        if (item.mode === 'PACK' && item.file) {
          const folder = item.file.type.startsWith('video/') ? 'recordings' : 'notes';
          const uploaded = await withTimeout(uploadFileToStorage(item.file, folder as 'recordings' | 'notes'), 90000, 'Pack file upload');
          logPublishDiagnostics('item:uploaded', { itemId: item.id, folder, filePath: uploaded.filePath, fileUrl: uploaded.fileUrl });

          if (folder === 'recordings') {
            const { data, error } = await withTimeout(supabase
              .from('classroom_recordings')
              .insert({
                school_id: user.school_id,
                session_id: session.id,
                teacher_id: user.id,
                title: item.title,
                file_url: uploaded.fileUrl,
                recording_url: uploaded.fileUrl,
                recorded_at: new Date().toISOString(),
                ...publishContext
              })
              .select('*')
              .single(), 45000, 'Pack recording database insert');
            if (error) throw error;
            if (data) setRecordings((prev) => [data, ...prev]);
            if (data) createdCount += 1;
            logPublishDiagnostics('item:done', { itemId: item.id, createdCount, table: 'classroom_recordings', mode: 'PACK' });
          } else {
            const { data, error } = await withTimeout(supabase
              .from('classroom_notes')
              .insert({
                school_id: user.school_id,
                session_id: session.id,
                teacher_id: user.id,
                title: item.title,
                note_type: 'PACK_ITEM',
                file_url: uploaded.fileUrl,
                content: packTitle.trim() || 'Pack item',
                ...publishContext
              })
              .select('*')
              .single(), 45000, 'Pack note database insert');
            if (error) throw error;
            if (data) setNotes((prev) => [data, ...prev]);
            if (data) createdCount += 1;
            logPublishDiagnostics('item:done', { itemId: item.id, createdCount, table: 'classroom_notes', mode: 'PACK' });
          }
        }

        if ((item.mode === 'VIDEO' || item.mode === 'PDF' || item.mode === 'PACK') && !item.file) {
          logPublishDiagnostics('item:skipped', { itemId: item.id, reason: 'Missing file for file-based mode', mode: item.mode });
        }

        if ((item.mode === 'YOUTUBE' || item.mode === 'LINK') && !item.url) {
          logPublishDiagnostics('item:skipped', { itemId: item.id, reason: 'Missing URL for link-based mode', mode: item.mode });
        }
      }

      if (createdCount === 0) {
        throw new Error('No resources were written to the database.');
      }

      // 1. Dispatch Instant In-App Notifications to Target Students
      let recipientStudentIds = targetStudentIds;
      if (recipientStudentIds.length === 0 && publishContext.stream_id) {
         recipientStudentIds = students.filter((s: any) => s.stream_id === publishContext.stream_id || s.stream?.id === publishContext.stream_id).map((s: any) => s.user_id || s.id);
      }

      if (recipientStudentIds.length > 0) {
        const notifInserts = recipientStudentIds.map(studentId => ({
          user_id: studentId,
          title: uploadName ? `New Material: ${uploadName}` : 'New Material Shared',
          message: `${user?.full_name || 'Your teacher'} just shared ${createdCount} new resource(s) with you.`,
          type: 'success', // Using success for a pleasant green pop-up
          link: '/classroom',
          created_at: new Date().toISOString()
        }));

        // Fire-and-forget
        supabase.from('in_app_notifications').insert(notifInserts).then(({ error }) => {
           if (error) console.error('Failed to dispatch notifications:', error);
        });
      }

      await withTimeout(addActivity(session.id, 'RESOURCE_SHARED', 'Published classroom resources.', {
        streamId: targetStreamId,
        subjectId: targetSubjectId,
        audience: uploadAudience,
        studentIds: targetStudentIds,
        count: createdCount
      }), 30000, 'Publish activity log');

      if (selectedSessionId !== session.id) {
        setSelectedSessionId(session.id);
      }
      if (publishContext.stream_id) {
        setTargetStreamId(publishContext.stream_id);
      }
      if (publishContext.class_id) {
        setTargetClassId(publishContext.class_id);
      }
      if (publishContext.subject_id) {
        setTargetSubjectId(publishContext.subject_id);
      }
      await withTimeout(loadSessionData(session), 45000, 'Reload session data after publish');

      setDraftResources([]);
      setUploadStatus(`Published ${createdCount} item(s)`);
      logPublishDiagnostics('completed', { createdCount, sessionId: session.id });
    } catch (error) {
      console.error('Publish draft resources failed', error);
      setUploadStatus(`Publish failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      logPublishDiagnostics('failed', {
        sessionId: session.id,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorName: error instanceof Error ? error.name : null,
        uploadContext: publishContext
      });
    } finally {
      setUploading(false);
      logPublishDiagnostics('finalized', { uploading: false, uploadStatus: 'finalized' });
    }
  };

  const handleRecordingUpload = async (file: File) => {
    if (!selectedSession || !user?.school_id) return;
    setUploading(true);
    setUploadStatus('Uploading recording...');
    try {
      const uploadContext = buildUploadContext(selectedSession);
      const uploaded = await uploadFileToStorage(file, 'recordings');
      setUploadStatus('Processing recording...');
      const { data, error } = await supabase
        .from('classroom_recordings')
        .insert({
          school_id: user.school_id,
          session_id: selectedSession.id,
          teacher_id: user.id,
          title: file.name,
          file_url: uploaded.fileUrl,
          recording_url: uploaded.fileUrl,
          recorded_at: new Date().toISOString(),
          ...uploadContext
        })
        .select('*')
        .single();

      if (!error && data) {
        setRecordings((prev) => [data, ...prev]);
        setUploadStatus('Ready');
        await addActivity(selectedSession.id, 'RECORDING_UPLOADED', `Uploaded recording: ${file.name}`);
      }
    } catch (error) {
      console.error('Recording upload failed', error);
      setUploadStatus('Upload failed. Please retry.');
    } finally {
      setUploading(false);
    }
  };

  const handleNotePdfUpload = async (file: File) => {
    if (!selectedSession || !user?.school_id) return;
    setUploading(true);
    setUploadStatus('Uploading revision note...');
    try {
      const uploadContext = buildUploadContext(selectedSession);
      const uploaded = await uploadFileToStorage(file, 'notes');
      setUploadStatus('Processing revision note...');
      const { data, error } = await supabase
        .from('classroom_notes')
        .insert({
          school_id: user.school_id,
          session_id: selectedSession.id,
          teacher_id: user.id,
          title: file.name,
          note_type: 'PDF',
          file_url: uploaded.fileUrl,
          ...uploadContext
        })
        .select('*')
        .single();

      if (!error && data) {
        setNotes((prev) => [data, ...prev]);
        setUploadStatus('Ready');
        await addActivity(selectedSession.id, 'FEEDBACK_SENT', `Uploaded PDF note: ${file.name}`);
      }
    } catch (error) {
      console.error('Note PDF upload failed', error);
      setUploadStatus('Upload failed. Please retry.');
    } finally {
      setUploading(false);
    }
  };

  const handleAssignmentFileUpload = async (file: File) => {
    if (!selectedSession || !user?.school_id) return;
    setUploading(true);
    setUploadStatus('Uploading holiday assignment...');
    try {
      const assignment = await getActiveAssignment(selectedSession.id);
      if (!assignment) return;

      const uploaded = await uploadFileToStorage(file, 'assignment-files');
      setUploadStatus('Processing holiday assignment...');
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
        setUploadStatus('Ready');
        await addActivity(selectedSession.id, 'ASSIGNMENT_SUBMITTED', `Uploaded assignment file: ${file.name}`);
      }
    } catch (error) {
      console.error('Assignment file upload failed', error);
      setUploadStatus('Upload failed. Please retry.');
    } finally {
      setUploading(false);
    }
  };

  const handleSharedFileUpload = async (file: File) => {
    if (!selectedSession || !user?.school_id) return;
    setUploading(true);
    setUploadStatus('Uploading shared file...');
    try {
      const uploadContext = buildUploadContext(selectedSession);
      const uploaded = await uploadFileToStorage(file, 'notes');
      setUploadStatus('Processing shared file...');
      const { data, error } = await supabase
        .from('classroom_notes')
        .insert({
          school_id: user.school_id,
          session_id: selectedSession.id,
          teacher_id: user.id,
          title: file.name,
          note_type: 'SHARED_FILE',
          file_url: uploaded.fileUrl,
          content: 'Shared class resource',
          ...uploadContext
        })
        .select('*')
        .single();

      if (!error && data) {
        setNotes((prev) => [data, ...prev]);
        setUploadStatus('Ready');
        await addActivity(selectedSession.id, 'RESOURCE_SHARED', `Shared class file: ${file.name}`);
      }
    } catch (error) {
      console.error('Shared file upload failed', error);
      setUploadStatus('Upload failed. Please retry.');
    } finally {
      setUploading(false);
    }
  };

  const handleLinkPublish = async () => {
    if (!linkResourceUrl.trim()) return;

    const title = linkResourceTitle.trim() || (linkResourceKind === 'YOUTUBE' ? 'YouTube lesson' : 'Linked resource');

    setDraftResources((prev) => [
      {
        id: `draft-link-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        mode: linkResourceKind === 'YOUTUBE' ? 'YOUTUBE' : 'LINK',
        title,
        url: linkResourceUrl.trim(),
        addedAt: new Date().toISOString()
      },
      ...prev
    ]);

    setLinkResourceTitle('');
    setLinkResourceUrl('');
    setLinkResourceKind('EXTERNAL');
    setIsLinkModalOpen(false);
    setUploadStatus('Draft updated');
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

    // Show Loader as requested
    setStartingClassText(`Starting ${session.subject} Live Class for ${session.classLabel}...`);
    setIsStartingClass(true);

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

    await addActivity(session.id, 'SESSION_STARTED', topic ? `Class started: ${topic}` : 'Class started. Live room opened.');

    // Wait 2 seconds before switching to the live screen
    setTimeout(() => {
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
      setIsStartingClass(false);
      setIsStartClassModalOpen(false);
      setStartClassMode('CHOICE');
    }, 2000);
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
    const classLabel = `${formatClassName(resolveClassForStream(stream))} ${formatStreamName(stream)}`.trim() || 'Unassigned stream';
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

  const handleScheduleCustom = async () => {
    if (!user?.school_id || !customClassForm.streamId || !customClassForm.subjectId) return;
    const stream = teacherStreams.find((s: any) => s.id === customClassForm.streamId);
    const subject = subjects.find((s: any) => s.id === customClassForm.subjectId);
    if (!stream || !subject || !customClassForm.scheduledDate || !customClassForm.scheduledTime) return;

    const startDate = new Date(`${customClassForm.scheduledDate}T${customClassForm.scheduledTime}:00`);
    const endDate = new Date(startDate.getTime() + 45 * 60 * 1000); // Default 45 mins
    const day = startDate.toLocaleDateString('en-GB', { weekday: 'long' });
    const fmt = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    const id = `custom-sch-${Date.now()}`;
    const classLabel = `${formatClassName(resolveClassForStream(stream))} ${formatStreamName(stream)}`.trim() || 'Unassigned stream';
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
        scheduled_end_at: endDate.toISOString(),
        reminder_enabled: customClassForm.reminderEnabled
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

  const activeStreamName = selectedSession?.classLabel || 'No assigned stream';
  const activeSubjectName = selectedSession?.subject || 'General Classroom';
  const termLabel = `Term ${Math.min(3, Math.max(1, Math.ceil((now.getMonth() + 1) / 4)))}, ${now.getFullYear()}`;

  const openAssignments = assignments.filter((a: any) => (a.status || 'OPEN') === 'OPEN');
  const lastUploadAt = useMemo(() => {
    const timestamps = [
      ...recordings.map((item: any) => item.recorded_at || item.created_at),
      ...notes.map((item: any) => item.updated_at || item.created_at),
      ...assignmentFiles.map((item: any) => item.uploaded_at || item.created_at)
    ].filter(Boolean);

    if (!timestamps.length) return null;
    const latest = timestamps
      .map((iso: string) => new Date(iso).getTime())
      .sort((a: number, b: number) => b - a)[0];
    return Number.isFinite(latest) ? new Date(latest).toISOString() : null;
  }, [assignmentFiles, notes, recordings]);

  const contentFeed = useMemo<ContentFeedItem[]>(() => {
    const recordingItems: ContentFeedItem[] = recordings.map((item: any) => ({
      id: `recording-${item.id}`,
      title: item.title || 'Lesson recording',
      type: 'RECORDING',
      postedAt: item.recorded_at || item.created_at || new Date().toISOString(),
      fileUrl: item.file_url || item.recording_url || undefined,
      preview: 'Lesson recording available for replay.'
    }));

    const noteItems: ContentFeedItem[] = notes.map((item: any) => ({
      id: `note-${item.id}`,
      title: item.title || 'Revision note',
      type: item.note_type === 'SHARED_FILE' ? 'SHARED_FILE' : item.note_type === 'LINK' || item.note_type === 'YOUTUBE_LINK' ? 'LINK' : 'NOTE',
      postedAt: item.updated_at || item.created_at || new Date().toISOString(),
      fileUrl: item.file_url || undefined,
      preview: item.content || 'Revision material shared by teacher.',
      archived: !!item.archived
    }));

    const assignmentItems: ContentFeedItem[] = openAssignments.map((assignment: any) => ({
      id: `assignment-${assignment.id}`,
      title: assignment.title || 'Holiday assignment',
      type: 'ASSIGNMENT',
      postedAt: assignment.created_at || new Date().toISOString(),
      dueAt: assignment.due_at || undefined,
      preview: assignment.description || 'Assignment published for learners.'
    }));

    const holidayFileItems: ContentFeedItem[] = assignmentFiles.map((item: any) => ({
      id: `holiday-${item.id}`,
      title: item.title || 'Holiday assignment file',
      type: 'HOLIDAY_WORK',
      postedAt: item.uploaded_at || item.created_at || new Date().toISOString(),
      fileUrl: item.file_url || undefined,
      preview: 'Holiday assignment material uploaded for students.'
    }));

    return [...recordingItems, ...noteItems, ...assignmentItems, ...holidayFileItems]
      .sort((a, b) => new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime());
  }, [assignmentFiles, notes, openAssignments, recordings]);

  const feedForTab = useMemo(() => {
    if (libraryTab === 'ALL') return contentFeed;
    if (libraryTab === 'RECORDINGS_VIDEOS') return contentFeed.filter((item) => item.type === 'RECORDING');
    if (libraryTab === 'NOTES_PDFS') return contentFeed.filter((item) => item.type === 'NOTE' || item.type === 'LINK' || item.type === 'SHARED_FILE');
    return contentFeed.filter((item) => item.archived || item.type === 'HOLIDAY_WORK');
  }, [contentFeed, libraryTab]);

  const upcomingDeadlines = useMemo(() => {
    return openAssignments
      .filter((item: any) => item.due_at)
      .sort((a: any, b: any) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
      .slice(0, 6);
  }, [openAssignments]);

  const recentlyAdded = useMemo(() => contentFeed.slice(0, 6), [contentFeed]);

  const badgeVariantForType = (type: ContentFeedItem['type']) => {
    if (type === 'RECORDING') return 'info';
    if (type === 'NOTE') return 'success';
    if (type === 'LINK') return 'info';
    if (type === 'SHARED_FILE') return 'neutral';
    if (type === 'ASSIGNMENT' || type === 'HOLIDAY_WORK') return 'warning';
    return 'neutral';
  };

  const contentTypeLabel = (type: ContentFeedItem['type']) => {
    if (type === 'RECORDING') return 'Recording';
    if (type === 'NOTE') return 'Note';
    if (type === 'LINK') return 'Link';
    if (type === 'ASSIGNMENT') return 'Assignment';
    if (type === 'HOLIDAY_WORK') return 'Holiday Work';
    return 'Shared File';
  };

  const orchestrationForSelected = orchestration && selectedSession && orchestration.sessionId === selectedSession.id ? orchestration : null;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (orchestrationForSelected) {
      interval = setInterval(() => {
        setSessionDurationSec(prev => prev + 1);
      }, 1000);
    } else {
      setSessionDurationSec(0);
    }
    return () => clearInterval(interval);
  }, [orchestrationForSelected]);

  const formatDuration = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return `${h > 0 ? String(h).padStart(2, '0') + ':' : ''}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const toggleStar = (id: string) => {
    setStarredResources(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

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

    // Initialize Jitsi immediately when orchestration starts
    const JitsiMeetExternalAPI = (window as any).JitsiMeetExternalAPI;
    if (!JitsiMeetExternalAPI) {
      console.warn('⚠️ Jitsi API not yet available, will retry on next render');
      return;
    }

    try {
      const cleanSubject = (selectedSession.subject || 'Class').replace(/[^a-zA-Z0-9]/g, '');
      const cleanStream = (selectedSession.classLabel || 'General').replace(/[^a-zA-Z0-9]/g, '');
      const roomName = `Matta-Live-${cleanSubject}-${cleanStream}-${selectedSession.id.slice(-8)}`;
      
      const options = {
        roomName: roomName,
        parentNode: jitsiContainerRef.current,
        width: '100%',
        height: '100%',
        configOverwrite: {
          startWithAudioMuted: !micEnabled,
          startWithVideoMuted: !cameraEnabled,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
          enableLobbyChat: false,
          enableWelcomePage: false,
          disableModeratorIndicator: true,
          defaultLanguage: 'en',
          toolbarButtons: [], 
          doNotStoreRoom: true,
          noticeMessage: '',
          p2p: { enabled: true },
          enableUserRolesBasedOnToken: false,
          disableSelfView: false,
          tileView: { enabled: true }
        },
        interfaceConfigOverwrite: {
          DEFAULT_WELCOME_PAGE_LOGO_URL: '',
          SHOW_BRAND_WATERMARK: false,
          SHOW_JITSI_WATERMARK: false,
          MOBILE_APP_PROMO: false,
          ENABLE_DESKTOP_DEEPLINK: false,
          HIDE_INVITE_ON_WELCOME_PAGE: true,
          SHOW_CHROME_EXTENSION_BANNER: false,
          DISPLAY_WELCOME_PAGE_CONTENT: false
        },
        userInfo: {
          displayName: user?.full_name || (isTeacher ? 'Teacher' : 'Student'),
          email: user?.email || ''
        }
      };

      const api = new JitsiMeetExternalAPI('jitsi.riot.im', options);
      jitsiApiRef.current = api;
      console.log('✅ Jitsi conference initialized:', roomName);

      api.addEventListener('videoConferenceJoined', () => {
         console.log('🎉 Successfully joined the conference');
         setIsRecording(false);
         // Force Tile View on start for everyone
         api.executeCommand('setTileView', true);
      });

      // Cleanup on unmount or when orchestration ends
      return () => {
        console.log('🔌 Cleaning up Jitsi instance');
        api.dispose();
        jitsiApiRef.current = null;
      };
    } catch (error) {
      console.error('❌ Failed to initialize Jitsi:', error);
    }
  }, [orchestrationForSelected?.sessionId, selectedSession?.id, user]);

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

  const triggerExternalAlerts = (session: SessionItem) => {
    // ⚠️ System structure created for external API hooking (WhatsApp/SMS).
    // Currently non-functional as requested until APIs are integrated.
    /*
      try {
         await api.post('/notifications/external', {
            type: 'WHATSAPP_SMS',
            userId: user.id,
            message: `Reminder: Your ${session.subject} class starts soon!`,
            targetPhone: user.phone
         });
      } catch(err) {
         console.error('External API not yet connected', err);
      }
    */
    alert(`System Hook Ready: SMS/WhatsApp reminder prepared for ${session.subject}. (API Integration Pending)`);
  };

  const MeetingControl: React.FC<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
    isActive?: boolean;
    isDanger?: boolean;
    isToggle?: boolean;
  }> = ({ label, icon, onClick, disabled, isActive, isDanger, isToggle }) => (
    <button
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group h-10 w-10 rounded-full flex items-center justify-center transition-all border",
        disabled ? "opacity-30 cursor-not-allowed" : "active:scale-95",
        isDanger 
           ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-500 hover:text-white" 
           : isActive 
             ? "bg-emerald-600 border-emerald-500 text-white" 
             : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white",
        isToggle && isActive && "ring-2 ring-emerald-500/20"
      )}
    >
      {icon}
    </button>
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
    customClassForm.topic
  );

  const selectedClassFromId = classOptions.find((c: any) => c.id === targetClassId);
  const selectedStream = scopedStreams.find((s: any) => s.id === targetStreamId);
  const selectedClass = resolveClassForStream(selectedStream) || selectedClassFromId || null;
  const selectedSubject = uploadAudienceSubjects.find((s: any) => s.id === targetSubjectId);

  const classDisplayName = (c: any) => {
    return formatClassName(c);
  };

  const streamDisplayName = (s: any) => {
    return formatStreamName(s);
  };

  const classStreamDisplayLabel = (stream: any) => {
    const className = classDisplayName(resolveClassForStream(stream)) || fallbackClassNameFromSessionLabel(stream);
    const streamName = streamDisplayName(stream);
    if (className && streamName) return `${className} - ${streamName}`;
    if (streamName) return `Stream ${streamName}`;
    if (className) return className;
    return 'Unlinked stream';
  };

  const selectedClassName = classDisplayName(selectedClass) || fallbackClassNameFromSessionLabel(selectedStream);

  const audienceScopeLabel = `${selectedClassName} ${streamDisplayName(selectedStream)}`.trim() || 'selected class stream';

  const audienceAlert = uploadAudience === 'WHOLE_CLASS'
    ? `This upload will be sent to the whole ${audienceScopeLabel}.`
    : `This upload will be sent to all ${(selectedSubject?.name || 'subject')} students in ${audienceScopeLabel}.`;

  const draftTypeLabel = (mode: UploadChoice) => {
    if (mode === 'VIDEO') return 'Video';
    if (mode === 'YOUTUBE') return 'YouTube';
    if (mode === 'LINK') return 'Link';
    if (mode === 'PDF') return 'PDF';
    return 'Pack Item';
  };

  const teacherSubjectClassRows = useMemo(() => {
    const rows = (assignmentRows || [])
      .filter((row: any) => row?.subject_id && row?.stream_id)
      .map((row: any) => {
        const subject = subjects.find((s: any) => s.id === row.subject_id);
        const stream = streams.find((s: any) => s.id === row.stream_id);
        const resolvedClass = resolveClassForStream(stream);
        const className = formatClassName(resolvedClass) || fallbackClassNameFromSessionLabel(stream);
        const streamName = formatStreamName(stream);

        return {
          key: `${row.subject_id}-${row.stream_id}`,
          subjectId: row.subject_id,
          streamId: row.stream_id,
          subjectName: subject?.name || 'Subject',
          classLabel: `${className} ${streamName}`.trim() || 'Unassigned class'
        };
      });

    const unique = new Map<string, { key: string; subjectId: string; streamId: string; subjectName: string; classLabel: string }>();
    rows.forEach((row: any) => {
      if (!unique.has(row.key)) unique.set(row.key, row);
    });

    return Array.from(unique.values()).sort((a, b) => {
      const bySubject = String(a.subjectName).localeCompare(String(b.subjectName));
      if (bySubject !== 0) return bySubject;
      return String(a.classLabel).localeCompare(String(b.classLabel));
    });
  }, [assignmentRows, subjects, streams, classById, sessionClassLabelByStream]);

  const isTeacher = user?.role === 'TEACHER' || user?.role === 'PRINCIPAL' || user?.role === 'ADMIN';
  const isStudent = user?.role === 'STUDENT' || user?.role === 'PARENT';

  if (loading) return <div className="py-24 text-center text-sm font-bold text-zinc-400 animate-pulse">Synchronizing Classroom Data...</div>;

  return (
    <div className="space-y-6 max-w-[1700px] mx-auto pb-12 transition-all duration-300">
      {/* Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
        <div className="flex items-center gap-4">
           <div className="h-12 w-12 rounded-xl bg-zinc-900 dark:bg-white flex items-center justify-center text-white dark:text-zinc-900 shadow-sm">
             <Video size={24} />
           </div>
           <div>
             <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white leading-tight">My Class</h1>
             <div className="flex items-center gap-2 mt-0.5">
               <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{isStudent ? 'Learning Hub' : termLabel}</span>
               {orchestrationForSelected && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Class
                  </div>
                )}
             </div>
           </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isTeacher && (
            <>
              <Button
                variant={orchestrationForSelected ? 'danger' : 'primary'}
                className={`rounded-xl h-10 px-6 font-bold text-xs ${orchestrationForSelected ? 'bg-rose-600 hover:bg-rose-700 text-white' : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-0'}`}
                onClick={() => {
                  if (orchestrationForSelected) {
                    closeSessionAndArchive('MANUAL');
                  } else {
                    setIsStartClassModalOpen(true);
                    setStartClassMode('CHOICE');
                  }
                }}
              >
                {orchestrationForSelected ? (
                  <><PhoneOff size={16} className="mr-1.5" /> End Class</>
                ) : (
                  <><Plus size={16} className="mr-1.5" /> Start Class</>
                )}
              </Button>
              <Button
                variant="outline"
                className="rounded-xl h-10 px-5 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-bold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
                onClick={() => { setWorkspaceMode('LIBRARY'); setLibraryTab('ALL'); }}
              >
                <Upload size={16} className="mr-1.5" /> Upload Resources
              </Button>
            </>
          )}

          {isStudent && orchestrationForSelected && (
            <Button
              variant="primary"
              className="rounded-xl h-10 px-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-0 font-bold text-xs shadow-lg"
              onClick={() => setWorkspaceMode('LIVE')}
            >
              <Video size={16} className="mr-1.5" /> Join Session
            </Button>
          )}

          <Button 
            variant="outline" 
            className="rounded-xl h-10 px-5 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-bold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
            onClick={() => navigate('/timetable')}
          >
            <CalendarDays size={16} className="mr-1.5" /> Timetable
          </Button>
          
          <Button
            variant="outline"
            className="rounded-xl h-10 px-5 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 font-bold text-xs hover:bg-zinc-50 dark:hover:bg-zinc-800"
            onClick={() => setIsMySubjectsModalOpen(true)}
          >
            <BookOpen size={16} className="mr-1.5" /> My Subjects
          </Button>
          
          <Button
            variant={sidebarOpen ? 'secondary' : 'outline'}
            className="rounded-xl h-10 px-5 font-bold text-xs"
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <Activity size={16} className="mr-1.5" />
            {sidebarOpen ? 'Minimize Feed' : 'Real-time Activity'}
          </Button>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-xl w-fit border border-transparent">
        <button 
          onClick={() => setWorkspaceMode('LIVE')}
          className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${workspaceMode === 'LIVE' ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400'}`}
        >
          {isStudent ? 'Join Class' : 'Live Class'}
        </button>
        <button 
          onClick={() => setWorkspaceMode('LIBRARY')}
          className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${workspaceMode === 'LIBRARY' ? 'bg-white dark:bg-zinc-900 text-zinc-950 dark:text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-400'}`}
        >
          {isStudent ? 'Resources & Notes' : 'Recordings & Uploads'}
        </button>
      </div>

      {/* Radar HUD: Upcoming & Scheduled classes for students */}
      {isStudent && workspaceMode === 'LIVE' && studentScheduledSessions.length > 0 && (
         <div className="mb-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3 px-1 flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"/> Upcoming Broadcasts</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
               {studentScheduledSessions.map((session: SessionItem) => {
                  const startTime = session.scheduledStartAt
                    ? new Date(session.scheduledStartAt)
                    : parseClock(now, session.start);
                  const diffMs = startTime.getTime() - now.getTime();
                  const inNext15Mins = diffMs > 0 && diffMs <= 15 * 60 * 1000;
                  const isLive = session.status === 'LIVE' || diffMs <= 0;
                  const minsAway = diffMs > 0 ? Math.ceil(diffMs / 60000) : 0;

                  return (
                     <div key={session.id} className={`min-w-[320px] max-w-[360px] p-4 rounded-2xl flex flex-col gap-4 relative overflow-hidden shadow-2xl shrink-0 border ${isLive ? 'bg-gradient-to-br from-emerald-900 to-zinc-900 border-emerald-800/60' : 'bg-gradient-to-br from-zinc-900 to-black border-zinc-800'} text-white`}>
                        {inNext15Mins && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-emerald-300 animate-pulse" />}
                        <div className="flex items-start justify-between relative z-10">
                           <div>
                              <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest mb-1">
                                 {isLive ? '🔴 Live Now' : inNext15Mins ? `⏱ Starting in ${minsAway}m` : `${session.day} • ${session.start}`}
                              </p>
                              <h4 className="text-sm font-bold text-white leading-tight mb-1 line-clamp-1">{session.subject}{session.topic && ` — ${session.topic}`}</h4>
                              <p className="text-[11px] font-semibold text-zinc-500">{session.teacher}</p>
                           </div>
                           <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${isLive ? 'bg-emerald-500/20' : 'bg-white/10'}`}>
                              <Video size={16} className={isLive ? "text-emerald-400" : inNext15Mins ? "text-emerald-400" : "text-white"} />
                           </div>
                        </div>
                        <div className="flex items-center gap-2 relative z-10">
                           <button
                             onClick={() => triggerExternalAlerts(session)}
                             className="flex-1 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all"
                           >
                              <CheckCircle2 size={14} /> Remind Me
                           </button>
                           <button
                             disabled={!isLive && !inNext15Mins}
                             onClick={() => isLive || inNext15Mins ? setWorkspaceMode('LIVE') : undefined}
                             className={`flex-1 h-9 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-all ${isLive ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse' : inNext15Mins ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : 'bg-white/5 text-white/30 cursor-not-allowed'}`}
                           >
                              {isLive ? 'Join Now 🔴' : inNext15Mins ? 'Join Now' : 'Standby'}
                           </button>
                        </div>
                     </div>
                  );
               })}
            </div>
         </div>
      )}

      {workspaceMode === 'LIVE' ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Main Stage */}
          <div className={focusMode ? 'xl:col-span-12 flex flex-col gap-6' : sidebarOpen ? 'xl:col-span-9 flex flex-col gap-6' : 'xl:col-span-12 flex flex-col gap-6'}>
             <div className="relative group/stage rounded-[32px] overflow-hidden bg-black aspect-video border border-zinc-200 dark:border-zinc-800 shadow-2xl bg-zinc-950 transition-all duration-500">
                
                 {orchestrationForSelected && (
                    <div className="absolute top-6 left-6 z-20 flex items-center gap-3">
                       <Badge variant="danger" className="bg-rose-600 text-white border-0 px-4 py-2 rounded-full animate-pulse flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                          LIVE SESSION
                       </Badge>
                       <div className="px-4 py-2 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 text-white text-[11px] font-black tracking-widest font-mono">
                          {formatDuration(sessionDurationSec)}
                       </div>
                    </div>
                 )}

                 {orchestrationForSelected ? (
                    <div className={cn("w-full h-full relative", lowDataMode && "hidden")}>
                       <div ref={jitsiContainerRef} className="w-full h-full" />
                       
                       {/* FLOATING COMMAND CONSOLE */}
                       <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 bg-zinc-900/80 backdrop-blur-2xl px-8 py-5 rounded-[2.5rem] border border-white/10 shadow-2xl transition-all hover:scale-[1.02] group">
                          <div className="flex items-center gap-3 pr-6 border-r border-white/10">
                             <MeetingControl 
                                label="Microphone" 
                                isActive={micEnabled}
                                isDanger={!micEnabled}
                                icon={micEnabled ? <Mic size={20} /> : <MicOff size={20} />} 
                                onClick={() => {
                                   const next = !micEnabled;
                                   setMicEnabled(next);
                                   jitsiApiRef.current?.executeCommand('toggleAudio');
                                }} 
                             />
                             <MeetingControl 
                                label="Video" 
                                isActive={cameraEnabled}
                                isDanger={!cameraEnabled}
                                icon={cameraEnabled ? <Video size={20} /> : <VideoOff size={20} />} 
                                onClick={() => {
                                   const next = !cameraEnabled;
                                   setCameraEnabled(next);
                                   jitsiApiRef.current?.executeCommand('toggleVideo');
                                }} 
                             />
                          </div>

                          <div className="flex items-center gap-3 px-6 border-r border-white/10">
                             <MeetingControl 
                                label="Raise Hand" 
                                isActive={false}
                                icon={<Hand size={20} />} 
                                onClick={() => addActivity(selectedSession?.id || 'none', 'HAND_RAISED', `${user?.full_name} raised their hand.`)} 
                             />
                             {isTeacher && (
                                <>
                                   <MeetingControl 
                                      label="Screen" 
                                      isActive={false}
                                      icon={<Share2 size={20} />} 
                                      onClick={() => jitsiApiRef.current?.executeCommand('toggleShareScreen')} 
                                   />
                                   <MeetingControl 
                                      label="Bookmark" 
                                      isActive={false}
                                      icon={<Bookmark size={20} />} 
                                      onClick={() => addMomentBookmark('IMPORTANT')} 
                                   />
                                </>
                             )}
                          </div>

                          <button 
                            onClick={() => {
                               if (isTeacher) closeSessionAndArchive('MANUAL');
                               else setWorkspaceMode('LIBRARY');
                            }}
                            className="h-14 px-8 bg-rose-600 hover:bg-rose-700 text-white rounded-3xl flex items-center gap-3 text-[11px] font-black uppercase tracking-widest shadow-lg shadow-rose-900/20 transition-all active:scale-95"
                          >
                             <PhoneOff size={18} />
                             {isTeacher ? 'End Session' : 'Exit Room'}
                          </button>
                       </div>
                    </div>
                 ) : (
                   <div className="w-full h-full flex flex-col items-center justify-center text-center p-12 bg-zinc-50 dark:bg-zinc-950/20">
                      {isStartingClass ? (
                        <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
                           <Loader2 size={32} className="animate-spin text-emerald-500" />
                           <p className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-widest">{startingClassText}</p>
                        </div>
                      ) : incomingClassSignal ? (
                         <div className="animate-in fade-in zoom-in duration-300">
                            <div className="h-16 w-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-6 shadow-lg animate-bounce">
                               <Video size={28} />
                            </div>
                            <h2 className="text-lg font-black text-zinc-900 dark:text-white leading-tight mb-2">Live Class Incoming!</h2>
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-8">
                               {incomingClassSignal.subject} • {incomingClassSignal.teacher}
                            </p>
                            <div className="flex gap-2 justify-center">
                               <button 
                                 className="h-11 px-8 bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl text-xs font-bold hover:bg-zinc-300 transition-all"
                                 onClick={() => setIncomingClassSignal(null)}
                               >
                                 Dismiss
                               </button>
                               <button 
                                 type="button"
                                 className="h-11 px-10 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
                                 onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    // 1. Force the session into local cache
                                    setCustomSessions(prev => {
                                       if (prev.some(p => p.id === incomingClassSignal.id)) return prev;
                                       return [incomingClassSignal, ...prev];
                                    });
                                    
                                    // 2. Set ID immediately
                                    setSelectedSessionId(incomingClassSignal.id);
                                    
                                    // 3. Trigger Load (this will set Orchestration and WorkspaceMode)
                                    loadSessionData(incomingClassSignal).catch(err => console.error(err));
                                    
                                    // 4. Close the signal
                                    setIncomingClassSignal(null);
                                 }}
                               >
                                 Join Now
                               </button>
                            </div>
                         </div>
                       ) : (
                         <>
                           <div className="h-16 w-16 rounded-2xl bg-white dark:bg-zinc-900 flex items-center justify-center text-zinc-400 mb-4 border border-zinc-200 dark:border-zinc-800">
                             <Video size={32} strokeWidth={1} />
                           </div>
                           <h2 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider">Classroom Standby</h2>
                           <p className="text-zinc-500 text-[11px] max-w-xs mx-auto font-medium mt-1 mb-6">
                              The virtual room is currently inactive.
                           </p>
                           {isTeacher ? (
                             <Button 
                               variant="primary" 
                               className="rounded-xl h-10 px-8 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold text-xs"
                               onClick={() => setIsStartClassModalOpen(true)}
                             >
                               Start Class
                             </Button>
                           ) : (
                             <div className="flex flex-col items-center gap-3">
                                <Loader2 size={16} className="animate-spin text-emerald-500" />
                                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Waiting for teacher...</span>
                             </div>
                           )}
                         </>
                       )}
                   </div>
                )}

               </div>
            </div>

          {/* Activity Column */}
          <div className={sidebarOpen ? 'xl:col-span-3 h-full min-h-[600px]' : 'hidden xl:hidden'}>
            <div className="flex flex-col h-full h-[760px] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
               <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400">Class Activity</h3>
                  {handQueue.length > 0 && <span className="h-5 px-2 rounded-full bg-amber-500 text-white text-[10px] font-black">{handQueue.length} Hands</span>}
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar flex flex-col">
                  <div className="flex-1" />
                  {activityFeed.filter(f => f.sessionId === (selectedSession?.id || 'none')).slice(-40).map(item => (
                    <div 
                      key={item.id} 
                      className={`p-3 rounded-2xl animate-message-in flex flex-col gap-1 border border-zinc-100 dark:border-zinc-800
                        ${item.actorId === user?.id ? 'bg-zinc-50 dark:bg-zinc-800/40 self-end max-w-[95%]' : 'bg-white dark:bg-zinc-900 self-start max-w-[95%]'}
                      `}
                    >
                       <div className="flex items-center justify-between gap-4">
                          <p className={`text-[10px] font-black uppercase text-zinc-400`}>
                             {item.actorId === user?.id ? 'Me' : item.actorName}
                          </p>
                          <span className="text-[9px] font-bold text-zinc-300">{relativeTime(item.createdAt)}</span>
                       </div>
                       
                       <div className="flex items-center gap-2">
                          {item.type === 'HAND_RAISED' && <Hand size={12} className="text-amber-500" />}
                          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-200 leading-snug">
                             {item.type === 'HAND_RAISED' ? 'Raised their hand' : item.message}
                          </p>
                       </div>

                       {item.type === 'HAND_RAISED' && item.payload?.studentId && item.actorId !== user?.id && isTeacher && (
                          <button onClick={() => acceptRaisedHand(item.payload.studentId, item.payload.studentName)} className="mt-2 text-[10px] font-black text-blue-500 uppercase tracking-tight text-left">Accept Request</button>
                       )}
                    </div>
                  ))}
               </div>

               <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3 bg-zinc-50/30 dark:bg-zinc-950/20">
                   <div className="flex gap-2">
                      <input 
                        value={chatMessage} 
                        onChange={e => setChatMessage(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                        className="flex-1 h-10 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 text-xs font-medium outline-none focus:ring-1 focus:ring-blue-500/20 text-zinc-900 dark:text-white"
                        placeholder={isStudent ? "Ask a question..." : "Say something to students..."}
                      />
                      <button 
                        onClick={() => addActivity(selectedSession?.id || 'none', 'HAND_RAISED', 'Hand raised.')}
                        title="Raise Your Hand"
                        className="h-10 w-10 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-95 transition-all"
                      >
                         <Hand size={16} />
                      </button>
                      <button onClick={sendChatMessage} className="h-10 w-10 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl flex items-center justify-center flex-shrink-0 active:scale-95 transition-all">
                         <Send size={16} />
                      </button>
                   </div>
               </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div className="p-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
              {isTeacher && showUploadForm && (
                <div className="mb-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 animate-in fade-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
                    <div className="xl:col-span-7 space-y-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={uploadChoice}
                          onChange={(e) => setUploadChoice(e.target.value as UploadChoice | '')}
                          className="h-10 min-w-[180px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-xs font-bold"
                        >
                          <option value="">Choose what to upload</option>
                          <option value="VIDEO">Video</option>
                          <option value="YOUTUBE">YouTube Video</option>
                          <option value="PDF">PDF / Notes</option>
                          <option value="PACK">Create Pack</option>
                        </select>

                        <div className="relative min-w-[220px]">
                          <button
                            type="button"
                            onClick={() => setIsSelectClassOpen((open) => !open)}
                            className="h-10 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-xs font-bold text-left"
                          >
                            {targetStreamId
                              ? classStreamDisplayLabel(selectedStream)
                              : 'Select Class'}
                          </button>
                          {isSelectClassOpen && (
                            <div className="absolute z-50 mt-2 w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xl p-2 space-y-2">
                              <label className="inline-flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-200 select-none px-1">
                                <input
                                  type="checkbox"
                                  checked={useMyClassesOnly}
                                  onChange={(e) => setUseMyClassesOnly(e.target.checked)}
                                  className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                                />
                                Use my class
                              </label>
                              <p className="px-1 -mt-1 text-[10px] font-semibold text-zinc-400">Uncheck the box to select other classes.</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setTargetClassId('');
                                  setTargetStreamId('');
                                  setIsSelectClassOpen(false);
                                }}
                                className="w-full text-left px-2 py-2 rounded-lg text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                              >
                                Select Class
                              </button>
                              <div className="max-h-56 overflow-y-auto space-y-1">
                                {selectableStreams.map((s: any) => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                      const resolvedClass = resolveClassForStream(s);
                                      setTargetClassId(resolvedClass?.id || '');
                                      setTargetStreamId(s.id);
                                      setIsSelectClassOpen(false);
                                    }}
                                    className="w-full text-left px-2 py-2 rounded-lg text-xs font-bold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                  >
                                    {classStreamDisplayLabel(s)}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (!uploadChoice) {
                              setUploadStatus('Choose what to upload');
                              return;
                            }
                            if (uploadChoice === 'YOUTUBE') {
                              setLinkResourceKind('YOUTUBE');
                              setIsLinkModalOpen(true);
                              return;
                            }
                            studioUploadInputRef.current?.click();
                          }}
                          className="h-10 w-10 rounded-xl bg-black hover:bg-zinc-800 text-white flex items-center justify-center"
                          aria-label="Upload"
                          title="Upload"
                        >
                          <Upload size={15} />
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={uploadAudience === 'WHOLE_CLASS' ? 'primary' : 'outline'}
                          className={`h-9 rounded-xl text-xs font-bold ${uploadAudience === 'WHOLE_CLASS' ? 'bg-black hover:bg-zinc-800 border-black text-white dark:bg-black dark:hover:bg-zinc-800 dark:text-white' : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800'}`}
                          onClick={() => setUploadAudience('WHOLE_CLASS')}
                        >
                          <Users size={14} />
                          Whole Class
                        </Button>
                        <Button
                          variant={uploadAudience === 'SUBJECT_STUDENTS' ? 'primary' : 'outline'}
                          className={`h-9 rounded-xl text-xs font-bold ${uploadAudience === 'SUBJECT_STUDENTS' ? 'bg-black hover:bg-zinc-800 border-black text-white dark:bg-black dark:hover:bg-zinc-800 dark:text-white' : 'border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800'}`}
                          onClick={() => setUploadAudience('SUBJECT_STUDENTS')}
                        >
                          <BookOpen size={14} />
                          Subject Students
                        </Button>
                        {uploadAudience === 'SUBJECT_STUDENTS' && (
                          <select value={targetSubjectId} onChange={(e) => setTargetSubjectId(e.target.value)} className="h-9 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 text-xs font-semibold min-w-[180px]">
                            <option value="">Choose Subject</option>
                            {uploadAudienceSubjects.map((s: any) => (
                              <option key={s.id} value={s.id}>{`${s.name} students`}</option>
                            ))}
                          </select>
                        )}
                        <Button
                          variant="outline"
                          className="h-9 rounded-xl text-xs font-bold bg-black hover:bg-zinc-800 border-black text-white dark:bg-black dark:hover:bg-zinc-800 dark:text-white"
                          onClick={() => setPackTitle((prev) => prev || `${selectedClassName} ${streamDisplayName(selectedStream)}`.trim())}
                        >
                          <Plus size={14} /> Add Pack
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          value={uploadName}
                          onChange={(e) => setUploadName(e.target.value)}
                          placeholder="Upload name"
                          className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 text-xs font-semibold"
                        />
                        <input
                          value={packTitle}
                          onChange={(e) => setPackTitle(e.target.value)}
                          placeholder="Pack title (optional)"
                          className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 text-xs font-semibold"
                        />
                      </div>

                      <div className={`mt-1 rounded-xl border px-3 py-2 text-[12px] font-semibold flex items-center gap-2 ${uploadAudience === 'WHOLE_CLASS' ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/50 dark:bg-amber-950/20 dark:text-amber-300' : 'border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-800/50 dark:bg-cyan-950/20 dark:text-cyan-300'}`}>
                        <AlertTriangle size={14} />
                        <span>{audienceAlert}</span>
                      </div>
                    </div>

                    <div className="xl:col-span-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-950 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Pack Preview</p>
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{draftResources.length} item(s)</span>
                      </div>
                      <div className="rounded-xl border border-zinc-200/90 bg-white/90 dark:bg-zinc-950/80 p-3 shadow-sm backdrop-blur-sm">
                        <div className="mb-3 rounded-lg border border-zinc-200 bg-white dark:bg-zinc-900 px-3 py-2.5">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-semibold text-zinc-700 dark:text-zinc-200">
                            <span className="inline-flex items-center gap-1.5"><BookOpen size={12} className="text-zinc-500" /> <span className="text-zinc-400">Class:</span> {selectedClassName || '-'}</span>
                            <span className="inline-flex items-center gap-1.5"><Users size={12} className="text-zinc-500" /> <span className="text-zinc-400">Stream:</span> {streamDisplayName(selectedStream) || '-'}</span>
                            <span className="inline-flex items-center gap-1.5 min-w-0"><Upload size={12} className="text-zinc-500" /> <span className="text-zinc-400">Upload:</span> <span className="truncate max-w-[180px]">{uploadName || '-'}</span></span>
                          </div>
                        </div>
                        <div className="space-y-0 max-h-56 overflow-y-auto">
                        {draftResources.length === 0 ? (
                          <div className="h-24 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center text-[11px] font-bold text-zinc-400">Nothing added yet</div>
                        ) : draftResources.map((item) => (
                          <div key={item.id} className="px-1 py-2 flex items-center justify-between gap-3 border-b border-zinc-100 last:border-b-0">
                            <div className="h-10 w-14 rounded-lg bg-zinc-100 border border-zinc-200 overflow-hidden flex items-center justify-center shrink-0">
                              {item.file?.type?.startsWith('video/') ? (
                                <video className="h-full w-full object-cover" src={URL.createObjectURL(item.file)} muted />
                              ) : item.file?.type?.startsWith('image/') ? (
                                <img className="h-full w-full object-cover" src={URL.createObjectURL(item.file)} alt={item.title} />
                              ) : item.mode === 'YOUTUBE' || item.mode === 'LINK' ? (
                                <Link2 size={16} className="text-cyan-600" />
                              ) : item.file?.name?.toLowerCase().endsWith('.pdf') ? (
                                <FileText size={16} className="text-red-500" />
                              ) : (
                                <NotebookPen size={16} className="text-zinc-500" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-zinc-800 truncate">{item.title}</p>
                              <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-black">{draftTypeLabel(item.mode)}</p>
                            </div>
                            <button type="button" onClick={() => removeDraftResource(item.id)} className="h-7 w-7 rounded-lg border border-zinc-200 text-zinc-400 hover:text-red-500 hover:border-red-200 flex items-center justify-center">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          variant="primary"
                          className="h-10 rounded-xl text-xs font-bold flex-1 bg-black hover:bg-zinc-800 text-white dark:bg-black dark:hover:bg-zinc-800"
                          onClick={() => {
                            if (!uploadChoice) {
                              setUploadStatus('Choose what to upload');
                              return;
                            }
                            if (uploadChoice === 'YOUTUBE') {
                              setLinkResourceKind('YOUTUBE');
                              setIsLinkModalOpen(true);
                              return;
                            }
                            studioUploadInputRef.current?.click();
                          }}
                        >
                          <Upload size={14} /> Upload
                        </Button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Button variant="primary" className="h-8 rounded-lg text-[11px] font-semibold flex-1 bg-emerald-800 hover:bg-emerald-700 text-white border border-emerald-800 shadow-sm disabled:opacity-100 disabled:bg-emerald-400 disabled:border-emerald-400 disabled:text-white" onClick={publishDraftResources} disabled={draftResources.length === 0 || uploading}>Save & Publish</Button>
                        <Button variant="secondary" className="h-8 rounded-lg text-[11px] font-semibold flex-1 bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-800 shadow-sm disabled:opacity-100 disabled:bg-zinc-400 disabled:border-zinc-400 disabled:text-white" onClick={() => setUploadStatus('Draft saved')} disabled={draftResources.length === 0}>Draft</Button>
                        <Button variant="outline" className="h-8 rounded-lg text-[11px] font-semibold flex-1 bg-red-800 hover:bg-red-700 border border-red-800 text-white shadow-sm disabled:opacity-100 disabled:bg-red-400 disabled:border-red-400 disabled:text-white" onClick={() => { setDraftResources([]); setUploadName(''); setUploadStatus('Cancelled'); }} disabled={draftResources.length === 0}>Cancel</Button>
                      </div>
                      <div className={`mt-2 rounded-lg border px-3 py-2 text-[11px] font-semibold ${uploadStatus.toLowerCase().includes('failed') ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300' : uploadStatus.toLowerCase().includes('published') ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300'}`}>
                        {uploadStatus}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                 <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-x-auto">
                    {[
                      { key: 'ALL', label: 'All' },
                      { key: 'RECORDINGS_VIDEOS', label: 'Recordings & Videos' },
                      { key: 'NOTES_PDFS', label: 'Notes & PDFs' },
                      { key: 'ARCHIVE', label: 'Archive' }
                    ].map((tab) => (
                      <button 
                        key={tab.key}
                        onClick={() => setLibraryTab(tab.key as LibraryTab)}
                        className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${libraryTab === tab.key ? 'bg-white dark:bg-zinc-900 shadow-sm text-zinc-950 dark:text-white' : 'text-zinc-500 hover:text-zinc-700'}`}
                      >
                        {tab.label}
                      </button>
                    ))}
                 </div>
                 {isTeacher && (
                   <button 
                     onClick={() => setShowUploadForm(p => !p)}
                     className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-black dark:bg-white dark:hover:bg-zinc-100 dark:text-zinc-900 text-white text-xs font-bold transition-all shadow-md flex items-center gap-2"
                   >
                     {showUploadForm ? <X size={14} /> : <Upload size={14} />}
                     {showUploadForm ? 'Close Upload Menu' : 'Upload to Myclass'}
                   </button>
                 )}
              </div>

              <div className="space-y-12">
                {feedForTab.length === 0 ? (
                  <div className="py-24 text-center opacity-40">
                    <div className="h-12 w-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl mx-auto mb-4 flex items-center justify-center">
                       <FileText size={24} strokeWidth={1.5} />
                    </div>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Repository Empty</p>
                  </div>
                ) : (
                  <>
                    {/* RECORDINGS ROW */}
                    {feedForTab.some(i => i.type === 'RECORDING') && (
                      <div className="space-y-4">
                         <div className="flex items-center gap-2 px-1">
                            <div className="h-8 w-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center"><Video size={14} className="fill-current" /></div>
                            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider">Pre-Recorded Classes</h3>
                         </div>
                         <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x w-full">
                           {feedForTab.filter(i => i.type === 'RECORDING').map(item => (
                             <div key={item.id} className="min-w-[280px] max-w-[280px] sm:min-w-[320px] group relative rounded-2xl bg-zinc-900 overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-800 snap-center shrink-0">
                                <div className="aspect-video w-full bg-black relative flex items-center justify-center overflow-hidden">
                                   <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/40 to-transparent z-10 pointer-events-none" />
                                   <div className="absolute top-3 left-3 z-20">
                                      <Badge variant="danger" className="text-[9px] font-black uppercase rounded-sm px-2 bg-rose-600 border-none text-white shadow-lg">Video</Badge>
                                   </div>
                                   <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white z-20 group-hover:scale-110 transition-all border border-white/10 shadow-xl">
                                      <Video size={20} className="fill-current" />
                                   </div>
                                   <div className="absolute bottom-3 right-3 z-20 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-[10px] font-bold text-white border border-white/10">
                                      {relativeTime(item.postedAt)}
                                   </div>
                                   {isTeacher && (
                                     <button className="absolute top-3 right-3 z-30 w-8 h-8 flex items-center justify-center text-white/70 hover:bg-rose-600 hover:text-white rounded-lg backdrop-blur-md border border-transparent transition-all opacity-0 group-hover:opacity-100">
                                        <Trash2 size={14} />
                                     </button>
                                   )}
                                </div>
                                <div className="p-4 bg-white dark:bg-zinc-900 relative z-20 border-t border-zinc-100 dark:border-zinc-800">
                                   <h4 className="text-sm font-black text-zinc-900 dark:text-white mb-3 line-clamp-2 leading-tight">{item.title}</h4>
                                   <div className="flex items-center gap-2">
                                      {item.fileUrl && (
                                        <>
                                          <a href={item.fileUrl} target="_blank" className="flex-1 h-9 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all">
                                             Watch Now
                                          </a>
                                          <a href={item.fileUrl} download={item.title} target="_blank" className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all">
                                             <Download size={16} />
                                          </a>
                                          <button onClick={() => { navigator.clipboard.writeText(item.fileUrl!); alert('Link copied to clipboard!'); }} className="w-9 h-9 flex items-center justify-center rounded-xl bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all">
                                             <Share2 size={16} />
                                          </button>
                                        </>
                                      )}
                                      <button onClick={() => toggleStar(item.id)} className={cn("w-9 h-9 flex items-center justify-center rounded-xl transition-all", starredResources.includes(item.id) ? "bg-amber-50 text-amber-500" : "bg-zinc-50 dark:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-white")}>
                                         <Bookmark size={16} className={starredResources.includes(item.id) ? "fill-current" : ""} />
                                      </button>
                                   </div>
                                </div>
                             </div>
                           ))}
                         </div>
                      </div>
                    )}

                    {/* ASSIGNMENTS ROW */}
                    {feedForTab.some(i => i.type === 'ASSIGNMENT' || i.type === 'HOLIDAY_WORK') && (
                      <div className="space-y-4">
                         <div className="flex items-center gap-2 px-1">
                            <div className="h-8 w-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center"><AlertTriangle size={14} className="fill-current" /></div>
                            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider">Action Required: Assignments</h3>
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                           {feedForTab.filter(i => i.type === 'ASSIGNMENT' || i.type === 'HOLIDAY_WORK').map(item => (
                             <div key={item.id} className="relative p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-zinc-900 dark:to-zinc-900 border border-amber-200 dark:border-amber-900/50 rounded-2xl shadow-sm overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                   <NotebookPen size={64} />
                                </div>
                                <div className="flex items-center justify-between mb-4 relative z-10">
                                   <Badge variant="warning" className="text-[9px] font-black uppercase tracking-widest px-2.5">Pending</Badge>
                                   {item.dueAt && <span className="text-[10px] font-bold text-rose-500 flex items-center gap-1"><Clock size={12}/> Due soon</span>}
                                   {isTeacher && (
                                     <button className="w-7 h-7 absolute top-0 right-0 flex items-center justify-center text-zinc-400 hover:text-rose-600 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                                        <Trash2 size={14} />
                                     </button>
                                   )}
                                </div>
                                <h4 className="text-sm font-black text-zinc-900 dark:text-white mb-2 line-clamp-2 relative z-10">{item.title}</h4>
                                <p className="text-[11px] text-zinc-500 font-medium mb-6 relative z-10 line-clamp-2">{item.preview}</p>
                                
                                <div className="flex items-center gap-2 relative z-10">
                                   {item.fileUrl ? (
                                     <>
                                       <a href={item.fileUrl} target="_blank" className="flex-1 h-9 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20">
                                          Start Work
                                       </a>
                                       <button onClick={() => { navigator.clipboard.writeText(item.fileUrl!); alert('Link copied to clipboard!'); }} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/50 dark:bg-zinc-800 text-zinc-400 hover:text-amber-600 transition-all">
                                          <Share2 size={16} />
                                       </button>
                                     </>
                                   ) : (
                                     <button className="flex-1 h-9 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center transition-all">
                                        View Details
                                     </button>
                                   )}
                                   <button onClick={() => toggleStar(item.id)} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/50 dark:bg-zinc-800 text-zinc-400 hover:text-amber-600 transition-all">
                                      <Bookmark size={16} className={starredResources.includes(item.id) ? "fill-current text-amber-500" : ""} />
                                   </button>
                                </div>
                             </div>
                           ))}
                         </div>
                      </div>
                    )}

                    {/* NOTES & PDFS ROW */}
                    {feedForTab.some(i => i.type === 'NOTE' || i.type === 'LINK' || i.type === 'SHARED_FILE') && (
                      <div className="space-y-4">
                         <div className="flex items-center gap-2 px-1">
                            <div className="h-8 w-8 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center"><BookOpen size={14} className="fill-current" /></div>
                            <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider">Digital Resource Hub</h3>
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                           {feedForTab.filter(i => i.type === 'NOTE' || i.type === 'LINK' || i.type === 'SHARED_FILE').map(item => (
                             <div key={item.id} className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex gap-4 items-center group hover:border-zinc-300 dark:hover:border-zinc-700 transition-all relative">
                                <div className="h-14 w-12 rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center flex-shrink-0 relative overflow-hidden">
                                   <div className="absolute top-0 w-full h-1 bg-blue-500" />
                                   {item.type === 'LINK' ? <Link2 size={16} className="text-blue-500" /> : <FileText size={16} className="text-blue-500" />}
                                </div>
                                <div className="flex-1 min-w-0 pr-8">
                                   <h4 className="text-xs font-bold text-zinc-900 dark:text-white truncate pr-4">{item.title}</h4>
                                   <div className="flex items-center gap-3 mt-1 text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">
                                      <span>{item.type === 'LINK' ? 'External Link' : 'PDF Document'}</span>
                                      <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                                      <span>{relativeTime(item.postedAt)}</span>
                                   </div>
                                </div>
                                <div className="flex items-center gap-1 absolute right-4">
                                  {isTeacher && (
                                     <button className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all opacity-0 group-hover:opacity-100">
                                        <Trash2 size={14} />
                                     </button>
                                  )}
                                  {item.fileUrl && (
                                     <>
                                       <button onClick={() => { navigator.clipboard.writeText(item.fileUrl!); alert('Link copied to clipboard!'); }} className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all opacity-0 group-hover:opacity-100">
                                          <Share2 size={14} />
                                       </button>
                                       <a href={item.fileUrl} target="_blank" className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex-shrink-0 transition-all">
                                          <Download size={14} />
                                       </a>
                                     </>
                                  )}
                                </div>
                             </div>
                           ))}
                         </div>
                      </div>
                    )}
                  </>
                )}
              </div>
           </div>


        </div>
      )}

      {/* Starting Class Modal */}
      <Modal
        isOpen={isStartClassModalOpen}
        onClose={() => { setIsStartClassModalOpen(false); setStartClassMode('CHOICE'); }}
        title="Session Launchpad"
      >
        <div className="space-y-4">
          {startClassMode === 'CHOICE' ? (
            <div className="grid grid-cols-1 gap-3">
              <button 
                className="w-full p-6 text-left rounded-2xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-all border border-transparent hover:border-zinc-200 group"
                onClick={() => setStartClassMode('CUSTOM')}
              >
                <div className="h-10 w-10 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center mb-4 transition-transform group-hover:rotate-12">
                   <Plus size={20} />
                </div>
                <p className="text-sm font-bold text-zinc-900 dark:text-white">Custom Session</p>
                <p className="text-[11px] text-zinc-500 font-medium tracking-tight mt-1 uppercase">For unscheduled or private lessons</p>
              </button>

              <button 
                className="w-full p-6 text-left rounded-2xl bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700/50 transition-all border border-transparent hover:border-zinc-200 group disabled:opacity-50"
                disabled={!selectedSession}
                onClick={startSessionTemplate}
              >
                <div className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center mb-4 transition-transform group-hover:rotate-12">
                   <CalendarDays size={20} />
                </div>
                <p className="text-sm font-bold text-zinc-900 dark:text-white">Scheduled Lesson</p>
                <p className="text-[11px] text-zinc-500 font-medium tracking-tight mt-1 uppercase">{selectedSession ? `Sync: ${selectedSession.subject}` : 'No Class Selected'}</p>
              </button>
            </div>
          ) : startClassMode === 'CUSTOM' ? (
            <div className="space-y-4 pt-2">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Target Class</label>
                  <select value={customClassForm.streamId} onChange={e => setCustomClassForm({...customClassForm, streamId: e.target.value})} className="w-full h-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 text-xs font-bold outline-none">
                     <option value="">Select Stream</option>
                     {teacherStreams.map(s => <option key={s.id} value={s.id}>{s.class?.name} {s.name}</option>)}
                  </select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Subject</label>
                  <select value={customClassForm.subjectId} onChange={e => setCustomClassForm({...customClassForm, subjectId: e.target.value})} className="w-full h-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 text-xs font-bold outline-none">
                     <option value="">Select Subject</option>
                     {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Lesson Topic</label>
                  <input value={customClassForm.topic} onChange={e => setCustomClassForm({...customClassForm, topic: e.target.value})} placeholder="What are you teaching today?" className="w-full h-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 text-xs font-bold outline-none" />
               </div>
               <div className="grid grid-cols-2 gap-3 pt-4">
                  <div className="flex flex-col gap-2">
                     <button className="flex-1 h-11 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white rounded-xl text-xs font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all" onClick={() => setStartClassMode('SCHEDULE_DETAILS')}>Schedule later</button>
                  </div>
                  <Button variant="primary" className="flex-1 rounded-xl h-11 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white border-0" disabled={!customClassForm.streamId || !customClassForm.subjectId} onClick={handleStartNowCustom}>Start Now</Button>
               </div>
               <button className="w-full h-8 text-[10px] font-black text-zinc-400 uppercase tracking-widest hover:text-zinc-900 transition-all text-center" onClick={() => setStartClassMode('CHOICE')}>Change Session Type</button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
               <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Date</label>
                     <input type="date" value={customClassForm.scheduledDate} onChange={e => setCustomClassForm({...customClassForm, scheduledDate: e.target.value})} className="w-full h-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 text-xs font-bold outline-none" />
                  </div>
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Time</label>
                     <input type="time" value={customClassForm.scheduledTime} onChange={e => setCustomClassForm({...customClassForm, scheduledTime: e.target.value})} className="w-full h-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 text-xs font-bold outline-none" />
                  </div>
               </div>
               
               <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                  <div>
                     <p className="text-xs font-bold text-zinc-900 dark:text-white">Enable Reminder</p>
                     <p className="text-[10px] text-zinc-500 font-medium">Alert me 10 mins before start</p>
                  </div>
                  <button 
                     onClick={() => setCustomClassForm({...customClassForm, reminderEnabled: !customClassForm.reminderEnabled})}
                     className={cn("h-6 w-11 rounded-full transition-colors relative", customClassForm.reminderEnabled ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700")}
                  >
                     <div className={cn("absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-all shadow-sm", customClassForm.reminderEnabled ? "translate-x-5" : "translate-x-0")} />
                  </button>
               </div>

               <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1 rounded-xl h-11 text-xs font-bold" onClick={() => setStartClassMode('CUSTOM')}>Back</Button>
                  <Button variant="primary" className="flex-1 rounded-xl h-11 text-xs font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-0" disabled={!customClassForm.scheduledDate || !customClassForm.scheduledTime} onClick={handleScheduleCustom}>Save Schedule</Button>
               </div>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        title="Add External Resource"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLinkResourceKind('EXTERNAL')}
                className={`h-11 rounded-xl border text-xs font-bold transition-all ${linkResourceKind === 'EXTERNAL' ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'}`}
              >
                External Link
              </button>
              <button
                type="button"
                onClick={() => setLinkResourceKind('YOUTUBE')}
                className={`h-11 rounded-xl border text-xs font-bold transition-all ${linkResourceKind === 'YOUTUBE' ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white' : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-500'}`}
              >
                YouTube
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Title</label>
            <input value={linkResourceTitle} onChange={(e) => setLinkResourceTitle(e.target.value)} placeholder="Lesson title or description" className="w-full h-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 text-xs font-bold outline-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">URL</label>
            <input value={linkResourceUrl} onChange={(e) => setLinkResourceUrl(e.target.value)} placeholder={linkResourceKind === 'YOUTUBE' ? 'https://youtube.com/...' : 'https://...'} className="w-full h-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 text-xs font-bold outline-none" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl h-11 text-xs font-bold" onClick={() => setIsLinkModalOpen(false)}>Cancel</Button>
            <Button variant="primary" className="flex-1 rounded-xl h-11 text-xs font-bold" disabled={!linkResourceUrl.trim()} onClick={handleLinkPublish}>Add to Preview</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isMySubjectsModalOpen}
        onClose={() => setIsMySubjectsModalOpen(false)}
        title="My Subjects"
      >
        <div className="space-y-3">
          <p className="text-xs font-semibold text-zinc-500">Subjects and classes assigned to you.</p>
          {teacherSubjectClassRows.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 px-4 py-5 text-xs font-semibold text-zinc-500">
              No subject assignments found yet.
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto rounded-xl border border-zinc-200 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800">
              {teacherSubjectClassRows.map((row) => (
                <div key={row.key} className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white">{row.subjectName}</p>
                    <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">{row.classLabel}</p>
                  </div>
                  <Button
                    variant="outline"
                    className="h-8 px-3 rounded-lg text-[11px] font-bold"
                    onClick={() => {
                      setWorkspaceMode('LIBRARY');
                      const stream = streams.find((s: any) => s.id === row.streamId);
                      const resolvedClass = resolveClassForStream(stream);
                      setTargetClassId(resolvedClass?.id || stream?.class_id || '');
                      setTargetStreamId(row.streamId);
                      setTargetSubjectId(row.subjectId);
                      setUploadAudience('SUBJECT_STUDENTS');
                      setIsMySubjectsModalOpen(false);
                    }}
                  >
                    Open
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Hidden Upload Inputs */}
      <input
        ref={studioUploadInputRef}
        type="file"
        accept={acceptForUploadChoice(uploadChoice)}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) queueFileResource(file);
          e.currentTarget.value = '';
        }}
      />
      <input ref={recordingInputRef} type="file" accept="video/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleRecordingUpload(file); e.currentTarget.value = ''; }} />
      <input ref={notesInputRef} type="file" accept="application/pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleNotePdfUpload(file); e.currentTarget.value = ''; }} />
      <input ref={assignmentInputRef} type="file" accept="application/pdf,.doc,.docx" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleAssignmentFileUpload(file); e.currentTarget.value = ''; }} />
      <input ref={sharedInputRef} type="file" accept="application/pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.zip" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleSharedFileUpload(file); e.currentTarget.value = ''; }} />
    </div>
  );
};

export default MyClassroom;
