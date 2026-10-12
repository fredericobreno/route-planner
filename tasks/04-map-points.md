# 04 — Mapa e pontos

Referência: [main.md](main.md) → "Fluxo" (passo 3).

Depende de: 03

## Objetivo

Renderizar cada cliente válido como um ponto no mapa.

## Escopo

- `MapContainer` + `TileLayer` OpenStreetMap (com atribuição).
- Cada `Client` vira um `CircleMarker`.
- Após importar/trocar colunas: ajustar o zoom para caber todos os pontos (`fitBounds`).
- Pontos ficam em um pane acima dos polígonos (preparação para clique nas tasks 06/07).
- Cor do ponto: neutra quando sem região; cor da região quando atribuído (cores vêm da task 06).
- Tooltip/popup opcional não é requisito — não implementar.

## Fora de escopo

- Polígonos, edição.

## Critérios de aceite

- [ ] Todos os clientes válidos aparecem; inválidos não aparecem.
- [ ] Mapa enquadra os pontos após a importação.
- [ ] Desempenho aceitável com alguns milhares de pontos (usar renderer canvas do Leaflet, `preferCanvas`).
- [ ] `npm run lint` e `npx tsc --noEmit` passam.
