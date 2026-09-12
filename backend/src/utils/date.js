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

function getAfghanistanDateParts(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  return Object.fromEntries(parts.map(part => [part.type, part.value]));
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

export function getAfghanDateParts(value = new Date()) {
  const date = normalizeDateValue(value);
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
    timeZone: APP_TIME_ZONE,
    numberingSystem: 'latn',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
  };
}

function compareAfghanDates(a, b) {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

function utcDateString(year, monthIndex, day) {
  const date = new Date(Date.UTC(year, monthIndex, day));
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
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

export function formatAfghanNumericDate(value = new Date()) {
  const { year, month, day } = getAfghanDateParts(value);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function formatAfghanDate(value = new Date(), { includeYear = false } = {}) {
  const { year, month, day } = getAfghanDateParts(value);
  return `${day} ${AFGHAN_MONTHS[month - 1]}${includeYear ? ` ${year}` : ''}`;
}

export function formatAfghanMonth(year, month, { includeYear = false } = {}) {
  return `${AFGHAN_MONTHS[Number(month) - 1]}${includeYear ? ` ${year}` : ''}`;
}

export function formatLocalDate(value = new Date()) {
  const { year, month, day } = getAfghanistanDateParts(value);
  return `${year}-${month}-${day}`;
}

export function shiftLocalDate(dateString, days) {
  const [year, month, day] = String(dateString).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  const shiftedYear = date.getUTCFullYear();
  const shiftedMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const shiftedDay = String(date.getUTCDate()).padStart(2, '0');
  return `${shiftedYear}-${shiftedMonth}-${shiftedDay}`;
}

export function getLocalYear(value = new Date()) {
  return getAfghanDateParts(value).year;
}

export function getLocalMonthStart(value = new Date()) {
  const { year, month } = getAfghanDateParts(value);
  return afghanToGregorianDate(year, month, 1);
}

export function getLocalYearStart(value = new Date()) {
  const { year } = getAfghanDateParts(value);
  return afghanToGregorianDate(year, 1, 1);
}

export function getLocalWeekRange(value = new Date()) {
  const today = formatLocalDate(value);
  const dayOfWeek = new Date(`${today}T00:00:00.000Z`).getUTCDay();
  const daysSinceSaturday = (dayOfWeek + 1) % 7;
  return {
    startDate: shiftLocalDate(today, -daysSinceSaturday),
    endDate: today,
  };
}
