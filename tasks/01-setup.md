# 01 — Setup e layout base

Referência: [main.md](main.md) → "Detalhes técnicos".

Depende de: —

## Objetivo

Instalar dependências aprovadas e montar o esqueleto da página: sidebar à esquerda + mapa ocupando o resto da tela.

## Escopo

- Inicializar shadcn/ui via CLI (Tailwind v4 já configurado em `src/app/globals.css`).
- Adicionar componentes shadcn que serão usados nas próximas tasks:
  - `sidebar`, `button`, `input`, `label`, `select`, `card`, `alert-dialog`, `badge`, `separator`, `sonner` (ou `alert`) para erros.
- Instalar:
  - `leaflet` + `@types/leaflet`;
  - `react-leaflet` (versão compatível com React 19);
  - SheetJS (`xlsx`) — única das duas libs aprovadas que lê `.xls`. Instalar pelo tarball oficial (`https://cdn.sheetjs.com/`), pois a versão no registry npm está desatualizada;
  - `@turf/convex` + `@turf/helpers` (buffer é feito em pixels pelo Leaflet, ver task 06);
  - `vitest` (dev) + script `"test": "vitest run --passWithNoTests"` no `package.json`.
- `src/app/layout.tsx`: `lang="pt-BR"`.
- `src/app/page.tsx`: layout full-screen com `SidebarProvider` + `Sidebar` (vazia, só título "Route Planner") + área do mapa.
- Mapa carregado só no client (`next/dynamic` com `ssr: false`), pois Leaflet acessa `window`.
- Importar `leaflet/dist/leaflet.css`.

## Fora de escopo

- Renderizar pontos, importação, lógica de grupos.

## Critérios de aceite

- [ ] `npm run dev` abre página com sidebar e mapa OpenStreetMap ocupando o resto da tela.
- [ ] Sem scroll na página; mapa redimensiona com a janela.
- [ ] Sem erro de SSR (`window is not defined`).
- [ ] `npm run test` roda sem erro mesmo sem testes.
- [ ] `npm run lint`, `npx tsc --noEmit` e `npm run build` passam.
