import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { HiOutlineUsers, HiOutlineSearch, HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineTrash, HiOutlineShieldCheck, HiOutlineUser, HiOutlineExternalLink } from 'react-icons/hi';
import { adminApi } from '../../services/api';
import Avatar from '../../components/Avatar';
import AdminFeedback from '../../components/admin/AdminFeedback';
import { formatAdminDate, formatAdminNumber } from '../../utils/adminFormat';
import { useAuth } from '../../contexts/AuthContextStore';

function RoleBadge({ role }) {
  return role === 'admin' ? <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 py-1 text-xs font-bold text-amber-500"><HiOutlineShieldCheck size={14} />مدیر</span> : <span className="inline-flex items-center gap-1 rounded-full bg-surface-lighter px-2 py-1 text-xs text-text-muted"><HiOutlineUser size={14} />کاربر</span>;
}

function UserIdentity({ user }) {
  return <Link to={`/admin/users/${user.id}`} className="group flex min-w-0 items-center gap-3 rounded-lg"><Avatar profile={user} size="sm" /><div className="min-w-0"><p className="truncate font-bold text-text group-hover:text-primary" title={user.display_name || user.username}>{user.display_name || user.username}</p><p dir="ltr" className="truncate text-right text-xs text-text-muted" title={user.username}>@{user.username}</p></div></Link>;
}

