# Tasks: Maestri Delta — Workspaces, Agentes & Responsabilidades, Notas, Conexões Avançadas e Árvore de Arquivos

**Input**: Design documents from `specs/006-maestri-spatial-orchestration/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Automated test tasks are NOT included — this project validates manually (repo convention, features 001–005). Cada user story traz seu **Independent Test** (critério de aceite manual). O guia de validação de uso está em `quickstart.md`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single Electron project**: `electron/` (main process), `public/` (renderer), `public/js/`, `public/vendor/`, `scripts/`
- Caminhos exatos por task conforme `plan.md` → Project Structure.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, vendored assets e containers de UI básicos.

- [X] T001 Adicionar script de vendoring (padrão `scripts/fetch-vendor.js`) para baixar/registrar CodeMirror 5 (`codemirror.js`, `codemirror.css`) e `marked.min.js` para `public/vendor/`, carregando-os em `public/index.html`
- [X] T002 [P] Adicionar container de barra lateral (`<aside id="sidebar">`), de docks (`<div id="docks">`), do minimapa (`<div id="minimap">`) e do overlay de badges/shortcuts (`<div id="badges-layer">`) em `public/index.html`
- [X] T003 [P] Adicionar arquivos base dos novos módulos JS do renderer vazios (comentário de propósito) em `public/js/`: `workspace-sidebar.js`, `notes.js`, `filetree.js`, `settings.js`, `widgets/textdraw.js`
- [X] T004 [P] Adicionar arquivos base dos novos módulos do main process vazios (comentário de propósito) em `electron/`: `workspace-registry.js`, `agent-cli.js`, `roles.js`, `notes-store.js`, `filetree-service.js`, `state-migrate.js`, `connectors/agent-comm.js`
- [X] T005 Carregar novos scripts na ordem correta em `public/index.html` (após os existentes; `workspace-sidebar.js`, `notes.js`, `filetree.js`, `widgets/textdraw.js`, `settings.js` antes de `main.js`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Núcleo de migração v3 e roteamento de mensagens. Deve estar completo ANTES de qualquer user story.

**⚠️ CRITICAL**: Nenhuma user story pode começar antes desta fase.

- [X] T006 Implementar `electron/state-migrate.js`: ler `state.json` v1/v2 (workflows) e converter cada workflow em Workspace (1:1, FR-053) com `{id,name,icon,workingDir,instructions,nodes,connections,groups,createdAt,updatedAt,lastActiveAt}`; gravar v3
- [X] T007 Integrar `state-migrate.js` em `electron/terminal-manager.js` (`loadState` chama migração; `saveLayout` grava `AppState` v3 com `workspaces` + `activeWorkspaceId` + `ui` + `settings` + `roles`)
- [X] T008 Refatorar `electron/terminal-manager.js`: substituir `workflows` por `workspaces` (CRUD `create/switch/rename/delete`); manter leitura compatível de v2; `switchWorkspace` **não encerra** PTYs do workspace anterior (apenas troca a superfície ativa e marca `lastActiveAt`)
- [X] T009 Estender `broadcastLayout()` em `electron/main.js` para emitir `layout` v3 com `workspaces[]`, `sidebar`, `settings` e `roles` (mantendo campos legados `workflows`/`terminals` por 1 release)
- [X] T010 [P] Atualizar `public/js/main.js` handler de `layout`: aceitar v3 (`workspaces`/`activeWorkspaceId`), popular `app.workspaces`, manter `syncLayout()` funcional para o workspace ativo e o fallback de floors legado
- [X] T011 Adicionar handlers IPC genéricos em `electron/main.js` para os novos grupos de mensagens do `contracts/ipc-events.md` (workspace/sidebar/roles/notes/fs/git/connections/theme/settings), delegando aos módulos de domínio (a criar nas fases de cada story); mensagens sem handler logam warning
- [X] T012 Registrar `sidebar` inicial em `AppState.ui` e helper de acesso `ui`/`settings` (get/set com merge) em `electron/terminal-manager.js`

**Checkpoint**: Foundation ready — migração v3 sem perda; broadcast layout v3; roteamento IPC pronto. Stories podem iniciar em paralelo.

---

## Phase 3: User Story 1 - Barra Lateral de Workspaces com Diretório e Organização (Priority: P1) 🎯 MVP

**Goal**: Barra lateral de workspaces (diretório+ícone), pastas/grupos, mini sidebar e atalhos; edição; "Abrir no Editor"; instruções CLAUDE.md/AGENTS.md (FR-001..006, FR-010, FR-053/FR-002).

**Independent Test**: Criar 2 workspaces com diretórios/ícones distintos via "+", agrupá-los em pasta, recolher a barra e alternar por ícones/atalhos (`Ctrl+↑/↓`, duplo `Ctrl`+número, `Ctrl+scroll`), editar via contexto e abrir o diretório no editor.

### Implementation for User Story 1

- [X] T013 [P] [US1] Implementar `public/js/workspace-sidebar.js`: render da lista de workspaces (ícone+nome), estado collapsed, pastas e grupos de seção conforme `SidebarStructure`
- [X] T014 [P] [US1] Adicionar estilos da sidebar, mini sidebar, modais (criar/editar workspace) e badges em `public/styles.css`
- [X] T015 [US1] Implementar modal "Novo Workspace"/"Editar Workspace" em `public/js/workspace-sidebar.js` com seleção de diretório (IPC `dir_pick`) e ícone (picker de emoji) — dispatch `workspace_create`/`workspace_rename`/`workspace_set_dir`
- [X] T016 [US1] Implementar CRUD de workspaces no `electron/terminal-manager.js` exposto por `workspace_*` handlers e picker de diretório (`dialog.showOpenDialog`) em `electron/main.js`
- [ ] T017 [P] [US1] Implementar organização sidebar (`sidebar_folder`, `sidebar_section`, `sidebar_collapse`) em `electron/terminal-manager.js` persistindo em `AppState.ui`
- [X] T018 [US1] Implementar atalhos de navegação em `public/js/main.js`: `Ctrl+↑/↓`, duplo `Ctrl` (overlay numerado em `#badges-layer` → pular p/ workspace), `Ctrl+scroll`; registrar após `workspace-sidebar.js`
- [X] T019 [P] [US1] Implementar ação "Abrir no Editor" em `electron/main.js` (reusar fluxo `open_vscode` com o `workingDir` do workspace) e botão no menu de contexto da sidebar
- [X] T020 [US1] Implementar gerenciamento de instruções CLAUDE.md/AGENTS.md em `electron/roles.js`: leitura/escrita dos arquivos no `workingDir` e sincronização automática entre ambos quando `instructions.syncBetween` (FR-010)
- [X] T021 [US1] Implementar IPC `workspace_instructions` em `electron/main.js` + painel de edição de instruções no modal do workspace (estado `dirMissing` → oferecer "religar diretório" via `workspace_set_dir`)
- [X] T022 [US1] Migração visual da UI de floors: `public/js/main.js` passa a alimentar `#floor-select` (ou a remove em favor da sidebar) pela lista `workspaces` do layout v3, garantindo que a troca chame `workspace_switch`

