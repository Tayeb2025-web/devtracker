import { PiArrowClockwiseDuotone, PiWarningCircleDuotone } from 'react-icons/pi';

export default function AdminFeedback({ message, onRetry, loading = false }) {
  return (
    <div role="alert" className="admin-feedback flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
      <div className="admin-feedback-message"><PiWarningCircleDuotone size={25} aria-hidden="true" /><p className="min-w-0 break-words text-red-400">{message}</p></div>
      {onRetry && <button type="button" onClick={onRetry} disabled={loading} className="admin-button admin-button-secondary shrink-0"><PiArrowClockwiseDuotone className={loading ? 'animate-spin' : ''} size={20} aria-hidden="true" /> تلاش مجدد</button>}
    </div>
  );
}
