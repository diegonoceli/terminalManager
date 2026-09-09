import { app, BrowserWindow, ipcMain, Notification, shell, dialog, session, Menu } from "electron";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync, writeFileSync, existsSync, mkdirSync, watch, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { execFile, exec } from "node:child_process";
import { randomUUID } from "node:crypto";
import { TerminalManager } from "./terminal-manager.js";
import { detectAgents, executeMaestriCli } from "./agent-cli.js";
import { readDir, fsCrud, gitOps, gitDiff, gitGraph, readFileText, writeFileText, fileSearch } from "./filetree-service.js";
import { updateSpotlightIndex } from "./spotlight-service.js";
import { DeviceManager } from "./device-manager.js";
import { discoverRoles } from "./roles.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

let manager = null;
const deviceManager = new DeviceManager();
const windows = new Set();
let mainWindow = null;

let instructionWatcher = null;
let isSyncingInstructions = false;

function setupInstructionWatcher() {
  if (instructionWatcher) {
    try { instructionWatcher.close(); } catch {}
    instructionWatcher = null;
  }
  const ws = manager ? manager.currentWorkspace() : null;
  if (!ws || !ws.workingDir || !ws.instructions?.syncBetween || !existsSync(ws.workingDir)) return;

  try {
    instructionWatcher = watch(ws.workingDir, (eventType, filename) => {
      if (isSyncingInstructions) return;
      if (filename === "CLAUDE.md" || filename === "AGENTS.md") {
        isSyncingInstructions = true;
        setTimeout(() => {
          try {
            const claudePath = join(ws.workingDir, "CLAUDE.md");
            const agentsPath = join(ws.workingDir, "AGENTS.md");
            if (filename === "CLAUDE.md" && existsSync(claudePath)) {
              const content = readFileSync(claudePath, "utf8");
              writeFileSync(agentsPath, content, "utf8");
              manager.setWorkspaceInstructions(ws.id, { claudeMd: content, agentsMd: content, syncBetween: true });
            } else if (filename === "AGENTS.md" && existsSync(agentsPath)) {
              const content = readFileSync(agentsPath, "utf8");
              writeFileSync(claudePath, content, "utf8");
              manager.setWorkspaceInstructions(ws.id, { claudeMd: content, agentsMd: content, syncBetween: true });
            }
          } catch {}
          isSyncingInstructions = false;
        }, 300);
      }
    });
  } catch {}
}

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
  const currentWs = manager ? manager.currentWorkspace() : null;
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
    floors: currentWs?.floors || [],
    activeFloorId: currentWs?.activeFloorId || (currentWs ? `floor_ground_${currentWs.id}` : "floor_ground_default"),
    cableTies: currentWs?.cableTies || [],
    canvasGroups: currentWs?.groups || [],
    drafts: currentWs?.drafts || {},
    // Legacy "Floor/Workflow" (1 release) — removido após US1
    activeWorkflowId: manager.activeWorkspaceId,
    workflows: manager.listWorkflows(),
  });
  if (app && app.isReady()) {
    updateSpotlightIndex(manager, app.getPath("userData"));
    setupInstructionWatcher();
  }
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
    case "folder_rename":
      manager.renameFolder(msg.folderId, msg.name);
      broadcastLayout();
      break;
    case "folder_toggle":
      manager.toggleFolder(msg.folderId, msg.collapsed);
      broadcastLayout();
      break;
    case "folder_add_workspace":
      manager.addWorkspaceToFolder(msg.folderId, msg.workspaceId);
      broadcastLayout();
      break;
    case "folder_remove_workspace":
      manager.removeWorkspaceFromFolder(msg.workspaceId);
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
    case "group_rename":
      manager.renameGroup(msg.groupId, msg.name);
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
    case "list_custom_themes": {
      const themesDir = join(homedir(), ".maestri", "terminal", "themes");
      const list = [];
      if (existsSync(themesDir)) {
        try {
          const files = readdirSync(themesDir, { withFileTypes: true });
          for (const f of files) {
            if (f.isFile() && f.name.endsWith(".json")) {
              try {
                const content = JSON.parse(readFileSync(join(themesDir, f.name), "utf8"));
                list.push({ name: f.name.replace(/\.json$/i, ""), theme: content });
              } catch {}
            }
          }
        } catch {}
      }
      broadcast({ type: "custom_themes_list", themes: list });
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
      const content = manager.noteRead(msg.nodeId, { chain: !!msg.chain });
      broadcast({ type: "note_read_result", nodeId: msg.nodeId, content, chain: !!msg.chain });
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
    case "terminal_selected":
      manager.setTerminalSelected(msg.terminalId, msg.selected);
      break;
    case "agent_msg_send": {
      const res = manager.sendAgentMessage(msg.fromTerminalId, msg.toTerminalId, msg.prompt);
      broadcast({ type: "agent_msg_sent", ...res });
      break;
    }
    case "cli_execute": {
      executeMaestriCli(msg.args || [], { manager, deviceManager }).then((result) => {
        broadcast({ type: "cli_result", reqId: msg.reqId, ...result });
      });
      break;
    }
    case "role_discover": {
      const dir = msg.workingDir || manager.currentWorkspace()?.workingDir;
      const discovered = discoverRoles(dir);
      broadcast({ type: "roles_discovered", roles: discovered });
      break;
    }
    case "portal_device_list":
      deviceManager.listDevices().then((devices) => {
        broadcast({ type: "portal_device_list_result", devices });
      });
      break;
    case "portal_device_boot":
      deviceManager.bootDevice(msg.deviceId, msg.platform).then((res) => {
        broadcast({ type: "portal_device_boot_result", ...res, deviceId: msg.deviceId });
      });
      break;
    case "portal_device_action":
      deviceManager.performAction(msg.deviceId, msg.platform, msg.action, msg.params).then((res) => {
        broadcast({ type: "portal_device_action_result", ...res, deviceId: msg.deviceId });
      });
      break;
    case "portal_device_tree":
      deviceManager.getAccessibilityTree(msg.deviceId, msg.platform).then((res) => {
        broadcast({ type: "portal_device_tree_result", ...res, deviceId: msg.deviceId });
      });
      break;
    case "portal_sync_cookies": {
      const fromPart = msg.fromPartition;
      const toPart = msg.toPartition;
      if (fromPart && toPart && session) {
        const sFrom = session.fromPartition(fromPart);
        const sTo = session.fromPartition(toPart);
        sFrom.cookies.get({}).then(async (cookies) => {
          for (const c of cookies) {
            const protocol = c.secure ? "https://" : "http://";
            const domain = c.domain && c.domain.startsWith(".") ? c.domain.slice(1) : (c.domain || "localhost");
            const url = `${protocol}${domain}${c.path || "/"}`;
            await sTo.cookies.set({
              url,
              name: c.name,
              value: c.value,
              domain: c.domain,
              path: c.path,
              secure: c.secure,
              httpOnly: c.httpOnly,
              expirationDate: c.expirationDate,
            }).catch(() => {});
          }
          broadcast({ type: "portal_sync_cookies_result", ok: true, from: fromPart, to: toPart });
        }).catch((err) => {
          broadcast({ type: "portal_sync_cookies_result", ok: false, error: err.message });
        });
      }
      break;
    }
    case "portal_action_response": {
      if (manager && typeof manager.handlePortalActionResponse === "function") {
        manager.handlePortalActionResponse(msg);
      }
      break;
    }
    case "floor_create": {
      const ws = manager.workspaces.get(msg.workspaceId) || manager.currentWorkspace();
      if (ws) {
        if (!Array.isArray(ws.floors)) ws.floors = [];
        const floorId = `floor_${randomUUID().slice(0, 8)}`;
        const floorDir = ws.workingDir ? join(ws.workingDir, ".maestri", "floors", floorId) : "";
        const newFloor = {
          id: floorId,
          name: msg.name || `Andar ${ws.floors.length + 1}`,
          branch: msg.branch || "main",
          floorPath: floorDir,
          isGroundFloor: false,
          canvasTransform: { x: 0, y: 0, zoom: 1 },
          hooks: msg.hooks || { setup: [], run: [], teardown: [] },
        };
        if (ws.workingDir && existsSync(ws.workingDir)) {
          try {
            mkdirSync(join(ws.workingDir, ".maestri", "floors"), { recursive: true });
            if (process.platform === "darwin") {
              execFile("cp", ["-c", "-R", ws.workingDir, floorDir], () => {});
            } else {
              const branchName = msg.branch || `floor-${floorId}`;
              execFile("git", ["worktree", "add", "-b", branchName, floorDir], { cwd: ws.workingDir }, (err) => {
                if (err) {
                  execFile("cp", ["-R", ws.workingDir, floorDir], () => {});
                }
              });
            }
          } catch {}
        }
        if (msg.cloneGroundLayout) {
          const groundNodes = (ws.nodes || []).map((n) => ({ ...n, id: `node_${randomUUID().slice(0, 8)}`, floorId }));
          ws.nodes = [...ws.nodes, ...groundNodes];
        }
        ws.floors.push(newFloor);
        ws.activeFloorId = floorId;
        manager.saveLayout();
        broadcastLayout();
      }
      break;
    }
    case "floor_switch": {
      const ws = manager.currentWorkspace();
      if (ws && Array.isArray(ws.floors) && ws.floors.some((f) => f.id === msg.floorId)) {
        ws.activeFloorId = msg.floorId;
        manager.saveLayout();
        broadcastLayout();
      }
      break;
    }
    case "floor_delete": {
      const ws = manager.currentWorkspace();
      if (ws && Array.isArray(ws.floors)) {
        const target = ws.floors.find((f) => f.id === msg.floorId);
        if (target && !target.isGroundFloor) {
          ws.floors = ws.floors.filter((f) => f.id !== msg.floorId);
          if (ws.activeFloorId === msg.floorId) {
            const ground = ws.floors.find((f) => f.isGroundFloor) || ws.floors[0];
            ws.activeFloorId = ground ? ground.id : null;
          }
          manager.saveLayout();
          broadcastLayout();
        }
      }
      break;
    }
    case "floor_hook_run": {
      const ws = manager.currentWorkspace();
      const floor = ws?.floors?.find((f) => f.id === msg.floorId) || ws?.floors?.[0];
      if (!floor) {
        broadcast({ type: "floor_hook_result", floorId: msg.floorId, ok: false, error: "Andar não encontrado." });
        break;
      }
      const hooksList = floor.hooks?.[msg.hookType] || [];
      const cmd = Array.isArray(hooksList) ? hooksList.join(" && ") : hooksList;
      if (!cmd || !cmd.trim()) {
        broadcast({
          type: "floor_hook_result",
          floorId: floor.id,
          hookType: msg.hookType,
          ok: true,
          output: "Nenhum comando configurado para este hook.",
        });
        break;
      }
      const targetDir = floor.floorPath && existsSync(floor.floorPath) ? floor.floorPath : (ws.workingDir || process.cwd());
      const env = {
        ...process.env,
        MAESTRI_FLOOR_NAME: floor.name || "",
        MAESTRI_FLOOR_ID: floor.id || "",
        MAESTRI_FLOOR_BRANCH: floor.branch || "",
        MAESTRI_WORKSPACE_DIR: ws.workingDir || "",
      };
      exec(cmd, { cwd: targetDir, env }, (err, stdout, stderr) => {
        broadcast({
          type: "floor_hook_result",
          floorId: floor.id,
          hookType: msg.hookType,
          ok: !err,
          output: (stdout || "") + (stderr ? "\n" + stderr : ""),
          error: err ? err.message : null,
        });
      });
      break;
    }
    case "floor_landing_preview": {
      const ws = manager.currentWorkspace();
      const floor = ws?.floors?.find((f) => f.id === msg.floorId);
      const ground = ws?.floors?.find((f) => f.isGroundFloor) || ws?.floors?.[0];
      const repoDir = ws?.workingDir || process.cwd();
      const groundBranch = ground?.branch || "main";
      const floorBranch = floor?.branch || "main";

      if (!floor || floor.isGroundFloor) {
        broadcast({ type: "floor_landing_preview_result", floorId: msg.floorId, ok: false, error: "O andar térreo não requer aterrissagem." });
        break;
      }

      execFile("git", ["log", `${groundBranch}..${floorBranch}`, "--oneline"], { cwd: repoDir }, (err1, stdoutCommits) => {
        const commits = (stdoutCommits || "").trim().split("\n").filter(Boolean);
        execFile("git", ["diff", `${groundBranch}...${floorBranch}`], { cwd: repoDir }, (err2, stdoutDiff) => {
          execFile("git", ["merge-tree", groundBranch, floorBranch], { cwd: repoDir }, (err3, stdoutTree) => {
            const hasConflict = (stdoutTree || "").includes("<<<<<<<");
            broadcast({
              type: "floor_landing_preview_result",
              floorId: floor.id,
              groundBranch,
              floorBranch,
              commits,
              diff: stdoutDiff || "(Nenhuma alteração de código detectada)",
              hasConflict,
              ok: true,
            });
          });
        });
      });
      break;
    }
    case "floor_landing_merge": {
      const ws = manager.currentWorkspace();
      const floor = ws?.floors?.find((f) => f.id === msg.floorId);
      const ground = ws?.floors?.find((f) => f.isGroundFloor) || ws?.floors?.[0];
      const repoDir = ws?.workingDir || process.cwd();
      const groundBranch = ground?.branch || "main";
      const floorBranch = floor?.branch || "main";

      execFile("git", ["checkout", groundBranch], { cwd: repoDir }, (errCheckout) => {
        if (errCheckout) {
          broadcast({ type: "floor_landing_merge_result", floorId: msg.floorId, ok: false, error: errCheckout.message });
          return;
        }
        execFile("git", ["merge", floorBranch, "--no-ff", "-m", `Landing floor ${floor?.name || ''} (${floorBranch}) into ${groundBranch}`], { cwd: repoDir }, (errMerge, stdout, stderr) => {
          if (errMerge) {
            broadcast({ type: "floor_landing_merge_result", floorId: msg.floorId, ok: false, error: errMerge.message + (stderr ? ": " + stderr : "") });
          } else {
            if (floor?.hooks?.teardown?.length) {
              const teardownCmd = Array.isArray(floor.hooks.teardown) ? floor.hooks.teardown.join(" && ") : floor.hooks.teardown;
              exec(teardownCmd, { cwd: repoDir });
            }
            if (ground) ws.activeFloorId = ground.id;
            manager.saveLayout();
            broadcastLayout();
            broadcast({ type: "floor_landing_merge_result", floorId: msg.floorId, ok: true, output: stdout || "Merge concluído com sucesso!" });
          }
        });
      });
      break;
    }
    case "cable_tie_create":
    case "cable_tie_delete": {
      const ws = manager.currentWorkspace();
      if (ws) {
        if (!Array.isArray(ws.cableTies)) ws.cableTies = [];
        if (msg.type === "cable_tie_create") {
          ws.cableTies.push({
            id: msg.id || `tie_${randomUUID().slice(0, 8)}`,
            floorId: ws.activeFloorId,
            connectionIds: msg.connectionIds || [],
            positionRatio: msg.positionRatio || 0.5,
          });
        } else {
          ws.cableTies = ws.cableTies.filter((t) => t.id !== msg.id);
        }
        manager.saveLayout();
        broadcastLayout();
      }
      break;
    }
    case "prompt_draft_save": {
      const ws = manager.currentWorkspace();
      if (ws && msg.terminalId) {
        if (!ws.drafts) ws.drafts = {};
        ws.drafts[msg.terminalId] = {
          text: msg.text || "",
          pills: msg.pills || [],
          updatedAt: new Date().toISOString(),
        };
        manager.saveLayout();
      }
      break;
    }
    case "prompt_draft_get": {
      const ws = manager.currentWorkspace();
      const draft = ws?.drafts?.[msg.terminalId] || null;
      broadcast({ type: "prompt_draft_loaded", terminalId: msg.terminalId, draft });
      break;
    }
    case "canvas_group_create": {
      const ws = manager.currentWorkspace();
      if (ws) {
        if (!Array.isArray(ws.groups)) ws.groups = [];
        const gid = msg.id || `grp_${randomUUID().slice(0, 8)}`;
        ws.groups.push({
          id: gid,
          title: msg.title || `Grupo ${ws.groups.length + 1}`,
          memberNodeIds: msg.memberNodeIds || [],
          floorId: ws.activeFloorId,
        });
        manager.saveLayout();
        broadcastLayout();
      }
      break;
    }
    case "canvas_group_delete": {
      const ws = manager.currentWorkspace();
      if (ws && Array.isArray(ws.groups)) {
        ws.groups = ws.groups.filter((g) => g.id !== msg.groupId);
        manager.saveLayout();
        broadcastLayout();
      }
      break;
    }
    default:
      break;
  }
}

