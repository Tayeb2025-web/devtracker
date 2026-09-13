import { useNavigate } from 'react-router-dom';
import {
  HiOutlineSparkles,
  HiOutlineClock,
  HiOutlineX,
  HiOutlineLogin,
  HiOutlineUserAdd,
  HiOutlineTrash,
  HiOutlineLightningBolt,
} from 'react-icons/hi';
import { useTimer } from '../contexts/TimerContextStore';

export default function GuestAuthModal() {
  const navigate = useNavigate();
  const {
    guestAuthModalOpen,
    pendingGuestSession,
    closeGuestAuthModal,
    resetGuestSession,
  } = useTimer();

  if (!guestAuthModalOpen || !pendingGuestSession) return null;

  const durationMinutes = Math.max(1, Math.floor((pendingGuestSession.durationSeconds || 0) / 60));
  const durationHours = (durationMinutes / 60).toFixed(1);
  const xpEarned = durationMinutes; // Standard 1 XP per minute

  const handleGoToAuth = (path) => {
    try {
      localStorage.setItem('devtracker-pending-guest-session', JSON.stringify(pendingGuestSession));
    } catch (e) {
      console.warn('Could not save pending guest session', e);
    }
    closeGuestAuthModal();
    navigate(path);
  };

  const handleDiscard = () => {
    resetGuestSession();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={closeGuestAuthModal}
    >
      <div
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg rounded-3xl border border-indigo-500/40 bg-surface-light p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.8)] animate-scale-in overflow-hidden"
      >
        {/* Background decorative glowing circles */}
        <div className="absolute -top-16 -right-16 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={closeGuestAuthModal}
          aria-label="بستن"
          className="absolute left-5 top-5 rounded-full p-2 text-text-muted hover:bg-surface-lighter hover:text-text transition-colors"
        >
          <HiOutlineX size={20} />
        </button>

        {/* Header with celebratory icon */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-3.5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500/30 to-violet-500/30 p-3 ring-2 ring-indigo-500/40 shadow-xl shadow-indigo-500/20">
            <HiOutlineSparkles size={32} className="text-indigo-400 animate-pulse" />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-text tracking-tight">
            مطالعه شما با موفقیت انجام شد! 🎉
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-text-muted">
            خسته نباشید! برای ذخیره و ثبت دائم این رکورد در آمار شما:
          </p>
        </div>

        {/* Study summary stats card */}
        <div className="mb-6 rounded-2xl border border-indigo-500/25 bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-indigo-500/10 p-4">
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="rounded-xl bg-surface/70 border border-border/60 p-2.5">
              <div className="flex items-center justify-center gap-1 text-xs text-text-muted mb-1">
                <HiOutlineClock size={15} className="text-indigo-400" />
                <span>زمان مطالعه</span>
              </div>
              <p className="text-base sm:text-lg font-black text-text">
                {durationMinutes >= 60 ? `${durationHours} ساعت` : `${durationMinutes} دقیقه`}
              </p>
            </div>

            <div className="rounded-xl bg-surface/70 border border-border/60 p-2.5">
              <div className="flex items-center justify-center gap-1 text-xs text-text-muted mb-1">
                <HiOutlineLightningBolt size={15} className="text-amber-400" />
                <span>امتیاز تجربه (XP)</span>
              </div>
              <p className="text-base sm:text-lg font-black text-amber-400">
                +{xpEarned} XP
              </p>
            </div>
          </div>

          {pendingGuestSession.technologyName && (
            <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-xs text-text-muted px-1">
              <span>موضوع مطالعه:</span>
              <span className="font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-lg border border-indigo-500/30">
                {pendingGuestSession.technologyName}
              </span>
            </div>
          )}
        </div>

        {/* Explanation text */}
        <div className="rounded-xl bg-surface-lighter/50 border border-border/70 p-3.5 mb-6 text-xs leading-relaxed text-text-muted">
          <p>
            💡 شما در حال حاضر به صورت <strong className="text-indigo-400">کاربر مهمان</strong> فعالیت می‌کنید. اگر وارد حساب شوید، این جلسه ذخیره شده و در <strong>داشبورد، تقویم مطالعاتی، استریک روزانه و لول شما</strong> محاسبه خواهد شد.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => handleGoToAuth('/login')}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all active:scale-[0.98] cursor-pointer"
          >
            <HiOutlineLogin size={18} />
            <span>ورود به حساب کاربری (ذخیره پیشرفت)</span>
          </button>

          <button
            type="button"
            onClick={() => handleGoToAuth('/signup')}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-surface-lighter hover:bg-surface-light border border-indigo-500/30 px-5 py-2.5 text-xs sm:text-sm font-bold text-text hover:text-white transition-all active:scale-[0.98] cursor-pointer"
          >
            <HiOutlineUserAdd size={17} className="text-indigo-400" />
            <span>ساخت حساب کاربری جدید (رایگان)</span>
          </button>

          <div className="pt-2 flex items-center justify-between text-xs text-text-muted border-t border-border/50">
            <button
              type="button"
              onClick={handleDiscard}
              className="flex items-center gap-1.5 text-red-400/80 hover:text-red-400 hover:underline py-1 transition-colors cursor-pointer"
            >
              <HiOutlineTrash size={15} />
              <span>صرف‌نظر و بازنشانی تایمر</span>
            </button>
            <button
              type="button"
              onClick={closeGuestAuthModal}
              className="hover:text-text py-1 transition-colors cursor-pointer"
            >
              ادامه به عنوان مهمان
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
