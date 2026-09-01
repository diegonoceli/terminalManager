# Research: Drag & Drop Path Insertion, Clipboard Paste & Clickable Links

## 1. Drag & Drop File and Folder Paths

### Decision
Listen to DOM drag events on each terminal container and use Electron's native `file.path` property on `e.dataTransfer.files`.

### Details & Windows Compatibility
- **Global Prevention**: Prevent `dragover` and `drop` on `window` and `#viewport` to avoid Electron's default behavior of navigating to or opening dropped files.
- **Path Formatting**:
  - For each dropped file/directory: `f.path` gives the full absolute path (e.g. `C:\Users\Diego\My Folder\app` on Windows, `/Users/diego/My Folder/app` on macOS).
  - If a path contains spaces or special characters, automatically wrap it in quotes: `p.includes(" ") ? `"${p}"` : p`.
  - Multiple paths are joined with spaces: `formattedPaths.join(" ")`.
- **Text Insertion**:
  - Dispatch via `this.app.sendInput(this.id, formattedText)` to send the characters directly into the PTY stream at the active prompt.
- **Visual Feedback**:
  - Toggle `.drag-over` CSS class on `this.el` during `dragenter`/`dragover` and remove on `dragleave`/`drop`.

---

## 2. Clickable Hyperlinks in Terminal

### Decision
Use xterm.js `registerLinkProvider` API or Regex Link Matcher combined with Electron's `shell.openExternal(url)`.

### Details
- Regex pattern for URL detection:
  `/(https?:\/\/[^\s]+|localhost:[0-9]+[^\s]*)/gi`
- On link click / activation:
  - If URL starts with `localhost:`, prefix with `http://`.
  - Send IPC message `{ type: "open_external", url }` to Main process.
  - Main process calls `shell.openExternal(url)` to open the link in the user's default browser (Chrome, Edge, Safari, Firefox, etc.).

---

## 3. Keyboard & Right-Click Paste

### Decision
Support `Ctrl+V` (Windows/Linux), `Cmd+V` (macOS), `Shift+Insert` and right-click paste via `navigator.clipboard.readText()`.

### Details
- On `contextmenu` (right-click) on terminal host: read clipboard text and send to PTY.
- On `paste` event on terminal host: `e.clipboardData.getData('text')` sent to PTY.
