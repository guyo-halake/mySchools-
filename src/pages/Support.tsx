import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import { 
  LifeBuoy, 
  Send, 
  AlertCircle, 
  CheckCircle2, 
  MessageSquare,
  Clock,
  ShieldCheck,
  Globe
} from 'lucide-react';
import { Button, Card } from '../components/UI';
import { toast } from 'react-hot-toast';

export const Support: React.FC = () => {
  const { user } = useAuth();
  const { schoolInfo } = useApp();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    message: '',
    type: 'TECHNICAL' as 'TECHNICAL' | 'ACADEMIC' | 'FINANCIAL' | 'OTHER'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.message.trim()) {
      toast.error('Please describe your issue');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('support_requests')
        .insert({
          user_name: user?.full_name,
          user_email: user?.email,
          school_name: schoolInfo?.name,
          school_email: schoolInfo?.email,
          error_message: `[${formData.type}] ${formData.message}`,
          browser_info: navigator.userAgent,
          status: 'PENDING'
        });

      if (error) throw error;
      
      setSubmitted(true);
      toast.success('Support request submitted successfully');
    } catch (err) {
      console.error('Support submission error:', err);
      toast.error('Failed to submit support request');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-20 px-6 text-center space-y-8 animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
          <CheckCircle2 size={48} />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white uppercase">Request Received</h1>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto text-sm font-medium leading-relaxed">
            Our technical operations team has been notified. We will review your request and get back to you via email if necessary.
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setSubmitted(false)}
          className="px-10 py-3 rounded-2xl"
        >
          Send another request
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-10 px-6 space-y-12 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b border-zinc-100 dark:border-zinc-800 pb-10">
        <div className="text-left space-y-2">
          <h1 className="text-4xl font-black tracking-tight text-zinc-900 dark:text-white uppercase">Support Center</h1>
          <p className="text-[11px] font-black text-zinc-400 uppercase tracking-[0.4em]">Direct Technical Assistance & Issue Reporting</p>
        </div>
        <div className="flex items-center gap-4">
           <div className="hidden md:block text-right">
              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Response Time</p>
              <p className="text-xs font-bold dark:text-zinc-200">~ 24 Hours</p>
           </div>
           <div className="w-12 h-12 bg-zinc-950 dark:bg-white rounded-2xl flex items-center justify-center text-white dark:text-black">
              <LifeBuoy size={24} />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7 space-y-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">Select Issue Category</label>
              <div className="grid grid-cols-2 gap-3">
                {(['TECHNICAL', 'ACADEMIC', 'FINANCIAL', 'OTHER'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, type: cat }))}
                    className={cn(
                      "px-6 py-4 rounded-[1.5rem] border text-[10px] font-black uppercase tracking-widest transition-all text-left flex items-center justify-between group",
                      formData.type === cat 
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-black border-transparent shadow-xl" 
                        : "bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-400 hover:border-zinc-300"
                    )}
                  >
                    {cat}
                    <div className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      formData.type === cat ? "bg-white dark:bg-black scale-125" : "bg-zinc-200 group-hover:bg-zinc-400"
                    )} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-2">Detailed Description</label>
              <textarea 
                rows={6}
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Please describe what's happening. Include steps to reproduce if it's a bug."
                className="w-full p-6 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] text-sm outline-none focus:ring-4 focus:ring-zinc-900/5 dark:focus:ring-white/5 transition-all resize-none"
              />
            </div>

            <Button 
              type="submit" 
              loading={loading}
              className="w-full py-6 rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] bg-zinc-950 dark:bg-white text-white dark:text-black shadow-2xl hover:scale-[0.99] transition-all"
            >
              Dispatch Request
            </Button>
          </form>
        </div>

        <div className="lg:col-span-5 space-y-10">
           <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-[3rem] p-10 space-y-8">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-900 dark:text-white">Escalation Policy</h3>
              <div className="space-y-6">
                <PolicyItem 
                  icon={<Clock size={18} />} 
                  title="Priority Queue" 
                  desc="Financial and access issues are prioritized for immediate resolution." 
                />
                <PolicyItem 
                  icon={<ShieldCheck size={18} />} 
                  title="Data Protection" 
                  desc="Support staff cannot see your password. Never share it with anyone." 
                />
                <PolicyItem 
                  icon={<Globe size={18} />} 
                  title="Global Reach" 
                  desc="Our Nairobi engineering hub operates 24/7 for critical system failures." 
                />
              </div>
           </div>

           <div className="px-10 space-y-4">
              <div className="flex items-center gap-4 text-zinc-400">
                <MessageSquare size={16} />
                <p className="text-[10px] font-black uppercase tracking-widest">Alternative Support</p>
              </div>
              <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                For urgent physical documentation or direct school inquiries, please visit the Principal's office during official hours.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

const PolicyItem = ({ icon, title, desc }: { icon: any, title: string, desc: string }) => (
  <div className="flex gap-5 group text-left">
    <div className="shrink-0 p-3 bg-white dark:bg-zinc-800 rounded-2xl shadow-sm group-hover:scale-110 transition-transform duration-500 text-zinc-400">{icon}</div>
    <div className="space-y-1">
      <p className="text-[11px] font-black text-zinc-900 dark:text-white uppercase tracking-tight">{title}</p>
      <p className="text-[10px] text-zinc-500 font-medium leading-relaxed uppercase tracking-tighter opacity-80">{desc}</p>
    </div>
  </div>
);
