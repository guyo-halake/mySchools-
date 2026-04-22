import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
  Profile, Student, Teacher, Class, ExamResult, Fee, 
  SuspensionComplaint, SchoolEvent, Announcement, Role, Stream
} from '../types';
import { useAuth } from './AuthContext';
import { api } from '../lib/api';

interface AppContextType {
  students: Student[];
  teachers: Profile[];
  classes: Class[];
  streams: Stream[];
  results: ExamResult[];
  fees: Fee[];
  suspensions: SuspensionComplaint[];
  events: SchoolEvent[];
  announcements: Announcement[];
  parents: Profile[];
  schoolInfo: any;
  loading: boolean;
  
  refreshData: () => Promise<void>;
  addResult: (result: Omit<ExamResult, 'id'>) => Promise<void>;
  updateResult: (id: string, result: Partial<ExamResult>) => void;
  addFee: (fee: Omit<Fee, 'id'>) => void;
  updateFee: (id: string, fee: Partial<Fee>) => void;
  addSuspension: (item: Omit<SuspensionComplaint, 'id'>) => void;
  updateSuspension: (id: string, item: Partial<SuspensionComplaint>) => void;
  addAnnouncement: (item: Omit<Announcement, 'id'>) => void;
  addEvent: (item: Omit<SchoolEvent, 'id'>) => void;
  rsvpEvent: (eventId: string, userId: string) => void;
  
