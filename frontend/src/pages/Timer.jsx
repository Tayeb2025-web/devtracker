import { useEffect, useState } from 'react';
import {
  HiOutlinePlay, HiOutlinePause, HiOutlineStop, HiOutlineRefresh,
  HiOutlineClock, HiOutlineBell, HiOutlinePlus, HiOutlineTrash,
  HiOutlineBookmark, HiOutlineSparkles, HiOutlineVolumeUp, HiOutlineVolumeOff,
} from 'react-icons/hi';
import { useTimer } from '../contexts/TimerContextStore';
import { useToast } from '../contexts/ToastContextStore';
import { projectApi, technologyApi, sessionApi } from '../services/api';
import { Card, Button, Input, Select, Textarea, LoadingSpinner, Modal } from '../components/ui';
import { formatDuration, formatLocalDate, formatLocalTime } from '../constants';
import { ambientSound } from '../utils/audioUtils';

const CUSTOM_TIMERS_KEY = 'devtracker-custom-timers';

const getDurationParts = (seconds) => ({
  hours: Math.floor(seconds / 3600),
  minutes: Math.floor((seconds % 3600) / 60),
});

const getDurationSeconds = (hours, minutes) => {
  const safeHours = Math.max(0, parseInt(hours, 10) || 0);
  const safeMinutes = Math.min(59, Math.max(0, parseInt(minutes, 10) || 0));
  return (safeHours * 60 + safeMinutes) * 60;
};

const loadCustomTimers = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(CUSTOM_TIMERS_KEY) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

