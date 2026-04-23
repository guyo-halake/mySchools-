import { supabase } from './supabase';
import {
  Student, Teacher, Class, Stream, Exam, Subject,
  ExamResult, Fee, Announcement, SchoolEvent
} from '../types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value?: string | null) => Boolean(value && UUID_RE.test(value));

export const api = {
  // 1. STUDENTS
  async getStudents(schoolId: string): Promise<Student[]> {
    if (!isUuid(schoolId)) return [];
    const { data, error } = await supabase
      .from('students')
      .select('*, profile:profiles!students_id_fkey(*)')
      .eq('school_id', schoolId);

    if (error) {
      console.error('API getStudents error:', error);
      throw error;
    }
    return data as any[];
  },

  async getStudentsByParentId(schoolId: string, parentId: string): Promise<Student[]> {
    if (!isUuid(schoolId) || !isUuid(parentId)) return [];
    const { data, error } = await supabase
      .from('students')
      .select('*, profile:profiles!students_id_fkey(*), stream:streams!students_stream_id_fkey(*, class:classes!streams_class_id_fkey(*), teacher:profiles!streams_class_teacher_id_fkey(*))')
      .eq('school_id', schoolId)
      .eq('parent_id', parentId);

    if (error) {
      console.error('API getStudentsByParentId error:', error);
      throw error;
    }
    return data as any[];
  },

  async getStudentByProfileId(schoolId: string, profileId: string): Promise<Student | null> {
    if (!isUuid(schoolId) || !isUuid(profileId)) return null;
    const { data, error } = await supabase
      .from('students')
      .select('*, profile:profiles!students_id_fkey(*), stream:streams!students_stream_id_fkey(*, class:classes!streams_class_id_fkey(*), teacher:profiles!streams_class_teacher_id_fkey(*))')
      .eq('school_id', schoolId)
      .eq('id', profileId)
      .maybeSingle();

    if (error) {
      console.error('API getStudentByProfileId error:', error);
      throw error;
    }
    return data;
  },

  async getStudentById(studentId: string): Promise<any> {
    if (!isUuid(studentId)) return null;
    const { data, error } = await supabase
      .from('students')
      .select('*, profile:profiles!students_id_fkey(*), stream:streams!students_stream_id_fkey(*, class:classes!streams_class_id_fkey(*), teacher:profiles!streams_class_teacher_id_fkey(*))')
      .eq('id', studentId)
      .maybeSingle();

    if (error) {
      console.error('API getStudentById error:', error);
      throw error;
    }
    return data;
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
    if (!isUuid(schoolId)) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('school_id', schoolId)
      .eq('role', 'TEACHER');
    if (error) throw error;
    return data || [];
  },

  async getParents(schoolId: string) {
    if (!isUuid(schoolId)) return [];
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('school_id', schoolId)
      .eq('role', 'PARENT');
    if (error) throw error;
    return data || [];
  },

  async bookAppointment(appointment: {
    school_id: string,
    parent_id: string,
    teacher_id: string,
    student_id: string,
    appointment_date: string,
    appointment_time: string,
    reason: string
  }) {
    const { data, error } = await supabase
      .from('appointments')
      .insert(appointment)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // 3. ACADEMICS
  async getResults(schoolId: string): Promise<ExamResult[]> {
    if (!isUuid(schoolId)) return [];
    const { data, error } = await supabase
      .from('exam_results')
      .select('*, subject:subjects(*), exam:exams!exam_results_exam_id_fkey(*)')
      .eq('school_id', schoolId);
    if (error) throw error;
    return data as any[];
  },

  async getSubjects(schoolId: string): Promise<Subject[]> {
    if (!isUuid(schoolId)) return [];
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('school_id', schoolId)
      .order('name', { ascending: true });
    if (error) throw error;
    return (data || []) as Subject[];
  },

  async getAppointmentsByTeacher(teacherId: string) {
    if (!isUuid(teacherId)) return [];
    const { data, error } = await supabase
      .from('appointments')
      .select('*, parent:profiles!appointments_parent_id_fkey(*), student:students(id, profile:profiles!students_id_fkey(*))')
      .eq('teacher_id', teacherId)
      .order('appointment_date', { ascending: true });
    if (error) throw error;
    return data;
  },

  async getStudentsByParentId(schoolId: string, parentId: string) {
    if (!isUuid(schoolId) || !isUuid(parentId)) return [];
    const { data, error } = await supabase
      .from('students')
      .select('*, profile:profiles!students_id_fkey(*), class:classes(*), stream:streams(*)')
      .eq('school_id', schoolId)
      .eq('parent_id', parentId);
    if (error) throw error;
    return data;
  },

  async getExams(schoolId: string): Promise<Exam[]> {
    if (!isUuid(schoolId)) return [];
    const { data, error } = await supabase
      .from('exams')
      .select('*, term:terms!exams_term_id_fkey(*)')
      .eq('school_id', schoolId)
      .order('date', { ascending: false, nullsFirst: false });
    if (error) throw error;
    return (data || []) as any[];
  },

  async upsertTerm(term: { school_id: string, name: string, year: number, start_date: string, end_date: string }) {
    if (!isUuid(term.school_id)) return null;

    // Check for existing
    const { data: existing } = await supabase
      .from('terms')
      .select('id')
      .eq('school_id', term.school_id)
      .eq('name', term.name)
      .eq('year', term.year)
      .maybeSingle();

    if (existing?.id) {
      const { data, error } = await supabase
        .from('terms')
        .update({ start_date: term.start_date, end_date: term.end_date })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('terms')
        .insert(term)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
  },

  async setCurrentTerm(schoolId: string, termId: string) {
    if (!isUuid(schoolId) || !isUuid(termId)) return null;

    // 1. Reset all
    await supabase
      .from('terms')
      .update({ is_current: false })
      .eq('school_id', schoolId);

    // 2. Set new current
    const { data, error } = await supabase
      .from('terms')
      .update({ is_current: true })
      .eq('id', termId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getTerms(schoolId: string) {
    if (!isUuid(schoolId)) return [];
    const { data, error } = await supabase
      .from('terms')
      .select('*')
      .eq('school_id', schoolId)
      .order('year', { ascending: false })
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
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
    if (!isUuid(schoolId)) return [];
    const { data, error } = await supabase
      .from('fees')
      .select('*')
      .eq('school_id', schoolId);
    if (error) throw error;
    return data as any[];
  },

  async getFeePaymentRequests(schoolId: string, studentId?: string) {
    if (!isUuid(schoolId)) return [];
    let query = supabase
      .from('fee_payment_requests')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (studentId && isUuid(studentId)) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async createFeePaymentRequest(payload: {
    school_id: string;
    student_id: string;
    requester_id?: string | null;
    method: 'MPESA_STK' | 'BANK_PAYBILL' | 'CHEQUE' | string;
    amount: number;
    account_ref?: string | null;
    notes?: string | null;
  }) {
    const { data, error } = await supabase
      .from('fee_payment_requests')
      .insert(payload)
      .select('*')
      .single();
    if (error) throw error;
    return data;
  },

  async getClasses(schoolId: string): Promise<Class[]> {
    if (!isUuid(schoolId)) return [];
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('school_id', schoolId)
      .order('name', { ascending: true });
    if (error) throw error;

    // De-duplicate by name to prevent "Form 1" repeating if multiple records exist
    const uniqueClasses = (data || []).reduce((acc: any[], current: any) => {
      const x = acc.find(item => item.name === current.name);
      if (!x) return acc.concat([current]);
      else return acc;
    }, []);

    return uniqueClasses;
  },

  async getStreams(schoolId: string): Promise<Stream[]> {
    if (!isUuid(schoolId)) return [];
    const { data, error } = await supabase
      .from('streams')
      .select(`
        *,
        class:classes (name)
      `)
      .eq('school_id', schoolId);
    if (error) throw error;
    return (data || []).map((s: any) => ({
      ...s,
      full_name: `${s.class?.name || ''} ${s.name}`
    }));
  },

  // 5. COMMUNICATIONS
  async getAnnouncements(schoolId: string): Promise<Announcement[]> {
    if (!isUuid(schoolId)) return [];
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as any[];
  },

  async getEvents(schoolId: string): Promise<SchoolEvent[]> {
    if (!isUuid(schoolId)) return [];
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('school_id', schoolId)
      .order('date', { ascending: true });
    if (error) throw error;
    return data as any[];
  },

  async getNotifications(userId: string, schoolId: string) {
    if (!isUuid(userId) || !isUuid(schoolId)) return [];
    const { data, error } = await supabase
      .from('in_app_notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('API getNotifications error:', error);
      return [];
    }
    return data || [];
  },

  async markNotificationAsRead(id: string) {
    if (!isUuid(id)) return;
    await supabase
      .from('in_app_notifications')
      .update({ is_read: true })
      .eq('id', id);
  },

  async getSchool(schoolId: string) {
    if (!isUuid(schoolId)) return null;
    console.log("API: Fetching School Info:", schoolId);
    const { data, error } = await supabase
      .from('schools')
      .select('*')
      .eq('id', schoolId)
      .limit(1)
      .maybeSingle();
    if (error) {
      console.error("API ERROR [getSchool]:", error);
      throw error;
    }
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
    if (!isUuid(schoolId)) return [];
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

  async getAssignmentsByStream(streamId: string) {
    if (!isUuid(streamId)) return [];

    const { data: sessions, error: sessionsError } = await supabase
      .from('classroom_sessions')
      .select('id')
      .eq('stream_id', streamId)
      .order('created_at', { ascending: false });

    if (sessionsError) throw sessionsError;

    const sessionIds = (sessions || []).map((session: any) => session.id).filter(Boolean);
    if (!sessionIds.length) return [];

    const { data, error } = await supabase
      .from('classroom_assignments')
      .select('*')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getStudentResultsAll(studentId: string) {
    // Fetch results with subjects and exams/terms using explicit fkeys to be safe
    const { data, error } = await supabase
      .from('exam_results')
      .select(`
        *,
        subject:subjects!exam_results_subject_id_fkey(*),
        exam:exams!exam_results_exam_id_fkey(
          *,
          term:terms!exams_term_id_fkey(*)
        )
      `)
      .eq('student_id', studentId);
    if (error) {
      console.error('getStudentResultsAll error:', error);
      throw error;
    }
    return data;
  },

  async recomputeStudentTermAverages(schoolId?: string, termId?: string, studentId?: string) {
    const { error } = await supabase.rpc('recompute_student_term_averages', {
      p_school_id: schoolId || null,
      p_term_id: termId || null,
      p_student_id: studentId || null
    });
    if (error) throw error;
  },

  async getStudentSubjectTermAverages(schoolId: string, studentId: string, termId?: string) {
    if (!isUuid(schoolId) || !isUuid(studentId) || (termId && !isUuid(termId))) return [];
    let query = supabase
      .from('student_subject_term_averages')
      .select('*, subject:subjects!student_subject_term_averages_subject_id_fkey(id, name), term:terms!student_subject_term_averages_term_id_fkey(id, name, year)')
      .eq('school_id', schoolId)
      .eq('student_id', studentId)
      .order('subject_id', { ascending: true });

    if (termId) query = query.eq('term_id', termId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getStudentTermAverage(schoolId: string, studentId: string, termId?: string) {
    if (!isUuid(schoolId) || !isUuid(studentId) || (termId && !isUuid(termId))) return [];
    let query = supabase
      .from('student_term_averages')
      .select('*, term:terms!student_term_averages_term_id_fkey(id, name, year)')
      .eq('school_id', schoolId)
      .eq('student_id', studentId)
      .order('calculated_at', { ascending: false });

    if (termId) query = query.eq('term_id', termId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async getStudentTermAveragesByStudents(schoolId: string, termId: string, studentIds: string[]) {
    if (!isUuid(schoolId) || !isUuid(termId)) return [];
    if (!studentIds.length) return [];
    const validIds = studentIds.filter((id) => isUuid(id));
    if (!validIds.length) return [];

    const { data, error } = await supabase
      .from('student_term_averages')
      .select('student_id, term_id, average_mark, average_grade, subjects_count, calculated_at')
      .eq('school_id', schoolId)
      .eq('term_id', termId)
      .in('student_id', validIds);

    if (error) throw error;
    return data || [];
  },

  // 7. PRINCIPAL MANAGEMENT
  async getStreamsWithDetails(schoolId: string) {
    if (!isUuid(schoolId)) return [];
    const { data, error } = await supabase
      .from('streams')
      .select('*, class:classes!streams_class_id_fkey(*), teacher:profiles!streams_class_teacher_id_fkey(*), students(count)')
      .eq('school_id', schoolId);
    if (error) throw error;
    return data;
  },

  async updateStreamTeacher(streamId: string, teacherId: string) {
    if (!isUuid(streamId) || !isUuid(teacherId)) return null;
    return this.updateStreamProfile(streamId, { class_teacher_id: teacherId });
  },

  async updateStreamProfile(streamId: string, patch: {
    class_teacher_id?: string | null;
    main_mean_score?: number | null;
    target_mean_score?: number | null;
    target_term_id?: string | null;
    target_exam_id?: string | null;
  }) {
    if (!isUuid(streamId)) return null;
    const { data, error } = await supabase
      .from('streams')
      .update(patch)
      .eq('id', streamId)
      .select('*')
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getFeesFull(schoolId: string): Promise<any[]> {
    if (!isUuid(schoolId)) return [];

    // 1. Try direct match
    const { data, error } = await supabase
      .from('fees')
      .select(`
        *,
        student:students!fees_student_id_fkey (
          id,
          adm_no,
          parent_id,
          profile:profiles!students_id_fkey (full_name),
          stream:streams (
            class:classes (name)
          )
        )
      `)
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 2. If no data, try to find fees where the student belongs to this school 
    // (Legacy protection in case school_id in fees table is null)
    if (!data || data.length === 0) {
      const { data: legacyFees, error: legacyErr } = await supabase
        .from('fees')
        .select(`
          *,
          student:students!fees_student_id_fkey (
            id,
            adm_no,
            parent_id,
            profile:profiles!students_id_fkey (full_name),
            stream:streams (
              class:classes (name)
            )
          )
        `)
        .eq('student.school_id', schoolId)
        .order('created_at', { ascending: false });

      if (!legacyErr && legacyFees && legacyFees.length > 0) return legacyFees;
    }

    return data as any[];
  },

  async updateFeeStatus(feeId: string, status: string) {
    if (!isUuid(feeId)) return;
    const { data, error } = await supabase
      .from('fees')
      .update({ status })
      .eq('id', feeId)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async getStudentFees(studentId: string) {
    if (!isUuid(studentId)) return [];
    const { data, error } = await supabase
      .from('fees')
      .select('*, term:terms!fees_term_id_fkey(*)')
      .eq('student_id', studentId)
      .order('payment_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async setGlobalFees(schoolId: string, amount: number) {
    if (!isUuid(schoolId)) return [];
    const currentTerm = await this.getLatestTerm(schoolId);
    if (!currentTerm?.id) return [];

    // We update EVERY fee record for the school in the current term to have the new amount_due
    const { data, error } = await supabase
      .from('fees')
      .update({ amount_due: amount })
      .eq('school_id', schoolId)
      .eq('term_id', currentTerm.id);
    if (error) throw error;
    return data;
  },

  async getLatestTerm(schoolId: string) {
    if (!isUuid(schoolId)) return null;
    const { data, error } = await supabase
      .from('terms')
      .select('*')
      .eq('school_id', schoolId)
      .order('year', { ascending: false })
      .order('end_date', { ascending: false })
      .limit(1)
      .single();
    if (error) throw error;
    return data;
  },

  async getDisciplinarySchoolWide(schoolId: string) {
    if (!isUuid(schoolId)) return [];
    const { data, error } = await supabase
      .from('disciplinary_records')
      .select('*, student:students!disciplinary_records_student_id_fkey(*, profile:profiles!students_id_fkey(*))')
      .eq('school_id', schoolId)
      .order('incident_date', { ascending: false })
      .limit(10);
    if (error) throw error;
    return data;
  },

  async getHealthSchoolWide(schoolId: string) {
    if (!isUuid(schoolId)) return [];
    const { data, error } = await supabase
      .from('student_health')
      .select('*, student:students!student_health_student_id_fkey(school_id, profile:profiles!students_id_fkey(*))')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).filter((h: any) => h.student?.school_id === schoolId).slice(0, 10);
  },

  // 8. ATTENDANCE & TEACHER DASHBOARD
  async getTeacherStream(teacherId: string) {
    if (!isUuid(teacherId)) return null;
    const { data, error } = await supabase
      .from('streams')
      .select('*, class:classes!streams_class_id_fkey(*)')
      .eq('class_teacher_id', teacherId)
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async getStudentsByStream(streamId: string) {
    if (!isUuid(streamId)) return [];
    const { data, error } = await supabase
      .from('students')
      .select('*, profile:profiles!students_id_fkey(*)')
      .eq('stream_id', streamId);
    if (error) throw error;
    return data || [];
  },

  async getAttendanceByStream(streamId: string, date: string) {
    if (!isUuid(streamId)) return [];
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .in('student_id', (await supabase.from('students').select('id').eq('stream_id', streamId)).data?.map(s => s.id) || [])
      .eq('date', date);
    if (error) throw error;
    return data;
  },

  async markAttendance(records: { student_id: string, status: string, date: string, term_id: string }[]) {
    const { data, error } = await supabase
      .from('attendance')
      .upsert(records, { onConflict: 'student_id,date' });
    if (error) throw error;
    return data;
  },

  // 9. RESULTS WORKFLOW
  async getWorkflowStudents(streamId: string, subjectId?: string, search?: string) {
    let query = supabase
      .from('students')
      .select('*, profile:profiles!students_id_fkey(*)')
      .eq('stream_id', streamId)
      .order('adm_no', { ascending: true });

    if (search?.trim()) {
      const needle = `%${search.trim()}%`;

      // Step 1: Find matching profile IDs by name first
      const { data: pData } = await supabase
        .from('profiles')
        .select('id')
        .ilike('full_name', needle)
        .limit(100);

      const pIds = (pData || []).map(p => p.id);

      // Step 2: Search by admission number OR the found profile IDs
      if (pIds.length > 0) {
        query = query.or(`adm_no.ilike.${needle},id.in.(${pIds.map(id => `"${id}"`).join(',')})`);
      } else {
        query = query.ilike('adm_no', needle);
      }
    }

    const { data, error } = await query;
    if (error) throw error;

    const isUuid = !!subjectId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(subjectId);
    if (!isUuid) return data || [];

    const studentIds = (data || []).map((s: any) => s.id);
    if (studentIds.length === 0) return [];

    const { data: enrolled, error: enrolledErr } = await supabase
      .from('student_subjects')
      .select('student_id')
      .eq('subject_id', subjectId)
      .in('student_id', studentIds);
    if (enrolledErr) throw enrolledErr;

    if (!enrolled || enrolled.length === 0) {
      return data || [];
    }

    const allowed = new Set((enrolled || []).map((e: any) => e.student_id));
    return (data || []).filter((s: any) => allowed.has(s.id));
  },

  async getResultsWorkflow(params: {
    schoolId: string;
    streamId?: string;
    subjectId?: string;
    termId?: string;
    examType?: string;
    status?: string;
    studentId?: string;
  }) {
    let query = supabase
      .from('results_workflow')
      .select(`
        *,
        student:students!results_workflow_student_id_fkey(id, adm_no, profile:profiles!students_id_fkey(full_name)),
        subject:subjects!results_workflow_subject_id_fkey(id, name),
        term:terms!results_workflow_term_id_fkey(id, name, year),
        submitted_by_profile:profiles!results_workflow_submitted_by_fkey(id, full_name),
        class_teacher_profile:profiles!results_workflow_class_teacher_id_fkey(id, full_name)
      `)
      .eq('school_id', params.schoolId)
      .order('updated_at', { ascending: false });

    if (params.streamId) query = query.eq('stream_id', params.streamId);
    if (params.subjectId) query = query.eq('subject_id', params.subjectId);
    if (params.termId) query = query.eq('term_id', params.termId);
    if (params.examType) query = query.eq('exam_type', params.examType as any);
    if (params.status) query = query.eq('status', params.status as any);
    if (params.studentId) query = query.eq('student_id', params.studentId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async upsertResultsWorkflow(records: any[]) {
    if (!records.length) return [];
    const { data, error } = await supabase
      .from('results_workflow')
      .upsert(records, {
        onConflict: 'school_id,student_id,subject_id,term_id,exam_type,exam_name'
      })
      .select('*');
    if (error) throw error;
    return data || [];
  },

  async updateWorkflowStatus(ids: string[], patch: any) {
    if (!ids.length) return [];
    const { data, error } = await supabase
      .from('results_workflow')
      .update(patch)
      .in('id', ids)
      .select('*');
    if (error) throw error;
    return data || [];
  },

  async getLatestPublishedByStudents(studentIds: string[], subjectId?: string) {
    if (!studentIds.length) return [];
    let query = supabase
      .from('exam_results')
      .select('id, student_id, marks, grade, created_at, subject_id, exam:exams!exam_results_exam_id_fkey(id, date, name, type), subject:subjects!exam_results_subject_id_fkey(id, name)')
      .in('student_id', studentIds)
      .order('created_at', { ascending: false });

    if (subjectId) query = query.eq('subject_id', subjectId);

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async publishWorkflow(ids: string[], publisherId: string) {
    if (!ids.length) return { published: 0 };

    const { data: rows, error: rowsErr } = await supabase
      .from('results_workflow')
      .select('*')
      .in('id', ids)
      .eq('status', 'APPROVED');
    if (rowsErr) throw rowsErr;

    const approvedRows = rows || [];
    if (!approvedRows.length) return { published: 0 };

    const examsCache = new Map<string, string>();
    const getExamId = async (row: any) => {
      const key = `${row.term_id}|${row.exam_type}|${row.exam_name}`;
      const cached = examsCache.get(key);
      if (cached) return cached;

      const { data: found, error: foundErr } = await supabase
        .from('exams')
        .select('id')
        .eq('school_id', row.school_id)
        .eq('term_id', row.term_id)
        .eq('type', row.exam_type)
        .eq('name', row.exam_name)
        .maybeSingle();
      if (foundErr) throw foundErr;

      if (found?.id) {
        examsCache.set(key, found.id);
        return found.id;
      }

      const { data: created, error: createErr } = await supabase
        .from('exams')
        .insert({
          school_id: row.school_id,
          term_id: row.term_id,
          type: row.exam_type,
          name: row.exam_name,
          date: new Date().toISOString().slice(0, 10)
        })
        .select('id')
        .single();
      if (createErr) throw createErr;

      examsCache.set(key, created.id);
      return created.id;
    };

    const payload = [] as any[];
    for (const row of approvedRows) {
      const examId = await getExamId(row);
      payload.push({
        school_id: row.school_id,
        student_id: row.student_id,
        exam_id: examId,
        subject_id: row.subject_id,
        marks: row.marks,
        grade: row.grade
      });
    }

    const { error: insertErr } = await supabase
      .from('exam_results')
      .insert(payload);
    if (insertErr) throw insertErr;

    const now = new Date().toISOString();
    const { error: updateErr } = await supabase
      .from('results_workflow')
      .update({
        status: 'PUBLISHED',
        published_by: publisherId,
        published_at: now
      })
      .in('id', approvedRows.map((r: any) => r.id));
    if (updateErr) throw updateErr;

    const termPairs = new Set(
      approvedRows
        .map((r: any) => `${r.school_id}::${r.term_id}`)
        .filter((k: string) => !k.includes('::undefined') && !k.includes('::null'))
    );

    for (const key of termPairs) {
      const [schoolId, termId] = key.split('::');
      await this.recomputeStudentTermAverages(schoolId, termId);
    }

    return { published: approvedRows.length };
  },

  // 10. FEE STRUCTURE ENGINE
  async createFeeStructure(structure: any) {
    const { data, error } = await supabase
      .from('fee_structures')
      .insert(structure)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async addFeeItems(items: any[]) {
    const { data, error } = await supabase
      .from('fee_structure_items')
      .insert(items)
      .select();
    if (error) throw error;
    return data;
  },

  async getNotifications(userId: string): Promise<any[]> {
    if (!isUuid(userId)) return [];
    try {
      const { data, error } = await supabase
        .from('in_app_notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) return [];
      return data || [];
    } catch (e) {
      return [];
    }
  },

  async markNotificationAsRead(id: string) {
    const { error } = await supabase
      .from('in_app_notifications')
      .update({ is_read: true })
      .eq('id', id);
    if (error) throw error;
  },

  async sendNotification(payload: { user_id: string, school_id: string, title: string, message: string, type?: string, link?: string }) {
    const { data, error } = await supabase
      .from('in_app_notifications')
      .insert({
        ...payload,
        type: payload.type || 'info'
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async assignStructureToStudents(structureId: string) {
    // 1. Fetch the structure
    const { data: structure, error: sErr } = await supabase
      .from('fee_structures')
      .select('*')
      .eq('id', structureId)
      .single();
    if (sErr || !structure) throw sErr;

    // 2. Fetch the items to get total
    const { data: items } = await supabase
      .from('fee_structure_items')
      .select('*')
      .eq('structure_id', structureId);

    const totalAmount = (items || []).reduce((acc, curr) => acc + Number(curr.amount), 0);

    // 3. Find target students
    let studentQuery = supabase.from('students').select('id, school_id, parent_id, profile:profiles!students_id_fkey(full_name)').eq('school_id', structure.school_id);

    if (structure.target_type === 'CLASS') {
      const { data: streams } = await supabase.from('streams').select('id').eq('class_id', structure.target_id);
      const streamIds = (streams || []).map(s => s.id);
      studentQuery = studentQuery.in('stream_id', streamIds);
    } else if (structure.target_type === 'STREAM') {
      studentQuery = studentQuery.eq('stream_id', structure.target_id);
    } else if (structure.target_type === 'STUDENT') {
      studentQuery = studentQuery.eq('id', structure.target_id);
    }

    const { data: targetStudents, error: stErr } = await studentQuery;
    if (stErr) throw stErr;

    // 4. Create Fee records (Student Bills)
    const feeBills = (targetStudents || []).map(student => ({
      school_id: structure.school_id,
      student_id: student.id,
      term_id: structure.term_id,
      amount_due: totalAmount,
      amount_paid: 0,
      status: 'UNPAID',
      type: structure.name,
      structure_id: structure.id
    }));

    if (feeBills.length > 0) {
      const { error: billErr } = await supabase.from('fees').insert(feeBills);
      if (billErr) throw billErr;

      // 5. Send Professional Notifications to Parents
      const notifications = [];
      for (const student of (targetStudents || [])) {
        if (student.parent_id) {
          notifications.push({
            user_id: student.parent_id,
            school_id: structure.school_id,
            title: 'Official Billing Request',
            message: `From: The Principal's Office. A new fee for "${structure.name}" has been assigned to ${student.profile?.full_name}. Amount due: KES ${totalAmount.toLocaleString()}. Please view your financial portal for details.`,
            type: 'info',
            link: '/fees'
          });
        }
      }
      if (notifications.length > 0) {
        await supabase.from('in_app_notifications').insert(notifications);
      }
    }

    // 6. Mark structure as committed
    await supabase.from('fee_structures').update({ is_committed: true, total_amount: totalAmount }).eq('id', structure.id);

    return { assigned: feeBills.length };
  },

  async getFeeTypes(schoolId: string): Promise<any[]> {
    if (!isUuid(schoolId)) return [];
    try {
      // 1. Get from master table
      const { data: types } = await supabase
        .from('fee_types')
        .select('*')
        .eq('school_id', schoolId);

      // 2. Scan existing fees for types used in records (auto-detect)
      const { data: existing } = await supabase
        .from('fees')
        .select('type');

      const masterTypes = types || [];
      const autoDetected = (existing || []).map(e => e.type).filter(Boolean);

      const allNames = Array.from(new Set([
        ...masterTypes.map(t => t.name),
        ...autoDetected
      ])).filter(n => n && n !== 'null');

      if (allNames.length === 0) {
        return [
          { id: 'tuition', name: 'Tuition' },
          { id: 'transport', name: 'Transport' },
          { id: 'library', name: 'Library' },
          { id: 'lunch', name: 'Lunch' }
        ];
      }

      return allNames.map(name => ({
        id: masterTypes.find(t => t.name === name)?.id || name,
        name: name
      }));

    } catch (e) {
      return [];
    }
  },

  async addSingleFeeToStudent(schoolId: string, studentId: string, feeName: string, amount: number) {
    // 1. Auto-detect the best term
    const { data: terms } = await supabase.from('terms').select('*').eq('school_id', schoolId);
    if (!terms || terms.length === 0) throw new Error('Institutional Error: No academic terms found in database.');

    const today = new Date().toISOString().split('T')[0];
    let selectedTerm = terms.find(t => t.start_date && t.end_date && today >= t.start_date && today <= t.end_date);

    // Fallback to latest term if no active match
    if (!selectedTerm) {
      selectedTerm = [...terms].sort((a, b) => (b.start_date || '').localeCompare(a.start_date || ''))[0];
    }

    // 2. Get student parent_id
    const { data: student } = await supabase.from('students').select('parent_id, profile:profiles!students_id_fkey(full_name)').eq('id', studentId).single();

    // 3. Insert fee bill
    const { data, error } = await supabase.from('fees').insert({
      school_id: schoolId,
      student_id: studentId,
      term_id: selectedTerm.id,
      amount_due: amount,
      amount_paid: 0,
      status: 'UNPAID',
      type: feeName
    }).select().single();

    if (error) throw error;

    // 4. Send Notification (Optional Fallback)
    try {
      if (student?.parent_id) {
        await this.sendNotification({
          user_id: student.parent_id,
          school_id: schoolId,
          title: 'New Official Fee Assigned',
          message: `From: The Principal's Office. A new fee for "${feeName}" has been assigned to student ${student.profile?.full_name}. Amount: KES ${amount.toLocaleString()}. Please prioritize this payment.`,
          type: 'info',
          link: '/fees'
        });
      }
    } catch (e) {
      console.warn('Fee added but notification failed (Messaging table missing).');
    }

    return data;
  }
};
