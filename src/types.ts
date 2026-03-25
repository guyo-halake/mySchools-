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
  address: string;
  dateOfBirth: string;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  subjects: string[];
  classId?: string; // If they are a class teacher
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
  status: 'PAID' | 'PARTIAL' | 'UNPAID';
}

export interface SuspensionComplaint {
  id: string;
  studentId: string;
  type: 'SUSPENSION' | 'COMPLAINT';
  issue: string;
  issuedBy: string;
  date: string;
  status: 'ACTIVE' | 'RESOLVED' | 'ACKNOWLEDGED';
}

export interface SchoolEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  rsvps: string[]; // user ids
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  targetRoles: Role[];
}
