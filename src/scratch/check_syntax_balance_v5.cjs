
const fs = require('fs');
const content = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

function checkBalance(str) {
    let brace = 0;
    let paren = 0;
    let lines = str.split('\n');
    const checkpoints = [856, 866, 874, 881, 891, 904];
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        for (let char of line) {
            if (char === '{') brace++;
            if (char === '}') brace--;
            if (char === '(') paren++;
            if (char === ')') paren--;
        }
        if (checkpoints.includes(i + 1)) {
             console.log(`Line ${i + 1}: b=${brace}, p=${paren}`);
        }
    }
}

checkBalance(content);
