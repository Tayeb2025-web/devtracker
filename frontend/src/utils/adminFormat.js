export function formatAdminNumber(value) {
  const number = Number(value);
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(Number.isFinite(number) ? number : 0);
}

export function formatAdminDate(value, options = { year: 'numeric', month: 'short', day: 'numeric' }) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fa-IR', options).format(date);
}
