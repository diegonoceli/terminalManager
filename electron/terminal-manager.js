import * as pty from "node-pty";
import { randomUUID } from "node:crypto";
import os from "node:os";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export const DEFAULT_STYLE = {
  bg: "#121212",
  fg: "#e6e6e6",
  cursor: "#ececec",
  cursorAccent: "#121212",
  titlebar: "#f0f0ee",
  titlebarText: "#1f1f1e",
  selBg: "#264f78",
  selFg: "#ffffff",
  fontSize: 13,
  titleSize: 12.5,
};

export class TerminalManager {
  constructor({ stateFile }) {
    this.STATE_FILE = stateFile;
    this.terminals = new Map();
    this.connections = new Map();
    const saved = this.loadLayout();
    this.savedTerminals = saved.terminals || [];
    this.savedConnections = saved.connections || [];
    this.broadcast = null;
    this.notifyCallback = null;
    this.lastNotifyTimes = new Map();
  }

  setBroadcast(fn) {
    this.broadcast = fn;
  }

  setNotify(fn) {
    this.notifyCallback = fn;
  }

  sendNotification(terminalId, title, body) {
    const now = Date.now();
    const last = this.lastNotifyTimes.get(terminalId) || 0;
    if (now - last < 2000) return; // Debounce 2s per terminal
    this.lastNotifyTimes.set(terminalId, now);

    if (this.notifyCallback) {
      this.notifyCallback({ id: terminalId, title, body });
    }
  }

  loadLayout() {
    if (!this.STATE_FILE || !existsSync(this.STATE_FILE)) return { terminals: [], connections: [] };
    try {
      const data = JSON.parse(readFileSync(this.STATE_FILE, "utf8"));
      return {
        terminals: Array.isArray(data.terminals) ? data.terminals : [],
        connections: Array.isArray(data.connections) ? data.connections : [],
      };
    } catch {
      return { terminals: [], connections: [] };
    }
  }

  saveLayout() {
    if (!this.STATE_FILE) return;
    mkdirSync(dirname(this.STATE_FILE), { recursive: true });
    const terminals = [...this.terminals.values()].map((t) => ({
      id: t.id,
      title: t.title,
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      cols: t.cols,
      rows: t.rows,
      style: t.style,
    }));
    const connections = [...this.connections.values()];
    writeFileSync(this.STATE_FILE, JSON.stringify({ terminals, connections }, null, 2));
  }

  create(layout = {}) {
    const id = layout.id || randomUUID();
    const title = layout.title || `Terminal ${this.terminals.size + 1}`;
    const x = layout.x ?? 80;
    const y = layout.y ?? 80;
    const width = layout.width ?? 720;
    const height = layout.height ?? 400;
    const style = { ...DEFAULT_STYLE, ...(layout.style || {}) };

    const isWindows = process.platform === "win32";
    const shell = isWindows
      ? process.env.ComSpec || "powershell.exe"
      : process.env.SHELL || "/bin/zsh";
    const cwd = isWindows
      ? process.env.USERPROFILE || os.homedir()
      : process.env.HOME || os.homedir();
    const env = { ...process.env };
    env.TERM = "xterm-256color";

    let cols = 80;
    let rows = 24;
    const proc = pty.spawn(shell, [], {
      name: "xterm-256color",
      cols,
      rows,
      cwd,
      env,
    });

    const term = {
      id,
      title,
      x,
      y,
      width,
      height,
      cols,
      rows,
      style,
      proc,
    };

    let bufferAccumulator = "";
    proc.onData((data) => {
      if (this.broadcast) {
        this.broadcast({ type: "output", id, data });
      }

      // Check for prompt or completion patterns requiring approval/input
      bufferAccumulator = (bufferAccumulator + data).slice(-500);
      const lower = bufferAccumulator.toLowerCase();
      if (
        lower.includes("[y/n]") ||
        lower.includes("(y/n)") ||
        lower.includes("approve?") ||
        lower.includes("allow [y/n]") ||
        lower.includes("press enter to continue") ||
        lower.includes("password:")
      ) {
        this.sendNotification(id, title, "Comando aguardando aprovação/interação.");
        bufferAccumulator = "";
      }
    });

    proc.onExit(({ exitCode }) => {
      this.terminals.delete(id);
      this.removeTerminalConnections(id);
      this.saveLayout();
      if (this.broadcast) {
        this.broadcast({ type: "exited", id, exitCode });
      }
      this.sendNotification(
        id,
        title,
        exitCode === 0 ? "Processo finalizado com sucesso." : `Processo finalizado com código ${exitCode}.`
      );
    });

    this.terminals.set(id, term);
    this.saveLayout();
    return this.serialize(term);
  }

