import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FOCUS_TRACKS } from '../constants/music';
import { MusicContext } from './MusicContextStore';

const SETTINGS_KEY = 'devtracker-focus-music';

const loadSettings = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    return {
      currentIndex: Number.isInteger(saved.currentIndex) ? saved.currentIndex : 0,
      volume: typeof saved.volume === 'number' ? saved.volume : 0.55,
    };
  } catch {
    return { currentIndex: 0, volume: 0.55 };
  }
};

export function MusicProvider({ children }) {
  const audioRef = useRef(null);
  const saved = useMemo(loadSettings, []);
  const [currentIndex, setCurrentIndex] = useState(
    Math.min(Math.max(saved.currentIndex, 0), FOCUS_TRACKS.length - 1)
  );
  const [volume, setVolume] = useState(saved.volume);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    audioRef.current = new Audio();
    audioRef.current.preload = 'auto';

    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ currentIndex, volume }));
  }, [currentIndex, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.src = FOCUS_TRACKS[currentIndex].src;
    audio.load();

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    }
  }, [currentIndex, isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const playNext = () => {
      setCurrentIndex(index => (index + 1) % FOCUS_TRACKS.length);
      setIsPlaying(true);
      setHasStarted(true);
    };

    audio.addEventListener('ended', playNext);
    return () => audio.removeEventListener('ended', playNext);
  }, []);

  const play = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.src) {
      audio.src = FOCUS_TRACKS[currentIndex].src;
    }

    await audio.play();
    setIsPlaying(true);
    setHasStarted(true);
  }, [currentIndex]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (isPlaying) {
      pause();
      return;
    }

    play().catch(() => setIsPlaying(false));
  }, [isPlaying, pause, play]);

  const playTrack = useCallback((index) => {
    const nextIndex = Math.min(Math.max(index, 0), FOCUS_TRACKS.length - 1);
    setCurrentIndex(nextIndex);
    setIsPlaying(true);
    setHasStarted(true);

    const audio = audioRef.current;
    if (!audio) return;

    audio.src = FOCUS_TRACKS[nextIndex].src;
    audio.currentTime = 0;
    audio.play().catch(() => setIsPlaying(false));
  }, []);

  const next = useCallback(() => {
    const nextIndex = (currentIndex + 1) % FOCUS_TRACKS.length;
    playTrack(nextIndex);
  }, [currentIndex, playTrack]);

  const previous = useCallback(() => {
    const previousIndex = (currentIndex - 1 + FOCUS_TRACKS.length) % FOCUS_TRACKS.length;
    playTrack(previousIndex);
  }, [currentIndex, playTrack]);

  const value = useMemo(() => ({
    tracks: FOCUS_TRACKS,
    currentTrack: FOCUS_TRACKS[currentIndex],
    currentIndex,
    isPlaying,
    hasStarted,
    volume,
    setVolume,
    play,
    pause,
    toggle,
    playTrack,
    next,
    previous,
  }), [currentIndex, hasStarted, isPlaying, next, pause, play, playTrack, previous, toggle, volume]);

  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
}
