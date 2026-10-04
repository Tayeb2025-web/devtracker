import { useState } from 'react';
import { formatAdminDate, formatAdminNumber } from '../../utils/adminFormat';

export default function AdminStudyChart({ data = [], label = 'روند مطالعه در ۱۴ روز اخیر' }) {
  const [selectedDate, setSelectedDate] = useState(null);
  if (!data.length) return <p className="py-12 text-center text-sm text-text-muted">هنوز جلسه‌ای برای نمایش در این بازه ثبت نشده است.</p>;
  const maxHours = Math.max(0, ...data.map(item => Number(item.hours) || 0));
  const selected = data.find(item => item.date === selectedDate) || data[data.length - 1];
  return (
    <div className="min-w-0">
      <p aria-live="polite" className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted"><span>{formatAdminDate(selected.date, { month: 'short', day: 'numeric' })}</span><strong className="text-text">{formatAdminNumber(selected.hours)} ساعت</strong><span>{formatAdminNumber(selected.sessions)} جلسه</span><span className="sm:ms-auto">بیشترین مطالعه: {formatAdminNumber(maxHours)} ساعت</span></p>
      <div className="admin-chart-scroll" role="region" aria-label={label} tabIndex={0}>
        <div className="admin-chart" dir="ltr">
          {data.map((item, index) => {
            const hours = Math.max(0, Number(item.hours) || 0);
            const height = maxHours ? hours / maxHours * 100 : 0;
            const isSelected = selected.date === item.date;
            const date = formatAdminDate(item.date, { month: 'short', day: 'numeric' });
            return <button type="button" key={item.date} className="admin-chart-column" aria-pressed={isSelected} aria-label={`${date}، ${formatAdminNumber(hours)} ساعت، ${formatAdminNumber(item.sessions)} جلسه`} onClick={() => setSelectedDate(item.date)} onFocus={() => setSelectedDate(item.date)}><span className="admin-chart-track"><span className={`admin-chart-bar ${index === data.length - 1 ? 'is-latest' : ''} ${isSelected ? 'is-selected' : ''}`} style={{ height: `${height}%` }} /></span><span className={`admin-chart-date ${isSelected ? 'text-primary' : 'text-text-muted'}`} dir="rtl">{date}</span></button>;
          })}
        </div>
      </div>
      <p className="mt-3 text-xs text-text-muted">برای دیدن جزئیات، یک روز را انتخاب کنید.</p>
    </div>
  );
}
