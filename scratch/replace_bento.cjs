const fs = require('fs');

const dash = fs.readFileSync('./src/pages/Dashboard.tsx', 'utf8');
const newView = fs.readFileSync('./scratch/bento_teacher_view.tsx', 'utf8');

const start = dash.indexOf('\nconst TeacherView = ({ user }');
const end = dash.indexOf('\nconst AlertItem =');

if (start === -1 || end === -1) {
  console.error('Markers not found. start:', start, 'end:', end);
  process.exit(1);
}

const result = dash.substring(0, start) + '\n' + newView + '\n' + dash.substring(end);
fs.writeFileSync('./src/pages/Dashboard.tsx', result);
console.log('✅ TeacherView replaced successfully!');
console.log('Lines:', result.split('\n').length);
