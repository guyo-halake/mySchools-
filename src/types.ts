export type Role = 'ADMIN' | 'TEACHER' | 'PARENT' | 'STUDENT' | 'STAFF';
export type ExamType = 'MID_TERM' | 'END_TERM';
export type FeeStatus = 'PAID' | 'PARTIAL' | 'UNPAID';
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';
export type DisciplineStatus = 'ACTIVE' | 'RESOLVED' | 'ACKNOWLEDGED';

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
  id: string; -- Primary key (Profile ID)
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
