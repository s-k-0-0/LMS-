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
        const { data, error } = await supabase
          .from('lessons')
          .select('*, courses(title, department_id)')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        setLesson(data);
        
        // Track progress when started
        if (profile) trackProgress(data.id, data.course_id, 'started');
        
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

  if (loading) return <div className="p-8 text-center bg-[#D9D9D9]">Loading player...</div>;
  if (!lesson) return <div className="p-8 text-center bg-[#D9D9D9]">Lesson not found</div>;

  const isYouTube = lesson.content_type?.includes('youtube') || (lesson.cf_stream_id && lesson.cf_stream_id.length === 11) || lesson.external_url?.includes('youtube');
  const isPlaylist = lesson.content_type === 'youtube_playlist' || (isYouTube && lesson.cf_stream_id?.length > 11);
  
  const videoSrc = isYouTube 
    ? (isPlaylist ? `https://www.youtube.com/embed/videoseries?list=${lesson.cf_stream_id}&autoplay=0&rel=0` : `https://www.youtube.com/embed/${lesson.cf_stream_id}?autoplay=0&rel=0`)
    : `https://customer-xxx.cloudflarestream.com/${lesson.cf_stream_id}/iframe?poster=https%3A%2F%2Fcustomer-xxx.cloudflarestream.com%2F${lesson.cf_stream_id}%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600`;

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <Link to="/courses" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-[#F05A28] transition-colors">
           <ArrowLeft className="h-4 w-4 mr-2" /> Back to Courses
        </Link>
        {progressMarked ? (
          <span className="inline-flex items-center text-sm font-semibold text-green-600">
            <CheckCircle2 className="h-4 w-4 mr-1" /> Completed
          </span>
        ) : (
          <button 
            onClick={markComplete}
            className="text-sm font-medium bg-[#F05A28] hover:bg-[#de4c1a] text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Mark as Complete
          </button>
        )}
      </div>
      
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-gray-900">{lesson.title}</h1>
        <p className="text-gray-700 flex items-center font-medium">
           <span className="bg-[#5A1A1A] text-white px-2.5 py-1 rounded text-xs font-semibold mr-3">Lesson</span>
           {lesson.courses?.title || 'Unknown Course'}
        </p>
      </div>

      <div className="rounded-2xl overflow-hidden border border-[#4A1414] bg-black aspect-video relative shadow-none">
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
            <Card className="bg-[#5A1A1A] border-[#4A1414] shadow-none rounded-2xl text-white">
               <CardContent className="p-5">
                  <h4 className="font-semibold text-xs uppercase tracking-widest text-[#F05A28] mb-4">Resources</h4>
                  <ul className="space-y-4">
                     {lesson.external_url && (
                     <li>
                        <a href={lesson.external_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm font-medium text-gray-200 hover:text-[#F05A28] transition-colors">
                           <FileText className="h-4 w-4 mr-3 text-[#F05A28]" /> External Resource
                        </a>
                     </li>
                     )}
                     <li>
                        <Link to="/compiler" className="flex items-center text-sm font-medium text-gray-200 hover:text-[#F05A28] transition-colors">
                           <PlayCircle className="h-4 w-4 mr-3 text-[#F05A28]" /> Practice Workspace
                        </Link>
                     </li>
                  </ul>
               </CardContent>
            </Card>
         </div>
      </div>
    </div>
  );
}
