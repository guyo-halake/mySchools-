import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Card, Badge, Table, Button } from '../components/UI';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  CreditCard, 
  AlertCircle, 
  User as UserIcon,
  ArrowRight,
  Plus,
  Bell,
  Users,
  ShieldCheck,
  FileText,
  BookOpen
} from 'lucide-react';
import { formatCurrency, formatDate, cn } from '../utils/utils';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { students, results, events, fees, suspensions, teachers, announcements, classes, notifications } = useApp();
  const [showFinancials, setShowFinancials] = React.useState(() => localStorage.getItem('dashboard_widget_financials') !== '0');
  const [showAcademics, setShowAcademics] = React.useState(() => localStorage.getItem('dashboard_widget_academics') !== '0');

  const toggleWidget = (key: 'dashboard_widget_financials' | 'dashboard_widget_academics', value: boolean) => {
    localStorage.setItem(key, value ? '1' : '0');
  };

  if (user?.role === 'PARENT' || user?.role === 'STUDENT') {
    const student = students.find(s => s.id === user.studentId) || students[0];
    const allStudentResults = results.filter(r => r.studentId === student.id);
    
    // Find the most recent term that has results
    const termsOrder = ['Term 3', 'Term 2', 'Term 1'];
    const latestTerm = termsOrder.find(t => allStudentResults.some(r => r.term === t)) || 'Term 3';
    const studentResults = allStudentResults.filter(r => r.term === latestTerm);

    const studentFees = fees.filter(f => f.studentId === student.id);
    const balance = studentFees.reduce((acc, f) => acc + (f.amount - f.paid), 0);
    
    const { getStudentRank } = useApp();
    const rank = getStudentRank(student.id, latestTerm, 2024);

    const visibleEvents = events.filter(e => !e.targetRoles || e.targetRoles.includes(user.role));

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Dashboard</h1>
          <Badge variant="info">{user.role}</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <Card className="md:col-span-2">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-lg font-bold">
                {student.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold">{student.name}</p>
                <p className="text-[10px] text-zinc-500">Adm: {student.admissionNumber} • Class: {student.classId}</p>
                <p className="text-[10px] text-zinc-500">Teacher: Mr. Kamau</p>
              </div>
            </div>
          </Card>
          
          <Card>
            <p className="text-[10px] font-bold uppercase text-zinc-400 mb-1">Fee Balance</p>
            <p className={`text-lg font-bold ${balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
              Ksh {balance.toLocaleString()}
            </p>
          </Card>

          <Card>
            <p className="text-[10px] font-bold uppercase text-zinc-400 mb-1">Class Position</p>
            <div className="flex items-baseline gap-1">
              <p className="text-lg font-bold text-blue-600">{rank.classRank}</p>
              <p className="text-[10px] text-zinc-400">out of {rank.classTotal}</p>
            </div>
          </Card>

          <Card>
            <p className="text-[10px] font-bold uppercase text-zinc-400 mb-1">Form Position</p>
            <div className="flex items-baseline gap-1">
              <p className="text-lg font-bold text-emerald-600">{rank.formRank}</p>
              <p className="text-[10px] text-zinc-400">out of {rank.formTotal}</p>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Recent Results</h2>
            <Card>
              <Table headers={['Subject', 'Marks', 'Grade']}>
                {studentResults.map(r => (
                  <tr key={r.id}>
                    <td className="px-3 py-2 text-xs">{r.subject}</td>
                    <td className="px-3 py-2 text-xs font-mono">{r.marks}</td>
                    <td className="px-3 py-2">
                      <Badge variant={r.grade === 'A' ? 'success' : 'neutral'}>{r.grade}</Badge>
                    </td>
                  </tr>
                ))}
              </Table>
            </Card>
          </div>

          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Upcoming Events</h2>
            <div className="space-y-2">
              {visibleEvents.map(e => (
                <Card key={e.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-zinc-50 dark:bg-zinc-800 flex flex-col items-center justify-center">
                      <span className="text-[8px] font-bold uppercase">{new Date(e.date).toLocaleString('default', { month: 'short' })}</span>
                      <span className="text-xs font-bold">{new Date(e.date).getDate()}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold">{e.title}</p>
                      <p className="text-[10px] text-zinc-500">{e.location}</p>
                      <p className="text-[9px] text-zinc-400">{e.rsvps.length} RSVPs</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Teacher Dashboard</h1>
            <p className="text-xs text-zinc-500">Class, subject and parent-alert overview</p>
          </div>
          <Badge variant="info">{teacher?.classId ? classes.find(c => c.id === teacher.classId)?.name : 'Unassigned Class'}</Badge>
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Admin Overview</h1>
        <div className="flex gap-2">
          <Button variant={showFinancials ? 'secondary' : 'outline'} className="h-8 text-[10px]" onClick={() => { const next = !showFinancials; setShowFinancials(next); toggleWidget('dashboard_widget_financials', next); }}>
            {showFinancials ? 'Hide Financials' : 'Show Financials'}
          </Button>
          <Button variant={showAcademics ? 'secondary' : 'outline'} className="h-8 text-[10px]" onClick={() => { const next = !showAcademics; setShowAcademics(next); toggleWidget('dashboard_widget_academics', next); }}>
            {showAcademics ? 'Hide Academics' : 'Show Academics'}
          </Button>
          <Button variant="ghost" className="h-8 text-[10px]">Export Report</Button>
          <Button className="h-8 text-[10px]">New Entry</Button>
        </div>
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
