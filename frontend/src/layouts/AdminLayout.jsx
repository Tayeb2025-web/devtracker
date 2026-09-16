import { NavLink, Link } from 'react-router-dom';
import {
  HiOutlineChartPie,
  HiOutlineUsers,
  HiOutlineArrowLeft,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineLogout,
  HiOutlineShieldCheck,
} from 'react-icons/hi';
import { useAuth } from '../contexts/AuthContextStore';
import { useTheme } from '../contexts/ThemeContextStore';
import Avatar from '../components/Avatar';

export default function AdminLayout({ children }) {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-surface text-text font-sans antialiased">
      {/* Top Admin Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-border/80 bg-surface/85 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          {/* Logo & Portal Badge */}
          <div className="flex items-center gap-3">
            <Link to="/admin" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/25 ring-1 ring-white/20">
                <HiOutlineShieldCheck size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-extrabold tracking-tight gradient-text">DevTracker</span>
                  <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-500 border border-amber-500/30">
                    ADMIN
                  </span>
                </div>
                <p className="text-[11px] font-medium text-text-muted">پنل مدیریت و نظارت هوشمند</p>
              </div>
            </Link>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 rounded-2xl bg-surface-lighter/60 p-1 border border-border/60">
            <NavLink
              to="/admin"
              end
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-text-muted hover:text-text hover:bg-surface'
                }`
              }
            >
              <HiOutlineChartPie size={16} />
              داشبورد و آمار سیستم
            </NavLink>
            <NavLink
              to="/admin/users"
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-text-muted hover:text-text hover:bg-surface'
                }`
              }
            >
              <HiOutlineUsers size={16} />
              مدیریت و پرونده کاربران
            </NavLink>
          </nav>

          {/* Right Actions & Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Switch to Main App */}
            <Link
              to="/"
              title="ورود به فضای کاربری اصلی"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-surface px-3 py-2 text-xs font-semibold text-text-muted hover:text-primary hover:border-primary/50 transition-all shadow-sm"
            >
              <HiOutlineArrowLeft size={15} />
              <span className="hidden sm:inline">بازگشت به برنامه</span>
            </Link>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="تغییر تم"
              className="rounded-xl border border-border/80 p-2 text-text-muted hover:text-text hover:bg-surface-lighter transition-all"
            >
              {isDark ? <HiOutlineSun size={17} /> : <HiOutlineMoon size={17} />}
            </button>

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-surface px-2.5 py-1.5">
              <Avatar src={user?.avatar_url} seed={user?.username || 'admin'} size="xs" />
              <div className="hidden lg:block text-right">
                <p className="text-xs font-bold text-text truncate max-w-[120px]">{user?.display_name || user?.username}</p>
                <span className="text-[10px] text-amber-500 font-semibold">مدیر کل</span>
              </div>
            </div>

            {/* Logout */}
            <button
              type="button"
              onClick={logout}
              title="خروج از حساب"
              className="rounded-xl border border-border/80 p-2 text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
            >
              <HiOutlineLogout size={17} />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex md:hidden border-t border-border/60 bg-surface-lighter/40 px-4 py-2 gap-2">
          <NavLink
            to="/admin"
            end
            className={({ isActive }) =>
              `flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
                isActive ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface'
              }`
            }
          >
            <HiOutlineChartPie size={15} />
            داشبورد
          </NavLink>
          <NavLink
            to="/admin/users"
            className={({ isActive }) =>
              `flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold transition-all ${
                isActive ? 'bg-primary text-white' : 'text-text-muted hover:bg-surface'
              }`
            }
          >
            <HiOutlineUsers size={15} />
            کاربران
          </NavLink>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
