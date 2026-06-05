import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Camera, CreditCard, Download, Landmark, Smartphone, History, Receipt, Wallet, ArrowUpRight, Plus, X, Upload, ChevronDown, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Badge, Button, Modal } from '../components/UI';
import { cn } from '../utils/utils';

const formatCurrency = (value: number) => `KES ${Math.abs(Number(value || 0)).toLocaleString()}`;

export const ParentStudentFees: React.FC = () => {
   const { user } = useAuth();
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');
   const [students, setStudents] = useState<any[]>([]);
   const [selectedStudentId, setSelectedStudentId] = useState('');
   const [schoolInfo, setSchoolInfo] = useState<any>(null);
   const [feeRows, setFeeRows] = useState<any[]>([]);

   // PAYMENT FLOW
   const [isPayModalOpen, setIsPayModalOpen] = useState(false);
   const [selectedFeeType, setSelectedFeeType] = useState('');
   const [selectedMethod, setSelectedMethod] = useState<'MPESA' | 'BANK' | 'CHEQUE' | ''>('');
   const [mpesaForm, setMpesaForm] = useState({ phone: '', amount: '' });
   const [modalStatus, setModalStatus] = useState<{ type: 'success' | 'error' | 'info', msg: string } | null>(null);

   const [cameraActive, setCameraActive] = useState(false);
   const videoRef = useRef<HTMLVideoElement>(null);

   const summary = useMemo(() => {
      const totalDue = feeRows.reduce((acc: number, row: any) => acc + Number(row.amount_due || 0), 0);
      const totalPaid = feeRows.reduce((acc: number, row: any) => acc + Number(row.amount_paid || 0), 0);
      const balance = totalDue - totalPaid;
      return { totalDue, totalPaid, balance };
   }, [feeRows]);

   const feeTypes = useMemo(() => {
      const types = new Set<string>();
      feeRows.forEach(r => { if (r.type && (Number(r.amount_due) - Number(r.amount_paid) > 0)) types.add(r.type); });
      return ['All', ...Array.from(types)];
   }, [feeRows]);

   const debtorSummary = useMemo(() => {
      return feeRows.filter(r => (Number(r.amount_due) - Number(r.amount_paid) > 0));
   }, [feeRows]);

   const selectedStudent = useMemo(
      () => students.find((row: any) => row.id === selectedStudentId) || null,
      [students, selectedStudentId]
   );

   const loadData = async () => {
      if (!user?.school_id) return;
      try {
         const [allStudents, school, allFees] = await Promise.all([
            api.getStudents(user.school_id),
            api.getSchool(user.school_id),
            api.getFees(user.school_id)
         ]);
         const scopedStudents = user.role === 'PARENT' ? allStudents.filter((row: any) => row.parent_id === user.id) : allStudents.filter((row: any) => row.id === user.id);
         const activeId = selectedStudentId && scopedStudents.some((row: any) => row.id === selectedStudentId) ? selectedStudentId : (scopedStudents[0]?.id || '');
         setStudents(scopedStudents);
         setSelectedStudentId(activeId);
         setSchoolInfo(school || null);
         setFeeRows((allFees || []).filter((row: any) => row.student_id === activeId));
         setMpesaForm(prev => ({ ...prev, phone: user.phone || '0700000000', amount: '' }));
      } catch (err) { setError('Sync error'); }
      finally { setLoading(false); }
   };

   useEffect(() => { loadData(); }, [user?.id, user?.school_id]);

   useEffect(() => {
      if (selectedFeeType === 'All') {
         const total = debtorSummary.reduce((acc, curr) => acc + (Number(curr.amount_due) - Number(curr.amount_paid)), 0);
         setMpesaForm(p => ({ ...p, amount: total.toString() }));
      } else if (selectedFeeType) {
         const fee = debtorSummary.find(f => f.type === selectedFeeType);
         const balance = fee ? (Number(fee.amount_due) - Number(fee.amount_paid)) : 0;
         setMpesaForm(p => ({ ...p, amount: balance.toString() }));
      }
   }, [selectedFeeType, debtorSummary]);

   const toggleCamera = async (activate: boolean) => {
      if (activate) {
         setCameraActive(true);
         try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) videoRef.current.srcObject = stream;
         } catch (e) { setModalStatus({ type: 'error', msg: 'Lens access denied' }); }
      } else {
         if (videoRef.current?.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach(t => t.stop());
         }
         setCameraActive(false);
      }
   };

   const handleMpesaPush = () => {
      setModalStatus({ type: 'info', msg: `Initiating Secure STK Push to ${mpesaForm.phone}...` });
      setTimeout(() => {
         setModalStatus({ type: 'error', msg: 'Gateway Latency: External check required. Please retry in 60s.' });
      }, 2000);
   };

   if (loading) return (
      <div className="max-w-[1400px] mx-auto p-4 sm:p-8 space-y-6">
         <div className="h-4 w-48 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
         <div className="h-2 w-full bg-zinc-50 rounded" />
         <div className="h-[400px] bg-zinc-50 dark:bg-zinc-800 rounded-3xl animate-pulse" />
      </div>
   );

   return (
      <div className="max-w-5xl mx-auto p-4 sm:p-12 space-y-12 pb-24 text-zinc-900 font-inter bg-white">

         {/* 1. SIMPLE HEADER */}
         <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="space-y-1">
               <h1 className="text-3xl font-normal tracking-tight font-sora">School Fees</h1>
               <p className="text-xs text-zinc-400 font-medium tracking-wide">Managing finances for {selectedStudent?.profile?.full_name}</p>
            </div>
            <div className="flex items-center gap-3">
               <button onClick={() => { setIsPayModalOpen(true); setModalStatus(null); setSelectedMethod(''); setSelectedFeeType('All'); }} className="bg-black text-white px-8 py-3 rounded-xl text-xs font-bold hover:bg-zinc-800 transition-all active:scale-95">
                  Pay Fees
               </button>
               {students.length > 1 && (
                  <select value={selectedStudentId} onChange={(e) => setSelectedStudentId(e.target.value)} className="bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-2.5 text-[10px] uppercase font-bold outline-none cursor-pointer">
                     {students.map((s: any) => (<option key={s.id} value={s.id}>{s.profile?.full_name?.split(' ')[0]}</option>))}
                  </select>
               )}
            </div>
         </div>

         {/* 2. CORE STATUS */}
         <div className="flex flex-col sm:flex-row gap-12 sm:gap-32 py-4">
            <div className="space-y-1">
               <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest leading-none">Total Invoiced</span>
               <p className="text-3xl font-medium tracking-tighter font-sora">{formatCurrency(summary.totalDue)}</p>
            </div>
            <div className="space-y-1">
               <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest leading-none">Your Balance</span>
               <div className="flex items-baseline gap-3">
                  <p className={cn("text-3xl font-medium tracking-tighter font-sora", summary.balance > 0 ? "text-black" : "text-emerald-500")}>
                     {summary.balance > 0 ? formatCurrency(summary.balance) : 'Paid in Full'}
                  </p>
                  {summary.balance > 0 && <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse ml-1" />}
               </div>
            </div>
         </div>

         {/* 3. FEE LEDGER */}
         <div className="space-y-6 pt-6">
            <div className="flex items-center justify-between border-b border-zinc-50 pb-4">
               <div className="flex items-center gap-3 text-black">
                  <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400">Statement History</h2>
               </div>
               <button className="text-[10px] font-bold uppercase text-zinc-300 hover:text-black transition-colors">Export PDF</button>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full text-left">
                  <thead>
                     <tr className="uppercase text-[9px] font-bold text-zinc-300 tracking-widest border-b border-zinc-50">
                        <th className="pb-6 pr-6">Fee Item</th>
                        <th className="pb-6 px-6 text-center">Amount Due</th>
                        <th className="pb-6 px-6 text-center">Paid</th>
                        <th className="pb-6 px-6 text-center">Balance</th>
                        <th className="pb-6 pl-6 text-right">Method</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                     {feeRows.length === 0 && (
                        <tr><td colSpan={5} className="py-20 text-center text-[10px] font-medium text-zinc-300 uppercase tracking-widest">No Billing Records</td></tr>
                     )}
                     {feeRows.map((row: any) => {
                        const bal = Number(row.amount_due) - Number(row.amount_paid);
                        return (
                           <tr key={row.id} className="group">
                              <td className="py-8 pr-6">
                                 <p className="font-bold text-black text-xs uppercase">{row.type}</p>
                                 <p className="text-[9px] text-zinc-300 mt-1 uppercase font-medium">{new Date(row.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                              </td>
                              <td className="py-8 px-6 text-center font-medium text-zinc-400 text-xs">{formatCurrency(row.amount_due)}</td>
                              <td className="py-8 px-6 text-center">
                                 <span className={cn("text-xs font-medium", row.amount_paid > 0 ? "text-zinc-600" : "text-zinc-200")}>
                                    {formatCurrency(row.amount_paid)}
                                 </span>
                              </td>
                              <td className="py-8 px-6 text-center font-bold text-black text-xs">
                                 {bal > 0 ? formatCurrency(bal) : <span className="text-emerald-500">None</span>}
                              </td>
                              <td className="py-8 pl-6 text-right text-[10px] font-medium text-zinc-300 uppercase">{row.bank_name || 'System'}</td>
                           </tr>
                        );
                     })}
                  </tbody>
               </table>
            </div>
         </div>

         {/* 4. MODEST CHANNELS PANEL */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-16 border-t border-zinc-50">
            <div className="space-y-4">
               <h2 className="text-xs font-bold uppercase tracking-widest text-zinc-400 font-sora">Payment Methods</h2>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-1">
                     <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">M-Pesa</p>
                     <p className="text-sm font-bold text-black">{schoolInfo?.paybill_no || "754321"} (Paybill)</p>
                     <p className="text-[8px] text-zinc-400 uppercase">Use ADM as Account</p>
                  </div>
                  <div className="space-y-1">
                     <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">Bank</p>
                     <p className="text-sm font-bold text-black">{schoolInfo?.bank_acc || '01223445561'}</p>
                     <p className="text-[8px] text-zinc-400 uppercase">{schoolInfo?.bank_name}</p>
                  </div>
               </div>
            </div>
         </div>

         {/* PAYMENT MODAL - ULTRA MINIMALIST */}
         <Modal isOpen={isPayModalOpen} onClose={() => { setIsPayModalOpen(false); toggleCamera(false); }} title="Pay Fees">
            <div className="space-y-12 p-2 max-h-[85vh] overflow-y-auto no-scrollbar">

               {/* ALERTS */}
               {modalStatus && (
                  <div className={cn("p-4 rounded-xl flex items-start gap-3 animate-in slide-in-from-top-2 duration-200 shadow-sm",
                     modalStatus.type === 'success' ? "bg-emerald-50 text-emerald-800 border border-emerald-100" :
                        modalStatus.type === 'info' ? "bg-zinc-950 text-white" : "bg-rose-50 text-rose-800 border border-rose-100"
                  )}>
                     <div className="flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">{modalStatus.msg}</p>
                     </div>
                     <button onClick={() => setModalStatus(null)} className="opacity-40 hover:opacity-100"><X size={12} /></button>
                  </div>
               )}

               {/* STEP 1: CATEGORY SELECTION (CHECKBOXES) */}
               <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase text-zinc-300 tracking-widest">Choose Category</label>
                  <div className="space-y-2">
                     {feeTypes.map(type => (
                        <label
                           key={type}
                           className={cn(
                              "flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all",
                              selectedFeeType === type ? "border-black bg-zinc-50" : "border-zinc-100 hover:border-zinc-200"
                           )}
                        >
                           <input
                              type="radio"
                              name="fee_category"
                              checked={selectedFeeType === type}
                              onChange={() => setSelectedFeeType(type)}
                              className="w-4 h-4 rounded-full accent-black border-zinc-200"
                           />
                           <span className="text-xs font-bold text-black uppercase tracking-tight">{type === 'All' ? 'Everything Combined' : type}</span>
                        </label>
                     ))}
                  </div>

                  {/* SELECTION SUMMARY */}
                  {selectedFeeType && (
                     <div className="p-8 rounded-2xl bg-zinc-50 border border-zinc-50 space-y-6">
                        <div className="space-y-3">
                           {selectedFeeType === 'All' ? (
                              debtorSummary.map(f => (
                                 <div key={f.id} className="flex justify-between items-center text-[10px] font-medium uppercase tracking-tight">
                                    <span className="text-zinc-400">{f.type}</span>
                                    <span className="text-black font-bold">{formatCurrency(Number(f.amount_due) - Number(f.amount_paid))}</span>
                                 </div>
                              ))
                           ) : (
                              <div className="flex justify-between items-center text-[10px] font-medium uppercase tracking-tight">
                                 <span className="text-zinc-400">{selectedFeeType} Balance</span>
                                 <span className="text-black font-bold">
                                    {formatCurrency(Number(debtorSummary.find(f => f.type === selectedFeeType)?.amount_due || 0) - Number(debtorSummary.find(f => f.type === selectedFeeType)?.amount_paid || 0))}
                                 </span>
                              </div>
                           )}
                           <div className="pt-6 border-t border-zinc-100 flex justify-between items-end">
                              <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">Amount to Pay</span>
                              <span className="text-3xl font-normal tracking-tighter" style={{ fontFamily: 'Sora' }}>{formatCurrency(Number(mpesaForm.amount))}</span>
                           </div>
                        </div>
                     </div>
                  )}
               </div>

               {/* STEP 2: CHANNEL SELECTION */}
               <div className={cn("space-y-6 transition-all duration-300", !selectedFeeType && "opacity-20 pointer-events-none")}>
                  <label className="text-[10px] font-bold uppercase text-zinc-300 tracking-widest">Select Method</label>

                  <div className="flex gap-4">
                     {[
                        { id: 'MPESA', icon: Smartphone, label: 'M-Pesa' },
                        { id: 'BANK', icon: Landmark, label: 'Bank' },
                        { id: 'SCAN', icon: Camera, label: 'Scan' }
                     ].map(method => (
                        <button
                           key={method.id}
                           onClick={() => { setSelectedMethod(method.id as any); toggleCamera(method.id === 'SCAN'); }}
                           className={cn(
                              "flex-1 flex flex-col items-center justify-center py-6 px-2 rounded-2xl border transition-all gap-2",
                              selectedMethod === method.id ? "border-black bg-zinc-50" : "border-zinc-100"
                           )}
                        >
                           <method.icon size={16} className={selectedMethod === method.id ? "text-black" : "text-zinc-300"} />
                           <span className={cn("text-[9px] font-bold uppercase tracking-widest", selectedMethod === method.id ? "text-black" : "text-zinc-300")}>{method.label}</span>
                        </button>
                     ))}
                  </div>

                  {/* DYNAMIC VIEWS */}
                  <div className="mt-8">
                     {selectedMethod === 'MPESA' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                           <div className="space-y-4">
                              <div className="space-y-2">
                                 <label className="text-[10px] font-bold text-zinc-400 uppercase">Phone Number</label>
                                 <input type="tel" value={mpesaForm.phone} onChange={e => setMpesaForm(p => ({ ...p, phone: e.target.value }))} className="w-full h-12 px-5 rounded-xl border border-zinc-100 outline-none text-sm font-bold focus:border-black transition-all" />
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[10px] font-bold text-zinc-400 uppercase">Edit Amount</label>
                                 <input type="number" value={mpesaForm.amount} onChange={e => setMpesaForm(p => ({ ...p, amount: e.target.value }))} className="w-full h-12 px-5 rounded-xl border border-zinc-100 outline-none text-xl font-bold focus:border-black transition-all" />
                              </div>
                              <button onClick={handleMpesaPush} className="w-full h-14 bg-black text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] active:scale-[0.98] transition-all">Send Prompt</button>
                           </div>
                        </div>
                     )}

                     {selectedMethod === 'BANK' && (
                        <div className="space-y-6 p-8 rounded-3xl bg-zinc-50 border border-zinc-100 animate-in fade-in duration-300 text-center">
                           <div className="space-y-2">
                              <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">Direct Paybill Details</p>
                              <p className="text-3xl font-normal tracking-[0.2em] text-black" style={{ fontFamily: 'Sora' }}>{schoolInfo?.paybill_no || "754321"}</p>
                              <p className="text-[10px] font-bold text-black uppercase tracking-widest">Account: {selectedStudent?.adm_no}</p>
                           </div>
                           <div className="text-[9px] text-zinc-400 font-medium uppercase tracking-widest leading-relaxed">
                              Follow the M-Pesa instructions on your phone <br /> to complete the bank settlement.
                           </div>
                        </div>
                     )}

                     {selectedMethod === 'SCAN' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                           <div className="aspect-square bg-zinc-50 rounded-2xl relative overflow-hidden border border-zinc-100">
                              {cameraActive ? (
                                 <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover grayscale opacity-80" />
                              ) : (
                                 <div className="absolute inset-0 flex items-center justify-center text-zinc-300 text-[10px] font-bold uppercase tracking-[0.2em]">Lens Offline</div>
                              )}
                              <div className="absolute inset-0 flex items-center justify-center p-8">
                                 <div className="w-full h-full border border-dashed border-zinc-200 rounded-2xl relative">
                                    <p className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white text-zinc-400 px-4 py-2 rounded-xl text-[8px] font-bold uppercase tracking-widest border border-zinc-50">Positioning Slip...</p>
                                 </div>
                              </div>
                           </div>
                           <div className="flex gap-4">
                              <button className="flex-1 h-12 bg-zinc-50 border border-zinc-100 rounded-xl text-[9px] font-bold uppercase tracking-widest">Library</button>
                              <button onClick={() => { toggleCamera(false); setSelectedMethod(''); }} className="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center"><X size={16} /></button>
                           </div>
                        </div>
                     )}

                     {selectedMethod === 'PAYSTACK' && (
                        <div className="space-y-6 animate-in fade-in duration-300 text-center p-8 bg-zinc-50 border border-zinc-100 rounded-3xl">
                           <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Secure Online Payment</p>
                           <p className="text-3xl font-normal tracking-tighter text-black" style={{ fontFamily: 'Sora' }}>{formatCurrency(Number(mpesaForm.amount))}</p>
                           <button
                              onClick={payWithPaystack}
                              className="w-full h-14 bg-blue-600 text-white rounded-2xl font-bold uppercase tracking-widest text-[10px] active:scale-[0.98] transition-all"
                           >
                              Pay via Paystack
                           </button>
                        </div>
                     )}
                  </div>
               </div>

            </div>
         </Modal>

      </div>
   );
};
