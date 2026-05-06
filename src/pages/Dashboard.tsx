import { useAuth } from '../hooks/useAuth';
import { Card, CardContent } from '../components/ui/card';
import { StreakWidget } from '../components/widgets/StreakWidget';
import { BookOpen, Star, PlayCircle, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        let query = supabase.from('courses').select('*, profiles!faculty_id(name)').order('created_at', { ascending: false });
        
        if (profile?.role === 'student') {
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
        } else if (profile?.role === 'faculty' || profile?.role === 'dept_admin' || profile?.role === 'dean') {
           if (profile.department_id) {
             query = query.or(`department_id.eq.${profile.department_id},is_mandatory.eq.true`);
           } else {
             query = query.eq('is_mandatory', true);
           }
        }
        
        const { data, error } = await query;
        if (error) throw error;
        setCourses(data || []);
      } catch (err) {
        console.error("Failed to fetch courses", err);
      }
    };
    
    if (profile) {
      fetchCourses();
    }
  }, [profile]);

  const standardCourses = courses.filter(c => c.content_type === 'course' || !c.content_type || c.is_mandatory);
  const dashboardContent = courses.filter(c => c.content_type === 'upskilling' && !c.is_mandatory);

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <header className="flex justify-between items-center mb-2">
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-900 m-0">
            Welcome back, {profile?.name || profile?.email?.split('@')[0] || 'User'}
          </h1>
          <p className="text-sm text-gray-700 mt-1 m-0">
            {profile?.departments?.name || 'Department not assigned'} • {profile?.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-5 justify-end">
          <StreakWidget streak={profile?.streak_count || 0} />
          <div className="w-10 h-10 rounded-full bg-[#5E171B] flex items-center justify-center font-bold text-white border-2 border-gray-200 shrink-0">
             {profile?.name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      </header>

      <div className="mt-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-widest">Available Courses</h2>
          <Link to="/courses" className="text-xs text-[#5E171B] hover:text-[#450F13] font-semibold">View All Courses</Link>
        </div>
        
        {standardCourses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 text-gray-600">
            <p>No courses available for you right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
             {standardCourses.map(course => (
               <Link to={`/courses/${course.id}`} key={course.id}>
                 <Card className="bg-white border-gray-200 text-gray-900 overflow-hidden rounded-2xl hover:border-[#5E171B]/50 transition-colors cursor-pointer !p-0 shadow-none h-full flex flex-col">
                    <div className="h-32 overflow-hidden w-full bg-gray-50 flex items-center justify-center relative">
                       <BookOpen className={`h-10 w-10 ${course.is_mandatory ? 'text-yellow-600' : 'text-gray-500'}`} />
                       <div className={`absolute top-3 left-3 bg-white px-2 py-1 rounded text-[10px] font-semibold tracking-wider uppercase border border-gray-200 ${course.is_mandatory ? 'text-yellow-600' : 'text-[#5E171B]'}`}>
                         {course.is_mandatory ? 'Mandatory' : course.category || 'Course'}
                       </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                       <div>
                         <h3 className="font-semibold text-sm leading-snug text-gray-800">{course.title}</h3>
                         <p className="text-xs text-gray-600 mt-2 line-clamp-2">{course.description}</p>
                       </div>
                       <div className="mt-4 pt-4 border-t border-gray-200/50 flex justify-between items-center text-xs text-gray-500">
                          <span>By {course.profiles?.name || 'Faculty'}</span>
                          <span className={`${course.status === 'published' ? 'text-green-500' : 'text-yellow-500'}`}>{course.status}</span>
                       </div>
                    </div>
                 </Card>
               </Link>
             ))}
          </div>
        )}
      </div>

      {dashboardContent.length > 0 && (
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-widest flex items-center">
               <Star className="h-4 w-4 mr-2" /> Upskilling & General Content
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
             {dashboardContent.map(content => (
               <Link to={`/courses/${content.id}`} key={content.id}>
                 <Card className="bg-white border-gray-200 text-gray-900 overflow-hidden rounded-2xl hover:border-[#5E171B]/50 transition-colors cursor-pointer !p-0 shadow-none h-full flex flex-col">
                    <div className="h-32 overflow-hidden w-full bg-blue-50 flex items-center justify-center relative">
                       <Video className="h-10 w-10 text-[#5E171B]/60" />
                       <div className="absolute top-3 left-3 bg-white px-2 py-1 rounded text-[10px] font-semibold tracking-wider text-blue-600 uppercase border border-gray-200">Upskilling</div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                       <div>
                         <h3 className="font-semibold text-sm leading-snug text-gray-800">{content.title}</h3>
                         <p className="text-xs text-gray-600 mt-2 line-clamp-2">{content.description}</p>
                       </div>
                       <div className="mt-4 pt-4 border-t border-gray-200/50 flex justify-between items-center text-xs text-gray-500">
                          <span>By {content.profiles?.name || 'Faculty'}</span>
                       </div>
                    </div>
                 </Card>
               </Link>
             ))}
          </div>
        </div>
      )}
    </div>
  );
}
