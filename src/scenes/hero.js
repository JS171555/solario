import gsap from 'gsap';

// Projeção isométrica: x desce à direita, y desce à esquerda, z sobe.
const W = 36, H = 20.5, Z = 36;
const P = (x, y, z) => [(x - y) * W, (x + y) * H - z * Z];
const pts = (a) => a.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');

// [topo, face esquerda, face direita]
const PAL = {
  pedra: ['#FBEADF', '#E8BCC6', '#C7A0BE'],
  menta: ['#DDF4EA', '#A4D8C5', '#7FBBB3'],
  lilas: ['#E6DDF8', '#B9ABE3', '#9484C9'],
  coral: ['#FFD6C8', '#F28B7B', '#D9707A'],
  sol: ['#FFF2BF', '#EFCF80', '#D5AE63'],
};

const cube = (x, y, z, w, d, h, c) => {
  const t = [P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)];
  const l = [P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x, y + d, z)];
  const r = [P(x + w, y, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x + w, y, z)];
  return `<g class="blk"><polygon points="${pts(l)}" fill="${c[1]}"/><polygon points="${pts(r)}" fill="${c[2]}"/><polygon points="${pts(t)}" fill="${c[0]}"/></g>`;
};

const steps = Array.from({ length: 6 }, (_, i) => ({ x: 2.5 + i * 0.5, top: 0.8 + 0.35 * (i + 1) }));
const path = [P(2.1, 3.6, 0.8), ...steps.map((s) => P(s.x + 0.25, 3.6, s.top))];

const scene = [
  cube(-0.5, -0.5, 0, 7, 7, 0.8, PAL.pedra),
  cube(0.5, 0.5, 0.8, 2, 2, 4.2, PAL.lilas),
  cube(0.3, 0.3, 5, 2.4, 2.4, 0.5, PAL.coral),
  cube(4, 0.3, 0.8, 0.5, 0.5, 2.6, PAL.sol),
  cube(4, 1.7, 0.8, 0.5, 0.5, 2.6, PAL.sol),
  cube(4, 0.3, 3.4, 0.5, 1.9, 0.5, PAL.coral),
  ...steps.map((s, i) => cube(s.x, 3, 0.8, 0.5, 1.2, 0.35 * (i + 1), PAL.menta)),
].join('') +
  `<g class="float">${cube(6.6, 0.2, 3.4, 1.5, 1.5, 0.5, PAL.menta)}</g>` +
  `<g class="float">${cube(-1.8, 3.5, 2.2, 1.2, 1.2, 0.4, PAL.sol)}</g>`;

const lume = `<g id="lume"><g class="bob">
  <ellipse rx="7" ry="2.6" fill="#3B3360" opacity=".22"/>
  <path d="M-6 0Q-6-16 0-22Q6-16 6 0Z" fill="#3B3360"/>
  <circle cy="-26" r="5.2" fill="#F2B8A2"/>
  <circle class="glow" cx="9" cy="-9" r="9" fill="#FFF2BF" opacity=".4"/>
  <circle cx="9" cy="-9" r="3.2" fill="#FFF2BF"/>
</g></g>`;

const cloud = (x, y, s) => `<g class="cloud" transform="translate(${x} ${y}) scale(${s})" fill="#fff" opacity=".6"><ellipse rx="46" ry="11"/><ellipse cx="-18" cy="-9" rx="22" ry="12"/><ellipse cx="14" cy="-12" rx="26" ry="14"/></g>`;
const clouds = cloud(-190, -120, 1) + cloud(170, -60, 0.8) + cloud(-120, 90, 0.6);

export function buildHero(el, { animate = true } = {}) {
  const dust = Array.from({ length: 14 }, () =>
    `<circle class="dust" cx="${(Math.random() * 440 - 220).toFixed(0)}" cy="${(Math.random() * 300 + 20).toFixed(0)}" r="${(Math.random() * 1.8 + 1).toFixed(1)}" fill="#fff" opacity="0"/>`).join('');

  el.innerHTML = `<svg viewBox="-270 -210 540 500" role="img" aria-label="Torre isométrica flutuante com uma escada e uma viajante com lanterna">
    ${clouds}<g class="scene">${scene}</g>${lume}${dust}</svg>`;

  gsap.set('#lume', { x: path[0][0], y: path[0][1] });
  if (!animate) return;

  // Momento principal: a arquitetura se monta de cima para baixo.
  gsap.from('.blk', { y: -60, opacity: 0, duration: 1.2, ease: 'power3.out', stagger: 0.07 });
  gsap.from('#lume', { opacity: 0, delay: 1.4, duration: 0.8 });

  gsap.to('#lume', {
    keyframes: path.slice(1).map(([x, y]) => ({ x, y, duration: 0.6, ease: 'sine.inOut' })),
    delay: 2.2, repeat: -1, yoyo: true, repeatDelay: 1.5,
  });
  gsap.to('#lume .bob', { y: -3, duration: 0.3, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.to('.glow', { opacity: 0.7, scale: 1.25, transformOrigin: '50% 50%', duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  gsap.to('.float', { y: -14, duration: 3, yoyo: true, repeat: -1, ease: 'sine.inOut', stagger: 0.9 });
  gsap.to('.cloud', { x: '+=50', duration: 14, yoyo: true, repeat: -1, ease: 'sine.inOut', stagger: 3 });
  document.querySelectorAll('.dust').forEach((p) => {
    gsap.to(p, { keyframes: { opacity: [0, 0.9, 0] }, y: -110, duration: 4 + Math.random() * 3, delay: Math.random() * 4, repeat: -1, ease: 'none' });
  });
}
