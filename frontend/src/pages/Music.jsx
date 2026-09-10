import {
  HiOutlineFastForward,
  HiOutlineMusicNote,
  HiOutlinePause,
  HiOutlinePlay,
  HiOutlineRewind,
  HiOutlineVolumeUp,
  HiOutlineSparkles,
} from 'react-icons/hi';
import { Card, Button } from '../components/ui';
import { useMusic } from '../contexts/MusicContextStore';

export default function Music() {
  const music = useMusic();

  return (
    <div className="mx-auto max-w-5xl space-y-7">
      <div className="animate-fade-in">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
          <HiOutlineSparkles size={16} />
          <span>Audio Experience</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Focus Music</h1>
        <p className="mt-1 text-xs sm:text-sm text-text-muted">Calm ambient tracks designed to help you enter deep flow state during programming sessions</p>
      </div>

      <Card className="animate-fade-in overflow-hidden p-0 border-indigo-500/20">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Main Player Display */}
          <div className="border-b border-border/80 p-6 lg:border-b-0 lg:border-r">
            <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/10 via-surface-lighter/50 to-violet-500/10 p-8 text-center border border-border/60 backdrop-blur-md">
              <div className={`mb-6 flex h-28 w-28 items-center justify-center rounded-3xl transition-all duration-500 ${music.isPlaying ? 'bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-2xl shadow-indigo-500/40 ring-4 ring-indigo-400/30 animate-float' : 'bg-surface-lighter text-text-muted ring-1 ring-border'}`}>
                <HiOutlineMusicNote size={48} className={music.isPlaying ? 'animate-pulse' : ''} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-indigo-400">Now Playing</p>
              <h2 className="mt-2 text-2xl font-extrabold text-text">{music.currentTrack.title}</h2>
              <p className="mt-1 text-xs font-medium text-text-muted">{music.currentTrack.subtitle}</p>

              {/* Controls */}
              <div className="mt-8 flex items-center justify-center gap-3">
                <Button variant="outline" size="lg" onClick={music.previous} title="Previous track">
                  <HiOutlineRewind size={20} />
                </Button>
                <Button size="lg" onClick={music.toggle} className="min-w-[150px] py-3">
                  {music.isPlaying ? <HiOutlinePause size={20} /> : <HiOutlinePlay size={20} />}
                  {music.isPlaying ? 'Pause' : 'Play'}
                </Button>
                <Button variant="outline" size="lg" onClick={music.next} title="Next track">
                  <HiOutlineFastForward size={20} />
                </Button>
              </div>

              {/* Volume */}
              <div className="mt-8 flex w-full max-w-xs items-center gap-3">
                <HiOutlineVolumeUp size={18} className="text-text-muted" />
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
                <span className="w-10 text-right text-xs font-mono text-text-muted">{Math.round(music.volume * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Track List */}
          <div className="p-4 sm:p-6">
            <h3 className="font-bold text-sm uppercase tracking-wider text-text-muted mb-3">Playlist</h3>
            <div className="space-y-2">
              {music.tracks.map((track, index) => {
                const active = index === music.currentIndex;

                return (
                  <button
                    key={track.src}
                    type="button"
                    onClick={() => music.playTrack(index)}
                    className={`flex w-full items-center gap-3.5 rounded-xl border p-3.5 text-left transition-all duration-200 ${
                      active
                        ? 'border-indigo-500/40 bg-gradient-to-r from-indigo-500/15 to-violet-500/10 text-text shadow-md shadow-indigo-500/5'
                        : 'border-transparent text-text-muted hover:border-border hover:bg-surface-lighter/60 hover:text-text'
                    }`}
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${active ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-md' : 'bg-surface-lighter text-text-muted'}`}>
                      {active && music.isPlaying ? <HiOutlinePause size={18} /> : <HiOutlinePlay size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold">{track.title}</p>
                      <p className="truncate text-[11px] font-medium text-text-muted">{track.subtitle}</p>
                    </div>
                    <span className="text-[11px] font-mono text-text-muted">{track.duration}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
