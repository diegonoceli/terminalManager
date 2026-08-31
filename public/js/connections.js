// Spatial connections layer for Terminal Manager (Maestri-style agent connections)

export class ConnectionsManager {
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

  setConnections(list) {
    this.connections.clear();
    // Clear all existing paths in SVG except defs
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
      if (confirm("Remover esta conexão entre terminais?")) {
        this.app.sendRemoveConnection(conn.id);
      }
    });

    this.svg.appendChild(g);
    if (redraw) this.redraw(conn.id);
  }

  remove(id) {
    this.connections.delete(id);
    const g = this.svg.querySelector(`.connection-group[data-id="${id}"]`);
    if (g) g.remove();
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

  _calculateBezier(src, dst) {
    const dx = Math.max(40, Math.abs(dst.x - src.x) * 0.55);
    const sign = src.x < dst.x ? 1 : -1;
    const c1x = src.x + dx * sign;
    const c1y = src.y;
    const c2x = dst.x - dx * sign;
    const c2y = dst.y;
    return `M ${src.x} ${src.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${dst.x} ${dst.y}`;
  }

  redraw(id) {
    const conn = this.connections.get(id);
    if (!conn) return;

    const w1 = this.app.widgets.get(conn.from);
    const w2 = this.app.widgets.get(conn.to);

    const g = this.svg.querySelector(`.connection-group[data-id="${id}"]`);
    if (!g) return;

    if (!w1 || !w2) {
      g.style.display = "none";
      return;
    }
    g.style.display = "";

    const { src, dst } = this._getAnchorPoints(w1, w2);
    const d = this._calculateBezier(src, dst);

    for (const p of g.querySelectorAll("path")) {
      p.setAttribute("d", d);
    }
  }

  redrawAll() {
    for (const id of this.connections.keys()) {
      this.redraw(id);
    }
    if (this.activeDrag && this.previewPath) {
      this._updatePreview();
    }
  }

  triggerPulse(fromTerminalId, toTerminalId) {
    for (const [id, conn] of this.connections.entries()) {
      if (
        (conn.from === fromTerminalId && conn.to === toTerminalId) ||
        (conn.from === toTerminalId && conn.to === fromTerminalId) ||
        (conn.from === fromTerminalId || conn.to === fromTerminalId)
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
  startDrag(sourceTerminalId, clientX, clientY) {
    const w = this.app.widgets.get(sourceTerminalId);
    if (!w) return;

    const canvas = this.app.canvas;
    const worldPt = canvas.screenToWorld(clientX, clientY);

    this.activeDrag = {
      fromId: sourceTerminalId,
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
    const w = this.app.widgets.get(this.activeDrag.fromId);
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

    // Find widget under pointer
    let targetTerminalId = null;
    for (const [id, w] of this.app.widgets.entries()) {
      if (id === this.activeDrag.fromId) continue;
      const rect = w.el.getBoundingClientRect();
      if (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      ) {
        targetTerminalId = id;
        break;
      }
    }

    if (targetTerminalId) {
      this.app.sendCreateConnection({
        from: this.activeDrag.fromId,
        to: targetTerminalId,
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