  // Admin CRUDs
  addStudent: (s: Omit<Student, 'id'>) => void;
  updateStudent: (id: string, s: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  addTeacher: (t: Omit<Profile, 'id'>) => void;
  updateTeacher: (id: string, t: Partial<Profile>) => void;
  deleteTeacher: (id: string) => void;
  
  getStudentRank: (studentId: string, term: string, year: number) => {
    classRank: number;
    classTotal: number;
    formRank: number;
    formTotal: number;
    averageMarks: number;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const APP_DATA_VERSION = 'v5';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('school_portal_data');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.version === APP_DATA_VERSION) return parsed;
    }
    return {
      version: APP_DATA_VERSION,
      students: [],
      teachers: [],
      classes: [],
      streams: [],
      results: [],
      fees: [],
      suspensions: [],
      events: [],
      announcements: [],
      parents: [],
      schoolInfo: null,
    };
  });

  const refreshData = useCallback(async () => {
    if (!user || user.id.startsWith('u')) return; // Don't fetch for mock users
    
    setLoading(true);
    try {
      const [
        students,
        teachers,
        results,
        fees,
        streams,
        announcements,
        events,
        schoolInfo,
        parents
      ] = await Promise.all([
        api.getStudents(user.school_id),
        api.getTeachers(user.school_id),
        api.getResults(user.school_id),
        api.getFees(user.school_id),
        api.getStreams(user.school_id),
        api.getAnnouncements(user.school_id),
        api.getEvents(user.school_id),
        api.getSchool(user.school_id),
        api.getParents(user.school_id)
      ]);

      setData(prev => ({
        ...prev,
        students,
        teachers,
        results,
        fees,
        streams,
        announcements,
        events,
        parents,
        schoolInfo: schoolInfo || prev.schoolInfo
      }));
    } catch (error) {
      console.error('Failed to fetch data from Supabase:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    localStorage.setItem('school_portal_data', JSON.stringify(data));
  }, [data]);

  const addResult = async (result: Omit<ExamResult, 'id'>) => {
    if (user && !user.id.startsWith('u')) {
      await api.addResult({ ...result, school_id: user.school_id });
      refreshData();
    } else {
      setData((prev: any) => ({
        ...prev,
        results: [...prev.results, { ...result, id: Math.random().toString(36).substr(2, 9) }]
      }));
    }
  };

  const updateResult = (id: string, result: Partial<ExamResult>) => {
    setData((prev: any) => ({
      ...prev,
      results: prev.results.map((r: ExamResult) => r.id === id ? { ...r, ...result } : r)
    }));
  };

  const addFee = (fee: Omit<Fee, 'id'>) => {
    setData((prev: any) => ({
      ...prev,
      fees: [...prev.fees, { ...fee, id: Math.random().toString(36).substr(2, 9) }]
    }));
  };

  const updateFee = (id: string, fee: Partial<Fee>) => {
    setData((prev: any) => ({
      ...prev,
      fees: prev.fees.map((f: Fee) => f.id === id ? { ...f, ...fee } : f)
    }));
  };

  const addSuspension = (item: Omit<SuspensionComplaint, 'id'>) => {
    setData((prev: any) => ({
      ...prev,
      suspensions: [...prev.suspensions, { ...item, id: Math.random().toString(36).substr(2, 9) }]
    }));
  };

  const updateSuspension = (id: string, item: Partial<SuspensionComplaint>) => {
    setData((prev: any) => ({
      ...prev,
      suspensions: prev.suspensions.map((s: SuspensionComplaint) => s.id === id ? { ...s, ...item } : s)
    }));
  };

  const addAnnouncement = (item: Omit<Announcement, 'id'>) => {
    setData((prev: any) => ({
      ...prev,
      announcements: [...prev.announcements, { ...item, id: Math.random().toString(36).substr(2, 9) }]
    }));
  };

  const addEvent = (item: Omit<SchoolEvent, 'id'>) => {
    setData((prev: any) => ({
      ...prev,
      events: [...prev.events, { ...item, id: Math.random().toString(36).substr(2, 9) }]
    }));
  };

  const rsvpEvent = (eventId: string, userId: string) => {
    setData((prev: any) => ({
      ...prev,
      events: prev.events.map((e: SchoolEvent) => 
        e.id === eventId 
          ? { ...e, rsvps: e.rsvps.includes(userId) ? e.rsvps : [...e.rsvps, userId] } 
          : e
      )
    }));
  };

  const addStudent = (s: Omit<Student, 'id'>) => {
    setData((prev: any) => ({
      ...prev,
      students: [...prev.students, { ...s, id: 's' + Date.now() }]
    }));
  };

  const updateStudent = (id: string, s: Partial<Student>) => {
    setData((prev: any) => ({
      ...prev,
      students: prev.students.map((st: Student) => st.id === id ? { ...st, ...s } : st)
    }));
  };

  const deleteStudent = (id: string) => {
    setData((prev: any) => ({
      ...prev,
      students: prev.students.filter((st: Student) => st.id !== id)
    }));
  };

  const addTeacher = (t: Omit<Profile, 'id'>) => {
    setData((prev: any) => ({
      ...prev,
      teachers: [...prev.teachers, { ...t, id: 't' + Date.now() }]
    }));
  };

  const updateTeacher = (id: string, t: Partial<Profile>) => {
    setData((prev: any) => ({
      ...prev,
      teachers: prev.teachers.map((te: Profile) => te.id === id ? { ...te, ...t } : te)
    }));
  };

  const deleteTeacher = (id: string) => {
    setData((prev: any) => ({
      ...prev,
      teachers: prev.teachers.filter((te: Profile) => te.id !== id)
    }));
  };

  const getStudentRank = (studentId: string, term: string, year: number) => {
    const student = data.students.find(s => s.id === studentId);
    if (!student) return { classRank: 0, classTotal: 0, formRank: 0, formTotal: 0, averageMarks: 0 };

    const termResults = data.results.filter(r => 
        (typeof r.exam === 'object' ? r.exam.term_id : r.exam_id) === term 
        // This part needs more refinement for real vs mock data types
    );
    
    return { classRank: 1, classTotal: 10, formRank: 1, formTotal: 50, averageMarks: 0 };
  };

  return (
    <AppContext.Provider value={{ 
      ...data, 
      loading,
      refreshData,
      addResult, updateResult, addFee, updateFee, 
      addSuspension, updateSuspension, addAnnouncement, addEvent, rsvpEvent,
      addStudent, updateStudent, deleteStudent, addTeacher, updateTeacher, deleteTeacher,
      getStudentRank
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
