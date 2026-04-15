import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Settings, Eye, Edit3, MoreVertical, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Button, Badge } from '../components/UI';

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
  school_id: string;
};

export const TemplatesList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [schoolFilter, setSchoolFilter] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const ensureCatalogAttemptedRef = useRef(false);

  const currentRole = String(user?.role || '').toUpperCase();

  const buildDefaultAcademicCalendarConfig = () => {
    const year = new Date().getFullYear();
    return {
      timezone: 'Africa/Nairobi',
      year,
      yearStartDate: `${year}-01-01`,
      yearEndDate: `${year}-12-31`,
      termDurationWeeksMin: 8,
      termDurationWeeksMax: 28,
      terms: [
        { termNumber: 1, name: 'Term 1', startDate: null, endDate: null, midBreakStart: null, midBreakEnd: null, reportDeadline: null, resultsDeadline: null },
        { termNumber: 2, name: 'Term 2', startDate: null, endDate: null, midBreakStart: null, midBreakEnd: null, reportDeadline: null, resultsDeadline: null },
        { termNumber: 3, name: 'Term 3', startDate: null, endDate: null, midBreakStart: null, midBreakEnd: null, reportDeadline: null, resultsDeadline: null }
      ],
      holidays: [],
      events: [],
      releaseState: 'DRAFT'
    };
  };

  const ensureAcademicCalendarTemplate = async (schoolId: string) => {
    const { error: templateErr } = await supabase
      .from('templates')
      .upsert({
        school_id: schoolId,
        key: 'ACADEMIC_CALENDAR_SETUP',
        name: 'Academic Calendar Setup',
        category: 'ACADEMICS',
        config: buildDefaultAcademicCalendarConfig(),
        active: true,
        archived: false,
        deleted_at: null,
        updated_by: user?.id || null
      }, { onConflict: 'school_id,key' });

    if (templateErr) throw templateErr;

    const roleRows = [
      { role: 'ADMIN', can_view: true, can_use: true, can_edit: true },
      { role: 'PRINCIPAL', can_view: true, can_use: true, can_edit: true },
      { role: 'TEACHER', can_view: true, can_use: false, can_edit: false }
    ].map((row) => ({
      school_id: schoolId,
      template_key: 'ACADEMIC_CALENDAR_SETUP',
      ...row
    }));

    const { error: permErr } = await supabase
      .from('template_permissions')
      .upsert(roleRows, { onConflict: 'school_id,template_key,role' });

    if (permErr) throw permErr;
  };

  const loadData = async () => {
    if (!user?.school_id) {
      setTemplates([]);
      setPermissions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const [templateRes, permissionRes] = await Promise.all([
        supabase
          .from('templates')
          .select('*')
          .eq('school_id', user.school_id)
          .eq('archived', false)
          .order('updated_at', { ascending: false }),
        supabase
          .from('template_permissions')
          .select('*')
          .eq('school_id', user.school_id)
      ]);

      const templateRows = (templateRes.data || []) as TemplateRow[];
      const hasCalendarTemplate = templateRows.some((row) => row.key === 'ACADEMIC_CALENDAR_SETUP');
      const canProvisionCatalog = currentRole === 'ADMIN' || currentRole === 'PRINCIPAL';

      if (!hasCalendarTemplate && canProvisionCatalog && !ensureCatalogAttemptedRef.current) {
        ensureCatalogAttemptedRef.current = true;
        await ensureAcademicCalendarTemplate(user.school_id);
        return await loadData();
      }

      setTemplates(templateRows);
      setPermissions((permissionRes.data || []) as PermissionRow[]);
    } catch (err) {
      console.error('Failed to load templates', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    ensureCatalogAttemptedRef.current = false;
    loadData();
  }, [user?.id, user?.school_id]);

  useEffect(() => {
    if (!user?.school_id) return;

    const channel = supabase
      .channel(`templates-list-realtime-${user.school_id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'templates' }, () => {
        loadData().catch((err) => console.error('Realtime refresh failed', err));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.school_id]);

  const permissionMap = useMemo(() => {
    const map = new Map<string, PermissionRow>();
    permissions.forEach((perm) => {
      if (perm.role === currentRole) {
        map.set(perm.template_key, perm);
      }
    });
    return map;
  }, [permissions, currentRole]);

  const filtered = useMemo(() => {
    return templates.filter((t) => {
      const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.key.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSchool = !schoolFilter || t.school_id === schoolFilter;
      return matchesSearch && matchesSchool;
    });
  }, [templates, searchTerm, schoolFilter]);

  const handleEditClick = (templateId: string, templateKey: string) => {
    const perm = permissionMap.get(templateKey);
    if (!perm?.can_view) return;
    navigate(`/template-detail/${templateId}`);
    setMenuOpen(null);
  };

  const getStatusColor = (template: TemplateRow) => {
    const config = template.config || {};
    const status = config.releaseState || 'DRAFT';
    return status === 'PUBLISHED' ? 'success' : 'warning';
  };

  const getStatusText = (template: TemplateRow) => {
    const config = template.config || {};
    const status = config.releaseState || 'DRAFT';
    return status === 'PUBLISHED' ? 'Published' : 'Draft';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-GB');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-3 border-zinc-300 dark:border-zinc-700 border-t-zinc-900 dark:border-t-white rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-zinc-500">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">Institution Templates</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">Manage academic calendars, schedules, governance rules, and system configurations</p>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by name or key..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 text-sm focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
          />
        </div>
      </div>

      {/* Empty State */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            {user?.school_id ? 'No templates found matching your search' : 'No school is selected for this profile yet. Please log in again or switch back to a live profile role.'}
          </p>
        </div>
      ) : (
        /* Grid of Templates */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => {
            const perm = permissionMap.get(template.key);
            const canView = perm?.can_view;
            const canEdit = perm?.can_edit;
            const status = getStatusText(template);
            const statusColor = getStatusColor(template);

            return (
              <div
                key={template.id}
                className="group relative rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all"
              >
                {/* Card Header */}
                <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-zinc-900 dark:text-white truncate">{template.name}</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{template.key}</p>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === template.id ? null : template.id)}
                        className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-zinc-400" />
                      </button>

                      {/* Dropdown Menu */}
                      {menuOpen === template.id && (
                        <div className="absolute right-0 top-full mt-1 z-10 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg">
                          {canView && (
                            <button
                              onClick={() => handleEditClick(template.id, template.key)}
                              className="w-full text-left px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-700"
                            >
                              <Eye className="w-3 h-3" /> View details
                            </button>
                          )}
                          {canEdit && (
                            <button
                              onClick={() => handleEditClick(template.id, template.key)}
                              className="w-full text-left px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 flex items-center gap-2"
                            >
                              <Edit3 className="w-3 h-3" /> Edit template
                            </button>
                          )}
                          {!canView && (
                            <p className="px-3 py-2 text-xs text-zinc-500">No permissions</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 space-y-3">
                  {/* Status & Category */}
                  <div className="flex items-center gap-2">
                    <Badge variant={statusColor as any}>{status}</Badge>
                    {template.active && <Badge variant="info">Active</Badge>}
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-zinc-500 dark:text-zinc-400">Updated</p>
                      <p className="font-medium text-zinc-900 dark:text-white">{formatDate(template.updated_at)}</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 dark:text-zinc-400">Category</p>
                      <p className="font-medium text-zinc-900 dark:text-white capitalize">{template.category || 'System'}</p>
                    </div>
                  </div>

                  {/* Template-Specific Info */}
                  {template.key === 'TIMETABLE_CLASSES' && template.config && (
                    <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs space-y-1">
                      <p className="text-zinc-500 dark:text-zinc-400">
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{template.config.schoolStartTime || 'N/A'}</span>
                        {' '}–{' '}
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">{template.config.schoolEndTime || 'N/A'}</span>
                      </p>
                      <p className="text-zinc-500 dark:text-zinc-400">
                        {template.config.periodMinutes || 0} min periods
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Footer - Quick Action Button */}
                {canView && (
                  <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 rounded-b-xl">
                    <button
                      onClick={() => handleEditClick(template.id, template.key)}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                        canEdit
                          ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                      }`}
                    >
                      {canEdit ? 'Edit' : 'View'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Info */}
      <div className="text-xs text-zinc-500 dark:text-zinc-400 text-center py-4 border-t border-zinc-200 dark:border-zinc-800">
        <p>Showing {filtered.length} of {templates.length} templates</p>
      </div>
    </div>
  );
};
