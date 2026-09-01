# Tasks: Fix Terminal Scroll Zoom & Session Save

**Input**: Design documents from `/specs/001-fix-terminal-scroll-zoom/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Verify project runs and basic development environment in repository root

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

*(No foundational tasks required for this bug fix / feature addition)*

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Rolagem no Terminal Focado (Priority: P1) 🎯 MVP

**Goal**: Evitar que a rolagem do mouse altere o zoom do canvas quando o terminal está selecionado.

**Independent Test**: Selecionar o terminal e rolar o scroll do mouse para baixo. O conteúdo do terminal deve rolar sem que o zoom do canvas se altere.

### Implementation for User Story 1

- [x] T002 [US1] Add `wheel` event listener to terminal container in `public/js/terminal.js` that calls `e.stopPropagation()` if the terminal has focus (`this.focused`).

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Rolagem no Terminal com Mouse Sobreposto (Priority: P1)

**Goal**: Evitar que a rolagem do mouse altere o zoom do canvas quando o cursor estiver sobre o terminal.

**Independent Test**: Passar o mouse sobre um terminal não focado e rolar o scroll para baixo. O conteúdo deve rolar sem alterar o zoom.

### Implementation for User Story 2

- [x] T003 [US2] Update the `wheel` event listener in `public/js/terminal.js` to also call `e.stopPropagation()` when the mouse is hovering over the terminal element (using `mouseenter`/`mouseleave` flags or `this.container.contains(e.target)`).

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Persistência de Sessão dos Terminais (Priority: P1)

**Goal**: Salvar a sessão dos terminais para que eles sejam restaurados ao reabrir a aplicação.

**Independent Test**: Abrir terminais, fechar a aplicação e abri-la novamente. Os terminais devem ser restaurados nas posições corretas.

### Implementation for User Story 3

- [x] T004 [P] [US3] Update `create()` in `electron/terminal-manager.js` to use `layout.id` if provided, instead of always generating a new UUID.
- [x] T005 [P] [US3] Handle `"layout"` message in `public/js/main.js` inside `handleMessage` by iterating `msg.terminals` and invoking UI creation (`createTerminal(t)` or equivalent logic) when the app starts.
- [x] T006 [US3] Ensure `createTerminal` in `public/js/main.js` correctly maps `x`, `y`, `width`, `height` from the layout object without overwriting them with default offset logic.

**Checkpoint**: All user stories should now be independently functional

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T007 Run quickstart.md validation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational
- **User Story 2 (P2)**: Can start after Foundational
- **User Story 3 (P3)**: Can start after Foundational. Independent of UI scroll logic.

### Parallel Opportunities

- Task T004 and T005 can be executed in parallel since they touch `terminal-manager.js` and `main.js` respectively, for the Session Persistence story.
- User Story 3 can be executed entirely in parallel to User Stories 1 and 2.
