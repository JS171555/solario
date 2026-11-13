// Pós-build: grava no dist/sw.js a lista de arquivos com hash, para o app abrir offline por completo.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const files = readdirSync('dist/assets').filter((f) => !f.endsWith('.map')).map((f) => `/assets/${f}`).sort();
const v = createHash('sha1').update(files.join()).digest('hex').slice(0, 8);
const sw = readFileSync('dist/sw.js', 'utf8')
  .replace("const V = 'solario-v1';", `const V = 'solario-${v}';`)
  .replace('const ASSETS = [];', `const ASSETS = ${JSON.stringify(files)};`);
writeFileSync('dist/sw.js', sw);
console.log(`sw.js: ${files.length} arquivos pré-carregados (cache solario-${v})`);
