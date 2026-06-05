const fs = require('fs');
const content = fs.readFileSync('/home/razak/Desktop/Startup---/Myschools/mySchools-/src/pages/Dashboard.tsx', 'utf8');
const lines = content.split('\n');
for (let i = 2208; i < 2218; i++) {
  console.log(`${i + 1}: ${JSON.stringify(lines[i])}`);
}