**Checkpoint**: US1 funcional isoladamente — barra lateral completa, criação/edição com diretório, organização, atalhos e instruções; dados legados migrados.

---

## Phase 4: User Story 2 - Multi-Workspace em Segundo Plano e Retomada Instantânea (Priority: P1)

**Goal**: Workspaces seguem ativos em background (limite LRU N=3), pausa encerra processos e reativa com relançamento+resume; estado restaurado fielmente (FR-007/FR-008/FR-054, SC-003/SC-012; Clarificações Q3/Q5).

**Independent Test**: Iniciar processo demorado num workspace, alternar p/ outro, retornar → processo continua vivo; exceder o limite N criando 4+ workspaces → o mais antigo é pausado e, ao voltar, relança e (com agente da US3) resume.

### Implementation for User Story 2

- [X] T023 [P] [US2] Implementar `electron/workspace-registry.js`: mapa `workspaceId → WorkspaceRuntime{state, processes}`; registrar spawn/kill de PTYs por workspace a partir de `terminal-manager.js`
- [X] T024 [US2] Aplicar política LRU em `workspace-registry.js`: manter vivos `active + backgroundKeepalive(N=3)` workspaces por `lastActiveAt`; excedente → `paused` (encerra PTYs, preserva snapshot) — FR-054
- [X] T025 [US2] Integrar troca em `terminal-manager.js`/`main.js`: `workspace_switch` marca anterior como `background`, envia `workspace_state`, não mata PTYs (FR-008)
- [X] T026 [P] [US2] Implementar reativação de workspace pausado em `workspace-registry.js`: relançar terminais do snapshot (shell padrão por ora; hook para resume de agente é integrado na US3) e enviar `workspace_state:"active"` — meta de retomada < 5 s (SC-003)
- [X] T027 [US2] Adicionar `settings.backgroundKeepalive` (padrão 3) e notificação `workspace_state` quando um workspace é pausado (informar que processos foram encerrados) em `electron/main.js`
- [X] T028 [US2] Restaurar layout fiel ao reabrir o app (estado v3 já migrado): garantir `restore()` recria nós/geometria/conexões/grupos e relança terminais do workspace ativo — valida FR-007/SC-002 e prepara SC-012

