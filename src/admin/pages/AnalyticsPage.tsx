import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/adminSupabase';
import { Building2, Users, DollarSign, Activity, RefreshCw } from 'lucide-react';

interface Stats {
  schools: number;
  students: number;
  teachers: number;
  revenue: number;
}

interface SchoolGrowth {
  month: string;
  count: number;
}

interface LocationBreakdown {
  location: string;
  count: number;
}

export const AnalyticsPage: React.FC = () => {
  const [stats, setStats]       = useState<Stats>({ schools: 0, students: 0, teachers: 0, revenue: 0 });
  const [growth, setGrowth]     = useState<SchoolGrowth[]>([]);
  const [locations, setLocations] = useState<LocationBreakdown[]>([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    const [
      { count: sc },
      { count: st },
      { count: tc },
      { data: feeData },
      { data: schoolData },
    ] = await Promise.all([
      supabase.from('schools').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'STUDENT'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'TEACHER'),
      supabase.from('fees').select('amount_paid'),
      supabase.from('schools').select('created_at, location'),
    ]);

    const revenue = (feeData || []).reduce((s, r) => s + (r.amount_paid || 0), 0);
    setStats({ schools: sc || 0, students: st || 0, teachers: tc || 0, revenue });

    // Build monthly growth from real created_at data
    const monthMap: Record<string, number> = {};
    (schoolData || []).forEach(s => {
      const m = new Date(s.created_at).toLocaleString('default', { month: 'short', year: '2-digit' });
      monthMap[m] = (monthMap[m] || 0) + 1;
    });
    const months = Object.entries(monthMap)
      .sort((a, b) => new Date('1 ' + a[0]).getTime() - new Date('1 ' + b[0]).getTime())
      .slice(-12)
      .map(([month, count]) => ({ month, count }));
    setGrowth(months);

    // Location breakdown from real data
    const locMap: Record<string, number> = {};
    (schoolData || []).forEach(s => {
      const loc = s.location || 'Unknown';
      locMap[loc] = (locMap[loc] || 0) + 1;
    });
    const locs = Object.entries(locMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([location, count]) => ({ location, count }));
    setLocations(locs);

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const maxGrowth = Math.max(...growth.map(g => g.count), 1);
  const maxLoc   = Math.max(...locations.map(l => l.count), 1);

  return (
    <div className="space-y-12 max-w-[1200px] mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <h1 className="text-3xl font-bold dark:text-white tracking-tight">Analytics</h1>
          <p className="text-xs text-zinc-500 mt-1 uppercase font-bold tracking-widest">Platform Usage & Growth</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 px-4 py-2 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-10">
        {[
          { label: 'Schools',          value: stats.schools,              prefix: '',      icon: Building2 },
          { label: 'Students',         value: stats.students,             prefix: '',      icon: Users     },
          { label: 'Teachers',         value: stats.teachers,             prefix: '',      icon: Users     },
          { label: 'Total Revenue',    value: stats.revenue.toLocaleString(), prefix: 'KES ', icon: DollarSign },
        ].map(k => (
          <div key={k.label}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">{k.label}</p>
              <k.icon size={13} className="text-zinc-300" />
            </div>
            <p className="text-4xl font-black tabular-nums dark:text-white">
              {loading ? '-' : `${k.prefix}${k.value}`}
            </p>
            <div className="h-px bg-zinc-100 dark:bg-zinc-800 mt-4" />
          </div>
        ))}
      </div>

      {/* School Growth Chart (real data bar chart) */}
      <div className="space-y-6 border-t border-zinc-100 dark:border-zinc-800 pt-10">
        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em]">School Registrations Over Time</p>
        {growth.length === 0 && !loading ? (
          <p className="text-sm text-zinc-400">No registration data yet.</p>
        ) : (
          <div className="flex items-end gap-3 h-40">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex-1 bg-zinc-100 dark:bg-zinc-800 rounded-t-lg animate-pulse" style={{ height: `${30 + Math.random() * 50}%` }} />
                ))
              : growth.map(g => (
                  <div key={g.month} className="flex-1 flex flex-col items-center gap-2">
                    <p className="text-[9px] font-bold text-zinc-400">{g.count}</p>
                    <div
                      className="w-full bg-orange-600 rounded-t-lg transition-all hover:bg-orange-500"
                      style={{ height: `${Math.max(4, (g.count / maxGrowth) * 100)}%` }}
                    />
                    <p className="text-[9px] font-bold text-zinc-400 uppercase">{g.month}</p>
                  </div>
                ))
            }
          </div>
        )}
      </div>

      {/* Location Breakdown */}
      <div className="space-y-6 border-t border-zinc-100 dark:border-zinc-800 pt-10">
        <p className="text-[9px] font-black text-zinc-400 uppercase tracking-[0.3em]">Schools by Location</p>
        {locations.length === 0 && !loading ? (
          <p className="text-sm text-zinc-400">No location data. Add location field when creating schools.</p>
        ) : (
          <div className="space-y-4">
            {(loading ? Array.from({ length: 4 }).map((_, i) => ({ location: '...', count: 0, _loading: true })) : locations).map((l: any, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-bold dark:text-zinc-300">{l.location}</span>
                  <span className="text-zinc-400 font-bold">{l._loading ? '-' : l.count}</span>
                </div>
                <div className="h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-600 rounded-full transition-all"
                    style={{ width: l._loading ? '0%' : `${(l.count / maxLoc) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
