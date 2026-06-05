
const TeacherView = ({ user }: any) => {
  const [allStreams, setAllStreams] = useState<any[]>([]);
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(localStorage.getItem('teacher_stream_id'));
  const [students, setStudents] = useState<any[]>([]);
  const [cbcStats, setCbcStats] = useState({ EE: 0, ME: 0, AE: 0, BE: 0, total: 0 });
  const [pendingProjects, setPendingProjects] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('operations');
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [meanInput, setMeanInput] = useState('');
  const [targetInput, setTargetInput] = useState('');
  const [savingTarget, setSavingTarget] = useState(false);
  const [performanceTrend, setPerformanceTrend] = useState<any[]>([]);
  const [activeGraphTab, setActiveGraphTab] = useState<'trends'|'subjects'>('trends');

  const selectedStream = allStreams.find(s => s.id === selectedStreamId);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const name = user.full_name?.split(' ')[0] || 'Teacher';

  useEffect(() => {
    if (selectedStreamId) localStorage.setItem('teacher_stream_id', selectedStreamId);
  }, [selectedStreamId]);

  const hydrate = async () => {
    if (!user.school_id) return;
    setIsLoading(true);
    try {
      const [streamRows, apps, notifs] = await Promise.all([
        api.getTeacherStreams(user.id, user.school_id),
        api.getAppointmentsByTeacher(user.id),
        api.getNotifications(user.id),
      ]);
      setAllStreams(streamRows);
      setAppointments(apps || []);
      setNotifications(notifs || []);
      if (!selectedStreamId && streamRows.length > 0) setSelectedStreamId(streamRows[0].id);
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { hydrate(); }, [user.id]);

  useEffect(() => {
    if (!selectedStreamId || !user.school_id) return;
    const load = async () => {
      try {
        const studs = await api.getStudentsByStream(selectedStreamId);
        setStudents(studs || []);

        if (studs && studs.length > 0) {
          const studentIds = studs.map((s: any) => s.id);
          const { data: assessments } = await supabase
            .from('cbc_student_assessments')
            .select('student_id, rating')
            .eq('school_id', user.school_id)
            .in('student_id', studentIds);

          const stats = { EE: 0, ME: 0, AE: 0, BE: 0, total: studs.length };
          const lastRating: Record<string, string> = {};
          (assessments || []).forEach((a: any) => { lastRating[a.student_id] = a.rating; });
          Object.values(lastRating).forEach((r: any) => { if (stats[r as keyof typeof stats] !== undefined) stats[r as keyof typeof stats]++; });
          setCbcStats(stats);

          const { data: trend } = await supabase
            .from('cbc_student_assessments')
            .select('rating, created_at')
            .eq('school_id', user.school_id)
            .in('student_id', studentIds)
            .order('created_at', { ascending: true });

          const byMonth: Record<string, { EE: number; ME: number; total: number }> = {};
          (trend || []).forEach((a: any) => {
            const m = new Date(a.created_at).toLocaleString('default', { month: 'short' });
            if (!byMonth[m]) byMonth[m] = { EE: 0, ME: 0, total: 0 };
            byMonth[m].total++;
            if (a.rating === 'EE') byMonth[m].EE++;
            if (a.rating === 'ME') byMonth[m].ME++;
          });
          setPerformanceTrend(Object.entries(byMonth).map(([name, v]) => ({ name, EE: v.EE, ME: v.ME, total: v.total })));
        }

        const { data: projects } = await supabase
          .from('cbc_projects')
          .select('id, title, due_date, learning_area:learning_areas(name)')
          .eq('school_id', user.school_id)
          .order('due_date', { ascending: true })
          .limit(5);
        setPendingProjects(projects || []);
      } catch (e) { console.error(e); }
    };
    load();
  }, [selectedStreamId, user.school_id]);

  const saveTargetSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStreamId) return;
    setSavingTarget(true);
    try {
      const { error } = await supabase.from('streams').update({
        ...(meanInput ? { main_mean_score: Number(meanInput) } : {}),
        ...(targetInput ? { target_mean_score: Number(targetInput) } : {}),
      }).eq('id', selectedStreamId);
      if (error) throw error;
      toast.success('Targets saved!');
      setShowTargetModal(false);
      hydrate();
    } catch { toast.error('Failed to save'); }
    finally { setSavingTarget(false); }
  };

  const updateAppStatus = async (id: string, status: string) => {
    try {
      await api.updateAppointmentStatus(id, status);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      toast.success(`Appointment ${status}`);
    } catch { toast.error('Failed'); }
  };

  const eePercent = cbcStats.total > 0 ? Math.round((cbcStats.EE / cbcStats.total) * 100) : 0;
  const bePercent = cbcStats.total > 0 ? Math.round((cbcStats.BE / cbcStats.total) * 100) : 0;
  const mePercent = cbcStats.total > 0 ? Math.round((cbcStats.ME / cbcStats.total) * 100) : 0;

  if (isLoading) return (
    <div className="space-y-6 p-8 animate-pulse">
      <div className="h-8 w-64 bg-zinc-100 rounded-xl" />
      <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-24 bg-zinc-50 rounded-2xl" />)}</div>
      <div className="h-64 bg-zinc-50 rounded-2xl" />
    </div>
  );

  return (
    <div className="w-full flex flex-col gap-0 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="px-6 pt-4 pb-0 border-b border-zinc-100">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 pb-4">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-0.5 rounded-full inline-block mb-1">{greeting}</span>
            <h1 className="text-2xl font-black tracking-tight text-zinc-950">{name}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {selectedStream ? `${selectedStream.class?.name} ${selectedStream.name}` : 'Matta OS'} · Teacher Command Center
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedStreamId || ''}
              onChange={e => setSelectedStreamId(e.target.value)}
              className="appearance-none bg-white border border-zinc-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-900 outline-none cursor-pointer shadow-sm"
            >
              <option value="" disabled>Select Stream</option>
              {allStreams.map(s => (
                <option key={s.id} value={s.id}>
                  {s.class?.name} {s.name} {s.class_teacher_id === user.id ? '★' : ''}
                </option>
              ))}
            </select>
            <button onClick={hydrate} className="p-2 border border-zinc-200 rounded-xl text-zinc-400 hover:text-zinc-900 transition-all">
              <RefreshCcw size={14} />
            </button>
          </div>
        </div>

        {/* CBC LIVE TRACKER - 5 real metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pb-5">
          {[
            { label: 'Students', value: students.length, color: 'text-zinc-900', bg: 'bg-zinc-50' },
            { label: 'EE (Excelling)', value: `${cbcStats.EE} · ${eePercent}%`, color: 'text-emerald-700', bg: 'bg-emerald-50' },
            { label: 'ME (Meeting)', value: `${cbcStats.ME} · ${mePercent}%`, color: 'text-blue-700', bg: 'bg-blue-50' },
            { label: 'AE (Approaching)', value: `${cbcStats.AE}`, color: 'text-amber-700', bg: 'bg-amber-50' },
            { label: 'BE (Below)', value: `${cbcStats.BE} · ${bePercent}%`, color: 'text-rose-700', bg: 'bg-rose-50' },
          ].map(m => (
            <div key={m.label} className={`${m.bg} border border-zinc-100 rounded-2xl p-4`}>
              <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">{m.label}</p>
              <p className={`text-xl font-black ${m.color}`}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* TAB STRIP */}
        <div className="flex gap-6">
          {[
            { key: 'operations', label: 'Classroom Operations' },
            { key: 'academics', label: 'CBC Academics' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2',
                activeTab === tab.key ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      <div className="px-6 pt-6 pb-8">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

          {/* LEFT COLUMN */}
          <div className="xl:col-span-8 space-y-8">

            {activeTab === 'operations' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* QUICK ACTION PAD */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { to: '/my-classroom', icon: Monitor, label: 'Start Class', bg: 'bg-violet-50 text-violet-600 border-violet-100 hover:bg-violet-100' },
                    { to: '/results-management', icon: Edit3, label: 'Log Rubric', bg: 'bg-emerald-50 text-emerald-600 border-emerald-100 hover:bg-emerald-100' },
                    { to: '/suspensions', icon: AlertTriangle, label: 'Log Behavior', bg: 'bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100' },
                    { to: '/chat', icon: MessageSquare, label: 'Message Parents', bg: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100' },
                  ].map(a => (
                    <Link key={a.label} to={a.to} className={`flex flex-col items-center justify-center p-4 rounded-2xl border ${a.bg} hover:scale-[1.02] active:scale-95 transition-all`}>
                      <a.icon size={20} className="mb-2" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-center">{a.label}</span>
                    </Link>
                  ))}
                </div>

                {/* PENDING PROJECTS */}
                {pendingProjects.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <FileText size={14} className="text-amber-500" />
                      <h2 className="text-sm font-bold text-zinc-900">Pending CBC Projects</h2>
                      <span className="ml-auto px-2 py-0.5 bg-amber-50 text-amber-600 text-[9px] font-black rounded-full border border-amber-100">{pendingProjects.length} active</span>
                    </div>
                    <div className="space-y-3">
                      {pendingProjects.map((p: any) => (
                        <div key={p.id} className="p-4 bg-white border border-zinc-100 rounded-2xl flex items-center justify-between hover:border-zinc-200 transition-all">
                          <div>
                            <p className="text-sm font-bold text-zinc-900">{p.title}</p>
                            <p className="text-[10px] text-zinc-400 font-medium uppercase">{p.learning_area?.name}</p>
                          </div>
                          {p.due_date && (
                            <span className="text-[10px] font-bold text-zinc-500 flex items-center gap-1">
                              <Clock size={10} /> Due {new Date(p.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* APPOINTMENTS */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar size={14} className="text-zinc-400" />
                    <h2 className="text-sm font-bold text-zinc-900">Appointments</h2>
                  </div>
                  <div className="space-y-3">
                    {appointments.length > 0 ? appointments.map((app: any) => (
                      <div key={app.id} className="p-4 bg-white border border-zinc-100 rounded-2xl flex items-center justify-between hover:border-zinc-200 transition-all">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm', app.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-50 text-zinc-400')}>
                            {app.parent?.full_name?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-900">{app.parent?.full_name}</p>
                            <p className="text-[10px] text-zinc-400 font-medium">{app.reason} · {new Date(app.appointment_date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => updateAppStatus(app.id, 'approved')} className="px-3 py-1.5 bg-zinc-900 text-white text-[10px] font-black uppercase rounded-lg hover:bg-zinc-700 transition-all">Approve</button>
                          <button onClick={() => updateAppStatus(app.id, 'holding')} className="px-3 py-1.5 bg-zinc-100 text-zinc-500 text-[10px] font-black uppercase rounded-lg hover:bg-zinc-200 transition-all">Hold</button>
                        </div>
                      </div>
                    )) : (
                      <div className="py-10 text-center border-2 border-dashed border-zinc-100 rounded-2xl">
                        <p className="text-[10px] font-bold text-zinc-300 uppercase">No appointments scheduled</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'academics' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                {/* CBC RUBRIC BREAKDOWN BAR */}
                <div className="bg-white border border-zinc-100 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-sm font-bold text-zinc-900">Class CBC Performance</h2>
                      <p className="text-[10px] text-zinc-400 uppercase font-medium mt-0.5">Live from assessments · {students.length} students</p>
                    </div>
                    <Link to="/results-management" className="text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700">Record Results →</Link>
                  </div>

                  {/* Rubric Bar */}
                  <div className="space-y-4">
                    {[
                      { label: 'Exceeding Expectations (EE)', count: cbcStats.EE, color: 'bg-emerald-500', pct: eePercent },
                      { label: 'Meeting Expectations (ME)', count: cbcStats.ME, color: 'bg-blue-500', pct: mePercent },
                      { label: 'Approaching Expectations (AE)', count: cbcStats.AE, color: 'bg-amber-500', pct: cbcStats.total > 0 ? Math.round((cbcStats.AE / cbcStats.total) * 100) : 0 },
                      { label: 'Below Expectations (BE)', count: cbcStats.BE, color: 'bg-rose-500', pct: bePercent },
                    ].map(r => (
                      <div key={r.label} className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold text-zinc-600">
                          <span>{r.label}</span>
                          <span>{r.count} students · {r.pct}%</span>
                        </div>
                        <div className="w-full h-2.5 bg-zinc-100 rounded-full overflow-hidden">
                          <div className={`h-full ${r.color} rounded-full transition-all duration-700`} style={{ width: `${r.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* TREND CHART */}
                <div className="bg-white border border-zinc-100 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-sm font-bold text-zinc-900">Assessment Trend</h2>
                      <p className="text-[10px] text-zinc-400 uppercase font-medium mt-0.5">EE + ME over time</p>
                    </div>
                    <div className="flex gap-2">
                      {(['trends', 'subjects'] as const).map(t => (
                        <button key={t} onClick={() => setActiveGraphTab(t)}
                          className={cn('px-3 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all', activeGraphTab === t ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-400')}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      {performanceTrend.length > 0 ? (
                        <AreaChart data={performanceTrend}>
                          <defs>
                            <linearGradient id="eeGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                          <Tooltip />
                          <Area type="monotone" dataKey="EE" name="Exceeding" stroke="#10b981" strokeWidth={2} fill="url(#eeGrad)" />
                          <Area type="monotone" dataKey="ME" name="Meeting" stroke="#3b82f6" strokeWidth={2} fill="none" strokeDasharray="4 4" />
                        </AreaChart>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-zinc-300 gap-2">
                          <Activity size={32} strokeWidth={1} />
                          <p className="text-[10px] font-bold uppercase">No assessment data yet. Record rubrics to see trends.</p>
                        </div>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="xl:col-span-4 space-y-6">

            {/* MATTA AI WORKLOAD ASSISTANT */}
            <div className="bg-zinc-950 rounded-3xl p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center">
                    <Activity size={16} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black">Matta AI</h3>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">CBC Workload Assistant</p>
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  {cbcStats.BE > 0 && (
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">
                      <p className="text-xs text-zinc-200 leading-relaxed">
                        ⚠️ <span className="text-white font-bold">{cbcStats.BE} students</span> are Below Expectations in your class. Consider targeted intervention.
                      </p>
                    </div>
                  )}
                  {pendingProjects.length > 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        📋 <span className="text-white font-bold">{pendingProjects.length} CBC projects</span> are active for your grade level.
                      </p>
                    </div>
                  )}
                  {cbcStats.total === 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                      <p className="text-xs text-zinc-300 leading-relaxed">
                        📝 No assessments logged yet for this class. Start recording CBC rubrics to unlock insights.
                      </p>
                    </div>
                  )}
                  {eePercent >= 50 && cbcStats.total > 0 && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                      <p className="text-xs text-zinc-200 leading-relaxed">
                        🏆 <span className="text-white font-bold">{eePercent}%</span> of your class is Exceeding Expectations. Excellent work!
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setShowTargetModal(true)}
                  className="w-full py-2.5 bg-white text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-all"
                >
                  Set Class Targets
                </button>
              </div>
            </div>

            {/* ACTIVITY FEED */}
            <div className="bg-white border border-zinc-100 rounded-3xl p-6">
              <div className="flex items-center gap-2 mb-5">
                <Bell size={14} className="text-zinc-400" />
                <h2 className="text-sm font-bold text-zinc-900">Live Activity</h2>
                <span className="ml-auto w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <div className="space-y-3">
                {notifications.length > 0 ? notifications.slice(0, 5).map((n: any) => (
                  <div key={n.id} className="p-3 bg-zinc-50 border border-zinc-100 rounded-xl group hover:border-zinc-200 transition-all cursor-pointer">
                    <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{n.type || 'Alert'}</p>
                    <p className="text-xs font-bold text-zinc-900 mt-0.5">{n.title}</p>
                    <p className="text-[10px] text-zinc-500 line-clamp-2 mt-0.5">{n.message}</p>
                  </div>
                )) : (
                  <div className="py-8 text-center bg-zinc-50 rounded-2xl border border-dashed border-zinc-100">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase">No recent activity</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      <Modal isOpen={showTargetModal} onClose={() => setShowTargetModal(false)} title="Class Target Settings">
        <form onSubmit={saveTargetSettings} className="space-y-4 p-2">
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Current Mean Score (%)</label>
            <input type="number" value={meanInput} onChange={e => setMeanInput(e.target.value)} className="w-full h-11 px-4 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none" />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 block mb-1">Target Mean Score (%)</label>
            <input type="number" value={targetInput} onChange={e => setTargetInput(e.target.value)} className="w-full h-11 px-4 bg-zinc-50 border border-zinc-100 rounded-xl text-sm outline-none" />
          </div>
          <div className="pt-2 grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" onClick={() => setShowTargetModal(false)}>Cancel</Button>
            <Button type="submit" disabled={savingTarget}>{savingTarget ? 'Saving...' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
