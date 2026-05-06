const fs = require('fs');
const path = require('path');

const filesToProcess = [];

function findFiles(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        if (item === 'node_modules' || item === '.git' || item === 'dist') continue;
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            findFiles(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css') || fullPath.endsWith('.html')) {
            filesToProcess.push(fullPath);
        }
    }
}

findFiles(path.join(__dirname, 'src'));

filesToProcess.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace brand orange with SVYASA Maroon
    content = content.replace(/#F05A28/g, '#5E171B'); // primary maroon
    content = content.replace(/#de4c1a/g, '#450F13'); // hover maroon darker
    
    // Also change instances of bg-[#5A1A1A] etc that were incorrectly replaced
    // Actually the previous script already ran and replaced them to white/light.
    
    fs.writeFileSync(file, content);
});

console.log('Processed SVG/Color replacements!');
