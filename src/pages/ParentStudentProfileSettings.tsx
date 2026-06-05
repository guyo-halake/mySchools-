import React, { useEffect, useState } from 'react';
import { 
  UserCircle2, 
  Users, 
  CreditCard, 
  LifeBuoy, 
  LogOut, 
  Sun, 
  MoonStar,
  CheckCircle2,
  Phone,
  Mail,
  Lock,
  Bell,
  Smartphone,
  ShieldCheck,
  ChevronRight,
  Monitor,
  Activity,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Button, Badge } from '../components/UI';
import { cn } from '../utils/utils';

export const ParentStudentProfileSettings: React.FC = () => {
  const { user, logout, isDarkMode, toggleDarkMode } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  
  const [notifs, setNotifs] = useState({
    academic: true,
    finance: false,
    discipline: true,
    method: 'PUSH' as 'SMS' | 'EMAIL' | 'PUSH'
  });

  const [billing, setBilling] = useState({
    mpesaNumber: (user as any)?.mpesa_number || '',
    autoBilling: true
  });

  const [sessionInfo, setSessionInfo] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      if (!user?.school_id) return;
      setLoading(true);
      try {
        const [studentsData, { data: { session } }] = await Promise.all([
          api.getStudents(user.school_id),
          supabase.auth.getSession()
        ]);
        
        if (user.role === 'PARENT') {
          setStudents((studentsData || []).filter((row: any) => row.parent_id === user.id));
        } else {
          setStudents((studentsData || []).filter((row: any) => row.id === user.id));
        }
        
        if (session) {
          setSessionInfo({
            browser: navigator.userAgent.split(' ')[0],
            os: navigator.platform,
            lastSeen: new Date().toLocaleTimeString(),
            status: 'Active'
          });
        }
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id, user?.school_id, user?.role]);

  const handleResetPassword = async () => {
    if (!user?.email) return;
    setStatusMessage({ type: 'loading', text: 'Sending reset email...' });
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/login`,
    });
    
    if (error) {
      setStatusMessage({ type: 'error', text: 'Failed to send email.' });
    } else {
      setStatusMessage({ type: 'success', text: 'Password reset link sent to your email!' });
      setTimeout(() => setStatusMessage({ type: '', text: '' }), 5000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 px-6 space-y-20 animate-in fade-in duration-500">
      
      {/* MY PROFILE */}
      <section className="space-y-10">
        <header>
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-white" style={{ fontFamily: 'Sora' }}>My Profile</h2>
          <p className="text-sm text-zinc-500 mt-1">Manage your identity and contact details.</p>
        </header>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-10 py-2">
          <div className="w-28 h-28 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-300 dark:text-zinc-600 border border-zinc-200 dark:border-zinc-700">
            <UserCircle2 size={56} strokeWidth={1} />
          </div>
          <div className="space-y-5 flex-1">
            <h3 className="text-2xl font-bold text-zinc-900 dark:text-white">{user?.full_name}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-12">
              <div className="flex items-center gap-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                <Mail size={16} className="text-zinc-400" />
                {user?.email}
              </div>
              <div className="flex items-center gap-3 text-sm font-medium text-zinc-600 dark:text-zinc-400">
                <Phone size={16} className="text-zinc-400" />
                {user?.phone || 'No phone number'}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MY CHILDREN */}
      <section className="space-y-8">
        <header>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-xs">My Children</h2>
        </header>

        <div className="space-y-4">
          {loading ? (
            <p className="text-sm text-zinc-400">Syncing children records...</p>
          ) : students.length > 0 ? (
            students.map(student => (
              <div key={student.id} className="flex items-center justify-between py-4 border-b border-zinc-100 dark:border-zinc-800 group">
                <div className="flex items-center gap-5">
                  <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
                    <Users size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-tight">{student.profile?.full_name}</p>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">
                      Adm: {student.adm_no} • {student.stream?.class?.name} {student.stream?.name}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-zinc-400">No linked student records found.</p>
          )}
        </div>
      </section>

      {/* SETTINGS */}
      <section className="space-y-8">
        <header>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-xs">Settings</h2>
        </header>

        <div className="space-y-12">
          {/* Appearance */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-bold text-zinc-900 dark:text-white">Appearance</p>
              <p className="text-xs text-zinc-500">Enable or disable dark interface mode.</p>
            </div>
            <button 
              onClick={toggleDarkMode}
              className={cn(
                "w-12 h-6 rounded-full relative transition-colors duration-300",
                isDarkMode ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800"
              )}
            >
              <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300", isDarkMode ? "left-7" : "left-1")} />
            </button>
          </div>

          {/* Notifications */}
          <div className="space-y-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Alert Preferences</p>
            <div className="space-y-4">
              <ToggleRow 
                label="Academic Reports" 
                desc="Notify me immediately when a result is approved." 
                active={notifs.academic} 
                onClick={() => setNotifs({...notifs, academic: !notifs.academic})} 
              />
              <ToggleRow 
                label="Financial Balances" 
                desc="Notify me only for balances above KES 5,000." 
                active={notifs.finance} 
                onClick={() => setNotifs({...notifs, finance: !notifs.finance})} 
              />
              <ToggleRow 
                label="Digital Diary & Behavior" 
                desc="Urgent notification for any behavioral incident or positive reinforcement." 
                active={notifs.discipline} 
                onClick={() => setNotifs({...notifs, discipline: !notifs.discipline})} 
              />
            </div>
          </div>
        </div>
      </section>

      {/* PAYMENTS */}
      <section className="space-y-8">
        <header>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-xs">Payments</h2>
        </header>

        <div className="space-y-8">
          <div className="max-w-md space-y-4">
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">M-Pesa Quick-Link Number</p>
              <p className="text-xs text-zinc-500 mt-1">This number will receive fee payment prompts via STK Push.</p>
            </div>
            <input 
              type="text" 
              placeholder="07XX XXX XXX" 
              className="w-full h-12 px-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-transparent text-sm font-bold outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-white"
              value={billing.mpesaNumber}
              onChange={e => setBilling({...billing, mpesaNumber: e.target.value})}
            />
          </div>

          <div className="flex items-center justify-between max-w-md">
            <div>
              <p className="text-sm font-bold text-zinc-900 dark:text-white">Auto-Billing Reminders</p>
              <p className="text-xs text-zinc-500">Remind me 3 days before fee deadlines.</p>
            </div>
            <button 
              onClick={() => setBilling({...billing, autoBilling: !billing.autoBilling})}
              className={cn("w-12 h-6 rounded-full relative transition-colors duration-300", billing.autoBilling ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800")}
            >
              <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300", billing.autoBilling ? "left-7" : "left-1")} />
            </button>
          </div>
        </div>
      </section>

      {/* SECURITY */}
      <section className="space-y-8">
        <header>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-xs">Security</h2>
        </header>

        <div className="space-y-10">
          <div className="space-y-4">
            <button 
              onClick={handleResetPassword}
              className="w-full text-left flex items-center justify-between py-4 border-b border-zinc-100 dark:border-zinc-800 group"
            >
              <div className="flex items-center gap-4">
                <Lock size={18} className="text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
                <span className="text-sm font-bold text-zinc-900 dark:text-white">Change Password</span>
              </div>
              <p className="text-[10px] font-bold text-zinc-400 uppercase group-hover:text-zinc-600 transition-colors">Send Reset Email</p>
            </button>
            
            <button className="w-full text-left flex items-center justify-between py-4 border-b border-zinc-100 dark:border-zinc-800 group">
              <div className="flex items-center gap-4">
                <ShieldCheck size={18} className="text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
                <span className="text-sm font-bold text-zinc-900 dark:text-white">Enable 2FA Verification</span>
              </div>
              <p className="text-[10px] font-bold text-emerald-500 uppercase">Recommended</p>
            </button>
          </div>

          {/* Active Session Info */}
          <div className="space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Current Active Session</p>
            {sessionInfo && (
              <div className="flex items-center gap-5 p-5 rounded-2xl border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30">
                <Monitor size={24} className="text-zinc-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-900 dark:text-white">{sessionInfo.browser} on {sessionInfo.os}</p>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase mt-1">Status: {sessionInfo.status} • Active at {sessionInfo.lastSeen}</p>
                </div>
                <Badge variant="outline" className="text-emerald-500 border-emerald-500/20">Current</Badge>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* SUPPORT & HELP */}
      <section className="space-y-8">
        <header>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white uppercase tracking-wider text-xs">Support & Help</h2>
        </header>

        <div className="space-y-8">
          <p className="text-sm text-zinc-500 leading-relaxed font-medium">
            For inquiries, problems, or issues, please reach out to our development team.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Email Correspondence</p>
              <div className="space-y-3">
                <a href="mailto:p3lcodes@gmail.com" className="flex items-center gap-3 text-sm font-bold text-zinc-900 dark:text-white hover:text-emerald-500 transition-colors">
                  <Mail size={16} className="text-zinc-400" /> p3lcodes@gmail.com
                </a>
                <a href="mailto:p3ldevelopers.matta@gmail.com" className="flex items-center gap-3 text-sm font-bold text-zinc-900 dark:text-white hover:text-emerald-500 transition-colors">
                  <Mail size={16} className="text-zinc-400" /> p3ldevelopers.matta@gmail.com
                </a>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Direct Telephone</p>
              <div className="space-y-3">
                <a href="tel:+254740690525" className="flex items-center gap-3 text-sm font-bold text-zinc-900 dark:text-white hover:text-emerald-500 transition-colors">
                  <Phone size={16} className="text-zinc-400" /> +254 740 690 525
                </a>
                <a href="tel:+2541115354895" className="flex items-center gap-3 text-sm font-bold text-zinc-900 dark:text-white hover:text-emerald-500 transition-colors">
                  <Phone size={16} className="text-zinc-400" /> +254 111 535 4895
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="pt-12 border-t border-zinc-100 dark:border-zinc-800 text-center">
        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
           Developed and maintained by P3L Developers
        </p>
      </footer>

      {/* Toast-style Feedback */}
      {statusMessage.text && (
        <div className={cn(
          "fixed bottom-10 right-10 z-[100] px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right-full duration-500 flex items-center gap-3 border font-bold text-xs",
          statusMessage.type === 'success' ? "bg-emerald-600 text-white border-emerald-500" : 
          statusMessage.type === 'error' ? "bg-rose-600 text-white border-rose-500" : 
          "bg-zinc-900 text-white border-zinc-800"
        )}>
          {statusMessage.type === 'loading' && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {statusMessage.text}
        </div>
      )}

    </div>
  );
};

// --- MINIMAL COMPONENTS ---

const ToggleRow = ({ label, desc, active, onClick }: any) => (
  <div className="flex items-center justify-between group">
    <div className="flex items-center gap-4">
      <div className={cn("w-1.5 h-1.5 rounded-full transition-colors", active ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800")} />
      <div>
        <p className="text-sm font-bold text-zinc-900 dark:text-white">{label}</p>
        <p className="text-[11px] text-zinc-500 font-medium">{desc}</p>
      </div>
    </div>
    <button 
      onClick={onClick}
      className={cn("w-12 h-6 rounded-full relative transition-colors duration-300", active ? "bg-emerald-500" : "bg-zinc-200 dark:bg-zinc-800")}
    >
      <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300", active ? "left-7" : "left-1")} />
    </button>
  </div>
);
