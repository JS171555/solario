// Tile: [x, y, altura, paleta, andável, gatilho (id do mecanismo), pertence ao mecanismo (id)]
const area = (x0, x1, y0, y1, h, pal) => {
  const out = [];
  for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) out.push([x, y, h, pal]);
  return out;
};

export const level2 = {
  hint: 'Toque nas rodas para girar, deslizar e revelar caminhos.',
  start: [0, 4],
  goal: [10, 8],
  tiles: [
    ...area(0, 1, 4, 5, 2, 'pedra'),
    [2, 4, 2, 'menta', 1, 0, 0],                         // plataforma móvel (desliza 2 tiles)
    ...area(5, 6, 3, 4, 2, 'lilas'),
    [7, 3, 2, 'coral', 1, 1, 1], [8, 3, 2, 'coral', 1, undefined, 1], [9, 3, 2, 'coral', 1, undefined, 1], // ponte giratória
    [6, 6, 2, 'pedra'], [7, 6, 2, 'pedra'], [7, 7, 2, 'pedra'], [6, 7, 2, 'pedra', 1, 2],
    [8, 6, 2, 'sol', 1, undefined, 2],                   // passagem secreta
    [10, 8, 4, 'coral'],                                 // farol, alcançado por ilusão de perspectiva
    [3, 1, 8, 'lilas', 0], [4, 1, 6, 'menta', 0], [2, 9, 4, 'sol', 0],
  ],
  mechs: [
    { kind: 'slide', color: '#F28B7B', offset: [2, 0, 0], states: 2 },
    { kind: 'rotate', color: '#8E7FC4', pivot: [7, 3], states: 2 },
    { kind: 'door', color: '#EFCF80', states: 2 },
  ],
  // Tiles sem vizinhança real, mas que se tocam na projeção: o caminho "impossível".
  links: [[[8, 6], [10, 8]]],
};
