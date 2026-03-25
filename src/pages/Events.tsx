import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Card, Badge, Button, Modal } from '../components/UI';
import { Calendar, MapPin, Users, Check, Plus, Save } from 'lucide-react';
import { formatDate } from '../utils/utils';

export const Events: React.FC = () => {
  const { user } = useAuth();
  const { events, rsvpEvent, addEvent } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    location: '',
    rsvps: [] as string[]
  });

  const handleRSVP = (eventId: string) => {
    if (user) rsvpEvent(eventId, user.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addEvent(formData);
    setIsModalOpen(false);
    setFormData({
      title: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      location: '',
      rsvps: []
    });
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
        {events.map(event => {
          const isRSVPed = user ? event.rsvps.includes(user.id) : false;
          
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
                    <Users size={16} />
                    {event.rsvps.length} People attending
                  </div>
                </div>
                
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
