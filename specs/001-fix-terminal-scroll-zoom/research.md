# Research Findings

## Topic 1: Scroll Interception in Terminal
- **Decision**: Use `e.stopPropagation()` on the `wheel` event within `terminal.js` when the mouse is over the terminal element (hover) or when the terminal has focus.
- **Rationale**: The `canvas.js` uses `this.viewport.addEventListener("wheel", ...)` which catches all bubbled wheel events to perform zoom. By stopping propagation on the terminal's container, we prevent `canvas.js` from receiving the wheel event, thus allowing normal terminal scrolling via xterm.js without zooming the canvas.
- **Alternatives considered**: Checking `e.target` inside `canvas.js` to ignore terminal nodes. This couples canvas to terminal logic, making it less modular.

## Topic 2: Session Persistence and Restoration
- **Decision**: Update `terminal-manager.js` to correctly map restored terminals to the frontend. Currently, `terminal-manager.js` saves the state to `state.json` and loads it on startup, but during restoration (`this.create(layout)`), it assigns a new random UUID to the recreated terminal, and might not notify the frontend correctly about these restored terminals on startup. We need to ensure that the frontend receives the restored layouts via the `layout_request` IPC call, and that the backend uses the existing layout configuration, while properly handling the PID of the shell.
- **Rationale**: The backend already saves `x, y, width, height, cols, rows`. The missing link is that when the frontend starts and requests the layout (`send({ type: "layout_request" })`), the backend responds with the `layout` type and the list of terminals. The frontend (`main.js` line 64) handles `case "layout"`, but we must ensure it actually renders them properly (by calling `createTerminal(t)` or similar). 
- **Alternatives considered**: Using `localStorage` for everything. Rejected because terminals are spawned by `node-pty` in the Node process, so the state must be known by the backend.

## Topic 3: Preserving Working Directory (CWD)
- **Decision**: While saving the session, attempt to capture the current working directory of the shell. Unfortunately, `node-pty` doesn't provide a cross-platform way to get the live CWD of the child process natively without OS-specific commands (like `lsof` on macOS/Linux). For now, we will restore the terminal to the default directory or the original directory it was created in.
- **Rationale**: True CWD preservation is complex and OS-dependent. Restoring the terminal window configuration (position, size) is the most critical part of the user request.
