import React, { useState, useRef } from 'react';
import { Upload, Video, Server, CheckCircle2, AlertCircle, Youtube, Link as LinkIcon } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import * as tus from 'tus-js-client';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function FacultyStudio() {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadMode, setUploadMode] = useState<'cloudflare' | 'youtube'>('youtube');
  const [youtubeUrl, setYoutubeUrl] = useState('');

  const streamUrl = import.meta.env.VITE_CLOUDFLARE_STREAM_URL;

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInfo(null);
    setUploaded(false);

    if (uploadMode === 'youtube') {
      if (!youtubeUrl) {
         setErrorInfo('Please enter a YouTube URL');
         return;
      }
      setIsUploading(true);
      
      let ytId = null;
      let contentType = 'youtube_video';
      
      // Check for playlist
      if (youtubeUrl.includes('list=')) {
        const listMatch = youtubeUrl.match(/[?&]list=([^#\&\?]+)/);
        if (listMatch) {
          ytId = listMatch[1];
          contentType = 'youtube_playlist';
        }
      } 
      
      // If not a playlist or list parameter not found, check for normal video
      if (!ytId) {
        const ytIdMatch = youtubeUrl.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
        if (ytIdMatch) {
          ytId = ytIdMatch[1];
        }
      }

      if (!ytId) {
        setErrorInfo("Invalid YouTube URL or Playlist URL");
        setIsUploading(false);
        return;
      }

      try {
        const { error: dbError } = await supabase.from('lessons').insert({
          title: title,
          content_type: contentType,
          cf_stream_id: ytId, // Saving youtube ID here for simplicity
          course_id: null
        });

        if (dbError) throw dbError;
        
        setUploaded(true);
        setTitle('');
        setDesc('');
        setYoutubeUrl('');
      } catch (err: any) {
        console.error(err);
        setErrorInfo(err.message || 'Error saving to database');
      } finally {
        setIsUploading(false);
      }
      return;
    }

    if (!fileInputRef.current?.files?.[0]) {
      setErrorInfo("Please select a video file.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const file = fileInputRef.current.files[0];

    try {
      // 1. Call the Supabase Edge Function to get the Cloudflare upload URL
      const { data: edgeData, error: edgeError } = await supabase.functions.invoke('cloudflare-upload', {
        body: {
          uploadLength: file.size,
          uploadMetadata: `filename ${btoa(file.name)},filetype ${btoa(file.type)},name ${btoa(title)}`,
        }
      });

      if (edgeError) {
        const isNon2xx = edgeError.message?.includes('non-2xx');
        throw new Error(isNon2xx 
          ? "Edge Function 'cloudflare-upload' is either not deployed or missing secrets. Please check the deployment instructions." 
          : edgeError.message
        );
      }

      if (!edgeData?.uploadUrl) {
        throw new Error(edgeData?.error || "Failed to get upload URL from Edge Function. Please check Cloudflare API keys.");
      }

      const uploadUrl = edgeData.uploadUrl;

      // 2. Initialize tus.Upload using the uploadUrl
      const upload = new tus.Upload(file, {
        endpoint: uploadUrl, // fallback for some configurations, though uploadUrl is typically what's used
        uploadUrl: uploadUrl, // This tells tus-js-client to PATCH directly without POSTing
        retryDelays: [0, 3000, 5000, 10000, 20000],
        onError: function(error) { 
          console.error('Failed because: ' + error);
          setErrorInfo("Upload failed: " + error.message);
          setIsUploading(false);
        },
        onProgress: function(bytesUploaded, bytesTotal) {
          setUploadProgress(Math.round((bytesUploaded / bytesTotal) * 100));
        },
        onSuccess: async function() { 
          console.log('Download %s from %s', file.name, upload.url);
          
          // The Cloudflare video UID is typically the last part of the upload URL
          const cfStreamId = upload.url?.split('/').pop() || '';
          
          try {
            const { error: dbError } = await supabase.from('lessons').insert({
              title: title,
              content_type: 'video',
              cf_stream_id: cfStreamId,
              course_id: null // We'll need a way to assign course_id normally
            });

            if (dbError) console.error("Could not save lesson to DB", dbError);

            setIsUploading(false);
            setUploaded(true);
            setTitle('');
            setDesc('');
            if(fileInputRef.current) fileInputRef.current.value = '';
          } catch (err) {
            console.error(err);
          }
        }
      });
      
      // Start the upload
      upload.start();

    } catch (err: any) {
      console.error(err);
      setErrorInfo(err.message || "An error occurred starting the upload");
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Faculty Studio</h1>
        <p className="text-rose-400">Create new courses and direct-upload lessons via Cloudflare Stream or YouTube.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-rose-900 border-rose-800 text-rose-100 shadow-none rounded-2xl">
          <CardHeader>
            <CardTitle>New Lesson Upload</CardTitle>
            <CardDescription className="text-rose-400">Add content to your courses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-6">
              <button 
                onClick={() => setUploadMode('youtube')}
                className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center border transition-all ${uploadMode === 'youtube' ? 'bg-pink-500/10 border-pink-500 text-pink-400' : 'bg-rose-950 border-rose-800 hover:border-pink-500/50 text-rose-400'}`}
              >
                <Youtube className="w-5 h-5 mr-2" /> YouTube Link
              </button>
              <button 
                onClick={() => setUploadMode('cloudflare')}
                className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center border transition-all ${uploadMode === 'cloudflare' ? 'bg-pink-500/10 border-pink-500 text-pink-400' : 'bg-rose-950 border-rose-800 hover:border-pink-500/50 text-rose-400'}`}
              >
                <Video className="w-5 h-5 mr-2" /> Direct Upload
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-6">
              
              {errorInfo && (
                <div className="bg-red-950/80 border border-red-500/50 p-4 rounded-lg text-red-400 text-sm flex items-start">
                  <AlertCircle className="h-5 w-5 mr-3 shrink-0 mt-0.5" />
                  <p>{errorInfo}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title" className="text-rose-300">Lesson Title</Label>
                <Input 
                  id="title" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  required 
                  className="bg-rose-950 border-rose-800 text-rose-100 rounded-lg"
                  placeholder="e.g. Introduction to Advanced Data Structures"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="desc" className="text-rose-300">Description</Label>
                <Textarea 
                  id="desc" 
                  value={desc} 
                  onChange={e => setDesc(e.target.value)} 
                  className="bg-rose-950 border-rose-800 h-24 text-rose-100 rounded-lg"
                  placeholder="What will students learn?"
                />
              </div>

              {uploadMode === 'youtube' ? (
                 <div className="space-y-2">
                   <Label htmlFor="youtubeUrl" className="text-rose-300">YouTube URL</Label>
                   <Input 
                     id="youtubeUrl" 
                     value={youtubeUrl} 
                     onChange={e => setYoutubeUrl(e.target.value)} 
                     required={uploadMode === 'youtube'}
                     className="bg-rose-950 border-rose-800 text-rose-100 rounded-lg"
                     placeholder="https://www.youtube.com/watch?v=..."
                   />
                 </div>
              ) : (
                <div className="pt-4">
                  <div 
                    className="border-2 border-dashed border-rose-700 rounded-xl p-8 text-center hover:border-pink-500 hover:bg-rose-800/50 transition-all cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-10 w-10 text-rose-400 mx-auto mb-4" />
                    <p className="text-sm font-medium mb-1 text-rose-200">Click to select a video file</p>
                    <p className="text-xs text-rose-500">Maximum file size: 5GB</p>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="video/*" 
                      onChange={e => {
                        if(e.target.files?.[0]) {
                          // Just an immediate visual feedback, no state needed
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {isUploading && uploadMode === 'cloudflare' && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono text-rose-400">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full bg-rose-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-pink-500 transition-all duration-200" 
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {uploaded && (
                 <div className="p-4 bg-pink-500/20 border border-pink-500 text-pink-400 rounded-lg flex items-center">
                    <CheckCircle2 className="h-5 w-5 mr-3 shrink-0" />
                    <span className="text-sm font-medium">Lesson successfully added!</span>
                 </div>
              )}

              <Button type="submit" disabled={isUploading || !title} className="w-full bg-pink-500 hover:bg-pink-600 text-rose-950 font-semibold rounded-lg">
                {uploadMode === 'youtube' ? 'Save Lesson' : 'Upload & Create Lesson'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-rose-900 border-rose-800 text-rose-100 shadow-none rounded-2xl">
            <CardHeader className="pb-4 border-b border-rose-800/50">
              <CardTitle className="text-sm font-bold flex items-center text-rose-300">
                <Server className="h-4 w-4 mr-2 text-blue-400" /> Storage Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-rose-400 mb-2 font-medium">
                    <span>Cloudflare Stream</span>
                    <span>45 / 1000 mins</span>
                  </div>
                  <div className="h-1.5 w-full bg-rose-800 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 w-[5%]" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
