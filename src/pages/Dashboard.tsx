import { useAuth } from '../hooks/useAuth';
import { Card, CardContent } from '../components/ui/card';
import { StreakWidget } from '../components/widgets/StreakWidget';
import { BookOpen, Clock, PlayCircle, Youtube, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const { profile } = useAuth();
  const [youtubeVideos, setYoutubeVideos] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  
  // Mock data for preview
  const recentCourses = [
    { id: 1, title: 'Data Structures in C++', progress: 45, thumbnail: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=300&h=150&auto=format&fit=crop' },
    { id: 2, title: 'Vedic Mathematics Basics', progress: 12, thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=300&h=150&auto=format&fit=crop' },
  ];

  useEffect(() => {
    const fetchYouTubeVideos = async () => {
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
      if (!apiKey) return;
      
      try {
        // Querying educational programming content
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&q=programming+data+structures+educational&type=video&key=${apiKey}`);
        if (response.ok) {
          const data = await response.json();
          setYoutubeVideos(data.items || []);
        }
      } catch (err) {
        console.error("Failed to fetch YouTube videos", err);
      }
    };
    
    fetchYouTubeVideos();
  }, []);

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        const { data, error } = await supabase
          .from('lessons')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3);

        if (error) throw error;
        setLessons(data || []);
      } catch (err) {
        console.error("Failed to fetch lessons", err);
      }
    };
    
    fetchLessons();
  }, []);

  const getYoutubeThumbnailUrl = (id: string) => {
    return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <header className="flex justify-between items-center mb-2">
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-rose-50 m-0">Welcome back, {profile?.email?.split('@')[0] || 'Rahul Sharma'}</h1>
          <p className="text-sm text-rose-400 mt-1 m-0">B.Sc. Yoga Therapy • Semester IV</p>
        </div>
        <div className="flex flex-wrap items-center gap-5 justify-end">
          <StreakWidget streak={profile?.streak_count || 12} />
          <div className="w-10 h-10 rounded-full bg-pink-500 flex items-center justify-center font-bold text-rose-950 border-2 border-rose-800 shrink-0">
             {profile?.email?.charAt(0).toUpperCase() || 'R'}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="bg-rose-900 border-rose-800 text-rose-100 rounded-2xl p-5 shadow-none overflow-hidden flex flex-col gap-4 !py-5">
          <div className="flex flex-row items-center justify-between">
            <span className="text-sm font-semibold text-rose-400">ACTIVE COURSES</span>
            <BookOpen className="h-4 w-4 text-pink-500" />
          </div>
          <div>
            <div className="text-3xl font-bold">4</div>
            <p className="text-xs text-pink-400 mt-1 flex items-center font-medium">
               +1 this week
            </p>
          </div>
        </Card>
        
        <Card className="bg-rose-900 border-rose-800 text-rose-100 rounded-2xl p-5 shadow-none overflow-hidden flex flex-col gap-4 !py-5">
          <div className="flex flex-row items-center justify-between">
            <span className="text-sm font-semibold text-rose-400">CODE EXECUTIONS</span>
            <TerminalIcon className="h-4 w-4 text-pink-500" />
          </div>
          <div>
            <div className="text-3xl font-bold font-mono">142</div>
            <p className="text-xs text-rose-400 mt-1">In the last 30 days</p>
          </div>
        </Card>
        
        <Card className="bg-rose-900 border-rose-800 text-rose-100 rounded-2xl p-5 shadow-none overflow-hidden flex flex-col gap-4 !py-5 relative group">
          <div className="flex flex-row items-center justify-between relative z-10">
            <span className="text-sm font-semibold text-pink-500">NEXT APTITUDE TEST</span>
            <Clock className="h-4 w-4 text-pink-500" />
          </div>
          <div className="relative z-10 border-l-4 border-pink-500 pl-3 bg-rose-950/50 py-2 rounded-r-md">
            <div className="text-sm font-medium mb-1">Quantitative Reasoning</div>
            <Link to="/aptitude" className="text-xs text-pink-400 hover:text-pink-300 flex items-center font-semibold">
               Start Assessment <PlayCircle className="h-3 w-3 ml-1" />
            </Link>
          </div>
        </Card>
      </div>

      <div className="mt-2">
        <h2 className="text-sm font-semibold mb-4 text-rose-400 uppercase tracking-widest">Continue Learning</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
           {recentCourses.map(course => (
             <Card key={course.id} className="bg-rose-900 border-rose-800 text-rose-100 overflow-hidden rounded-2xl hover:border-pink-500/50 transition-colors cursor-pointer !p-0 shadow-none">
                <div className="h-32 overflow-hidden w-full relative">
                   <img src={course.thumbnail} alt={course.title} className="object-cover w-full h-full opacity-70 group-hover:opacity-100 transition-opacity" />
                   <div className="absolute top-3 left-3 bg-rose-950/80 px-2 py-1 rounded text-[10px] font-semibold tracking-wider text-pink-400 uppercase backdrop-blur-sm border border-rose-800">Course</div>
                </div>
                <div className="p-5 flex flex-col gap-4">
                   <h3 className="font-semibold text-sm leading-snug text-rose-200">{course.title}</h3>
                   <div>
                      <div className="flex justify-between text-xs text-rose-400 mb-2 font-medium">
                        <span>Progress</span>
                        <span className="text-pink-400">{course.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-rose-800 rounded-full overflow-hidden">
                        <div className="h-full bg-pink-500" style={{ width: `${course.progress}%` }} />
                      </div>
                   </div>
                </div>
             </Card>
           ))}
        </div>
      </div>

      {lessons.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold mb-4 text-rose-400 uppercase tracking-widest flex items-center">
            <Video className="h-4 w-4 mr-2" />
            Recently Added Lessons
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {lessons.map(lesson => (
              <Card key={lesson.id} className="bg-rose-900 border-rose-800 text-rose-100 overflow-hidden rounded-2xl hover:border-pink-500/50 transition-colors cursor-pointer !p-0 shadow-none h-full flex flex-col">
                <div className="aspect-video w-full relative overflow-hidden bg-rose-950 flex items-center justify-center">
                  {lesson.content_type.startsWith('youtube') ? (
                    <img src={getYoutubeThumbnailUrl(lesson.cf_stream_id)} alt={lesson.title} className="object-cover w-full h-full" />
                  ) : (
                    <Video className="h-10 w-10 text-rose-800" />
                  )}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <PlayCircle className="h-12 w-12 text-pink-500" />
                  </div>
                </div>
                <div className="p-4 flex-1">
                  <h3 className="font-semibold text-sm leading-snug text-rose-200 line-clamp-2">{lesson.title}</h3>
                  <p className="text-xs text-rose-400 mt-2">{lesson.content_type === 'youtube_playlist' ? 'Playlist' : 'Video'}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {youtubeVideos.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold mb-4 text-rose-400 uppercase tracking-widest flex items-center">
            <Youtube className="h-4 w-4 mr-2" />
            Recommended from YouTube
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {youtubeVideos.map(video => (
              <a key={video.id.videoId} href={`https://www.youtube.com/watch?v=${video.id.videoId}`} target="_blank" rel="noopener noreferrer">
                <Card className="bg-rose-900 border-rose-800 text-rose-100 overflow-hidden rounded-2xl hover:border-pink-500/50 transition-colors cursor-pointer !p-0 shadow-none h-full flex flex-col">
                  <div className="aspect-video w-full relative overflow-hidden">
                    <img src={video.snippet.thumbnails.medium.url} alt={video.snippet.title} className="object-cover w-full h-full" />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <PlayCircle className="h-12 w-12 text-pink-500" />
                    </div>
                  </div>
                  <div className="p-4 flex-1">
                    <h3 className="font-semibold text-sm leading-snug text-rose-200 line-clamp-2" dangerouslySetInnerHTML={{ __html: video.snippet.title }} />
                    <p className="text-xs text-rose-400 mt-2">{video.snippet.channelTitle}</p>
                  </div>
                </Card>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TerminalIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  )
}
