import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Clock, BookOpen, Users, MapPin, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Card, Badge } from '../components/UI';

type AssignmentRow = {
  stream_id: string | null;
  class_id: string | null;
  subject_id: string;
};

type SessionItem = {
  id: string;
  day: string;
  time: string;
  subject: string;
  classLabel: string;
  room: string;
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = ['7:40-8:20', '8:20-9:00', '9:20-10:00', '10:00-10:40', '11:00-11:40', '11:40-12:20', '2:00-2:40', '2:40-3:20'];

export const Timetable: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [streams, setStreams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [assignmentRows, setAssignmentRows] = useState<AssignmentRow[]>([]);
  const [assignmentsEnabled, setAssignmentsEnabled] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user?.school_id) return;
      setLoading(true);

      try {
        const [schoolStreams, schoolSubjects, schoolEvents] = await Promise.all([
          api.getStreams(user.school_id),
          api.getSubjects(user.school_id),
          api.getEvents(user.school_id)
        ]);

        setStreams(schoolStreams || []);
        setSubjects(schoolSubjects || []);
        setEvents(schoolEvents || []);

        if (user.role === 'TEACHER') {
          const { data, error } = await supabase
            .from('teacher_subject_stream_assignments')
            .select('stream_id, class_id, subject_id')
            .eq('school_id', user.school_id)
            .eq('teacher_id', user.id)
            .eq('active', true);

          if (error) {
            const message = String(error.message || '');
            if (message.toLowerCase().includes('teacher_subject_stream_assignments')) {
              setAssignmentsEnabled(false);
              setAssignmentRows([]);
            } else {
              throw error;
            }
          } else {
            setAssignmentRows((data || []) as AssignmentRow[]);
            setAssignmentsEnabled(true);
          }
        }
      } catch (err) {
        console.error('Failed to load timetable context', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  const teacherStreams = useMemo(() => {
    if (!user) return [];

    if (assignmentRows.length > 0) {
      const allowedIds = new Set(
        assignmentRows
          .filter((row) => !!row.stream_id)
          .map((row) => row.stream_id as string)
      );

      const byClassIds = new Set(
        assignmentRows
          .filter((row) => !row.stream_id && !!row.class_id)
          .map((row) => row.class_id as string)
      );

      const scoped = streams.filter((stream: any) => {
        if (allowedIds.has(stream.id)) return true;
        return !!stream.class_id && byClassIds.has(stream.class_id);
      });

      if (scoped.length > 0) return scoped;
    }

    return streams.filter((stream: any) => stream.class_teacher_id === user.id);
  }, [assignmentRows, streams, user]);

  const teacherSubjectIds = useMemo(() => {
    if (assignmentRows.length === 0) return [] as string[];
    return [...new Set(assignmentRows.map((row) => row.subject_id))];
  }, [assignmentRows]);

  const teacherSubjects = useMemo(() => {
    if (teacherSubjectIds.length === 0) {
      return subjects.slice(0, 6);
    }
    return subjects.filter((subject: any) => teacherSubjectIds.includes(subject.id));
  }, [subjects, teacherSubjectIds]);

  const sessions = useMemo(() => {
    const streamList = teacherStreams;
    const subjectList = teacherSubjects;

    const combos: Array<{ stream: any; subject: any }> = [];
    for (const stream of streamList) {
      for (const subject of subjectList) {
        combos.push({ stream, subject });
      }
    }

    const maxSessions = DAYS.length * TIME_SLOTS.length;
    const chosen = combos.slice(0, Math.min(combos.length, maxSessions));

    return chosen.map((combo, index) => {
      const day = DAYS[Math.floor(index / TIME_SLOTS.length)] || DAYS[0];
      const time = TIME_SLOTS[index % TIME_SLOTS.length];
      const classLabel = `${combo.stream.class?.name || 'Form'} ${combo.stream.name || ''}`.trim();

      return {
        id: `${combo.stream.id}-${combo.subject.id}-${day}-${time}`,
        day,
        time,
        subject: combo.subject.name,
        classLabel,
        room: `Room ${((index % 10) + 1).toString().padStart(2, '0')}`
      } as SessionItem;
    });
  }, [teacherStreams, teacherSubjects]);

  const sessionsByDay = useMemo(() => {
    return DAYS.reduce((acc, day) => {
      acc[day] = sessions.filter((item) => item.day === day);
      return acc;
    }, {} as Record<string, SessionItem[]>);
  }, [sessions]);

  const upcomingEvents = useMemo(() => {
    const now = new Date();
    return (events || [])
      .filter((event: any) => !!event.date)
      .map((event: any) => ({ ...event, parsed: new Date(event.date) }))
      .filter((event: any) => event.parsed >= now)
      .sort((a: any, b: any) => a.parsed.getTime() - b.parsed.getTime())
      .slice(0, 4);
  }, [events]);

  if (loading) {
    return <div className="py-16 text-sm font-semibold text-zinc-500">Loading timetable...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Timetable</h1>
          <p className="text-sm text-zinc-500">Weekly class schedule with your current teaching scope.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="info"><Users size={12} /> {teacherStreams.length} Streams</Badge>
          <Badge variant="neutral"><BookOpen size={12} /> {teacherSubjects.length} Subjects</Badge>
          <Badge variant="warning"><Clock size={12} /> {sessions.length} Sessions</Badge>
        </div>
      </div>

      {!assignmentsEnabled && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3 text-amber-800">
            <AlertCircle size={18} className="mt-0.5" />
            <div className="text-sm">
              Assignment table is not available yet. Showing timetable based on class-teacher streams.
            </div>
          </div>
        </Card>
      )}

      {sessions.length === 0 ? (
        <Card>
          <div className="py-10 text-center">
            <p className="text-base font-semibold">No timetable sessions found</p>
            <p className="text-sm text-zinc-500 mt-1">Assign this teacher to streams/subjects first, then refresh.</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="hidden lg:block overflow-x-auto rounded-2xl border border-zinc-100 dark:border-zinc-800">
            <table className="w-full min-w-[920px] border-collapse bg-white dark:bg-zinc-900">
              <thead>
                <tr className="border-b border-zinc-100 dark:border-zinc-800">
                  <th className="px-4 py-3 text-left text-[11px] uppercase tracking-wider text-zinc-500">Day</th>
                  {TIME_SLOTS.map((slot) => (
                    <th key={slot} className="px-2 py-3 text-center text-[10px] uppercase tracking-wider text-zinc-500">{slot}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => (
                  <tr key={day} className="border-b border-zinc-50 dark:border-zinc-800/60">
                    <td className="px-4 py-3 text-sm font-semibold">{day}</td>
                    {TIME_SLOTS.map((slot) => {
                      const row = sessions.find((item) => item.day === day && item.time === slot);
                      return (
                        <td key={`${day}-${slot}`} className="px-1 py-1 align-top">
                          {row ? (
                            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2 min-h-[72px]">
                              <p className="text-[11px] font-bold text-emerald-800 leading-tight">{row.subject}</p>
                              <p className="text-[10px] text-emerald-700 mt-1">{row.classLabel}</p>
                              <p className="text-[10px] text-emerald-700 flex items-center gap-1 mt-1"><MapPin size={10} /> {row.room}</p>
                            </div>
                          ) : (
                            <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700 min-h-[72px]" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden space-y-3">
            {DAYS.map((day) => (
              <Card key={day}>
                <h3 className="text-sm font-bold mb-2">{day}</h3>
                <div className="space-y-2">
                  {sessionsByDay[day].length === 0 && <p className="text-xs text-zinc-400">No lessons scheduled</p>}
                  {sessionsByDay[day].map((item) => (
                    <div key={item.id} className="rounded-lg border border-zinc-200 px-3 py-2">
                      <p className="text-xs font-bold">{item.subject}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">{item.time} • {item.classLabel}</p>
                      <p className="text-xs text-zinc-500">{item.room}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <Calendar size={16} className="text-zinc-500" />
          <h3 className="text-sm font-bold">Upcoming Events</h3>
        </div>

        <div className="space-y-2">
          {upcomingEvents.length === 0 && <p className="text-xs text-zinc-400">No upcoming events found.</p>}
          {upcomingEvents.map((event: any) => (
            <div key={event.id} className="rounded-lg border border-zinc-200 px-3 py-2">
              <p className="text-sm font-semibold">{event.title}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{new Date(event.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
              {event.description && <p className="text-xs text-zinc-500 mt-1">{event.description}</p>}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};
