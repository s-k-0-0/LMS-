const fs = require('fs');
const path = require('path');

const files = [
  'src/pages/Dashboard.tsx',
  'src/pages/Compiler.tsx',
  'src/pages/FacultyStudio.tsx',
  'src/pages/AptitudeEngine.tsx',
  'src/pages/SuperAdminPanel.tsx',
  'src/pages/VideoPlayer.tsx',
  'src/pages/Login.tsx',
  'src/components/layout/Layout.tsx',
  'src/components/widgets/StreakWidget.tsx'
];

files.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // First, handle text-rose-50 (main headings)
    content = content.replace(/text-rose-50\b/g, 'text-gray-900');
    // text-rose-400 could be inside or outside. 
    // In Dashboard.tsx, the paragraph under welcome says text-rose-400. That's outside. We should make it text-gray-700.
    // "Continue Learning" heading is text-rose-400. Make it text-gray-700.
    
    // We will do a generic replace first, but then we'll fix specific items in Dashboard.
    
    content = content.replace(/bg-rose-950/g, 'bg-[#4A1414]');
    content = content.replace(/bg-rose-900/g, 'bg-[#5A1A1A]');
    content = content.replace(/bg-rose-800/g, 'bg-[#4A1414]');
    
    content = content.replace(/border-rose-800/g, 'border-[#4A1414]');
    content = content.replace(/border-rose-700/g, 'border-[#4A1414]');
    
    content = content.replace(/text-rose-100/g, 'text-white');
    content = content.replace(/text-rose-200/g, 'text-gray-100');
    content = content.replace(/text-rose-300/g, 'text-gray-200');
    content = content.replace(/text-rose-400/g, 'text-gray-300'); // Assuming mostly inside cards.
    
    content = content.replace(/text-pink-500/g, 'text-[#F05A28]');
    content = content.replace(/text-pink-400/g, 'text-[#F05A28]');
    content = content.replace(/text-pink-300/g, 'text-[#de4c1a]');
    content = content.replace(/bg-pink-500/g, 'bg-[#F05A28]');
    content = content.replace(/border-pink-500/g, 'border-[#F05A28]');
    
    content = content.replace(/text-rose-950/g, 'text-white');
    content = content.replace(/text-rose-800/g, 'text-gray-100');

    // Fixes for out-of-card text which needs to be dark
    if (file === 'src/pages/Dashboard.tsx') {
      content = content.replace(/text-gray-300 mt-1 m-0/g, 'text-gray-700 mt-1 m-0');
      content = content.replace(/text-gray-300 uppercase tracking-widest/g, 'text-gray-700 uppercase tracking-widest');
    }
    if (file === 'src/pages/FacultyStudio.tsx') {
      // The subtitle text
      content = content.replace(/text-gray-300">Create new courses/g, 'text-gray-700">Create new courses');
    }
    if (file === 'src/pages/Compiler.tsx') {
      content = content.replace(/text-gray-300">Run C\+\+/g, 'text-gray-700">Run C++');
    }
    if (file === 'src/pages/AptitudeEngine.tsx') {
      content = content.replace(/text-gray-300">Practice/g, 'text-gray-700">Practice');
      content = content.replace(/text-gray-300">Total Score/g, 'text-gray-700">Total Score');
    }
    if (file === 'src/pages/SuperAdminPanel.tsx') {
      content = content.replace(/text-gray-300">Manage user roles/g, 'text-gray-700">Manage user roles');
    }
    
    fs.writeFileSync(filePath, content);
    console.log('Processed', file);
  }
});
