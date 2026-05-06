import { useState, useEffect } from 'react';
import { supabase, Profile, UserRole } from '../lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ShieldAlert, UserCog, Users } from 'lucide-react';
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

  const { profile } = useAuth();
  
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
    </div>
  );
}