**Checkpoint**: US2 isolada — troca sem perda de processo dentro do limite, pausa/retomada com aviso, restauração fiel pós-restart.

---

## Phase 5: User Story 3 - Terminais com Agentes CLI e Responsabilidades (Priority: P1)

**Goal**: Terminal executa Claude Code/Codex/OpenCode com nome/ícone, responsabilidades (Configurações → Agentes), injeção de instruções, role.json sidecar, indicador de atenção e badges (FR-011..018).

**Independent Test**: Criar 2 terminais com agentes diferentes e responsabilidades distintas; conferir injeção das instruções no início; fechar/reabrir → sessão relança com resume (quando suportado); agente ocioso → ponto de atenção + notificação; `Ctrl`+número foca terminal.

### Implementation for User Story 3

- [X] T029 [P] [US3] Implementar `electron/agent-cli.js`: detecção via PATH (`which claude|codex|opencode`) retornando `agent_list`; adaptadores por agente p/ spawn com `cwd = workingDir` do workspace
- [X] T030 [US3] Implementar spawn de agente no `electron/terminal-manager.js`: `create_node` tipo `terminal` com `agent`/`roleId`/`icon` cria PTY do CLI do agente (fallback shell + estado `agent_missing` quando binário ausente)
- [X] T031 [US3] Implementar injeção de responsabilidade em `agent-cli.js`: após prontidão do agente (heurística de saída estável/prompt), escrever as instruções da role como primeira mensagem da sessão — FR-015
- [ ] T032 [P] [US3] Implementar resume em `agent-cli.js` (FR-052): `claude --resume`, `codex resume`, `opencode --session` quando houver `sessionId`; fallback sessão limpa; reaproveitar na reativação de workspaces pausados (US2 hook)
- [X] T033 [US3] Implementar `electron/roles.js` CRUD (global em `settings.roles`) e sidecar `role.json` no `workingDir` (contrato `file-formats.md`), com regra de divergência (diretório vence na abertura) — FR-013/FR-016
- [X] T034 [US3] Implementar IPC `roles_save`/`role_assign` e broadcast de roles em `electron/main.js`
- [X] T035 [P] [US3] Implementar tela Configurações → Agentes em `public/js/settings.js`: CRUD de responsabilidades (nome, badge colorido, instruções) e seleção de agente/ícone/nome por terminal no modal de criação
- [ ] T036 [US3] Atribuir responsabilidade e exibir badge colorido no cabeçalho do terminal em `public/js/terminal.js` (menu do nó) — FR-014
- [X] T037 [P] [US3] Implementar indicador de atenção em `electron/terminal-manager.js`: heurística de ociosidade do agente (sem saída após burst) + padrões `[y/n]`/`password:` → broadcast `attention{waiting|done}`; notificações reutilizam fluxo `notify` conforme `settings.attentionNotifications` — FR-017
- [X] T038 [P] [US3] Renderizar ponto de atenção no cabeçalho (`#badges-layer`/`.attention`) em `public/js/terminal.js` e limpar ao focar/novo output (`attention_cleared`)
- [ ] T039 [US3] Implementar badges numerados em `public/js/main.js`: segurar `Ctrl` mostra números sobre terminais; digitar número foca; `Ctrl+Shift+A` pula ao próximo `.attention` — FR-018/FR-049

**Checkpoint**: US3 isolada — terminais rodam agentes com roles injetadas, persistência role.json, atenção e navegação por badges.

---

## Phase 6: User Story 4 - Nós de Nota (Markdown no Canvas) (Priority: P1)

**Goal**: Notas markdown reais no disco com Raw/Formatada, imagens inline, título derivado/fixável, encadeamento e movimentação interna↔projeto (FR-019..025).

**Independent Test**: Criar nota, escrever markdown + colar imagem, alternar Raw/Formatada, renomear, conectar a outra nota, mover p/ o projeto e reabrir o app conferindo persistência.

### Implementation for User Story 4

