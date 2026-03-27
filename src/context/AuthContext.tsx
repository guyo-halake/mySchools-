import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => { success: boolean; message?: string };
  logout: () => void;
  switchRole: (role: Role) => { success: boolean; message?: string };
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USERS: User[] = [
  { id: 'u1', name: 'Otieno Omolo', email: 'parent@example.com', role: 'PARENT', studentId: 's1' },
  { id: 'u2', name: 'Otieno Omolo Jr.', email: 'student@example.com', role: 'STUDENT', studentId: 's1' },
  { id: 'u3', name: 'Mr. Kibet', email: 'teacher@example.com', role: 'TEACHER', teacherId: 't1' },
  { id: 'u4', name: 'School Admin', email: 'admin@example.com', role: 'ADMIN' },
];

const DEMO_PASSWORD = 'School@123';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('school_portal_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark'; // Defaults to false (light) if null
  });

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

  const login = (email: string, password: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    const found = USERS.find(u => u.email.toLowerCase() === normalizedEmail);

    if (!found) {
      return { success: false, message: 'Account not found.' };
    }

    if (password !== DEMO_PASSWORD) {
      return { success: false, message: 'Invalid password.' };
    }

    setUser(found);
    return { success: true };
  };

  const logout = () => setUser(null);

  const switchRole = (role: Role) => {
    if (!user || user.role !== 'ADMIN') {
      return { success: false, message: 'Only admins can switch roles.' };
    }

    const found = USERS.find(u => u.role === role);
    if (!found) {
      return { success: false, message: 'Role account not configured.' };
    }

    setUser(found);
    return { success: true };
  };

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  return (
    <AuthContext.Provider value={{ user, login, logout, switchRole, isDarkMode, toggleDarkMode }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
