
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
        if (brace < 0 || paren < 0) {
            console.log(`Unbalanced at line ${i + 1}: brace=${brace}, paren=${paren}`);
            // Reset to prevent cascade if specifically looking for the first error
            // brace = 0; paren = 0;
        }
    }
    console.log(`Final count: brace=${brace}, paren=${paren}`);
}

checkBalance(content);