  restore() {
    const restored = this.savedTerminals.filter((l) => l.id);
    for (const layout of restored) {
      try {
        this.create(layout);
      } catch (e) {
        console.error("Falha ao restaurar terminal:", e.message);
      }
    }
    // Restore connections
    for (const conn of this.savedConnections) {
      if (conn.id && conn.from && conn.to) {
        this.connections.set(conn.id, conn);
      }
    }
  }

  serialize(t) {
    return {
      id: t.id,
      title: t.title,
      x: t.x,
      y: t.y,
      width: t.width,
      height: t.height,
      cols: t.cols,
      rows: t.rows,
      style: t.style,
    };
  }

  setStyle(id, style) {
    const t = this.terminals.get(id);
    if (!t) return false;
    t.style = { ...DEFAULT_STYLE, ...t.style, ...style };
    this.saveLayout();
    return t.style;
  }

  list() {
    return [...this.terminals.values()].map((t) => this.serialize(t));
  }

  listConnections() {
    return [...this.connections.values()];
  }

  addConnection({ from, to, label = "" }) {
    if (!from || !to || from === to) return null;
    // Check if already exists
    for (const conn of this.connections.values()) {
      if (conn.from === from && conn.to === to) return conn;
    }
    const id = `conn_${randomUUID().slice(0, 8)}`;
    const conn = { id, from, to, label };
    this.connections.set(id, conn);
    this.saveLayout();
    return conn;
  }

  removeConnection(id) {
    const removed = this.connections.delete(id);
    if (removed) this.saveLayout();
    return removed;
  }

  removeTerminalConnections(terminalId) {
    let changed = false;
    for (const [cid, conn] of this.connections.entries()) {
      if (conn.from === terminalId || conn.to === terminalId) {
        this.connections.delete(cid);
        changed = true;
        if (this.broadcast) {
          this.broadcast({ type: "connection_removed", id: cid });
        }
      }
    }
    if (changed) this.saveLayout();
  }

  get(id) {
    return this.terminals.get(id);
  }

  input(id, data) {
    const t = this.terminals.get(id);
    if (!t) return false;
    t.proc.write(data);
    return true;
  }

  resize(id, cols, rows, width, height) {
    const t = this.terminals.get(id);
    if (!t) return false;
    cols = Math.max(2, Math.round(cols));
    rows = Math.max(1, Math.round(rows));
    t.cols = cols;
    t.rows = rows;
    t.width = width;
    t.height = height;
    try {
      t.proc.resize(cols, rows);
    } catch {}
    this.saveLayout();
    return true;
  }

  move(id, x, y) {
    const t = this.terminals.get(id);
    if (!t) return false;
    t.x = x;
    t.y = y;
    this.saveLayout();
    return true;
  }

  rename(id, title) {
    const t = this.terminals.get(id);
    if (!t) return false;
    t.title = title || t.title;
    this.saveLayout();
    return this.serialize(t);
  }

  kill(id) {
    const t = this.terminals.get(id);
    if (!t) return false;
    try {
      t.proc.kill();
    } catch {}
    return true;
  }
}
