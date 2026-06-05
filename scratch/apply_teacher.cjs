const fs = require('fs');

const dashboardPath = './src/pages/Dashboard.tsx';
const draftPath = './scratch/teacher_view_draft.tsx';

let dashboardCode = fs.readFileSync(dashboardPath, 'utf8');
let draftCode = fs.readFileSync(draftPath, 'utf8');

// The draft is just the return block. We need to append the Modals to it.
const modalsCode = `
      <Modal isOpen={showGradeModal} onClose={() => setShowGradeModal(false)} title={\`Grade Breakdown: \${selectedPointId}\`}>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-5 gap-4">
            {gradeBreakdown && Object.entries(gradeBreakdown).map(([grade, count]: any) => (
              <div key={grade} className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-2xl text-center border border-zinc-100 dark:border-zinc-800">
                <p className="text-2xl font-black text-zinc-900 dark:text-white">{count}</p>
                <p className="text-[10px] font-black text-zinc-400 uppercase mt-1">{grade}</p>
              </div>
            ))}
          </div>
          <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-100 dark:border-zinc-800">
            <p className="text-[11px] font-medium text-zinc-500 leading-relaxed text-center">
              This breakdown represents the performance distribution of all students in {data.stream?.name} for this specific assessment.
            </p>
          </div>
          <Button onClick={() => setShowGradeModal(false)} className="w-full">Close Details</Button>
        </div>
      </Modal>

      <Modal isOpen={showTargetModal} onClose={() => setShowTargetModal(false)} title="Class Target Settings">
        <form onSubmit={saveTargetSettings} className="space-y-4 p-2">
          <InputRow label="Current Mean Score (%)" value={meanInput} onChange={setMeanInput} />
          <InputRow label="Target Mean Score (%)" value={targetInput} onChange={setTargetInput} />
          <div className="pt-4 grid grid-cols-2 gap-3">
            <Button type="button" variant="outline" onClick={() => setShowTargetModal(false)}>Cancel</Button>
            <Button type="submit" disabled={savingTarget}>{savingTarget ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
`;

const finalDraft = draftCode + modalsCode;

const teacherViewStart = dashboardCode.indexOf('const TeacherView =');
const returnStart = dashboardCode.indexOf('  return (', teacherViewStart);
const returnEnd = dashboardCode.indexOf('  );\n};\n\nconst AlertItem', returnStart) + 4; // Include '  );'

if (returnStart === -1 || returnEnd === -1 || teacherViewStart === -1) {
  console.log("Could not find boundaries");
  process.exit(1);
}

const newDashboardCode = dashboardCode.substring(0, returnStart) + finalDraft + dashboardCode.substring(returnEnd);

fs.writeFileSync(dashboardPath, newDashboardCode);
console.log("TeacherView successfully updated in Dashboard.tsx!");
