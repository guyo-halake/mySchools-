import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/adminSupabase';

export type AdminRole = 'SUPER_ADMIN' | 'TECH_ADMIN' | 'SALES_ADMIN' | 'OPERATIONS_ADMIN';

export interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  admin_role: AdminRole;
  department?: string;
  avatar_url?: string;
  last_login?: string;
  is_active: boolean;
}

interface AdminAuthContextType {
  adminUser: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const ADMIN_STORAGE_KEY = 'matta_admin_user';

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('admin_theme') === 'dark');

  useEffect(() => {
    const saved = localStorage.getItem(ADMIN_STORAGE_KEY);
    if (saved) {
      try {
        setAdminUser(JSON.parse(saved));
      } catch { /* ignore */ }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('admin_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('admin_theme', 'light');
    }
  }, [isDarkMode]);

  const login = async (email: string, password: string) => {
    const clean = email.trim().toLowerCase();
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .ilike('email', clean)
      .maybeSingle();

    if (error) throw new Error('Database error. Check connection.');
    if (!data) throw new Error('No admin account found for this email.');
    if (data.password !== password) throw new Error('Incorrect password.');
    if (!data.is_active) throw new Error('This admin account has been disabled.');

    const user: AdminUser = {
      id: data.id,
      full_name: data.full_name,
      email: data.email,
      admin_role: data.admin_role,
      department: data.department || 'General',
      avatar_url: data.avatar_url,
      last_login: data.last_login,
      is_active: data.is_active,
    };

    // Update last_login
    await supabase.from('admin_users').update({ last_login: new Date().toISOString() }).eq('id', data.id);

    localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(user));
    setAdminUser(user);
  };

  const logout = () => {
    localStorage.removeItem(ADMIN_STORAGE_KEY);
    setAdminUser(null);
  };

  const toggleDarkMode = () => setIsDarkMode(p => !p);

  return (
    <AdminAuthContext.Provider value={{ adminUser, loading, login, logout, isDarkMode, toggleDarkMode }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
};
