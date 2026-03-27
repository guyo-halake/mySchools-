import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Card, Badge, Button, Modal } from '../components/UI';
import { Calendar, MapPin, Users, Check, Plus, Save } from 'lucide-react';
import { formatDate } from '../utils/utils';
import { Role } from '../types';

export const Events: React.FC = () => {
  const { user } = useAuth();
  const { events, rsvpEvent, addEvent } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    targetRoles: ['PARENT', 'STUDENT', 'TEACHER', 'ADMIN'] as Role[],
    recurring: 'NONE' as 'NONE' | 'WEEKLY' | 'MONTHLY' | 'TERM',
    requiresPermissionSlip: false,
    rsvps: [] as string[]
  });

  const visibleEvents = user ? events.filter(e => !e.targetRoles || e.targetRoles.includes(user.role)) : events;

  const handleRSVP = (eventId: string) => {
    if (user) rsvpEvent(eventId, user.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addEvent({
      ...formData,
      targetRoles: formData.targetRoles.length > 0 ? formData.targetRoles : ['PARENT', 'STUDENT', 'TEACHER', 'ADMIN'],
    });
    setIsModalOpen(false);
    setFormData({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      location: '',
      targetRoles: ['PARENT', 'STUDENT', 'TEACHER', 'ADMIN'],
      recurring: 'NONE',
      requiresPermissionSlip: false,
      rsvps: []
    });
  };

  const exportIcs = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    const start = new Date(event.date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const end = new Date(new Date(event.date).getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const content = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `UID:${event.id}@schoolportal`,
      `DTSTAMP:${start}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${event.title}`,
      `DESCRIPTION:${event.description}`,
      `LOCATION:${event.location}`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\n');

    const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title.replace(/\s+/g, '_').toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">School Events</h1>
          <p className="text-gray-500 dark:text-zinc-400">Stay updated with upcoming school activities</p>
        </div>
        {user?.role === 'ADMIN' && (
          <Button onClick={() => setIsModalOpen(true)}><Plus size={18} /> Create Event</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {visibleEvents.map(event => {
          const isRSVPed = user ? event.rsvps.some((rsvp) => rsvp.userId === user.id) : false;
          
          return (
            <Card key={event.id} className="group hover:shadow-md transition-shadow">
              <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600">
                    <Calendar size={24} />
                  </div>
                  <Badge variant="info">{formatDate(event.date)}</Badge>
                </div>
                
                <h3 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors">{event.title}</h3>
                <p className="text-gray-500 dark:text-zinc-400 text-sm mb-6 flex-1">{event.description}</p>
                
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400">
                    <MapPin size={16} />
                    {event.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400">
                    <Badge variant="neutral">Recurring: {event.recurring || 'NONE'}</Badge>
                    {event.requiresPermissionSlip && <Badge variant="warning">Permission Slip Required</Badge>}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400">
                    <Users size={16} />
                    {event.rsvps.length} People attending
                  </div>
                  {(user?.role === 'ADMIN' || user?.role === 'TEACHER') && event.rsvps.length > 0 && (
                    <div className="text-[10px] text-zinc-500">
                      Latest RSVP: {new Date(event.rsvps[event.rsvps.length - 1].respondedAt).toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant={isRSVPed ? 'secondary' : 'primary'} 
                    className="w-full"
                    onClick={() => handleRSVP(event.id)}
                    disabled={isRSVPed}
                  >
                    {isRSVPed ? (
                      <><Check size={18} /> Attending</>
                    ) : (
                      'RSVP Now'
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => exportIcs(event.id)}>iCal</Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create School Event">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Event Title</label>
            <input 
              type="text" 
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Date</label>
            <input 
              type="date" 
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Location</label>
            <input 
              type="text" 
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Description</label>
            <textarea 
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none min-h-[100px]"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold mb-1">Recurring</label>
              <select className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none" value={formData.recurring} onChange={(e) => setFormData({ ...formData, recurring: e.target.value as 'NONE' | 'WEEKLY' | 'MONTHLY' | 'TERM' })}>
                <option value="NONE">NONE</option>
                <option value="WEEKLY">WEEKLY</option>
                <option value="MONTHLY">MONTHLY</option>
                <option value="TERM">TERM</option>
              </select>
            </div>
            <div className="flex items-center pt-7">
              <label className="text-sm flex items-center gap-2">
                <input type="checkbox" checked={formData.requiresPermissionSlip} onChange={(e) => setFormData({ ...formData, requiresPermissionSlip: e.target.checked })} />
                Requires trip permission
              </label>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Target Roles</label>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {(['PARENT', 'STUDENT', 'TEACHER', 'ADMIN'] as Role[]).map((role) => (
                <label key={role} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.targetRoles.includes(role)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({ ...formData, targetRoles: [...formData.targetRoles, role] });
                      } else {
                        setFormData({ ...formData, targetRoles: formData.targetRoles.filter((r) => r !== role) });
                      }
                    }}
                  />
                  {role}
                </label>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full py-4 mt-4"><Save size={18} /> Create Event</Button>
        </form>
      </Modal>

      <Card title="Event Calendar" className="bg-zinc-900 text-white border-none">
        <div className="flex flex-col items-center justify-center py-12">
          <Calendar size={48} className="text-zinc-700 mb-4" />
          <p className="text-zinc-400">Full calendar view coming soon...</p>
        </div>
      </Card>
    </div>
  );
};
