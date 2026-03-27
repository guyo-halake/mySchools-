import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, Student, Teacher, Class, Result, FeeStatement, 
  SuspensionComplaint, SchoolEvent, Announcement, Role, NotificationItem
} from '../types';

interface AppContextType {
  students: Student[];
  teachers: Teacher[];
  classes: Class[];
  results: Result[];
  fees: FeeStatement[];
  suspensions: SuspensionComplaint[];
  events: SchoolEvent[];
  announcements: Announcement[];
  notifications: NotificationItem[];
  
  addResult: (result: Omit<Result, 'id'>) => void;
  updateResult: (id: string, result: Partial<Result>) => void;
  addFee: (fee: Omit<FeeStatement, 'id'>) => void;
  updateFee: (id: string, fee: Partial<FeeStatement>) => void;
  addSuspension: (item: Omit<SuspensionComplaint, 'id'>) => void;
  updateSuspension: (id: string, item: Partial<SuspensionComplaint>) => void;
  addAnnouncement: (item: Omit<Announcement, 'id'>) => void;
  addEvent: (item: Omit<SchoolEvent, 'id'>) => void;
  rsvpEvent: (eventId: string, userId: string) => void;
  getNotificationsForUser: (userId: string, role: Role) => NotificationItem[];
  markNotificationRead: (notificationId: string, userId: string) => void;
  getResultWorkflowStatus: (studentId: string, term: string, year: number) => 'DRAFT' | 'TEACHER_SUBMITTED' | 'HOD_APPROVED' | 'DOS_APPROVED' | 'FINALIZED';
  setResultWorkflowStatus: (studentId: string, term: string, year: number, status: 'DRAFT' | 'TEACHER_SUBMITTED' | 'HOD_APPROVED' | 'DOS_APPROVED' | 'FINALIZED') => void;
  
