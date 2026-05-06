import { useState, useEffect } from 'react';
import { supabase, Profile, UserRole } from '../lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ShieldAlert, UserCog } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function UsersPanel() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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

    let query = supabase.from('profiles').select('*, departments(name)');
    
    // Filter based on role
    if (profile.role === 'dean' || profile.role === 'dept_admin' || profile.role === 'faculty') {
      if (profile.department_id) {
        query = query.eq('department_id', profile.department_id);
        
        if (profile.role === 'faculty') {
          // Faculty can only see students in their department
          query = query.eq('role', 'student');
        } else if (profile.role === 'dept_admin') {
          // Dept admin can see students and faculty
          query = query.in('role', ['student', 'faculty']);
        } else if (profile.role === 'dean') {
          // Dean can see students, faculty, and dept_admins in their department
          query = query.in('role', ['student', 'faculty', 'dept_admin']);
        }
      } else {
        // If they have no department ID set yet, they shouldn't see anything
        query = query.eq('id', 'nomatch');
      }
    }
    // super_admin sees everyone

    const { data, error } = await query;
    if (data) setUsers(data as Profile[]);
    if (error) console.error("Error fetching users:", error);
    setLoading(false);
  };

  const canEditUser = (targetUser: Profile) => {
    if (!profile) return false;
    if (profile.role === 'super_admin') return true;
    if (targetUser.role === 'super_admin') return false; // nobody can edit super admin except super admin
    
    if (profile.role === 'dean') {
      return targetUser.role !== 'dean'; // dean can edit dept_admin, faculty, student
    }
    if (profile.role === 'dept_admin') {
      // dept admin can only edit student and faculty in same department
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
     // Optimistically update state
     const previousUsers = [...users];
     setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
     
     const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
     
     if (error) {
       console.error("Error updating role:", error);
       // Revert on error
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

  const availableRoles = getAvailableRoles();

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1 flex items-center text-gray-900">
            <ShieldAlert className="h-6 w-6 text-[#F05A28] mr-2" />
            Users Management Panel
          </h1>
          <p className="text-sm text-gray-700">Manage user roles, departments, and system access.</p>
        </div>
      </div>

      <div className="border border-[#4A1414] rounded-2xl bg-[#5A1A1A] overflow-hidden shadow-none">
        <Table>
          <TableHeader className="bg-[#4A1414]/30 border-b border-[#4A1414]">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="text-gray-300 font-semibold text-xs tracking-wider uppercase h-12 px-6">User</TableHead>
              <TableHead className="text-gray-300 font-semibold text-xs tracking-wider uppercase h-12">Department</TableHead>
              <TableHead className="text-gray-300 font-semibold text-xs tracking-wider uppercase h-12">Current Role</TableHead>
              <TableHead className="text-gray-300 font-semibold text-xs tracking-wider uppercase h-12 text-right">Points</TableHead>
              <TableHead className="text-gray-300 font-semibold text-xs tracking-wider uppercase h-12 px-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-300">Loading users...</TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-300">No users found.</TableCell>
              </TableRow>
            ) : users.map((user) => (
              <TableRow key={user.id} className="border-b border-[#4A1414]/50 hover:bg-[#4A1414]/30 transition-colors">
                <TableCell className="px-6 py-4 font-medium text-gray-200">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-[#4A1414] text-[#F05A28] flex items-center justify-center mr-3 shrink-0">
                      <UserCog className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-semibold">{user.name || 'Unnamed User'}</span>
                      <span className="text-xs text-gray-400 font-normal">{user.email}</span>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-4">
                  <Select 
                    value={user.department_id || 'none'} 
                    onValueChange={(val) => handleDeptChange(user.id, val)}
                    disabled={!canEditUser(user)}
                  >
                    <SelectTrigger className="w-[200px] bg-[#4A1414] border-[#4A1414] text-gray-200 h-9 rounded-lg text-xs truncate">
                      <SelectValue placeholder="Select dept" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#5A1A1A] border-[#4A1414] text-gray-100 max-h-[300px]">
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
                        'bg-[#4A1414]/50 text-gray-200 border border-[#4A1414]'}`}>
                      {user.role.replace('_', ' ')}
                   </span>
                </TableCell>
                <TableCell className="py-4 text-right font-mono text-[#F05A28] font-medium">
                  {user.points || 0}
                </TableCell>
                <TableCell className="px-6 py-4 text-right">
                  <Select 
                    value={user.role} 
                    onValueChange={(val) => handleRoleChange(user.id, val as UserRole)}
                    disabled={!canEditUser(user)}
                  >
                    <SelectTrigger className="w-[140px] ml-auto bg-[#4A1414] border-[#4A1414] text-gray-200 h-9 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#5A1A1A] border-[#4A1414] text-gray-100">
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
    </div>
  );
}
