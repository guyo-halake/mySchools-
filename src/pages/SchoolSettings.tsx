import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Card, Button } from '../components/UI';
import { useToast } from '../components/Toast';
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Save, 
  RefreshCw,
  Info
} from 'lucide-react';

interface GradingScale {
  id?: string;
  grade: string;
  min_mark: number;
  max_mark: number;
  grade_point: number;
  remarks: string;
  sort_order: number;
}

export const SchoolSettings: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recomputing, setRecomputing] = useState(false);
  const [scales, setScales] = useState<GradingScale[]>([]);

  const fetchScales = async () => {
    if (!user?.school_id) return;
    setLoading(true);
    try {
      const data = await api.getGradingSystem(user.school_id);
      console.log('[SCHOOL SETTINGS] Fetched Scales:', data);
      setScales(data || []);
    } catch (err) {
      console.error('Failed to fetch grading scales:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScales();
  }, [user?.school_id]);

  const handleUpdateCeiling = (index: number, newMax: number) => {
    const sorted = [...scales].sort((a, b) => a.min_mark - b.min_mark);
    sorted[index].max_mark = newMax;
    
    // Automatic matching: Next grade starts where this one ends
    for (let i = 0; i < sorted.length - 1; i++) {
       sorted[i+1].min_mark = sorted[i].max_mark + 1;
    }
    setScales(sorted);
  };

  const updateField = (index: number, field: keyof GradingScale, value: any) => {
    const updated = [...scales];
    (updated[index] as any)[field] = value;
    setScales(updated);
  };

  const addGrade = () => {
    const lastMax = scales.length > 0 ? Math.max(...scales.map(s => s.max_mark)) : -1;
    const newGrade: GradingScale = {
      grade: 'NEW',
      min_mark: lastMax + 1,
      max_mark: Math.min(lastMax + 10, 100),
      grade_point: 0,
      remarks: 'Good',
      sort_order: scales.length + 1
    };
    setScales([...scales, newGrade].sort((a, b) => a.min_mark - b.min_mark));
  };

  const removeGrade = (index: number) => {
    const updated = scales.filter((_, i) => i !== index);
    if (updated.length > 0) {
      updated[0].min_mark = 0;
      for (let i = 0; i < updated.length - 1; i++) {
        updated[i+1].min_mark = updated[i].max_mark + 1;
      }
    }
    setScales(updated);
  };

  const saveSettings = async () => {
    if (!user?.school_id) return;
    setSaving(true);
    try {
      const sortedByMark = [...scales].sort((a, b) => b.max_mark - a.max_mark);
      const toSave = sortedByMark.map((s, i) => ({ ...s, sort_order: i + 1 }));
      await api.updateGradingSystem(user.school_id, toSave);
      addToast('Settings saved successfully.', 'success');
      fetchScales();
    } catch (err) {
      addToast('Error saving settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const updateAllResults = async () => {
    if (!user?.school_id) return;
    setRecomputing(true);
    try {
      await api.recomputeInstitutionalAverages(user.school_id);
      addToast('All results have been updated.', 'success');
    } catch (err) {
      addToast('Error updating results.', 'error');
    } finally {
      setRecomputing(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="animate-spin text-zinc-300" size={24} />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 space-y-12 animate-in fade-in">
      
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-zinc-400 hover:text-zinc-950 transition-colors text-xs font-bold uppercase tracking-widest"
        >
          <ChevronLeft size={16} /> Back
        </button>
        <div className="flex gap-3">
          <Button 
            onClick={updateAllResults}
            loading={recomputing}
            variant="ghost"
            className="text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-950"
          >
            Update All Results
          </Button>
          <Button 
            onClick={saveSettings}
            loading={saving}
            className="bg-zinc-950 text-white rounded-xl px-6 py-3 text-xs font-black uppercase tracking-widest hover:bg-zinc-800 transition-all"
          >
            Save Settings
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-black text-zinc-900 uppercase tracking-tight">School Settings</h1>
        <p className="text-zinc-400 text-xs font-bold uppercase tracking-tight">Manage how the system calculates grades and averages</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        
        {/* Grading List */}
        <div className="md:col-span-2 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-[10px] font-black text-zinc-900 uppercase tracking-widest">Grading System</h2>
            <button 
              onClick={addGrade}
              className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700"
            >
              + Add New Grade
            </button>
          </div>

          <Card className="p-0 overflow-hidden border-zinc-100 rounded-3xl bg-white">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Grade</th>
                  <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Mark Range</th>
                  <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest">Points (e.g. 12)</th>
                  <th className="px-6 py-4 text-[9px] font-black text-zinc-400 uppercase tracking-widest text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {scales.sort((a, b) => a.min_mark - b.min_mark).map((scale, idx) => (
                  <tr key={idx} className="group transition-colors hover:bg-zinc-50/50">
                    <td className="px-6 py-4">
                      <input 
                        type="text" 
                        value={scale.grade}
                        onChange={(e) => updateField(idx, 'grade', e.target.value.toUpperCase())}
                        className="w-16 bg-transparent border-none text-xs font-black text-zinc-900 outline-none"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-zinc-400 w-6">{scale.min_mark}</span>
                        <span className="text-zinc-200">-</span>
                        <input 
                          type="number" 
                          value={scale.max_mark}
                          onChange={(e) => handleUpdateCeiling(idx, Number(e.target.value))}
                          className="w-12 bg-zinc-100 rounded-lg px-2 py-1 text-xs font-black text-zinc-950 outline-none text-center focus:bg-zinc-200 transition-all"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <input 
                        type="number" 
                        value={scale.grade_point}
                        onChange={(e) => updateField(idx, 'grade_point', Number(e.target.value))}
                        className="w-16 bg-zinc-50 rounded-lg px-3 py-1.5 text-xs font-black text-zinc-900 outline-none focus:ring-1 focus:ring-zinc-900 transition-all"
                      />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => removeGrade(idx)}
                        className="text-zinc-200 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {scales.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-20 text-center">
                      <p className="text-[10px] font-black text-zinc-300 uppercase italic">No data found. Click "+ Add New Grade" to begin.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
          
          <div className="flex gap-2 p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
            <Info size={14} className="text-zinc-400 shrink-0" />
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-tight">
              Automatic Matching: When you change the end mark of a grade, the next grade will automatically adjust to start at the next number.
            </p>
          </div>
        </div>

        {/* Math Summary */}
        <div className="space-y-6">
          <h2 className="text-[10px] font-black text-zinc-900 uppercase tracking-widest px-2">How it's Calculated</h2>
          <Card className="p-6 rounded-3xl border-zinc-100 bg-white space-y-6">
            <div className="space-y-3">
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Student Average</p>
              <div className="p-4 bg-zinc-50 rounded-2xl text-[10px] font-bold text-zinc-600">
                Sum of all marks divided by number of subjects.
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">School Mean</p>
              <div className="p-4 bg-zinc-50 rounded-2xl text-[10px] font-bold text-zinc-600">
                The average of all student points (1-12) based on the scale to the left.
              </div>
            </div>
          </Card>
        </div>

      </div>

    </div>
  );
};
