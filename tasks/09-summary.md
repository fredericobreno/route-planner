# 09 — Resumo na sidebar

Referência: [main.md](main.md) → "Resumo na sidebar".

Depende de: 03, 05, 08

## Objetivo

Mostrar na sidebar o resultado após importação e exportação.

## Escopo

- `Card` "Resumo" exibido após importar (e atualizado após exportar) com:
  - clientes importados;
  - coordenadas inválidas;
  - grupos na tela;
  - clientes por região (lista `Região N — X clientes`, com a cor da região);
  - clientes sem região.
- Valores derivados do estado (não duplicar contagens no reducer).
- Lista de regiões com scroll se for longa.

## Critérios de aceite

- [ ] Resumo aparece após importação com os números corretos.
- [ ] Resumo reflete edições e é exibido após exportação.
- [ ] Soma de clientes por região + sem região = clientes válidos.
- [ ] `npm run lint` e `npx tsc --noEmit` passam.
