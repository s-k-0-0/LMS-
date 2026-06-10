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
  Calendar,
  Settings,
  ShieldAlert,
  CheckCircle,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';

export interface CourseMetadata {
  global_course_group_id?: string | null;
  available_all_depts?: boolean;
  mandatory_roles?: string[]; // student, faculty, dept_admin, dean
  mandatory_depts?: string[]; // list of department IDs
}

export function parseCourseMetadata(description: string | null): { cleanDescription: string; metadata: CourseMetadata } {
  if (!description) {
    return { cleanDescription: '', metadata: {} };
  }
  const match = description.match(/<!--LMS_METADATA:\s*(\{.*?\})\s*-->/);
  if (match) {
    try {
      const metadata = JSON.parse(match[1]);
      const cleanDescription = description.replace(match[0], '').trim();
      return { cleanDescription, metadata };
    } catch (e) {
      console.error("Failed to parse course metadata", e);
    }
  }
  return { cleanDescription: description, metadata: {} };
}

export function serializeCourseMetadata(cleanDescription: string, metadata: CourseMetadata): string {
  return `${cleanDescription.trim()}\n\n<!--LMS_METADATA: ${JSON.stringify(metadata)}-->`;
}

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

  // States for course settings modal
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [modalIsMandatory, setModalIsMandatory] = useState(false);
  const [modalIsGlobal, setModalIsGlobal] = useState(false);
  const [modalTargetRoles, setModalTargetRoles] = useState<string[]>(['student']);
  const [modalTargetDept, setModalTargetDept] = useState<string>('all');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

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
    
    try {
      const courseToDelete = courses.find(c => c.id === courseId);
      if (courseToDelete) {
        const { cleanDescription, metadata } = parseCourseMetadata(courseToDelete.description);
        
        if (metadata.global_course_group_id && profile?.role === 'super_admin') {
          if (window.confirm("This is a global course replicated across all departments. Deleting it will delete it from all departments. Proceed?")) {
            const { data: siblingCourses } = await supabase.from('courses').select('id, description');
            if (siblingCourses) {
              const matchedIds = siblingCourses.filter(c => {
                const parsed = parseCourseMetadata(c.description);
                return parsed.metadata.global_course_group_id === metadata.global_course_group_id;
              }).map(c => c.id);
              
              for (const matchId of matchedIds) {
                await supabase.from('student_progress').delete().eq('course_id', matchId);
                await supabase.from('lessons').delete().eq('course_id', matchId);
                await supabase.from('courses').delete().eq('id', matchId);
              }
            }
          }
        } else {
           await supabase.from('student_progress').delete().eq('course_id', courseId);
           await supabase.from('lessons').delete().eq('course_id', courseId);
           await supabase.from('courses').delete().eq('id', courseId);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert("Error deleting course: " + err.message);
    }
    
    setIsDeleting(null);
    fetchCourses();
  };

  const fetchCourses = async () => {
    if (!profile) return;
    try {
      setLoading(true);
      
      const { data, error } = await supabase.from('courses')
        .select('*, profiles!faculty_id(name, department_id, role), lessons(id, cf_stream_id, external_url, content_type)')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      let filtered = data || [];
      
      if (profile.role === 'student') {
        const { data: assignments } = await supabase.from('faculty_students')
          .select('faculty_id')
          .eq('student_id', profile.id);
        const facultyIds = assignments?.map(a => a.faculty_id) || [];
        
        filtered = filtered.filter(course => {
          if (course.status !== 'published' && course.status !== 'approved_by_dept') return false;
          
          const { metadata } = parseCourseMetadata(course.description);
          const matchesRole = !metadata.mandatory_roles || metadata.mandatory_roles.includes('student');
          const matchesDept = !metadata.mandatory_depts || metadata.mandatory_depts.includes(profile.department_id || '');
          if (course.is_mandatory && matchesRole && matchesDept) {
            return true;
          }
          
          if (facultyIds.includes(course.faculty_id)) return true;
          if (course.department_id === profile.department_id) return true;
          return false;
        });
      } else if (profile.role === 'faculty') {
        filtered = filtered.filter(course => {
          const { metadata } = parseCourseMetadata(course.description);
          const matchesRole = !metadata.mandatory_roles || metadata.mandatory_roles.includes('faculty');
          const matchesDept = !metadata.mandatory_depts || metadata.mandatory_depts.includes(profile.department_id || '');
          if (course.is_mandatory && matchesRole && matchesDept) {
            return true;
          }
          return course.department_id === profile.department_id;
        });
      } else if (profile.role === 'dept_admin') {
        filtered = filtered.filter(course => {
          const { metadata } = parseCourseMetadata(course.description);
          const matchesRole = !metadata.mandatory_roles || metadata.mandatory_roles.includes('dept_admin');
          const matchesDept = !metadata.mandatory_depts || metadata.mandatory_depts.includes(profile.department_id || '');
          if (course.is_mandatory && matchesRole && matchesDept) {
            return true;
          }
          return course.department_id === profile.department_id;
        });
      } else if (profile.role === 'dean') {
        filtered = filtered.filter(course => {
          const { metadata } = parseCourseMetadata(course.description);
          const matchesRole = !metadata.mandatory_roles || metadata.mandatory_roles.includes('dean');
          const matchesDept = !metadata.mandatory_depts || metadata.mandatory_depts.includes(profile.department_id || '');
          if (course.is_mandatory && matchesRole && matchesDept) {
            return true;
          }
          if (profile.department_id) {
            return course.department_id === profile.department_id;
          }
          return true;
        });
      }
      
      setCourses(filtered);

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

  const handleOpenSettings = (course: any) => {
    const { cleanDescription, metadata } = parseCourseMetadata(course.description);
    setSelectedCourse(course);
    setModalIsMandatory(course.is_mandatory || false);
    setModalIsGlobal(metadata.available_all_depts || false);
    setModalTargetRoles(metadata.mandatory_roles || ['student']);
    setModalTargetDept(metadata.mandatory_depts?.[0] || 'all');
  };

  const handleSaveSettings = async () => {
    if (!selectedCourse) return;
    try {
      setIsSavingSettings(true);
      const { cleanDescription, metadata } = parseCourseMetadata(selectedCourse.description);
      
      const updatedMeta: CourseMetadata = {
        ...metadata,
        available_all_depts: modalIsGlobal && profile?.role === 'super_admin'
      };
      
      if (modalIsMandatory) {
        updatedMeta.mandatory_roles = modalTargetRoles;
        if (profile?.role === 'super_admin' || profile?.role === 'dean') {
          updatedMeta.mandatory_depts = modalTargetDept !== 'all' ? [modalTargetDept] : undefined;
        } else if (profile?.role === 'dept_admin') {
          updatedMeta.mandatory_depts = profile?.department_id ? [profile.department_id] : undefined;
        }
      } else {
        delete updatedMeta.mandatory_roles;
        delete updatedMeta.mandatory_depts;
      }
      
      const serializedDesc = serializeCourseMetadata(cleanDescription, updatedMeta);
      
      // Upgrade local department course to Global if marked so config replication
      if (profile?.role === 'super_admin' && modalIsGlobal && !metadata.global_course_group_id) {
         if (window.confirm("You are making this course available across all departments. This will replicate this course with lessons into all other departments. Proceed?")) {
           const { data: depts } = await supabase.from('departments').select('id');
           const deptIds = depts?.map(d => d.id) || [];
           
           const groupId = `global_${Date.now()}`;
           updatedMeta.global_course_group_id = groupId;
           const finalDescWithGroup = serializeCourseMetadata(cleanDescription, updatedMeta);
           
           // Fetch current course lessons
           const { data: currentLessons } = await supabase.from('lessons').select('*').eq('course_id', selectedCourse.id);
           
           for (const deptId of deptIds) {
             if (deptId === selectedCourse.department_id) {
                await supabase.from('courses').update({
                  is_mandatory: modalIsMandatory,
                  description: finalDescWithGroup,
                  status: 'published'
                }).eq('id', selectedCourse.id);
             } else {
                const { data: newCourse } = await supabase.from('courses').insert({
                   title: selectedCourse.title,
                   description: finalDescWithGroup,
                   faculty_id: selectedCourse.faculty_id,
                   department_id: deptId,
                   category: selectedCourse.category,
                   content_type: selectedCourse.content_type,
                   is_compiler_enabled: selectedCourse.is_compiler_enabled,
                   credits: selectedCourse.credits || 3,
                   difficulty: selectedCourse.difficulty || 'All Levels',
                   deadline: selectedCourse.deadline || null,
                   grading_weight: selectedCourse.grading_weight || 'Pass/Fail',
                   is_mandatory: modalIsMandatory,
                   status: 'published'
                }).select().single();
                
                if (newCourse && currentLessons && currentLessons.length > 0) {
                  for (const les of currentLessons) {
                    await supabase.from('lessons').insert({
                      course_id: newCourse.id,
                      title: les.title,
                      content_type: les.content_type,
                      cf_stream_id: les.cf_stream_id,
                      external_url: les.external_url,
                      created_by: les.created_by,
                      status: 'published'
                    });
                  }
                }
             }
           }
         }
      } else if (metadata.global_course_group_id) {
         // Keep siblings fully synchronized
         const { data: siblingCourses } = await supabase.from('courses').select('id, description');
         if (siblingCourses) {
           const matchedIds = siblingCourses.filter(c => {
             const parsed = parseCourseMetadata(c.description);
             return parsed.metadata.global_course_group_id === metadata.global_course_group_id;
           }).map(c => c.id);
           
           for (const matchId of matchedIds) {
              await supabase.from('courses').update({
                is_mandatory: modalIsMandatory,
                description: serializedDesc
              }).eq('id', matchId);
           }
         }
      } else {
         // Standard course update
         await supabase.from('courses').update({
           is_mandatory: modalIsMandatory,
           description: serializedDesc
         }).eq('id', selectedCourse.id);
      }
      
      setSelectedCourse(null);
      fetchCourses();
    } catch (err: any) {
      console.error(err);
      alert("Failed to save course settings.");
    } finally {
      setIsSavingSettings(false);
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
    
    const percent = courseLessons.length > 0 ? Math.round((completedCount / courseLessons.length) * 100) : 0;
    const finalPercent = Math.min(100, Math.max(0, percent));

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
            
            // Parse custom S-VYASA course metadata
            const { cleanDescription, metadata } = parseCourseMetadata(course.description);
            const isMand = course.is_mandatory || course.category === 'core' || course.title?.toLowerCase().includes('yoga');
            
            // Check if course is mandatory specifically for current logged in user role and department
            const isMandForUser = course.is_mandatory && (
              !metadata.mandatory_roles || metadata.mandatory_roles.includes(profile?.role || '')
            ) && (
              !metadata.mandatory_depts || metadata.mandatory_depts.includes(profile?.department_id || '')
            );

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
                  <div className="absolute top-3 left-3 flex flex-col gap-1.5 items-start">
                    {isMand ? (
                      <span className="bg-yellow-400 text-gray-950 px-2.5 py-1 rounded-lg text-[9px] font-extrabold tracking-wider uppercase shadow-md border border-yellow-500/25">
                        📌 Pinned Core
                      </span>
                    ) : (
                      <span className="bg-white text-gray-800 px-2.5 py-1 rounded-lg text-[9px] font-bold tracking-wider uppercase border border-gray-250/50 shadow-md">
                        {course.category || 'Specialty'}
                      </span>
                    )}

                    {isMandForUser && (
                      <span className="bg-red-650 text-white px-2.5 py-0.5 rounded-lg text-[8px] font-extrabold tracking-wide uppercase shadow-md animate-pulse">
                        Mandatory
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
                    <p className="text-xs text-gray-650 line-clamp-2 mt-2 leading-relaxed">{cleanDescription || "Course study modules set by appointed S-VYASA faculty."}</p>
                    
                    {/* Optional department indicator for administrators */}
                    {['super_admin', 'dean'].includes(profile?.role || '') && course.department_id && (
                      <span className="text-[10px] text-[#5E171B] font-bold uppercase tracking-wider block mt-2">
                        🏫 Dept ID: {course.department_id}
                      </span>
                    )}
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
                      
                      <div className="flex items-center gap-2">
                        {['super_admin', 'dean', 'dept_admin'].includes(profile?.role || '') && (
                          <>
                            <button 
                              onClick={() => handleOpenSettings(course)} 
                              className="text-gray-600 hover:text-gray-900 bg-gray-50 border hover:bg-gray-100 p-2 rounded-lg transition-colors border-gray-200"
                              title="Access Control / Governance"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={(e) => handleDelete(e, course.id)} className="text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100/50 p-2 rounded-lg transition-colors border border-red-200/50" disabled={isDeleting === course.id}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
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

      {/* Course Access Control & Hierarchical Mandate Settings Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 bg-gray-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white border text-gray-900 rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-5">
            <button 
              onClick={() => setSelectedCourse(null)} 
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-50 border hover:bg-gray-100 p-1.5 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#5E171B] block">Course Governance</span>
              <h2 className="text-xl font-bold tracking-tight text-gray-950 mt-1">Access Control & Mandate Settings</h2>
              <p className="text-xs text-gray-500 mt-1">Configure visibility, mandatory settings, and target scopes for <strong>{selectedCourse.title}</strong>.</p>
            </div>

            <div className="space-y-4">
              {profile?.role === 'super_admin' && (
                <label className="flex items-start space-x-3 text-sm font-semibold text-gray-800 cursor-pointer bg-gray-50 p-3 rounded-xl border border-gray-150">
                  <input 
                    type="checkbox" 
                    checked={modalIsGlobal}
                    onChange={(e) => {
                      setModalIsGlobal(e.target.checked);
                      if (e.target.checked) setModalTargetDept('all');
                    }}
                    className="rounded border-amber-400 text-amber-700 shadow-sm focus:ring-amber-500 bg-white h-4 w-4 mt-0.5"
                  />
                  <div>
                    <span>Make Globally Available</span>
                    <p className="text-[10px] text-gray-500 mt-0.5 font-normal">If checked, replicates this course modules across all academic departments immediately.</p>
                  </div>
                </label>
              )}

              <label className="flex items-start space-x-3 text-sm font-semibold text-gray-800 cursor-pointer bg-amber-50/40 p-3 rounded-xl border border-amber-200/50">
                <input 
                  type="checkbox" 
                  checked={modalIsMandatory}
                  onChange={(e) => setModalIsMandatory(e.target.checked)}
                  className="rounded border-amber-400 text-amber-700 shadow-sm focus:ring-amber-500 bg-white h-4 w-4 mt-0.5"
                />
                <div>
                  <span>Classroom Priority: Mandatory Course</span>
                  <p className="text-[10px] text-amber-800/80 mt-0.5 font-normal">If checked, forces the course into targets' curricula, overriding student choice restrictions.</p>
                </div>
              </label>

              {modalIsMandatory && (
                <div className="pl-4 border-l-2 border-amber-200 space-y-4 pt-1">
                  {/* Scope criteria */}
                  {['super_admin', 'dean'].includes(profile?.role || '') ? (
                    <div className="space-y-1">
                      <label className="text-xs text-gray-700 font-bold block mb-1">Target Department Scope</label>
                      <select 
                        value={modalTargetDept} 
                        onChange={e => setModalTargetDept(e.target.value)}
                        className="w-full bg-white border border-gray-200 text-gray-950 rounded-lg p-2 text-xs focus:outline-none focus:border-[#5E171B]/50"
                      >
                        <option value="all">All Departments ({modalIsGlobal ? 'Global' : 'Multiple departments'})</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.id}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="text-[11px] text-amber-800 font-medium bg-amber-100/40 p-2 rounded-lg border border-amber-200/50">
                      Target: <strong>Own Department Only</strong> (Strictly restricted per hierarchy)
                    </div>
                  )}

                  {/* Target Roles checkboxes */}
                  <div className="space-y-1.5">
                    <label className="text-xs text-gray-700 font-bold block mb-1">Target Roles</label>
                    <div className="flex flex-wrap gap-3">
                      {profile?.role === 'super_admin' && (
                        <>
                          <label className="flex items-center space-x-1.5 text-xs text-gray-700 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={modalTargetRoles.includes('student')}
                              onChange={(e) => setModalTargetRoles(e.target.checked ? [...modalTargetRoles, 'student'] : modalTargetRoles.filter(r => r !== 'student'))}
                              className="rounded border-gray-300 text-amber-700 h-3.5 w-3.5"
                            />
                            <span>Students</span>
                          </label>
                          <label className="flex items-center space-x-1.5 text-xs text-gray-700 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={modalTargetRoles.includes('faculty')}
                              onChange={(e) => setModalTargetRoles(e.target.checked ? [...modalTargetRoles, 'faculty'] : modalTargetRoles.filter(r => r !== 'faculty'))}
                              className="rounded border-gray-300 text-amber-700 h-3.5 w-3.5"
                            />
                            <span>Faculty</span>
                          </label>
                          <label className="flex items-center space-x-1.5 text-xs text-gray-700 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={modalTargetRoles.includes('dept_admin')}
                              onChange={(e) => setModalTargetRoles(e.target.checked ? [...modalTargetRoles, 'dept_admin'] : modalTargetRoles.filter(r => r !== 'dept_admin'))}
                              className="rounded border-gray-300 text-amber-700 h-3.5 w-3.5"
                            />
                            <span>Dept Admins</span>
                          </label>
                          <label className="flex items-center space-x-1.5 text-xs text-gray-700 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={modalTargetRoles.includes('dean')}
                              onChange={(e) => setModalTargetRoles(e.target.checked ? [...modalTargetRoles, 'dean'] : modalTargetRoles.filter(r => r !== 'dean'))}
                              className="rounded border-gray-300 text-amber-700 h-3.5 w-3.5"
                            />
                            <span>Deans</span>
                          </label>
                        </>
                      )}
                      {profile?.role === 'dean' && (
                        <>
                          <label className="flex items-center space-x-1.5 text-xs text-gray-700 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={modalTargetRoles.includes('student')}
                              onChange={(e) => setModalTargetRoles(e.target.checked ? [...modalTargetRoles, 'student'] : modalTargetRoles.filter(r => r !== 'student'))}
                              className="rounded border-gray-300 text-amber-700 h-3.5 w-3.5"
                            />
                            <span>Students</span>
                          </label>
                          <label className="flex items-center space-x-1.5 text-xs text-gray-700 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={modalTargetRoles.includes('faculty')}
                              onChange={(e) => setModalTargetRoles(e.target.checked ? [...modalTargetRoles, 'faculty'] : modalTargetRoles.filter(r => r !== 'faculty'))}
                              className="rounded border-gray-300 text-amber-700 h-3.5 w-3.5"
                            />
                            <span>Faculty</span>
                          </label>
                          <label className="flex items-center space-x-1.5 text-xs text-gray-700 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={modalTargetRoles.includes('dept_admin')}
                              onChange={(e) => setModalTargetRoles(e.target.checked ? [...modalTargetRoles, 'dept_admin'] : modalTargetRoles.filter(r => r !== 'dept_admin'))}
                              className="rounded border-gray-300 text-amber-700 h-3.5 w-3.5"
                            />
                            <span>Dept Admins</span>
                          </label>
                        </>
                      )}
                      {profile?.role === 'dept_admin' && (
                        <>
                          <label className="flex items-center space-x-1.5 text-xs text-gray-700 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={modalTargetRoles.includes('student')}
                              onChange={(e) => setModalTargetRoles(e.target.checked ? [...modalTargetRoles, 'student'] : modalTargetRoles.filter(r => r !== 'student'))}
                              className="rounded border-gray-300 text-amber-700 h-3.5 w-3.5"
                            />
                            <span>Students</span>
                          </label>
                          <label className="flex items-center space-x-1.5 text-xs text-gray-700 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={modalTargetRoles.includes('faculty')}
                              onChange={(e) => setModalTargetRoles(e.target.checked ? [...modalTargetRoles, 'faculty'] : modalTargetRoles.filter(r => r !== 'faculty'))}
                              className="rounded border-gray-300 text-amber-700 h-3.5 w-3.5"
                            />
                            <span>Faculty Members</span>
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t">
              <button 
                type="button" 
                onClick={() => setSelectedCourse(null)} 
                className="bg-gray-150 hover:bg-gray-200 text-gray-800 text-xs px-4 py-2 rounded-xl transition-colors font-semibold"
                disabled={isSavingSettings}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleSaveSettings} 
                className="bg-[#5E171B] hover:bg-[#4E1215] text-white text-xs px-5 py-2 rounded-xl transition-all font-semibold flex items-center"
                disabled={isSavingSettings}
              >
                {isSavingSettings ? 'Applying...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
