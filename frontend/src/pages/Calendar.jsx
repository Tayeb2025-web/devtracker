import { useState, useEffect } from 'react';
import { sessionApi } from '../services/api';
import { Card, LoadingSpinner, StatCard, Modal, Badge } from '../components/ui';
import ContributionCalendar from '../components/ContributionCalendar';
import { HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineSparkles, HiOutlineCalendar, HiOutlineClock, HiOutlineFire } from 'react-icons/hi';
import { afghanToGregorianDate, getCurrentAfghanYear, shiftGregorianDate, formatAfghanDate, formatHours } from '../constants';

export default function CalendarPage() {
  const currentAfghanYear = getCurrentAfghanYear();
  const [year, setYear] = useState(currentAfghanYear);
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);
  const [daySessions, setDaySessions] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const loadCalendar = async () => {
      setLoading(true);
      setError('');
      try {
        const startDate = afghanToGregorianDate(year, 1, 1);
        const endDate = shiftGregorianDate(afghanToGregorianDate(year + 1, 1, 1), -1);
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
  }, [year]);

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
        <div className="flex items-center gap-3 self-start sm:self-auto rounded-2xl bg-surface-lighter/60 border border-border p-1.5 backdrop-blur-md">
          <button onClick={() => setYear(y => y - 1)} className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-lighter transition-all">
            <HiOutlineChevronLeft size={20} />
          </button>
          <span className="font-extrabold text-sm min-w-[60px] text-center font-mono">{year}</span>
          <button
            onClick={() => setYear(y => y + 1)}
            disabled={year >= currentAfghanYear}
            className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-lighter transition-all disabled:opacity-30"
          >
            <HiOutlineChevronRight size={20} />
          </button>
        </div>
      </div>

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
