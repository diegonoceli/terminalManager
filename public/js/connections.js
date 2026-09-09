// Spatial universal connections layer for Terminal Manager (Canvas de nós e portais)

class ConnectionsManager {
  constructor(app) {
    this.app = app;
    this.svg = document.getElementById("connections-layer");
    if (!this.svg) {
      this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      this.svg.id = "connections-layer";
      this.svg.setAttribute("class", "connections-layer");
      const world = document.getElementById("world") || document.body;
      world.prepend(this.svg);
    }
    this.defaultStyle = "rope";
    this.connections = new Map();
    this.activeDrag = null;
    this.previewPath = null;
    this._bindWindowEvents();
  }

  _bindWindowEvents() {
    window.addEventListener("pointerdown", (e) => {
      if (e.altKey && e.button === 0) {
        this._startTieDrag(e.clientX, e.clientY);
      }
    });
    window.addEventListener("pointermove", (e) => this._onPointerMove(e));
    window.addEventListener("pointerup", (e) => this._onPointerUp(e));
    window.addEventListener("pointercancel", (e) => this._onPointerUp(e));
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (this.activeDrag) this._cancelDrag();
        if (this._tieDrag) this._cancelTieDrag();
      }
    });
  }

  _getNode(id) {
    if (this.app.getNode) return this.app.getNode(id);
    return this.app.widgets?.get(id);
  }

  _getAllNodes() {
    if (this.app.getAllNodes) return this.app.getAllNodes();
    return [...(this.app.widgets?.values() || [])];
  }

  setConnections(list) {
    this.connections.clear();
    const groups = this.svg.querySelectorAll(".connection-group");
    groups.forEach((g) => g.remove());

    if (Array.isArray(list)) {
      for (const conn of list) {
        this.add(conn, false);
      }
    }
    this.redrawAll();
  }

  add(conn, redraw = true) {
    if (!conn || !conn.id || !conn.from || !conn.to) return;
    this.connections.set(conn.id, conn);

    // Create SVG elements
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "connection-group");
    g.dataset.id = conn.id;

    const hit = document.createElementNS("http://www.w3.org/2000/svg", "path");
    hit.setAttribute("class", "connection-hitarea");

    const bg = document.createElementNS("http://www.w3.org/2000/svg", "path");
    bg.setAttribute("class", "connection-path-bg");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "connection-path");

    g.appendChild(hit);
    g.appendChild(bg);
    g.appendChild(path);

    // Click to remove / interact
    g.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      if (confirm("Remover esta conexão no workflow?")) {
        this.app.sendRemoveConnection(conn.id);
      }
    });
    g.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this._openConnMenu(e.clientX, e.clientY, conn);
    });
    g.dataset.style = conn.style || "rope";
    g.dataset.bundle = conn.bundleId || "";

    this.svg.appendChild(g);
    if (redraw) {
      this.redraw(conn.id);
      this.triggerPulse(conn.id);
    }
  }

  remove(id) {
    this.connections.delete(id);
    const g = this.svg.querySelector(`.connection-group[data-id="${id}"]`);
    if (g) g.remove();
  }

  /** Atualiza uma conexão existente vinda do main (estilo/feixe). */
  updateFromMain(conn) {
    if (!conn || !conn.id) return;
    this.connections.set(conn.id, conn);
    const g = this.svg.querySelector(`.connection-group[data-id="${conn.id}"]`);
    if (g) {
      g.dataset.style = conn.style || "rope";
      g.dataset.bundle = conn.bundleId || "";
    }
    this.redraw(conn.id);
  }

  _getAnchorPoints(w1, w2) {
    const p1 = w1.worldPos || { x: w1.x || 0, y: w1.y || 0 };
    const p2 = w2.worldPos || { x: w2.x || 0, y: w2.y || 0 };

    // Normalizar { w, h } e { width, height } — ambos os formatos são válidos
    const sw1 = w1.worldSize?.w ?? w1.worldSize?.width ?? w1.width ?? 200;
    const sh1 = w1.worldSize?.h ?? w1.worldSize?.height ?? w1.height ?? 150;
    const sw2 = w2.worldSize?.w ?? w2.worldSize?.width ?? w2.width ?? 200;
    const sh2 = w2.worldSize?.h ?? w2.worldSize?.height ?? w2.height ?? 150;

    // Centro de cada nó
    const c1 = { x: p1.x + sw1 / 2, y: p1.y + sh1 / 2 };
    const c2 = { x: p2.x + sw2 / 2, y: p2.y + sh2 / 2 };

    // Porta de saída: borda mais próxima ao outro nó (esquerda ou direita, centrada verticalmente)
    let src = { x: p1.x + sw1, y: c1.y };
    let dst = { x: p2.x,       y: c2.y };

    if (c1.x > c2.x) {
      src = { x: p1.x,       y: c1.y };
      dst = { x: p2.x + sw2, y: c2.y };
    }

    return { src, dst };
  }

  _calculateRope(src, dst) {
    const dx = dst.x - src.x;
    const dy = dst.y - src.y;
    const dist = Math.hypot(dx, dy);

    // Flecha do arco (sag) proporcional à distância (FR-003)
    const sag = Math.min(180, Math.max(20, dist * 0.18 + 12));

    // Conexão predominantemente vertical → curva em S lateral suave
    if (Math.abs(dx) < Math.abs(dy) * 0.5) {
      const lat = sag * 0.55;
      const midY = src.y + dy * 0.5;
      return `M ${src.x} ${src.y} C ${src.x + lat} ${midY}, ${dst.x - lat} ${midY}, ${dst.x} ${dst.y}`;
    }

    // Conexão horizontal ou diagonal → corda com sag gravitacional para baixo
    const signX = dx >= 0 ? 1 : -1;
    const span = Math.max(60, Math.abs(dx) * 0.5);
    const c1x = src.x + span * signX;
    const c2x = dst.x - span * signX;
    return `M ${src.x} ${src.y} C ${c1x} ${src.y + sag}, ${c2x} ${dst.y + sag}, ${dst.x} ${dst.y}`;
  }

  _calculateBezier(src, dst) {
    return this._calculatePath(src, dst, { style: this.defaultStyle || "rope" });
  }

  _calculateCircuit(src, dst) {
    // Trajetos ortogonais em ângulos retos de 90° com vértices suavemente arredondados (T021 / FR-013)
    const dx = dst.x - src.x;
    const dy = dst.y - src.y;
    if (Math.abs(dy) < 4) {
      return `M ${src.x} ${src.y} L ${dst.x} ${dst.y}`;
    }
    const mx = src.x + dx * 0.5;
    const signX = dx >= 0 ? 1 : -1;
    const signY = dy >= 0 ? 1 : -1;
    const r = Math.min(14, Math.abs(dx) / 2, Math.abs(dy) / 2);

    if (r < 2) {
      return `M ${src.x} ${src.y} L ${mx} ${src.y} L ${mx} ${dst.y} L ${dst.x} ${dst.y}`;
    }

    const p1x = mx - r * signX;
    const p1y = src.y;
    const p2x = mx;
    const p2y = src.y + r * signY;
    const p3x = mx;
    const p3y = dst.y - r * signY;
    const p4x = mx + r * signX;
    const p4y = dst.y;

    return `M ${src.x} ${src.y} L ${p1x} ${p1y} Q ${mx} ${src.y} ${p2x} ${p2y} L ${p3x} ${p3y} Q ${mx} ${dst.y} ${p4x} ${p4y} L ${dst.x} ${dst.y}`;
  }

  _calculateBundle(src, dst, tie) {
    // Convergência harmoniosa de cabos para abraçadeira (T022 / FR-014)
    const c1x = (src.x + tie.x) / 2;
    const c1y = src.y;
    const c2x = (dst.x + tie.x) / 2;
    const c2y = dst.y;
    return `M ${src.x} ${src.y} Q ${c1x} ${c1y} ${tie.x} ${tie.y} Q ${c2x} ${c2y} ${dst.x} ${dst.y}`;
  }

  _calculatePath(src, dst, conn = {}, bundleTie = null) {
    if (conn && conn.bundleId && bundleTie) {
      return this._calculateBundle(src, dst, bundleTie);
    }
    const style = (conn && conn.style) || this.defaultStyle || "rope";
    return style === "circuit" ? this._calculateCircuit(src, dst) : this._calculateRope(src, dst);
  }

  _pathFor(conn, src, dst, bundleTie) {
    return this._calculatePath(src, dst, conn, bundleTie);
  }

  /** Emite pulso luminoso de atividade ao longo do cabo (T010 / T023 / FR-015) */
  triggerPulse(connIdOrFromId, maybeToIdOrDuration = 2000) {
    if (!connIdOrFromId) return;

    // Direct connection ID
    if (this.connections.has(connIdOrFromId)) {
      const duration = typeof maybeToIdOrDuration === "number" ? maybeToIdOrDuration : 2000;
      this._pulseConnection(connIdOrFromId, duration);
      return;
    }

    // Node ID(s)
    const toNodeId = typeof maybeToIdOrDuration === "string" ? maybeToIdOrDuration : null;
    const duration = typeof maybeToIdOrDuration === "number" ? maybeToIdOrDuration : 2000;

    for (const [id, conn] of this.connections.entries()) {
      if (
        (toNodeId && ((conn.from === connIdOrFromId && conn.to === toNodeId) || (conn.from === toNodeId && conn.to === connIdOrFromId))) ||
        (!toNodeId && (conn.from === connIdOrFromId || conn.to === connIdOrFromId))
      ) {
        this._pulseConnection(id, duration);
      }
    }
  }

  _pulseConnection(connId, duration = 2000) {
    const g = this.svg.querySelector(`.connection-group[data-id="${connId}"]`);
    if (!g) return;

    const path = g.querySelector(".connection-path");
    if (path) {
      path.classList.add("conn-pulse");
      clearTimeout(g._pulseTimer);
      g._pulseTimer = setTimeout(() => {
        path.classList.remove("conn-pulse");
      }, duration);
    }

    this._animatePulse(connId);
  }

  redraw(id) {
    const conn = this.connections.get(id);
    if (!conn) return;

    const w1 = this._getNode(conn.from);
    const w2 = this._getNode(conn.to);

    const g = this.svg.querySelector(`.connection-group[data-id="${id}"]`);
    if (!g) return;

    if (!w1 || !w2) {
      g.style.display = "none";
      return;
    }
    g.style.display = "";

    const { src, dst } = this._getAnchorPoints(w1, w2);

    let bundleTie = null;
    if (conn.bundleId) {
      const members = [...this.connections.values()].filter((c) => c.bundleId === conn.bundleId);
      const rep = members.length ? members.reduce((a, b) => (a.id < b.id ? a : b)) : conn;
      if (rep.id !== conn.id) {
        const repG = this.svg.querySelector(`.connection-group[data-id="${rep.id}"]`);
        const tieEl = repG?.querySelector(".tie-bundle");
        if (tieEl) {
          bundleTie = {
            x: parseFloat(tieEl.getAttribute("x")) + 7,
            y: parseFloat(tieEl.getAttribute("y")) + 3.5
          };
        }
      }
    }

    const d = this._pathFor(conn, src, dst, bundleTie);

    for (const p of g.querySelectorAll("path")) {
      p.setAttribute("d", d);
    }
    g.dataset.style = conn.style || "rope";
    this._syncBundleVisual(g, conn);
  }

  /** Atualiza classes/laço (abraçadeira) conforme bundleId (FR-039). */
  _syncBundleVisual(g, conn) {
    if (!conn.bundleId) {
      g.classList.remove("bundle-member", "bundle-rep");
      const tie = g.querySelector(".tie-bundle");
      if (tie) tie.remove();
      return;
    }
    const members = [...this.connections.values()].filter((c) => c.bundleId === conn.bundleId);
    const rep = members.length ? members.reduce((a, b) => (a.id < b.id ? a : b)) : conn;
    const isRep = rep.id === conn.id;
    g.classList.toggle("bundle-member", !!conn.bundleId && !isRep);
    g.classList.toggle("bundle-rep", !!conn.bundleId && isRep);

    let tie = g.querySelector(".tie-bundle");
    if (!isRep || members.length < 2) {
      if (tie) tie.remove();
      return;
    }
    if (!tie) {
      tie = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      tie.setAttribute("class", "tie-bundle");
      tie.setAttribute("width", 14);
      tie.setAttribute("height", 7);
      tie.setAttribute("rx", 3.5);
      g.appendChild(tie);
    }
    const pathEl = g.querySelector(".connection-path");
    try {
      const total = pathEl.getTotalLength();
      const pt = pathEl.getPointAtLength(total / 2);
      tie.setAttribute("x", pt.x - 7);
      tie.setAttribute("y", pt.y - 3.5);
    } catch {}
  }

  /** Menu de contexto da conexão: estilo + feixe (abraçadeira). */
  _openConnMenu(x, y, conn) {
    if (!this.menu) {
      this.menu = document.createElement("div");
      this.menu.className = "ctx-menu hidden";
      document.body.appendChild(this.menu);
    }
    const m = this.menu;
    m.innerHTML = "";
    const item = (label, fn) => {
      const d = document.createElement("div");
      d.className = "ctx-item";
      d.textContent = label;
      d.addEventListener("click", () => {
        m.classList.add("hidden");
        fn();
      });
      m.appendChild(d);
    };

    item(conn.style === "circuit" ? "Estilo: Corda" : "Estilo: Circuito", () => {
      this.app.sendConnectionStyle(conn.id, conn.style === "circuit" ? "rope" : "circuit");
    });
    if (conn.bundleId) {
      item("Soltar do feixe (abraçadeira)", () => this.app.sendConnectionBundle("release", [conn.id]));
    } else {
      item("Agrupar em feixe (abraçadeira)", () => {
        const ids = [conn.id, ...this._overlappingWith(conn).map((c) => c.id)];
        if (ids.length > 1 && this.app.sendConnectionBundle) {
          this.app.sendConnectionBundle("create", ids);
        } else if (window.toast) {
          toast("Sem outras conexões próximas para agrupar.");
        }
      });
    }
    item("Remover conexão", () => this.app.sendRemoveConnection(conn.id));

    m.classList.remove("hidden");
    const mw = 230;
    m.style.left = Math.min(x, window.innerWidth - mw - 8) + "px";
    m.style.top = Math.min(y, window.innerHeight - m.offsetHeight - 8) + "px";
    setTimeout(() => document.addEventListener("pointerdown", () => m.classList.add("hidden"), { once: true }), 0);
  }

  /** Conexões cujas caixas (src/dst) intersectam a caixa de `conn`. */
  _overlappingWith(conn) {
    const box = (c) => {
      const w1 = this._getNode(c.from);
      const w2 = this._getNode(c.to);
      if (!w1 || !w2) return null;
      const minX = Math.min(w1.worldPos.x, w2.worldPos.x);
      const minY = Math.min(w1.worldPos.y, w2.worldPos.y);
      const w1w = w1.worldSize?.w ?? w1.worldSize?.width ?? 0;
      const w1h = w1.worldSize?.h ?? w1.worldSize?.height ?? 0;
      const w2w = w2.worldSize?.w ?? w2.worldSize?.width ?? 0;
      const w2h = w2.worldSize?.h ?? w2.worldSize?.height ?? 0;
      const maxX = Math.max(w1.worldPos.x + w1w, w2.worldPos.x + w2w);
      const maxY = Math.max(w1.worldPos.y + w1h, w2.worldPos.y + w2h);
      return { minX, minY, maxX, maxY };
    };
    const a = box(conn);
    if (!a) return [];
    const out = [];
    for (const c of this.connections.values()) {
      if (c.id === conn.id || c.bundleId) continue;
      const b = box(c);
      if (b && a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY) out.push(c);
    }
    return out;
  }

  redrawAll() {
    if (this._rafPending) return;
    this._rafPending = true;
    requestAnimationFrame(() => {
      this._rafPending = false;
      for (const id of this.connections.keys()) {
        this.redraw(id);
      }
      if (this.activeDrag && this.previewPath) {
        this._updatePreview();
      }
    });
  }

  _animatePulse(connId) {
    const g = this.svg.querySelector(`.connection-group[data-id="${connId}"]`);
    if (!g) return;

    const path = g.querySelector(".connection-path");
    if (!path) return;

    const d = path.getAttribute("d");
    if (!d) return;

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("class", "connection-pulse");
    circle.setAttribute("r", "5");

    const anim = document.createElementNS("http://www.w3.org/2000/svg", "animateMotion");
    anim.setAttribute("path", d);
    anim.setAttribute("dur", "1.2s");
    anim.setAttribute("repeatCount", "1");
    anim.setAttribute("fill", "freeze");

    circle.appendChild(anim);
    g.appendChild(circle);

    setTimeout(() => {
      circle.remove();
    }, 1250);
  }

  /* ---- Drag to connect interaction ---- */
  startDrag(sourceNodeId, clientX, clientY) {
    const w = this._getNode(sourceNodeId);
    if (!w) return;

    const canvas = this.app.canvas;
    const worldPt = canvas ? canvas.screenToWorld(clientX, clientY) : { x: clientX, y: clientY };

    this.activeDrag = {
      fromId: sourceNodeId,
      currentWorld: worldPt,
    };

    if (!this.previewPath) {
      this.previewPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      this.previewPath.setAttribute("class", "conn-preview-line");
      this.svg.appendChild(this.previewPath);
    }
    this._updatePreview();
  }

  _onPointerMove(e) {
    if (this._tieDrag) {
      this._updateTieDrag(e.clientX, e.clientY);
      return;
    }
    if (!this.activeDrag) return;
    const canvas = this.app.canvas;
    const worldPt = canvas ? canvas.screenToWorld(e.clientX, e.clientY) : { x: e.clientX, y: e.clientY };
    this.activeDrag.currentWorld = worldPt;

    // Highlight candidate target node
    for (const node of this._getAllNodes()) {
      if (!node.el) continue;
      if (node.id === this.activeDrag.fromId) {
        node.el.classList.remove("drag-over");
        continue;
      }
      const rect = node.el.getBoundingClientRect();
      const isOver = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
      node.el.classList.toggle("drag-over", isOver);
    }

    this._updatePreview();
  }

  _updatePreview() {
    if (!this.activeDrag || !this.previewPath) return;
    const w = this._getNode(this.activeDrag.fromId);
    if (!w) return;

    const p = w.worldPos || { x: w.x || 0, y: w.y || 0 };
    const sw = w.worldSize?.w ?? w.worldSize?.width ?? w.width ?? 200;
    const sh = w.worldSize?.h ?? w.worldSize?.height ?? w.height ?? 150;
    const dst = this.activeDrag.currentWorld;

    // Adaptive anchor based on cursor position relative to source node center
    const centerX = p.x + sw / 2;
    const centerY = p.y + sh / 2;
    const isLeft = dst.x < centerX;
    const src = {
      x: isLeft ? p.x : p.x + sw,
      y: centerY,
    };

    const d = this._calculatePath(src, dst, { style: this.defaultStyle || "rope" });
    this.previewPath.setAttribute("d", d);
  }

  _cancelDrag() {
    for (const node of this._getAllNodes()) {
      if (node.el) node.el.classList.remove("drag-over");
    }
    if (this.previewPath) {
      this.previewPath.remove();
      this.previewPath = null;
    }
    this.activeDrag = null;
  }

  _onPointerUp(e) {
    if (this._tieDrag) {
      this._finishTieDrag();
      return;
    }
    if (!this.activeDrag) return;

    const fromId = this.activeDrag.fromId;
    let targetNodeId = null;

    // Direct DOM element detection for absolute accuracy
    const hitEl = document.elementFromPoint(e.clientX, e.clientY);
    const targetNodeEl = hitEl?.closest(".widget, .spatial-node");
    if (targetNodeEl && targetNodeEl.dataset?.id && targetNodeEl.dataset.id !== fromId) {
      targetNodeId = targetNodeEl.dataset.id;
    }

    // Fallback: bounding rect detection
    if (!targetNodeId) {
      for (const node of this._getAllNodes()) {
        if (node.id === fromId) continue;
        if (!node.el) continue;
        const rect = node.el.getBoundingClientRect();
        if (
          e.clientX >= rect.left &&
          e.clientX <= rect.right &&
          e.clientY >= rect.top &&
          e.clientY <= rect.bottom
        ) {
          targetNodeId = node.id;
          break;
        }
      }
    }

    if (targetNodeId && targetNodeId !== fromId) {
      // Avoid duplicate connections in either direction
      const isDuplicate = [...this.connections.values()].some(
        (c) => (c.from === fromId && c.to === targetNodeId) ||
               (c.from === targetNodeId && c.to === fromId)
      );
      if (!isDuplicate && this.app.sendCreateConnection) {
        this.app.sendCreateConnection({
          from: fromId,
          to: targetNodeId,
          style: this.defaultStyle || "rope",
        });
      }
    }

    this._cancelDrag();
  }

  /* ---- Abraçadeiras (Cable Ties) via Alt + Traço (T028 / US5 / FR-029) ---- */
  _startTieDrag(clientX, clientY) {
    const canvas = this.app.canvas;
    const worldPt = canvas ? canvas.screenToWorld(clientX, clientY) : { x: clientX, y: clientY };
    this._tieDrag = {
      start: { x: clientX, y: clientY },
      startWorld: worldPt,
      currentWorld: worldPt,
    };
    if (!this._tiePreview) {
      this._tiePreview = document.createElementNS("http://www.w3.org/2000/svg", "line");
      this._tiePreview.setAttribute("class", "cable-tie-slash");
      this._tiePreview.setAttribute("stroke", "#f59e0b");
      this._tiePreview.setAttribute("stroke-width", "3");
      this._tiePreview.setAttribute("stroke-dasharray", "4 3");
      this.svg.appendChild(this._tiePreview);
    }
    this._tiePreview.setAttribute("x1", worldPt.x);
    this._tiePreview.setAttribute("y1", worldPt.y);
    this._tiePreview.setAttribute("x2", worldPt.x);
    this._tiePreview.setAttribute("y2", worldPt.y);
  }

  _updateTieDrag(clientX, clientY) {
    if (!this._tieDrag || !this._tiePreview) return;
    const canvas = this.app.canvas;
    const worldPt = canvas ? canvas.screenToWorld(clientX, clientY) : { x: clientX, y: clientY };
    this._tieDrag.currentWorld = worldPt;
    this._tiePreview.setAttribute("x2", worldPt.x);
    this._tiePreview.setAttribute("y2", worldPt.y);
  }

  _finishTieDrag() {
    if (!this._tieDrag) return;
    const p1 = this._tieDrag.startWorld;
    const p2 = this._tieDrag.currentWorld;
    this._cancelTieDrag();

    const minX = Math.min(p1.x, p2.x);
    const maxX = Math.max(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const maxY = Math.max(p1.y, p2.y);

    const crossed = [];
    for (const [id, conn] of this.connections.entries()) {
      const w1 = this._getNode(conn.from);
      const w2 = this._getNode(conn.to);
      if (!w1 || !w2) continue;
      const { src, dst } = this._getAnchorPoints(w1, w2);
      const cMinX = Math.min(src.x, dst.x);
      const cMaxX = Math.max(src.x, dst.x);
      const cMinY = Math.min(src.y, dst.y);
      const cMaxY = Math.max(src.y, dst.y);

      if (maxX >= cMinX && minX <= cMaxX && maxY >= cMinY && minY <= cMaxY) {
        crossed.push(id);
      }
    }

    if (crossed.length >= 2) {
      if (this.app.sendConnectionBundle) {
        this.app.sendConnectionBundle("create", crossed);
      }
      if (window.toast) toast(`Abraçadeira criada para feixe de ${crossed.length} cabos.`);
    }
  }

  _cancelTieDrag() {
    if (this._tiePreview) {
      this._tiePreview.remove();
      this._tiePreview = null;
    }
    this._tieDrag = null;
  }

  /* ---- Popover de Inspeção de Conexões do Nó (T030 / US5 / FR-028) ---- */
  openNodeConnectionsPopover(nodeId, clientX, clientY) {
    const existing = document.getElementById("node-conn-popover");
    if (existing) existing.remove();

    const conns = [...this.connections.values()].filter(c => c.from === nodeId || c.to === nodeId);
    if (!conns.length) {
      if (window.toast) toast("Este nó não possui conexões ativas.");
      return;
    }

    const popover = document.createElement("div");
    popover.id = "node-conn-popover";
    popover.className = "ctx-menu";
    popover.style.minWidth = "220px";
    popover.style.padding = "6px 0";
    popover.style.zIndex = "1000";

    const head = document.createElement("div");
    head.style.padding = "4px 10px 6px 10px";
    head.style.fontSize = "11px";
    head.style.fontWeight = "600";
    head.style.color = "var(--text-muted, #888)";
    head.style.borderBottom = "1px solid var(--panel-border, #e5e5e5)";
    head.textContent = `Conexões (${conns.length})`;
    popover.appendChild(head);

    for (const c of conns) {
      const otherId = c.from === nodeId ? c.to : c.from;
      const other = this._getNode(otherId);
      const title = other?.titleText || other?.title || otherId;
      const isOut = c.from === nodeId;

      const row = document.createElement("div");
      row.className = "ctx-item";
      row.style.display = "flex";
      row.style.alignItems = "center";
      row.style.justifyContent = "space-between";
      row.style.padding = "6px 10px";

      const info = document.createElement("div");
      info.style.display = "flex";
      info.style.alignItems = "center";
      info.style.gap = "6px";
      info.style.cursor = "pointer";
      info.innerHTML = `<span>${isOut ? "→" : "←"}</span> <span style="font-weight:500;">${title}</span>`;
      info.addEventListener("click", () => {
        popover.remove();
        if (other) {
          if (this.app?.setActive) this.app.setActive(otherId);
          if (this.app?.focusTerminal && (other.type === "terminal" || !other.type)) {
            this.app.focusTerminal(other, true);
          } else if (this.app?.canvas?.panToNode) {
            this.app.canvas.panToNode(other);
          }
        }
      });

      const delBtn = document.createElement("button");
      delBtn.className = "btn small danger";
      delBtn.style.padding = "2px 6px";
      delBtn.style.fontSize = "11px";
      delBtn.textContent = "×";
      delBtn.title = "Desconectar";
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        popover.remove();
        if (this.app?.sendRemoveConnection) {
          this.app.sendRemoveConnection(c.id);
        }
      });

      row.appendChild(info);
      row.appendChild(delBtn);
      popover.appendChild(row);
    }

    document.body.appendChild(popover);
    popover.style.left = `${Math.min(clientX, window.innerWidth - 240)}px`;
    popover.style.top = `${Math.min(clientY, window.innerHeight - 200)}px`;

    const closeHandler = (e) => {
      if (!popover.contains(e.target)) {
        popover.remove();
        document.removeEventListener("pointerdown", closeHandler);
      }
    };
    setTimeout(() => document.addEventListener("pointerdown", closeHandler), 20);
  }
}

window.ConnectionsManager = ConnectionsManager;
