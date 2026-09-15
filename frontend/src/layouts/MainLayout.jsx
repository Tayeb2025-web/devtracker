import Sidebar from '../components/Sidebar';
import MiniMusicPlayer from '../components/MiniMusicPlayer';
import CommandPaletteModal from '../components/CommandPaletteModal';
import DevPet from '../components/DevPet';
import LiveActivityBubble from '../components/LiveActivityBubble';
import { useEffect, useState } from 'react';
import { HiOutlineBell, HiOutlineMenuAlt2, HiOutlineVolumeOff } from 'react-icons/hi';
import { useTimer } from '../contexts/TimerContextStore';
import { useAuth } from '../contexts/AuthContextStore';
import { socialApi, technologyApi } from '../services/api';

export default function MainLayout({ children }) {
  const timer = useTimer();
  const { user } = useAuth();
  const { isAlarmActive, dismissAlarm } = timer || {};
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => window.matchMedia('(max-width: 767px)').matches
      || localStorage.getItem('devtracker-sidebar-collapsed') === 'true'
  );
  const [techMap, setTechMap] = useState({});

  useEffect(() => {
    const handleTogglePalette = () => setCommandPaletteOpen(prev => !prev);
    window.addEventListener('toggle-command-palette', handleTogglePalette);
    return () => window.removeEventListener('toggle-command-palette', handleTogglePalette);
  }, []);

  useEffect(() => {
    localStorage.setItem('devtracker-sidebar-collapsed', String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  // Pre-fetch technologies map to identify active technology name
  useEffect(() => {
    if (!user) return;
    technologyApi.getAll().then(res => {
      const list = Array.isArray(res.data) ? res.data : (res.data?.technologies || []);
      const map = {};
      list.forEach(t => { map[t.id] = t.name; });
      setTechMap(map);
    }).catch(() => {});
  }, [user]);

  // Presence heartbeat tracking: records online state and active coding session
  const isStopwatchRunning = Boolean(timer?.isRunning);
  const isCountdownRunning = Boolean(timer?.countdown?.isRunning);
  const isStudying = isStopwatchRunning || isCountdownRunning;
  const activeTechId = isStopwatchRunning ? timer?.technologyId : timer?.countdown?.technologyId;

  useEffect(() => {
    if (!user) return;

    const sendHeartbeat = () => {
      const techName = activeTechId ? techMap[activeTechId] : undefined;
      socialApi.presenceHeartbeat({
        is_studying: isStudying,
        technology_name: techName || null,
      }).catch(() => {});
    };

    // Send immediately on mount or status change
    sendHeartbeat();

    // Periodic heartbeat every 60 seconds
    const interval = setInterval(sendHeartbeat, 60000);

    // Refresh presence when tab regains focus
    const handleVisibility = () => {
      if (!document.hidden) sendHeartbeat();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [user, isStudying, activeTechId, techMap]);

  return (
    <div className="min-h-screen bg-surface relative overflow-x-hidden">
      {/* Ambient background glow */}
      <div className="ambient-bg" />

      <Sidebar isCollapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(true)} />
      {!sidebarCollapsed && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-transparent md:hidden"
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
      <LiveActivityBubble />
    </div>
  );
}
