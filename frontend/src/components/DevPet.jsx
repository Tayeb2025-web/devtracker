import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTimer } from '../contexts/TimerContextStore';
import { useAuth } from '../contexts/AuthContextStore';
import { technologyApi, projectApi, dashboardApi } from '../services/api';
import { HiOutlineHeart } from 'react-icons/hi';

const STATIC_SLEEPING_QUOTES = [
  'میو... تایمر یا استاپ‌واچ رو روشن کن تا بیدار شم کمکت کد بزنم! 🐱💤',
  'در حال چرت زدن و شارژ انرژی برای دیباگ بعدی... ☕🐟',
  'خر خر... منتظر شروع جلسه تمرکز بعدی تو هستم... 😴',
  'پشی خوابیده... بیا یه پومودورو جدید شروع کنیم! 💤🐾',
];

const STATIC_ACTIVE_QUOTES = [
  'پنجه‌هام دارن با سرعت نور روی کیبورد کد می‌زنن! 🐾🚀',
  'میو! با هر خط کد داری به هدفت نزدیک‌تر میشی! 🔥',
  'کد تمیز، ذهن آرام، تمرکز عمیق 💻✨',
  'ادامه بده قهرمان، ماهی پاداش پومودوروی ماست! 🐟💪',
  'الگوریتم گربه‌ای با موفقیت اجرا شد! ⚡🐾',
  'میو! باگ‌ها رو با پنجه‌هام شکار می‌کنم 🐾🐞',
];