function LastSeen({ user }) {
  if (user.is_studying) return <span className="font-bold text-emerald-500">در حال مطالعه</span>;
  if (!user.last_seen_at) return '—';
  const time = new Date(user.last_seen_at).getTime();
  if (!Number.isFinite(time)) return '—';
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60000));
  if (minutes < 5) return <span className="font-bold text-emerald-500">همین حالا آنلاین</span>;
  if (minutes < 60) return `${formatAdminNumber(minutes)} دقیقه پیش`;
  if (minutes < 1440) return `${formatAdminNumber(Math.floor(minutes / 60))} ساعت پیش`;
  if (minutes < 2880) return 'دیروز';
  if (minutes < 43200) return `${formatAdminNumber(Math.floor(minutes / 1440))} روز پیش`;
  return formatAdminDate(user.last_seen_at);
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [actionInProgress, setActionInProgress] = useState(null);
  const requestVersion = useRef(0);
  const requestedPage = useRef(1);
  const cancelRequests = useCallback(() => { ++requestVersion.current; }, []);

  const fetchUsers = useCallback(async (page = 1) => {
    const version = ++requestVersion.current;
    requestedPage.current = page;
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getUsers({ page, limit: 15, search, filter, sortBy, order });
      if (!res?.data) throw new Error('فهرست کاربران دریافت نشد. دوباره تلاش کنید.');
      if (version === requestVersion.current && res?.data) {
        setUsers(res.data.users || []);
        setPagination(res.data.pagination || { page: 1, limit: 15, total: 0, totalPages: 1 });
      }
    } catch (err) {
      if (version === requestVersion.current) setError(err.message || 'خطا در بارگذاری فهرست کاربران');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [search, filter, sortBy, order]);

  useEffect(() => {
    cancelRequests();
    setLoading(true);
    const timer = setTimeout(() => fetchUsers(1), 250);
    return () => { clearTimeout(timer); cancelRequests(); };
  }, [fetchUsers, cancelRequests]);

  const handleRoleToggle = async (user) => {
    if (actionInProgress) return;
    const targetRole = user.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`نقش «${user.display_name || user.username}» به ${targetRole === 'admin' ? 'مدیر' : 'کاربر عادی'} تغییر کند؟`)) return;
    setActionInProgress(user.id);
    setActionError('');
    try {
      await adminApi.updateUserRole(user.id, targetRole);
      await fetchUsers(pagination.page);
    } catch (err) {
      setActionError(err.message || 'خطا در تغییر نقش کاربر');
    } finally { setActionInProgress(null); }
  };

  const handleDeleteUser = async (user) => {
    if (actionInProgress) return;
    if (!window.confirm(`آیا از حذف حساب «${user.username}» و تمام جلسات و سوابق او مطمئن هستید؟ این عملیات غیرقابل بازگشت است.`)) return;
    setActionInProgress(user.id);
    setActionError('');
    try {
      await adminApi.deleteUser(user.id);
      await fetchUsers(users.length === 1 ? Math.max(1, pagination.page - 1) : pagination.page);
    } catch (err) {
      setActionError(err.message || 'خطا در حذف کاربر');
    } finally { setActionInProgress(null); }
  };

  const renderActions = (user) => {
    const isSelf = String(user.id) === String(currentUser?.id);
    return <div className="flex flex-nowrap items-center gap-2">
      <Link to={`/admin/users/${user.id}`} className="admin-button bg-primary/10 text-primary hover:bg-primary hover:text-white" aria-label={`مشاهده پرونده ${user.display_name || user.username}`}>پرونده <HiOutlineExternalLink size={15} /></Link>
      {!isSelf && <>
        <button type="button" onClick={() => handleRoleToggle(user)} disabled={Boolean(actionInProgress) || loading} title={user.role === 'admin' ? 'تنزل به کاربر عادی' : 'ارتقا به مدیر'} aria-label={`${user.role === 'admin' ? 'تنزل نقش' : 'ارتقا به مدیر'}: ${user.username}`} className="admin-button admin-icon-button border border-border text-text-muted hover:bg-amber-500/10 hover:text-amber-500"><HiOutlineShieldCheck size={17} /></button>
        <button type="button" onClick={() => handleDeleteUser(user)} disabled={Boolean(actionInProgress) || loading} title="حذف حساب کاربری" aria-label={`حذف حساب ${user.username}`} className="admin-button admin-icon-button border border-border text-text-muted hover:bg-red-500/10 hover:text-red-400"><HiOutlineTrash size={17} /></button>
      </>}
      {actionInProgress === user.id && <span role="status" className="text-xs text-text-muted">در حال انجام...</span>}
    </div>;
  };
  const clearFilters = () => { setSearch(''); setFilter('all'); };
  const hasFilters = search || filter !== 'all';

  return <div className="space-y-6 animate-fade-in">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="flex items-center gap-2 text-xl font-black text-text sm:text-2xl"><HiOutlineUsers className="text-primary" size={26} />مدیریت کاربران</h1><p className="mt-1 text-sm text-text-muted">اطلاعات حساب، وضعیت فعالیت و پروندهٔ مطالعهٔ کاربران</p></div>
      <p className="rounded-xl border border-border bg-surface px-4 py-2 text-xs text-text-muted">{hasFilters ? 'نتایج جستجو:' : 'مجموع کاربران:'} <strong className="text-primary">{formatAdminNumber(pagination.total)}</strong></p>
    </div>
    {actionError && <AdminFeedback message={actionError} />}
    <div className="space-y-4 rounded-3xl border border-border bg-surface p-4">
      <div className="relative min-w-0">
        <label htmlFor="admin-user-search" className="sr-only">جستجوی کاربران</label>
        <HiOutlineSearch className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted" size={19} />
        <input id="admin-user-search" type="search" disabled={Boolean(actionInProgress)} value={search} onChange={e => setSearch(e.target.value)} placeholder="جستجوی نام، نام کاربری یا ایمیل" className="min-h-11 w-full rounded-xl border border-border bg-surface-lighter/40 py-2.5 pr-11 pl-4 text-sm text-text placeholder:text-text-muted" />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="فیلتر کاربران" className="flex flex-wrap gap-1.5">{[{ id: 'all', label: 'همه' }, { id: 'active_today', label: 'فعال امروز' }, { id: 'admin', label: 'مدیران' }, { id: 'user', label: 'کاربران عادی' }].map(item => <button type="button" key={item.id} disabled={Boolean(actionInProgress)} onClick={() => setFilter(item.id)} aria-pressed={filter === item.id} className={`admin-button ${filter === item.id ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface-lighter hover:text-text'}`}>{item.label}</button>)}</div>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <label htmlFor="admin-user-sort" className="sr-only text-xs text-text-muted sm:not-sr-only">مرتب‌سازی:</label>
          <select id="admin-user-sort" disabled={Boolean(actionInProgress)} value={sortBy} onChange={e => setSortBy(e.target.value)} className="min-h-11 rounded-xl border border-border bg-surface-lighter px-3 text-xs text-text"><option value="created_at">تاریخ عضویت</option><option value="last_seen_at">آخرین فعالیت</option><option value="username">نام کاربری</option></select>
          <button type="button" disabled={Boolean(actionInProgress)} onClick={() => setOrder(prev => prev === 'asc' ? 'desc' : 'asc')} aria-label={`ترتیب ${order === 'asc' ? 'صعودی' : 'نزولی'}؛ تغییر ترتیب`} className="admin-button border border-border text-text-muted">{order === 'asc' ? 'صعودی' : 'نزولی'}</button>
        </div>
      </div>
    </div>
    <div aria-busy={loading} className="overflow-hidden rounded-3xl border border-border bg-surface">
      {loading ? <div role="status" className="py-20 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" /><p className="mt-3 text-sm text-text-muted">در حال دریافت فهرست کاربران...</p></div> : error ? <div className="p-4"><AdminFeedback message={error} onRetry={() => fetchUsers(requestedPage.current)} /></div> : users.length === 0 ? <div className="space-y-4 px-4 py-16 text-center"><p className="text-sm text-text-muted">{hasFilters ? 'کاربری با این مشخصات پیدا نشد.' : 'هنوز کاربری ثبت نشده است.'}</p>{hasFilters && <button type="button" onClick={clearFilters} className="admin-button bg-primary/10 text-primary">پاک کردن فیلترها</button>}</div> : <>
        <div className="grid gap-4 p-4 md:grid-cols-2 lg:hidden">
          {users.map(user => <article key={user.id} className="min-w-0 space-y-4 rounded-2xl border border-border bg-surface-lighter/20 p-4">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0 flex-1"><UserIdentity user={user} /></div><RoleBadge role={user.role} /></div>
            <p dir="ltr" className="break-all text-right text-xs text-text-muted">{user.email || '—'}</p>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-3 text-xs">
              <div><dt className="text-text-muted">مطالعه امروز</dt><dd className="font-bold text-amber-500">{formatAdminNumber(user.study_stats?.today_hours)} ساعت</dd></div>
              <div><dt className="text-text-muted">مطالعه دیروز</dt><dd className="font-bold">{formatAdminNumber(user.study_stats?.yesterday_hours)} ساعت</dd></div>
              <div><dt className="text-text-muted">کل مطالعه</dt><dd className="font-bold">{formatAdminNumber(user.study_stats?.total_hours)} ساعت</dd><dd className="text-text-muted">{formatAdminNumber(user.study_stats?.sessions_count)} جلسه</dd></div>
              <div><dt className="text-text-muted">آخرین حضور</dt><dd><LastSeen user={user} /></dd></div>
              <div><dt className="text-text-muted">عضویت</dt><dd>{formatAdminDate(user.created_at)}</dd></div>
              <div><dt className="text-text-muted">مهارت اصلی</dt><dd className="break-words"><bdi>{user.top_technology?.name || '—'}</bdi></dd></div>
            </dl>
            <p className="text-xs text-text-muted">{formatAdminNumber(user.social?.followers_count)} دنبال‌کننده · {formatAdminNumber(user.social?.following_count)} دنبال‌شونده</p>
            <div className="border-t border-border pt-3">{renderActions(user)}</div>
          </article>)}
        </div>
        <div className="hidden lg:block">
          <p className="px-4 py-2 text-xs text-text-muted">در صورت نیاز، برای دیدن همهٔ ستون‌ها جدول را افقی پیمایش کنید.</p>
          <div className="admin-table-scroll" role="region" aria-label="فهرست کاربران" tabIndex={0}>
            <table className="w-full text-right text-xs"><thead><tr className="border-b border-border bg-surface-lighter/40 text-text-muted">{['کاربر', 'عضویت', 'آخرین حضور', 'مطالعه روزانه', 'کل مطالعه', 'مهارت اصلی', 'ارتباطات', 'نقش', 'عملیات'].map(label => <th key={label} scope="col" className="px-3 py-3">{label}</th>)}</tr></thead><tbody className="divide-y divide-border">
              {users.map(user => <tr key={user.id} className="hover:bg-surface-lighter/30">
                <td className="min-w-52 max-w-64 px-3 py-3"><UserIdentity user={user} /><span dir="ltr" className="mt-1 block max-w-52 truncate text-text-muted" title={user.email}>{user.email || '—'}</span></td>
                <td className="whitespace-nowrap px-3 py-3">{formatAdminDate(user.created_at)}</td>
                <td className="whitespace-nowrap px-3 py-3"><LastSeen user={user} /></td>
                <td className="whitespace-nowrap px-3 py-3"><p className="font-bold text-amber-500">امروز: {formatAdminNumber(user.study_stats?.today_hours)} ساعت</p><p className="text-text-muted">دیروز: {formatAdminNumber(user.study_stats?.yesterday_hours)} ساعت</p></td>
                <td className="whitespace-nowrap px-3 py-3"><p className="font-bold">{formatAdminNumber(user.study_stats?.total_hours)} ساعت</p><p className="text-text-muted">{formatAdminNumber(user.study_stats?.sessions_count)} جلسه</p></td>
                <td className="px-3 py-3">{user.top_technology ? <bdi className="admin-tech-badge inline-block max-w-40 break-words rounded-lg px-2 py-1" style={{ '--tech-color': user.top_technology.color }}>{user.top_technology.name}</bdi> : '—'}</td>
                <td className="whitespace-nowrap px-3 py-3 text-text-muted"><p>{formatAdminNumber(user.social?.followers_count)} دنبال‌کننده</p><p>{formatAdminNumber(user.social?.following_count)} دنبال‌شونده</p></td>
                <td className="px-3 py-3"><RoleBadge role={user.role} /></td>
                <td className="min-w-56 px-3 py-3">{renderActions(user)}</td>
              </tr>)}
            </tbody></table>
          </div>
        </div>
      </>}
      {!error && pagination.totalPages > 1 && <nav aria-label="صفحه‌بندی کاربران" className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-4 text-xs text-text-muted">
        <p>صفحهٔ <strong>{formatAdminNumber(pagination.page)}</strong> از <strong>{formatAdminNumber(pagination.totalPages)}</strong> · {formatAdminNumber(pagination.total)} کاربر</p>
        <div className="flex gap-2"><button type="button" disabled={loading || Boolean(actionInProgress) || pagination.page <= 1} onClick={() => fetchUsers(pagination.page - 1)} className="admin-button border border-border hover:bg-surface-lighter"><HiOutlineChevronRight size={16} />قبلی</button><button type="button" disabled={loading || Boolean(actionInProgress) || pagination.page >= pagination.totalPages} onClick={() => fetchUsers(pagination.page + 1)} className="admin-button border border-border hover:bg-surface-lighter">بعدی<HiOutlineChevronLeft size={16} /></button></div>
      </nav>}
    </div>
  </div>;
}
