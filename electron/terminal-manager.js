import * as pty from "node-pty";
import { randomUUID } from "node:crypto";
import os from "node:os";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { migrateState } from "./state-migrate.js";
import { readInstructions, writeInstructions, syncBoth, writeRolesSidecar, readRolesSidecar } from "./roles.js";
import { WorkspaceRegistry } from "./workspace-registry.js";
import { agentCommand, detectAgents } from "./agent-cli.js";
import { NotesStore } from "./notes-store.js";

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

export const DEFAULT_SETTINGS = {
  backgroundKeepalive: 3,
  attentionNotifications: true,
  snapEnabled: false,
};

export const DEFAULT_UI = {
  sidebar: { collapsed: false },
  folders: [],
  sections: [],
};

export class TerminalManager {
  constructor({ stateFile }) {
    this.STATE_FILE = stateFile;
    this.terminals = new Map(); // Live PTY sessions (qualquer workspace em background)
    this.nodes = new Map(); // Configs ativos de nós não-terminal (referência do workspace ativo)
    this.connections = new Map(); // Conexões do workspace ativo
    this.workspaces = new Map();
    this.activeWorkspaceId = "ws_default";

    this.settings = { ...DEFAULT_SETTINGS };
    this.ui = { sidebar: { collapsed: false }, folders: [], sections: [] };
    this.folders = [];
    this.groups = [];

    this.broadcast = null;
    this.notifyCallback = null;
    this.lastNotifyTimes = new Map();

    this.registry = new WorkspaceRegistry(this);
    this.noteStore = this.STATE_FILE ? new NotesStore(join(dirname(this.STATE_FILE), "notes")) : null;

    this._scanTimer = setInterval(() => this._scanAttention(), 15000);

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
    if (now - last < 2000) return; // Debounce 2s por terminal
    this.lastNotifyTimes.set(terminalId, now);
    if (this.notifyCallback) {
      this.notifyCallback({ id: terminalId, title, body });
    }
  }

  /* ---------------- Estado & persistência ---------------- */

  loadState() {
    if (!this.STATE_FILE || !existsSync(this.STATE_FILE)) {
      this._initDefaultWorkspace();
      return;
    }
    try {
      const data = JSON.parse(readFileSync(this.STATE_FILE, "utf8"));
      const { state } = migrateState(data);
      this.ui = state.ui;
      this.settings = state.settings;
      this.folders = Array.isArray(state.folders) ? state.folders : (Array.isArray(this.ui?.folders) ? this.ui.folders : []);
      this.groups = Array.isArray(state.groups) ? state.groups : (Array.isArray(this.ui?.sections) ? this.ui.sections : []);
      if (this.ui) {
        this.ui.folders = this.folders;
        this.ui.sections = this.groups;
      }
      if (Array.isArray(state.roles)) this.settings.roles = state.roles;
      for (const ws of state.workspaces || []) {
        const groundFloorId = "floor_ground_" + ws.id;
        this.workspaces.set(ws.id, {
          ...ws,
          nodes: Array.isArray(ws.nodes) ? ws.nodes : [],
          connections: Array.isArray(ws.connections) ? ws.connections : [],
          groups: Array.isArray(ws.groups) ? ws.groups : [],
          cableTies: Array.isArray(ws.cableTies) ? ws.cableTies : [],
          floors: Array.isArray(ws.floors) && ws.floors.length > 0 ? ws.floors : [
            { id: groundFloorId, name: "Térreo", isGroundFloor: true, branch: "main", canvasTransform: { x: 0, y: 0, zoom: 1 }, hooks: { setup: [], run: [], teardown: [] } }
          ],
          activeFloorId: ws.activeFloorId || groundFloorId,
          drafts: (typeof ws.drafts === "object" && ws.drafts !== null) ? ws.drafts : {},
        });
      }
      this.activeWorkspaceId =
        state.activeWorkspaceId && this.workspaces.has(state.activeWorkspaceId)
          ? state.activeWorkspaceId
          : this.workspaces.keys().next().value;
    } catch (e) {
      console.error("Erro ao carregar state.json:", e.message);
      this._initDefaultWorkspace();
    }
  }

  _initDefaultWorkspace() {
    const now = new Date().toISOString();
    const groundFloorId = "floor_ground_default";
    const defaultWs = {
      id: "ws_default",
      name: "Workspace 1",
      icon: "",
      workingDir: "",
      instructions: { source: "none", syncBetween: false },
      groups: [],
      nodes: [],
      connections: [],
      cableTies: [],
      floors: [
        { id: groundFloorId, name: "Térreo", isGroundFloor: true, branch: "main", canvasTransform: { x: 0, y: 0, zoom: 1 }, hooks: { setup: [], run: [], teardown: [] } }
      ],
      activeFloorId: groundFloorId,
      drafts: {},
      createdAt: now,
      updatedAt: now,
      lastActiveAt: 0,
    };
    this.workspaces.set(defaultWs.id, defaultWs);
    this.activeWorkspaceId = defaultWs.id;
  }

  currentWorkspace() {
    return this.workspaces.get(this.activeWorkspaceId);
  }

  saveLayout() {
    if (!this.STATE_FILE) return;
    try {
      mkdirSync(dirname(this.STATE_FILE), { recursive: true });
      this._syncActiveWorkspace();
      const payload = {
        version: 3,
        activeWorkspaceId: this.activeWorkspaceId,
        workspaces: [...this.workspaces.values()],
        folders: this.folders || [],
        groups: this.groups || [],
        ui: {
          ...this.ui,
          folders: this.folders || [],
          sections: this.groups || [],
        },
        settings: this.settings,
        roles: this.settings.roles || [],
      };
      writeFileSync(this.STATE_FILE, JSON.stringify(payload, null, 2));
    } catch (err) {
      console.error("Erro ao salvar state.json:", err.message);
    }
  }

  /** Copia o estado vivo (terminais/portais/conexões) para o workspace ativo. */
  _syncActiveWorkspace() {
    const ws = this.currentWorkspace();
    if (!ws) return;
    const terminalNodes = [];
    for (const t of this.terminals.values()) {
      if (t.workspaceId !== this.activeWorkspaceId) continue;
      terminalNodes.push(this.serialize(t));
    }
    const otherNodes = [];
    for (const n of this.nodes.values()) {
      if (n.workspaceId !== this.activeWorkspaceId) continue;
      otherNodes.push(n);
    }
    ws.nodes = [...terminalNodes, ...otherNodes];
    ws.connections = [...this.connections.values()];
    ws.updatedAt = new Date().toISOString();
  }

