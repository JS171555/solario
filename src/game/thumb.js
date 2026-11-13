import { P, pts, PAL } from './iso.js';

// Miniatura isométrica de uma fase, desenhada a partir dos mesmos dados do jogo.
export function thumb(level) {
  const tiles = level.tiles.map(([x, y, h, pal]) => ({ x, y, z: h / 2, pal }))
    .sort((a, b) => a.x + a.y - (b.x + b.y) || a.z - b.z);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
  const body = tiles.map(({ x, y, z, pal }) => {
    const c = PAL[pal];
    const T = [P(x, y, z), P(x + 1, y, z), P(x + 1, y + 1, z), P(x, y + 1, z)];
    const L = [P(x, y + 1, z), P(x + 1, y + 1, z), P(x + 1, y + 1, 0), P(x, y + 1, 0)];
    const R = [P(x + 1, y, z), P(x + 1, y + 1, z), P(x + 1, y + 1, 0), P(x + 1, y, 0)];
    [...T, ...L, ...R].forEach(([px, py]) => { x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py); });
    return `<polygon points="${pts(L)}" fill="${c[1]}"/><polygon points="${pts(R)}" fill="${c[2]}"/><polygon points="${pts(T)}" fill="${c[0]}"/>`;
  }).join('');
  const m = 18;
  return `<svg viewBox="${x0 - m} ${y0 - m} ${x1 - x0 + 2 * m} ${y1 - y0 + 2 * m}" aria-hidden="true">${body}</svg>`;
}
