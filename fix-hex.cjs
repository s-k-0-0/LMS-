const fs = require('fs');
const path = require('path');
function replaceInDir(dir) {
    if (!fs.existsSync(dir)) return;
    for (const item of fs.readdirSync(dir)) {
        const p = path.join(dir, item);
        if (fs.statSync(p).isDirectory()) {
            replaceInDir(p);
        } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
            let c = fs.readFileSync(p, 'utf8');
            c = c.replace(/bg-\[#5A1A1A\]/g, 'bg-white');
            c = c.replace(/bg-\[#4A1414\]/g, 'bg-gray-50');
            c = c.replace(/bg-\[#3A1010\]/g, 'bg-white');
            c = c.replace(/bg-\[#2A0C0C\]/g, 'bg-blue-50');
            c = c.replace(/bg-\[#1A0505\]/g, 'bg-gray-50');
            c = c.replace(/text-gray-900 border/g, 'text-gray-900 border');
            fs.writeFileSync(p, c);
        }
    }
}
replaceInDir(path.join(__dirname, 'src'));
console.log('done');
