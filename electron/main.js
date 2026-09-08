import { app, BrowserWindow, ipcMain, Notification, shell, dialog } from "electron";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { TerminalManager } from "./terminal-manager.js";
import { detectAgents } from "./agent-cli.js";
import { readDir, fsCrud, gitOps, gitDiff, gitGraph, readFileText, writeFileText, fileSearch } from "./filetree-service.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

let manager = null;
const windows = new Set();
let mainWindow = null;

function broadcast(msg) {
  const payload = JSON.stringify(msg);
  for (const win of windows) {
    if (!win.isDestroyed()) {
      win.webContents.send("msg", payload);
    }
  }
}

function showNotification({ id, title, body }) {
  if (!Notification.isSupported()) return;

  const notif = new Notification({
    title: title || "Terminal Manager",
    body: body || "Atividade no terminal concluída.",
    silent: false,
  });

  notif.on("click", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
      broadcast({ type: "focus_terminal", id });
    }
  });

  notif.show();
}

function broadcastLayout() {
  broadcast({
    type: "layout",
    nodes: manager.listNodes(),
    terminals: manager.list(), // legacy compatibility
    connections: manager.listConnections(),
    activeWorkspaceId: manager.activeWorkspaceId,
    workspaces: manager.listWorkspaces(),
    ui: manager.ui,
    settings: manager.settings,
    roles: manager.settings.roles || [],
    // Legacy "Floor/Workflow" (1 release) — removido após US1
    activeWorkflowId: manager.activeWorkspaceId,
    workflows: manager.listWorkflows(),
  });
}

