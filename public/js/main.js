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

app.selectedIds = new Set();
app.groups = new Map();
app.nodeData = new Map();
app.activeWorkspaceId = null;

app.nodes = app.widgets; // Alias for universal nodes
app.connections = new ConnectionsManager(app);
window.app = app;

if (typeof FloatingDock === "function") {
  app.floatingDock = new FloatingDock(document.body, app);
}


app.motion = {
  isReduced() {
    const saved = localStorage.getItem("reduced-motion");
    if (saved !== null) return saved === "true";
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  },

  animateCamera(target, duration = 300) {
    return app.canvas.animateTo(target, { duration });
  },

  focusNode(nodeId) {
    const node = app.widgets.get(nodeId);
    if (!node) return Promise.resolve();
    const rect = app.canvas.viewport.getBoundingClientRect();
    const targetZoom = Math.min(1.2, Math.max(0.65, app.canvas.zoom));
    const targetTx = rect.width / 2 - (node.worldPos.x + node.worldSize.w / 2) * targetZoom;
    const targetTy = rect.height / 2 - (node.worldPos.y + node.worldSize.h / 2) * targetZoom;
    return this.animateCamera({ tx: targetTx, ty: targetTy, zoom: targetZoom }, 300);
  },

  toggleElevateNode(nodeId) {
    const node = app.widgets.get(nodeId);
    if (!node || !node.el) return;
    const isElevated = node.el.classList.contains("node-elevated");
    let backdrop = document.querySelector(".node-elevation-backdrop");
    if (isElevated) {
      node.el.classList.remove("node-elevated");
      if (backdrop) backdrop.remove();
      node.elevated = false;
    } else {
      for (const w of app.widgets.values()) {
        if (w.el && w.el.classList.contains("node-elevated")) {
          w.el.classList.remove("node-elevated");
          w.elevated = false;
        }
      }
      if (!backdrop) {
        backdrop = document.createElement("div");
        backdrop.className = "node-elevation-backdrop";
        backdrop.addEventListener("click", () => app.motion.toggleElevateNode(nodeId));
        document.body.appendChild(backdrop);
      }
      node.el.classList.add("node-elevated");
      node.elevated = true;
      app.setActive(nodeId);
    }
  },

  dockNode(nodeId, side = "none") {
    const node = app.widgets.get(nodeId);
    if (!node || !node.el) return;
    node.el.classList.remove("node-docked-left", "node-docked-right");
    node.docked = side;
    if (side === "left") node.el.classList.add("node-docked-left");
    else if (side === "right") node.el.classList.add("node-docked-right");
  }
};

