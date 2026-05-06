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
    
    // Convert back from the messed up dark/white state to a completely fresh light theme with maroon brand
    
    // Backgrounds: 
    // The wrapper was D9D9D9 or gray-50. Let's make app wrapper bg-gray-50
    content = content.replace(/bg-\[#D9D9D9\]/g, 'bg-gray-50');
    content = content.replace(/bg-gray-50/g, 'bg-gray-50');
    
    // The previous dark bg-[#5A1A1A] (cards, navbar, sidebar)
    content = content.replace(/bg-\[#5A1A1A\]/g, 'bg-white'); // main cards / header / sidebar
    
    // Other dark pieces (headers inside tables, etc)
    content = content.replace(/bg-\[#4A1414\]/g, 'bg-gray-50'); 
    
    // Borders
    content = content.replace(/border-\[#4A1414\]/g, 'border-gray-200');
    content = content.replace(/border-\[#4A1414\]\/50/g, 'border-gray-100');
    
    // Brand Color: I will find the previous Orange (bg-[#F05A28] or text-[#F05A28]) 
    // and replace it with Maroon (#6b181f), except we might want an orange accent, so I'll leave orange as #e85d04 for variety.
    // Actually, S-VYASA logo is Maroon. Let's make main brand elements Maroon (#6b181f)
    content = content.replace(/bg-\[#F05A28\]/g, 'bg-[#70151c]');
    content = content.replace(/hover:bg-\[#de4c1a\]/g, 'hover:bg-[#520f14]');
    content = content.replace(/text-\[#F05A28\]/g, 'text-[#70151c]');
    content = content.replace(/hover:text-\[#de4c1a\]/g, 'hover:text-[#520f14]');
    content = content.replace(/border-\[#F05A28\]/g, 'border-[#70151c]');
    content = content.replace(/ring-\[#F05A28\]/g, 'ring-[#70151c]');
    
    // Typography: Make sure texts are dark.
    content = content.replace(/text-white/g, 'text-gray-900');
    // For buttons that now have bg-[#70151c], they MUST have text-white
    content = content.replace(/bg-\[#70151c\] hover:bg-\[#520f14\] text-gray-900/g, 'bg-[#70151c] hover:bg-[#520f14] text-white');
    content = content.replace(/bg-\[#70151c\] text-gray-900/g, 'bg-[#70151c] text-white');
    
    // General gray fixes
    content = content.replace(/text-gray-100/g, 'text-gray-800');
    content = content.replace(/text-gray-200/g, 'text-gray-700');
    content = content.replace(/text-gray-300/g, 'text-gray-600');
    content = content.replace(/text-gray-400/g, 'text-gray-500');

    // Sidebar active state:
    content = content.replace(/bg-\[#70151c\]\/20 text-\[#70151c\]/g, 'bg-[#70151c]/10 text-[#70151c]');
    content = content.replace(/hover:bg-\[#4A1414\]\/50/g, 'hover:bg-gray-100');
    
    fs.writeFileSync(file, content);
});

console.log('Processed done!');
