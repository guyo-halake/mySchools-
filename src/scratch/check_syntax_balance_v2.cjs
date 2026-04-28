
const fs = require('fs');
const content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

function checkBalance(str) {
    let brace = 0;
    let paren = 0;
    let lines = str.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        for (let char of line) {
            if (char === '{') brace++;
            if (char === '}') brace--;
            if (char === '(') paren++;
            if (char === ')') paren--;
        }
        if (brace !== 0 || paren !== 0) {
           // Only log if it's the PrincipalView region or Dashboard region
           if (i + 1 > 1400) {
              // console.log(`Line ${i + 1}: b=${brace}, p=${paren} | ${line.trim().substring(0, 20)}`);
           }
        }
        // At the end of every function/component, it should be 0 or 1
        if (line.includes('const PrincipalView') || line.includes('const Dashboard')) {
             console.log(`Starting ${line.trim()} at line ${i+1}: b=${brace}, p=${paren}`);
        }
    }
    console.log(`Final count: brace=${brace}, paren=${paren}`);
}

checkBalance(content);