function handleMessage(msg) {
  if (!msg || typeof msg.type !== "string") return;
  switch (msg.type) {
    case "layout_request":
      broadcastLayout();
      break;
    case "create": {
      const t = manager.create(msg.layout || {});
      broadcast({ type: "created", terminal: t });
      break;
    }
    case "create_node": {
      if (msg.node && msg.node.type === "terminal") {
        const t = manager.create(msg.node || {});
        broadcast({ type: "created", terminal: t });
        break;
      }
      const n = manager.createNode(msg.node || {});
      broadcast({ type: "node_created", node: n });
      break;
    }
    case "input":
      manager.input(msg.id, msg.data);
      break;
    case "resize":
      manager.resize(msg.id, msg.cols, msg.rows, msg.width, msg.height);
      break;
    case "move":
      if (manager.move(msg.id, msg.x, msg.y)) {
        broadcast({ type: "moved", id: msg.id, x: msg.x, y: msg.y });
      }
      break;
    case "rename": {
      const t = manager.rename(msg.id, msg.title);
      if (t) {
        broadcast({ type: "renamed", id: msg.id, title: t.title });
      }
      break;
    }
    case "style": {
      const style = manager.setStyle(msg.id, msg.style || {});
      if (style) {
        broadcast({ type: "styled", id: msg.id, style });
      }
      break;
    }
    case "kill":
    case "remove_node":
      if (manager.removeNode(msg.id)) {
        broadcast({ type: "node_removed", id: msg.id });
        broadcast({ type: "killed", id: msg.id });
      }
      break;
    case "update_node":
      manager.updateNodeConfig(msg.id, msg.config);
      break;
    case "dir_pick": {
      const opts = {
        title: "Selecionar diretório do workspace",
        properties: ["openDirectory", "createDirectory"],
      };
      dialog.showOpenDialog(opts).then((result) => {
        broadcast({
          type: "dir_picked",
          canceled: result.canceled,
          path: result.canceled ? null : result.filePaths[0],
        });
      }).catch(() => {
        broadcast({ type: "dir_picked", canceled: true, path: null });
      });
      break;
    }
    case "workspace_create":
      manager.createWorkspace({ name: msg.name, workingDir: msg.workingDir, icon: msg.icon });
      broadcastLayout();
      break;
    case "workspace_switch":
      manager.switchWorkspace(msg.workspaceId);
      broadcastLayout();
      break;
    case "workspace_rename":
      manager.renameWorkspace(msg.workspaceId, { name: msg.name, icon: msg.icon });
      broadcastLayout();
      break;
    case "workspace_set_dir":
      manager.setWorkspaceDir(msg.workspaceId, msg.workingDir);
      broadcastLayout();
      break;
    case "workspace_delete":
      manager.deleteWorkspace(msg.workspaceId);
      broadcastLayout();
      break;
    case "workspace_instructions":
      manager.setWorkspaceInstructions(msg.workspaceId, {
        claudeMd: msg.content && msg.content.claudeMd,
        agentsMd: msg.content && msg.content.agentsMd,
        syncBetween: msg.syncBetween,
      });
      broadcastLayout();
      break;
    case "sidebar_folder":
      manager.sidebarFolder(msg.action, msg);
      broadcastLayout();
      break;
    case "sidebar_section":
      manager.sidebarSection(msg.action, msg);
      broadcastLayout();
      break;
    case "sidebar_collapse":
      manager.updateUi({ sidebar: { ...(manager.ui.sidebar || {}), collapsed: !!msg.collapsed } });
      broadcastLayout();
      break;
    case "settings_save":
      manager.updateSettings(msg.settings || {});
      broadcastLayout();
      break;
    case "agent_list_request":
      broadcast({ type: "agent_list", agents: detectAgents() });
      break;
    case "roles_save":
      manager.saveRoles(msg.roles || []);
      broadcastLayout();
      break;
    case "role_assign":
      manager.assignRole(msg.nodeId, msg.roleId);
      break;
    case "workflow_create":
      manager.createWorkflow(msg.name);
      broadcastLayout();
      break;
    case "workflow_switch":
      manager.switchWorkflow(msg.workflowId);
      broadcastLayout();
      break;
    case "workflow_rename":
      manager.renameWorkflow(msg.workflowId, msg.name);
      broadcastLayout();
      break;
    case "workflow_delete":
      manager.deleteWorkflow(msg.workflowId);
      broadcastLayout();
      break;
    case "open_vscode": {
      const targetPath = msg.path || process.cwd();
      import("node:child_process").then(({ exec }) => {
        exec(`code "${targetPath}"`, (err) => {
          if (err) shell.openPath(targetPath);
        });
      });
      break;
    }
    case "create_connection": {
      const conn = manager.addConnection(msg);
      if (conn) {
        broadcast({ type: "connection_created", connection: conn });
      }
      break;
    }
    case "remove_connection":
      if (manager.removeConnection(msg.id)) {
        broadcast({ type: "connection_removed", id: msg.id });
      }
      break;
    case "connection_style": {
      const c = manager.updateConnection(msg.id, { style: msg.style === "circuit" ? "circuit" : "rope" });
      if (c) broadcast({ type: "connection_updated", connection: c });
      break;
    }
    case "connection_bundle": {
      const ids = Array.isArray(msg.connectionIds) ? msg.connectionIds : [];
      const bundleId = msg.action === "create" ? `bundle_${Date.now().toString(36)}` : null;
      for (const id of ids) {
        const c = manager.updateConnection(id, bundleId ? { bundleId } : { bundleId: null });
        if (c) broadcast({ type: "connection_updated", connection: c });
      }
      break;
    }
    case "note_read": {
      const content = manager.noteRead(msg.nodeId);
      broadcast({ type: "note_read_result", nodeId: msg.nodeId, content });
      break;
    }
    case "note_content":
      manager.noteWrite(msg.nodeId, msg.content);
      break;
    case "note_move": {
      const filePath = manager.noteMoveToProject(msg.nodeId);
      broadcast({ type: "note_moved", nodeId: msg.nodeId, filePath, internal: false, ok: !!filePath });
      break;
    }
    case "note_pinned":
      manager.noteSetPinned(msg.nodeId, !!msg.pinned);
      break;
    case "fs_read_dir": {
      const res = readDir(msg.path);
      broadcast({ type: "fs_dir_result", nodeId: msg.nodeId, path: msg.path, ...res });
      break;
    }
    case "fs_crud": {
      const res = fsCrud(msg.action, { path: msg.path, newName: msg.newName, toPath: msg.toPath });
      broadcast({ type: "fs_crud_result", nodeId: msg.nodeId, action: msg.action, ok: res.ok, error: res.error || null });
      break;
    }
    case "git_ops": {
      gitOps(msg.cwd, msg.action, { branch: msg.branch, message: msg.message }).then((res) => {
        broadcast({ type: "git_result", nodeId: msg.nodeId, action: msg.action, ok: res.ok, error: res.error || null, data: res });
      });
      break;
    }
    case "git_diff": {
      gitDiff(msg.cwd, msg.file).then((res) => {
        broadcast({ type: "diff_result", nodeId: msg.nodeId, file: msg.file || null, ok: res.ok, text: res.ok ? res.out : res.err });
      });
      break;
    }
    case "git_graph": {
      gitGraph(msg.cwd).then((res) => {
        broadcast({ type: "graph_result", nodeId: msg.nodeId, ok: res.ok, text: res.ok ? res.out : res.err });
      });
      break;
    }
    case "file_read": {
      const content = msg.path ? readFileText(msg.path) : "";
      broadcast({ type: "file_read_result", nodeId: msg.nodeId, path: msg.path, content });
      break;
    }
    case "file_write":
      if (msg.path) writeFileText(msg.path, msg.content);
      break;
    case "file_search": {
      fileSearch(msg.cwd, msg.query, !!msg.byContent).then((res) => {
        broadcast({
          type: "file_search_result",
          query: msg.query,
          byContent: !!msg.byContent,
          ok: res.ok,
          matches: res.matches || [],
          error: res.error || null,
        });
      });
      break;
    }
    case "notify":
      showNotification({
        id: msg.terminalId,
        title: msg.title,
        body: msg.body,
      });
      break;
    case "open_external":
      if (msg.url && typeof msg.url === "string") {
        let target = msg.url;
        try {
          new URL(target);
        } catch {
          target = `https://${target}`;
        }
        try {
          shell.openExternal(target).catch((err) => console.error("Erro ao abrir URL externa:", err));
        } catch (err) {
          console.error("Erro ao abrir URL externa:", err);
        }
      }
      break;
    default:
      break;
  }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: "terminal manager",
    backgroundColor: "#f7f7f5",
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });
  win.removeMenu();
  windows.add(win);
  mainWindow = win;
  win.on("closed", () => {
    windows.delete(win);
    if (mainWindow === win) mainWindow = null;
  });

  win.webContents.on("before-input-event", (event, input) => {
    if (
      input.key === "F12" ||
      ((input.control || input.meta) && input.alt && input.key.toLowerCase() === "i")
    ) {
      win.webContents.toggleDevTools();
    }
  });

  win.loadFile(join(__dirname, "..", "public", "index.html"));
}

app.whenReady().then(() => {
  if (process.platform === "win32") {
    app.setAppUserModelId("com.diego.terminalmanager");
  }

  manager = new TerminalManager({
    stateFile: join(app.getPath("userData"), "state.json"),
  });
  manager.setBroadcast(broadcast);
  manager.setNotify(showNotification);
  manager.restore();

  ipcMain.on("msg", (event, payload) => {
    let msg;
    try {
      msg = JSON.parse(payload);
    } catch {
      return;
    }
    handleMessage(msg);
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  app.quit();
});
