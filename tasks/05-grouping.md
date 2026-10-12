# 05 — Geração de grupos (k-means com capacidade)

Referência: [main.md](main.md) → "Geração de grupos".

Depende de: 02, 03

## Objetivo

Input "Clientes por grupo" + botão "Gerar grupos" que divide os clientes válidos em grupos de tamanho exato.

## Escopo

### UI (sidebar)

- `Label` "Clientes por grupo" + `Input type="number"` (inteiro ≥ 1).
- Botão "Gerar grupos": desabilitado sem clientes válidos ou valor inválido.
- Se já houver grupos: `AlertDialog` de confirmação; confirmado descarta grupos e edições.

### Algoritmo (função pura, sem dependência de React)

- Entrada: `clients`, `size`. Saída: `Map<rowIndex, regionNumber>`.
- `k = ceil(n / size)`; capacidades: `k - 1` grupos com `size` e 1 grupo com o restante (`n - (k - 1) * size`). Se `n % size === 0`, todos com `size`.
- `size >= n` → 1 grupo com todos.
- Abordagem sugerida:
  1. Inicializar centróides com k-means++.
  2. Atribuição com capacidade: ordenar pares (cliente, centróide) por distância e atribuir gulosamente respeitando a capacidade de cada grupo.
  3. Recalcular centróides; repetir até convergir ou atingir limite de iterações.
- Distância: equiretangular (lat/lng → plano, `cos(latMédia)` na longitude) é suficiente.
- Numerar regiões `1..k`.

## Fora de escopo

- Desenho das regiões (task 06).

## Critérios de aceite

- [ ] 103 clientes, tamanho 10 → 10 grupos de 10 + 1 grupo de 3.
- [ ] 100 clientes, tamanho 10 → 10 grupos de 10.
- [ ] Tamanho maior que o total → 1 grupo.
- [ ] Nenhum cliente válido fica sem grupo; inválidos nunca entram.
- [ ] Gerar novamente com grupos existentes pede confirmação.
- [ ] Gera em tempo aceitável (< 2 s) para ~5.000 clientes.
- [ ] Testes unitários (Vitest) cobrindo os cenários de tamanho acima.
- [ ] `npm run test`, `npm run lint` e `npx tsc --noEmit` passam.
