import {
  HiOutlineFastForward,
  HiOutlineMusicNote,
  HiOutlinePause,
  HiOutlinePlay,
  HiOutlineRewind,
  HiOutlineVolumeUp,
} from 'react-icons/hi';
import { useMusic } from '../contexts/MusicContextStore';

export default function MiniMusicPlayer() {
  const music = useMusic();

  if (!music?.hasStarted) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 w-[min(360px,calc(100vw-2.5rem))] rounded-2xl border border-border/80 glass shadow-2xl animate-slide-up">
      <div className="flex items-center gap-3 p-3.5">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-300 ${music.isPlaying ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30 ring-1 ring-indigo-400/40' : 'bg-surface-lighter text-text-muted'}`}>
          <HiOutlineMusicNote size={20} className={music.isPlaying ? 'animate-pulse' : ''} />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-text">{music.currentTrack.title}</p>
          <p className="truncate text-[11px] font-medium text-text-muted">{music.currentTrack.subtitle}</p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={music.previous}
            aria-label="Previous track"
            title="Previous track"
            className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-lighter hover:text-text"
          >
            <HiOutlineRewind size={18} />
          </button>
          <button
            type="button"
            onClick={music.toggle}
            aria-label={music.isPlaying ? 'Pause music' : 'Play music'}
            title={music.isPlaying ? 'Pause music' : 'Play music'}
            className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 p-2 text-white shadow-md shadow-indigo-500/25 transition-all hover:scale-105 active:scale-95"
          >
            {music.isPlaying ? <HiOutlinePause size={18} /> : <HiOutlinePlay size={18} />}
          </button>
          <button
            type="button"
            onClick={music.next}
            aria-label="Next track"
            title="Next track"
            className="rounded-lg p-2 text-text-muted transition-colors hover:bg-surface-lighter hover:text-text"
          >
            <HiOutlineFastForward size={18} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border/60 px-3.5 py-2">
        <HiOutlineVolumeUp size={15} className="text-text-muted" />
        <input
          aria-label="Music volume"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={music.volume}
          onChange={event => music.setVolume(Number(event.target.value))}
          className="h-1 w-full accent-primary"
        />
        <span className="text-[10px] font-mono text-text-muted min-w-[28px] text-right">{Math.round(music.volume * 100)}%</span>
      </div>
    </div>
  );
}
