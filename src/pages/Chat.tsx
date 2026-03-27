import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button, Modal, Badge } from '../components/UI';
import { 
  MessageSquare, 
  Phone, 
  ExternalLink, 
  Users, 
  Mail, 
  MapPin, 
  Calendar, 
  User as UserIcon,
  Search,
  TrendingUp,
  CreditCard,
  AlertTriangle,
  GraduationCap
} from 'lucide-react';
import { Student } from '../types';
import { cn } from '../utils/utils';

export const Chat: React.FC = () => {
  const { students, classes, results, fees, suspensions, teachers, getStudentRank } = useApp();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showContacts, setShowContacts] = useState(false);
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState('progress');
  const [chatLogs, setChatLogs] = useState<{ studentId: string; timestamp: string; channel: string; template: string }[]>([]);

  const templates: Record<string, string> = {
    progress: 'Hello parent, this is your class teacher. I would like to discuss your child\'s academic progress.',
    discipline: 'Hello parent, this is your class teacher. Please contact school regarding a discipline concern.',
    fees: 'Hello parent, this is the accounts office. Kindly review the pending fee balance and contact us for a payment plan.',
  };

  const handleWhatsApp = (phone: string, message: string) => {
    if (!consentConfirmed) return;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const maskPhone = (phone: string) => `${phone.slice(0, 4)}*****${phone.slice(-3)}`;

  const logCommunication = (studentId: string, template: string) => {
    setChatLogs(prev => [{ studentId, timestamp: new Date().toISOString(), channel: 'WHATSAPP', template }, ...prev].slice(0, 20));
  };

  const getClassName = (classId: string) => {
    return classes.find(c => c.id === classId)?.name || 'Unknown Class';
  };

  const getTeacherName = (teacherId: string) => {
    return teachers.find(t => t.id === teacherId)?.name || 'Unknown Teacher';
  };

  const getStudentStats = (studentId: string) => {
    const studentResults = results.filter(r => r.studentId === studentId);
    const studentFees = fees.filter(f => f.studentId === studentId);
    const studentSuspensions = suspensions.filter(s => s.studentId === studentId && s.status === 'ACTIVE');

    const avgMarks = studentResults.length > 0 
      ? studentResults.reduce((acc, r) => acc + r.marks, 0) / studentResults.length 
      : 0;
    
    const feeBalance = studentFees.reduce((acc, f) => acc + (f.amount - f.paid), 0);
    
    const meanGrade = avgMarks >= 80 ? 'A' : avgMarks >= 70 ? 'B' : avgMarks >= 60 ? 'C' : avgMarks >= 50 ? 'D' : 'E';

    const rank = getStudentRank(studentId, 'Term 3', 2024);

    return { avgMarks, meanGrade, feeBalance, activeSuspensions: studentSuspensions.length, rank };
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.admissionNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.guardianName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Chat Parents</h1>
          <p className="text-gray-500 dark:text-zinc-400">Communicate directly with parents via WhatsApp</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={consentConfirmed} onChange={(e) => setConsentConfirmed(e.target.checked)} />
            Consent/compliance confirmed
          </label>
          <button className="text-emerald-600 font-medium" onClick={() => setShowContacts(v => !v)}>
            {showContacts ? 'Mask Contacts' : 'Show Contacts'}
          </button>
        </div>
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
          <input 
            type="text"
            placeholder="Search student or parent..."
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-emerald-600 text-white border-none flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <Users size={24} />
              </div>
              <h3 className="text-xl font-bold">Class Group</h3>
            </div>
            <p className="text-emerald-100 text-sm mb-6">Send an update to all parents in your assigned class.</p>
          </div>
          <Button 
            className="w-full bg-white text-emerald-600 hover:bg-emerald-50"
            onClick={() => handleWhatsApp('254700000000', templates[messageTemplate])}
          >
            <MessageSquare size={18} /> Open Group Chat
          </Button>
        </Card>

        {filteredStudents.slice(0, 20).map(s => (
          <Card 
            key={s.id} 
            className="hover:border-emerald-200 transition-all cursor-pointer group"
            onClick={() => setSelectedStudent(s)}
          >
            <div className="flex items-center gap-4 mb-6">
              <img src={s.photo} className="w-12 h-12 rounded-full border border-gray-100 group-hover:scale-105 transition-transform" />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold truncate">{s.name}</h4>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">{getClassName(s.classId)} • {s.admissionNumber}</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px] text-gray-500 mb-2">
                <span>Parent: <span className="font-bold text-gray-700 dark:text-gray-300">{s.guardianName}</span></span>
              </div>
                    <div className="text-[10px] text-zinc-500">
                      Contact: {showContacts ? `+${s.parentPhone}` : maskPhone(s.parentPhone)}
                    </div>
                    <select className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700 rounded px-2 py-1 text-[10px]" value={messageTemplate} onChange={(e) => setMessageTemplate(e.target.value)}>
                      <option value="progress">Progress Update</option>
                      <option value="discipline">Discipline Follow-up</option>
                      <option value="fees">Fees Reminder</option>
                    </select>
              <Button 
                variant="outline" 
                className="w-full border-emerald-100 text-emerald-600 hover:bg-emerald-50 h-9 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                        handleWhatsApp(s.parentPhone, `${templates[messageTemplate]} Student: ${s.name}.`);
                        logCommunication(s.id, messageTemplate);
                }}
              >
                <Phone size={14} /> WhatsApp Parent
              </Button>
              <Button 
                variant="ghost" 
                className="w-full text-[10px] h-8 text-gray-400 hover:text-emerald-600"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedStudent(s);
                }}
              >
                <ExternalLink size={12} /> View Detailed Profile
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 dark:bg-zinc-800 rounded-full flex items-center justify-center text-gray-400 mx-auto mb-4">
            <Search size={32} />
          </div>
          <p className="text-gray-500 dark:text-zinc-400">No students found matching "{searchQuery}"</p>
        </div>
      )}

      <Modal 
        isOpen={!!selectedStudent} 
        onClose={() => setSelectedStudent(null)} 
        title="Student Detailed Profile"
      >
        {selectedStudent && (
          <div className="space-y-6">
            <div className="flex items-center gap-5 p-5 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100/50 dark:border-emerald-800/20">
              <img src={selectedStudent.photo} className="w-20 h-20 rounded-2xl border-2 border-white dark:border-zinc-800 shadow-md object-cover" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xl font-bold">{selectedStudent.name}</h3>
                  <Badge variant="info" className="text-[10px]">{selectedStudent.admissionNumber}</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400 font-semibold">
                  <GraduationCap size={16} />
                  <span>{getClassName(selectedStudent.classId)}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Class Teacher: {getTeacherName(selectedStudent.teacherId)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(() => {
                const stats = getStudentStats(selectedStudent.id);
                return (
                  <>
                    <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl text-center border border-gray-100 dark:border-zinc-800">
                      <TrendingUp size={14} className="mx-auto mb-1 text-blue-500" />
                      <p className="text-[8px] uppercase font-bold text-gray-400">Mean Grade</p>
                      <p className="text-lg font-bold text-blue-600">{stats.meanGrade}</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl text-center border border-gray-100 dark:border-zinc-800">
                      <CreditCard size={14} className="mx-auto mb-1 text-orange-500" />
                      <p className="text-[8px] uppercase font-bold text-gray-400">Fee Balance</p>
                      <p className={cn("text-sm font-bold", stats.feeBalance > 0 ? "text-rose-500" : "text-emerald-500")}>
                        {stats.feeBalance > 0 ? `Ksh ${stats.feeBalance.toLocaleString()}` : 'Cleared'}
                      </p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl text-center border border-gray-100 dark:border-zinc-800">
                      <TrendingUp size={14} className="mx-auto mb-1 text-emerald-500 rotate-90" />
                      <p className="text-[8px] uppercase font-bold text-gray-400">Class Rank</p>
                      <p className="text-sm font-bold text-emerald-600">{stats.rank.classRank}/{stats.rank.classTotal}</p>
                    </div>
                    <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl text-center border border-gray-100 dark:border-zinc-800">
                      <TrendingUp size={14} className="mx-auto mb-1 text-purple-500" />
                      <p className="text-[8px] uppercase font-bold text-gray-400">Form Rank</p>
                      <p className="text-sm font-bold text-purple-600">{stats.rank.formRank}/{stats.rank.formTotal}</p>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border border-gray-100 dark:border-zinc-800 rounded-2xl space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-50 dark:border-zinc-800 pb-2">Guardian Information</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                      <UserIcon size={14} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-gray-400 leading-none mb-0.5">Name</p>
                      <p className="font-medium">{selectedStudent.guardianName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                      <Mail size={14} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-gray-400 leading-none mb-0.5">Email</p>
                      <p className="font-medium truncate">{selectedStudent.parentEmail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                      <Phone size={14} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-gray-400 leading-none mb-0.5">Phone</p>
                      <p className="font-medium">+{selectedStudent.parentPhone}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border border-gray-100 dark:border-zinc-800 rounded-2xl space-y-3">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-50 dark:border-zinc-800 pb-2">Personal Details</h4>
                <div className="space-y-2.5">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                      <Calendar size={14} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-gray-400 leading-none mb-0.5">Date of Birth</p>
                      <p className="font-medium">{selectedStudent.dateOfBirth}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                      <MapPin size={14} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] text-gray-400 leading-none mb-0.5">Residential Address</p>
                      <p className="font-medium text-xs leading-relaxed">{selectedStudent.address}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-6 rounded-2xl"
                onClick={() => {
                  handleWhatsApp(selectedStudent.parentPhone, `${templates[messageTemplate]} Student: ${selectedStudent.name}.`);
                  logCommunication(selectedStudent.id, messageTemplate);
                }}
              >
                <MessageSquare size={18} /> Chat with Parent
              </Button>
              <Button variant="outline" className="px-6 rounded-2xl" onClick={() => setSelectedStudent(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Card title="Communication Log" subtitle="Recent parent contacts for compliance tracking">
        <div className="space-y-2 text-xs">
          {chatLogs.length === 0 && <p className="text-zinc-500">No communication logs yet.</p>}
          {chatLogs.map((log, idx) => {
            const student = students.find(s => s.id === log.studentId);
            return (
              <div key={`${log.studentId}-${idx}`} className="flex items-center justify-between p-2 rounded bg-gray-50 dark:bg-zinc-800/40">
                <span>{student?.name || 'Student'} • {log.template}</span>
                <span className="text-zinc-400">{new Date(log.timestamp).toLocaleString()}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
