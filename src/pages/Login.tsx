import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/UI';
import { BookOpen } from 'lucide-react';
import { Role } from '../types';
import { cn } from '../utils/utils';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('PARENT');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login(email || `${role.toLowerCase()}@example.com`, role);
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 mb-2">
            <BookOpen size={20} />
          </div>
          <h1 className="text-lg font-bold tracking-tight">SchoolPortal</h1>
          <p className="text-xs text-zinc-500">Sign in to access your dashboard</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-zinc-400">Email Address</label>
              <input 
                type="email" 
                required
                placeholder="name@school.com"
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-zinc-400 transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-zinc-400">Access Role</label>
              <div className="grid grid-cols-2 gap-2">
                {(['PARENT', 'STUDENT', 'TEACHER', 'ADMIN'] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={cn(
                      "py-2 px-3 rounded-lg text-[10px] font-bold transition-all border",
                      role === r 
                        ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 border-transparent" 
                        : "bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-100 dark:border-zinc-800 hover:border-zinc-300"
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full py-2.5 text-xs font-bold mt-2">
              Sign In
            </Button>
          </form>
        </Card>

        <p className="text-center text-[10px] text-zinc-400">
          By signing in, you agree to our Terms of Service.
        </p>
      </div>
    </div>
  );
};

