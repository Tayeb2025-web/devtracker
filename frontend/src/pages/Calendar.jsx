import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { sessionApi } from '../services/api';
import { Card, LoadingSpinner, StatCard, Modal, Badge } from '../components/ui';
import ContributionCalendar from '../components/ContributionCalendar';
import { HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineSparkles, HiOutlineCalendar, HiOutlineClock, HiOutlineFire } from 'react-icons/hi';
import { afghanToGregorianDate, shiftGregorianDate, formatHours } from '../constants';
import { useCalendar } from '../contexts/CalendarContextStore';
import { useAuth } from '../contexts/AuthContextStore';

export default function CalendarPage() {
  const { user } = useAuth();
  const { calendar, setCalendar, calendarOptions, getCurrentYear } = useCalendar();
  const currentYear = getCurrentYear(new Date());
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);
  const [daySessions, setDaySessions] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    setYear(getCurrentYear(new Date()));
  }, [calendar, getCurrentYear]);

  useEffect(() => {
    let active = true;
    const loadCalendar = async () => {
      setLoading(true);
      setError('');
      if (!user) {
        if (active) {
          setData({});
          setLoading(false);
        }
        return;
      }
      try {
        const isGregorian = calendar === 'gregorian';
        const startDate = isGregorian
          ? `${year}-01-01`
          : afghanToGregorianDate(year, 1, 1);
        const endDate = isGregorian
          ? `${year}-12-31`
          : shiftGregorianDate(afghanToGregorianDate(year + 1, 1, 1), -1);
        const response = await sessionApi.getAll({ startDate, endDate });
        const calendarData = (response.data || []).reduce((days, session) => {
          const date = session.session_date;
          const current = days[date] || { date, hours: 0, sessions: 0, technologies: new Set() };
          current.hours += Number(session.duration_hours || 0);
          current.sessions += 1;
          const focusName = session.project_name || session.technology_name;
          if (focusName) current.technologies.add(focusName);
          days[date] = current;
          return days;
        }, {});
        Object.values(calendarData).forEach(day => { day.hours = Number(day.hours.toFixed(4)); day.technologies = [...day.technologies].join(', '); });
        if (active) setData(calendarData);
      } catch (loadError) {
        if (active) { setData({}); setError(loadError.message || 'Could not load study sessions.'); }
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadCalendar();
    return () => { active = false; };
  }, [year, calendar, user]);

  const handleSelectDay = async (day) => {
    setSelectedDay(day);
    setModalLoading(true);
    try {
      const res = await sessionApi.getAll({ date: day.date });
      setDaySessions(res.data || []);
    } catch {
      setDaySessions([]);
    } finally {
      setModalLoading(false);
    }
  };

  const totalHours = Object.values(data).reduce((sum, d) => sum + (d.hours || 0), 0);
  const activeDays = Object.values(data).filter(d => d.hours > 0).length;

  return (
    <div className="space-y-7">
      <div className="animate-fade-in flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <HiOutlineSparkles size={16} />
            <span>Activity Graph</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Contribution Calendar</h1>
          <p className="text-text-muted text-xs sm:text-sm mt-1">GitHub-style activity graph for your study sessions (click any cell to view sessions)</p>
        </div>
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
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

          <div className="flex items-center gap-1.5 rounded-2xl bg-surface-lighter/60 border border-border p-1.5 backdrop-blur-md">
            <button onClick={() => setYear(y => y - 1)} className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-lighter transition-all">
              <HiOutlineChevronLeft size={18} />
            </button>
            <span className="font-extrabold text-sm min-w-[55px] text-center font-mono">{year}</span>
            <button
              onClick={() => setYear(y => y + 1)}
              disabled={year >= currentYear}
              className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-lighter transition-all disabled:opacity-30"
            >
              <HiOutlineChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Guest Banner */}
      {!user && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-indigo-500/25 bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-indigo-500/10 p-4 text-xs text-indigo-300 animate-fade-in text-center sm:text-right" dir="rtl">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
            <span>تقویم در حالت مهمان. برای پر رنگ شدن روزهای مطالعه در تقویم گیت‌هابی، وارد حساب خود شوید.</span>
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
        <StatCard title="Total Hours" value={`${totalHours.toFixed(1)}h`} icon={HiOutlineClock} color="primary" />
        <StatCard title="Active Days" value={activeDays} icon={HiOutlineFire} color="accent" />
        <StatCard title="Avg Hours/Day" value={`${activeDays > 0 ? (totalHours / activeDays).toFixed(1) : 0}h`} icon={HiOutlineCalendar} color="purple" />
        <StatCard title="Target Year" value={year} icon={HiOutlineSparkles} color="yellow" />
      </div>

      <Card className="animate-fade-in overflow-hidden p-5 sm:p-7">
        {loading ? <LoadingSpinner /> : (
          <>
            {error && <p className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs font-medium text-red-400">{error}</p>}
            <ContributionCalendar data={data} year={year} onSelectDay={handleSelectDay} />
          </>
        )}
      </Card>

      <Modal isOpen={Boolean(selectedDay)} onClose={() => setSelectedDay(null)} title={selectedDay ? `Sessions on ${selectedDay.displayDate}` : 'Date sessions'} size="sm">
        {modalLoading ? <LoadingSpinner /> : daySessions.length === 0 ? (
          <div className="py-8 text-center text-xs text-text-muted">No study sessions recorded on this date.</div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {daySessions.map(session => (
              <div key={session.id} className="p-3.5 rounded-xl bg-surface-lighter/40 border border-border/60 flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-xs">{session.project_name || session.technology_name || 'Study Session'}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">{session.start_time?.slice(0, 5)} — {session.end_time?.slice(0, 5)}</p>
                  {session.note && <p className="text-[11px] text-text-muted mt-1 italic">"{session.note}"</p>}
                </div>
                <Badge color="accent">{formatHours(parseFloat(session.duration_hours))}</Badge>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
