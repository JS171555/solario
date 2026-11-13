# Solário

Jogo original de puzzle e exploração em perspectiva isométrica. Você guia Lume por torres que só se ligam do ângulo certo.

**Stack:** Vite 8, Ionic Core, GSAP, SVG, Lucide, Font Awesome, Supabase (opcional), PWA.

## Instalar e rodar
```bash
npm install
npm run dev        # desenvolvimento
npm run build      # gera dist/
npm run preview    # testa o build (o service worker só roda aqui, em produção)
```

## Como jogar
Toque (ou clique) num caminho para andar. Teclado: setas ou WASD. Toque nas rodas coloridas para deslizar, girar ou revelar estruturas. Pausa pelo botão no topo.

## Estrutura
```
src/main.js            menu, fluxo de jogo, pausa, conclusão, fases
src/scenes/hero.js     cena animada da tela inicial
src/game/              iso.js, world.js (motor), level1.js, level2.js, transition.js
src/services/          audio.js (Web Audio), progress.js (local + nuvem), storage.js, supabase.js
supabase/schema.sql    tabelas e políticas RLS
public/                manifest, service worker, ícones
```
Para criar uma fase nova, crie `src/game/levelN.js` (veja `level2.js`) e adicione em `LEVELS` no `main.js`.

## Supabase (opcional)
1. Em **Authentication → Providers**, ative **Anonymous sign-ins**.
2. Rode `supabase/schema.sql` no SQL Editor.
3. Copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (chave anon/pública: a proteção vem do RLS, cada jogador só acessa as próprias linhas).

Sem isso, ou sem rede, o progresso fica no aparelho (`localStorage`) e o jogo segue normal.

## Publicar
**GitHub**
```bash
git remote add origin https://github.com/SEU-USUARIO/solario.git
git push -u origin main
```
**Vercel:** importe o repositório (framework Vite, build `npm run build`, saída `dist`) e cadastre as duas variáveis `VITE_SUPABASE_*`. O `vercel.json` já define os cabeçalhos de cache e segurança.

## PWA e offline
Após a primeira visita online, o app e as fontes ficam em cache. O progresso é salvo no aparelho e sincronizado quando houver conexão.
