  return (
    <div className="w-full px-4 lg:px-8 pt-2 pb-6 flex flex-col gap-0 animate-in fade-in duration-700 font-inter text-zinc-900 bg-white">
      {/* WELCOME SECTION + METRIC BLOCKS + TABS — all one compact header */}
      <div className="pb-0">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 pb-5 border-b border-zinc-100">
          <div className="space-y-0.5">
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-0.5 rounded-full inline-block mb-1">
               {getGreeting()}
            </span>
            <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-zinc-950 leading-tight">
              Welcome, {capitalizedName}
            </h1>
            <div className="flex items-center gap-2 mt-1 text-sm text-zinc-500 font-serif italic">
               Teacher, {data?.stream ? `${data.stream.class?.name} ${data.stream.name}` : 'Matta OS'}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group min-w-[200px]">
              <select
                value={selectedStreamId || ''}
                onChange={(e) => setSelectedStreamId(e.target.value)}
                className="appearance-none w-full bg-white border border-zinc-200 hover:border-zinc-300 rounded-xl px-4 py-2 pr-10 text-[10px] font-black uppercase tracking-widest text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/5 transition-all cursor-pointer shadow-sm"
              >
                <option value="" disabled>Select Stream</option>
                {allStreams.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.class?.name} {s.name} {s.class_teacher_id === user.id ? '(Lead)' : ''}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400">
                <ChevronRight size={14} className="rotate-90" />
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-zinc-50 border border-zinc-100 p-2 rounded-xl">
              <div className="text-right">
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400">My Students</p>
                <p className="text-lg font-bold text-zinc-900 leading-none">{data?.students?.length || 0}</p>
              </div>
              <div className="w-px h-8 bg-zinc-200"></div>
              <div className="text-right group cursor-pointer" onClick={() => setShowTargetModal(true)}>
                <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-emerald-500 transition-colors">Class Mean</p>
                <p className="text-lg font-bold text-zinc-900 leading-none">{mainMean}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Strip */}
        <div className="flex items-center gap-6 pt-4">
          {[
            { key: 'operations', label: 'Classroom Operations' },
            { key: 'academics', label: 'CBC Academics' }
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveMainTab(tab.key)}
              className={cn(
                "pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2",
                activeMainTab === tab.key
                  ? "border-zinc-900 text-zinc-900"
                  : "border-transparent text-zinc-400 hover:text-zinc-600 hover:border-zinc-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="pt-6">
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          {/* LEFT CONTENT (8 cols) */}
          <div className="xl:col-span-8 flex flex-col gap-8">
            
            {activeMainTab === 'operations' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* QUICK ACTION PAD */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Link to="/my-classroom" className="flex flex-col items-center justify-center p-4 bg-violet-50 text-violet-600 rounded-2xl border border-violet-100 hover:bg-violet-100 hover:scale-[1.02] active:scale-95 transition-all">
                    <MonitorPlay size={20} className="mb-2" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center">Virtual Class</span>
                  </Link>
                  <Link to="/input-results" className="flex flex-col items-center justify-center p-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 hover:bg-emerald-100 hover:scale-[1.02] active:scale-95 transition-all">
                    <FileEdit size={20} className="mb-2" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center">Log Rubric</span>
                  </Link>
                  <Link to="/suspensions" className="flex flex-col items-center justify-center p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 hover:bg-rose-100 hover:scale-[1.02] active:scale-95 transition-all">
                    <AlertTriangle size={20} className="mb-2" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center">Log Behavior</span>
                  </Link>
                  <Link to="/my-chats" className="flex flex-col items-center justify-center p-4 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 hover:bg-blue-100 hover:scale-[1.02] active:scale-95 transition-all">
                    <MessageSquare size={20} className="mb-2" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center">Message Parents</span>
                  </Link>
                </div>

                {/* APPOINTMENTS */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-zinc-400" />
                      <h2 className="text-sm font-bold text-zinc-900">Teacher Appointments</h2>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    {(data.appointments || []).length > 0 ? (data.appointments || []).map((app: any) => (
                      <div key={app.id} className="p-4 bg-white border border-zinc-100 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 hover:shadow-md hover:border-zinc-200 transition-all group">
                        <div className="flex items-center gap-4">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm", app.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-50 text-zinc-400')}>
                            {app.parent?.full_name?.[0]}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-zinc-900">{app.parent?.full_name}</h4>
                              {app.status === 'approved' && <Badge variant="success">Approved</Badge>}
                              {app.status === 'holding' && <Badge variant="warning">On Hold</Badge>}
                            </div>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase mt-0.5">{app.reason}</p>
                            <div className="flex gap-4 mt-2 text-[10px] text-zinc-500 font-medium">
                              <span className="flex items-center gap-1"><Clock size={10} /> {app.appointment_time}</span>
                              <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(app.appointment_date).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateAppStatus(app.id, 'approved')}
                            className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateAppStatus(app.id, 'holding')}
                            className="px-4 py-2 bg-zinc-50 text-zinc-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-zinc-600 transition-all border border-zinc-100"
                          >
                            Hold
                          </button>
                          <Link
                            to={`/chat?parent=${app.parent_id}`}
                            className="p-2.5 bg-zinc-50 text-zinc-400 rounded-xl border border-zinc-100 hover:text-zinc-900 transition-all"
                          >
                            <MessageSquare size={14} />
                          </Link>
                        </div>
                      </div>
                    )) : (
                      <div className="py-12 text-center border-2 border-dashed border-zinc-100 rounded-3xl bg-zinc-50/50">
                        <Calendar size={32} className="mx-auto text-zinc-300 mb-2" />
                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">No upcoming appointments</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeMainTab === 'academics' && (
              <div className="space-y-8 animate-in fade-in duration-500">
                {/* Performance Tests Hub */}
                <div className="bg-white border border-zinc-100 rounded-2xl p-6 md:p-8 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                    <div>
                      <h2 className="text-sm font-bold text-zinc-900">Performance Tests</h2>
                      <p className="text-[10px] text-zinc-400 font-medium uppercase mt-1">Classroom Analytics & Benchmarking</p>
                    </div>

                    <div className="flex p-1 bg-zinc-50 rounded-lg border border-zinc-100">
                      {(['trends', 'comparison', 'subjects', 'rankings'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setActiveGraphTab(t)}
                          className={cn("px-4 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all", activeGraphTab === t
                              ? "bg-white text-zinc-900 shadow-sm border border-zinc-200"
                              : "text-zinc-400 hover:text-zinc-600"
                            )}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className={cn("w-full transition-all duration-500", activeGraphTab === 'trends' && performanceTrend.length === 0 ? 'h-[150px]' : 'h-[350px]')}>
                    <ResponsiveContainer width="100%" height="100%">
                      {activeGraphTab === 'trends' ? (
                        performanceTrend.length > 0 ? (
                          <AreaChart data={performanceTrend} onClick={handlePointClick}>
                            <defs>
                              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} dy={10} />
                            <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} dx={-10} />
                            <Tooltip
                              cursor={{ stroke: '#10b981', strokeWidth: 1 }}
                              content={({ active, payload }: any) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-white p-3 rounded-xl border border-zinc-100 shadow-xl scale-110 transition-transform">
                                      <p className="text-[10px] font-black uppercase text-zinc-400 mb-1">{payload[0].payload.name}</p>
                                      <p className="text-lg font-black text-zinc-900">{payload[0].value}%</p>
                                      <p className="text-[9px] text-zinc-400 font-bold uppercase mt-2">Click to view grade breakdown</p>
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="score"
                              stroke="#10b981"
                              strokeWidth={3}
                              fillOpacity={1}
                              fill="url(#colorScore)"
                              activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                            />
                          </AreaChart>
                        ) : (
                          <div className="h-full flex items-center justify-center text-zinc-300 flex-col gap-2">
                            <Activity size={32} strokeWidth={1} />
                            <p className="text-[10px] font-bold uppercase tracking-widest">No historical data available</p>
                          </div>
                        )
                      ) : activeGraphTab === 'comparison' ? (
                        <LineChart data={comparisonData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} dy={10} />
                          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} dx={-10} />
                          <Tooltip />
                          <Line type="monotone" dataKey="myClass" name="My Class" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="gradeAvg" name="Grade Average" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} />
                        </LineChart>
                      ) : activeGraphTab === 'subjects' ? (
                        <BarChart data={subjectData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} dy={10} />
                          <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} dx={-10} />
                          <Tooltip cursor={{ fill: '#f8fafc' }} />
                          <Bar dataKey="score" name="Mean Score" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                      ) : (
                        <BarChart data={rankingData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f4f4f5" />
                          <XAxis type="number" domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} />
                          <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} width={80} />
                          <Tooltip />
                          <Bar dataKey="score" name="Overall Mean" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDEBAR (4 cols) */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            
            {/* AI Assistant Block */}
            <div className="bg-zinc-950 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center shadow-lg">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                      <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
                      <path d="M12 12 2.1 7.1"></path>
                      <path d="m12 12 7.1 7.1"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-black tracking-tight leading-none mb-1">Matta CBC Assistant</h3>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest">AI Co-Pilot</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-sm">
                    <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                      You have <span className="text-white font-bold">14 students</span> pending project portfolio uploads for Agriculture Grade 4.
                    </p>
                  </div>
                  <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-sm">
                    <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                      <span className="text-white font-bold">3 parents</span> have sent you unread messages regarding disciplinary logs.
                    </p>
                  </div>
                </div>

                <button className="w-full py-3 bg-white text-zinc-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-100 transition-colors shadow-lg shadow-white/10">
                  Chat with Matta
                </button>
              </div>
            </div>

            {/* Live Activity Feed */}
            <div className="bg-white border border-zinc-100 rounded-3xl p-6 shadow-sm flex-1">
              <div className="flex items-center gap-2 mb-6">
                <Activity size={14} className="text-zinc-400" />
                <h2 className="text-sm font-bold text-zinc-900">Live Activity Feed</h2>
              </div>

              <div className="space-y-4">
                {notifications.length > 0 ? notifications.slice(0, 5).map((notif: any) => (
                  <div key={notif.id} className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-1 group hover:border-zinc-200 transition-all cursor-pointer">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex justify-between">
                      {notif.type || 'Alert'}
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity">Just Now</span>
                    </p>
                    <p className="text-xs font-bold text-zinc-900">{notif.title}</p>
                    <p className="text-[10px] font-medium text-zinc-500 leading-relaxed line-clamp-2">{notif.message}</p>
                  </div>
                )) : (
                  <div className="py-12 text-center bg-zinc-50/50 rounded-2xl border border-dashed border-zinc-100">
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">No recent activity</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
