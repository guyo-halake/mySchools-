import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/adminSupabase';
import { useAdminAlert } from '../context/AdminAlertContext';
import { Search, Shield, UserPlus, RefreshCw, X, ToggleLeft, ToggleRight } from 'lucide-react';

type AdminRole = 'SUPER_ADMIN' | 'TECH_ADMIN' | 'SALES_ADMIN' | 'OPERATIONS_ADMIN';

interface AdminUser {
  id: string;
  full_name: string;
  email: string;
  admin_role: AdminRole;
  department?: string;
  is_active: boolean;
  last_login?: string;
}

const ROLE_BADGE: Record<AdminRole, string> = {
  SUPER_ADMIN:      'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
  TECH_ADMIN:       'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
  SALES_ADMIN:      'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  OPERATIONS_ADMIN: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
};

const AddAdminModal: React.FC<{ onClose: () => void; onSave: () => void }> = ({ onClose, onSave }) => {
  const { showAlert } = useAdminAlert();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', admin_role: 'TECH_ADMIN', department: '' });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.full_name || !form.email || !form.password) return;
    setSaving(true);
    const { error } = await supabase.from('admin_users').insert({ ...form, is_active: true });
    setSaving(false);
    if (error) { showAlert(error.message, 'Error'); return; }
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/20 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2rem] border border-zinc-100 dark:border-zinc-800 shadow-2xl overflow-hidden">
        <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
          <h3 className="text-lg font-bold dark:text-white">New Admin User</h3>
          <button onClick={onClose}><X size={18} className="text-zinc-400" /></button>
        </div>
        <div className="p-8 space-y-4">
          {[
            { key: 'full_name',  label: 'Full Name *',  type: 'text'     },
            { key: 'email',      label: 'Email *',      type: 'email'    },
            { key: 'password',   label: 'Password *',   type: 'password' },
            { key: 'department', label: 'Department',   type: 'text'     },
          ].map(f => (
            <div key={f.key}>
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">{f.label}</p>
              <input
                type={f.type}
                value={(form as any)[f.key]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-orange-600/30"
              />
            </div>
          ))}
          <div>
            <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Role *</p>
            <select
              value={form.admin_role}
              onChange={e => setForm(p => ({ ...p, admin_role: e.target.value }))}
              className="w-full px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl text-sm dark:text-white outline-none"
            >
              {['SUPER_ADMIN', 'TECH_ADMIN', 'SALES_ADMIN', 'OPERATIONS_ADMIN'].map(r => (
                <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="p-8 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-xs font-bold uppercase rounded-xl dark:text-zinc-300">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-3 bg-orange-600 text-white text-xs font-bold uppercase rounded-xl disabled:opacity-50">
            {saving ? 'Creating...' : 'Create Admin'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const UserManagementPage: React.FC = () => {
  const { showAlert } = useAdminAlert();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('admin_users').select('*').order('full_name');
    setAdmins(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleActive = async (user: AdminUser) => {
    await supabase.from('admin_users').update({ is_active: !user.is_active }).eq('id', user.id);
    setAdmins(prev => prev.map(u => u.id === user.id ? { ...u, is_active: !u.is_active } : u));
    showAlert(`${user.full_name} has been ${!user.is_active ? 'activated' : 'deactivated'}.`, 'User Updated');
  };

  const filtered = admins.filter(a =>
    a.full_name.toLowerCase().includes(search.toLowerCase()) ||
    a.email.toLowerCase().includes(search.toLowerCase()) ||
    a.admin_role.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = admins.filter(a => a.is_active).length;

  return (
    <div className="space-y-10 max-w-[1200px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h1 className="text-3xl font-bold dark:text-white tracking-tight">Users</h1>
          <p className="text-xs text-zinc-500 mt-1 uppercase font-bold tracking-widest">
            {loading ? '...' : `${admins.length} admin accounts • ${activeCount} active`}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 text-zinc-400 border border-zinc-100 dark:border-zinc-800 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-5 py-2 bg-orange-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-95 transition-all shadow-lg shadow-orange-600/20"
          >
            <UserPlus size={14} /> Add Admin
          </button>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'Total Admins', value: admins.length },
          { label: 'Active',       value: activeCount   },
          { label: 'Inactive',     value: admins.length - activeCount },
          { label: 'Super Admins', value: admins.filter(a => a.admin_role === 'SUPER_ADMIN').length },
        ].map(s => (
          <div key={s.label}>
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{s.label}</p>
            <p className="text-4xl font-black tabular-nums dark:text-white mt-2">{loading ? '-' : s.value}</p>
            <div className="h-px bg-zinc-100 dark:bg-zinc-800 mt-3" />
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-xl max-w-md">
        <Search size={15} className="text-zinc-400 shrink-0" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email or role..."
          className="bg-transparent text-sm w-full outline-none dark:text-white placeholder:text-zinc-400"
        />
        {search && <button onClick={() => setSearch('')}><X size={13} className="text-zinc-400" /></button>}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-zinc-100 dark:border-zinc-800">
        <table className="w-full text-left">
          <thead className="bg-zinc-50 dark:bg-zinc-900">
            <tr>
              {['Admin', 'Role', 'Department', 'Last Login', 'Status', ''].map(h => (
                <th key={h} className="px-5 py-3 text-[9px] font-black text-zinc-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
            {loading ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-xs text-zinc-400">Loading admins...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-xs text-zinc-400">No admin users found.</td></tr>
            ) : filtered.map(user => (
              <tr key={user.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-[11px] font-black text-white shrink-0">
                      {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-bold dark:text-white">{user.full_name}</p>
                      <p className="text-[11px] text-zinc-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg ${ROLE_BADGE[user.admin_role]}`}>
                    {user.admin_role.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-5 py-4 text-xs text-zinc-500">{user.department || '-'}</td>
                <td className="px-5 py-4 text-xs text-zinc-500">
                  {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                    <span className={`text-[10px] font-bold ${user.is_active ? 'text-emerald-600' : 'text-zinc-400'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </td>
                <td className="px-5 py-4">
                  <button onClick={() => toggleActive(user)} className="transition-all hover:scale-95">
                    {user.is_active
                      ? <ToggleRight size={26} className="text-orange-600" />
                      : <ToggleLeft  size={26} className="text-zinc-300 dark:text-zinc-600" />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && <AddAdminModal onClose={() => setShowAdd(false)} onSave={load} />}
    </div>
  );
};
