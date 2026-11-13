import { defineCustomElements } from '@ionic/core/loader';
import { toastController } from '@ionic/core';
import '@ionic/core/css/core.css';
import '@fortawesome/fontawesome-free/css/fontawesome.min.css';
import '@fortawesome/fontawesome-free/css/solid.min.css';
import gsap from 'gsap';
import { createIcons, Play, Map as MapIcon, SlidersHorizontal, Info, Pause, Lock } from 'lucide';
import './styles/main.css';
import { buildHero } from './scenes/hero.js';
import { createWorld } from './game/world.js';
import { level1 } from './game/level1.js';
import { level2 } from './game/level2.js';
import { thumb } from './game/thumb.js';
import { transition } from './game/transition.js';
import { sfx, ambient, setVolume, hush } from './services/audio.js';
import { recordRun, getLevel, isUnlocked, stats, syncDown, pushSettings } from './services/progress.js';
import { loadConfig, saveConfig } from './services/storage.js';
import { isOnline } from './services/supabase.js';

defineCustomElements(window);
const cfg = loadConfig();
const $ = (s) => document.querySelector(s);

$('#app').innerHTML = `
<main class="stage">
  <div class="hero" id="hero"></div>
  <section class="menu">
    <h1>Solário</h1>
    <p class="tag">Guie Lume pelas torres que só se ligam quando vistas do ângulo certo.</p>
    <nav aria-label="Menu principal">
      <button class="play" id="b-play" aria-label="Jogar"><i data-lucide="play"></i></button>
      <div class="row">
        <button class="chip" id="b-levels"><i data-lucide="map"></i><span>Fases</span></button>
        <button class="chip" id="b-config"><i data-lucide="sliders-horizontal"></i><span>Ajustes</span></button>
        <button class="chip" id="b-about"><i data-lucide="info"></i><span>Sobre</span></button>
      </div>
    </nav>
    <p class="status" id="status">${isOnline() ? 'Supabase configurado' : 'Modo local: o progresso fica neste aparelho'}</p>
  </section>
</main>

<div class="game" id="game" hidden>
  <div class="gworld" id="gworld"></div>
  <div class="hud">
    <button class="orb" id="g-back" aria-label="Pausar"><i data-lucide="pause"></i></button>
    <span id="g-title"></span>
  </div>
  <p id="g-hint" role="status" aria-live="polite">Toque num caminho para andar</p>
</div>
<div class="veil" id="veil" hidden></div>

<ion-modal id="m-levels"><ion-content class="ion-padding">
  <h2>Fases</h2><div id="lv-list"></div>
  <h3>Estatísticas</h3><div id="lv-stats"></div>
  <ion-button data-close fill="clear" color="dark">Fechar</ion-button>
</ion-content></ion-modal>

<ion-modal id="m-pause"><ion-content class="ion-padding">
  <h2>Pausa</h2>
  <ion-range id="vol2" min="0" max="100" aria-label="Volume geral">
    <i class="fa-solid fa-volume-low" slot="start"></i><i class="fa-solid fa-volume-high" slot="end"></i>
  </ion-range>
  <ion-button expand="block" class="main" id="p-resume">Continuar</ion-button>
  <ion-button expand="block" class="alt" fill="outline" id="p-restart">Reiniciar fase</ion-button>
  <ion-button expand="block" class="alt" fill="outline" id="p-menu">Sair para o menu</ion-button>
</ion-content></ion-modal>

<ion-modal id="m-done"><ion-content class="ion-padding">
  <h2>Fase concluída</h2><div id="d-info"></div>
  <ion-button expand="block" class="main" id="d-next">Próxima fase</ion-button>
  <ion-button expand="block" class="alt" fill="outline" id="d-again">Jogar de novo</ion-button>
  <ion-button expand="block" class="alt" fill="outline" id="d-menu">Sair para o menu</ion-button>
</ion-content></ion-modal>

<ion-modal id="m-config"><ion-content class="ion-padding">
  <h2>Ajustes</h2>
  <ion-range id="vol" min="0" max="100" aria-label="Volume geral">
    <i class="fa-solid fa-volume-low" slot="start"></i><i class="fa-solid fa-volume-high" slot="end"></i>
  </ion-range>
  <ion-toggle id="rm">Reduzir animações</ion-toggle>
  <ion-button data-close fill="clear" color="dark">Fechar</ion-button>
</ion-content></ion-modal>

<ion-modal id="m-about"><ion-content class="ion-padding">
  <h2>Sobre</h2>
  <p>Solário é um jogo original de caminhos impossíveis. Você guia Lume, uma viajante com lanterna, por torres, pontes e escadas que só se conectam de um ponto de vista.</p>
  <p>Etapa 1 de 5: identidade visual e menu inicial.</p>
  <ion-button data-close fill="clear" color="dark">Fechar</ion-button>
</ion-content></ion-modal>`;

