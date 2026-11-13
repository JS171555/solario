// Cada tile: [x, y, altura (em meios-blocos), paleta, andável (padrão 1)].
// Dois tiles vizinhos se conectam quando a diferença de altura é no máximo 1.
const area = (x0, x1, y0, y1, h, pal) => {
  const out = [];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push([x, y, h, pal]);
  return out;
};

export const level1 = {
  start: [1, 5],
  goal: [7, 1],
  tiles: [
    ...area(0, 2, 4, 6, 2, 'pedra'),
    [3, 5, 3, 'menta'], [4, 5, 4, 'menta'], [5, 5, 5, 'menta'],
    ...area(6, 7, 4, 6, 6, 'lilas'),
    [7, 3, 6, 'sol'], [7, 2, 6, 'sol'],
    ...area(6, 8, 0, 1, 6, 'coral'),
    [1, 1, 8, 'lilas', 0], [1, 2, 8, 'lilas', 0], [0, 1, 5, 'sol', 0],
  ],
};
