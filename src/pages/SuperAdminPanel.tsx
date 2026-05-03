import { useState, useEffect } from 'react';
import { supabase, Profile, UserRole } from '../lib/supabase';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ShieldAlert, UserCog } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

export default function SuperAdminPanel() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const { profile } = useAuth();
  
  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('profiles').select('*');
    if (data) setUsers(data as Profile[]);
    if (error) console.error("Error fetching users:", error);
    setLoading(false);
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
       alert("Failed to update role. Please ensure you have super_admin permissions.");
     }
  };

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1 flex items-center text-rose-50">
            <ShieldAlert className="h-6 w-6 text-pink-500 mr-2" />
            Super Admin Control
          </h1>
          <p className="text-sm text-rose-400">Manage user roles and system access.</p>
        </div>
      </div>

      <div className="border border-rose-800 rounded-2xl bg-rose-900 overflow-hidden shadow-none">
        <Table>
          <TableHeader className="bg-rose-950/30 border-b border-rose-800">
            <TableRow className="hover:bg-transparent border-none">
              <TableHead className="text-rose-400 font-semibold text-xs tracking-wider uppercase h-12 px-6">User Email</TableHead>
              <TableHead className="text-rose-400 font-semibold text-xs tracking-wider uppercase h-12">Current Role</TableHead>
              <TableHead className="text-rose-400 font-semibold text-xs tracking-wider uppercase h-12 text-right">Points</TableHead>
              <TableHead className="text-rose-400 font-semibold text-xs tracking-wider uppercase h-12 px-6 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-rose-400">Loading users...</TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-rose-400">No users found.</TableCell>
              </TableRow>
            ) : users.map((user) => (
              <TableRow key={user.id} className="border-b border-rose-800/50 hover:bg-rose-800/30 transition-colors">
                <TableCell className="px-6 py-4 font-medium text-rose-300">
                  <div className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-rose-800 text-pink-500 flex items-center justify-center mr-3">
                      <UserCog className="h-4 w-4" />
                    </div>
                    {user.email}
                  </div>
                </TableCell>
                <TableCell className="py-4">
                   <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize
                      ${user.role === 'super_admin' ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 
                        user.role === 'faculty' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 
                        user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        'bg-rose-800/50 text-rose-300 border border-rose-700'}`}>
                      {user.role}
                   </span>
                </TableCell>
                <TableCell className="py-4 text-right font-mono text-pink-400 font-medium">
                  {user.points || 0}
                </TableCell>
                <TableCell className="px-6 py-4 text-right">
                  <Select 
                    value={user.role} 
                    onValueChange={(val) => handleRoleChange(user.id, val as UserRole)}
                    disabled={user.email === 'skhebbarkd@gmail.com' || profile?.role !== 'super_admin'}
                  >
                    <SelectTrigger className="w-[140px] ml-auto bg-rose-950 border-rose-800 text-rose-300 h-9 rounded-lg">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-rose-900 border-rose-800 text-rose-200">
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="faculty">Faculty</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="super_admin" disabled>Super Admin</SelectItem>
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
