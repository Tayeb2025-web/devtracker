import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputDir = resolve(__dirname, '../public/music');
const sampleRate = 44100;
const durationSeconds = 72;

const tracks = [
  {
    file: 'deep-focus-pad.wav',
    root: 146.83,
    tones: [1, 1.5, 2, 2.5, 3],
    noise: 0.018,
    wobble: 0.11,
    seed: 11,
  },
  {
    file: 'quiet-terminal-rain.wav',
    root: 196,
    tones: [1, 1.25, 1.5, 2, 2.25, 3],
    noise: 0.026,
    wobble: 0.08,
    seed: 23,
  },
  {
    file: 'late-night-compile.wav',
    root: 164.81,
    tones: [1, 1.333, 1.5, 2, 2.666],
    noise: 0.014,
    wobble: 0.14,
    seed: 37,
  },
  {
    file: 'soft-syntax-flow.wav',
    root: 220,
    tones: [1, 1.2, 1.5, 2, 2.4, 3],
    noise: 0.016,
    wobble: 0.1,
    seed: 51,
  },
];

function seededNoise(seed) {
  let value = seed;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value / 1073741823.5) - 1;
  };
}

function writeString(buffer, offset, value) {
  for (let index = 0; index < value.length; index += 1) {
    buffer.writeUInt8(value.charCodeAt(index), offset + index);
  }
}

function createWav(samples) {
  const bytesPerSample = 2;
  const dataSize = samples.length * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataSize);

  writeString(buffer, 0, 'RIFF');
  buffer.writeUInt32LE(36 + dataSize, 4);
  writeString(buffer, 8, 'WAVE');
  writeString(buffer, 12, 'fmt ');
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * bytesPerSample, 28);
  buffer.writeUInt16LE(bytesPerSample, 32);
  buffer.writeUInt16LE(16, 34);
  writeString(buffer, 36, 'data');
  buffer.writeUInt32LE(dataSize, 40);

  samples.forEach((sample, index) => {
    const clipped = Math.max(-1, Math.min(1, sample));
    buffer.writeInt16LE(Math.round(clipped * 32767), 44 + index * bytesPerSample);
  });

  return buffer;
}

function renderTrack(track) {
  const totalSamples = durationSeconds * sampleRate;
  const samples = new Float32Array(totalSamples);
  const noise = seededNoise(track.seed);
  let lowNoise = 0;

  for (let index = 0; index < totalSamples; index += 1) {
    const t = index / sampleRate;
    const fadeIn = Math.min(1, t / 5);
    const fadeOut = Math.min(1, (durationSeconds - t) / 5);
    const envelope = Math.sin((Math.PI * index) / totalSamples) * Math.min(fadeIn, fadeOut);
    const slowPulse = 0.75 + (Math.sin(t * Math.PI * track.wobble) * 0.25);

    const pad = track.tones.reduce((sum, ratio, toneIndex) => {
      const frequency = track.root * ratio;
      const phase = toneIndex * 0.71;
      const voice =
        Math.sin((2 * Math.PI * frequency * t) + phase) +
        (0.45 * Math.sin((2 * Math.PI * frequency * 0.5 * t) + phase + 0.4));
      return sum + voice / (toneIndex + 1.6);
    }, 0);

    lowNoise = (lowNoise * 0.985) + (noise() * 0.015);
    samples[index] = ((pad * 0.12 * slowPulse) + (lowNoise * track.noise)) * envelope;
  }

  return createWav(samples);
}

mkdirSync(outputDir, { recursive: true });

tracks.forEach(track => {
  writeFileSync(resolve(outputDir, track.file), renderTrack(track));
  console.log(`Created ${track.file}`);
});
