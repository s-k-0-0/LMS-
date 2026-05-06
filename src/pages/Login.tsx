import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AlertCircle, User, Briefcase, LogIn, UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [usnEmpId, setUsnEmpId] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [portalType, setPortalType] = useState<'student' | 'employee'>('student');
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  
  const navigate = useNavigate();

  const isMissingKeys = 
    !import.meta.env.VITE_SUPABASE_ANON_KEY || 
    import.meta.env.VITE_SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY' ||
    import.meta.env.VITE_SUPABASE_ANON_KEY === 'placeholder-key';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate('/');
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (portalType === 'student') {
      setRole('student');
    } else {
      setRole('faculty');
    }
    setError(null);
  }, [portalType]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: name,
              emp_usn_id: usnEmpId,
              role: role
            }
          }
        });
        if (error) throw error;
        
        if (data.user) {
           await supabase.from('profiles').update({ name, emp_usn_id: usnEmpId, role }).eq('id', data.user.id);
        }
        
        setError('Signup successful! You can now log in.');
        setMode('login');
      } else {
        // Remember Me doesn't actually need custom logic for supabase v2 auth 
        // as it persists in localStorage by default. But the UI is there.
        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Wait, check their role to ensure they are logging into the right portal
        if (authData.user) {
          const { data: profile } = await supabase.from('profiles').select('role').eq('id', authData.user.id).single();
          if (profile) {
            if (portalType === 'student' && profile.role !== 'student') {
              await supabase.auth.signOut();
              throw new Error("You are not a student. Please log in through the Employee portal.");
            }
            if (portalType === 'employee' && profile.role === 'student') {
              await supabase.auth.signOut();
              throw new Error("You are a student. Please log in through the Student portal.");
            }
          }
        }
        
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="mb-6 flex items-center justify-center">
        <img src="https://www.svyasa.edu.in/img/svyasa-logo-1-01.svg" alt="S-VYASA Logo" className="h-20 mix-blend-multiply" />
      </div>

      <Card className="w-full max-w-md bg-white border-gray-200 text-gray-900 shadow-xl rounded-2xl overflow-hidden">
        
        {/* Portal Type Toggle */}
        <div className="flex border-b border-gray-100">
          <button 
            className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center transition-colors ${portalType === 'student' ? 'bg-[#5E171B] text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
            onClick={() => { setPortalType('student'); setMode('login'); }}
          >
            <User className="h-4 w-4 mr-2" /> Student Portal
          </button>
          <button 
            className={`flex-1 py-4 text-sm font-semibold flex items-center justify-center transition-colors ${portalType === 'employee' ? 'bg-[#5E171B] text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}
            onClick={() => { setPortalType('employee'); setMode('login'); }}
          >
            <Briefcase className="h-4 w-4 mr-2" /> Employee Network
          </button>
        </div>

        <CardHeader className="pt-6">
          <CardTitle className="text-2xl text-center">
            {portalType === 'student' ? 'Student' : 'Employee'} {mode === 'login' ? 'Login' : 'Registration'}
          </CardTitle>
          <CardDescription className="text-gray-600 text-center">
            {mode === 'login' 
              ? 'Enter your credentials to access your dashboard.' 
              : 'Sign up to create your account.'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isMissingKeys && (
            <div className="mb-6 bg-red-950/10 border border-red-500/50 rounded-lg p-4 flex items-start text-red-500 text-sm">
              <AlertCircle className="h-5 w-5 mr-3 shrink-0 mt-0.5" />
              <p>
                <strong>Configuration Missing:</strong> Supabase Anon Key is not set.
              </p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {mode === 'signup' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-800">Full Name</Label>
                  <Input 
                    id="name" 
                    placeholder="Enter your full name" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500"
                  />
                </div>
                
                {portalType === 'employee' && (
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-gray-800">Employee Role</Label>
                    <select 
                      id="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="flex h-10 w-full rounded-md border bg-gray-50 px-3 py-2 text-sm text-gray-900 border-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5E171B] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="faculty">Faculty</option>
                      <option value="dept_admin">Department Admin</option>
                      <option value="dean">Dean</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="usn_empId" className="text-gray-800">
                    {portalType === 'student' ? 'USN (University Seat Number)' : 'Employee ID'}
                  </Label>
                  <Input 
                    id="usn_empId" 
                    placeholder={portalType === 'student' ? 'Enter your USN' : 'Enter your Employee ID'} 
                    value={usnEmpId}
                    onChange={(e) => setUsnEmpId(e.target.value)}
                    required
                    className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500"
                  />
                </div>
              </>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-800">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder={portalType === 'student' ? 'student@svyasa.edu.in' : 'employee@svyasa.edu.in'} 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-800">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-gray-50 border-gray-200 text-gray-900"
              />
            </div>

            {mode === 'login' && (
               <div className="flex items-center justify-between">
                 <div className="flex items-center space-x-2">
                   <input
                     type="checkbox"
                     id="remember"
                     checked={rememberMe}
                     onChange={(e) => setRememberMe(e.target.checked)}
                     className="rounded border-gray-300 text-[#5E171B] focus:ring-[#5E171B]"
                   />
                   <label htmlFor="remember" className="text-sm font-medium text-gray-700 cursor-pointer">
                     Remember me
                   </label>
                 </div>
               </div>
            )}

            {error && (
              <div className={`text-sm p-3 rounded-lg ${error.includes('successful') ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-red-500/10 text-red-600 border border-red-500/20'}`}>
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-[#5E171B] hover:bg-[#450F13] text-white font-bold h-11 text-base mt-2"
              disabled={loading || isMissingKeys}
            >
              {loading ? 'Processing...' : (mode === 'login' ? <><LogIn className="mr-2 h-5 w-5" /> Sign In</> : <><UserPlus className="mr-2 h-5 w-5" /> Create Account</>)}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center text-sm text-gray-600">
            {mode === 'login' ? "New to the platform? " : "Already registered? "}
            <button 
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-[#5E171B] hover:text-[#450F13] font-bold transition-colors underline underline-offset-4"
            >
              {mode === 'login' ? 'Register here' : 'Sign in here'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
