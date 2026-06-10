import React, { useState } from 'react';
import { Video, CheckCircle2, AlertCircle, Youtube, Code, LayoutDashboard } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export default function FacultyStudio() {
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState('technical');
  const [contentTypeSelection, setContentTypeSelection] = useState('course');
  const [isCompilerEnabled, setIsCompilerEnabled] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [resourceLink, setResourceLink] = useState('');
  
  // Custom LMS Course metadata
  const [credits, setCredits] = useState('3');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [deadline, setDeadline] = useState('');
  const [gradingWeight, setGradingWeight] = useState('Pass/Fail');
  
  // Hierarchy & Availability settings
  const [isGlobal, setIsGlobal] = useState(false);
  const [isMandatory, setIsMandatory] = useState(false);
  const [targetRoles, setTargetRoles] = useState<string[]>(['student']);
  const [targetDepartmentId, setTargetDepartmentId] = useState<string>('all');
  const [departmentsList, setDepartmentsList] = useState<any[]>([]);

  React.useEffect(() => {
    const fetchDepts = async () => {
      const { data } = await supabase.from('departments').select('*');
      if (data) setDepartmentsList(data);
    };
    fetchDepts();
  }, []);
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [errorInfo, setErrorInfo] = useState<string | null>(null);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorInfo(null);
    setUploaded(false);

    if (!youtubeUrl) {
       setErrorInfo('Please enter a YouTube URL');
       return;
    }
    
    setIsUploading(true);
    
    let ytId = null;
    let lessonType = 'youtube_video';
    
    if (youtubeUrl.includes('list=')) {
      const listMatch = youtubeUrl.match(/[?&]list=([^#\&\?]+)/);
      if (listMatch) {
        ytId = listMatch[1];
        lessonType = 'youtube_playlist';
      }
    } 
    
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

    if (profile?.role !== 'super_admin' && !profile?.department_id) {
       setErrorInfo("You must be assigned to a department to upload content.");
       setIsUploading(false);
       return;
    }

    try {
      // Build LMS Metadata
      const metadata: any = {};
      if (profile?.role === 'super_admin' && isGlobal) {
        metadata.available_all_depts = true;
      }
      if (isMandatory) {
        metadata.mandatory_roles = targetRoles;
        if (profile?.role === 'super_admin') {
          if (targetDepartmentId !== 'all') {
            metadata.mandatory_depts = [targetDepartmentId];
          }
        } else if (profile?.role === 'dean') {
          if (targetDepartmentId !== 'all') {
            metadata.mandatory_depts = [targetDepartmentId];
          } else if (profile?.department_id) {
            metadata.mandatory_depts = [profile.department_id];
          }
        } else if (profile?.role === 'dept_admin') {
          if (profile?.department_id) {
            metadata.mandatory_depts = [profile.department_id];
          }
        }
      }

      // If Super Admin publishes global, clone across all departments
      if (profile?.role === 'super_admin' && isGlobal) {
        // Query all departments
        const { data: depts } = await supabase.from('departments').select('id');
        const deptIds = depts?.map(d => d.id) || [];
        
        let success = false;
        let lastError = null;
        const groupId = `global_${Date.now()}`;
        metadata.global_course_group_id = groupId;
        const finalDescWithGroup = `${desc.trim()}\n\n<!--LMS_METADATA: ${JSON.stringify(metadata)}-->`;
        
        if (deptIds.length > 0) {
          for (const deptId of deptIds) {
            const insertObj: any = {
              title: title,
              description: finalDescWithGroup,
              faculty_id: profile?.id,
              department_id: deptId,
              status: 'published', // Super admin content publishes immediately
              is_compiler_enabled: category === 'technical' ? isCompilerEnabled : false,
              category: category,
              content_type: contentTypeSelection,
              credits: parseInt(credits) || 3,
              difficulty: difficulty,
              deadline: deadline || null,
              grading_weight: gradingWeight,
              is_mandatory: isMandatory
            };
            
            const { data: courseData, error: courseError } = await supabase
              .from('courses')
              .insert(insertObj)
              .select()
              .single();
              
            if (courseError) {
              lastError = courseError;
              continue;
            }
            
            // Insert Lesson
            await supabase.from('lessons').insert({
              course_id: courseData.id,
              title: title,
              content_type: lessonType,
              cf_stream_id: ytId,
              external_url: resourceLink || null,
              created_by: profile?.id,
              status: 'published'
            });
            success = true;
          }
        }
        
        if (lastError && !success) throw lastError;
      } else {
        // Standard single insertion
        const finalDescWithMeta = (isMandatory || isGlobal) ? `${desc.trim()}\n\n<!--LMS_METADATA: ${JSON.stringify(metadata)}-->` : desc;
        
        const insertObj: any = {
          title: title,
          description: finalDescWithMeta,
          faculty_id: profile?.id,
          department_id: profile?.department_id || null,
          status: profile?.role === 'super_admin' ? 'published' : 'pending_verification',
          is_compiler_enabled: category === 'technical' ? isCompilerEnabled : false,
          category: category,
          content_type: contentTypeSelection,
          credits: parseInt(credits) || 3,
          difficulty: difficulty,
          deadline: deadline || null,
          grading_weight: gradingWeight,
          is_mandatory: isMandatory
        };
        
        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .insert(insertObj)
          .select()
          .single();
          
        if (courseError) throw courseError;
        
        await supabase.from('lessons').insert({
          course_id: courseData.id,
          title: title,
          content_type: lessonType,
          cf_stream_id: ytId,
          external_url: resourceLink || null,
          created_by: profile?.id,
          status: profile?.role === 'super_admin' ? 'published' : 'pending_verification'
        });
      }
      
      setUploaded(true);
      setTitle('');
      setDesc('');
      setYoutubeUrl('');
      setResourceLink('');
      setIsCompilerEnabled(false);
      setCategory('technical');
      setContentTypeSelection('course');
      setCredits('3');
      setDifficulty('Beginner');
      setDeadline('');
      setGradingWeight('Pass/Fail');
      setIsGlobal(false);
      setIsMandatory(false);
      setTargetRoles(['student']);
      setTargetDepartmentId('all');
    } catch (err: any) {
      console.error(err);
      setErrorInfo(err.message || 'Error saving to database');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Faculty Studio</h1>
        <p className="text-gray-700">Create new courses and lessons via YouTube. Content must be approved before publishing.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-white border-gray-200 text-gray-900 shadow-none rounded-2xl">
          <CardHeader>
            <CardTitle>Submit New Content</CardTitle>
            <CardDescription className="text-gray-600">Add course modules or upskilling content for your students</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-6">
              
              {errorInfo && (
                <div className="bg-red-950/80 border border-red-500/50 p-4 rounded-lg text-red-400 text-sm flex items-start">
                  <AlertCircle className="h-5 w-5 mr-3 shrink-0 mt-0.5" />
                  <p>{errorInfo}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contentTypeSelection" className="text-gray-700">Format</Label>
                  <Select value={contentTypeSelection} onValueChange={setContentTypeSelection}>
                    <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg">
                      <SelectValue placeholder="Select Format" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-gray-800">
                      <SelectItem value="course">Standard Course</SelectItem>
                      <SelectItem value="upskilling">Upskilling / Dashboard Content</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category" className="text-gray-700">Category Tag</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-gray-800">
                      <SelectItem value="core">Core Course</SelectItem>
                      <SelectItem value="technical">Technical / Coding</SelectItem>
                      <SelectItem value="soft_skills">Soft Skills</SelectItem>
                      <SelectItem value="aptitude">Aptitude</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dynamic Educational Metadata Settings */}
              <div className="bg-gray-50 border border-gray-150 rounded-xl p-4 space-y-4">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#5E171B] block">LMS Course Specifications</span>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="credits" className="text-xs text-gray-700">Course Credits (CR)</Label>
                    <Select value={credits} onValueChange={setCredits}>
                      <SelectTrigger className="bg-white border-gray-200 text-gray-900 rounded-lg h-9 text-xs">
                        <SelectValue placeholder="Credits" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-gray-800">
                        <SelectItem value="1">1 Credit Hour</SelectItem>
                        <SelectItem value="2">2 Credit Hours</SelectItem>
                        <SelectItem value="3">3 Credit Hours</SelectItem>
                        <SelectItem value="4">4 Credit Hours</SelectItem>
                        <SelectItem value="5">5 Credit Hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="difficulty" className="text-xs text-gray-700">Difficulty Grade Level</Label>
                    <Select value={difficulty} onValueChange={setDifficulty}>
                      <SelectTrigger className="bg-white border-gray-200 text-gray-900 rounded-lg h-9 text-xs">
                        <SelectValue placeholder="Difficulty" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-gray-800">
                        <SelectItem value="Beginner">Beginner Level</SelectItem>
                        <SelectItem value="Intermediate">Intermediate Level</SelectItem>
                        <SelectItem value="Advanced">Advanced Level</SelectItem>
                        <SelectItem value="All Levels">All Levels (Open)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="deadline" className="text-xs text-gray-700">Completion Deadline</Label>
                    <Input 
                      id="deadline" 
                      type="text" 
                      value={deadline} 
                      onChange={e => setDeadline(e.target.value)} 
                      className="bg-white border-gray-200 text-gray-900 h-9 text-xs rounded-lg"
                      placeholder="e.g. June 30, 2026 or Flexible"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="grading" className="text-xs text-gray-700">Grading / Marks Standard</Label>
                    <Select value={gradingWeight} onValueChange={setGradingWeight}>
                      <SelectTrigger className="bg-white border-gray-200 text-gray-900 rounded-lg h-9 text-xs">
                        <SelectValue placeholder="Select Criteria" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 text-gray-800">
                        <SelectItem value="Pass/Fail">Satisfactory Pass / Fail</SelectItem>
                        <SelectItem value="Letter Grade (A+ to F)">Letter Grade (A+ to F)</SelectItem>
                        <SelectItem value="Percentage Score (0-100)">Percentage Score (0-100)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Hierarchical Mandates & Multi-Department Access Settings */}
              {['super_admin', 'dean', 'dept_admin'].includes(profile?.role || '') && (
                <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-4">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 block">Hierarchical Access & Mandate Control</span>
                  
                  {profile?.role === 'super_admin' && (
                    <label className="flex items-center space-x-2 text-sm font-semibold text-gray-800 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isGlobal}
                        onChange={(e) => {
                          setIsGlobal(e.target.checked);
                          if (e.target.checked) {
                            setTargetDepartmentId('all');
                          }
                        }}
                        className="rounded border-amber-400 text-amber-750 shadow-sm focus:ring-amber-500 focus:ring-offset-0 bg-white h-4 w-4"
                      />
                      <span>Make Available in All Departments (Global Course)</span>
                    </label>
                  )}

                  <label className="flex items-center space-x-2 text-sm font-semibold text-gray-800 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isMandatory}
                      onChange={(e) => setIsMandatory(e.target.checked)}
                      className="rounded border-amber-400 text-amber-750 shadow-sm focus:ring-amber-500 focus:ring-offset-0 bg-white h-4 w-4"
                    />
                    <span>Make this Course Mandatory</span>
                  </label>

                  {isMandatory && (
                    <div className="pl-6 border-l-2 border-amber-200 space-y-4 pt-1">
                      {/* Department scope */}
                      {['super_admin', 'dean'].includes(profile?.role || '') ? (
                        <div className="space-y-1.5">
                          <Label className="text-xs text-gray-700 font-bold">Mandatory Target Department Scope</Label>
                          <Select value={targetDepartmentId} onValueChange={setTargetDepartmentId}>
                            <SelectTrigger className="bg-white border-amber-200 text-gray-950 rounded-lg h-9 text-xs">
                              <SelectValue placeholder="Select Department Scope" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200 text-gray-800">
                              <SelectItem value="all">All Departments ({isGlobal ? 'Global' : 'Multiple'})</SelectItem>
                              {departmentsList.map(dept => (
                                <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="text-xs text-amber-800 font-medium bg-amber-100/40 p-2.5 rounded-lg border border-amber-200/50">
                          Scope: <strong className="uppercase">Own Department Only</strong> (Strictly restricted per administration hierarchy)
                        </div>
                      )}

                      {/* Target Roles selection of lower hierarchy */}
                      <div className="space-y-2">
                        <Label className="text-xs text-gray-700 font-bold block">Mandatory Target Roles</Label>
                        <div className="flex flex-wrap gap-4 pt-1">
                          {profile?.role === 'super_admin' && (
                            <>
                              <label className="flex items-center space-x-1.5 text-xs text-gray-700 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={targetRoles.includes('student')}
                                  onChange={(e) => setTargetRoles(e.target.checked ? [...targetRoles, 'student'] : targetRoles.filter(r => r !== 'student'))}
                                  className="rounded border-gray-300 text-amber-700"
                                />
                                <span>Students</span>
                              </label>
                              <label className="flex items-center space-x-1.5 text-xs text-gray-700 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={targetRoles.includes('faculty')}
                                  onChange={(e) => setTargetRoles(e.target.checked ? [...targetRoles, 'faculty'] : targetRoles.filter(r => r !== 'faculty'))}
                                  className="rounded border-gray-300 text-amber-700"
                                />
                                <span>Faculty</span>
                              </label>
                              <label className="flex items-center space-x-1.5 text-xs text-gray-700 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={targetRoles.includes('dept_admin')}
                                  onChange={(e) => setTargetRoles(e.target.checked ? [...targetRoles, 'dept_admin'] : targetRoles.filter(r => r !== 'dept_admin'))}
                                  className="rounded border-gray-300 text-amber-700"
                                />
                                <span>Dept Admins</span>
                              </label>
                              <label className="flex items-center space-x-1.5 text-xs text-gray-700 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={targetRoles.includes('dean')}
                                  onChange={(e) => setTargetRoles(e.target.checked ? [...targetRoles, 'dean'] : targetRoles.filter(r => r !== 'dean'))}
                                  className="rounded border-gray-300 text-amber-700"
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
                                  checked={targetRoles.includes('student')}
                                  onChange={(e) => setTargetRoles(e.target.checked ? [...targetRoles, 'student'] : targetRoles.filter(r => r !== 'student'))}
                                  className="rounded border-gray-300 text-amber-700"
                                />
                                <span>Students</span>
                              </label>
                              <label className="flex items-center space-x-1.5 text-xs text-gray-700 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={targetRoles.includes('faculty')}
                                  onChange={(e) => setTargetRoles(e.target.checked ? [...targetRoles, 'faculty'] : targetRoles.filter(r => r !== 'faculty'))}
                                  className="rounded border-gray-300 text-amber-700"
                                />
                                <span>Faculty</span>
                              </label>
                              <label className="flex items-center space-x-1.5 text-xs text-gray-700 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={targetRoles.includes('dept_admin')}
                                  onChange={(e) => setTargetRoles(e.target.checked ? [...targetRoles, 'dept_admin'] : targetRoles.filter(r => r !== 'dept_admin'))}
                                  className="rounded border-gray-300 text-amber-700"
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
                                  checked={targetRoles.includes('student')}
                                  onChange={(e) => setTargetRoles(e.target.checked ? [...targetRoles, 'student'] : targetRoles.filter(r => r !== 'student'))}
                                  className="rounded border-gray-300 text-amber-700"
                                />
                                <span>Students Only</span>
                              </label>
                              <label className="flex items-center space-x-1.5 text-xs text-gray-700 cursor-pointer">
                                <input 
                                  type="checkbox"
                                  checked={targetRoles.includes('faculty')}
                                  onChange={(e) => setTargetRoles(e.target.checked ? [...targetRoles, 'faculty'] : targetRoles.filter(r => r !== 'faculty'))}
                                  className="rounded border-gray-300 text-amber-700"
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
              )}

              <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-700">Content Title</Label>
                <Input 
                  id="title" 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  required 
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg"
                  placeholder="e.g. Introduction to Advanced Data Structures"
                />
              </div>
              
              {category === 'technical' && contentTypeSelection === 'course' && (
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 text-sm font-medium text-gray-700 cursor-pointer p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <input 
                      type="checkbox" 
                      checked={isCompilerEnabled}
                      onChange={(e) => setIsCompilerEnabled(e.target.checked)}
                      className="rounded border-[#5E171B] text-[#5E171B] shadow-sm focus:ring-[#5E171B] focus:ring-offset-0 bg-white"
                    />
                    <span className="flex items-center"><Code className="h-4 w-4 mr-2 text-[#5E171B]" /> Enable Code Workspace for this Course</span>
                  </label>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="desc" className="text-gray-700">Description</Label>
                <Textarea 
                  id="desc" 
                  value={desc} 
                  onChange={e => setDesc(e.target.value)} 
                  className="bg-gray-50 border-gray-200 h-24 text-gray-900 rounded-lg"
                  placeholder="What will students learn?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="youtubeUrl" className="text-gray-700">YouTube Video / Playlist URL</Label>
                <Input 
                  id="youtubeUrl" 
                  value={youtubeUrl} 
                  onChange={e => setYoutubeUrl(e.target.value)} 
                  required
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="resourceLink" className="text-gray-700">Additional Resource URL (Optional)</Label>
                <Input 
                  id="resourceLink" 
                  value={resourceLink} 
                  onChange={e => setResourceLink(e.target.value)} 
                  className="bg-gray-50 border-gray-200 text-gray-900 rounded-lg"
                  placeholder="Link to Google Drive, PDF, Notion, etc."
                />
              </div>

              {uploaded && (
                 <div className="p-4 bg-[#5E171B]/20 border border-[#5E171B] text-[#5E171B] rounded-lg flex items-center">
                    <CheckCircle2 className="h-5 w-5 mr-3 shrink-0" />
                    <span className="text-sm font-medium">Content submitted for approval!</span>
                 </div>
              )}

              <Button type="submit" disabled={isUploading || !title} className="w-full bg-[#5E171B] hover:bg-[#450F13] text-white font-semibold rounded-lg">
                {isUploading ? 'Submitting...' : 'Submit Content'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-white border-gray-200 text-gray-900 shadow-none rounded-2xl">
            <CardHeader className="pb-4 border-b border-gray-200/50">
              <CardTitle className="text-sm font-bold flex items-center text-gray-700">
                 <LayoutDashboard className="h-4 w-4 mr-2 text-[#5E171B]" /> What happens next?
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-sm text-gray-600 space-y-3">
               <p>1. Your content is queued as <strong>Pending Verification</strong>.</p>
               <p>2. The <strong>Department Admin</strong> will review your upload.</p>
               <p>3. If it requires Dean approval, it will be forwarded. Otherwise it is approved directly.</p>
               <p>4. Once <strong>Published</strong>, it becomes available to your assigned students.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
