import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { 
  Users, 
  CreditCard, 
  MessageSquare, 
  Calendar,
  Activity,
  ArrowUpRight,
  ShieldAlert,
  Target,
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  TrendingDown,
  Download,
  Bell,
  CheckCircle,
  AlertTriangle,
  Plus,
  ArrowRight,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import { formatCurrency } from '../utils/utils';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  if (!user) return null;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 font-sans text-zinc-900 animate-in fade-in duration-300">
      {user.role === 'ADMIN' && <PrincipalView user={user} />}
      {user.role === 'TEACHER' && <TeacherView user={user} />}
      {(user.role === 'PARENT' || user.role === 'STUDENT') && <PersonalView user={user} />}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*                               TEACHER VIEW                                 */
/* -------------------------------------------------------------------------- */
const TeacherView = ({ user }: any) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeacherData = async () => {
      try {
        const stream = await api.getTeacherStream(user.id);
        if (stream) {
          const [students] = await Promise.all([
            api.getStudentsByStream(stream.id)
          ]);
          setData({ stream, students });
        } else {
          setData({ stream: null, students: [] });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeacherData();
  }, [user.id]);

  if (loading) return <div className="py-20 text-zinc-400 font-bold">Connecting to academic records...</div>;
  if (!data) return <div className="py-20 text-red-500 font-bold">Failed to load academic data. Please refresh.</div>;

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const streamLabel = [data.stream?.class?.name, data.stream?.name].filter(Boolean).join(' ');

  return (
    <div className="space-y-12">
      {/* 1. Normal Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Good morning, {user.full_name?.split(' ')[0]}</h1>
          <p className="text-zinc-500 font-medium">It is {today}</p>
          {data.stream && (
            <p className="inline-block mt-2 px-2.5 py-0.5 bg-zinc-100 rounded-md text-[11px] font-semibold text-zinc-600 uppercase tracking-wide">
              {streamLabel || 'Assigned Stream'} Teacher
            </p>
          )}
        </div>
        <div className="flex gap-2">
           <SimpleButton to="/results-management" label="Results Management" icon={<Target size={14} />} />
           <SimpleButton to="/chat" label="Parent Chat" icon={<MessageSquare size={14} />} />
        </div>
      </div>

      {/* 2. Simple Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        <StatBox label="Total Students" value={data.students.length} />
        <StatBox label="Class Mean Score" value="76%" />
        <StatBox label="Today's Attendance" value="38 / 40" />
      </div>

      {/* 3. Students & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between border-b pb-3 border-zinc-100">
            <h2 className="text-sm font-semibold">Student List</h2>
            <Link to="/students" className="text-xs text-zinc-400 hover:text-zinc-900 transition-colors">View all students</Link>
          </div>
          <div className="divide-y divide-zinc-50">
            {data.students.slice(0, 10).map((s: any) => (
              <div key={s.id} className="py-3 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded bg-zinc-50 flex items-center justify-center text-xs font-medium text-zinc-400 group-hover:bg-zinc-100 group-hover:text-zinc-900 transition-colors">
                    {s.profile?.full_name?.[0] || '?'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{s.profile?.full_name || 'Unnamed Student'}</p>
                    <p className="text-[11px] text-zinc-400 uppercase font-medium">{s.adm_no}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-600">
                   Good Standing
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-6">
           <h2 className="text-sm font-semibold border-b border-zinc-100 pb-2">Notices & Alerts</h2>
           <div className="space-y-4">
              <AlertItem type="Health" text="Razanyo: Asthma history. Needs inhaler." />
              <AlertItem type="Academic" text="You haven't recorded marks for Form 4 Math yet." color="text-amber-600" />
              <AlertItem type="Message" text="A parent of 'Razanyo' sent you a message." color="text-indigo-600" />
              <AlertItem type="Notice" text="School closes early tomorrow for staff meeting." />
           </div>
        </div>
      </div>
    </div>
  );
};

const AlertItem = ({ type, text, color = "text-zinc-600" }: any) => (
  <div className="p-4 rounded-lg bg-zinc-50 border border-zinc-100 space-y-1">
    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">{type}</p>
    <p className={`text-sm font-medium leading-relaxed ${color}`}>{text}</p>
  </div>
);

/* -------------------------------------------------------------------------- */
/*                               PRINCIPAL VIEW                               */
/* -------------------------------------------------------------------------- */
const PrincipalView = ({ user }: any) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [students, teachers, fees, results, events, discipline, health] = await Promise.all([
          api.getStudents(user.school_id),
          api.getTeachers(user.school_id),
          api.getFeesFull(user.school_id),
          api.getResults(user.school_id),
          api.getEvents(user.school_id),
          api.getDisciplinarySchoolWide(user.school_id),
          api.getHealthSchoolWide(user.school_id)
        ]);
        setData({ students, teachers, fees, results, events, discipline, health });
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [user.school_id]);

  if (loading || !data) return <div className="py-20 text-zinc-400">Loading school summary...</div>;

  const feesCollected = data.fees.reduce((acc: number, f: any) => acc + (f.amount_paid || 0), 0);

  return (
    <div className="space-y-12">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">Overview</h1>
        <p className="text-zinc-500 font-medium">Institutional report for {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-8">
        <StatBox label="Total Students" value={data.students.length} />
        <StatBox label="Fees Collected" value={formatCurrency(feesCollected)} />
        <StatBox label="School Mean" value="74%" />
        <StatBox label="Staff Count" value={data.teachers.length} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        <div className="lg:col-span-7 space-y-10">
           <section className="space-y-4">
              <h2 className="text-sm font-semibold border-b border-zinc-100 pb-2">Academic Performance</h2>
              <div className="grid grid-cols-5 gap-4">
                {['A', 'B', 'C', 'D', 'E'].map(g => (
                  <div key={g} className="space-y-0.5">
                    <p className="text-xl font-bold">{g}</p>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase">{Math.floor(Math.random() * 50)} Students</p>
                  </div>
                ))}
              </div>
           </section>
        </div>
        <div className="lg:col-span-5 space-y-6">
           <h2 className="text-sm font-semibold border-b border-zinc-100 pb-2">Recent School Updates</h2>
           <div className="space-y-6">
              {[...data.events, ...data.discipline].slice(0, 5).map((item, i) => (
                <div key={i} className="flex gap-4 items-start">
                  <div className="w-2 h-2 rounded-full bg-zinc-900 mt-1.5" />
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium">{item.title || item.incident_title}</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">{item.description || "School record logged."}</p>
                  </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  );
};

const PersonalView = ({ user }: any) => (
  <div className="py-20 text-center space-y-2">
    <p className="text-lg font-semibold">Student & Parent Portal</p>
    <p className="text-zinc-400">Content arriving soon.</p>
  </div>
);

/* -------------------------------------------------------------------------- */
/*                               SHARED COMPONENTS                            */
/* -------------------------------------------------------------------------- */

const StatBox = ({ label, value }: any) => (
  <div className="space-y-1">
    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none">{label}</p>
    <p className="text-3xl font-bold tracking-tight text-zinc-900">{value}</p>
  </div>
);

const SimpleButton = ({ to, label, icon }: any) => (
  <Link 
    to={to} 
    className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-200 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm"
  >
    <span className="text-zinc-400">{icon}</span>
    <span>{label}</span>
  </Link>
);
