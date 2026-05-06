const fs = require('fs');

function fixDeletes(file) {
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/await supabase\.from\('courses'\)\.delete\(\)\.eq\('id', courseId\);/g, `    // Manual cascade in case constraints prevent delete
    await supabase.from('student_progress').delete().eq('course_id', courseId);
    await supabase.from('lessons').delete().eq('course_id', courseId);
    const { error } = await supabase.from('courses').delete().eq('id', courseId);
    if (error) {
      console.error(error);
      alert("Error deleting course: " + error.message);
    }`);
  fs.writeFileSync(file, c);
}

fixDeletes('src/pages/Courses.tsx');
fixDeletes('src/pages/Dashboard.tsx');
