import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { statsApi } from '../services/api';
import { Card, LoadingSpinner, StatCard } from '../components/ui';
import { LineChart, BarChartComponent, PieChartComponent } from '../components/Charts';
import { formatHours, formatDate, formatMonth, getGregorianDateParts, shiftGregorianDate } from '../constants';
import { useCalendar } from '../contexts/CalendarContextStore';
import { useAuth } from '../contexts/AuthContextStore';
import { HiOutlineChartBar, HiOutlineTrendingUp, HiOutlineTrendingDown, HiOutlineCode, HiOutlineSparkles } from 'react-icons/hi';

const PERIODS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

function formatChartItemLabel(item, period, calendar) {
  if (period === 'daily') {
    if (item.date) return formatDate(item.date, { calendar });
    return item.label;
  }
  if (period === 'weekly') {
    const d = item.startDate || item.date;
    if (d) {
      if (calendar === 'gregorian') return `Week of ${formatDate(d, { calendar })}`;
      return `هفته ${formatDate(d, { calendar })}`;
    }
    return item.label;
  }
  if (period === 'monthly') {
    if (calendar === 'gregorian') {
      if (item.date) {
        const { year, month } = getGregorianDateParts(item.date);
        return formatMonth(year, month, { calendar: 'gregorian' });
      }
      return item.label;
    }
    if (item.year && item.month) {
      return formatMonth(item.year, item.month, { calendar });
    }
    return item.label;
  }
  if (period === 'yearly') {
    if (calendar === 'gregorian' && item.date) {
      return String(getGregorianDateParts(item.date).year);
    }
    return item.year ? String(item.year) : item.label;
  }
  return item.label;
}

function ensureContinuousDailyData(data, calendar) {
  if (!data || data.length < 2) return data || [];

  const result = [];
  for (let i = 0; i < data.length; i++) {
    const currItem = data[i];
    result.push({
      ...currItem,
      label: currItem.date ? formatDate(currItem.date, { calendar }) : currItem.label,
    });

    if (i < data.length - 1 && currItem.date && data[i + 1].date) {
      let nextDate = shiftGregorianDate(currItem.date, 1);
      const targetDate = data[i + 1].date;
      while (nextDate < targetDate) {
        result.push({
          date: nextDate,
          label: formatDate(nextDate, { calendar }),
          hours: 0,
        });
        nextDate = shiftGregorianDate(nextDate, 1);
      }
    }
  }

  return result;
}

export default function Statistics() {
  const { user } = useAuth();
  const { calendar, setCalendar, calendarOptions, formatDate: formatUserDate } = useCalendar();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily');
  const [chartType, setChartType] = useState('line');

  const DEFAULT_GUEST_STATS = {
    averageHours: 0,
    focusScore: 0,
    bestDay: null,
    mostStudied: null,
    techDistribution: [],
    charts: { daily: [], weekly: [], monthly: [], yearly: [] },
  };

  useEffect(() => {
    if (!user) {
      setStats(DEFAULT_GUEST_STATS);
      setLoading(false);
      return;
    }
    statsApi.get()
      .then(res => setStats(res.data))
      .catch(() => setStats(DEFAULT_GUEST_STATS))
      .finally(() => setLoading(false));
  }, [user]);

  const rawChartData = stats?.charts?.[period] || [];

  const chartData = useMemo(() => {
    if (period === 'daily') {
      return ensureContinuousDailyData(rawChartData, calendar);
    }
    return rawChartData.map(item => ({
      ...item,
      label: formatChartItemLabel(item, period, calendar),
    }));
  }, [rawChartData, period, calendar]);

  if (loading) return <LoadingSpinner />;
  if (!stats) return <div className="text-center py-16 text-text-muted">Failed to load statistics</div>;

  const techData = (stats?.techDistribution || []).filter(t => parseFloat(t.hours) > 0);

  return (
    <div className="space-y-7">
      <div className="animate-fade-in flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <HiOutlineSparkles size={16} />
            <span>Analytics</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Study Statistics</h1>
          <p className="text-text-muted text-xs sm:text-sm mt-1">Deep dive into your programming study patterns & trends</p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <select
            value={calendar}
            onChange={(e) => setCalendar(e.target.value)}
            title="Change calendar system"
            className="bg-surface-lighter/80 border border-border rounded-xl px-3 py-2 text-xs font-bold text-text focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer hover:bg-surface-lighter transition-all"
          >
            {calendarOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.shortLabel}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Guest Banner */}
      {!user && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-indigo-500/25 bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-indigo-500/10 p-4 text-xs text-indigo-300 animate-fade-in text-center sm:text-right" dir="rtl">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
            <span>نمایش آمار در حالت مهمان. برای ذخیره جلسات مطالعه و تحلیل شخصی نمودارها وارد حساب شوید.</span>
          </div>
          <Link
            to="/login"
            className="shrink-0 font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-all active:scale-95"
          >
            ورود / ثبت‌نام
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Average Hours/Day" value={formatHours(stats.averageHours)} icon={HiOutlineChartBar} color="primary" />
        <StatCard title="Focus Score" value={`${stats.focusScore}%`} icon={HiOutlineTrendingUp} color="accent" />
        <StatCard title="Best Day" value={stats.bestDay ? formatHours(parseFloat(stats.bestDay.hours)) : '—'} subtitle={stats.bestDay ? formatUserDate(stats.bestDay.session_date) : ''} icon={HiOutlineTrendingUp} color="accent" />
        <StatCard title="Most Studied" value={stats.mostStudied?.name || '—'} subtitle={stats.mostStudied ? formatHours(parseFloat(stats.mostStudied.hours)) : ''} icon={HiOutlineCode} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="font-bold text-base">Study Hours Trend</h3>
            <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-surface-lighter/60 border border-border">
              {PERIODS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    period === p.key ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md' : 'text-text-muted hover:text-text'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2 mb-4">
            {['line', 'bar'].map(t => (
              <button
                key={t}
                onClick={() => setChartType(t)}
                className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-all ${
                  chartType === t ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-500/30' : 'text-text-muted hover:bg-surface-lighter'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {chartData.length === 0 ? (
            <p className="text-text-muted text-xs text-center py-16">No data recorded for this period</p>
          ) : chartType === 'line' ? (
            <LineChart data={chartData} />
          ) : (
            <BarChartComponent data={chartData} />
          )}
        </Card>

        <Card>
          <h3 className="font-bold text-base mb-4">Technology Distribution</h3>
          {techData.length === 0 ? (
            <p className="text-text-muted text-xs text-center py-16">No technology distribution data yet</p>
          ) : (
            <PieChartComponent data={techData} />
          )}
        </Card>
      </div>

      {stats.worstDay && (
        <Card className="border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/15 text-red-400">
              <HiOutlineTrendingDown size={20} />
            </div>
            <span className="text-xs font-medium">
              Lowest study day: <strong dir={calendar === 'gregorian' ? 'ltr' : 'rtl'} className="inline-block text-right font-bold text-text">{formatUserDate(stats.worstDay.session_date)}</strong> — {formatHours(parseFloat(stats.worstDay.hours))}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}