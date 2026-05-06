import { useAuth } from '../hooks/useAuth';
import { Card } from '../components/ui/card';
import { StreakWidget } from '../components/widgets/StreakWidget';
import { BookOpen, Clock, PlayCircle, Youtube, Video } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const { profile } = useAuth();
  const [youtubeVideos, setYoutubeVideos] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);

  const recentCourses = [
    {
      id: 1,
      title: 'Data Structures in C++',
      progress: 45,
      thumbnail:
        'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=300&h=150&auto=format&fit=crop',
    },
    {
      id: 2,
      title: 'Vedic Mathematics Basics',
      progress: 12,
      thumbnail:
        'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?q=80&w=300&h=150&auto=format&fit=crop',
    },
  ];

  useEffect(() => {
    const fetchYouTubeVideos = async () => {
      const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
      if (!apiKey) return;

      try {
        const response = await fetch(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&q=programming+data+structures+educational&type=video&key=${apiKey}`
        );

        if (response.ok) {
          const data = await response.json();
          setYoutubeVideos(data.items || []);
        }
      } catch (err) {
        console.error('Failed to fetch YouTube videos', err);
      }
    };

    fetchYouTubeVideos();
  }, []);

  useEffect(() => {
    const fetchLessons = async () => {
      try {
        let query = supabase
          .from('lessons')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(3);

        if (profile?.role === 'student') {
          query = query.eq('status', 'published');
        }

        const { data, error } = await query;

        if (error) throw error;
        setLessons(data || []);
      } catch (err) {
        console.error('Failed to fetch lessons', err);
      }
    };

    if (profile) {
      fetchLessons();
    }
  }, [profile]);

  const getYoutubeThumbnailUrl = (id: string) => {
    return `https://img.youtube.com/vi/${id}/mqdefault.jpg`;
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 bg-[#FEFEFE] font-['Inter']">
      <header className="flex justify-between items-center mb-2">
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-[#0B0C0C] m-0 font-['Poppins']">
            Welcome back,{' '}
            {profile?.name ||
              profile?.email?.split('@')[0] ||
              'Student'}
          </h1>

          <p className="text-sm text-[#696667] mt-1 m-0">
            {profile?.departments?.name || 'Department not assigned'} •{' '}
            {profile?.role
              ?.replace('_', ' ')
              .replace(/\b\w/g, (l) => l.toUpperCase())}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-5 justify-end">
          <StreakWidget streak={profile?.streak_count || 12} />

          <div className="w-10 h-10 rounded-full bg-[#DDA251] flex items-center justify-center font-bold text-[#FEFEFE] border-2 border-[#293981] shrink-0">
            {profile?.email?.charAt(0).toUpperCase() || 'R'}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="bg-[#293981] border-[#747D9C] text-[#FEFEFE] rounded-2xl p-5 shadow-none overflow-hidden flex flex-col gap-4 !py-5">
          <div className="flex flex-row items-center justify-between">
            <span className="text-sm font-semibold text-[#EDE8E6]">
              ACTIVE COURSES
            </span>

            <BookOpen className="h-4 w-4 text-[#DDA251]" />
          </div>

          <div>
            <div className="text-3xl font-bold font-['Poppins']">4</div>

            <p className="text-xs text-[#DDA251] mt-1 flex items-center font-medium">
              +1 this week
            </p>
          </div>
        </Card>

        <Card className="bg-[#293981] border-[#747D9C] text-[#FEFEFE] rounded-2xl p-5 shadow-none overflow-hidden flex flex-col gap-4 !py-5">
          <div className="flex flex-row items-center justify-between">
            <span className="text-sm font-semibold text-[#EDE8E6]">
              CODE EXECUTIONS
            </span>

            <TerminalIcon className="h-4 w-4 text-[#DDA251]" />
          </div>

          <div>
            <div className="text-3xl font-bold font-mono">142</div>

            <p className="text-xs text-[#EDE8E6] mt-1">
              In the last 30 days
            </p>
          </div>
        </Card>

        <Card className="bg-[#293981] border-[#747D9C] text-[#FEFEFE] rounded-2xl p-5 shadow-none overflow-hidden flex flex-col gap-4 !py-5 relative group">
          <div className="flex flex-row items-center justify-between relative z-10">
            <span className="text-sm font-semibold text-[#DDA251]">
              NEXT APTITUDE TEST
            </span>

            <Clock className="h-4 w-4 text-[#DDA251]" />
          </div>

          <div className="relative z-10 border-l-4 border-[#DDA251] pl-3 bg-[#212224]/40 py-2 rounded-r-md">
            <div className="text-sm font-medium mb-1">
              Quantitative Reasoning
            </div>

            <Link
              to="/aptitude"
              className="text-xs text-[#DDA251] hover:text-[#E8D3AF] flex items-center font-semibold"
            >
              Start Assessment{' '}
              <PlayCircle className="h-3 w-3 ml-1" />
            </Link>
          </div>
        </Card>
      </div>

      <div className="mt-2">
        <h2 className="text-sm font-semibold mb-4 text-[#696667] uppercase tracking-widest font-['Poppins']">
          Continue Learning
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {recentCourses.map((course) => (
            <Card
              key={course.id}
              className="bg-[#FCF9EB] border-[#E8D3AF] text-[#0B0C0C] overflow-hidden rounded-2xl hover:border-[#DDA251] transition-colors cursor-pointer !p-0 shadow-none"
            >
              <div className="h-32 overflow-hidden w-full relative">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="object-cover w-full h-full opacity-70 group-hover:opacity-100 transition-opacity"
                />

                <div className="absolute top-3 left-3 bg-[#293981]/90 px-2 py-1 rounded text-[10px] font-semibold tracking-wider text-[#FEFEFE] uppercase backdrop-blur-sm border border-[#747D9C]">
                  Course
                </div>
              </div>

              <div className="p-5 flex flex-col gap-4">
                <h3 className="font-semibold text-sm leading-snug text-[#212224] font-['Poppins']">
                  {course.title}
                </h3>

                <div>
                  <div className="flex justify-between text-xs text-[#696667] mb-2 font-medium">
                    <span>Progress</span>

                    <span className="text-[#DDA251]">
                      {course.progress}%
                    </span>
                  </div>

                  <div className="h-1.5 w-full bg-[#EDE8E6] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#DDA251]"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {lessons.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold mb-4 text-[#696667] uppercase tracking-widest flex items-center font-['Poppins']">
            <Video className="h-4 w-4 mr-2" />
            Recently Added Lessons
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {lessons.map((lesson) => (
              <Card
                key={lesson.id}
                className="bg-[#FCF9EB] border-[#E8D3AF] text-[#0B0C0C] overflow-hidden rounded-2xl hover:border-[#DDA251] transition-colors cursor-pointer !p-0 shadow-none h-full flex flex-col"
              >
                <div className="aspect-video w-full relative overflow-hidden bg-[#EDE8E6] flex items-center justify-center">
                  {lesson.content_type.startsWith('youtube') ? (
                    <img
                      src={getYoutubeThumbnailUrl(lesson.cf_stream_id)}
                      alt={lesson.title}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <Video className="h-10 w-10 text-[#424043]" />
                  )}

                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <PlayCircle className="h-12 w-12 text-[#DDA251]" />
                  </div>
                </div>

                <div className="p-4 flex-1">
                  <h3 className="font-semibold text-sm leading-snug text-[#212224] line-clamp-2 font-['Poppins']">
                    {lesson.title}
                  </h3>

                  <p className="text-xs text-[#696667] mt-2">
                    {lesson.content_type === 'youtube_playlist'
                      ? 'Playlist'
                      : 'Video'}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {youtubeVideos.length > 0 && (
        <div className="mt-6">
          <h2 className="text-sm font-semibold mb-4 text-[#696667] uppercase tracking-widest flex items-center font-['Poppins']">
            <Youtube className="h-4 w-4 mr-2" />
            Recommended from YouTube
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {youtubeVideos.map((video) => (
              <a
                key={video.id.videoId}
                href={`https://www.youtube.com/watch?v=${video.id.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Card className="bg-[#FCF9EB] border-[#E8D3AF] text-[#0B0C0C] overflow-hidden rounded-2xl hover:border-[#DDA251] transition-colors cursor-pointer !p-0 shadow-none h-full flex flex-col">
                  <div className="aspect-video w-full relative overflow-hidden">
                    <img
                      src={video.snippet.thumbnails.medium.url}
                      alt={video.snippet.title}
                      className="object-cover w-full h-full"
                    />

                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <PlayCircle className="h-12 w-12 text-[#DDA251]" />
                    </div>
                  </div>

                  <div className="p-4 flex-1">
                    <h3
                      className="font-semibold text-sm leading-snug text-[#212224] line-clamp-2 font-['Poppins']"
                      dangerouslySetInnerHTML={{
                        __html: video.snippet.title,
                      }}
                    />

                    <p className="text-xs text-[#696667] mt-2">
                      {video.snippet.channelTitle}
                    </p>
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
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" x2="20" y1="19" y2="19" />
    </svg>
  );
}
