import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAdminAuth, AdminRole } from '../context/AdminAuthContext';
import { useAdminAlert } from '../context/AdminAlertContext';
import { supabase } from '../lib/adminSupabase';
import {
  LayoutDashboard, Building2, DollarSign, Settings, LogOut, Sun, Moon,
  ShieldCheck, Users, BarChart3, Bell, User, Shield, Settings2,
  HardDrive, Github, Globe, ChevronUp, ChevronDown, Package,
  Search, Plus, Menu, ChevronLeft, Database, X, LifeBuoy, Zap
} from 'lucide-react';

interface NavItem {
  label: string;
  icon: any;
  path: string;
  roles: AdminRole[];
  depts: string[];
  badge?: number;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Command Center', icon: LayoutDashboard, path: '/admin/command-center', roles: ['SUPER_ADMIN', 'TECH_ADMIN', 'OPERATIONS_ADMIN', 'SALES_ADMIN'], depts: ['Any'] },
  { label: 'Schools',        icon: Building2,       path: '/admin/schools',         roles: ['SUPER_ADMIN', 'SALES_ADMIN', 'OPERATIONS_ADMIN'],          depts: ['Any'] },
  { label: 'Sales',          icon: DollarSign,      path: '/admin/sales',            roles: ['SUPER_ADMIN', 'SALES_ADMIN'],                               depts: ['Sales & Clients'] },
  { label: 'Tech Ops',       icon: ShieldCheck,     path: '/admin/tech-ops',         roles: ['SUPER_ADMIN', 'TECH_ADMIN'],                                depts: ['Engineering & Tech'] },
  { label: 'P3L Developers',  icon: Zap,             path: '/admin/p3l-developers',   roles: ['SUPER_ADMIN', 'TECH_ADMIN'],                                depts: ['Engineering & Tech'] },
  { label: 'Data Engine',    icon: Database,        path: '/admin/data-engine',      roles: ['SUPER_ADMIN', 'TECH_ADMIN'],                                depts: ['Engineering & Tech'] },
  { label: 'Users & Support', icon: Users,           path: '/admin/users',            roles: ['SUPER_ADMIN', 'TECH_ADMIN', 'SALES_ADMIN'],                 depts: ['Any'] },
  // { label: 'Analytics',      icon: BarChart3,       path: '/admin/analytics',        roles: ['SUPER_ADMIN', 'SALES_ADMIN'],                               depts: ['Sales & Clients'] },
  // { label: 'Notifications',  icon: Bell,            path: '/admin/notifications',    roles: ['SUPER_ADMIN', 'OPERATIONS_ADMIN', 'TECH_ADMIN', 'SALES_ADMIN'], depts: ['Any'] },
  { label: 'Settings',       icon: Settings,        path: '/admin/settings',         roles: ['SUPER_ADMIN', 'TECH_ADMIN'],                                depts: ['Engineering & Tech'] },
];

const PROJECTS = [
  { name: 'School Central OS', source: 'Github', status: 'Live',    repo: 'p3l-dev/school-os' },
  { name: 'InnerCircle Fin',   source: 'Vercel',  status: 'Live',    repo: 'p3l-dev/inner-circle' },
  { name: 'Portfolio 2024',    source: 'Vercel',  status: 'Staging', repo: 'p3l-dev/portfolio' },
];

const ROLE_COLORS: Record<AdminRole, string> = {
  SUPER_ADMIN:      'bg-orange-600',
  TECH_ADMIN:       'bg-zinc-800',
  SALES_ADMIN:      'bg-emerald-600',
  OPERATIONS_ADMIN: 'bg-amber-600',
};

