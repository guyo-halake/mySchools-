import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/UI';
import {
  CreditCard,
  TrendingUp,
  Search,
  Plus,
  ChevronDown,
  Calendar as CalendarIcon,
  Filter,
  Info,
  ChevronRight,
  Bell
} from 'lucide-react';
import { cn, formatCurrency } from '../utils/utils';
import { useToast } from '../components/Toast';

export const FeesManagement: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [fees, setFees] = useState<any[]>([]);
  const [feeTypes, setFeeTypes] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddingType, setIsAddingType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [isTermOpen, setIsTermOpen] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    type: '',
    term_id: '',
    who: 'SCHOOL',
    target_id: '',
    amount: 0
  });

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [isAddSingleFeeModalOpen, setIsAddSingleFeeModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [addFeeData, setAddFeeData] = useState({ name: '', amount: 0 });

  const fetchData = async () => {
    if (!user?.school_id) return;
    try {
      const [f, t, trms, cls, strms, stds] = await Promise.all([
        api.getFeesFull(user.school_id),
        api.getFeeTypes(user.school_id),
        api.getTerms(user.school_id),
        api.getClasses(user.school_id),
        api.getStreams(user.school_id),
        api.getStudents(user.school_id)
      ]);
      setFees(f || []);
      setFeeTypes(t || []);
      setTerms(trms || []);
      setClasses(cls || []);
      setStreams(strms || []);
      setStudents(stds || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [user?.school_id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (termRef.current && !termRef.current.contains(event.target as Node)) setIsTermOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeTerm = terms.find(t => t.is_current);

  const handleCreateFee = async () => {
    setActionError(null);
    if (!formData.name || !formData.type || !formData.term_id || !formData.amount) {
      setActionError('Please complete all institutional fields.');
      return;
    }
    try {
      setLoading(true);
      const struct = await api.createFeeStructure({
        school_id: user!.school_id,
        term_id: formData.term_id,
        name: formData.name,
        target_type: formData.who as any,
        target_id: formData.who === 'SCHOOL' ? user!.school_id : formData.target_id
      });
      await api.addFeeItems([{ name: formData.name, amount: formData.amount, structure_id: struct.id }]);
      await api.assignStructureToStudents(struct.id);
      setIsModalOpen(false);
      setFormData({ name: '', type: '', term_id: '', who: 'SCHOOL', target_id: '', amount: 0 });
      fetchData();
    } catch (e: any) {
      setActionError(e.message || 'Failed to register fee.');
      setLoading(false);
    }
  };

  const handleAddType = async () => {
    setActionError(null);
    if (!newTypeName.trim()) return;
    try {
      await api.addFeeType({ school_id: user!.school_id, name: newTypeName, is_recurring: false });
      setNewTypeName(''); setIsAddingType(false);
      fetchData();
    } catch (e: any) { setActionError(e.message || 'Save Error'); }
  };

  const handleAddSingleFee = async () => {
    if (!addFeeData.name || !addFeeData.amount) {
      showToast('Fill item name and amount.', 'error');
      return;
    }
    try {
      setLoading(true);
      await api.addSingleFeeToStudent(user!.school_id, selectedStudent.id, addFeeData.name, addFeeData.amount);
      setIsAddSingleFeeModalOpen(false);
      setAddFeeData({ name: '', amount: 0 });
      fetchData();
      showToast('Record updated and parent notified.', 'success');
    } catch (e: any) {
      console.error('[Fees] Single fee error:', e);
      showToast(e.message || 'Institutional Error', 'error');
    }
    finally { setLoading(false); }
  };

  const sendReminder = async (fee: any) => {
    if (!fee.student?.parent_id) {
      alert('No parent linked to this student record.');
      return;
    }
    try {
      setLoading(true);
      await api.sendNotification({
        user_id: fee.student.parent_id,
        school_id: user!.school_id,
        title: 'Official Payment Reminder',
        message: `From: The Principal's Office. This is an official institutional reminder regarding the outstanding balance for student ${fee.student.profile?.full_name}. Current Balance: KES ${Number(fee.amount_due - fee.amount_paid).toLocaleString()}. Please prioritize this payment.`,
        type: 'warning',
        link: '/fees'
      });
      alert('Notification sent to parent.');
    } catch (e) { alert('Failed.'); }
    finally { setLoading(false); }
  };

  const remindAllArrears = async () => {
    const debtors = fees.filter(f => {
      const bal = Number(f.amount_due || 0) - Number(f.amount_paid || 0);
      return bal > 0 && f.student?.parent_id;
    });

    if (debtors.length === 0) {
      showToast('No students with arrears were found.', 'warning');
      return;
    }
    if (!confirm(`This will send ${debtors.length} professional reminders to all parents. Proceed?`)) return;

    try {
      setLoading(true);

      // Dispatch notifications through the resilient API engine
      const results = await Promise.all(debtors.map(f =>
        api.sendNotification({
          user_id: f.student.parent_id,
          school_id: user!.school_id,
          title: 'Official Arrears Reminder',
          message: `From: The Principal's Office. This is an official institutional reminder for the outstanding balance of KES ${Number(f.amount_due - f.amount_paid).toLocaleString()} for ${f.student.profile?.full_name}. Please clear this as soon as possible.`,
          type: 'warning',
          link: '/fees'
        }).catch(err => {
          console.warn(`Individual notification failed for ${f.student.profile?.full_name}`, err);
          return null;
        })
      ));

      const successCount = results.filter(Boolean).length;

      if (successCount === 0 && debtors.length > 0) {
        showToast('Institutional Messaging table missing. Run notifications.sql migration.', 'error');
      } else {
        showToast(`${successCount} of ${debtors.length} reminders successfully dispatched.`, 'success');
      }
    } catch (e: any) {
      console.error('[Fees] Arrears reminder error:', e);
      showToast('Transmission Failed: Could not submit institutional messages.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = fees.filter(r =>
    r.student?.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.student?.adm_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && fees.length === 0) return <div className="p-20 text-center text-xs text-black font-medium">Synchronizing Institutional Ledger...</div>;

  return (
    <div className="max-w-7xl mx-auto px-8 py-10 space-y-12 font-inter text-black bg-white">

      {/* HEADER */}
      <div className="flex justify-between items-end pb-8 border-b border-gray-100">
        <div className="space-y-1">
          <h1 className="text-2xl font-normal tracking-tight text-black font-sora">Institutional Fees</h1>
          <div className="flex items-center gap-2 mt-1">
            <CalendarIcon size={14} className="text-zinc-400" />
            <p className="text-slate-600 text-xs font-semibold uppercase tracking-widest leading-none">
              {activeTerm ? `${activeTerm.name} ${activeTerm.year}` : 'Set Up Calendar'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={remindAllArrears}
            disabled={loading}
            className="px-5 py-2.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-rose-100 transition-all flex items-center gap-2"
          >
            <Bell size={12} /> Remind Arrears
          </button>
          <button onClick={() => { setActionError(null); setIsModalOpen(true); }} className="px-6 py-2.5 bg-black text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-all shadow-xl shadow-black/10">
            Assign Fee
          </button>
        </div>
      </div>

      {/* REVENUE STATUS CARDS */}
      <div className="grid grid-cols-4 gap-8">
        <div className="p-6 border border-gray-100 rounded-2xl space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Money Received</p>
          <p className="text-xl font-normal text-black font-sora">{formatCurrency(fees.reduce((a, c) => a + (Number(c.amount_paid) || 0), 0))}</p>
        </div>
        <div className="p-6 bg-black rounded-2xl space-y-1 shadow-2xl shadow-black/10 border border-black">
          <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Outstanding Due</p>
          <p className="text-xl font-normal text-white font-sora">{formatCurrency(fees.reduce((a, c) => a + ((Number(c.amount_due) || 0) - (Number(c.amount_paid) || 0)), 0))}</p>
        </div>
        <div className="p-6 border border-gray-100 rounded-2xl space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Students Billed</p>
          <p className="text-xl font-normal text-black font-sora">{new Set(fees.map(f => f.student_id)).size}</p>
        </div>
        <div className="p-6 border border-gray-100 rounded-2xl bg-gray-50/50 space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Cycle</p>
          <p className="text-xl font-normal text-black font-sora truncate">{activeTerm ? activeTerm.name : 'None'}</p>
        </div>
      </div>

      {/* LEDGER TABLE */}
      <div className="space-y-8">
        <div className="flex justify-between items-center pb-4 border-b border-gray-50">
          <div className="flex items-center gap-4">
            <h2 className="text-xs font-semibold text-black uppercase tracking-widest">Payments Ledger</h2>
            <div className="h-4 w-px bg-gray-200"></div>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-[0.2em]">{filtered.length} Official Records</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text" placeholder="Filter invoices..."
              className="pl-9 pr-4 py-2 border-b border-gray-100 text-xs outline-none focus:border-black transition-all w-64 bg-transparent text-black"
              value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[900px]">
            <thead>
              <tr className="text-[10px] text-slate-400 font-bold uppercase tracking-widest border-b border-gray-100">
                <th className="pb-4">Description</th>
                <th className="pb-4">Student</th>
                <th className="pb-4">Status</th>
                <th className="pb-4 text-right">Invoiced</th>
                <th className="pb-4 text-right">Balance</th>
                <th className="pb-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(r => (
                <tr key={r.id} className="group hover:bg-gray-50/50 transition-all">
                  <td className="py-6 text-xs font-semibold text-black uppercase tracking-tighter">{r.type}</td>
                  <td className="py-6">
                    <p className="text-sm font-medium text-black">{r.student?.profile?.full_name}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{r.student?.adm_no} • {r.student?.stream?.class?.name}</p>
                  </td>
                  <td className="py-6">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border",
                      r.status === 'PAID' ? "bg-emerald-50 border-emerald-100 text-emerald-600" :
                        r.status === 'PARTIAL' ? "bg-amber-50 border-amber-100 text-amber-600" : "bg-rose-50 border-rose-100 text-rose-600"
                    )}>
                      {r.status}
                    </span>
                  </td>
                  <td className="py-6 text-right text-xs font-medium text-slate-400">{formatCurrency(r.amount_due)}</td>
                  <td className="py-6 text-right text-xs font-bold text-black border-r border-transparent group-hover:border-gray-50">
                    {formatCurrency(Number(r.amount_due) - Number(r.amount_paid))}
                  </td>
                  <td className="py-6 relative">
                    <div className="flex justify-center items-center">
                      <button
                        onClick={() => setActiveMenuId(activeMenuId === r.id ? null : r.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-all text-slate-400 hover:text-black"
                      >
                        <ChevronDown size={14} className={cn("transition-transform", activeMenuId === r.id && "rotate-180")} />
                      </button>

                      {activeMenuId === r.id && (
                        <div className="absolute top-12 right-0 z-50 w-48 bg-white border border-gray-100 rounded-2xl shadow-2xl p-2 animate-in slide-in-from-top-2">
                          <button
                            onClick={() => { setSelectedStudent(r.student); setIsAddSingleFeeModalOpen(true); setActiveMenuId(null); }}
                            className="w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 flex items-center gap-3"
                          >
                            <Plus size={14} className="text-blue-500" /> Add Fees
                          </button>
                          <button
                            onClick={() => { sendReminder(r); setActiveMenuId(null); }}
                            className="w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 flex items-center gap-3"
                          >
                            <Bell size={14} className="text-amber-500" /> Remind
                          </button>
                          <button className="w-full text-left px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50 flex items-center gap-3 text-rose-500">
                            <Info size={14} /> Flag Student
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SINGLE FEE MODAL - MINIMALIST REDESIGN */}
      <Modal isOpen={isAddSingleFeeModalOpen} onClose={() => setIsAddSingleFeeModalOpen(false)} title="Institutional Billing">
        <div className="py-10 px-6 space-y-10 max-w-sm mx-auto font-inter text-center">
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-black tracking-tight" style={{ fontFamily: 'Sora' }}>{selectedStudent?.profile?.full_name}</h3>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">Record ID: {selectedStudent?.adm_no}</p>
          </div>

          <div className="space-y-6 text-left">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Official Category</label>
              <select
                value={addFeeData.name}
                onChange={e => setAddFeeData({ ...addFeeData, name: e.target.value })}
                className="w-full h-14 px-4 rounded-[1.25rem] border border-zinc-100 bg-zinc-50/50 text-sm focus:bg-white focus:border-black outline-none transition-all appearance-none cursor-pointer"
              >
                <option value="">Select Institutional Category...</option>
                {feeTypes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Fee Amount (KES)</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400">KES</span>
                <input
                  type="number" placeholder="2,500.00"
                  value={addFeeData.amount || ''}
                  onChange={e => setAddFeeData({ ...addFeeData, amount: Number(e.target.value) })}
                  className="w-full h-14 pl-14 pr-5 rounded-[1.25rem] border border-zinc-100 bg-zinc-50/50 text-lg font-bold focus:bg-white focus:border-black outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-6">
            <button onClick={handleAddSingleFee} disabled={loading} className="w-full h-14 bg-black text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest shadow-2xl shadow-black/20 active:scale-[0.98] transition-all disabled:opacity-50">
              {loading ? 'Processing...' : 'Confirm Assignment'}
            </button>
            <button onClick={() => setIsAddSingleFeeModalOpen(false)} className="w-full py-4 text-xs font-bold text-zinc-400 hover:text-black">Discard Change</button>
          </div>
        </div>
      </Modal>      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Mass Billing Hub">
        <div className="py-10 px-6 space-y-10 max-w-sm mx-auto font-inter">
          {actionError && <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-bold uppercase tracking-widest text-center rounded-xl">{actionError}</div>}

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Fee Description</label>
              <input placeholder="e.g. Computer Science Levy" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full h-14 px-5 rounded-[1.25rem] border border-zinc-100 bg-zinc-50/50 text-sm font-medium focus:bg-white focus:border-black outline-none transition-all" />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Bill To</label>
              <div className="grid grid-cols-4 gap-2">
                {['SCHOOL', 'CLASS', 'STREAM', 'STUDENT'].map(target => (
                  <button key={target} onClick={() => setFormData({ ...formData, who: target, target_id: '' })} className={cn("py-3 rounded-xl border text-[8px] font-black uppercase transition-all tracking-tighter", formData.who === target ? "bg-black text-white border-black" : "border-zinc-100 text-zinc-400 hover:border-black")}>
                    {target === 'SCHOOL' ? 'Total' : target === 'CLASS' ? 'Grade' : target === 'STREAM' ? 'Stream' : 'One'}
                  </button>
                ))}
              </div>
            </div>

            {formData.who === 'STUDENT' && (
              <div className="space-y-2 animate-in slide-in-from-top-1">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Pick Student</label>
                <select value={formData.target_id} onChange={e => setFormData({ ...formData, target_id: e.target.value })} className="w-full h-14 px-4 bg-zinc-50/50 border border-zinc-100 rounded-[1.25rem] text-sm text-black">
                  <option value="">Select Record...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.adm_no} - {s.profile?.full_name}</option>)}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Fee Amount (KES)</label>
              <input type="number" placeholder="0.00" value={formData.amount || ''} onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })} className="w-full h-14 px-5 rounded-[1.25rem] border border-zinc-100 bg-zinc-50/50 text-2xl font-bold focus:bg-white focus:border-black outline-none transition-all text-black" />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-6">
            <button onClick={handleCreateFee} disabled={loading} className="w-full h-14 bg-black text-white rounded-[1.5rem] text-xs font-black uppercase tracking-widest shadow-2xl shadow-black/20 active:scale-[0.98] transition-all">
              {loading ? 'Processing...' : 'Authorize Mass Billing'}
            </button>
            <button onClick={() => setIsModalOpen(false)} className="w-full py-4 text-xs font-bold text-zinc-400 hover:text-black">Cancel Operation</button>
          </div>
        </div>
      </Modal>

      {/* CATEGORY MODAL */}
      {isAddingType && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center bg-white/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl p-8 max-w-sm w-full space-y-6">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] text-center">New Category</h3>
            <div className="space-y-2">
              <input autoFocus placeholder="e.g. Sports Levy" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} className="w-full px-4 py-2.5 rounded-lg border border-gray-200 text-sm outline-none text-black font-normal" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setIsAddingType(false)} className="flex-1 py-3 text-sm text-slate-500">Cancel</button>
              <button onClick={handleAddType} className="flex-1 py-3 bg-black text-white rounded-lg text-sm font-medium">Create</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
