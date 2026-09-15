import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineX,
  HiOutlineSparkles,
  HiOutlineFire,
  HiOutlineCode,
  HiOutlineLightningBolt,
  HiOutlineChatAlt2,
  HiOutlineCheck,
} from 'react-icons/hi';
import { socialApi } from '../services/api';
import { useAuth } from '../contexts/AuthContextStore';
import Avatar from './Avatar';

const DISPLAY_DURATION_MS = 8500; // 8.5 seconds display
const COOLDOWN_MIN_MS = 40000;    // 40 seconds minimum cooldown
const COOLDOWN_MAX_MS = 55000;    // 55 seconds maximum cooldown

function getRandomCooldown() {
  return Math.floor(Math.random() * (COOLDOWN_MAX_MS - COOLDOWN_MIN_MS + 1)) + COOLDOWN_MIN_MS;
}

function getInitials(name) {
  return (name || '?').trim().charAt(0).toUpperCase();
}

export default function LiveActivityBubble() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activities, setActivities] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(100);
  const [cheeredIds, setCheeredIds] = useState(() => new Set());

  const bubbleRef = useRef(null);
  const displayTimerRef = useRef(null);
  const cooldownTimerRef = useRef(null);
  const progressIntervalRef = useRef(null);
  const remainingTimeRef = useRef(DISPLAY_DURATION_MS);
  const lastTickRef = useRef(Date.now());
  const activitiesRef = useRef([]);

  activitiesRef.current = activities;

  // 1. Fetch live activities from API
  const fetchActivities = useCallback(async () => {
    if (!user) return;
    try {
      const res = await socialApi.getLiveActivities();
      const list = Array.isArray(res.data) ? res.data : (res.data?.activities || []);
      if (list.length > 0) {
        setActivities(list);
      }
    } catch {
      // Ignore network errors gracefully
    }
  }, [user]);

  // Periodic poll every 90 seconds to refresh active users
  useEffect(() => {
    if (!user) return;
    fetchActivities();
    const pollInterval = setInterval(fetchActivities, 90000);
    return () => clearInterval(pollInterval);
  }, [user, fetchActivities]);

  // Dismiss current bubble
  const dismissBubble = useCallback(() => {
    setIsVisible(false);
    clearInterval(progressIntervalRef.current);
    clearTimeout(displayTimerRef.current);
    remainingTimeRef.current = DISPLAY_DURATION_MS;
    setProgress(100);

    // Schedule next bubble rotation after cooldown
    clearTimeout(cooldownTimerRef.current);
    const cooldown = getRandomCooldown();
    cooldownTimerRef.current = setTimeout(() => {
      const currentList = activitiesRef.current;
      if (currentList.length > 0) {
        setCurrentIndex(prev => (prev + 1) % currentList.length);
        showNextBubble();
      }
    }, cooldown);
  }, []);

  // Show the bubble with countdown and progress bar
  const showNextBubble = useCallback(() => {
    if (activitiesRef.current.length === 0) return;

    remainingTimeRef.current = DISPLAY_DURATION_MS;
    setProgress(100);
    lastTickRef.current = Date.now();
    setIsVisible(true);

    clearInterval(progressIntervalRef.current);
    progressIntervalRef.current = setInterval(() => {
      if (isPaused) {
        lastTickRef.current = Date.now();
        return;
      }
      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;

      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
      const pct = (remainingTimeRef.current / DISPLAY_DURATION_MS) * 100;
      setProgress(pct);

      if (remainingTimeRef.current <= 0) {
        clearInterval(progressIntervalRef.current);
        dismissBubble();
      }
    }, 100);
  }, [isPaused, dismissBubble]);

  // Initial trigger after loading
  useEffect(() => {
    if (!user || activities.length === 0) return;

    // Start first bubble after 4 seconds initial delay
    const initialTimer = setTimeout(() => {
      showNextBubble();
    }, 4000);

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(displayTimerRef.current);
      clearTimeout(cooldownTimerRef.current);
      clearInterval(progressIntervalRef.current);
    };
  }, [user, activities.length > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cheer / Celebrate reaction with Confetti
  const handleCheer = (e, activity) => {
    e.stopPropagation();
    if (cheeredIds.has(activity.id)) return;

    setCheeredIds(prev => new Set([...prev, activity.id]));

    // Calculate confetti origin based on bubble position
    const rect = bubbleRef.current?.getBoundingClientRect();
    const x = rect ? (rect.left + rect.width / 2) / window.innerWidth : 0.85;
    const y = rect ? (rect.top + rect.height / 2) / window.innerHeight : 0.15;

    import('canvas-confetti').then(({ default: confetti }) => {
      confetti({
        particleCount: 55,
        spread: 60,
        origin: { x, y },
        colors: ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#38bdf8'],
        ticks: 200,
        gravity: 1.2,
        scalar: 0.9,
      });
    }).catch(() => {});
  };

  const handleOpenCommunity = () => {
    navigate('/community');
    dismissBubble();
  };

  const currentActivity = activities[currentIndex];

  if (!user || !currentActivity) return null;

  const isCheered = cheeredIds.has(currentActivity.id);

  // Border & glow accent based on activity type
  const colorSchemes = {
    coding_now: {
      border: 'border-emerald-500/40 hover:border-emerald-500/70',
      glow: 'shadow-emerald-500/10 shadow-xl',
      badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      progress: 'bg-emerald-500',
      pulse: 'bg-emerald-500',
      icon: <HiOutlineCode className="text-emerald-400" size={14} />,
    },
    friend_online: {
      border: 'border-indigo-500/40 hover:border-indigo-500/70',
      glow: 'shadow-indigo-500/10 shadow-xl',
      badge: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
      progress: 'bg-indigo-500',
      pulse: 'bg-indigo-500',
      icon: <HiOutlineSparkles className="text-indigo-400" size={14} />,
    },
    surpassed_hours: {
      border: 'border-amber-500/40 hover:border-amber-500/70',
      glow: 'shadow-amber-500/10 shadow-xl',
      badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      progress: 'bg-amber-500',
      pulse: 'bg-amber-500',
      icon: <HiOutlineLightningBolt className="text-amber-400" size={14} />,
    },
    streak_milestone: {
      border: 'border-violet-500/40 hover:border-violet-500/70',
      glow: 'shadow-violet-500/10 shadow-xl',
      badge: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
      progress: 'bg-violet-500',
      pulse: 'bg-violet-500',
      icon: <HiOutlineFire className="text-orange-400" size={14} />,
    },
    online_now: {
      border: 'border-cyan-500/40 hover:border-cyan-500/70',
      glow: 'shadow-cyan-500/10 shadow-xl',
      badge: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
      progress: 'bg-cyan-500',
      pulse: 'bg-cyan-400',
      icon: <HiOutlineSparkles className="text-cyan-400" size={14} />,
    },
  };

  const scheme = colorSchemes[currentActivity.type] || colorSchemes.online_now;

  return (
    <aside
      aria-label="اعلان فعالیت زنده جامعه"
      className={`fixed top-18 right-4 sm:top-5 sm:right-6 z-40 max-w-sm w-[calc(100vw-2rem)] sm:w-92 transition-all duration-500 ease-out transform ${
        isVisible
          ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto'
          : '-translate-y-6 opacity-0 scale-95 pointer-events-none'
      }`}
    >
      <div
        ref={bubbleRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className={`relative overflow-hidden rounded-2xl border ${scheme.border} ${scheme.glow} bg-surface/92 backdrop-blur-xl p-3.5 sm:p-4 text-text transition-all duration-300`}
        style={{
          boxShadow: '0 20px 35px -10px rgba(0, 0, 0, 0.45), 0 0 15px -3px rgba(99, 102, 241, 0.12)',
        }}
      >
        {/* Top Header: Tag & Dismiss */}
        <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-border/50">
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${scheme.badge}`}>
              {scheme.icon}
              <span>{currentActivity.tag || 'فعالیت جامعه'}</span>
            </span>
            {currentActivity.isMutual && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
                دوست متقابل
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={dismissBubble}
            aria-label="بستن اعلان"
            className="rounded-lg p-1 text-text-muted hover:text-text hover:bg-surface-lighter transition-colors"
          >
            <HiOutlineX size={15} />
          </button>
        </div>

        {/* Content Body: Avatar, Name & Live Dynamic Message */}
        <div className="flex items-start gap-3">
          {/* Avatar with live pulsing indicator */}
          <div className="relative shrink-0 mt-0.5">
            <Avatar profile={currentActivity} size="md" showOnline={false} />

            {/* Pulsing online / coding indicator */}
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${scheme.pulse} opacity-75`} />
              <span className={`relative inline-flex rounded-full h-3.5 w-3.5 ${scheme.pulse} border-2 border-surface`} />
            </span>
          </div>

          {/* Texts */}
          <div className="min-w-0 flex-1" dir="rtl">
            <div className="flex items-baseline justify-between gap-1">
              <button
                type="button"
                onClick={handleOpenCommunity}
                className="font-bold text-sm text-text hover:text-primary transition-colors truncate text-right text-inherit"
                title="مشاهده در جامعه"
              >
                {currentActivity.displayName}
              </button>
              <span className="text-[10px] text-text-muted shrink-0" dir="ltr">
                @{currentActivity.username}
              </span>
            </div>

            <p className="mt-1 text-xs text-text-muted leading-relaxed font-normal">
              {currentActivity.message}
            </p>
          </div>
        </div>

        {/* Action Row: Cheer Button + Community Quick Link */}
        <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-border/40">
          <button
            type="button"
            onClick={(e) => handleCheer(e, currentActivity)}
            disabled={isCheered}
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-all ${
              isCheered
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                : 'bg-surface-lighter hover:bg-primary/20 hover:text-primary border border-border/80 text-text active:scale-95'
            }`}
          >
            {isCheered ? (
              <>
                <HiOutlineCheck size={14} className="text-emerald-400" />
                <span>آفرین گفتی! 🎉</span>
              </>
            ) : (
              <>
                <span>👏</span>
                <span>دمت گرم!</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleOpenCommunity}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-text-muted hover:text-primary hover:underline transition-colors"
          >
            <HiOutlineChatAlt2 size={13} />
            <span>گفتگو در جامعه</span>
          </button>
        </div>

        {/* Progress bar countdown line at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-border/40 overflow-hidden">
          <div
            className={`h-full ${scheme.progress} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </aside>
  );
}
