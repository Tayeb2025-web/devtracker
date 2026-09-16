import { useState, useEffect, useCallback, useRef } from 'react';
import { sessionApi } from '../services/api';
import { useToast } from './ToastContextStore';
import { formatLocalDate, formatLocalTime } from '../constants';
import { TimerContext } from './TimerContextStore';
import { playCompletionChime, startCatAlarm, stopCatAlarm } from '../utils/audioUtils';

const STORAGE_KEY = 'devtracker-time-tools';
const LEGACY_STORAGE_KEY = 'devtracker-timer';
const DEFAULT_COUNTDOWN_SECONDS = 25 * 60;

const elapsedSince = (baseSeconds, startedAt) => (
  baseSeconds + Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
);

export function TimerProvider({ children }) {
  const toast = useToast();
  const [restored, setRestored] = useState(false);

  // Stopwatch state. The timestamp is the source of truth while it is running,
  // so throttled browser timers cannot make the displayed time drift.
  const [seconds, setSeconds] = useState(0);
  const [status, setStatus] = useState('idle');
  const [technologyId, setTechnologyId] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [note, setNote] = useState('');
  const [startTime, setStartTime] = useState(null);
  const [sessionDate, setSessionDate] = useState(null);
  const [elapsedBeforeStart, setElapsedBeforeStart] = useState(0);
  const [startedAt, setStartedAt] = useState(null);

  // Countdown timer state. Its deadline lets it keep correct time even while
  // the tab is hidden, minimized, or temporarily suspended by the browser.
  const [countdownRemainingSeconds, setCountdownRemainingSeconds] = useState(DEFAULT_COUNTDOWN_SECONDS);
  const [countdownTotalSeconds, setCountdownTotalSeconds] = useState(DEFAULT_COUNTDOWN_SECONDS);
  const [countdownStatus, setCountdownStatus] = useState('idle');
  const [countdownTechnologyId, setCountdownTechnologyId] = useState(null);
  const [countdownProjectId, setCountdownProjectId] = useState(null);
  const [countdownNote, setCountdownNote] = useState('');
  const [countdownDeadline, setCountdownDeadline] = useState(null);
  const [countdownStartTime, setCountdownStartTime] = useState(null);
  const [countdownSessionDate, setCountdownSessionDate] = useState(null);
  const [isAlarmActive, setIsAlarmActive] = useState(false);

  const audioContextRef = useRef(null);
  const alarmNodesRef = useRef(null);
  const stopwatchSavingRef = useRef(false);
  const countdownCompletingRef = useRef(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      const data = JSON.parse(saved || legacy || 'null');

      if (data?.stopwatch) {
        const stopwatch = data.stopwatch;
        setSeconds(stopwatch.seconds || 0);
        setStatus(stopwatch.status || 'idle');
        setTechnologyId(stopwatch.technologyId ?? null);
        setProjectId(stopwatch.projectId ?? null);
        setNote(stopwatch.note || '');
        setStartTime(stopwatch.startTime || null);
        setSessionDate(stopwatch.sessionDate || null);
        setElapsedBeforeStart(stopwatch.elapsedBeforeStart || 0);
        setStartedAt(stopwatch.startedAt || null);
      } else if (data) {
        // Keep sessions started with the previous stopwatch implementation.
        setSeconds(data.seconds || 0);
        setStatus(data.status || 'idle');
        setTechnologyId(data.technologyId ?? null);
        setNote(data.note || '');
        setStartTime(data.startTime || null);
        setSessionDate(data.sessionDate || null);
        setElapsedBeforeStart(data.seconds || 0);
        setStartedAt(null);
        if (data.status === 'running') setStatus('paused');
      }

      if (data?.countdown) {
        const countdown = data.countdown;
        setCountdownRemainingSeconds(countdown.remainingSeconds ?? DEFAULT_COUNTDOWN_SECONDS);
        setCountdownTotalSeconds(countdown.totalSeconds ?? DEFAULT_COUNTDOWN_SECONDS);
        setCountdownStatus(countdown.status || 'idle');
        setCountdownTechnologyId(countdown.technologyId ?? null);
        setCountdownProjectId(countdown.projectId ?? null);
        setCountdownNote(countdown.note || '');
        setCountdownDeadline(countdown.deadline || null);
        setCountdownStartTime(countdown.startTime || null);
        setCountdownSessionDate(countdown.sessionDate || null);
      }
    } catch {
      // An unreadable saved timer should never stop the app from loading.
    } finally {
      setRestored(true);
    }
  }, []);

  useEffect(() => {
    if (!restored) return;

    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      stopwatch: {
        seconds,
        status,
        technologyId,
        projectId,
        note,
        startTime,
        sessionDate,
        elapsedBeforeStart,
        startedAt,
      },
      countdown: {
        remainingSeconds: countdownRemainingSeconds,
        totalSeconds: countdownTotalSeconds,
        status: countdownStatus,
        technologyId: countdownTechnologyId,
        projectId: countdownProjectId,
        note: countdownNote,
        deadline: countdownDeadline,
        startTime: countdownStartTime,
        sessionDate: countdownSessionDate,
      },
    }));
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }, [
    restored, seconds, status, technologyId, projectId, note, startTime, sessionDate,
    elapsedBeforeStart, startedAt, countdownRemainingSeconds, countdownTotalSeconds,
    countdownStatus, countdownTechnologyId, countdownProjectId, countdownNote, countdownDeadline,
    countdownStartTime, countdownSessionDate,
  ]);

  const getStopwatchSeconds = useCallback(() => {
    if (status !== 'running' || !startedAt) return seconds;
    return elapsedSince(elapsedBeforeStart, startedAt);
  }, [status, startedAt, elapsedBeforeStart, seconds]);

  useEffect(() => {
    if (!restored || status !== 'running' || !startedAt) return undefined;

    const sync = () => setSeconds(elapsedSince(elapsedBeforeStart, startedAt));
    sync();
    const interval = window.setInterval(sync, 1000);
    document.addEventListener('visibilitychange', sync);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [restored, status, startedAt, elapsedBeforeStart]);

  const prepareAlarm = useCallback(() => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      const context = audioContextRef.current?.state === 'closed'
        ? new AudioContextClass()
        : (audioContextRef.current || new AudioContextClass());
      audioContextRef.current = context;
      if (context.state === 'suspended') context.resume();
      return context;
    } catch {
      // A visual completion message is still shown when audio is unavailable.
      return undefined;
    }
  }, []);

  const dismissAlarm = useCallback(() => {
    stopCatAlarm();
    setIsAlarmActive(false);
  }, []);

  const startAlarm = useCallback(() => {
    setIsAlarmActive(true);
    try {
      prepareAlarm();
      startCatAlarm();
    } catch {
      // Keep the visible alarm control available if audio is unavailable.
    }
  }, [prepareAlarm]);

  useEffect(() => () => dismissAlarm(), [dismissAlarm]);

  const saveSession = useCallback(async ({
    durationSeconds,
    sessionTechnologyId,
    sessionProjectId,
    sessionNote,
    savedStartTime,
    savedSessionDate,
  }) => {
    const durationMinutes = Math.floor(durationSeconds / 60);
    if (durationMinutes < 1) {
      throw new Error('Session must be at least 1 minute');
    }

    const now = new Date();
    const result = await sessionApi.create({
      technology_id: sessionTechnologyId,
      project_id: sessionProjectId,
      session_date: savedSessionDate || formatLocalDate(now),
      start_time: savedStartTime || formatLocalTime(now),
      end_time: formatLocalTime(now),
      duration_minutes: durationMinutes,
      duration_hours: Number((durationMinutes / 60).toFixed(4)),
      note: sessionNote || null,
    });

    window.dispatchEvent(new Event('devtracker-session-saved'));
    return result.data;
  }, []);

  const start = useCallback((options = {}) => {
    const sessionTechnologyId = options.technologyId ?? technologyId;
    const sessionProjectId = options.projectId ?? projectId;
    if (!sessionTechnologyId && !sessionProjectId) {
      toast.warning('Please select a technology or project first');
      return;
    }

    const now = new Date();
    setTechnologyId(sessionTechnologyId || null);
    setProjectId(sessionProjectId || null);
    if (options.note !== undefined) setNote(options.note);
    setElapsedBeforeStart(0);
    setSeconds(0);
    setStartedAt(Date.now());
    setStartTime(formatLocalTime(now));
    setSessionDate(formatLocalDate(now));
    setStatus('running');
  }, [technologyId, projectId, toast]);

  const pause = useCallback(() => {
    const elapsed = getStopwatchSeconds();
    setElapsedBeforeStart(elapsed);
    setSeconds(elapsed);
    setStartedAt(null);
    setStatus('paused');
  }, [getStopwatchSeconds]);

  const resume = useCallback(() => {
    setStartedAt(Date.now());
    setStatus('running');
  }, []);

  const reset = useCallback(() => {
    setSeconds(0);
    setStatus('idle');
    setElapsedBeforeStart(0);
    setStartedAt(null);
    setStartTime(null);
    setSessionDate(null);
    setNote('');
  }, []);

  const stop = useCallback(async () => {
    if (stopwatchSavingRef.current) return null;

    const elapsed = getStopwatchSeconds();
    if (elapsed < 60) {
      toast.warning('Session must be at least 1 minute');
      return null;
    }

    stopwatchSavingRef.current = true;
    setElapsedBeforeStart(elapsed);
    setSeconds(elapsed);
    setStartedAt(null);
    setStatus('paused');

    try {
      const result = await saveSession({
        durationSeconds: elapsed,
        sessionTechnologyId: technologyId,
        sessionProjectId: projectId,
        sessionNote: note,
        savedStartTime: startTime,
        savedSessionDate: sessionDate,
      });
      const xpText = result?.xpEarned ? ` +${result.xpEarned} XP earned` : '';
      toast.success(`Session saved!${xpText}`);
      reset();
      return result;
    } catch (error) {
      toast.error(error.message);
      return null;
    } finally {
      stopwatchSavingRef.current = false;
    }
  }, [getStopwatchSeconds, technologyId, projectId, note, startTime, sessionDate, saveSession, toast, reset]);

  const countdownLeft = useCallback(() => {
    if (countdownStatus !== 'running' || !countdownDeadline) return countdownRemainingSeconds;
    return Math.max(0, Math.ceil((countdownDeadline - Date.now()) / 1000));
  }, [countdownStatus, countdownDeadline, countdownRemainingSeconds]);

  const clearCompletedCountdown = useCallback(() => {
    setCountdownStatus('idle');
    setCountdownDeadline(null);
    setCountdownRemainingSeconds(countdownTotalSeconds);
    setCountdownStartTime(null);
    setCountdownSessionDate(null);
    setCountdownNote('');
  }, [countdownTotalSeconds]);

  const finishCountdown = useCallback(async () => {
    if (countdownCompletingRef.current) return;
    countdownCompletingRef.current = true;

    setCountdownStatus('paused');
    setCountdownDeadline(null);
    setCountdownRemainingSeconds(0);
    playCompletionChime();
    startAlarm();
    toast.info('Timer complete — saving your study time…');

    try {
      const result = await saveSession({
        durationSeconds: countdownTotalSeconds,
        sessionTechnologyId: countdownTechnologyId,
        sessionProjectId: countdownProjectId,
        sessionNote: countdownNote,
        savedStartTime: countdownStartTime,
        savedSessionDate: countdownSessionDate,
      });
      const xpText = result?.xpEarned ? ` (+${result.xpEarned} XP)` : '';
      toast.success(`Timer complete! ${Math.floor(countdownTotalSeconds / 60)} minutes saved${xpText}`);
      clearCompletedCountdown();
    } catch (error) {
      toast.error(`Timer finished, but could not save: ${error.message}`);
    } finally {
      countdownCompletingRef.current = false;
    }
  }, [
    countdownTotalSeconds, countdownTechnologyId, countdownProjectId, countdownNote, countdownStartTime,
    countdownSessionDate, startAlarm, toast, saveSession, clearCompletedCountdown,
  ]);

  useEffect(() => {
    if (!restored || countdownStatus !== 'running' || !countdownDeadline) return undefined;

    const sync = () => {
      const remaining = Math.max(0, Math.ceil((countdownDeadline - Date.now()) / 1000));
      setCountdownRemainingSeconds(remaining);
      if (remaining === 0) finishCountdown();
    };

    sync();
    const interval = window.setInterval(sync, 1000);
    document.addEventListener('visibilitychange', sync);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [restored, countdownStatus, countdownDeadline, finishCountdown]);

  const setCountdownDuration = useCallback((totalSeconds) => {
    const normalized = Math.max(60, Math.floor(Number(totalSeconds) || 0));
    if (countdownStatus !== 'idle') return;
    setCountdownTotalSeconds(normalized);
    setCountdownRemainingSeconds(normalized);
  }, [countdownStatus]);

  const startCountdown = useCallback((durationSeconds = countdownTotalSeconds, options = {}) => {
    const totalSeconds = Math.floor(Number(durationSeconds) || 0);
    const sessionTechnologyId = options.technologyId ?? countdownTechnologyId;
    const sessionProjectId = options.projectId ?? countdownProjectId;
    const sessionNote = options.note ?? countdownNote;

    if (!sessionTechnologyId && !sessionProjectId) {
      toast.warning('Please select a technology or project first');
      return;
    }
    if (totalSeconds < 60) {
      toast.warning('Timer must be at least 1 minute');
      return;
    }

    const now = new Date();
    prepareAlarm();
    countdownCompletingRef.current = false;
    setCountdownTechnologyId(sessionTechnologyId || null);
    setCountdownProjectId(sessionProjectId || null);
    setCountdownNote(sessionNote);
    setCountdownTotalSeconds(totalSeconds);
    setCountdownRemainingSeconds(totalSeconds);
    setCountdownDeadline(Date.now() + totalSeconds * 1000);
    setCountdownStartTime(formatLocalTime(now));
    setCountdownSessionDate(formatLocalDate(now));
    setCountdownStatus('running');
  }, [countdownTotalSeconds, countdownTechnologyId, countdownProjectId, countdownNote, prepareAlarm, toast]);

  const pauseCountdown = useCallback(() => {
    const remaining = countdownLeft();
    setCountdownRemainingSeconds(remaining);
    setCountdownDeadline(null);
    setCountdownStatus('paused');
  }, [countdownLeft]);

  const resumeCountdown = useCallback(() => {
    if (countdownRemainingSeconds <= 0) return;
    prepareAlarm();
    setCountdownDeadline(Date.now() + countdownRemainingSeconds * 1000);
    setCountdownStatus('running');
  }, [countdownRemainingSeconds, prepareAlarm]);

  const stopCountdown = useCallback(async () => {
    const remaining = countdownLeft();
    const elapsed = countdownTotalSeconds - remaining;
    if (elapsed < 60) {
      toast.warning('At least 1 minute is required before saving');
      return null;
    }

    setCountdownRemainingSeconds(remaining);
    setCountdownDeadline(null);
    setCountdownStatus('paused');

    try {
      const result = await saveSession({
        durationSeconds: elapsed,
        sessionTechnologyId: countdownTechnologyId,
        sessionProjectId: countdownProjectId,
        sessionNote: countdownNote,
        savedStartTime: countdownStartTime,
        savedSessionDate: countdownSessionDate,
      });
      const xpText = result?.xpEarned ? ` +${result.xpEarned} XP earned` : '';
      toast.success(`Timer session saved!${xpText}`);
      clearCompletedCountdown();
      return result;
    } catch (error) {
      toast.error(error.message);
      return null;
    }
  }, [
    countdownLeft, countdownTotalSeconds, countdownTechnologyId, countdownProjectId, countdownNote,
    countdownStartTime, countdownSessionDate, toast, saveSession, clearCompletedCountdown,
  ]);

  const resetCountdown = useCallback(() => {
    setCountdownStatus('idle');
    setCountdownDeadline(null);
    setCountdownRemainingSeconds(countdownTotalSeconds);
    setCountdownStartTime(null);
    setCountdownSessionDate(null);
    setCountdownNote('');
  }, [countdownTotalSeconds]);

  return (
    <TimerContext.Provider value={{
      seconds,
      status,
      technologyId,
      projectId,
      note,
      startTime,
      sessionDate,
      setTechnologyId,
      setProjectId,
      setNote,
      start,
      pause,
      resume,
      stop,
      reset,
      isRunning: status === 'running',
      isPaused: status === 'paused',
      isIdle: status === 'idle',
      isAlarmActive,
      dismissAlarm,
      countdown: {
        remainingSeconds: countdownRemainingSeconds,
        totalSeconds: countdownTotalSeconds,
        status: countdownStatus,
        technologyId: countdownTechnologyId,
        projectId: countdownProjectId,
        note: countdownNote,
        setTechnologyId: setCountdownTechnologyId,
        setProjectId: setCountdownProjectId,
        setNote: setCountdownNote,
        setDuration: setCountdownDuration,
        start: startCountdown,
        pause: pauseCountdown,
        resume: resumeCountdown,
        stop: stopCountdown,
        reset: resetCountdown,
        isRunning: countdownStatus === 'running',
        isPaused: countdownStatus === 'paused',
        isIdle: countdownStatus === 'idle',
      },
    }}>
      {children}
    </TimerContext.Provider>
  );
}
