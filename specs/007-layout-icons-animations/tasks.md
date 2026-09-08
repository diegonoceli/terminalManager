# Tasks: Layout, Iconografia e Animações do Maestri

**Input**: Design documents from `specs/007-layout-icons-animations/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/ui-icons-animations.md`

## Organization: Tasks by Phase and User Story

Format: `[ID] [P?] [Story] Description`
- **[P]**: Executável em paralelo
- **[Story]**: US1, US2, US3, US4, US5, US6

---

## Phase 1: Setup & Core Infrastructure

**Purpose**: Criação do módulo base de ícones e infraestrutura de motion/tokens CSS.

- [X] T001 Criar catálogo vetorial Lucide em `public/js/icons.js` com suporte a `window.Icons.svg(...)`, `window.Icons.element(...)`, traço de 1.5px, `currentColor` e todos os glifos do sistema (terminal, note, text, draw, file-tree, web, device, editor, zoom-in, zoom-out, fit, close, copy, focus, link, unlink, folder, folder-open, file, file-code, git-*, settings, loader, alert-circle, more-vertical, chevrons).
- [X] T002 Registrar o script `public/js/icons.js` em `public/index.html` antes dos scripts dependentes (`main.js`, `terminal.js`, etc.).
- [X] T003 Definir tokens CSS, variáveis e utilitários de ícone em `public/styles.css` (`.icon-svg`, tamanhos 12/14/16/18/20px, stroke-width 1.5, animação de giro para `.icon-spin`, hover rings).

---

## Phase 2: Foundational (Motion Engine & Preferences)

**Purpose**: Estrutura central para controle de taxa de quadros, redução de movimento e utilitários de interpolação.

- [X] T004 Implementar o módulo `app.motion` em `public/js/main.js` ou `public/js/canvas.js` expondo `animateCamera`, `focusNode`, `toggleElevateNode`, `dockNode` e detecção de acessibilidade (`prefers-reduced-motion` e persistência em `AppState.ui.reducedMotion`).
- [X] T005 Adicionar regras globais de CSS em `public/styles.css` para `@media (prefers-reduced-motion: reduce)` e classe `.reduced-motion` no `<body>` que zera durações de transição/animação para 0ms.

---

## Phase 3: User Story 1 - Padronização Visual Global com Ícones Lucide (Priority: P1) 🎯 MVP

**Goal**: Substituir todos os emojis e caracteres de texto brutos por ícones vetoriais Lucide na toolbar superior, cabeçalhos de todos os tipos de nós, árvore de arquivos e menus.

**Independent Test**: Carregar a aplicação e validar que a barra de ferramentas superior, cabeçalhos de nós (Terminal, Notas, Desenho, Web, Device, FileTree, Portais), botões de janela (fechar, focar, duplicar, conectar) e a árvore de arquivos renderizam ícones SVG 1.5px sem caracteres emojis residuais.

- [X] T006 [P] [US1] Atualizar a barra de ferramentas superior em `public/index.html` e `public/js/main.js`, substituindo os botões de emoji por chamadas a `Icons.svg(...)` (Novo Terminal, Nota, Texto, Desenho, File Tree, Web, Device, Zoom In/Out, Fit, Settings).
- [X] T007 [P] [US1] Atualizar cabeçalhos e botões de nós de Terminal em `public/js/terminal.js` utilizando ícones Lucide (ícone de terminal, botão de conexão, duplicar, focar, fechar).
- [X] T008 [P] [US1] Atualizar cabeçalhos e botões dos Portais Web e Mobile em `public/js/portals.js` com ícones Lucide (ícone de globo/celular, rotacionar dispositivo, inspecionar, fechar, conectar).
- [X] T009 [P] [US1] Atualizar cabeçalhos e controles de Notas e Widgets em `public/js/notes.js` e `public/js/widgets/textdraw.js` com ícones Lucide.
- [X] T010 [P] [US1] Atualizar ícones de arquivos, pastas e ações Git na árvore de arquivos em `public/js/filetree.js` com ícones Lucide consistentes.
- [X] T011 [US1] Estilizar botões de ação e ícones de nós em `public/styles.css` com feedback visual sutil ao passar o cursor (hover ring e transição de opacidade).

