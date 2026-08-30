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
    this.layout = this.loadLayout();
    this.broadcast = null;
  }

  setBroadcast(fn) {
    this.broadcast = fn;
  }

  loadLayout() {
    if (!this.STATE_FILE || !existsSync(this.STATE_FILE)) return [];
    try {
      const data = JSON.parse(readFileSync(this.STATE_FILE, "utf8"));
      return Array.isArray(data.terminals) ? data.terminals : [];
    } catch {
      return [];
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
    writeFileSync(this.STATE_FILE, JSON.stringify({ terminals }, null, 2));
  }

  create(layout = {}) {
    const id = randomUUID();
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

    proc.onData((data) => {
      if (this.broadcast) {
        this.broadcast({ type: "output", id, data });
      }
    });
    proc.onExit(({ exitCode }) => {
      this.terminals.delete(id);
      this.saveLayout();
      if (this.broadcast) {
        this.broadcast({ type: "exited", id, exitCode });
      }
    });

    this.terminals.set(id, term);
    this.saveLayout();
    return this.serialize(term);
  }

  restore() {
    const restored = this.layout.filter((l) => l.id);
    for (const layout of restored) {
      try {
        this.create(layout);
      } catch (e) {
        console.error("Falha ao restaurar terminal:", e.message);
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
