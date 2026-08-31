# Research: Notifications & Visual Canvas Connections

## 1. Native Desktop Notifications (macOS & Windows)

### Decision
Use Electron's native `Notification` API in the Main process (`electron/main.js` / `electron/notification-manager.js`) combined with terminal activity/exit monitoring in `electron/terminal-manager.js`.

### Rationale
- Electron provides first-class native OS notification integration for both macOS Notification Center and Windows Action Center.
- Trigger points:
  1. **Process Exit / Completion**: When a process completes (`proc.onExit` with status code 0 or error).
  2. **Approval / Prompt Detection**: Monitoring terminal output chunks for common approval/prompt patterns (e.g. `(y/n)`, `[Y/n]`, `approve`, `allow [y/n]`, or custom agent signals).
  3. **Explicit Agent Notification Event**: An IPC message `notify` that allows scripts or CLI tools to request attention.
- Clicking the notification invokes `window.show()`, `window.focus()` and sends an IPC event `{ type: "select_terminal", id }` to smoothly focus and center the terminal on the canvas.

---

## 2. Spatial Visual Connections on the Canvas

### Decision
Embed an `<svg class="connections-layer">` element directly inside `this.world` within `public/js/canvas.js`.

### Rationale
- Since `this.world` already receives CSS transforms (`translate(tx, ty) scale(zoom)`), placing an SVG container directly inside `this.world` means all connector curves can be drawn in pure world coordinates $(wx, wy)$ without requiring manual zoom/pan matrix multiplications on every frame.
- Line styling:
  - Smooth cubic Bézier curves between source anchor (e.g. right/bottom of source terminal) and target anchor (left/top of target terminal).
  - SVG markers for directional arrows.
  - CSS animations (`stroke-dashoffset`, glowing filters, particle pulses) along SVG paths to visualize live communication when output/input flows between connected terminals.
- Interactive connection creation:
  - Add connection port dots on terminal headers/corners.
  - Dragging from a port creates a live preview line; dropping on another terminal establishes the connection.

---

## 3. Persistence of Connections

### Decision
Store `connections` array in `state.json` managed by `electron/terminal-manager.js` and synced to the renderer via the `"layout"` message.

### Schema
```json
{
  "connections": [
    {
      "id": "uuid",
      "from": "terminal-id-1",
      "to": "terminal-id-2",
      "label": "Agent Comms",
      "active": false
    }
  ]
}
```
