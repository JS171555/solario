import gsap from 'gsap';
import { P, pts, PAL } from './iso.js';

const NS = 'http://www.w3.org/2000/svg';
const KEYS = { ArrowUp: [-1, 0], w: [-1, 0], ArrowRight: [0, -1], d: [0, -1], ArrowDown: [1, 0], s: [1, 0], ArrowLeft: [0, 1], a: [0, 1] };
const NBR = [[1, 0], [0, 1], [-1, 0], [0, -1]];

export function createWorld(host, level, { calm = false, onGoal, onEvent } = {}) {
  let dead = false, moving = false, reached = false, queue = [], pending = null, lock = false, paused = false;
  const tiles = level.tiles.map(([x, y, h, pal, walk = 1, trigger, mech], n) => ({ x, y, h, z: h / 2, z0: h / 2, dz: 0, pal, walk: !!walk, trigger, mech, n }));
  tiles.sort((a, b) => a.x + a.y - (b.x + b.y) || a.h - b.h);
  const K = (x, y) => `${x},${y}`;
  let grid = new Map(tiles.filter((t) => t.walk).map((t) => [K(t.x, t.y), t]));
  const rebuild = () => { grid = new Map(tiles.filter((t) => t.walk && !t.hidden).map((t) => [K(t.x, t.y), t])); };
  const goalTile = grid.get(K(...level.goal));
  let at = grid.get(K(...level.start));
  const centre = (t) => { const [x, y] = P(t.x + 0.5, t.y + 0.5, t.z); return { x, y }; };

  const beacon = (t) => {
    const [bx, by] = P(0.5, 0.5, t.z), c = { x: bx, y: by };
    return `<g transform="translate(${c.x.toFixed(1)} ${c.y.toFixed(1)})"><path d="M-5 0L-3-16H3L5 0Z" fill="#3B3360"/>
      <circle class="bglow" cy="-23" r="14" fill="#FFF2BF" opacity=".2"/><circle cy="-23" r="4.5" fill="#FFF2BF"/></g>`;
  };
  const mark = (t) => {
    if (t.trigger == null) return '';
    const [bx, by] = P(0.5, 0.5, t.z);
    return `<g class="crank" transform="translate(${bx.toFixed(1)} ${by.toFixed(1)}) scale(1 .58)"><g class="spin"><circle r="9" fill="${level.mechs[t.trigger].color}"/><path d="M-9 0H9M0-9V9" stroke="#3B3360" stroke-width="2"/></g></g>`;
  };
  // Cada coluna é desenhada na origem e posicionada por transformação: assim os tiles podem se mover.
  const column = (t) => {
    const c = PAL[t.pal], z = t.z;
    const T = [P(0, 0, z), P(1, 0, z), P(1, 1, z), P(0, 1, z)];
    const L = [P(0, 1, z), P(1, 1, z), P(1, 1, 0), P(0, 1, 0)];
    const R = [P(1, 0, z), P(1, 1, z), P(1, 1, 0), P(1, 0, 0)];
    return `<g class="tile" data-n="${t.n}"${t.trigger != null ? ` data-trig="${t.trigger}"` : ''}><polygon points="${pts(L)}" fill="${c[1]}"/><polygon points="${pts(R)}" fill="${c[2]}"/><polygon class="top" points="${pts(T)}" fill="${c[0]}"/>${t === goalTile ? beacon(t) : ''}${mark(t)}</g>`;
  };
  const cloud = (x, y, s) => `<g class="nuvem" transform="translate(${x} ${y}) scale(${s})" fill="#fff" opacity=".55"><ellipse rx="46" ry="11"/><ellipse cx="-18" cy="-9" rx="22" ry="12"/><ellipse cx="14" cy="-12" rx="26" ry="14"/></g>`;
  const dust = Array.from({ length: calm ? 0 : window.innerWidth < 700 ? 6 : 12 }, () =>
    `<circle class="poeira" cx="${(Math.random() * 640 - 320).toFixed(0)}" cy="${(Math.random() * 500 - 160).toFixed(0)}" r="${(Math.random() * 1.8 + 1).toFixed(1)}" fill="#fff" opacity="0"/>`).join('');
  const actorSvg = `<g class="actor"><g class="bob"><ellipse rx="7" ry="2.6" fill="#3B3360" opacity=".22"/><g class="dir">
    <g class="body"><path d="M-6 0Q-6-16 0-22Q6-16 6 0Z" fill="#3B3360"/><circle cy="-26" r="5.2" fill="#F2B8A2"/></g>
    <g class="lant"><circle class="lglow" cx="9" cy="-9" r="9" fill="#FFF2BF" opacity=".4"/><circle cx="9" cy="-9" r="3.2" fill="#FFF2BF"/></g></g></g></g>`;

  host.innerHTML = `<svg viewBox="-320 -320 640 640" role="application" aria-label="Fase 1. Toque num caminho ou use as setas para mover Lume.">
    <g class="sky">${cloud(-210, -200, 1.2) + cloud(200, -120, 0.9) + cloud(-80, 120, 0.7)}${dust}</g>
    <g class="cam"><g class="world">${tiles.map(column).join('')}${actorSvg}</g></g></svg>`;

  const $ = (s) => host.querySelector(s);
  const svg = $('svg'), camEl = $('.cam'), skyEl = $('.sky'), worldEl = $('.world');
  const actor = $('.actor'), bob = $('.bob'), dir = $('.dir'), body = $('.body'), lant = $('.lant');
  const tileEls = [...host.querySelectorAll('.tile')];
  const place = (t) => { // mantém a ordem de profundidade: Lume fica à frente do tile onde está
    const d = t.x + t.y; let i = 0;
    tiles.forEach((u, n) => { if (u.x + u.y <= d) i = n; });
    tiles[i].el.after(actor);
  };

  // Mecanismos: cada um reposiciona os tiles que controla (deslizar, girar 90° ou revelar).
  const pos = (t) => { const [x, y] = P(t.x, t.y, t.dz); return { x, y }; };
  tiles.forEach((t, i) => { t.el = tileEls[i]; t.b0 = { x: t.x, y: t.y }; gsap.set(t.el, pos(t)); });
  const mechs = level.mechs || [], states = {};
  const apply = (m, t, st, instant) => {
    const b = t.b0;
    if (m.kind === 'rotate') {
      let [x, y] = [b.x, b.y];
      for (let i = 0; i < st; i++) [x, y] = [m.pivot[0] - (y - m.pivot[1]), m.pivot[1] + (x - m.pivot[0])];
      t.x = x; t.y = y;
    }
    if (m.kind === 'slide') {
      t.x = b.x + st * m.offset[0]; t.y = b.y + st * m.offset[1];
      t.dz = st * m.offset[2]; t.z = t.z0 + t.dz; t.h = t.z * 2;
    }
    if (m.kind === 'door') t.hidden = st === 0;
    const p = pos(t), v = { ...p, opacity: t.hidden ? 0 : 1 };
    t.el.style.pointerEvents = t.hidden ? 'none' : '';
    if (instant) return gsap.set(t.el, v);
    if (m.kind === 'door' && !t.hidden) gsap.set(t.el, { y: p.y + 26 });
    gsap.to(t.el, { ...v, duration: 0.8, ease: 'power2.inOut' });
  };
  const resort = () => {
    tiles.sort((a, b) => a.x + a.y - (b.x + b.y) || a.h - b.h);
    tiles.forEach((t) => worldEl.appendChild(t.el));
    worldEl.appendChild(actor); place(at);
  };
  const activate = (id) => {
    const m = mechs[id]; if (!m || lock) return;
    lock = true; onEvent?.('mech');
    const st = (states[id] = ((states[id] || 0) + 1) % m.states);
    const members = tiles.filter((t) => t.mech === id), carried = members.includes(at);
    members.forEach((t) => apply(m, t, st));
    rebuild(); resort();
    const spin = host.querySelector(`[data-trig="${id}"] .spin`);
    if (spin) gsap.to(spin, { rotation: '+=180', transformOrigin: '50% 50%', duration: 0.6, ease: 'back.out' });
    if (carried) gsap.to(actor, { ...centre(at), duration: 0.8, ease: 'power2.inOut' });
    gsap.delayedCall(0.85, () => { lock = false; });
  };
  mechs.forEach((m, id) => { if (m.kind === 'door') tiles.filter((t) => t.mech === id).forEach((t) => apply(m, t, 0, true)); });
  rebuild();


  // Câmera: segue Lume com suavidade; o zoom varia com o tamanho da tela.
  const zoom = () => (window.innerWidth < 700 ? 1.7 : 1.05);
  const cam = { x: 0, y: 0, s: zoom() };
  const target = () => ({ x: -gsap.getProperty(actor, 'x') * cam.s, y: -(gsap.getProperty(actor, 'y') - 30) * cam.s });
  const draw = () => {
    camEl.setAttribute('transform', `translate(${cam.x.toFixed(1)} ${cam.y.toFixed(1)}) scale(${cam.s.toFixed(3)})`);
    skyEl.setAttribute('transform', `translate(${(cam.x * 0.15).toFixed(1)} 0)`);
  };
  const tick = () => { const t = target(); cam.x += (t.x - cam.x) * 0.08; cam.y += (t.y - cam.y) * 0.08; draw(); };

  const c0 = centre(at);
  gsap.set(actor, { x: c0.x, y: c0.y, scale: 1.2 });
  place(at);
  Object.assign(cam, target()); draw();
  gsap.ticker.add(tick);

  if (!calm) {
    gsap.from(cam, { s: cam.s * 0.55, duration: 2.4, ease: 'power2.out' });
    gsap.from(tileEls, { y: '+=30', opacity: 0, duration: 0.8, ease: 'power2.out', stagger: 0.03 });
    gsap.to(body, { scaleY: 1.04, transformOrigin: '50% 100%', duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    gsap.to($('.lglow'), { opacity: 0.7, scale: 1.25, transformOrigin: '50% 50%', duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    host.querySelectorAll('.nuvem').forEach((c, i) => gsap.to(c, { x: '+=60', duration: 16, yoyo: true, repeat: -1, ease: 'sine.inOut', delay: i * 2 }));
    host.querySelectorAll('.poeira').forEach((p) => gsap.to(p, { keyframes: { opacity: [0, 0.9, 0] }, y: -120, duration: 4 + Math.random() * 3, delay: Math.random() * 4, repeat: -1, ease: 'none' }));
  }

  const linked = (c) => (level.links || []).flatMap(([a, b]) => K(c.x, c.y) === K(...a) ? [grid.get(K(...b))] : K(c.x, c.y) === K(...b) ? [grid.get(K(...a))] : []).filter(Boolean);
  // Caminho por busca em largura; só liga tiles com degrau de até 1 (ou ligados por perspectiva).
  const findPath = (a, b) => {
    const prev = new Map([[K(a.x, a.y), null]]), q = [a];
    while (q.length) {
      const c = q.shift(); if (c === b) break;
      for (const [dx, dy] of NBR) {
        const n = grid.get(K(c.x + dx, c.y + dy));
        if (n && !prev.has(K(n.x, n.y)) && Math.abs(n.h - c.h) <= 1) { prev.set(K(n.x, n.y), c); q.push(n); }
      }
      for (const n of linked(c)) if (!prev.has(K(n.x, n.y))) { prev.set(K(n.x, n.y), c); q.push(n); }
    }
    if (!prev.has(K(b.x, b.y))) return null;
    const p = []; for (let c = b; c; c = prev.get(K(c.x, c.y))) p.unshift(c);
    return p;
  };

  const nudge = () => gsap.fromTo(dir, { x: -2 }, { x: 2, duration: 0.06, repeat: 3, yoyo: true, ease: 'none', onComplete: () => gsap.set(dir, { x: 0 }) });
  const ripple = (t) => {
    const c = centre(t), e = document.createElementNS(NS, 'ellipse');
    e.setAttribute('cx', c.x); e.setAttribute('cy', c.y); e.setAttribute('rx', 4); e.setAttribute('ry', 2); e.setAttribute('fill', 'none'); e.setAttribute('stroke', '#fff'); e.setAttribute('stroke-width', '2');
    worldEl.appendChild(e);
    gsap.fromTo(e, { attr: { rx: 4, ry: 2 }, opacity: 0.9 }, { attr: { rx: 22, ry: 11 }, opacity: 0, duration: 0.6, onComplete: () => e.remove() });
  };
  // Interação: Lume ergue a lanterna e o farol se acende.
  const celebrate = () => {
    gsap.timeline()
      .to(lant, { y: -8, duration: 0.4, ease: 'back.out' })
      .to($('.bglow'), { opacity: 0.9, scale: 2.4, transformOrigin: '50% 50%', duration: 1, ease: 'sine.out' }, '<')
      .to(lant, { y: 0, duration: 0.5 }, '+=0.6');
    onEvent?.('goal'); onGoal?.();
  };

  const next = () => {
    if (dead) return;
    const t = queue.shift();
    if (!t) {
      moving = false; gsap.to(body, { rotation: 0, duration: 0.2 });
      if (pending && pending.trigger != null && at === pending) activate(pending.trigger);
      pending = null;
      if (at === goalTile && !reached) { reached = true; celebrate(); }
      return;
    }
    moving = true;
    const a = centre(t), sx = a.x >= gsap.getProperty(actor, 'x') ? 1 : -1;
    at = t; onEvent?.('step');
    gsap.set(dir, { scaleX: sx });
    gsap.to(bob, { y: -5, duration: 0.16, yoyo: true, repeat: 1, ease: 'sine.out', overwrite: true });
    gsap.fromTo(body, { rotation: -4 * sx }, { rotation: 4 * sx, duration: 0.34, ease: 'sine.inOut' });
    gsap.delayedCall(0.17, () => { if (!dead) place(t); });
    gsap.to(actor, { x: a.x, y: a.y, duration: 0.34, ease: 'none', onComplete: next });
  };
  const go = (t) => {
    if (dead || lock || paused || !t) return;
    if (t === at && !moving) { if (t.trigger != null) activate(t.trigger); return; }
    const p = findPath(at, t);
    if (!p) return nudge();
    ripple(t); pending = t; queue = p.slice(1);
    if (!moving) next();
  };

  const onClick = (e) => {
    if (!e.target.classList.contains('top')) return;
    const t = tiles.find((u) => u.n === +e.target.parentNode.dataset.n);
    go(t && grid.get(K(t.x, t.y)) === t ? t : null);
  };
  const onKey = (e) => {
    const d = KEYS[e.key]; if (!d || moving || dead || lock || paused) return;
    e.preventDefault();
    const n = grid.get(K(at.x + d[0], at.y + d[1]));
    if (n && Math.abs(n.h - at.h) <= 1) go(n); else nudge();
  };
  const onResize = () => gsap.to(cam, { s: zoom(), duration: 0.4 });
  svg.addEventListener('click', onClick);
  window.addEventListener('keydown', onKey);
  window.addEventListener('resize', onResize);

  return {
    setPaused(v) { paused = v; },
    destroy() {
      dead = true;
      gsap.ticker.remove(tick);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      gsap.killTweensOf(cam);
      gsap.killTweensOf([actor, bob, dir, body, lant, ...host.querySelectorAll('*')]);
      host.innerHTML = '';
    },
  };
}
