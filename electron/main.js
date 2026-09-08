import { app, BrowserWindow, ipcMain, Notification, shell, dialog } from "electron";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync } from "node:fs";
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
    folders: manager.listFolders(),
    groups: manager.listGroups(),
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
    case "folder_create":
      manager.createFolder({ name: msg.name });
      broadcastLayout();
      break;
    case "folder_delete":
      manager.deleteFolder(msg.folderId);
      broadcastLayout();
      break;
    case "folder_toggle":
      manager.toggleFolder(msg.folderId, msg.collapsed);
      broadcastLayout();
      break;
    case "folders_save":
      if (Array.isArray(msg.folders)) {
        manager.folders = msg.folders;
        if (manager.ui) manager.ui.folders = msg.folders;
        manager.saveLayout();
        broadcastLayout();
      }
      break;
    case "sidebar_section":
      manager.sidebarSection(msg.action, msg);
      broadcastLayout();
      break;
    case "group_create":
      manager.createGroup({ name: msg.name, order: msg.order });
      broadcastLayout();
      break;
    case "group_delete":
      manager.deleteGroup(msg.groupId);
      broadcastLayout();
      break;
    case "groups_save":
      if (Array.isArray(msg.groups)) {
        manager.groups = msg.groups;
        if (manager.ui) manager.ui.sections = msg.groups;
        manager.saveLayout();
        broadcastLayout();
      }
      break;
    case "sidebar_collapse":
      manager.updateUi({ sidebar: { ...(manager.ui.sidebar || {}), collapsed: !!msg.collapsed } });
      broadcastLayout();
      break;
    case "settings_save":
      manager.updateSettings(msg.settings || {});
      broadcastLayout();
      break;
    case "workspace_export": {
      const ws = manager.workspaces.get(msg.workspaceId);
      const name = (ws && ws.name) || "workspace";
      const bundle = manager.exportWorkspace(msg.workspaceId);
      if (!bundle) {
        broadcast({ type: "workspace_export_result", ok: false, error: "Workspace não encontrado." });
        break;
      }
      dialog
        .showSaveDialog({ title: "Exportar workspace", defaultPath: `${name}.maestri`, filters: [{ name: "Maestri workspace", extensions: ["maestri"] }] })
        .then((result) => {
          if (result.canceled || !result.filePath) {
            broadcast({ type: "workspace_export_result", ok: false, canceled: true });
            return;
          }
          try {
            writeFileSync(result.filePath, JSON.stringify(bundle, null, 2), "utf8");
            broadcast({ type: "workspace_export_result", ok: true, path: result.filePath });
          } catch (err) {
            broadcast({ type: "workspace_export_result", ok: false, error: err.message });
          }
        })
        .catch(() => broadcast({ type: "workspace_export_result", ok: false, canceled: true }));
      break;
    }
    case "workspace_import": {
      dialog
        .showOpenDialog({
          title: "Importar workspace (.maestri)",
          properties: ["openFile"],
          filters: [{ name: "Maestri workspace", extensions: ["maestri"] }],
        })
        .then((result) => {
          if (result.canceled || !result.filePaths[0]) {
            broadcast({ type: "workspace_import_result", ok: false, canceled: true });
            return;
          }
          try {
            const bundle = JSON.parse(readFileSync(result.filePaths[0], "utf8"));
            const id = manager.importWorkspace(bundle);
            if (!id) {
              broadcast({ type: "workspace_import_result", ok: false, error: "Arquivo .maestri inválido." });
              return;
            }
            manager.switchWorkspace(id);
            broadcastLayout();
            broadcast({ type: "workspace_import_result", ok: true, workspaceId: id, name: manager.workspaces.get(id).name });
          } catch (err) {
            broadcast({ type: "workspace_import_result", ok: false, error: err.message });
          }
        })
        .catch(() => broadcast({ type: "workspace_import_result", ok: false, canceled: true }));
      break;
    }
    case "pick_ghostty_theme": {
      dialog
        .showOpenDialog({ title: "Importar tema Ghostty", properties: ["openFile"], filters: [{ name: "Ghostty theme", extensions: ["json"] }] })
        .then((result) => {
          if (result.canceled || !result.filePaths[0]) {
            broadcast({ type: "ghostty_theme", canceled: true, theme: null });
            return;
          }
          try {
            const theme = JSON.parse(readFileSync(result.filePaths[0], "utf8"));
            broadcast({ type: "ghostty_theme", canceled: false, theme });
          } catch (err) {
            broadcast({ type: "ghostty_theme", canceled: true, error: err.message });
          }
        })
        .catch(() => broadcast({ type: "ghostty_theme", canceled: true }));
      break;
    }
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
    case "note_save_image": {
      const res = manager.noteSaveImage(msg.nodeId, msg.bufferBase64, msg.extension);
      broadcast({ type: "note_image_saved", nodeId: msg.nodeId, relativePath: res.relativePath, fullPath: res.fullPath, ok: res.ok, error: res.error });
      break;
    }
    case "binder_create": {
      const b = manager.binderCreate(msg);
      broadcastLayout();
      broadcast({ type: "binder_created", node: b });
      break;
    }
    case "binder_add_page": {
      const b = manager.binderAddPage(msg.binderId, msg.noteId);
      broadcastLayout();
      broadcast({ type: "binder_updated", node: b });
      break;
    }
    case "binder_remove_page": {
      const res = manager.binderRemovePage(msg.binderId, msg.noteId, msg.x, msg.y);
      broadcastLayout();
      broadcast({ type: "binder_page_removed", ...res, noteId: msg.noteId });
      break;
    }
    case "binder_reorder": {
      const b = manager.binderReorder(msg.binderId, msg.pageIds);
      broadcastLayout();
      break;
    }
    case "binder_uniform_color": {
      const b = manager.binderUniformColor(msg.binderId, msg.color);
      broadcastLayout();
      break;
    }
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

  win.webContents.on("console-message", (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message} (${sourceId}:${line})`);
  });

  win.loadFile(join(__dirname, "..", "public", "index.html"));
}

function openFromUrl(url) {
  try {
    const u = new URL(url);
    const wsId = u.searchParams.get("workspace");
    if (wsId && manager && manager.workspaces.has(wsId)) {
      manager.switchWorkspace(wsId);
      broadcastLayout();
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    }
  } catch {}
}

// Deep link maestri:// (Spotlight / navegador) — FR-051
app.on("open-url", (e, url) => {
  e.preventDefault();
  openFromUrl(url);
});

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

  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient("maestri", process.execPath, [process.argv[1]]);
    }
  } else {
    app.setAsDefaultProtocolClient("maestri");
  }

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
