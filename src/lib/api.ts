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

  async getStreams(schoolId: string): Promise<Stream[]> {
    if (!isUuid(schoolId)) return [];
    const { data, error } = await supabase
      .from('streams')
      .select('*, class:classes!streams_class_id_fkey(*)')
      .eq('school_id', schoolId);
    if (error) throw error;
    return data as any[];
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
      .eq('school_id', schoolId);
    if (error) throw error;
    return data as any[];
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
  
  async getStudentResultsAll(studentId: string) {
    const { data, error } = await supabase
      .from('exam_results')
      .select('*, subject:subjects(*), exam:exams!exam_results_exam_id_fkey(*, term:terms!exams_term_id_fkey(*))')
      .eq('student_id', studentId);
    if (error) throw error;
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

  async getFeesFull(schoolId: string) {
    if (!isUuid(schoolId)) return [];
    const { data, error } = await supabase
      .from('fees')
      .select('*, student:students!fees_student_id_fkey(*, profile:profiles!students_id_fkey(*)), term:terms!fees_term_id_fkey(*)')
      .eq('school_id', schoolId)
      .order('payment_date', { ascending: false });
    if (error) throw error;
    return data;
  },

  async setGlobalFees(schoolId: string, amount: number) {
    if (!isUuid(schoolId)) return [];
    const currentTerm = await this.getLatestTerm(schoolId);
    if (!currentTerm?.id) return [];
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
      query = query.or(`adm_no.ilike.${needle},profile.full_name.ilike.${needle}` as any);
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
  }
};
