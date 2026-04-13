import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Trash2, Plus, ChevronLeft, MoreVertical, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button, Card, Badge } from '../components/UI';

type TemplateRow = {
  id: string;
  key: string;
  name: string;
  category: string;
  config: any;
  active: boolean;
  created_at: string;
  updated_at: string;
  school_id: string;
};

type PermissionRow = {
  template_key: string;
  role: string;
  can_view: boolean;
  can_use: boolean;
  can_edit: boolean;
};

type TimetableCustomType = 'CLASS' | 'ASSEMBLY' | 'EXAMS' | 'BREAKS_LUNCH' | 'CUSTOM';

type TimetableCustomEntry = {
  id: string;
  name: string;
  type: TimetableCustomType;
  startTime: string;
  endTime: string;
};

type TimetableBreakRow = {
  id: string;
  afterPeriods: number;
  durationMinutes: number;
  label: string;
};

type TimetableForm = {
  schoolStartTime: string;
  classStartTime: string;
  classEndTime: string;
  schoolEndTime: string;
  periodMinutes: number;
  dayOrder: string[];
  breaks: TimetableBreakRow[];
  defaultClassLabel: string;
  roomPrefix: string;
  enforceLiveSlotAlignment: boolean;
  subjectSelectionLimit: number;
  fallbackStreamCount: number;
  preferClassTeacherStreams: boolean;
  customEntries: TimetableCustomEntry[];
};

type TemplateRevisionRow = {
  id: string;
  school_id: string;
  key: string;
  config: any;
  action: string;
  changed_at: string;
};

const defaultForm: TimetableForm = {
  schoolStartTime: '08:00',
  classStartTime: '08:00',
  classEndTime: '15:00',
  schoolEndTime: '15:30',
  periodMinutes: 45,
  dayOrder: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  breaks: [
    { id: 'break-1', afterPeriods: 2, durationMinutes: 20, label: 'Morning Break' },
    { id: 'break-2', afterPeriods: 4, durationMinutes: 30, label: 'Lunch Break' }
  ],
  defaultClassLabel: 'Class',
  roomPrefix: 'Room',
  enforceLiveSlotAlignment: true,
  subjectSelectionLimit: 8,
  fallbackStreamCount: 2,
  preferClassTeacherStreams: true,
  customEntries: []
};

