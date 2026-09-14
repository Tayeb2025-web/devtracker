import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineHome, HiOutlineClock, HiOutlineChartBar,
  HiOutlineCalendar, HiOutlineCode, HiOutlineDocumentText,
  HiOutlineBadgeCheck, HiOutlineFlag, HiOutlinePencil,
  HiOutlineCog, HiOutlineSearch, HiOutlineFolder, HiOutlineMusicNote,
  HiOutlineUsers, HiX, HiOutlineInformationCircle,
} from 'react-icons/hi';
import { ROUTES } from '../constants';

const navCommands = [
  { label: 'Go to Dashboard', icon: HiOutlineHome, path: ROUTES.DASHBOARD },
  { label: 'Open Focus Timer', icon: HiOutlineClock, path: ROUTES.TIMER },
  { label: 'View Statistics & Analytics', icon: HiOutlineChartBar, path: ROUTES.STATISTICS },
  { label: 'Open Calendar View', icon: HiOutlineCalendar, path: ROUTES.CALENDAR },
  { label: 'Manage Technologies', icon: HiOutlineCode, path: ROUTES.TECHNOLOGIES },
  { label: 'Manage Projects', icon: HiOutlineFolder, path: ROUTES.PROJECTS },
  { label: 'View Session History', icon: HiOutlineDocumentText, path: ROUTES.HISTORY },
  { label: 'View Achievements', icon: HiOutlineBadgeCheck, path: ROUTES.ACHIEVEMENTS },
  { label: 'View Active Challenges', icon: HiOutlineFlag, path: ROUTES.CHALLENGES },
  { label: 'Daily Notes & Reflections', icon: HiOutlinePencil, path: ROUTES.NOTES },
  { label: 'Focus Music & Lofi Player', icon: HiOutlineMusicNote, path: ROUTES.MUSIC },
  { label: 'Community & League Leaderboard', icon: HiOutlineUsers, path: ROUTES.COMMUNITY },
  { label: 'User & System Settings', icon: HiOutlineCog, path: ROUTES.SETTINGS },
  { label: 'About & Contact Developer', icon: HiOutlineInformationCircle, path: ROUTES.ABOUT },
];

export default function CommandPaletteModal({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open handled by parent or state
          window.dispatchEvent(new CustomEvent('toggle-command-palette'));
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredCommands = navCommands.filter(c =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path) => {
    navigate(path);
    onClose();
    setQuery('');
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`${ROUTES.HISTORY}?search=${encodeURIComponent(query)}`);
      onClose();
      setQuery('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden glass">
        {/* Header Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center border-b border-border/80 px-4 py-3">
          <HiOutlineSearch size={20} className="text-text-muted mr-3" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search sessions... (Esc to close)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-text placeholder-text-muted focus:outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="p-1 text-text-muted hover:text-text">
              <HiX size={16} />
            </button>
          )}
        </form>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.path}
                  type="button"
                  onClick={() => handleSelect(cmd.path)}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-text-muted hover:text-text hover:bg-indigo-500/15 hover:border-indigo-500/30 border border-transparent transition-all group text-left"
                >
                  <Icon size={18} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                  <span>{cmd.label}</span>
                </button>
              );
            })
          ) : (
            <div className="p-6 text-center text-xs text-text-muted">
              No matching pages. Press <kbd className="font-mono bg-surface-lighter px-1.5 py-0.5 rounded border border-border">Enter</kbd> to search sessions for "{query}".
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
