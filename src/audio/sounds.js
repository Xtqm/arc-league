import { getAudioCtx, getSFXDestination } from './synth.js';

export function playParrySnapSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(460, now + 0.08);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
    osc.connect(gain);
    gain.connect(getSFXDestination(ctx));
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (_) {}
}

export function playWhiffFizzleSound() {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(55, now + 0.22);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.22);
    osc.connect(gain);
    gain.connect(getSFXDestination(ctx));
    osc.start(now);
    osc.stop(now + 0.22);
  } catch (_) {}
}

export const sounds = {
  parrySnap: () => playParrySnapSound(),
  whiffFizzle: () => playWhiffFizzleSound()
};
