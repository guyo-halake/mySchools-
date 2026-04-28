import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/adminSupabase';
import { useAdminAlert } from '../context/AdminAlertContext';
import { 
  Users as UsersIcon, 
  LifeBuoy, 
  Mail, 
  Search, 
  Filter, 
  MoreVertical, 
  Trash2, 
  Key, 
  Shield, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  X,
  Plus,
  Send,
  User,
  Building,
  Phone,
  LayoutGrid,
  History,
  ShieldAlert,
  ArrowRight,
  Edit2,
  Lock,
  Inbox,
  ArrowUpRight,
  UserCheck
} from 'lucide-react';

interface AppUser {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  school_id: string;
  is_active: boolean;
  created_at: string;
  schools?: { name: string };
}

interface AuditLog {
  id: string;
  user_name: string;
  action: string;
  timestamp: string;
  details: string;
}

interface PasswordRequest {
  id: string;
  user_name: string;
  user_email: string;
  timestamp: string;
  status: 'PENDING' | 'COMPLETED';
}

export const UsersSupportPage: React.FC = () => {
  const { showAlert } = useAdminAlert();
  const [activeTab, setActiveTab] = useState<'Users' | 'Support' | 'Mailing'>('Users');
  
  const [users, setUsers] = useState<AppUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [pwdRequests, setPwdRequests] = useState<PasswordRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [changingPwd, setChangingPwd] = useState<AppUser | null>(null);

  // Mailing State
  const [mailForm, setMailForm] = useState({ to: '', subject: '', message: '' });
  const [sendingMail, setSendingMail] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    
    // Fetch Profiles with Schools
    const { data: userData } = await supabase
      .from('profiles')
      .select('*, schools(name)')
      .order('full_name', { ascending: true });

    // Mock Audit Logs for now (Replace with real table if exists)
    const mockAudit: AuditLog[] = [
      { id: '1', user_name: 'Mr. Rachi', action: 'LOGIN', timestamp: new Date().toISOString(), details: 'Logged in from Nairobi, KE' },
      { id: '2', user_name: 'Otieno Joy', action: 'RESULT_UPLOAD', timestamp: new Date().toISOString(), details: 'Uploaded Form 4 Biology Results' },
      { id: '3', user_name: 'Hassan Kamau', action: 'FEE_UPDATE', timestamp: new Date().toISOString(), details: 'Updated fee balance for adm 4522' },
    ];

    // Mock Password Requests
    const mockPwd: PasswordRequest[] = [
      { id: '1', user_name: 'Chebet Koech', user_email: 'chebet@giakanja.co.ke', timestamp: new Date().toISOString(), status: 'PENDING' },
    ];

    setUsers(userData || []);
    setAuditLogs(mockAudit);
    setPwdRequests(mockPwd);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const deleteUser = async (id: string) => {
    if(!confirm('Are you sure you want to delete this user identity?')) return;
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if(!error) {
      setUsers(prev => prev.filter(u => u.id !== id));
      showAlert('User deleted successfully.', 'Success');
    }
  };

  const updatePassword = async (id: string, newPwd: string) => {
     const { error } = await supabase.from('profiles').update({ password: newPwd }).eq('id', id);
     if(!error) {
        showAlert('Password updated successfully.', 'Success');
        setChangingPwd(null);
     }
  };

  const sendEmail = async () => {
    if (!mailForm.to || !mailForm.message) return;
    setSendingMail(true);
    try {
      const res = await fetch('http://localhost:5000/api/techops/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mailForm)
      });
      const data = await res.json();
      if (data.success) {
        showAlert('Email dispatched.', 'Success');
        setMailForm({ to: '', subject: '', message: '' });
      }
    } finally {
      setSendingMail(false);
    }
  };

  // Grouping users by school
  const groupedUsers = users.reduce((acc: any, user) => {
    const schoolName = user.schools?.name || 'Unassigned';
    if (!acc[schoolName]) acc[schoolName] = [];
    acc[schoolName].push(user);
    return acc;
  }, {});

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-20 px-4">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-8 border-b border-zinc-100 dark:border-zinc-800">
        <div className="space-y-1">
          <h1 className="text-4xl font-bold dark:text-white tracking-tight font-sora">Users & Support</h1>
          <p className="text-[10px] text-zinc-400 uppercase font-black tracking-[0.2em]">Institutional Identity & Operations Command</p>
        </div>
        <div className="flex gap-4">
           <div className="relative group">
              <input 
                 type="text" 
                 placeholder="Search user..." 
                 value={search}
                 onChange={e => setSearch(e.target.value)}
                 className="px-6 py-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-orange-600/20 w-64 transition-all"
              />
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
           </div>
           <button onClick={loadData} className="p-4 bg-zinc-900 text-white dark:bg-zinc-800 rounded-[1.5rem] hover:scale-105 transition-transform">
             <History size={18} />
           </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-zinc-100 dark:border-zinc-800 gap-10">
        {[
          { id: 'Users', icon: UsersIcon, label: 'Institutional Users' },
          { id: 'Support', icon: LifeBuoy, label: 'Audit & Support' },
          { id: 'Mailing', icon: Inbox, label: 'Inbox & Mailing' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 pb-6 text-[11px] font-black uppercase tracking-[0.15em] border-b-2 transition-all ${activeTab === tab.id ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-white' : 'border-transparent text-zinc-400'}`}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      {/* USERS TAB */}
      {activeTab === 'Users' && (
        <div className="space-y-12 animate-in fade-in duration-500">
           {Object.keys(groupedUsers).map(school => (
              <div key={school} className="space-y-6">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-600 text-white rounded-xl shadow-lg shadow-orange-600/20"><Building size={16} /></div>
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white font-sora">{school}</h2>
                    <span className="text-[10px] font-black text-zinc-400 bg-zinc-50 dark:bg-zinc-800 px-3 py-1 rounded-full uppercase tracking-widest">{groupedUsers[school].length} Users</span>
                 </div>
                 
                 <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden">
                    <table className="w-full text-left">
                       <thead className="bg-zinc-50/50 dark:bg-zinc-800/20 border-b border-zinc-50 dark:border-zinc-800">
                          <tr>
                             <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">User Identity</th>
                             <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Contact</th>
                             <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400">Role</th>
                             <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Administrative Actions</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                          {groupedUsers[school]
                            .filter((u: any) => u.full_name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
                            .map((u: any) => (
                             <tr key={u.id} className="group hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-all">
                                <td className="px-8 py-6">
                                   <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex items-center justify-center text-xs font-black uppercase text-zinc-500">{u.full_name.slice(0,2)}</div>
                                      <div>
                                         <p className="text-sm font-bold text-zinc-900 dark:text-white">{u.full_name}</p>
                                         <p className="text-[10px] text-zinc-400 font-medium">UID: {u.id.substring(0,8)}</p>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-8 py-6">
                                   <div className="space-y-1">
                                      <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{u.email}</p>
                                      <p className="text-[10px] text-zinc-400">{u.phone || 'No phone recorded'}</p>
                                   </div>
                                </td>
                                <td className="px-8 py-6">
                                   <span className="px-3 py-1 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800 text-[9px] font-black uppercase tracking-widest text-zinc-500 rounded-lg">{u.role}</span>
                                </td>
                                <td className="px-8 py-6 text-right">
                                   <div className="flex justify-end gap-2">
                                      <button onClick={() => setEditingUser(u)} className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all"><Edit2 size={16} /></button>
                                      <button onClick={() => setChangingPwd(u)} className="p-2 text-zinc-400 hover:text-orange-600 transition-all"><Key size={16} /></button>
                                      <button onClick={() => deleteUser(u.id)} className="p-2 text-zinc-400 hover:text-red-600 transition-all"><Trash2 size={16} /></button>
                                   </div>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
           ))}
        </div>
      )}

      {/* SUPPORT & AUDIT TAB */}
      {activeTab === 'Support' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in duration-500">
           {/* Audit Trail */}
           <div className="lg:col-span-8 space-y-8">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden">
                 <div className="p-8 border-b border-zinc-50 dark:border-zinc-800 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white font-sora flex items-center gap-2">
                       <UserCheck size={18} className="text-zinc-400" /> Operational Audit Trail
                    </h3>
                    <span className="text-[10px] font-black uppercase text-zinc-400">Live Streaming</span>
                 </div>
                 <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
                    {auditLogs.map(log => (
                       <div key={log.id} className="p-8 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-all flex items-start gap-6">
                          <div className={`p-3 rounded-2xl ${log.action === 'LOGIN' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                             {log.action === 'LOGIN' ? <ArrowUpRight size={20} /> : <Shield size={20} />}
                          </div>
                          <div className="flex-1 space-y-1">
                             <div className="flex justify-between">
                                <p className="text-sm font-bold text-zinc-900 dark:text-white">{log.user_name}</p>
                                <span className="text-[10px] text-zinc-400 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
                             </div>
                             <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{log.action}</p>
                             <p className="text-xs text-zinc-500 italic">"{log.details}"</p>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Password Requests */}
           <div className="lg:col-span-4 space-y-8">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] p-8 shadow-sm">
                 <h3 className="text-base font-bold text-zinc-900 dark:text-white font-sora mb-8 flex items-center gap-2">
                    <Lock size={18} className="text-orange-600" /> Password Requests
                 </h3>
                 <div className="space-y-6">
                    {pwdRequests.map(req => (
                       <div key={req.id} className="p-6 bg-orange-50/30 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/30 rounded-3xl space-y-4">
                          <div className="space-y-1">
                             <p className="text-sm font-bold text-zinc-900 dark:text-white">{req.user_name}</p>
                             <p className="text-[10px] text-zinc-500">{req.user_email}</p>
                          </div>
                          <div className="flex gap-2 pt-2 border-t border-orange-100 dark:border-orange-900/30">
                             <button onClick={() => { setChangingPwd(users.find(u => u.email === req.user_email) || null); setActiveTab('Users'); }} className="flex-1 py-2 bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 rounded-xl text-[9px] font-black uppercase tracking-widest">Resolve</button>
                             <button className="flex-1 py-2 border border-orange-200 dark:border-orange-800 text-orange-600 text-[9px] font-black uppercase tracking-widest rounded-xl">Dismiss</button>
                          </div>
                       </div>
                    ))}
                    {pwdRequests.length === 0 && <p className="text-center py-10 text-xs text-zinc-400 italic font-medium">No pending reset requests.</p>}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MAILING & INBOX TAB */}
      {activeTab === 'Mailing' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in duration-500">
           {/* Inbox (Mock for now) */}
           <div className="lg:col-span-4 space-y-8">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] overflow-hidden">
                 <div className="p-8 border-b border-zinc-50 dark:border-zinc-800 flex items-center gap-2">
                    <Inbox size={18} className="text-zinc-400" />
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white font-sora">Inbound Support</h3>
                 </div>
                 <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
                    {[1, 2, 3].map(i => (
                       <div key={i} className="p-6 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-all cursor-pointer space-y-2">
                          <div className="flex justify-between items-start">
                             <p className="text-xs font-bold text-zinc-900 dark:text-white">John Doe (Giakanja)</p>
                             <span className="text-[9px] text-zinc-400 uppercase">10m ago</span>
                          </div>
                          <p className="text-xs text-zinc-500 line-clamp-2">"I am unable to login since the update yesterday. Please help..."</p>
                       </div>
                    ))}
                 </div>
              </div>
           </div>

           {/* Dispatcher */}
           <div className="lg:col-span-8">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2.5rem] p-12 space-y-8 shadow-sm">
                 <div className="flex items-center gap-3 pb-6 border-b border-zinc-50 dark:border-zinc-800">
                    <Send className="text-orange-600" size={24} />
                    <div>
                       <h2 className="text-2xl font-bold text-zinc-900 dark:text-white font-sora">Institutional Dispatch</h2>
                       <p className="text-xs text-zinc-500">Respond to support requests via Nodemailer bridge.</p>
                    </div>
                 </div>

                 <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                       <div>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">To</p>
                          <input 
                             type="text" 
                             value={mailForm.to}
                             onChange={e => setMailForm(p => ({ ...p, to: e.target.value }))}
                             className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-600/20"
                             placeholder="user@school.ac.ke"
                          />
                       </div>
                       <div>
                          <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Subject</p>
                          <input 
                             type="text" 
                             value={mailForm.subject}
                             onChange={e => setMailForm(p => ({ ...p, subject: e.target.value }))}
                             className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-600/20"
                             placeholder="System Access Resolved"
                          />
                       </div>
                    </div>
                    <div>
                       <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Response Body</p>
                       <textarea 
                          rows={8}
                          value={mailForm.message}
                          onChange={e => setMailForm(p => ({ ...p, message: e.target.value }))}
                          className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-600/20 resize-none"
                          placeholder="Your account has been successfully unlocked..."
                       />
                    </div>
                    <button 
                       onClick={sendEmail}
                       disabled={sendingMail}
                       className="w-full py-5 bg-orange-600 text-white rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-orange-600/30 flex items-center justify-center gap-3 hover:scale-[0.98] transition-all disabled:opacity-50"
                    >
                       {sendingMail ? 'Transmitting...' : <><Send size={16} /> Send Support Dispatch</>}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* MODALS */}
      {changingPwd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
           <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-2xl overflow-hidden p-10 space-y-8">
              <div className="space-y-1">
                 <h3 className="text-xl font-bold dark:text-white font-sora">Update Password</h3>
                 <p className="text-sm text-zinc-500 font-medium">Overriding security for {changingPwd.full_name}</p>
              </div>
              <div>
                 <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">New Secure Password</p>
                 <input 
                    type="text" 
                    id="new-pwd-field"
                    className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-600/20"
                    placeholder="Enter new password..."
                 />
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setChangingPwd(null)} className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-xs font-black uppercase tracking-widest rounded-2xl">Cancel</button>
                 <button onClick={() => {
                    const val = (document.getElementById('new-pwd-field') as HTMLInputElement).value;
                    if(val) updatePassword(changingPwd.id, val);
                 }} className="flex-1 py-4 bg-orange-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-600/20">Apply Override</button>
              </div>
           </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/40 backdrop-blur-md">
           <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-100 dark:border-zinc-800 shadow-2xl overflow-hidden p-10 space-y-8">
              <div className="space-y-1">
                 <h3 className="text-xl font-bold dark:text-white font-sora">Edit Identity</h3>
                 <p className="text-sm text-zinc-500 font-medium">Modifying {editingUser.full_name}</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                 <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Full Name</p>
                    <input type="text" defaultValue={editingUser.full_name} className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-sm outline-none" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Phone Number</p>
                    <input type="text" defaultValue={editingUser.phone} className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-sm outline-none" />
                 </div>
              </div>
              <div>
                 <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2">Institutional Role</p>
                 <select defaultValue={editingUser.role} className="w-full px-6 py-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-sm outline-none">
                    <option value="TEACHER">TEACHER</option>
                    <option value="ADMIN">ADMIN</option>
                    <option value="STUDENT">STUDENT</option>
                 </select>
              </div>
              <div className="flex gap-4">
                 <button onClick={() => setEditingUser(null)} className="flex-1 py-4 bg-zinc-100 dark:bg-zinc-800 text-xs font-black uppercase tracking-widest rounded-2xl">Discard</button>
                 <button onClick={() => setEditingUser(null)} className="flex-1 py-4 bg-orange-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl">Save Changes</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};
