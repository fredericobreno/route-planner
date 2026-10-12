# 07 — Edição de regiões

Referência: [main.md](main.md) → "Edição de regiões".

Depende de: 06

## Objetivo

Permitir mover clientes entre regiões clicando no mapa.

## Escopo

### Entrar / trocar

- Clicar em uma região → `startEditing(N)`.
- Clicar em outra região durante a edição → troca a região em edição.
- Região em edição com destaque visual (ex.: borda mais grossa, opacidade maior); demais esmaecidas.
- Sidebar mostra "Editando Região N" + botão "Concluir".

### Cliques em pontos (só em modo de edição)

- "Dentro" = ponto pertence à região em edição (pertencimento, não posição geométrica).
- Ponto da região em edição → removido, fica sem região.
- Ponto sem região ou de outra região → movido para a região em edição.
- Fora do modo de edição, clicar em ponto não faz nada.
- Após cada alteração: recalcular hull e aplicar renumeração (região vazia removida, demais `1..N`).
- Se a região em edição for renumerada, `editingRegion` acompanha o novo número; se ficar vazia, sai do modo de edição.

### Sair

- Clique no mapa fora de região/ponto.
- Tecla `Esc`.
- Botão "Concluir".

### Eventos

- Cliques em pontos e polígonos não podem propagar para o mapa (`L.DomEvent.stopPropagation`), senão disparam a saída.
- Clique em ponto sobre um polígono deve acionar o ponto, não o polígono.

## Critérios de aceite

- [ ] Clicar em região ativa edição; clicar em outra troca.
- [ ] Clicar em ponto da região remove; ponto sem região ou de outra região é adicionado.
- [ ] Ponto removido aparece só como ponto, sem polígono.
- [ ] Saída por clique fora, `Esc` e "Concluir".
- [ ] Região vazia é removida e as regiões são renumeradas sem buracos.
- [ ] `npm run lint` e `npx tsc --noEmit` passam.
