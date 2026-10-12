# 02 — Modelo de dados e estado em memória

Referência: [main.md](main.md) → "Detalhes técnicos" (estado só em memória).

Depende de: 01

## Objetivo

Definir os tipos e o estado global da app, compartilhado entre sidebar e mapa.

## Escopo

- Tipos (sugestão):
  - `Sheet`: `fileName`, `rawRows: unknown[][]` (todas as linhas originais da primeira aba), `headerRowIndex: number | null`.
  - `headers` e linhas de clientes derivados de `rawRows` + `headerRowIndex` (linhas abaixo do cabeçalho, sem as totalmente vazias).
  - `ColumnMapping`: `latColumn`, `lngColumn` (índices ou nomes de header).
  - `Client`: `rowIndex`, `lat`, `lng` — apenas clientes com coordenada válida.
  - `invalidRowIndexes: number[]`.
  - `assignments: Map<rowIndex, regionNumber>` — ausência = sem região.
  - `editingRegion: number | null`.
- Estado via React Context + `useReducer` (sem libs novas).
- Ações:
  - `loadSheet`, `setHeaderRow`, `setColumnMapping`, `reset`;
  - `setGroups` (substitui todas as atribuições);
  - `togglePoint(rowIndex)` (regras de edição — implementadas na task 07);
  - `startEditing(region)`, `stopEditing()`.
- Função utilitária de renumeração: remove regiões vazias e renumera sequencialmente (`1..N`).

## Fora de escopo

- UI.

## Critérios de aceite

- [ ] Provider envolve sidebar e mapa em `page.tsx`.
- [ ] Renumeração: regiões `{1, 3, 4}` viram `{1, 2, 3}` mantendo a ordem relativa.
- [ ] Teste unitário (Vitest) da renumeração.
- [ ] `npm run test`, `npm run lint` e `npx tsc --noEmit` passam.