- [X] T040 [P] [US4] Implementar `electron/notes-store.js`: mapear `noteId → .md` (padrão `<userData>/notes/<workspaceId>/<nodeId>.md`), salvar com debounce, criar/ler/mover arquivos e `fs.watch` p/ mudanças externas
- [X] T041 [US4] Implementar IPC de notas em `electron/main.js`: `note_create`, `note_content`, `note_move`, `note_pinned`, broadcast `note_updated`/`note_moved` (contrato `ipc-events.md`)
- [ ] T042 [P] [US4] Implementar `NoteWidget` em `public/js/notes.js`: edição Raw + render Markdown (via `marked` vendored + sanitização whitelist) com alternância, toolbar e colagem de imagem (data URI → arquivo `assets/`)
- [X] T043 [US4] Registrar fábrica do tipo `note` em `public/js/main.js` (`ensureNode`) e botão de ferramenta "Nota" (inserção por clique/arrasto) na toolbar de `public/index.html`
- [ ] T044 [US4] Implementar título derivado da primeira linha e ação "Renomear" (fixa `pinnedName`, front matter `file-formats.md`) em `public/js/notes.js` — FR-022
- [X] T045 [US4] Implementar "mover para o projeto" (menu do nó) e remoção `⌘W` com confirmação quando arquivo estiver fora da pasta interna — FR-024/FR-025
- [X] T046 [US4] Garantir encadeamento: notas conectáveis pelo mecanismo de conexões existente (sem task extra de conexão; validar que portas existem nos NoteWidgets) — FR-023
- [ ] T047 [US4] Aplicar tema/estilo visual do widget de nota e atualizar `removeWidget` para limpar arquivo via `note_delete` quando `internal` — FR-025

**Checkpoint**: US4 isolada — notas funcionam como arquivos reais com os dois modos de exibição, imagens, nomes, encadeamento e remoção segura.

---

## Phase 7: User Story 5 - Árvore de Arquivos como Nó do Canvas (Priority: P2)

**Goal**: Nó com navegação de arquivos (Lista/Grade/Diff/Graph), CRUD via contexto, operações Git e drag-drop p/ terminal/canvas (FR-026..030). Editor embutido e busca ficam na US9.

**Independent Test**: Inserir nó apontando ao workspace; criar/renomear arquivo; ver diff; executar commit; arrastar arquivo p/ terminal (insere caminho) e p/ canvas (pré-visualização).

### Implementation for User Story 5

- [X] T048 [P] [US5] Implementar `electron/filetree-service.js`: `fs_read_dir` (lazy por pasta), CRUD (`create/rename/move/delete`) e broadcast de resultados
- [X] T049 [P] [US5] Implementar operações Git em `electron/filetree-service.js` via `child_process` (`branch_show`, status, `commit`, `pull/push`, `checkout`, `branch`, `merge`, `fetch`, `stash`) com `cwd=workspace` — FR-030
- [X] T050 [US5] Implementar IPC fs/git em `electron/main.js` (mensagens `fs_*`, `git_*` do contrato) com respostas `fs_dir_result`/`git_result`
- [X] T051 [P] [US5] Implementar `FileTreeWidget` em `public/js/filetree.js` (modo Lista): árvore expansível, menu de contexto (CRUD), indicador de branch e menu Git
- [X] T052 [US5] Registrar fábrica do tipo `file-tree` em `public/js/main.js` e botão de ferramenta "Árvore de Arquivos" na toolbar
- [X] T053 [US5] Implementar modo Grade de Ícones (miniaturas de imagens/PDF/vídeo via `file://`) em `public/js/filetree.js` — FR-027
- [X] T054 [US5] Implementar modo Diff (uncommitted lado a lado, base vs atual via `git diff`) em `public/js/filetree.js` — FR-027
- [X] T055 [US5] Implementar modo Graph (grafo SVG a partir de `git log --graph --all --decorate --oneline`) em `public/js/filetree.js` — FR-027
- [ ] T056 [US5] Implementar drag-drop: arquivo → terminal (insere caminho citado, reuso do fluxo existente) e arquivo → canvas (cria nó de pré-visualização do arquivo) em `public/js/filetree.js` + `main.js` — FR-029
- [X] T057 [US5] Tratar estados de erro/empty das operações fs/git (mensagem legível, estado consistente) e `git_result` com erro — edge cases do spec

**Checkpoint**: US5 isolada — navegação, CRUD, modos Lista/Grade/Diff/Graph, Git ops e drag-drop operacionais.