  restore() {
    this.loadWorkspace(this.activeWorkspaceId);
  }

  /** Torna `workspaceId` a superfície ativa. NÃO encerra processos de outros workspaces (FR-008). */
  loadWorkspace(workspaceId, { respawn = true } = {}) {
    let ws = this.workspaces.get(workspaceId);
    if (!ws) {
      ws = this.workspaces.values().next().value;
      if (!ws) {
        this._initDefaultWorkspace();
        ws = this.workspaces.get(this.activeWorkspaceId);
      }
    }

    this._syncActiveWorkspace();
    this.activeWorkspaceId = ws.id;
    ws.lastActiveAt = Date.now();

    // Conexões do novo workspace
    this.connections = new Map();
    for (const conn of ws.connections || []) {
      if (conn.id && conn.from && conn.to) {
        this.connections.set(conn.id, conn);
      }
    }

    // Nós não-terminal: this.nodes passa a referenciar os configs do workspace ativo
    this.nodes = new Map();
    for (const node of ws.nodes || []) {
      if (node.type === "terminal" || !node.type) continue;
      node.workspaceId = ws.id;
      this.nodes.set(node.id, node);
    }

    // Terminais: mantém vivos os que já existem; cria os faltantes (processos preservados em background)
    for (const node of ws.nodes || []) {
      if (node.type !== "terminal" && node.type) continue;
      if (this.terminals.has(node.id)) {
        const t = this.terminals.get(node.id);
        t.workspaceId = ws.id;
        continue;
      }
      if (respawn) {
        try {
          this.create({ ...node, id: node.id });
        } catch (e) {
          console.error("Falha ao restaurar terminal:", e.message);
        }
      }
    }

    // Terminais de outros workspaces permanecem no mapa (background) até a política LRU (US2)
    this.saveLayout();
    if (this.broadcast) {
      const cur = this.workspaces.get(this.activeWorkspaceId);
      this.broadcast({
        type: "workspace_state",
        workspaceId: this.activeWorkspaceId,
        name: cur ? cur.name : "",
        state: "active",
      });
    }
  }

  /* ---------------- Workspace CRUD ---------------- */

  _hydrateInstructions(ws) {
    if (!ws || !ws.workingDir || !existsSync(ws.workingDir)) return ws && ws.instructions;
    const ins = ws.instructions || (ws.instructions = { source: "none", syncBetween: false });
    const r = readInstructions(ws.workingDir);
    if (r.claudeMd !== undefined) ins.claudeMd = r.claudeMd;
    if (r.agentsMd !== undefined) ins.agentsMd = r.agentsMd;
    ins.source = r.claudeMd !== undefined ? "claude" : r.agentsMd !== undefined ? "agents" : "none";
    return ins;
  }

  listWorkspaces() {
    return [...this.workspaces.values()].map((ws) => {
      const instructions = this._hydrateInstructions(ws);
      const terminals = (ws.nodes || [])
        .filter((n) => n.type === "terminal" || !n.type)
        .map((n) => ({ id: n.id, title: n.title, icon: n.icon }));
      return {
        id: ws.id,
        name: ws.name,
        icon: ws.icon || "",
        workingDir: ws.workingDir || "",
        nodeCount: (ws.nodes || []).length,
        dirMissing: !!(ws.workingDir && !existsSync(ws.workingDir)),
        instructions: instructions || { source: "none", syncBetween: false },
        terminals,
      };
    });
  }

