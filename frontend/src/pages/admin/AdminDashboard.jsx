import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOutlineUsers,
  HiOutlineClock,
  HiOutlineFire,
  HiOutlineAcademicCap,
  HiOutlineFolder,
  HiOutlineLightningBolt,
  HiOutlineArrowRight,
  HiOutlineRefresh,
  HiOutlineCalendar,
  HiOutlineSparkles,
} from 'react-icons/hi';
import { adminApi } from '../../services/api';
import Avatar from '../../components/Avatar';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getOverview();
      if (res?.data) {
        setData(res.data);
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
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-text-muted">در حال بارگذاری آمار و اطلاعات سیستم...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-6">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center max-w-md">
          <p className="text-sm font-bold text-red-400 mb-3">{error}</p>
          <button
            onClick={loadData}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-primary-hover"
          >
            <HiOutlineRefresh size={16} /> تلاش مجدد
          </button>
        </div>
      </div>
    );
  }

  const { metrics, studyTrend14, popularTechnologies, recentActivity } = data || {};
  const maxTrendHours = Math.max(1, ...(studyTrend14?.map(d => d.hours) || [1]));

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Top Banner / Welcome */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-r from-primary/15 via-surface to-accent/10 p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-500 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                سامانه فعال و آنلاین
              </span>
              <span className="text-xs text-text-muted">آخرین به‌روزرسانی: همین لحظه</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-text tracking-tight">
              داشبورد نظارت و آمار جامع پلتفرم 👑
            </h1>
            <p className="text-sm text-text-muted max-w-2xl">
              گزارش عملکرد لحظه‌ای کاربران، ساعات مطالعه ثبت شده در کل سیستم، محبوب‌ترین مهارت‌ها و فعالیت‌های زنده.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-border/80 bg-surface px-4 py-2.5 text-xs font-bold text-text-muted hover:text-text hover:bg-surface-lighter transition-all shadow-sm"
            >
              <HiOutlineRefresh size={16} className={loading ? 'animate-spin' : ''} />
              به‌روزرسانی آمار
            </button>
            <Link
              to="/admin/users"
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-primary/25 hover:opacity-95 transition-all"
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
            <div className="text-3xl font-black text-text">{metrics?.totalUsers ?? 0}</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
              <span className="font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                +{metrics?.newUsersToday ?? 0} امروز
              </span>
              <span>+{metrics?.newUsersWeek ?? 0} در این هفته</span>
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
              {metrics?.totalHours ?? 0} <span className="text-sm font-semibold text-text-muted">ساعت</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
              <span className="font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-lg">
                {metrics?.totalSessions ?? 0} جلسه
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
              {metrics?.todayHours ?? 0} <span className="text-sm font-semibold text-text-muted">ساعت</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
              <span>دیروز: <strong className="text-text font-bold">{metrics?.yesterdayHours ?? 0}h</strong></span>
              <span>•</span>
              <span>این هفته: <strong className="text-text font-bold">{metrics?.weekHours ?? 0}h</strong></span>
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
            <div className="text-3xl font-black text-text">{metrics?.activeTodayUsers ?? 0}</div>
            <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
              <span className="font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-lg">
                {metrics?.active7DaysUsers ?? 0} فعال
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
              سقف روزانه: {maxTrendHours} ساعت
            </span>
          </div>

          {/* Bar Chart Visualization */}
          <div className="flex h-56 items-end gap-2 pt-6 pb-2 px-2">
            {studyTrend14?.map((item, idx) => {
              const heightPercent = maxTrendHours > 0 ? Math.max(8, Math.round((item.hours / maxTrendHours) * 100)) : 8;
              const isToday = idx === studyTrend14.length - 1;
              const dateLabel = item.date.slice(5); // e.g. "09-16"

              return (
                <div key={item.date} className="group relative flex-1 flex flex-col items-center h-full justify-end">
                  {/* Tooltip on Hover */}
                  <div className="pointer-events-none absolute -top-12 z-20 hidden rounded-xl bg-surface-dark px-2.5 py-1.5 text-center text-[11px] font-bold text-white shadow-xl group-hover:block border border-border whitespace-nowrap">
                    <p>{item.date}</p>
                    <p className="text-amber-400">{item.hours} ساعت ({item.sessions} جلسه)</p>
                  </div>

                  {/* Bar */}
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className={`w-full max-w-[28px] rounded-t-xl transition-all duration-500 group-hover:brightness-125 ${
                      isToday
                        ? 'bg-gradient-to-t from-primary to-accent shadow-md shadow-primary/30'
                        : item.hours > 0
                        ? 'bg-gradient-to-t from-primary/60 to-primary/85'
                        : 'bg-surface-lighter/50'
                    }`}
                  />
                  {/* Date Label */}
                  <span className={`mt-2 text-[10px] font-semibold truncate ${isToday ? 'text-primary font-black' : 'text-text-muted'}`}>
                    {dateLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Most Popular Technologies (1 Column) */}
        <div className="rounded-3xl border border-border/80 bg-surface p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-extrabold text-text flex items-center gap-2">
                <HiOutlineAcademicCap className="text-amber-500" size={18} />
                محبوب‌ترین تکنولوژی‌ها
              </h2>
              <p className="text-xs text-text-muted">بر اساس مجموع ساعات مطالعه کاربران</p>
            </div>
            <span className="text-xs font-bold text-text-muted bg-surface-lighter px-2.5 py-1 rounded-xl">
              {metrics?.totalTechs ?? 0} تکنولوژی
            </span>
          </div>

          <div className="space-y-3.5">
            {popularTechnologies && popularTechnologies.length > 0 ? (
              popularTechnologies.map((tech, index) => {
                const maxTechHours = popularTechnologies[0]?.totalHours || 1;
                const percent = Math.max(12, Math.round((tech.totalHours / maxTechHours) * 100));

                return (
                  <div key={tech.id || index} className="rounded-2xl border border-border/60 bg-surface-lighter/30 p-3">
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="h-3 w-3 rounded-full shadow-sm"
                          style={{ backgroundColor: tech.color || '#6366f1' }}
                        />
                        <span className="font-bold text-text">{tech.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-text">{tech.totalHours}</span>
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
                      <span>{tech.studentsCount} یادگیرنده</span>
                      <span>{tech.sessions} جلسه مطالعه</span>
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
              فید فعالیت‌های زنده پلتفرم (آخرین جلسات مطالعه)
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
          <div className="overflow-x-auto">
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
                        <Avatar src={session.user.avatar_url} seed={session.user.username} size="sm" />
                        <div>
                          <p className="font-bold text-text group-hover:text-primary transition-colors">
                            {session.user.display_name}
                          </p>
                          <p className="text-[11px] text-text-muted">@{session.user.username}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold"
                        style={{
                          backgroundColor: `${session.technology.color}18`,
                          color: session.technology.color,
                        }}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: session.technology.color }}
                        />
                        {session.technology.name}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-extrabold text-text">
                      {session.duration_hours} ساعت
                      <span className="text-[11px] font-normal text-text-muted mr-1">
                        ({session.duration_minutes} دقیقه)
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-text-muted">
                      <div>{session.session_date}</div>
                      <div className="text-[10px]">{session.start_time} - {session.end_time}</div>
                    </td>
                    <td className="py-3.5 px-3 max-w-[200px] truncate text-text-muted">
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
    </div>
  );
}
