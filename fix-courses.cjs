const fs = require('fs');

let c = fs.readFileSync('src/pages/Courses.tsx', 'utf8');

if (!c.includes('import { Plus, Trash2 }')) {
  c = c.replace("import { PlayCircle, Video, Code, BookOpen } from 'lucide-react';", "import { PlayCircle, Video, Code, BookOpen, Plus, Trash2 } from 'lucide-react';");
}
if (!c.includes('const [departments, setDepartments]')) {
  c = c.replace('const [loading, setLoading] = useState(true);', `const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<any[]>([]);
  const [filterDept, setFilterDept] = useState<string>('all');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
`);
}

// add fetch departments logic
if (!c.includes('fetchDepartments')) {
  c = c.replace('fetchCourses();\n  }, [profile]);', `fetchCourses();
    fetchDepartments();
  }, [profile]);
  
  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('*');
    if (data) setDepartments(data);
  };
  
  const handleDelete = async (e: any, courseId: string) => {
    e.preventDefault();
    if (!window.confirm("Are you sure you want to delete this course?")) return;
    setIsDeleting(courseId);
    await supabase.from('courses').delete().eq('id', courseId);
    setIsDeleting(null);
    fetchCourses();
  };
`);
}

// add the add course button if allowed
if (!c.includes('add video button')) {
  c = c.replace(/<div className="flex items-center justify-between mb-8">[\s\S]*?<\/div>/, `<div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-2">
            <BookOpen className="h-8 w-8 text-[#5E171B] mr-3" />
            Course Catalog
          </h1>
          <p className="text-gray-700">Explore courses assigned to your department, upskilling modules, and mandatory tasks.</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={filterDept} 
            onChange={e => setFilterDept(e.target.value)}
            className="border-gray-200 text-gray-900 bg-white rounded-md px-3 py-2 text-sm shadow-sm"
          >
            <option value="all">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          {['super_admin', 'dean', 'dept_admin', 'faculty'].includes(profile?.role) && (
            <Link to="/studio" className="bg-[#5E171B] hover:bg-[#450F13] text-white px-4 py-2 rounded-md font-medium flex items-center shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> Add Video / Course
            </Link>
          )}
        </div>
      </div>`);
}

// filter logic in render
if (!c.includes('coursesToRender')) {
  c = c.replace('return (', `
  const coursesToRender = filterDept === 'all' 
    ? courses 
    : courses.filter(c => c.department_id === filterDept);
    
  return (`);
  c = c.replace(/courses\.length === 0/g, 'coursesToRender.length === 0');
  c = c.replace(/courses\.map/g, 'coursesToRender.map');
}

// delete button
if (!c.includes('handleDelete(e, course.id)')) {
  c = c.replace(/<Link to={`\/courses\/\$\{course.id\}`} className="text-xs font-bold text-\[\#5E171B\] group-hover:text-\[\#450F13\] flex items-center">/, `
                    <div className="flex items-center gap-3">
                      {['super_admin', 'dean', 'dept_admin'].includes(profile?.role) && (
                        <button onClick={(e) => handleDelete(e, course.id)} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors z-10" disabled={isDeleting === course.id}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <Link to={\`/courses/\${course.id}\`} className="text-xs font-bold text-[#5E171B] group-hover:text-[#450F13] flex items-center">`);
  c = c.replace(/Enter <PlayCircle className="h-4 w-4 ml-1" \/>\s*<\/Link>/, `Enter <PlayCircle className="h-4 w-4 ml-1" />
                      </Link>
                    </div>`);
}

fs.writeFileSync('src/pages/Courses.tsx', c);

let d = fs.readFileSync('src/pages/Dashboard.tsx', 'utf8');

if (!d.includes('import { Plus, Trash2 }')) {
  d = d.replace("import { BookOpen, Star, PlayCircle, Video } from 'lucide-react';", "import { BookOpen, Star, PlayCircle, Video, Plus, Trash2 } from 'lucide-react';");
}
if (!d.includes('const [departments, setDepartments]')) {
  d = d.replace('const [courses, setCourses] = useState<any[]>([]);', `const [courses, setCourses] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [filterDept, setFilterDept] = useState<string>('all');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
`);
}

if (!d.includes('fetchDepartments')) {
  d = d.replace('fetchCourses();\n    }', `fetchCourses();
      fetchDepartments();
    }
  }, [profile]);
  
  const fetchDepartments = async () => {
    const { data } = await supabase.from('departments').select('*');
    if (data) setDepartments(data);
  };
  
  const handleDelete = async (e: any, courseId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this course?")) return;
    setIsDeleting(courseId);
    await supabase.from('courses').delete().eq('id', courseId);
    setIsDeleting(null);
    setCourses(prev => prev.filter(c => c.id !== courseId));
  };
  
  const filterCoursesByDept = (items: any[]) => {
    if (filterDept === 'all') return items;
    return items.filter(c => c.department_id === filterDept);
  };
`);
}

// filter logic
if (!d.includes('filterCoursesByDept(courses.filter')) {
  d = d.replace("const standardCourses = courses.filter(c => c.content_type === 'course' || !c.content_type || c.is_mandatory);", "const standardCourses = filterCoursesByDept(courses.filter(c => c.content_type === 'course' || !c.content_type || c.is_mandatory));");
  d = d.replace("const dashboardContent = courses.filter(c => c.content_type === 'upskilling' && !c.is_mandatory);", "const dashboardContent = filterCoursesByDept(courses.filter(c => c.content_type === 'upskilling' && !c.is_mandatory));");
}

if(!d.includes('<select')) {
  d = d.replace(/<div className="flex flex-wrap items-center gap-5 justify-end">/, `<div className="flex flex-wrap items-center gap-5 justify-end">
          <select 
            value={filterDept} 
            onChange={e => setFilterDept(e.target.value)}
            className="border-gray-200 text-gray-900 bg-white rounded-md px-3 py-2 text-sm shadow-sm"
          >
            <option value="all">All Departments</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          {['super_admin', 'dean', 'dept_admin', 'faculty'].includes(profile?.role) && (
            <Link to="/studio" className="bg-[#5E171B] hover:bg-[#450F13] text-white px-3 py-2 rounded-md font-medium flex items-center shadow-sm text-sm">
              <Plus className="w-4 h-4 mr-1" /> Add/Remove Videos
            </Link>
          )}`)
}

// Delete button standard courses
if (!d.includes('handleDelete(e, course.id)')) {
  d = d.replace(/<span>By \{course.profiles\?\.name \|\| 'Faculty'\}<\/span>/, `<span>By {course.profiles?.name || 'Faculty'}</span>
                          {['super_admin', 'dean', 'dept_admin'].includes(profile?.role) && (
                            <button onClick={(e) => handleDelete(e, course.id)} className="text-red-500 hover:text-red-700 p-1" disabled={isDeleting === course.id}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}`);
}

// Delete button dashboard content
if (!d.includes('handleDelete(e, content.id)')) {
  d = d.replace(/<span>By \{content.profiles\?\.name \|\| 'Faculty'\}<\/span>/, `<span>By {content.profiles?.name || 'Faculty'}</span>
                          {['super_admin', 'dean', 'dept_admin'].includes(profile?.role) && (
                            <button onClick={(e) => handleDelete(e, content.id)} className="text-red-500 hover:text-red-700 p-1" disabled={isDeleting === content.id}>
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}`);
}

fs.writeFileSync('src/pages/Dashboard.tsx', d);
