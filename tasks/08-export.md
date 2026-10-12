# 08 — Exportação

Referência: [main.md](main.md) → "Exportação".

Depende de: 03 (05/07 para ter regiões)

## Objetivo

Baixar um `.xlsx` com os dados originais + coluna `Região`.

## Escopo

- Botão "Exportar" na sidebar, habilitado logo após a importação.
- Montar planilha a partir de `rawRows` (todas as linhas, inclusive acima do cabeçalho, vazias e inválidas), na ordem original.
- Coluna `Região`:
  - header `Região` na linha de cabeçalho escolhida;
  - se já existir header `Região` nessa linha, sobrescrever essa coluna;
  - senão, adicionar ao final;
  - linhas acima do cabeçalho ficam com a célula vazia;
  - valor `Região N` para clientes atribuídos; vazio para sem região ou coordenada inválida.
- Exportar sempre como `.xlsx`, mesmo se o original for `.xls`/`.csv`.
- Nome: `<nome-original-sem-extensão>-regioes.xlsx`.
- Após exportar: atualizar o resumo na sidebar (task 09).

## Critérios de aceite

- [ ] Arquivo contém todas as linhas e colunas originais na mesma ordem.
- [ ] Coluna `Região` preenchida conforme as regiões atuais (incluindo edições).
- [ ] Exportar antes de gerar grupos → coluna `Região` toda vazia.
- [ ] Coluna `Região` existente é sobrescrita, não duplicada.
- [ ] Nome do arquivo `<nome-original>-regioes.xlsx`.
- [ ] Testes unitários (Vitest) da montagem da planilha (coluna nova, sobrescrita, valores vazios, nome do arquivo).
- [ ] `npm run test`, `npm run lint` e `npx tsc --noEmit` passam.