---

## Phase 8: User Story 6 - Comunicação entre Agentes e Conexões Agente↔Nota/Agente↔Portal (Priority: P2)

**Goal**: Agentes conectados se comunicam via skill; agente lê/edita nota conectada; agente controla portal; ações diretas com registro/histórico (FR-034..037, FR-055; Q4).

**Independent Test**: Conectar 2 terminais de agentes + 1 nota; um agente chama `maestri-agent send --to <outro>` e `note read/write`; conferir entrega, mudança no `.md` e entrada no histórico do painel de inspeção.

### Implementation for User Story 6

- [X] T058 [P] [US6] Estender `ConnectionData` com `kind` (`node|agent-agent|agent-note|agent-portal`) e `log: ActionLogEntry[]` em `electron/terminal-manager.js` + validações (extremidade terminal-com-agente; `from!==to`; sem duplicidade) — data-model §6
- [ ] T059 [US6] Implementar `electron/connectors/agent-comm.js`: ponte do comando `maestri-agent` (resolver por IPC; entregar no PTY de destino; `note read/write` via `notes-store`; `portal navigate/reload/back` → renderer `portal_control`)
- [ ] T060 [US6] Instalar a skill nos agentes conectados em `agent-comm.js`: instrução de uso na sessão + garantir `maestri-agent` no PATH; reaplicar em novo spawn/resume (US3 hook); `ping` valida instalação — FR-034
- [ ] T061 [US6] Registrar toda ação no `ConnectionData.log` (at, fromNodeId, toNodeId, verb, summary) e persistir — FR-055
- [ ] T062 [P] [US6] Implementar IPC `connection_inspect`/`connection_inspect_result` e painel de inspeção (badge de conexões no cabeçalho listando conexões + histórico) em `public/js/connections.js` — FR-037
- [X] T063 [US6] Rotular automaticamente o `kind` ao conectar por tipo de extremidade (terminal+terminal→agent-agent; terminal+nota→agent-note; terminal+portal→agent-portal) em `public/js/connections.js` — FR-034..036
- [ ] T064 [US6] Implementar controle de portal a partir de agente em `public/js/portals.js`: ouvir `portal_control` e executar no `<webview>` do portal alvo — FR-036

**Checkpoint**: US6 isolada — skill instalada e operante entre agentes conectados, acesso a notas/portais e histórico visível.

---

## Phase 9: User Story 7 - Estilos de Conexão e Feixes de Cabos (Priority: P2)

**Goal**: Estilo Corda (física pendular) e Circuito (90°); abraçadeiras (feixes) via `Alt+drag` (FR-038/FR-039).

**Independent Test**: Conectar 2 nós; alternar Corda↔Circuito sem perder a conexão; com `Alt`, arrastar sobre 2+ cordas e agrupá-las num feixe reposicionável; soltar o feixe preservando cada conexão.

### Implementation for User Story 7

- [X] T065 [US7] Adicionar `style: "rope"|"circuit"` (default `rope`) e `bundleId?` a `ConnectionData` + IPC `connection_style`/`connection_bundle` em `electron/terminal-manager.js` e `electron/main.js` — FR-038/FR-039
- [X] T066 [US7] Renderizar estilo Circuito (polilinha ortogonal com curvas de 90°) em `public/js/connections.js` e alternar via menu de contexto da linha/badge — FR-038
- [X] T067 [US7] Ajustar estilo Corda com física pendular suave (bezier simétrico amortecido) em `public/js/connections.js` — FR-038
- [X] T068 [US7] Implementar abraçadeiras em `public/js/connections.js`: `Alt+drag` sobre cordas cria `bundleId` (feixe agrupado reposicionável); arrastar de novo sobre o feixe o dissolve preservando cada conexão — FR-039
- [X] T069 [US7] Persistir e restaurar `style`/`bundleId` no layout (broadcast e state v3); remover vínculo de feixe quando um nó é excluído

**Checkpoint**: US7 isolada — estilos alternáveis e feixes persistidos sem quebrar conexões.

---

## Phase 10: User Story 8 - Produtividade do Canvas: Inserção por Arrasto, Texto/Desenho, Grupos e Minimapa (Priority: P2)

**Goal**: Inserir nós desenhando retângulo; nós Texto/Desenho leves; duplicar (`Alt+arrasto`); grupos (`Ctrl+G`); alinhar/distribuir/organizar; snap magnético; minimapa; elevar/acoplar; atalhos (FR-040..049).

