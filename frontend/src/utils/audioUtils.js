// Web Audio API Sound Utility for Timer Alarms and Ambient Focus Sounds

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Play pleasant timer completion chime sound
export function playCompletionChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    
    // Play a sequence of 4 harmonious notes (C5 -> E5 -> G5 -> C6)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    
    notes.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.12);
      
      gain.gain.setValueAtTime(0.001, now + index * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.3, now + index * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.12 + 0.5);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(now + index * 0.12);
      osc.stop(now + index * 0.12 + 0.55);
    });
  } catch (err) {
    console.warn('Audio chime error:', err);
  }
}

// Ambient Sound Generator using Web Audio Noise Nodes
class AmbientSoundGenerator {
  constructor() {
    this.activeSource = null;
    this.gainNode = null;
    this.currentType = 'off';
  }

  stop() {
    if (this.activeSource) {
      try {
        this.activeSource.stop();
        this.activeSource.disconnect();
      } catch {
        // Ignore
      }
      this.activeSource = null;
    }
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {
        // Ignore
      }
      this.gainNode = null;
    }
    this.currentType = 'off';
  }

  setVolume(val) { // val between 0 and 1
    if (this.gainNode && audioCtx) {
      this.gainNode.gain.setValueAtTime(Math.max(0, Math.min(1, val)), audioCtx.currentTime);
    }
  }

  play(type, volume = 0.3) {
    this.stop();
    if (type === 'off') return;

    const ctx = getAudioContext();
    if (!ctx) return;

    this.currentType = type;
    this.gainNode = ctx.createGain();
    this.gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    this.gainNode.connect(ctx.destination);

    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    if (type === 'rain') {
      // Pink / Brownish Noise for Rain
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        output[i] *= 0.05;
        b6 = white * 0.115926;
      }
    } else if (type === 'waves') {
      // Smooth Low Filtered Ocean Waves
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 2.5;
      }
    } else { // 'whitenoise'
      for (let i = 0; i < bufferSize; i++) {
        output[i] = (Math.random() * 2 - 1) * 0.1;
      }
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter to make it smooth and ambient
    const filter = ctx.createBiquadFilter();
    filter.type = type === 'rain' ? 'lowpass' : type === 'waves' ? 'bandpass' : 'lowpass';
    filter.frequency.setValueAtTime(type === 'rain' ? 800 : type === 'waves' ? 400 : 1200, ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.gainNode);
    whiteNoise.start();

    this.activeSource = whiteNoise;
  }
}

export const ambientSound = new AmbientSoundGenerator();

// Cat Meow Sound Management for Pet & Timer Alarm
let currentCatAudio = null;
let catAlarmInterval = null;

// Synthetic realistic cat meow using Web Audio API as 100% reliable fallback
export function playSyntheticMeow() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const formant = ctx.createBiquadFilter();

    osc.type = 'triangle';
    formant.type = 'bandpass';
    formant.frequency.setValueAtTime(850, now);
    formant.Q.setValueAtTime(2.5, now);

    // Pitch contour for expressive "Me-ow"
    osc.frequency.setValueAtTime(380, now);
    osc.frequency.exponentialRampToValueAtTime(760, now + 0.35);
    osc.frequency.exponentialRampToValueAtTime(420, now + 1.1);

    // Subtle vocal flutter / vibrato
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibrato.frequency.setValueAtTime(5.2, now);
    vibratoGain.gain.setValueAtTime(14, now);
    vibrato.connect(osc.frequency);
    vibrato.start(now);
    vibrato.stop(now + 1.3);

    // Smooth amplitude envelope
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.12);
    gain.gain.setValueAtTime(0.35, now + 0.6);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

    osc.connect(formant);
    formant.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1.3);
  } catch (err) {
    console.warn('Synthetic meow error:', err);
  }
}

// Play single cat meow sound (MP3 with Web Audio fallback)
export function playCatMeowSound() {
  try {
    if (typeof Audio !== 'undefined') {
      const audio = new Audio('/assets/sounds/cat-meow.mp3');
      audio.volume = 0.85;
      currentCatAudio = audio;
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          playSyntheticMeow();
        });
      }
      return audio;
    } else {
      playSyntheticMeow();
    }
  } catch {
    playSyntheticMeow();
  }
}

// Start repeating cat meow alarm (repeats every 3.8 seconds until stopped)
export function startCatAlarm() {
  stopCatAlarm();
  playCatMeowSound();
  catAlarmInterval = setInterval(() => {
    playCatMeowSound();
  }, 3800);
}

// Stop cat alarm immediately
export function stopCatAlarm() {
  if (catAlarmInterval) {
    clearInterval(catAlarmInterval);
    catAlarmInterval = null;
  }
  if (currentCatAudio) {
    try {
      currentCatAudio.pause();
      currentCatAudio.currentTime = 0;
    } catch {
      // Ignore
    }
    currentCatAudio = null;
  }
}
