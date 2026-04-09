import { supabase } from './supabase';
import { 
  Student, Teacher, Class, Stream, Exam, 
  ExamResult, Fee, Announcement, SchoolEvent 
} from '../types';

export const api = {
  // 1. STUDENTS
  async getStudents(schoolId: string): Promise<Student[]> {
    const { data, error } = await supabase
      .from('students')
      .select('*, profile:profiles!students_id_fkey(*), stream:streams!students_stream_id_fkey(*, class:classes!streams_class_id_fkey(*))')
      .eq('school_id', schoolId);
    
    if (error) {
      console.error('API getStudents error:', error);
      throw error;
    }
    return data as any[];
  },

  async addStudent(student: Partial<Student>) {
    const { data, error } = await supabase
      .from('students')
      .insert(student)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 2. TEACHERS
  async getTeachers(schoolId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('school_id', schoolId)
      .eq('role', 'TEACHER');
    if (error) throw error;
    return data;
  },

  // 3. ACADEMICS
  async getResults(schoolId: string): Promise<ExamResult[]> {
    const { data, error } = await supabase
      .from('exam_results')
      .select('*, subject:subjects(*), exam:exams!exam_results_exam_id_fkey(*)')
      .eq('school_id', schoolId);
    if (error) throw error;
    return data as any[];
  },

  async addResult(result: Partial<ExamResult>) {
    const { data, error } = await supabase
      .from('exam_results')
      .insert(result)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 4. LOGISTICS
  async getFees(schoolId: string): Promise<Fee[]> {
    const { data, error } = await supabase
      .from('fees')
      .select('*')
      .eq('school_id', schoolId);
    if (error) throw error;
    return data as any[];
  },

  async getStreams(schoolId: string): Promise<Stream[]> {
    const { data, error } = await supabase
      .from('streams')
      .select('*, class:classes!streams_class_id_fkey(*)')
      .eq('school_id', schoolId);
    if (error) throw error;
    return data as any[];
  },

  // 5. COMMUNICATIONS
  async getAnnouncements(schoolId: string): Promise<Announcement[]> {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as any[];
  },

  async getEvents(schoolId: string): Promise<SchoolEvent[]> {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('school_id', schoolId);
    if (error) throw error;
    return data as any[];
  },

  async getSchool(schoolId: string) {
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .single();
    if (error) throw error;
    return data;
  },

  // 6. RECORD MANAGEMENT (NEW)
  async getStudentSubjects(studentId: string) {
    const { data, error } = await supabase
      .from('student_subjects')
      .select('*, subject:subjects(*)')
      .eq('student_id', studentId);
    if (error) throw error;
    return data;
  },

  async enrollSubject(enrollment: { student_id: string, subject_id: string, school_id: string }) {
    const { data, error } = await supabase
      .from('student_subjects')
      .insert(enrollment)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getHealthRecord(studentId: string) {
    const { data, error } = await supabase
      .from('student_health')
      .select('*')
      .eq('student_id', studentId)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getDisciplinaryRecords(studentId: string) {
    const { data, error } = await supabase
      .from('disciplinary_records')
      .select('*')
      .eq('student_id', studentId)
      .order('incident_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async addDisciplinaryRecord(record: any) {
    const { data, error } = await supabase
      .from('disciplinary_records')
      .insert(record)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getActivities(schoolId: string) {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('school_id', schoolId);
    if (error) throw error;
    return data;
  },

  async getStudentActivities(studentId: string) {
    const { data, error } = await supabase
      .from('student_activities')
      .select('*, activity:activities(*)')
      .eq('student_id', studentId);
    if (error) throw error;
    return data;
  },
  
  async getStudentResultsAll(studentId: string) {
    const { data, error } = await supabase
      .from('exam_results')
      .select('*, subject:subjects(*), exam:exams!exam_results_exam_id_fkey(*, term:terms!exams_term_id_fkey(*))')
      .eq('student_id', studentId);
    if (error) throw error;
    return data;
  }
};
