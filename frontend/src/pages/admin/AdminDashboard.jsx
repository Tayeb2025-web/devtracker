import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PiUsersThreeDuotone, PiClockDuotone, PiFireDuotone, PiGraduationCapDuotone, PiLightningDuotone, PiArrowLeftDuotone, PiArrowClockwiseDuotone, PiCalendarDotsDuotone, PiSparkleDuotone, PiShieldCheckDuotone } from 'react-icons/pi';
import { adminApi } from '../../services/api';
import Avatar from '../../components/Avatar';
import AdminFeedback from '../../components/admin/AdminFeedback';
import AdminStudyChart from '../../components/admin/AdminStudyChart';
import { AdminPageHeader, AdminMetricCard, AdminPanel, AdminEmptyState, AdminLoading } from '../../components/admin/AdminUI';
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
      setData(res.data);
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err.message || 'خطا در بارگذاری آمار سیستم');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  if (loading && !data) return <AdminLoading label="در حال آماده‌سازی نمای کلی پلتفرم..." />;
  if (error && !data) return <AdminFeedback message={error} onRetry={loadData} loading={loading} />;

  const { metrics = {}, studyTrend14 = [], popularTechnologies = [], recentActivity = [], recentAdminActions = [] } = data || {};
  const maxTechHours = Math.max(1, ...popularTechnologies.map(tech => Number(tech.totalHours) || 0));
  const actions = <>
    <button type="button" onClick={loadData} disabled={loading} className="admin-button admin-button-secondary"><PiArrowClockwiseDuotone aria-hidden="true" size={17} className={loading ? 'animate-spin' : ''} />{loading ? 'در حال دریافت...' : 'به‌روزرسانی آمار'}</button>
    <Link to="/admin/users" className="admin-button admin-button-primary"><PiUsersThreeDuotone aria-hidden="true" size={17} />مدیریت کاربران<PiArrowLeftDuotone aria-hidden="true" size={16} /></Link>
  </>;

  return <div className="admin-stack">
    {error && <AdminFeedback message={`${error} اطلاعات قبلی نمایش داده می‌شود.`} onRetry={loadData} loading={loading} />}
    <AdminPageHeader eyebrow="مرکز کنترل Codelume" title="نبض پلتفرم، در یک نگاه" description="از فعالیت امروز تا مسیر رشد جامعه؛ همهٔ اطلاعاتی که برای مدیریت نیاز دارید." actions={actions} className="admin-hero">
      <span className="admin-update-time"><PiClockDuotone aria-hidden="true" size={13} />آخرین دریافت آمار<time dateTime={updatedAt?.toISOString()}>{formatAdminDate(updatedAt, { hour: '2-digit', minute: '2-digit' })}</time></span>
    </AdminPageHeader>

    <div className="admin-metrics">
      <AdminMetricCard icon={PiUsersThreeDuotone} tone="violet" label="اعضای جامعه" value={metrics.totalUsers} detail={<><span className="admin-metric-pill">+{formatAdminNumber(metrics.newUsersToday)} عضو امروز</span>{formatAdminNumber(metrics.newUsersWeek)} عضو جدید این هفته</>} />
      <AdminMetricCard icon={PiClockDuotone} tone="blue" label="مجموع زمان یادگیری" value={metrics.totalHours} unit="ساعت" detail={<><strong>{formatAdminNumber(metrics.totalSessions)} جلسه</strong> در کل پلتفرم ثبت شده</>} />
      <AdminMetricCard icon={PiFireDuotone} tone="amber" label="مطالعهٔ امروز" value={metrics.todayHours} unit="ساعت" detail={<>دیروز <strong>{formatAdminNumber(metrics.yesterdayHours)}</strong> · این هفته <strong>{formatAdminNumber(metrics.weekHours)}</strong> ساعت</>} />
      <AdminMetricCard icon={PiLightningDuotone} tone="cyan" label="کاربران فعال امروز" value={metrics.activeTodayUsers} detail={<><span className="admin-metric-pill">{formatAdminNumber(metrics.active7DaysUsers)} کاربر فعال</span>در ۷ روز گذشته</>} />
    </div>

    <div className="admin-analytics-grid">
      <AdminPanel icon={PiCalendarDotsDuotone} title="مسیر یادگیری جامعه" description="ساعات مطالعهٔ ثبت‌شده در دو هفتهٔ اخیر" action={<span className="admin-pill"><PiCalendarDotsDuotone aria-hidden="true" size={13} />۱۴ روز اخیر</span>} id="admin-trend-title">
        <AdminStudyChart data={studyTrend14} label="نمودار ساعات مطالعه پلتفرم" />
      </AdminPanel>
      <AdminPanel icon={PiGraduationCapDuotone} title="مهارت‌های محبوب" description="رتبه‌بندی بر اساس زمان مطالعه" action={<span className="admin-pill">{formatAdminNumber(metrics.totalTechs)} مهارت</span>} id="admin-tech-title">
        {popularTechnologies.length ? <div className="admin-tech-list">{popularTechnologies.map((tech, index) => <div key={tech.id || index} className="admin-tech-item" style={{ '--tech-color': tech.color || '#9582ef' }}>
          <div className="admin-tech-top"><span className="admin-tech-rank">{formatAdminNumber(index + 1)}</span><bdi className="admin-tech-name">{tech.name}</bdi><span className="admin-tech-hours"><strong>{formatAdminNumber(tech.totalHours)}</strong> ساعت</span></div>
          <div className="admin-tech-progress"><span style={{ width: `${Math.max(0, Math.min(100, Number(tech.totalHours) / maxTechHours * 100))}%` }} /></div>
          <div className="admin-tech-meta"><span>{formatAdminNumber(tech.studentsCount)} یادگیرنده</span><span>{formatAdminNumber(tech.sessions)} جلسه</span></div>
        </div>)}</div> : <AdminEmptyState title="هنوز مهارتی ثبت نشده" description="با ثبت اولین جلسه، مهارت‌های محبوب اینجا نمایش داده می‌شوند." icon={PiGraduationCapDuotone} />}
      </AdminPanel>
    </div>

    <AdminPanel icon={PiSparkleDuotone} title="آخرین فعالیت‌های جامعه" description="تازه‌ترین جلسات مطالعه و جزئیات آن‌ها" action={<Link to="/admin/users" className="admin-text-link">مشاهدهٔ کاربران<PiArrowLeftDuotone aria-hidden="true" size={14} /></Link>} id="admin-activity-title">
      {recentActivity.length ? <div className="admin-table-scroll" role="region" aria-label="آخرین جلسات مطالعه" tabIndex={0}>
        <table><thead><tr><th scope="col" className="px-3 text-right">کاربر</th><th scope="col" className="px-3 text-right">مهارت</th><th scope="col" className="px-3 text-right">زمان مطالعه</th><th scope="col" className="px-3 text-right">تاریخ و ساعت</th><th scope="col" className="px-3 text-right">یادداشت</th><th scope="col" className="px-3 text-left">پرونده</th></tr></thead>
        <tbody className="divide-y divide-border">{recentActivity.map(session => <tr key={session.id}>
          <td className="px-3 py-4"><Link to={`/admin/users/${session.user.id}`} className="group flex items-center gap-3 rounded-lg"><Avatar profile={session.user} showOnline={false} seed={session.user.username} size="sm" /><div className="min-w-0 max-w-40"><p className="truncate font-semibold text-text group-hover:text-primary" title={session.user.display_name}>{session.user.display_name || session.user.username}</p><p dir="ltr" className="truncate text-right text-[10px] text-text-muted" title={session.user.username}>@{session.user.username}</p></div></Link></td>
          <td className="px-3 py-4"><span className="admin-tech-badge inline-flex max-w-44 items-center gap-2 rounded-lg px-2.5 py-1" style={{ '--tech-color': session.technology.color }}><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: session.technology.color }} /><bdi className="break-words">{session.technology.name}</bdi></span></td>
          <td className="whitespace-nowrap px-3 py-4"><p className="font-semibold">{formatAdminNumber(session.duration_hours)} ساعت</p><p className="text-[10px] text-text-muted">{formatAdminNumber(session.duration_minutes)} دقیقه</p></td>
          <td className="whitespace-nowrap px-3 py-4 text-text-muted"><p>{formatAdminDate(session.session_date)}</p><p dir="ltr" className="text-right text-[10px]">{session.start_time} – {session.end_time}</p></td>
          <td className="admin-note px-3 py-4 text-text-muted">{session.note || '—'}</td>
          <td className="px-3 py-4 text-left"><Link to={`/admin/users/${session.user.id}`} className="admin-icon-control" aria-label={`مشاهده پرونده ${session.user.display_name || session.user.username}`}><PiArrowLeftDuotone aria-hidden="true" size={17} /></Link></td>
        </tr>)}</tbody></table>
      </div> : <AdminEmptyState title="هنوز فعالیتی ثبت نشده" description="جلسات مطالعهٔ اعضای جامعه اینجا نمایش داده می‌شوند." icon={PiClockDuotone} />}
    </AdminPanel>

    <AdminPanel icon={PiShieldCheckDuotone} title="رویدادهای مدیریتی" description="تاریخچهٔ آخرین تغییرات نقش و حساب‌های کاربری" action={<span className="admin-pill">سوابق مدیریت</span>} id="admin-audit-heading">
      {recentAdminActions.length ? <ul className="admin-audit-list">{recentAdminActions.map(action => {
        const roles = { admin: 'مدیر', user: 'کاربر عادی' };
        const description = action.action === 'user.role.updated' ? `${action.actor_username} نقش ${action.target_username} را از ${roles[action.details?.previousRole] || 'کاربر عادی'} به ${roles[action.details?.role] || 'کاربر عادی'} تغییر داد.` : `${action.actor_username} حساب ${action.target_username} را حذف کرد.`;
        return <li key={action._id} className="admin-audit-item"><span className="admin-audit-symbol"><PiShieldCheckDuotone aria-hidden="true" size={16} /></span><div><p>{description}</p><time dateTime={action.created_at} title={action.request_id || undefined}>{formatAdminDate(action.created_at, { dateStyle: 'medium', timeStyle: 'short' })}</time></div></li>;
      })}</ul> : <AdminEmptyState title="هنوز رویدادی ثبت نشده" description="تغییرات مدیریتی، همراه با زمان انجام آن‌ها، در این بخش ثبت می‌شوند." icon={PiShieldCheckDuotone} />}
    </AdminPanel>
  </div>;
}