**Independent Test**: Desenhar retângulo p/ criar nó; criar Texto e Desenho e desenhar; duplicar com `Alt`; agrupar 2 nós e mover o grupo; `Ctrl+Shift+T` grade; snap com `Ctrl`; alternar minimapa; dois cliques elevam; arrastar p/ borda acopla coluna fixa.

### Implementation for User Story 8

- [ ] T070 [US8] Implementar inserção por arrasto de retângulo (ferramenta ativa → `mousedown` no canvas → retângulo de seleção → cria nó no tamanho desenhado) em `public/js/canvas.js` + `main.js` — FR-040
- [X] T071 [P] [US8] Implementar `TextWidget` (rótulo/snippet contenteditable) e `DrawWidget` (canvas 2D com strokes `{color,width,points}`) em `public/js/widgets/textdraw.js`; registrar fábricas `text`/`drawing` em `main.js` e botões de ferramenta — FR-041
- [X] T072 [US8] Persistir `strokes`/`content` do desenho/texto via `update_node` em `electron/main.js` e restaurar no load — FR-041
- [ ] T073 [P] [US8] Implementar duplicar (`Alt+arrastar` ou menu direito) em `public/js/main.js` (clone do nó + geometria deslocada) — FR-042
- [ ] T074 [US8] Implementar grupos em `canvas.js`/`main.js`: seleção múltipla + `Ctrl+G` cria `Group` (persistido em `AppState.workspaces[].groups`), frame nomeado, mover cabeçalho move membros, seleção passa pelo frame; `Ctrl+Shift+G` dissolve — FR-043
- [ ] T075 [P] [US8] Implementar alinhar/distribuir e organizar em grade (`Ctrl+Shift+T`) em `public/js/main.js` sobre nós selecionados — FR-044/FR-045
- [ ] T076 [US8] Implementar snap magnético em `public/js/canvas.js` (somente com `Ctrl` pressionado durante drag; tolerância ~6px; alinhar paredes/preencher lacunas) — FR-046
- [ ] T077 [P] [US8] Implementar minimapa (`#minimap`, overlay SVG com nós+viewport; `Ctrl+Shift+M`; clique navega) em `public/js/canvas.js` — FR-047
- [ ] T078 [US8] Implementar elevar/acoplar em `canvas.js`/`main.js`: duplo clique no cabeçalho eleva (centraliza animado); arrastar à borda acopla em coluna fixa em `#docks` (container não-transformado; `docked:"left"|"right"` persistido) — FR-048
- [ ] T079 [US8] Registrar atalhos `Ctrl+\` (focar), `Ctrl+Alt+\` (zoom p/ seleção), `Ctrl+Alt+→/←` (navegar conexões) e `Ctrl+Shift+M` em `public/js/main.js`, evitando conflito quando digitando — FR-049

**Checkpoint**: US8 isolada — canvas com inserção por arrasto, novos nós leves, grupos, alinhamento, snap, minimapa e docks.

---

## Phase 11: User Story 9 - Editor de Código Embutido e Busca no Projeto (Priority: P3)

**Goal**: Editor CodeMirror embutido (realce, find/replace, multicursor, autoclose, indentação) dentro do FileTreeWidget; busca fuzzy `Ctrl+P` e por conteúdo `>`; seleção→agente (FR-031..033).

**Independent Test**: Abrir arquivo .js no nó de árvore → editar com realce; `Ctrl+P` encontra por nome; busca com `>` encontra termo no conteúdo; selecionar texto e enviar ao agente conectado via ícone de chat.

### Implementation for User Story 9

- [ ] T080 [US9] Integrar editor CodeMirror 5 (vendored) no `FileTreeWidget` em `public/js/filetree.js`: abrir arquivo em painel de edição com modos por extensão, find/replace, multicursor, autoclose e detecção de indentação — FR-031
- [ ] T081 [US9] Implementar leitura/escrita de arquivo (`file_read`/`file_write`) em `electron/filetree-service.js` + `main.js` e salvar com debounce; detectar mudança externa (edge case arquivo removido/alterado fora) — FR-031
- [ ] T082 [P] [US9] Implementar busca fuzzy por nome em `public/js/main.js` (overlay `Ctrl+P`) consultando `file_search` por nome — FR-033
- [ ] T083 [P] [US9] Implementar busca por conteúdo em `electron/filetree-service.js`: prefixo `>` → busca em conteúdo (`rg`/`grep -rl` com fallback a varredura de texto; limite de tamanho/profundidade p/ < 1 s) — FR-033/SC-010
- [ ] T084 [US9] Renderizar resultados e abrir arquivo ao selecionar (nome ou conteúdo) em `public/js/main.js` + `filetree.js`
- [ ] T085 [US9] Implementar ícone de chat sobre seleção no editor/diff e envio do trecho ao agente conectado (via `agent-comm`/entrada do PTY) em `public/js/filetree.js` + `main.js` — FR-032
- [ ] T086 [US9] Estender seleção→agente ao modo Diff (base/atual) — FR-032

**Checkpoint**: US9 isolada — edição embutida completa, busca por nome/conteúdo e envio de seleção a agentes.

---

## Phase 12: User Story 10 - Temas de Terminal, Portabilidade (.maestri) e Integrações (Priority: P3)

**Goal**: Temas Dracula/Catppuccin/Nord + import Ghostty; export/import `.maestri` autocontido; Spotlight macOS via `maestri://` (FR-050/FR-051, FR-009).

