import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import { 
  CloudUpload, 
  Search, 
  Download,
  ChevronDown,
  CheckCircle,
  History,
  BookOpen,
  ChevronRight,
  Edit2,
  PauseCircle,
  X,
  Loader2
} from 'lucide-react';
import { Button, Card, Badge } from '../components/UI';
import { toast } from 'react-hot-toast';
import { cn } from '../utils/utils';
import * as XLSX from 'xlsx';

export const SubmissionsUpload: React.FC = () => {
  const { user } = useAuth();
  const { schoolInfo } = useApp();
  const [loading, setLoading] = useState(true);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'BUNDLES' | 'PREVIOUS'>('BUNDLES');
  const [expandedBundle, setExpandedBundle] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [processingIds, setProcessingIds] = useState<string[]>([]);
  
  useEffect(() => {
    fetchSubmissions();
  }, [user, schoolInfo]);

  const fetchSubmissions = async () => {
    if (!user?.school_id) return;
    try {
      setLoading(true);
      const data = await api.getResultsWorkflow({ schoolId: user.school_id });
      setSubmissions(data || []);
    } catch (err) {
      console.error('Fetch Error:', err);
      toast.error('Failed to sync submissions');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = [['ADM NO', 'STUDENT NAME', 'SUBJECT', 'EXAM NAME', 'MARKS']];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(headers);
    XLSX.utils.book_append_sheet(wb, ws, "Results Template");
    XLSX.writeFile(wb, "results_upload_template.xlsx");
    toast.success('Excel template downloaded');
  };

  const handleUpdateStatus = async (ids: string[], status: string, label: string) => {
    try {
      setProcessingIds(prev => [...prev, ...ids]);
      await api.updateWorkflowStatus(ids, { status });
      toast.success(`${label} successfully`);
      await fetchSubmissions();
    } catch (err: any) {
      console.error(`${label} Error:`, err);
      toast.error(err.message || `Failed to ${label.toLowerCase()}`);
    } finally {
      setProcessingIds(prev => prev.filter(id => !ids.includes(id)));
    }
  };

  const handleEditMark = async (id: string, currentMarks: number) => {
    const newMark = prompt('Enter new marks (0-100):', currentMarks.toString());
    if (newMark === null) return;
    const marks = parseInt(newMark);
    if (isNaN(marks) || marks < 0 || marks > 100) {
      toast.error('Invalid marks');
      return;
    }
    try {
      setProcessingIds(prev => [...prev, id]);
      await api.updateWorkflowStatus([id], { marks });
      toast.success('Marks updated');
      await fetchSubmissions();
    } catch (err: any) {
      console.error('Edit Error:', err);
      toast.error(err.message || 'Failed to update marks');
    } finally {
      setProcessingIds(prev => prev.filter(i => i !== id));
    }
  };

  const getBundles = (status: string) => {
    const groups: Record<string, any> = {};
    submissions.filter(s => s.status === status).forEach(s => {
      const key = `${s.term_id}-${s.exam_name}-${s.stream_id}-${s.subject_id}`;
      if (!groups[key]) {
        groups[key] = {
          id: key,
          subject: s.subject?.name || 'Unknown',
          subjectAbbr: s.subject?.name?.substring(0, 3).toUpperCase() || 'UNK',
          class: s.stream?.class?.name ? `${s.stream.class.name} ${s.stream.name || ''}` : (s.stream?.name || 'Unknown Class'),
          term: s.term?.name || 'Current Term',
          year: s.term?.year || '',
          exam: s.exam_name,
          count: 0,
          items: [],
          ids: []
        };
      }
      groups[key].count++;
      groups[key].items.push(s);
      groups[key].ids.push(s.id);
    });
    return Object.values(groups);
  };

  const pendingBundles = useMemo(() => getBundles('SUBMITTED'), [submissions]);
  const previousBundles = useMemo(() => getBundles('PUBLISHED'), [submissions]);

  const filteredSubmissions = submissions.filter(s => {
    if (activeTab === 'PENDING') return s.status === 'SUBMITTED';
    if (activeTab === 'APPROVED') return s.status === 'PUBLISHED';
    return false;
  });

  return (
    <div className="w-full max-w-[1600px] mx-auto py-10 px-6 lg:px-12 space-y-12 animate-in fade-in duration-500">
      {/* Readable Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-zinc-900 dark:text-white uppercase">Results upload approvals</h1>
        <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">{user?.full_name}</p>
      </div>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
        <div className="flex gap-1.5 bg-zinc-100/50 dark:bg-zinc-800/50 p-1.5 rounded-2xl w-fit">
          {['BUNDLES', 'PREVIOUS', 'PENDING', 'APPROVED'].map((tab) => (
            <button 
              key={tab}
              onClick={() => { setActiveTab(tab as any); setExpandedBundle(null); }}
              className={cn(
                "px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-xl transition-all",
                activeTab === tab 
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              {tab.replace('PREVIOUS', 'PREV BUNDLES').replace('APPROVED', 'PUBLISHED')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="text-xs h-10 px-6 rounded-xl border-zinc-200 dark:border-zinc-800 font-bold uppercase tracking-wide"
            onClick={handleDownloadTemplate}
          >
            <Download size={14} className="mr-2" /> Template
          </Button>
          <Button className="text-xs h-10 px-6 rounded-xl bg-zinc-900 text-white font-bold uppercase tracking-wide">
            <CloudUpload size={14} className="mr-2" /> Upload
          </Button>
        </div>
      </div>

      {/* Accordion View */}
      {(activeTab === 'BUNDLES' || activeTab === 'PREVIOUS') ? (
        <div className="space-y-5">
          {loading ? (
            <div className="py-20 text-center">
              <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          ) : (activeTab === 'BUNDLES' ? pendingBundles : previousBundles).length === 0 ? (
            <div className="py-12 text-center">
               <p className="text-sm text-zinc-400 font-medium uppercase tracking-widest">No bundles found</p>
            </div>
          ) : (
            (activeTab === 'BUNDLES' ? pendingBundles : previousBundles).map((bundle: any) => (
              <div key={bundle.id} className="space-y-3">
                <Card 
                  className={cn(
                    "p-6 rounded-3xl border-zinc-100 dark:border-zinc-800 hover:border-zinc-900 dark:hover:border-white transition-all cursor-pointer bg-white dark:bg-zinc-900/50 shadow-sm",
                    expandedBundle === bundle.id && "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-900 dark:border-white"
                  )}
                  onClick={() => setExpandedBundle(expandedBundle === bundle.id ? null : bundle.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-8">
                      <div className="space-y-1">
                        <h3 className="text-base font-black text-zinc-900 dark:text-white uppercase tracking-tight">
                          {bundle.subject}
                        </h3>
                        <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-[0.1em]">
                          {bundle.class}
                        </p>
                      </div>
                      <div className="h-10 w-px bg-zinc-200 dark:bg-zinc-800" />
                      <div className="space-y-1">
                        <p className="text-[11px] font-black text-zinc-900 dark:text-white uppercase tracking-widest">
                          Exam: <span className="text-zinc-500 font-bold">{bundle.exam}</span>
                        </p>
                        <p className="text-[11px] font-bold text-zinc-400 uppercase">
                          {bundle.term} {bundle.year}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-10">
                      <div className="text-right">
                        <p className="text-xs font-black text-zinc-900 dark:text-white uppercase tracking-widest">
                          {bundle.count} <span className="text-zinc-400">Records</span>
                        </p>
                        <p className={cn(
                          "text-[10px] font-black uppercase tracking-wider",
                          activeTab === 'BUNDLES' ? "text-amber-600" : "text-emerald-600"
                        )}>
                          {activeTab === 'BUNDLES' ? 'Awaiting Approval' : 'Successfully Published'}
                        </p>
                      </div>
                      <ChevronDown size={18} className={cn("text-zinc-400 transition-transform duration-300", expandedBundle === bundle.id && "rotate-180")} />
                    </div>
                  </div>
                </Card>

                {/* Expanded Downwards List */}
                {expandedBundle === bundle.id && (
                  <Card className="rounded-[2.5rem] border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden animate-in slide-in-from-top-4 duration-300 shadow-xl">
                    <div className="p-10 space-y-8">
                      {/* Search and Bulk Approve */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="w-full sm:w-[400px] flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800 px-5 py-3 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                           <Search className="text-zinc-400" size={16} />
                           <input 
                            type="text" 
                            placeholder="Search student or admission number..."
                            className="bg-transparent border-none text-[13px] font-bold outline-none w-full"
                            value={studentSearch}
                            onChange={(e) => setStudentSearch(e.target.value)}
                           />
                        </div>
                        {activeTab === 'BUNDLES' && (
                          <Button 
                            disabled={bundle.ids.some((id: string) => processingIds.includes(id))}
                            onClick={(e) => { e.stopPropagation(); handleUpdateStatus(bundle.ids, 'APPROVED', 'Approved All'); }}
                            className="w-full sm:w-auto h-12 px-10 text-[11px] font-black uppercase tracking-[0.1em] bg-zinc-900 text-white rounded-2xl hover:bg-black transition-all flex gap-3 items-center justify-center shadow-lg shadow-zinc-200 dark:shadow-none"
                          >
                            {bundle.ids.some((id: string) => processingIds.includes(id)) ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <CheckCircle size={18} />
                            )}
                            Approve Entire Bundle
                          </Button>
                        )}
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="border-b border-zinc-100 dark:border-zinc-800">
                              <th className="pb-5 text-[11px] font-black text-zinc-400 uppercase tracking-widest">Student Information</th>
                              <th className="pb-5 text-[11px] font-black text-zinc-400 uppercase tracking-widest text-center">Subj</th>
                              <th className="pb-5 text-[11px] font-black text-zinc-400 uppercase tracking-widest text-center">Marks</th>
                              <th className="pb-5 text-[11px] font-black text-zinc-400 uppercase tracking-widest text-center">Grade</th>
                              <th className="pb-5 text-[11px] font-black text-zinc-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                            {bundle.items
                              .filter((s: any) => 
                                s.student?.profile?.full_name?.toLowerCase().includes(studentSearch.toLowerCase()) || 
                                s.student?.adm_no?.includes(studentSearch)
                              )
                              .map((item: any) => (
                              <tr key={item.id} className="group/row">
                                <td className="py-5">
                                  <p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">{item.student?.profile?.full_name}</p>
                                  <p className="text-[11px] font-bold text-zinc-400 uppercase mt-0.5">{item.student?.adm_no}</p>
                                </td>
                                <td className="py-5 text-center text-xs font-bold text-zinc-500 uppercase">{bundle.subjectAbbr}</td>
                                <td className="py-5 text-center text-sm font-black text-zinc-900 dark:text-white">{item.marks}</td>
                                <td className="py-5 text-center">
                                  <Badge variant="neutral" className="text-[10px] font-black px-3 py-1">{item.grade || 'N/A'}</Badge>
                                </td>
                                <td className="py-5 text-right">
                                  <div className="flex items-center justify-end gap-3 transition-all">
                                    <button 
                                      disabled={processingIds.includes(item.id)}
                                      onClick={(e) => { e.stopPropagation(); handleUpdateStatus([item.id], 'APPROVED', 'Result Approved'); }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-emerald-50 text-emerald-600 rounded-xl transition-all border border-transparent hover:border-emerald-100 disabled:opacity-50"
                                      title="Approve"
                                    >
                                      {processingIds.includes(item.id) ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                      <span className="text-[10px] font-black uppercase tracking-tight">Approve</span>
                                    </button>
                                    <button 
                                      disabled={processingIds.includes(item.id)}
                                      onClick={(e) => { e.stopPropagation(); handleUpdateStatus([item.id], 'ON_HOLD', 'Result Put on Hold'); }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-amber-50 text-amber-600 rounded-xl transition-all border border-transparent hover:border-amber-100 disabled:opacity-50"
                                      title="Hold"
                                    >
                                      {processingIds.includes(item.id) ? <Loader2 size={16} className="animate-spin" /> : <PauseCircle size={16} />}
                                      <span className="text-[10px] font-black uppercase tracking-tight">Hold</span>
                                    </button>
                                    <button 
                                      disabled={processingIds.includes(item.id)}
                                      onClick={(e) => { e.stopPropagation(); handleEditMark(item.id, item.marks); }}
                                      className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-blue-50 text-blue-600 rounded-xl transition-all border border-transparent hover:border-blue-100 disabled:opacity-50"
                                      title="Edit"
                                    >
                                      {processingIds.includes(item.id) ? <Loader2 size={16} className="animate-spin" /> : <Edit2 size={16} />}
                                      <span className="text-[10px] font-black uppercase tracking-tight">Edit</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            ))
          )}
        </div>
      ) : (
        <Card className="rounded-[2.5rem] border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden bg-white dark:bg-zinc-900/50">
          <div className="px-10 py-6 border-b border-zinc-50 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/20">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">
              {activeTab === 'PENDING' ? 'Awaiting Review' : 'Published Ledger'}
            </h3>
            <div className="flex items-center gap-3 bg-zinc-50 dark:bg-zinc-800 px-5 py-2.5 rounded-2xl border border-zinc-100 dark:border-zinc-800">
              <Search className="text-zinc-400" size={16} />
              <input 
                type="text" 
                placeholder="Search..."
                className="bg-transparent border-none text-[11px] font-bold outline-none w-48"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-20 text-center">
                <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : filteredSubmissions.length === 0 ? (
              <div className="py-24 text-center">
                <p className="text-xs text-zinc-300 font-black uppercase tracking-widest">No records found</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-zinc-50/30 dark:bg-zinc-800/20">
                    <th className="px-10 py-5 text-[11px] font-black text-zinc-400 uppercase tracking-widest">Student</th>
                    <th className="px-10 py-5 text-[11px] font-black text-zinc-400 uppercase tracking-widest">Subject</th>
                    <th className="px-10 py-5 text-[11px] font-black text-zinc-400 uppercase tracking-widest">Exam</th>
                    <th className="px-10 py-5 text-[11px] font-black text-zinc-400 uppercase tracking-widest text-center">Marks</th>
                    <th className="px-10 py-5 text-[11px] font-black text-zinc-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50 dark:divide-zinc-800">
                  {filteredSubmissions.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-800/10 transition-all">
                      <td className="px-10 py-6">
                        <p className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-tight">{item.student?.profile?.full_name}</p>
                        <p className="text-[11px] font-bold text-zinc-400 uppercase mt-0.5">{item.student?.adm_no}</p>
                      </td>
                      <td className="px-10 py-6">
                         <span className="text-[10px] font-black px-3 py-1 bg-zinc-50 dark:bg-zinc-800 rounded-xl uppercase border border-zinc-100 dark:border-zinc-800">{item.subject?.name}</span>
                      </td>
                      <td className="px-10 py-6">
                        <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">{item.exam_name}</p>
                      </td>
                      <td className="px-10 py-6 text-center font-black text-sm">{item.marks}</td>
                      <td className="px-10 py-6 text-right">
                        <ChevronRight size={18} className="ml-auto text-zinc-300" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
