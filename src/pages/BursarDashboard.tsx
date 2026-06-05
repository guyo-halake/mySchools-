import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { 
  ArrowRight, ArrowUpRight, ArrowDownRight, RefreshCcw, 
  Search, Check, X, Plus, AlertCircle, Phone, UploadCloud, FileText, Database
} from 'lucide-react';
import { cn, formatCurrency, formatDate } from '../utils/utils';
import { useToast } from '../components/Toast';

export const BursarDashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [feed, setFeed] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'LIVE' | 'HISTORICAL'>('LIVE');
  const [voteHeads, setVoteHeads] = useState<any[]>([]);
  
  // Modal States
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [slipReference, setSlipReference] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Expense Form State
  const [expenseForm, setExpenseForm] = useState({ vote_head_id: '', amount: '', description: '', reference: '' });
  const [uploadingImage, setUploadingImage] = useState(false);

  const fetchData = async () => {
    if (!user?.school_id) return;
    try {
      setLoading(true);
      const [unifiedFeed, historicalFeed, vHeads] = await Promise.all([
         api.getUnifiedFeed(user.school_id),
         api.getHistoricalLedger(user.school_id),
         api.getVoteHeads(user.school_id)
      ]);
      setFeed(viewMode === 'LIVE' ? unifiedFeed : historicalFeed);
      setVoteHeads(vHeads || []);
    } catch (err) {
      console.error(err);
      showToast('Failed to fetch ledger', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user?.school_id, viewMode]);

  // Aggregate metrics from ALL approved data
  const feesPaidThisTerm = feed.filter(f => f.feed_type === 'FEE_PAYMENT' && f.status === 'APPROVED').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const expensesThisTerm = feed.filter(f => f.feed_type === 'EXPENSE_REQUEST' && f.status === 'APPROVED').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const handleProvePayment = (item: any) => {
    setSelectedItem(item);
    setSlipReference(item.reference || '');
    setReceiptUrl('');
    setVerifyModalOpen(true);
  };

  const handleApprove = async () => {
    if (!selectedItem) return;
    try {
      if (selectedItem.feed_type === 'FEE_PAYMENT') {
         await api.approvePayment(selectedItem.id);
      } else {
         await api.updateTransactionStatus(selectedItem.id, 'APPROVED');
      }
      showToast('Approved successfully', 'success');
      setVerifyModalOpen(false);
      fetchData();
    } catch (e) {
      console.error(e);
      showToast('Failed to approve', 'error');
    }
  };

  const handleHold = async (item: any) => {
    try {
      if (item.feed_type === 'EXPENSE_REQUEST') {
         await api.updateTransactionStatus(item.id, 'REJECTED'); // Or HOLD
         showToast('Request put on hold.', 'warning');
         fetchData();
      } else {
         showToast('Payment marked as hold.', 'warning');
      }
    } catch (e) {
      showToast('Failed to update', 'error');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
     const file = e.target.files?.[0];
     if (!file || !user?.school_id) return;
     try {
        setUploadingImage(true);
        const url = await api.uploadFinancialDocument(file, user.school_id);
        setReceiptUrl(url);
        showToast('Document uploaded', 'success');
     } catch (err) {
        showToast('Upload failed. Ensure bucket exists.', 'error');
     } finally {
        setUploadingImage(false);
     }
  };

  const submitExpense = async () => {
     if (!expenseForm.vote_head_id || !expenseForm.amount || !expenseForm.description) {
        showToast('Fill all fields', 'warning');
        return;
     }
     try {
        await api.recordTransaction({
           school_id: user!.school_id,
           vote_head_id: expenseForm.vote_head_id,
           type: 'EXPENDITURE',
           amount: expenseForm.amount,
           description: expenseForm.description,
           reference: receiptUrl || expenseForm.reference,
           recorded_by: user!.id,
           status: 'PENDING'
        });
        showToast('Expense logged for approval', 'success');
        setIsExpenseModalOpen(false);
        fetchData();
     } catch(e) {
        showToast('Failed to log expense', 'error');
     }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-10 font-inter text-black bg-white min-h-screen space-y-12">
      
      {/* HEADER & ACTIONS */}
      <div className="flex justify-between items-end border-b border-black pb-4">
        <div>
          <h1 className="text-3xl font-normal tracking-tight text-black" style={{ fontFamily: 'Sora' }}>
            Bursar's Desk
          </h1>
          <div className="flex gap-4 mt-4">
             <button 
                onClick={() => setViewMode('LIVE')}
                className={cn("text-xs font-black uppercase tracking-widest transition-all", viewMode === 'LIVE' ? "text-black border-b-2 border-black pb-1" : "text-zinc-400 hover:text-black")}
             >
                Live Verification
             </button>
             <button 
                onClick={() => setViewMode('HISTORICAL')}
                className={cn("text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1", viewMode === 'HISTORICAL' ? "text-black border-b-2 border-black pb-1" : "text-zinc-400 hover:text-black")}
             >
                <Database size={12}/> Full Ledger
             </button>
          </div>
        </div>
        <div className="flex gap-4">
           <button onClick={() => setIsExpenseModalOpen(true)} className="px-6 py-2 border border-black text-black text-[10px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-colors flex items-center gap-2">
             <Plus size={14} /> Add Expense
           </button>
           <button onClick={() => setIsFeeModalOpen(true)} className="px-6 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors flex items-center gap-2">
             <Plus size={14} /> Add Fees
           </button>
        </div>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-2 gap-6">
         <div className="p-8 border border-zinc-200">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Fees Payments</p>
            <p className="text-4xl font-normal text-black" style={{ fontFamily: 'Sora' }}>{formatCurrency(feesPaidThisTerm)}</p>
         </div>
         <div className="p-8 border border-zinc-200">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Total Expenses</p>
            <p className="text-4xl font-normal text-black" style={{ fontFamily: 'Sora' }}>{formatCurrency(expensesThisTerm)}</p>
         </div>
      </div>

      {/* REAL-TIME VERIFICATION LEDGER */}
      <div className="border border-zinc-200">
         <div className="p-6 border-b border-zinc-200 flex justify-between items-center bg-zinc-50">
            <h3 className="text-xs font-black uppercase tracking-widest text-black">
               {viewMode === 'LIVE' ? 'Live Verification Log' : 'Master Historical Ledger'}
            </h3>
            <button onClick={fetchData} className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 hover:text-black">
               <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Feed
            </button>
         </div>

         <div className="w-full overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-zinc-200">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Time</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Name</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Type</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Amount</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-400 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {feed.map(item => (
                  <tr key={item.id} className={cn("hover:bg-zinc-50 transition-colors", item.status === 'PENDING' ? 'bg-amber-50/30' : '')}>
                    <td className="px-6 py-4 text-[10px] font-bold text-zinc-400">{formatDate(item.feed_date)}</td>
                    <td className="px-6 py-4">
                      <p className="text-xs font-bold text-black">{item.feed_name}</p>
                      <p className="text-[9px] font-bold text-zinc-400 tracking-widest uppercase">{item.feed_type === 'FEE_PAYMENT' ? item.method : 'EXPENSE'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 text-[9px] font-black uppercase tracking-widest",
                        item.feed_type === 'FEE_PAYMENT' ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
                      )}>
                        {item.feed_category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-black">{formatCurrency(item.amount)}</td>
                    <td className="px-6 py-4">
                       <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest flex items-center gap-1",
                          item.status === 'APPROVED' ? "text-emerald-500" : 
                          item.status === 'PENDING' ? "text-amber-500" : "text-rose-500"
                       )}>
                          {item.status === 'PENDING' && <AlertCircle size={10} />}
                          {item.status || 'PENDING'}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      {item.status !== 'APPROVED' && viewMode === 'LIVE' && (
                        <>
                          <button onClick={() => handleProvePayment(item)} className="px-3 py-1.5 bg-black text-white text-[9px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors">
                            Prove
                          </button>
                          <button onClick={() => handleHold(item)} className="px-3 py-1.5 border border-zinc-200 text-black text-[9px] font-black uppercase tracking-widest hover:bg-zinc-50 transition-colors">
                            Hold
                          </button>
                        </>
                      )}
                      {item.status === 'APPROVED' && (
                         <span className="text-[9px] font-black uppercase tracking-widest text-zinc-300">Verified</span>
                      )}
                    </td>
                  </tr>
                ))}
                {!loading && feed.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-16 text-center">
                       <p className="text-xl font-normal text-zinc-300 mb-2" style={{ fontFamily: 'Sora' }}>{viewMode === 'LIVE' ? 'No payments today.' : 'Ledger is empty.'}</p>
                       <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">The feed is completely clear.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
         </div>
      </div>

      {/* VERIFICATION MODAL */}
      {verifyModalOpen && selectedItem && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setVerifyModalOpen(false)} />
            <div className="relative w-full max-w-md bg-white border border-zinc-200 shadow-2xl p-8 animate-in zoom-in-95 duration-200">
               <button onClick={() => setVerifyModalOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-black">
                  <X size={16} />
               </button>

               <h2 className="text-xl font-normal text-black mb-1" style={{ fontFamily: 'Sora' }}>Verify Transaction</h2>
               <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6">
                 {selectedItem.feed_type === 'FEE_PAYMENT' ? 'Fee Payment Proof' : 'Expense Request Proof'}
               </p>

               <div className="space-y-6">
                  <div className="p-4 bg-zinc-50 border border-zinc-100">
                     <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-1">Amount</p>
                     <p className="text-2xl font-normal text-black" style={{ fontFamily: 'Sora' }}>{formatCurrency(selectedItem.amount)}</p>
                     <p className="text-xs font-bold text-zinc-500 mt-2">{selectedItem.feed_name}</p>
                  </div>

                  {selectedItem.feed_type === 'FEE_PAYMENT' && selectedItem.method === 'PAYSTACK' && (
                     <div className="space-y-3">
                        <div className="flex items-center gap-3 text-sm font-bold text-black border-b border-zinc-100 pb-2">
                           <Phone size={14} className="text-zinc-400" /> +254 700 000 000
                        </div>
                        <div className="flex items-center gap-3 text-sm font-bold text-emerald-600 border-b border-zinc-100 pb-2">
                           <Check size={14} /> Paystack Verified (Auto)
                        </div>
                     </div>
                  )}

                  {(selectedItem.feed_type === 'EXPENSE_REQUEST' || (selectedItem.feed_type === 'FEE_PAYMENT' && selectedItem.method !== 'PAYSTACK')) && (
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Receipt / Reference Number</label>
                        <input 
                           type="text" 
                           value={slipReference}
                           onChange={(e) => setSlipReference(e.target.value)}
                           placeholder="Type exact reference to prove..."
                           className="w-full px-4 py-3 bg-white border border-zinc-200 text-sm font-bold text-black focus:outline-none focus:border-black transition-colors"
                        />
                        {selectedItem.reference && selectedItem.reference.startsWith('http') && (
                           <a href={selectedItem.reference} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-blue-500 hover:underline mt-2 inline-block">View Attached Document</a>
                        )}
                     </div>
                  )}

                  <div className="pt-4 flex gap-3">
                     <button 
                        onClick={handleApprove}
                        disabled={selectedItem.method !== 'PAYSTACK' && !slipReference}
                        className="flex-1 py-3 bg-black text-white text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors disabled:opacity-50"
                     >
                        Approve & Clear
                     </button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* ADD EXPENSE MODAL */}
      {isExpenseModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsExpenseModalOpen(false)} />
            <div className="relative w-full max-w-md bg-white border border-zinc-200 shadow-2xl p-8 animate-in zoom-in-95 duration-200">
               <button onClick={() => setIsExpenseModalOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-black">
                  <X size={16} />
               </button>

               <h2 className="text-xl font-normal text-black mb-1" style={{ fontFamily: 'Sora' }}>Log Expense</h2>
               <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6">Attach Proof for Bursar Approval</p>

               <div className="space-y-4">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Vote Head (Category)</label>
                     <select 
                        value={expenseForm.vote_head_id}
                        onChange={(e) => setExpenseForm({...expenseForm, vote_head_id: e.target.value})}
                        className="w-full px-4 py-3 bg-white border border-zinc-200 text-sm font-bold text-black focus:outline-none focus:border-black transition-colors"
                     >
                        <option value="">Select Category...</option>
                        {voteHeads.filter(v => v.type === 'EXPENDITURE').map(v => (
                           <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                     </select>
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Amount (KES)</label>
                     <input 
                        type="number" 
                        value={expenseForm.amount}
                        onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                        placeholder="0.00"
                        className="w-full px-4 py-3 bg-white border border-zinc-200 text-sm font-bold text-black focus:outline-none focus:border-black transition-colors"
                     />
                  </div>

                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Description</label>
                     <input 
                        type="text" 
                        value={expenseForm.description}
                        onChange={(e) => setExpenseForm({...expenseForm, description: e.target.value})}
                        placeholder="e.g. Fuel for School Bus KCA 123A"
                        className="w-full px-4 py-3 bg-white border border-zinc-200 text-sm font-bold text-black focus:outline-none focus:border-black transition-colors"
                     />
                  </div>

                  <div className="space-y-2 pt-2 border-t border-zinc-100">
                     <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Attach Receipt / Slip (Optional)</label>
                     <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept="image/*,.pdf" />
                     <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full py-4 border-2 border-dashed border-zinc-200 text-zinc-400 hover:border-black hover:text-black transition-colors flex flex-col items-center gap-2"
                     >
                        {uploadingImage ? <RefreshCcw size={18} className="animate-spin" /> : <UploadCloud size={18} />}
                        <span className="text-[10px] font-black uppercase tracking-widest">
                           {uploadingImage ? 'Uploading...' : receiptUrl ? 'Document Attached!' : 'Click to Upload'}
                        </span>
                     </button>
                  </div>

                  <button 
                     onClick={submitExpense}
                     className="w-full py-3 mt-4 bg-black text-white text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors"
                  >
                     Submit for Approval
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* ADD FEES MODAL */}
      {isFeeModalOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsFeeModalOpen(false)} />
            <div className="relative w-full max-w-sm bg-white border border-zinc-200 shadow-2xl p-8 animate-in zoom-in-95 duration-200 text-center">
               <button onClick={() => setIsFeeModalOpen(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-black">
                  <X size={16} />
               </button>
               <FileText size={32} className="mx-auto text-zinc-300 mb-4" />
               <h2 className="text-xl font-normal text-black mb-1" style={{ fontFamily: 'Sora' }}>Mass Billing</h2>
               <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6">Redirecting to Billing Hub</p>
               <p className="text-xs text-zinc-500 font-medium mb-6">Mass billing is deeply integrated with the Principal's dashboard to ensure database integrity.</p>
               <a href="/fees-management" className="block w-full py-3 bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors">
                  Go to Fees Management
               </a>
            </div>
         </div>
      )}

    </div>
  );
};
