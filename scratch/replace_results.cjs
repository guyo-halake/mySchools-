const fs = require('fs');

const dash = fs.readFileSync('./scratch/bento_results_view.tsx', 'utf8');

fs.writeFileSync('./src/pages/ResultsManagement.tsx', dash);
console.log('✅ ResultsManagement replaced successfully!');
console.log('Lines:', dash.split('\n').length);
