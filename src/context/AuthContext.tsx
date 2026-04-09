import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, Role } from '../types';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: Profile | null;
  loading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: Role) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS: Profile[] = [
  { id: 'u1', full_name: 'Otieno Omolo', email: 'parent@example.com', role: 'PARENT', school_id: 's1' },
  { id: 'u2', full_name: 'Mr. Kibet', email: 'teacher@example.com', role: 'TEACHER', school_id: 's1' },
  { id: 'u3', full_name: 'School Admin', email: 'admin@example.com', role: 'ADMIN', school_id: 's1' },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    // 1. Initial Session Check
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
          
        if (profile) setUser(profile);
      } else {
        // Fallback to local storage for MOCK data if no Supabase session
        const saved = localStorage.getItem('school_portal_user');
        if (saved) setUser(JSON.parse(saved));
      }
      setLoading(false);
    };

    initAuth();

    // 2. Listen for Auth Changes - Disabled for custom auth persistence
    /*
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (profile) setUser(profile);
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
    */
  }, []);

  useEffect(() => {
    if (user) {
      localStorage.setItem('school_portal_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('school_portal_user');
    }
  }, [user]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const login = async (email: string, password?: string) => {
    console.log('--- Attempting Login ---');
    console.log('Email:', email);

    // 1. Check if the user exists at all (Case-insensitive email)
    const { data: userExists, error: existError } = await supabase
      .from('profiles')
      .select('email, password')
      .ilike('email', email)
      .maybeSingle();

    if (existError) {
      console.error('Database query error:', existError);
      throw new Error('Database connection issue.');
    }

    if (!userExists) {
      console.warn('Login Failed: User not found with email:', email);
      throw new Error('No account found with this email.');
    }

    // 2. Check password if provided
    if (password) {
      if (userExists.password !== password) {
        console.warn('Login Failed: Incorrect password for:', email);
        throw new Error('Incorrect password. Please try again.');
      }
    }

    // 3. Fetch full profile (Case-insensitive)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .ilike('email', email)
      .single();

    if (profile && !profileError) {
       console.log('Login Success! Profile:', profile.full_name, 'Role:', profile.role);
       setUser(profile);
    } else {
       throw new Error('Failed to load user profile.');
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const switchRole = (role: Role) => {
    const found = USERS.find(u => u.role === (role as any));
    if (found) setUser(found);
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, switchRole, isDarkMode, toggleDarkMode }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
