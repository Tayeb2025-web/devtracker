import { NavLink, Link, useLocation } from 'react-router-dom';
import { PiChartDonutDuotone, PiUsersThreeDuotone, PiArrowLeftDuotone, PiSunDuotone, PiMoonStarsDuotone, PiSignOutDuotone, PiShieldCheckDuotone, PiCaretLeftDuotone, PiSparkleDuotone } from 'react-icons/pi';
import { useAuth } from '../contexts/AuthContextStore';
import { useTheme } from '../contexts/ThemeContextStore';
import { formatAdminDate } from '../utils/adminFormat';
import Avatar from '../components/Avatar';
import './admin.css';

const navigation = [
  { to: '/admin', label: 'نمای کلی', description: 'آمار و عملکرد پلتفرم', icon: PiChartDonutDuotone, end: true },
  { to: '/admin/users', label: 'کاربران', description: 'حساب‌ها و پرونده‌ها', icon: PiUsersThreeDuotone },
];

function AdminNavigation({ mobile = false }) {
  return <nav aria-label="ناوبری مدیریت" className={mobile ? 'admin-mobile-nav' : 'admin-navigation'}>
    {navigation.map(({ to, label, description, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `admin-nav-link ${isActive ? 'is-active' : ''}`}>
      <span className="admin-nav-icon"><Icon size={24} aria-hidden="true" /></span>
      <span className="admin-nav-copy"><strong>{label}</strong>{!mobile && <small>{description}</small>}</span>
      {!mobile && <PiCaretLeftDuotone aria-hidden="true" size={16} className="admin-nav-arrow" />}
    </NavLink>)}
  </nav>;
}

function Brand() {
  return <Link to="/admin" className="admin-brand" aria-label="پنل مدیریت Codelume">
    <img src="/codeora-mark.svg" width="44" height="44" alt="" />
    <span><strong dir="ltr">Codelume<span className="admin-brand-dot">.</span></strong><small>فضای مدیریت</small></span>
  </Link>;
}

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { pathname } = useLocation();
  const pageTitle = pathname === '/admin' || pathname === '/admin/' ? 'نمای کلی' : pathname === '/admin/users' ? 'کاربران' : 'پروندهٔ کاربر';

  return <div dir="rtl" lang="fa" className="admin-shell">
    <link rel="preload" href="/fonts/estedad/Estedad-Variable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
    <a href="#admin-content" className="admin-skip-link">رفتن به محتوای اصلی</a>
    <aside className="admin-sidebar" aria-label="منوی پنل مدیریت">
      <Brand />
      <div className="admin-sidebar-label">مدیریت پلتفرم</div>
      <AdminNavigation />
      <div className="admin-sidebar-note"><span className="admin-note-symbol"><PiShieldCheckDuotone aria-hidden="true" size={24} /></span><strong>همه‌چیز، در یک نگاه</strong><p>فعالیت جامعه و مسیر یادگیری کاربران را از اینجا دنبال کنید.</p><Link to="/admin/users">مشاهدهٔ کاربران <PiArrowLeftDuotone aria-hidden="true" size={15} /></Link></div>
      <div className="admin-sidebar-bottom">
        <Link to="/" className="admin-back-link"><PiArrowLeftDuotone aria-hidden="true" size={19} />بازگشت به برنامه</Link>
        <div className="admin-sidebar-profile"><Avatar profile={user} showOnline={false} size="sm" /><div><strong title={user?.display_name || user?.username}>{user?.display_name || user?.username || 'مدیر'}</strong><span><PiShieldCheckDuotone aria-hidden="true" size={12} />مدیر پلتفرم</span></div></div>
      </div>
    </aside>
    <div className="admin-workspace">
      <header className="admin-topbar">
        <div className="admin-topbar-brand"><Brand /></div>
        <div className="admin-breadcrumb"><PiShieldCheckDuotone aria-hidden="true" size={17} /><span>مدیریت</span><PiCaretLeftDuotone aria-hidden="true" size={14} /><strong>{pageTitle}</strong></div>
        <div className="admin-topbar-actions">
          <span className="admin-current-date">{formatAdminDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })}</span>
          <span className="admin-access-badge"><PiShieldCheckDuotone aria-hidden="true" size={14} />دسترسی مدیر</span>
          <Link to="/" className="admin-icon-control admin-mobile-back" aria-label="بازگشت به برنامه" title="بازگشت به برنامه"><PiArrowLeftDuotone aria-hidden="true" size={19} /></Link>
          <button type="button" onClick={toggleTheme} className="admin-icon-control" aria-label={isDark ? 'فعال کردن تم روشن' : 'فعال کردن تم تیره'} title={isDark ? 'تم روشن' : 'تم تیره'}>{isDark ? <PiSunDuotone aria-hidden="true" size={19} /> : <PiMoonStarsDuotone aria-hidden="true" size={19} />}</button>
          <button type="button" onClick={logout} className="admin-icon-control admin-logout" aria-label="خروج از حساب" title="خروج از حساب"><PiSignOutDuotone aria-hidden="true" size={19} /></button>
        </div>
      </header>
      <AdminNavigation mobile />
      <main id="admin-content" tabIndex={-1} className="admin-main">{children}</main>
      <footer className="admin-footer"><span dir="ltr">Codelume <span> / </span> Admin workspace</span><span><PiSparkleDuotone aria-hidden="true" size={13} />برای مسیرهای رو به رشد</span></footer>
    </div>
  </div>;
}