export const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { adminUser, logout, isDarkMode, toggleDarkMode } = useAdminAuth();
  const { showAlert } = useAdminAlert();
  const location = useLocation();
  const navigate = useNavigate();

  const [collapsed, setCollapsed]                     = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen]     = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown]     = useState(false);
  const [showProjectSwitcher, setShowProjectSwitcher] = useState(false);
  const [showAddDropdown, setShowAddDropdown]         = useState(false);
  const [notifications, setNotifications]             = useState<any[]>([]);
  const [notiLoading, setNotiLoading]                 = useState(false);
  const [search, setSearch]                           = useState('');
  const [searchResults, setSearchResults]             = useState<any[]>([]);
  const [searchLoading, setSearchLoading]             = useState(false);

  const profileRef  = useRef<HTMLDivElement>(null);
  const notiRef     = useRef<HTMLDivElement>(null);
  const projectRef  = useRef<HTMLDivElement>(null);
  const addRef      = useRef<HTMLDivElement>(null);
  const searchRef   = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfileDropdown(false);
      if (notiRef.current && !notiRef.current.contains(e.target as Node)) setShowNotifDropdown(false);
      if (projectRef.current && !projectRef.current.contains(e.target as Node)) setShowProjectSwitcher(false);
      if (addRef.current && !addRef.current.contains(e.target as Node)) setShowAddDropdown(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchResults([]);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch notifications when dropdown opens
  useEffect(() => {
    if (!showNotifDropdown) return;
    setNotiLoading(true);
    supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => { setNotifications(data || []); setNotiLoading(false); });
  }, [showNotifDropdown]);

  // Real-time global search
  useEffect(() => {
    if (!search.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      const [{ data: schools }, { data: users }] = await Promise.all([
        supabase.from('schools').select('id, name, status').ilike('name', `%${search}%`).limit(4),
        supabase.from('profiles').select('id, full_name, email, role').ilike('full_name', `%${search}%`).limit(4),
      ]);
      const results = [
        ...(schools || []).map(s => ({ type: 'School', label: s.name, sub: s.status, id: s.id })),
        ...(users  || []).map(u => ({ type: 'User',   label: u.full_name, sub: u.role, id: u.id })),
      ];
      setSearchResults(results);
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const visibleLinks = NAV_ITEMS.filter(item => {
    if (!adminUser) return false;
    if (adminUser.admin_role === 'SUPER_ADMIN') return true;
    const roleMatch = item.roles.includes(adminUser.admin_role);
    const deptMatch = item.depts.includes('Any') || item.depts.includes(adminUser.department || '');
    return roleMatch && deptMatch;
  });

  const handleLogout = () => { logout(); navigate('/admin/login'); };
  const initials = adminUser?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'A';

  const sidebarW = collapsed ? 'w-[72px]' : 'w-64';

  return (
    <div className={`min-h-screen flex font-sans ${isDarkMode ? 'dark bg-zinc-950 text-zinc-100' : 'bg-zinc-50 text-zinc-900'}`}>

      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* ─── LEFT SIDEBAR ─────────────────────────────────────── */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col
        bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800
        transition-all duration-300
        ${sidebarW}
        lg:relative lg:translate-x-0
        ${mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>

        {/* Brand + collapse toggle */}
        <div className="h-16 flex items-center px-4 border-b border-zinc-100 dark:border-zinc-800 shrink-0 gap-3">
          <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center shrink-0">
            <Shield size={16} className="text-white" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold dark:text-white leading-none truncate">P3L Developers</p>
              <p className="text-[9px] text-zinc-400 uppercase tracking-widest mt-0.5">Admin OS</p>
            </div>
          )}
          {/* Collapse toggle (desktop only) */}
          <button
            onClick={() => setCollapsed(p => !p)}
            className="hidden lg:flex p-1.5 text-zinc-400 hover:text-orange-600 transition-colors rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 ml-auto"
          >
            <ChevronLeft size={16} className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} />
          </button>
          {/* Mobile close */}
          <button onClick={() => setMobileSidebarOpen(false)} className="lg:hidden ml-auto text-zinc-400"><X size={18} /></button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
          {visibleLinks.map(item => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileSidebarOpen(false)}
                title={collapsed ? item.label : undefined}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                  ${collapsed ? 'justify-center' : ''}
                  ${isActive
                    ? 'bg-orange-50 dark:bg-orange-900/10 text-orange-600'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800'}
                `}
              >
                <item.icon size={18} className={isActive ? 'text-orange-600 shrink-0' : 'shrink-0'} />
                {!collapsed && <span className="truncate">{item.label}</span>}
                {!collapsed && isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-orange-600 shrink-0" />}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div className={`p-3 border-t border-zinc-100 dark:border-zinc-800 shrink-0 space-y-1 ${collapsed ? 'flex flex-col items-center' : ''}`}>
          {/* Switch Project */}
          {!collapsed && (
            <div className="relative" ref={projectRef}>
              <button
                onClick={() => setShowProjectSwitcher(!showProjectSwitcher)}
                className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all"
              >
                <div className="flex items-center gap-2"><HardDrive size={14} /> Switch Project</div>
                {showProjectSwitcher ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
              </button>
              {showProjectSwitcher && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl shadow-xl py-2 z-50 overflow-hidden">
                  <p className="px-4 py-2 text-[9px] font-black text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-700 mb-1">Repositories</p>
                  {PROJECTS.map(p => (
                    <button key={p.name} onClick={() => { showAlert(`Switching context to ${p.name}`, 'Project Switch'); setShowProjectSwitcher(false); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-[11px] font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-all text-left"
                    >
                      {p.source === 'Github' ? <Github size={13} className="text-zinc-400 shrink-0" /> : <Globe size={13} className="text-blue-400 shrink-0" />}
                      <span className="flex-1 truncate">{p.name}</span>
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.status === 'Live' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleLogout}
            title={collapsed ? 'Sign out' : undefined}
            className={`flex items-center gap-2 px-3 py-2.5 text-[11px] font-bold text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all ${collapsed ? 'justify-center w-full' : 'w-full'}`}
          >
            <LogOut size={16} />
            {!collapsed && 'Sign out'}
          </button>
        </div>
      </aside>

      {/* ─── MAIN COLUMN ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* ─── TOP BAR ──────────────────────────────────────────── */}
        <header className="h-16 bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 flex items-center px-6 gap-4 sticky top-0 z-30 shrink-0">

          {/* Mobile hamburger */}
          <button onClick={() => setMobileSidebarOpen(true)} className="lg:hidden text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
            <Menu size={20} />
          </button>

          {/* LEFT: Global Search */}
          <div className="relative flex-1 max-w-md" ref={searchRef}>
            <div className="flex items-center gap-3 px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl">
              <Search size={15} className="text-zinc-400 shrink-0" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search schools, users, leads..."
                className="bg-transparent text-sm w-full outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
              />
              {search && (
                <button onClick={() => { setSearch(''); setSearchResults([]); }} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Search dropdown */}
            {(searchResults.length > 0 || (search && searchLoading)) && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-2xl py-2 z-50 overflow-hidden">
                {searchLoading ? (
                  <p className="px-5 py-4 text-[11px] text-zinc-400 font-bold uppercase tracking-widest">Searching...</p>
                ) : searchResults.map((r, i) => (
                  <div key={i} className="px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer flex items-center gap-3">
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 w-12 shrink-0">{r.type}</span>
                    <div>
                      <p className="text-xs font-bold dark:text-white">{r.label}</p>
                      <p className="text-[10px] text-zinc-400">{r.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* CENTER: empty (flex pushes both sides) */}
          <div className="flex-1" />

          {/* RIGHT: Actions */}
          <div className="flex items-center gap-3">

            {/* Theme */}
            <button onClick={toggleDarkMode} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all">
              {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Notification Bell */}
            <div className="relative" ref={notiRef}>
              <button
                onClick={() => setShowNotifDropdown(p => !p)}
                className={`p-2 rounded-lg transition-all relative ${showNotifDropdown ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
              >
                <Bell size={17} />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-orange-500" />
              </button>
              {showNotifDropdown && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-2xl py-1 z-50">
                  <div className="px-5 py-3 border-b border-zinc-50 dark:border-zinc-800 flex justify-between items-center">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Notifications</p>
                    <Link to="/admin/notifications" onClick={() => setShowNotifDropdown(false)} className="text-[10px] font-bold text-orange-600 hover:underline uppercase">View All</Link>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {notiLoading ? (
                      <p className="p-5 text-[10px] text-zinc-400 text-center uppercase font-bold">Loading...</p>
                    ) : notifications.length === 0 ? (
                      <p className="p-5 text-[10px] text-zinc-400 text-center uppercase font-bold">Nothing here</p>
                    ) : notifications.map(n => (
                      <div key={n.id} className="px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 border-b border-zinc-50 dark:border-zinc-800 last:border-0 cursor-pointer">
                        <p className="text-xs font-bold dark:text-zinc-100 leading-tight">{n.title}</p>
                        <p className="text-[10px] text-zinc-500 mt-1 line-clamp-2">{n.content}</p>
                        <p className="text-[9px] text-zinc-400 mt-2 uppercase font-black tracking-widest">{new Date(n.created_at).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick Add */}
            <div className="relative" ref={addRef}>
              <button
                onClick={() => setShowAddDropdown(p => !p)}
                className={`p-2 rounded-lg transition-all ${showAddDropdown ? 'bg-orange-600 text-white' : 'text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100'}`}
              >
                <Plus size={17} />
              </button>
              {showAddDropdown && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-2xl py-2 z-50">
                  <p className="px-5 py-2 text-[9px] font-black uppercase tracking-widest text-zinc-400 border-b border-zinc-50 dark:border-zinc-800 mb-1">Quick Add</p>
                  {[
                    { label: 'New School',    path: '/admin/schools' },
                    { label: 'New Client',    path: '/admin/sales' },
                    { label: 'New Admin User', path: '/admin/users' },
                    { label: 'Bulk Import',   path: '/admin/data-engine' },
                  ].map(a => (
                    <Link key={a.label} to={a.path} onClick={() => setShowAddDropdown(false)}
                      className="block px-5 py-2.5 text-xs font-bold text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-orange-600 transition-all"
                    >
                      {a.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div className="h-5 w-px bg-zinc-100 dark:bg-zinc-800" />

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setShowProfileDropdown(p => !p)}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 transition-all outline-none ring-2 ring-offset-2 dark:ring-offset-zinc-950 ${ROLE_COLORS[adminUser?.admin_role || 'SUPER_ADMIN']} ${showProfileDropdown ? 'ring-orange-600' : 'ring-transparent'}`}
              >
                {initials}
              </button>
              {showProfileDropdown && (
                <div className="absolute right-0 top-full mt-2 w-60 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl shadow-2xl py-2 z-50">
                  <div className="px-5 py-4 border-b border-zinc-50 dark:border-zinc-800 space-y-1">
                    <p className="text-sm font-bold dark:text-white truncate">{adminUser?.full_name}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{adminUser?.email}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="text-[9px] font-black uppercase bg-orange-50 dark:bg-orange-900/20 text-orange-600 px-2 py-0.5 rounded-lg">{adminUser?.admin_role?.replace('_', ' ')}</span>
                      <span className="text-[9px] font-black uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-lg">{adminUser?.department}</span>
                    </div>
                  </div>
                  <div className="px-2 py-2">
                    <Link to="/admin/settings" onClick={() => setShowProfileDropdown(false)}
                      className="flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-all"
                    >
                      <Settings2 size={14} /> Profile Settings
                    </Link>
                    <button onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-all"
                    >
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ─── PAGE CONTENT ─────────────────────────────────────── */}
        <main className="flex-1 p-6 md:p-10 bg-zinc-50 dark:bg-zinc-950 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
