import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Table, Button, Badge, Modal } from '../components/UI';
import { Search, Plus, Upload, Save, Trash2, Edit } from 'lucide-react';
import { formatCurrency } from '../utils/utils';

export const FeesManagement: React.FC = () => {
  const { fees, students, addFee, updateFee } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFee, setNewFee] = useState({
    studentId: '',
    type: 'Tuition Fee',
    amount: 0,
    paid: 0,
    date: new Date().toISOString().split('T')[0],
    status: 'UNPAID' as const
  });

  const filteredFees = fees.filter(f => {
    const student = students.find(s => s.id === f.studentId);
    return student?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
           student?.admissionNumber.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleAddFee = (e: React.FormEvent) => {
    e.preventDefault();
    addFee(newFee);
    setIsModalOpen(false);
  };

  const handleApprove = (id: string) => {
    const fee = fees.find(f => f.id === id);
    if (fee) {
      updateFee(id, { paid: fee.amount, status: 'PAID' });
    }
  };

  const handleReverse = (id: string) => {
    const fee = fees.find(f => f.id === id);
    if (!fee) return;
    updateFee(id, { paid: 0, status: 'UNPAID' });
  };

  const handleAdjust = (id: string, delta: number) => {
    const fee = fees.find(f => f.id === id);
    if (!fee) return;
    const nextPaid = Math.max(0, Math.min(fee.amount, fee.paid + delta));
    const nextStatus = nextPaid === 0 ? 'UNPAID' : nextPaid >= fee.amount ? 'PAID' : 'PARTIAL';
    updateFee(id, { paid: nextPaid, status: nextStatus });
  };

  const exportAccountingCsv = () => {
    const rows = ['Student,Admission,Type,VoteHead,Amount,Paid,Balance,Status'];
    filteredFees.forEach(f => {
      const student = students.find(s => s.id === f.studentId);
      rows.push([
        student?.name || '',
        student?.admissionNumber || '',
        f.type,
        f.voteHead || 'Tuition',
        f.amount,
        f.paid,
        f.amount - f.paid,
        f.status,
      ].join(','));
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fees-accounting-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Fees Management</h1>
          <p className="text-gray-500 dark:text-zinc-400">Track collections and approve student payments</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline"><Upload size={18} /> Bulk Import</Button>
          <Button onClick={() => setIsModalOpen(true)}><Plus size={18} /> Record Payment</Button>
        </div>
      </div>

      <Card>
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by student name or admission number..." 
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" onClick={exportAccountingCsv}>Export Accounting CSV</Button>
        </div>

        <Table headers={['Student', 'Type', 'Vote Head', 'Amount', 'Paid', 'Balance', 'Status', 'Actions']}>
          {filteredFees.map(f => {
            const student = students.find(s => s.id === f.studentId);
            const balance = f.amount - f.paid;
            return (
              <tr key={f.id}>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <img src={student?.photo} className="w-8 h-8 rounded-full" />
                    <div>
                      <p className="font-semibold">{student?.name}</p>
                      <p className="text-xs text-gray-500">{student?.admissionNumber}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-sm">{f.type}</td>
                <td className="px-4 py-4 text-sm">{f.voteHead || 'Tuition'}</td>
                <td className="px-4 py-4 font-mono">{formatCurrency(f.amount)}</td>
                <td className="px-4 py-4 font-mono text-emerald-600">{formatCurrency(f.paid)}</td>
                <td className="px-4 py-4 font-mono text-rose-600">{formatCurrency(balance)}</td>
                <td className="px-4 py-4">
                  <Badge variant={f.status === 'PAID' ? 'success' : f.status === 'PARTIAL' ? 'warning' : 'danger'}>
                    {f.status}
                  </Badge>
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    {f.status !== 'PAID' && (
                      <Button 
                        variant="outline" 
                        className="text-xs py-1 px-2 border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                        onClick={() => handleApprove(f.id)}
                      >
                        Approve
                      </Button>
                    )}
                    <Button variant="outline" className="text-xs py-1 px-2" onClick={() => handleAdjust(f.id, 1000)}>+1,000</Button>
                    <Button variant="outline" className="text-xs py-1 px-2" onClick={() => handleAdjust(f.id, -1000)}>-1,000</Button>
                    <Button variant="ghost" className="text-xs py-1 px-2 text-red-500" onClick={() => handleReverse(f.id)}>Reverse</Button>
                    <Button variant="ghost" className="p-2 h-auto"><Edit size={14} /></Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>

      <Card title="Reconciliation Snapshot" subtitle="Quick check for bank/M-Pesa matching">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
            <p className="text-[10px] uppercase text-zinc-400 font-bold">Recorded Payments</p>
            <p className="text-lg font-bold">{formatCurrency(fees.reduce((a, f) => a + f.paid, 0))}</p>
          </div>
          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
            <p className="text-[10px] uppercase text-zinc-400 font-bold">Expected Invoices</p>
            <p className="text-lg font-bold">{formatCurrency(fees.reduce((a, f) => a + f.amount, 0))}</p>
          </div>
          <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
            <p className="text-[10px] uppercase text-zinc-400 font-bold">Unmatched Balance</p>
            <p className="text-lg font-bold text-amber-600">{formatCurrency(fees.reduce((a, f) => a + (f.amount - f.paid), 0))}</p>
          </div>
        </div>
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record New Fee/Payment">
        <form onSubmit={handleAddFee} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-1">Select Student</label>
            <select 
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
              value={newFee.studentId}
              onChange={(e) => setNewFee({ ...newFee, studentId: e.target.value })}
              required
            >
              <option value="">Select a student...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.admissionNumber})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1">Fee Type</label>
            <input 
              type="text" 
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
              value={newFee.type}
              onChange={(e) => setNewFee({ ...newFee, type: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Total Amount</label>
              <input 
                type="number" 
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
                value={newFee.amount}
                onChange={(e) => setNewFee({ ...newFee, amount: Number(e.target.value) })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Amount Paid</label>
              <input 
                type="number" 
                className="w-full p-3 rounded-xl border border-gray-200 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800 outline-none"
                value={newFee.paid}
                onChange={(e) => setNewFee({ ...newFee, paid: Number(e.target.value) })}
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full py-4 mt-4"><Save size={18} /> Save Record</Button>
        </form>
      </Modal>
    </div>
  );
};
