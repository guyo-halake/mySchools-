import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../context/AdminAuthContext';
import { ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';

export const AdminLogin: React.FC = () => {
  const { login } = useAdminAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/admin/command-center');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-8 font-sans">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-600 rounded-xl mb-4 shadow-sm">
            <ShieldCheck size={24} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">Admin Login</h1>
          <p className="text-zinc-500 text-xs font-medium uppercase tracking-widest mt-2">P3L Developers Management</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xl shadow-zinc-200/50 dark:shadow-none">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="admin@matta.africa"
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm px-4 py-3 rounded-xl outline-none focus:border-orange-600 transition-all placeholder:text-zinc-400"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm px-4 py-3 rounded-xl outline-none focus:border-orange-600 transition-all placeholder:text-zinc-400 pr-12"
                />
                <button type="button" onClick={() => setShowPass(p => !p)} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-xl">
                <p className="text-[11px] font-bold text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-orange-600/20 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>
        </div>
        
        <p className="text-center text-[10px] text-zinc-400 font-medium uppercase tracking-widest mt-8">
          Authorized Personnel Only
        </p>
      </div>
    </div>
  );
};