if (app.motion.isReduced()) {
  document.body.classList.add("reduced-motion");
}

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
      app.workspaces = msg.workspaces || [];
      app.ui = msg.ui || {};
      app.settings = msg.settings || {};
      app.roles = msg.roles || [];
      const activeWs = msg.activeWorkspaceId || msg.activeWorkflowId;
      app.activeWorkspaceId = activeWs;
      // UI de workspaces (sidebar) usa v3; seletor de floors legado usa v2
      if (window.WorkspaceSidebar && Array.isArray(app.workspaces)) {
        try {
          WorkspaceSidebar.render(app.workspaces, activeWs);
        } catch (err) {
          console.error("sidebar render:", err);
        }
      }
      const wfList =
        msg.workflows || app.workspaces.map((w) => ({ id: w.id, name: w.name, nodeCount: w.nodeCount || 0 }));
      syncWorkflowsUI(wfList, activeWs);
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
    case "connection_updated":
      if (app.connections && typeof app.connections.updateFromMain === "function") {
        app.connections.updateFromMain(msg.connection);
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
    case "dir_picked":
      if (window.WorkspaceSidebar) {
        window.WorkspaceSidebar.onDirPicked(msg.path);
      }
      break;
    case "workspace_state":
      if (msg.state === "paused" && typeof toast === "function") {
        toast(msg.note || `Workspace "${msg.name || msg.workspaceId}" pausado.`);
      }
      break;
    case "agent_list":
      app.agents = msg.agents || [];
      break;
    case "attention": {
      const w = app.widgets.get(msg.nodeId);
      if (w && w.el) w.el.classList.add("agent-attention");
      break;
    }
    case "attention_cleared": {
      const w = app.widgets.get(msg.nodeId);
      if (w && w.el) w.el.classList.remove("agent-attention");
      break;
    }
    case "note_read_result": {
      const w = app.widgets.get(msg.nodeId);
      if (w && typeof w.loadContent === "function") w.loadContent(msg.content);
      break;
    }
    case "note_moved": {
      const w = app.widgets.get(msg.nodeId);
      if (w && typeof w.setProject === "function") w.setProject(msg.filePath);
      if (!msg.ok) toast("Não foi possível mover a nota (diretório do workspace não definido).");
      break;
    }
    case "fs_dir_result": {
      const w = app.widgets.get(msg.nodeId);
      if (w && typeof w.onDirResult === "function") {
        if (msg.ok) w.onDirResult(msg.path, msg.entries);
        else toast(msg.error || "Falha ao listar diretório.");
      }
      break;
    }
    case "fs_crud_result":
      if (!msg.ok) toast(msg.error || "Operação de arquivo falhou.");
      break;
    case "git_result": {
      const w = app.widgets.get(msg.nodeId);
      if (w && typeof w.onGitResult === "function") {
        w.onGitResult(msg.action, msg.ok, msg.data);
        if (!msg.ok) toast(msg.error || msg.data?.err || "Operação Git falhou.");
      }
      break;
    }
    case "diff_result": {
      const w = app.widgets.get(msg.nodeId);
      if (w && typeof w.onDiff === "function") w.onDiff(msg.text);
      break;
    }
    case "graph_result": {
      const w = app.widgets.get(msg.nodeId);
      if (w && typeof w.onGraph === "function") w.onGraph(msg.text);
      break;
    }
    case "file_read_result": {
      const w = app.widgets.get(msg.nodeId);
      if (w && typeof w.onFileRead === "function") w.onFileRead(msg.path, msg.content);
      break;
    }
    case "file_search_result":
      if (typeof app._onSearchResults === "function") {
        app._onSearchResults(msg.query, msg.matches || []);
      }
      break;
    case "workspace_export_result":
      toast(msg.ok ? `Workspace exportado: ${msg.path}` : msg.canceled ? "Exportação cancelada." : `Erro ao exportar: ${msg.error}`);
      break;
    case "workspace_import_result":
      if (msg.ok) toast(`Workspace "${msg.name}" importado.`);
      else if (!msg.canceled) toast(msg.error || "Falha ao importar.");
      break;
    case "ghostty_theme": {
      if (!msg.canceled && msg.theme && msg.theme.background) {
        const t = msg.theme;
        applyThemeToActive(
          {
            bg: t.background,
            fg: t.foreground || "#e6e6e6",
            cursor: t.cursor || t.foreground || "#ececec",
            cursorAccent: t.cursor_text || t.background,
            selBg: t.selection_background || "#264f78",
            selFg: t.foreground || "#ffffff",
            titlebar: t.background,
            titlebarText: t.foreground || "#ffffff",
          },
          "Ghostty"
        );
      } else if (msg.error) {
        toast("Falha ao importar tema Ghostty: " + msg.error);
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
    } else if (data.type === "note") {
      w = new NoteWidget({ ...data, app });
    } else if (data.type === "file-tree") {
      w = new FileTreeWidget({ ...data, app });
    } else if (data.type === "text") {
      w = new TextWidget({ ...data, app });
    } else if (data.type === "drawing") {
      w = new DrawWidget({ ...data, app });
    } else {
      w = new TermWidget({ ...data, app });
    }
    app.widgets.set(data.id, w);
    world.appendChild(w.el);
    if (!app.motion.isReduced() && w.el) {
      w.el.classList.add("node-entering");
      setTimeout(() => w.el?.classList.remove("node-entering"), 300);
    }
    w.setPosition(data.x, data.y);
    w.setSize(data.width, data.height);
  } else {
    w.setPosition(data.x, data.y);
    w.setSize(data.width, data.height);
    if (data.title) w.updateTitle(data.title);
    if (data.orientation && typeof w.toggleOrientation === "function" && w.orientation !== data.orientation) {
      w.orientation = data.orientation;
      w.el.classList.toggle("landscape", data.orientation === "landscape");
    }
  }
  if (doFit && typeof w.fit === "function") w.fit();
  app.nodeData.set(data.id, { ...data });
  return w;
}

function removeWidget(id, skipSend = false) {
  const w = app.widgets.get(id);
  if (app.activeId === id) app.activeId = null;
  app.selectedIds.delete(id);
  if (!skipSend) {
    send({ type: "remove_node", id });
  }
  if (w) {
    app.widgets.delete(id);
    app.nodeData.delete(id);
    if (!app.motion.isReduced() && w.el) {
      w.el.classList.add("node-leaving");
      setTimeout(() => {
        w.dispose();
        if (app.connections) app.connections.redrawAll();
        if (typeof renderGroupFrames === "function") renderGroupFrames();
        fitMaybe();
      }, 200);
      return;
    }
    w.dispose();
  }
  if (app.connections) app.connections.redrawAll();
  if (typeof renderGroupFrames === "function") renderGroupFrames();
  fitMaybe();
}

let _topZIndex = 10;

function bringNodeToFront(w) {
  if (!w || !w.el) return;
  _topZIndex += 1;
  w.el.style.zIndex = _topZIndex;
}

