import {
  AFGHAN_MONTHS,
  IRANIAN_MONTHS,
  GREGORIAN_MONTHS,
  afghanToGregorianDate,
  formatDate,
  formatAfghanDate,
  formatLocalDate,
  getAfghanDateParts,
  getGregorianDateParts,
  getDateParts,
  getAfghanMonthLength,
  getMonthLength,
  getMonthNames,
  getCurrentYear,
  getCurrentAfghanYear,
} from '../../constants';
import { useCalendar } from '../../contexts/CalendarContextStore';

export function Card({ children, className = '', hover = false, glass = true }) {
  return (
    <div className={`rounded-2xl p-4 sm:p-5 ${glass ? 'glass' : 'bg-surface-light border border-border'} ${hover ? 'transition-all duration-300 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-0.5' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ title, value, subtitle, icon: Icon, color = 'primary', delay = 0 }) {
  const colorMap = {
    primary: { icon: 'text-primary', bg: 'bg-primary/10', ring: 'ring-primary/20' },
    accent: { icon: 'text-accent', bg: 'bg-accent/10', ring: 'ring-accent/20' },
    yellow: { icon: 'text-amber-400', bg: 'bg-amber-400/10', ring: 'ring-amber-400/20' },
    purple: { icon: 'text-violet-400', bg: 'bg-violet-400/10', ring: 'ring-violet-400/20' },
  };
  const c = colorMap[color] || colorMap.primary;

  return (
    <Card hover className={`animate-fade-in opacity-0 stagger-${Math.min(delay, 5)} group`} style={{ animationDelay: `${delay * 0.06}s`, animationFillMode: 'forwards' }}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-text-muted text-xs font-semibold uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-extrabold mt-2 tracking-tight">{value}</p>
          {subtitle && <p className="text-text-muted text-xs mt-1.5">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${c.bg} ${c.icon} ring-1 ${c.ring} transition-transform duration-300 group-hover:scale-110`}>
            <Icon size={20} />
          </div>
        )}
      </div>
    </Card>
  );
}

export function ProgressBar({ value, max = 100, color = 'primary', showLabel = true, height = 'h-2' }) {
  const pct = Math.min((value / max) * 100, 100);
  const gradients = {
    primary: 'bg-gradient-to-r from-indigo-500 to-violet-500',
    accent: 'bg-gradient-to-r from-emerald-500 to-teal-400',
  };
  const colorClass = gradients[color] || gradients.primary;

  return (
    <div>
      {showLabel && (
        <div className="flex justify-between text-xs text-text-muted mb-1.5 font-medium">
          <span>{Math.round(pct)}%</span>
          <span>{value}/{max}</span>
        </div>
      )}
      <div className={`w-full ${height} bg-surface-lighter rounded-full overflow-hidden`}>
        <div
          className={`${height} ${colorClass} rounded-full transition-all duration-700 ease-out relative ${pct > 0 ? 'progress-shimmer' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function Button({ children, variant = 'primary', size = 'md', className = '', disabled, ...props }) {
  const variants = {
    primary: 'bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30',
    accent: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/20',
    outline: 'border border-border hover:border-primary/40 text-text hover:bg-surface-lighter/80 hover:shadow-lg hover:shadow-primary/5',
    ghost: 'text-text-muted hover:text-text hover:bg-surface-lighter',
    danger: 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20 hover:border-red-500/40',
  };
  const sizes = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3 text-base',
  };

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-250 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.97] ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({ label, className = '', ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs text-text-muted font-semibold uppercase tracking-wider">{label}</label>}
      <input
        className={`w-full px-3.5 py-2.5 rounded-xl bg-surface-lighter/80 border border-border text-text text-sm placeholder:text-text-muted/60 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 focus:bg-surface-lighter transition-all duration-200 ${className}`}
        {...props}
      />
    </div>
  );
}

export function Select({ label, options, className = '', ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs text-text-muted font-semibold uppercase tracking-wider">{label}</label>}
      <select
        className={`w-full px-3.5 py-2.5 rounded-xl bg-surface-lighter/80 border border-border text-text text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-all duration-200 ${className}`}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export function Textarea({ label, className = '', ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-xs text-text-muted font-semibold uppercase tracking-wider">{label}</label>}
      <textarea
        className={`w-full px-3.5 py-2.5 rounded-xl bg-surface-lighter/80 border border-border text-text text-sm placeholder:text-text-muted/60 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-all duration-200 resize-none ${className}`}
        {...props}
      />
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-5xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-md" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl p-5 glass animate-scale-in sm:p-7`}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text p-1.5 rounded-xl hover:bg-surface-lighter transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8"/></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({ isOpen, onClose, onConfirm, title, message }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-text-muted mb-6 text-sm leading-relaxed">{message}</p>
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="ghost" className="w-full sm:w-auto" onClick={onClose}>Cancel</Button>
        <Button variant="danger" className="w-full sm:w-auto" onClick={() => { onConfirm(); onClose(); }}>Confirm</Button>
      </div>
    </Modal>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
      {Icon && (
        <div className="p-5 rounded-2xl bg-surface-lighter/60 mb-5 ring-1 ring-border">
          <Icon size={36} className="text-text-muted" />
        </div>
      )}
      <h3 className="text-lg font-bold mb-1.5">{title}</h3>
      <p className="text-text-muted text-sm max-w-sm mb-5 leading-relaxed">{description}</p>
      {action}
    </div>
  );
}

