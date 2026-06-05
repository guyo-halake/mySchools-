import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Modal } from '../components/UI';
import { 
  CheckCircle,
  ArrowRight,
  TrendingUp,
  Clock,
  Calendar as CalendarIcon,
  ChevronLeft
} from 'lucide-react';
import { formatDate } from '../utils/utils';

export const Calendar: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [terms, setTerms] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const currentYear = new Date().getFullYear();
  const today = new Date().toISOString().slice(0, 10);
  
  const [termData, setTermData] = useState({
    'Term 1': { start_date: '', end_date: '' },
    'Term 2': { start_date: '', end_date: '' },
    'Term 3': { start_date: '', end_date: '' }
  });

  const fetchData = async () => {
    if (!user?.school_id) return;
    try {
      const data = await api.getTerms(user.school_id);
      setTerms(data || []);
      
      const updatedData: any = { ...termData };
      (data || []).forEach((t: any) => {
        if (updatedData[t.name] && t.year === currentYear) {
          updatedData[t.name] = { start_date: t.start_date, end_date: t.end_date };
        }
      });
      setTermData(updatedData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user?.school_id]);

  const handleUpdateCalendar = async () => {
    try {
      setLoading(true);
      const promises = Object.entries(termData).map(([name, dates]) => {
        if (!dates.start_date || !dates.end_date) return null;
        return api.upsertTerm({
          school_id: user!.school_id,
          name,
          year: currentYear,
          start_date: dates.start_date,
          end_date: dates.end_date
        });
      }).filter(Boolean);

      await Promise.all(promises);
      const freshData = await api.getTerms(user.school_id);
      setTerms(freshData || []);
      setIsModalOpen(false);
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 5000);
    } catch (e) {
      alert('Error updating dates');
    } finally {
      setLoading(false);
    }
  };

  const setAsCurrent = async (termId: string) => {
    try {
      setLoading(true);
      await api.setCurrentTerm(user!.school_id, termId);
      await fetchData();
    } catch (e) {
      alert('Missing column is_current. Please check SQL instructions.');
    } finally {
      setLoading(false);
    }
  };

  // Logic: a term is current if today is between start and end date, OR if explicitly marked
  const isActuallyCurrent = (t: any) => {
    if (t.is_current) return true;
    return today >= t.start_date && today <= t.end_date;
  };

  if (loading && terms.length === 0) return (
     <div className="flex items-center justify-center min-h-[60vh]">
        <Clock className="animate-spin text-zinc-300" size={24} />
     </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-12 font-inter text-black bg-white min-h-screen">
      
      {/* HEADER */}
      <div className="flex justify-between items-end pb-4 border-b border-black">
        <div>
           <button 
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-zinc-400 hover:text-black transition-colors text-[10px] font-black uppercase tracking-widest mb-4"
           >
              <ChevronLeft size={14} /> Back
           </button>
           <h1 className="text-3xl font-normal tracking-tight text-black" style={{ fontFamily: 'Sora' }}>
             Academic Calendar
           </h1>
           <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-2">
             Session Control • Year {currentYear}
           </p>
        </div>
        <button 
           onClick={() => setIsModalOpen(true)} 
           className="flex items-center gap-2 px-6 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors"
        >
          <CalendarIcon size={14} /> Adjust Dates
        </button>
      </div>

      {isSuccess && (
        <div className="p-6 bg-emerald-50 border border-emerald-200 animate-in fade-in zoom-in-95 flex items-center gap-3">
           <CheckCircle size={16} className="text-emerald-600" />
           <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest">Calendar synchronised successfully.</p>
        </div>
      )}

      {/* ACTIVE TERMS DISPLAY */}
      <div className="space-y-6">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100 pb-2">Institutional Terms</h2>
        <div className="space-y-4">
          {['Term 1', 'Term 2', 'Term 3'].map(name => {
            const term = terms.find(t => t.name === name && t.year === currentYear);
            const isCurrent = term && isActuallyCurrent(term);

            return (
              <div key={name} className={`flex items-center justify-between p-6 border transition-all ${isCurrent ? 'border-black bg-zinc-50' : 'border-zinc-200 hover:border-zinc-400'}`}>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-normal text-black" style={{ fontFamily: 'Sora' }}>{name}</h3>
                    {isCurrent && (
                      <span className="flex items-center gap-1 px-3 py-1 bg-black text-white text-[9px] font-black uppercase tracking-widest">
                        <Clock size={10} /> Active Now
                      </span>
                    )}
                  </div>
                </div>

                {term ? (
                   <div className="flex items-center gap-12">
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Opening</p>
                          <p className="text-sm font-bold text-black">{formatDate(term.start_date)}</p>
                        </div>
                        <ArrowRight size={14} className="text-zinc-300" />
                        <div className="text-right">
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Closing</p>
                          <p className="text-sm font-bold text-black">{formatDate(term.end_date)}</p>
                        </div>
                      </div>
                      
                      <div className="h-10 w-px bg-zinc-200 mx-2"></div>
                      
                      {!term.is_current ? (
                        <button 
                          onClick={() => setAsCurrent(term.id)}
                          className="flex items-center gap-2 px-4 py-2 border border-zinc-200 text-black text-[9px] font-black uppercase tracking-widest hover:border-black transition-all"
                        >
                          <TrendingUp size={12} /> Force Active
                        </button>
                      ) : (
                        <div className="px-4 py-2 bg-black text-white text-[9px] font-black uppercase tracking-widest">
                          System Default
                        </div>
                      )}
                   </div>
                ) : (
                  <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Not configured</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Master Calendar Configuration">
         <div className="p-6 bg-white font-inter">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6">Set institutional dates for {currentYear}</p>
            
            <div className="space-y-6">
               {['Term 1', 'Term 2', 'Term 3'].map(name => (
                 <div key={name} className="space-y-4 p-6 border border-zinc-200">
                    <h4 className="text-[10px] font-black text-black uppercase tracking-widest border-b border-zinc-100 pb-2">{name}</h4>
                    <div className="grid grid-cols-2 gap-6 pt-2">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Opening Date</label>
                          <input 
                            type="date" 
                            value={termData[name as keyof typeof termData].start_date} 
                            onChange={e => setTermData({...termData, [name]: { ...termData[name as keyof typeof termData], start_date: e.target.value }})} 
                            className="w-full px-4 py-3 border border-zinc-200 text-sm font-bold text-black focus:outline-none focus:border-black transition-colors" 
                          />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Closing Date</label>
                          <input 
                            type="date" 
                            value={termData[name as keyof typeof termData].end_date} 
                            onChange={e => setTermData({...termData, [name]: { ...termData[name as keyof typeof termData], end_date: e.target.value }})} 
                            className="w-full px-4 py-3 border border-zinc-200 text-sm font-bold text-black focus:outline-none focus:border-black transition-colors" 
                          />
                       </div>
                    </div>
                 </div>
               ))}
            </div>

            <div className="flex gap-4 pt-8">
               <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="flex-1 py-4 border border-zinc-200 text-black text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-colors"
               >
                  Discard Changes
               </button>
               <button 
                  onClick={handleUpdateCalendar} 
                  className="flex-1 py-4 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors"
               >
                  Commit Calendar
               </button>
            </div>
         </div>
      </Modal>

    </div>
  );
};
