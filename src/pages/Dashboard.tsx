import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Card, Badge, Table, Button, PageHeader } from '../components/UI';
import { 
  TrendingUp, 
  CreditCard, 
  Bell,
  Users,
  ShieldCheck,
  AlertTriangle,
  UserRound,
  School,
  Hash,
  Landmark,
  Wallet,
  CalendarClock
} from 'lucide-react';
import { formatCurrency } from '../utils/utils';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { students, results, events, fees, suspensions, teachers, announcements, classes, notifications } = useApp();
  const [showFinancials, setShowFinancials] = React.useState(() => localStorage.getItem('dashboard_widget_financials') !== '0');
  const [showAcademics, setShowAcademics] = React.useState(() => localStorage.getItem('dashboard_widget_academics') !== '0');
  const [parentGradingSystem, setParentGradingSystem] = React.useState<'KENYAN' | 'BRITISH'>('KENYAN');
  const [expandedRemarks, setExpandedRemarks] = React.useState<Record<string, boolean>>({});

  const toggleWidget = (key: 'dashboard_widget_financials' | 'dashboard_widget_academics', value: boolean) => {
    localStorage.setItem(key, value ? '1' : '0');
  };

  const getDisplayGrade = (marks: number, system: 'KENYAN' | 'BRITISH') => {
    if (system === 'KENYAN') {
      if (marks >= 80) return 'A';
      if (marks >= 70) return 'B';
      if (marks >= 60) return 'C';
      if (marks >= 50) return 'D';
      return 'E';
    }

    if (marks >= 90) return 'A*';
    if (marks >= 80) return 'A';
    if (marks >= 70) return 'B';
    if (marks >= 60) return 'C';
    if (marks >= 50) return 'D';
    if (marks >= 40) return 'E';
    return 'U';
  };

  const getGradeVariant = (marks: number) => {
    if (marks >= 80) return 'success' as const;
    if (marks >= 50) return 'info' as const;
    return 'danger' as const;
  };

  if (user?.role === 'PARENT' || user?.role === 'STUDENT') {
    const student = students.find(s => s.id === user.studentId) || students[0];
    const allStudentResults = results.filter(r => r.studentId === student.id);
    
    // Find the most recent term that has results
    const termsOrder = ['Term 3', 'Term 2', 'Term 1'];
    const latestTerm = termsOrder.find(t => allStudentResults.some(r => r.term === t)) || 'Term 3';
    const studentResults = allStudentResults.filter(r => r.term === latestTerm);
    const classInfo = classes.find(c => c.id === student.classId);
    const className = classInfo?.name || student.classId;
    const stream = className.includes(' ') ? className.split(' ').slice(-1)[0] : 'Main';
    const classTeacher = teachers.find(t => t.id === (classInfo?.teacherId || student.teacherId));

    const studentFees = fees.filter(f => f.studentId === student.id);
    const balance = studentFees.reduce((acc, f) => acc + (f.amount - f.paid), 0);
    
    const { getStudentRank } = useApp();
    const rank = getStudentRank(student.id, latestTerm, 2024);

    const visibleEvents = events
      .filter(e => !e.targetRoles || e.targetRoles.includes(user.role))
      .sort((a, b) => +new Date(a.date) - +new Date(b.date));
    const nextEvent = visibleEvents[0];

    const subjectsOrder = [
      'Mathematics', 'English', 'Swahili', 'Geography', 'History',
      'CRE', 'IRE', 'Physics', 'Chemistry', 'Computer', 'Business', 'Agriculture'
    ];

    const resultsBySubject = subjectsOrder.map((subject) => {
      const row = studentResults.find((result) => result.subject === subject);
      return { subject, row };
    });

    return (
      <div className="space-y-6">
        <section className="pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="micro-label text-zinc-500">Parent Portal</p>
              <h1 className="mt-1 text-2xl lg:text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Welcome back, {user.name.split(' ')[0]}</h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Academic snapshot, fees status, and events in one view.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="info">Class Position {rank.classRank}/{rank.classTotal}</Badge>
              <Badge variant="success">Form Position {rank.formRank}/{rank.formTotal}</Badge>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <p className="micro-label text-zinc-500 flex items-center gap-1"><UserRound size={11} /> Student Name</p>
            <p className="text-sm font-semibold mt-1 text-zinc-900 dark:text-zinc-100">{student.name}</p>
          </div>
          <div>
            <p className="micro-label text-zinc-500 flex items-center gap-1"><School size={11} /> Current Class</p>
            <p className="text-sm font-semibold mt-1 text-zinc-900 dark:text-zinc-100">{className}</p>
          </div>
          <div>
            <p className="micro-label text-zinc-500 flex items-center gap-1"><Landmark size={11} /> Stream</p>
            <p className="text-sm font-semibold mt-1 text-zinc-900 dark:text-zinc-100">{stream}</p>
          </div>
          <div>
            <p className="micro-label text-zinc-500 flex items-center gap-1"><Users size={11} /> Class Teacher</p>
            <p className="text-sm font-semibold mt-1 text-zinc-900 dark:text-zinc-100">{classTeacher?.name || 'Not assigned'}</p>
          </div>
          <div>
            <p className="micro-label text-zinc-500 flex items-center gap-1"><Hash size={11} /> Admission Number</p>
            <p className="text-sm font-semibold mt-1 text-zinc-900 dark:text-zinc-100">{student.admissionNumber}</p>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="py-2">
            <p className="micro-label text-zinc-500 flex items-center gap-1"><Wallet size={11} /> Fees Balance</p>
            <p className={balance > 0 ? 'text-2xl font-semibold text-rose-600 mt-1' : 'text-2xl font-semibold text-emerald-600 mt-1'}>{formatCurrency(balance)}</p>
            <p className="mt-2 text-xs text-zinc-500">Current term financial position</p>
          </div>
          <div className="py-2">
            <p className="micro-label text-zinc-500 flex items-center gap-1"><CalendarClock size={11} /> Upcoming Event</p>
            {nextEvent ? (
              <div className="mt-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{nextEvent.title}</p>
                <p className="text-xs text-zinc-500 mt-1">{new Date(nextEvent.date).toLocaleDateString()} • {nextEvent.location}</p>
              </div>
            ) : (
              <p className="text-sm text-zinc-500 mt-1">No upcoming events</p>
            )}
          </div>
        </section>

        <Card
          title="Recent Results"
          subtitle={`${latestTerm} • ${parentGradingSystem === 'KENYAN' ? 'Kenyan KCSE' : 'British'} view`}
          className="glass-panel motion-rise border border-zinc-200/80 dark:border-zinc-800/80 shadow-[0_16px_36px_-24px_rgba(0,0,0,0.45)]"
        >
          <div className="flex items-center justify-between mb-3">
            <p className="micro-label text-zinc-500">All subjects</p>
            <div className="flex items-center gap-2">
              <Button variant={parentGradingSystem === 'KENYAN' ? 'secondary' : 'outline'} className="h-8" onClick={() => setParentGradingSystem('KENYAN')}>Kenyan KCSE</Button>
              <Button variant={parentGradingSystem === 'BRITISH' ? 'secondary' : 'outline'} className="h-8" onClick={() => setParentGradingSystem('BRITISH')}>British</Button>
            </div>
          </div>

          <Table headers={['Subject', 'Grade', 'Marks', 'Teacher Remarks']}>
            {resultsBySubject.map(({ subject, row }) => {
              const remarkKey = `${subject}-${latestTerm}`;
              const isExpanded = !!expandedRemarks[remarkKey];

              return (
                <tr key={subject}>
                  <td className="px-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100">{subject}</td>
                  <td className="px-3 py-2">
                    {row ? <Badge variant={getGradeVariant(row.marks)}>{getDisplayGrade(row.marks, parentGradingSystem)}</Badge> : <span className="text-zinc-400 text-xs">-</span>}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono text-zinc-700 dark:text-zinc-300">{row ? `${row.marks}%` : '-'}</td>
                  <td className="px-3 py-2 text-xs text-zinc-600 dark:text-zinc-300">
                    {row?.remarks ? (
                      <div>
                        {!isExpanded ? (
                          <button className="text-cyan-700 hover:text-cyan-800 dark:text-cyan-300 dark:hover:text-cyan-200 font-medium" onClick={() => setExpandedRemarks((prev) => ({ ...prev, [remarkKey]: true }))}>Show remark</button>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-zinc-700 dark:text-zinc-300">{row.remarks}</p>
                            <button className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200" onClick={() => setExpandedRemarks((prev) => ({ ...prev, [remarkKey]: false }))}>Hide</button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-zinc-400">No remark</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </Table>
        </Card>

        <div className="flex gap-2 justify-end">
          <Button variant="outline">Request Meeting</Button>
          <Button>Contact School</Button>
        </div>
      </div>
    );
  }

  // Teacher/Admin View
  const totalFees = fees.reduce((acc, f) => acc + f.paid, 0);
  const totalExpected = fees.reduce((acc, f) => acc + f.amount, 0);
  const collectionRate = totalExpected > 0 ? (totalFees / totalExpected) * 100 : 0;
  
  const passRate = results.length > 0 
    ? (results.filter(r => r.marks >= 50).length / results.length) * 100 
    : 0;

  if (user?.role === 'TEACHER') {
    const teacher = teachers.find(t => t.id === user.teacherId);
    const teacherStudents = teacher?.classId ? students.filter(s => s.classId === teacher.classId) : [];
    const teacherStudentIds = new Set(teacherStudents.map(s => s.id));
    const teacherResults = results.filter(r => teacherStudentIds.has(r.studentId));
    const classPassRate = teacherResults.length > 0
      ? (teacherResults.filter(r => r.marks >= 50).length / teacherResults.length) * 100
      : 0;
    const activeIssues = suspensions.filter(s => teacherStudentIds.has(s.studentId) && s.status === 'ACTIVE').length;
    const classBalance = fees
      .filter(f => teacherStudentIds.has(f.studentId))
      .reduce((acc, f) => acc + (f.amount - f.paid), 0);

    const teacherNotifications = notifications.filter(n => n.targetRoles.includes('TEACHER')).slice(0, 5);

    return (
      <div className="space-y-6">
        <PageHeader
          title="Teacher Dashboard"
          subtitle="Class, subject and parent-alert overview"
          actions={<Badge variant="info">{teacher?.classId ? classes.find(c => c.id === teacher.classId)?.name : 'Unassigned Class'}</Badge>}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border-l-4 border-l-rose-500"><p className="micro-label text-rose-600">Critical: Active Incidents</p><p className="text-xl font-bold text-rose-600">{activeIssues}</p></Card>
          <Card className="border-l-4 border-l-amber-500"><p className="micro-label text-amber-600">Critical: Below 50%</p><p className="text-xl font-bold text-amber-600">{teacherResults.filter(r => r.marks < 50).length}</p></Card>
          <Card className="border-l-4 border-l-blue-500"><p className="micro-label text-blue-600">Critical: Fee Balance</p><p className="text-xl font-bold text-blue-600">{formatCurrency(classBalance)}</p></Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card><p className="text-[10px] uppercase font-bold text-zinc-400">Students</p><p className="text-2xl font-bold">{teacherStudents.length}</p></Card>
          <Card><p className="text-[10px] uppercase font-bold text-zinc-400">Subjects</p><p className="text-2xl font-bold">{teacher?.subjects.length || 0}</p></Card>
          <Card><p className="text-[10px] uppercase font-bold text-zinc-400">Class Pass Rate</p><p className="text-2xl font-bold text-emerald-600">{classPassRate.toFixed(1)}%</p></Card>
          <Card><p className="text-[10px] uppercase font-bold text-zinc-400">Active Incidents</p><p className="text-2xl font-bold text-amber-600">{activeIssues}</p></Card>
        </div>

        <Card title="Teacher Alerts" subtitle="Academic, discipline and fee alerts requiring follow-up">
          <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-300">
            <li>{teacherResults.filter(r => r.marks < 50).length} subject results are below 50% and need intervention.</li>
            <li>{activeIssues} active discipline records in your class.</li>
            <li>Outstanding fee balance for your class: {formatCurrency(classBalance)}.</li>
          </ul>
        </Card>

        <Card title="Live Notifications" subtitle="Cross-page updates in real time">
          <div className="space-y-2 text-xs">
            {teacherNotifications.length === 0 && <p className="text-zinc-500">No live notifications yet.</p>}
            {teacherNotifications.map((n) => (
              <div key={n.id} className="p-2 rounded bg-gray-50 dark:bg-zinc-800/40">
                <p className="font-bold">{n.title}</p>
                <p className="text-zinc-500">{n.message}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  const adminNotifications = notifications.filter(n => n.targetRoles.includes('ADMIN')).slice(0, 8);
  const rsvpNotifications = adminNotifications.filter(n => n.type === 'RSVP').slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Overview"
        subtitle="School-wide operations, compliance, and financial control"
        actions={<div className="flex gap-2">
          <Button variant={showFinancials ? 'secondary' : 'outline'} className="h-8 text-[10px]" onClick={() => { const next = !showFinancials; setShowFinancials(next); toggleWidget('dashboard_widget_financials', next); }}>
            {showFinancials ? 'Hide Financials' : 'Show Financials'}
          </Button>
          <Button variant={showAcademics ? 'secondary' : 'outline'} className="h-8 text-[10px]" onClick={() => { const next = !showAcademics; setShowAcademics(next); toggleWidget('dashboard_widget_academics', next); }}>
            {showAcademics ? 'Hide Academics' : 'Show Academics'}
          </Button>
          <Button variant="ghost" className="h-8 text-[10px]">Export Report</Button>
          <Button className="h-8 text-[10px]">New Entry</Button>
        </div>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-l-4 border-l-rose-500">
          <p className="micro-label text-rose-600">Critical: Active Discipline Cases</p>
          <p className="text-xl font-bold text-rose-600">{suspensions.filter(s => s.status === 'ACTIVE').length}</p>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <p className="micro-label text-amber-600">Critical: Unsettled Fees</p>
          <p className="text-xl font-bold text-amber-600">{fees.filter(f => f.status !== 'PAID').length} records</p>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <p className="micro-label text-blue-600">Critical: High Priority Alerts</p>
          <p className="text-xl font-bold text-blue-600">{adminNotifications.filter(n => n.priority === 'HIGH').length}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-3" title="School Overview" subtitle="Key performance indicators and school-wide metrics">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 py-4">
            <div className="space-y-1 border-r border-gray-100 dark:border-zinc-800 pr-4">
              <div className="flex items-center gap-2 text-zinc-400 mb-1">
                <Users size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Population</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold">{students.length}</p>
                <span className="text-[10px] text-zinc-500">Students</span>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-lg font-bold text-zinc-600 dark:text-zinc-400">{teachers.length}</p>
                <span className="text-[10px] text-zinc-500">Teachers</span>
              </div>
            </div>

            {showFinancials && <div className="space-y-1 border-r border-gray-100 dark:border-zinc-800 pr-4">
              <div className="flex items-center gap-2 text-zinc-400 mb-1">
                <CreditCard size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Financials</span>
              </div>
              <p className="text-2xl font-bold text-emerald-500">Ksh {(totalFees / 1000000).toFixed(1)}M</p>
              <p className="text-[10px] text-zinc-500">Collected of Ksh {(totalExpected / 1000000).toFixed(1)}M</p>
              <div className="w-full bg-gray-100 dark:bg-zinc-800 h-1 rounded-full mt-2">
                <div 
                  className="bg-emerald-500 h-1 rounded-full" 
                  style={{ width: `${collectionRate}%` }}
                />
              </div>
            </div>}

            {showAcademics && <div className="space-y-1 border-r border-gray-100 dark:border-zinc-800 pr-4">
              <div className="flex items-center gap-2 text-zinc-400 mb-1">
                <TrendingUp size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Academic</span>
              </div>
              <p className="text-2xl font-bold text-blue-500">{passRate.toFixed(1)}%</p>
              <p className="text-[10px] text-zinc-500">Overall Pass Rate</p>
              <div className="flex items-center gap-1 mt-2">
                <Badge variant={passRate >= 50 ? 'success' : 'warning'}>{passRate >= 50 ? 'ON TRACK' : 'AT RISK'}</Badge>
                <span className="text-[8px] text-zinc-400">current term status</span>
              </div>
            </div>}

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-zinc-400 mb-1">
                <ShieldCheck size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Discipline</span>
              </div>
              <p className="text-2xl font-bold text-orange-500">{suspensions.length}</p>
              <p className="text-[10px] text-zinc-500">Active Suspensions</p>
              <p className="text-[9px] text-zinc-400 mt-2">98% Good Conduct</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Recent Activity</h2>
          <Card>
            <Table headers={['Student', 'Action', 'Time', 'Status']}>
              {adminNotifications.map((n) => (
                <tr key={n.id}>
                  <td className="px-3 py-2 text-xs font-medium">School System</td>
                  <td className="px-3 py-2 text-[10px] text-zinc-500">{n.title}</td>
                  <td className="px-3 py-2 text-[10px] text-zinc-500">{new Date(n.createdAt).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <Badge variant={n.type === 'RSVP' ? 'info' : 'success'}>{n.type}</Badge>
                  </td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>

        <div className="space-y-4">
          <h2 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Announcements</h2>
          <div className="space-y-3">
            {announcements.map(a => (
              <Card key={a.id} className="p-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded bg-zinc-50 dark:bg-zinc-800">
                    <Bell size={12} className="text-zinc-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold mb-1">{a.title}</p>
                    <p className="text-[10px] text-zinc-500 line-clamp-2">{a.content}</p>
                    <p className="text-[8px] text-zinc-400 mt-2 uppercase font-bold">{new Date(a.date).toLocaleDateString()}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Card title="Event RSVP Feed" subtitle="School receives parent/student RSVP activity instantly">
        <div className="space-y-2 text-xs">
          {rsvpNotifications.length === 0 && <p className="text-zinc-500">No RSVP activity yet.</p>}
          {rsvpNotifications.map((n) => (
            <div key={n.id} className="p-2 rounded bg-blue-50 dark:bg-blue-900/20">
              <p className="font-bold">{n.title}</p>
              <p>{n.message}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