app.bringNodeToFront = bringNodeToFront;

/* ---------------- ativação ---------------- */
function setActive(id) {
  for (const [wid, w] of app.widgets) {
    w.setActive(wid === id);
  }
  app.activeId = id;
  const w = app.widgets.get(id);
  if (w) {
    bringNodeToFront(w);
    if (typeof w.focus === "function") w.focus();
  }
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
app.sendConnectionStyle = (id, style) => send({ type: "connection_style", id, style });
app.sendConnectionBundle = (action, connectionIds) => send({ type: "connection_bundle", action, connectionIds });
app.openExternal = (url) => send({ type: "open_external", url });
app.sendUpdateNode = (id, config) => send({ type: "update_node", id, config });
app.sendOpenVSCode = (path) => send({ type: "open_vscode", path });
app.send = send;

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
      orientation: "portrait",
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

function createNote() {
  const size = app.canvas.viewportSize;
  const center = app.canvas.screenToWorld(size.w / 2, size.h / 2);
  const stagger = (app.newCount % 4) * 24;
  app.newCount++;
  send({
    type: "create_node",
    node: {
      type: "note",
      title: "Nota",
      x: Math.round(center.x - 180 + stagger),
      y: Math.round(center.y - 150 + stagger),
      width: 360,
      height: 300,
    },
  });
}

function createFileTree() {
  const size = app.canvas.viewportSize;
  const center = app.canvas.screenToWorld(size.w / 2, size.h / 2);
  const stagger = (app.newCount % 4) * 24;
  app.newCount++;
  const active = (app.workspaces || []).find((w) => w.id === app.activeWorkspaceId);
  send({
    type: "create_node",
    node: {
      type: "file-tree",
      title: "Arquivos",
      rootPath: (active && active.workingDir) || "",
      x: Math.round(center.x - 180 + stagger),
      y: Math.round(center.y - 240 + stagger),
      width: 380,
      height: 500,
    },
  });
}

function createText() {
  const size = app.canvas.viewportSize;
  const center = app.canvas.screenToWorld(size.w / 2, size.h / 2);
  app.newCount++;
  send({
    type: "create_node",
    node: { type: "text", title: "Texto", x: Math.round(center.x - 130), y: Math.round(center.y - 60), width: 260, height: 120, content: "Texto" },
  });
}

function createDrawing() {
  const size = app.canvas.viewportSize;
  const center = app.canvas.screenToWorld(size.w / 2, size.h / 2);
  app.newCount++;
  send({
    type: "create_node",
    node: { type: "drawing", title: "Desenho", x: Math.round(center.x - 180), y: Math.round(center.y - 130), width: 360, height: 260, strokes: [] },
  });
}

/* ---------------- Busca de arquivos (Ctrl+P / >conteúdo) — US9 ---------------- */
let searchTimer = null;
function openSearch() {
  const root = document.getElementById("modal-root");
  if (!root) return;
  root.innerHTML = "";
  root.classList.remove("hidden");
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  const box = document.createElement("div");
  box.className = "modal search-modal";
  box.appendChild(Object.assign(document.createElement("h3"), { textContent: "Buscar arquivos (prefixo > = conteúdo)" }));
  const input = document.createElement("input");
  input.className = "input";
  input.placeholder = "nome do arquivo…  ou  > termo no conteúdo";
  const list = document.createElement("div");
  list.className = "search-results";
  box.append(input, list);
  overlay.appendChild(box);
  root.appendChild(overlay);
  input.focus();

  const active = (app.workspaces || []).find((w) => w.id === app.activeWorkspaceId);
  const cwd = (active && active.workingDir) || "";

  app._onSearchResults = (query, matches) => {
    if (query.trim() !== input.value.trim().replace(/^>\s*/, "").trim() && !(input.value.startsWith(">") && query === input.value.slice(1).trim())) return;
    list.innerHTML = "";
    if (!matches.length) {
      list.appendChild(Object.assign(document.createElement("div"), { className: "ft-empty", textContent: "Nenhum resultado." }));
      return;
    }
    for (const m of matches.slice(0, 60)) {
      const row = document.createElement("div");
      row.className = "search-row";
      row.textContent = m.path || m;
      row.title = m.path || m;
      row.addEventListener("click", () => {
        closeSearch();
        openInFileTree(m.path);
      });
      list.appendChild(row);
    }
  };

  const run = () => {
    const val = input.value.trim();
    if (!val) {
      list.innerHTML = "";
      return;
    }
    const byContent = val.startsWith(">");
    const query = byContent ? val.slice(1).trim() : val;
    if (!query) return;
    send({ type: "file_search", cwd, query, byContent });
  };
  input.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(run, 280);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") run();
    if (e.key === "Escape") closeSearch();
  });
  input.addEventListener("blur", () => setTimeout(closeSearch, 250));
}

