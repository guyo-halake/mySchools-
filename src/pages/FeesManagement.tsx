import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Card, Table, Button, Badge, Modal } from '../components/UI';
import { Search, Plus, Landmark, History, Wallet, DollarSign, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../utils/utils';

export const FeesManagement: React.FC = () => {
  const { user } = useAuth();
  const [feeRecords, setFeeRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [globalFeeAmount, setGlobalFeeAmount] = useState<number>(0);

  const fetchFinancials = async () => {
    if (!user?.school_id) return;
    try {
      const data = await api.getFeesFull(user.school_id);
      setFeeRecords(data || []);
    } catch (error) {
      console.error('Failed to fetch financials:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinancials();
  }, [user?.school_id]);

  const stats = {
    termCollected: feeRecords.reduce((acc, curr) => acc + (curr.amount_paid || 0), 0),
    totalArrears: feeRecords.reduce((acc, curr) => acc + ((curr.amount_due || 0) - (curr.amount_paid || 0)), 0),
    totalInvoiced: feeRecords.reduce((acc, curr) => acc + (curr.amount_due || 0), 0)
  };

  const filteredRecords = feeRecords.filter(r => 
    r.student?.profile?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.student?.adm_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.reference_no?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSetGlobalFees = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.school_id || globalFeeAmount <= 0) return;
    try {
      await api.setGlobalFees(user.school_id, globalFeeAmount);
      await fetchFinancials();
      setIsFeeModalOpen(false);
    } catch (error) {
      alert('Failed to update fees');
    }
  };

  if (loading) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
      <div className="w-12 h-12 border-4 border-zinc-100 border-t-zinc-900 rounded-full animate-spin" />
      <p className="text-sm text-zinc-500 font-medium">Syncing financial ledger...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-10 py-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900">Financials</h1>
          <p className="text-zinc-500 mt-2 font-medium">Track school revenue and student payment status</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={() => setIsFeeModalOpen(true)} className="rounded-2xl px-6 py-6 h-auto bg-zinc-900 hover:bg-zinc-800 shadow-xl shadow-zinc-200/50 transition-all active:scale-95">
            <Plus size={20} className="mr-2" /> Orchestrate Fees
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Card className="bg-white border-zinc-100/80 shadow-sm rounded-[2.5rem] p-8">
           <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Collected This Term</p>
                <h3 className="text-3xl font-bold text-zinc-900">{formatCurrency(stats.termCollected)}</h3>
                <div className="flex items-center text-emerald-600 text-[10px] font-bold">
                   <ArrowUpRight size={14} className="mr-1" /> 12% FROM LAST TERM
                </div>
              </div>
              <div className="w-12 h-12 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center justify-center text-zinc-900 shadow-sm">
                <Wallet size={20} />
              </div>
           </div>
        </Card>
        
        <Card className="bg-white border-zinc-100/80 shadow-sm rounded-[2.5rem] p-8">
           <div className="flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Arrears</p>
                <h3 className="text-3xl font-bold text-zinc-900">{formatCurrency(stats.totalArrears)}</h3>
                <div className="flex items-center text-rose-500 text-[10px] font-bold">
                   <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-2 animate-pulse" /> ACTION REQUIRED
                </div>
              </div>
              <div className="w-12 h-12 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center justify-center text-zinc-900 shadow-sm">
                <Landmark size={20} />
              </div>
           </div>
        </Card>

        <Card className="bg-zinc-900 border-zinc-900 shadow-xl shadow-zinc-200 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
           <div className="relative z-10 flex justify-between items-start">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Invoiced</p>
                <h3 className="text-3xl font-bold text-white">{formatCurrency(stats.totalInvoiced)}</h3>
                <p className="text-[10px] font-medium text-zinc-500 uppercase">2024 ACADEMIC CYCLE</p>
              </div>
              <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400">
                <History size={20} />
              </div>
           </div>
           <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/5 rounded-full blur-3xl" />
        </Card>
      </div>

      <Card className="border-zinc-100/80 shadow-sm rounded-[2.5rem] overflow-hidden p-0 bg-white">
        <div className="p-8 border-b border-zinc-50 bg-zinc-50/30">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by student, bank, or reference number..." 
              className="w-full pl-12 pr-4 py-4 rounded-2xl border border-transparent bg-white shadow-sm text-zinc-600 placeholder:text-zinc-400 outline-none focus:ring-2 focus:ring-zinc-100 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table headers={['Student', 'Payment Detail', 'Amount', 'Status', 'Actions']}>
            {filteredRecords.map(r => {
              const balance = r.amount_due - r.amount_paid;
              return (
                <tr key={r.id} className="group hover:bg-zinc-50/50 transition-colors">
                  <td className="px-8 py-7">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200/50 flex items-center justify-center text-zinc-500 font-bold text-xs">
                        {r.student?.profile?.full_name?.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-zinc-900">{r.student?.profile?.full_name}</p>
                        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider mt-0.5">ADM: {r.student?.adm_no}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-7">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                         <Landmark size={14} className="text-zinc-300" />
                         <span className="text-xs font-semibold text-zinc-700">{r.bank_name || 'Direct Deposit'}</span>
                      </div>
                      <div className="inline-flex px-2 py-0.5 rounded-md bg-zinc-100 text-[10px] font-bold text-zinc-400 border border-zinc-200/50 uppercase">
                         {r.reference_no || 'Pending'}
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-7 text-right">
                    <div className="space-y-1 text-right">
                      <p className="text-lg font-bold text-zinc-900">{formatCurrency(r.amount_paid)}</p>
                      <p className="text-[10px] font-semibold text-zinc-400 uppercase">OF {formatCurrency(r.amount_due)}</p>
                    </div>
                  </td>
                  <td className="px-8 py-7">
                    <Badge variant={r.status === 'PAID' ? 'success' : r.status === 'PARTIAL' ? 'warning' : 'danger'} className="text-[10px] font-bold px-4 py-1.5 rounded-full border-none shadow-sm">
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-8 py-7 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" className="h-9 px-4 rounded-xl text-xs font-semibold text-zinc-500 hover:text-zinc-900 hover:bg-white hover:shadow-sm border border-transparent hover:border-zinc-100 transition-all">Details</Button>
                      <Button variant="ghost" className="h-9 px-4 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-50 transition-all">Hold</Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </Table>
        </div>
      </Card>

      <Modal isOpen={isFeeModalOpen} onClose={() => setIsFeeModalOpen(false)} title="Universal Fee Setting">
        <div className="space-y-8">
           <div className="p-6 bg-zinc-900 rounded-[2rem] text-white overflow-hidden relative shadow-2xl shadow-zinc-200">
              <div className="relative z-10">
                 <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-3">Institutional Command</p>
                 <p className="text-sm font-medium leading-relaxed text-zinc-300">
                    This will update the total fee requirement for the current term across all registered student profiles.
                 </p>
              </div>
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
           </div>

           <form onSubmit={handleSetGlobalFees} className="space-y-8 pb-4">
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-zinc-900 ml-1">Universal Term Fee (KSH)</label>
              <div className="relative group">
                 <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors group-focus-within:text-zinc-900">
                    <DollarSign size={20} className="text-zinc-300 group-focus-within:text-zinc-900 transition-colors" />
                 </div>
                 <input 
                   type="number" 
                   className="w-full pl-14 pr-6 py-6 rounded-3xl border border-zinc-100 bg-zinc-50 text-2xl font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-zinc-100/50 focus:bg-white transition-all shadow-inner"
                   placeholder="e.g. 45000"
                   value={globalFeeAmount}
                   onChange={(e) => setGlobalFeeAmount(Number(e.target.value))}
                   required
                 />
              </div>
            </div>
            
            <div className="flex gap-4">
               <Button variant="outline" className="flex-1 py-5 rounded-2xl border-2 font-bold uppercase text-[10px] tracking-widest" type="button" onClick={() => setIsFeeModalOpen(false)}>Cancel</Button>
               <Button type="submit" className="flex-[2] py-5 rounded-2xl bg-zinc-900 text-white shadow-2xl shadow-zinc-200 font-bold uppercase text-[10px] tracking-widest">
                 Commit New Structure
               </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
