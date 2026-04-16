import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Badge, Button, Modal } from '../components/UI';
import { Plus, Save, Trash2, CheckCircle2, AlarmClock } from 'lucide-react';
import { formatDate } from '../utils/utils';

type AnnouncementRow = {
  id: string;
  school_id: string;
  title: string;
  content: string;
  author_id: string | null;
  target_roles: string[] | null;
  created_at: string;
};

type EventRow = {
  id: string;
  school_id: string;
  title: string;
  description: string | null;
  date: string;
  location: string | null;
  rsvps: string[] | null;
  created_by: string | null;
};

type ReminderRow = {
  id: string;
  event_id: string;
  user_id: string;
  remind_at: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value?: string | null) => Boolean(value && UUID_RE.test(value));

export const Announcements: React.FC = () => {
  const { user } = useAuth();
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busyEventId, setBusyEventId] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [reminders, setReminders] = useState<ReminderRow[]>([]);
  const [profileNameById, setProfileNameById] = useState<Record<string, string>>({});

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    targetRoles: ['PARENT', 'STUDENT', 'TEACHER'] as string[]
  });

  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    time: '09:00',
    location: ''
  });

  const canManage = user?.role === 'ADMIN' || user?.role === 'PRINCIPAL';

  const loadData = async () => {
    if (!user?.school_id) {
      setAnnouncements([]);
      setEvents([]);
      setReminders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [announcementRes, eventsRes, remindersRes] = await Promise.all([
        supabase
          .from('announcements')
          .select('*')
          .eq('school_id', user.school_id)
          .order('created_at', { ascending: false }),
        supabase
          .from('events')
          .select('*')
          .eq('school_id', user.school_id)
          .order('date', { ascending: true }),
        isUuid(user.id)
          ? supabase
              .from('event_reminders')
              .select('*')
              .eq('school_id', user.school_id)
              .eq('user_id', user.id)
          : Promise.resolve({ data: [], error: null })
      ]);

      if (announcementRes.error) throw announcementRes.error;
      if (eventsRes.error) throw eventsRes.error;

      setAnnouncements((announcementRes.data || []) as AnnouncementRow[]);
      setEvents((eventsRes.data || []) as EventRow[]);
      setReminders((remindersRes.data || []) as ReminderRow[]);

      const authorIds = Array.from(new Set([
        ...(announcementRes.data || []).map((row: any) => row.author_id).filter(Boolean),
        ...(eventsRes.data || []).map((row: any) => row.created_by).filter(Boolean)
      ]));

      if (authorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', authorIds);

        const nextMap: Record<string, string> = {};
        (profiles || []).forEach((profile: any) => {
          nextMap[profile.id] = profile.full_name || 'School Staff';
        });
        setProfileNameById(nextMap);
      } else {
        setProfileNameById({});
      }
    } catch (error: any) {
      setStatusMessage(error?.message ? `Could not load updates: ${error.message}` : 'Could not load updates.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id, user?.school_id]);

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.school_id) return;

    const { error } = await supabase.from('announcements').insert({
      school_id: user.school_id,
      title: announcementForm.title,
      content: announcementForm.content,
      author_id: user.id,
      target_roles: announcementForm.targetRoles
    });

    if (error) {
      setStatusMessage(`Could not save announcement: ${error.message}`);
      return;
    }

    setIsAnnouncementModalOpen(false);
    setAnnouncementForm({
      title: '',
      content: '',
      targetRoles: ['PARENT', 'STUDENT', 'TEACHER']
    });
    setStatusMessage('Announcement saved.');
    await loadData();
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.school_id) return;

    const eventDate = new Date(`${eventForm.date}T${eventForm.time}:00`);
    if (Number.isNaN(eventDate.getTime())) {
      setStatusMessage('Please choose a valid date and time.');
      return;
    }

    const { error } = await supabase.from('events').insert({
      school_id: user.school_id,
      title: eventForm.title,
      description: eventForm.description || null,
      date: eventDate.toISOString(),
      location: eventForm.location || null,
      rsvps: [],
      created_by: isUuid(user.id) ? user.id : null
    });

    if (error) {
      setStatusMessage(`Could not save event: ${error.message}`);
      return;
    }

    setIsEventModalOpen(false);
    setEventForm({
      title: '',
      description: '',
      date: new Date().toISOString().slice(0, 10),
      time: '09:00',
      location: ''
    });
    setStatusMessage('Event saved.');
    await loadData();
  };

  const handleRsvp = async (event: EventRow) => {
    if (!isUuid(user?.id)) {
      setStatusMessage('Please sign in again to RSVP.');
      return;
    }

    setBusyEventId(event.id);
    const current = Array.isArray(event.rsvps) ? [...event.rsvps] : [];
    const already = current.includes(user.id);
    const next = already ? current.filter((id) => id !== user.id) : [...current, user.id];

    const { error } = await supabase
      .from('events')
      .update({ rsvps: next })
      .eq('id', event.id)
      .eq('school_id', user.school_id || '');

    setBusyEventId('');
    if (error) {
      setStatusMessage(`Could not update RSVP: ${error.message}`);
      return;
    }

    setStatusMessage(already ? 'RSVP removed.' : 'RSVP added.');
    await loadData();
  };

  const handleRemindMe = async (event: EventRow) => {
    if (!isUuid(user?.id) || !user?.school_id) {
      setStatusMessage('Please sign in again to set reminders.');
      return;
    }

    setBusyEventId(event.id);

    const eventDate = new Date(event.date);
    const remindAt = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
    if (!Number.isFinite(remindAt.getTime())) {
      setBusyEventId('');
      setStatusMessage('Could not set reminder for this event.');
      return;
    }

    const { error } = await supabase
      .from('event_reminders')
      .upsert({
        school_id: user.school_id,
        event_id: event.id,
        user_id: user.id,
        remind_at: remindAt.toISOString()
      }, { onConflict: 'event_id,user_id' });

    setBusyEventId('');
    if (error) {
      setStatusMessage(`Could not save reminder: ${error.message}`);
      return;
    }

    setStatusMessage('Reminder set.');
    await loadData();
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!canManage || !user?.school_id) return;

    setBusyEventId(eventId);
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('school_id', user.school_id);
    setBusyEventId('');

    if (error) {
      setStatusMessage(`Could not delete event: ${error.message}`);
      return;
    }

    setStatusMessage('Event deleted.');
    await loadData();
  };

  const reminderSet = useMemo(() => {
    const set = new Set<string>();
    reminders.forEach((row) => set.add(row.event_id));
    return set;
  }, [reminders]);

  const eventRows = useMemo(() => {
    return events.map((event) => {
      const dateObj = new Date(event.date);
      const dateLabel = Number.isFinite(dateObj.getTime()) ? dateObj.toLocaleDateString('en-GB') : '-';
      const timeLabel = Number.isFinite(dateObj.getTime()) ? dateObj.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '-';
      const byLabel = event.created_by ? (profileNameById[event.created_by] || 'School Staff') : 'School Admin';
      const rsvpCount = Array.isArray(event.rsvps) ? event.rsvps.length : 0;
      const rsvped = Boolean(isUuid(user?.id) && Array.isArray(event.rsvps) && event.rsvps.includes(user.id));
      const reminded = reminderSet.has(event.id);

      return {
        ...event,
        dateLabel,
        timeLabel,
        byLabel,
        rsvpCount,
        rsvped,
        reminded
      };
    });
  }, [events, profileNameById, reminderSet, user?.id]);

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Announcements and Events</h1>
            <p className="text-sm text-zinc-500">School updates, notices, and upcoming events.</p>
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setIsAnnouncementModalOpen(true)}><Plus size={16} /> New Announcement</Button>
              <Button onClick={() => setIsEventModalOpen(true)}><Plus size={16} /> New Event</Button>
            </div>
          )}
        </div>
        {statusMessage && (
          <div className="mt-4 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-300">
            {statusMessage}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="border-b border-zinc-200 dark:border-zinc-800 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Announcements</h2>
        </div>
        {loading ? (
          <div className="px-5 py-6 text-sm text-zinc-500">Loading...</div>
        ) : announcements.length === 0 ? (
          <div className="px-5 py-6 text-sm text-zinc-500">No announcements yet.</div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {announcements.map((announcement) => (
              <article key={announcement.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{announcement.title}</h3>
                  <span className="text-xs text-zinc-500 whitespace-nowrap">{formatDate(announcement.created_at)}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{announcement.content}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                  <span>By {announcement.author_id ? (profileNameById[announcement.author_id] || 'School Staff') : 'School Admin'}</span>
                  {(announcement.target_roles || []).map((role) => (
                    <Badge key={`${announcement.id}-${role}`} variant="neutral">{role}</Badge>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="border-b border-zinc-200 dark:border-zinc-800 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Events</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40">
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Event Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {eventRows.map((event) => (
                <tr key={event.id} className="border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{event.title}</div>
                    <div className="text-xs text-zinc-500">{event.location || '-'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200">{event.dateLabel}</td>
                  <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200">{event.timeLabel}</td>
                  <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200">{event.byLabel}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={event.rsvped ? 'secondary' : 'outline'}
                        className="h-8 px-3 text-xs"
                        onClick={() => handleRsvp(event)}
                        disabled={busyEventId === event.id}
                        title={`${event.rsvpCount} RSVP`}
                      >
                        <CheckCircle2 size={13} /> {event.rsvped ? 'RSVPed' : 'RSVP'}
                      </Button>
                      <Button
                        variant={event.reminded ? 'secondary' : 'outline'}
                        className="h-8 px-3 text-xs"
                        onClick={() => handleRemindMe(event)}
                        disabled={busyEventId === event.id}
                      >
                        <AlarmClock size={13} /> {event.reminded ? 'Reminder Set' : 'Remind Me'}
                      </Button>
                      {canManage && (
                        <Button
                          variant="danger"
                          className="h-8 px-3 text-xs"
                          onClick={() => handleDeleteEvent(event.id)}
                          disabled={busyEventId === event.id}
                        >
                          <Trash2 size={13} /> Delete
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <Modal isOpen={isAnnouncementModalOpen} onClose={() => setIsAnnouncementModalOpen(false)} title="New Announcement">
        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Title</label>
            <input
              type="text"
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
              value={announcementForm.title}
              onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Content</label>
            <textarea
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none min-h-[120px]"
              value={announcementForm.content}
              onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Target Roles (comma separated)</label>
            <input
              type="text"
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
              value={announcementForm.targetRoles.join(', ')}
              onChange={(e) => setAnnouncementForm({
                ...announcementForm,
                targetRoles: e.target.value.split(',').map((item) => item.trim().toUpperCase()).filter(Boolean)
              })}
            />
          </div>
          <Button type="submit" className="w-full py-4"><Save size={18} /> Save Announcement</Button>
        </form>
      </Modal>

      <Modal isOpen={isEventModalOpen} onClose={() => setIsEventModalOpen(false)} title="New Event">
        <form onSubmit={handleCreateEvent} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Event Name</label>
            <input
              type="text"
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
              value={eventForm.title}
              onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Date</label>
              <input
                type="date"
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
                value={eventForm.date}
                onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Time</label>
              <input
                type="time"
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
                value={eventForm.time}
                onChange={(e) => setEventForm({ ...eventForm, time: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Location</label>
            <input
              type="text"
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
              value={eventForm.location}
              onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Description</label>
            <textarea
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none min-h-[90px]"
              value={eventForm.description}
              onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
            />
          </div>
          <Button type="submit" className="w-full py-4"><Save size={18} /> Save Event</Button>
        </form>
      </Modal>
    </div>
  );
};