**Checkpoint**: US1 concluída: 100% da interface do Maestri opera com ícones vetoriais Lucide limpos e nítidos.

---

## Phase 4: User Story 2 - Barra Lateral Refinada com Mini-Sidebar e Agrupamento (Priority: P1)

**Goal**: Permitir recolhimento da barra lateral para modo mini (~48px) mostrando apenas ícones com expansão hover, agrupamento de workspaces em pastas/seções, reordenação via drag & drop e badges numéricos acionados por `Ctrl`.

**Independent Test**: Alternar para o modo mini-sidebar, passar o mouse para expansão flutuante, arrastar workspaces para reordenar ou agrupar em pastas, e segurar a tecla `Ctrl` para conferir os números de atalho nos ícones.

- [X] T012 [P] [US2] Implementar estrutura e estilos CSS para mini-barra lateral recolhida (~48px), transição de recolhimento (<150ms), flyout/tooltip sob hover e persistência de estado em `public/styles.css`.
- [X] T013 [US2] Atualizar `public/js/workspace-sidebar.js` para renderizar o modo mini com ícones Lucide, alternador de colapso, agrupamento por pastas com acordeão e estado ativo.
- [X] T014 [US2] Implementar reordenação de workspaces e pastas via Drag and Drop nativo em `public/js/workspace-sidebar.js`.
- [X] T015 [US2] Implementar visualização dinâmica de badges numéricos na barra lateral ao pressionar e segurar `Ctrl` (atalhos `Ctrl+1` a `Ctrl+9`) em `public/js/workspace-sidebar.js` e `public/js/main.js`.

**Checkpoint**: US2 concluída: Barra lateral responsiva, mini-sidebar fluida, pastas expansíveis e navegação por teclado rápida.

---

## Phase 5: User Story 3 - Transições e Navegação Fluida no Canvas (Priority: P2)

**Goal**: Navegação suave com easing no canvas (fly-to 300ms no foco), zoom suave centrado no cursor, animações de duplicação (`Alt+arraste`) e exclusão suave (`Ctrl+W` / botão fechar).

