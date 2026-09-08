// Spatial universal connections layer for Terminal Manager (Canvas de nós e portais)

class ConnectionsManager {
  constructor(app) {
    this.app = app;
    this.svg = document.getElementById("connections-layer");
    this.connections = new Map();
    this.activeDrag = null;
    this.previewPath = null;
    this._bindWindowEvents();
  }

  _bindWindowEvents() {
    window.addEventListener("pointermove", (e) => this._onPointerMove(e));
    window.addEventListener("pointerup", (e) => this._onPointerUp(e));
    window.addEventListener("pointercancel", (e) => this._onPointerUp(e));
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
    if (redraw) this.redraw(conn.id);
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
    const p1 = w1.worldPos;
    const s1 = w1.worldSize;
    const p2 = w2.worldPos;
    const s2 = w2.worldSize;

    // Center coordinates
    const c1 = { x: p1.x + s1.w / 2, y: p1.y + s1.h / 2 };
    const c2 = { x: p2.x + s2.w / 2, y: p2.y + s2.h / 2 };

    let src = { x: p1.x + s1.w, y: c1.y };
    let dst = { x: p2.x, y: c2.y };

    if (c1.x > c2.x) {
      src = { x: p1.x, y: c1.y };
      dst = { x: p2.x + s2.w, y: c2.y };
    }

    return { src, dst };
  }

  _calculateRope(src, dst) {
    const dx = Math.abs(dst.x - src.x);
    const dy = Math.abs(dst.y - src.y);
    const dist = Math.hypot(dx, dy);
    // Flecha do arco (sag) com física de gravidade natural (T020 / FR-012)
    const sag = Math.min(160, Math.max(20, dist * 0.18 + 12));
    const span = Math.max(45, dx * 0.52);
    const signX = src.x <= dst.x ? 1 : -1;
    const c1x = src.x + span * signX;
    const c1y = src.y + sag;
    const c2x = dst.x - span * signX;
    const c2y = dst.y + sag;
    return `M ${src.x} ${src.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${dst.x} ${dst.y}`;
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

  _pathFor(conn, src, dst, bundleTie) {
    if (conn && conn.bundleId && bundleTie) {
      return this._calculateBundle(src, dst, bundleTie);
    }
    return conn && conn.style === "circuit" ? this._calculateCircuit(src, dst) : this._calculateRope(src, dst);
  }

  /** Emite pulso luminoso de atividade ao longo do cabo por 2s (T023 / FR-015) */
  triggerPulse(connId, duration = 2000) {
    const g = this.svg.querySelector(`.connection-group[data-id="${connId}"]`);
    if (!g) return;
    const path = g.querySelector(".connection-path");
    if (!path) return;
    path.classList.add("conn-pulse");
    clearTimeout(g._pulseTimer);
    g._pulseTimer = setTimeout(() => {
      path.classList.remove("conn-pulse");
    }, duration);
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
      const maxX = Math.max(w1.worldPos.x + w1.worldSize.w, w2.worldPos.x + w2.worldSize.w);
      const maxY = Math.max(w1.worldPos.y + w1.worldSize.h, w2.worldPos.y + w2.worldSize.h);
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

  triggerPulse(fromNodeId, toNodeId) {
    for (const [id, conn] of this.connections.entries()) {
      if (
        (toNodeId && ((conn.from === fromNodeId && conn.to === toNodeId) || (conn.from === toNodeId && conn.to === fromNodeId))) ||
        (!toNodeId && (conn.from === fromNodeId || conn.to === fromNodeId))
      ) {
        this._animatePulse(id);
      }
    }
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
    const worldPt = canvas.screenToWorld(clientX, clientY);

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
    if (!this.activeDrag) return;
    const worldPt = this.app.canvas.screenToWorld(e.clientX, e.clientY);
    this.activeDrag.currentWorld = worldPt;
    this._updatePreview();
  }

  _updatePreview() {
    if (!this.activeDrag || !this.previewPath) return;
    const w = this._getNode(this.activeDrag.fromId);
    if (!w) return;

    const p = w.worldPos;
    const s = w.worldSize;
    const src = { x: p.x + s.w, y: p.y + s.h / 2 };
    const dst = this.activeDrag.currentWorld;

    const d = this._calculateBezier(src, dst);
    this.previewPath.setAttribute("d", d);
  }

  _onPointerUp(e) {
    if (!this.activeDrag) return;

    // Find node under pointer
    let targetNodeId = null;
    for (const node of this._getAllNodes()) {
      if (node.id === this.activeDrag.fromId) continue;
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

    if (targetNodeId) {
      this.app.sendCreateConnection({
        from: this.activeDrag.fromId,
        to: targetNodeId,
      });
    }

    if (this.previewPath) {
      this.previewPath.remove();
      this.previewPath = null;
    }
    this.activeDrag = null;
  }
}

window.ConnectionsManager = ConnectionsManager;
