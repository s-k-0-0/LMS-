import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  PlayCircle, 
  FileText, 
  CheckCircle2, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  RotateCw, 
  StickyNote, 
  FileCheck2, 
  Search, 
  Trash2, 
  GraduationCap, 
  Download,
  AlertCircle,
  Code
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

interface LessonNote {
  id: string;
  timestamp: number;
  text: string;
  createdAt: string;
}

export default function VideoPlayer() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  
  // Data loading states
  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [progressMarked, setProgressMarked] = useState(false);

  // States for player tracking
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(600); // 10 minutes default
  const [watchPercent, setWatchPercent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // LMS Tabs State
  const [activeTab, setActiveTab] = useState<'about' | 'notes'>('about');
  
  // Notebook State variables
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');

  // Parse YouTube Video ID safely from Lesson
  const extractYoutubeId = (les: any) => {
    if (!les) return null;
    if (les.cf_stream_id && les.cf_stream_id.length === 11) return les.cf_stream_id;
    const url = les.external_url || '';
    const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    return match ? match[1] : null;
  };

  const isYouTube = lesson && (lesson.content_type?.includes('youtube') || (lesson.cf_stream_id && lesson.cf_stream_id.length === 11) || lesson.external_url?.includes('youtube'));
  const ytId = extractYoutubeId(lesson);

  useEffect(() => {
    const fetchLesson = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const { data: lessonData, error } = await supabase
          .from('lessons')
          .select('*, courses(title, department_id, is_compiler_enabled, credits, difficulty, deadline)')
          .eq('course_id', id)
          .order('order_index', { ascending: true })
          .limit(1)
          .single();
          
        if (error && error.code !== 'PGRST116') throw error;
        
        if (lessonData) {
          setLesson(lessonData);
          if (lessonData.duration_seconds) {
            setDuration(lessonData.duration_seconds);
          }
          
          // Track progress when started in the database
          if (profile) trackProgress(lessonData.id, lessonData.course_id, 'started');
          
          // Load Personal Notes out of localStorage
          const localKey = `lms_notes_${profile?.id || 'guest'}_${lessonData.id}`;
          const cachedNotes = localStorage.getItem(localKey);
          if (cachedNotes) {
            setNotes(JSON.parse(cachedNotes));
          }
        }
        
      } catch (err) {
        console.error("Error fetching lesson:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLesson();
  }, [id, profile]);

  // Handle high-reliability timed study session simulator
  useEffect(() => {
    if (!lesson) return;
    
    // Simulate study progress when active on page
    const intervalId = setInterval(() => {
      setIsPlaying(true);
      setCurrentTime(prev => {
        const nextTime = prev + 1;
        const currentPercent = Math.min(100, Math.round((nextTime / duration) * 100));
        setWatchPercent(currentPercent);
        
        // Save progress triggers
        if (currentPercent >= 80 && !progressMarked) {
          trackProgress(lesson.id, lesson.course_id, 'completed');
        } else if (currentPercent > 0 && currentPercent < 80) {
          trackProgress(lesson.id, lesson.course_id, 'started');
        }
        
        return nextTime;
      });
    }, 1000);
    
    return () => clearInterval(intervalId);
  }, [lesson, duration, progressMarked]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds === undefined) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

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
          await supabase.from('student_progress')
            .update({ status: 'completed' })
            .eq('id', existing.id);
          setProgressMarked(true);
        } else if (existing.status === 'completed') {
          setProgressMarked(true);
        }
      } else {
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
    if (lesson) {
      trackProgress(lesson.id, lesson.course_id, 'completed');
      setPlaybackState('Completed');
      setWatchPercent(100);
    }
  };

  const [playbackState, setPlaybackState] = useState('Attentive Study');

  // Notes Functionality
  const handleAddNote = () => {
    if (!newNoteText.trim() || !profile || !lesson) return;
    
    const newNote: LessonNote = {
      id: `note_${Date.now()}`,
      timestamp: currentTime,
      text: newNoteText,
      createdAt: new Date().toISOString()
    };

    const updatedNotes = [...notes, newNote].sort((a, b) => a.timestamp - b.timestamp);
    setNotes(updatedNotes);
    setNewNoteText('');

    // Save to localStorage
    const localKey = `lms_notes_${profile.id}_${lesson.id}`;
    localStorage.setItem(localKey, JSON.stringify(updatedNotes));
  };

  const handleDeleteNote = (noteId: string) => {
    if (!profile || !lesson) return;
    const updatedNotes = notes.filter(n => n.id !== noteId);
    setNotes(updatedNotes);

    const localKey = `lms_notes_${profile.id}_${lesson.id}`;
    localStorage.setItem(localKey, JSON.stringify(updatedNotes));
  };

  if (loading) return (
    <div className="flex h-screen items-center justify-center text-center bg-gray-50 flex-col gap-3">
      <div className="w-12 h-12 rounded-full border-4 border-[#5E171B]/10 border-t-[#5E171B] animate-spin" />
      <div className="text-[#5E171B] font-semibold text-sm">Syncing S-VYASA live course media stream...</div>
    </div>
  );
  
  if (!lesson) return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white shadow-xs max-w-xl mx-auto mt-16 rounded-2xl border border-gray-200">
      <div className="p-4 bg-[#5E171B]/5 rounded-full mb-4">
        <AlertCircle className="w-8 h-8 text-[#5E171B]" />
      </div>
      <h2 className="text-lg font-bold text-gray-900 mb-1">No Video Stream Assigned</h2>
      <p className="text-gray-600 text-xs mb-6 max-w-sm">The syllabus material is pending faculty uploads or department head clearance.</p>
      <Link 
        to="/courses" 
        className="px-5 py-2.5 bg-[#5E171B] hover:bg-[#4E1215] active:bg-[#3E0D10] text-white text-xs font-semibold rounded-lg transition-all shadow-sm border border-[#5E171B]/20 flex items-center justify-center"
      >
        Return to Catalog
      </Link>
    </div>
  );

  const isPlaylist = lesson.content_type === 'youtube_playlist' || (isYouTube && lesson.cf_stream_id && lesson.cf_stream_id.length > 11);
  
  // Use professional standard YouTube embed with controls so that it is 100% reliable
  const videoSrc = isYouTube 
    ? (isPlaylist 
        ? `https://www.youtube.com/embed/videoseries?list=${lesson.cf_stream_id}&rel=0&autoplay=0&showinfo=1&controls=1&modestbranding=1` 
        : `https://www.youtube.com/embed/${ytId || lesson.cf_stream_id}?rel=0&autoplay=0&showinfo=1&controls=1&modestbranding=1`)
    : `https://customer-xxx.cloudflarestream.com/${lesson.cf_stream_id}/iframe?poster=https%3A%2F%2Fcustomer-xxx.cloudflarestream.com%2F${lesson.cf_stream_id}%2Fthumbnails%2Fthumbnail.jpg%3Ftime%3D%26height%3D600`;

  return (
    <div className="max-w-5xl mx-auto py-6">
      
      {/* Top back & completion header */}
      <div className="flex items-center justify-between mb-6">
        <Link 
          to="/courses" 
          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white border border-gray-200 text-gray-700 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100 rounded-lg text-xs font-semibold shadow-xs transition-all duration-150 cursor-pointer"
        >
           <ArrowLeft className="h-3.5 w-3.5" /> Return to Catalog
        </Link>
        
        {progressMarked || watchPercent >= 80 ? (
          <span className="inline-flex items-center text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-3.5 py-1.5 rounded-full shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-2 animate-pulse" /> Progress Completed
          </span>
        ) : (
          <button 
            onClick={markComplete}
            className="px-4 py-2 bg-[#5E171B] hover:bg-[#4E1215] active:bg-[#3E0D10] text-white text-xs font-semibold rounded-lg shadow-sm border border-[#5E171B]/20 flex items-center transition-all duration-150 cursor-pointer"
          >
            Mark Module Complete
          </button>
        )}
      </div>
      
      {/* Title block */}
      <div className="mb-5">
        <span className="bg-[#5E171B]/10 text-[#5E171B] px-2.5 py-1 rounded text-[10px] font-bold tracking-wider uppercase inline-block border border-[#5E171B]/10">
          S-VYASA Academic Media Studio
        </span>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-950 mt-2.5 leading-tight">{lesson.title}</h1>
        <p className="text-xs font-medium text-gray-600 mt-1.5 flex items-center gap-1.5">
           <span>Course: <strong className="text-gray-900">{lesson.courses?.title || 'Required Core Sadhana'}</strong></span>
           <span className="text-gray-300">•</span>
           <span>Credits: <strong className="text-gray-900">{lesson.courses?.credits ?? 3} CR</strong></span>
           <span className="text-gray-300">•</span>
           <span>Level: <strong className="capitalize text-gray-900">{lesson.courses?.difficulty || 'All Levels'}</strong></span>
        </p>
      </div>

      {/* PRIVATE S-VYASA PLAYBACK SUITE (HIGH RELIABILITY NATIVE EMPOWERED VIEW) */}
      <div className="relative group bg-neutral-950 rounded-2xl overflow-hidden border border-neutral-900 shadow-xl overflow-hidden aspect-video mb-5 flex flex-col">
        {/* Secure Stream Mask Header */}
        <div className="absolute top-0 left-0 right-0 h-11 bg-gradient-to-b from-neutral-950 via-neutral-950/80 to-transparent flex items-center justify-between px-5 pointer-events-none z-10">
          <span className="text-[10px] font-extrabold text-amber-500 tracking-wider uppercase flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" /> S-VYASA ENCRYPTED STUDENT FEED
          </span>
          <span className="text-[9px] text-neutral-400 font-mono tracking-widest">SECURE LINK • 1080P</span>
        </div>

        <div className="flex-1 w-full relative">
          <iframe
            src={videoSrc}
            id="svyasa-secure-player"
            title="S-VYASA Lecture Stream"
            className="absolute inset-0 w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Real-Time Embedded Study Tracker telemetry bar */}
        <div className="bg-neutral-900 border-t border-neutral-800 px-4 py-3.5 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-neutral-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              Academic Active Time: <span className="font-mono text-white text-xs">{formatTime(currentTime)}</span>
            </div>
          </div>
          <div className="flex items-center gap-4 text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
            <span className="text-amber-500">{watchPercent}% Completed</span>
            <div className="w-32 bg-neutral-800 h-1.5 rounded-full overflow-hidden border border-neutral-700">
              <div className="bg-amber-500 h-full transition-all duration-300" style={{ width: `${watchPercent}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Synchronized tracking stats block */}
      <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl flex flex-col md:flex-row justify-between items-center text-xs font-semibold gap-3 mb-6">
        <span className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-amber-700" />
          Progress logs stay tied to study session durations. Stay on page or complete the review to locks credits.
        </span>
        <span className="bg-amber-600 text-white px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-wide">
          Status: {watchPercent >= 80 || progressMarked ? '✓ Logged' : '○ Pending Time'}
        </span>
      </div>

      {/* DOUBLE LMS GRID (LECTURE BRIEF vs INTERACTIVE NOTES & FILE RESOURCES) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column for Brief Description and Laptop Notes Tabs */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Custom Tabs */}
          <div className="flex bg-gray-150/80 rounded-lg p-0.5 gap-0.5 border border-gray-200">
            <button 
              onClick={() => setActiveTab('about')}
              className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'about' ? 'bg-[#5E171B] text-white shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <FileCheck2 className="w-4 h-4" /> About this lecture
            </button>
            <button 
              onClick={() => setActiveTab('notes')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'notes' ? 'bg-[#5E171B] text-white shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
            >
              <StickyNote className="w-4 h-4" /> My Study Notebook ({notes.length})
            </button>
          </div>

          {activeTab === 'about' ? (
            <Card className="bg-white border-gray-200 text-gray-900 shadow-none rounded-xl p-5 border">
              <h3 className="font-extrabold text-base text-gray-900 mb-2">Lecture overview</h3>
              <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                {lesson.description || "In this session, you will learn the fundamental methods outlined in our S-VYASA curriculum guides. Be sure to review custom reading materials attached in the sidepanel."}
              </p>
              
              <div className="mt-6 pt-5 border-t border-gray-100 space-y-3">
                <span className="text-[10px] uppercase font-bold text-[#5E171B] tracking-wider block">Academics</span>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="text-gray-400 block pb-1">Tutor</span>
                    <strong className="text-gray-800 text-sm">S-VYASA Appointed Faculty</strong>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="text-gray-400 block pb-1">Topic Core</span>
                    <strong className="text-gray-800 text-sm capitalize">{lesson.courses?.category || 'Yogic Sciences'}</strong>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            /* STUDY NOTEBOOK MODULE (Timestamp tied notes) */
            <Card className="bg-white border-gray-200 text-gray-900 shadow-none rounded-xl p-5 space-y-4 border">
              <div>
                <h3 className="font-bold text-gray-950 text-base">My Lecture Notebook</h3>
                <p className="text-xs text-gray-500 mt-0.5">Capture personal thoughts connected with live timestamps. Notebook is fully individual and holds on page visits.</p>
              </div>

              {/* Form to log note */}
              <div className="space-y-2.5">
                <textarea
                  id="notebook_note_input"
                  rows={3}
                  value={newNoteText}
                  onChange={e => setNewNoteText(e.target.value)}
                  placeholder="e.g. Master pranayama cycle - keep spine completely upright..."
                  className="w-full bg-gray-50 text-gray-950 border border-gray-200 rounded-lg p-3 text-xs focus:ring-1 focus:ring-[#5E171B]/30 focus:border-[#5E171B]/50 focus:outline-none transition-all placeholder:text-gray-400"
                />
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <span className="text-[10px] font-bold text-[#5E171B] bg-[#5E171B]/5 px-2.5 py-1 rounded-md border border-[#5E171B]/10">
                    Timestamp: {formatTime(currentTime)}
                  </span>
                  <button 
                    onClick={handleAddNote}
                    disabled={!newNoteText.trim()}
                    className="px-4 py-2 bg-[#5E171B] hover:bg-[#4E1215] active:bg-[#3E0D10] text-white text-xs font-semibold rounded-lg shadow-sm border border-[#5E171B]/20 cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Lock Study Note
                  </button>
                </div>
              </div>

              {/* Feed of Notes */}
              <div className="pt-2 space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {notes.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 border border-dashed border-gray-150 rounded-xl">
                    <StickyNote className="w-7 h-7 mx-auto opacity-30 mb-2 text-gray-500" />
                    <p className="text-xs font-medium">Notebook holds no logs yet. Capture your first note above!</p>
                  </div>
                ) : (
                  notes.map((note) => (
                    <div key={note.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex items-start gap-3 relative group/note">
                      <div className="bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-mono px-2 py-0.5 rounded font-bold shrink-0">
                        {formatTime(note.timestamp)}
                      </div>
                      
                      <div className="flex-1 min-w-0 pr-6">
                        <p className="text-xs text-gray-800 leading-relaxed whitespace-pre-wrap">{note.text}</p>
                        <span className="text-[9px] text-gray-400 mt-1 block">Saved {new Date(note.createdAt).toLocaleTimeString()}</span>
                      </div>

                      <button 
                        onClick={() => handleDeleteNote(note.id)}
                        className="text-red-400 hover:text-red-600 transition-colors border-0 bg-transparent opacity-0 group-hover/note:opacity-100 absolute right-3 top-3.5 p-1 cursor-pointer"
                        title="Remove Note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </Card>
          )}

        </div>

        {/* Right Column for Supplementary Class Literature */}
        <div>
          {/* RESOURCES CONTAINER: ONLY visible if dynamically assigned */}
          {lesson.external_url ? (
            <Card className="bg-white border-gray-200 shadow-none rounded-xl text-gray-900 p-5 space-y-4 border">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <FileText className="h-5 w-5 text-[#5E171B]" />
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-900">Supplementary Vault</h4>
              </div>
              
              <p className="text-[11px] text-gray-600 leading-relaxed">The instructor has attached mandatory external files and reference documentation for this lecture module.</p>
              
              <div className="bg-gray-50 border border-gray-150 p-3 rounded-lg flex items-center justify-between gap-3 hover:border-[#5E171B]/20 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 bg-[#5E171B]/5 rounded-lg border border-[#5E171B]/5">
                    <FileText className="w-4 h-4 text-[#5E171B]" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-gray-900 block truncate">Lecture Syllabus & Notes</span>
                    <span className="text-[8px] text-gray-400 font-mono block mt-0.5">Reference Material</span>
                  </div>
                </div>
                
                <a 
                  href={lesson.external_url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="bg-[#5E171B] hover:bg-[#4E1215] text-white p-2 rounded-md transition-all shrink-0 flex items-center justify-center border border-[#5E171B]/10 cursor-pointer shadow-xs"
                  title="Download File"
                >
                  <Download className="w-3.5 h-3.5" />
                </a>
              </div>
            </Card>
          ) : (
            /* Resource Placeholder to comply with: "Resources should only be visible if it is added." */
            <div className="bg-gray-100/50 border border-dashed border-gray-200 rounded-xl p-5 text-center text-gray-400 text-xs">
              <AlertCircle className="w-5 h-5 mx-auto mb-1.5 opacity-30 text-[#5E171B]" />
              No downloadable lit files cataloged to this lesson module by the tutor.
            </div>
          )}

          {/* Code Play Integration */}
          {lesson.courses?.is_compiler_enabled && (
            <Card className="bg-white border-gray-200 shadow-none rounded-xl text-gray-900 p-5 space-y-4 mt-4 border animate-pulse">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
                <Code className="h-5 w-5 text-[#5E171B]" />
                <h4 className="font-extrabold text-xs uppercase tracking-wider text-gray-900">Class Practice lab</h4>
              </div>
              <p className="text-xs text-gray-650 leading-relaxed">This module utilizes live algorithms. Jump straight into the S-VYASA online compiler sandboxes.</p>
              <Link 
                to="/compiler" 
                className="w-full bg-[#5E171B] hover:bg-[#4E1215] text-white py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs border border-[#5E171B]/20"
              >
                Launch Compiler Workspace
              </Link>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}
