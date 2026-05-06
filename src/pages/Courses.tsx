import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Card, CardContent } from '../components/ui/card';
import { PlayCircle, Video, Code, BookOpen, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Courses() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<any[]>([]);
  const [filterCategory, setFilterDept] = useState<string>('all');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);


  useEffect(() => {
    fetchCourses();
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
        // Manual cascade in case constraints prevent delete
    await supabase.from('student_progress').delete().eq('course_id', courseId);
    await supabase.from('lessons').delete().eq('course_id', courseId);
    const { error } = await supabase.from('courses').delete().eq('id', courseId);
    if (error) {
      console.error(error);
      alert("Error deleting course: " + error.message);
    }
    setIsDeleting(null);
    fetchCourses();
  };


  const fetchCourses = async () => {
    if (!profile) return;
    try {
      let query = supabase.from('courses').select('*, profiles!faculty_id(name, department_id)');
      
      if (profile.role === 'student') {
        const { data: assignments } = await supabase.from('faculty_students')
          .select('faculty_id')
          .eq('student_id', profile.id);
          
        const facultyIds = assignments?.map(a => a.faculty_id) || [];
        
        query = query.eq('status', 'published');
        if (facultyIds.length > 0) {
           const fIdsStr = facultyIds.join(',');
           query = query.or(`faculty_id.in.(${fIdsStr}),is_mandatory.eq.true`);
        } else {
           query = query.eq('is_mandatory', true);
        }
      } else if (profile.role === 'faculty') {
         if (profile.department_id) {
           query = query.or(`department_id.eq.${profile.department_id},is_mandatory.eq.true`);
         } else {
           query = query.eq('is_mandatory', true);
         }
      } else if (profile.role === 'dept_admin' || profile.role === 'dean') {
         if (profile.department_id) {
           query = query.or(`department_id.eq.${profile.department_id},is_mandatory.eq.true`);
         } else {
           query = query.eq('is_mandatory', true);
         }
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setCourses(data || []);
    } catch (err) {
      console.error("Failed to fetch courses", err);
    } finally {
      setLoading(false);
    }
  };

  
  const coursesToRender = filterCategory === 'all' 
    ? courses 
    : courses.filter(c => c.category === filterCategory);
    
  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-2">
            <BookOpen className="h-8 w-8 text-[#5E171B] mr-3" />
            Course Catalog
          </h1>
          <p className="text-gray-700">Explore courses assigned to your department, upskilling modules, and mandatory tasks.</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={filterCategory} 
            onChange={e => setFilterDept(e.target.value)}
            className="border-gray-200 text-gray-900 bg-white rounded-md px-3 py-2 text-sm shadow-sm"
          >
            <option value="all">All Categories</option>
            
              <option value="core">Core Course</option>
              <option value="technical">Technical / Coding</option>
              <option value="soft_skills">Soft Skills</option>
              <option value="aptitude">Aptitude</option>
              <option value="other">Other</option>
            </select>
          {['super_admin', 'dean', 'dept_admin', 'faculty'].includes(profile?.role) && (
            <Link to="/studio" className="bg-[#5E171B] hover:bg-[#450F13] text-white px-4 py-2 rounded-md font-medium flex items-center shadow-sm">
              <Plus className="w-4 h-4 mr-2" /> Add Video / Course
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-gray-500">Loading courses...</div>
      ) : coursesToRender.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl">
          <BookOpen className="mx-auto h-12 w-12 text-gray-600 mb-4" />
          <p>No courses available right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {coursesToRender.map(course => (
            <Card key={course.id} className="bg-white border-gray-200 text-gray-900 overflow-hidden rounded-2xl flex flex-col group cursor-pointer hover:border-[#5E171B]/50 transition-colors shadow-none !p-0">
              <div className={`h-40 overflow-hidden w-full relative ${course.content_type === 'upskilling' && !course.is_mandatory ? 'bg-blue-50' : 'bg-gray-50'}`}>
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title} className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${course.content_type === 'upskilling' && !course.is_mandatory ? 'bg-gradient-to-br from-blue-100 to-blue-50' : 'bg-gradient-to-br from-[#5E171B]/20 to-[#5E171B]/5'}`}>
                    {course.content_type === 'upskilling' && !course.is_mandatory ? (
                      <Video className="h-12 w-12 text-[#5E171B]/50" />
                    ) : (
                      <BookOpen className={`h-12 w-12 ${course.is_mandatory ? 'text-yellow-600' : 'text-[#5E171B]/50'}`} />
                    )}
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <div className={`bg-white px-2 py-1 rounded text-[10px] font-bold tracking-wider uppercase border border-gray-200 shadow-lg ${course.is_mandatory ? 'text-yellow-600' : course.content_type === 'upskilling' ? 'text-blue-600' : 'text-[#5E171B]'}`}>
                    {course.is_mandatory ? 'Mandatory' : course.content_type === 'upskilling' ? 'Upskilling' : course.category || 'Course'}
                  </div>
                </div>
                <div className="absolute top-3 right-3 flex gap-2">
                  {course.is_compiler_enabled && (
                     <div className="bg-[#5E171B]/90 text-white px-2 py-1 rounded text-xs font-bold tracking-wider uppercase border border-gray-200 flex items-center shadow-lg">
                       <Code className="w-3 h-3 mr-1" /> Tech
                     </div>
                  )}
                </div>
              </div>
              <div className="p-5 flex flex-col flex-grow gap-2">
                <h3 className="font-bold text-lg leading-tight text-gray-900 line-clamp-2">{course.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2 mb-2 flex-grow">{course.description || "No description provided."}</p>
                
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-500 font-medium">By {course.profiles?.name || 'Faculty'}</span>
                  
                    <div className="flex items-center gap-3">
                      {['super_admin', 'dean', 'dept_admin'].includes(profile?.role) && (
                        <button onClick={(e) => handleDelete(e, course.id)} className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors z-10" disabled={isDeleting === course.id}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <Link to={`/courses/${course.id}`} className="text-xs font-bold text-[#5E171B] group-hover:text-[#450F13] flex items-center">
                    Enter <PlayCircle className="h-4 w-4 ml-1" />
                      </Link>
                    </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
