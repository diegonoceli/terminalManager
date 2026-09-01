# Tasks: Drag & Drop Path Insertion, Clickable Links & Paste

**Input**: Design documents from `/specs/003-terminal-drag-drop/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Visual styles and global window drag protection

- [x] T001 Add `.drag-over` terminal drop-target glow styles in `public/styles.css`
- [x] T002 Add global `dragover` and `drop` default prevention on `window` in `public/js/main.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core IPC handler in Electron main process for opening external links

- [x] T003 [P] Implement `open_external` IPC handler with `shell.openExternal` in `electron/main.js`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Arrastar e Soltar Arquivos e Pastas no Terminal (Priority: P1) 🎯 MVP

**Goal**: Permitir arrastar pastas e arquivos do Windows Explorer ou Finder e soltá-los no terminal com aspas automáticas para caminhos com espaços.

**Independent Test**: Arrastar pasta com espaços do explorer para o terminal e verificar o caminho entre aspas inserido no prompt.

### Implementation for User Story 1

- [x] T004 [US1] Add `dragenter`, `dragover`, `dragleave`, and `drop` event listeners on terminal widget in `public/js/terminal.js`
- [x] T005 [US1] Implement path extraction from `e.dataTransfer.files`, space-quoting formatting, and PTY injection via `this.app.sendInput` in `public/js/terminal.js`

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Links Clicáveis no Terminal (Priority: P1)

**Goal**: Detectar URLs (web e localhost) na saída do terminal e abrir no navegador padrão ao clicar.

**Independent Test**: Imprimir `http://localhost:3000` no terminal, clicar no link e verificar abertura no navegador padrão do SO.

### Implementation for User Story 2

- [x] T006 [US2] Register link provider/matcher in `xterm.js` in `public/js/terminal.js` to detect URLs and dispatch `open_external` IPC message

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Colar via Teclado e Botão Direito (Priority: P1)

**Goal**: Garantir que atalhos de colar (`Ctrl+V`, `Cmd+V`) e clique com botão direito colem texto da área de transferência com segurança.

**Independent Test**: Copiar texto, clicar com botão direito ou pressionar `Ctrl+V`/`Cmd+V` no terminal e verificar a colagem.

### Implementation for User Story 3

- [x] T007 [US3] Add `paste` and `contextmenu` (right click) handlers on `this.termHost` in `public/js/terminal.js` using `navigator.clipboard.readText`
- [x] T008 [US3] Ensure keyboard shortcuts (`Ctrl+V` no Windows/Linux e `Cmd+V` no macOS) trigger clipboard paste in `public/js/terminal.js`

**Checkpoint**: All P1 user stories should now be independently functional

---

## Phase 6: User Story 4 - Feedback Visual durante o Arraste (Priority: P2)

**Goal**: Exibir contorno e efeito luminoso no terminal quando um arquivo/pasta for arrastado sobre ele.

**Independent Test**: Arrastar arquivo sobre o terminal e verificar a ativação e remoção suave da classe `.drag-over`.

### Implementation for User Story 4

- [x] T009 [US4] Manage `.drag-over` CSS class toggling during `dragenter`, `dragleave`, and `drop` in `public/js/terminal.js`

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Validation and cross-platform checks

- [x] T010 Run quickstart.md validation for Windows/macOS path escaping, link clicks, and clipboard pasting

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Can start immediately (parallel with Setup)
- **User Stories (Phase 3+)**: Depend on Setup & Foundational
- **Polish (Final Phase)**: Depends on all user stories being complete

### Parallel Opportunities

- T001 (CSS) and T003 (Electron main) can be worked on in parallel.
- US1 (Drag Drop), US2 (Links), and US3 (Paste) touch modular sections of `terminal.js`.
