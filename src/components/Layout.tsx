import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { 
  LayoutDashboard, 
  FileText, 
  CreditCard, 
  AlertTriangle, 
  Calendar, 
  Bell, 
  Users, 
  BookOpen, 
  MessageSquare,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Settings,
  ShieldCheck,
  UserCircle2,
  Activity,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { cn, formatDate } from '../utils/utils';
import { Role } from '../types';

const sidebarLinks: Record<Role, { label: string; icon: any; path: string }[]> = {
  PARENT: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Results', icon: FileText, path: '/results' },
    { label: 'School Fees', icon: CreditCard, path: '/fees' },
    { label: 'Disciplinary', icon: AlertTriangle, path: '/suspensions' },
    { label: 'My Class', icon: BookOpen, path: '/my-classroom' },
    { label: 'Announcements', icon: Bell, path: '/announcements' },
    { label: 'My Chats', icon: MessageSquare, path: '/my-chats' },
  ],
  STUDENT: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Results', icon: FileText, path: '/results' },
    { label: 'School Fees', icon: CreditCard, path: '/fees' },
    { label: 'Disciplinary', icon: AlertTriangle, path: '/suspensions' },
    { label: 'Announcements', icon: Bell, path: '/announcements' },
    { label: 'My Class', icon: BookOpen, path: '/my-classroom' },
    { label: 'Assignments', icon: BookOpen, path: '/assignments' },
    { label: 'Profile and settings', icon: UserCircle2, path: '/profile-settings' },
  ],
  TEACHER: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Results and Student mngt', icon: FileText, path: '/results-management' },
    { label: 'Disciplinary', icon: AlertTriangle, path: '/suspensions' },
    { label: 'Announcements', icon: Bell, path: '/announcements' },
    { label: 'My Chats', icon: MessageSquare, path: '/my-chats' },
    { label: 'My Class', icon: BookOpen, path: '/my-classroom' },
    { label: 'Profile and settings', icon: UserCircle2, path: '/profile-settings' },
  ],
  PRINCIPAL: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Results and Student mngt', icon: FileText, path: '/results-management' },
    { label: 'Students', icon: Users, path: '/students' },
    { label: 'Teachers', icon: ShieldCheck, path: '/teachers' },
    { label: 'Classes', icon: BookOpen, path: '/classes' },
    { label: 'Disciplinary', icon: AlertTriangle, path: '/suspensions' },
    { label: 'Announcements', icon: Bell, path: '/announcements' },
    { label: 'My Class', icon: BookOpen, path: '/my-classroom' },
    { label: 'Profile and settings', icon: UserCircle2, path: '/profile-settings' },
  ],
  ADMIN: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Admin OS', icon: Activity, path: '/adminos' },
    { label: 'Results and Student mngt', icon: FileText, path: '/results-management' },
    { label: 'Students', icon: Users, path: '/students' },
    { label: 'Teachers', icon: ShieldCheck, path: '/teachers' },
    { label: 'Classes', icon: BookOpen, path: '/classes' },
    { label: 'Disciplinary', icon: AlertTriangle, path: '/suspensions' },
    { label: 'Fees', icon: CreditCard, path: '/fees' },
    { label: 'Announcements', icon: Bell, path: '/announcements' },
    { label: 'Profile and settings', icon: UserCircle2, path: '/profile-settings' },
  ],
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, isDarkMode, toggleDarkMode, switchRole } = useAuth();
  const { schoolInfo } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id || !user?.school_id) return;
    
    const fetchNotifs = async () => {
      try {
        const data = await api.getNotifications(user.id, user.school_id);
        setNotifications(data || []);
      } catch (err) {
        console.error('Failed to fetch global notifs:', err);
      }
    };
    
    fetchNotifs();

    const channel = supabase
      .channel(`user-notifs-${user.id}`)
      .on(
        'postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'in_app_notifications', 
          filter: `user_id=eq.${user.id}` 
        }, 
        (payload) => {
          if (payload.new && payload.new.school_id === user.school_id) {
            setNotifications(prev => [payload.new, ...prev]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, user?.school_id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setIsNotifOpen(false);
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setIsProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return <>{children}</>;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markRead = async (id: string, link?: string) => {
    await api.markNotificationAsRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    if (link) {
      navigate(link);
      setIsNotifOpen(false);
    }
  };

  const links = sidebarLinks[user.role] || [];
  const linksWithTemplates = [...links];
  const roleName = String(user.role || '').toUpperCase();
  if (['TEACHER', 'ADMIN', 'PRINCIPAL'].includes(roleName)) {
    if (!linksWithTemplates.some((l) => l.path === '/templates')) {
      linksWithTemplates.push({ label: 'Templates', icon: Settings, path: '/templates' });
    }
  }

  const getUserInitials = (name?: string) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex transition-colors duration-200">
      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        id="mobile-sidebar"
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-56 bg-white dark:bg-zinc-900 border-r border-gray-100 dark:border-zinc-800 transition-transform duration-300 lg:relative lg:translate-x-0",
          !isSidebarOpen && "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
          <div className="p-5 flex items-center gap-2 border-b border-gray-50 dark:border-zinc-800">
            {schoolInfo?.logo_url ? (
               <img src={schoolInfo.logo_url} alt="Logo" className="w-8 h-8 object-contain rounded" />
             ) : (
               <div className="w-8 h-8 bg-zinc-900 dark:bg-white rounded flex items-center justify-center text-white dark:text-black font-bold text-sm">
                 {schoolInfo?.name?.[0] || 'S'}
               </div>
             )}
            <h1 className="font-bold text-xs tracking-tight leading-none uppercase max-w-[120px]">
              {schoolInfo?.name || 'School System'}
            </h1>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="ml-auto p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-lg transition-colors lg:hidden"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {linksWithTemplates.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 text-xs font-medium",
                  location.pathname === link.path 
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white" 
                    : "text-zinc-500 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                )}
              >
                <link.icon size={16} className={cn(
                  location.pathname === link.path ? "text-zinc-900 dark:text-white" : "text-zinc-400"
                )} />
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="p-3 border-t border-gray-50 dark:border-zinc-800 space-y-2">
            <div className="bg-gray-50 dark:bg-zinc-800/30 rounded-lg p-2">
              <p className="text-[8px] uppercase tracking-widest font-bold text-zinc-400 mb-1.5 px-1">Switch View</p>
              <div className="grid grid-cols-2 gap-1">
                {(['PARENT', 'STUDENT', 'TEACHER', 'PRINCIPAL', 'ADMIN'] as Role[]).map(role => (
                   <button
                    key={role}
                    onClick={() => {
                      switchRole(role);
                      navigate('/dashboard');
                      setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "text-[8px] py-1 px-1 rounded border transition-all font-bold",
                      user.role === role 
                        ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-black dark:border-white" 
                        : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 text-zinc-400"
                    )}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
            <button 
              onClick={logout}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 z-30 font-sans">
          <div className="h-14 flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              {schoolInfo?.logo_url ? (
                <img src={schoolInfo.logo_url} alt="Logo" className="w-8 h-8 object-contain rounded" />
              ) : (
                <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-100 rounded flex items-center justify-center text-white dark:text-zinc-900 font-bold text-xs shadow-sm">
                  {schoolInfo?.name?.[0] || 'S'}
                </div>
              )}
              <div>
                <h1 className="text-[13px] font-bold tracking-tight text-zinc-900 dark:text-zinc-100 uppercase">
                  {schoolInfo?.name || 'School System'}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative" ref={notifRef}>
                <button 
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded transition-all relative"
                >
                  <Bell size={15} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[12px] h-[12px] px-0.5 bg-rose-600 text-white rounded-full text-[7px] font-black border border-white dark:border-zinc-900">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {isNotifOpen && (
                  <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
                    <div className="p-4 border-b border-zinc-50 dark:border-zinc-800 flex justify-between items-center">
                       <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">System Alerts</h3>
                       <button onClick={() => setNotifications(prev => prev.map(n => ({...n, is_read: true})))} className="text-[9px] font-bold text-zinc-900 dark:text-white">Mark all read</button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                       {notifications.length === 0 ? (
                         <div className="p-10 text-center space-y-2">
                            <Bell size={24} className="mx-auto text-zinc-100" />
                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">No alerts found</p>
                         </div>
                       ) : (
                         notifications.map(n => (
                           <button 
                             key={n.id} 
                             onClick={() => markRead(n.id, n.link)}
                             className={cn(
                               "w-full text-left p-4 border-b border-zinc-50 dark:border-zinc-800 last:border-0 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-all group",
                               !n.is_read && "bg-zinc-50/50 dark:bg-zinc-800/20"
                             )}
                           >
                             <div className="flex justify-between items-start mb-1">
                                <p className="text-[11px] font-bold text-zinc-900 dark:text-white">{n.title}</p>
                                <p className="text-[8px] font-medium text-zinc-400">{formatDate(n.created_at)}</p>
                             </div>
                             <p className="text-[10px] text-zinc-500 leading-relaxed mb-2 line-clamp-2">{n.message}</p>
                             <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-400 group-hover:text-zinc-600 transition-colors">From Principal</span>
                                {n.link && <ExternalLink size={10} className="text-zinc-300" />}
                             </div>
                           </button>
                         ))
                       )}
                    </div>
                  </div>
                )}
              </div>
              
              <button 
                onClick={toggleDarkMode}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded transition-all"
              >
                {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              
              <div className="relative" ref={profileRef}>
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-3 pl-3 border-l border-zinc-100 dark:border-zinc-800 ml-1 group transition-all"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-[11px] font-semibold leading-none text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-500 transition-colors uppercase tracking-tight">{user.full_name}</p>
                    <p className="text-[9px] text-zinc-400 mt-1 uppercase tracking-widest font-black leading-none">{user.role}</p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-black text-zinc-900 dark:text-zinc-100 border border-zinc-100 dark:border-zinc-700 shadow-sm overflow-hidden shrink-0 group-hover:border-emerald-500/50 transition-all active:scale-95">
                    {getUserInitials(user.full_name)}
                  </div>
                </button>

                {isProfileOpen && (
                  <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[100]">
                    <div className="p-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                      <p className="text-[12px] font-black text-zinc-900 dark:text-white uppercase tracking-tight leading-none mb-1.5">{user.full_name}</p>
                      <p className="text-[10px] font-bold text-zinc-400 truncate">{user.email}</p>
                    </div>
                    <div className="p-2">
                       <Link 
                        to="/settings" 
                        onClick={() => setIsProfileOpen(false)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-xl transition-all"
                       >
                         <Settings size={14} className="text-zinc-400" /> Settings & Accounts
                       </Link>
                       <Link 
                        to="/privacy" 
                        onClick={() => setIsProfileOpen(false)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-xl transition-all"
                       >
                         <ShieldCheck size={14} className="text-zinc-400" /> Privacy Policy
                       </Link>
                    </div>
                    <div className="p-2 border-t border-zinc-100 dark:border-zinc-800">
                       <button 
                        onClick={() => { logout(); setIsProfileOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/10 rounded-xl transition-all"
                       >
                         <LogOut size={14} /> Log Out
                       </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="h-10 border-t border-zinc-50 dark:border-zinc-800/50 flex items-center px-6">
            <button 
              onClick={() => setIsSidebarOpen((open) => !open)}
              className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors lg:hidden"
              aria-expanded={isSidebarOpen}
              aria-controls="mobile-sidebar"
            >
              {isSidebarOpen ? <X size={16} /> : <Menu size={16} />}
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {isSidebarOpen ? 'Close' : 'Menu'}
              </span>
            </button>
            <div className="hidden lg:flex items-center gap-2 text-zinc-400">
               <Menu size={14} className="opacity-50" />
               <span className="text-[9px] font-bold uppercase tracking-[0.2em]">{linksWithTemplates.find(l => l.path === location.pathname)?.label || 'Overview'}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden pb-20">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>

        <footer className="fixed bottom-0 left-0 right-0 z-50 py-3 px-6 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl border-t border-zinc-100 dark:border-zinc-900/50 pointer-events-none">
           <div className="max-w-[1400px] mx-auto flex items-center justify-center">
              <p className="text-[9px] font-medium text-zinc-400 tracking-widest uppercase">
                 &copy; <span className="italic">p3ldevelopers</span>, <span className="font-black text-zinc-900 dark:text-white">Matta Africa</span>
              </p>
           </div>
        </footer>
      </div>
    </div>
  );
};
