import React, { useEffect, useRef, useState } from 'react';
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
    { label: 'Input Results', icon: FileText, path: '/input-results' },
    { label: 'Update Fees', icon: CreditCard, path: '/fees-management' },
    { label: 'Suspensions', icon: AlertTriangle, path: '/suspensions' },
    { label: 'Announcements', icon: Bell, path: '/announcements' },
    { label: 'Chat Parents', icon: MessageSquare, path: '/chat' },
  ],
  ADMIN: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Students', icon: Users, path: '/students' },
    { label: 'Teachers', icon: ShieldCheck, path: '/teachers' },
    { label: 'Classes', icon: BookOpen, path: '/classes' },
    { label: 'Fees', icon: CreditCard, path: '/fees' },
    { label: 'Announcements', icon: Bell, path: '/announcements' },
  ],
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, isDarkMode, toggleDarkMode, switchRole } = useAuth();
  const { getNotificationsForUser, markNotificationRead } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [toasts, setToasts] = useState<Array<{ id: string; title: string; message: string; link?: string }>>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const lastToastNotificationRef = useRef<string>('');

  if (!user) return <>{children}</>;

  const links = sidebarLinks[user.role] || [];
  const notifications = getNotificationsForUser(user.id, user.role);
  const unreadCount = notifications.filter(n => !n.readBy.includes(user.id)).length;

  useEffect(() => {
    const unread = notifications.find((notification) => !notification.readBy.includes(user.id));
    if (!unread) return;
    if (lastToastNotificationRef.current === unread.id) return;

    lastToastNotificationRef.current = unread.id;
    setToasts((prev) => [...prev, { id: unread.id, title: unread.title, message: unread.message, link: unread.link }].slice(-3));

    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== unread.id));
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [notifications, user.id]);

  const getUserInitials = (name: string) => {
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
            {user.role === 'ADMIN' ? (
              <div className="bg-gray-50 dark:bg-zinc-800/30 rounded-lg p-2">
                <p className="text-[8px] uppercase tracking-widest font-bold text-zinc-400 mb-1.5 px-1">Switch View</p>
                <div className="grid grid-cols-2 gap-1">
                  {(['PARENT', 'STUDENT', 'TEACHER', 'ADMIN'] as Role[]).map(role => (
                    <button
                      key={role}
                      onClick={() => {
                        const result = switchRole(role);
                        if (result.success) {
                          navigate('/dashboard');
                          setIsSidebarOpen(false);
                        }
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
            ) : (
              <div className="bg-gray-50 dark:bg-zinc-800/30 rounded-lg p-2">
                <p className="text-[8px] uppercase tracking-widest font-bold text-zinc-400 mb-1.5 px-1">Access</p>
                <p className="text-[9px] text-zinc-500 px-1">Role switching is restricted to admin users.</p>
              </div>
            )}
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
        {/* Topbar */}
        <header className="h-14 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-1.5 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg lg:hidden"
            >
              <Menu size={18} />
            </button>
            <h2 className="font-bold text-sm">
              {links.find(l => l.path === location.pathname)?.label || 'Dashboard'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen((prev) => !prev)}
                className="p-1.5 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition-colors relative"
              >
                <Bell size={16} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl shadow-lg p-2 z-50">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 px-2 py-1">Notifications</p>
                  <div className="max-h-80 overflow-y-auto space-y-1">
                    {notifications.length === 0 && (
                      <p className="text-xs text-zinc-500 px-2 py-3">No notifications yet.</p>
                    )}
                    {notifications.map(notification => {
                      const unread = !notification.readBy.includes(user.id);
                      return (
                        <button
                          key={notification.id}
                          onClick={() => {
                            markNotificationRead(notification.id, user.id);
                            setIsNotificationsOpen(false);
                            if (notification.link) {
                              navigate(notification.link);
                            }
                          }}
                          className={cn(
                            "w-full text-left px-2 py-2 rounded-lg transition-colors",
                            unread ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-gray-50 dark:hover:bg-zinc-800"
                          )}
                        >
                          <p className="text-xs font-bold">{notification.title}</p>
                          <p className="text-[10px] text-zinc-500 line-clamp-2">{notification.message}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <button 
              onClick={toggleDarkMode}
              className="p-1.5 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              {isDarkMode ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            
            <div className="flex items-center gap-2.5 pl-4 border-l border-gray-100 dark:border-zinc-800">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold leading-none">{user.name}</p>
                <p className="text-[9px] text-zinc-400 mt-0.5 uppercase tracking-tighter font-bold">{user.role}</p>
              </div>
              <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700">
                {getUserInitials(user.name)}
              </div>
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

      <div className="fixed bottom-4 right-4 z-[120] space-y-2 w-[320px] max-w-[calc(100vw-2rem)]">
        {toasts.map((toast) => (
          <button
            key={toast.id}
            onClick={() => {
              markNotificationRead(toast.id, user.id);
              if (toast.link) {
                navigate(toast.link);
              }
              setToasts((prev) => prev.filter((item) => item.id !== toast.id));
            }}
            className="w-full text-left p-3 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-lg"
          >
            <p className="text-xs font-bold">{toast.title}</p>
            <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">{toast.message}</p>
          </button>
        ))}
      </div>
    </div>
  );
};
