import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { useToast } from '../components/Toast';
import { 
  Save, 
  RefreshCw,
  Building,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Settings,
  ChevronLeft
} from 'lucide-react';

export const SchoolSettings: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [school, setSchool] = useState<any>({});
  
  // Grading state (keeping existing functionality)
  const [scales, setScales] = useState<any[]>([]);

  const fetchData = async () => {
    if (!user?.school_id) return;
    setLoading(true);
    try {
      const [schoolData, scalesData] = await Promise.all([
        api.getSchoolSettings(user.school_id),
        api.getGradingSystem(user.school_id)
      ]);
      setSchool(schoolData || {});
      setScales(scalesData || []);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.school_id]);

  const handleSaveSettings = async () => {
    if (!user?.school_id) return;
    setSaving(true);
    try {
      // Update School Details
      await api.updateSchoolSettings(user.school_id, {
        name: school.name,
        type: school.type,
        paybill_no: school.paybill_no,
        email: school.email,
        phone: school.phone,
        address: school.address
      });
      showToast('School settings updated', 'success');
    } catch (err) {
      showToast('Failed to update settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <RefreshCw className="animate-spin text-zinc-300" size={24} />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 font-inter space-y-12 animate-in fade-in">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-black pb-4">
         <div>
            <button 
               onClick={() => window.history.back()}
               className="flex items-center gap-2 text-zinc-400 hover:text-black transition-colors text-[10px] font-black uppercase tracking-widest mb-4"
            >
               <ChevronLeft size={14} /> Back
            </button>
            <h1 className="text-3xl font-normal tracking-tight text-black" style={{ fontFamily: 'Sora' }}>
               Command Center
            </h1>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-2">
               Global System Configuration
            </p>
         </div>
         <button 
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors disabled:opacity-50"
         >
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            Commit Changes
         </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
         {/* Identity & Contact */}
         <div className="space-y-6">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100 pb-2">Institutional Identity</h2>
            
            <div className="space-y-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-2"><Building size={12}/> Registered Name</label>
                  <input 
                     type="text" 
                     value={school.name || ''} 
                     onChange={e => setSchool({...school, name: e.target.value})}
                     className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-sm font-bold text-black focus:outline-none focus:border-black transition-colors"
                  />
               </div>
               
               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-2"><Settings size={12}/> Admissions Logic (Type)</label>
                  <select 
                     value={school.type || 'PUBLIC'} 
                     onChange={e => setSchool({...school, type: e.target.value})}
                     className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-sm font-bold text-black focus:outline-none focus:border-black transition-colors"
                  >
                     <option value="PUBLIC">Public / Capitation</option>
                     <option value="PRIVATE">Private / Independent</option>
                  </select>
               </div>
            </div>

            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100 pb-2 pt-4">Contact & Location</h2>
            
            <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-2"><Phone size={12}/> Primary Phone</label>
                     <input 
                        type="tel" 
                        value={school.phone || ''} 
                        onChange={e => setSchool({...school, phone: e.target.value})}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-sm font-bold text-black focus:outline-none focus:border-black transition-colors"
                     />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-2"><Mail size={12}/> Official Email</label>
                     <input 
                        type="email" 
                        value={school.email || ''} 
                        onChange={e => setSchool({...school, email: e.target.value})}
                        className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-sm font-bold text-black focus:outline-none focus:border-black transition-colors"
                     />
                  </div>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-2"><MapPin size={12}/> Physical Address</label>
                  <input 
                     type="text" 
                     value={school.address || ''} 
                     onChange={e => setSchool({...school, address: e.target.value})}
                     className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-sm font-bold text-black focus:outline-none focus:border-black transition-colors"
                  />
               </div>
            </div>
         </div>

         {/* Financials & Advanced */}
         <div className="space-y-6">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-100 pb-2">Financial Integration</h2>
            
            <div className="space-y-4">
               <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase text-zinc-500 flex items-center gap-2"><CreditCard size={12}/> Primary Paybill Number</label>
                  <input 
                     type="text" 
                     value={school.paybill_no || ''} 
                     onChange={e => setSchool({...school, paybill_no: e.target.value})}
                     placeholder="e.g. 222111"
                     className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 text-xl tracking-[0.2em] font-normal text-black focus:outline-none focus:border-black transition-colors"
                     style={{ fontFamily: 'Sora' }}
                  />
                  <p className="text-[9px] font-medium text-zinc-400 mt-1">This number is automatically pushed to the Parent/Student Billing Portal.</p>
               </div>
            </div>

            <div className="p-6 mt-8 border border-zinc-200 bg-white">
               <h3 className="text-xs font-black uppercase tracking-widest text-black mb-2">Grading Matrix Status</h3>
               <p className="text-[10px] text-zinc-500 mb-4 font-bold">The system currently has <span className="text-black">{scales.length}</span> active grading bands configured for institutional averages.</p>
               <button className="text-[10px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-800 transition-colors">
                  Contact Support to modify Matrix →
               </button>
            </div>

         </div>
      </div>

    </div>
  );
};
