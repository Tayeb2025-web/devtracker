export const XP_PER_HOUR = 100;
export const DEFAULT_DAILY_GOAL = 10;
export const DEFAULT_USER_ID = 1;

export const ACHIEVEMENTS = {
  first_session: { key: 'first_session', name: 'First Study Session', description: 'Complete your first study session', icon: 'rocket' },
  streak_7: { key: 'streak_7', name: '7 Days Streak', description: 'Study for 7 consecutive days', icon: 'fire' },
  streak_30: { key: 'streak_30', name: '30 Days Streak', description: 'Study for 30 consecutive days', icon: 'fire' },
  hours_100: { key: 'hours_100', name: '100 Hours', description: 'Reach 100 total study hours', icon: 'clock' },
  hours_500: { key: 'hours_500', name: '500 Hours', description: 'Reach 500 total study hours', icon: 'clock' },
  hours_1000: { key: 'hours_1000', name: '1000 Hours', description: 'Reach 1000 total study hours', icon: 'clock' },
  react_master: { key: 'react_master', name: 'React Master', description: 'Study React for 50+ hours', icon: 'react' },
  node_beginner: { key: 'node_beginner', name: 'Node Beginner', description: 'Study Node.js for 10+ hours', icon: 'nodejs' },
  tailwind_expert: { key: 'tailwind_expert', name: 'Tailwind Expert', description: 'Study Tailwind for 25+ hours', icon: 'tailwind' },
};

export const MOTIVATIONAL_QUOTES = [
  { text: 'Code is like humor. When you have to explain it, it\'s bad.', author: 'Cory House' },
  { text: 'First, solve the problem. Then, write the code.', author: 'John Johnson' },
  { text: 'Experience is the name everyone gives to their mistakes.', author: 'Oscar Wilde' },
  { text: 'The best error message is the one that never shows up.', author: 'Thomas Fuchs' },
  { text: 'Simplicity is the soul of efficiency.', author: 'Austin Freeman' },
  { text: 'Make it work, make it right, make it fast.', author: 'Kent Beck' },
  { text: 'Any fool can write code that a computer can understand.', author: 'Martin Fowler' },
  { text: 'The only way to learn a new programming language is by writing programs in it.', author: 'Dennis Ritchie' },
];

export const CALENDAR_COLORS = {
  none: '#161b22',
  level1: '#0e4429',
  level2: '#006d32',
  level3: '#26a641',
  level4: '#39d353',
  level5: '#3B82F6',
};

export function getCalendarLevel(hours) {
  if (hours <= 0) return 'none';
  if (hours < 1) return 'level1';
  if (hours < 3) return 'level2';
  if (hours < 5) return 'level3';
  if (hours < 8) return 'level4';
  if (hours < 10) return 'level5';
  return 'level5';
}

export function xpForLevel(level) {
  return level * 1000;
}

export function calculateLevel(totalXp) {
  let level = 1;
  let xpNeeded = 1000;
  let remaining = totalXp;
  while (remaining >= xpNeeded) {
    remaining -= xpNeeded;
    level++;
    xpNeeded = level * 1000;
  }
  return { level, currentXp: remaining, xpToNext: xpNeeded };
}
