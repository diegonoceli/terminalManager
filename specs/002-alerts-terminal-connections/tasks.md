# Tasks: Notifications & Terminal Canvas Connections

**Input**: Design documents from `/specs/002-alerts-terminal-connections/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Base SVG layer container and style definitions for connections and notifications

- [x] T001 Add SVG connections container in `public/index.html` and define connection line, marker, and pulse styles in `public/styles.css`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core data structures in `terminal-manager.js` for storing and restoring connections

- [x] T002 Add connections state persistence (`loadLayout`, `saveLayout`, `addConnection`, `removeConnection`) in `electron/terminal-manager.js`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Notificações Nativas no macOS e Windows (Priority: P1) 🎯 MVP

**Goal**: Disparar notificações nativas do SO (Windows e macOS) quando comandos terminarem ou exigirem aprovação, e focalizar o terminal ao clicar.

**Independent Test**: Executar comando em segundo plano, verificar surgimento da notificação nativa do SO e clique centralizando o terminal no canvas.

### Implementation for User Story 1

- [x] T003 [US1] Implement native Electron `Notification` dispatcher and window focusing in `electron/main.js`
- [x] T004 [US1] Add process exit monitoring and prompt/approval pattern detection in `electron/terminal-manager.js` to emit notifications
- [x] T005 [US1] Handle `focus_terminal` event in `public/js/main.js` to select and center the target terminal widget on the canvas

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Linhas de Conexão Visuais entre Terminais no Canvas (Priority: P1)

**Goal**: Renderizar curvas de Bézier dinâmicas no SVG do canvas interligando terminais e animando pulsos de atividade.

**Independent Test**: Definir conexões entre dois terminais e verificar que as curvas acompanham movimentação, resize e zoom com animação de fluxo.

### Implementation for User Story 2

- [x] T006 [P] [US2] Create `public/js/connections.js` with cubic Bézier curve calculation, SVG path rendering, and pulse flow animations
- [x] T007 [US2] Integrate `ConnectionsManager` with `public/js/canvas.js` and `public/js/main.js` to redraw lines on terminal move/resize/zoom
- [x] T008 [US2] Add visual activity pulse trigger on connectors in `public/js/connections.js` when terminal output or communications occur

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Criação e Gerenciamento Interativo de Conexões (Priority: P2)

**Goal**: Permitir ao usuário arrastar pontos de conexão entre terminais para criar e remover links visuais persistentes.

**Independent Test**: Arrastar do ponto de conexão de um terminal até outro para criar uma linha, fechar e reabrir o app e confirmar persistência.

### Implementation for User Story 3

- [x] T009 [US3] Add connector port handles on terminal headers in `public/js/terminal.js` and drag-to-connect interaction in `public/js/connections.js`
- [x] T010 [US3] Implement IPC handlers for `create_connection` and `remove_connection` in `electron/main.js` and `public/js/main.js` to persist in `state.json`

**Checkpoint**: All user stories should now be independently functional

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Validation and aesthetic polish

- [x] T011 Run quickstart.md validation, fine-tune connector Bézier tensions and notification debounce thresholds

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS US2 & US3
- **User Stories (Phase 3+)**:
  - US1 (Notifications): Can start after Phase 1/2
  - US2 (Visual Lines): Depends on Phase 1 & 2
  - US3 (Interactive Connections): Depends on US2 completion
- **Polish (Final Phase)**: Depends on all user stories being complete

### Parallel Opportunities

- T003 (US1 Notifications) and T006 (US2 Visual Connections) can be implemented in parallel.
