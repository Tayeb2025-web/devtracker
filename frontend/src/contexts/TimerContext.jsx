import { useState, useEffect, useCallback, useRef } from 'react';
import { sessionApi } from '../services/api';
import { useToast } from './ToastContextStore';
import { formatLocalDate, formatLocalTime } from '../constants';
import { TimerContext } from './TimerContextStore';
import { playCompletionChime, startCatAlarm, stopCatAlarm } from '../utils/audioUtils';

const STORAGE_KEY = 'devtracker-time-tools';
const LEGACY_STORAGE_KEY = 'devtracker-timer';
const USER_KEY = 'devtracker-user';
const DEFAULT_COUNTDOWN_SECONDS = 25 * 60;
const MAX_SESSION_SECONDS = 12 * 60 * 60;

const makeSessionId = () => globalThis.crypto?.randomUUID?.()
  || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

function currentUserId() {
  if (!localStorage.getItem('devtracker-auth-token')) return null;
  try { return JSON.parse(localStorage.getItem(USER_KEY) || 'null')?.id || null; }
  catch { return null; }
}

const timerStorageKey = (userId) => `${STORAGE_KEY}:${userId || 'guest'}`;

const elapsedSince = (baseSeconds, startedAt) => (
  baseSeconds + Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
);

export function TimerProvider({ children }) {
  const toast = useToast();
  const [restored, setRestored] = useState(false);
  const storageKeyRef = useRef(timerStorageKey(currentUserId()));

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
  const [clientSessionId, setClientSessionId] = useState(null);

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
  const [countdownClientSessionId, setCountdownClientSessionId] = useState(null);
  const [countdownKind, setCountdownKind] = useState('focus');
  const [isAlarmActive, setIsAlarmActive] = useState(false);

  const audioContextRef = useRef(null);
  const secondsRef = useRef(seconds);
  const countdownRemainingRef = useRef(countdownRemainingSeconds);
  const stopwatchSavingRef = useRef(false);
  const countdownCompletingRef = useRef(false);

  useEffect(() => { secondsRef.current = seconds; }, [seconds]);
  useEffect(() => { countdownRemainingRef.current = countdownRemainingSeconds; }, [countdownRemainingSeconds]);

  useEffect(() => {
    const restore = (userId, adoptLegacy = false) => {
      setRestored(false);
      storageKeyRef.current = timerStorageKey(userId);
      try {
        const saved = localStorage.getItem(storageKeyRef.current);
        const legacy = adoptLegacy ? localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY) : null;
        const data = JSON.parse(saved || legacy || 'null');
        setSeconds(0); setStatus('idle'); setTechnologyId(null); setProjectId(null); setNote('');
        setStartTime(null); setSessionDate(null); setElapsedBeforeStart(0); setStartedAt(null); setClientSessionId(null);
        setCountdownRemainingSeconds(DEFAULT_COUNTDOWN_SECONDS); setCountdownTotalSeconds(DEFAULT_COUNTDOWN_SECONDS);
        setCountdownStatus('idle'); setCountdownTechnologyId(null); setCountdownProjectId(null); setCountdownNote('');
        setCountdownDeadline(null); setCountdownStartTime(null); setCountdownSessionDate(null);
        setCountdownClientSessionId(null); setCountdownKind('focus'); setIsAlarmActive(false);

        if (data?.stopwatch) {
          const stopwatch = data.stopwatch;
          setSeconds(stopwatch.seconds || 0); setStatus(stopwatch.status || 'idle');
          setTechnologyId(stopwatch.technologyId ?? null); setProjectId(stopwatch.projectId ?? null);
          setNote(stopwatch.note || ''); setStartTime(stopwatch.startTime || null); setSessionDate(stopwatch.sessionDate || null);
          setElapsedBeforeStart(stopwatch.elapsedBeforeStart || 0); setStartedAt(stopwatch.startedAt || null);
          setClientSessionId(stopwatch.clientSessionId || (stopwatch.status !== 'idle' ? makeSessionId() : null));
        } else if (data) {
          setSeconds(data.seconds || 0); setStatus(data.status === 'running' ? 'paused' : (data.status || 'idle'));
          setTechnologyId(data.technologyId ?? null); setNote(data.note || ''); setStartTime(data.startTime || null);
          setSessionDate(data.sessionDate || null); setElapsedBeforeStart(data.seconds || 0); setStartedAt(null);
          setClientSessionId(data.status !== 'idle' ? makeSessionId() : null);
        }
        if (data?.countdown) {
          const countdown = data.countdown;
          setCountdownRemainingSeconds(countdown.remainingSeconds ?? DEFAULT_COUNTDOWN_SECONDS);
          setCountdownTotalSeconds(countdown.totalSeconds ?? DEFAULT_COUNTDOWN_SECONDS);
          setCountdownStatus(countdown.status || 'idle'); setCountdownTechnologyId(countdown.technologyId ?? null);
          setCountdownProjectId(countdown.projectId ?? null); setCountdownNote(countdown.note || '');
          setCountdownDeadline(countdown.deadline || null); setCountdownStartTime(countdown.startTime || null);
          setCountdownSessionDate(countdown.sessionDate || null);
          setCountdownClientSessionId(countdown.clientSessionId || (countdown.status !== 'idle' ? makeSessionId() : null));
          setCountdownKind(countdown.kind || 'focus');
        }
        if (!saved && legacy) localStorage.setItem(storageKeyRef.current, legacy);
        if (adoptLegacy && legacy) { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem(LEGACY_STORAGE_KEY); }
      } catch {
        // An unreadable saved timer should never stop the app from loading.
      } finally {
        setRestored(true);
      }
    };

    restore(currentUserId(), true);
    const onAccountChange = (event) => restore(event.detail?.userId || null, false);
    window.addEventListener('devtracker-auth-user-changed', onAccountChange);
    return () => window.removeEventListener('devtracker-auth-user-changed', onAccountChange);
  }, []);

  useEffect(() => {
    if (!restored) return;

    localStorage.setItem(storageKeyRef.current, JSON.stringify({
      stopwatch: {
        seconds: secondsRef.current,
        status,
        technologyId,
        projectId,
        note,
        startTime,
        sessionDate,
        elapsedBeforeStart,
        startedAt,
        clientSessionId,
      },
      countdown: {
        remainingSeconds: countdownRemainingRef.current,
        totalSeconds: countdownTotalSeconds,
        status: countdownStatus,
        technologyId: countdownTechnologyId,
        projectId: countdownProjectId,
        note: countdownNote,
        deadline: countdownDeadline,
        startTime: countdownStartTime,
        sessionDate: countdownSessionDate,
        clientSessionId: countdownClientSessionId,
        kind: countdownKind,
      },
    }));
  }, [
    restored, status, technologyId, projectId, note, startTime, sessionDate,
    elapsedBeforeStart, startedAt, clientSessionId, countdownTotalSeconds,
    countdownStatus, countdownTechnologyId, countdownProjectId, countdownNote, countdownDeadline,
    countdownStartTime, countdownSessionDate, countdownClientSessionId, countdownKind,
  ]);

  const getStopwatchSeconds = useCallback(() => {
    if (status !== 'running' || !startedAt) return seconds;
    return Math.min(MAX_SESSION_SECONDS, elapsedSince(elapsedBeforeStart, startedAt));
  }, [status, startedAt, elapsedBeforeStart, seconds]);

  useEffect(() => {
    if (!restored || status !== 'running' || !startedAt) return undefined;

    const sync = () => {
      const elapsed = elapsedSince(elapsedBeforeStart, startedAt);
      if (elapsed >= MAX_SESSION_SECONDS) {
        setSeconds(MAX_SESSION_SECONDS);
        setElapsedBeforeStart(MAX_SESSION_SECONDS);
        setStartedAt(null);
        setStatus('paused');
        toast.info('The 12-hour session limit was reached. Save the session or reset the stopwatch.');
        return;
      }
      setSeconds(elapsed);
    };
    sync();
    const interval = window.setInterval(sync, 1000);
    document.addEventListener('visibilitychange', sync);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [restored, status, startedAt, elapsedBeforeStart, toast]);

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
    sessionId,
    kind = 'focus',
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
      client_session_id: sessionId,
      source: 'timer',
      kind,
    });

    window.dispatchEvent(new Event('devtracker-session-saved'));
    return result.data;
  }, []);

  const start = useCallback((options = {}) => {
    if (status !== 'idle') {
      toast.warning('Save or reset the current stopwatch before starting another session');
      return;
    }
    if (countdownStatus !== 'idle') {
      toast.warning('Finish or reset the countdown before starting another timer');
      return;
    }
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
    setClientSessionId(makeSessionId());
    setStatus('running');
  }, [status, technologyId, projectId, countdownStatus, toast]);

  const pause = useCallback(() => {
    const elapsed = getStopwatchSeconds();
    setElapsedBeforeStart(elapsed);
    setSeconds(elapsed);
    setStartedAt(null);
    setStatus('paused');
  }, [getStopwatchSeconds]);

  const resume = useCallback(() => {
    if (countdownStatus !== 'idle') return;
    if (getStopwatchSeconds() >= MAX_SESSION_SECONDS) {
      toast.warning('This session reached the 12-hour limit. Save it or reset the stopwatch first.');
      return;
    }
    setElapsedBeforeStart(getStopwatchSeconds());
    setStartedAt(Date.now());
    setStatus('running');
  }, [countdownStatus, getStopwatchSeconds, toast]);

  const reset = useCallback(() => {
    if ((status !== 'idle' || seconds > 0) && !window.confirm('Discard this unsaved stopwatch session?')) return;
    setSeconds(0);
    setStatus('idle');
    setElapsedBeforeStart(0);
    setStartedAt(null);
    setStartTime(null);
    setSessionDate(null);
    setClientSessionId(null);
    setNote('');
  }, [status, seconds]);

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
        sessionId: clientSessionId,
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
  }, [getStopwatchSeconds, technologyId, projectId, note, startTime, sessionDate, clientSessionId, saveSession, toast, reset]);

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
    setCountdownClientSessionId(null);
    setCountdownKind('focus');
    setCountdownNote('');
  }, [countdownTotalSeconds]);

  const finishCountdown = useCallback(async () => {
    if (countdownCompletingRef.current) return;
    countdownCompletingRef.current = true;

    setCountdownStatus('paused');
    setCountdownDeadline(null);
    setCountdownRemainingSeconds(0);
    playCompletionChime();
    if (countdownKind === 'break') {
      toast.success('Break complete — ready when you are.');
      clearCompletedCountdown();
      countdownCompletingRef.current = false;
      return;
    }
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
        sessionId: countdownClientSessionId,
        kind: countdownKind,
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
    countdownSessionDate, countdownClientSessionId, countdownKind, startAlarm, toast, saveSession, clearCompletedCountdown,
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
    const normalized = Math.min(MAX_SESSION_SECONDS, Math.max(60, Math.floor(Number(totalSeconds) || 0)));
    if (countdownStatus !== 'idle') return;
    setCountdownTotalSeconds(normalized);
    setCountdownRemainingSeconds(normalized);
  }, [countdownStatus]);

  const startCountdown = useCallback((durationSeconds = countdownTotalSeconds, options = {}) => {
    if (status !== 'idle') {
      toast.warning('Finish or reset the stopwatch before starting another timer');
      return;
    }
    if (countdownStatus !== 'idle') {
      toast.warning('Finish or reset the current countdown first');
      return;
    }
    const totalSeconds = Math.floor(Number(durationSeconds) || 0);
    const kind = options.kind || countdownKind;
    const sessionTechnologyId = options.technologyId ?? countdownTechnologyId;
    const sessionProjectId = options.projectId ?? countdownProjectId;
    const sessionNote = options.note ?? countdownNote;

    if (kind !== 'break' && !sessionTechnologyId && !sessionProjectId) {
      toast.warning('Please select a technology or project first');
      return;
    }
    if (totalSeconds < 60 || totalSeconds > MAX_SESSION_SECONDS) {
      toast.warning('Timer must be between 1 minute and 12 hours');
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
    setCountdownClientSessionId(makeSessionId());
    setCountdownKind(kind);
    setCountdownStatus('running');
  }, [status, countdownStatus, countdownTotalSeconds, countdownTechnologyId, countdownProjectId, countdownNote, countdownKind, prepareAlarm, toast]);

  const pauseCountdown = useCallback(() => {
    const remaining = countdownLeft();
    setCountdownRemainingSeconds(remaining);
    setCountdownDeadline(null);
    setCountdownStatus('paused');
  }, [countdownLeft]);

  const resumeCountdown = useCallback(() => {
    if (status !== 'idle') return;
    if (countdownRemainingSeconds <= 0) return;
    prepareAlarm();
    setCountdownDeadline(Date.now() + countdownRemainingSeconds * 1000);
    setCountdownStatus('running');
  }, [status, countdownRemainingSeconds, prepareAlarm]);

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

    if (countdownKind === 'break') {
      clearCompletedCountdown();
      return { xpEarned: 0 };
    }

    try {
      const result = await saveSession({
        durationSeconds: elapsed,
        sessionTechnologyId: countdownTechnologyId,
        sessionProjectId: countdownProjectId,
        sessionNote: countdownNote,
        savedStartTime: countdownStartTime,
        savedSessionDate: countdownSessionDate,
        sessionId: countdownClientSessionId,
        kind: countdownKind,
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
    countdownStartTime, countdownSessionDate, countdownClientSessionId, countdownKind, toast, saveSession, clearCompletedCountdown,
  ]);

  const resetCountdown = useCallback(() => {
    const hasUnsavedFocusTime = countdownKind === 'focus'
      && (countdownStatus !== 'idle' || countdownRemainingSeconds < countdownTotalSeconds);
    if (hasUnsavedFocusTime && !window.confirm('Discard this unsaved study timer?')) return;
    setCountdownStatus('idle');
    setCountdownDeadline(null);
    setCountdownRemainingSeconds(countdownTotalSeconds);
    setCountdownStartTime(null);
    setCountdownSessionDate(null);
    setCountdownClientSessionId(null);
    setCountdownKind('focus');
    setCountdownNote('');
  }, [countdownKind, countdownRemainingSeconds, countdownStatus, countdownTotalSeconds]);

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
        kind: countdownKind,
        setKind: setCountdownKind,
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
