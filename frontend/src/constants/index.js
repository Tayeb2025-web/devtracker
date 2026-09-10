const rawApiBase = (import.meta.env.VITE_API_BASE || import.meta.env.VITE_BACKEND_URL || '/api').trim().replace(/\/+$/, '');
export const API_BASE = rawApiBase === '/api' || rawApiBase.endsWith('/api') ? rawApiBase : `${rawApiBase}/api`;

export const ROUTES = {
  DASHBOARD: '/',
  TIMER: '/timer',
  STATISTICS: '/statistics',
  CALENDAR: '/calendar',
  TECHNOLOGIES: '/technologies',
  PROJECTS: '/projects',
  HISTORY: '/history',
  ACHIEVEMENTS: '/achievements',
  CHALLENGES: '/challenges',
  NOTES: '/notes',
  MUSIC: '/music',
  COMMUNITY: '/community',
  SETTINGS: '/settings',
};

export const CALENDAR_COLORS = {
  none: '#161b22',
  level1: '#0e4429',
  level2: '#006d32',
  level3: '#26a641',
  level4: '#39d353',
  level5: '#3B82F6',
  level6: '#8B5CF6',
};

export const CALENDAR_LABELS = {
  none: 'No Study',
  level1: '< 1 Hour',
  level2: '1-3 Hours',
  level3: '3-5 Hours',
  level4: '5-8 Hours',
  level5: '8-10 Hours',
  level6: '10+ Hours',
};

export function getCalendarLevel(hours) {
  if (hours <= 0) return 'none';
  if (hours < 1) return 'level1';
  if (hours < 3) return 'level2';
  if (hours < 5) return 'level3';
  if (hours < 8) return 'level4';
  if (hours < 10) return 'level5';
  return 'level6';
}

export const ACHIEVEMENT_DEFS = [
  { key: 'first_session', name: 'First Study Session', icon: '🚀', description: 'Complete your first study session' },
  { key: 'streak_7', name: '7 Days Streak', icon: '🔥', description: 'Study for 7 consecutive days' },
  { key: 'streak_30', name: '30 Days Streak', icon: '🔥', description: 'Study for 30 consecutive days' },
  { key: 'hours_100', name: '100 Hours', icon: '⏰', description: 'Reach 100 total study hours' },
  { key: 'hours_500', name: '500 Hours', icon: '⏰', description: 'Reach 500 total study hours' },
  { key: 'hours_1000', name: '1000 Hours', icon: '⏰', description: 'Reach 1000 total study hours' },
  { key: 'react_master', name: 'React Master', icon: '⚛️', description: 'Study React for 50+ hours' },
  { key: 'node_beginner', name: 'Node Beginner', icon: '🟢', description: 'Study Node.js for 10+ hours' },
  { key: 'tailwind_expert', name: 'Tailwind Expert', icon: '🎨', description: 'Study Tailwind for 25+ hours' },
];

export const KEYBOARD_SHORTCUTS = {
  'Ctrl+K': 'Search',
  'Ctrl+T': 'Timer',
  'Ctrl+D': 'Dashboard',
  'Space': 'Start/Pause Timer',
};

export function formatHours(hours) {
  const totalMinutes = Math.round(Number(hours || 0) * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const APP_TIME_ZONE = 'Asia/Kabul';
export const AFGHAN_MONTHS = [
  'حمل',
  'ثور',
  'جوزا',
  'سرطان',
  'اسد',
  'سنبله',
  'میزان',
  'عقرب',
  'قوس',
  'جدی',
  'دلو',
  'حوت',
];

export const AFGHAN_WEEKDAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
];

function toAfghanistanMidnight(dateString) {
  return new Date(`${dateString}T00:00:00+04:30`);
}

function normalizeDateValue(value = new Date()) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return toAfghanistanMidnight(value.slice(0, 10));
  }
  return value instanceof Date ? value : new Date(value);
}

function utcDateString(year, monthIndex, day) {
  const date = new Date(Date.UTC(year, monthIndex, day));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function compareAfghanDates(a, b) {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

export function getAfghanDateParts(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
    timeZone: APP_TIME_ZONE,
    numberingSystem: 'latn',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(normalizeDateValue(value));
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

export function afghanToGregorianDate(year, month, day) {
  const target = { year: Number(year), month: Number(month), day: Number(day) };
  const start = new Date(Date.UTC(target.year + 621, 2, 1));

  for (let offset = 0; offset < 400; offset += 1) {
    const candidate = new Date(start);
    candidate.setUTCDate(start.getUTCDate() + offset);
    const candidateDate = utcDateString(
      candidate.getUTCFullYear(),
      candidate.getUTCMonth(),
      candidate.getUTCDate()
    );
    const parts = getAfghanDateParts(candidateDate);
    const comparison = compareAfghanDates(parts, target);
    if (comparison === 0) return candidateDate;
    if (comparison > 0) break;
  }

  throw new Error(`Invalid Afghan date: ${year}-${month}-${day}`);
}

export function shiftGregorianDate(dateString, days) {
  const [year, month, day] = String(dateString).split('-').map(Number);
  return utcDateString(year, month - 1, day + days);
}

export function formatLocalDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const { year, month, day } = values;
  return `${year}-${month}-${day}`;
}

export function formatLocalTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: APP_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.hour}:${values.minute}:${values.second}`;
}

export function formatAfghanNumericDate(value = new Date()) {
  const { year, month, day } = getAfghanDateParts(value);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatAfghanDate(value = new Date(), { weekday = false, includeYear = false } = {}) {
  const { year, month, day } = getAfghanDateParts(value);
  const date = `${day} ${AFGHAN_MONTHS[month - 1]}${includeYear ? ` ${year}` : ''}`;
  if (!weekday) return date;

  const weekdayName = new Intl.DateTimeFormat('fa-AF', {
    timeZone: APP_TIME_ZONE,
    weekday: 'long',
  }).format(normalizeDateValue(value));
  return `${weekdayName}، ${date}`;
}

export function formatAfghanMonth(year, month, { includeYear = false } = {}) {
  return `${AFGHAN_MONTHS[Number(month) - 1]}${includeYear ? ` ${year}` : ''}`;
}

export function getCurrentAfghanYear(value = new Date()) {
  return getAfghanDateParts(value).year;
}

export function getAfghanMonthLength(year, month) {
  const startDate = afghanToGregorianDate(year, month, 1);
  const nextMonthDate = Number(month) === 12
    ? afghanToGregorianDate(Number(year) + 1, 1, 1)
    : afghanToGregorianDate(year, Number(month) + 1, 1);
  return Math.round((new Date(`${nextMonthDate}T00:00:00Z`) - new Date(`${startDate}T00:00:00Z`)) / 86400000);
}

export function getSaturdayFirstDayIndex(gregorianDate) {
  const day = new Date(`${gregorianDate}T00:00:00Z`).getUTCDay();
  return (day + 1) % 7;
}
