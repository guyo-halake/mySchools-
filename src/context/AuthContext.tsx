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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value?: string | null) => Boolean(value && UUID_RE.test(value));
const LAST_SCHOOL_KEY = 'school_portal_last_school_id';

const getLastValidSchoolId = () => {
  const fromStorage = localStorage.getItem(LAST_SCHOOL_KEY);
  return isUuid(fromStorage) ? fromStorage : '';
};

const rememberSchoolId = (schoolId?: string | null) => {
  if (isUuid(schoolId)) {
    localStorage.setItem(LAST_SCHOOL_KEY, String(schoolId));
  }
};

const USERS: Profile[] = [
  { id: 'u1', full_name: 'Otieno Omolo', email: 'parent@example.com', role: 'PARENT', school_id: '' },
  { id: 'u2', full_name: 'Mr. Kibet', email: 'teacher@example.com', role: 'TEACHER', school_id: '' },
  { id: 'u4', full_name: 'Principal Wanjiku', email: 'principal@example.com', role: 'PRINCIPAL', school_id: '' },
  { id: 'u3', full_name: 'School Admin', email: 'admin@example.com', role: 'ADMIN', school_id: '' },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    // 1. Initial Session Check
    const initAuth = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*, class_streams:streams!streams_class_teacher_id_fkey(id)')
          .eq('id', session.user.id)
          .single();
          
        if (profile) {
          rememberSchoolId(profile.school_id);
          setUser({
             ...profile,
             is_class_teacher: (profile as any).class_streams?.length > 0
          });
        }
      } else {
        // Fallback to local storage for persistence if no Supabase session
        const saved = localStorage.getItem('school_portal_user');
        if (saved) {
          const parsed = JSON.parse(saved) as Profile;
          if (isUuid(parsed?.id)) {
            // Re-verify the profile and class teacher status from DB to prevent stale data
            const { data: profile } = await supabase
              .from('profiles')
              .select('*, class_streams:streams!streams_class_teacher_id_fkey(id)')
              .eq('id', parsed.id)
              .maybeSingle();
              
            if (profile) {
              setUser({
                ...profile,
                is_class_teacher: (profile as any).class_streams?.length > 0
              });
            } else {
              setUser(parsed); // Fallback to parsed if DB fetch fails
            }
          }
        }
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
    if (loading) return;
    if (user) {
      localStorage.setItem('school_portal_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('school_portal_user');
    }
  }, [user, loading]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const login = async (identifier: string, password?: string) => {
    console.log('--- Attempting Smart Login ---');
    const cleanId = identifier.trim();
    console.log('Identifier:', cleanId);

    let targetEmail = '';

    // 1. Resolve Identity
    if (cleanId.includes('@')) {
      // Standard Email Login
      targetEmail = cleanId.toLowerCase();
    } else {
      // Admission Number Login (Students)
      console.log('--- RECOGNIZED ADM NO ---');
      console.log('Resolving ADM:', cleanId);
      
      // 1. Find Student record first
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select('id')
        .ilike('adm_no', cleanId)
        .limit(1);

      if (studentError) {
        console.error('Student query error:', studentError);
        throw new Error('System error while looking up student.');
      }

      if (!students || students.length === 0) {
        console.warn('Login Error: ADM NO not found ->', cleanId);
        throw new Error(`The admission number "${cleanId}" was not found.`);
      }

      const student = students[0];

      // 2. Resolve Profile Email from Student ID
      const { data: profiles, error: profileRefError } = await supabase
        .from('profiles')
        .select('email')
        .eq('id', student.id)
        .limit(1);

      if (profileRefError || !profiles || profiles.length === 0) {
        console.error('Profile resolution failed:', profileRefError);
        throw new Error('Student record exists but has no account profile.');
      }
      
      targetEmail = profiles[0].email.toLowerCase();
      console.log('Identity Resolved to:', targetEmail);
    }

    // 2. Check if the profile exists
    const { data: userEntries, error: existError } = await supabase
      .from('profiles')
      .select('email, password')
      .ilike('email', targetEmail)
      .limit(1);

    if (existError) {
      console.error('Database query error:', existError);
      throw new Error('Database connection issue.');
    }

    if (!userEntries || userEntries.length === 0) {
      throw new Error('No account found for this identity.');
    }

    const userExists = userEntries[0];

    // 3. Password Verification
    if (password) {
      if (userExists.password !== password) {
        console.warn('Login Failed: Incorrect password.');
        throw new Error('Incorrect password. Please try again.');
      }
    }

    // 4. Load full profile
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*, class_streams:streams!streams_class_teacher_id_fkey(id)')
      .ilike('email', targetEmail)
      .limit(1);

    if (profiles && profiles.length > 0 && !profileError) {
       const profile = profiles[0];
       console.log('Login Success! Profile:', profile.full_name, 'Role:', profile.role);
       rememberSchoolId(profile.school_id);
       setUser({
          ...profile,
          is_class_teacher: (profile as any).class_streams?.length > 0
       });
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
    if (!found) return;

    // If user is from a real Supabase profile, preserve valid identifiers and only change role persona.
    if (user && isUuid(user.id) && isUuid(user.school_id)) {
      rememberSchoolId(user.school_id);
      setUser({
        ...user,
        role,
        full_name: found.full_name,
        email: found.email
      });
      return;
    }

    // Mock role profile keeps blank school_id to avoid invalid UUID filters hitting PostgREST.
    setUser({ ...found, school_id: getLastValidSchoolId() });
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
