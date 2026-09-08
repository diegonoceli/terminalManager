import { app, BrowserWindow, ipcMain, Notification, shell } from "electron";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { TerminalManager } from "./terminal-manager.js";

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
    activeWorkflowId: manager.activeWorkflowId,
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
    case "notify":
      showNotification({
        id: msg.terminalId,
        title: msg.title,
        body: msg.body,
      });
      break;
    case "open_external":
      if (msg.url && typeof msg.url === "string") {
        try {
          shell.openExternal(msg.url);
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
