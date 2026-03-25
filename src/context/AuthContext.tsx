import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, role: Role) => void;
  logout: () => void;
  switchRole: (role: Role) => void;
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

const KENYAN_NAMES_POOL = [
  'James Otieno', 'David Omolo', 'Kevin Wanjala', 'Brian Kamau', 'Peter Mutua',
  'John Musyoka', 'Evans Kipkorir', 'Collins Bett', 'Samuel Njoroge', 'Michael Mwangi'
];

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

  const login = (email: string, role: Role) => {
    const found = USERS.find(u => u.email === email && u.role === role);
    if (found) {
      setUser(found);
    } else {
      // Assign a random Kenyan name for new logins to avoid "John Doe" or email-based names
      const randomName = KENYAN_NAMES_POOL[Math.floor(Math.random() * KENYAN_NAMES_POOL.length)];
      setUser({
        id: 'u' + Date.now(),
        name: randomName,
        email,
        role,
      });
    }
  };

  const logout = () => setUser(null);

  const switchRole = (role: Role) => {
    const found = USERS.find(u => u.role === role);
    if (found) setUser(found);
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
