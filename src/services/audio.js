// Áudio sintetizado com Web Audio: sem arquivos, funciona offline.
let ctx = null, master = null, pad = null, vol = 0.7;

const ensure = () => {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = vol * 0.6; master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

export const hush = (on) => { if (ctx) on ? ctx.suspend() : ctx.resume(); };
export const setVolume = (v) => { vol = v / 100; if (master) master.gain.setTargetAtTime(vol * 0.6, ctx.currentTime, 0.05); };

const tone = (f, delay = 0, dur = 0.25, g = 0.2, type = 'sine') => {
  if (!ensure() || vol === 0) return;
  const t = ctx.currentTime + delay, o = ctx.createOscillator(), e = ctx.createGain();
  o.type = type; o.frequency.value = f;
  e.gain.setValueAtTime(0.0001, t); e.gain.exponentialRampToValueAtTime(g, t + 0.02); e.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(e); e.connect(master); o.start(t); o.stop(t + dur + 0.05);
};

export const sfx = {
  tap: () => tone(660, 0, 0.12, 0.12),
  step: () => tone(440 + Math.random() * 80, 0, 0.14, 0.08, 'triangle'),
  mech: () => { tone(392, 0, 0.5, 0.15); tone(587, 0.12, 0.6, 0.12); },
  win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.14, 0.9, 0.16)),
};

// Pad ambiente: três senoidais graves, levemente desafinadas.
export function ambient(on) {
  if (on && !pad && ensure()) {
    const g = ctx.createGain(); g.gain.value = 0; g.connect(master);
    const os = [110, 164.8, 221].map((f, i) => { const o = ctx.createOscillator(); o.frequency.value = f + i * 0.3; o.connect(g); o.start(); return o; });
    g.gain.setTargetAtTime(0.05, ctx.currentTime, 1.5);
    pad = { g, os };
  } else if (!on && pad) {
    const p = pad; pad = null;
    p.g.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    setTimeout(() => p.os.forEach((o) => o.stop()), 1500);
  }
}
