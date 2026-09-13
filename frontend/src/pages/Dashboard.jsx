import { lazy, Suspense, useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineCalendar, HiOutlineClock, HiOutlineFire, HiOutlineTrendingUp,
  HiOutlineStar, HiOutlinePlus, HiOutlineSparkles, HiOutlineLightningBolt,
  HiOutlineBookOpen, HiOutlineChevronDown, HiOutlineLogin, HiOutlineUserAdd,
} from 'react-icons/hi';
import { dashboardApi, technologyApi, projectApi, sessionApi } from '../services/api';
import { StatCard, Card, ProgressBar, LoadingSpinner, Badge, Modal, Button, Input, Select, Textarea } from '../components/ui';
import { formatAfghanDate, formatHours, formatLocalDate, formatLocalTime, DEFAULT_TECH_LIST } from '../constants';
import { useAuth } from '../contexts/AuthContextStore';
import { useToast } from '../contexts/ToastContextStore';
import { useCalendar } from '../contexts/CalendarContextStore';

const GoalConfetti = lazy(() => import('../components/Charts').then(module => ({ default: module.GoalConfetti })));

const DEFAULT_GUEST_DATA = {
  hours: { today: 0, week: 0, month: 0, year: 0, total: 0 },
  goal: { target: 2, completed: false },
  streak: { current: 0, longest: 0 },
  level: { current: 1, title: 'Junior Dev', xp: 0, nextLevelXp: 100 },
  todayTechnologies: [],
  todayDate: { gregorian: new Date().toISOString() },
  quote: {
    text: "The secret of getting ahead is getting started.",
    author: "Mark Twain",
  },
  recentActivities: [],
};

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const { calendar, setCalendar, calendarOptions, formatDate } = useCalendar();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [technologies, setTechnologies] = useState(DEFAULT_TECH_LIST);
  const [projects, setProjects] = useState([]);
  const [logMinutes, setLogMinutes] = useState('60');
  const [logTechId, setLogTechId] = useState('');
  const [logProjectId, setLogProjectId] = useState('');
  const [logNote, setLogNote] = useState('');
  const [logSaving, setLogSaving] = useState(false);
  const [calendarMenuOpen, setCalendarMenuOpen] = useState(false);
  const calendarMenuRef = useRef(null);

  useEffect(() => {
    if (!calendarMenuOpen) return;
    const handleClickOutside = (e) => {
      if (calendarMenuRef.current && !calendarMenuRef.current.contains(e.target)) {
        setCalendarMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [calendarMenuOpen]);

  const loadDashboard = async () => {
    if (!user) {
      setData(DEFAULT_GUEST_DATA);
      setTechnologies(DEFAULT_TECH_LIST);
      setLoading(false);
      return;
    }
    try {
      const res = await dashboardApi.get();
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    if (user) {
      Promise.all([technologyApi.getAll(), projectApi.getAll()]).then(([t, p]) => {
        setTechnologies(t.data && t.data.length ? t.data : DEFAULT_TECH_LIST);
        setProjects(p.data || []);
      }).catch(() => {});
    }

    window.addEventListener('devtracker-session-saved', loadDashboard);
    return () => window.removeEventListener('devtracker-session-saved', loadDashboard);
  }, [user]);

  const handleQuickLog = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.info('برای ثبت دستی زمان مطالعه و دریافت امتیاز، لطفاً وارد حساب خود شوید.');
      setLogModalOpen(false);
      return;
    }
    const mins = parseInt(logMinutes, 10);
    if (!mins || mins < 1) {
      toast.warning('Session duration must be at least 1 minute');
      return;
    }
    if (!logTechId && !logProjectId) {
      toast.warning('Select a technology or project');
      return;
    }
    setLogSaving(true);
    try {
      const now = new Date();
      const res = await sessionApi.create({
        technology_id: logTechId || null,
        project_id: logProjectId || null,
        session_date: formatLocalDate(now),
        start_time: formatLocalTime(now),
        end_time: formatLocalTime(now),
        duration_minutes: mins,
        duration_hours: Number((mins / 60).toFixed(4)),
        note: logNote.trim() || null,
      });
      toast.success(`Logged ${mins}m session! +${res.data?.xpEarned || 0} XP earned`);
      setLogModalOpen(false);
      setLogNote('');
      loadDashboard();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLogSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className="text-center py-16 text-text-muted">Failed to load dashboard</div>;

  const { hours, goal, streak, level, todayTechnologies, todayDate, quote, recentActivities } = data;
  const todayFormatted = formatDate(todayDate?.gregorian || new Date(), { weekday: true });
  const userName = user?.display_name || user?.username || 'Developer';

  return (
    <div className="space-y-7">
      {goal.completed && (
        <Suspense fallback={null}>
          <GoalConfetti show />
        </Suspense>
      )}

      {/* Header Banner */}
      <div className="animate-fade-in relative z-30 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <HiOutlineSparkles size={16} />
            <span>Overview</span>
          </div>
          <h1 className="text-2xl font-extrabold sm:text-3xl tracking-tight">
            {user ? (
              <>Welcome back, <span className="gradient-text">{userName}</span></>
            ) : (
              <>Welcome to <span className="gradient-text">Codelume</span></>
            )}
          </h1>
          <p className="text-text-muted text-xs sm:text-sm mt-1">Track your daily programming progress and stay on target.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {!user && (
            <Link
              to="/login"
              className="flex items-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-indigo-600/25 transition-all active:scale-95 cursor-pointer"
            >
              <HiOutlineLogin size={17} />
              <span>Sign in / Login</span>
            </Link>
          )}
          <Button onClick={() => setLogModalOpen(true)} className="shadow-lg shadow-indigo-500/20">
            <HiOutlinePlus size={18} /> Quick Log
          </Button>
          <div ref={calendarMenuRef} className="relative z-40 self-start sm:self-auto">
            <div
              onClick={() => setCalendarMenuOpen(prev => !prev)}
              className="group flex items-center gap-3 rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 px-4 py-2.5 shadow-lg shadow-indigo-500/5 backdrop-blur-md cursor-pointer hover:border-indigo-500/40 hover:bg-surface-lighter/50 transition-all select-none"
              title="برای تغییر نوع تقویم کلیک کنید"
            >
              <div className="relative rounded-xl bg-indigo-500/15 p-2 text-indigo-400 transition-transform group-hover:scale-105">
                <HiOutlineCalendar size={20} />
                <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-indigo-600 text-[8px] font-bold text-white shadow ring-1 ring-surface">
                  {calendar === 'afghan' && '🇦🇫'}
                  {calendar === 'iranian' && '🇮🇷'}
                  {calendar === 'gregorian' && '🌐'}
                </span>
              </div>

              <div dir={calendar === 'gregorian' ? 'ltr' : 'rtl'} className="text-right">
                <p className="text-sm font-bold text-text group-hover:text-indigo-300 transition-colors">
                  {todayFormatted}
                </p>
                <div className="flex items-center gap-1 text-[11px] text-indigo-400/80 font-medium">
                  <span>
                    {calendar === 'afghan' && 'تقویم افغانستان'}
                    {calendar === 'iranian' && 'تقویم ایران'}
                    {calendar === 'gregorian' && 'تقویم میلادی'}
                  </span>
                  <HiOutlineChevronDown size={12} className={`transition-transform duration-200 ${calendarMenuOpen ? 'rotate-180 text-indigo-400' : ''}`} />
                </div>
              </div>
            </div>

            {/* Custom Dropdown Menu */}
            {calendarMenuOpen && (
              <div
                dir="rtl"
                style={{ backgroundColor: 'var(--color-surface-light, #0f1219)', opacity: 1 }}
                className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2.5 z-50 w-64 rounded-2xl border border-indigo-500/40 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.85)] animate-scale-in space-y-1"
              >
                <div className="px-3 py-2 border-b border-border/70 flex items-center justify-between text-xs font-bold text-text-muted">
                  <span>سیستم تقویم</span>
                  <span className="text-[10px] text-indigo-400 font-normal">انتخاب کنید</span>
                </div>
                {calendarOptions.map((opt) => {
                  const isSelected = calendar === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCalendar(opt.value);
                        setCalendarMenuOpen(false);
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setCalendar(opt.value);
                        setCalendarMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                          : 'text-text hover:bg-surface-lighter hover:text-white'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-surface-lighter text-sm border border-border/80">
                          {opt.value === 'afghan' && '🇦🇫'}
                          {opt.value === 'iranian' && '🇮🇷'}
                          {opt.value === 'gregorian' && '🌐'}
                        </span>
                        <span className="text-sm font-bold">{opt.label}</span>
                      </span>
                      {isSelected && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-indigo-600 text-xs font-black">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guest Mode Welcome Banner */}
      {!user && (
        <div className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/15 via-violet-500/10 to-purple-500/15 p-5 sm:p-6 shadow-xl backdrop-blur-md animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600/20 text-indigo-400 ring-1 ring-indigo-500/30 shadow-lg">
                <HiOutlineSparkles size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-base sm:text-lg font-black text-text">
                    شما در حالت مهمان وارد شده‌اید
                  </h2>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                    Guest Mode
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-text-muted leading-relaxed">
                  می‌توانید تایمر یا استاپ‌واچ را اجرا کرده و آزادانه در برنامه فعالیت کنید. برای ذخیره دائمی آمار، دریافت امتیاز (XP)، استریک روزانه و لول‌آپ، وارد حساب کاربری خود شوید.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/25 transition-all active:scale-95 cursor-pointer"
              >
                <HiOutlineLogin size={16} />
                <span>ورود به حساب</span>
              </Link>
              <Link
                to="/signup"
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface-lighter hover:bg-surface-light border border-border text-text text-xs sm:text-sm font-bold transition-all active:scale-95 cursor-pointer"
              >
                <HiOutlineUserAdd size={16} className="text-indigo-400" />
                <span>ثبت‌نام رایگان</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Hours Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard title="Today" value={formatHours(hours.today)} icon={HiOutlineClock} color="primary" delay={1} />
        <StatCard title="This Week" value={formatHours(hours.week)} icon={HiOutlineTrendingUp} color="accent" delay={2} />
        <StatCard title="This Month" value={formatHours(hours.month)} icon={HiOutlineClock} color="purple" delay={3} />
        <StatCard title="This Year" value={formatHours(hours.year)} icon={HiOutlineClock} color="yellow" delay={4} />
        <StatCard title="Total" value={formatHours(hours.total)} icon={HiOutlineStar} color="primary" delay={5} />
      </div>

      {/* Main Widgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Goal Widget */}
        <Card className="animate-fade-in opacity-0 stagger-2 flex flex-col justify-between" style={{ animationFillMode: 'forwards' }}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base flex items-center gap-2">
                <HiOutlineClock className="text-indigo-400" />
                Daily Goal
              </h3>
              {goal.completed && <Badge color="accent">Completed!</Badge>}
            </div>
            <ProgressBar value={hours.today} max={goal.target} color={goal.completed ? 'accent' : 'primary'} height="h-3" />
          </div>
          <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-xs text-text-muted">
            <span>Target: {goal.target}h per day</span>
            <span className="font-bold text-text">{formatHours(hours.today)} logged</span>
          </div>
        </Card>

        {/* Streak & Level XP */}
        <Card className="animate-fade-in opacity-0 stagger-3" style={{ animationFillMode: 'forwards' }}>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
              <div className="flex items-center gap-2 mb-2">
                <HiOutlineFire className="text-amber-400" size={20} />
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Streak</span>
              </div>
              <p className="text-2xl font-extrabold text-amber-400">{streak.current} <span className="text-xs font-normal text-text-muted">days</span></p>
              <p className="text-[11px] text-text-muted mt-1">Best: {streak.longest} days</p>
            </div>
            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/15">
              <div className="flex items-center gap-2 mb-2">
                <HiOutlineLightningBolt className="text-indigo-400" size={20} />
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">Level {level.current}</span>
              </div>
              <p className="text-2xl font-extrabold text-indigo-400">{level.xp} <span className="text-xs font-normal text-text-muted">XP</span></p>
              <div className="mt-2">
                <ProgressBar value={level.xp} max={level.xpToNext} showLabel={false} height="h-1.5" />
              </div>
            </div>
          </div>
        </Card>

        {/* Daily Motivation Quote */}
        <Card className="animate-fade-in opacity-0 stagger-4 flex flex-col justify-between" style={{ animationFillMode: 'forwards' }}>
          <div>
            <div className="flex items-center gap-2 mb-3">
              <HiOutlineBookOpen className="text-violet-400" />
              <h3 className="font-bold text-base">Daily Motivation</h3>
            </div>
            <blockquote className="text-xs text-text-muted italic leading-relaxed font-medium pl-3 border-l-2 border-indigo-500/40">
              "{quote.text}"
            </blockquote>
          </div>
          <p className="text-xs font-semibold text-indigo-400 mt-4 text-right">— {quote.author}</p>
        </Card>
      </div>

      {/* Lower Section: Technologies & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Technologies */}
        <Card>
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Today's Technologies
          </h3>
          {todayTechnologies.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted border border-dashed border-border rounded-xl">
              No study sessions today yet. Start the focus timer!
            </div>
          ) : (
            <div className="space-y-3">
              {todayTechnologies.map(tech => (
                <div key={tech.name} className="flex items-center justify-between p-3 rounded-xl bg-surface-lighter/40 border border-border/60">
                  <div className="flex items-center gap-3">
                    <div className="w-3.5 h-3.5 rounded-full ring-2 ring-white/10" style={{ backgroundColor: tech.color }} />
                    <span className="text-xs font-bold">{tech.name}</span>
                  </div>
                  <Badge color="primary">{formatHours(tech.hours)}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Activities */}
        <Card>
          <h3 className="font-bold text-base mb-4 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            Recent Activities
          </h3>
          {recentActivities.length === 0 ? (
            <div className="py-8 text-center text-xs text-text-muted border border-dashed border-border rounded-xl">
              No recent study activities found
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentActivities.map(activity => (
                <div key={activity.id} className="flex items-center justify-between p-3 rounded-xl bg-surface-lighter/40 border border-border/60 hover:border-primary/30 transition-all">
                  <div>
                    <p className="text-xs font-bold">{activity.project_name || activity.technology_name || 'Study session'}</p>
                    <p dir={calendar === 'gregorian' ? 'ltr' : 'rtl'} className="text-right text-[11px] text-text-muted mt-0.5">
                      {formatDate(activity.session_date)} · {activity.start_time?.slice(0, 5)}
                    </p>
                  </div>
                  <Badge color="accent">{formatHours(parseFloat(activity.duration_hours))}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Modal isOpen={logModalOpen} onClose={() => setLogModalOpen(false)} title="Quick Log Study Session" size="sm">
        <form onSubmit={handleQuickLog} className="space-y-4">
          <Input
            label="Duration (minutes)"
            type="number"
            min="1"
            max="1440"
            value={logMinutes}
            onChange={e => setLogMinutes(e.target.value)}
          />
          <Select
            label="Technology"
            options={[{ value: '', label: 'Select technology...' }, ...technologies.map(t => ({ value: t.id, label: t.name }))]}
            value={logTechId}
            onChange={e => setLogTechId(e.target.value)}
          />
          <Select
            label="Project"
            options={[{ value: '', label: 'Select project...' }, ...projects.map(p => ({ value: p.id, label: p.name }))]}
            value={logProjectId}
            onChange={e => setLogProjectId(e.target.value)}
          />
          <Textarea
            label="Focus Note (optional)"
            rows={2}
            placeholder="What did you study or accomplish?"
            value={logNote}
            onChange={e => setLogNote(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setLogModalOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={logSaving}>{logSaving ? 'Logging…' : 'Save Session'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
