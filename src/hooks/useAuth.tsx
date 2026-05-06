import { useState, useEffect } from 'react';
import { supabase, Profile, UserRole } from '../lib/supabase';

export function useAuth() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setIsAuthenticated(!!session);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, departments(name)')
        .eq('id', userId)
        .single();
        
      if (error) {
        // If there's no profile yet, maybe trigger hasn't finished, so we mock temporarily 
        // to not break the UI while it's created, but print the error.
        console.error('Profile fetch error:', error);
      } else if (data) {
        setProfile(data as Profile & { departments?: { name: string } });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const hasRole = (roles: UserRole[]) => {
    if (!profile) return false;
    // super_admin always has access
    if (profile.role === 'super_admin') return true;
    return roles.includes(profile.role);
  };

  return { profile, loading, isAuthenticated, hasRole, fetchProfile };
}
