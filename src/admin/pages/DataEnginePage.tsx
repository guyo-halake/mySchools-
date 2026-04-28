import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/adminSupabase';
import * as XLSX from 'xlsx';
import { 
  RefreshCw, CloudUpload, Loader2, Database, FileSpreadsheet, Building2, CheckCircle2, Plus, Trash2, 
  ShieldAlert, AlertTriangle, X
} from 'lucide-react';
import { useAdminAlert } from '../context/AdminAlertContext';
import { SchoolOnboardingWizard } from '../components/SchoolOnboardingWizard';

type UserRole = 'STUDENT' | 'TEACHER' | 'PARENT' | 'ADMIN' | 'DEVELOPER';

interface DatabaseColumn {
  header: string;
  key: string;
  width: string;
  table: string;
}

interface SeedingRow {
  id: string;
  _status: 'pending' | 'modified' | 'saved';
  [key: string]: any;
}

export const DataEnginePage: React.FC = () => {
  const { showAlert } = useAdminAlert();
  const excelInputRef = useRef<HTMLInputElement>(null);
  const resultsExcelInputRef = useRef<HTMLInputElement>(null);
  
  const [activeTab, setActiveTab] = useState<UserRole>('STUDENT');
  const [schools, setSchools] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [globalTermId, setGlobalTermId] = useState<string>('');
  const [globalExamType, setGlobalExamType] = useState<string>('');
  const [globalExamName, setGlobalExamName] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SeedingRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [mapperState, setMapperState] = useState<{
    isOpen: boolean;
    mode: 'IDENTITY' | 'RESULTS';
    rawHeaders: string[];
    rawData: any[];
    mappings: Record<string, string>;
  } | null>(null);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    const { data } = await supabase.from('schools').select('id, name').order('name');
    setSchools(data || []);
  };

  const loadSchoolContext = async () => {
    if (!selectedSchoolId) return;
    const [{ data: subs }, { data: trms }] = await Promise.all([
      supabase.from('subjects').select('id, name, code').eq('school_id', selectedSchoolId),
      supabase.from('terms').select('id, name, year').eq('school_id', selectedSchoolId)
    ]);
    setSubjects(subs || []);
    setTerms(trms || []);
  };

  useEffect(() => { loadSchoolContext(); }, [selectedSchoolId]);

  const getColumnsForRole = (role: UserRole): DatabaseColumn[] => {
    const pBase: DatabaseColumn[] = [
      { header: 'Full Name', key: 'full_name', width: 'w-60', table: 'profiles' },
      { header: 'Email', key: 'email', width: 'w-60', table: 'profiles' },
      { header: 'Phone', key: 'phone', width: 'w-48', table: 'profiles' },
    ];

    switch (role) {
      case 'STUDENT':
        return [
          { header: 'Adm No', key: 'adm_no', width: 'w-32', table: 'students' },
          ...pBase,
          { header: 'Parent Name', key: 'parent_name', width: 'w-48', table: 'linked_profiles' },
          { header: 'Parent Phone', key: 'parent_phone', width: 'w-40', table: 'linked_profiles' },
          { header: 'Class/Stream', key: 'stream_name', width: 'w-32', table: 'streams' },
          { header: 'Assigned Subjects', key: 'assigned_subjects', width: 'w-60', table: 'student_subjects' },
          { header: 'Discipline', key: 'discipline_status', width: 'w-32', table: 'students' },
          { header: 'Date of Birth', key: 'date_of_birth', width: 'w-40', table: 'students' },
          { header: 'Address', key: 'address', width: 'w-56', table: 'students' },
          { header: 'Sport', key: 'sport', width: 'w-32', table: 'students' },
          { header: 'Blood Group', key: 'blood_group', width: 'w-24', table: 'student_health' },
          { header: 'Allergies', key: 'allergies', width: 'w-48', table: 'student_health' },
        ];
      case 'TEACHER':
        return [
          ...pBase,
          { header: 'TSC Number', key: 'tsc_number', width: 'w-40', table: 'teachers' },
          { header: 'Department', key: 'department', width: 'w-40', table: 'profiles' },
          { header: 'Subjects Taught', key: 'subjects_taught', width: 'w-60', table: 'teacher_assignments' },
        ];
      case 'PARENT':
        return [
          ...pBase,
          { header: 'Occupation', key: 'occupation', width: 'w-48', table: 'profiles' },
          { header: 'Child Adm No', key: 'child_adm', width: 'w-32', table: 'linked_students' },
        ];
      case 'ADMIN':
      case 'DEVELOPER':
        return pBase;
      default: return pBase;
    }
  };

  const loadData = async () => {
    if (!selectedSchoolId) return;
    setLoading(true);
    const { data: profiles } = await supabase.from('profiles').select('*').eq('school_id', selectedSchoolId).eq('role', activeTab);
    
    let richData: any[] = [];
    if (activeTab === 'STUDENT') {
      const { data: students } = await supabase.from('students').select('*, profiles!students_id_fkey(full_name, phone), student_health(*), streams(name)').eq('school_id', selectedSchoolId);
      const { data: parents } = await supabase.from('profiles').select('id, full_name, phone').eq('school_id', selectedSchoolId).eq('role', 'PARENT');
      
      richData = (profiles || []).map(p => {
        const s = students?.find(st => st.id === p.id);
        const parent = parents?.find(pr => pr.id === s?.parent_id);
        return { 
          ...p, ...s, 
          stream_name: s?.streams?.name,
          parent_name: parent?.full_name,
          parent_phone: parent?.phone,
          blood_group: s?.student_health?.[0]?.blood_group, 
          allergies: s?.student_health?.[0]?.allergies 
        };
      });
    } else if (activeTab === 'TEACHER') {
      const { data: teachers } = await supabase.from('teachers').select('*').eq('school_id', selectedSchoolId);
      richData = (profiles || []).map(p => ({ ...p, ...(teachers?.find(t => t.id === p.id)) }));
    } else {
      richData = profiles || [];
    }

    setData(richData.map(r => ({ ...r, _status: 'saved' })));
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [activeTab, selectedSchoolId]);

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSchoolId) {
      if (!selectedSchoolId) showAlert('Choose institution first.', 'Logic');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        if (raw.length === 0) return showAlert('Excel file is empty', 'Error');
        
        const rawHeaders = Object.keys(raw[0]);
        const cols = getColumnsForRole(activeTab);
        
        // Smart Heuristic Pre-mapping
        const initialMappings: Record<string, string> = {};
        rawHeaders.forEach(header => {
           const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');
           let bestMatch = '';
           
           cols.forEach(c => {
             const k = c.key.toLowerCase().replace(/[^a-z0-9]/g, '');
             const l = c.header.toLowerCase().replace(/[^a-z0-9]/g, '');
             if (h.includes(k) || k.includes(h) || h.includes(l) || l.includes(h)) {
                bestMatch = c.key;
             }
           });
           
             // Advanced heuristics for messy data
           if (!bestMatch) {
             if (h.includes('name') && !h.includes('parent') && !h.includes('mum') && !h.includes('dad')) bestMatch = 'full_name';
             if (h.includes('adm') || h.includes('reg') || h.includes('id')) bestMatch = 'adm_no';
             if (h.includes('class') || h.includes('grade') || h.includes('form') || h.includes('stream')) bestMatch = 'stream_name';
             if (h.includes('mum') || h.includes('dad') || h.includes('guardian') || h.includes('parent')) {
                if (h.includes('phone') || h.includes('no') || h.includes('num') || h.includes('contact')) bestMatch = 'parent_phone';
                else bestMatch = 'parent_name';
             }
             if (h.includes('dob') || h.includes('birth')) bestMatch = 'date_of_birth';
             if (h.includes('tsc')) bestMatch = 'tsc_number';
             if (h.includes('subj') || h.includes('course')) bestMatch = activeTab === 'TEACHER' ? 'subjects_taught' : 'assigned_subjects';
             if (h.includes('mail')) bestMatch = 'email';
           }
           
           initialMappings[header] = bestMatch;
        });

        setMapperState({ isOpen: true, mode: 'IDENTITY', rawHeaders, rawData: raw, mappings: initialMappings });
      } catch (err) {
        showAlert('Failed to parse Excel file', 'Error');
      }
    };
    reader.readAsBinaryString(file);
    if (excelInputRef.current) excelInputRef.current.value = '';
  };

  const applyMappings = () => {
    if (!mapperState) return;
    
    const mapped = mapperState.rawData.map((r, index) => {
      const row: any = { id: crypto.randomUUID(), _status: 'pending' };
      
      Object.entries(mapperState.mappings).forEach(([excelHeader, dbKey]) => {
         if (dbKey && dbKey !== 'IGNORE_COL') {
            let val = r[excelHeader];
            if (val && typeof val === 'string') {
               if (dbKey.includes('phone')) val = val.replace(/[^0-9+]/g, '');
               val = val.trim();
            }
            row[dbKey] = val;
         }
      });
      return row;
    });
    
    setData(prev => [...mapped, ...prev]);
    setMapperState(null);
    showAlert(`Mapped ${mapped.length} records. Review grid for errors before syncing.`, 'Success');
  };

  const handleResultsExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedSchoolId) return showAlert('Choose institution first.', 'Logic');
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
        if (raw.length === 0) return showAlert('Excel file is empty', 'Error');
        
        const rawHeaders = Object.keys(raw[0]);
        const initialMappings: Record<string, string> = {};
        
        rawHeaders.forEach(header => {
           const h = header.toLowerCase().replace(/[^a-z0-9]/g, '');
           let bestMatch = '';
           
           if (h.includes('adm') || h.includes('reg') || h.includes('id')) bestMatch = 'adm_no';
           else if (h.includes('name') || h.includes('student')) bestMatch = 'student_name';
           else if (h.includes('class') || h.includes('grade') || h.includes('form') || h.includes('stream')) bestMatch = 'stream_name';
           else {
              const subMatch = subjects.find(s => h.includes(s.name.toLowerCase().replace(/[^a-z0-9]/g, '')) || h.includes(s.code?.toLowerCase() || 'xxxxx'));
              if (subMatch) bestMatch = subMatch.id;
           }
           initialMappings[header] = bestMatch;
        });

        setMapperState({ isOpen: true, mode: 'RESULTS', rawHeaders, rawData: raw, mappings: initialMappings });
      } catch (err) {
        showAlert('Failed to parse Results file', 'Error');
      }
    };
    reader.readAsBinaryString(file);
    if (resultsExcelInputRef.current) resultsExcelInputRef.current.value = '';
  };

  const syncResults = async () => {
    if (!mapperState || mapperState.mode !== 'RESULTS') return;
    if (!globalTermId || !globalExamType || !globalExamName) return showAlert('Please fill out all Target Exam Context fields (Term, Type, Name).', 'Error');
    
    setIsProcessing(true);
    let successCount = 0;
    
    for (let i = 0; i < mapperState.rawData.length; i++) {
       const row = mapperState.rawData[i];
       try {
          const mappedRow: any = {};
          Object.entries(mapperState.mappings).forEach(([exc, dbKey]) => { if(dbKey && dbKey !== 'IGNORE_COL') mappedRow[dbKey] = row[exc]; });
          
          let resolvedStudentId = null;
          let streamId = null;
          
          if (mappedRow.adm_no) {
             const { data: st } = await supabase.from('students').select('id, stream_id').eq('school_id', selectedSchoolId).eq('adm_no', mappedRow.adm_no).single();
             if (st) { resolvedStudentId = st.id; streamId = st.stream_id; }
          }
          if (!resolvedStudentId && mappedRow.student_name) {
             const { data: pr } = await supabase.from('profiles').select('id').eq('school_id', selectedSchoolId).eq('role', 'STUDENT').ilike('full_name', `%${mappedRow.student_name.trim()}%`).limit(1).single();
             if (pr) {
                 resolvedStudentId = pr.id;
                 const { data: st } = await supabase.from('students').select('stream_id').eq('id', pr.id).single();
                 if (st) streamId = st.stream_id;
             }
          }
          
          if (!resolvedStudentId) throw new Error(`Student Identity Failed: Adm ${mappedRow.adm_no || 'N/A'}`);

          for (const sub of subjects) {
             const mark = mappedRow[sub.id];
             if (mark !== undefined && mark !== '' && !isNaN(parseFloat(mark))) {
                await supabase.from('results_workflow').upsert({ 
                   school_id: selectedSchoolId, 
                   student_id: resolvedStudentId, 
                   subject_id: sub.id, 
                   term_id: globalTermId,
                   exam_type: globalExamType,
                   exam_name: globalExamName,
                   stream_id: streamId,
                   marks: parseFloat(mark), 
                   status: 'PUBLISHED' 
                }, { onConflict: 'school_id, student_id, subject_id, term_id, exam_type' });
             }
          }
          successCount++;
          setLogs(prev => [{ row: i+1, message: `Results synced for ${mappedRow.student_name || mappedRow.adm_no}.`, type: 'success' }, ...prev]);
       } catch (err: any) {
          setLogs(prev => [{ row: i+1, message: err.message, type: 'error' }, ...prev]);
       }
    }
    
    setIsProcessing(false);
    setMapperState(null);
    showAlert(`Successfully imported results for ${successCount} students.`, 'Success');
  };

  const syncToCloud = async () => {
    // ... rest remains same
    const dirty = data.filter(r => r._status !== 'saved');
    if (dirty.length === 0) return showAlert('Cloud is already in sync with this list.', 'Info');

    setIsProcessing(true);
    const { data: allSubjects } = await supabase.from('subjects').select('id, name, is_compulsory').eq('school_id', selectedSchoolId);
    
    for (let i = 0; i < dirty.length; i++) {
       const row = dirty[i];
       try {
          let parentId = null;
          if (row.parent_phone) {
             const { data: pFind } = await supabase.from('profiles').select('id').eq('school_id', selectedSchoolId).eq('phone', row.parent_phone).eq('role', 'PARENT').single();
             if (pFind) parentId = pFind.id;
             else if (row.parent_name) {
               const { data: pNew } = await supabase.from('profiles').insert({ school_id: selectedSchoolId, full_name: row.parent_name, phone: row.parent_phone, role: 'PARENT', password: 'password123' }).select().single();
               if (pNew) parentId = pNew.id;
             }
          }

          const { data: pData, error: pErr } = await supabase.from('profiles').upsert({
            id: row._status === 'pending' ? undefined : row.id,
            school_id: selectedSchoolId,
            full_name: row.full_name,
            email: row.email,
            phone: row.phone,
            role: activeTab,
            department: row.department,
            password: 'password123'
          }).select().single();

          if (pErr) throw pErr;

           if (activeTab === 'STUDENT') {
             await supabase.from('students').upsert({ 
               id: pData.id, 
               school_id: selectedSchoolId, 
               adm_no: row.adm_no, 
               parent_id: parentId,
               discipline_status: row.discipline_status || 'RESOLVED',
               date_of_birth: row.date_of_birth, 
               address: row.address, 
               sport: row.sport 
             });
             
             if (row.blood_group || row.allergies) {
               await supabase.from('student_health').upsert({ student_id: pData.id, blood_group: row.blood_group, allergies: row.allergies });
             }

             if (row.assigned_subjects) {
               const subIds = allSubjects?.filter(s => row.assigned_subjects.toLowerCase().includes(s.name.toLowerCase())).map(s => s.id);
               if (subIds?.length) {
                  await supabase.from('student_subjects').delete().eq('student_id', pData.id);
                  await supabase.from('student_subjects').insert(subIds.map(sid => ({ student_id: pData.id, subject_id: sid, school_id: selectedSchoolId })));
               }
             }
          } else if (activeTab === 'TEACHER') {
             await supabase.from('teachers').upsert({ id: pData.id, school_id: selectedSchoolId, tsc_number: row.tsc_number });
          }
          
          setLogs(prev => [{ row: i+1, message: `Sync complete for ${row.full_name || row.student_name || 'Record'}.`, type: 'success' }, ...prev]);
       } catch (err: any) {
          setLogs(prev => [{ row: i+1, message: err.message, type: 'error' }, ...prev]);
       }
    }
    setIsProcessing(false);
    loadData();
    showAlert('Real-time synchronization successful.', 'Sync');
  };

  const selectedSchoolName = schools.find(s => s.id === selectedSchoolId)?.name || '';

  return (
    <div className="p-4 md:p-10 font-inter text-zinc-950 max-w-[1900px] mx-auto min-h-screen flex flex-col gap-8 bg-white" onClick={() => isDropdownOpen && setIsDropdownOpen(false)}>
      <input type="file" ref={excelInputRef} className="hidden" onChange={handleExcelUpload} />
      <input type="file" ref={resultsExcelInputRef} className="hidden" onChange={handleResultsExcelUpload} />

      <div className="flex flex-col gap-2 pb-8 border-b border-zinc-100 relative z-50">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Onboard Institutions</h1>
          
          <div className="relative">
            <button 
              onClick={(e) => { e.stopPropagation(); setIsDropdownOpen(!isDropdownOpen); }}
              className="flex items-center justify-between min-w-[260px] bg-white border-2 border-zinc-200 hover:border-orange-500 rounded-xl px-5 py-3 gap-3 transition-all cursor-pointer shadow-sm focus:ring-4 focus:ring-orange-500/20"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                  <Building2 size={16} />
                </div>
                <span className={`text-sm font-bold ${selectedSchoolId ? 'text-zinc-900' : 'text-zinc-400'}`}>
                  {selectedSchoolId ? selectedSchoolName : 'Select Institution...'}
                </span>
              </div>
              <div className={`transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 mt-2 w-full bg-white border border-zinc-100 rounded-2xl shadow-2xl py-2 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <button 
                  onClick={() => setSelectedSchoolId('')}
                  className="w-full text-left px-5 py-3 text-sm font-bold text-zinc-400 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                >
                  Clear Selection
                </button>
                <div className="w-full h-px bg-zinc-100 my-1"></div>
                {schools.map(s => (
                  <button 
                    key={s.id} 
                    onClick={() => setSelectedSchoolId(s.id)}
                    className={`w-full text-left px-5 py-3 text-sm font-bold transition-colors flex items-center justify-between ${selectedSchoolId === s.id ? 'bg-orange-50 text-orange-600' : 'text-zinc-700 hover:bg-zinc-50'}`}
                  >
                    {s.name}
                    {selectedSchoolId === s.id && <CheckCircle2 size={16} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedSchoolId && (
            <div className="ml-auto flex items-center gap-2">
              <button onClick={() => excelInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-transparent border border-zinc-200 hover:border-zinc-900 hover:text-zinc-900 text-zinc-500 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all">
                <FileSpreadsheet size={14} /> Smart Mapper
              </button>
              <button onClick={() => resultsExcelInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-orange-50 border border-orange-200 text-orange-600 hover:bg-orange-100 hover:border-orange-300 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all">
                <FileSpreadsheet size={14} /> Results Smart Mapper
              </button>
              <button onClick={() => setData([{ id: crypto.randomUUID(), _status: 'pending' }])} className="flex items-center gap-2 px-4 py-2 bg-transparent text-zinc-400 hover:text-zinc-900 rounded-lg text-[11px] font-bold uppercase tracking-widest transition-all">
                <Plus size={14} /> Add Manual
              </button>
            </div>
          )}
        </div>

        {selectedSchoolId && (
           <p className="text-[13px] font-black text-orange-600 uppercase tracking-widest mt-1 animate-in fade-in">{selectedSchoolName} Settings</p>
        )}
      </div>

      <div className="flex flex-col lg:flex-row flex-1 gap-10 overflow-hidden">
        
        <div className="flex-1 flex flex-col border border-zinc-100 rounded-[2.5rem] overflow-hidden shadow-sm bg-zinc-50/20">
          
          {!selectedSchoolId ? (
             <SchoolOnboardingWizard onComplete={(id) => {
                 fetchSchools();
                 setSelectedSchoolId(id);
             }} />
          ) : (
             <>
                <div className="flex items-center bg-white border-b border-zinc-100 overflow-x-auto no-scrollbar">
                   {(['STUDENT', 'TEACHER', 'PARENT', 'ADMIN', 'DEVELOPER', 'ONBOARDING'] as (UserRole | 'ONBOARDING')[]).map(r => (
                     <button key={r} onClick={() => setActiveTab(r as UserRole)} className={`px-12 py-6 text-[10px] font-black uppercase tracking-[0.25em] transition-all relative whitespace-nowrap ${activeTab === r ? 'bg-zinc-50/50 text-zinc-950 shadow-[0_-4px_0_#FCA311_inset]' : 'text-zinc-300 hover:text-zinc-500'}`}>{r}</button>
                   ))}
                </div>

                <div className="p-3 flex items-center border-b border-zinc-50 gap-3 bg-white">
                   <div className="flex items-center flex-1 bg-zinc-50 px-8 py-4 rounded-2xl border border-zinc-100">
                      <input placeholder={`Querying ${activeTab.toLowerCase()} cloud...`} className="bg-transparent outline-none text-[12px] font-medium w-full text-zinc-900" />
                   </div>
                   <button onClick={() => { const d = localStorage.getItem(`d_${activeTab}`); if(d) setData(JSON.parse(d)); }} className="p-4 border border-zinc-100 rounded-2xl text-zinc-300 hover:text-black"><RefreshCw size={18} /></button>
                   <button onClick={() => localStorage.setItem(`d_${activeTab}`, JSON.stringify(data))} className="px-8 py-4 border border-zinc-200 text-[10px] font-black uppercase rounded-xl hover:border-black transition-all">Draft</button>
                   <button disabled={isProcessing} onClick={syncToCloud} className="px-12 py-4 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-2xl shadow-2xl hover:bg-zinc-950 transition-all flex items-center justify-center gap-3">
                      {isProcessing ? <Loader2 size={18} className="animate-spin" /> : <CloudUpload size={18} />} <span>Sync Cloud</span>
                   </button>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar bg-white">
                   {activeTab === 'ONBOARDING' ? (
                      <SchoolOnboardingWizard existingSchoolId={selectedSchoolId} />
                   ) : (
                   <table className="w-full text-left table-fixed border-collapse">
                      <thead>
                      <tr className="bg-zinc-50/80 sticky top-0 z-20 border-b border-zinc-100">
                         <th className="w-16 px-0 py-6 border-r border-zinc-100 text-center text-[11px] font-black italic text-zinc-200">#</th>
                         {getColumnsForRole(activeTab).map(col => (
                            <th key={col.key} className={`${col.width} px-8 py-6 border-r border-zinc-100`}>
                               <div className="text-[11px] font-black uppercase tracking-widest text-zinc-950 leading-none">{col.header}</div>
                               <div className="hidden lg:block text-[9px] font-semibold text-zinc-400 uppercase mt-2 italic">↳ {col.table}</div>
                            </th>
                         ))}
                         <th className="w-16"></th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-zinc-50">
                      {loading ? (
                         <tr><td colSpan={15} className="py-32 text-center text-[11px] font-black text-zinc-300 uppercase italic tracking-widest">Accessing cloud storage...</td></tr>
                      ) : data.map((row, i) => (
                        <tr key={row.id || i} className={`group hover:bg-zinc-50/50 ${row._status === 'pending' ? 'bg-orange-50/10' : row._status === 'modified' ? 'bg-blue-50/10' : ''}`}>
                           <td className="px-0 py-5 border-r border-zinc-50 text-[11px] font-black text-center text-zinc-200">{i + 1}</td>
                           {getColumnsForRole(activeTab).map(col => (
                              <td key={col.key} className="px-8 py-5 border-r border-zinc-50 text-[12px] font-medium text-zinc-900 relative focus-within:ring-2 focus-within:ring-emerald-500 overflow-hidden">
                                 <input value={row[col.key] || ''} onChange={e => { const nd = [...data]; nd[i][col.key] = e.target.value; if(nd[i]._status === 'saved') nd[i]._status = 'modified'; setData(nd); }} className="w-full bg-transparent outline-none truncate" />
                                 {(row._status !== 'saved' && !row[col.key] && col.header !== 'Sport' && col.header !== 'Assigned Subjects') && <span className="absolute top-1 right-3 text-red-600 font-black text-[10px]">E</span>}
                              </td>
                           ))}
                           <td className="px-4 py-5 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setData(d => d.filter(r => r.id !== row.id))} className="text-zinc-300 hover:text-red-700"><Trash2 size={16} /></button></td>
                        </tr>
                      ))}
                   </tbody>
                   </table>
                   )}
                </div>
             </>
          )}
        </div>

        {/* Sync Status Feed */}
        {(logs.length > 0 || isProcessing) && (
           <div className="w-full lg:w-96 flex flex-col bg-white border border-zinc-100 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom duration-700">
              <div className="p-8 bg-zinc-950 text-white"><div className="flex items-center gap-4"><ShieldAlert size={20} className="text-emerald-500" /><h2 className="text-[11px] font-black uppercase tracking-widest text-[#10b981]">Real-time Sync</h2></div></div>
              <div className="flex-1 p-6 space-y-4 overflow-auto custom-scrollbar bg-zinc-50/20">
                 {isProcessing && <div className="flex items-center gap-4 p-5 bg-emerald-50 text-emerald-900 border border-emerald-100 rounded-2xl"><Loader2 size={18} className="animate-spin" /><span className="text-[11px] font-black uppercase tracking-widest leading-none">Establishing Cloud Sync...</span></div>}
                 {logs.map((l, idx) => (
                    <div key={idx} className={`p-5 rounded-2xl border ${l.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-white border-zinc-100 text-zinc-900 shadow-sm'}`}>
                       <div className="flex justify-between items-center mb-2 text-[10px] font-black uppercase italic tracking-tighter"><span>Packet {idx+1}</span>{l.type === 'error' ? <AlertTriangle size={16} className="text-red-500" /> : <CheckCircle2 size={16} className="text-emerald-500" />}</div>
                       <p className="text-[11px] font-medium leading-relaxed tracking-tight">{l.message}</p>
                    </div>
                 ))}
              </div>
           </div>
        )}
      </div>

      {mapperState?.isOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-zinc-950/40 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
               <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight text-zinc-900">Smart Excel Mapper</h3>
                    <p className="text-xs font-bold text-orange-500 uppercase tracking-widest mt-1">Found {mapperState.rawData.length} records for {activeTab}</p>
                  </div>
                  <button onClick={() => setMapperState(null)} className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"><X size={20} /></button>
               </div>
               
               <div className="flex-1 overflow-auto p-8 bg-zinc-50/50">
                  <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="bg-zinc-50 border-b border-zinc-200">
                              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500">Your Excel Header</th>
                              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-zinc-500">Sample Value</th>
                              <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-[#FCA311]">Map To Database Field</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                           {mapperState.rawHeaders.map(header => (
                             <tr key={header} className="hover:bg-zinc-50/50">
                                <td className="px-6 py-4 text-sm font-bold text-zinc-900">{header}</td>
                                <td className="px-6 py-4 text-xs font-medium text-zinc-500 truncate max-w-[200px]">{String(mapperState.rawData[0]?.[header] || '')}</td>
                                <td className="px-6 py-4">
                                   <select 
                                      value={mapperState.mappings[header] || ''} 
                                      onChange={(e) => setMapperState(p => p ? { ...p, mappings: { ...p.mappings, [header]: e.target.value } } : null)}
                                      className={`w-full text-sm font-bold px-4 py-2.5 rounded-xl outline-none transition-colors appearance-none cursor-pointer ${mapperState.mappings[header] ? 'bg-zinc-50 border border-zinc-200 text-zinc-900 focus:border-orange-500' : 'bg-red-50 border border-red-200 text-red-600 focus:border-red-500'}`}
                                   >
                                      <option value="">-- Please Map This Column --</option>
                                      <option value="IGNORE_COL">-- Ignore This Column --</option>
                                      {mapperState.mode === 'RESULTS' ? (
                                        <>
                                          <option value="adm_no">Student Adm No (Identity Match)</option>
                                          <option value="student_name">Student Name (Identity Match)</option>
                                          <option value="stream_name">Class / Stream (Optional context)</option>
                                          <optgroup label="Subjects">
                                            {subjects.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code || 'No Code'})</option>)}
                                          </optgroup>
                                        </>
                                      ) : (
                                        getColumnsForRole(activeTab).map(c => (
                                           <option key={c.key} value={c.key}>{c.header} ({c.table})</option>
                                        ))
                                      )}
                                   </select>
                                </td>
                             </tr>
                           ))}
                        </tbody>
                     </table>
                  </div>
               </div>
               
               <div className="p-6 border-t border-zinc-100 flex items-center justify-between bg-white">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Review mappings carefully</p>
                  
                  {mapperState.mode === 'RESULTS' && (
                     <div className="flex gap-2 mr-4">
                        <select value={globalTermId} onChange={e => setGlobalTermId(e.target.value)} disabled={terms.length === 0} className={`bg-orange-50 border border-orange-200 text-xs font-bold text-orange-900 px-4 py-3 rounded-xl outline-none ${terms.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                           {terms.length === 0 ? (
                              <option value="">-- No Terms Found! Create one first --</option>
                           ) : (
                              <>
                                <option value="">-- Select Target Term --</option>
                                {terms.map(t => <option key={t.id} value={t.id}>{t.name} ({t.year})</option>)}
                              </>
                           )}
                        </select>
                        <select value={globalExamType} onChange={e => setGlobalExamType(e.target.value)} className="bg-orange-50 border border-orange-200 text-xs font-bold text-orange-900 px-4 py-3 rounded-xl outline-none">
                           <option value="">-- Select Exam Type --</option>
                           <option value="MID_TERM">MID TERM</option>
                           <option value="END_TERM">END TERM</option>
                           <option value="SPECIAL">SPECIAL</option>
                           <option value="INTERNAL">INTERNAL</option>
                        </select>
                        <input value={globalExamName} onChange={e => setGlobalExamName(e.target.value)} placeholder="Exam Name (e.g. End of Year)" className="bg-orange-50 border border-orange-200 text-xs font-bold text-orange-900 px-4 py-3 rounded-xl outline-none placeholder-orange-300" />
                     </div>
                  )}

                  <div className="flex gap-3">
                     <button onClick={() => setMapperState(null)} className="px-6 py-3 text-xs font-bold text-zinc-500 hover:text-zinc-900 uppercase tracking-widest transition-colors">Cancel</button>
                     <button onClick={mapperState.mode === 'RESULTS' ? syncResults : applyMappings} disabled={mapperState.mode === 'RESULTS' && terms.length === 0} className={`px-8 py-3 bg-[#FCA311] text-black rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all ${mapperState.mode === 'RESULTS' && terms.length === 0 ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-orange-500'}`}>
                       {mapperState.mode === 'RESULTS' ? 'Process & Sync Results' : 'Process Data'}
                     </button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
