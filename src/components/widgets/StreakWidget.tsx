import { format, differenceInDays } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { Flame } from 'lucide-react';

export const updateStreak = async (userId: string, currentStreak: number, lastLoginStr: string | null) => {
  const now = new Date();
  
  if (!lastLoginStr) {
    // First login
    await supabase.from('profiles').update({ streak_count: 1, last_login: format(now, 'yyyy-MM-dd') }).eq('id', userId);
    return 1;
  }

  const lastLogin = new Date(lastLoginStr);
  const diffDays = differenceInDays(now, lastLogin);

  let newStreak = currentStreak;

  if (diffDays === 1) {
    newStreak += 1;
    await supabase.from('profiles').update({ streak_count: newStreak, last_login: format(now, 'yyyy-MM-dd') }).eq('id', userId);
  } else if (diffDays > 1) {
    newStreak = 1;
    await supabase.from('profiles').update({ streak_count: newStreak, last_login: format(now, 'yyyy-MM-dd') }).eq('id', userId);
  } else if (diffDays === 0) {
    // Already logged in today, don't update streak
  }

  return newStreak;
};

export function StreakWidget({ streak = 0 }: { streak: number }) {
  return (
    <div className="flex items-center space-x-2 bg-[#F05A28]/10 border border-[#F05A28]/30 rounded-full px-3 py-1.5 shadow-sm text-sm font-semibold text-[#F05A28]">
      <span className="text-base leading-none">🔥</span>
      <span>{streak}</span>
      <span className="uppercase tracking-wider">Day Streak</span>
    </div>
  );
}
