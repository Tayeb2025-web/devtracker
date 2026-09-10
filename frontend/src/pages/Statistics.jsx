import { useState, useEffect, useMemo } from 'react';
import { statsApi } from '../services/api';
import { Card, LoadingSpinner, StatCard } from '../components/ui';
import { LineChart, BarChartComponent, PieChartComponent } from '../components/Charts';
import { AFGHAN_MONTHS, formatAfghanDate, formatHours } from '../constants';
import { HiOutlineChartBar, HiOutlineTrendingUp, HiOutlineTrendingDown, HiOutlineCode, HiOutlineSparkles } from 'react-icons/hi';

const PERIODS = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
];

function ensureContinuousDailyData(data) {
  if (!data || data.length < 2) return data || [];

  const result = [];
  const parseItem = (item) => {
    const match = String(item.label || '').trim().match(/^(\d+)\s+(.+)$/);
    if (!match) return null;
    const day = parseInt(match[1], 10);
    const monthName = match[2].trim();
    const monthIndex = AFGHAN_MONTHS.indexOf(monthName);
    return { day, monthName, monthIndex };
  };

  for (let i = 0; i < data.length; i++) {
    const currItem = data[i];
    const curr = parseItem(currItem);
    result.push(currItem);

    if (i < data.length - 1) {
      const nextItem = data[i + 1];
      const next = parseItem(nextItem);
      if (curr && next && curr.monthName === next.monthName && curr.monthIndex !== -1) {
        let missingDay = curr.day + 1;
        while (missingDay < next.day) {
          result.push({
            label: `${missingDay} ${curr.monthName}`,
            hours: 0,
          });
          missingDay++;
        }
      }
    }
  }

  return result;
}

export default function Statistics() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('daily');
  const [chartType, setChartType] = useState('line');

  useEffect(() => {
    statsApi.get().then(res => setStats(res.data)).finally(() => setLoading(false));
  }, []);

  const rawChartData = stats?.charts?.[period] || [];

  const chartData = useMemo(() => {
    if (period === 'daily') {
      return ensureContinuousDailyData(rawChartData);
    }
    return rawChartData;
  }, [rawChartData, period]);

  if (loading) return <LoadingSpinner />;
  if (!stats) return <div className="text-center py-16 text-text-muted">Failed to load statistics</div>;

  const techData = stats.techDistribution.filter(t => parseFloat(t.hours) > 0);

  return (
    <div className="space-y-7">
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <HiOutlineSparkles size={16} />
          <span>Analytics</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Study Statistics</h1>
        <p className="text-text-muted text-xs sm:text-sm mt-1">Deep dive into your programming study patterns & trends</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Average Hours/Day" value={formatHours(stats.averageHours)} icon={HiOutlineChartBar} color="primary" />
        <StatCard title="Focus Score" value={`${stats.focusScore}%`} icon={HiOutlineTrendingUp} color="accent" />
        <StatCard title="Best Day" value={stats.bestDay ? formatHours(parseFloat(stats.bestDay.hours)) : '—'} subtitle={stats.bestDay ? formatAfghanDate(stats.bestDay.session_date) : ''} icon={HiOutlineTrendingUp} color="accent" />
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
              Lowest study day: <strong dir="rtl" className="inline-block text-right font-bold text-text">{formatAfghanDate(stats.worstDay.session_date)}</strong> — {formatHours(parseFloat(stats.worstDay.hours))}
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}