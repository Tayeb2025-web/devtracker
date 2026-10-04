import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  HiOutlineArrowRight,
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineFire,
  HiOutlineAcademicCap,
  HiOutlineFolder,
  HiOutlineUsers,
  HiOutlineShieldCheck,
  HiOutlineUser,
  HiOutlineDocumentText,
  HiOutlineRefresh,
  HiOutlineExternalLink,
  HiOutlineSparkles,
} from 'react-icons/hi';
import { adminApi } from '../../services/api';
import Avatar from '../../components/Avatar';
import AdminFeedback from '../../components/admin/AdminFeedback';
import AdminStudyChart from '../../components/admin/AdminStudyChart';
import { formatAdminDate, formatAdminNumber } from '../../utils/adminFormat';
import { useAuth } from '../../contexts/AuthContextStore';

export default function AdminUserDetail() {
  const { user: currentUser } = useAuth();
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('techs'); // 'techs' | 'projects' | 'social' | 'sessions' | 'trend'
  const [roleUpdating, setRoleUpdating] = useState(false);
  const [loadedId, setLoadedId] = useState(null);
  const [actionError, setActionError] = useState('');
  const requestVersion = useRef(0);
  const cancelRequests = useCallback(() => { ++requestVersion.current; }, []);

  const loadUser = useCallback(async () => {
    const version = ++requestVersion.current;
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getUserDetail(id);
      if (!res?.data) throw new Error('پروندهٔ کاربر دریافت نشد. دوباره تلاش کنید.');
      if (version === requestVersion.current && res?.data) {
        setData(res.data);
        setLoadedId(id);
      }
    } catch (err) {
      if (version === requestVersion.current) setError(err.message || 'خطا در بارگذاری پرونده کاربر');
    } finally {
      if (version === requestVersion.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setActiveTab('techs');
    setActionError('');
    loadUser();
    return cancelRequests;
  }, [loadUser, cancelRequests]);

  const handleRoleToggle = async () => {
    if (!data?.profile || roleUpdating || loading) return;
    const currentRole = data.profile.role;
    const targetRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`آیا از تغییر نقش کاربر به ${targetRole === 'admin' ? 'مدیر' : 'کاربر عادی'} اطمینان دارید؟`)) {
      return;
    }

    setRoleUpdating(true);
    setActionError('');
    try {
      await adminApi.updateUserRole(data.profile.id, targetRole);
      setData(prev => prev?.profile.id !== data.profile.id ? prev : ({
        ...prev,
        profile: { ...prev.profile, role: targetRole },
      }));
    } catch (err) {
      setActionError(err.message || 'خطا در به‌روزرسانی نقش');
    } finally {
      setRoleUpdating(false);
    }
  };

  if ((loading && !data) || (loadedId !== id && !error)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div role="status" className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-xs font-semibold text-text-muted">در حال آماده‌سازی پرونده کاربر...</p>
        </div>
      </div>
    );
  }

  if (!data || loadedId !== id) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
        <div className="mb-4"><AdminFeedback message={error || 'کاربر یافت نشد'} onRetry={loadUser} loading={loading} /></div>
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-md"
        >
          <HiOutlineArrowRight size={14} /> بازگشت به لیست کاربران
        </Link>
      </div>
    );
  }

  const { profile, study_stats, study_history_14, technologies, projects, social, recent_sessions } = data;
  const isSelf = String(profile.id) === String(currentUser?.id);

  const formatPersianDate = (dateStr) => {
    return formatAdminDate(dateStr, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {error && <AdminFeedback message={`${error} اطلاعات قبلی نمایش داده می‌شود.`} onRetry={loadUser} loading={loading} />}
      {actionError && <AdminFeedback message={actionError} />}
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs font-semibold text-text-muted">
          <Link to="/admin/users" className="hover:text-primary transition-colors flex items-center gap-1">
            <HiOutlineArrowRight size={14} />
            کاربران
          </Link>
          <span>/</span>
          <span className="text-text font-bold">پرونده کاربر {profile.display_name}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={loadUser}
            disabled={loading || roleUpdating}
            className="admin-button border border-border/80 bg-surface text-text-muted hover:text-text"
          >
            <HiOutlineRefresh size={16} className={loading ? 'animate-spin' : ''} /> {loading ? 'در حال دریافت...' : 'تازه‌سازی'}
          </button>
          {!isSelf && (
            <button
              onClick={handleRoleToggle}
              disabled={roleUpdating || loading}
              className={`admin-button ${
                profile.role === 'admin'
                  ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30 hover:bg-amber-500/25'
                  : 'bg-primary text-white hover:bg-primary-dark'
              }`}
            >
              <HiOutlineShieldCheck size={15} />
              {roleUpdating ? 'در حال تغییر نقش...' : profile.role === 'admin' ? 'تنزل به کاربر عادی' : 'ارتقا به مدیر'}
            </button>
          )}
        </div>
      </div>

      {/* User Header Profile Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-surface p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex min-w-0 w-full flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5 sm:w-auto sm:flex-1">
            <div className="admin-profile-avatar relative shrink-0">
              <Avatar profile={profile} showOnline={false} seed={profile.username} size="xl" />
              {profile.is_studying && (
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-surface text-white" title="در حال مطالعه">
                  <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-text tracking-tight">
                  {profile.display_name}
                </h1>
                {profile.role === 'admin' ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-bold text-amber-500 border border-amber-500/30">
                    <HiOutlineShieldCheck size={13} />
                    مدیر سیستم
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-surface-lighter px-2.5 py-0.5 text-xs font-semibold text-text-muted">
                    <HiOutlineUser size={13} />
                    کاربر عادی
                  </span>
                )}
              </div>

              <p dir="ltr" className="break-all text-right text-xs text-text-muted">@{profile.username}</p>
              <p dir="ltr" className="break-all text-right text-xs text-text">{profile.email || '—'}</p>

              {profile.bio && (
                <p dir="auto" className="text-xs text-text-muted mt-2 max-w-xl bg-surface-lighter/40 p-2 rounded-xl">
                  "{profile.bio}"
                </p>
              )}
            </div>
          </div>

          {/* Quick Registration & Presence Meta */}
          <div className="grid w-full min-w-0 grid-cols-2 gap-2.5 text-xs bg-surface-lighter/30 p-3.5 rounded-2xl border border-border/60 sm:w-auto sm:max-w-52 sm:shrink-0 sm:grid-cols-1">
            <div>
              <span className="text-text-muted block text-[11px]">تاریخ عضویت:</span>
              <strong className="text-text font-bold">{formatPersianDate(profile.created_at)}</strong>
            </div>
            <div>
              <span className="text-text-muted block text-[11px]">آخرین فعالیت:</span>
              <strong className="text-text font-bold">
                {profile.is_studying
                  ? 'هم‌اکنون در حال مطالعه'
                  : formatPersianDate(profile.last_seen_at)}
              </strong>
            </div>
          </div>
        </div>
      </div>

      {/* 5 Main Study Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Today */}
        <div className="rounded-3xl border border-border/80 bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-text-muted font-bold">
            <span>مطالعه امروز</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500">
              <HiOutlineFire size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-text">
            {formatAdminNumber(study_stats.today_hours)} <span className="text-xs font-semibold text-text-muted">ساعت</span>
          </div>
        </div>

        {/* Yesterday */}
        <div className="rounded-3xl border border-border/80 bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-text-muted font-bold">
            <span>مطالعه دیروز</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-500/15 text-orange-500">
              <HiOutlineClock size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-text">
            {formatAdminNumber(study_stats.yesterday_hours)} <span className="text-xs font-semibold text-text-muted">ساعت</span>
          </div>
        </div>

        {/* This Week */}
        <div className="rounded-3xl border border-border/80 bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-text-muted font-bold">
            <span>این هفته</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500">
              <HiOutlineCalendar size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-text">
            {formatAdminNumber(study_stats.week_hours)} <span className="text-xs font-semibold text-text-muted">ساعت</span>
          </div>
        </div>

        {/* This Month */}
        <div className="rounded-3xl border border-border/80 bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-text-muted font-bold">
            <span>این ماه</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-500">
              <HiOutlineAcademicCap size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-text">
            {formatAdminNumber(study_stats.month_hours)} <span className="text-xs font-semibold text-text-muted">ساعت</span>
          </div>
        </div>

        {/* All Time Total */}
        <div className="col-span-2 sm:col-span-1 rounded-3xl border border-border/80 bg-surface p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-text-muted font-bold">
            <span>کل زمان مطالعه</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
              <HiOutlineSparkles size={16} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-text">
            {formatAdminNumber(study_stats.total_hours)} <span className="text-xs font-semibold text-text-muted">ساعت</span>
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">{formatAdminNumber(study_stats.sessions_count)} جلسه ثبت‌شده</div>
        </div>
      </div>

      {/* Navigation Tabs for Details */}
      <div role="group" aria-label="بخش‌های پرونده کاربر" className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-3">
        {[
          { id: 'techs', label: `تکنولوژی‌ها (${formatAdminNumber(technologies?.length)})`, icon: HiOutlineAcademicCap },
          { id: 'projects', label: `پروژه‌ها (${formatAdminNumber(projects?.length)})`, icon: HiOutlineFolder },
          { id: 'social', label: 'ارتباطات', icon: HiOutlineUsers },
          { id: 'trend', label: 'نمودار ۱۴ روزه', icon: HiOutlineClock },
          { id: 'sessions', label: `جلسات اخیر (${formatAdminNumber(recent_sessions?.length)})`, icon: HiOutlineDocumentText },
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveTab(t.id)}
              className={`admin-button ${
                isActive
                  ? 'bg-primary text-white shadow-md shadow-primary/20'
                  : 'text-text-muted hover:text-text hover:bg-surface'
              }`}
            >
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: Technologies */}
      {activeTab === 'techs' && (
        <div className="rounded-3xl border border-border/80 bg-surface p-6 shadow-sm animate-fade-in">
          <div className="mb-5">
            <h2 className="text-base font-extrabold text-text">تکنولوژی‌ها و مهارت‌های مطالعه‌شده</h2>
            <p className="text-xs text-text-muted">میزان زمان اختصاص‌داده‌شده به هر زبان یا فریمورک توسط این کاربر</p>
          </div>

          {technologies && technologies.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {technologies.map(t => (
                <div key={t.id} className="rounded-2xl border border-border/70 bg-surface-lighter/30 p-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-full shadow-sm"
                        style={{ backgroundColor: t.color }}
                      />
                      <bdi className="min-w-0 break-words text-sm font-bold text-text">{t.name}</bdi>
                    </div>
                    <span className="shrink-0 font-black text-text text-sm">
                      {formatAdminNumber(t.totalHours)} <span className="text-[11px] font-normal text-text-muted">ساعت</span>
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-surface-lighter overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${Math.max(0, Math.min(100, t.percent || 0))}%`, backgroundColor: t.color }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-text-muted">
                    <span>{formatAdminNumber(t.percent)}% از کل زمان مطالعه</span>
                    <span>{formatAdminNumber(t.sessionsCount)} جلسه</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-xs text-text-muted">این کاربر هنوز هیچ تکنولوژی را ثبت نکرده است.</p>
          )}
        </div>
      )}

      {/* TAB CONTENT: Projects */}
      {activeTab === 'projects' && (
        <div className="rounded-3xl border border-border/80 bg-surface p-6 shadow-sm animate-fade-in">
          <div className="mb-5">
            <h2 className="text-base font-extrabold text-text">پروژه‌های کاربر</h2>
            <p className="text-xs text-text-muted">پروژه‌هایی که این کاربر روی آن‌ها زمان صرف کرده است</p>
          </div>

          {projects && projects.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map(p => (
                <div key={p.id} className="rounded-2xl border border-border/70 bg-surface-lighter/30 p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span dir="auto" className="min-w-0 break-words text-sm font-bold text-text">{p.name}</span>
                    <span className="shrink-0 font-black text-text text-sm">{formatAdminNumber(p.totalHours)} ساعت</span>
                  </div>
                  <div className="text-xs text-text-muted">{formatAdminNumber(p.sessionsCount)} جلسه اختصاص داده شده</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-12 text-center text-xs text-text-muted">پروژه‌ای برای این کاربر ثبت نشده است.</p>
          )}
        </div>
      )}

      {/* TAB CONTENT: Follows & Social */}
      {activeTab === 'social' && (
        <div className="space-y-6 animate-fade-in">
          {/* Who User Follows (Following) */}
          <div className="rounded-3xl border border-border/80 bg-surface p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-base font-extrabold text-text">
                دنبال‌شونده‌ها ({formatAdminNumber(social.following_count)})
              </h2>
              <p className="text-xs text-text-muted">فهرست برنامه‌نویسانی که در جامعه دنبال می‌کند</p>
            </div>

            {social.following && social.following.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {social.following.map(target => (
                  <Link
                    key={target.id}
                    to={`/admin/users/${target.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface-lighter/30 p-3 hover:bg-surface-lighter transition-all group"
                  >
                    <Avatar profile={target} size="md" />
                    <div className="truncate flex-1">
                      <p className="font-bold text-xs text-text group-hover:text-primary transition-colors truncate">
                        {target.display_name}
                      </p>
                      <p dir="ltr" className="text-right text-[11px] text-text-muted truncate" title={target.username}>@{target.username}</p>
                    </div>
                    <HiOutlineExternalLink size={14} className="text-text-muted group-hover:text-primary" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-xs text-text-muted">این کاربر هیچ کاربری را دنبال نمی‌کند.</p>
            )}
          </div>

          {/* Who Follows This User (Followers) */}
          <div className="rounded-3xl border border-border/80 bg-surface p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-base font-extrabold text-text">
                دنبال‌کننده‌ها ({formatAdminNumber(social.followers_count)})
              </h2>
              <p className="text-xs text-text-muted">فهرست اعضایی که این کاربر را دنبال می‌کنند</p>
            </div>

            {social.followers && social.followers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {social.followers.map(follower => (
                  <Link
                    key={follower.id}
                    to={`/admin/users/${follower.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface-lighter/30 p-3 hover:bg-surface-lighter transition-all group"
                  >
                    <Avatar profile={follower} size="md" />
                    <div className="truncate flex-1">
                      <p className="font-bold text-xs text-text group-hover:text-primary transition-colors truncate">
                        {follower.display_name}
                      </p>
                      <p dir="ltr" className="text-right text-[11px] text-text-muted truncate" title={follower.username}>@{follower.username}</p>
                    </div>
                    <HiOutlineExternalLink size={14} className="text-text-muted group-hover:text-primary" />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-xs text-text-muted">هنوز کسی این کاربر را دنبال نکرده است.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: 14-Day Study Trend Chart */}
      {activeTab === 'trend' && (
        <div className="rounded-3xl border border-border/80 bg-surface p-6 shadow-sm animate-fade-in">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-base font-extrabold text-text">روند مطالعه ۱۴ روز اخیر</h2>
              <p className="text-xs text-text-muted">توزیع ساعات مطالعه کاربر در دو هفته گذشته</p>
            </div>
          </div>

          <AdminStudyChart data={study_history_14} label="نمودار ساعات مطالعه کاربر" />
        </div>
      )}

      {/* TAB CONTENT: Recent Sessions */}
      {activeTab === 'sessions' && (
        <div className="rounded-3xl border border-border/80 bg-surface p-6 shadow-sm animate-fade-in">
          <div className="mb-5">
            <h2 className="text-base font-extrabold text-text">آخرین جلسات مطالعه کاربر</h2>
            <p className="text-xs text-text-muted">فهرست ۳۰ جلسه اخیر همراه با ساعت، مدت، و یادداشت ثبت‌شده</p>
          </div>

          {recent_sessions && recent_sessions.length > 0 ? (
            <div className="admin-table-scroll" role="region" aria-label="جلسات اخیر کاربر" tabIndex={0}>
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-border/80 text-text-muted font-bold">
                    <th className="pb-3 pr-2">تکنولوژی</th>
                    <th className="pb-3 px-3">پروژه</th>
                    <th className="pb-3 px-3">مدت زمان</th>
                    <th className="pb-3 px-3">تاریخ و ساعت</th>
                    <th className="pb-3 pl-2">یادداشت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {recent_sessions.map(s => (
                    <tr key={s.id} className="hover:bg-surface-lighter/30 transition-colors">
                      <td className="py-3 pr-2">
                        <span
                          className="admin-tech-badge inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold"
                          style={{
                            '--tech-color': s.technology.color,
                          }}
                        >
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.technology.color }} />
                          <bdi>{s.technology.name}</bdi>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-text font-medium">
                        {s.project?.name || '—'}
                      </td>
                      <td className="py-3 px-3 font-extrabold text-text">
                        {formatAdminNumber(s.duration_hours)} ساعت
                        <span className="text-[10px] text-text-muted mr-1">({formatAdminNumber(s.duration_minutes)} دقیقه)</span>
                      </td>
                      <td className="py-3 px-3 text-text-muted">
                        <div>{formatAdminDate(s.session_date)}</div>
                        <div dir="ltr" className="text-right text-[10px]">{s.start_time} – {s.end_time}</div>
                      </td>
                      <td className="admin-note py-3 pl-2 text-text-muted">
                        {s.note || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-12 text-center text-xs text-text-muted">هنوز هیچ جلسه‌ای برای این کاربر ثبت نشده است.</p>
          )}
        </div>
      )}
    </div>
  );
}
