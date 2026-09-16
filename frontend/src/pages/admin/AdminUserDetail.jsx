import { useState, useEffect } from 'react';
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

export default function AdminUserDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('techs'); // 'techs' | 'projects' | 'social' | 'sessions' | 'trend'
  const [roleUpdating, setRoleUpdating] = useState(false);

  const loadUser = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.getUserDetail(id);
      if (res?.data) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.message || 'خطا در بارگذاری پرونده کاربر');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, [id]);

  const handleRoleToggle = async () => {
    if (!data?.profile) return;
    const currentRole = data.profile.role;
    const targetRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`آیا از تغییر نقش کاربر به ${targetRole === 'admin' ? 'مدیر' : 'کاربر عادی'} اطمینان دارید؟`)) {
      return;
    }

    setRoleUpdating(true);
    try {
      await adminApi.updateUserRole(data.profile.id, targetRole);
      setData(prev => ({
        ...prev,
        profile: { ...prev.profile, role: targetRole },
      }));
    } catch (err) {
      alert(err.message || 'خطا در به‌روزرسانی نقش');
    } finally {
      setRoleUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-xs font-semibold text-text-muted">در حال آماده‌سازی پرونده کاربر...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-6 text-center">
        <p className="text-sm font-bold text-red-400 mb-4">{error || 'کاربر یافت نشد'}</p>
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
  const isPrimaryAdmin = profile.email === 'dtadmincode2026@gmail.com';
  const maxHistoryHours = Math.max(1, ...(study_history_14?.map(d => d.hours) || [1]));

  const formatPersianDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fa-IR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return String(dateStr).slice(0, 10);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-text-muted">
          <Link to="/admin/users" className="hover:text-primary transition-colors flex items-center gap-1">
            <HiOutlineArrowRight size={14} />
            کاربران
          </Link>
          <span>/</span>
          <span className="text-text font-bold">پرونده کاربر {profile.display_name}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadUser}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-surface px-3 py-1.5 text-xs font-bold text-text-muted hover:text-text shadow-sm"
          >
            <HiOutlineRefresh size={14} /> تازه‌سازی
          </button>
          {!isPrimaryAdmin && (
            <button
              onClick={handleRoleToggle}
              disabled={roleUpdating}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold shadow-sm transition-all ${
                profile.role === 'admin'
                  ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30 hover:bg-amber-500/25'
                  : 'bg-primary text-white hover:bg-primary-hover shadow-primary/20'
              }`}
            >
              <HiOutlineShieldCheck size={15} />
              {profile.role === 'admin' ? 'تنزل به کاربر عادی' : 'ارتقا به مدیر'}
            </button>
          )}
        </div>
      </div>

      {/* User Header Profile Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-surface p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="relative">
              <Avatar src={profile.avatar_url} seed={profile.username} size="xl" />
              {profile.is_studying && (
                <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-surface text-white" title="در حال مطالعه">
                  <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                </span>
              )}
            </div>

            <div className="space-y-1">
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

              <p className="text-xs text-text-muted">
                @{profile.username} • <span className="text-text font-medium">{profile.email}</span>
              </p>

              {profile.bio && (
                <p className="text-xs text-text-muted mt-2 max-w-xl italic bg-surface-lighter/40 p-2 rounded-xl">
                  "{profile.bio}"
                </p>
              )}
            </div>
          </div>

          {/* Quick Registration & Presence Meta */}
          <div className="grid grid-cols-2 sm:flex sm:flex-col gap-2.5 text-xs bg-surface-lighter/30 p-3.5 rounded-2xl border border-border/60 min-w-[200px]">
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
            {study_stats.today_hours} <span className="text-xs font-semibold text-text-muted">ساعت</span>
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
            {study_stats.yesterday_hours} <span className="text-xs font-semibold text-text-muted">ساعت</span>
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
            {study_stats.week_hours} <span className="text-xs font-semibold text-text-muted">ساعت</span>
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
            {study_stats.month_hours} <span className="text-xs font-semibold text-text-muted">ساعت</span>
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
            {study_stats.total_hours} <span className="text-xs font-semibold text-text-muted">ساعت</span>
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">{study_stats.sessions_count} جلسه ثبت‌شده</div>
        </div>
      </div>

      {/* Navigation Tabs for Details */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border/80 pb-3">
        {[
          { id: 'techs', label: `تکنولوژی‌ها (${technologies?.length || 0})`, icon: HiOutlineAcademicCap },
          { id: 'projects', label: `پروژه‌ها (${projects?.length || 0})`, icon: HiOutlineFolder },
          { id: 'social', label: `فالوها (${social?.following_count || 0} / ${social?.followers_count || 0})`, icon: HiOutlineUsers },
          { id: 'trend', label: 'نمودار ۱۴ روزه', icon: HiOutlineClock },
          { id: 'sessions', label: `جلسات اخیر (${recent_sessions?.length || 0})`, icon: HiOutlineDocumentText },
        ].map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-bold transition-all ${
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3.5 w-3.5 rounded-full shadow-sm"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="text-sm font-bold text-text">{t.name}</span>
                    </div>
                    <span className="font-black text-text text-sm">
                      {t.totalHours} <span className="text-[11px] font-normal text-text-muted">h</span>
                    </span>
                  </div>

                  <div className="h-2 w-full rounded-full bg-surface-lighter overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${t.percent}%`, backgroundColor: t.color }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-text-muted">
                    <span>{t.percent}% از کل زمان مطالعه</span>
                    <span>{t.sessionsCount} جلسه</span>
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
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-text">{p.name}</span>
                    <span className="font-black text-text text-sm">{p.totalHours} ساعت</span>
                  </div>
                  <div className="text-xs text-text-muted">{p.sessionsCount} جلسه اختصاص داده شده</div>
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
                کسانی که این کاربر دنبال کرده (Following: {social.following_count})
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
                    <Avatar src={target.avatar_url} seed={target.username} size="md" />
                    <div className="truncate flex-1">
                      <p className="font-bold text-xs text-text group-hover:text-primary transition-colors truncate">
                        {target.display_name}
                      </p>
                      <p className="text-[11px] text-text-muted truncate">@{target.username}</p>
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
                کسانی که این کاربر را دنبال می‌کنند (Followers: {social.followers_count})
              </h2>
              <p className="text-xs text-text-muted">فهرست اعضایی که این کاربر را فالو کرده‌اند</p>
            </div>

            {social.followers && social.followers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {social.followers.map(follower => (
                  <Link
                    key={follower.id}
                    to={`/admin/users/${follower.id}`}
                    className="flex items-center gap-3 rounded-2xl border border-border/60 bg-surface-lighter/30 p-3 hover:bg-surface-lighter transition-all group"
                  >
                    <Avatar src={follower.avatar_url} seed={follower.username} size="md" />
                    <div className="truncate flex-1">
                      <p className="font-bold text-xs text-text group-hover:text-primary transition-colors truncate">
                        {follower.display_name}
                      </p>
                      <p className="text-[11px] text-text-muted truncate">@{follower.username}</p>
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
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-extrabold text-text">روند مطالعه ۱۴ روز اخیر</h2>
              <p className="text-xs text-text-muted">توزیع ساعات مطالعه کاربر در دو هفته گذشته</p>
            </div>
            <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-xl">
              حداکثر روزانه: {maxHistoryHours} ساعت
            </span>
          </div>

          <div className="flex h-56 items-end gap-2 pt-6 pb-2 px-2">
            {study_history_14?.map((item, idx) => {
              const heightPercent = maxHistoryHours > 0 ? Math.max(8, Math.round((item.hours / maxHistoryHours) * 100)) : 8;
              const isToday = idx === study_history_14.length - 1;
              const dateLabel = item.date.slice(5);

              return (
                <div key={item.date} className="group relative flex-1 flex flex-col items-center h-full justify-end">
                  <div className="pointer-events-none absolute -top-12 z-20 hidden rounded-xl bg-surface-dark px-2.5 py-1.5 text-center text-[11px] font-bold text-white shadow-xl group-hover:block border border-border whitespace-nowrap">
                    <p>{item.date}</p>
                    <p className="text-amber-400">{item.hours} ساعت ({item.sessions} جلسه)</p>
                  </div>
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
                  <span className={`mt-2 text-[10px] font-semibold truncate ${isToday ? 'text-primary font-black' : 'text-text-muted'}`}>
                    {dateLabel}
                  </span>
                </div>
              );
            })}
          </div>
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
            <div className="overflow-x-auto">
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
                          className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold"
                          style={{
                            backgroundColor: `${s.technology.color}15`,
                            color: s.technology.color,
                          }}
                        >
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.technology.color }} />
                          {s.technology.name}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-text font-medium">
                        {s.project?.name || '—'}
                      </td>
                      <td className="py-3 px-3 font-extrabold text-text">
                        {s.duration_hours} ساعت
                        <span className="text-[10px] text-text-muted mr-1">({s.duration_minutes}m)</span>
                      </td>
                      <td className="py-3 px-3 text-text-muted">
                        <div>{s.session_date}</div>
                        <div className="text-[10px]">{s.start_time} - {s.end_time}</div>
                      </td>
                      <td className="py-3 pl-2 text-text-muted max-w-[250px] truncate">
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
