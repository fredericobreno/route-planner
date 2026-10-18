# Route Planner

App para montar grupos (rotas) de clientes para vendedores a partir de um arquivo Excel com coordenadas.

## Fluxo

1. Usuário importa um arquivo com dados dos clientes.
2. Usuário indica qual linha é o cabeçalho.
3. Usuário escolhe quais colunas contêm latitude e longitude.
4. Todos os clientes com coordenadas válidas são renderizados como pontos no mapa.
5. Usuário informa a quantidade de clientes por grupo e clica em "Gerar grupos".
6. O mapa desenha uma região (convex hull) para cada grupo.
7. Usuário edita as regiões manualmente.
8. Usuário clica em "Exportar" e recebe o arquivo original com uma coluna de região.

## Requisitos

### Importação

- Formatos aceitos: `.xlsx`, `.xls`, `.csv`.
- Ler apenas a primeira aba.
- O cabeçalho nem sempre está na primeira linha:
  - após o upload, mostrar prévia das primeiras linhas e o usuário escolhe qual é o cabeçalho;
  - linhas acima do cabeçalho não são clientes, mas são mantidas no export.
- Após escolher o cabeçalho, o usuário seleciona em dois selects quais colunas são latitude e longitude.
- Linhas totalmente vazias são ignoradas (não contam como cliente nem como inválidas).
- Normalizar vírgula decimal para ponto (`-3,7319` → `-3.7319`).
- Coordenada inválida quando:
  - vazia;
  - não numérica (após normalização);
  - latitude fora de `-90..90` ou longitude fora de `-180..180`.
- Clientes com coordenada inválida:
  - não aparecem no mapa;
  - não entram em nenhum grupo;
  - aparecem no export com a coluna de região vazia.
- Novo upload com dados já carregados: abrir modal de confirmação. Se confirmado, substituir tudo (pontos, grupos, edições).

### Geração de grupos

- Input numérico "Clientes por grupo" (inteiro ≥ 1).
- Valor maior que o total de clientes válidos: gerar 1 grupo com todos.
- Um único botão: "Gerar grupos".
- Tamanho exato por grupo; o último grupo recebe o restante.
  - Ex.: 103 clientes válidos, 10 por grupo → 10 grupos de 10 + 1 grupo de 3.
  - Número de grupos: `ceil(clientesVálidos / tamanho)`.
- Algoritmo: k-means com restrição de capacidade.
- Gerar novamente com grupos existentes: abrir modal de confirmação. Se confirmado, descartar todos os grupos e edições anteriores.

### Renderização das regiões

- Cada grupo é desenhado como polígono via convex hull dos seus pontos.
- Grupo com 1 ou 2 pontos: desenhar linha (ou ponto) com buffer de 12 px de tela.
- Cada região tem cor distinta e rótulo "Região N".

### Edição de regiões

- Clicar em uma região ativa o modo de edição daquela região.
- Clicar em outra região durante a edição troca a região em edição.
- Em modo de edição:
  - clicar em ponto dentro da região → ponto é removido da região e fica sem região;
  - clicar em ponto fora da região (sem região ou de outra região) → ponto é movido para a região em edição;
  - o convex hull é recalculado a cada alteração.
- Ponto sem região: renderizado apenas como ponto, sem polígono.
- Sair do modo de edição por qualquer uma das opções:
  - clicar fora (no mapa, fora de região/ponto);
  - tecla `Esc`;
  - botão "Concluir".
- Região que fica sem pontos é removida e as demais são renumeradas sequencialmente (sem buracos: Região 1, 2, 3...).

### Exportação

- Botão "Exportar" fica habilitado logo após a importação (antes de gerar grupos, a coluna `Região` sai toda vazia).
- Gera um `.xlsx` com:
  - todas as linhas e colunas originais da primeira aba (inclusive clientes com coordenada inválida);
  - coluna adicional `Região` com valores `Região 1`, `Região 2`, ...;
  - campo vazio para clientes sem região ou com coordenada inválida.
- Se o arquivo original já tiver coluna `Região`, sobrescrever.
- Nome do arquivo: `<nome-original>-regioes.xlsx`.

### Resumo na sidebar

Exibido após importação e após exportação:

- clientes importados;
- coordenadas inválidas;
- grupos na tela;
- clientes por região;
- clientes sem região.

## Detalhes técnicos

- Página única: sidebar + mapa ocupando o resto da tela.
- UI: apenas componentes shadcn/ui.
- Sidebar bonita e com componentes adequados, por exemplo:
  - label + input do tipo número para "Clientes por grupo";
  - botão de upload visualmente intuitivo (ícone + texto, aceita os formatos suportados).
- Mapa: Leaflet + OpenStreetMap.
- Dependências aprovadas:
  - shadcn/ui (CLI);
  - Leaflet (+ wrapper React, se necessário);
  - lib de leitura/escrita de Excel (`xlsx`/SheetJS ou `exceljs`);
  - `@turf/turf` (convex hull e buffer) ou implementação própria;
  - Vitest (testes unitários).
- Estado apenas em memória; recarregar a página perde os dados.

## Critérios de aceite

- [x] Upload aceita `.xlsx`, `.xls`, `.csv` e lê só a primeira aba.
- [x] Usuário escolhe a linha de cabeçalho a partir de uma prévia.
- [x] Usuário seleciona colunas de latitude e longitude após escolher o cabeçalho.
- [x] Vírgula decimal é convertida para ponto.
- [x] Linhas totalmente vazias são ignoradas.
- [x] Coordenadas vazias, não numéricas ou fora do intervalo contam como inválidas e não vão ao mapa.
- [x] Novo upload com dados carregados pede confirmação em modal.
- [x] "Gerar grupos" cria `ceil(n / tamanho)` grupos com tamanho exato e resto no último.
- [x] Tamanho maior que o total gera 1 grupo.
- [x] Gerar novamente com grupos existentes pede confirmação em modal.
- [x] Cada grupo aparece como região convex hull; grupos com 1–2 pontos aparecem como linha/ponto com buffer de 12 px.
- [x] Clicar em região ativa edição; clicar em ponto dentro remove, fora adiciona (inclusive de outra região).
- [x] Clicar em outra região durante a edição troca a região em edição.
- [x] Sair da edição funciona por clique fora, `Esc` e botão "Concluir".
- [x] Região vazia é removida e as regiões são renumeradas.
- [x] "Exportar" habilitado logo após a importação.
- [x] Export contém todas as linhas originais (inclusive as acima do cabeçalho) + coluna `Região`, vazia para sem região/inválidos, e sobrescreve coluna existente.
- [x] Arquivo exportado se chama `<nome-original>-regioes.xlsx`.
- [x] Sidebar mostra resumo após importação e exportação.

