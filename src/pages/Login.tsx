import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { BookOpen, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        // Optionally show success message for confirmation email
        setError('Signup successful! You can now log in.');
        setMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-rose-950 flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex items-center">
        <BookOpen className="h-10 w-10 text-pink-500 mr-4" />
        <span className="font-bold text-4xl text-pink-500 tracking-tight">Vidya</span>
      </div>

      <Card className="w-full max-w-md bg-rose-900 border-rose-800 text-rose-50 shadow-2xl rounded-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">{mode === 'login' ? 'Welcome Back' : 'Create Account'}</CardTitle>
          <CardDescription className="text-rose-400">
            {mode === 'login' 
              ? 'Enter your credentials to access your dashboard.' 
              : 'Sign up to start your learning journey.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isMissingKeys && (
            <div className="mb-6 bg-red-950/50 border border-red-500/50 rounded-lg p-4 flex items-start text-red-400 text-sm">
              <AlertCircle className="h-5 w-5 mr-3 shrink-0 mt-0.5" />
              <p>
                <strong>Configuration Missing:</strong> Supabase Anon Key is not set. 
                Please enter your <code className="bg-red-900/50 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> in the AI Studio Secrets or environment variables to enable authentication.
              </p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-rose-200">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="student@svyasa.edu" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-rose-950 border-rose-800 text-rose-50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-rose-200">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-rose-950 border-rose-800 text-rose-50"
              />
            </div>

            {error && (
              <div className={`text-sm p-3 rounded-lg ${error.includes('successful') ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-red-500/20 text-red-400 border border-red-500/50'}`}>
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full bg-pink-500 hover:bg-pink-600 text-rose-950 font-bold"
              disabled={loading || isMissingKeys}
            >
              {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Sign Up')}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-rose-400">
            {mode === 'login' ? "Don't have an account? " : "Already have an account? "}
            <button 
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-pink-500 hover:text-pink-400 font-semibold transition-colors"
            >
              {mode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