export default function DevPet() {
  const timer = useTimer();
  const { user } = useAuth();

  const isStopwatchRunning = Boolean(timer?.isRunning);
  const isCountdownRunning = Boolean(timer?.countdown?.isRunning);
  const isAlarmActive = Boolean(timer?.isAlarmActive);
  const isPetActive = isStopwatchRunning || isCountdownRunning || isAlarmActive;

  const sleepingSrc = '/assets/pet/pet_sleeping.png';
  const activeSrc = '/assets/pet/pet_active.png';

  // Metadata: technologies, projects, stats
  const [technologies, setTechnologies] = useState([]);
  const [projects, setProjects] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);

  const loadData = useCallback(() => {
    Promise.all([
      technologyApi.getAll().catch(() => ({ data: [] })),
      projectApi.getAll().catch(() => ({ data: [] })),
      dashboardApi.get().catch(() => ({ data: null })),
    ]).then(([techRes, projRes, dashRes]) => {
      if (techRes?.data) setTechnologies(techRes.data);
      if (projRes?.data) setProjects(projRes.data);
      if (dashRes?.data) setDashboardStats(dashRes.data);
    });
  }, []);

  useEffect(() => {
    loadData();
    window.addEventListener('devtracker-session-saved', loadData);
    return () => window.removeEventListener('devtracker-session-saved', loadData);
  }, [loadData]);

  // Dragging & Position state
  const [pos, setPos] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('devtracker-pet-pos') || 'null');
      if (saved && typeof saved.x === 'number' && typeof saved.y === 'number') {
        const maxX = Math.max(5, window.innerWidth - (window.innerWidth < 640 ? 130 : 160));
        const maxY = Math.max(5, window.innerHeight - (window.innerWidth < 640 ? 150 : 180));
        return {
          x: Math.max(5, Math.min(maxX, saved.x)),
          y: Math.max(5, Math.min(maxY, saved.y)),
        };
      }
    } catch {}
    const defaultX = Math.max(5, window.innerWidth - (window.innerWidth < 640 ? 140 : 250));
    const defaultY = Math.max(5, window.innerHeight - (window.innerWidth < 640 ? 180 : 280));
    return { x: defaultX, y: defaultY };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0, hasMoved: false });

  // Animations & Micro-Interactions state
  const [isHovered, setIsHovered] = useState(false);
  const [actionState, setActionState] = useState('typing'); // 'typing', 'nod', 'stretch', 'laugh'
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [hearts, setHearts] = useState([]);
  const [codeParticles, setCodeParticles] = useState([]);
  const [minimized, setMinimized] = useState(false);
  const quoteTimerRef = useRef(null);

  // Save pos to localStorage
  useEffect(() => {
    localStorage.setItem('devtracker-pet-pos', JSON.stringify(pos));
  }, [pos]);

  // Determine active subject name (technology or project)
  const activeSubjectName = useMemo(() => {
    const activeTechId = isStopwatchRunning
      ? timer?.technologyId
      : (isCountdownRunning ? timer?.countdown?.technologyId : null);
    const activeProjId = isStopwatchRunning
      ? timer?.projectId
      : (isCountdownRunning ? timer?.countdown?.projectId : null);

    if (activeProjId) {
      const p = projects.find(item => String(item.id) === String(activeProjId));
      if (p?.name) return p.name;
    }
    if (activeTechId) {
      const t = technologies.find(item => String(item.id) === String(activeTechId));
      if (t?.name) return t.name;
    }
    return technologies[0]?.name || 'کدنویسی';
  }, [isStopwatchRunning, isCountdownRunning, timer?.technologyId, timer?.projectId, timer?.countdown?.technologyId, timer?.countdown?.projectId, technologies, projects]);

  // Determine elapsed time of current session
  const currentElapsedSeconds = useMemo(() => {
    if (isStopwatchRunning) {
      return timer?.seconds || 0;
    }
    if (isCountdownRunning && timer?.countdown) {
      return Math.max(0, (timer.countdown.totalSeconds || 0) - (timer.countdown.remainingSeconds || 0));
    }
    return 0;
  }, [isStopwatchRunning, isCountdownRunning, timer?.seconds, timer?.countdown]);

  const userName = user?.display_name || user?.username || 'دوست من';
  const streakDays = dashboardStats?.streak?.current || 0;
  const elapsedMinutes = Math.floor(currentElapsedSeconds / 60);
  const elapsedHours = Math.floor(currentElapsedSeconds / 3600);

  let formattedDuration = '';
  if (elapsedHours >= 1) {
    const remMins = elapsedMinutes % 60;
    formattedDuration = `${elapsedHours} ساعت${remMins > 0 ? ` و ${remMins} دقیقه` : ''}`;
  } else if (elapsedMinutes > 0) {
    formattedDuration = `${elapsedMinutes} دقیقه`;
  } else {
    formattedDuration = '';
  }

  // Generate dynamic, rich quote lists
  const quotesList = useMemo(() => {
    if (isAlarmActive) {
      return [
        `میو میو! 🐾 ${userName} جان زمانت تموم شد! خسته نباشی قهرمان 🐱🎉`,
        `میو! تایمر صفر شد! وقت استراحت و جایزه رسیده 🐟✨`,
        `میو میو! جلسه تمرکزت عالی بود ${userName}، بیا یه چای یا شیر بنوشیم ☕🐾`,
        `آفرین به این تلاش فوق‌العاده ${userName}! منم دارم برات جشن می‌گیرم 🐱🥳`,
      ];
    }

    if (isHovered) {
      return [
        `میو! مرسی که نازم کردی ${userName}! داری فوق‌العاده پیش میری 🔥🐾`,
        `میو! سلام ${userName} خفن، من آماده‌ام پروژه‌ها رو بترکونیم! 🐱✨`,
        `یه فنجون قهوه یا شیر بزنیم و بریم مرحله بعد؟ ☕🐾`,
        `تایمر رو روشن کن تا با دست‌های کوچولوم برات کد بزنم ${userName}! 💻🐱`,
        `میو! عاشقتم ${userName}، بریم کد بزنیم 💖🐾`,
        `میو! با هم تا حرفه‌ای شدن توی ${activeSubjectName} پیش می‌ریم 🚀🐱`,
      ];
    }

    if (isPetActive) {
      const activeList = [
        `میو ${userName}! ما در حال یادگیری ${activeSubjectName} هستیم 🐱💻`,
        `${userName} داره کدنویسی میکنه 🙂🐾`,
        `میو! ${userName} و پشی، بهترین تیم برنامه‌نویسی دنیا! 🐾🚀`,
        `میو! با هر خط کد داری به هدفت در ${activeSubjectName} نزدیک‌تر میشی ${userName}! 🔥`,
        `کد تمیز، ذهن آرام، تمرکز عمیق روی ${activeSubjectName} 💻✨`,
        ...STATIC_ACTIVE_QUOTES,
      ];

      if (formattedDuration && elapsedMinutes >= 40) {
        activeList.push(`${userName} ما الان ${formattedDuration} شده ${activeSubjectName} خوندی! خسته نباشی قهرمان 🔥💪`);
        activeList.push(`میو ${userName}! الان ${formattedDuration} مداوم در حال تمرکزی! 🚀`);
      }

      if (elapsedMinutes >= 20) {
        activeList.push(`میو ${userName}! خسته شدم یکم وقفه و استراحت نمی‌کنی؟ ☕🐾`);
        activeList.push(`میو برو یه قهوه یا چای بخور و برگرد ${userName} ☕🐱`);
        activeList.push(`میو ${userName}! چشمات خسته نشه، یه لیوان آب خنک بنوش 🥛✨`);
      }

      if (streakDays > 0) {
        activeList.push(`میو ${userName}! روز ${streakDays}ام استریک پیاپی‌مون هست، ادامه بده! 🔥🐾`);
        activeList.push(`میو! روز ${streakDays}ام پروژه رو داریم با قدرت پیش می‌بریم 🚀`);
      }

      return activeList;
    }

    // Sleeping / Idle Quotes
    const sleepList = [
      `میو ${userName}... تایمر یا استاپ‌واچ رو روشن کن تا بیدار شم کمکت کد بزنم! 🐱💤`,
      `در حال چرت زدن و شارژ انرژی برای دیباگ بعدی... ☕🐟`,
      `خر خر... منتظر شروع جلسه تمرکز بعدی تو هستم ${userName}... 😴`,
      `پشی خوابیده... ${userName} جان بیا یه پومودورو شروع کنیم! 💤🐾`,
      ...STATIC_SLEEPING_QUOTES,
    ];

    if (streakDays > 0) {
      sleepList.push(`میو ${userName}! امروز نوبت حفظ استریک ${streakDays} روزه‌مونه ها! 🐾🔥`);
    }

    return sleepList;
  }, [isAlarmActive, isHovered, isPetActive, userName, activeSubjectName, formattedDuration, elapsedMinutes, streakDays]);

  const currentQuote = quotesList[quoteIndex % quotesList.length] || quotesList[0];

  // Cycling quote every 8 seconds (minimum 7 seconds display duration)
  useEffect(() => {
    if (quoteTimerRef.current) clearInterval(quoteTimerRef.current);

    quoteTimerRef.current = setInterval(() => {
      setQuoteIndex(prev => prev + 1);
    }, 8000);

    return () => {
      if (quoteTimerRef.current) clearInterval(quoteTimerRef.current);
    };
  }, [quotesList.length]);

  // Periodic active animations & code particle generation when active
  useEffect(() => {
    if (!isPetActive) {
      setActionState('sleep');
      return;
    }

    const actions = ['typing', 'typing', 'nod', 'stretch'];
    const timerInterval = setInterval(() => {
      const next = actions[Math.floor(Math.random() * actions.length)];
      setActionState(next);
      setTimeout(() => setActionState('typing'), 2500);

      // Spawn cute code glow particle
      const symbols = ['{...}', '< />', 'meow()', '✦', '🐾', '🐟', '⚡', 'git push', 'const app'];
      const sym = symbols[Math.floor(Math.random() * symbols.length)];
      const particle = { id: Date.now() + Math.random(), text: sym, x: (Math.random() - 0.5) * 30 };
      setCodeParticles(prev => [...prev.slice(-3), particle]);
      setTimeout(() => {
        setCodeParticles(prev => prev.filter(p => p.id !== particle.id));
      }, 1800);
    }, 4000);

    return () => clearInterval(timerInterval);
  }, [isPetActive]);

  // Unified Drag Handlers for Mouse & Touch (Mobile)
  const handleDragStart = useCallback((clientX, clientY) => {
    setIsDragging(true);
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      initialX: pos.x,
      initialY: pos.y,
      hasMoved: false,
    };
  }, [pos.x, pos.y]);

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    handleDragStart(e.clientX, e.clientY);
  };

  const handleTouchStart = (e) => {
    if (e.touches && e.touches.length > 0) {
      const touch = e.touches[0];
      handleDragStart(touch.clientX, touch.clientY);
    }
  };

  const handleDragMove = useCallback((clientX, clientY) => {
    if (!isDragging) return;
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      dragRef.current.hasMoved = true;
    }
    const petWidth = window.innerWidth < 640 ? 130 : 160;
    const petHeight = window.innerWidth < 640 ? 150 : 180;
    const maxX = Math.max(5, window.innerWidth - petWidth);
    const maxY = Math.max(5, window.innerHeight - petHeight);
    const newX = Math.max(5, Math.min(maxX, dragRef.current.initialX + dx));
    const newY = Math.max(5, Math.min(maxY, dragRef.current.initialY + dy));
    setPos({ x: newX, y: newY });
  }, [isDragging]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e) => {
      handleDragMove(e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      handleDragEnd();
    };

    const onTouchMove = (e) => {
      if (e.touches && e.touches.length > 0) {
        if (e.cancelable) e.preventDefault();
        const touch = e.touches[0];
        handleDragMove(touch.clientX, touch.clientY);
      }
    };

    const onTouchEnd = () => {
      handleDragEnd();
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Keep pet inside viewport when window is resized or orientation changes
  useEffect(() => {
    const handleResize = () => {
      setPos(prev => {
        const petWidth = window.innerWidth < 640 ? 130 : 160;
        const petHeight = window.innerWidth < 640 ? 150 : 180;
        const maxX = Math.max(5, window.innerWidth - petWidth);
        const maxY = Math.max(5, window.innerHeight - petHeight);
        const clampedX = Math.max(5, Math.min(maxX, prev.x));
        const clampedY = Math.max(5, Math.min(maxY, prev.y));
        if (clampedX !== prev.x || clampedY !== prev.y) {
          return { x: clampedX, y: clampedY };
        }
        return prev;
      });
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  // Click Interaction: Spawn hearts & trigger bounce/laugh animation & rotate quote
  const handleClick = (e) => {
    e.stopPropagation();
    if (dragRef.current.hasMoved) {
      dragRef.current.hasMoved = false;
      return;
    }
    if (isAlarmActive && timer?.dismissAlarm) {
      timer.dismissAlarm();
    }
    setActionState('laugh');
    setTimeout(() => setActionState(isPetActive ? 'typing' : 'sleep'), 1600);

    const newHeart = {
      id: Date.now() + Math.random(),
      x: (Math.random() - 0.5) * 40,
    };
    setHearts(prev => [...prev, newHeart]);
    setTimeout(() => {
      setHearts(prev => prev.filter(h => h.id !== newHeart.id));
    }, 1500);

    setQuoteIndex(prev => prev + 1);

    // Reset quote cycle timer to ensure this quote stays for full 8 seconds
    if (quoteTimerRef.current) clearInterval(quoteTimerRef.current);
    quoteTimerRef.current = setInterval(() => {
      setQuoteIndex(prev => prev + 1);
    }, 8000);
  };

  return (
    <div
      style={{ left: `${pos.x}px`, top: `${pos.y}px`, touchAction: 'none' }}
      className="fixed z-30 select-none"
    >
      <style>{`
        @keyframes petTyping {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-2px) rotate(-0.8deg); }
          50% { transform: translateY(1px) rotate(0.8deg); }
          75% { transform: translateY(-1.5px) rotate(0deg); }
        }
        @keyframes petNod {
          0%, 100% { transform: rotate(0deg); }
          40% { transform: rotate(3deg) scale(1.04); }
          70% { transform: rotate(-2deg); }
        }
        @keyframes petStretch {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-4px) scale(1.05) rotate(-1deg); }
        }
        @keyframes petSleepBreath {
          0%, 100% { transform: scale(1) translateY(0); }
          50% { transform: scale(1.025, 0.98) translateY(1.5px); }
        }
        @keyframes petShadowBreath {
          0%, 100% { transform: scale(1); opacity: 0.45; }
          50% { transform: scale(1.08); opacity: 0.6; }
        }
        @keyframes particleFly {
          0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
          30% { opacity: 1; }
          100% { transform: translate(-15px, -35px) scale(1.1); opacity: 0; }
        }
        @keyframes cartoonZFloat {
          0% { transform: translate(0, 0) scale(0.7); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 0.9; }
          100% { transform: translate(-18px, -26px) scale(1.25); opacity: 0; }
        }
        .anim-pet-typing {
          animation: petTyping 0.6s infinite ease-in-out;
        }
        .anim-pet-nod {
          animation: petNod 1.2s infinite ease-in-out;
        }
        .anim-pet-stretch {
          animation: petStretch 1.8s infinite ease-in-out;
        }
        .anim-pet-sleep {
          animation: petSleepBreath 3s infinite ease-in-out;
        }
        .anim-pet-shadow {
          animation: petShadowBreath 3s infinite ease-in-out;
        }
        .code-glow-particle {
          animation: particleFly 1.6s forwards ease-out;
        }
        .cartoon-z-1 {
          animation: cartoonZFloat 2.4s infinite ease-out;
        }
        .cartoon-z-2 {
          animation: cartoonZFloat 2.4s infinite ease-out 0.8s;
        }
        .cartoon-z-3 {
          animation: cartoonZFloat 2.4s infinite ease-out 1.6s;
        }
        .pet-bubble-transition {
          animation: bubbleFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes bubbleFade {
          0% { opacity: 0; transform: translateY(4px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {minimized ? (
        <button
          onClick={() => {
            if (dragRef.current.hasMoved) {
              dragRef.current.hasMoved = false;
              return;
            }
            setMinimized(false);
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          style={{ touchAction: 'none' }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-2xl glass border shadow-2xl transition-all hover:scale-105 cursor-grab active:cursor-grabbing ${isPetActive ? 'border-cyan-500/50 shadow-cyan-500/30' : 'border-indigo-500/30'}`}
        >
          <div className="w-8 h-8 relative flex items-center justify-center">
            <img
              src={isPetActive ? activeSrc : sleepingSrc}
              alt="Pet Icon"
              loading="lazy"
              decoding="async"
              width="32"
              height="32"
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-xs font-bold text-text">Coder Cat 🐱</span>
        </button>
      ) : (
        <div
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleClick}
          style={{ touchAction: 'none' }}
          className={`relative cursor-grab active:cursor-grabbing flex flex-col items-center group transition-transform duration-200 select-none ${isDragging ? 'scale-105 opacity-90' : ''}`}
        >
          {/* Transparent Speech Bubble (8+ seconds duration, cute styling) */}
          <div
            key={currentQuote}
            className="mb-1 max-w-[200px] sm:max-w-[240px] px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-2xl glass border border-amber-500/30 text-xs font-bold text-amber-200 shadow-2xl backdrop-blur-md pointer-events-none transition-all duration-300 pet-bubble-transition text-center leading-relaxed"
          >
            <p dir="rtl" className="leading-snug">{currentQuote}</p>
          </div>

          {/* 3D Cat Standalone Cutout Container */}
          <div className="w-32 h-32 sm:w-36 sm:h-36 relative flex items-center justify-center">
            {/* Ground Shadow under the desk/chair */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-28 h-6 bg-black/60 rounded-full blur-md anim-pet-shadow pointer-events-none" />

            {/* Pure 3D Cutout Cat Sprite */}
            <img
              src={isPetActive ? activeSrc : sleepingSrc}
              alt="Coder Cat Companion"
              loading="lazy"
              decoding="async"
              width="144"
              height="144"
              className={`w-full h-full object-contain pointer-events-none filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)] transition-all duration-300 ${
                !isPetActive
                  ? 'anim-pet-sleep'
                  : actionState === 'nod'
                  ? 'anim-pet-nod'
                  : actionState === 'stretch'
                  ? 'anim-pet-stretch'
                  : actionState === 'laugh'
                  ? 'scale-110 -translate-y-2'
                  : 'anim-pet-typing'
              }`}
            />

            {/* Dynamic Code & Meow Particles rising from Laptop when active */}
            {isPetActive && codeParticles.map(p => (
              <div
                key={p.id}
                className="absolute top-12 right-14 text-[11px] font-mono font-bold text-amber-300 pointer-events-none code-glow-particle drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                style={{ transform: `translate(${p.x}px, 0)` }}
              >
                {p.text}
              </div>
            ))}

            {/* Real Cartoon Zzz Floating Upwards and to the Left of the Head when sleeping */}
            {!isPetActive && (
              <div className="absolute top-4 left-2 pointer-events-none z-20">
                <span className="absolute font-black font-mono text-amber-200 drop-shadow-md text-xs cartoon-z-1">z</span>
                <span className="absolute font-black font-mono text-cyan-300 drop-shadow-md text-sm cartoon-z-2">Z</span>
                <span className="absolute font-black font-mono text-indigo-300 drop-shadow-md text-base cartoon-z-3">Z</span>
              </div>
            )}

            {/* Hearts on Click */}
            {hearts.map(h => (
              <div
                key={h.id}
                className="absolute top-0 left-1/2 -translate-x-1/2 text-pink-400 animate-ping pointer-events-none z-30"
                style={{ transform: `translate(${h.x}px, -20px)` }}
              >
                <HiOutlineHeart size={24} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