**Independent Test**: Aplicar tema embutido e importar tema Ghostty `.json` num terminal; exportar workspace `.maestri`, importar em outra instalação (layout+notas+roles); no macOS, abrir via deep link.

### Implementation for User Story 10

- [ ] T087 [P] [US10] Adicionar presets Dracula/Catppuccin/Nord e mapear temas Ghostty JSON → `TerminalStyle` em `public/js/terminal.js`; aplicar via menu de tema do terminal — FR-050
- [ ] T088 [P] [US10] Implementar importação de tema Ghostty em `electron/main.js` (dialog `*.json`, parse, broadcast) + `theme_apply`/`theme_import_ghostty` — FR-050
- [ ] T089 [US10] Implementar export em `electron/main.js`/`terminal-manager.js`: montar bundle `.maestri` (workspace + notas + roles embutidas, `file-formats.md`) e `dialog.showSaveDialog` — FR-009
- [ ] T090 [US10] Implementar import `.maestri` em `electron/main.js`: validar bundle, criar workspace (sufixo "(importado)" se id existir), religar diretório vazio, restaurar notas/roles — FR-009
- [ ] T091 [US10] Registrar protocolo `maestri://` (`app.setAsDefaultProtocolClient`) e handler de deep link (abrir workspace/nota, focar janela) em `electron/main.js` — FR-051
- [ ] T092 [P] [US10] Expor workspaces exportados como `.maestri` numa pasta indexável (`~/Maestri`) e notas `.md` acessíveis ao Spotlight no macOS — FR-051

**Checkpoint**: US10 isolada — temas/import, portabilidade `.maestri` e deep link Spotlight.

---

## Phase 13: Polish & Cross-Cutting Concerns

**Purpose**: Acabamento, robustez e validação transversal do delta.

- [ ] T093 [P] Garantir atalhos globais não conflitam com digitação/agentes (revisar keydown em `public/js/main.js` e `electron/main.js` before-input)
- [ ] T094 [P] Tratar vazamentos de listeners ao trocar workspaces (dispose de widgets/observers em `public/js/main.js`/widgets) — constraint do plan
- [ ] T095 Revisar erros/edge cases do spec: diretório inacessível, agente não instalado, nota sem primeira linha, exclusão com arquivo no projeto, conflito git, mudança externa em arquivo, pausa com subprocessos, reinício sem resume
- [ ] T096 [P] Otimizar redraw de conexões/minimapa para ≥50 FPS com até 100 nós (throttle em `connections.js`/`canvas.js`) — SC-009
- [ ] T097 [P] Validar persistência/migração: abrir `state.json` v2 de um usuário existente e conferir migração v3 sem perda — FR-053
- [ ] T098 Executar `quickstart.md` de ponta a ponta (todos os fluxos) e corrigir regressões
- [ ] T099 Atualizar `README.md` com o novo nome/conceitos (Workspaces, Agentes) e `public/index.html` brand/textos se necessário
- [ ] T100 Revisão final de formato: conferir que `contracts/file-formats.md`, `data-model.md` refletem o implementado (nomes de campos/broadcasts)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências — pode iniciar imediatamente.
- **Foundational (Phase 2)**: Depende do Setup — BLOQUEIA todas as user stories.
- **User Stories (Phases 3–12)**: Dependem da Foundational. Ordem recomendada por prioridade e dependência técnica:
  - **US1 → US2**: US2 usa o modelo de workspaces e broadcast da US1/foundation.
  - **US2 → US3**: US3 conecta o hook de resume/reativação criado na US2 (T026); US2 funciona sozinha com shells.
  - **US3 → US6**: comunicação entre agentes exige spawn de agentes (US3).
  - **US4 → US6**: `agent-note` usa `notes-store` (US4).
  - **US5 → US9**: editor/busca estendem o `FileTreeWidget` (US5); US5 independe da US9.
  - **US6/US7** tocam `connections.js` — implementar US6 antes da US7 para evitar conflitos no mesmo arquivo.
  - **US8** mexe em `canvas.js`/`main.js` (compartilhados): preferir após US1/US2 estabilizarem os handlers de layout.
