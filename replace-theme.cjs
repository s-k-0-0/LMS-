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
filesToProcess.push(path.join(__dirname, 'index.html'));

let cssPath = path.join(__dirname, 'src', 'index.css');
if (fs.existsSync(cssPath)) {
  let css = fs.readFileSync(cssPath, 'utf8');
  css = css.replace(/background-color: #[0-9a-fA-F]+;/g, 'background-color: #FAFAFA;');
  fs.writeFileSync(cssPath, css);
}

filesToProcess.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    
    // Theme Replacement Logic
    // D9D9D9 is main layout background sometimes -> we want it #F8F9FA
    content = content.replace(/bg-\[#D9D9D9\]/g, 'bg-gray-50');
    // Dark Maroons matching cards/headers
    content = content.replace(/bg-\[#5A1A1A\]/g, 'bg-white');
    content = content.replace(/bg-\[#4A1414\]/g, 'bg-gray-50');
    content = content.replace(/bg-\[#3A1010\]/g, 'bg-white');
    content = content.replace(/bg-\[#1A1A1A\]\/80/g, 'bg-white');
    content = content.replace(/bg-\[#2A0C0C\]/g, 'bg-blue-50');
    content = content.replace(/bg-\[#4A1414\]\/50/g, 'bg-gray-100');
    content = content.replace(/bg-\[#4A1414\]\/30/g, 'bg-gray-50');
    
    // Borders
    content = content.replace(/border-\[#4A1414\]/g, 'border-gray-200');
    content = content.replace(/border-\[#4A1414\]\/50/g, 'border-gray-100');
    content = content.replace(/border-\[#3A1010\]/g, 'border-gray-200');
    
    // Typography
    content = content.replace(/text-white/g, 'text-gray-900');
    content = content.replace(/text-gray-100/g, 'text-gray-800');
    content = content.replace(/text-gray-200/g, 'text-gray-700');
    content = content.replace(/text-gray-300/g, 'text-gray-600');
    content = content.replace(/text-gray-400/g, 'text-gray-500');

    // Fixes for orange buttons that had text-white replaced to text-gray-900 
    content = content.replace(/bg-\[#F05A28\] hover:bg-\[#de4c1a\] text-gray-900/g, 'bg-[#F05A28] hover:bg-[#de4c1a] text-white');
    content = content.replace(/bg-\[#F05A28\] text-gray-900/g, 'bg-[#F05A28] text-white');
    content = content.replace(/bg-\[#F05A28\]\/90 text-gray-900/g, 'bg-[#F05A28]/90 text-white');
    content = content.replace(/hover:text-gray-900/g, 'hover:text-gray-900'); // ensure it replaces correctly?
    
    // Layout and specific elements
    content = content.replace(/text-\[#F05A28\] font-bold text-gray-900/g, 'text-[#F05A28] font-bold text-[#F05A28]');
    content = content.replace(/text-gray-900 mr-2 h-4 w-4/g, 'text-gray-500 mr-2 h-4 w-4');
    
    fs.writeFileSync(file, content);
});

console.log('Processed done!');