function closeSearch() {
  app._onSearchResults = null;
  const root = document.getElementById("modal-root");
  if (root) {
    root.innerHTML = "";
    root.classList.add("hidden");
  }
}

function openInFileTree(path) {
  let target = null;
  for (const w of app.widgets.values()) {
    if (w.type === "file-tree" && typeof w.openFile === "function") {
      target = w;
      break;
    }
  }
  if (target) target.openFile(path);
  else toast('Adicione um nó "Arquivos" para abrir o arquivo.');
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

/* ---------------- Seleção múltipla & grupos (US8) ---------------- */
function widgetOf(target) {
  for (const [id, w] of app.widgets) {
    if (w.el && w.el.contains(target)) return { id, w };
  }
  return null;
}

function toggleSelect(id) {
  if (app.selectedIds.has(id)) app.selectedIds.delete(id);
  else app.selectedIds.add(id);
  applySelectionUI();
}

function clearSelection() {
  app.selectedIds.clear();
  applySelectionUI();
}

function applySelectionUI() {
  for (const [id, w] of app.widgets) {
    const on = app.selectedIds.has(id);
    if (w.el) w.el.classList.toggle("sel", on);
  }
  // Cria/remove frames conforme grupos
  renderGroupFrames();
}

window.addEventListener(
  "pointerdown",
  (e) => {
    if (!e.shiftKey) {
      if (!widgetOf(e.target)) clearSelection();
      return;
    }
    const hit = widgetOf(e.target);
    if (hit) {
      e.preventDefault();
      e.stopPropagation();
      toggleSelect(hit.id);
    }
  },
  true
);

function boundsOf(ids) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const id of ids) {
    const w = app.widgets.get(id);
    if (!w) continue;
    minX = Math.min(minX, w.worldPos.x);
    minY = Math.min(minY, w.worldPos.y);
    maxX = Math.max(maxX, w.worldPos.x + w.worldSize.w);
    maxY = Math.max(maxY, w.worldPos.y + w.worldSize.h);
  }
  return { minX, minY, maxX, maxY };
}

let groupCounter = 1;
function groupSelection() {
  const ids = [...app.selectedIds];
  if (ids.length < 2) return;
  const group = { id: `grp_${Date.now().toString(36)}`, name: `Grupo ${groupCounter++}`, nodeIds: ids };
  app.groups.set(group.id, group);
  toast(`Grupo "${group.name}" criado (${ids.length} nós).`);
  renderGroupFrames();
}

function dissolveSelected() {
  let changed = false;
  for (const [gid, group] of app.groups) {
    if (group.nodeIds.some((id) => app.selectedIds.has(id))) {
      app.groups.delete(gid);
      changed = true;
    }
  }
  if (changed) {
    toast("Grupo(s) dissolvido(s).");
    renderGroupFrames();
  }
}

function renderGroupFrames() {
  const holder = document.getElementById("group-layer") || (() => {
    const d = document.createElement("div");
    d.id = "group-layer";
    world.appendChild(d);
    return d;
  })();
  holder.innerHTML = "";
  for (const group of app.groups.values()) {
    const b = boundsOf(group.nodeIds);
    const frame = document.createElement("div");
    frame.className = "group-frame";
    frame.dataset.gid = group.id;
    frame.style.left = `${b.minX - 8}px`;
    frame.style.top = `${b.minY - 30}px`;
    frame.style.width = `${Math.max(40, b.maxX - b.minX + 16)}px`;
    frame.style.height = `${Math.max(40, b.maxY - b.minY + 38)}px`;

    const header = document.createElement("div");
    header.className = "group-frame-title";
    header.textContent = group.name;
    frame.appendChild(header);

    // Arrastar grupo move membros
    let dragging = null;
    header.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      const start = { x: e.clientX, y: e.clientY };
      const startPos = new Map();
      for (const id of group.nodeIds) {
        const w = app.widgets.get(id);
        if (w) startPos.set(id, { x: w.worldPos.x, y: w.worldPos.y });
      }
      dragging = { start, startPos, gid: group.id, moved: false };
      header.setPointerCapture(e.pointerId);
    });
    header.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      dragging.moved = true;
      const zoom = app.canvas.zoom;
      const dx = (e.clientX - dragging.start.x) / zoom;
      const dy = (e.clientY - dragging.start.y) / zoom;
      for (const [id, w] of app.widgets) {
        if (!dragging.startPos.has(id)) continue;
        const p = dragging.startPos.get(id);
        w.setPosition(Math.round(p.x + dx), Math.round(p.y + dy));
        app.sendMove(id, w.worldPos.x, w.worldPos.y);
      }
    });
    const stopDrag = (e) => {
      if (!dragging) return;
      dragging = null;
      try {
        header.releasePointerCapture(e.pointerId);
      } catch {}
      renderGroupFrames();
    };
    header.addEventListener("pointerup", stopDrag);
    header.addEventListener("pointercancel", stopDrag);

    holder.appendChild(frame);
  }
}

