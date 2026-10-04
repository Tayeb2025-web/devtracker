import { useState } from 'react';
import { HiOutlineCursorClick } from 'react-icons/hi';
import { formatAdminDate, formatAdminNumber } from '../../utils/adminFormat';
import { AdminEmptyState } from './AdminUI';

export default function AdminStudyChart({ data = [], label = 'روند مطالعه در ۱۴ روز اخیر' }) {
  const [selectedDate, setSelectedDate] = useState(null);
  if (!data.length) return <AdminEmptyState title="هنوز جلسه‌ای برای نمایش در این بازه ثبت نشده است." />;
  const maxHours = Math.max(0, ...data.map(item => Number(item.hours) || 0));
  const selected = data.find(item => item.date === selectedDate) || data[data.length - 1];
  return <div className="min-w-0">
    <div className="admin-chart-summary">
      <p aria-live="polite" className="admin-chart-selected"><strong>{formatAdminNumber(selected.hours)}</strong><span>ساعت</span><span>· {formatAdminDate(selected.date, { month: 'short', day: 'numeric' })}</span><span>· {formatAdminNumber(selected.sessions)} جلسه</span></p>
      <p className="admin-chart-max">بیشترین مطالعه <strong>{formatAdminNumber(maxHours)}</strong> ساعت</p>
    </div>
    <div className="admin-chart-scroll" role="region" aria-label={label} tabIndex={0}>
      <div className="admin-chart" dir="ltr">{data.map((item, index) => {
        const hours = Math.max(0, Number(item.hours) || 0);
        const isSelected = selected.date === item.date;
        const date = formatAdminDate(item.date, { month: 'short', day: 'numeric' });
        return <button type="button" key={item.date} className="admin-chart-column" aria-pressed={isSelected} aria-label={`${date}، ${formatAdminNumber(hours)} ساعت، ${formatAdminNumber(item.sessions)} جلسه`} onClick={() => setSelectedDate(item.date)} onFocus={() => setSelectedDate(item.date)}>
          <span className="admin-chart-track"><span className={`admin-chart-bar ${index === data.length - 1 ? 'is-latest' : ''} ${isSelected ? 'is-selected' : ''}`} style={{ height: `${maxHours ? hours / maxHours * 100 : 0}%` }} /></span>
          <span className={`admin-chart-date ${isSelected ? 'text-primary' : 'text-text-muted'}`} dir="rtl">{date}</span>
        </button>;
      })}</div>
    </div>
    <div className="admin-chart-legend"><span><i aria-hidden="true" />ساعات مطالعه</span><span><HiOutlineCursorClick size={13} />یک روز را برای جزئیات انتخاب کنید</span></div>
  </div>;
}
