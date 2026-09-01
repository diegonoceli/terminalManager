# Implementation Plan: Fix Terminal Scroll Zoom & Session Save

**Branch**: `001-fix-terminal-scroll-zoom` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-fix-terminal-scroll-zoom/spec.md`

## Summary

1. Stop mouse wheel scrolling from triggering canvas zoom when the terminal is focused or hovered.
2. Implement correct persistence and restoration of terminal sessions (saving their IDs, sizes, positions, and current working directories if possible) so they are preserved across app restarts.

## Technical Context

**Language/Version**: JavaScript (Node.js for main process, Vanilla JS for renderer)

**Primary Dependencies**: Electron, node-pty

**Storage**: Local JSON file (`state.json` via `writeFileSync`) and potentially `localStorage` for frontend preferences

**Testing**: Manual testing / No test suite identified

**Target Platform**: Desktop App (macOS/Windows/Linux) via Electron

**Project Type**: Desktop Application (Electron)

**Performance Goals**: N/A (Standard desktop responsiveness)

**Constraints**: Must run locally, interact with OS shell.

**Scale/Scope**: Local user instance.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No specific gates from constitution. Pass.

## Project Structure

### Documentation (this feature)

```text
specs/001-fix-terminal-scroll-zoom/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
```

### Source Code (repository root)

```text
electron/
├── main.js
└── terminal-manager.js

public/
└── js/
    ├── main.js
    ├── canvas.js
    └── terminal.js
```

**Structure Decision**: The project is a standard Electron app separated into main process (`electron/`) and renderer process (`public/`).
