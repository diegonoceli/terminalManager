# Implementation Plan: Drag & Drop Path Insertion, Clickable Links & Paste

**Branch**: `003-terminal-drag-drop` | **Date**: 2026-09-01 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-terminal-drag-drop/spec.md`

## Summary

Implement robust drag-and-drop file and directory path insertion into terminals (with automatic Windows/macOS path quoting for spaces), clickable web/localhost links opening in default browser, and reliable clipboard paste across all operating systems.

## Technical Context

**Language/Version**: JavaScript (ES Modules, Node.js + Electron in main process, Vanilla JS + xterm.js in renderer)

**Primary Dependencies**: Electron (`shell.openExternal`, `ipcMain`), `xterm.js`, `node-pty`

**Storage**: N/A (State unaffected)

**Testing**: Manual testing across Windows file drag-drop, link clicks, and clipboard shortcuts

**Target Platform**: macOS and Windows (via Electron desktop wrapper)

**Project Type**: Desktop Application

**Performance Goals**: <50ms path insertion upon drop; zero delay on link opening

**Constraints**: Must prevent Electron from opening/navigating dropped files globally

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No constitutional gate violations detected. Changes are isolated to terminal event listeners, xterm link providers, and Electron shell open handlers.

## Project Structure

### Documentation (this feature)

```text
specs/003-terminal-drag-drop/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── ipc.md           # IPC message contracts for external URL opening
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
electron/
└── main.js             # IPC handler for 'open_external' using shell.openExternal

public/
├── styles.css          # .drag-over visual glow styles for terminals
└── js/
    ├── terminal.js     # Drag-drop event listeners, path formatting, link matcher, and paste handlers
    └── main.js         # Global drag prevention & open_external sender
```

**Structure Decision**: Enhance `terminal.js` with drag-drop, paste and link handlers, and add `open_external` handling in `main.js` and `electron/main.js`.
