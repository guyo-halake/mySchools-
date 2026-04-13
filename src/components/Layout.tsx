import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
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
  ChevronRight,
  Settings,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../utils/utils';
import { Role } from '../types';

const sidebarLinks: Record<Role, { label: string; icon: any; path: string }[]> = {
  PARENT: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Results', icon: FileText, path: '/results' },
    { label: 'School Fees', icon: CreditCard, path: '/fees' },
    { label: 'Suspensions', icon: AlertTriangle, path: '/suspensions' },
    { label: 'Events', icon: Calendar, path: '/events' },
    { label: 'Announcements', icon: Bell, path: '/announcements' },
  ],
  STUDENT: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Results', icon: FileText, path: '/results' },
    { label: 'Assignments', icon: BookOpen, path: '/assignments' },
    { label: 'Complaints', icon: AlertTriangle, path: '/suspensions' },
    { label: 'Events', icon: Calendar, path: '/events' },
  ],
  TEACHER: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Results and Student mngt', icon: FileText, path: '/results-management' },
    { label: 'Suspensions', icon: AlertTriangle, path: '/suspensions' },
    { label: 'Announcements', icon: Bell, path: '/announcements' },
    { label: 'Chat Parents', icon: MessageSquare, path: '/chat' },
    { label: 'My Timetable', icon: Calendar, path: '/timetable' },
  ],
  ADMIN: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Results and Student mngt', icon: FileText, path: '/results-management' },
    { label: 'Students', icon: Users, path: '/students' },
    { label: 'Teachers', icon: ShieldCheck, path: '/teachers' },
    { label: 'Classes', icon: BookOpen, path: '/classes' },
    { label: 'Fees', icon: CreditCard, path: '/fees' },
    { label: 'Announcements', icon: Bell, path: '/announcements' },
  ],
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, isDarkMode, toggleDarkMode, switchRole } = useAuth();
  const { schoolInfo } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return <>{children}</>;

  const links = sidebarLinks[user.role] || [];

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
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-56 bg-white dark:bg-zinc-900 border-r border-gray-100 dark:border-zinc-800 transition-transform duration-300 lg:relative lg:translate-x-0",
          !isSidebarOpen && "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col">
          <div className="p-5 flex items-center gap-2 border-b border-gray-50 dark:border-zinc-800">
            <div className="w-8 h-8 bg-zinc-900 dark:bg-white rounded flex items-center justify-center text-white dark:text-black font-bold text-sm">
              P3L
            </div>
            <h1 className="font-bold text-sm tracking-tight leading-none">P3L Boys' School</h1>
          </div>

          <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
            {links.map((link) => (
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
                {(['PARENT', 'STUDENT', 'TEACHER', 'ADMIN'] as Role[]).map(role => (
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
        {/* Enhanced Identity Topbar */}
        <header className="bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 z-30 font-sans">
          {/* Row 1: Identity & Tools */}
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
              <button className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded transition-all relative">
                <Bell size={15} />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full border border-white dark:border-zinc-900" />
              </button>
              
              <button 
                onClick={toggleDarkMode}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded transition-all"
              >
                {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              
              <div className="flex items-center gap-3 pl-3 border-l border-zinc-100 dark:border-zinc-800 ml-1">
                <div className="text-right hidden sm:block">
                  <p className="text-[11px] font-semibold leading-none text-zinc-900 dark:text-zinc-100">{user.full_name}</p>
                  <p className="text-[9px] text-zinc-400 mt-0.5 uppercase tracking-widest font-bold">{user.role}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden shrink-0">
                  {getUserInitials(user.full_name)}
                </div>
              </div>
            </div>
          </div>

          {/* Row 2: Navigation Control */}
          <div className="h-10 border-t border-zinc-50 dark:border-zinc-800/50 flex items-center px-6">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center gap-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors lg:hidden"
            >
              <Menu size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Menu</span>
            </button>
            <div className="hidden lg:flex items-center gap-2 text-zinc-400">
               <Menu size={14} className="opacity-50" />
               <span className="text-[9px] font-bold uppercase tracking-[0.2em]">{links.find(l => l.path === location.pathname)?.label || 'Overview'}</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
