# Tasks: Workflows Multi-Nós, Device Portals e Conexões Universais

**Input**: Design documents from `specs/005-workflow-nodes-connections/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ipc-events.md, quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`[US1]`, `[US2]`, `[US3]`, `[US4]`)
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Infrastructure setup and environment preparation for multi-node portals and workflows

- [X] T001 [P] Configure webviewTag and security permissions in electron/main.js
- [X] T002 [P] Create and configure public/js/portals.js script inclusion in public/index.html

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core state model and shared registry prerequisites that MUST be complete before user story features

- [X] T003 Upgrade state persistence data model in electron/terminal-manager.js to support workflows ("Floors"), polymorphic nodes, and connections
- [X] T004 [P] Implement unified node registration and lifecycle management (app.nodes / app.widgets) in public/js/main.js
- [X] T005 [P] Setup base CSS styling for spatial portal cards, phone frames, and connection ports in public/styles.css

**Checkpoint**: Foundation ready - user story implementation can now proceed.

---

## Phase 3: User Story 1 - Correção da Seleção de Texto e Cópia no Terminal (Priority: P1) 🎯 MVP

**Goal**: Permitir seleção matemática precisa com o mouse (sem pular linhas em qualquer nível de zoom do canvas) e cópia confiável via teclado e clique direito para o clipboard do sistema operacional.

**Independent Test**: Abrir o terminal com texto longo, navegar com zoom (50%, 100%, 150%), arrastar o mouse sobre trechos específicos e verificar que a seleção acompanha o cursor com exatidão; copiar via Cmd+C / Ctrl+C / botão direito e colar em editor externo.

### Implementation for User Story 1

- [X] T006 [US1] Fix mouse coordinate zoom compensation in mouseService.getCoords in public/js/terminal.js
- [X] T007 [US1] Override and fix SelectionService._getMouseEventScrollAmount to prevent erratic autoscroll during zoom in public/js/terminal.js
- [X] T008 [US1] Implement native clipboard copy handling (Cmd+C, Ctrl+C, contextmenu) with SIGINT fallback when unselected in public/js/terminal.js
- [X] T009 [US1] Update global copy event listener in public/js/main.js to reliably sync active terminal selection to clipboard

**Checkpoint**: User Story 1 completa e testável de forma 100% independente (MVP funcional!).

---

## Phase 4: User Story 2 - Device Portals e Nós de Tela no Canvas Espacial (Priority: P1)

**Goal**: Adicionar portais de tela interativos ao board espacial (Web Portal com barra de URL, Device Portal com moldura de smartphone Pixel/iPhone e Editor com integração ao VS Code) que se comportam e coexistem com os terminais.

**Independent Test**: Adicionar um Web Portal, um Device Portal e um nó de Editor no canvas, navegar com pan/zoom, reposicionar, redimensionar e interagir diretamente com o conteúdo de cada um.

### Implementation for User Story 2

- [X] T010 [P] [US2] Implement WebPortalWidget class with URL navigation, reload, and webview container in public/js/portals.js
- [X] T011 [P] [US2] Implement DevicePortalWidget class with smartphone frame (Pixel 9 / iPhone) and mobile viewport in public/js/portals.js
- [X] T012 [P] [US2] Implement EditorWidget class with project path display and VS Code launcher in public/js/portals.js
- [X] T013 [US2] Add toolbar buttons (+ Terminal, + Web Portal, + Device Portal, + Editor) in public/index.html
- [X] T014 [US2] Implement node instantiation, dragging, resizing, and IPC dispatching for new portal types in public/js/main.js
- [X] T015 [US2] Add VS Code external workspace launcher IPC handler in electron/main.js

**Checkpoint**: User Stories 1 e 2 funcionais e testáveis no canvas.

---

## Phase 5: User Story 3 - Conexões Universais entre Terminais e Portais de Tela ("Bolinhas") (Priority: P2)

**Goal**: Permitir traçar conexões a partir das bolinhas de ancoragem de terminais para qualquer tela no board (emuladores Android, páginas web, outros nós), com curvas bezier suaves, animação de pulso e propagação contextual de eventos.

**Independent Test**: Clicar na bolinha de um terminal e arrastar até a bolinha de um Device Portal ou Web Portal; mover os nós e confirmar que as curvas acompanham a posição; acionar comando no terminal e verificar pulso animado na linha.

### Implementation for User Story 3

- [X] T016 [US3] Add connection anchor ports (.conn-port-left, .conn-port-right) to all portal card templates in public/js/portals.js
- [X] T017 [US3] Generalize node hit detection and anchor point calculation for any node type in public/js/connections.js
- [X] T018 [US3] Implement dynamic bezier curve recalculation and pulse animations between terminals and portals in public/js/connections.js
- [X] T019 [US3] Wire terminal URL detection (localhost / http) to notify connected web and device portals in public/js/terminal.js

**Checkpoint**: Conexões universais operacionais entre qualquer tipo de nó.

---

## Phase 6: User Story 4 - Gerenciamento de Múltiplos Workflows ("Floors") (Priority: P2)

**Goal**: Fornecer criação, alternância, renomeação e persistência de múltiplos Workflows ("Floors") na barra superior, salvando a disposição de nós e conexões de cada ambiente em state.json.

**Independent Test**: Criar um workflow "Frontend" e um workflow "Mobile", alternar entre eles pelo seletor, verificar a transição limpa dos nós e reiniciar o aplicativo para checar a restauração fiel do estado.

### Implementation for User Story 4

- [X] T020 [US4] Add "Floors" dropdown selector and workflow management controls (new, rename, delete) to toolbar in public/index.html
- [X] T021 [US4] Implement workflow CRUD and switching logic in electron/terminal-manager.js
- [X] T022 [US4] Add IPC handlers for workflow switching, creation, and deletion in electron/main.js
- [X] T023 [US4] Implement canvas switching transition, node clearing, and restoration in public/js/main.js

**Checkpoint**: Múltiplos workflows independentes funcionando com persistência.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Refinamento visual, validação de integridade e testes finais

- [X] T024 [P] Style refinements for smartphone frames, active focus rings, and dark/light contrast in public/styles.css
- [X] T025 Verify syntax of all modified JavaScript files using node -c
- [X] T026 Run manual validation following quickstart.md and verify all acceptance scenarios

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências - concluído.
- **Foundational (Phase 2)**: Concluído.
- **User Stories (Phases 3 to 6)**: Concluído.
- **Polish (Phase 7)**: Concluído.

### Parallel Opportunities

- T001 e T002 executadas em paralelo.
- T004 e T005 executadas em paralelo após T003.
- T010, T011 e T012 desenvolvidas em paralelo.
- T024 executada em paralelo com T025.

---

## Implementation Strategy

### MVP First (User Story 1) - Concluído com Sucesso
### Entrega Incremental (US2, US3, US4 e Polish) - Concluído com Sucesso
