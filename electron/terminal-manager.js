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
    this.nodes = new Map(); // Non-terminal nodes (web-portal, device-portal, code-editor)
    this.connections = new Map();
    this.workflows = new Map();
    this.activeWorkflowId = "wf_default";

    this.broadcast = null;
    this.notifyCallback = null;
    this.lastNotifyTimes = new Map();

    this.loadState();
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

  loadState() {
    if (!this.STATE_FILE || !existsSync(this.STATE_FILE)) {
      this._initDefaultWorkflow();
      return;
    }

    try {
      const data = JSON.parse(readFileSync(this.STATE_FILE, "utf8"));
      if (Array.isArray(data.workflows) && data.workflows.length > 0) {
        for (const wf of data.workflows) {
          this.workflows.set(wf.id, {
            id: wf.id,
            name: wf.name || "Floor",
            nodes: Array.isArray(wf.nodes) ? wf.nodes : [],
            connections: Array.isArray(wf.connections) ? wf.connections : [],
          });
        }
        this.activeWorkflowId = data.activeWorkflowId || data.workflows[0].id;
      } else {
        // Legacy migration: convert old terminals/connections into default workflow
        const legacyTerminals = (Array.isArray(data.terminals) ? data.terminals : []).map((t) => ({
          type: "terminal",
          ...t,
        }));
        const legacyConnections = Array.isArray(data.connections) ? data.connections : [];
        const defaultWf = {
          id: "wf_default",
          name: "Floor 1",
          nodes: legacyTerminals,
          connections: legacyConnections,
        };
        this.workflows.set(defaultWf.id, defaultWf);
        this.activeWorkflowId = defaultWf.id;
      }
    } catch (e) {
      console.error("Erro ao carregar state.json:", e.message);
      this._initDefaultWorkflow();
    }
  }

  _initDefaultWorkflow() {
    const defaultWf = {
      id: "wf_default",
      name: "Floor 1",
      nodes: [],
      connections: [],
    };
    this.workflows.set(defaultWf.id, defaultWf);
    this.activeWorkflowId = defaultWf.id;
  }

  saveLayout() {
    if (!this.STATE_FILE) return;
    try {
      mkdirSync(dirname(this.STATE_FILE), { recursive: true });

      // Synchronize active workflow state before saving
      const activeWf = this.workflows.get(this.activeWorkflowId);
      if (activeWf) {
        const terminalNodes = [...this.terminals.values()].map((t) => ({
          type: "terminal",
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
        const otherNodes = [...this.nodes.values()];
        activeWf.nodes = [...terminalNodes, ...otherNodes];
        activeWf.connections = [...this.connections.values()];
      }

      const workflowsList = [...this.workflows.values()];
      const payload = {
        version: 2,
        activeWorkflowId: this.activeWorkflowId,
        workflows: workflowsList,
      };

      writeFileSync(this.STATE_FILE, JSON.stringify(payload, null, 2));
    } catch (err) {
      console.error("Erro ao salvar state.json:", err.message);
    }
  }

  restore() {
    this.loadWorkflow(this.activeWorkflowId);
  }

  loadWorkflow(workflowId) {
    // Clear active processes and state
    for (const [id, t] of this.terminals) {
      try {
        t.proc.kill();
      } catch {}
    }
    this.terminals.clear();
    this.nodes.clear();
    this.connections.clear();

    let wf = this.workflows.get(workflowId);
    if (!wf) {
      wf = this.workflows.values().next().value;
      if (!wf) {
        this._initDefaultWorkflow();
        wf = this.workflows.get(this.activeWorkflowId);
      }
    }
    this.activeWorkflowId = wf.id;

    for (const node of wf.nodes || []) {
      if (node.type === "terminal" || !node.type) {
        try {
          this.create(node);
        } catch (e) {
          console.error("Falha ao restaurar terminal:", e.message);
        }
      } else {
        this.nodes.set(node.id, { ...node });
      }
    }

    for (const conn of wf.connections || []) {
      if (conn.id && conn.from && conn.to) {
        this.connections.set(conn.id, conn);
      }
    }
  }

  /* ---- Workflows ("Floors") CRUD ---- */
  listWorkflows() {
    return [...this.workflows.values()].map((w) => ({
      id: w.id,
      name: w.name,
      nodeCount: (w.nodes || []).length,
    }));
  }

  createWorkflow(name) {
    const id = `wf_${randomUUID().slice(0, 8)}`;
    const newWf = {
      id,
      name: name || `Floor ${this.workflows.size + 1}`,
      nodes: [],
      connections: [],
    };
    this.workflows.set(id, newWf);
    this.saveLayout();
    return newWf;
  }

  switchWorkflow(workflowId) {
    if (!this.workflows.has(workflowId)) return false;
    this.saveLayout(); // Persist current
    this.loadWorkflow(workflowId);
    this.saveLayout();
    return true;
  }

  renameWorkflow(workflowId, name) {
    const wf = this.workflows.get(workflowId);
    if (!wf) return false;
    wf.name = name || wf.name;
    this.saveLayout();
    return true;
  }

  deleteWorkflow(workflowId) {
    if (this.workflows.size <= 1) return false; // Prevent deleting last floor
    const deleted = this.workflows.delete(workflowId);
    if (deleted) {
      if (this.activeWorkflowId === workflowId) {
        const nextWf = this.workflows.values().next().value;
        this.loadWorkflow(nextWf.id);
      }
      this.saveLayout();
    }
    return deleted;
  }

  /* ---- Terminal Management ---- */
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

    let cols = layout.cols || 80;
    let rows = layout.rows || 24;
    const proc = pty.spawn(shell, [], {
      name: "xterm-256color",
      cols,
      rows,
      cwd,
      env,
    });

    const term = {
      type: "terminal",
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
      this.removeNodeConnections(id);
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

  serialize(t) {
    return {
      type: "terminal",
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

  /* ---- Spatial Nodes Management (Portals, Web, Devices, Editor) ---- */
  createNode(nodeData = {}) {
    const id = nodeData.id || `node_${randomUUID().slice(0, 8)}`;
    const type = nodeData.type || "web-portal";
    const title = nodeData.title || (type === "web-portal" ? "Web Portal" : type === "device-portal" ? "Pixel 9" : "Code Editor");
    const x = nodeData.x ?? 120;
    const y = nodeData.y ?? 120;
    const width = nodeData.width ?? (type === "device-portal" ? 380 : 700);
    const height = nodeData.height ?? (type === "device-portal" ? 740 : 450);

    const node = {
      ...nodeData,
      id,
      type,
      title,
      x,
      y,
      width,
      height,
    };

    this.nodes.set(id, node);
    this.saveLayout();
    return node;
  }

  listNodes() {
    const terminalList = [...this.terminals.values()].map((t) => this.serialize(t));
    const portalList = [...this.nodes.values()];
    return [...terminalList, ...portalList];
  }

  getNode(id) {
    return this.terminals.get(id) || this.nodes.get(id);
  }

  moveNode(id, x, y) {
    const term = this.terminals.get(id);
    if (term) {
      term.x = x;
      term.y = y;
      this.saveLayout();
      return true;
    }
    const node = this.nodes.get(id);
    if (node) {
      node.x = x;
      node.y = y;
      this.saveLayout();
      return true;
    }
    return false;
  }

  resizeNode(id, width, height, cols, rows) {
    const term = this.terminals.get(id);
    if (term) {
      if (cols) term.cols = Math.max(2, Math.round(cols));
      if (rows) term.rows = Math.max(1, Math.round(rows));
      term.width = width;
      term.height = height;
      try {
        term.proc.resize(term.cols, term.rows);
      } catch {}
      this.saveLayout();
      return true;
    }
    const node = this.nodes.get(id);
    if (node) {
      node.width = width;
      node.height = height;
      this.saveLayout();
      return true;
    }
    return false;
  }

  removeNode(id) {
    let removed = false;
    const term = this.terminals.get(id);
    if (term) {
      try {
        term.proc.kill();
      } catch {}
      this.terminals.delete(id);
      removed = true;
    }
    if (this.nodes.has(id)) {
      this.nodes.delete(id);
      removed = true;
    }
    if (removed) {
      this.removeNodeConnections(id);
      this.saveLayout();
    }
    return removed;
  }

  updateNodeConfig(id, config = {}) {
    const node = this.nodes.get(id);
    if (!node) return null;
    Object.assign(node, config);
    this.saveLayout();
    return node;
  }

  /* ---- Universal Connections ---- */
  listConnections() {
    return [...this.connections.values()];
  }

  addConnection({ from, to, label = "" }) {
    if (!from || !to || from === to) return null;
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

  removeNodeConnections(nodeId) {
    let changed = false;
    for (const [cid, conn] of this.connections.entries()) {
      if (conn.from === nodeId || conn.to === nodeId) {
        this.connections.delete(cid);
        changed = true;
        if (this.broadcast) {
          this.broadcast({ type: "connection_removed", id: cid });
        }
      }
    }
    if (changed) this.saveLayout();
  }

  /* ---- Terminal helpers for compatibility ---- */
  list() {
    return [...this.terminals.values()].map((t) => this.serialize(t));
  }

  get(id) {
    return this.terminals.get(id);
  }

  setStyle(id, style) {
    const t = this.terminals.get(id);
    if (!t) return false;
    t.style = { ...DEFAULT_STYLE, ...t.style, ...style };
    this.saveLayout();
    return t.style;
  }

  input(id, data) {
    const t = this.terminals.get(id);
    if (!t) return false;
    t.proc.write(data);
    return true;
  }

  resize(id, cols, rows, width, height) {
    return this.resizeNode(id, width, height, cols, rows);
  }

  move(id, x, y) {
    return this.moveNode(id, x, y);
  }

  rename(id, title) {
    const t = this.terminals.get(id);
    if (t) {
      t.title = title || t.title;
      this.saveLayout();
      return this.serialize(t);
    }
    const node = this.nodes.get(id);
    if (node) {
      node.title = title || node.title;
      this.saveLayout();
      return node;
    }
    return null;
  }

  kill(id) {
    return this.removeNode(id);
  }
}
