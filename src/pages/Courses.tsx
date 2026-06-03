import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Card, CardContent } from '../components/ui/card';
import { 
  PlayCircle, 
  Video, 
  Code, 
  BookOpen, 
  Plus, 
  Trash2, 
  Clock, 
  Trophy, 
  Tag, 
  Calendar 
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Courses() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<any[]>([]);
  const [filterCategory, setFilterDept] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [studentProgress, setStudentProgress] = useState<any[]>([]);
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
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this course?")) return;
    setIsDeleting(courseId);
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
      setLoading(true);
      
      // Let's query courses metadata with client fallbacks
      let query = supabase.from('courses').select('*, profiles!faculty_id(name, department_id), lessons(id, cf_stream_id, external_url, content_type)');
      
      if (profile.role === 'student') {
        const { data: assignments } = await supabase.from('faculty_students')
          .select('faculty_id')
          .eq('student_id', profile.id);
          
        const facultyIds = assignments?.map(a => a.faculty_id) || [];
        
        query = query.in('status', ['published', 'approved_by_dept']);
        if (facultyIds.length > 0) {
           const fIdsStr = facultyIds.join(',');
           query = query.or(`faculty_id.in.(${fIdsStr}),is_mandatory.eq.true`);
        } else {
           query = query.eq('is_mandatory', true);
        }
      } else if (profile.role === 'faculty' || profile.role === 'dept_admin' || profile.role === 'dean') {
         if (profile.department_id) {
           query = query.or(`department_id.eq.${profile.department_id},is_mandatory.eq.true`);
         } else {
           query = query.eq('is_mandatory', true);
         }
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      setCourses(data || []);

      // Fetch student progress
      if (profile) {
        const { data: progress } = await supabase
          .from('student_progress')
          .select('*')
          .eq('student_id', profile.id);
        if (progress) setStudentProgress(progress);
      }
    } catch (err) {
      console.error("Failed to fetch courses", err);
    } finally {
      setLoading(false);
    }
  };

  const extractYoutubeId = (les: any) => {
    if (!les) return null;
    if (les.cf_stream_id && les.cf_stream_id.length === 11) return les.cf_stream_id;
    const url = les.external_url || '';
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const getCourseThumbnail = (course: any) => {
    if (course.thumbnail_url) return course.thumbnail_url;
    if (course.lessons && course.lessons.length > 0) {
      const firstLesson = course.lessons[0];
      const ytId = extractYoutubeId(firstLesson);
      if (ytId) {
        return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
      }
    }
    return null;
  };

  const getCourseProgress = (course: any) => {
    const courseLessons = course.lessons || [];
    if (courseLessons.length === 0) return null;
    const completedCount = courseLessons.filter((les: any) => 
      studentProgress.some((p: any) => p.lesson_id === les.id && p.status === 'completed')
    ).length;
    
    const percent = Math.round((completedCount / courseLessons.length) * 105);
    const finalPercent = percent > 100 ? 100 : percent;

    return {
      completed: completedCount,
      total: courseLessons.length,
      percent: finalPercent
    };
  };

  const filteredCourses = courses.filter(course => {
    const matchesCategory = filterCategory === 'all' || course.category === filterCategory;
    const matchesType = filterType === 'all' || 
                        (filterType === 'mandatory' && (course.is_mandatory || course.title?.toLowerCase().includes('yoga'))) ||
                        (filterType === 'upskilling' && course.content_type === 'upskilling' && !course.is_mandatory) ||
                        (filterType === 'standard' && course.content_type === 'course' && !course.is_mandatory);
    const matchesSearch = course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          course.profiles?.name?.toLowerCase().includes(searchQuery.toLowerCase());
                          
    return matchesCategory && matchesType && matchesSearch;
  });

  const sortedCourses = [...filteredCourses].sort((a, b) => {
    if (sortBy === 'newest') {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortBy === 'oldest') {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    if (sortBy === 'alphabetical') {
      return (a.title || '').localeCompare(b.title || '');
    }
    return 0;
  });

  return (
    <div className="max-w-6xl mx-auto py-6">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#5E171B] block">Academic Curriculum</span>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center mt-0.5">
            <BookOpen className="h-8 w-8 text-[#5E171B] mr-3" />
            S-VYASA Course Syllabi
          </h1>
          <p className="text-gray-700 text-sm mt-1">Explore all mandatory, core yoga studies, faculty-assigned courses, and general upskilling directives.</p>
        </div>
        {['super_admin', 'dean', 'dept_admin', 'faculty'].includes(profile?.role || '') && (
          <Link to="/studio" className="bg-[#5E171B] hover:bg-[#450F13] text-white px-4 py-2.5 rounded-xl font-bold flex items-center shadow-none text-xs transition-colors">
            <Plus className="w-4 h-4 mr-2" /> Submit Course Content
          </Link>
        )}
      </div>

      {/* Course Catalog Search Bar */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-8 flex flex-col md:flex-row gap-4 items-center justify-between shadow-none">
        <div className="w-full md:w-1/3 relative">
          <input
            type="text"
            placeholder="Search class codes, lesson subjects, tutors..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-[#5E171B]/50 transition-colors"
          />
          <span className="absolute left-3 top-2.5 text-gray-400">🔍</span>
        </div>
        
        <div className="w-full md:w-auto flex flex-wrap gap-3 items-center justify-end">
          <select 
            value={filterCategory} 
            onChange={e => setFilterDept(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-gray-950 rounded-xl px-3 py-2 text-sm shadow-none focus:outline-none focus:border-[#5E171B]/50"
          >
            <option value="all">All Specialties</option>
            <option value="core">Core Yoga & Sadhana</option>
            <option value="technical">Technical / Coding</option>
            <option value="soft_skills">Soft Skills</option>
            <option value="aptitude">Academic Aptitude</option>
            <option value="other">Other Specialties</option>
          </select>

          <select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-gray-950 rounded-xl px-3 py-2 text-sm shadow-none focus:outline-none focus:border-[#5E171B]/50"
          >
            <option value="all">All Requirements</option>
            <option value="mandatory">Mandatory Path</option>
            <option value="standard">Standard Degree</option>
            <option value="upskilling">Electives Only</option>
          </select>

          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)}
            className="bg-gray-50 border border-gray-200 text-gray-950 rounded-xl px-3 py-2 text-sm shadow-none focus:outline-none focus:border-[#5E171B]/50"
          >
            <option value="newest">Recent Publish</option>
            <option value="oldest">Historical Syllabi</option>
            <option value="alphabetical">By Alphabet A-Z</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12 text-gray-500 font-medium">Querying S-VYASA Educational Directory...</div>
      ) : sortedCourses.length === 0 ? (
        <div className="text-center py-16 text-gray-500 bg-white border border-gray-200 rounded-2xl shadow-none">
          <BookOpen className="mx-auto h-12 w-12 text-[#5E171B]/40 mb-4" />
          <p className="font-bold text-gray-700">No matching scholastic resources cataloged.</p>
          <p className="text-xs text-gray-400 mt-1">Try resetting filters to view general institute pathways.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedCourses.map(course => {
            const progress = getCourseProgress(course);
            const thumbUrl = getCourseThumbnail(course);
            const isMand = course.is_mandatory || course.category === 'core' || course.title?.toLowerCase().includes('yoga');

            return (
              <Card key={course.id} className="bg-white border-gray-200 text-gray-900 overflow-hidden rounded-2xl flex flex-col group hover:border-[#5E171B]/60 hover:shadow-sm transition-all shadow-none !p-0">
                
                {/* Thumbnail Header Area */}
                <div className="h-44 overflow-hidden w-full relative bg-gray-50 border-b border-gray-100">
                  {thumbUrl ? (
                    <img src={thumbUrl} alt={course.title} className="object-cover w-full h-full opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#5E171B]/15 to-[#5E171B]/5">
                      <BookOpen className={`h-12 w-12 ${isMand ? 'text-[#5E171B]' : 'text-gray-400'}`} />
                    </div>
                  )}
                  
                  {/* Pinned Mandatory Tags */}
                  <div className="absolute top-3 left-3">
                    {isMand ? (
                      <span className="bg-yellow-400 text-gray-950 px-2.5 py-1 rounded-lg text-[9px] font-extrabold tracking-wider uppercase shadow-md border border-yellow-500/25">
                        📌 Pinned Core
                      </span>
                    ) : (
                      <span className="bg-white text-gray-800 px-2.5 py-1 rounded-lg text-[9px] font-bold tracking-wider uppercase border border-gray-250/50 shadow-md">
                        {course.category || 'Specialty'}
                      </span>
                    )}
                  </div>

                  <div className="absolute top-3 right-3 flex gap-2">
                    {course.is_compiler_enabled && (
                       <span className="bg-[#5E171B]/90 text-white px-2 py-0.5 rounded text-[8px] font-bold tracking-wide uppercase flex items-center shadow-md">
                         <Code className="w-3 h-3 mr-1" /> Practice Work
                       </span>
                    )}
                  </div>

                  {/* Course Credits Overlay */}
                  <span className="absolute bottom-3 right-3 bg-gray-900/80 text-yellow-400 font-extrabold text-[10px] px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md">
                    {course.credits ?? 3} Credit Hours
                  </span>
                </div>

                {/* Card Content parameters */}
                <div className="p-5 flex flex-col flex-grow gap-2 justify-between">
                  <div>
                    {/* Level / Target details */}
                    <div className="flex gap-2 items-center text-[10px] font-bold text-gray-400 uppercase mb-1.5">
                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">{course.difficulty || 'All Levels'}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {course.deadline || 'Flexible Deadline'}</span>
                    </div>

                    <h3 className="font-bold text-lg leading-tight text-gray-950 group-hover:text-[#5E171B] transition-colors line-clamp-2">{course.title}</h3>
                    <p className="text-xs text-gray-650 line-clamp-2 mt-2 leading-relaxed">{course.description || "Course study modules set by appointed S-VYASA faculty."}</p>
                  </div>
                  
                  {/* Watch completion progress details */}
                  <div className="pt-4 mt-4 border-t border-gray-100 flex flex-col gap-3">
                    {progress && (
                      <div className="flex flex-col gap-1 bg-gray-50 p-2.5 rounded-xl border">
                        <div className="flex justify-between items-center text-[9px] font-bold text-gray-500 uppercase">
                          <span>Progress watched</span>
                          <span>{progress.percent}%</span>
                        </div>
                        <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden border">
                          <div 
                            className={`h-full transition-all duration-300 ${progress.percent === 100 ? 'bg-green-600' : 'bg-[#5E171B]'}`} 
                            style={{ width: `${progress.percent}%` }} 
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-500 font-semibold">Tutor: <strong className="text-gray-700">{course.profiles?.name || 'Academic Scholar'}</strong></span>
                      
                      <div className="flex items-center gap-3">
                        {['super_admin', 'dean', 'dept_admin'].includes(profile?.role || '') && (
                          <button onClick={(e) => handleDelete(e, course.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors border-0" disabled={isDeleting === course.id}>
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <Link 
                          to={`/courses/${course.id}`} 
                          className="bg-[#5E171B] hover:bg-[#4E1215] active:bg-[#3E0D10] text-white px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-xs border border-[#5E171B]/20 flex items-center gap-1.5 cursor-pointer transform active:scale-97"
                        >
                          Join Class <PlayCircle className="h-3.5 w-3.5 fill-white text-[#5E171B]" />
                        </Link>
                      </div>
                    </div>
                  </div>

                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