function setupAppMenu() {
  const template = [
    ...(process.platform === "darwin" ? [{ role: "appMenu" }] : []),
    {
      label: "Editar",
      submenu: [
        { role: "undo", label: "Desfazer" },
        { role: "redo", label: "Refazer" },
        { type: "separator" },
        { role: "cut", label: "Recortar" },
        { role: "copy", label: "Copiar" },
        { role: "paste", label: "Colar" },
        { role: "selectAll", label: "Selecionar Tudo" },
      ],
    },
    { role: "viewMenu" },
    { role: "windowMenu" },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  setupAppMenu();
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: "terminal manager",
    backgroundColor: "#f7f7f5",
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });
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

  win.webContents.on("did-finish-load", () => {
    if (pendingUrl) {
      setTimeout(() => {
        openFromUrl(pendingUrl);
        pendingUrl = null;
      }, 250);
    }
  });

  win.loadFile(join(__dirname, "..", "public", "index.html"));
}

let pendingUrl = null;

function openFromUrl(rawUrl) {
  try {
    if (!rawUrl || typeof rawUrl !== "string") return;
    const u = new URL(rawUrl);
    let wsId = u.searchParams.get("workspace");
    let nodeId = u.searchParams.get("node");

    if (!wsId && u.hostname === "workspace") {
      const parts = u.pathname.split("/").filter(Boolean);
      wsId = parts[0];
      if (parts[1] === "node") nodeId = parts[2];
    } else if (!wsId && u.pathname) {
      const parts = u.pathname.split("/").filter(Boolean);
      const wsIdx = parts.indexOf("workspace");
      if (wsIdx >= 0 && parts[wsIdx + 1]) wsId = parts[wsIdx + 1];
      const nodeIdx = parts.indexOf("node");
      if (nodeIdx >= 0 && parts[nodeIdx + 1]) nodeId = parts[nodeIdx + 1];
    }

    if (!wsId && manager) {
      if (nodeId) {
        for (const [id, ws] of manager.workspaces.entries()) {
          if ((ws.nodes || []).some((n) => n.id === nodeId)) {
            wsId = id;
            break;
          }
        }
      }
      if (!wsId) wsId = manager.activeWorkspaceId;
    }

    if (wsId && manager && manager.workspaces.has(wsId)) {
      if (manager.activeWorkspaceId !== wsId) {
        manager.switchWorkspace(wsId);
        broadcastLayout();
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
      if (nodeId) {
        setTimeout(() => {
          broadcast({ type: "focus_node", nodeId, workspaceId: wsId });
        }, 220);
      }
    }
  } catch (err) {
    console.error("openFromUrl error:", err);
  }
}

// Deep link maestri:// (Spotlight / navegador) — FR-051
app.on("open-url", (e, url) => {
  e.preventDefault();
  if (manager && mainWindow) {
    openFromUrl(url);
  } else {
    pendingUrl = url;
  }
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
  updateSpotlightIndex(manager, app.getPath("userData"), true);

  const argvUrl = process.argv.find((a) => typeof a === "string" && a.startsWith("maestri://"));
  if (argvUrl) pendingUrl = argvUrl;

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
