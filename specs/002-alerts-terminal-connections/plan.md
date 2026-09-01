# Implementation Plan: Notifications & Terminal Canvas Connections

**Branch**: `002-alerts-terminal-connections` | **Date**: 2026-08-31 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-alerts-terminal-connections/spec.md`

## Summary

Implement native OS notifications (macOS and Windows) when terminal tasks finish or require user input, and build an interactive spatial connection system (SVG-based Bézier curves on canvas with flow animations) linking collaborative terminals.

## Technical Context

**Language/Version**: JavaScript (ES Modules, Node.js + Electron in main process, Vanilla JS + SVG in renderer)

**Primary Dependencies**: Electron (`Notification`, `BrowserWindow`, `ipcMain`), `node-pty`, `xterm.js`

**Storage**: Local `state.json` (stores both `terminals` and `connections`)

**Testing**: Manual testing across notification triggers and canvas interactions

**Target Platform**: macOS and Windows (via Electron desktop wrapper)

**Project Type**: Desktop Application

**Performance Goals**: 60 FPS connection rendering during canvas panning/zooming; <500ms notification dispatch latency

**Constraints**: Seamless SVG overlay rendering in world coordinates without canvas stutter

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

No constitutional gate violations detected. Project remains modular and aligned with Electron/DOM standards.

## Project Structure

### Documentation (this feature)

```text
specs/002-alerts-terminal-connections/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── ipc.md           # IPC message contracts for notifications & connections
└── tasks.md             # Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
electron/
├── main.js                 # Notification handlers and window focus logic
└── terminal-manager.js     # Task completion detection, connection persistence in state.json

public/
├── index.html              # SVG connection layer container
├── styles.css              # Connection line styles, port handles, and animated pulses
└── js/
    ├── canvas.js           # SVG layer management & world transform coordinates
    ├── connections.js      # Line drawing, Bézier curve math, drag-to-connect interaction
    ├── main.js             # IPC handling for connections and notification focuses
    └── terminal.js         # Connection ports and notification triggers
```

**Structure Decision**: Add `connections.js` to manage SVG connector lifecycles in the renderer, and update `terminal-manager.js` and `main.js` to support connection persistence and OS notifications.
