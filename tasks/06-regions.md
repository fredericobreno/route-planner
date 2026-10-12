# 06 — Renderização das regiões

Referência: [main.md](main.md) → "Renderização das regiões".

Depende de: 04, 05

## Objetivo

Desenhar cada grupo como uma região no mapa.

## Escopo

- Para cada região:
  - 3+ pontos não colineares: polígono via `@turf/convex`;
  - 2 pontos (ou colineares): `Polyline` com `weight: 24` e `lineCap: "round"` (12 px de cada lado);
  - 1 ponto: `CircleMarker` com `radius: 12`.
- Buffer em pixels de tela: tamanho constante em qualquer zoom (não usar `@turf/buffer`, que trabalha em metros).
- Renderizar em pane abaixo dos pontos.
- Paleta de cores distintas; cor da região também aplicada aos seus pontos.
- Rótulo "Região N" permanente no centro da região (`Tooltip permanent`).
- Geometria recalculada sempre que as atribuições mudam (memoizar por região).

## Fora de escopo

- Interação de clique (task 07).

## Critérios de aceite

- [ ] Cada grupo aparece como polígono convex hull com cor distinta.
- [ ] Grupos com 1–2 pontos aparecem como linha/ponto com buffer de 12 px, constante ao dar zoom.
- [ ] Rótulo "Região N" visível em cada região.
- [ ] `npm run lint` e `npx tsc --noEmit` passam.
