const KEY = 'solario:config';
const base = {
  volume: 70,
  reduceMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
};

export const loadConfig = () => {
  try { return { ...base, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { ...base }; }
};
export const saveConfig = (cfg) => {
  try { localStorage.setItem(KEY, JSON.stringify(cfg)); } catch { /* armazenamento indisponível */ }
};