function alignSelected(axis) {
  const ids = [...app.selectedIds].filter((id) => app.widgets.has(id));
  if (ids.length < 2) return;
  const ref = app.widgets.get(ids[0]);
  for (const id of ids.slice(1)) {
    const w = app.widgets.get(id);
    if (axis === "x") w.setPosition(ref.worldPos.x, w.worldPos.y);
    else w.setPosition(w.worldPos.x, ref.worldPos.y);
    app.sendMove(id, w.worldPos.x, w.worldPos.y);
  }
}

function distributeSelected(axis) {
  const ids = [...app.selectedIds].filter((id) => app.widgets.has(id));
  if (ids.length < 3) return;
  const sorted = ids.map((id) => app.widgets.get(id)).sort((a, b) => (axis === "x" ? a.worldPos.x - b.worldPos.x : a.worldPos.y - b.worldPos.y));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const span = axis === "x" ? last.worldPos.x - first.worldPos.x : last.worldPos.y - first.worldPos.y;
  const step = span / (sorted.length - 1);
  sorted.forEach((w, i) => {
    if (axis === "x") w.setPosition(first.worldPos.x + step * i, w.worldPos.y);
    else w.setPosition(w.worldPos.x, first.worldPos.y + step * i);
    app.sendMove(w.id, w.worldPos.x, w.worldPos.y);
  });
}

function arrangeGrid() {
  const ids = [...app.selectedIds].filter((id) => app.widgets.has(id));
  if (ids.length === 0) return;
  const cols = Math.ceil(Math.sqrt(ids.length));
  let i = 0;
  const reduced = app.motion?.isReduced ? app.motion.isReduced() : false;
  for (const w of app.widgets.values()) {
    if (!app.selectedIds.has(w.id)) continue;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const targetX = 20 + col * (w.worldSize.w + 16);
    const targetY = 20 + row * (w.worldSize.h + 16);

    if (reduced || !w.el) {
      w.setPosition(targetX, targetY);
      app.sendMove(w.id, targetX, targetY);
    } else {
      const startX = w.worldPos.x;
      const startY = w.worldPos.y;
      const t0 = performance.now();
      const dur = 280;
      const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        const e = ease(k);
        const curX = Math.round(startX + (targetX - startX) * e);
        const curY = Math.round(startY + (targetY - startY) * e);
        w.setPosition(curX, curY);
        if (k < 1) {
          requestAnimationFrame(step);
        } else {
          app.sendMove(w.id, targetX, targetY);
          if (app.connections) app.connections.redrawAll();
        }
      };
      requestAnimationFrame(step);
    }
    i++;
  }
}

function zoomToSelection() {
  const ids = app.selectedIds.size ? [...app.selectedIds] : [...app.widgets.keys()];
  const b = boundsOf(ids);
  if (!isFinite(b.minX)) return;
  app.canvas.fitAll({ x: b.minX, y: b.minY, width: b.maxX - b.minX, height: b.maxY - b.minY });
}

function duplicateWidget(id) {
  const data = app.nodeData.get(id);
  if (!data) return;
  const cfg = { ...data, x: (data.x ?? 80) + 28, y: (data.y ?? 80) + 28, title: (data.title || "Nó") + " (cópia)" };
  delete cfg.id;
  send({ type: "create_node", node: cfg });
}

// Alt+clique no cabeçalho duplica o nó
window.addEventListener(
  "click",
  (e) => {
    if (!e.altKey) return;
    const header = e.target.closest(".titlebar, .portal-header, .note-header, .term-header, .ft-header");
    if (!header) return;
    const hit = widgetOf(header);
    if (hit) {
      e.preventDefault();
      e.stopPropagation();
      duplicateWidget(hit.id);
    }
  },
  true
);

// Duplo clique no cabeçalho eleva o nó em destaque para o centro (T024 / FR-016)
window.addEventListener(
  "dblclick",
  (e) => {
    if (e.target.closest("button, input, textarea, select")) return;
    const header = e.target.closest(".titlebar, .portal-header, .note-header, .term-header, .ft-header");
    if (!header) return;
    const hit = widgetOf(header);
    if (hit && app.motion?.toggleElevateNode) {
      e.preventDefault();
      e.stopPropagation();
      app.motion.toggleElevateNode(hit.id);
    }
  },
  true
);

