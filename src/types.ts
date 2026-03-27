export type Role = 'PARENT' | 'STUDENT' | 'TEACHER' | 'ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string;
  studentId?: string; // For parents and students
  teacherId?: string; // For teachers
}

export interface Student {
  id: string;
  name: string;
  photo: string;
  admissionNumber: string;
  classId: string;
  teacherId: string;
  parentEmail: string;
  parentPhone: string;
  guardianName: string;
  secondaryGuardianName?: string;
  secondaryGuardianPhone?: string;
  medicalNotes?: string;
  allergyInfo?: string;
  enrollmentStatus?: 'ACTIVE' | 'TRANSFERRED' | 'EXITED';
  address: string;
  dateOfBirth: string;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  classId?: string; // If they are a class teacher
  department?: string;
  isHod?: boolean;
  maxLessonsPerWeek?: number;
  currentLessonsPerWeek?: number;
}

export interface Class {
  id: string;
  name: string;
  teacherId: string;
}

export interface Result {
  id: string;
  studentId: string;
  subject: string;
  marks: number;
  grade: string;
  term: string;
  year: number;
  examType?: 'CAT' | 'MIDTERM' | 'ENDTERM' | 'PROJECT';
  examWeight?: number;
  moderationStatus?: 'DRAFT' | 'TEACHER_SUBMITTED' | 'HOD_APPROVED' | 'DOS_APPROVED' | 'FINALIZED';
  previousMarks?: number;
  remarks?: string;
}

export interface FeeStatement {
  id: string;
  studentId: string;
  type: string;
  amount: number;
  paid: number;
  date: string;
  dueDate?: string;
  receiptNumber?: string;
  voteHead?: string;
  status: 'PAID' | 'PARTIAL' | 'UNPAID';
}

export interface SuspensionComplaint {
  id: string;
  studentId: string;
  type: 'SUSPENSION' | 'COMPLAINT';
  issue: string;
  issuedBy: string;
  date: string;
  category?: 'BULLYING' | 'ABSENTEEISM' | 'DRUGS' | 'CHEATING' | 'MISCONDUCT' | 'OTHER';
  evidenceUrl?: string;
  meetingNotes?: string;
  escalationLevel?: 'CLASS_TEACHER' | 'DEAN' | 'DEPUTY_PRINCIPAL' | 'PRINCIPAL';
  status: 'ACTIVE' | 'RESOLVED' | 'ACKNOWLEDGED';
}

export interface SchoolEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  targetRoles?: Role[];
  recurring?: 'NONE' | 'WEEKLY' | 'MONTHLY' | 'TERM';
  requiresPermissionSlip?: boolean;
  rsvps: { userId: string; respondedAt: string }[];
}

export interface NotificationItem {
  id: string;
  type: 'EVENT' | 'ANNOUNCEMENT' | 'RSVP' | 'SYSTEM';
  title: string;
  message: string;
  createdAt: string;
  targetRoles: Role[];
  readBy: string[];
  link?: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  pinned?: boolean;
  urgent?: boolean;
  channel?: 'IN_APP' | 'SMS' | 'EMAIL' | 'WHATSAPP';
  expiresAt?: string;
  targetRoles: Role[];
}
