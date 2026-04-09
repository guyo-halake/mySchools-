import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/UI';
import { BookOpen, PenTool, X, CheckCircle2 } from 'lucide-react';
import { Role } from '../types';
import { cn } from '../utils/utils';
import { supabase } from '../lib/supabase';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotAlert, setShowForgotAlert] = useState(false);

  // DEBUG CONNECTION CHECK
  useEffect(() => {
    const testConnect = async () => {
      console.log('--- DB CONNECTION DEBUG ---');
      console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
      
      const { data, error } = await supabase.from('profiles').select('email').limit(5);
      if (error) {
        console.error('CRITICAL: Cannot connect to Supabase Profiles Table:', error);
      } else {
        console.log('Connection OK. First 5 emails in DB:', data.map(d => d.email));
        
        // Check for principal specifically
        const { data: p } = await supabase.from('profiles').select('email').ilike('email', 'razakwako45@gmail.com').maybeSingle();
        console.log('Principal Check (razakwako45):', p ? 'FOUND' : 'MISSING');
      }
    };
    testConnect();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4 relative">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 mb-2 shadow-lg">
            <BookOpen size={24} className="absolute -ml-2 translate-y-1 opacity-80" />
            <PenTool size={20} className="absolute ml-4 -translate-y-2" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Pschools Management System</h1>
            <p className="text-xs text-zinc-500 mt-1">Sign in to access your dashboard</p>
          </div>
        </div>

        <Card className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-zinc-400">Email Address</label>
              <input 
                type="email" 
                required
                placeholder="name@school.com"
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-zinc-300 dark:focus:border-zinc-500 transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-zinc-400">Password</label>
              <input 
                type="password" 
                required
                placeholder="••••••••"
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-zinc-300 dark:focus:border-zinc-500 transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-[10px] text-red-500 font-medium">{error}</p>
            )}

            <Button type="submit" className="w-full py-2.5 text-xs font-bold mt-2 h-10 flex items-center justify-center">
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                'Sign In'
              )}
            </Button>
            
            <div className="pt-2 text-center">
              <button 
                type="button" 
                onClick={() => setShowForgotAlert(true)}
                className="text-[11px] text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
              >
                Forgot your password?
              </button>
            </div>
          </form>
        </Card>

        <p className="text-center text-[11px] text-zinc-500">
          Don't have an account?{' '}
          <a href="#" className="font-bold text-zinc-900 dark:text-white hover:underline">
            Sign up
          </a>
        </p>
      </div>

      {/* Beautiful Forgot Password Alert Overlay */}
      {showForgotAlert && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-sm p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setShowForgotAlert(false)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
            
            <div className="flex flex-col items-center text-center space-y-4 mb-6">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Request Received</h3>
                <p className="text-sm text-zinc-500 mt-2 leading-relaxed">
                  If an account exists for that email, a secure password reset link will be sent to your inbox shortly. Please check your spam folder if you don't see it.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 text-left">
              <p className="text-xs font-medium text-zinc-400 italic">
                - p3l developers
              </p>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