  createWorkspace({ name, workingDir = "", icon = "" } = {}) {
    const id = `ws_${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    const groundFloorId = `floor_ground_${id}`;
    const ws = {
      id,
      name: name || `Workspace ${this.workspaces.size + 1}`,
      icon,
      workingDir,
      instructions: { source: "none", syncBetween: false },
      groups: [],
      nodes: [],
      connections: [],
      cableTies: [],
      floors: [
        { id: groundFloorId, name: "Térreo", isGroundFloor: true, branch: "main", canvasTransform: { x: 0, y: 0, zoom: 1 }, hooks: { setup: [], run: [], teardown: [] } }
      ],
      activeFloorId: groundFloorId,
      drafts: {},
      createdAt: now,
      updatedAt: now,
      lastActiveAt: 0,
    };
    this.workspaces.set(id, ws);
    this.saveLayout();
    return ws;
  }

  switchWorkspace(workspaceId) {
    if (!this.workspaces.has(workspaceId)) return false;
    if (workspaceId === this.activeWorkspaceId) return true;
    this.loadWorkspace(workspaceId);
    this.registry.applyPolicy();
    return true;
  }

  /** Pausa um workspace: encerra processos vivos e libera recursos (FR-054/Q5). */
  pauseWorkspace(workspaceId) {
    const ws = this.workspaces.get(workspaceId);
    if (!ws || workspaceId === this.activeWorkspaceId) return false;
    let killed = false;
    for (const [id, t] of [...this.terminals.entries()]) {
      if (t.workspaceId === workspaceId) {
        try {
          t.proc.kill();
        } catch {}
        this.terminals.delete(id);
        killed = true;
      }
    }
    if (killed) {
      this.saveLayout();
      if (this.broadcast) {
        this.broadcast({
          type: "workspace_state",
          workspaceId,
          name: ws.name,
          state: "paused",
          note: "Workspace pausado: processos encerrados (limite de segundo plano). Retoma ao reativar.",
        });
      }
    }
    return killed;
  }

  renameWorkspace(workspaceId, { name, icon } = {}) {
    const ws = this.workspaces.get(workspaceId);
    if (!ws) return false;
    if (typeof name === "string") ws.name = name || ws.name;
    if (typeof icon === "string") ws.icon = icon;
    this.saveLayout();
    return true;
  }

  setWorkspaceDir(workspaceId, workingDir) {
    const ws = this.workspaces.get(workspaceId);
    if (!ws) return false;
    ws.workingDir = workingDir || "";
    this._hydrateInstructions(ws);
    this.saveLayout();
    return true;
  }

  setWorkspaceInstructions(workspaceId, patch = {}) {
    const ws = this.workspaces.get(workspaceId);
    if (!ws) return false;
    ws.instructions = { ...(ws.instructions || {}), ...patch };
    if (ws.instructions.syncBetween && typeof patch.claudeMd === "string") {
      ws.instructions.agentsMd = patch.claudeMd;
    } else if (ws.instructions.syncBetween && typeof patch.agentsMd === "string") {
      ws.instructions.claudeMd = patch.agentsMd;
    }

    // Grava nos arquivos reais do diretório (FR-010)
    if (ws.workingDir) {
      try {
        if (ws.instructions.syncBetween) {
          const content = ws.instructions.claudeMd || ws.instructions.agentsMd;
          if (content) syncBoth(ws.workingDir, content);
        } else {
          writeInstructions(ws.workingDir, {
            claudeMd: ws.instructions.claudeMd,
            agentsMd: ws.instructions.agentsMd,
          });
        }
      } catch (err) {
        console.error("Falha ao gravar instruções:", err.message);
      }
    }
    this.saveLayout();
    return true;
  }

  updateSettings(patch = {}) {
    this.settings = { ...this.settings, ...patch };
    this.saveLayout();
    return this.settings;
  }

  updateUi(patch = {}) {
    this.ui = { ...this.ui, ...patch };
    if (!this.ui.sidebar) this.ui.sidebar = { collapsed: false };
    this.saveLayout();
    return this.ui;
  }

  sidebarFolder(action, payload = {}) {
    const folders = this.folders || (this.folders = []);
    if (action === "add") {
      const f = {
        id: `folder_${randomUUID().slice(0, 8)}`,
        name: payload.name || "Nova pasta",
        collapsed: false,
        workspaceIds: [],
        createdAt: new Date().toISOString(),
      };
      folders.push(f);
      this.ui.folders = folders;
      this.saveLayout();
      return f;
    }
    if (action === "rename") {
      const f = folders.find((x) => x.id === payload.id);
      if (f) {
        f.name = payload.name || f.name;
        this.saveLayout();
      }
      return f;
    }
    if (action === "toggle") {
      const f = folders.find((x) => x.id === payload.id);
      if (f) {
        f.collapsed = typeof payload.collapsed === "boolean" ? payload.collapsed : !f.collapsed;
        this.saveLayout();
      }
      return f;
    }
    if (action === "delete") {
      const i = folders.findIndex((x) => x.id === payload.id);
      if (i >= 0) {
        folders.splice(i, 1);
        this.ui.folders = folders;
        this.saveLayout();
        return true;
      }
    }
    return null;
  }

  sidebarSection(action, payload = {}) {
    const groups = this.groups || (this.groups = []);
    if (action === "add") {
      const s = {
        id: `group_${randomUUID().slice(0, 8)}`,
        name: payload.name || payload.title || "Novo grupo",
        order: typeof payload.order === "number" ? payload.order : groups.length,
      };
      groups.push(s);
      this.ui.sections = groups;
      this.saveLayout();
      return s;
    }
    if (action === "rename") {
      const s = groups.find((x) => x.id === payload.id);
      if (s) {
        s.name = payload.name || payload.title || s.name;
        this.saveLayout();
      }
      return s;
    }
    if (action === "delete") {
      const i = groups.findIndex((x) => x.id === payload.id);
      if (i >= 0) {
        groups.splice(i, 1);
        this.ui.sections = groups;
        this.saveLayout();
        return true;
      }
    }
    return null;
  }

  listFolders() {
    return this.folders || [];
  }

  createFolder({ name }) {
    return this.sidebarFolder("add", { name });
  }

  deleteFolder(folderId) {
    return this.sidebarFolder("delete", { id: folderId });
  }

  renameFolder(folderId, name) {
    return this.sidebarFolder("rename", { id: folderId, name });
  }

  toggleFolder(folderId, collapsed) {
    return this.sidebarFolder("toggle", { id: folderId, collapsed });
  }

  addWorkspaceToFolder(folderId, workspaceId) {
    for (const f of this.folders) {
      f.workspaceIds = (f.workspaceIds || []).filter((id) => id !== workspaceId);
    }
    const target = this.folders.find((f) => f.id === folderId);
    if (target) {
      target.workspaceIds.push(workspaceId);
      this.ui.folders = this.folders;
      this.saveLayout();
      return target;
    }
    return null;
  }

  removeWorkspaceFromFolder(workspaceId) {
    let changed = false;
    for (const f of this.folders) {
      const before = f.workspaceIds.length;
      f.workspaceIds = (f.workspaceIds || []).filter((id) => id !== workspaceId);
      if (f.workspaceIds.length !== before) changed = true;
    }
    if (changed) {
      this.ui.folders = this.folders;
      this.saveLayout();
    }
    return changed;
  }

  listGroups() {
    return this.groups || [];
  }

  createGroup({ name, order }) {
    const s = this.sidebarSection("add", { name });
    if (typeof order === "number" && s) s.order = order;
    return s;
  }

  deleteGroup(groupId) {
    return this.sidebarSection("delete", { id: groupId });
  }

  renameGroup(groupId, name) {
    return this.sidebarSection("rename", { id: groupId, name });
  }

  deleteWorkspace(workspaceId) {
    if (this.workspaces.size <= 1) return false;
    this.removeWorkspaceFromFolder(workspaceId);
    const deleted = this.workspaces.delete(workspaceId);
    if (deleted) {
      // Encerra processos vivos daquele workspace
      for (const [id, t] of [...this.terminals.entries()]) {
        if (t.workspaceId === workspaceId) {
          try {
            t.proc.kill();
          } catch {}
          this.terminals.delete(id);
        }
      }
      if (this.activeWorkspaceId === workspaceId) {
        const next = this.workspaces.values().next().value;
        this.loadWorkspace(next.id);
      }
      this.saveLayout();
    }
    return deleted;
  }

  /* ---------------- Terminal Management (live) ---------------- */

  create(layout = {}) {
    const id = layout.id || randomUUID();
    const title = layout.title || `Terminal ${this.terminals.size + 1}`;
    const x = layout.x ?? 80;
    const y = layout.y ?? 80;
    const width = layout.width ?? 720;
    const height = layout.height ?? 400;
    const style = { ...DEFAULT_STYLE, ...(layout.style || {}) };
    const workspaceId = layout.workspaceId || this.activeWorkspaceId;
    const ws = this.workspaces.get(workspaceId);

    const isWindows = process.platform === "win32";
    const defaultShell = isWindows
      ? process.env.ComSpec || "powershell.exe"
      : process.env.SHELL || "/bin/zsh";
    const cwd =
      ws && ws.workingDir
        ? ws.workingDir
        : isWindows
          ? process.env.USERPROFILE || os.homedir()
          : process.env.HOME || os.homedir();
    const env = { ...process.env };
    env.TERM = "xterm-256color";

    // Agente CLI (FR-011): claude/codex/opencode quando layout.agent informado
    let shell = defaultShell;
    let args = [];
    let agent = layout.agent && layout.agent.kind ? { ...layout.agent } : null;
    let agentMissing = false;
    if (agent) {
      const ac = agentCommand(agent.kind, { sessionId: agent.sessionId });
      if (ac) {
        shell = ac.cmd;
        args = ac.args;
      } else {
        agent = null;
        agentMissing = true;
        console.warn(`Agente '${layout.agent.kind}' não encontrado no PATH; iniciando shell padrão.`);
      }
    }

    let cols = layout.cols || 80;
    let rows = layout.rows || 24;
    const proc = pty.spawn(shell, args, {
      name: "xterm-256color",
      cols,
      rows,
      cwd,
      env,
    });

    const roleId = layout.roleId || null;
    const role = roleId ? (this.settings.roles || []).find((r) => r.id === roleId) : null;
    const term = {
      type: "terminal",
      id,
      title: agentMissing ? `${title} · agente não encontrado` : title,
      x,
      y,
      width,
      height,
      cols,
      rows,
      style,
      cwd,
      workspaceId,
      icon: layout.icon || "",
      agent: agentMissing ? null : agent,
      roleId: agentMissing ? null : roleId,
      agentMissing: agentMissing || false,
      bootQueued: agent && role && role.instructions ? role.instructions : null,
      lastDataAt: Date.now(),
      attentionSent: false,
      proc,
    };

    let bufferAccumulator = "";
    proc.onData((data) => {
      term.lastDataAt = Date.now();
      if (term.attentionSent) {
        term.attentionSent = false;
        if (this.broadcast) this.broadcast({ type: "attention_cleared", nodeId: id });
      }
      if (this.broadcast) {
        this.broadcast({ type: "output", id, data });
      }
      // Injeção da responsabilidade na primeira troca de dados (FR-015)
      if (term.bootQueued) {
        const boot = term.bootQueued;
        term.bootQueued = null;
        try {
          proc.write(`${boot}\n`);
        } catch {}
      }
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
        this._flagAttention(id, term, title, "Comando aguardando aprovação/interação.");
        bufferAccumulator = "";
      }

      // Roteamento de resposta inter-agentes autônomo (FR-031, FR-032 / US5)
      if (term.isCapturingReply && term.waitingReplyFor && !term.isSelected) {
        term.capturedOutput = (term.capturedOutput || "") + data;
        clearTimeout(term.replyDebounceTimer);
        term.replyDebounceTimer = setTimeout(() => {
          if (term.isCapturingReply && term.waitingReplyFor && !term.isSelected) {
            const fromTerm = this.terminals.get(term.waitingReplyFor);
            if (fromTerm && fromTerm.proc) {
              fromTerm.proc.write(`\r\n\x1b[36m[Resposta de ${term.title || "Agente"}]:\x1b[0m\r\n${term.capturedOutput.trim()}\r\n`);
            }
            term.waitingReplyFor = null;
            term.isCapturingReply = false;
            term.capturedOutput = "";
          }
        }, 2500);
      }
    });

    proc.onExit(({ exitCode }) => {
      this.terminals.delete(id);
      this.removeNodeConnections(id);
      const wsx = this.workspaces.get(workspaceId);
      if (wsx) {
        wsx.nodes = (wsx.nodes || []).filter((n) => !(n.id === id && (n.type === "terminal" || !n.type)));
        wsx.updatedAt = new Date().toISOString();
      }
      this.saveLayout();
      if (this.broadcast) {
        this.broadcast({ type: "exited", id, exitCode });
        this.broadcast({ type: "attention_cleared", nodeId: id });
      }
      if (exitCode !== 0) {
        this.sendNotification(id, term.title, `Processo finalizado com código ${exitCode}.`);
      }
    });

    this.terminals.set(id, term);
    this.saveLayout();
    return this.serialize(term);
  }

  serialize(t) {
    const out = {
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
    if (t.icon) out.icon = t.icon;
    if (t.agent) out.agent = t.agent;
    if (t.roleId) out.roleId = t.roleId;
    if (t.workspaceId) out.workspaceId = t.workspaceId;
    return out;
  }

  sendAgentMessage(fromTerminalId, toTerminalId, prompt) {
    let toTerm = this.terminals.get(toTerminalId);
    if (!toTerm) {
      for (const t of this.terminals.values()) {
        if (t.title && t.title.toLowerCase() === toTerminalId.toLowerCase()) {
          toTerm = t;
          break;
        }
      }
    }
    if (!toTerm || !toTerm.proc) {
      return { ok: false, error: "Terminal de destino não encontrado ou não está em execução." };
    }
    toTerm.waitingReplyFor = fromTerminalId;
    toTerm.capturedOutput = "";
    toTerm.isCapturingReply = true;
    toTerm.proc.write(prompt + "\r\n");
    return { ok: true };
  }

  async portalAction(portalId, action, args = []) {
    const actionId = randomUUID();
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (this._pendingPortalActions) this._pendingPortalActions.delete(actionId);
        resolve({ ok: false, error: `Timeout aguardando ação ${action} no portal ${portalId}` });
      }, 6000);
      if (!this._pendingPortalActions) this._pendingPortalActions = new Map();
      this._pendingPortalActions.set(actionId, { resolve, timeout });
      if (this.broadcast) {
        this.broadcast({ type: "portal_action", actionId, portalId, action, args });
      } else {
        clearTimeout(timeout);
        this._pendingPortalActions.delete(actionId);
        resolve({ ok: true, output: `[Headless] Ação ${action} simulada no portal ${portalId}` });
      }
    });
  }

  handlePortalActionResponse(msg) {
    if (!msg || !msg.actionId) return;
    const entry = this._pendingPortalActions?.get(msg.actionId);
    if (entry) {
      clearTimeout(entry.timeout);
      this._pendingPortalActions.delete(msg.actionId);
      entry.resolve({ ok: msg.ok !== false, output: msg.output, error: msg.error });
    }
  }

  setTerminalSelected(terminalId, isSelected) {
    const term = this.terminals.get(terminalId);
    if (!term) return;
    term.isSelected = !!isSelected;
    if (term.isSelected) {
      term.waitingReplyFor = null;
      term.isCapturingReply = false;
      term.capturedOutput = "";
      term.attentionSent = false;
      if (this.broadcast) {
        this.broadcast({ type: "attention_cleared", nodeId: terminalId });
      }
    }
  }

  /* ---------------- Nós espaciais (portais/editor/notas/árvore/desenho/texto) ---------------- */

  createNode(nodeData = {}) {
    const id = nodeData.id || `node_${randomUUID().slice(0, 8)}`;
    const type = nodeData.type || "web-portal";
    const defaults = {
      "web-portal": { title: "Web Portal", width: 700, height: 450 },
      "device-portal": { title: "Pixel 9", width: 380, height: 740 },
      "code-editor": { title: "Code Editor", width: 700, height: 450 },
      note: { title: "Nota", width: 360, height: 300 },
      binder: { title: "", width: 440, height: 380 },
      "file-tree": { title: "Arquivos", width: 360, height: 480 },
      text: { title: "Texto", width: 260, height: 120 },
      drawing: { title: "Desenho", width: 360, height: 260 },
    }[type] || { title: type, width: 480, height: 320 };

    const ws = this.currentWorkspace();
    const node = {
      ...nodeData,
      id,
      type,
      title: nodeData.title || defaults.title,
      x: nodeData.x ?? 120,
      y: nodeData.y ?? 120,
      width: nodeData.width ?? defaults.width,
      height: nodeData.height ?? defaults.height,
      workspaceId: this.activeWorkspaceId,
    };

    // Nota: garante arquivo .md interno na criação (FR-019), exceto se nota externa com filePath
    if (type === "note") {
      if (nodeData.internal !== false && !nodeData.filePath && this.noteStore) {
        const file = this.noteStore.create(this.activeWorkspaceId, id, { title: node.title });
        node.filePath = file;
        node.internal = true;
        node.pinned = !!nodeData.pinned;
        node.view = nodeData.view || "raw";
      } else {
        node.filePath = nodeData.filePath || "";
        node.internal = nodeData.internal === false ? false : true;
        node.pinned = !!nodeData.pinned;
        node.view = nodeData.view || "raw";
      }
    }

    if (type === "binder") {
      node.title = nodeData.title || "";
      node.named = !!(nodeData.title && nodeData.title.trim()) || !!nodeData.named;
      node.uniformColor = nodeData.uniformColor || null;
      node.pageIds = Array.isArray(nodeData.pageIds) ? [...nodeData.pageIds] : [];
      node.activePageId = nodeData.activePageId || (node.pageIds[0] || "");
      for (const pid of node.pageIds) {
        const pageNode = this.nodes.get(pid);
        if (pageNode) {
          pageNode.binderId = id;
          if (node.uniformColor) pageNode.color = node.uniformColor;
        }
      }
    }

    if (ws) {
      if (!ws.nodes.some((n) => n.id === id)) ws.nodes.push(node);
    }
    this.nodes.set(id, node);
    if (type === "note" && nodeData.content) {
      setTimeout(() => this.noteWrite(id, nodeData.content), 20);
    }
    this.saveLayout();
    return node;
  }

  /* ---------------- Notas (FR-019..025) ---------------- */

  _noteConfig(nodeId) {
    const node = this.nodes.get(nodeId);
    if (node && node.workspaceId === this.activeWorkspaceId) return node;
    const ws = this.currentWorkspace();
    return (ws && ws.nodes ? ws.nodes.find((n) => n.id === nodeId && (n.type === "note" || n.type === "binder")) : null) || null;
  }

  noteRead(nodeIdOrName, { chain = false } = {}) {
    let targetId = nodeIdOrName;
    const ws = this.currentWorkspace();
    const foundNode = (ws?.nodes || []).find(
      (n) => n.id === nodeIdOrName || (n.title && n.title.toLowerCase() === String(nodeIdOrName).toLowerCase())
    );
    if (foundNode) targetId = foundNode.id;

    if (!chain) {
      return this._readSingleNote(targetId);
    }

    const visited = new Set();
    const results = [];

    const traverse = (currId) => {
      if (!currId || visited.has(currId)) return;
      visited.add(currId);
      const content = this._readSingleNote(currId);
      const currNode = (ws?.nodes || []).find((n) => n.id === currId);
      const title = currNode?.title || currId;
      results.push(`## ${title}\n\n${content}`);

      for (const conn of this.connections.values()) {
        if (conn.from === currId && !visited.has(conn.to)) {
          traverse(conn.to);
        }
      }
    };

    traverse(targetId);
    return results.join("\n\n---\n\n");
  }

  _readSingleNote(nodeId) {
    const node = this.nodes.get(nodeId);
    if (node && node.type === "binder") {
      return this.binderRead(nodeId);
    }
    const n = this._noteConfig(nodeId);
    if (!n || !this.noteStore) return "";
    const file = n.filePath || this.noteStore.internalFile(this.activeWorkspaceId, nodeId);
    return this.noteStore.read(file);
  }

  noteWrite(nodeId, content) {
    const node = this._noteConfig(nodeId);
    if (!node || !this.noteStore) return false;
    const file = node.filePath || this.noteStore.internalFile(this.activeWorkspaceId, nodeId);
    node.filePath = file;
    node.internal = node.internal !== false;
    this.noteStore.write(file, content);
    this.saveLayout();
    return true;
  }

  noteMoveToProject(nodeId) {
    const node = this._noteConfig(nodeId);
    if (!node || !this.noteStore) return null;
    const ws = this.currentWorkspace();
    if (!ws || !ws.workingDir) return null;
    const oldFile = node.filePath || this.noteStore.internalFile(this.activeWorkspaceId, nodeId);
    const content = this.noteStore.read(oldFile);
    const target = this.noteStore.moveToProject(ws.workingDir, node.title || "nota", nodeId, content);
    if (node.internal !== false && oldFile && oldFile !== target) {
      this.noteStore.delete(oldFile);
    }
    node.filePath = target;
    node.internal = false;
    this.saveLayout();
    return target;
  }

  noteSetPinned(nodeId, pinned) {
    const node = this._noteConfig(nodeId);
    if (!node) return false;
    node.pinned = !!pinned;
    this.saveLayout();
    return true;
  }

  noteDeleteFile(nodeId) {
    const node = this._noteConfig(nodeId);
    if (!node || !this.noteStore) return;
    if (node.internal !== false && (node.filePath || node.internal)) {
      const file = node.filePath || this.noteStore.internalFile(this.activeWorkspaceId, nodeId);
      this.noteStore.delete(file);
    }
  }

  noteSaveImage(nodeId, bufferBase64, extension = "png") {
    if (!bufferBase64) return { ok: false, error: "Buffer vazio" };
    const ws = this.currentWorkspace();
    const cleanExt = extension.replace(/^\./, "") || "png";
    const filename = `img_${Date.now().toString(36)}_${randomUUID().slice(0, 4)}.${cleanExt}`;
    let dir = "";
    let relativePath = "";

    if (ws && ws.workingDir && existsSync(ws.workingDir)) {
      dir = join(ws.workingDir, ".terminalmanager", "assets");
      relativePath = `.terminalmanager/assets/${filename}`;
    } else if (this.noteStore && this.noteStore.dir) {
      dir = join(this.noteStore.dir, "assets");
      relativePath = `assets/${filename}`;
    } else {
      dir = join(dirname(this.STATE_FILE || process.cwd()), "assets");
      relativePath = `assets/${filename}`;
    }

    try {
      mkdirSync(dir, { recursive: true });
      const fullPath = join(dir, filename);
      const buf = Buffer.from(bufferBase64, "base64");
      writeFileSync(fullPath, buf);
      return { ok: true, fullPath, relativePath, filename };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  /* ---------------- Fichários (Binders) ---------------- */

  binderCreate(data = {}) {
    const named = !!(data.title && data.title.trim());
    const noteIds = Array.isArray(data.noteIds) ? [...data.noteIds] : (Array.isArray(data.pageIds) ? [...data.pageIds] : []);
    const binder = this.createNode({
      id: data.id || `binder_${randomUUID().slice(0, 8)}`,
      type: "binder",
      title: data.title || "",
      named,
      uniformColor: data.uniformColor || null,
      pageIds: noteIds,
      activePageId: noteIds[0] || "",
      x: data.x,
      y: data.y,
      width: data.width,
      height: data.height,
    });
    for (const nid of noteIds) {
      const n = this.nodes.get(nid);
      if (n) {
        n.binderId = binder.id;
        if (binder.uniformColor) n.color = binder.uniformColor;
      }
    }
    this.saveLayout();
    return binder;
  }

  binderAddPage(binderId, noteId) {
    const binder = this.nodes.get(binderId);
    if (!binder || binder.type !== "binder") return null;
    binder.pageIds = Array.isArray(binder.pageIds) ? binder.pageIds : [];
    binder.pageIds = binder.pageIds.filter((id) => id !== noteId);
    binder.pageIds.unshift(noteId);
    binder.activePageId = noteId;

    const note = this.nodes.get(noteId);
    if (note) {
      note.binderId = binderId;
      if (binder.uniformColor) {
        note.color = binder.uniformColor;
      }
    }
    this.saveLayout();
    return binder;
  }

  binderRemovePage(binderId, noteId, x, y) {
    const binder = this.nodes.get(binderId);
    if (!binder || binder.type !== "binder") return { removed: false, binder: null };
    binder.pageIds = (binder.pageIds || []).filter((id) => id !== noteId);

    const note = this.nodes.get(noteId);
    if (note) {
      note.binderId = null;
      if (typeof x === "number" && typeof y === "number") {
        note.x = x;
        note.y = y;
      }
    }

    if (binder.activePageId === noteId) {
      binder.activePageId = binder.pageIds[0] || "";
    }

    let removed = false;
    if (binder.pageIds.length === 0 && !binder.named) {
      this.removeNode(binderId);
      removed = true;
    } else {
      this.saveLayout();
    }
    return { removed, binder: removed ? null : binder };
  }

  binderReorder(binderId, pageIds) {
    const binder = this.nodes.get(binderId);
    if (!binder || binder.type !== "binder") return null;
    if (Array.isArray(pageIds)) {
      binder.pageIds = [...pageIds];
      if (!binder.pageIds.includes(binder.activePageId)) {
        binder.activePageId = binder.pageIds[0] || "";
      }
      this.saveLayout();
    }
    return binder;
  }

  binderUniformColor(binderId, color) {
    const binder = this.nodes.get(binderId);
    if (!binder || binder.type !== "binder") return null;
    binder.uniformColor = color || null;
    if (Array.isArray(binder.pageIds)) {
      for (const pid of binder.pageIds) {
        const pageNode = this.nodes.get(pid);
        if (pageNode && color) {
          pageNode.color = color;
        }
      }
    }
    this.saveLayout();
    return binder;
  }

  binderRead(binderId) {
    const binder = this.nodes.get(binderId);
    if (!binder || binder.type !== "binder") return "";
    const chunks = [];
    for (const pid of binder.pageIds || []) {
      const pageNode = this.nodes.get(pid);
      const title = pageNode ? (pageNode.title || "Nota") : "Nota";
      const content = this.noteRead(pid);
      chunks.push(`## ${title}\n\n${content}`);
    }
    return chunks.join("\n\n---\n\n");
  }

  listNodes() {
    const terminalList = [];
    for (const t of this.terminals.values()) {
      if (t.workspaceId !== this.activeWorkspaceId) continue;
      terminalList.push(this.serialize(t));
    }
    const nodeList = [];
    for (const n of this.nodes.values()) {
      if (n.workspaceId !== this.activeWorkspaceId) continue;
      nodeList.push(n);
    }
    return [...terminalList, ...nodeList];
  }

  getNode(id) {
    return this.terminals.get(id) || this.nodes.get(id) || null;
  }

  moveNode(id, x, y) {
    const term = this.terminals.get(id);
    if (term && term.workspaceId === this.activeWorkspaceId) {
      term.x = x;
      term.y = y;
      this.saveLayout();
      return true;
    }
    const node = this.nodes.get(id);
    if (node && node.workspaceId === this.activeWorkspaceId) {
      node.x = x;
      node.y = y;
      this.saveLayout();
      return true;
    }
    return false;
  }

  resizeNode(id, width, height, cols, rows) {
    const term = this.terminals.get(id);
    if (term && term.workspaceId === this.activeWorkspaceId) {
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
    if (node && node.workspaceId === this.activeWorkspaceId) {
      node.width = width;
      node.height = height;
      this.saveLayout();
      return true;
    }
    return false;
  }

  removeNode(id) {
    let removed = false;
    let noteFileToDelete = null;
    const term = this.terminals.get(id);
    if (term) {
      if (term.workspaceId !== this.activeWorkspaceId) return false;
      try {
        term.proc.kill();
      } catch {}
      this.terminals.delete(id);
      removed = true;
    }
    if (this.nodes.has(id)) {
      const node = this.nodes.get(id);
      if (node.workspaceId === this.activeWorkspaceId) {
        if (node.type === "note" && node.internal !== false) {
          noteFileToDelete = node.filePath || (this.noteStore ? this.noteStore.internalFile(this.activeWorkspaceId, id) : null);
        }
        if (node.type === "note" && node.binderId) {
          const parentBinder = this.nodes.get(node.binderId);
          if (parentBinder && parentBinder.type === "binder") {
            parentBinder.pageIds = (parentBinder.pageIds || []).filter((p) => p !== id);
            if (parentBinder.activePageId === id) {
              parentBinder.activePageId = parentBinder.pageIds[0] || "";
            }
            if (parentBinder.pageIds.length === 0 && !parentBinder.named) {
              this.nodes.delete(node.binderId);
              const ws = this.currentWorkspace();
              if (ws) ws.nodes = (ws.nodes || []).filter((n) => n.id !== node.binderId);
            }
          }
        }
        if (node.type === "binder") {
          for (const pid of node.pageIds || []) {
            const childNote = this.nodes.get(pid);
            if (childNote) childNote.binderId = null;
          }
        }
        this.nodes.delete(id);
        removed = true;
      } else {
        removed = false;
      }
    }
    if (removed) {
      const ws = this.currentWorkspace();
      if (ws) ws.nodes = (ws.nodes || []).filter((n) => n.id !== id);
      this.removeNodeConnections(id);
      if (noteFileToDelete && this.noteStore) {
        try {
          this.noteStore.delete(noteFileToDelete);
        } catch {}
      }
      this.saveLayout();
    }
    return removed;
  }

  updateNodeConfig(id, config = {}) {
    const node = this.nodes.get(id);
    if (!node || node.workspaceId !== this.activeWorkspaceId) return null;
    Object.assign(node, config);
    this.saveLayout();
    return node;
  }

  /* ---------------- Conexões ---------------- */

  listConnections() {
    return [...this.connections.values()];
  }

  addConnection({ from, to, label = "", style = "rope", kind }) {
    if (!from || !to || from === to) return null;
    for (const conn of this.connections.values()) {
      if (conn.from === from && conn.to === to) return conn;
    }
    const id = `conn_${randomUUID().slice(0, 8)}`;
    const conn = {
      id,
      from,
      to,
      label,
      style: style === "circuit" ? "circuit" : "rope",
      kind: kind || this._classifyConnection(from, to),
      log: [],
    };
    this.connections.set(id, conn);
    this.saveLayout();
    return conn;
  }

  /** Alias for addConnection — matches the createXxx naming convention used in the rest of the API. */
  createConnection(opts) {
    return this.addConnection(opts);
  }


  /** Classifica a conexão pela natureza dos extremos (FR-034..036 / data-model §6). */
  _classifyConnection(from, to) {
    const info = (id) => {
      const term = this.terminals.get(id);
      if (term) return { t: "terminal", agent: !!term.agent };
      const node = this.nodes.get(id);
      if (!node) return { t: "unknown" };
      const type = node.type;
      if (type === "note") return { t: "note" };
      if (type === "binder") return { t: "binder" };
      if (type === "web-portal" || type === "device-portal") return { t: "portal" };
      return { t: "other", type };
    };
    const a = info(from);
    const b = info(to);
    const agentA = a.t === "terminal" && a.agent;
    const agentB = b.t === "terminal" && b.agent;
    if (agentA && agentB) return "agent-agent";
    if (agentA && (b.t === "note" || b.t === "binder")) return "agent-note";
    if (agentB && (a.t === "note" || a.t === "binder")) return "agent-note";
    if (agentA && b.t === "portal") return "agent-portal";
    if (agentB && a.t === "portal") return "agent-portal";
    return "node";
  }

  updateConnection(id, patch = {}) {
    const conn = this.connections.get(id);
    if (!conn) return null;
    Object.assign(conn, patch);
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

  /* ---------------- Responsabilidades (Roles) ---------------- */

  listRoles() {
    return this.settings.roles || [];
  }

  saveRoles(roles) {
    this.settings.roles = Array.isArray(roles) ? roles : [];
    this.saveLayout();
    return this.settings.roles;
  }

  assignRole(nodeId, roleId) {
    const role = roleId ? (this.settings.roles || []).find((r) => r.id === roleId) : null;
    if (roleId && !role) return false;
    const term = this.terminals.get(nodeId);
    const ws = this.currentWorkspace();
    if (term && term.workspaceId === this.activeWorkspaceId) {
      term.roleId = roleId || null;
      const cfg = (ws.nodes || []).find((n) => n.id === nodeId && (n.type === "terminal" || !n.type));
      if (cfg) cfg.roleId = roleId || null;
      if (term.cwd && term.cwd !== ws.workingDir && role) {
        try {
          writeRolesSidecar(term.cwd, [role], ws.id);
        } catch {}
      }
    } else {
      const node = this.nodes.get(nodeId);
      if (node && node.workspaceId === this.activeWorkspaceId) {
        node.roleId = roleId || null;
      } else {
        return false;
      }
    }
    this._syncRoleSidecar();
    this.saveLayout();
    if (this.broadcast) {
      this.broadcast({ type: "node_role", nodeId, roleId: roleId || null });
    }
    return true;
  }

  /** Persiste em role.json (sidecar do projeto) as roles referenciadas por nós do workspace ativo. */
  _syncRoleSidecar() {
    const ws = this.currentWorkspace();
    if (!ws || !ws.workingDir) return;
    const used = new Set();
    for (const n of ws.nodes || []) {
      if (n.roleId) used.add(n.roleId);
    }
    const roles = (this.settings.roles || []).filter((r) => used.has(r.id));
    try {
      writeRolesSidecar(ws.workingDir, roles, ws.id);
    } catch (err) {
      console.error("Falha ao gravar role.json:", err.message);
    }
  }

  /* ---------------- Atenção de agentes (FR-017) ---------------- */

  _flagAttention(id, term, title, body) {
    if (this.settings.attentionNotifications !== false) {
      this.sendNotification(id, title, body);
    }
    term.attentionSent = true;
    if (this.broadcast) {
      this.broadcast({ type: "attention", nodeId: id, state: "waiting", notify: false });
    }
  }

  /** Heurística de ociosidade: agente ativo sem saída há >30s aguarda retomada/decisão. */
  _scanAttention() {
    const now = Date.now();
    for (const t of this.terminals.values()) {
      if (!t.agent || !t.proc || t.proc.exitCode !== undefined) continue;
      if (t.attentionSent) continue;
      if (now - t.lastDataAt > 30000) {
        this._flagAttention(t.id, t, t.title, "Agente ocioso — possivelmente aguardando decisão.");
      }
    }
  }

  /* ---------------- Portabilidade .maestri (FR-009 / US10) ---------------- */

  /** Monta o bundle autocontido de um workspace (estado + notas + roles). */
  exportWorkspace(workspaceId) {
    const ws = this.workspaces.get(workspaceId);
    if (!ws) return null;
    const notes = {};
    for (const n of ws.nodes || []) {
      if (n.type !== "note") continue;
      const file = n.filePath || (this.noteStore ? this.noteStore.internalFile(ws.id, n.id) : null);
      notes[n.id] = this.noteStore ? this.noteStore.read(file) : "";
    }
    const usedRoles = new Set();
    for (const n of ws.nodes || []) if (n.roleId) usedRoles.add(n.roleId);
    const roles = (this.settings.roles || []).filter((r) => usedRoles.has(r.id));
    return {
      app: "terminalmanager",
      format: "terminalmanager-bundle",
      version: 1,
      exportedAt: new Date().toISOString(),
      workspace: {
        name: ws.name,
        icon: ws.icon,
        groups: ws.groups || [],
        instructions: ws.instructions || { source: "none", syncBetween: false },
        nodes: (ws.nodes || []).map((n) => {
          const copy = { ...n };
          if (copy.type === "note") {
            copy.filePath = ""; // caminhos absolutos não viajam
            copy.internal = true;
          }
          if (copy.type === "terminal") {
            // não transporta processos/sessões — só configuração
            copy.cwd = undefined;
          }
          delete copy.workspaceId;
          return copy;
        }),
        connections: (ws.connections || []).map((c) => ({ ...c, log: [] })),
      },
      notes,
      roles,
    };
  }

  /** Cria/atualiza um workspace a partir de um bundle `.terminalmanager` (ou `.maestri`) importado. */
  importWorkspace(bundle) {
    const isApp = bundle && (bundle.app === "terminalmanager" || bundle.app === "maestri");
    const isFormat = bundle && (bundle.format === "terminalmanager-bundle" || bundle.format === "maestri-bundle");
    if (!bundle || !isApp || !isFormat) return null;
    const src = bundle.workspace || {};
    const id = `ws_${randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();
    let name = src.name || "Workspace";
    if (this.workspaces.has(id)) name = `${name} (importado)`;
    const ws = {
      id,
      name,
      icon: src.icon || "",
      workingDir: "", // religado pelo usuário após import
      instructions: src.instructions || { source: "none", syncBetween: false },
      groups: Array.isArray(src.groups) ? src.groups : [],
      nodes: [],
      connections: Array.isArray(src.connections) ? src.connections.map((c) => ({ ...c, id: `conn_${randomUUID().slice(0, 8)}`, log: [] })) : [],
      createdAt: now,
      updatedAt: now,
      lastActiveAt: 0,
    };
    for (const n of src.nodes || []) {
      const copy = { ...n };
      copy.workspaceId = id;
      if (copy.type === "note" && this.noteStore) {
        copy.internal = true;
        copy.filePath = this.noteStore.create(id, copy.id, { title: copy.title });
        const content = (bundle.notes && bundle.notes[copy.id]) || "";
        this.noteStore.write(copy.filePath, content);
      }
      delete copy.workspaceId;
      ws.nodes.push(copy);
    }
    // Roles referenciadas no bundle
    if (Array.isArray(bundle.roles)) {
      const existing = new Set((this.settings.roles || []).map((r) => r.id));
      for (const role of bundle.roles) {
        if (!existing.has(role.id)) {
          this.settings.roles.push({ ...role });
          existing.add(role.id);
        }
      }
    }
    this.workspaces.set(id, ws);
    this.saveLayout();
    return id;
  }

  list() {
    const out = [];
    for (const t of this.terminals.values()) {
      if (t.workspaceId !== this.activeWorkspaceId) continue;
      out.push(this.serialize(t));
    }
    return out;
  }

  get(id) {
    return this.terminals.get(id);
  }

  setStyle(id, style) {
    const t = this.terminals.get(id);
    if (!t || t.workspaceId !== this.activeWorkspaceId) return false;
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
    if (t && t.workspaceId === this.activeWorkspaceId) {
      t.title = title || t.title;
      this.saveLayout();
      return this.serialize(t);
    }
    const node = this.nodes.get(id);
    if (node && node.workspaceId === this.activeWorkspaceId) {
      node.title = title || node.title;
      this.saveLayout();
      return node;
    }
    return null;
  }

  kill(id) {
    return this.removeNode(id);
  }

  /* Aliases legados "Floor/Workflow" — removidos após US1 migrar o renderer */
  get activeWorkflowId() {
    return this.activeWorkspaceId;
  }

  listWorkflows() {
    return [...this.workspaces.values()].map((ws) => ({ id: ws.id, name: ws.name, nodeCount: (ws.nodes || []).length }));
  }

  createWorkflow(name) {
    return this.createWorkspace({ name });
  }

  switchWorkflow(workflowId) {
    return this.switchWorkspace(workflowId);
  }

  renameWorkflow(workflowId, name) {
    return this.renameWorkspace(workflowId, { name });
  }

  deleteWorkflow(workflowId) {
    return this.deleteWorkspace(workflowId);
  }

  loadWorkflow(workflowId) {
    return this.loadWorkspace(workflowId);
  }
}
