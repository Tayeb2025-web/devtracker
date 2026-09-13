import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { achievementApi } from '../services/api';
import { Card, LoadingSpinner } from '../components/ui';
import { ACHIEVEMENT_DEFS, formatAfghanDate } from '../constants';
import { useAuth } from '../contexts/AuthContextStore';
import { HiOutlineSparkles, HiOutlineBadgeCheck } from 'react-icons/hi';

export default function Achievements() {
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setUnlocked([]);
      setLoading(false);
      return;
    }
    achievementApi.getAll()
      .then(res => setUnlocked(res.data || []))
      .catch(() => setUnlocked([]))
      .finally(() => setLoading(false));
  }, [user]);

  const unlockedKeys = new Set(unlocked.map(a => a.badge_key));

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-7">
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <HiOutlineSparkles size={16} />
          <span>Milestones</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Achievements</h1>
        <p className="text-text-muted text-xs sm:text-sm mt-1">
          <span className="font-bold text-text">{unlocked.length}</span> of {ACHIEVEMENT_DEFS.length} badges unlocked
        </p>
      </div>

      {/* Guest Banner */}
      {!user && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-indigo-500/25 bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-indigo-500/10 p-4 text-xs text-indigo-300 animate-fade-in text-center sm:text-right" dir="rtl">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />
            <span>نشان‌ها و دستاوردها در حالت مهمان قفل هستند. برای باز کردن نشان‌ها با مطالعه روزانه وارد حساب شوید.</span>
          </div>
          <Link
            to="/login"
            className="shrink-0 font-bold text-white bg-indigo-600 hover:bg-indigo-500 px-3.5 py-1.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-all active:scale-95"
          >
            ورود / ثبت‌نام
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ACHIEVEMENT_DEFS.map((badge, index) => {
          const isUnlocked = unlockedKeys.has(badge.key);
          const unlockData = unlocked.find(a => a.badge_key === badge.key);

          return (
            <Card
              key={badge.key}
              className={`animate-fade-in transition-all duration-300 stagger-${Math.min(index % 5 + 1, 5)} ${
                isUnlocked
                  ? 'border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 via-surface-light to-violet-500/5 shadow-lg shadow-indigo-500/5'
                  : 'opacity-55 grayscale border-border/40'
              }`}
            >
              <div className="flex items-start gap-4">
                <div className={`text-4xl p-2.5 rounded-2xl ${isUnlocked ? 'bg-indigo-500/15 ring-1 ring-indigo-500/30 shadow-md' : 'bg-surface-lighter'}`}>
                  {badge.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-sm text-text">{badge.name}</h3>
                    {isUnlocked && <HiOutlineBadgeCheck className="text-indigo-400 shrink-0" size={18} />}
                  </div>
                  <p className="text-text-muted text-xs mt-1 leading-relaxed">{badge.description}</p>
                  {isUnlocked && unlockData && (
                    <p className="text-emerald-400 text-[11px] font-semibold mt-2.5 flex items-center gap-1">
                      Unlocked {formatAfghanDate(unlockData.unlocked_at)}
                    </p>
                  )}
                  {!isUnlocked && (
                    <p className="text-text-muted text-[11px] font-semibold mt-2.5">🔒 Locked</p>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
