import { supabase } from './supabase.js';

const KEY = 'solario:progress';
const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const data = { levels: {}, ...load() };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { /* sem armazenamento */ } };
const min = (a, b) => (a == null ? b : b == null ? a : Math.min(a, b));

export const getLevel = (n) => data.levels[n] || null;
export const isUnlocked = (n) => n <= 1 || !!data.levels[n - 1]?.done;

export function stats() {
  const L = Object.values(data.levels);
  return {
    done: L.filter((l) => l.done).length,
    plays: L.reduce((a, l) => a + l.plays, 0),
    steps: L.reduce((a, l) => a + l.totalSteps, 0),
    seconds: L.reduce((a, l) => a + l.totalSeconds, 0),
  };
}

export function recordRun(n, steps, seconds) {
  const prev = data.levels[n];
  const l = prev || { done: true, bestSteps: null, bestSeconds: null, plays: 0, totalSteps: 0, totalSeconds: 0 };
  const newBest = !!prev && (steps < prev.bestSteps || seconds < prev.bestSeconds);
  Object.assign(l, {
    done: true, plays: l.plays + 1, totalSteps: l.totalSteps + steps, totalSeconds: l.totalSeconds + seconds,
    bestSteps: min(l.bestSteps, steps), bestSeconds: min(l.bestSeconds, seconds),
  });
  data.levels[n] = l; save(); push(n);
  return { first: !prev, newBest };
}

async function user() {
  if (!supabase) return null;
  const { data: s } = await supabase.auth.getSession();
  if (s.session) return s.session.user;
  const { data: r, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return r.user;
}

export async function push(n) {
  try {
    const u = await user(), l = data.levels[n];
    if (!u || !l) return;
    await supabase.from('level_progress').upsert({
      user_id: u.id, level: n, best_steps: l.bestSteps, best_seconds: l.bestSeconds,
      plays: l.plays, total_steps: l.totalSteps, total_seconds: l.totalSeconds, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,level' });
  } catch { /* segue em modo local */ }
}

export async function pushSettings(cfg) {
  try {
    const u = await user(); if (!u) return;
    await supabase.from('player_settings').upsert({ user_id: u.id, volume: cfg.volume, reduce_motion: cfg.reduceMotion, updated_at: new Date().toISOString() });
  } catch { /* segue em modo local */ }
}

// Mescla o progresso da nuvem com o local (vale o melhor dos dois) e devolve os ajustes salvos.
export async function syncDown() {
  try {
    const u = await user(); if (!u) return { ok: false };
    const { data: rows, error } = await supabase.from('level_progress').select('*').eq('user_id', u.id);
    if (error) throw error;
    for (const r of rows) {
      const l = data.levels[r.level] || { plays: 0, totalSteps: 0, totalSeconds: 0 };
      data.levels[r.level] = {
        done: true, bestSteps: min(l.bestSteps, r.best_steps), bestSeconds: min(l.bestSeconds, r.best_seconds),
        plays: Math.max(l.plays, r.plays), totalSteps: Math.max(l.totalSteps, r.total_steps), totalSeconds: Math.max(l.totalSeconds, r.total_seconds),
      };
    }
    save();
    await Promise.all(Object.keys(data.levels).map((n) => push(+n)));
    const { data: s } = await supabase.from('player_settings').select('volume,reduce_motion').eq('user_id', u.id).maybeSingle();
    return { ok: true, settings: s ? { volume: s.volume, reduceMotion: s.reduce_motion } : null };
  } catch { return { ok: false }; }
}
