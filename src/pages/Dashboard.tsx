import { useAuth } from '../hooks/useAuth';
import { Card, CardContent } from '../components/ui/card';
import { StreakWidget } from '../components/widgets/StreakWidget';
import { 
  BookOpen, 
  Star, 
  PlayCircle, 
  Video, 
  Plus, 
  Trash2, 
  Code, 
  Grid, 
  List, 
  Calendar, 
  Clock, 
  Sparkles, 
  Trophy, 
  BookMarked,
  Hourglass,
  Tag
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const { profile } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [filterCategory, setFilterDept] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [studentProgress, setStudentProgress] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  
  // Smart LMS views
  const [isGridView, setIsGridView] = useState<boolean>(true);
  const [dashboardTab, setDashboardTab] = useState<string>('all'); // all, mandatory, upskilling

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        let query = supabase.from('courses').select('*, profiles!faculty_id(name, department_id), lessons(id, cf_stream_id, external_url, content_type)').order('created_at', { ascending: false });
        
        if (profile?.role === 'student') {
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
      }
    };
    
    if (profile) {
      fetchCourses();
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
    await supabase.from('student_progress').delete().eq('course_id', courseId);
    await supabase.from('lessons').delete().eq('course_id', courseId);
    const { error } = await supabase.from('courses').delete().eq('id', courseId);
    if (error) {
      console.error(error);
      alert("Error deleting course: " + error.message);
    }
    setIsDeleting(null);
    setCourses(prev => prev.filter(c => c.id !== courseId));
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
    
    const percent = courseLessons.length > 0 ? Math.round((completedCount / courseLessons.length) * 100) : 0;
    const finalPercent = Math.min(100, Math.max(0, percent));

    return {
      completed: completedCount,
      total: courseLessons.length,
      percent: finalPercent
    };
  };

  // Process and Filter
  const filteredCourses = courses.filter(course => {
    const matchesCategory = filterCategory === 'all' || course.category === filterCategory;
    
    // Tab filtering
    let matchesTab = true;
    if (dashboardTab === 'mandatory') {
      matchesTab = course.is_mandatory || course.category === 'core' || course.title?.toLowerCase().includes('yoga');
    } else if (dashboardTab === 'upskilling') {
      matchesTab = course.content_type === 'upskilling' && !course.is_mandatory;
    }

    const matchesType = filterType === 'all' || 
                        (filterType === 'mandatory' && (course.is_mandatory || course.title?.toLowerCase().includes('yoga'))) ||
                        (filterType === 'upskilling' && course.content_type === 'upskilling' && !course.is_mandatory) ||
                        (filterType === 'standard' && course.content_type === 'course' && !course.is_mandatory);

    const matchesSearch = course.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          course.profiles?.name?.toLowerCase().includes(searchQuery.toLowerCase());
                          
    return matchesCategory && matchesType && matchesSearch && matchesTab;
  });

  // Sort
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

  // Find the prominent mandatory yoga course to PIN
  const pinnedCourse = courses.find(c => 
    c.is_mandatory || 
    c.category === 'core' || 
    c.title?.toLowerCase().includes('yoga')
  );

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      
      {/* S-VYASA Header section */}
      <header className="flex justify-between items-center mb-1 flex-wrap gap-4">
        <div className="flex-1">
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#5E171B] block">Academic Workspace</span>
          <h1 className="text-2xl font-bold text-gray-950 mt-0.5">
            Welcome, {profile?.name || profile?.email?.split('@')[0] || 'Scholar'}
          </h1>
          <p className="text-xs text-gray-700 font-medium mt-1">
            {profile?.departments?.name || 'Department of Yogic Sciences'} • <span className="bg-[#5E171B]/10 text-[#5E171B] px-2 py-0.5 rounded font-bold capitalize text-[10px] inline-block">{profile?.role?.replace('_', ' ')}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4 justify-end">
          {['super_admin', 'dean', 'dept_admin', 'faculty'].includes(profile?.role || '') && (
            <Link to="/studio" className="bg-[#5E171B] hover:bg-[#4E1215] active:bg-[#3E0D10] text-white px-4 py-2 rounded-lg font-bold flex items-center shadow-xs text-xs border border-[#5E171B]/20 transition-all transform active:scale-97">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Publish Lesson
            </Link>
          )}
          <StreakWidget streak={profile?.streak_count || 0} />
          <div className="w-9 h-9 rounded-full bg-[#5E171B] flex items-center justify-center font-bold text-white border-2 border-white shadow-xs shrink-0 text-sm">
             {profile?.name?.charAt(0).toUpperCase() || profile?.email?.charAt(0).toUpperCase() || 'S'}
          </div>
        </div>
      </header>

      {/* PINNED MANDATORY YOGA COURSE HERO BLOCK */}
      {pinnedCourse && (
        <div className="relative bg-gradient-to-r from-[#5E171B] to-[#360809] rounded-3xl overflow-hidden text-white shadow-xl p-6 md:p-8 flex flex-col md:flex-row items-center gap-6 border border-[#5E171B]/20">
          <div className="absolute right-0 top-0 w-1/3 h-full opacity-10 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-yellow-300 via-transparent to-transparent pointer-events-none" />
          
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-yellow-500 text-gray-950 text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md">
                <Sparkles className="w-3 h-3 fill-gray-950" /> REQUIRED CORE SADHANA
              </span>
              <span className="bg-white/10 text-white text-[9px] uppercase tracking-wider font-bold px-2 py-1 rounded-full">
                S-VYASA MANDATORY
              </span>
            </div>
            
            <div className="space-y-1.5">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{pinnedCourse.title}</h2>
              <p className="text-gray-200 text-sm max-w-2xl leading-relaxed">
                {pinnedCourse.description || "Establish your foundation in traditional yogic practice, pranayama, and holistic health science to boost academic stress resilience."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-white/80 font-medium">
              <span className="flex items-center gap-1"><Trophy className="w-4 h-4 text-yellow-400" /> {pinnedCourse.credits ?? 4} Credits</span>
              <span className="flex items-center gap-1"><Tag className="w-4 h-4 text-yellow-400" /> {pinnedCourse.difficulty ?? 'All Levels'}</span>
              <span className="flex items-center gap-1"><Calendar className="w-4 h-4 text-yellow-400" /> Deadline: {pinnedCourse.deadline ?? 'End of Term'}</span>
            </div>

            <div className="pt-2 flex items-center flex-wrap gap-4">
              <Link 
                to={`/courses/${pinnedCourse.id}`} 
                className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-neutral-950 font-bold px-4.5 py-2 rounded-lg text-xs tracking-wide transition-all shadow-md hover:shadow-amber-500/10 flex items-center gap-2 border border-amber-400/20 transform active:scale-97 cursor-pointer"
              >
                <PlayCircle className="w-4 h-4 fill-neutral-950 text-neutral-950" /> Resume Yogic Practice
              </Link>
              
              {/* Telemetry Progress Bar inside Hero for quick visual tracking */}
              {(() => {
                const progress = getCourseProgress(pinnedCourse);
                if (!progress) return null;
                return (
                  <div className="flex flex-col gap-1 w-48 bg-white/5 border border-white/10 rounded-xl p-2.5">
                    <div className="flex justify-between text-[9px] font-bold text-white/90">
                      <span>WATCHED</span>
                      <span>{progress.percent}%</span>
                    </div>
                    <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-yellow-400 h-full" style={{ width: `${progress.percent}%` }} />
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="w-full md:w-64 aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/10 shrink-0 relative flex items-center justify-center">
            {getCourseThumbnail(pinnedCourse) ? (
              <img src={getCourseThumbnail(pinnedCourse)!} alt="Yoga focus" className="w-full h-full object-cover opacity-80" referrerPolicy="no-referrer" />
            ) : (
              <BookMarked className="w-12 h-12 text-white/50" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-3">
              <span className="text-[10px] font-bold text-white tracking-widest uppercase">Classroom Live</span>
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE LMS WORKSPACE CONTEXT BAR (Coursera/Udemy style) */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-2 flex-wrap gap-4">
                   {/* Dynamic Tabs for course categories */}
          <div className="flex bg-gray-150 p-0.5 gap-0.5 rounded-lg border border-gray-200">
            <button 
              onClick={() => setDashboardTab('all')}
              className={`px-4 py-1.5 rounded-md text-xs font-extrabold transition-all cursor-pointer ${dashboardTab === 'all' ? 'bg-white text-neutral-950 shadow-xs border border-gray-200/50' : 'text-gray-500 hover:text-gray-900'}`}
            >
              All Curriculum
            </button>
            <button 
              onClick={() => setDashboardTab('mandatory')}
              className={`px-4 py-1.5 rounded-md text-xs font-extrabold transition-all cursor-pointer ${dashboardTab === 'mandatory' ? 'bg-[#5E171B] text-white shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Required Courses & Yoga
            </button>
            <button 
              onClick={() => setDashboardTab('upskilling')}
              className={`px-4 py-1.5 rounded-md text-xs font-extrabold transition-all cursor-pointer ${dashboardTab === 'upskilling' ? 'bg-white text-neutral-950 shadow-xs border border-gray-200/50' : 'text-gray-500 hover:text-gray-900'}`}
            >
              Upskilling Electives
            </button>
          </div>

          {/* Grid vs List View Selector Controls */}
          <div className="flex items-center gap-3">
            <div className="flex bg-gray-100 rounded-lg p-1 border">
              <button 
                onClick={() => setIsGridView(true)}
                className={`p-1.5 rounded ${isGridView ? 'bg-white text-[#5E171B] shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                title="Grid View"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsGridView(false)}
                className={`p-1.5 rounded ${!isGridView ? 'bg-white text-[#5E171B] shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                title="List Line View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic filter panel */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-none">
          <div className="w-full md:w-1/3 relative">
            <input
              type="text"
              placeholder="Search courses, descriptions, instructors..."
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
              className="bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3 py-2 text-sm shadow-none focus:outline-none focus:border-[#5E171B]/50"
            >
              <option value="all">Specialties (All)</option>
              <option value="core">Core Yoga & Sadhana</option>
              <option value="technical">Technical / Coding</option>
              <option value="soft_skills">Soft Skills</option>
              <option value="aptitude">Academic Aptitude</option>
              <option value="other">Other Specialties</option>
            </select>

            <select 
              value={filterType} 
              onChange={e => setFilterType(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3 py-2 text-sm shadow-none focus:outline-none focus:border-[#5E171B]/50"
            >
              <option value="all">All Lesson Types</option>
              <option value="mandatory">Mandatory Path</option>
              <option value="standard">Standard Degree</option>
              <option value="upskilling">Electives Only</option>
            </select>

            <select 
              value={sortBy} 
              onChange={e => setSortBy(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-900 rounded-xl px-3 py-2 text-sm shadow-none focus:outline-none focus:border-[#5E171B]/50"
            >
              <option value="newest">Recent Additions</option>
              <option value="oldest">Early Core Work</option>
              <option value="alphabetical">By Alphabet A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* COURSE CONTAINER - GRID VS LIST RENDERER */}
      <div>
        {sortedCourses.length === 0 ? (
          <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl shadow-none text-gray-500">
            <BookOpen className="mx-auto h-12 w-12 text-gray-300 mb-3" />
            <p className="font-bold text-gray-700">No active curricular modules mapped.</p>
            <p className="text-xs text-gray-400 mt-1">Refine your search tags or request departmental publishing from faculty.</p>
          </div>
        ) : isGridView ? (
          /* PRESTIGE COURSERA-STYLE GRID CARD LAYOUT */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {sortedCourses.map(course => {
               const progress = getCourseProgress(course);
               const thumbUrl = getCourseThumbnail(course);
               const isMand = course.is_mandatory || course.category === 'core' || course.title?.toLowerCase().includes('yoga');

               return (
                 <Link to={`/courses/${course.id}`} key={course.id}>
                   <Card className="group bg-white border border-gray-200 text-gray-900 overflow-hidden rounded-2xl hover:border-[#5E171B]/70 hover:shadow-md transition-all cursor-pointer !p-0 shadow-none h-full flex flex-col">
                      <div className="h-40 overflow-hidden w-full bg-gray-50 flex items-center justify-center relative border-b border-gray-100">
                        {thumbUrl ? (
                          <img src={thumbUrl} alt={course.title} className="object-cover w-full h-full opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300" referrerPolicy="no-referrer" />
                        ) : (
                          <BookOpen className={`h-12 w-12 ${isMand ? 'text-[#5E171B]' : 'text-gray-400'}`} />
                        )}
                        
                        {/* Course Category / Pinned badging */}
                        <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                          {isMand ? (
                            <span className="bg-yellow-400 text-gray-950 px-2 py-0.5 rounded-lg text-[9px] font-extrabold tracking-wider uppercase shadow-sm">
                              📌 Pinned / Mandatory
                            </span>
                          ) : (
                            <span className="bg-white/90 backdrop-blur-sm text-[#5E171B] px-2 py-0.5 rounded-lg text-[9px] font-bold tracking-wider uppercase border text-center">
                              {course.category || 'Specialty'}
                            </span>
                          )}
                        </div>

                        {/* Credits Indicator Badge */}
                        <div className="absolute bottom-3 right-3 bg-gray-950/85 backdrop-blur-sm text-yellow-400 px-2.5 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 shadow-md">
                          {course.credits ?? 3} CR
                        </div>
                      </div>

                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                         <div className="space-y-1.5">
                           {/* Level and Deadline Tags */}
                           <div className="flex gap-2 items-center text-[10px] font-bold text-gray-400 uppercase">
                             <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">{course.difficulty || 'All Levels'}</span>
                             <span>•</span>
                             <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-[#5E171B]" /> {course.deadline || 'Flexible'}</span>
                           </div>

                           <h3 className="font-bold text-base leading-snug text-gray-900 group-hover:text-[#5E171B] transition-colors line-clamp-2">{course.title}</h3>
                           <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">{course.description || "Establish holistic proficiency inside S-VYASA curated lecture series."}</p>
                         </div>

                         <div className="space-y-3.5">
                           {/* Progress Metrics */}
                           {progress && (
                             <div className="flex flex-col gap-1.5 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                               <div className="flex justify-between items-center text-[10px] font-bold text-gray-500">
                                 <span>watch stream progress</span>
                                 <span>{progress.percent}%</span>
                               </div>
                               <div className="w-full bg-gray-200 h-1.5 rounded-full overflow-hidden">
                                 <div 
                                   className={`h-full rounded-full ${progress.percent === 100 ? 'bg-green-600' : 'bg-[#5E171B]'}`} 
                                   style={{ width: `${progress.percent}%` }} 
                                 />
                               </div>
                               <span className="text-[9px] font-bold text-gray-400 text-right block uppercase">
                                 {progress.completed}/{progress.total} lessons done
                                </span>
                             </div>
                           )}

                           <div className="pt-3 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400 font-semibold uppercase">
                              <span className="flex items-center gap-1 text-gray-600">By {course.profiles?.name || 'Academic Faculty'}</span>
                              {['super_admin', 'dean', 'dept_admin'].includes(profile?.role || '') && (
                                <button 
                                  onClick={(e) => handleDelete(e, course.id)} 
                                  className="text-red-500 hover:text-red-700 p-1 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border-0" 
                                  disabled={isDeleting === course.id}
                                  title="Delete Course Asset"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <span className={`text-[10px] font-bold ${course.status === 'published' ? 'text-green-600' : 'text-yellow-600'}`}>
                                {course.status?.replace('_', ' ')}
                              </span>
                           </div>
                         </div>
                      </div>
                   </Card>
                 </Link>
               );
             })}
          </div>
        ) : (
          /* PRESTIGE UDEMY-STYLE LIST DETAILED ROW LAYOUT */
          <div className="flex flex-col gap-4">
            {sortedCourses.map(course => {
               const progress = getCourseProgress(course);
               const thumbUrl = getCourseThumbnail(course);
               const isMand = course.is_mandatory || course.category === 'core' || course.title?.toLowerCase().includes('yoga');

               return (
                 <Link to={`/courses/${course.id}`} key={course.id}>
                   <div className="group bg-white border border-gray-200 rounded-2xl p-4 hover:border-[#5E171B]/70 hover:shadow-sm transition-all flex flex-col md:flex-row items-center gap-5 cursor-pointer">
                     
                     {/* Thumbnail */}
                     <div className="w-full md:w-44 h-24 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center shrink-0 border relative">
                       {thumbUrl ? (
                         <img src={thumbUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" referrerPolicy="no-referrer" />
                       ) : (
                         <BookMarked className="w-8 h-8 text-gray-400" />
                       )}
                       {isMand && (
                         <span className="absolute top-2 left-2 bg-yellow-400 text-gray-950 font-bold px-1.5 py-0.5 rounded text-[8px] tracking-wide uppercase">Core</span>
                       )}
                     </div>

                     {/* Content details */}
                     <div className="flex-1 space-y-2 min-w-0">
                       <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                         <span className="text-[10px] font-extrabold text-[#5E171B] uppercase tracking-wider">{course.category || 'Specialty'}</span>
                         <span className="text-gray-300 text-xs">•</span>
                         <span className="bg-gray-100 text-gray-650 font-bold px-2 py-0.5 rounded text-[9px] uppercase">{course.difficulty || 'All Levels'}</span>
                         <span className="text-gray-300 text-xs">•</span>
                         <span className="text-xs font-semibold text-gray-500">Credits: {course.credits ?? 3} CR</span>
                       </div>

                       <h3 className="font-bold text-gray-950 text-base leading-snug group-hover:text-[#5E171B] transition-colors">{course.title}</h3>
                       <p className="text-xs text-gray-600 line-clamp-1 leading-relaxed">{course.description || "Curriculum material under standard S-VYASA parameters."}</p>
                       
                       <div className="text-[11px] text-gray-400 font-semibold">Tutor: <strong className="text-gray-600">{course.profiles?.name || 'S-VYASA Scholar'}</strong></div>
                     </div>

                     {/* Progress & Deadlines */}
                     <div className="w-full md:w-52 shrink-0 space-y-3">
                       {progress && (
                         <div className="space-y-1">
                           <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase">
                             <span>STUDY PROGRESS</span>
                             <span>{progress.percent}%</span>
                           </div>
                           <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden border">
                             <div className="bg-[#5E171B] h-full" style={{ width: `${progress.percent}%` }} />
                           </div>
                           <span className="text-[9px] text-gray-400 font-bold text-right block">{progress.completed}/{progress.total} LESSONS DONE</span>
                         </div>
                       )}
                       
                       <div className="flex justify-between items-center text-xs text-gray-400 font-semibold border-t pt-2">
                         <span>Deadline: {course.deadline || 'Flexible'}</span>
                         <span className="bg-[#5E171B]/10 text-[#5E171B] font-bold px-2 py-0.5 rounded text-[9px] capitalize">{course.status}</span>
                       </div>
                     </div>

                   </div>
                 </Link>
               );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
