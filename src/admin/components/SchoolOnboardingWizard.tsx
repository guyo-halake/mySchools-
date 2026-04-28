import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/adminSupabase';
import { useAdminAlert } from '../context/AdminAlertContext';
import { CheckCircle2, Plus, X, Loader2, ChevronDown } from 'lucide-react';

interface WizardProps {
  existingSchoolId?: string;
  onComplete?: (schoolId: string) => void;
}

export const SchoolOnboardingWizard: React.FC<WizardProps> = ({ existingSchoolId, onComplete }) => {
  const { showAlert } = useAdminAlert();
  const [step, setStep] = useState(1);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isLoadingExisting, setIsLoadingExisting] = useState(false);
  const [savedSchools, setSavedSchools] = useState<any[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [internalSchoolId, setInternalSchoolId] = useState<string | null>(existingSchoolId || null);

  const [data, setData] = useState({
    name: '', subdomain: '', location: '', email: '',
    phones: [''],
    school_type: 'Highschool (CBC system)',
    period_type: 'TERMS',
    academic_year: new Date().getFullYear().toString(),
    terms: ['Term 1', 'Term 2', 'Term 3'],
    exam_types: ['Opener Exam', 'Mid Term Exam', 'End Term Exam'],
    classes: [
      { id: crypto.randomUUID(), name: 'Form 1', streams: 'North, South, East' },
      { id: crypto.randomUUID(), name: 'Form 2', streams: 'North, South, East' }
    ],
    subjects: [
      { id: crypto.randomUUID(), name: 'Mathematics', code: 'MAT', is_compulsory: true },
      { id: crypto.randomUUID(), name: 'English', code: 'ENG', is_compulsory: true },
    ],
    fee_types: ['Tuition Fee', 'Boarding Fee', 'Transport', 'PTA Fund'],
    admin_name: '', admin_email: '', admin_password: ''
  });

  useEffect(() => {
     // Fetch all schools for the dropdown
     const fetchAllSchools = async () => {
        const { data } = await supabase.from('schools').select('id, name').order('created_at', { ascending: false });
        if (data) setSavedSchools(data);
     };
     fetchAllSchools();
  }, []);

  const loadSchoolData = async (schoolId: string) => {
      setIsLoadingExisting(true);
      setInternalSchoolId(schoolId);
      setIsDropdownOpen(false);
      try {
        const { data: school } = await supabase.from('schools').select('*').eq('id', schoolId).single();
        if (!school) return;

        const { data: terms } = await supabase.from('terms').select('*').eq('school_id', schoolId).order('created_at');
        const { data: classes } = await supabase.from('classes').select('*').eq('school_id', schoolId);
        const { data: streams } = await supabase.from('streams').select('*').eq('school_id', schoolId);
        const { data: subjects } = await supabase.from('subjects').select('*').eq('school_id', schoolId);
        const { data: feeTypes } = await supabase.from('fee_types').select('*').eq('school_id', schoolId);
        const { data: admin } = await supabase.from('profiles').select('*').eq('school_id', schoolId).eq('role', 'ADMIN').limit(1).maybeSingle();

        const mappedClasses = classes?.map(c => ({
          id: c.id,
          name: c.name,
          streams: streams?.filter(s => s.class_id === c.id).map(s => s.name).join(', ') || ''
        })) || [];

        setData({
          name: school.name || '',
          subdomain: school.subdomain || '',
          location: school.location || '',
          email: school.email || '',
          phones: school.phone_numbers?.length ? school.phone_numbers : [''],
          school_type: school.curriculum_type || 'Highschool (CBC system)',
          period_type: 'TERMS',
          academic_year: terms?.[0]?.year?.toString() || new Date().getFullYear().toString(),
          terms: terms?.map(t => t.name) || ['Term 1', 'Term 2', 'Term 3'],
          exam_types: ['Opener Exam', 'Mid Term Exam', 'End Term Exam'],
          classes: mappedClasses.length ? mappedClasses : [{ id: crypto.randomUUID(), name: 'Form 1', streams: '' }],
          subjects: subjects?.map(s => ({ id: s.id, name: s.name, code: s.code, is_compulsory: s.is_compulsory })) || [],
          fee_types: feeTypes?.map(f => f.name) || ['Tuition Fee', 'Boarding Fee', 'Transport', 'PTA Fund'],
          admin_name: admin?.full_name || '',
          admin_email: admin?.email || '',
          admin_password: '••••••••'
        });
      } catch (err) {
        console.error("Error fetching existing school", err);
      } finally {
        setIsLoadingExisting(false);
      }
  };

  useEffect(() => {
    if (existingSchoolId) {
       loadSchoolData(existingSchoolId);
    }
  }, [existingSchoolId]);

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const handleProvision = async () => {
    if (internalSchoolId) {
      showAlert('School is already provisioned. Updating data is not yet fully implemented.', 'Success');
      return;
    }

    setIsProvisioning(true);
    try {
      // 1. Create School
      const { data: school, error: schoolErr } = await supabase.from('schools').insert({
        name: data.name,
        subdomain: data.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        email: data.email,
        phone_numbers: data.phones.filter(p => p.trim()),
        location: data.location,
        curriculum_type: data.school_type,
      }).select().single();
      if (schoolErr) throw new Error(`School Error: ${schoolErr.message}`);

      const schoolId = school.id;

      // 2. Setup Academic Period & Terms
      await supabase.from('school_academic_years').insert({ school_id: schoolId, year: data.academic_year, is_current: true });
      await supabase.from('school_period_state').insert({ school_id: schoolId, system_type: data.period_type });
      
      const termInserts = data.terms.filter(t => t.trim()).map(t => ({ school_id: schoolId, name: t, year: parseInt(data.academic_year), is_current: false }));
      if (termInserts.length > 0) {
          const { data: insertedTerms } = await supabase.from('terms').insert(termInserts).select();
          
          if (insertedTerms && insertedTerms.length > 0 && data.exam_types.length > 0) {
              const examWindows = [];
              for (const term of insertedTerms) {
                  for (const et of data.exam_types) {
                      if (!et.trim()) continue;
                      examWindows.push({
                          school_id: schoolId,
                          term_id: term.id,
                          name: et.trim(),
                          exam_type: 'MID_TERM', // fallback
                          is_open: true,
                          is_current: false
                      });
                  }
              }
              if (examWindows.length > 0) {
                  await supabase.from('exam_windows').insert(examWindows);
              }
          }
      }

      // 3. Setup Classes and Streams
      for (const cls of data.classes) {
        if (!cls.name.trim()) continue;
        const { data: classData } = await supabase.from('classes').insert({ school_id: schoolId, name: cls.name }).select().single();
        
        const streamNames = cls.streams.split(',').map(s => s.trim()).filter(s => s);
        if (streamNames.length > 0 && classData) {
           await supabase.from('streams').insert(streamNames.map(s => ({ school_id: schoolId, class_id: classData.id, name: s })));
        }
      }

      // 4. Setup Subjects
      const subjInserts = data.subjects.filter(s => s.name.trim()).map(s => ({
        school_id: schoolId, name: s.name, code: s.code, is_compulsory: s.is_compulsory
      }));
      if (subjInserts.length > 0) await supabase.from('subjects').insert(subjInserts);

      // 5. Setup Fee Types
      const feeInserts = data.fee_types.filter(f => f.trim()).map(f => ({ school_id: schoolId, name: f }));
      if (feeInserts.length > 0) await supabase.from('fee_types').insert(feeInserts);

      // 6. Setup Admin Profile
      await supabase.from('profiles').insert({
        school_id: schoolId,
        full_name: data.admin_name,
        email: data.admin_email,
        password: data.admin_password,
        role: 'ADMIN'
      });

      showAlert('Onboarding Complete! School is ready.', 'Success');
      if (onComplete) onComplete(schoolId);
    } catch (err: any) {
      showAlert(err.message, 'Error');
    } finally {
      setIsProvisioning(false);
    }
  };

  if (isLoadingExisting) {
    return <div className="flex-1 flex items-center justify-center bg-white"><Loader2 className="animate-spin text-zinc-300" size={32} /></div>;
  }

  const steps = [
    { id: 1, title: 'Identity' },
    { id: 2, title: 'Academic Engine' },
    { id: 3, title: 'Physical Structure' },
    { id: 4, title: 'Curriculum' },
    { id: 5, title: 'Finances' },
    { id: 6, title: 'Admin Setup' },
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-white p-6 md:p-10">
      <div className="max-w-5xl mx-auto w-full flex flex-col">
        
        <div className="mb-10">
           <h2 className="text-3xl font-semibold text-zinc-900">Welcome to P3L Developers</h2>
           <p className="text-zinc-500 mt-1">Please fill in the following to get onboarded.</p>
           
           <div className="flex items-center gap-4 mt-8 border-b border-zinc-200 pb-4 overflow-x-auto no-scrollbar">
              {steps.map(s => (
                 <div key={s.id} className={`flex items-center gap-2 text-sm font-medium whitespace-nowrap transition-colors ${step === s.id ? 'text-zinc-900' : step > s.id ? 'text-zinc-500' : 'text-zinc-300'}`}>
                    {step > s.id && <CheckCircle2 size={16} className="text-emerald-500" />}
                    {s.title}
                 </div>
              ))}
           </div>
        </div>

        <div className="flex-1 pb-10">
           {step === 1 && (
             <div className="space-y-6 animate-in fade-in duration-300">
                <div className="space-y-2 relative z-50">
                   <label className="text-sm font-medium text-zinc-700">School Name</label>
                   <div className="relative">
                      <input required value={data.name} onChange={e => setData({...data, name: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all pr-12" />
                      <button type="button" onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-400 hover:text-zinc-600 rounded-md hover:bg-zinc-200 transition-colors">
                         <ChevronDown size={16} className={`transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>
                   </div>
                   
                   {isDropdownOpen && savedSchools.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-zinc-200 rounded-lg shadow-2xl z-50 max-h-60 overflow-y-auto">
                         <div className="p-3 text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-50/80 border-b border-zinc-100 sticky top-0">Select Existing School</div>
                         {savedSchools.map(s => (
                            <button key={s.id} type="button" onClick={() => loadSchoolData(s.id)} className="w-full text-left px-4 py-3 text-sm hover:bg-zinc-50 border-b border-zinc-50 last:border-0 transition-colors font-medium text-zinc-700">
                               {s.name}
                            </button>
                         ))}
                      </div>
                   )}
                </div>
                <div className="space-y-2">
                   <label className="text-sm font-medium text-zinc-700">Preferred Subdomain</label>
                   <input required value={data.subdomain} onChange={e => setData({...data, subdomain: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all" />
                </div>
                <div className="space-y-2">
                   <label className="text-sm font-medium text-zinc-700">Location</label>
                   <input value={data.location} onChange={e => setData({...data, location: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all" />
                </div>
                
                <div className="space-y-3">
                   <label className="text-sm font-medium text-zinc-700">Phone Numbers</label>
                   {data.phones.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                         <input value={p} onChange={e => { const np = [...data.phones]; np[idx] = e.target.value; setData({...data, phones: np}); }} className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all" />
                         <button onClick={() => setData({...data, phones: data.phones.filter((_, i) => i !== idx)})} className="p-2 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"><X size={20} /></button>
                      </div>
                   ))}
                   <button onClick={() => setData({...data, phones: [...data.phones, '']})} className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-1">
                     <Plus size={16} /> Add Another Number
                   </button>
                </div>

                <div className="space-y-2">
                   <label className="text-sm font-medium text-zinc-700">School Email</label>
                   <input type="email" value={data.email} onChange={e => setData({...data, email: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all" />
                </div>

                <div className="space-y-2">
                   <label className="text-sm font-medium text-zinc-700">School Type</label>
                   <select value={data.school_type} onChange={e => setData({...data, school_type: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all">
                      <option value="Primary school (CBC system)">Primary school (CBC system)</option>
                      <option value="Highschool (CBC system)">Highschool (CBC system)</option>
                      <option value="High school 8-4-4 system">High school 8-4-4 system</option>
                      <option value="College/University">College/University</option>
                   </select>
                </div>
             </div>
           )}

           {step === 2 && (
             <div className="space-y-8 animate-in fade-in duration-300">
                <p className="text-base text-zinc-600">Please provide the academic structure of your school.</p>
                
                <div className="flex flex-col sm:flex-row items-center gap-4">
                   <button onClick={() => setData({...data, period_type: 'TERMS'})} className={`flex-1 w-full py-4 rounded-lg border text-sm font-medium transition-all ${data.period_type === 'TERMS' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100'}`}>
                      Use Term System
                   </button>
                   <button onClick={() => setData({...data, period_type: 'SEMESTERS'})} className={`flex-1 w-full py-4 rounded-lg border text-sm font-medium transition-all ${data.period_type === 'SEMESTERS' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:bg-zinc-100'}`}>
                      Use Semester System
                   </button>
                </div>

                <div className="space-y-4 pt-4">
                   <label className="text-sm font-medium text-zinc-700">Please fill in your {data.period_type.toLowerCase()}</label>
                   {data.terms.map((t, idx) => (
                      <div key={idx} className="flex gap-3 items-center">
                         <input value={t} onChange={e => { const nt = [...data.terms]; nt[idx] = e.target.value; setData({...data, terms: nt}); }} className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all" />
                         <button onClick={() => setData({...data, terms: data.terms.filter((_, i) => i !== idx)})} className="p-2 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"><X size={20} /></button>
                      </div>
                   ))}
                   <button onClick={() => setData({...data, terms: [...data.terms, '']})} className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                     <Plus size={16} /> Add Another {data.period_type === 'TERMS' ? 'Term' : 'Semester'}
                   </button>
                </div>

                <div className="space-y-4 pt-6 border-t border-zinc-100">
                   <div>
                      <h3 className="text-base font-semibold text-zinc-900">Set Exam Points</h3>
                      <p className="text-sm text-zinc-500 mt-1">What standard exams do you run per term/semester?</p>
                   </div>
                   {data.exam_types.map((et, idx) => (
                      <div key={idx} className="flex gap-3 items-center">
                         <input value={et} onChange={e => { const ne = [...data.exam_types]; ne[idx] = e.target.value; setData({...data, exam_types: ne}); }} className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all" />
                         <button onClick={() => setData({...data, exam_types: data.exam_types.filter((_, i) => i !== idx)})} className="p-2 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"><X size={20} /></button>
                      </div>
                   ))}
                   <button onClick={() => setData({...data, exam_types: [...data.exam_types, '']})} className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                     <Plus size={16} /> Add Another Exam Type
                   </button>
                </div>
             </div>
           )}

           {step === 3 && (
             <div className="space-y-6 animate-in fade-in duration-300">
                <p className="text-base text-zinc-600">List the classes and their streams.</p>
                
                <div className="space-y-6">
                   {data.classes.map((cls, idx) => (
                      <div key={cls.id} className="p-5 bg-zinc-50 border border-zinc-200 rounded-xl relative space-y-4">
                         <button onClick={() => setData({...data, classes: data.classes.filter(c => c.id !== cls.id)})} className="absolute top-4 right-4 text-zinc-400 hover:text-red-500 transition-colors"><X size={20}/></button>
                         <div className="space-y-2 pr-8">
                            <label className="text-sm font-medium text-zinc-700">Class Name</label>
                            <input value={cls.name} onChange={e => { const nc = [...data.classes]; nc[idx].name = e.target.value; setData({...data, classes: nc}); }} className="w-full bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700">Streams (Separate with commas)</label>
                            <input value={cls.streams} onChange={e => { const nc = [...data.classes]; nc[idx].streams = e.target.value; setData({...data, classes: nc}); }} className="w-full bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all" />
                         </div>
                      </div>
                   ))}
                   <button onClick={() => setData({...data, classes: [...data.classes, { id: crypto.randomUUID(), name: '', streams: '' }]})} className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                     <Plus size={16} /> Add Another Class
                   </button>
                </div>
             </div>
           )}

           {step === 4 && (
             <div className="space-y-6 animate-in fade-in duration-300">
                <p className="text-base text-zinc-600">What subjects does your institution teach?</p>
                
                <div className="space-y-4">
                   {data.subjects.map((subj, idx) => (
                      <div key={subj.id} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-zinc-50 p-4 border border-zinc-200 rounded-xl">
                         <input value={subj.name} onChange={e => { const ns = [...data.subjects]; ns[idx].name = e.target.value; setData({...data, subjects: ns}); }} className="flex-1 bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all" />
                         <div className="flex items-center gap-4">
                            <input value={subj.code} onChange={e => { const ns = [...data.subjects]; ns[idx].code = e.target.value; setData({...data, subjects: ns}); }} className="w-24 bg-white border border-zinc-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all uppercase" />
                            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700 cursor-pointer">
                               <input type="checkbox" checked={subj.is_compulsory} onChange={e => { const ns = [...data.subjects]; ns[idx].is_compulsory = e.target.checked; setData({...data, subjects: ns}); }} className="w-4 h-4 accent-zinc-900 rounded" /> Compulsory
                            </label>
                            <button onClick={() => setData({...data, subjects: data.subjects.filter(s => s.id !== subj.id)})} className="p-2 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"><X size={20}/></button>
                         </div>
                      </div>
                   ))}
                </div>
                <button onClick={() => setData({...data, subjects: [...data.subjects, { id: crypto.randomUUID(), name: '', code: '', is_compulsory: false }]})} className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1 mt-2">
                  <Plus size={16} /> Add Subject
                </button>
             </div>
           )}

           {step === 5 && (
             <div className="space-y-6 animate-in fade-in duration-300">
                <p className="text-base text-zinc-600">Define your standard fee billing categories.</p>
                
                <div className="space-y-4">
                   {data.fee_types.map((ft, idx) => (
                      <div key={idx} className="flex gap-3 items-center">
                         <input value={ft} onChange={e => { const nf = [...data.fee_types]; nf[idx] = e.target.value; setData({...data, fee_types: nf}); }} className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all" />
                         <button onClick={() => setData({...data, fee_types: data.fee_types.filter((_, i) => i !== idx)})} className="p-2 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"><X size={20} /></button>
                      </div>
                   ))}
                   <button onClick={() => setData({...data, fee_types: [...data.fee_types, '']})} className="text-sm font-medium text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                     <Plus size={16} /> Add Fee Type
                   </button>
                </div>
             </div>
           )}

           {step === 6 && (
             <div className="space-y-6 animate-in fade-in duration-300">
                <p className="text-base text-zinc-600">Create the administrator account for this school.</p>
                <div className="grid grid-cols-1 gap-6 max-w-2xl">
                   <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700">Admin Name</label>
                      <input required value={data.admin_name} onChange={e => setData({...data, admin_name: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700">Admin Email</label>
                      <input type="email" value={data.admin_email} onChange={e => setData({...data, admin_email: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700">Password</label>
                      <input required type="password" value={data.admin_password} onChange={e => setData({...data, admin_password: e.target.value})} className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent transition-all" />
                   </div>
                </div>
             </div>
           )}
        </div>

        <div className="mt-auto pt-6 border-t border-zinc-200 flex items-center justify-between sticky bottom-0 bg-white pb-4">
           <button onClick={prevStep} disabled={step === 1 || isProvisioning} className={`px-4 py-2 text-sm font-medium transition-all rounded-lg ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-zinc-600 hover:bg-zinc-100'}`}>
              Back
           </button>
           
           {step < 6 ? (
              <button onClick={nextStep} className="px-8 py-3 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-all">
                 Continue
              </button>
           ) : (
              <button onClick={handleProvision} disabled={isProvisioning || !!existingSchoolId} className="px-8 py-3 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-all flex items-center gap-2 disabled:opacity-50">
                 {isProvisioning && <Loader2 size={16} className="animate-spin" />}
                 {existingSchoolId ? 'Data Pre-filled' : isProvisioning ? 'Saving Data...' : 'Finish Setup'}
              </button>
           )}
        </div>
      </div>
    </div>
  );
};
