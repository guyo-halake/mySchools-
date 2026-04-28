import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Modal } from '../components/UI';
import { 
  CheckCircle,
  ArrowRight,
  TrendingUp,
  Clock
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

  const isActuallyCurrent = (t: any) => {
    if (t.is_current) return true;
    return today >= t.start_date && today <= t.end_date;
  };

  if (loading && terms.length === 0) return <div className="p-20 text-center text-xs text-black font-medium">Reading system calendar...</div>;

  return (
    <div className="max-w-4xl mx-auto px-8 py-10 space-y-12 font-inter text-black bg-white">
      
      {/* HEADER */}
      <div className="flex justify-between items-end pb-8 border-b border-gray-100">
        <div className="space-y-1">
          <h1 className="text-2xl font-normal tracking-tight text-black font-sora">Term configuration</h1>
          <p className="text-slate-600 text-xs font-semibold uppercase tracking-widest leading-none mt-1">Calendar Year: {currentYear}</p>
        </div>
        <button onClick={() => { setIsSuccess(false); setIsModalOpen(true); }} className="px-6 py-2.5 bg-black text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-all shadow-sm">
          Set up term dates
        </button>
      </div>

      {isSuccess && (
        <div className="p-8 bg-gray-50 border border-gray-100 rounded-3xl space-y-6 animate-in fade-in zoom-in-95">
           <div className="flex items-center gap-3 text-black">
              <CheckCircle size={20} className="text-black" />
              <h2 className="text-lg font-normal font-sora">Terms updated. The new term calendar is:</h2>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {terms.filter(t => t.year === currentYear).map(t => (
                <div key={t.id} className="p-5 bg-white border border-gray-100 rounded-2xl space-y-3">
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t.name}</p>
                   <div className="space-y-1">
                      <p className="text-[10px] text-slate-500 font-medium">Opens: {formatDate(t.start_date)}</p>
                      <p className="text-[10px] text-slate-500 font-medium">Closes: {formatDate(t.end_date)}</p>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* ACTIVE TERMS DISPLAY */}
      <div className="space-y-6">
        <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active School Calendar</h2>
        <div className="grid grid-cols-1 gap-4">
          {['Term 1', 'Term 2', 'Term 3'].map(name => {
            const term = terms.find(t => t.name === name && t.year === currentYear);
            const isCurrent = term && isActuallyCurrent(term);

            return (
              <div key={name} className={`flex items-center justify-between p-6 border rounded-2xl transition-all ${isCurrent ? 'border-black bg-gray-50 shadow-lg shadow-gray-100' : 'border-gray-50 hover:bg-gray-50/50'}`}>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold">{name}</h3>
                    {isCurrent && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-black text-white text-[8px] font-bold uppercase tracking-tighter rounded-full">
                        <Clock size={8} />
                        Active Now
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium">{currentYear} Session</p>
                </div>

                {term ? (
                   <div className="flex items-center gap-12">
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-300 uppercase">Opening</p>
                          <p className="text-xs font-medium">{formatDate(term.start_date)}</p>
                        </div>
                        <ArrowRight size={14} className="text-gray-200" />
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-300 uppercase">Closing</p>
                          <p className="text-xs font-medium">{formatDate(term.end_date)}</p>
                        </div>
                      </div>
                      
                      <div className="h-8 w-px bg-gray-100 mx-2"></div>
                      
                      {!term.is_current ? (
                        <button 
                          onClick={() => setAsCurrent(term.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-black rounded-lg text-[9px] font-bold uppercase tracking-widest hover:border-black transition-all"
                        >
                          <TrendingUp size={12} />
                          Force Current
                        </button>
                      ) : (
                        <div className="px-4 py-2 bg-black text-white rounded-lg text-[9px] font-bold uppercase tracking-widest">
                          Current Term
                        </div>
                      )}
                   </div>
                ) : (
                  <p className="text-[10px] text-slate-300 font-bold uppercase italic">Not configured</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Term Schedule Setup">
         <div className="py-6 px-2 space-y-8 max-w-sm mx-auto font-inter">
            
            {['Term 1', 'Term 2', 'Term 3'].map(name => (
              <div key={name} className="space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                 <h4 className="text-xs font-bold text-black uppercase tracking-widest border-b border-gray-100 pb-2">{name}</h4>
                 <div className="grid grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Open</label>
                       <input 
                         type="date" 
                         value={termData[name as keyof typeof termData].start_date} 
                         onChange={e => setTermData({...termData, [name]: { ...termData[name as keyof typeof termData], start_date: e.target.value }})} 
                         className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none bg-white font-medium" 
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Close</label>
                       <input 
                         type="date" 
                         value={termData[name as keyof typeof termData].end_date} 
                         onChange={e => setTermData({...termData, [name]: { ...termData[name as keyof typeof termData], end_date: e.target.value }})} 
                         className="w-full px-3 py-2 rounded-lg border border-gray-200 text-xs outline-none bg-white font-medium" 
                       />
                    </div>
                 </div>
              </div>
            ))}

            <div className="flex gap-4 pt-4">
               <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-sm text-slate-400 font-medium">Discard</button>
               <button onClick={handleUpdateCalendar} className="flex-1 py-3 bg-black text-white rounded-lg text-sm font-medium shadow-xl shadow-black/10">Save Configuration</button>
            </div>
         </div>
      </Modal>

    </div>
  );
};
