import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Card, Table, Badge, Button } from '../components/UI';
import { CreditCard, Download, ExternalLink, Smartphone } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils/utils';

export const Fees: React.FC = () => {
  const { user } = useAuth();
  const { fees, students } = useApp();

  const student = user?.studentId ? students.find(s => s.id === user.studentId) : null;
  const studentFees = student ? fees.filter(f => f.studentId === student.id) : [];

  const totalAmount = studentFees.reduce((acc, f) => acc + f.amount, 0);
  const totalPaid = studentFees.reduce((acc, f) => acc + f.paid, 0);
  const balance = totalAmount - totalPaid;

  const overdueFees = studentFees.filter(f => f.dueDate && new Date(f.dueDate) < new Date() && f.paid < f.amount);
  const penalties = overdueFees.reduce((acc, f) => acc + Math.round((f.amount - f.paid) * 0.05), 0);

  const downloadReceiptAsPdf = (feeId: string) => {
    const fee = studentFees.find(f => f.id === feeId);
    if (!fee || !student) return;
    const receiptHtml = `
      <html>
        <head><title>Receipt ${fee.receiptNumber || fee.id}</title></head>
        <body style="font-family: Arial, sans-serif; padding: 24px;">
          <h2>School Fees Receipt</h2>
          <p><strong>Receipt No:</strong> ${fee.receiptNumber || fee.id}</p>
          <p><strong>Student:</strong> ${student.name} (${student.admissionNumber})</p>
          <p><strong>Vote Head:</strong> ${fee.voteHead || 'Tuition'}</p>
          <p><strong>Amount Paid:</strong> ${formatCurrency(fee.paid)}</p>
          <p><strong>Date:</strong> ${formatDate(fee.date)}</p>
          <p>Use browser Print and select Save as PDF.</p>
        </body>
      </html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(receiptHtml);
      win.document.close();
      win.focus();
      win.print();
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">School Fees</h1>
          <p className="text-gray-500 dark:text-zinc-400">Manage your fee statements and payments</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline"><Download size={18} /> Statement</Button>
          <Button><CreditCard size={18} /> Pay Now</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-white dark:bg-zinc-900" title="Total Invoiced" icon={CreditCard}>
          <p className="text-3xl font-bold">{formatCurrency(totalAmount)}</p>
          <p className="text-xs text-gray-500 mt-2">Academic Year 2024</p>
        </Card>
        <Card className="bg-white dark:bg-zinc-900" title="Total Paid" icon={CreditCard}>
          <p className="text-3xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
          <p className="text-xs text-emerald-500 font-bold mt-2">{(totalPaid/totalAmount * 100).toFixed(1)}% Cleared</p>
        </Card>
        <Card className="bg-rose-50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/20" title="Outstanding Balance">
          <p className="text-3xl font-bold text-rose-600">{formatCurrency(balance + penalties)}</p>
          <p className="text-xs text-rose-500 font-bold mt-2">Includes penalties: {formatCurrency(penalties)}</p>
        </Card>
      </div>

      <Card title="Payment Alerts" subtitle="Due dates, reminders, and installment planning">
        <div className="space-y-2 text-sm">
          {overdueFees.length === 0 && <p className="text-emerald-600 font-medium">No overdue fee items.</p>}
          {overdueFees.map(f => (
            <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-amber-50 dark:bg-amber-900/10">
              <span>{f.type} overdue since {formatDate(f.dueDate || f.date)}</span>
              <span className="font-bold text-amber-700">Penalty +{formatCurrency(Math.round((f.amount - f.paid) * 0.05))}</span>
            </div>
          ))}
          <p className="text-xs text-zinc-500">Installment plan suggestion: split outstanding balance into 3 monthly payments.</p>
        </div>
      </Card>

      <Card title="Fee Statements" subtitle="Detailed history of all charges and payments">
        <Table headers={['Date', 'Description', 'Vote Head', 'Amount', 'Paid', 'Balance', 'Status', 'Receipt']}>
          {studentFees.map(f => (
            <tr key={f.id}>
              <td className="px-4 py-4 text-sm text-gray-500">{formatDate(f.date)}</td>
              <td className="px-4 py-4 font-semibold">{f.type}</td>
              <td className="px-4 py-4 text-sm">{f.voteHead || 'Tuition'}</td>
              <td className="px-4 py-4 font-mono">{formatCurrency(f.amount)}</td>
              <td className="px-4 py-4 font-mono text-emerald-600">{formatCurrency(f.paid)}</td>
              <td className="px-4 py-4 font-mono text-rose-600">{formatCurrency(f.amount - f.paid)}</td>
              <td className="px-4 py-4">
                <Badge variant={f.status === 'PAID' ? 'success' : f.status === 'PARTIAL' ? 'warning' : 'danger'}>
                  {f.status}
                </Badge>
              </td>
              <td className="px-4 py-4">
                {f.paid > 0 && (
                  <Button variant="ghost" className="p-2 h-auto text-blue-600" onClick={() => downloadReceiptAsPdf(f.id)}><Download size={14} /></Button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card title="Payment Methods" icon={Smartphone}>
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-bold">M</div>
                <div>
                  <p className="font-bold">M-Pesa Paybill</p>
                  <p className="text-xs text-gray-500">Business No: 123456</p>
                </div>
              </div>
              <Button variant="outline" className="text-xs py-1 px-3">Pay via M-Pesa</Button>
            </div>
            <div className="p-4 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">B</div>
                <div>
                  <p className="font-bold">Bank Transfer</p>
                  <p className="text-xs text-gray-500">KCB Bank - Acc: 987654321</p>
                </div>
              </div>
              <Button variant="outline" className="text-xs py-1 px-3">Pay via Bank</Button>
            </div>
          </div>
        </Card>

        <Card title="Need Help?" icon={ExternalLink}>
          <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">
            If you have any questions regarding your fee statement or would like to discuss a payment plan, please contact the accounts office.
          </p>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Accounts Office:</span>
              <span className="font-bold">+254 700 000 000</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Email:</span>
              <span className="font-bold">accounts@schoolportal.com</span>
            </div>
          </div>
          <Button className="w-full mt-6" variant="secondary">Message Accounts Office</Button>
        </Card>
      </div>
    </div>
  );
};