export default function TimerPage() {
  const toast = useToast();
  const stopwatch = useTimer();
  const countdown = stopwatch.countdown;
  const [mode, setMode] = useState('timer');
  const [technologies, setTechnologies] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const initialDuration = getDurationParts(countdown.totalSeconds);
  const [hours, setHours] = useState(String(initialDuration.hours));
  const [minutes, setMinutes] = useState(String(initialDuration.minutes));
  const [customTimers, setCustomTimers] = useState(loadCustomTimers);
  const [customLabel, setCustomLabel] = useState('');
  const [customHours, setCustomHours] = useState('0');
  const [customMinutes, setCustomMinutes] = useState('25');
  const [customTechnologyId, setCustomTechnologyId] = useState('');
  const [customProjectId, setCustomProjectId] = useState('');
  const [ambientType, setAmbientType] = useState('off');
  const [ambientVolume, setAmbientVolume] = useState(0.3);

  // Quick Log modal state
  const [logModalOpen, setLogModalOpen] = useState(false);
  const [logMinutes, setLogMinutes] = useState('60');
  const [logTechId, setLogTechId] = useState('');
  const [logProjectId, setLogProjectId] = useState('');
  const [logNote, setLogNote] = useState('');
  const [logSaving, setLogSaving] = useState(false);

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
      window.dispatchEvent(new Event('devtracker-session-saved'));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLogSaving(false);
    }
  };

  const handleAmbientChange = (type) => {
    setAmbientType(type);
    ambientSound.play(type, ambientVolume);
  };

  const handleVolumeChange = (v) => {
    const vol = parseFloat(v);
    setAmbientVolume(vol);
    ambientSound.setVolume(vol);
  };

  useEffect(() => {
    return () => {
      ambientSound.stop();
    };
  }, []);

  useEffect(() => {
    let active = true;

    Promise.all([technologyApi.getAll(), projectApi.getAll()])
      .then(([techResponse, projectResponse]) => {
        if (!active) return;
        setTechnologies(techResponse.data || []);
        setProjects(projectResponse.data || []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!countdown.isIdle) return;
    const next = getDurationParts(countdown.totalSeconds);
    setHours(String(next.hours));
    setMinutes(String(next.minutes));
  }, [countdown.isIdle, countdown.totalSeconds]);

  useEffect(() => {
    localStorage.setItem(CUSTOM_TIMERS_KEY, JSON.stringify(customTimers));
  }, [customTimers]);

  if (loading) return <LoadingSpinner />;

  const techOptions = technologies.map(t => ({ value: String(t.id), label: t.name }));
  const projectOptions = projects.map(project => ({ value: String(project.id), label: project.name }));
  const getEnteredDuration = () => getDurationSeconds(hours, minutes);
  const syncCountdownDuration = () => {
    const value = getEnteredDuration();
    if (value >= 60) countdown.setDuration(value);
    return value;
  };
  const startCountdown = () => countdown.start(syncCountdownDuration());
  const getTechnologyName = (technologyId) => (
    technologies.find(technology => String(technology.id) === String(technologyId))?.name || 'Technology'
  );
  const getProjectName = (projectId) => (
    projects.find(project => String(project.id) === String(projectId))?.name || 'Project'
  );

  const addCustomTimer = () => {
    const label = customLabel.trim();
    const totalSeconds = getDurationSeconds(customHours, customMinutes);
    const technologyId = customTechnologyId ? String(customTechnologyId) : null;
    const projectId = customProjectId ? String(customProjectId) : null;

    if (!label) {
      toast.warning('Add a label for this timer first');
      return;
    }
    if (totalSeconds < 60) {
      toast.warning('Custom timer must be at least 1 minute');
      return;
    }
    if (!technologyId && !projectId) {
      toast.warning('Please select a technology or project for this timer');
      return;
    }

    setCustomTimers(current => [
      {
        id: `${Date.now()}`,
        label,
        totalSeconds,
        technologyId,
        projectId,
      },
      ...current,
    ]);
    setCustomLabel('');
    toast.success('Custom timer added');
  };

  const startCustomTimer = (timer) => {
    if (!countdown.isIdle) {
      toast.warning('Reset or finish the current timer first');
      return;
    }

    const note = `Custom timer: ${timer.label}`;
    countdown.start(timer.totalSeconds, {
      technologyId: timer.technologyId,
      projectId: timer.projectId,
      note,
    });
  };

  const removeCustomTimer = (timerId) => {
    setCustomTimers(current => current.filter(timer => timer.id !== timerId));
  };

  // Progress for countdown ring
  const countdownPct = countdown.totalSeconds > 0
    ? (countdown.remainingSeconds / countdown.totalSeconds) * 100
    : 100;

  return (
    <div className="max-w-4xl mx-auto space-y-7">
      <div className="animate-fade-in flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <HiOutlineSparkles size={16} />
            <span>Focus Zone</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Focus Clock</h1>
          <p className="text-text-muted text-xs sm:text-sm mt-1">Set a study timer, track an open-ended session, or quick log time</p>
        </div>

        <Button onClick={() => setLogModalOpen(true)} className="shadow-lg shadow-indigo-500/20 self-start sm:self-auto shrink-0">
          <HiOutlinePlus size={18} /> Quick Log
        </Button>
      </div>


      {/* Mode Switcher Pills */}
      <div className="flex rounded-2xl bg-surface-lighter/60 border border-border p-1.5 gap-1.5 backdrop-blur-md max-w-md mx-auto" role="tablist">
        <button
          type="button"
          onClick={() => setMode('timer')}
          className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all duration-200 ${mode === 'timer' ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25' : 'text-text-muted hover:text-text hover:bg-surface-lighter'}`}
        >
          <HiOutlineBell size={18} /> Focus Timer
        </button>
        <button
          type="button"
          onClick={() => setMode('stopwatch')}
          className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-xs font-bold transition-all duration-200 ${mode === 'stopwatch' ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/25' : 'text-text-muted hover:text-text hover:bg-surface-lighter'}`}
        >
          <HiOutlineClock size={18} /> Stopwatch
        </button>
      </div>

      {mode === 'timer' ? (
        <Card className="animate-fade-in text-center py-10 sm:py-12 border-indigo-500/20">
          {/* Quick Pomodoro Presets */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-6">
            <button
              type="button"
              disabled={!countdown.isIdle}
              onClick={() => { setHours('0'); setMinutes('25'); countdown.setDuration(25 * 60); }}
              className="px-3.5 py-1.5 rounded-full bg-surface-lighter/80 hover:bg-indigo-500/20 hover:text-indigo-400 border border-border text-xs font-bold transition-all disabled:opacity-50"
            >
              ⚡ 25m Focus
            </button>
            <button
              type="button"
              disabled={!countdown.isIdle}
              onClick={() => { setHours('0'); setMinutes('5'); countdown.setDuration(5 * 60); }}
              className="px-3.5 py-1.5 rounded-full bg-surface-lighter/80 hover:bg-emerald-500/20 hover:text-emerald-400 border border-border text-xs font-bold transition-all disabled:opacity-50"
            >
              ☕ 5m Break
            </button>
            <button
              type="button"
              disabled={!countdown.isIdle}
              onClick={() => { setHours('0'); setMinutes('15'); countdown.setDuration(15 * 60); }}
              className="px-3.5 py-1.5 rounded-full bg-surface-lighter/80 hover:bg-amber-500/20 hover:text-amber-400 border border-border text-xs font-bold transition-all disabled:opacity-50"
            >
              🌴 15m Long Break
            </button>
            <button
              type="button"
              disabled={!countdown.isIdle}
              onClick={() => { setHours('1'); setMinutes('0'); countdown.setDuration(60 * 60); }}
              className="px-3.5 py-1.5 rounded-full bg-surface-lighter/80 hover:bg-violet-500/20 hover:text-violet-400 border border-border text-xs font-bold transition-all disabled:opacity-50"
            >
              🚀 60m Deep Work
            </button>
          </div>

          {/* Circular / Large Timer Display */}
          <div className="relative flex items-center justify-center my-4">
            <div className={`relative flex flex-col items-center justify-center p-8 sm:p-10 rounded-full border border-border/80 bg-surface-lighter/30 backdrop-blur-md transition-all duration-500 ${countdown.isRunning ? 'ring-4 ring-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.2)]' : ''}`}>
              <div className={`text-5xl sm:text-7xl font-mono font-extrabold tracking-wider ${countdown.isRunning ? 'gradient-text animate-pulse' : 'text-text'}`}>
                {formatDuration(countdown.remainingSeconds)}
              </div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mt-2">
                {countdown.isRunning ? 'Focusing...' : countdown.isPaused ? 'Paused' : 'Ready'}
              </p>
            </div>
          </div>

          {/* Ambient Focus Audio Controls */}
          <div className="max-w-md mx-auto mb-8 p-3 rounded-2xl bg-surface-lighter/40 border border-border/60 backdrop-blur-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-text-muted font-semibold">
              {ambientType === 'off' ? <HiOutlineVolumeOff size={18} /> : <HiOutlineVolumeUp size={18} className="text-indigo-400 animate-pulse" />}
              <span>Ambient Noise:</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[
                { id: 'off', label: 'Off' },
                { id: 'rain', label: '🌧️ Rain' },
                { id: 'waves', label: '🌊 Waves' },
                { id: 'whitenoise', label: '📻 White Noise' },
              ].map(item => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleAmbientChange(item.id)}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${ambientType === item.id ? 'bg-indigo-500 text-white shadow-sm' : 'text-text-muted hover:text-text hover:bg-surface-lighter'}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            {ambientType !== 'off' && (
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={ambientVolume}
                onChange={e => handleVolumeChange(e.target.value)}
                className="w-20 accent-indigo-500 cursor-pointer"
                title="Volume"
              />
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center gap-3 mb-10 flex-wrap">
            {countdown.isIdle && (
              <Button size="lg" onClick={startCountdown} className="min-w-[160px]">
                <HiOutlinePlay size={20} /> Start Timer
              </Button>
            )}
            {countdown.isRunning && (
              <>
                <Button size="lg" variant="outline" onClick={countdown.pause} className="min-w-[130px]">
                  <HiOutlinePause size={20} /> Pause
                </Button>
                <Button size="lg" variant="accent" onClick={countdown.stop} className="min-w-[160px]">
                  <HiOutlineStop size={20} /> Stop & Save
                </Button>
              </>
            )}
            {countdown.isPaused && (
              <>
                <Button size="lg" onClick={countdown.resume} className="min-w-[130px]">
                  <HiOutlinePlay size={20} /> Resume
                </Button>
                <Button size="lg" variant="accent" onClick={countdown.stop} className="min-w-[160px]">
                  <HiOutlineStop size={20} /> Save Time
                </Button>
              </>
            )}
            {!countdown.isIdle && (
              <Button size="lg" variant="ghost" onClick={countdown.reset} title="Reset timer">
                <HiOutlineRefresh size={20} />
              </Button>
            )}
          </div>

          {/* Form Settings */}
          <div className="max-w-md mx-auto space-y-4 text-left p-5 rounded-2xl bg-surface-lighter/30 border border-border/60">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Hours"
                type="number"
                min="0"
                inputMode="numeric"
                value={hours}
                onChange={e => setHours(e.target.value)}
                onBlur={syncCountdownDuration}
                disabled={!countdown.isIdle}
              />
              <Input
                label="Minutes"
                type="number"
                min="0"
                max="59"
                inputMode="numeric"
                value={minutes}
                onChange={e => setMinutes(e.target.value)}
                onBlur={syncCountdownDuration}
                disabled={!countdown.isIdle}
              />
            </div>
            <p className="text-[11px] text-text-muted -mt-1">When countdown reaches zero, your cat meows to alert you and time is logged 🐱🐾</p>
            <Select
              label="Technology (optional)"
              options={[{ value: '', label: 'Select technology...' }, ...techOptions]}
              value={countdown.technologyId ? String(countdown.technologyId) : ''}
              onChange={e => countdown.setTechnologyId(e.target.value || null)}
              disabled={!countdown.isIdle}
            />
            <Select
              label="Project (optional)"
              options={[{ value: '', label: 'Select project...' }, ...projectOptions]}
              value={countdown.projectId ? String(countdown.projectId) : ''}
              onChange={e => countdown.setProjectId(e.target.value || null)}
              disabled={!countdown.isIdle}
            />
            <Textarea
              label="Focus Note (optional)"
              placeholder="What specific topic or feature are you working on?"
              rows={2}
              value={countdown.note}
              onChange={e => countdown.setNote(e.target.value)}
              disabled={countdown.isRunning}
            />
          </div>

          {/* Custom Timers Section */}
          <div className="mt-10 border-t border-border/80 pt-7 text-left">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20">
                <HiOutlineBookmark size={20} />
              </div>
              <div>
                <h2 className="text-base font-bold">Custom Timers</h2>
                <p className="text-xs text-text-muted">Save your frequent study presets for quick 1-click access.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-6 p-4 rounded-2xl bg-surface-lighter/20 border border-border/50">
              <Input
                label="Label"
                type="text"
                value={customLabel}
                onChange={e => setCustomLabel(e.target.value)}
                placeholder="e.g. LeetCode Practice"
              />
              <Input
                label="Hours"
                type="number"
                min="0"
                inputMode="numeric"
                value={customHours}
                onChange={e => setCustomHours(e.target.value)}
              />
              <Input
                label="Minutes"
                type="number"
                min="0"
                max="59"
                inputMode="numeric"
                value={customMinutes}
                onChange={e => setCustomMinutes(e.target.value)}
              />
              <Select
                label="Technology"
                options={[{ value: '', label: 'Select technology...' }, ...techOptions]}
                value={customTechnologyId}
                onChange={e => setCustomTechnologyId(e.target.value)}
              />
              <Select
                label="Project"
                options={[{ value: '', label: 'Select project...' }, ...projectOptions]}
                value={customProjectId}
                onChange={e => setCustomProjectId(e.target.value)}
              />
              <div className="flex items-end">
                <Button onClick={addCustomTimer} className="w-full">
                  <HiOutlinePlus size={18} /> Add Preset
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {customTimers.length === 0 ? (
                <div className="sm:col-span-2 rounded-xl border border-dashed border-border bg-surface-lighter/30 px-4 py-6 text-center text-xs text-text-muted">
                  No custom timer presets saved yet.
                </div>
              ) : customTimers.map(timer => (
                <div key={timer.id} className="rounded-xl border border-border/80 bg-surface-lighter/40 p-4 hover:border-primary/30 transition-all">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-xs text-text">{timer.label}</p>
                      <p className="mt-0.5 text-[11px] text-text-muted">{timer.projectId ? getProjectName(timer.projectId) : getTechnologyName(timer.technologyId)}</p>
                    </div>
                    <div className="rounded-lg bg-indigo-500/15 px-2.5 py-1 text-xs font-bold text-indigo-300 ring-1 ring-indigo-500/20 font-mono">
                      {formatDuration(timer.totalSeconds)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => startCustomTimer(timer)}
                      disabled={!countdown.isIdle}
                      className="flex-1 py-1.5"
                    >
                      <HiOutlinePlay size={16} /> Start
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeCustomTimer(timer.id)}
                      title="Delete custom timer"
                    >
                      <HiOutlineTrash size={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : (
        <Card className="animate-fade-in text-center py-10 sm:py-12 border-indigo-500/20">
          <div className="relative flex items-center justify-center my-4">
            <div className={`relative flex flex-col items-center justify-center p-8 rounded-full border border-border/80 bg-surface-lighter/30 backdrop-blur-md transition-all duration-500 ${stopwatch.isRunning ? 'ring-4 ring-indigo-500/20 shadow-[0_0_50px_rgba(99,102,241,0.2)]' : ''}`}>
              <div className={`text-5xl sm:text-7xl font-mono font-extrabold tracking-wider ${stopwatch.isRunning ? 'gradient-text animate-pulse' : 'text-text'}`}>
                {formatDuration(stopwatch.seconds)}
              </div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mt-2">
                {stopwatch.isRunning ? 'Tracking...' : stopwatch.isPaused ? 'Paused' : 'Ready'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 mb-10 flex-wrap">
            {stopwatch.isIdle && (
              <Button size="lg" onClick={stopwatch.start} className="min-w-[180px]">
                <HiOutlinePlay size={20} /> Start Stopwatch
              </Button>
            )}
            {stopwatch.isRunning && (
              <>
                <Button size="lg" variant="outline" onClick={stopwatch.pause} className="min-w-[130px]">
                  <HiOutlinePause size={20} /> Pause
                </Button>
                <Button size="lg" variant="accent" onClick={stopwatch.stop} className="min-w-[160px]">
                  <HiOutlineStop size={20} /> Stop & Save
                </Button>
              </>
            )}
            {stopwatch.isPaused && (
              <>
                <Button size="lg" onClick={stopwatch.resume} className="min-w-[130px]">
                  <HiOutlinePlay size={20} /> Resume
                </Button>
                <Button size="lg" variant="accent" onClick={stopwatch.stop} className="min-w-[160px]">
                  <HiOutlineStop size={20} /> Save Time
                </Button>
              </>
            )}
            {!stopwatch.isIdle && (
              <Button size="lg" variant="ghost" onClick={stopwatch.reset} title="Reset stopwatch">
                <HiOutlineRefresh size={20} />
              </Button>
            )}
          </div>

          <div className="max-w-md mx-auto space-y-4 text-left p-5 rounded-2xl bg-surface-lighter/30 border border-border/60">
            <Select
              label="Technology (optional)"
              options={[{ value: '', label: 'Select technology...' }, ...techOptions]}
              value={stopwatch.technologyId ? String(stopwatch.technologyId) : ''}
              onChange={e => stopwatch.setTechnologyId(e.target.value || null)}
              disabled={!stopwatch.isIdle}
            />
            <Select
              label="Project (optional)"
              options={[{ value: '', label: 'Select project...' }, ...projectOptions]}
              value={stopwatch.projectId ? String(stopwatch.projectId) : ''}
              onChange={e => stopwatch.setProjectId(e.target.value || null)}
              disabled={!stopwatch.isIdle}
            />
            <Textarea
              label="Session Note (optional)"
              placeholder="What did you build or learn in this session?"
              rows={3}
              value={stopwatch.note}
              onChange={e => stopwatch.setNote(e.target.value)}
              disabled={stopwatch.isRunning}
            />
          </div>
        </Card>
      )}

      <Card className="animate-fade-in border-indigo-500/15">
        <h3 className="font-bold mb-1 text-xs text-indigo-400 uppercase tracking-wider">Reliable background timing</h3>
        <p className="text-xs leading-relaxed text-text-muted">Both tools use real timestamps instead of relying on browser ticks, so their time stays 100% precise when you switch tabs, minimize Chrome, or open another page in Codelume.</p>
      </Card>

      {/* Quick Log Modal */}
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
            options={[{ value: '', label: 'Select technology...' }, ...techOptions]}
            value={logTechId}
            onChange={e => setLogTechId(e.target.value)}
          />
          <Select
            label="Project"
            options={[{ value: '', label: 'Select project...' }, ...projectOptions]}
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
