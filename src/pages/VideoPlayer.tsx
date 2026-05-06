import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, PlayCircle, FileText, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function VideoPlayer() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [progressMarked, setProgressMarked] = useState(false);

  useEffect(() => {
    const fetchLesson = async () => {
      if (!id) return;
      try {
        // Fetch lesson by course_id since the URL is /courses/:id
        const { data: lessonData, error } = await supabase
          .from('lessons')
          .select('*, courses(title, department_id, is_compiler_enabled)')
          .eq('course_id', id)
          .order('order_index', { ascending: true })
          .limit(1)
          .single();
          
        if (error && error.code !== 'PGRST116') throw error;
        
        if (lessonData) {
          setLesson(lessonData);
          // Track progress when started
          if (profile) trackProgress(lessonData.id, lessonData.course_id, 'started');
        }
        
      } catch (err) {
        console.error("Error fetching lesson:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLesson();
  }, [id, profile]);

  const trackProgress = async (lessonId: string, courseId: string, status: 'started' | 'completed') => {
    if (!profile) return;
    try {
      const { data: existing } = await supabase
        .from('student_progress')
        .select('*')
        .eq('student_id', profile.id)
        .eq('lesson_id', lessonId)
        .single();
        
      if (existing) {
        if (existing.status !== 'completed' && status === 'completed') {
          // Update to completed
          await supabase.from('student_progress')
            .update({ status: 'completed' })
            .eq('id', existing.id);
          setProgressMarked(true);
        } else if (existing.status === 'completed') {
          setProgressMarked(true);
        }
      } else {
        // Create new progress record
        await supabase.from('student_progress')
          .insert({
            student_id: profile.id,
            lesson_id: lessonId,
            course_id: courseId,
            status: status
          });
        if (status === 'completed') setProgressMarked(true);
      }
    } catch (err) {
      console.error("Error tracking progress", err);
    }
  };

  const markComplete = () => {
    if (lesson) trackProgress(lesson.id, lesson.course_id, 'completed');
  };

  if (loading) return <div className="flex h-screen items-center justify-center text-center bg-gray-50">Loading player...</div>;
  if (!lesson) return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-gray-50 h-64 rounded-xl border border-gray-300 mx-auto mt-10 max-w-2xl">
      <h2 className="text-xl font-bold mb-2">No Video Available</h2>
      <p className="text-gray-600 mb-6">This course is empty or the video is still processing.</p>
      <Link to="/courses" className="text-[#5E171B] font-semibold hover:underline">Return to Courses</Link>
    </div>
  );

  const isYouTube = lesson.content_type?.includes('youtube') || (lesson.cf_stream_id && lesson.cf_stream_id.length === 11) || lesson.external_url?.includes('youtube');
  const isPlaylist = lesson.content_type === 'youtube_playlist' || (isYouTube && lesson.cf_stream_id?.length > 11);
  
  const videoSrc = isYouTube 
    ? (isPlaylist ? `https://www.youtube.com/embed/videoseries?list=${lesson.cf_stream_id}&autoplay=0&rel=0` : `https://www.youtube.com/embed/${lesson.cf_stream_id}?autoplay=0&rel=0`)
    : `https://customer-xxx.cloudflarestream.com/${lesson.cf_stream_id}/iframe?poster=https%3A%2F%2Fcustomer-xxx.cloudflarestream.com%2F${lesson.cf_stream_id}%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600`;

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <Link to="/courses" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-[#5E171B] transition-colors">
           <ArrowLeft className="h-4 w-4 mr-2" /> Back to Courses
        </Link>
        {progressMarked ? (
          <span className="inline-flex items-center text-sm font-semibold text-green-600">
            <CheckCircle2 className="h-4 w-4 mr-1" /> Completed
          </span>
        ) : (
          <button 
            onClick={markComplete}
            className="text-sm font-medium bg-[#5E171B] hover:bg-[#450F13] text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Mark as Complete
          </button>
        )}
      </div>
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-gray-900">{lesson.title}</h1>
        <p className="text-gray-700 flex items-center font-medium">
           <span className="bg-white text-gray-900 px-2.5 py-1 rounded text-xs font-semibold mr-3">Lesson</span>
           {lesson.courses?.title || 'Unknown Course'}
        </p>
      </div>

      <div className="rounded-2xl overflow-hidden border border-gray-200 bg-black aspect-video relative shadow-none">
         <iframe
            src={videoSrc}
            style={{border: 'none', position: 'absolute', top: 0, left: 0, height: '100%', width: '100%'}}
            allow="accelerometer; gyroscope; autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen={true}
          ></iframe>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="md:col-span-2">
            <h3 className="text-lg font-bold mb-3 text-gray-900">About this lesson</h3>
            <p className="text-gray-700 leading-relaxed text-sm">
               {lesson.title} - Be sure to watch the entire lesson and view the resources out of external sources.
            </p>
         </div>
         <div>
            <Card className="bg-white border-gray-200 shadow-none rounded-2xl text-gray-900">
               <CardContent className="p-5">
                  <h4 className="font-semibold text-xs uppercase tracking-widest text-[#5E171B] mb-4">Resources</h4>
                  <ul className="space-y-4">
                     {lesson.external_url && (
                     <li>
                        <a href={lesson.external_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm font-medium text-gray-700 hover:text-[#5E171B] transition-colors">
                           <FileText className="h-4 w-4 mr-3 text-[#5E171B]" /> External Resource
                        </a>
                     </li>
                     )}
                     {lesson.courses?.is_compiler_enabled && (
                     <li>
                        <Link to="/compiler" className="flex items-center text-sm font-medium text-gray-700 hover:text-[#5E171B] transition-colors">
                           <PlayCircle className="h-4 w-4 mr-3 text-[#5E171B]" /> Practice Workspace
                        </Link>
                     </li>
                     )}
                  </ul>
               </CardContent>
            </Card>
         </div>
      </div>
    </div>
  );
}