const ICONS = { Play, Map: MapIcon, SlidersHorizontal, Info, Pause, Lock };
createIcons({ icons: ICONS });
buildHero($('#hero'), { animate: !cfg.reduceMotion });

const toast = async (message) =>
  (await toastController.create({ message, duration: 2600, position: 'top' })).present();

const HINT = 'Toque num caminho para andar';
let world = null;
const heroTweens = (fn) => gsap.getTweensOf([...document.querySelectorAll('#hero *')]).forEach(fn);
const showGame = (on) => { $('.stage').hidden = on; $('#game').hidden = !on; };

const LEVELS = [{ ...level1, name: 'Primeiros passos' }, { ...level2, name: 'Rodas e ilusões' }];
let li = 0, steps = 0, t0 = 0, acc = 0, pausedAt = 0, finished = false;
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
const elapsed = () => Math.max(1, Math.round((performance.now() - t0 - acc) / 1000));
const open = (id) => $(id).present();
const close = (id) => $(id).dismiss();

const setVol = (v) => {
  cfg.volume = v; saveConfig(cfg); setVolume(v); pushSettings(cfg);
  [$('#vol'), $('#vol2')].forEach((r) => { if (r.value !== v) r.value = v; });
};
$('#vol2').value = cfg.volume; setVolume(cfg.volume);
$('#vol2').addEventListener('ionChange', (e) => setVol(e.detail.value));
['#m-pause', '#m-done'].forEach((id) => { const m = $(id); m.breakpoints = [0, 0.65, 1]; m.initialBreakpoint = 0.65; });
document.addEventListener('click', (e) => { if (e.target.closest('ion-button, button')) sfx.tap(); });

const startLevel = (i) => {
  li = i; world?.destroy(); steps = 0; t0 = performance.now(); acc = 0; finished = false;
  $('#g-hint').textContent = LEVELS[i].hint || HINT;
  $('#g-title').textContent = `${i + 1} · ${LEVELS[i].name}`;
  world = createWorld($('#gworld'), LEVELS[i], {
    calm: cfg.reduceMotion,
    onEvent: (e) => { if (e === 'step') { steps++; sfx.step(); } else if (e === 'mech') { sfx.mech(); $('#g-hint').textContent = 'Mecanismo ativado.'; } else if (e === 'goal') { sfx.win(); $('#g-hint').textContent = 'Lume acendeu o farol.'; } },
    onGoal: () => {
      if (finished) return; finished = true;
      const secs = elapsed(), r = recordRun(i + 1, steps, secs), st = steps;
      setTimeout(() => world && showDone(i, st, secs, r), 1600);
    },
  });
};
const enter = (i) => transition(cfg.reduceMotion, () => {
  heroTweens((t) => t.pause()); showGame(true); ambient(true); startLevel(i);
});
const exitGame = () => transition(cfg.reduceMotion, () => {
  world?.destroy(); world = null; ambient(false);
  $('#g-hint').textContent = HINT; showGame(false); heroTweens((t) => t.resume());
});

const showDone = (i, st, secs, r) => {
  const b = getLevel(i + 1), last = i >= LEVELS.length - 1;
  $('#d-info').innerHTML = `<div class="kpis"><div><b>${st}</b><small>passos</small></div><div><b>${fmt(secs)}</b><small>tempo</small></div><div><b>${b.bestSteps}</b><small>melhor</small></div></div>`
    + (r.newBest ? '<p class="note">Novo recorde pessoal</p>' : '') + (r.first && !last ? '<p class="note">Nova fase desbloqueada</p>' : '');
  $('#d-next').hidden = last;
  open('#m-done');
};
$('#d-next').onclick = async () => { await close('#m-done'); transition(cfg.reduceMotion, () => startLevel(li + 1)); };
$('#d-again').onclick = async () => { await close('#m-done'); transition(cfg.reduceMotion, () => startLevel(li)); };
$('#d-menu').onclick = async () => { await close('#m-done'); exitGame(); };

