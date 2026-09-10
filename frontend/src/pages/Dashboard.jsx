import { lazy, Suspense, useState, useEffect } from 'react';
import { HiOutlineCalendar, HiOutlineClock, HiOutlineFire, HiOutlineTrendingUp, HiOutlineStar, HiOutlinePlus, HiOutlineSparkles, HiOutlineLightningBolt, HiOutlineBookOpen } from 'react-icons/hi';
import { dashboardApi, technologyApi, projectApi, sessionApi } from '../services/api';
import { StatCard, Card, ProgressBar, LoadingSpinner, Badge, Modal, Button, Input, Select, Textarea } from '../components/ui';
import { formatAfghanDate, formatHours, formatLocalDate, formatLocalTime } from '../constants';
import { useAuth } from '../contexts/AuthContextStore';
import { useToast } from '../contexts/ToastContextStore';

const GoalConfetti = lazy(() => import('../components/Charts').then(module => ({ default: module.GoalConfetti })));

export default function Dashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [technologies, setTechnologies] = useState([]);
  const [projects, setProjects] = useState([]);
  const [logMinutes, setLogMinutes] = useState('60');
  const [logTechId, setLogTechId] = useState('');
  const [logProjectId, setLogProjectId] = useState('');
  const [logNote, setLogNote] = useState('');
  const [logSaving, setLogSaving] = useState(false);

  useEffect(() => {
    loadDashboard();
    Promise.all([technologyApi.getAll(), projectApi.getAll()]).then(([t, p]) => {
      setTechnologies(t.data || []);
      setProjects(p.data || []);
    }).catch(() => {});

    window.addEventListener('devtracker-session-saved', loadDashboard);
    return () => window.removeEventListener('devtracker-session-saved', loadDashboard);
  }, []);

  const handleQuickLog = async (e) => {
    e.preventDefault();
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

  const loadDashboard = async () => {
    try {
      const res = await dashboardApi.get();
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!data) return <div className="text-center py-16 text-text-muted">Failed to load dashboard</div>;

  const { hours, goal, streak, level, todayTechnologies, todayDate, quote, recentActivities } = data;
  const afghanToday = formatAfghanDate(todayDate?.gregorian || new Date(), { weekday: true });
  const userName = user?.display_name || user?.username || 'Developer';

  return (
    <div className="space-y-7">
      {goal.completed && (
        <Suspense fallback={null}>
          <GoalConfetti show />
        </Suspense>
      )}

      {/* Header Banner */}
      <div className="animate-fade-in flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <HiOutlineSparkles size={16} />
            <span>Overview</span>
          </div>
          <h1 className="text-2xl font-extrabold sm:text-3xl tracking-tight">
            Welcome back, <span className="gradient-text">{userName}</span>
          </h1>
          <p className="text-text-muted text-xs sm:text-sm mt-1">Track your daily programming progress and stay on target.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={() => setLogModalOpen(true)} className="shadow-lg shadow-indigo-500/20">
            <HiOutlinePlus size={18} /> Quick Log
          </Button>
          <div className="self-start rounded-2xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 px-4 py-3 shadow-lg shadow-indigo-500/5 sm:self-auto backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-indigo-500/15 p-2 text-indigo-400">
                <HiOutlineCalendar size={20} />
              </div>
              <div dir="rtl" className="text-right">
                <p className="text-sm font-bold text-text">{afghanToday}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                    <p dir="rtl" className="text-right text-[11px] text-text-muted mt-0.5">
                      {formatAfghanDate(activity.session_date)} · {activity.start_time?.slice(0, 5)}
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
