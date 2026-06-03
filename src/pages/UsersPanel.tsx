import { useState, useEffect } from 'react';
import { supabase, Profile, UserRole } from '../lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ShieldAlert, UserCog, Users, GraduationCap, BookOpen } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

export default function UsersPanel() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Manage Students state
  const [manageFacultyOpen, setManageFacultyOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<Profile | null>(null);
  const [deptStudents, setDeptStudents] = useState<Profile[]>([]);
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);
  const [isSavingStudents, setIsSavingStudents] = useState(false);

  // Student progress tracking states
  const [trackProgressOpen, setTrackProgressOpen] = useState(false);
  const [trackingStudent, setTrackingStudent] = useState<Profile | null>(null);
  const [studentProgressData, setStudentProgressData] = useState<any[]>([]);
  const [studentExtraInfo, setStudentExtraInfo] = useState<any>(null);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);

  const { profile } = useAuth();

  const openTrackProgress = async (student: Profile) => {
    setTrackingStudent(student);
    setTrackProgressOpen(true);
    setIsLoadingTracking(true);
    setStudentProgressData([]);
    setStudentExtraInfo(null);

    try {
      // 1. Fetch progress records
      const { data, error } = await supabase
        .from('student_progress')
        .select('*, courses(title, category), lessons(title)')
        .eq('student_id', student.id)
        .order('created_at', { ascending: false });
        
      if (data) {
        setStudentProgressData(data);
      }

      // 2. Fetch extra profile details cached in localStorage
      const cached = localStorage.getItem(`profile_details_${student.id}`);
      if (cached) {
        setStudentExtraInfo(JSON.parse(cached));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingTracking(false);
    }
  };
  
  useEffect(() => {
    fetchUsersAndDepts();
  }, [profile]);

  const fetchUsersAndDepts = async () => {
    if (!profile) return;
    setLoading(true);
    
    // Fetch Depts
    const { data: deptData } = await supabase.from('departments').select('*');
    if (deptData) setDepartments(deptData);

    let query = supabase.from('profiles').select('*, departments(name)').order('name', { ascending: true });
    
    // Filter based on role
    if (profile.role === 'dean' || profile.role === 'dept_admin' || profile.role === 'faculty') {
      if (profile.department_id) {
        query = query.eq('department_id', profile.department_id);
        
        if (profile.role === 'faculty') {
          query = query.eq('role', 'student');
        } else if (profile.role === 'dept_admin') {
          query = query.in('role', ['student', 'faculty']);
        } else if (profile.role === 'dean') {
          query = query.in('role', ['student', 'faculty', 'dept_admin']);
        }
      } else {
        query = query.eq('id', 'nomatch');
      }
    }

    const { data, error } = await query;
    if (data) setUsers(data as Profile[]);
    if (error) console.error("Error fetching users:", error);
    setLoading(false);
  };

  const canEditUser = (targetUser: Profile) => {
    if (!profile) return false;
    if (profile.role === 'super_admin') return true;
    if (targetUser.role === 'super_admin') return false; 
    
    if (profile.role === 'dean') {
      return targetUser.role !== 'dean'; 
    }
    if (profile.role === 'dept_admin') {
      return (targetUser.role === 'student' || targetUser.role === 'faculty') && 
             targetUser.department_id === profile.department_id;
    }
    return false;
  };

  const getAvailableRoles = () => {
    if (profile?.role === 'super_admin') return ['student', 'faculty', 'dept_admin', 'dean', 'super_admin'];
    if (profile?.role === 'dean') return ['student', 'faculty', 'dept_admin'];
    if (profile?.role === 'dept_admin') return ['student', 'faculty'];
    return [];
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
     const previousUsers = [...users];
     setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
     
     const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
     
     if (error) {
       console.error("Error updating role:", error);
       setUsers(previousUsers);
       alert("Failed to update role. Please ensure you have sufficient permissions.");
     }
  };

  const handleDeptChange = async (userId: string, newDeptId: string) => {
     const previousUsers = [...users];
     setUsers(users.map(u => u.id === userId ? { ...u, department_id: newDeptId === 'none' ? null : newDeptId } : u));
     
     const { error } = await supabase.from('profiles').update({ department_id: newDeptId === 'none' ? null : newDeptId }).eq('id', userId);
     
     if (error) {
       console.error("Error updating dept:", error);
       setUsers(previousUsers);
       alert("Failed to update department. Please ensure you have sufficient permissions.");
     }
  };

  const openManageStudents = async (faculty: Profile) => {
    if (!faculty.department_id) {
       alert("Faculty must be assigned to a department first.");
       return;
    }
    setSelectedFaculty(faculty);
    setManageFacultyOpen(true);
    
    // Fetch students in this dept
    const { data: students } = await supabase.from('profiles')
      .select('*').eq('role', 'student').eq('department_id', faculty.department_id);
    
    if (students) setDeptStudents(students);

    // Fetch assigned students for this faculty
    const { data: assignments } = await supabase.from('faculty_students')
      .select('student_id').eq('faculty_id', faculty.id);
      
    if (assignments) {
      setAssignedStudentIds(assignments.map(a => a.student_id));
    } else {
      setAssignedStudentIds([]);
    }
  };

  const toggleStudent = (studentId: string) => {
    setAssignedStudentIds(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const saveAssignments = async () => {
    if (!selectedFaculty) return;
    setIsSavingStudents(true);
    
    // Delete existing
    await supabase.from('faculty_students').delete().eq('faculty_id', selectedFaculty.id);
    
    // Insert new
    if (assignedStudentIds.length > 0) {
      const inserts = assignedStudentIds.map(id => ({ faculty_id: selectedFaculty.id, student_id: id }));
      await supabase.from('faculty_students').insert(inserts);
    }
    
    setIsSavingStudents(false);
    setManageFacultyOpen(false);
  };

  const availableRoles = getAvailableRoles();

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1 flex items-center text-gray-900">
            <ShieldAlert className="h-6 w-6 text-[#5E171B] mr-2" />
            Users Management Panel
          </h1>
          <p className="text-sm text-gray-700">Manage user roles, departments, and system access.</p>
        </div>
      </div>

      <div className="border border-gray-200 rounded-2xl bg-white overflow-hidden shadow-none">
        <Table>
          <TableHeader className="bg-gray-50/30 border-b border-gray-200">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="text-gray-600 font-semibold text-xs tracking-wider uppercase h-12 px-6">User</TableHead>
              <TableHead className="text-gray-600 font-semibold text-xs tracking-wider uppercase h-12">Department</TableHead>
              <TableHead className="text-gray-600 font-semibold text-xs tracking-wider uppercase h-12">Current Role</TableHead>
              <TableHead className="text-gray-600 font-semibold text-xs tracking-wider uppercase h-12 text-center">Manage</TableHead>
              <TableHead className="text-gray-600 font-semibold text-xs tracking-wider uppercase h-12 px-6 text-right">Role Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-600">Loading users...</TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-600">No users found.</TableCell>
              </TableRow>
            ) : users.map((user) => (
              <TableRow key={user.id} className="border-b border-gray-200/50 hover:bg-gray-50/30 transition-colors">
                <TableCell className="px-6 py-4 font-medium text-gray-700">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-gray-50 text-[#5E171B] flex items-center justify-center mr-3 shrink-0">
                      <UserCog className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold">{user.name || 'Unnamed User'}</span>
                      <span className="text-xs text-gray-500 font-normal">{user.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <Select 
                    value={user.department_id || 'none'} 
                    onValueChange={(val) => handleDeptChange(user.id, val)}
                    disabled={!canEditUser(user)}
                  >
                    <SelectTrigger className="w-[200px] bg-gray-50 border-gray-200 text-gray-700 h-9 rounded-lg text-xs truncate">
                      <SelectValue placeholder="Select dept" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-gray-800 max-h-[300px]">
                      <SelectItem value="none">None</SelectItem>
                      {departments.map(d => (
                        <SelectItem key={d.id} value={d.id} className="text-xs">{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="py-4">
                   <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize
                      ${user.role === 'super_admin' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                        user.role === 'dean' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 
                        user.role === 'dept_admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 
                        user.role === 'faculty' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                        'bg-gray-50/50 text-gray-700 border border-gray-200'}`}>
                      {user.role.replace('_', ' ')}
                   </span>
                </TableCell>
                <TableCell className="py-4 text-center">
                  {user.role === 'faculty' && canEditUser(user) && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openManageStudents(user)}
                      className="bg-gray-50 border-gray-200 hover:bg-white text-gray-700 text-xs h-8"
                    >
                      <Users className="h-3 w-3 mr-1" /> Assign Students
                    </Button>
                  )}
                  {user.role === 'student' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => openTrackProgress(user)}
                      className="bg-gray-50 border-gray-200 hover:bg-white text-gray-750 text-xs h-8 hover:border-[#5E171B]/50"
                    >
                      <GraduationCap className="h-3.5 w-3.5 mr-1.5 text-[#5E171B]" /> Track Progress
                    </Button>
                  )}
                </TableCell>
                <TableCell className="px-6 py-4 text-right">
                  <Select 
                    value={user.role} 
                    onValueChange={(val) => handleRoleChange(user.id, val as UserRole)}
                    disabled={!canEditUser(user)}
                  >
                    <SelectTrigger className="w-[140px] ml-auto bg-gray-50 border-gray-200 text-gray-700 h-9 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 text-gray-800">
                      {availableRoles.includes('student') && <SelectItem value="student">Student</SelectItem>}
                      {availableRoles.includes('faculty') && <SelectItem value="faculty">Faculty</SelectItem>}
                      {availableRoles.includes('dept_admin') && <SelectItem value="dept_admin">Dept Admin</SelectItem>}
                      {availableRoles.includes('dean') && <SelectItem value="dean">Dean</SelectItem>}
                      {availableRoles.includes('super_admin') && <SelectItem value="super_admin">Super Admin</SelectItem>}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={manageFacultyOpen} onOpenChange={setManageFacultyOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Assigned Students</DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-gray-600">
            Select the students who will be assigned to <strong>{selectedFaculty?.name || 'this faculty'}</strong>. Only these students will be able to view their uploaded courses.
          </div>
          
          <div className="border border-gray-200 rounded-lg max-h-[300px] overflow-y-auto bg-white">
             {deptStudents.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">No students found in this department.</div>
             ) : (
                <div className="divide-y divide-[#4A1414]">
                  {deptStudents.map(student => (
                    <label key={student.id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={assignedStudentIds.includes(student.id)}
                        onChange={() => toggleStudent(student.id)}
                        className="rounded border-[#5E171B] text-[#5E171B] shadow-sm focus:ring-[#5E171B] bg-[#1A0A0A] mr-3"
                      />
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-700 text-sm">{student.name || 'Unnamed Student'}</span>
                        <span className="text-xs text-gray-500">{student.email}</span>
                      </div>
                    </label>
                  ))}
                </div>
             )}
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" className="text-gray-900" onClick={() => setManageFacultyOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-[#5E171B] hover:bg-[#450F13] text-white" onClick={saveAssignments} disabled={isSavingStudents}>
              {isSavingStudents ? 'Saving...' : 'Save Assignments'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Progress Telemetry Dialog */}
      <Dialog open={trackProgressOpen} onOpenChange={setTrackProgressOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 sm:max-w-[550px]" style={{ maxHeight: '85vh', overflowY: 'auto' }}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center text-[#5E171B]">
              <GraduationCap className="h-6 w-6 mr-2" />
              S-VYASA Student Academic Tracker
            </DialogTitle>
          </DialogHeader>

          {trackingStudent && (
            <div className="py-2 space-y-4 flex flex-col">
              {/* Profile Card Summary & Extra Details */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-800 text-base">{trackingStudent.name || 'Unnamed Student'}</h3>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{trackingStudent.email}</p>
                  </div>
                  <span className="bg-[#5E171B]/10 text-[#5E171B] border border-[#5E171B]/20 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
                    {trackingStudent.emp_usn_id || 'No Roll/USN'}
                  </span>
                </div>

                {/* Additional student details editable in profile */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 pt-2 border-t border-gray-200/50 text-xs">
                  <div>
                    <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[9px]">Department</span>
                    <span className="text-gray-700 font-medium">{trackingStudent.departments?.name || 'Not Assigned'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[9px]">Phone Number</span>
                    <span className="text-gray-700 font-medium">{studentExtraInfo?.phone || 'Not Shared'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[9px]">Academic Year</span>
                    <span className="text-gray-700 font-medium">{studentExtraInfo?.academicYear || 'Not Specified'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[9px]">Major / Specialty</span>
                    <span className="text-gray-700 font-medium">{studentExtraInfo?.majorSubject || 'Not Specified'}</span>
                  </div>
                </div>

                {studentExtraInfo?.bio && (
                  <div className="text-xs mt-2 border-t border-gray-200/50 pt-2">
                    <span className="text-gray-400 block font-semibold uppercase tracking-wider text-[9px] mb-0.5">Bio / Objective</span>
                    <p className="text-gray-700 leading-snug italic font-normal">"{studentExtraInfo.bio}"</p>
                  </div>
                )}

                {studentExtraInfo?.achievements && (
                  <div className="text-xs mt-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-2.5 text-yellow-850">
                    <span className="font-bold block text-[10px] uppercase tracking-wider">Student Achievements</span>
                    <p className="mt-0.5 text-xs font-medium leading-snug">{studentExtraInfo.achievements}</p>
                  </div>
                )}
              </div>

              {/* Progress Summary Section */}
              <div>
                <h4 className="font-bold text-xs uppercase tracking-widest text-[#5E171B] mb-2.5">Course Completion & Lessons Watched</h4>
                
                {isLoadingTracking ? (
                  <div className="text-center py-6 text-xs text-gray-500 font-medium">Fetching telemetry statistics...</div>
                ) : studentProgressData.length === 0 ? (
                  <div className="text-center py-10 bg-gray-55/50 rounded-xl border border-gray-150 text-xs text-gray-500">
                     This student hasn't watched any video lessons yet.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 border border-gray-250 rounded-xl bg-white max-h-[220px] overflow-y-auto">
                    {studentProgressData.map((prog) => (
                      <div key={prog.id} className="p-3 hover:bg-gray-50/30 flex justify-between items-center text-xs">
                        <div className="flex flex-col gap-0.5 max-w-[70%]">
                          <span className="font-semibold text-gray-850 line-clamp-1">{prog.lessons?.title || 'Unknown Lesson'}</span>
                          <span className="text-[10px] text-gray-500 line-clamp-1">Course: {prog.courses?.title || 'Unknown Course'}</span>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border
                            ${prog.status === 'completed' 
                              ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                              : 'bg-orange-500/10 text-orange-500 border-orange-500/20'}`}>
                            {prog.status}
                          </span>
                          <span className="text-[9px] text-gray-400 font-mono">
                            {new Date(prog.updated_at || prog.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button className="bg-[#5E171B] hover:bg-[#450F13] text-white text-xs h-9 px-4 rounded-lg" onClick={() => setTrackProgressOpen(false)}>
              Close Tracker
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