**Independent Test**: Pressionar `Ctrl+\` para centralizar em um nó com fly-to em 300ms; duplicar nó com `Alt+arraste` verificando animação elástica de entrada (fade-in + scale 0.8→1.0); excluir nó verificando saída animada em 200ms antes do descarte.

- [X] T016 [US3] Implementar interpolação suave de câmera (fly-to com curva cubic-bezier / easeInOutCubic em 300ms) para foco de nós (`Ctrl+\`) e zoom em `public/js/canvas.js`.
- [X] T017 [US3] Implementar animação de duplicação elástica de nós (fade-in + scale 0.8 para 1.0) em `public/styles.css` e manipulação em `public/js/main.js`.
- [X] T018 [US3] Implementar animação de saída/remoção de nós (scale 0.9 e fade-out em 200ms antes da remoção do DOM) em `public/js/main.js` e `public/styles.css`.
- [X] T019 [US3] Suportar animação de reposicionamento em grade suave para seleção de múltiplos nós em `public/js/main.js`.

**Checkpoint**: US3 concluída: Movimentação, duplicação e exclusão no canvas com sensação física e inércia visual.

---

## Phase 6: User Story 4 - Conexões com Física Pendular, Circuitos e Abraçadeiras (Priority: P2)

**Goal**: Conexões estilo Corda com oscilação elástica e gravidade simulada, conexões estilo Circuito com ângulos retos de 90° e cantos arredondados, agrupamento de cabos em abraçadeiras e pulso luminoso durante troca de mensagens/dados.

**Independent Test**: Arrastar nós conectados e observar a oscilação amortecida da corda; alternar para circuito e verificar o roteamento ortogonal com raio suave; disparar transmissão e conferir o pulso luminoso percorrendo o cabo por 2 segundos.

- [X] T020 [US4] Refinar a física pendular do estilo Corda em `public/js/connections.js` com amortecimento elástico (spring damping) e caimento natural (sag distance dependente do comprimento e velocidade).
- [X] T021 [US4] Implementar gerador de caminho SVG ortogonal (90° com cantos arredondados `border-radius` nos vértices) para conexões no estilo Circuito em `public/js/connections.js`.
- [X] T022 [US4] Suportar convergência de cabos próximos em abraçadeiras (feixes) com ponto de ancoragem intermediário compartilhado em `public/js/connections.js`.
- [X] T023 [US4] Implementar efeito de pulso luminoso (onda de brilho SVG `stroke-dashoffset` / gradiente animado de 2 segundos) em cabos ativos em `public/js/connections.js` e `public/styles.css`.

**Checkpoint**: US4 concluída: Cabos com física elástica natural, circuitos limpos e pulsos visuais de atividade de rede/agentes.

---

## Phase 7: User Story 5 - Elevação Centrada, Acoplamento (Docking) e Minimapa Interativo (Priority: P3)

**Goal**: Duplo clique no cabeçalho eleva o nó em destaque para o centro da tela; arrastar o nó elevado para as laterais permite acoplá-lo em docas fixas (dock); minimapa permite navegação por clique e arraste direto do retângulo de visualização.

**Independent Test**: Dar duplo clique no cabeçalho de um nó e confirmar elevação centralizada com backdrop sutil; arrastar nó para lateral da tela e acoplar; arrastar retângulo do minimapa para navegar no canvas.

- [X] T024 [US5] Implementar elevação de nó ao centro da tela com duplo clique no cabeçalho em `public/js/main.js` e `public/styles.css` (classe `.node-elevated`, sombra profunda, transição 250ms).
- [X] T025 [US5] Implementar sistema de acoplamento (docking) lateral (dock esquerdo / dock direito em coluna fixa) ao arrastar nó elevado contra as bordas da janela em `public/js/main.js` e `public/styles.css`.
- [X] T026 [US5] Aprimorar o minimapa em `public/js/canvas.js` ou componente de minimapa para permitir clique e arraste interativo em tempo real da caixa delimitadora da viewport.

**Checkpoint**: US5 concluída: Alternância fluida entre visão macro espacial e foco concentrado em tarefas específicas.

---

## Phase 8: User Story 6 - Indicadores de Estado e Acessibilidade de Movimento (Priority: P3)

**Goal**: Configuração de "Reduzir Movimento" no menu de configurações com desligamento imediato de animações; indicador luminoso pulsante em vermelho para agentes aguardando entrada; spinner vetorial giratório suave para processos em andamento.

**Independent Test**: Marcar "Reduzir Movimento" em Configurações e constatar tempo 0ms em transições e fly-to; simular terminal em estado de atenção e verificar ponto luminoso vermelho pulsante.

- [X] T027 [US6] Adicionar controle de alternância "Reduzir Movimento" nas configurações em `public/js/settings.js`, persistindo a preferência em `AppState.ui.reducedMotion` e aplicando classe `.reduced-motion` no DOM.
- [X] T028 [US6] Implementar indicador pulsante de atenção em nós de terminal (`.terminal-attention-pulse`) e spinner vetorial (`Icons.svg('loader', { className: 'icon-spin' })`) para processamento em `public/js/terminal.js` e `public/styles.css`.
- [X] T029 [US6] Garantir que todas as transições de câmera, nós, conexões e minimapa verifiquem `app.motion.isReduced()` para supressão imediata de atrasos.

---

## Phase 9: Polish, Performance & Verification

**Purpose**: Verificação de integridade, compatibilidade retroativa e ausência de regressões.

- [X] T030 Validar integridade sintática de todos os arquivos JavaScript com `node -c public/js/*.js` e `node -c server.js`.
- [X] T031 Testar a inicialização do app desktop e verificar se a interface e todos os nós carregam sem erros no console.
- [X] T032 Executar roteiro completo de validação rápida conforme `specs/007-layout-icons-animations/quickstart.md`.