const makeId = () => `entry-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const toClock = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

const buildBreakTimeline = (form: TimetableForm) => {
  const breaks = [...form.breaks]
    .filter((item) => item.afterPeriods > 0 && item.durationMinutes > 0)
    .sort((a, b) => a.afterPeriods - b.afterPeriods);

  const breakMap = new Map<number, TimetableBreakRow>();
  breaks.forEach((item) => breakMap.set(item.afterPeriods, item));

  const classStart = toMinutes(form.classStartTime || form.schoolStartTime);
  const classEnd = toMinutes(form.classEndTime || form.schoolEndTime);
  let cursor = classStart;
  let period = 0;
  const rows: Array<{ id: string; name: string; type: TimetableCustomType; startTime: string; endTime: string }> = [];

  while (cursor < classEnd) {
    const nextClassEnd = cursor + form.periodMinutes;
    if (nextClassEnd > classEnd) break;

    cursor = nextClassEnd;
    period += 1;

    const brk = breakMap.get(period);
    if (brk) {
      const breakEnd = cursor + brk.durationMinutes;
      if (breakEnd <= classEnd) {
        rows.push({
          id: brk.id,
          name: brk.label || `Break after Period ${period}`,
          type: 'BREAKS_LUNCH',
          startTime: toClock(cursor),
          endTime: toClock(breakEnd)
        });
        cursor = breakEnd;
      }
    }
  }

  return rows;
};

const requiredTemplateFields = ['schoolStartTime', 'classStartTime', 'classEndTime', 'schoolEndTime', 'periodMinutes', 'dayOrder', 'breaks', 'defaultClassLabel', 'roomPrefix', 'enforceLiveSlotAlignment', 'subjectSelectionLimit', 'fallbackStreamCount', 'preferClassTeacherStreams', 'customEntries'];

export const TemplateDetail: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditingTimetable, setIsEditingTimetable] = useState(false);
  const [template, setTemplate] = useState<TemplateRow | null>(null);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [timetableForm, setTimetableForm] = useState<TimetableForm>(defaultForm);
  const [editTimetableForm, setEditTimetableForm] = useState<TimetableForm>(defaultForm);
  const [timetableTab, setTimetableTab] = useState<'SETTINGS' | 'CUSTOM'>('SETTINGS');
  const [templateMissingFields, setTemplateMissingFields] = useState<string[]>([]);
  const [revisions, setRevisions] = useState<TemplateRevisionRow[]>([]);
  const [newCustom, setNewCustom] = useState({
    name: '',
    type: 'CUSTOM' as TimetableCustomType,
    startTime: '09:00',
    endTime: '09:30'
  });
  const [newBreak, setNewBreak] = useState<TimetableBreakRow>({ id: makeId(), afterPeriods: 2, durationMinutes: 20, label: 'Break' });

  const currentRole = String(user?.role || '').toUpperCase();

  const loadTemplate = async () => {
    if (!templateId || !user?.school_id) return;

    setLoading(true);
    try {
      const [templateRes, permissionRes, revisionRes] = await Promise.all([
        supabase
          .from('templates')
          .select('*')
          .eq('id', templateId)
          .eq('school_id', user.school_id)
          .single(),
        supabase
          .from('template_permissions')
          .select('*')
          .eq('school_id', user.school_id),
        supabase
          .from('template_revisions')
          .select('*')
          .eq('school_id', user.school_id)
          .eq('key', 'TIMETABLE_CLASSES')
          .order('changed_at', { ascending: false })
          .limit(10)
      ]);

      if (templateRes.data) {
        setTemplate(templateRes.data as TemplateRow);
        
        // Load form for timetable templates
        if (templateRes.data.key === 'TIMETABLE_CLASSES' && templateRes.data.config) {
          const cfg = templateRes.data.config;
          const missing = requiredTemplateFields.filter((key) => cfg[key] === undefined || cfg[key] === null);
          setTemplateMissingFields(missing);

          const loadedForm: TimetableForm = {
            schoolStartTime: cfg.schoolStartTime || defaultForm.schoolStartTime,
            classStartTime: cfg.classStartTime || cfg.schoolStartTime || defaultForm.classStartTime,
            classEndTime: cfg.classEndTime || cfg.schoolEndTime || defaultForm.classEndTime,
            schoolEndTime: cfg.schoolEndTime || defaultForm.schoolEndTime,
            periodMinutes: Number(cfg.periodMinutes || defaultForm.periodMinutes),
            defaultClassLabel: String(cfg.defaultClassLabel || defaultForm.defaultClassLabel),
            roomPrefix: String(cfg.roomPrefix || defaultForm.roomPrefix),
            enforceLiveSlotAlignment: typeof cfg.enforceLiveSlotAlignment === 'boolean' ? cfg.enforceLiveSlotAlignment : defaultForm.enforceLiveSlotAlignment,
            subjectSelectionLimit: Math.max(1, Number(cfg.subjectSelectionLimit || defaultForm.subjectSelectionLimit)),
            fallbackStreamCount: Math.max(1, Number(cfg.fallbackStreamCount || defaultForm.fallbackStreamCount)),
            preferClassTeacherStreams: typeof cfg.preferClassTeacherStreams === 'boolean' ? cfg.preferClassTeacherStreams : defaultForm.preferClassTeacherStreams,
            dayOrder: Array.isArray(cfg.dayOrder) && cfg.dayOrder.length > 0 ? cfg.dayOrder : defaultForm.dayOrder,
            breaks: Array.isArray(cfg.breaks) && cfg.breaks.length > 0
              ? cfg.breaks.map((b: any, idx: number) => ({
                  id: b.id || `break-${idx + 1}`,
                  afterPeriods: Math.max(1, Number(b.afterPeriods || idx + 1)),
                  durationMinutes: Math.max(5, Number(b.durationMinutes || 20)),
                  label: b.label || `Break ${idx + 1}`
                }))
              : defaultForm.breaks,
            customEntries: Array.isArray(cfg.customEntries)
              ? cfg.customEntries.map((c: any) => ({
                  id: c.id || makeId(),
                  name: c.name || 'Custom event',
                  type: (c.type || 'CUSTOM') as TimetableCustomType,
                  startTime: c.startTime || '09:00',
                  endTime: c.endTime || '09:30'
                }))
              : []
          };

          // Self-heal
          if (missing.length > 0) {
            await supabase
              .from('templates')
              .update({
                config: { ...(cfg || {}), ...loadedForm },
                updated_by: user?.id || null
              })
              .eq('id', templateId)
              .eq('school_id', user.school_id);
            setTemplateMissingFields([]);
          }

          setTimetableForm(loadedForm);
          setEditTimetableForm(loadedForm);
        }
      }

      setPermissions((permissionRes.data || []) as PermissionRow[]);
      setRevisions((revisionRes.data || []) as TemplateRevisionRow[]);
    } catch (err) {
      console.error('Failed to load template', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplate();
  }, [templateId, user?.id, user?.school_id]);

  const timetablePermission = useMemo(
    () => permissions.find((row) => row.template_key === template?.key && row.role === currentRole),
    [permissions, template?.key, currentRole]
  );

  const canEditTemplates = Boolean(timetablePermission?.can_edit);

  const recordedSpecialItems = useMemo(() => {
    const breakItems = buildBreakTimeline(timetableForm);
    return [...breakItems, ...timetableForm.customEntries];
  }, [timetableForm]);

  const saveTimetableTemplate = async (publish: boolean) => {
    if (!canEditTemplates || !template) return;

    if (publish) {
      const agreed = window.confirm('Your timetable will be changed to match the new template. Proceed?');
      if (!agreed) return;
    }

    setSaving(true);
    try {
      const breaks = [...editTimetableForm.breaks]
        .filter((item) => item.afterPeriods > 0 && item.durationMinutes > 0)
        .sort((a, b) => a.afterPeriods - b.afterPeriods)
        .map((item) => ({
          id: item.id,
          afterPeriods: item.afterPeriods,
          durationMinutes: item.durationMinutes,
          label: item.label || 'Break'
        }));

      const config = {
        schoolStartTime: editTimetableForm.schoolStartTime,
        classStartTime: editTimetableForm.classStartTime,
        classEndTime: editTimetableForm.classEndTime,
        schoolEndTime: editTimetableForm.schoolEndTime,
        periodMinutes: editTimetableForm.periodMinutes,
        defaultClassLabel: editTimetableForm.defaultClassLabel,
        roomPrefix: editTimetableForm.roomPrefix,
        enforceLiveSlotAlignment: editTimetableForm.enforceLiveSlotAlignment,
        subjectSelectionLimit: editTimetableForm.subjectSelectionLimit,
        fallbackStreamCount: editTimetableForm.fallbackStreamCount,
        preferClassTeacherStreams: editTimetableForm.preferClassTeacherStreams,
        dayOrder: editTimetableForm.dayOrder,
        breaks,
        customEntries: editTimetableForm.customEntries,
        releaseState: publish ? 'PUBLISHED' : 'DRAFT'
      };

      await supabase
        .from('templates')
        .update({
          config,
          active: true,
          updated_by: user?.id || null
        })
        .eq('id', template.id)
        .eq('school_id', user?.school_id || '');

      setTimetableForm(editTimetableForm);
      setIsEditingTimetable(false);
      alert(publish ? 'Template published successfully.' : 'Template saved as draft.');
      await loadTemplate();
      
      // Force reload Timetable if it's open - notify via event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('templateUpdated', { detail: { templateKey: 'TIMETABLE_CLASSES' } }));
      }
    } catch (err) {
      console.error('Failed to save template', err);
    } finally {
      setSaving(false);
    }
  };

  const addCustomEntry = () => {
    if (!newCustom.name.trim()) {
      alert('Please enter an event name');
      return;
    }
    if (!newCustom.startTime || !newCustom.endTime) {
      alert('Please enter start and end times');
      return;
    }
    setEditTimetableForm((prev) => ({
      ...prev,
      customEntries: [
        ...prev.customEntries,
        {
          id: makeId(),
          name: newCustom.name.trim(),
          type: newCustom.type,
          startTime: newCustom.startTime,
          endTime: newCustom.endTime
        }
      ]
    }));
    setNewCustom({ name: '', type: 'CUSTOM', startTime: '09:00', endTime: '09:30' });
    console.log('✓ Custom entry added');
  };

  const removeCustomEntry = (id: string) => {
    setEditTimetableForm((prev) => ({
      ...prev,
      customEntries: prev.customEntries.filter((item) => item.id !== id)
    }));
  };

  const addBreakRow = () => {
    setEditTimetableForm((prev) => ({
      ...prev,
      breaks: [
        ...prev.breaks,
        {
          ...newBreak,
          id: makeId(),
          afterPeriods: Math.max(1, Number(newBreak.afterPeriods || 1)),
          durationMinutes: Math.max(5, Number(newBreak.durationMinutes || 20)),
          label: newBreak.label.trim() || 'Break'
        }
      ]
    }));
    setNewBreak({ id: makeId(), afterPeriods: 2, durationMinutes: 20, label: 'Break' });
  };

  const removeBreakRow = (id: string) => {
    setEditTimetableForm((prev) => ({
      ...prev,
      breaks: prev.breaks.filter((item) => item.id !== id)
    }));
  };

  const restoreFromRevision = async (revisionId: string) => {
    if (!canEditTemplates || !template) return;
    const revision = revisions.find((r) => r.id === revisionId);
    if (!revision) return;

    const agreed = window.confirm('Restore this revision as the current template setting it to DRAFT mode?');
    if (!agreed) return;

    setSaving(true);
    try {
      await supabase
        .from('templates')
        .update({
          config: {
            ...(revision.config || {}),
            releaseState: 'DRAFT'
          },
          updated_by: user?.id || null,
          active: true
        })
        .eq('id', template.id)
        .eq('school_id', user?.school_id || '');

      await loadTemplate();
    } catch (err) {
      console.error('Failed restoring revision', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-white rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-zinc-500">Loading template...</p>
        </div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-zinc-300 mx-auto mb-3" />
        <p className="text-sm text-zinc-600">Template not found</p>
        <Button onClick={() => navigate('/templates')} className="mt-4">Back to templates</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <button
          onClick={() => navigate('/templates')}
          className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-zinc-600 dark:text-zinc-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">{template.name}</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{template.key}</p>
        </div>
        <Badge variant={template.config?.releaseState === 'PUBLISHED' ? 'success' : 'warning'}>
          {template.config?.releaseState === 'PUBLISHED' ? 'Published' : 'Draft'}
        </Badge>
      </div>

      {/* Main Content */}
      {template.key === 'TIMETABLE_CLASSES' ? (
        <div className="space-y-4">
          {/* Missing Fields Warning */}
          {templateMissingFields.length > 0 && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900 dark:text-amber-300">Some fields are using fallback values</p>
                  <p className="text-xs text-amber-800 dark:text-amber-400 mt-1">Missing: {templateMissingFields.join(', ')}</p>
                </div>
              </div>
            </div>
          )}

          {/* View Mode */}
          {!isEditingTimetable ? (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
              <div className="space-y-6">
                {/* Timing Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">School starts</p>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-white mt-1">{timetableForm.schoolStartTime}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">School ends</p>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-white mt-1">{timetableForm.schoolEndTime}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Classes start</p>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-white mt-1">{timetableForm.classStartTime}</p>
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">Classes end</p>
                    <p className="text-lg font-semibold text-zinc-900 dark:text-white mt-1">{timetableForm.classEndTime}</p>
                  </div>
                </div>

                {/* Configuration */}
                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Configuration</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-zinc-500 dark:text-zinc-400">Period duration</p>
                      <p className="font-medium text-zinc-900 dark:text-white">{timetableForm.periodMinutes} minutes</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 dark:text-zinc-400">Default class label</p>
                      <p className="font-medium text-zinc-900 dark:text-white">{timetableForm.defaultClassLabel}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 dark:text-zinc-400">Room prefix</p>
                      <p className="font-medium text-zinc-900 dark:text-white">{timetableForm.roomPrefix}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 dark:text-zinc-400">Subject limit</p>
                      <p className="font-medium text-zinc-900 dark:text-white">{timetableForm.subjectSelectionLimit}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 dark:text-zinc-400">Fallback streams</p>
                      <p className="font-medium text-zinc-900 dark:text-white">{timetableForm.fallbackStreamCount}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 dark:text-zinc-400">Days per week</p>
                      <p className="font-medium text-zinc-900 dark:text-white">{timetableForm.dayOrder.length}</p>
                    </div>
                  </div>
                </div>

                {/* More Info */}
                {recordedSpecialItems.length > 0 && (
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Schedule Items</h3>
                    <div className="space-y-2">
                      {recordedSpecialItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-start rounded-lg bg-zinc-50 dark:bg-zinc-900/50 p-3 text-sm"
                        >
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-white">{item.name}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">{item.startTime} – {item.endTime}</p>
                          </div>
                          <Badge variant="info">{item.type}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Edit Button */}
                {canEditTemplates && (
                  <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 flex justify-end">
                    <Button
                      onClick={() => {
                        setEditTimetableForm(timetableForm);
                        setIsEditingTimetable(true);
                        setTimetableTab('SETTINGS');
                      }}
                    >
                      Edit template
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Edit Mode */
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 space-y-6">
              {/* Tab Selection */}
              <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={() => setTimetableTab('SETTINGS')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    timetableTab === 'SETTINGS'
                      ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
                      : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  Timing & Settings
                </button>
                <button
                  onClick={() => setTimetableTab('CUSTOM')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                    timetableTab === 'CUSTOM'
                      ? 'border-zinc-900 dark:border-white text-zinc-900 dark:text-white'
                      : 'border-transparent text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  }`}
                >
                  Schedule Items
                </button>
              </div>

              {/* Settings Tab */}
              {timetableTab === 'SETTINGS' && (
                <div className="space-y-6">
                  {/* Timing Section */}
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">School Hours</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">School starts at</label>
                        <input
                          type="time"
                          value={editTimetableForm.schoolStartTime}
                          onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, schoolStartTime: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">School ends at</label>
                        <input
                          type="time"
                          value={editTimetableForm.schoolEndTime}
                          onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, schoolEndTime: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">Classes start at</label>
                        <input
                          type="time"
                          value={editTimetableForm.classStartTime}
                          onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, classStartTime: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">Classes end at</label>
                        <input
                          type="time"
                          value={editTimetableForm.classEndTime}
                          onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, classEndTime: e.target.value }))}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Generation Settings */}
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Generation Defaults</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">Minutes per period</label>
                        <input
                          type="number"
                          min={20}
                          max={120}
                          value={editTimetableForm.periodMinutes}
                          onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, periodMinutes: Math.max(20, Number(e.target.value) || 45) }))}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">Default class label</label>
                        <input
                          type="text"
                          value={editTimetableForm.defaultClassLabel}
                          onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, defaultClassLabel: e.target.value || 'Class' }))}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">Room prefix</label>
                        <input
                          type="text"
                          value={editTimetableForm.roomPrefix}
                          onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, roomPrefix: e.target.value || 'Room' }))}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">Subject selection limit</label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={editTimetableForm.subjectSelectionLimit}
                          onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, subjectSelectionLimit: Math.max(1, Number(e.target.value) || 1) }))}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">Fallback stream count</label>
                        <input
                          type="number"
                          min={1}
                          max={10}
                          value={editTimetableForm.fallbackStreamCount}
                          onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, fallbackStreamCount: Math.max(1, Number(e.target.value) || 1) }))}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Checkboxes */}
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editTimetableForm.enforceLiveSlotAlignment}
                        onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, enforceLiveSlotAlignment: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Enforce live sessions to match template slots</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editTimetableForm.preferClassTeacherStreams}
                        onChange={(e) => setEditTimetableForm((prev) => ({ ...prev, preferClassTeacherStreams: e.target.checked }))}
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Prefer class-teacher assigned streams</span>
                    </label>
                  </div>

                  {/* Breaks */}
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Breaks</h4>
                    <div className="space-y-3">
                      {editTimetableForm.breaks.map((item) => (
                        <div key={item.id} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                          <input
                            className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                            placeholder="Break name"
                            value={item.label}
                            onChange={(e) =>
                              setEditTimetableForm((prev) => ({
                                ...prev,
                                breaks: prev.breaks.map((row) =>
                                  row.id === item.id ? { ...row, label: e.target.value } : row
                                )
                              }))
                            }
                          />
                          <input
                            type="number"
                            min={1}
                            placeholder="After period"
                            className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                            value={item.afterPeriods}
                            onChange={(e) =>
                              setEditTimetableForm((prev) => ({
                                ...prev,
                                breaks: prev.breaks.map((row) =>
                                  row.id === item.id
                                    ? { ...row, afterPeriods: Math.max(1, Number(e.target.value) || 1) }
                                    : row
                                )
                              }))
                            }
                          />
                          <input
                            type="number"
                            min={5}
                            placeholder="Duration (min)"
                            className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                            value={item.durationMinutes}
                            onChange={(e) =>
                              setEditTimetableForm((prev) => ({
                                ...prev,
                                breaks: prev.breaks.map((row) =>
                                  row.id === item.id
                                    ? { ...row, durationMinutes: Math.max(5, Number(e.target.value) || 5) }
                                    : row
                                )
                              }))
                            }
                          />
                          <Button
                            variant="outline"
                            className="h-10"
                            onClick={() => removeBreakRow(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}

                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end border-t border-zinc-200 dark:border-zinc-800 pt-3">
                        <input
                          className="px-3 py-2 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                          placeholder="Break name"
                          value={newBreak.label}
                          onChange={(e) => setNewBreak((prev) => ({ ...prev, label: e.target.value }))}
                        />
                        <input
                          type="number"
                          min={1}
                          placeholder="After period"
                          className="px-3 py-2 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                          value={newBreak.afterPeriods}
                          onChange={(e) => setNewBreak((prev) => ({ ...prev, afterPeriods: Math.max(1, Number(e.target.value) || 1) }))}
                        />
                        <input
                          type="number"
                          min={5}
                          placeholder="Duration (min)"
                          className="px-3 py-2 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                          value={newBreak.durationMinutes}
                          onChange={(e) => setNewBreak((prev) => ({ ...prev, durationMinutes: Math.max(5, Number(e.target.value) || 5) }))}
                        />
                        <Button
                          variant="outline"
                          className="h-10 md:col-span-1"
                          onClick={addBreakRow}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Custom Items Tab */}
              {timetableTab === 'CUSTOM' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <input
                      className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm md:col-span-2"
                      placeholder="Event name"
                      value={newCustom.name}
                      onChange={(e) => setNewCustom((prev) => ({ ...prev, name: e.target.value }))}
                    />
                    <select
                      className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                      value={newCustom.type}
                      onChange={(e) => setNewCustom((prev) => ({ ...prev, type: e.target.value as TimetableCustomType }))}
                    >
                      <option value="CLASS">Class</option>
                      <option value="ASSEMBLY">Assembly</option>
                      <option value="EXAMS">Exams</option>
                      <option value="BREAKS_LUNCH">Breaks & Lunch</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                    <input
                      type="time"
                      className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                      value={newCustom.startTime}
                      onChange={(e) => setNewCustom((prev) => ({ ...prev, startTime: e.target.value }))}
                    />
                    <input
                      type="time"
                      className="px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 text-sm"
                      value={newCustom.endTime}
                      onChange={(e) => setNewCustom((prev) => ({ ...prev, endTime: e.target.value }))}
                    />
                  </div>

                  <Button onClick={addCustomEntry} disabled={!newCustom.name.trim()}>
                    <Plus className="w-4 h-4" /> Add item
                  </Button>

                  <div className="space-y-2 border-t border-zinc-200 dark:border-zinc-800 pt-4">
                    {editTimetableForm.customEntries.length === 0 ? (
                      <p className="text-xs text-zinc-500">No custom items yet</p>
                    ) : (
                      editTimetableForm.customEntries.map((item) => (
                        <div
                          key={item.id}
                          className="flex justify-between items-center rounded-lg bg-zinc-50 dark:bg-zinc-900/50 p-3"
                        >
                          <div className="text-sm">
                            <p className="font-medium text-zinc-900 dark:text-white">{item.name}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {item.startTime} – {item.endTime} • {item.type}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            className="h-8 px-2"
                            onClick={() => removeCustomEntry(item.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Save Actions */}
              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 flex justify-end gap-3">
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => {
                    setEditTimetableForm(timetableForm);
                    setIsEditingTimetable(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  disabled={saving}
                  onClick={() => saveTimetableTemplate(false)}
                >
                  Save as draft
                </Button>
                <Button
                  disabled={saving}
                  onClick={() => saveTimetableTemplate(true)}
                >
                  Publish & apply
                </Button>
              </div>
            </div>
          )}

          {/* Revisions */}
          {revisions.length > 0 && (
            <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white mb-4">Revision History</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {revisions.map((rev) => (
                  <div
                    key={rev.id}
                    className="flex justify-between items-center rounded-lg bg-zinc-50 dark:bg-zinc-900/50 p-3 text-xs"
                  >
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white">{rev.action}</p>
                      <p className="text-zinc-500 dark:text-zinc-400">
                        {new Date(rev.changed_at).toLocaleString('en-GB')}
                      </p>
                    </div>
                    {canEditTemplates && (
                      <Button variant="outline" className="h-7 text-xs px-2" onClick={() => restoreFromRevision(rev.id)} disabled={saving}>
                        Restore
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Non-Timetable Templates */
        <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
          <p>This template type does not have editable configuration</p>
        </div>
      )}
    </div>
  );
};
