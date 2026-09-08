const viewport = document.getElementById("viewport");
const world = document.getElementById("world");
const grid = document.getElementById("grid");
const connDot = document.getElementById("conn-dot");
const connText = document.getElementById("conn-text");
const zoomReadout = document.getElementById("zoom-readout");
const toastEl = document.getElementById("toast");
const floorSelect = document.getElementById("floor-select");

const app = {
  canvas: new Canvas(viewport, world, grid),
  widgets: new Map(),
  ws: null,
  activeId: null,
  newCount: 0,
  prefs: { focusOnClick: localStorage.getItem("focus-on-click") !== "0" },
};

app.nodes = app.widgets; // Alias for universal nodes
app.connections = new ConnectionsManager(app);

/* ---------------- Transporte: Electron IPC ou WebSocket (dev) ---------------- */
const useBridge = !!window.appBridge;

function connect() {
  if (useBridge) {
    setConn(true);
    window.appBridge.onMessage((msg) => handleMessage(msg));
    app.ws = {
      readyState: 1,
      send: (m) => window.appBridge.send(m),
    };
    send({ type: "layout_request" });
    return;
  }

  const proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${location.host}`);
  app.ws = ws;

  ws.onopen = () => setConn(true);
  ws.onclose = () => {
    setConn(false);
    toast("Conexão perdida. Reconectando…");
    setTimeout(connect, 1500);
  };
  ws.onerror = () => ws.close();

  ws.onmessage = (ev) => {
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    handleMessage(msg);
  };
}

function send(msg) {
  if (!app.ws) return;
  if (useBridge) app.ws.send(msg);
  else if (app.ws.readyState === 1) app.ws.send(JSON.stringify(msg));
}

function handleMessage(msg) {
  switch (msg.type) {
    case "layout":
      syncWorkflowsUI(msg.workflows, msg.activeWorkflowId);
      syncLayout(msg.nodes || msg.terminals || []);
      if (app.connections) {
        app.connections.setConnections(msg.connections || []);
      }
      setTimeout(() => {
        if (app.widgets.size > 0) {
          fitAll();
        } else {
          centerOrigin();
        }
        for (const w of app.widgets.values()) {
          if (typeof w.fit === "function") w.fit();
        }
      }, 60);
      break;
    case "created":
      ensureNode(msg.terminal, true);
      if (app.widgets.size === 1) {
        setTimeout(fitAll, 60);
      }
      break;
    case "node_created":
      ensureNode(msg.node, true);
      break;
    case "output":
      app.widgets.get(msg.id)?.write?.(msg.data);
      if (app.connections) {
        app.connections.triggerPulse(msg.id);
      }
      break;
    case "moved": {
      const w = app.widgets.get(msg.id);
      if (w && !w.el.classList.contains("dragging")) w.setPosition(msg.x, msg.y);
      break;
    }
    case "renamed":
      app.widgets.get(msg.id)?.updateTitle(msg.title);
      break;
    case "styled":
      app.widgets.get(msg.id)?.applyStyle?.(msg.style, { skipSend: true });
      break;
    case "killed":
    case "exited":
    case "node_removed":
      removeWidget(msg.id, true);
      break;
    case "connection_created":
      if (app.connections) {
        app.connections.add(msg.connection);
      }
      break;
    case "connection_removed":
      if (app.connections) {
        app.connections.remove(msg.id);
      }
      break;
    case "focus_terminal": {
      const w = app.widgets.get(msg.id);
      if (w) {
        setActive(msg.id);
        focusTerminal(w, true);
      }
      break;
    }
    default:
      break;
  }
}

function syncWorkflowsUI(workflows, activeId) {
  if (!floorSelect) return;
  floorSelect.innerHTML = "";
  for (const wf of workflows || []) {
    const opt = document.createElement("option");
    opt.value = wf.id;
    opt.textContent = wf.name || "Floor";
    if (wf.id === activeId) opt.selected = true;
    floorSelect.appendChild(opt);
  }
}

function syncLayout(list) {
  const seen = new Set();
  for (const item of list) {
    seen.add(item.id);
    const w = ensureNode(item, true);
    if (w) {
      w.setPosition(item.x, item.y);
      w.setSize(item.width, item.height);
      if (item.title) w.updateTitle(item.title);
    }
  }
  for (const [id] of app.widgets) {
    if (!seen.has(id)) removeWidget(id, true);
  }
}

function ensureNode(data, doFit) {
  if (!data || !data.id) return null;
  let w = app.widgets.get(data.id);
  if (!w) {
    if (data.type === "web-portal") {
      w = new WebPortalWidget({ ...data, app });
    } else if (data.type === "device-portal") {
      w = new DevicePortalWidget({ ...data, app });
    } else if (data.type === "code-editor") {
      w = new EditorWidget({ ...data, app });
    } else {
      w = new TermWidget({ ...data, app });
    }
    app.widgets.set(data.id, w);
    world.appendChild(w.el);
    w.setPosition(data.x, data.y);
    w.setSize(data.width, data.height);
  } else {
    w.setPosition(data.x, data.y);
    w.setSize(data.width, data.height);
    if (data.title) w.updateTitle(data.title);
  }
  if (doFit && typeof w.fit === "function") w.fit();
  return w;
}

function removeWidget(id, skipSend = false) {
  const w = app.widgets.get(id);
  if (w) {
    w.dispose();
    app.widgets.delete(id);
  }
  if (app.activeId === id) app.activeId = null;
  if (!skipSend) {
    send({ type: "remove_node", id });
  }
  if (app.connections) app.connections.redrawAll();
  fitMaybe();
}

/* ---------------- ativação ---------------- */
function setActive(id) {
  for (const [wid, w] of app.widgets) {
    w.setActive(wid === id);
  }
  app.activeId = id;
  const w = app.widgets.get(id);
  if (w && typeof w.focus === "function") w.focus();
}

app.setActive = setActive;
app.getNode = (id) => app.widgets.get(id);
app.getAllNodes = () => [...app.widgets.values()];
app.removeNode = (id) => removeWidget(id);

/* ---------------- foco ao clicar ou alerta ---------------- */
function focusTerminal(w, force = false) {
  if (!w) return;
  if (!force && !app.prefs.focusOnClick) return;
  const pad = 80;
  const vw = app.canvas.viewportSize;
  const to = app.canvas.worldToScreen(w.worldPos.x, w.worldPos.y);
  const br = app.canvas.worldToScreen(w.worldPos.x + w.worldSize.w, w.worldPos.y + w.worldSize.h);
  if (!force && to.x >= pad && to.y >= pad && br.x <= vw.w - pad && br.y <= vw.h - pad) return;
  const cx = (w.worldPos.x + w.worldSize.w / 2) * app.canvas.zoom;
  const cy = (w.worldPos.y + w.worldSize.h / 2) * app.canvas.zoom;
  app.canvas.animateTo({
    tx: vw.w / 2 - cx,
    ty: vw.h / 2 - cy,
    zoom: app.canvas.zoom,
  });
}
app.focusTerminal = focusTerminal;

const focusBtn = document.getElementById("btn-focus");
function syncFocusBtn() {
  if (!focusBtn) return;
  focusBtn.classList.toggle("on", app.prefs.focusOnClick);
  focusBtn.title = app.prefs.focusOnClick
    ? "Focar terminal ao clicar (desativar)"
    : "Focar terminal ao clicar (ativar)";
}
if (focusBtn) {
  focusBtn.addEventListener("click", () => {
    app.prefs.focusOnClick = !app.prefs.focusOnClick;
    localStorage.setItem("focus-on-click", app.prefs.focusOnClick ? "1" : "0");
    syncFocusBtn();
  });
  syncFocusBtn();
}

/* ---------------- mensagens do widget & conexões ---------------- */
app.sendInput = (id, data) => send({ type: "input", id, data });
app.sendResize = (id, cols, rows, width, height) =>
  send({ type: "resize", id, cols, rows, width, height });
app.sendMove = (id, x, y) => send({ type: "move", id, x, y });
app.sendRename = (id, title) => send({ type: "rename", id, title });
app.sendStyle = (id, style) => send({ type: "style", id, style });
app.requestKill = (id) => send({ type: "kill", id });
app.sendCreateConnection = (data) => send({ type: "create_connection", ...data });
app.sendRemoveConnection = (id) => send({ type: "remove_connection", id });
app.openExternal = (url) => send({ type: "open_external", url });
app.sendUpdateNode = (id, config) => send({ type: "update_node", id, config });
app.sendOpenVSCode = (path) => send({ type: "open_vscode", path });

// Prevent Electron from opening dropped files in the window
window.addEventListener("dragover", (e) => e.preventDefault(), false);
window.addEventListener("drop", (e) => e.preventDefault(), false);

app.closeAllSettings = () => {
  for (const w of app.widgets.values()) {
    if (typeof w.closeSettings === "function") w.closeSettings();
  }
};

/* ---------------- criação de nós espaciais ---------------- */
function createTerminal() {
  const size = app.canvas.viewportSize;
  const center = app.canvas.screenToWorld(size.w / 2, size.h / 2);
  const stagger = (app.newCount % 4) * 24;
  app.newCount++;
  const layout = {
    title: `Terminal ${app.widgets.size + 1}`,
    x: Math.round(center.x - 360 + stagger),
    y: Math.round(center.y - 210 + stagger),
    width: 720,
    height: 420,
  };
  send({ type: "create", layout });
}

function createWebPortal() {
  const size = app.canvas.viewportSize;
  const center = app.canvas.screenToWorld(size.w / 2, size.h / 2);
  const stagger = (app.newCount % 4) * 24;
  app.newCount++;
  send({
    type: "create_node",
    node: {
      type: "web-portal",
      title: `Web Portal ${app.widgets.size + 1}`,
      url: "http://localhost:3000",
      x: Math.round(center.x - 360 + stagger),
      y: Math.round(center.y - 240 + stagger),
      width: 720,
      height: 480,
    },
  });
}

function createDevicePortal(model = "pixel9") {
  const size = app.canvas.viewportSize;
  const center = app.canvas.screenToWorld(size.w / 2, size.h / 2);
  const stagger = (app.newCount % 4) * 24;
  app.newCount++;
  send({
    type: "create_node",
    node: {
      type: "device-portal",
      deviceModel: model,
      title: model === "iphone17" ? "iPhone 17 Pro Max" : "Pixel 9",
      url: "http://localhost:3000",
      status: "connected",
      x: Math.round(center.x - 190 + stagger),
      y: Math.round(center.y - 370 + stagger),
      width: 380,
      height: 740,
    },
  });
}

function createEditor() {
  const size = app.canvas.viewportSize;
  const center = app.canvas.screenToWorld(size.w / 2, size.h / 2);
  const stagger = (app.newCount % 4) * 24;
  app.newCount++;
  send({
    type: "create_node",
    node: {
      type: "code-editor",
      title: "Workspace Code",
      projectPath: "./",
      x: Math.round(center.x - 210 + stagger),
      y: Math.round(center.y - 170 + stagger),
      width: 420,
      height: 340,
    },
  });
}

/* ---------------- zoom & pan ---------------- */
function zoomIn() {
  const s = app.canvas.viewportSize;
  app.canvas.zoomAt(1.2, s.w / 2, s.h / 2);
}
function zoomOut() {
  const s = app.canvas.viewportSize;
  app.canvas.zoomAt(1 / 1.2, s.w / 2, s.h / 2);
}
function zoomReset() {
  const s = app.canvas.viewportSize;
  app.canvas.setZoom(1, s.w / 2, s.h / 2);
}
function zoomFit() {
  fitAll();
}
function centerOrigin() {
  app.canvas.panTo(0, 0);
}

function fitAll() {
  if (app.widgets.size === 0) {
    centerOrigin();
    return;
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const w of app.widgets.values()) {
    minX = Math.min(minX, w.worldPos.x);
    minY = Math.min(minY, w.worldPos.y);
    maxX = Math.max(maxX, w.worldPos.x + w.worldSize.w);
    maxY = Math.max(maxY, w.worldPos.y + w.worldSize.h);
  }
  app.canvas.fitAll({
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  });
}
let fitTimer = null;
function fitMaybe() {
  clearTimeout(fitTimer);
  fitTimer = setTimeout(fitAll, 120);
}

/* ---------------- toolbar / botões ---------------- */
document.getElementById("btn-new")?.addEventListener("click", createTerminal);
document.getElementById("btn-new-web")?.addEventListener("click", createWebPortal);
document.getElementById("btn-new-device")?.addEventListener("click", () => {
  const isApple = confirm("Criar iPhone 17 Pro Max (OK) ou Pixel 9 (Cancelar)?");
  createDevicePortal(isApple ? "iphone17" : "pixel9");
});
document.getElementById("btn-new-editor")?.addEventListener("click", createEditor);

// Workflows / Floors listeners
if (floorSelect) {
  floorSelect.addEventListener("change", () => {
    send({ type: "workflow_switch", workflowId: floorSelect.value });
  });
}

document.getElementById("btn-floor-new")?.addEventListener("click", () => {
  const currentCount = (floorSelect?.options?.length || 0) + 1;
  const name = prompt("Nome do novo Floor (Workspace):", `Floor ${currentCount}`);
  if (name && name.trim()) {
    send({ type: "workflow_create", name: name.trim() });
  }
});

document.getElementById("btn-floor-rename")?.addEventListener("click", () => {
  if (!floorSelect) return;
  const currentName = floorSelect.options[floorSelect.selectedIndex]?.text || "Floor";
  const name = prompt("Novo nome para o Floor atual:", currentName);
  if (name && name.trim()) {
    send({ type: "workflow_rename", workflowId: floorSelect.value, name: name.trim() });
  }
});

document.getElementById("btn-floor-del")?.addEventListener("click", () => {
  if (!floorSelect) return;
  if (floorSelect.options.length <= 1) {
    alert("Não é possível excluir o único Floor existente.");
    return;
  }
  const currentName = floorSelect.options[floorSelect.selectedIndex]?.text || "Floor";
  if (confirm(`Excluir o Floor "${currentName}" e todos os seus nós?`)) {
    send({ type: "workflow_delete", workflowId: floorSelect.value });
  }
});

document.getElementById("btn-zoom-in")?.addEventListener("click", zoomIn);
document.getElementById("btn-zoom-out")?.addEventListener("click", zoomOut);
document.getElementById("btn-zoom-reset")?.addEventListener("click", zoomReset);
document.getElementById("btn-fit")?.addEventListener("click", zoomFit);
document.getElementById("btn-center")?.addEventListener("click", centerOrigin);

const canvasBg = document.getElementById("canvas-bg");
const storedBg = localStorage.getItem("canvas-bg");
if (storedBg && canvasBg) {
  viewport.style.background = storedBg;
  canvasBg.value = storedBg;
}
if (canvasBg) {
  canvasBg.addEventListener("input", () => {
    viewport.style.background = canvasBg.value;
    localStorage.setItem("canvas-bg", canvasBg.value);
  });
}

window.addEventListener("keydown", (e) => {
  const mod = e.metaKey || e.ctrlKey;
  if (mod && e.key === "+") { e.preventDefault(); zoomIn(); }
  else if (mod && e.key === "-") { e.preventDefault(); zoomOut(); }
  else if (mod && e.key === "0") { e.preventDefault(); zoomReset(); }
  else if (mod && (e.key === "=" || e.key.toLowerCase() === "n")) { e.preventDefault(); createTerminal(); }
  else if (!mod && e.key.toLowerCase() === "v") { zoomFit(); }
  else if (!mod && e.key.toLowerCase() === "c" && !isTyping(e)) { centerOrigin(); }
});

function isTyping(e) {
  return (
    e.target.tagName === "INPUT" ||
    e.target.tagName === "TEXTAREA" ||
    e.target.isContentEditable
  );
}

app.canvas.onZoom = (z) => {
  if (zoomReadout) {
    zoomReadout.textContent = `${Math.round(z * 100)}%`;
  }
};

app.canvas.onEmptyDrag = () => app.closeAllSettings();
app.canvas.onViewportClick = () => {
  setActive(null);
  app.closeAllSettings();
};

window.addEventListener("resize", () => {
  for (const w of app.widgets.values()) {
    if (typeof w.fit === "function") w.fit();
  }
});

// Native / System copy command listener: syncs active terminal selection to clipboard
document.addEventListener("copy", (e) => {
  let activeWidget = app.activeId ? app.widgets.get(app.activeId) : null;
  if (!activeWidget || !activeWidget.term || !activeWidget.term.hasSelection()) {
    for (const w of app.widgets.values()) {
      if (w.term && typeof w.term.hasSelection === "function" && w.term.hasSelection()) {
        activeWidget = w;
        break;
      }
    }
  }
  if (activeWidget && activeWidget.term && activeWidget.term.hasSelection()) {
    const text = activeWidget.term.getSelection();
    if (text) {
      if (e.clipboardData) {
        e.clipboardData.setData("text/plain", text);
        e.preventDefault();
      }
      activeWidget.copyToClipboard(text);
    }
  }
});

/* ---------------- conexão / toast ---------------- */
function setConn(ok) {
  if (connDot) {
    connDot.classList.toggle("on", ok);
    connDot.classList.toggle("off", !ok);
  }
  if (connText) {
    connText.textContent = ok ? "conectado" : "desconectado";
  }
}

let toastTimer = null;
function toast(text) {
  if (!toastEl) return;
  toastEl.textContent = text;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
}
window.toast = toast;

connect();
window.__terminalManager = { app, send, createTerminal, createWebPortal, createDevicePortal, createEditor, fitAll, zoomFit, centerOrigin };
