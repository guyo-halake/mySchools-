const TeacherView = ({ user }: any) => {
  const [allStreams, setAllStreams] = useState<any[]>([]);
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(localStorage.getItem('teacher_stream_id'));
  const [students, setStudents] = useState<any[]>([]);
  
  // Data States
  const [assessments, setAssessments] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [learningAreas, setLearningAreas] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<{ present: number; absent: number }>({ present: 0, absent: 0 });

  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('results'); // results, projects, appointments
  const [selectedLearningAreaId, setSelectedLearningAreaId] = useState<string>('ALL');
  
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
      const [streamRows, apps, laRes] = await Promise.all([
        api.getTeacherStreams(user.id, user.school_id),
        api.getAppointmentsByTeacher(user.id),
        supabase.from('learning_areas').select('*').eq('school_id', user.school_id).order('name')
      ]);
      setAllStreams(streamRows);
      setAppointments(apps || []);
      setLearningAreas(laRes.data || []);
      
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
          
          // Fetch Assessments
          const { data: assessData } = await supabase
            .from('cbc_student_assessments')
            .select('*, learning_area:learning_areas(name)')
            .eq('school_id', user.school_id)
            .in('student_id', studentIds)
            .order('created_at', { ascending: false });
          
          setAssessments(assessData || []);

          // Fetch Attendance for today
          const todayStr = new Date().toISOString().split('T')[0];
          const { data: attData } = await supabase
            .from('attendance')
            .select('student_id, status')
            .eq('date', todayStr)
            .in('student_id', studentIds);
            
          let p = 0; let a = 0;
          (attData || []).forEach(record => {
            if (record.status === 'present' || record.status === 'late') p++;
            if (record.status === 'absent') a++;
          });
          setAttendance({ present: p, absent: a });
        } else {
          setAssessments([]);
          setAttendance({ present: 0, absent: 0 });
        }

        // Fetch Projects
        const { data: projData } = await supabase
          .from('cbc_projects')
          .select('*, learning_area:learning_areas(name)')
          .eq('school_id', user.school_id)
          .order('due_date', { ascending: true });
        setProjects(projData || []);

      } catch (e) { console.error(e); }
    };
    load();
  }, [selectedStreamId, user.school_id]);

  const updateAppStatus = async (id: string, status: string) => {
    try {
      await api.updateAppointmentStatus(id, status);
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      toast.success(`Appointment ${status}`);
    } catch { toast.error('Failed'); }
  };

  // Derive Results View
  const filteredAssessments = useMemo(() => {
    if (selectedLearningAreaId === 'ALL') return assessments;
    return assessments.filter(a => a.learning_area_id === selectedLearningAreaId);
  }, [assessments, selectedLearningAreaId]);

  // We want the LATEST assessment per student for the selected scope
  const studentLatestAssessments = useMemo(() => {
    const map = new Map<string, any>();
    // Since ordered by created_at desc, the first we encounter is latest
    filteredAssessments.forEach(a => {
      if (!map.has(a.student_id)) map.set(a.student_id, a);
    });
    return map;
  }, [filteredAssessments]);

  const resultsStats = useMemo(() => {
    const stats = { EE: 0, ME: 0, AE: 0, BE: 0, total: 0 };
    studentLatestAssessments.forEach(a => {
      if (stats[a.rating as keyof typeof stats] !== undefined) {
        stats[a.rating as keyof typeof stats]++;
        stats.total++;
      }
    });
    return stats;
  }, [studentLatestAssessments]);

  if (isLoading) return (
    <div className="space-y-6 p-8 animate-pulse">
      <div className="h-8 w-64 bg-zinc-100 rounded-xl" />
      <div className="grid grid-cols-2 gap-4"><div className="h-48 bg-zinc-50 rounded-2xl" /><div className="h-48 bg-zinc-50 rounded-2xl" /></div>
      <div className="h-64 bg-zinc-50 rounded-2xl" />
    </div>
  );

  return (
    <div className="w-full flex flex-col gap-0 animate-in fade-in duration-500 bg-zinc-50/50 min-h-screen">
      
      {/* HEADER & STREAM SELECTOR */}
      <div className="px-6 pt-6 pb-6 bg-white border-b border-zinc-100">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-0.5 rounded-full inline-block mb-1">{greeting}</span>
            <h1 className="text-2xl font-black tracking-tight text-zinc-950">{name}</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {selectedStream ? `${selectedStream.class?.name} ${selectedStream.name}` : 'Matta OS'} · Teacher Dashboard
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedStreamId || ''}
              onChange={e => setSelectedStreamId(e.target.value)}
              className="appearance-none bg-white border border-zinc-200 rounded-xl px-4 py-2 pr-8 text-[10px] font-black uppercase tracking-widest text-zinc-900 outline-none cursor-pointer shadow-sm hover:border-zinc-300 transition-all"
            >
              <option value="" disabled>Select Stream</option>
              {allStreams.map(s => (
                <option key={s.id} value={s.id}>
                  {s.class?.name} {s.name} {s.class_teacher_id === user.id ? '★' : ''}
                </option>
              ))}
            </select>
            <button onClick={hydrate} className="p-2 bg-white border border-zinc-200 rounded-xl text-zinc-400 hover:text-zinc-900 shadow-sm transition-all">
              <RefreshCcw size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        
        {/* TOP BENTO GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* CARD 1: Class Overview */}
          <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 text-zinc-100 pointer-events-none">
              <Users size={80} strokeWidth={0.5} className="-rotate-12" />
            </div>
            <div className="relative z-10">
              <h2 className="text-sm font-bold text-zinc-900 mb-6">Class Overview</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total Enrolled</p>
                  <p className="text-3xl font-black text-zinc-900">{students.length}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Present Today</p>
                  <p className="text-3xl font-black text-emerald-600">{attendance.present}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Absent Today</p>
                  <p className="text-3xl font-black text-rose-500">{attendance.absent}</p>
                </div>
              </div>
            </div>
            
            {/* QUICK ACTIONS ROW */}
            <div className="relative z-10 mt-6 pt-6 border-t border-zinc-100 flex gap-3 overflow-x-auto pb-1 hide-scrollbar">
              <Link to="/my-classroom" className="shrink-0 flex items-center gap-2 px-4 py-2 bg-zinc-950 text-white rounded-xl hover:bg-zinc-800 transition-all text-xs font-bold shadow-sm">
                <Monitor size={14} /> Start Virtual Class
              </Link>
              <Link to="/suspensions" className="shrink-0 flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-xl hover:bg-zinc-50 transition-all text-xs font-bold shadow-sm">
                <AlertTriangle size={14} className="text-rose-500" /> Log Behavior
              </Link>
              <Link to="/chat" className="shrink-0 flex items-center gap-2 px-4 py-2 bg-white border border-zinc-200 text-zinc-700 rounded-xl hover:bg-zinc-50 transition-all text-xs font-bold shadow-sm">
                <MessageSquare size={14} className="text-blue-500" /> Message Parents
              </Link>
            </div>
          </div>

          {/* CARD 2: Active Projects / Assessments */}
          <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-zinc-900">Active CBC Projects</h2>
              <button className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all rounded-lg text-[10px] font-black uppercase tracking-widest">
                <Plus size={12} strokeWidth={3} /> Add Project
              </button>
            </div>
            
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[160px] hide-scrollbar pr-2">
              {projects.length > 0 ? projects.slice(0, 3).map((p: any) => (
                <div key={p.id} className="p-3 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center justify-between hover:border-zinc-300 transition-all cursor-pointer group">
                  <div>
                    <p className="text-xs font-bold text-zinc-900">{p.title}</p>
                    <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{p.learning_area?.name}</p>
                  </div>
                  {p.due_date && (
                    <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-amber-600 transition-colors bg-white px-2 py-1 rounded-lg border border-zinc-200">
                      Due {new Date(p.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )) : (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-2">
                  <FileText size={24} strokeWidth={1.5} className="opacity-50" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">No active projects</p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* BOTTOM TABBED SECTION */}
        <div className="bg-white border border-zinc-100 rounded-3xl shadow-sm overflow-hidden min-h-[500px]">
          
          {/* TAB STRIP */}
          <div className="flex border-b border-zinc-100 bg-zinc-50/50 px-6 pt-4 gap-8 overflow-x-auto hide-scrollbar">
            {[
              { id: 'results', label: 'Class Results' },
              { id: 'projects', label: 'Assessments & Projects' },
              { id: 'appointments', label: 'My Appointments' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  'pb-3 text-[11px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-b-2 relative top-[1px]',
                  activeTab === t.id ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-400 hover:text-zinc-600'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            
            {/* RESULTS TAB */}
            {activeTab === 'results' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-zinc-900">Learning Area:</span>
                    <select
                      value={selectedLearningAreaId}
                      onChange={e => setSelectedLearningAreaId(e.target.value)}
                      className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 pr-8 text-xs font-bold text-zinc-900 outline-none hover:border-zinc-300 transition-all"
                    >
                      <option value="ALL">All Subjects</option>
                      {learningAreas.map(la => (
                        <option key={la.id} value={la.id}>{la.name}</option>
                      ))}
                    </select>
                  </div>
                  <Link to="/results-management" className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-all rounded-xl text-xs font-bold">
                    <Edit3 size={14} /> Log Rubrics
                  </Link>
                </div>

                {/* GRADES OVERVIEW CARD */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Exceeding (EE)', count: resultsStats.EE, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                    { label: 'Meeting (ME)', count: resultsStats.ME, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-100' },
                    { label: 'Approaching (AE)', count: resultsStats.AE, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-100' },
                    { label: 'Below (BE)', count: resultsStats.BE, color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-100' },
                  ].map(m => (
                    <div key={m.label} className={`${m.bg} ${m.border} border rounded-2xl p-4 flex flex-col items-center justify-center text-center`}>
                      <span className={`text-3xl font-black ${m.color} leading-none`}>{m.count}</span>
                      <span className={`text-[9px] font-black uppercase tracking-widest mt-2 ${m.color} opacity-80`}>{m.label}</span>
                    </div>
                  ))}
                </div>

                {/* STUDENTS TABLE */}
                <div className="border border-zinc-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      <tr>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3 text-center">Current Level</th>
                        <th className="px-4 py-3 hidden sm:table-cell">Last Assessment</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {students.length > 0 ? students.map(s => {
                        const assess = studentLatestAssessments.get(s.id);
                        return (
                          <tr key={s.id} className="hover:bg-zinc-50 transition-colors">
                            <td className="px-4 py-3 font-bold text-zinc-900">{s.profile?.full_name}</td>
                            <td className="px-4 py-3 text-center">
                              {assess ? (
                                <span className={cn(
                                  'px-2.5 py-1 text-[10px] font-black rounded-lg',
                                  assess.rating === 'EE' ? 'bg-emerald-100 text-emerald-700' :
                                  assess.rating === 'ME' ? 'bg-blue-100 text-blue-700' :
                                  assess.rating === 'AE' ? 'bg-amber-100 text-amber-700' :
                                  'bg-rose-100 text-rose-700'
                                )}>{assess.rating}</span>
                              ) : (
                                <span className="text-zinc-300">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell text-xs text-zinc-500">
                              {assess ? new Date(assess.created_at).toLocaleDateString() : 'No data'}
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-8 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest">
                            No students found in stream
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* PROJECTS TAB */}
            {activeTab === 'projects' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-zinc-900">All Projects & Assignments</h3>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 text-white hover:bg-zinc-800 transition-all rounded-lg text-[10px] font-black uppercase tracking-widest">
                    <Plus size={12} strokeWidth={3} /> Create New
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {projects.length > 0 ? projects.map(p => (
                    <div key={p.id} className="border border-zinc-200 rounded-2xl p-5 hover:border-zinc-300 transition-all bg-white group">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-1">{p.learning_area?.name}</p>
                          <h4 className="text-sm font-bold text-zinc-900 leading-tight">{p.title}</h4>
                        </div>
                        {p.due_date && (
                          <span className="text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-1 rounded-lg">Due {new Date(p.due_date).toLocaleDateString()}</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 line-clamp-2 mb-4">{p.description || 'No description provided.'}</p>
                      <div className="flex gap-2">
                        <button className="text-[10px] font-black uppercase text-zinc-500 hover:text-zinc-900 px-3 py-1.5 bg-zinc-100 rounded-lg transition-all">Edit</button>
                        <button className="text-[10px] font-black uppercase text-rose-500 hover:text-rose-700 px-3 py-1.5 bg-rose-50 rounded-lg transition-all">Delete</button>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-full py-16 text-center text-zinc-400 text-xs font-bold uppercase tracking-widest border-2 border-dashed border-zinc-100 rounded-3xl">
                      No projects logged for this class
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* APPOINTMENTS TAB */}
            {activeTab === 'appointments' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                 <h3 className="text-sm font-bold text-zinc-900 mb-4">Parent Appointments</h3>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {appointments.length > 0 ? appointments.map((app: any) => (
                    <div key={app.id} className="p-5 bg-white border border-zinc-200 rounded-2xl flex flex-col justify-between hover:shadow-md transition-all">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center font-black text-lg', app.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-500')}>
                          {app.parent?.full_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-900">{app.parent?.full_name}</p>
                          <p className="text-xs text-zinc-500">{new Date(app.appointment_date).toLocaleString()}</p>
                        </div>
                      </div>
                      <p className="text-sm text-zinc-700 bg-zinc-50 p-3 rounded-xl mb-4 italic">"{app.reason}"</p>
                      <div className="flex gap-2 mt-auto">
                        <button onClick={() => updateAppStatus(app.id, 'approved')} className="flex-1 py-2 bg-emerald-50 text-emerald-700 text-xs font-bold uppercase rounded-xl hover:bg-emerald-100 transition-all border border-emerald-100">Approve</button>
                        <button onClick={() => updateAppStatus(app.id, 'holding')} className="flex-1 py-2 bg-zinc-50 text-zinc-500 text-xs font-bold uppercase rounded-xl hover:bg-zinc-100 transition-all border border-zinc-200">Hold</button>
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-full py-16 text-center border-2 border-dashed border-zinc-100 rounded-3xl">
                      <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">No pending appointments</p>
                    </div>
                  )}
                 </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};
