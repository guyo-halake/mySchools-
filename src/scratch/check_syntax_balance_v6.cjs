
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
        if (i + 1 === 1439) {
             console.log(`At line 1439: brace=${brace}, paren=${paren}`);
        }
    }
}

checkBalance(content);