/* ---------------- Minimapa Interativo (US5 / FR-018) ---------------- */
let minimapTimer = null;
function toggleMinimap() {
  const mm = document.getElementById("minimap");
  if (!mm) return;
  const show = mm.classList.toggle("hidden");
  if (show) {
    stopMinimap();
  } else {
    setupMinimapInteraction();
    drawMinimap();
    minimapTimer = setInterval(drawMinimap, 600);
  }
}

function stopMinimap() {
  if (minimapTimer) {
    clearInterval(minimapTimer);
    minimapTimer = null;
  }
}

function setupMinimapInteraction() {
  const mm = document.getElementById("minimap");
  if (!mm || mm._hasInteract) return;
  mm._hasInteract = true;
  let isDragging = false;

  const navigateToMinimapPoint = (e) => {
    const rect = mm.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const b = boundsOf([...app.widgets.keys()]);
    if (!isFinite(b.minX) || b.minX === b.maxX) return;
    const pad = 20;
    const W = mm.clientWidth, H = mm.clientHeight;
    const sx = (W - pad * 2) / (b.maxX - b.minX);
    const sy = (H - pad * 2) / (b.maxY - b.minY);
    const s = Math.min(sx, sy);
    const ox = pad + (W - pad * 2 - (b.maxX - b.minX) * s) / 2 - b.minX * s;
    const oy = pad + (H - pad * 2 - (b.maxY - b.minY) * s) / 2 - b.minY * s;
    const wx = (mx - ox) / s;
    const wy = (my - oy) / s;
    app.canvas.panTo(wx, wy);
    drawMinimap();
  };

  mm.addEventListener("pointerdown", (e) => {
    isDragging = true;
    try { mm.setPointerCapture(e.pointerId); } catch {}
    navigateToMinimapPoint(e);
  });
  mm.addEventListener("pointermove", (e) => {
    if (isDragging) navigateToMinimapPoint(e);
  });
  mm.addEventListener("pointerup", () => {
    isDragging = false;
  });
  mm.addEventListener("pointercancel", () => {
    isDragging = false;
  });
}

