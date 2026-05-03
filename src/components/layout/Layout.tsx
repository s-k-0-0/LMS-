import React, { useState } from 'react';
import { Outlet, Navigate, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { UserRole, supabase } from '../../lib/supabase';
import { 
  BookOpen, 
  Code, 
  Video, 
  Users, 
  Settings, 
  BrainCircuit, 
  LogOut,
  GraduationCap
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

export function Layout() {
  const { profile, loading, hasRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (loading) {
    return <div className="min-h-screen bg-rose-950 flex items-center justify-center text-pink-500">Loading Vidya...</div>;
  }

  // Allow access for testing if not auth'd yet
  const userRole = profile?.role || 'admin'; 

  const navigation = [
    { name: 'Dashboard', href: '/', icon: GraduationCap, roles: ['student', 'faculty', 'admin', 'super_admin'] },
    { name: 'Compiler', href: '/compiler', icon: Code, roles: ['student', 'faculty'] },
    { name: 'Aptitude Engine', href: '/aptitude', icon: BrainCircuit, roles: ['student'] },
    { name: 'Faculty Studio', href: '/studio', icon: Video, roles: ['faculty', 'admin'] },
    { name: 'Users Panel', href: '/admin', icon: Users, roles: ['admin', 'super_admin'] },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-rose-950 text-rose-50 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-[240px] bg-rose-900 border-r border-rose-800 flex flex-col hidden md:flex">
        <div className="h-20 flex items-center px-6">
          <BookOpen className="h-6 w-6 text-pink-500 mr-3" />
          <span className="font-bold text-2xl text-pink-500 tracking-tight">Vidya</span>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-2">
          {navigation.map((item) => {
            if (item.roles && !item.roles.includes(userRole) && userRole !== 'super_admin') return null;
            const isActive = location.pathname === item.href;
            return (
              <NavLink
                key={item.name}
                to={item.href}
                className={`flex items-center px-4 py-2.5 text-sm rounded-lg transition-all ${
                  isActive 
                    ? 'bg-pink-500/20 text-pink-500 font-semibold' 
                    : 'text-rose-400 hover:text-white hover:bg-rose-800/50'
                }`}
              >
                <item.icon className={`h-5 w-5 mr-3 ${isActive ? 'text-pink-500' : 'text-rose-400'}`} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 flex flex-col gap-2">
          <div onClick={() => setIsSettingsOpen(true)} className="flex items-center px-4 py-2.5 text-sm rounded-lg text-rose-400 hover:text-white hover:bg-rose-800/50 cursor-pointer">
            <Settings className="h-5 w-5 mr-3" />
            Profile Settings
          </div>
          <div onClick={handleLogout} className="flex items-center px-4 py-2.5 text-sm rounded-lg text-red-500 hover:bg-red-500/10 cursor-pointer">
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-rose-900 border-b border-rose-800 flex items-center justify-between px-6 md:hidden">
          <div className="flex items-center">
            <BookOpen className="h-6 w-6 text-pink-500 mr-2" />
            <span className="font-bold text-xl text-pink-500">Vidya</span>
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="text-rose-400 hover:text-white">
            <Settings className="h-6 w-6" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-rose-950">
          <Outlet />
        </main>
      </div>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="bg-rose-900 border-rose-800 text-rose-50 sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Profile Settings</DialogTitle>
            <DialogDescription className="text-rose-400">
              View and manage your account details. Contact super admin to change roles.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-rose-200">Email Address</Label>
              <Input
                id="email"
                defaultValue={profile?.email || ''}
                className="col-span-3 bg-rose-950 border-rose-800 text-rose-50"
                disabled
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role" className="text-rose-200">Current Role</Label>
              <Input
                id="role"
                defaultValue={profile?.role || ''}
                className="col-span-3 bg-rose-950 border-rose-800 text-rose-50 capitalize"
                disabled
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="points" className="text-rose-200">Total Points</Label>
              <Input
                id="points"
                defaultValue={profile?.points?.toString() || '0'}
                className="col-span-3 bg-rose-950 border-rose-800 text-rose-50"
                disabled
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button className="bg-pink-500 hover:bg-pink-600 text-rose-950" onClick={() => setIsSettingsOpen(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Protected Route Component
export function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles: UserRole[] }) {
  const { hasRole, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) return <div className="min-h-screen bg-rose-950 flex items-center justify-center text-pink-500">Authenticating...</div>;

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} />;
  if (!hasRole(allowedRoles)) {
    // If we have a profile but they aren't authorized for this route, redirect to dashboard
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}