export function LoadingSpinner({ size = 'md' }) {
  const sizes = { sm: 'w-5 h-5', md: 'w-9 h-9', lg: 'w-14 h-14' };
  return (
    <div className="flex items-center justify-center py-16">
      <div className={`${sizes[size]} rounded-full border-2 border-primary/20 border-t-primary animate-spin`} />
    </div>
  );
}

export function Badge({ children, color = 'primary' }) {
  const colors = {
    primary: 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/20',
    accent: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/20',
    yellow: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/20',
    gray: 'bg-surface-lighter text-text-muted ring-1 ring-border',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-semibold ${colors[color]}`}>
      {children}
    </span>
  );
}

export function AfghanDateInput({ label, value, onChange, max = null, minYear, maxYear, allowEmpty = false }) {
  let calendar = 'afghan';
  try {
    const calendarContext = useCalendar();
    if (calendarContext?.calendar) calendar = calendarContext.calendar;
  } catch {
    // Fallback if rendered outside provider
  }

  const isGregorian = calendar === 'gregorian';
  const currentYear = getCurrentYear(new Date(), calendar);
  const selected = getDateParts(value || formatLocalDate(), calendar);
  const maxParts = max ? getDateParts(max, calendar) : null;
  const firstYear = Math.min(minYear ?? currentYear - 10, selected.year);
  const lastYear = Math.max(maxYear ?? maxParts?.year ?? currentYear + 1, selected.year);
  const years = Array.from({ length: lastYear - firstYear + 1 }, (_, index) => firstYear + index).reverse();
  const monthLength = getMonthLength(selected.year, selected.month, calendar);
  const days = Array.from({ length: monthLength }, (_, index) => index + 1);
  const monthNames = getMonthNames(calendar);

  const setDate = (updates) => {
    const next = { ...selected, ...updates };
    const maxDay = getMonthLength(next.year, next.month, calendar);
    next.day = Math.min(next.day, maxDay);

    let nextDate;
    if (isGregorian) {
      nextDate = `${next.year}-${String(next.month).padStart(2, '0')}-${String(next.day).padStart(2, '0')}`;
    } else {
      nextDate = afghanToGregorianDate(next.year, next.month, next.day);
    }
    if (max && nextDate > max) nextDate = max;
    onChange(nextDate);
  };

  if (allowEmpty && !value) {
    return (
      <div className="space-y-1.5">
        {label && <label className="text-xs text-text-muted font-semibold uppercase tracking-wider">{label}</label>}
        <button
          type="button"
          onClick={() => onChange(formatLocalDate())}
          className="w-full px-3.5 py-2.5 rounded-xl bg-surface-lighter/80 border border-border text-left text-text-muted text-sm hover:text-text hover:border-primary/40 transition-all duration-200"
        >
          Select date
        </button>
        <p className="text-xs text-text-muted">No date selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        {label && <label className="text-xs text-text-muted font-semibold uppercase tracking-wider">{label}</label>}
        {allowEmpty && (
          <button type="button" onClick={() => onChange('')} className="text-xs text-text-muted hover:text-text transition-colors">
            Clear
          </button>
        )}
      </div>
      <div className="grid grid-cols-[1fr_1.25fr_1fr] gap-2">
        <select
          className="w-full px-3 py-2.5 rounded-xl bg-surface-lighter/80 border border-border text-text text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-all"
          value={selected.day}
          onChange={event => setDate({ day: Number(event.target.value) })}
        >
          {days.map(day => <option key={day} value={day}>{day}</option>)}
        </select>
        <select
          className="w-full px-3 py-2.5 rounded-xl bg-surface-lighter/80 border border-border text-text text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-all"
          value={selected.month}
          onChange={event => setDate({ month: Number(event.target.value) })}
        >
          {monthNames.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
        </select>
        <select
          className="w-full px-3 py-2.5 rounded-xl bg-surface-lighter/80 border border-border text-text text-sm focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-all"
          value={selected.year}
          onChange={event => setDate({ year: Number(event.target.value) })}
        >
          {years.map(year => <option key={year} value={year}>{year}</option>)}
        </select>
      </div>
      <p className="text-xs text-text-muted">{formatDate(value || formatLocalDate(), { weekday: true, calendar })}</p>
    </div>
  );
}

export const DateInput = AfghanDateInput;
