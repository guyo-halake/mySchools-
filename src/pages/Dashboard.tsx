import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Badge, Table, Button } from '../components/UI';
import { 
  Users, 
  CreditCard, 
  MessageSquare, 
  Calendar,
  Activity,
  ArrowUpRight,
  Target,
  Stethoscope,
  ShieldAlert,
  BarChart3
} from 'lucide-react';
import { formatCurrency } from '../utils/utils';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user?.school_id) return;
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
      } catch (error) {
        console.error('Fetch error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user?.school_id]);

  if (loading || !data) return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="h-4 w-4 animate-ping rounded-full bg-zinc-200" />
    </div>
  );

  const termFeesCollected = data.fees.reduce((acc: number, f: any) => acc + (f.amount_paid || 0), 0);
  const studentsWithArrears = data.fees.filter((f: any) => (f.amount_due - f.amount_paid) > 0).length;
  
  const gradeCounts = data.results.reduce((acc: any, r: any) => {
    acc[r.grade] = (acc[r.grade] || 0) + 1;
    return acc;
  }, { 'A': 0, 'B': 0, 'C': 0, 'D': 0, 'E': 0 });

  const recentActivity = [
    ...data.events.map((e: any) => ({ ...e, type: 'Event', date: e.date })),
    ...data.discipline.map((d: any) => ({ ...d, type: 'Discipline', date: d.incident_date })),
    ...data.health.map((h: any) => ({ ...h, type: 'Health', date: h.created_at }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);

  return (
    <div className="mx-auto max-w-5xl py-6 px-4 space-y-12 animate-in fade-in duration-500 font-sans">
      {/* 1. Welcoming Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-zinc-100 pb-8">
        <div className="space-y-0.5">
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">Welcome, {user?.full_name?.split(' ')[0] || 'User'}</h1>
          <p className="text-[11px] text-zinc-400 font-medium">
            {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 font-sans">
          <QuickAction to="/announcements" icon={<MessageSquare size={12} />} label="Notice" />
          <QuickAction to="/staff" icon={<Users size={12} />} label="Staff" />
          <QuickAction to="/students" icon={<Users size={12} />} label="Students" />
          <QuickAction to="/fees" icon={<CreditCard size={12} />} label="Fees" />
        </div>
      </div>

      {/* 2. Smaller, Clean Metrics (No Color) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
        <Metric 
          label="Total Students" 
          value={data.students.length} 
          sub={data.teachers.length + " Teachers"} 
        />
        <Metric 
          label="Collected Fees" 
          value={formatCurrency(termFeesCollected)} 
          sub={studentsWithArrears + " In Arrears"} 
        />
        <Metric 
          label="School Mean" 
          value="74.2 / B" 
          sub="Current Mean Score" 
        />
        <Metric 
          label="Target Goal" 
          value="80.0 / B+" 
          sub="Institutional Target" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 font-sans">
        {/* Left: Financial Trend & Grade Spread */}
        <div className="lg:col-span-7 space-y-12 mt-4 font-sans">
          <section className="space-y-4 font-sans">
            <h2 className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 px-1">Payment History</h2>
            <div className="h-24 flex items-end gap-1.5 px-1 font-sans">
              {[30, 45, 25, 60, 80, 50, 90, 40, 70, 55, 65, 85].map((h, i) => (
                <div key={i} className="flex-1 bg-zinc-50 rounded-sm h-full flex flex-col justify-end group cursor-default">
                   <motion.div 
                     initial={{ height: 0 }} 
                     animate={{ height: `${h}%` }} 
                     className="bg-zinc-900 group-hover:bg-zinc-400 transition-colors" 
                   />
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-6 pt-4 font-sans">
            <h2 className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 px-1 font-sans">Grade Census</h2>
            <div className="grid grid-cols-5 gap-4 font-sans px-1">
               {['A', 'B', 'C', 'D', 'E'].map(grade => (
                  <div key={grade} className="border-l border-zinc-100 pl-3 space-y-0.5">
                     <p className="text-lg font-semibold tracking-tight text-zinc-900">{grade}</p>
                     <p className="text-[9px] font-bold text-zinc-400 uppercase">{gradeCounts[grade] || 0} Students</p>
                  </div>
               ))}
            </div>
          </section>
        </div>

        {/* Right: Daily Activity (Smaller Text) */}
        <div className="lg:col-span-5 space-y-8 font-sans">
           <h2 className="text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-400 border-b border-zinc-100 pb-3 px-1">Daily Log</h2>
           <div className="space-y-8 font-sans">
              {recentActivity.map((log: any, i) => (
                 <div key={i} className="flex gap-4 items-start font-sans">
                    <div className="mt-1 flex-shrink-0 font-sans">
                       {log.type === 'Event' && <Calendar size={13} className="text-zinc-300" />}
                       {log.type === 'Discipline' && <ShieldAlert size={13} className="text-zinc-300" />}
                       {log.type === 'Health' && <Stethoscope size={13} className="text-zinc-300" />}
                    </div>
                    <div className="space-y-1 flex-1 font-sans">
                       <div className="flex items-center justify-between font-sans">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">{log.type}</p>
                          <p className="text-[9px] font-medium text-zinc-300">{new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                       </div>
                       <p className="text-[13px] font-medium tracking-normal text-zinc-900 leading-tight font-sans">
                          {log.title || log.incident_title || log.checkup_type || 'Update'}
                       </p>
                       <p className="text-[11px] text-zinc-500 font-medium leading-relaxed font-sans line-clamp-2">
                          {log.student?.profile?.full_name ? <span className="text-zinc-900 mr-1">{log.student.profile.full_name}:</span> : ""}
                          {log.description || log.diagnosis || "No extra data."}
                       </p>
                    </div>
                 </div>
              ))}
              {recentActivity.length === 0 && (
                 <p className="text-[11px] text-zinc-300 italic px-1 font-sans">No activity logs.</p>
              )}
           </div>
           
           <div className="pt-8 px-1">
              <Link to="/directory" className="inline-flex items-center gap-1.5 text-[10px] font-bold text-zinc-300 hover:text-zinc-900 transition-colors uppercase tracking-widest font-sans">
                 Records <ArrowUpRight size={10} />
              </Link>
           </div>
        </div>
      </div>
    </div>
  );
};

const Metric = ({ label, value, sub }: any) => (
  <div className="space-y-1 font-sans">
    <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">{label}</p>
    <p className="text-2xl font-semibold tracking-tight text-zinc-900">{value}</p>
    <p className="text-[9px] font-semibold text-zinc-300">{sub}</p>
  </div>
);

const QuickAction = ({ to, icon, label }: any) => (
  <Link 
    to={to} 
    className="inline-flex items-center gap-1.5 rounded-full border border-zinc-100 px-4 py-1.5 text-[10px] font-semibold text-zinc-500 hover:bg-zinc-900 hover:text-white transition-all font-sans"
  >
    <span className="opacity-50 group-hover:opacity-100">{icon}</span>
    <span>{label}</span>
  </Link>
);
