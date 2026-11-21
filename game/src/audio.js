// Sound: every effect is synthesized with WebAudio, no audio files.
// A soft step, a pebble clink, a loot chime, the Star's arpeggio, the alarm
// sting when a warden spots you, and a low room tone under it all.

let ctx = null;
let master = null;
let muted = false;
let roomTone = null;

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    startRoomTone();
  } catch (e) {
    ctx = null;
  }
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}

export function isMuted() {
  return muted;
}

function tone(freq, dur, type, vol, when = 0, slideTo = null) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain);
  gain.connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(dur, vol, lowpass) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  src.start(t0);
}

function startRoomTone() {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 55;
  const osc2 = ctx.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = 55.7;
  const gain = ctx.createGain();
  gain.gain.value = 0.035;
  osc.connect(gain);
  osc2.connect(gain);
  gain.connect(master);
  osc.start();
  osc2.start();
  roomTone = { osc, osc2, gain };
}

export const sfx = {
  step(loud) {
    if (loud) noiseBurst(0.09, 0.16, 500);
    else noiseBurst(0.05, 0.05, 320);
  },
  throwPebble() {
    tone(700, 0.12, 'sine', 0.08, 0, 300);
  },
  pebbleLand() {
    tone(1900, 0.07, 'triangle', 0.16);
    tone(1400, 0.1, 'triangle', 0.12, 0.05);
    tone(950, 0.12, 'triangle', 0.1, 0.11);
  },
  loot() {
    tone(880, 0.14, 'sine', 0.14);
    tone(1318, 0.2, 'sine', 0.12, 0.07);
  },
  star() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.35, 'triangle', 0.14, i * 0.09));
  },
  suspicious() {
    tone(330, 0.25, 'square', 0.05, 0, 260);
  },
  spotted() {
    tone(220, 0.5, 'sawtooth', 0.16, 0, 440);
    tone(233, 0.5, 'sawtooth', 0.12, 0.02, 466);
    noiseBurst(0.3, 0.1, 900);
  },
  lost() {
    tone(392, 0.3, 'sine', 0.09, 0, 294);
  },
  caught() {
    tone(110, 0.9, 'sawtooth', 0.2, 0, 55);
    tone(116, 0.9, 'sawtooth', 0.16, 0.05, 58);
  },
  exitOpen() {
    tone(523, 0.2, 'sine', 0.12);
    tone(784, 0.3, 'sine', 0.12, 0.1);
  },
  levelClear() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.4, 'triangle', 0.13, i * 0.12));
  },
  click() {
    tone(1200, 0.05, 'square', 0.05);
  },
};
