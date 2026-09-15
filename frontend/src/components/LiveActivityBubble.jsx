import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineSparkles,
  HiOutlineChevronDown,
} from 'react-icons/hi';
import { socialApi } from '../services/api';
import { useAuth } from '../contexts/AuthContextStore';
import Avatar from './Avatar';

export default function LiveActivityBubble() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activities, setActivities] = useState([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 1. Fetch live activities from API
  const fetchActivities = useCallback(async () => {
    if (!user) return;
    try {
      const res = await socialApi.getLiveActivities();
      const list = Array.isArray(res.data) ? res.data : (res.data?.activities || []);
      if (Array.isArray(list) && list.length > 0) {
        setActivities(list.slice(0, 3));
      }
    } catch {
      // Ignore network errors silently
    }
  }, [user]);

  // Periodic poll every 70 seconds to smoothly keep data up to date
  useEffect(() => {
    if (!user) return;
    fetchActivities();
    const pollInterval = setInterval(fetchActivities, 70000);
    return () => clearInterval(pollInterval);
  }, [user, fetchActivities]);

  const handleBubbleClick = (userId) => {
    if (!userId) return;
    navigate(`/community?user=${userId}`);
  };

  if (!user || activities.length === 0) return null;

  return (
    <>
      {/* Bobbing floating keyframes */}
      <style>{`
        @keyframes floatBubble0 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-7px); }
        }
        @keyframes floatBubble1 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-9px); }
        }
        @keyframes floatBubble2 {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        .bubble-float-0 {
          animation: floatBubble0 4.2s ease-in-out infinite;
        }
        .bubble-float-1 {
          animation: floatBubble1 5.1s ease-in-out infinite 0.7s;
        }
        .bubble-float-2 {
          animation: floatBubble2 4.6s ease-in-out infinite 1.4s;
        }
        .bubble-float-0:hover,
        .bubble-float-1:hover,
        .bubble-float-2:hover {
          animation-play-state: paused;
        }
      `}</style>

      <aside
        aria-label="حباب‌های همراهان زنده جامعه"
        className="fixed bottom-5 left-4 md:left-72 z-30 flex flex-col gap-2 max-w-[calc(100vw-2rem)] sm:max-w-xs pointer-events-none select-none transition-all duration-300"
      >
        {isCollapsed ? (
          /* Minimized badge button */
          <button
            type="button"
            onClick={() => setIsCollapsed(false)}
            title="نمایش همراهان فعال"
            className="pointer-events-auto inline-flex items-center gap-2 px-3 py-2 rounded-full bg-surface/90 hover:bg-surface border border-border/80 text-text shadow-xl backdrop-blur-xl hover:scale-105 transition-all text-xs font-semibold"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <HiOutlineSparkles size={14} className="text-primary" />
            <span>همراهان فعال ({activities.length})</span>
          </button>
        ) : (
          /* Expanded 3 persistent floating bubbles */
          <div className="flex flex-col gap-2 items-start">
            {/* Header: title & collapse toggle */}
            <div className="pointer-events-auto flex items-center justify-between w-full px-2 py-0.5 text-[11px] text-text-muted">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <span>همراهان شما</span>
              </span>
              <button
                type="button"
                onClick={() => setIsCollapsed(true)}
                title="کوچک کردن"
                className="p-1 rounded-md text-text-muted hover:text-text hover:bg-surface-lighter transition-colors"
                aria-label="کوچک کردن حباب‌ها"
              >
                <HiOutlineChevronDown size={14} />
              </button>
            </div>

            {/* The 3 Floating Bubbles */}
            {activities.map((item, index) => {
              const floatClass = `bubble-float-${index % 3}`;

              // Accent border / glow based on genuine real-time state
              let stateClasses = 'border-border/75 hover:border-primary/60 shadow-lg';
              if (item.isStudying) {
                stateClasses = 'border-emerald-500/40 hover:border-emerald-500/70 shadow-emerald-500/10 shadow-xl';
              } else if (item.isOnline) {
                stateClasses = 'border-cyan-500/40 hover:border-cyan-500/70 shadow-cyan-500/10 shadow-xl';
              }

              return (
                <div
                  key={item.id || item.userId || index}
                  onClick={() => handleBubbleClick(item.userId)}
                  title={`مشاهده پروفایل و گفتگو با ${item.displayName}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleBubbleClick(item.userId);
                    }
                  }}
                  className={`pointer-events-auto group ${floatClass} flex items-center gap-2.5 w-full rounded-2xl border ${stateClasses} bg-surface/90 hover:bg-surface backdrop-blur-xl p-2.5 px-3.5 text-text cursor-pointer hover:scale-[1.03] active:scale-98 transition-all duration-200`}
                  dir="rtl"
                >
                  {/* User Avatar with Real-time status dot */}
                  <div className="relative shrink-0">
                    <Avatar profile={item} size="sm" showOnline={item.isOnline} />
                  </div>

                  {/* Name & Truthful Real Message */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-text group-hover:text-primary transition-colors truncate">
                        {item.displayName}
                      </span>
                      {item.isMutual && (
                        <span className="text-[10px] text-primary shrink-0" title="دوست متقابل">
                          👥
                        </span>
                      )}
                      {item.isStudying && (
                        <span className="text-[10px] text-orange-400 shrink-0" title="در حال مطالعه">
                          🔥
                        </span>
                      )}
                    </div>

                    <p className="mt-0.5 text-[11px] text-text-muted font-normal leading-snug truncate">
                      {item.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </aside>
    </>
  );
}
