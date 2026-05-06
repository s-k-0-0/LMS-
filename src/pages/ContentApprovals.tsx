import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { CheckCircle, XCircle, FileVideo, ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function ContentApprovals() {
  const [lessons, setLessons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  
  useEffect(() => {
    fetchPendingLessons();
  }, [profile]);

  const fetchPendingLessons = async () => {
    if (!profile) return;
    setLoading(true);
    let query = supabase.from('lessons').select('*, profiles!created_by(email, department_id)');
    
    if (profile.role === 'dept_admin') {
      // Dept adm sees only pending_verification for their dept
      query = query.eq('status', 'pending_verification');
      // Supabase join filtering or fetch all and filter in memory for simplicity here
    } else if (profile.role === 'dean' || profile.role === 'super_admin') {
      // Dean sees approved_by_dept
      // For testing let's allow dean to see all 'pending_verification' + 'approved_by_dept'
      query = query.in('status', ['pending_verification', 'approved_by_dept']);
    }

    const { data, error } = await query;
    if (data) {
      // filter in memory for dept admin
      let filtered = data;
      if (profile.role === 'dept_admin' && profile.department_id) {
          filtered = data.filter((d: any) => d.profiles?.department_id === profile.department_id);
      }
      setLessons(filtered);
    }
    setLoading(false);
  };

  const handleApprove = async (lessonId: string, currentStatus: string) => {
    let nextStatus = 'published';
    if (profile?.role === 'dept_admin') {
      nextStatus = 'approved_by_dept'; // Send to Dean
    } else if (profile?.role === 'dean' || profile?.role === 'super_admin') {
      nextStatus = 'published';
    }

    const { error } = await supabase.from('lessons').update({ status: nextStatus }).eq('id', lessonId);
    if (!error) {
      setLessons(lessons.filter(l => l.id !== lessonId));
    }
  };

  const handleReject = async (lessonId: string) => {
    // Delete for simplicity or move to rejected state. Let's delete.
    const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
    if (!error) {
      setLessons(lessons.filter(l => l.id !== lessonId));
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
          <p className="text-sm text-gray-700">Approve or reject content submitted by faculty.</p>
        </div>
      </div>

      <div className="border border-[#4A1414] rounded-2xl bg-[#5A1A1A] overflow-hidden shadow-none">
        <Table>
          <TableHeader className="bg-[#4A1414]/30 border-b border-[#4A1414]">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="text-gray-300 font-semibold text-xs tracking-wider uppercase h-12 px-6">Lesson</TableHead>
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
            ) : lessons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-300">No content pending your review.</TableCell>
              </TableRow>
            ) : lessons.map((lesson) => (
              <TableRow key={lesson.id} className="border-b border-[#4A1414]/50 hover:bg-[#4A1414]/30 transition-colors">
                <TableCell className="px-6 py-4 font-medium text-gray-200">
                  <div className="flex items-center">
                    <FileVideo className="h-5 w-5 text-[#F05A28] mr-3" />
                    {lesson.title}
                  </div>
                </TableCell>
                <TableCell className="py-4 text-gray-300 text-sm">
                   {lesson.profiles?.email || 'Unknown'}
                </TableCell>
                <TableCell className="py-4">
                   <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize bg-orange-500/10 text-orange-400 border border-orange-500/20">
                      {lesson.status.replace('_', ' ')}
                   </span>
                </TableCell>
                <TableCell className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(lesson.id, lesson.status)}>
                      <CheckCircle className="h-4 w-4 mr-1" /> Approve
                    </Button>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={() => handleReject(lesson.id)}>
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
