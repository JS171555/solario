export const W = 36, H = 20.5, Z = 36;
export const P = (x, y, z) => [(x - y) * W, (x + y) * H - z * Z];
export const pts = (a) => a.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ');
// [topo, face esquerda, face direita]
export const PAL = {
  pedra: ['#FBEADF', '#E8BCC6', '#C7A0BE'],
  menta: ['#DDF4EA', '#A4D8C5', '#7FBBB3'],
  lilas: ['#E6DDF8', '#B9ABE3', '#9484C9'],
  coral: ['#FFD6C8', '#F28B7B', '#D9707A'],
  sol: ['#FFF2BF', '#EFCF80', '#D5AE63'],
};