function drawMinimap() {
  const mm = document.getElementById("minimap");
  if (!mm || mm.classList.contains("hidden")) return;
  const W = mm.clientWidth, H = mm.clientHeight;
  const b = boundsOf([...app.widgets.keys()]);
  if (!isFinite(b.minX) || b.minX === b.maxX) {
    mm.innerHTML = "";
    return;
  }
  const pad = 20;
  const sx = (W - pad * 2) / (b.maxX - b.minX);
  const sy = (H - pad * 2) / (b.maxY - b.minY);
  const s = Math.min(sx, sy);
  const ox = pad + (W - pad * 2 - (b.maxX - b.minX) * s) / 2 - b.minX * s;
  const oy = pad + (H - pad * 2 - (b.maxY - b.minY) * s) / 2 - b.minY * s;
  const boxes = [];
  for (const w of app.widgets.values()) {
    const x = w.worldPos.x * s + ox;
    const y = w.worldPos.y * s + oy;
    boxes.push(`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${Math.max(2, w.worldSize.w * s).toFixed(1)}" height="${Math.max(2, w.worldSize.h * s).toFixed(1)}" rx="2"/>`);
  }

  // Retângulo representativo da viewport do canvas no minimapa (FR-018)
  const vw = app.canvas.viewport.clientWidth;
  const vh = app.canvas.viewport.clientHeight;
  const vTopLeft = app.canvas.screenToWorld(0, 0);
  const vBottomRight = app.canvas.screenToWorld(vw, vh);
  const vx = vTopLeft.x * s + ox;
  const vy = vTopLeft.y * s + oy;
  const vwMinimap = (vBottomRight.x - vTopLeft.x) * s;
  const vhMinimap = (vBottomRight.y - vTopLeft.y) * s;
  boxes.push(`<rect class="minimap-viewport" x="${vx.toFixed(1)}" y="${vy.toFixed(1)}" width="${Math.max(6, vwMinimap).toFixed(1)}" height="${Math.max(6, vhMinimap).toFixed(1)}" rx="3"/>`);

  const html = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${boxes.join("")}</svg>`;
  if (mm.innerHTML !== html) mm.innerHTML = html;
}

/* ---------------- Badges numerados de terminais (Ctrl mantido) — FR-018 ---------------- */
function terminalList() {
  return [...app.widgets.values()].filter((w) => w.el && typeof w.write === "function");
}

function showTerminalBadges(on) {
  const layer = document.getElementById("badges-layer");
  if (!layer) return;
  layer.innerHTML = "";
  if (!on) {
    app._termBadgesOn = false;
    layer.classList.add("hidden");
    return;
  }
  app._termBadgesOn = true;
  layer.classList.remove("hidden");
  const list = terminalList().sort((a, b) => (a.worldPos.y - b.worldPos.y) || (a.worldPos.x - b.worldPos.x));
  app._termBadgeList = list;
  list.forEach((w, i) => {
    if (i > 8) return;
    const pt = app.canvas.worldToScreen(w.worldPos.x, w.worldPos.y);
    const chip = document.createElement("span");
    chip.className = "term-badge";
    chip.textContent = String(i + 1);
    chip.style.left = `${pt.x - 6}px`;
    chip.style.top = `${pt.y - 14}px`;
    layer.appendChild(chip);
  });
}

window.addEventListener("keyup", (e) => {
  if (e.key === "Control" || e.key === "Meta") {
    showTerminalBadges(false);
    if (window.WorkspaceSidebar && !window.WorkspaceSidebar._pinnedNumbers) {
      window.WorkspaceSidebar.setNumbers(false);
    }
  }
});

/* ---------------- toolbar / botões ---------------- */
document.getElementById("btn-new")?.addEventListener("click", () => {
  if (window.Settings && window.Settings.openNewTerminal) {
    Settings.openNewTerminal();
  } else {
    createTerminal();
  }
});
document.getElementById("btn-new-web")?.addEventListener("click", createWebPortal);
document.getElementById("btn-new-device")?.addEventListener("click", () => {
  const isApple = confirm("Criar iPhone 17 Pro Max (OK) ou Pixel 9 (Cancelar)?");
  createDevicePortal(isApple ? "iphone17" : "pixel9");
});
document.getElementById("btn-new-editor")?.addEventListener("click", createEditor);
document.getElementById("btn-new-note")?.addEventListener("click", createNote);
document.getElementById("btn-new-files")?.addEventListener("click", createFileTree);
document.getElementById("btn-new-text")?.addEventListener("click", createText);
document.getElementById("btn-new-draw")?.addEventListener("click", createDrawing);
document.getElementById("btn-agents")?.addEventListener("click", () => {
  if (window.Settings) Settings.openRolesManager();
});

// Workflows / Workspaces listeners (legado até remoção do seletor de floors)
if (floorSelect) {
  floorSelect.addEventListener("change", () => {
    send({ type: "workspace_switch", workspaceId: floorSelect.value });
  });
}

document.getElementById("btn-floor-new")?.addEventListener("click", () => {
  const currentCount = (app.workspaces?.length || 1) + 1;
  const name = prompt("Nome do novo Workspace:", `Workspace ${currentCount}`);
  if (name && name.trim()) {
    send({ type: "workspace_create", name: name.trim() });
  }
});

document.getElementById("btn-floor-rename")?.addEventListener("click", () => {
  if (!floorSelect) return;
  const currentName = floorSelect.options[floorSelect.selectedIndex]?.text || "Workspace";
  const name = prompt("Novo nome para o Workspace atual:", currentName);
  if (name && name.trim()) {
    send({ type: "workspace_rename", workspaceId: floorSelect.value, name: name.trim() });
  }
});

document.getElementById("btn-floor-del")?.addEventListener("click", () => {
  if (!floorSelect) return;
  if (floorSelect.options.length <= 1) {
    alert("Não é possível excluir o único Workspace existente.");
    return;
  }
  const currentName = floorSelect.options[floorSelect.selectedIndex]?.text || "Workspace";
  if (confirm(`Excluir o Workspace "${currentName}" e todos os seus nós?`)) {
    send({ type: "workspace_delete", workspaceId: floorSelect.value });
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

/* ---------------- Temas de terminal (US10) ---------------- */
const GLOBAL_THEME_PRESETS = {
  dracula: { bg: "#282a36", fg: "#f8f8f2", cursor: "#f8f8f2", cursorAccent: "#282a36", titlebar: "#1e1f29", titlebarText: "#f8f8f2", selBg: "#44475a", selFg: "#ffffff" },
  catppuccin: { bg: "#1e1e2e", fg: "#cdd6f4", cursor: "#f5e0dc", cursorAccent: "#1e1e2e", titlebar: "#181825", titlebarText: "#cdd6f4", selBg: "#45475a", selFg: "#ffffff" },
  nord: { bg: "#2e3440", fg: "#d8dee9", cursor: "#eceff4", cursorAccent: "#2e3440", titlebar: "#3b4252", titlebarText: "#eceff4", selBg: "#434c5e", selFg: "#ffffff" },
};

function themeSelect() {
  const sel = document.getElementById("theme-select");
  if (!sel) return null;
  if (!themeSelect._bound) {
    themeSelect._bound = true;
    sel.addEventListener("change", () => {
      const v = sel.value;
      sel.value = "";
      if (v === "__import__") {
        if (app.send) send({ type: "pick_ghostty_theme" });
      } else if (v && GLOBAL_THEME_PRESETS[v]) {
        applyThemeToActive(GLOBAL_THEME_PRESETS[v], v);
      }
    });
  }
  return sel;
}
themeSelect();

function applyThemeToActive(style, label) {
  const w = app.activeId ? app.widgets.get(app.activeId) : null;
  if (!w || !w.el) {
    toast("Selecione (foque) um terminal para aplicar o tema.");
    return;
  }
  if (typeof w.applyStyle !== "function") {
    toast("O nó ativo não é um terminal.");
    return;
  }
  app.sendStyle(w.id, { ...style });
  if (label) toast(`Tema ${label} aplicado ao terminal ativo.`);
}

window.addEventListener("keydown", (e) => {
  const mod = e.metaKey || e.ctrlKey;
  if (e.repeat && e.key === "Control") return;
  if (!isTyping(e)) {
    if (mod && !e.shiftKey && e.key.toLowerCase() === "p") { e.preventDefault(); openSearch(); return; }
    if (mod && e.shiftKey && e.key.toLowerCase() === "g") { e.preventDefault(); dissolveSelected(); return; }
    if (mod && !e.shiftKey && e.key.toLowerCase() === "g") { e.preventDefault(); groupSelection(); return; }
    if (mod && e.shiftKey && e.key.toLowerCase() === "t") { e.preventDefault(); arrangeGrid(); return; }
    if (mod && e.shiftKey && e.key.toLowerCase() === "m") { e.preventDefault(); toggleMinimap(); return; }
    if (mod && !e.altKey && e.key === "\\") {
      e.preventDefault();
      if (app.activeId) {
        app.motion.focusNode(app.activeId);
        const w = app.widgets.get(app.activeId);
        if (w && typeof w.focus === "function") w.focus();
      }
      return;
    }
    if (mod && e.altKey && e.key === "\\") { e.preventDefault(); zoomToSelection(); return; }
  }
  // Ctrl mantido → badges de workspaces e de terminais (FR-006, FR-018)
  if ((e.key === "Control" || e.key === "Meta") && !isTyping(e)) {
    if (window.WorkspaceSidebar) window.WorkspaceSidebar.setNumbers(true);
    if (!e.repeat) {
      clearTimeout(app._ctrlBadgeTimer);
      app._ctrlBadgeTimer = setTimeout(() => {
        if (!app._ctrlDouble) showTerminalBadges(true);
      }, 380);
    }
    const now = Date.now();
    if (now - (app._lastCtrlAt || 0) < 420) {
      app._ctrlDouble = true;
      clearTimeout(app._ctrlBadgeTimer);
      showTerminalBadges(false);
      if (window.WorkspaceSidebar) {
        window.WorkspaceSidebar._pinnedNumbers = !window.WorkspaceSidebar._pinnedNumbers;
        window.WorkspaceSidebar.setNumbers(window.WorkspaceSidebar._pinnedNumbers);
      }
      app._lastCtrlAt = 0;
    } else {
      app._ctrlDouble = false;
      app._lastCtrlAt = now;
    }
    return;
  }
  if (!isTyping(e)) {
    if (mod && e.key === "ArrowUp") { e.preventDefault(); WorkspaceSidebar?.navPrev(); return; }
    if (mod && e.key === "ArrowDown") { e.preventDefault(); WorkspaceSidebar?.navNext(); return; }
    if (mod && e.shiftKey && e.key.toLowerCase() === "a") {
      e.preventDefault();
      const att = [...app.widgets.values()].filter((w) => w.el && w.el.classList.contains("agent-attention"));
      if (att.length) {
        const idx = att.findIndex((w) => w.id === app.activeId);
        const next = att[(idx + 1 + att.length) % att.length];
        setActive(next.id);
        if (typeof next.focus === "function") next.focus();
        focusTerminal(next, true);
      }
      return;
    }
  }
  if (/^[1-9]$/.test(e.key) && !isTyping(e)) {
    if (app._termBadgesOn && app._termBadgeList) {
      e.preventDefault();
      const w = app._termBadgeList[Number(e.key) - 1];
      if (w) {
        setActive(w.id);
        focusTerminal(w, true);
      }
      showTerminalBadges(false);
      return;
    }
    if (WorkspaceSidebar?.numberMode) {
      e.preventDefault();
      WorkspaceSidebar.jumpTo(Number(e.key));
      WorkspaceSidebar.setNumbers(false);
      return;
    }
  }
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
  if (app.floatingDock) {
    app.floatingDock.updateStatus(ok, ok ? "conectado" : "desconectado");
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

if (window.WorkspaceSidebar) {
  WorkspaceSidebar.init(app, send);
}
if (window.Settings) {
  Settings.init(app, send);
}

connect();
if (useBridge) {
  send({ type: "agent_list_request" });
}
window.__terminalManager = { app, send, createTerminal, createWebPortal, createDevicePortal, createEditor, fitAll, zoomFit, centerOrigin };
