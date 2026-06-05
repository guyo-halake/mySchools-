export type Role = 'ADMIN' | 'PRINCIPAL' | 'TEACHER' | 'PARENT' | 'STUDENT' | 'STAFF' | 'BURSAR';
export type ExamType = 'MID_TERM' | 'END_TERM' | 'FORMATIVE' | 'SUMMATIVE';
export type FeeStatus = 'PAID' | 'PARTIAL' | 'UNPAID';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';
export type DisciplineStatus = 'ACTIVE' | 'RESOLVED' | 'ACKNOWLEDGED';

// CBC Specific Types
export type CBC4BandRating = 'EE' | 'ME' | 'AE' | 'BE';
export type CBC8LevelRating = 'EE1' | 'EE2' | 'ME1' | 'ME2' | 'AE1' | 'AE2' | 'BE1' | 'BE2';

export interface CBCStudentAssessment {
  id: string;
  school_id: string;
  student_id: string;
  exam_id: string;
  subject_id: string;
  strand: string;
  sub_strand: string;
  rating: string;
  raw_score?: number;
  teacher_comment?: string;
  grade_level_at_time: number;
}

export interface School {
  id: string;
  name: string;
  subdomain: string;
  email?: string;
  location?: string;
  phone_numbers: string[];
  bank_name?: string;
  bank_acc?: string;
  paybill_no?: string;
}

export interface Profile {
  id: string;
  school_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  role: Role;
  avatar_url?: string;
  tsc_number?: string;
  rating?: number;
  username?: string;
  is_class_teacher?: boolean;
}

export interface Class {
  id: string;
  school_id: string;
  name: string;
  level: number;
}

export interface Stream {
  id: string;
  school_id: string;
  class_id: string;
  name: string;
  class_teacher_id?: string;
  // Join data
  class?: Class;
  teacher?: Profile;
}

export interface Student {
  id: string; // Primary key (Profile ID)
  school_id: string;
  adm_no: string;
  stream_id?: string;
  parent_id?: string;
  sport?: string;
  discipline_status: DisciplineStatus;
  date_of_birth?: string;
  address?: string;
  // Join data
  profile?: Profile;
  stream?: Stream;
  parent?: Profile;
}

export interface Subject {
  id: string;
  school_id: string;
  name: string;
  code?: string;
}

export interface Term {
  id: string;
  school_id: string;
  name: string;
  year: number;
  start_date?: string;
  end_date?: string;
}

export interface Exam {
  id: string;
  school_id: string;
  term_id: string;
  name: string;
  type: ExamType;
  date?: string;
}

export interface ExamResult {
  id: string;
  school_id: string;
  student_id: string;
  exam_id: string;
  subject_id: string;
  marks: number;
  grade?: string;
  // Join data
  subject?: Subject;
  exam?: Exam;
}

export interface Fee {
  id: string;
  school_id: string;
  student_id: string;
  term_id: string;
  type: string;
  amount_due: number;
  amount_paid: number;
  status: FeeStatus;
}

export interface Attendance {
  id: string;
  student_id: string;
  date: string;
  status: AttendanceStatus;
  term_id: string;
  remarks?: string;
}

export interface Announcement {
  id: string;
  school_id: string;
  title: string;
  content: string;
  author_id: string;
  target_roles: Role[];
  created_at: string;
}

export interface SchoolEvent {
  id: string;
  school_id: string;
  title: string;
  description?: string;
  date: string;
  location?: string;
  rsvps: string[];
}

export interface ClassroomSession {
  id: string;
  school_id: string;
  teacher_id?: string;
  stream_id?: string;
  subject_id?: string;
  title: string;
  class_label?: string;
  day_name?: string;
  start_time?: string;
  end_time?: string;
  status: string;
  room_url?: string;
  template_started_at?: string;
  auto_close_at?: string;
  closed_at?: string;
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface ELibraryResource {
  id: string;
  school_id: string;
  title: string;
  resource_type: string;
  url?: string;
  subject_id?: string;
  tags?: string[];
  color_theme?: string;
  icon_name?: string;
  created_at: string;
  updated_at: string;
}

export interface MattaAcademyCourse {
  id: string;
  title: string;
  description?: string;
  progress: number;
  students_enrolled?: string;
  syllabus_json?: any;
  created_at: string;
  updated_at: string;
}
