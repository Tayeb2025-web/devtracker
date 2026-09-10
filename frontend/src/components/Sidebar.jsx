import { NavLink } from 'react-router-dom';
import {
  HiOutlineHome, HiOutlineClock, HiOutlineChartBar,
  HiOutlineCalendar, HiOutlineCode, HiOutlineDocumentText,
  HiOutlineBadgeCheck, HiOutlineFlag, HiOutlinePencil,
  HiOutlineCog, HiOutlineSearch, HiOutlineSun, HiOutlineMoon, HiOutlineMenuAlt2,
  HiOutlineMusicNote,
  HiOutlineFolder,
  HiOutlineLogout,
  HiOutlineUsers,
} from 'react-icons/hi';
import { ROUTES } from '../constants';
import { useTheme } from '../contexts/ThemeContextStore';
import { useAuth } from '../contexts/AuthContextStore';

const navItems = [
  { to: ROUTES.DASHBOARD, icon: HiOutlineHome, label: 'Dashboard' },
  { to: ROUTES.TIMER, icon: HiOutlineClock, label: 'Timer' },
  { to: ROUTES.STATISTICS, icon: HiOutlineChartBar, label: 'Statistics' },
  { to: ROUTES.CALENDAR, icon: HiOutlineCalendar, label: 'Calendar' },
  { to: ROUTES.TECHNOLOGIES, icon: HiOutlineCode, label: 'Technologies' },
  { to: ROUTES.PROJECTS, icon: HiOutlineFolder, label: 'Projects' },
  { to: ROUTES.HISTORY, icon: HiOutlineDocumentText, label: 'History' },
  { to: ROUTES.ACHIEVEMENTS, icon: HiOutlineBadgeCheck, label: 'Achievements' },
  { to: ROUTES.CHALLENGES, icon: HiOutlineFlag, label: 'Challenges' },
  { to: ROUTES.NOTES, icon: HiOutlinePencil, label: 'Notes' },
  { to: ROUTES.MUSIC, icon: HiOutlineMusicNote, label: 'Music' },
  { to: ROUTES.COMMUNITY, icon: HiOutlineUsers, label: 'Community' },
  { to: ROUTES.SETTINGS, icon: HiOutlineCog, label: 'Settings' },
];

export default function Sidebar({ isCollapsed, onToggle }) {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  return (
    <aside className={`fixed left-0 top-0 z-40 flex h-[100dvh] w-[min(18rem,calc(100vw-3rem))] flex-col border-r border-border glass transition-transform duration-300 ease-in-out md:w-64 ${isCollapsed ? '-translate-x-full' : 'translate-x-0'}`}>
      {/* Brand Header */}
      <div className="relative p-5 border-b border-border/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 p-2 ring-1 ring-indigo-500/30 shadow-lg shadow-indigo-500/10">
            <img src="/codeora-mark.svg" alt="Codelume" className="h-7 w-7 drop-shadow" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg leading-tight tracking-tight gradient-text">Codelume</h1>
            <p className="text-[11px] font-medium text-text-muted">Build your momentum</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-label="Hide sidebar"
          title="Hide sidebar"
          className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-surface-lighter transition-all"
        >
          <HiOutlineMenuAlt2 size={19} />
        </button>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === ROUTES.DASHBOARD}
            onClick={() => window.matchMedia('(max-width: 767px)').matches && onToggle()}
            className={({ isActive }) =>
              `relative flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-500/15 to-violet-500/10 text-indigo-400 border border-indigo-500/25 shadow-md shadow-indigo-500/5'
                  : 'text-text-muted hover:text-text hover:bg-surface-lighter/70'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-gradient-to-b from-indigo-500 to-violet-500 shadow-[0_0_10px_#6366f1]" />
                )}
                <Icon size={19} className={`transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-indigo-400' : ''}`} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer / Profile / Search */}
      <div className="p-3 border-t border-border/80 space-y-2">
        {/* User Card */}
        <div className="flex items-center gap-3 rounded-xl bg-surface-lighter/50 border border-border/60 p-2.5 backdrop-blur-sm">
          <div className="relative">
            <img src={user?.avatar_url || '/images/profile.jpg'} alt="Profile" className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/30" />
            <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-surface" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-text">{user?.display_name || user?.username}</p>
            <p className="truncate text-[11px] text-text-muted">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            title="Log out"
            aria-label="Log out"
            className="rounded-lg p-2 text-text-muted hover:bg-red-500/15 hover:text-red-400 transition-colors"
          >
            <HiOutlineLogout size={17} />
          </button>
        </div>

        {/* Quick Search */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('toggle-command-palette'))}
          className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text hover:bg-surface-lighter w-full transition-all"
        >
          <HiOutlineSearch size={17} />
          <span>Quick Command</span>
          <kbd className="ml-auto text-[10px] font-mono bg-surface-lighter px-1.5 py-0.5 rounded-md border border-border text-text-muted">Ctrl+K</kbd>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text hover:bg-surface-lighter w-full transition-all"
        >
          {isDark ? <HiOutlineSun size={17} className="text-amber-400" /> : <HiOutlineMoon size={17} className="text-indigo-400" />}
          <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
      </div>
    </aside>
  );
}
