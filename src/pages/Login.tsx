import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/UI';
import { BookOpen } from 'lucide-react';

export const Login: React.FC = () => {
  const { login, requestPasswordReset } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState(() =>
    localStorage.getItem('session_expired') === '1'
      ? 'Your session expired after inactivity. Please sign in again.'
      : ''
  );

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = login(email, password);
    if (!result.success) {
      setError(result.message || 'Unable to sign in.');
      return;
    }
    localStorage.removeItem('session_expired');
    navigate('/dashboard', { replace: true });
  };

  const handleForgotPassword = () => {
    setError('');
    const result = requestPasswordReset(email);
    setInfo(result.message);
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
              <label className="text-[10px] font-bold uppercase text-zinc-400">Password</label>
              <input
                type="password"
                required
                placeholder="Enter your password"
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-zinc-400 transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-[11px] text-red-500 font-medium">{error}</p>}
            {info && <p className="text-[11px] text-emerald-600 font-medium">{info}</p>}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[10px] text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Forgot password?
              </button>
            </div>

            <Button type="submit" className="w-full py-2.5 text-xs font-bold mt-2">
              Sign In
            </Button>

            <div className="text-[10px] text-zinc-500 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 rounded-lg p-2.5">
              <p className="font-bold mb-1">Demo Accounts</p>
              <p>parent@example.com, student@example.com, teacher@example.com, admin@example.com</p>
              <p className="mt-1">Password: School@123</p>
            </div>
          </form>
        </Card>

        <p className="text-center text-[10px] text-zinc-400">
          By signing in, you agree to our Terms of Service.
        </p>
      </div>
    </div>
  );
};

