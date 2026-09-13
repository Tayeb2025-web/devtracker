import Sidebar from '../components/Sidebar';
import MiniMusicPlayer from '../components/MiniMusicPlayer';
import CommandPaletteModal from '../components/CommandPaletteModal';
import DevPet from '../components/DevPet';
import { useEffect, useState } from 'react';
import { HiOutlineBell, HiOutlineMenuAlt2, HiOutlineVolumeOff } from 'react-icons/hi';
import { useTimer } from '../contexts/TimerContextStore';

export default function MainLayout({ children }) {
  const { isAlarmActive, dismissAlarm } = useTimer();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.matchMedia('(max-width: 767px)').matches
      || localStorage.getItem('devtracker-sidebar-collapsed') === 'true'
  );

  useEffect(() => {
    const handleTogglePalette = () => setCommandPaletteOpen(prev => !prev);
    window.addEventListener('toggle-command-palette', handleTogglePalette);
    return () => window.removeEventListener('toggle-command-palette', handleTogglePalette);
  }, []);

  useEffect(() => {
    localStorage.setItem('devtracker-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  return (
    <div className="min-h-screen bg-surface relative overflow-x-hidden">
      {/* Ambient background glow */}
      <div className="ambient-bg" />

      <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(true)} />
      {!sidebarCollapsed && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
      {sidebarCollapsed && (
        <button
          type="button"
          onClick={() => setSidebarCollapsed(false)}
          aria-label="Show sidebar"
          title="Show sidebar"
          className="fixed top-3 left-3 z-50 rounded-xl p-2.5 glass text-text-muted transition-all hover:bg-surface-lighter hover:text-text sm:top-4 sm:left-4 hover:scale-105"
        >
          <HiOutlineMenuAlt2 size={20} />
        </button>
      )}
      {isAlarmActive && (
        <div role="alert" className="fixed top-3 right-3 left-3 z-[70] flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-500/40 bg-red-500/20 px-5 py-3.5 shadow-2xl backdrop-blur-md animate-pulse sm:top-4 sm:right-4 sm:left-auto sm:flex-nowrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-red-500/30 text-red-300">
              <HiOutlineBell size={22} className="animate-bounce" />
            </div>
            <div>
              <p className="text-sm font-bold text-text">Timer Complete!</p>
              <p className="text-xs text-text-muted">Alarm is ringing until you turn it off.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={dismissAlarm}
            className="inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-xs font-bold text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/30"
          >
            <HiOutlineVolumeOff size={16} /> Turn Off
          </button>
        </div>
      )}
      <main className={`${sidebarCollapsed ? 'md:ml-0' : 'md:ml-64'} min-h-screen transition-[margin] duration-300 ease-in-out`}>
        <div className="mx-auto max-w-7xl p-4 pb-28 pt-16 sm:p-6 sm:pb-28 sm:pt-20 lg:p-8 lg:pb-28">
          {children}
        </div>
      </main>
      <CommandPaletteModal isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)} />
      <DevPet />
      <MiniMusicPlayer />
    </div>
  );
}
