import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineUsers,
  HiOutlineSearch,
  HiOutlineFilter,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineTrash,
  HiOutlineShieldCheck,
  HiOutlineUser,
  HiOutlineClock,
  HiOutlineFire,
  HiOutlineExternalLink,
  HiOutlineRefresh,
} from 'react-icons/hi';
import { adminApi } from '../../services/api';
import Avatar from '../../components/Avatar';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'active_today' | 'admin' | 'user'
  const [sortBy, setSortBy] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [actionInProgress, setActionInProgress] = useState(null);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getUsers({
        page,
        limit: 15,
        search,
        filter,
        sortBy,
        order,
      });
      if (res?.data) {
        setUsers(res.data.users || []);
        setPagination(res.data.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
      }
    } catch (err) {
      setError(err.message || 'خطا در بارگذاری فهرست کاربران');
    } finally {
      setLoading(false);
    }
  }, [search, filter, sortBy, order]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleRoleToggle = async (userId, currentRole) => {
    const targetRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`آیا از تغییر نقش این کاربر به ${targetRole === 'admin' ? 'مدیر (Admin)' : 'کاربر عادی'} اطمینان دارید؟`)) {
      return;
    }

    setActionInProgress(userId);
    try {
      await adminApi.updateUserRole(userId, targetRole);
      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, role: targetRole } : u))
      );
    } catch (err) {
      alert(err.message || 'خطا در تغییر نقش کاربر');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`آیا از حذف حساب کاربری "${username}" و تمام جلسات و سوابق او مطمئن هستید؟ این عملیات غیرقابل بازگشت است.`)) {
      return;
    }

    setActionInProgress(userId);
    try {
      await adminApi.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
      setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    } catch (err) {
      alert(err.message || 'خطا در حذف کاربر');
    } finally {
      setActionInProgress(null);
    }
  };

  const formatJoinDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return String(dateStr).slice(0, 10);
    }
  };

  const formatLastSeen = (dateStr, isStudying) => {
    if (isStudying) {
      return (
        <span className="inline-flex items-center gap-1 font-bold text-emerald-500 bg-emerald-500/15 px-2 py-0.5 rounded-lg text-[10px]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          در حال مطالعه
        </span>
      );
    }
    if (!dateStr) return <span className="text-text-muted">—</span>;
    try {
      const d = new Date(dateStr);
      const diffMs = Date.now() - d.getTime();
      const diffMins = Math.floor(diffMs / (60 * 1000));
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 5) {
        return (
          <span className="inline-flex items-center gap-1 font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg text-[10px]">
            همین حالا آنلاین
          </span>
        );
      }
      if (diffMins < 60) return `${diffMins} دقیقه پیش`;
      if (diffHours < 24) return `${diffHours} ساعت پیش`;
      if (diffDays === 1) return 'دیروز';
      if (diffDays < 30) return `${diffDays} روز پیش`;
      return d.toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' });
    } catch {
      return '—';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text tracking-tight flex items-center gap-2">
            <HiOutlineUsers className="text-primary" size={26} />
            مدیریت و پرونده کاربران
          </h1>
          <p className="text-xs text-text-muted mt-1">
            مشاهده اطلاعات کاربران، تاریخ عضویت، وضعیت آنلاین، ساعات مطالعه تفکیک‌شده و شبکه ارتباطی
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-text-muted bg-surface p-2.5 rounded-2xl border border-border/80 shadow-sm">
          <span>مجموع کاربران:</span>
          <span className="text-primary font-black text-sm">{pagination.total}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-border/80 bg-surface p-4 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <HiOutlineSearch className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={17} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو بر اساس نام، نام کاربری یا ایمیل..."
            className="w-full rounded-2xl border border-border/70 bg-surface-lighter/40 pr-10 pl-4 py-2.5 text-xs text-text placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-all"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'all', label: 'همه' },
            { id: 'active_today', label: 'فعال امروز' },
            { id: 'admin', label: 'مدیران' },
            { id: 'user', label: 'کاربران عادی' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                filter === f.id
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-text-muted hover:text-text hover:bg-surface-lighter'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-text-muted hidden sm:inline">مرتب‌سازی:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-xl border border-border/70 bg-surface-lighter/60 px-3 py-1.5 text-xs font-semibold text-text focus:outline-none"
          >
            <option value="created_at">تاریخ عضویت</option>
            <option value="last_seen_at">آخرین فعالیت</option>
            <option value="username">نام کاربری</option>
          </select>
          <button
            onClick={() => setOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))}
            className="rounded-xl border border-border/70 px-2.5 py-1.5 text-xs font-bold text-text-muted hover:text-text"
            title="تغییر ترتیب نزولی/صعودی"
          >
            {order === 'asc' ? 'صعودی' : 'نزولی'}
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-3xl border border-border/80 bg-surface shadow-sm">
        {loading ? (
          <div className="py-20 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="mt-3 text-xs font-semibold text-text-muted">در حال دریافت فهرست کاربران...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-red-400">{error}</div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-xs text-text-muted">
            هیچ کاربری با معیارهای جستجوی انتخاب‌شده یافت نشد.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border/80 bg-surface-lighter/30 text-text-muted font-bold">
                  <th className="py-3.5 pr-4 pl-2">کاربر</th>
                  <th className="py-3.5 px-3">ایمیل</th>
                  <th className="py-3.5 px-3">تاریخ عضویت</th>
                  <th className="py-3.5 px-3">آخرین حضور</th>
                  <th className="py-3.5 px-3">امروز</th>
                  <th className="py-3.5 px-3">دیروز</th>
                  <th className="py-3.5 px-3">کل زمان مطالعه</th>
                  <th className="py-3.5 px-3">مهارت اصلی</th>
                  <th className="py-3.5 px-3">فالوور / فالوینگ</th>
                  <th className="py-3.5 px-3">نقش</th>
                  <th className="py-3.5 pl-4 text-left">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {users.map(u => {
                  const isPrimaryAdmin = u.email === 'sayedtayebpuya2024@gmail.com';

                  return (
                    <tr key={u.id} className="hover:bg-surface-lighter/30 transition-colors">
                      {/* User Profile */}
                      <td className="py-3.5 pr-4 pl-2">
                        <Link
                          to={`/admin/users/${u.id}`}
                          className="flex items-center gap-2.5 group max-w-[180px]"
                        >
                          <Avatar src={u.avatar_url} seed={u.username} size="sm" />
                          <div className="truncate">
                            <p className="font-bold text-text group-hover:text-primary transition-colors truncate">
                              {u.display_name}
                            </p>
                            <p className="text-[11px] text-text-muted truncate">@{u.username}</p>
                          </div>
                        </Link>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-3 text-text-muted max-w-[150px] truncate text-[11px]">
                        {u.email}
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-3 text-text font-medium whitespace-nowrap">
                        {formatJoinDate(u.created_at)}
                      </td>

                      {/* Last Seen */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {formatLastSeen(u.last_seen_at, u.is_studying)}
                      </td>

                      {/* Today Hours */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {u.study_stats.today_hours > 0 ? (
                          <span className="font-extrabold text-amber-500">
                            {u.study_stats.today_hours}h
                          </span>
                        ) : (
                          <span className="text-text-muted">0</span>
                        )}
                      </td>

                      {/* Yesterday Hours */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-text-muted">
                        {u.study_stats.yesterday_hours > 0 ? (
                          <span className="font-semibold text-text">
                            {u.study_stats.yesterday_hours}h
                          </span>
                        ) : (
                          '0'
                        )}
                      </td>

                      {/* Total Hours & Sessions */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="font-extrabold text-text">
                          {u.study_stats.total_hours} ساعت
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {u.study_stats.sessions_count} جلسه
                        </div>
                      </td>

                      {/* Top Technology */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {u.top_technology ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold"
                            style={{
                              backgroundColor: `${u.top_technology.color}15`,
                              color: u.top_technology.color,
                            }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: u.top_technology.color }}
                            />
                            {u.top_technology.name}
                          </span>
                        ) : (
                          <span className="text-text-muted text-[11px]">—</span>
                        )}
                      </td>

                      {/* Social counts */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-[11px] text-text-muted">
                        <span className="font-bold text-text">{u.social.followers_count}</span> فالوور /{' '}
                        <span className="font-bold text-text">{u.social.following_count}</span> فالوینگ
                      </td>

                      {/* Role Badge */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {u.role === 'admin' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-500 border border-amber-500/30">
                            <HiOutlineShieldCheck size={12} />
                            مدیر
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-surface-lighter px-2.5 py-0.5 text-[10px] font-semibold text-text-muted">
                            <HiOutlineUser size={12} />
                            کاربر
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pl-4 text-left whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Dossier Button */}
                          <Link
                            to={`/admin/users/${u.id}`}
                            title="مشاهده پرونده کامل"
                            className="inline-flex items-center gap-1 rounded-xl bg-primary/10 px-2.5 py-1.5 text-[11px] font-bold text-primary hover:bg-primary hover:text-white transition-all"
                          >
                            پرونده
                            <HiOutlineExternalLink size={12} />
                          </Link>

                          {/* Role Toggle Button */}
                          {!isPrimaryAdmin && (
                            <button
                              type="button"
                              onClick={() => handleRoleToggle(u.id, u.role)}
                              disabled={actionInProgress === u.id}
                              title={u.role === 'admin' ? 'تنزل به کاربر عادی' : 'ارتقا به مدیر'}
                              className="rounded-xl border border-border/70 p-1.5 text-text-muted hover:text-amber-500 hover:bg-amber-500/10 transition-all"
                            >
                              <HiOutlineShieldCheck size={15} />
                            </button>
                          )}

                          {/* Delete Button */}
                          {!isPrimaryAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              disabled={actionInProgress === u.id}
                              title="حذف حساب کاربری"
                              className="rounded-xl border border-border/70 p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-all"
                            >
                              <HiOutlineTrash size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border/80 px-5 py-3.5 text-xs text-text-muted">
            <div>
              صفحه <strong>{pagination.page}</strong> از <strong>{pagination.totalPages}</strong> (مجموع {pagination.total} کاربر)
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchUsers(pagination.page - 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-border/70 px-3 py-1.5 font-bold hover:bg-surface-lighter disabled:opacity-40"
              >
                <HiOutlineChevronRight size={14} /> قبلی
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchUsers(pagination.page + 1)}
                className="inline-flex items-center gap-1 rounded-xl border border-border/70 px-3 py-1.5 font-bold hover:bg-surface-lighter disabled:opacity-40"
              >
                بعدی <HiOutlineChevronLeft size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