$('#g-back').onclick = () => {
  world?.setPaused(true); pausedAt = performance.now(); gsap.globalTimeline.pause(); open('#m-pause');
};
$('#m-pause').addEventListener('ionModalDidDismiss', () => {
  acc += performance.now() - pausedAt; world?.setPaused(false); gsap.globalTimeline.resume();
});
$('#p-resume').onclick = () => close('#m-pause');
$('#p-restart').onclick = async () => { await close('#m-pause'); transition(cfg.reduceMotion, () => startLevel(li)); };
$('#p-menu').onclick = async () => { await close('#m-pause'); exitGame(); };

const renderLevels = () => {
  $('#lv-list').innerHTML = LEVELS.map((l, i) => {
    const n = i + 1, ok = isUnlocked(n), p = getLevel(n);
    const sub = !ok ? 'Bloqueada' : p ? `${p.bestSteps} passos · ${fmt(p.bestSeconds)}` : 'Nova';
    return `<button class="card${ok ? '' : ' lock'}" ${ok ? `data-play="${i}"` : 'disabled'} aria-label="Fase ${n}, ${l.name}. ${sub}">`
      + `<div class="thumb">${thumb(l)}${ok ? '' : '<div class="lockico"><i data-lucide="lock"></i></div>'}</div>`
      + `<em>Fase ${n}</em><strong>${l.name}</strong><small>${sub}</small></button>`;
  }).join('');
  const s = stats();
  $('#lv-stats').innerHTML = `<div class="kpis"><div><b>${s.done}/${LEVELS.length}</b><small>fases</small></div><div><b>${s.plays}</b><small>partidas</small></div><div><b>${fmt(s.seconds)}</b><small>de jogo</small></div></div>`;
  createIcons({ icons: ICONS });
};
const openLevels = () => { renderLevels(); open('#m-levels'); };
$('#lv-list').onclick = async (e) => {
  const b = e.target.closest('[data-play]'); if (!b) return;
  await close('#m-levels'); enter(+b.dataset.play);
};
$('#b-play').onclick = () => enter(LEVELS.findIndex((_, i) => !getLevel(i + 1)?.done) === -1 ? 0 : LEVELS.findIndex((_, i) => !getLevel(i + 1)?.done));

syncDown().then((r) => {
  if (r.settings) {
    Object.assign(cfg, r.settings); saveConfig(cfg); setVolume(cfg.volume);
    $('#vol').value = cfg.volume; $('#vol2').value = cfg.volume; $('#rm').checked = cfg.reduceMotion;
  }
  if (isOnline()) $('#status').textContent = r.ok ? 'Progresso sincronizado com a nuvem' : 'Sem conexão com a nuvem: salvando neste aparelho';
});
$('#b-levels').onclick = () => openLevels();
$('#b-config').onclick = () => $('#m-config').present();
$('#b-about').onclick = () => $('#m-about').present();
document.querySelectorAll('[data-close]').forEach((b) => {
  b.onclick = () => b.closest('ion-modal').dismiss();
});

$('#vol').value = cfg.volume;
$('#vol').addEventListener('ionChange', (e) => setVol(e.detail.value));
$('#rm').checked = cfg.reduceMotion;
$('#rm').addEventListener('ionChange', (e) => {
  cfg.reduceMotion = e.detail.checked; saveConfig(cfg); pushSettings(cfg);
  toast('Vale a partir da próxima abertura.');
});

// PWA: service worker só em produção; o áudio é suspenso quando a aba fica em segundo plano.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
document.addEventListener('visibilitychange', () => hush(document.hidden));

// A dica aparece como legenda discreta e some sozinha (animação reiniciada a cada texto novo).
{
  const h = $('#g-hint');
  new MutationObserver(() => { h.classList.remove('say'); void h.offsetWidth; h.classList.add('say'); })
    .observe(h, { childList: true, characterData: true, subtree: true });
}
