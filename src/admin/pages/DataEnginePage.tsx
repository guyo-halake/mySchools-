import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/adminSupabase';
import * as XLSX from 'xlsx';
import { 
  FileSpreadsheet, Building2, Plus, Trash2, Loader2, 
  ShieldAlert, CheckCircle2, AlertTriangle, RefreshCw, CloudUpload, Database
} from 'lucide-react';
import { useAdminAlert } from '../context/AdminAlertContext';

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
  
  const [activeTab, setActiveTab] = useState<UserRole>('STUDENT');
  const [schools, setSchools] = useState<any[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SeedingRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchSchools();
  }, []);

  const fetchSchools = async () => {
    const { data } = await supabase.from('schools').select('id, name').order('name');
    setSchools(data || []);
  };

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
    if (!file || !selectedSchoolId) return showAlert('Choose institution first.', 'Logic');
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: 'binary' });
      const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      const cols = getColumnsForRole(activeTab);
      const mapped = raw.map((r: any) => {
        const row: any = {};
        cols.forEach(c => row[c.key] = r[c.header] || r[c.key] || '');
        return { ...row, id: crypto.randomUUID(), _status: 'pending' };
      });
      setData(prev => [...mapped, ...prev]);
    };
    reader.readAsBinaryString(file);
  };

  const syncToCloud = async () => {
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
          
          setLogs(prev => [{ row: i+1, message: `Sync complete for ${row.full_name}.`, type: 'success' }, ...prev]);
       } catch (err: any) {
          setLogs(prev => [{ row: i+1, message: err.message, type: 'error' }, ...prev]);
       }
    }
    setIsProcessing(false);
    loadData();
    showAlert('Real-time synchronization successful.', 'Sync');
  };

  return (
    <div className="p-4 md:p-10 font-inter text-zinc-950 max-w-[1900px] mx-auto min-h-screen flex flex-col gap-8 bg-white">
      <input type="file" ref={excelInputRef} className="hidden" onChange={handleExcelUpload} />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-zinc-100">
        <div>
          <h1 className="text-3xl font-sora font-semibold uppercase tracking-tight">Identity Engine</h1>
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Real-time Institutional Seeding</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
           {selectedSchoolId && (
             <>
               <button onClick={() => excelInputRef.current?.click()} className="flex items-center gap-3 px-8 py-4 bg-zinc-950 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl"><FileSpreadsheet size={16} /> Seed from Excel</button>
               <button onClick={() => setData([{ id: crypto.randomUUID(), _status: 'pending' }])} className="flex items-center gap-3 px-8 py-4 border border-zinc-200 bg-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-black transition-all"><Plus size={16} /> Add Manual</button>
             </>
           )}
           <div className="flex items-center bg-zinc-50 border border-zinc-100 rounded-2xl px-6 py-4 gap-4">
              <Building2 size={16} className="text-zinc-400" />
              <select value={selectedSchoolId} onChange={e => setSelectedSchoolId(e.target.value)} className="bg-transparent text-[11px] font-black text-zinc-950 outline-none uppercase cursor-pointer appearance-none">
                 <option value="">Select Institution...</option>
                 {schools.map(s => <option key={s.id} value={s.id}>{s.name.toUpperCase()}</option>)}
              </select>
           </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row flex-1 gap-10 overflow-hidden">
        
        <div className="flex-1 flex flex-col border border-zinc-100 rounded-[2.5rem] overflow-hidden shadow-sm bg-zinc-50/20">
          
          <div className="flex items-center bg-white border-b border-zinc-100 overflow-x-auto no-scrollbar">
             {(['STUDENT', 'TEACHER', 'PARENT', 'ADMIN', 'DEVELOPER'] as UserRole[]).map(r => (
               <button key={r} onClick={() => setActiveTab(r)} className={`px-12 py-6 text-[10px] font-black uppercase tracking-[0.25em] transition-all relative whitespace-nowrap ${activeTab === r ? 'bg-zinc-50/50 text-zinc-950 shadow-[0_-4px_0_#10b981_inset]' : 'text-zinc-300 hover:text-zinc-500'}`}>{r}</button>
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
             {!selectedSchoolId ? (
                <div className="flex flex-col items-center justify-center h-[500px] opacity-10 gap-6"><Database size={72} /><p className="font-black uppercase tracking-[0.5em] text-[11px]">Database Context Required</p></div>
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
    </div>
  );
};
