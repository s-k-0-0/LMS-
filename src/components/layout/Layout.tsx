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
  GraduationCap,
  CheckSquare,
  Award
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

export function Layout() {
  const { profile, loading, hasRole, fetchProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editName, setEditName] = useState(profile?.name || '');
  const [editEmpId, setEditEmpId] = useState(profile?.emp_usn_id || '');
  const [editPhone, setEditPhone] = useState(profile?.phone || '');
  const [editBio, setEditBio] = useState(profile?.bio || '');
  
  // Custom metadata states per role
  const [editAcademicYear, setEditAcademicYear] = useState('');
  const [editMajorSubject, setEditMajorSubject] = useState('');
  const [editAchievements, setEditAchievements] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editExperience, setEditExperience] = useState('');
  const [editResearchArea, setEditResearchArea] = useState('');
  const [editPreferredYoga, setEditPreferredYoga] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    if (profile) {
      if (!editName && profile.name) setEditName(profile.name);
      if (!editEmpId && profile.emp_usn_id) setEditEmpId(profile.emp_usn_id);
      if (!editPhone && profile.phone) setEditPhone(profile.phone);
      if (!editBio && profile.bio) setEditBio(profile.bio);

      try {
        const cached = localStorage.getItem(`profile_details_${profile.id}`);
        if (cached) {
          const extra = JSON.parse(cached);
          setEditAcademicYear(extra.academicYear || '');
          setEditMajorSubject(extra.majorSubject || '');
          setEditAchievements(extra.achievements || '');
          setEditDesignation(extra.designation || '');
          setEditExperience(extra.experience || '');
          setEditResearchArea(extra.researchArea || '');
          setEditPreferredYoga(extra.preferredYoga || '');
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <img src="https://www.svyasa.edu.in/img/svyasa-logo-1-01.svg" alt="S-VYASA Logo" className="h-16 mix-blend-multiply mb-4" />
        <div className="text-[#5E171B] font-medium">Loading LMS...</div>
      </div>
    );
  }

  // Allow access for testing if not auth'd yet
  const userRole = profile?.role || 'admin'; 

  const navigation = [
    { name: 'Dashboard', href: '/', icon: GraduationCap, roles: ['student', 'faculty', 'dept_admin', 'dean', 'super_admin'] },
    { name: 'Courses', href: '/courses', icon: BookOpen, roles: ['student', 'faculty', 'dept_admin', 'dean', 'super_admin'] },
    { name: 'Academic Tracker', href: '/tracker', icon: Award, roles: ['faculty', 'dept_admin', 'dean', 'super_admin'] },
    { name: 'Faculty Studio', href: '/studio', icon: Video, roles: ['faculty', 'dept_admin', 'dean', 'super_admin'] },
    { name: 'Approvals', href: '/approvals', icon: CheckSquare, roles: ['dept_admin', 'dean', 'super_admin'] },
    { name: 'Users Panel', href: '/admin', icon: Users, roles: ['dept_admin', 'dean', 'super_admin'] },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const cacheExtraFields = () => {
    if (!profile) return;
    localStorage.setItem(`profile_details_${profile.id}`, JSON.stringify({
      phone: editPhone,
      bio: editBio,
      academicYear: editAcademicYear,
      majorSubject: editMajorSubject,
      achievements: editAchievements,
      designation: editDesignation,
      experience: editExperience,
      researchArea: editResearchArea,
      preferredYoga: editPreferredYoga
    }));
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    if (!editName.trim() || !editEmpId.trim()) {
      alert("Name and USN/Employee ID are mandatory fields.");
      return;
    }

    setIsSaving(true);
    
    // We will attempt to update all fields. Supabase might ignore non-existent cols if configured, 
    // or fail. If it fails, we will try again without them.
    const { error } = await supabase
      .from('profiles')
      .update({ name: editName, emp_usn_id: editEmpId, phone: editPhone, bio: editBio })
      .eq('id', profile.id);
      
    if (error && error.message?.includes('column')) {
      // Fallback if phone/bio columns don't exist yet in the database
      const { error: fallbackError } = await supabase
        .from('profiles')
        .update({ name: editName, emp_usn_id: editEmpId })
        .eq('id', profile.id);
        
      if (!fallbackError) {
        cacheExtraFields();
        fetchProfile(profile.id);
        setIsSettingsOpen(false);
      } else {
        alert('Failed to save profile.');
      }
    } else if (!error) {
      // Soft update local profile to reflect changes without reloading
      cacheExtraFields();
      fetchProfile(profile.id);
      setIsSettingsOpen(false);
    } else {
      console.error(error);
      alert('Failed to save profile.');
    }
    setIsSaving(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-[240px] bg-white border-r border-gray-200 flex flex-col hidden md:flex text-gray-900">
        <div className="h-20 flex items-center px-6 border-b border-gray-100">
          <img src="https://www.svyasa.edu.in/img/svyasa-logo-1-01.svg" alt="S-VYASA Logo" className="h-10 mix-blend-multiply" />
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
                    ? 'bg-[#5E171B]/20 text-[#5E171B] font-semibold' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50/50'
                }`}
              >
                <item.icon className={`h-5 w-5 mr-3 ${isActive ? 'text-[#5E171B]' : 'text-gray-600'}`} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 flex flex-col gap-2">
          <div onClick={() => setIsSettingsOpen(true)} className="flex items-center px-4 py-2.5 text-sm rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-50/50 cursor-pointer">
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
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 md:hidden text-gray-900">
          <div className="flex items-center">
            <img src="https://www.svyasa.edu.in/img/svyasa-logo-1-01.svg" alt="S-VYASA Logo" className="h-8 mix-blend-multiply" />
          </div>
          <button onClick={() => setIsSettingsOpen(true)} className="text-gray-600 hover:text-gray-900">
            <Settings className="h-6 w-6" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50">
          <Outlet />
        </main>
      </div>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-900 sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Profile Settings</DialogTitle>
            <DialogDescription className="text-gray-600">
              View and manage your account details. Contact super admin to change roles.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-1 space-y-1">
            <div className="grid gap-2">
              <Label htmlFor="name" className="text-gray-700">Full Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="col-span-3 bg-gray-50 border-gray-200 text-gray-900"
                placeholder="Enter your full name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="emp_usn" className="text-gray-700">
                {profile?.role === 'student' ? 'USN (University Seat Number)' : 'Employee ID'}
              </Label>
              <Input
                id="emp_usn"
                value={editEmpId}
                onChange={(e) => setEditEmpId(e.target.value)}
                className="col-span-3 bg-gray-50 border-gray-200 text-gray-900"
                placeholder={profile?.role === 'student' ? "Enter your USN" : "Enter your Employee ID"}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-gray-700">Email Address</Label>
              <Input
                id="email"
                defaultValue={profile?.email || ''}
                className="col-span-3 bg-gray-50 border-gray-200 text-gray-900"
                disabled
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone" className="text-gray-700">Phone Number</Label>
              <Input
                id="phone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="col-span-3 bg-gray-50 border-gray-200 text-gray-900"
                placeholder="Enter your phone number"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bio" className="text-gray-700">Bio</Label>
              <Input
                id="bio"
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                className="col-span-3 bg-gray-50 border-gray-200 text-gray-900"
                placeholder="Tell us about yourself"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role" className="text-gray-700">Current Role</Label>
              <Input
                id="role"
                defaultValue={profile?.role?.replace('_', ' ') || ''}
                className="col-span-3 bg-gray-50 border-gray-200 text-gray-900 capitalize"
                disabled
              />
            </div>
            <div className="grid gap-2 pb-2">
              <Label htmlFor="dept" className="text-gray-700">Department</Label>
              <Input
                id="dept"
                defaultValue={profile?.departments?.name || 'Not assigned'}
                className="col-span-3 bg-gray-50 border-gray-200 text-gray-900"
                disabled
              />
            </div>

            {/* Conditional Student Fields */}
            {profile?.role === 'student' && (
              <div className="border-t border-gray-150 pt-3 mt-2 space-y-3">
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#5E171B] block">Student Scholastic Details</span>
                <div className="grid gap-2">
                  <Label htmlFor="academic_year" className="text-gray-700">Academic Year</Label>
                  <Input
                    id="academic_year"
                    value={editAcademicYear}
                    onChange={(e) => setEditAcademicYear(e.target.value)}
                    className="bg-gray-50 border-gray-200 text-gray-900"
                    placeholder="e.g. 2nd Year B.Sc. Yogic Sciences"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="major_subject" className="text-gray-700">Major/Specialty</Label>
                  <Input
                    id="major_subject"
                    value={editMajorSubject}
                    onChange={(e) => setEditMajorSubject(e.target.value)}
                    className="bg-gray-50 border-gray-200 text-gray-900"
                    placeholder="e.g. Yoga Therapy, Yogic Nutrition"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="achievements" className="text-gray-700">Honors & Certifications</Label>
                  <Input
                    id="achievements"
                    value={editAchievements}
                    onChange={(e) => setEditAchievements(e.target.value)}
                    className="bg-gray-50 border-gray-200 text-gray-900"
                    placeholder="e.g. National Yoga Championship Gold Medalist"
                  />
                </div>
              </div>
            )}

            {/* Conditional Faculty, Dean, etc. Fields */}
            {['faculty', 'dean'].includes(profile?.role || '') && (
              <div className="border-t border-gray-150 pt-3 mt-2 space-y-3">
                <span className="text-[10px] uppercase tracking-wider font-bold text-[#5E171B] block">Professional Academic Credentials</span>
                <div className="grid gap-2">
                  <Label htmlFor="designation" className="text-gray-700">Designation / Academic Title</Label>
                  <Input
                    id="designation"
                    value={editDesignation}
                    onChange={(e) => setEditDesignation(e.target.value)}
                    className="bg-gray-50 border-gray-200 text-gray-900"
                    placeholder="e.g. Professor & Dean of Yoga Sciences"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="experience" className="text-gray-700">Years of Focus & Experience</Label>
                  <Input
                    id="experience"
                    value={editExperience}
                    onChange={(e) => setEditExperience(e.target.value)}
                    className="bg-gray-50 border-gray-200 text-gray-900"
                    placeholder="e.g. 15 Years in Yogic Rehabilitation"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="research_area" className="text-gray-700">Primary Research Domain</Label>
                  <Input
                    id="research_area"
                    value={editResearchArea}
                    onChange={(e) => setEditResearchArea(e.target.value)}
                    className="bg-gray-50 border-gray-200 text-gray-900"
                    placeholder="e.g. Cyclic Meditation & Cardiac Autonomic Control"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="preferred_yoga" className="text-gray-700">Sadhana Routine / Yoga Form</Label>
                  <Input
                    id="preferred_yoga"
                    value={editPreferredYoga}
                    onChange={(e) => setEditPreferredYoga(e.target.value)}
                    className="bg-gray-50 border-gray-200 text-gray-900"
                    placeholder="e.g. Patanjali Raja Yoga & Pranayama"
                  />
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" className="text-gray-900" onClick={() => setIsSettingsOpen(false)}>
              Cancel
            </Button>
            <Button className="bg-[#5E171B] hover:bg-[#450F13] text-white" onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
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

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-[#5E171B]">Authenticating...</div>;

  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} />;
  if (!hasRole(allowedRoles)) {
    // If we have a profile but they aren't authorized for this route, redirect to dashboard
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}