  // Admin CRUDs
  addStudent: (s: Omit<Student, 'id'>) => void;
  updateStudent: (id: string, s: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  addTeacher: (t: Omit<Teacher, 'id'>) => void;
  updateTeacher: (id: string, t: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;
  addClass: (c: Omit<Class, 'id'>) => void;
  updateClass: (id: string, c: Partial<Class>) => void;
  deleteClass: (id: string) => void;
  
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

const SUBJECTS = [
  'Mathematics', 'English', 'Swahili', 'Geography', 'History', 
  'CRE', 'IRE', 'Physics', 'Chemistry', 'Computer', 'Business', 'Agriculture'
];

const KENYAN_BOY_NAMES = [
  'James Otieno', 'David Omolo', 'Kevin Wanjala', 'Brian Kamau', 'Peter Mutua',
  'John Musyoka', 'Evans Kipkorir', 'Collins Bett', 'Samuel Njoroge', 'Michael Mwangi',
  'Joseph Ochieng', 'Daniel Odhiambo', 'Robert Kariuki', 'George Githinji', 'Francis Kiprop',
  'Anthony Cheruiyot', 'Patrick Baraza', 'Charles Simiyu', 'Moses Nduta', 'Richard Njeri',
  'Abdalla Ali', 'Hassan Juma', 'Omar Hassan', 'Mohamed Ahmed', 'Ibrahim Yusuf',
  'Salim Rashid', 'Hussein Idris', 'Abubakar Sadiq', 'Mustafa Noor', 'Khalid Said',
  'Victor Wambua', 'Ian Maina', 'Felix Omondi', 'Oscar Nyaboke', 'Silas Gichuru',
  'Titus Langat', 'Caleb Wafula', 'Enock Akoth', 'Job Njenga', 'Luke Mwangangi',
  'Elias Kipchumba', 'Benson Wekesa', 'Geoffrey Omondi', 'Dominic Kiptoo', 'Edwin Macharia',
  'Philemon Kiptanui', 'Silvester Onyango', 'Boniface Murungi', 'Cornelius Kiprotich', 'Dennis Waweru',
  'Abdi Noor', 'Yasin Mohammed', 'Farah Aden', 'Osman Diriye', 'Ahmed Abdi',
  'Bashir Ali', 'Said Omar', 'Mohamed Amin', 'Ismail Hassan', 'Yusuf Ibrahim',
  'Kennedy Odhiambo', 'Mark Okoth', 'Stephen Onyango', 'Paul Omondi', 'Andrew Otieno',
  'Simon Waweru', 'George Njuguna', 'Charles Maina', 'Francis Mwangi', 'Peter Njoroge',
  'Alex Kiprono', 'Benard Kiprop', 'Christopher Kiptoo', 'Daniel Kipchumba', 'Edward Kiptanui'
];

const generateStudents = (count: number) => {
  const students = [];
  for (let i = 0; i < count; i++) {
    const name = KENYAN_BOY_NAMES[i % KENYAN_BOY_NAMES.length] + (i >= KENYAN_BOY_NAMES.length ? ` ${Math.floor(i / KENYAN_BOY_NAMES.length) + 1}` : '');
    students.push({
      id: `s${i + 1}`,
      name,
      photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      admissionNumber: `ADM${1000 + i}`,
      classId: i < 56 ? 'c1' : 'c2',
      teacherId: i < 56 ? 't1' : 't2',
      parentEmail: `parent${i + 1}@example.com`,
      parentPhone: `2547${Math.floor(10000000 + Math.random() * 90000000)}`,
      guardianName: `${name.split(' ')[1]} Senior`,
      address: `${100 + i} Nairobi Road, Kenya`,
      dateOfBirth: `200${Math.floor(5 + Math.random() * 5)}-0${Math.floor(1 + Math.random() * 9)}-${Math.floor(10 + Math.random() * 18)}`
    });
  }
  return students;
};

const students = generateStudents(300);

const generateResults = (studentsList: any[]) => {
  const results: any[] = [];
  const terms = ['Term 1', 'Term 2', 'Term 3'];
  
  studentsList.forEach(student => {
    terms.forEach(term => {
      SUBJECTS.forEach((sub, i) => {
        const marks = 40 + Math.floor(Math.random() * 55);
        results.push({
          id: `r-${student.id}-${term}-${i}`,
          studentId: student.id,
          subject: sub,
          marks,
          grade: marks >= 80 ? 'A' : marks >= 70 ? 'B' : marks >= 60 ? 'C' : marks >= 50 ? 'D' : 'E',
          term,
          year: 2024,
          previousMarks: 45 + Math.floor(Math.random() * 40),
          remarks: marks > 70 ? 'Excellent performance.' : marks > 50 ? 'Good effort, keep it up.' : 'Needs significant improvement.'
        });
      });
    });
  });
  return results;
};

const INITIAL_DATA = {
  version: APP_DATA_VERSION,
  students,
  teachers: [
    { id: 't1', name: 'Mr. Kibet', email: 'teacher@example.com', subjects: ['Mathematics', 'Physics', 'Computer'], classId: 'c1' },
    { id: 't2', name: 'Ms. Njeri', email: 'njeri@example.com', subjects: ['English', 'Swahili', 'History'], classId: 'c2' },
  ],
  classes: [
    { id: 'c1', name: 'Form 4 East', teacherId: 't1' },
    { id: 'c2', name: 'Form 4 West', teacherId: 't2' },
  ],
  results: generateResults(students),
  fees: students.map((s, i) => ({
    id: `f${i + 1}`,
    studentId: s.id,
    type: 'Tuition Fee',
    voteHead: 'Tuition',
    amount: 45000,
    paid: Math.random() > 0.3 ? 45000 : 20000 + Math.floor(Math.random() * 20000),
    date: '2024-01-15',
    dueDate: '2024-04-30',
    receiptNumber: `RCPT-${2024}-${(i + 1).toString().padStart(4, '0')}`,
    status: Math.random() > 0.3 ? 'PAID' : 'PARTIAL'
  })),
  suspensions: [],
  events: [
    { id: 'e1', title: 'Prize Giving Day', description: 'Celebrating academic excellence.', date: '2024-05-20', location: 'School Hall', targetRoles: ['PARENT', 'STUDENT', 'TEACHER', 'ADMIN'], recurring: 'NONE', requiresPermissionSlip: false, rsvps: [] },
  ],
  announcements: [
    { id: 'a1', title: 'Exam Schedule', content: 'End of term exams start next week.', date: '2024-03-20', author: 'Principal', targetRoles: ['PARENT', 'STUDENT', 'TEACHER'], pinned: true, urgent: false, channel: 'IN_APP' },
  ],
  notifications: [],
  resultWorkflows: {},
};

const normalizeEvents = (events: SchoolEvent[]) => {
  return events.map((event) => ({
    ...event,
    rsvps: (event.rsvps || []).map((rsvp: any) => {
      if (typeof rsvp === 'string') {
        return { userId: rsvp, respondedAt: new Date().toISOString() };
      }
      return rsvp;
    }),
  }));
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState(() => {
    const saved = localStorage.getItem('school_portal_data');
    if (!saved) return INITIAL_DATA;
    
    const parsed = JSON.parse(saved);
    if (parsed.version !== APP_DATA_VERSION) {
      return INITIAL_DATA; // Force reset for new version
    }

    return {
      ...parsed,
      events: normalizeEvents(parsed.events || []),
      notifications: parsed.notifications || [],
      resultWorkflows: parsed.resultWorkflows || {},
    };
  });

  useEffect(() => {
    localStorage.setItem('school_portal_data', JSON.stringify(data));
  }, [data]);

  const addResult = (result: Omit<Result, 'id'>) => {
    setData((prev: any) => ({
      ...prev,
      results: [...prev.results, { ...result, id: Math.random().toString(36).substr(2, 9) }]
    }));
  };

  const updateResult = (id: string, result: Partial<Result>) => {
    setData((prev: any) => ({
      ...prev,
      results: prev.results.map((r: Result) => r.id === id ? { ...r, ...result } : r)
    }));
  };

  const addFee = (fee: Omit<FeeStatement, 'id'>) => {
    setData((prev: any) => ({
      ...prev,
      fees: [...prev.fees, { ...fee, id: Math.random().toString(36).substr(2, 9) }]
    }));
  };

  const updateFee = (id: string, fee: Partial<FeeStatement>) => {
    setData((prev: any) => ({
      ...prev,
      fees: prev.fees.map((f: FeeStatement) => f.id === id ? { ...f, ...fee } : f)
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
    const newId = Math.random().toString(36).substr(2, 9);
    setData((prev: any) => ({
      ...prev,
      announcements: [...prev.announcements, { ...item, id: newId }],
      notifications: [
        {
          id: 'n' + Date.now(),
          type: 'ANNOUNCEMENT',
          title: `New announcement: ${item.title}`,
          message: item.content,
          createdAt: new Date().toISOString(),
          targetRoles: item.targetRoles,
          readBy: [],
          link: '/announcements',
        },
        ...prev.notifications,
      ],
    }));
  };

  const addEvent = (item: Omit<SchoolEvent, 'id'>) => {
    const targetRoles = item.targetRoles && item.targetRoles.length > 0 ? item.targetRoles : ['PARENT', 'STUDENT', 'TEACHER', 'ADMIN'];
    setData((prev: any) => ({
      ...prev,
      events: [...prev.events, { ...item, id: Math.random().toString(36).substr(2, 9) }],
      notifications: [
        {
          id: 'n' + Date.now(),
          type: 'EVENT',
          title: `New event: ${item.title}`,
          message: `${item.description} on ${item.date} at ${item.location}`,
          createdAt: new Date().toISOString(),
          targetRoles,
          readBy: [],
          link: '/events',
        },
        ...prev.notifications,
      ],
    }));
  };

  const rsvpEvent = (eventId: string, userId: string) => {
    setData((prev: any) => ({
      ...prev,
      events: prev.events.map((e: SchoolEvent) => 
        e.id === eventId 
          ? {
              ...e,
              rsvps: e.rsvps.some((r) => r.userId === userId)
                ? e.rsvps
                : [...e.rsvps, { userId, respondedAt: new Date().toISOString() }],
            }
          : e
      ),
      notifications: [
        {
          id: 'n' + Date.now(),
          type: 'RSVP',
          title: 'New RSVP received',
          message: `A parent/student has RSVP'd for an event.`,
          createdAt: new Date().toISOString(),
          targetRoles: ['ADMIN', 'TEACHER'],
          readBy: [],
          link: '/events',
        },
        ...prev.notifications,
      ],
    }));
  };

  const getNotificationsForUser = (userId: string, role: Role) => {
    return data.notifications.filter((notification) => notification.targetRoles.includes(role)).slice(0, 25);
  };

  const markNotificationRead = (notificationId: string, userId: string) => {
    setData((prev: any) => ({
      ...prev,
      notifications: prev.notifications.map((notification: NotificationItem) =>
        notification.id === notificationId && !notification.readBy.includes(userId)
          ? { ...notification, readBy: [...notification.readBy, userId] }
          : notification
      ),
    }));
  };

  const getResultWorkflowStatus = (studentId: string, term: string, year: number) => {
    const key = `${studentId}_${term}_${year}`;
    return data.resultWorkflows?.[key] || 'DRAFT';
  };

  const setResultWorkflowStatus = (studentId: string, term: string, year: number, status: 'DRAFT' | 'TEACHER_SUBMITTED' | 'HOD_APPROVED' | 'DOS_APPROVED' | 'FINALIZED') => {
    const key = `${studentId}_${term}_${year}`;
    setData((prev: any) => ({
      ...prev,
      resultWorkflows: {
        ...(prev.resultWorkflows || {}),
        [key]: status,
      },
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

  const addTeacher = (t: Omit<Teacher, 'id'>) => {
    setData((prev: any) => ({
      ...prev,
      teachers: [...prev.teachers, { ...t, id: 't' + Date.now() }]
    }));
  };

  const updateTeacher = (id: string, t: Partial<Teacher>) => {
    setData((prev: any) => ({
      ...prev,
      teachers: prev.teachers.map((te: Teacher) => te.id === id ? { ...te, ...t } : te)
    }));
  };

  const deleteTeacher = (id: string) => {
    setData((prev: any) => ({
      ...prev,
      teachers: prev.teachers.filter((te: Teacher) => te.id !== id)
    }));
  };

  const addClass = (c: Omit<Class, 'id'>) => {
    setData((prev: any) => ({
      ...prev,
      classes: [...prev.classes, { ...c, id: 'c' + Date.now() }]
    }));
  };

  const updateClass = (id: string, c: Partial<Class>) => {
    setData((prev: any) => ({
      ...prev,
      classes: prev.classes.map((cl: Class) => cl.id === id ? { ...cl, ...c } : cl)
    }));
  };

  const deleteClass = (id: string) => {
    setData((prev: any) => ({
      ...prev,
      classes: prev.classes.filter((cl: Class) => cl.id !== id)
    }));
  };

  const getStudentRank = (studentId: string, term: string, year: number) => {
    const student = data.students.find(s => s.id === studentId);
    if (!student) return { classRank: 0, classTotal: 0, formRank: 0, formTotal: 0, averageMarks: 0 };

    const termResults = data.results.filter(r => r.term === term && r.year === year);
    
    // Calculate average marks for all students in this term/year
    const studentAverages = data.students.map(s => {
      const studentResults = termResults.filter(r => r.studentId === s.id);
      const avg = studentResults.length > 0 
        ? studentResults.reduce((acc, r) => acc + r.marks, 0) / studentResults.length 
        : 0;
      return { id: s.id, classId: s.classId, avg };
    });

    // Form Rank
    const sortedForm = [...studentAverages].sort((a, b) => b.avg - a.avg);
    const formRank = sortedForm.findIndex(s => s.id === studentId) + 1;
    const formTotal = data.students.length;

    // Class Rank
    const classStudents = studentAverages.filter(s => s.classId === student.classId);
    const sortedClass = [...classStudents].sort((a, b) => b.avg - a.avg);
    const classRank = sortedClass.findIndex(s => s.id === studentId) + 1;
    const classTotal = classStudents.length;

    const studentAvg = studentAverages.find(s => s.id === studentId)?.avg || 0;

    return { classRank, classTotal, formRank, formTotal, averageMarks: studentAvg };
  };

  return (
    <AppContext.Provider value={{ 
      ...data, 
      addResult, updateResult, addFee, updateFee, 
      addSuspension, updateSuspension, addAnnouncement, addEvent, rsvpEvent,
      addStudent, updateStudent, deleteStudent, addTeacher, updateTeacher, deleteTeacher,
      addClass, updateClass, deleteClass,
      getNotificationsForUser, markNotificationRead,
      getResultWorkflowStatus, setResultWorkflowStatus,
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
