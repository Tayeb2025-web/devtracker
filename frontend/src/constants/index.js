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
  ABOUT: '/about',
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

export const DEFAULT_CHALLENGES = [
  {
    challenge_key: '7_days',
    challenge_name: '7 Days Streak',
    challenge_description: 'Study consistently for 7 consecutive days',
    target_value: 7,
    unit: 'days',
    icon: '🔥',
  },
  {
    challenge_key: '30_days',
    challenge_name: '30 Days Challenge',
    challenge_description: 'Study every day for 30 consecutive days',
    target_value: 30,
    unit: 'days',
    icon: '⚡',
  },
  {
    challenge_key: '50_hours',
    challenge_name: '50 Hours Milestone',
    challenge_description: 'Reach 50 hours of total study time',
    target_value: 50,
    unit: 'hours',
    icon: '⏳',
  },
  {
    challenge_key: '100_hours',
    challenge_name: '100 Hours Challenge',
    challenge_description: 'Complete 100 hours of focused study',
    target_value: 100,
    unit: 'hours',
    icon: '🎯',
  },
  {
    challenge_key: '250_hours',
    challenge_name: '250 Hours Deep Diver',
    challenge_description: 'Reach 250 hours of total study time',
    target_value: 250,
    unit: 'hours',
    icon: '🚀',
  },
  {
    challenge_key: '365_days',
    challenge_name: '365 Days Challenge',
    challenge_description: 'Study every day for a full year',
    target_value: 365,
    unit: 'days',
    icon: '👑',
  },
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

export const CALENDAR_TYPES = {
  AFGHAN: 'afghan',
  IRANIAN: 'iranian',
  GREGORIAN: 'gregorian',
};

export const CALENDAR_OPTIONS = [
  { value: 'afghan', label: 'تقویم افغانستان', shortLabel: 'تقویم افغانستان', flag: '🇦🇫' },
  { value: 'iranian', label: 'تقویم ایران', shortLabel: 'تقویم ایران', flag: '🇮🇷' },
  { value: 'gregorian', label: 'تقویم میلادی', shortLabel: 'تقویم میلادی', flag: '🌐' },
];

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

export const IRANIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const GREGORIAN_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const GREGORIAN_MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
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

export const IRANIAN_WEEKDAYS = AFGHAN_WEEKDAYS;

export const GREGORIAN_WEEKDAYS = [
  'Saturday',
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
];

export const GREGORIAN_WEEKDAYS_SHORT = [
  'Sat',
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
];

let currentCalendarType = typeof window !== 'undefined'
  ? (localStorage.getItem('devtracker-calendar-type') || 'afghan')
  : 'afghan';

export function getGlobalCalendarType() {
  return currentCalendarType;
}

export function setGlobalCalendarType(type) {
  if (['afghan', 'iranian', 'gregorian'].includes(type)) {
    currentCalendarType = type;
    if (typeof window !== 'undefined') {
      localStorage.setItem('devtracker-calendar-type', type);
      window.dispatchEvent(new CustomEvent('devtracker-calendar-changed', { detail: type }));
    }
  }
}

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

export function getGregorianDateParts(value = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
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

export function getDateParts(value = new Date(), calendar = currentCalendarType) {
  if (calendar === 'gregorian') {
    return getGregorianDateParts(value);
  }
  return getAfghanDateParts(value);
}

export function getMonthNames(calendar = currentCalendarType) {
  if (calendar === 'iranian') return IRANIAN_MONTHS;
  if (calendar === 'gregorian') return GREGORIAN_MONTHS;
  return AFGHAN_MONTHS;
}

export function getShortMonthNames(calendar = currentCalendarType) {
  if (calendar === 'gregorian') return GREGORIAN_MONTHS_SHORT;
  return getMonthNames(calendar);
}

export function getWeekdayNames(calendar = currentCalendarType) {
  if (calendar === 'gregorian') return GREGORIAN_WEEKDAYS;
  return AFGHAN_WEEKDAYS;
}

export function getShortWeekdayNames(calendar = currentCalendarType) {
  if (calendar === 'gregorian') return GREGORIAN_WEEKDAYS_SHORT;
  return ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
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

export function formatDate(value = new Date(), { weekday = false, includeYear = false, calendar = currentCalendarType } = {}) {
  const targetCal = calendar || currentCalendarType;

  if (targetCal === 'gregorian') {
    const { year, month, day } = getGregorianDateParts(value);
    const date = `${day} ${GREGORIAN_MONTHS[month - 1]}${includeYear ? ` ${year}` : ''}`;
    if (!weekday) return date;
    const weekdayName = new Intl.DateTimeFormat('en-US', {
      timeZone: APP_TIME_ZONE,
      weekday: 'long',
    }).format(normalizeDateValue(value));
    return `${weekdayName}, ${date}`;
  }

  const { year, month, day } = getAfghanDateParts(value);
  const months = targetCal === 'iranian' ? IRANIAN_MONTHS : AFGHAN_MONTHS;
  const locale = targetCal === 'iranian' ? 'fa-IR' : 'fa-AF';
  const date = `${day} ${months[month - 1]}${includeYear ? ` ${year}` : ''}`;
  if (!weekday) return date;

  const weekdayName = new Intl.DateTimeFormat(locale, {
    timeZone: APP_TIME_ZONE,
    weekday: 'long',
  }).format(normalizeDateValue(value));
  return `${weekdayName}، ${date}`;
}

export function formatAfghanDate(value = new Date(), options = {}) {
  return formatDate(value, { calendar: currentCalendarType, ...options });
}

export function formatMonth(year, month, { includeYear = false, calendar = currentCalendarType } = {}) {
  const targetCal = calendar || currentCalendarType;
  const months = getMonthNames(targetCal);
  return `${months[Number(month) - 1]}${includeYear ? ` ${year}` : ''}`;
}

export function formatAfghanMonth(year, month, options = {}) {
  return formatMonth(year, month, { calendar: currentCalendarType, ...options });
}

export function getCurrentYear(value = new Date(), calendar = currentCalendarType) {
  const targetCal = calendar || currentCalendarType;
  if (targetCal === 'gregorian') {
    return getGregorianDateParts(value).year;
  }
  return getAfghanDateParts(value).year;
}

export function getCurrentAfghanYear(value = new Date()) {
  return getCurrentYear(value, currentCalendarType);
}

export function getAfghanMonthLength(year, month) {
  const startDate = afghanToGregorianDate(year, month, 1);
  const nextMonthDate = Number(month) === 12
    ? afghanToGregorianDate(Number(year) + 1, 1, 1)
    : afghanToGregorianDate(year, Number(month) + 1, 1);
  return Math.round((new Date(`${nextMonthDate}T00:00:00Z`) - new Date(`${startDate}T00:00:00Z`)) / 86400000);
}

export function getMonthLength(year, month, calendar = currentCalendarType) {
  const targetCal = calendar || currentCalendarType;
  if (targetCal === 'gregorian') {
    return new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
  }
  return getAfghanMonthLength(year, month);
}

export function getSaturdayFirstDayIndex(gregorianDate) {
  const day = new Date(`${gregorianDate}T00:00:00Z`).getUTCDay();
  return (day + 1) % 7;
}

/**
 * Formats a timestamp into human-readable relative activity time (Persian).
 */
export function formatLastSeen(dateInput) {
  if (!dateInput) return 'مدتی پیش';
  const timestamp = new Date(dateInput).getTime();
  if (Number.isNaN(timestamp)) return 'مدتی پیش';

  const diffMs = Date.now() - timestamp;
  if (diffMs < 0) return 'right now';

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return 'recently';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago `;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} along time ago `;
}
