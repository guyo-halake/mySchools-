import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAdminAuth } from '../admin/context/AdminAuthContext';
import { useNavigate } from 'react-router-dom';
import { Button, Card } from '../components/UI';
import { BookOpen, PenTool, X, CheckCircle2, Eye, EyeOff, Send } from 'lucide-react';
import { Role } from '../types';
import { cn } from '../utils/utils';
import { supabase } from '../lib/supabase';

import { useBranding } from '../hooks/useBranding';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const { login: adminLogin } = useAdminAuth();
  const navigate = useNavigate();
  const { school, loading: brandingLoading } = useBranding();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotAlert, setShowForgotAlert] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Try Super Admin Login
      try {
        await adminLogin(email, password);
        navigate('/admin/command-center');
        return;
      } catch (adminErr: any) {
        if (!adminErr.message || !adminErr.message.includes('not found')) {
          throw adminErr; // Throw if disabled or wrong password
        }
      }

      // 2. Fallback to Normal School User Login
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Access denied.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordResetRequest = async () => {
    if (!email) {
      setError('Please enter your email or phone first.');
      setShowForgotAlert(false);
      return;
    }

    setResetLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, school:schools(name, email)')
        .eq('email', email)
        .maybeSingle();

      const userName = profile?.full_name || 'Unknown User';
      const userSchool = (profile as any)?.school?.name || (school?.name) || 'P3L System';
      const schoolEmail = (profile as any)?.school?.email || (school?.email);
      const browserInfo = navigator.userAgent;
      const timestamp = new Date().toLocaleString();

      // Call the Local Backend Bridge (Nodemailer)
      try {
        await fetch('http://localhost:5000/api/send-reset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            userName, 
            userSchool, 
            schoolEmail, 
            email, 
            browserInfo, 
            timestamp 
          })
        });
      } catch (e) {
        console.error('Backend Bridge failed, trying fallback...');
        // Fallback or handle error
      }

      setShowForgotAlert(false);
      setShowSuccessAlert(true);
    } catch (err) {
      console.error('Reset request error:', err);
    } finally {
      setResetLoading(false);
    }
  };

  if (brandingLoading) return <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 font-black text-[10px] uppercase tracking-widest text-zinc-400">Authenticating Domain...</div>;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4 relative">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-4">
          {school?.logo_url ? (
            <img 
              src={school.logo_url} 
              alt={school.name} 
              className="w-20 h-20 object-contain mx-auto mb-2 transition-all duration-500" 
            />
          ) : (
            <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 mb-2 shadow-lg">
              <BookOpen size={24} className="absolute -ml-2 translate-y-1 opacity-80" />
              <PenTool size={20} className="absolute ml-4 -translate-y-2" />
            </div>
          )}
          
          <div>
            <h1 className="text-xl font-bold tracking-tight">{school?.name || 'P3L Myschools'}</h1>
            <p className="text-[10px] font-black text-zinc-400 mt-1 uppercase tracking-widest">
              {school ? 'Sign in to your account' : 'Pschools Management System'}
            </p>
          </div>
        </div>

        <Card className="p-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-zinc-400 text-left block">Email or Phone</label>
              <input 
                type="text" 
                required
                placeholder="Email or phone number"
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-zinc-200 dark:focus:border-zinc-600 transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1 relative">
              <div className="flex justify-between items-center pr-1">
                <label className="text-[10px] font-bold uppercase text-zinc-400">Password</label>
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors p-1"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                required
                placeholder="••••••••"
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-lg px-3 py-2 text-xs outline-none focus:border-zinc-200 dark:focus:border-zinc-600 transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-[10px] text-red-500 font-medium">{error}</p>
            )}

            <div className="space-y-3">
              <Button type="submit" className="w-full py-2.5 text-xs font-bold h-10 flex items-center justify-center">
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  'Sign In'
                )}
              </Button>
            </div>
            
            <div className="pt-2 text-center text-[11px] text-zinc-400">
              <button 
                type="button" 
                onClick={() => setShowForgotAlert(true)}
                className="hover:text-zinc-900 dark:hover:text-white transition-colors"
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

      {/* Global Branded Footer */}
      <footer className="absolute bottom-6 left-0 right-0 px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] font-medium text-zinc-400">
        <div className="flex items-center gap-4">
          <a href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-zinc-300" />
            Terms of Service
          </a>
          <a href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1.5">
            <div className="w-1 h-1 rounded-full bg-zinc-300" />
            Privacy Policy
          </a>
        </div>

        <div className="text-center">
          <p className="mb-0.5">
            Developed & maintained by <span className="italic font-serif tracking-tight text-zinc-500 font-bold" style={{ fontFamily: 'cursive' }}>P3L Developers</span>
          </p>
          <p className="tracking-tighter opacity-80 uppercase text-[9px] font-black">
            <span className="text-[#E65100]">©</span> <span className="text-[#E65100]">Matta</span> 2026. All rights reserved.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-2 group">
            User Support
            <div className="w-5 h-5 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center group-hover:bg-zinc-200 transition-all">
              <span className="text-[10px]">?</span>
            </div>
          </button>
        </div>
      </footer>

      {showForgotAlert && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-[320px] p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 border-t-4 border-zinc-900 dark:border-white">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-900 dark:text-zinc-100">
                <Send size={18} />
              </div>
              
              <div>
                <h3 className="text-sm font-bold tracking-tight">Request password reset?</h3>
                <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed text-left">
                  An email with password request will be sent to our support team.
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button 
                  onClick={handlePasswordResetRequest}
                  disabled={resetLoading}
                  className="w-full py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
                >
                  {resetLoading ? 'Sending...' : 'Send Email'}
                </button>
                <button 
                  onClick={() => setShowForgotAlert(false)}
                  className="w-full py-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white text-[10px] font-bold uppercase tracking-widest transition-all"
                >
                  Cancel
                </button>
              </div>

              <div className="pt-4 border-t border-zinc-50 dark:border-zinc-800 text-center">
                <p className="text-[9px] font-medium text-zinc-400">
                  P3L Admin - &copy; Matta.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {showSuccessAlert && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-[320px] p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 border-t-4 border-green-500">
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
                <CheckCircle2 size={18} />
              </div>
              
              <div>
                <h3 className="text-sm font-bold tracking-tight">Email Sent</h3>
                <p className="text-[11px] text-zinc-500 mt-2 leading-relaxed text-left">
                  An email with a link to reset your password will be sent to your email. Please follow instructions.
                </p>
              </div>

              <div className="pt-2">
                <button 
                  onClick={() => setShowSuccessAlert(false)}
                  className="w-full py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:opacity-90 transition-all"
                >
                  Got it
                </button>
              </div>

              <div className="pt-4 border-t border-zinc-50 dark:border-zinc-800">
                <p className="text-[9px] font-medium text-zinc-400 uppercase tracking-tighter">
                  Thank You P3L Admin - &copy; Matta.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
