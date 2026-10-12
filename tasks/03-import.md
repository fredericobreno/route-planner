# 03 — Importação do arquivo

Referência: [main.md](main.md) → "Importação".

Depende de: 02

## Objetivo

Upload do arquivo, seleção das colunas de coordenadas e validação.

## Escopo

### Upload

- Botão de upload intuitivo na sidebar: ícone + texto (ex.: "Importar planilha") + dica dos formatos aceitos.
- `<input type="file" accept=".xlsx,.xls,.csv">` oculto, acionado pelo botão.
- Ler com SheetJS apenas a primeira aba (`workbook.SheetNames[0]`).
- Linhas totalmente vazias abaixo do cabeçalho são ignoradas (não contam como cliente nem como inválidas).
- Arquivo ilegível ou vazio: mostrar erro na sidebar; estado anterior não é alterado.

### Substituição

- Se já houver dados carregados: abrir `AlertDialog` de confirmação antes de substituir.
- Confirmado: `reset` + carregar novo arquivo (pontos, grupos e edições descartados).
- Cancelado: nada muda.

### Linha de cabeçalho

- Após o upload, mostrar prévia das primeiras linhas (ex.: 10) em tabela, com o número de cada linha.
- Usuário escolhe qual linha é o cabeçalho; pré-selecionar a primeira linha não vazia.
- Linhas acima do cabeçalho não são clientes, mas permanecem em `rawRows` para o export.
- Trocar o cabeçalho limpa a seleção de colunas, grupos e edições.

### Seleção de colunas

- Após escolher o cabeçalho, exibir dois `Select` ("Latitude", "Longitude") com os headers do arquivo.
- Pontos só são processados depois que as duas colunas estão selecionadas.
- Trocar a seleção reprocessa a validação.

### Validação de coordenadas (função pura)

- Converter para string, `trim`, trocar `,` por `.`.
- Inválida quando:
  - vazia;
  - não numérica após normalização (`Number.isFinite`);
  - latitude fora de `-90..90` ou longitude fora de `-180..180`.
- Saída: lista de `Client` válidos + `invalidRowIndexes`.

## Fora de escopo

- Renderização no mapa (task 04), resumo (task 09).

## Critérios de aceite

- [ ] Aceita `.xlsx`, `.xls`, `.csv`; lê só a primeira aba.
- [ ] Prévia permite escolher a linha de cabeçalho; linhas acima não viram clientes.
- [ ] Selects listam os headers da linha escolhida.
- [ ] `"-3,7319"` vira `-3.7319`.
- [ ] Vazias, não numéricas e fora do intervalo contam como inválidas.
- [ ] Novo upload com dados carregados pede confirmação; cancelar mantém o estado.
- [ ] Linhas totalmente vazias são ignoradas.
- [ ] Testes unitários (Vitest) da validação de coordenadas, do cabeçalho fora da primeira linha e do descarte de linhas vazias.
- [ ] `npm run test`, `npm run lint` e `npx tsc --noEmit` passam.
