import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Card, CardContent } from '../components/ui/card';
import { PlayCircle, Video, Code, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Courses() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCourses();
  }, [profile]);

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

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-2">
            <BookOpen className="h-8 w-8 text-[#F05A28] mr-3" />
            Course Catalog
          </h1>
          <p className="text-gray-700">Explore courses assigned to your department, upskilling modules, and mandatory tasks.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10 text-gray-500">Loading courses...</div>
      ) : courses.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl">
          <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p>No courses available right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map(course => (
            <Card key={course.id} className="bg-[#5A1A1A] border-[#4A1414] text-white overflow-hidden rounded-2xl flex flex-col group cursor-pointer hover:border-[#F05A28]/50 transition-colors shadow-none !p-0">
              <div className={`h-40 overflow-hidden w-full relative ${course.content_type === 'upskilling' && !course.is_mandatory ? 'bg-[#2A0C0C]' : 'bg-[#4A1414]'}`}>
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title} className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${course.content_type === 'upskilling' && !course.is_mandatory ? 'bg-gradient-to-br from-[#2A0C0C] to-[#1a0505]' : 'bg-gradient-to-br from-[#4A1414] to-[#3a0f0f]'}`}>
                    {course.content_type === 'upskilling' && !course.is_mandatory ? (
                      <Video className="h-12 w-12 text-[#F05A28]/50" />
                    ) : (
                      <BookOpen className={`h-12 w-12 ${course.is_mandatory ? 'text-yellow-500/80' : 'text-[#F05A28]/50'}`} />
                    )}
                  </div>
                )}
                <div className="absolute top-3 left-3">
                  <div className={`bg-[#1A1A1A]/80 px-2 py-1 rounded text-[10px] font-semibold tracking-wider uppercase border border-[#4A1414] shadow-lg ${course.is_mandatory ? 'text-yellow-400' : course.content_type === 'upskilling' ? 'text-purple-400' : 'text-[#F05A28]'}`}>
                    {course.is_mandatory ? 'Mandatory' : course.content_type === 'upskilling' ? 'Upskilling' : course.category || 'Course'}
                  </div>
                </div>
                <div className="absolute top-3 right-3 flex gap-2">
                  {course.is_compiler_enabled && (
                     <div className="bg-[#F05A28]/90 text-white px-2 py-1 rounded text-xs font-bold tracking-wider uppercase border border-[#4A1414] flex items-center shadow-lg">
                       <Code className="w-3 h-3 mr-1" /> Tech
                     </div>
                  )}
                </div>
              </div>
              <div className="p-5 flex flex-col flex-grow gap-2">
                <h3 className="font-bold text-lg leading-tight text-white line-clamp-2">{course.title}</h3>
                <p className="text-sm text-gray-300 line-clamp-2 mb-2 flex-grow">{course.description || "No description provided."}</p>
                
                <div className="flex items-center justify-between mt-auto pt-2 border-t border-[#4A1414]">
                  <span className="text-xs text-gray-400 font-medium">By {course.profiles?.name || 'Faculty'}</span>
                  <Link to={`/courses/${course.id}`} className="text-xs font-bold text-[#F05A28] group-hover:text-[#de4c1a] flex items-center">
                    Enter <PlayCircle className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
