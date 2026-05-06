import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { CheckCircle, XCircle, FileVideo, ShieldAlert, BookOpen } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function ContentApprovals() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  
  useEffect(() => {
    fetchPendingCourses();
  }, [profile]);

  const fetchPendingCourses = async () => {
    if (!profile) return;
    setLoading(true);
    let query = supabase.from('courses').select('*, profiles!faculty_id(email, name)');
    
    if (profile.role === 'dept_admin') {
      // Dept adm sees only pending_verification for their dept
      query = query.eq('status', 'pending_verification').eq('department_id', profile.department_id);
    } else if (profile.role === 'dean' || profile.role === 'super_admin') {
      // Dean sees approved_by_dept
      // For testing let's allow dean to see all 'pending_verification' + 'approved_by_dept'
      if (profile.department_id) {
        query = query.in('status', ['pending_verification', 'approved_by_dept']).eq('department_id', profile.department_id);
      } else {
        query = query.in('status', ['pending_verification', 'approved_by_dept']);
      }
    }

    const { data, error } = await query;
    if (data) {
      setCourses(data);
    }
    setLoading(false);
  };

  const handleApprove = async (courseId: string, currentStatus: string) => {
    let nextStatus = 'published';
    if (profile?.role === 'dept_admin') {
      nextStatus = 'approved_by_dept'; // Send to Dean
    } else if (profile?.role === 'dean' || profile?.role === 'super_admin') {
      nextStatus = 'published';
    }

    const { error } = await supabase.from('courses').update({ status: nextStatus }).eq('id', courseId);
    if (!error) {
      if (nextStatus === 'published') {
        // Publish lessons too
        await supabase.from('lessons').update({ status: 'published' }).eq('course_id', courseId);
      } else if (nextStatus === 'approved_by_dept') {
        await supabase.from('lessons').update({ status: 'approved_by_dept' }).eq('course_id', courseId);
      }
      setCourses(courses.filter(c => c.id !== courseId));
    }
  };

  const handleReject = async (courseId: string) => {
    const { error } = await supabase.from('courses').delete().eq('id', courseId);
    if (!error) {
      setCourses(courses.filter(c => c.id !== courseId));
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1 flex items-center text-gray-900">
            <ShieldAlert className="h-6 w-6 text-[#F05A28] mr-2" />
            Content Verification
          </h1>
          <p className="text-sm text-gray-700">Approve or reject courses and content submitted by faculty.</p>
        </div>
      </div>

      <div className="border border-[#4A1414] rounded-2xl bg-[#5A1A1A] overflow-hidden shadow-none">
        <Table>
          <TableHeader className="bg-[#4A1414]/30 border-b border-[#4A1414]">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="text-gray-300 font-semibold text-xs tracking-wider uppercase h-12 px-6">Content</TableHead>
              <TableHead className="text-gray-300 font-semibold text-xs tracking-wider uppercase h-12">Author</TableHead>
              <TableHead className="text-gray-300 font-semibold text-xs tracking-wider uppercase h-12">Status</TableHead>
              <TableHead className="text-gray-300 font-semibold text-xs tracking-wider uppercase h-12 text-right px-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-300">Loading pending content...</TableCell>
              </TableRow>
            ) : courses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-300">No content pending your review.</TableCell>
              </TableRow>
            ) : courses.map((course) => (
              <TableRow key={course.id} className="border-b border-[#4A1414]/50 hover:bg-[#4A1414]/30 transition-colors">
                <TableCell className="px-6 py-4 font-medium text-gray-200">
                  <div className="flex items-center">
                    <BookOpen className="h-5 w-5 text-[#F05A28] mr-3" />
                    {course.title}
                  </div>
                </TableCell>
                <TableCell className="py-4 text-gray-300 text-sm">
                   {course.profiles?.name || course.profiles?.email || 'Unknown'}
                </TableCell>
                <TableCell className="py-4">
                   <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      {course.status.replace('_', ' ')}
                   </span>
                </TableCell>
                <TableCell className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(course.id, course.status)}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleReject(course.id)}>
                      <XCircle className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
