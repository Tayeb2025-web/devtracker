import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineUsers,
  HiOutlineClock,
  HiOutlineFire,
  HiOutlineAcademicCap,
  HiOutlineLightningBolt,
  HiOutlineArrowRight,
  HiOutlineRefresh,
  HiOutlineCalendar,
  HiOutlineSparkles,
} from 'react-icons/hi';
import { adminApi } from '../../services/api';
import Avatar from '../../components/Avatar';
import AdminFeedback from '../../components/admin/AdminFeedback';
import AdminStudyChart from '../../components/admin/AdminStudyChart';
import { formatAdminDate, formatAdminNumber } from '../../utils/adminFormat';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatedAt, setUpdatedAt] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getOverview();
      if (!res?.data) throw new Error('آمار سیستم دریافت نشد. دوباره تلاش کنید.');
      if (res?.data) {
        setData(res.data);
        setUpdatedAt(new Date());
      }
    } catch (err) {
      setError(err.message || 'خطا در بارگذاری آمار سیستم');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div role="status" className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-text-muted">در حال بارگذاری آمار و اطلاعات سیستم...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <AdminFeedback message={error} onRetry={loadData} loading={loading} />
      </div>
    );
  }

  const { metrics, studyTrend14, popularTechnologies, recentActivity, recentAdminActions } = data || {};

  return (
    <div className="space-y-8 animate-fade-in">
      {error && <AdminFeedback message={`${error} اطلاعات قبلی نمایش داده می‌شود.`} onRetry={loadData} loading={loading} />}
      {/* Top Banner / Welcome */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-r from-primary/15 via-surface to-accent/10 p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <p className="text-xs text-text-muted">آخرین دریافت آمار: <time>{updatedAt ? formatAdminDate(updatedAt, { hour: '2-digit', minute: '2-digit' }) : '—'}</time></p>
            <h1 className="text-2xl sm:text-3xl font-black text-text tracking-tight">
              داشبورد مدیریت
            </h1>
            <p className="text-sm text-text-muted max-w-2xl">
              مرور عملکرد کاربران، ساعات مطالعه و فعالیت‌های ثبت‌شده در پلتفرم.
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
            <button
              onClick={loadData}
              disabled={loading}
              className="admin-button flex-1 border border-border/80 bg-surface text-text-muted hover:text-text hover:bg-surface-lighter sm:flex-none"
            >
              <HiOutlineRefresh size={16} className={loading ? 'animate-spin' : ''} />
              {loading ? 'در حال دریافت...' : 'به‌روزرسانی آمار'}
            </button>
            <Link
              to="/admin/users"
              className="admin-button flex-1 bg-primary text-white hover:bg-primary-dark sm:flex-none"
            >
              <HiOutlineUsers size={16} />
              مدیریت کاربران
              <HiOutlineArrowRight size={14} className="rotate-180" />
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Users Card */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-surface p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted">کل کاربران ثبت‌نامی</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-500">
              <HiOutlineUsers size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-text">{formatAdminNumber(metrics?.totalUsers ?? 0)}</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
              <span className="font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                +{formatAdminNumber(metrics?.newUsersToday ?? 0)} امروز
              </span>
              <span>+{formatAdminNumber(metrics?.newUsersWeek ?? 0)} در این هفته</span>
            </div>
          </div>
        </div>

        {/* Total Study Hours Card */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-surface p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted">کل ساعات مطالعه سیستم</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-500">
              <HiOutlineClock size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-text">
              {formatAdminNumber(metrics?.totalHours ?? 0)} <span className="text-sm font-semibold text-text-muted">ساعت</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
              <span className="font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg">
                {formatAdminNumber(metrics?.totalSessions ?? 0)} جلسه
              </span>
              <span>در کل پلتفرم</span>
            </div>
          </div>
        </div>

        {/* Today & Yesterday Hours Card */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-surface p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted">مطالعه امروز پلتفرم</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-500">
              <HiOutlineFire size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-text">
              {formatAdminNumber(metrics?.todayHours ?? 0)} <span className="text-sm font-semibold text-text-muted">ساعت</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
              <span>دیروز: <strong className="text-text font-bold">{formatAdminNumber(metrics?.yesterdayHours ?? 0)} ساعت</strong></span>
              <span>•</span>
              <span>این هفته: <strong className="text-text font-bold">{formatAdminNumber(metrics?.weekHours ?? 0)} ساعت</strong></span>
            </div>
          </div>
        </div>

        {/* Active Users Card */}
        <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-surface p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-muted">کاربران فعال امروز</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-500">
              <HiOutlineLightningBolt size={20} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-text">{formatAdminNumber(metrics?.activeTodayUsers ?? 0)}</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
              <span className="font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                {formatAdminNumber(metrics?.active7DaysUsers ?? 0)} فعال
              </span>
              <span>در ۷ روز گذشته</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* 14-Day Study Trend Chart (Takes 2 Columns) */}
        <div className="rounded-3xl border border-border/80 bg-surface p-6 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-6">
            <div>
              <h2 className="text-base font-extrabold text-text flex items-center gap-2">
                <HiOutlineCalendar className="text-primary" size={18} />
                روند ساعات مطالعه پلتفرم (۱۴ روز اخیر)
              </h2>
              <p className="text-xs text-text-muted">مجموع ساعات مطالعه ثبت شده توسط تمام کاربران در هر روز</p>
            </div>
            <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-xl">
              ۱۴ روز اخیر
            </span>
          </div>

          <AdminStudyChart data={studyTrend14} label="نمودار ساعات مطالعه پلتفرم" />
        </div>

        {/* Most Popular Technologies (1 Column) */}
        <div className="rounded-3xl border border-border/80 bg-surface p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
            <div>
              <h2 className="text-base font-extrabold text-text flex items-center gap-2">
                <HiOutlineAcademicCap className="text-amber-500" size={18} />
                محبوب‌ترین تکنولوژی‌ها
              </h2>
              <p className="text-xs text-text-muted">بر اساس مجموع ساعات مطالعه کاربران</p>
            </div>
            <span className="text-xs font-bold text-text-muted bg-surface-lighter px-2.5 py-1 rounded-xl">
              {formatAdminNumber(metrics?.totalTechs ?? 0)} تکنولوژی
            </span>
          </div>

          <div className="space-y-3.5">
            {popularTechnologies && popularTechnologies.length > 0 ? (
              popularTechnologies.map((tech, index) => {
                const maxTechHours = popularTechnologies[0]?.totalHours || 1;
                const percent = Math.max(0, Math.min(100, (tech.totalHours / maxTechHours) * 100));

                return (
                  <div key={tech.id || index} className="rounded-2xl border border-border/60 bg-surface-lighter/30 p-3">
                    <div className="flex items-start justify-between gap-3 text-xs mb-1.5">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="h-3 w-3 shrink-0 rounded-full shadow-sm"
                          style={{ backgroundColor: tech.color || '#6366f1' }}
                        />
                        <span dir="auto" className="min-w-0 break-words font-bold text-text">{tech.name}</span>
                      </div>
                      <div className="shrink-0 text-right">
                        <span className="font-black text-text">{formatAdminNumber(tech.totalHours)}</span>
                        <span className="text-[10px] text-text-muted mr-1">ساعت</span>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="h-1.5 w-full rounded-full bg-surface-lighter overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${percent}%`, backgroundColor: tech.color || '#6366f1' }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[10px] text-text-muted">
                      <span>{formatAdminNumber(tech.studentsCount)} یادگیرنده</span>
                      <span>{formatAdminNumber(tech.sessions)} جلسه مطالعه</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="py-8 text-center text-xs text-text-muted">هنوز اطلاعات تکنولوژی ثبت نشده است.</p>
            )}
          </div>
        </div>
      </div>

      {/* Live Recent Study Sessions Feed */}
      <div className="rounded-3xl border border-border/80 bg-surface p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-base font-extrabold text-text flex items-center gap-2">
              <HiOutlineSparkles className="text-amber-400" size={18} />
              آخرین جلسات مطالعه
            </h2>
            <p className="text-xs text-text-muted">جلسات ثبت شده توسط اعضا همراه با جزئیات زمان و تکنولوژی</p>
          </div>
          <Link
            to="/admin/users"
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            مشاهده تمام کاربران
            <HiOutlineArrowRight size={13} className="rotate-180" />
          </Link>
        </div>

        {recentActivity && recentActivity.length > 0 ? (
          <div className="admin-table-scroll" role="region" aria-label="آخرین جلسات مطالعه" tabIndex={0}>
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-border/80 text-text-muted font-bold">
                  <th className="pb-3 pr-2">کاربر</th>
                  <th className="pb-3 px-3">مهارت / تکنولوژی</th>
                  <th className="pb-3 px-3">مدت زمان</th>
                  <th className="pb-3 px-3">تاریخ و ساعت</th>
                  <th className="pb-3 px-3">یادداشت</th>
                  <th className="pb-3 pl-2 text-left">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {recentActivity.map((session) => (
                  <tr key={session.id} className="hover:bg-surface-lighter/40 transition-colors">
                    <td className="py-3.5 pr-2">
                      <Link
                        to={`/admin/users/${session.user.id}`}
                        className="flex items-center gap-2.5 group"
                      >
                        <Avatar profile={session.user} showOnline={false} seed={session.user.username} size="sm" />
                        <div className="min-w-0 max-w-44">
                          <p className="font-bold text-text group-hover:text-primary transition-colors">
                            {session.user.display_name}
                          </p>
                          <p dir="ltr" className="truncate text-right text-[11px] text-text-muted" title={session.user.username}>@{session.user.username}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className="admin-tech-badge inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold"
                        style={{
                          '--tech-color': session.technology.color,
                        }}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: session.technology.color }}
                        />
                        <bdi>{session.technology.name}</bdi>
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-extrabold text-text">
                      {formatAdminNumber(session.duration_hours)} ساعت
                      <span className="text-[11px] font-normal text-text-muted mr-1">
                        ({formatAdminNumber(session.duration_minutes)} دقیقه)
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-text-muted">
                      <div>{formatAdminDate(session.session_date)}</div>
                      <div dir="ltr" className="text-right text-[10px]">{session.start_time} – {session.end_time}</div>
                    </td>
                    <td className="admin-note py-3.5 px-3 text-text-muted">
                      {session.note || '—'}
                    </td>
                    <td className="py-3.5 pl-2 text-left">
                      <Link
                        to={`/admin/users/${session.user.id}`}
                        className="inline-flex items-center gap-1 rounded-xl bg-surface-lighter px-3 py-1 text-[11px] font-bold text-text-muted hover:text-primary hover:bg-surface transition-all border border-border/60"
                      >
                        پرونده کاربر
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-text-muted text-xs">
            هنوز هیچ جلسه مطالعه‌ای در سیستم ثبت نشده است.
          </div>
        )}
      </div>

      <section aria-labelledby="admin-audit-heading" className="rounded-3xl border border-border/80 bg-surface p-6 shadow-sm">
        <div className="mb-5">
          <h2 id="admin-audit-heading" className="text-base font-extrabold text-text">تغییرات مدیریتی اخیر</h2>
          <p className="mt-1 text-xs text-text-muted">تغییر نقش‌ها و حذف حساب‌ها، همراه با شناسهٔ درخواست برای پیگیری خطاها.</p>
        </div>
        {recentAdminActions?.length ? (
          <ul className="divide-y divide-border/60">
            {recentAdminActions.map(action => {
              const description = action.action === 'user.role.updated'
                ? `${action.actor_username} نقش ${action.target_username} را از ${action.details?.previousRole || 'user'} به ${action.details?.role || 'user'} تغییر داد.`
                : `${action.actor_username} حساب ${action.target_username} را حذف کرد.`;
              return (
                <li key={action._id} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-text">{description}</span>
                  <time className="shrink-0 text-xs text-text-muted" dateTime={action.created_at} title={action.request_id || undefined}>
                    {formatAdminDate(action.created_at, { dateStyle: 'medium', timeStyle: 'short' })}
                  </time>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="py-5 text-center text-xs text-text-muted">هنوز تغییر مدیریتی ثبت نشده است.</p>
        )}
      </section>
    </div>
  );
}