- **Polish (Fase 13)**: Depende das stories desejadas completas.

### User Story Dependencies

- **US1 (P1)**: pós-foundation; sem dependência de outras stories.
- **US2 (P1)**: pós-foundation + US1 (modelo de workspace); independência testável com shells.
- **US3 (P1)**: pós-foundation; usa workspace switching (US1/US2 opcional p/ `cwd`/resume).
- **US4 (P1)**: pós-foundation; independente.
- **US5 (P2)**: pós-foundation; independente (usa nós + drag-drop de terminal existente).
- **US6 (P2)**: depende de US3 (agentes) e US4 (notas); portal é base existente.
- **US7 (P2)**: pós-foundation; melhor após US6 (mesmo arquivo de conexões).
- **US8 (P2)**: pós-foundation; prefere US1/US2 concluídas (handlers de layout).
- **US9 (P3)**: depende de US5 (FileTreeWidget).
- **US10 (P3)**: pós-foundation; usa roles (US3) e notas (US4) no bundle `.maestri`.

### Within Each User Story

- Modelos/estado no main (terminal-manager/domain modules) antes do renderer
- IPC/contratos antes da UI do widget
- Widget + fábrica (`ensureNode`) + botão de ferramenta juntos, por story
- Validar o **Independent Test** da story antes de avançar

### Parallel Opportunities

- T002/T003/T004/T005 (Setup) e T013/T014, T023/T026, T029/T032/T037/T038, T040/T042, T048/T049/T051, T058/T062, T071/T073/T075/T077, T087/T088/T092 etc. marcadas [P] podem rodar em paralelo (arquivos distintos).
- Com times paralelos: após US1+US2 (ou mesmo só US1), US4/US5/US8 podem iniciar em paralelo; US3 e US6 são sequenciais entre si.

---

## Parallel Example: User Story 4 (Notas)

```bash
Task: "Implementar electron/notes-store.js em electron/notes-store.js"
Task: "Implementar NoteWidget em public/js/notes.js"
```

```bash
Task: "Implementar IPC de notas em electron/main.js"   # depende de notes-store concluído
Task: "Registrar fábrica note em public/js/main.js"    # depende de NoteWidget concluído
```

---

## Implementation Strategy

### MVP First (US1 apenas)
1. Fase 1 (Setup) → 2. Fase 2 (Foundational) → 3. Fase 3 (US1: sidebar/workspaces)
4. **STOP e VALIDE**: criar/editar/agrupar/alternar workspaces com migração de dados existentes
5. Demo possível já com workspaces funcionando

### Incremental Delivery
1. Setup + Foundational → fundação pronta (migração v3 + broadcast)
2. US1 (sidebar/workspaces) → testar → demo (MVP)
3. US2 (background) → testar → US3 (agentes/roles) → testar (resume na reativação)
4. US4 (notas) → testar
5. US5 (file tree) → testar → US9 (editor/busca) → testar
6. US6 (comunicação agentes) → US7 (estilos/feixes) → testar
7. US8 (produtividade canvas) → testar
8. US10 (temas/.maestri/Spotlight) → testar → Polish

Cada story agrega valor sem quebrar as anteriores; respeitar a ordem interna (main state → IPC → widget → validação manual).

---

## Notes

- [P] tasks = arquivos diferentes, sem dependências
- [Story] label mapeia a task para a user story (rastreabilidade com spec.md)
- Cada story é completável/testável de forma independente
- Não há tasks automatizadas de teste (validação manual por story — convenção do projeto)
- Commit após cada task ou grupo lógico
- Parar em qualquer checkpoint para validar a story isoladamente
- Evitar: tasks vagas, conflito no mesmo arquivo, dependências cruzadas que quebrem a independência
