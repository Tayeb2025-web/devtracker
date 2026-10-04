import { HiOutlineRefresh } from 'react-icons/hi';

export default function AdminFeedback({ message, onRetry, loading = false }) {
  return (
    <div role="alert" className="admin-feedback flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
      <p className="min-w-0 break-words text-red-400">{message}</p>
      {onRetry && <button type="button" onClick={onRetry} disabled={loading} className="admin-button shrink-0 border border-border bg-surface-light text-text"><HiOutlineRefresh className={loading ? 'animate-spin' : ''} size={16} /> تلاش مجدد</button>}
    </div>
  );
}
