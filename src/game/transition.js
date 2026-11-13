import gsap from 'gsap';

let busy = false;
// Cortina circular que cresce, troca a cena e se dissolve.
export function transition(calm, change) {
  if (busy) return;
  if (calm) { change(); return; }
  busy = true;
  const veil = document.querySelector('#veil');
  veil.hidden = false;
  gsap.fromTo(veil, { clipPath: 'circle(0% at 50% 85%)', opacity: 1 }, {
    clipPath: 'circle(150% at 50% 85%)', duration: 0.75, ease: 'power2.in',
    onComplete: () => {
      change();
      gsap.to(veil, { opacity: 0, duration: 0.7, ease: 'power1.out', onComplete: () => { veil.hidden = true; busy = false; } });
    },
  });
}
