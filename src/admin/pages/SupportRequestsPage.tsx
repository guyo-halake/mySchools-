import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/adminSupabase';
import { useAdminAlert } from '../context/AdminAlertContext';
import { 
  LifeBuoy, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ChevronRight,
  ExternalLink,
  User,
  Building,
  Mail,
  Calendar,
  Monitor
} from 'lucide-react';
import { cn } from '../../utils/utils';

interface SupportRequest {
  id: string;
  user_name: string;
  user_email: string;
  school_name: string;
  school_email: string;
  timestamp: string;
  browser_info: string;
  status: 'PENDING' | 'RESOLVED' | 'IN_PROGRESS';
  error_message: string;
}

export const SupportRequestsPage: React.FC = () => {
  const { showAlert } = useAdminAlert();
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED' | 'IN_PROGRESS'>('ALL');
  const [selectedRequest, setSelectedRequest] = useState<SupportRequest | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    let query = supabase
      .from('support_requests')
      .select('*')
      .order('timestamp', { ascending: false });

    if (filter !== 'ALL') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;

    if (error) {
      showAlert('Failed to fetch support requests', 'Error');
    } else {
      setRequests(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from('support_requests')
      .update({ status })
      .eq('id', id);

    if (error) {
      showAlert('Failed to update status', 'Error');
    } else {
      showAlert(`Request marked as ${status}`, 'Success');
      fetchRequests();
      if (selectedRequest?.id === id) {
        setSelectedRequest(prev => prev ? { ...prev, status: status as any } : null);
      }
    }
  };

  const filteredRequests = requests.filter(r => 
    r.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.school_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.error_message?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white uppercase">Support Center</h1>
          <p className="text-xs text-zinc-500 font-bold uppercase tracking-[0.3em] mt-1">Managed Support & Escalations</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-xl p-1">
            {(['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                  filter === f 
                    ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" 
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                )}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* List View */}
        <div className={cn("space-y-4", selectedRequest ? "lg:col-span-7" : "lg:col-span-12")}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
            <input 
              type="text"
              placeholder="Search by user, school, or issue..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-orange-600/20 transition-all"
            />
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-20 text-center space-y-4">
                <Clock className="mx-auto text-orange-600 animate-spin" size={32} />
                <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Synchronizing Logs...</p>
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <LifeBuoy className="mx-auto text-zinc-200" size={48} />
                <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">No support requests found</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50 dark:divide-zinc-800">
                {filteredRequests.map((request) => (
                  <button
                    key={request.id}
                    onClick={() => setSelectedRequest(request)}
                    className={cn(
                      "w-full text-left p-6 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all group",
                      selectedRequest?.id === request.id && "bg-zinc-50 dark:bg-zinc-800/50"
                    )}
                  >
                    <div className="flex items-center gap-6">
                      <div className={cn(
                        "p-3 rounded-2xl shrink-0",
                        request.status === 'RESOLVED' ? "bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600" :
                        request.status === 'IN_PROGRESS' ? "bg-blue-50 dark:bg-blue-900/10 text-blue-600" :
                        "bg-amber-50 dark:bg-amber-900/10 text-amber-600"
                      )}>
                        {request.status === 'RESOLVED' ? <CheckCircle2 size={20} /> :
                         request.status === 'IN_PROGRESS' ? <Clock size={20} /> :
                         <AlertCircle size={20} />}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-orange-600 transition-colors">
                          {request.school_name}
                        </h3>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">
                          {request.user_name} • {new Date(request.timestamp).toLocaleString()}
                        </p>
                        <p className="text-xs text-zinc-500 mt-2 line-clamp-1 italic">
                          "{request.error_message}"
                        </p>
                      </div>
                    </div>
                    <ChevronRight className={cn(
                      "text-zinc-300 group-hover:text-orange-600 transition-all",
                      selectedRequest?.id === request.id && "translate-x-1 text-orange-600"
                    )} size={20} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail View */}
        {selectedRequest && (
          <div className="lg:col-span-5 animate-in slide-in-from-right duration-500">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-[2rem] p-8 shadow-xl sticky top-8">
              <div className="flex items-center justify-between mb-8">
                <div className={cn(
                  "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em]",
                  selectedRequest.status === 'RESOLVED' ? "bg-emerald-50 text-emerald-600" :
                  selectedRequest.status === 'IN_PROGRESS' ? "bg-blue-50 text-blue-600" :
                  "bg-amber-50 text-amber-600"
                )}>
                  {selectedRequest.status.replace('_', ' ')}
                </div>
                <button 
                  onClick={() => setSelectedRequest(null)}
                  className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg"><Building size={16} className="text-zinc-400" /></div>
                    <div>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">School</p>
                      <p className="text-sm font-bold dark:text-white">{selectedRequest.school_name}</p>
                      <p className="text-[10px] text-zinc-500">{selectedRequest.school_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg"><User size={16} className="text-zinc-400" /></div>
                    <div>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Reported By</p>
                      <p className="text-sm font-bold dark:text-white">{selectedRequest.user_name}</p>
                      <p className="text-[10px] text-zinc-500">{selectedRequest.user_email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg"><Calendar size={16} className="text-zinc-400" /></div>
                    <div>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">Timestamp</p>
                      <p className="text-sm font-bold dark:text-white">{new Date(selectedRequest.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl space-y-3">
                  <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Issue Description</p>
                  <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed italic">
                    "{selectedRequest.error_message}"
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest flex items-center gap-2">
                    <Monitor size={12} /> Browser Environment
                  </p>
                  <div className="p-4 bg-zinc-900 rounded-xl font-mono text-[10px] text-zinc-400 break-all leading-relaxed">
                    {selectedRequest.browser_info || 'No browser info available'}
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-2 gap-3">
                  {selectedRequest.status !== 'RESOLVED' && (
                    <button 
                      onClick={() => updateStatus(selectedRequest.id, 'RESOLVED')}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[0.98] transition-all"
                    >
                      <CheckCircle2 size={14} /> Resolve
                    </button>
                  )}
                  {selectedRequest.status === 'PENDING' && (
                    <button 
                      onClick={() => updateStatus(selectedRequest.id, 'IN_PROGRESS')}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[10px] font-black uppercase tracking-widest rounded-xl hover:scale-[0.98] transition-all"
                    >
                      <Clock size={14} /> Start
                    </button>
                  )}
                  {selectedRequest.status === 'RESOLVED' && (
                    <button 
                      onClick={() => updateStatus(selectedRequest.id, 'PENDING')}
                      className="col-span-2 flex items-center justify-center gap-2 px-4 py-3 border border-zinc-200 dark:border-zinc-700 text-zinc-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-zinc-50 transition-all"
                    >
                      <RefreshCw size={14} /> Reopen Request
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Sub-components used
const X = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
);

const RefreshCw = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
);
