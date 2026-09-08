// public/js/widgets/textdraw.js
// TextWidget (rótulo/snippet) e DrawWidget (esboço à mão livre) — nós leves (US8, FR-041).

/* ---------- TextWidget ---------- */
class TextWidget extends BasePortalWidget {
  constructor(opts) {
    super({
      ...opts,
      type: "text",
      title: opts.title || "Texto",
      width: opts.width || 260,
      height: opts.height || 120,
    });
    this.content = opts.content || "";
    this.fontSize = opts.fontSize || 14;
    this.color = opts.color || "#1f1f1e";
    this._timer = null;
    this._createDOM();
  }

  _createDOM() {
    const el = document.createElement("div");
    el.className = "spatial-node text-widget";
    el.dataset.id = this.id;
    el.style.width = `${this.worldSize.w}px`;
    el.style.height = `${this.worldSize.h}px`;
    el.style.transform = `translate(${this.worldPos.x}px, ${this.worldPos.y}px)`;

    el.innerHTML = `
      <div class="portal-header note-header">
        <div class="portal-icon">🅃</div>
        <div class="portal-title">${this.title}</div>
        <div class="portal-actions">
          <button class="portal-btn btn-close" title="Fechar">✕</button>
        </div>
      </div>
      <div class="text-content" contenteditable="true" spellcheck="false"></div>
      <div class="spatial-resize-handle"></div>
      <div class="conn-port conn-port-left" title="Conectar nó"></div>
      <div class="conn-port conn-port-right" title="Conectar nó"></div>
    `;

    this.el = el;
    this.titleEl = el.querySelector(".portal-title");
    this.editor = el.querySelector(".text-content");
    this.editor.style.fontSize = `${this.fontSize}px`;
    this.editor.style.color = this.color;
    this.editor.textContent = this.content;

    const header = el.querySelector(".note-header");
    const resizeHandle = el.querySelector(".spatial-resize-handle");
    const portLeft = el.querySelector(".conn-port-left");
    const portRight = el.querySelector(".conn-port-right");
    this._setupDragAndResize(header, resizeHandle);
    this._setupConnectionPorts(portLeft, portRight);
    el.addEventListener("pointerdown", () => this.app.setActive(this.id));

    this.editor.addEventListener("input", () => {
      clearTimeout(this._timer);
      this._timer = setTimeout(() => {
        if (this.app.sendUpdateNode) {
          this.app.sendUpdateNode(this.id, { content: this.editor.textContent });
        }
      }, 500);
    });
    el.querySelector(".btn-close").addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.app.removeNode) this.app.removeNode(this.id);
    });
  }

  focus() {
    this.editor?.focus();
  }

  dispose() {
    if (this.editor && this.app.sendUpdateNode) {
      this.app.sendUpdateNode(this.id, { content: this.editor.textContent });
    }
    if (this.el && this.el.parentNode) this.el.remove();
  }
}

/* ---------- DrawWidget ---------- */
const DRAW_COLORS = ["#1f1f1e", "#dc2626", "#2563eb", "#16a34a", "#f59e0b"];

class DrawWidget extends BasePortalWidget {
  constructor(opts) {
    super({
      ...opts,
      type: "drawing",
      title: opts.title || "Desenho",
      width: opts.width || 360,
      height: opts.height || 260,
    });
    this.strokes = Array.isArray(opts.strokes) ? opts.strokes.map((s) => ({ ...s, points: s.points.map((p) => [...p]) })) : [];
    this.color = DRAW_COLORS[0];
    this._drawing = null;
    this._createDOM();
    this._redraw();
  }

  _createDOM() {
    const el = document.createElement("div");
    el.className = "spatial-node draw-widget";
    el.dataset.id = this.id;
    el.style.width = `${this.worldSize.w}px`;
    el.style.height = `${this.worldSize.h}px`;
    el.style.transform = `translate(${this.worldPos.x}px, ${this.worldPos.y}px)`;

    el.innerHTML = `
      <div class="portal-header note-header">
        <div class="portal-icon">✎</div>
        <div class="portal-title">${this.title}</div>
        <div class="portal-actions draw-tools"></div>
        <div class="portal-actions">
          <button class="portal-btn btn-close" title="Fechar">✕</button>
        </div>
      </div>
      <div class="draw-canvas-wrap">
        <canvas class="draw-canvas"></canvas>
      </div>
      <div class="spatial-resize-handle"></div>
      <div class="conn-port conn-port-left" title="Conectar nó"></div>
      <div class="conn-port conn-port-right" title="Conectar nó"></div>
    `;

    this.el = el;
    this.titleEl = el.querySelector(".portal-title");
    this.canvas = el.querySelector(".draw-canvas");
    this.ctx = this.canvas.getContext("2d");

    const header = el.querySelector(".note-header");
    const resizeHandle = el.querySelector(".spatial-resize-handle");
    const portLeft = el.querySelector(".conn-port-left");
    const portRight = el.querySelector(".conn-port-right");
    this._setupDragAndResize(header, resizeHandle);
    this._setupConnectionPorts(portLeft, portRight);
    el.addEventListener("pointerdown", () => this.app.setActive(this.id));

    // Paleta de cores
    const tools = el.querySelector(".draw-tools");
    for (const c of DRAW_COLORS) {
      const sw = document.createElement("button");
      sw.className = "portal-btn draw-swatch" + (c === this.color ? " active" : "");
      sw.style.background = c;
      sw.title = c;
      sw.addEventListener("click", (e) => {
        e.stopPropagation();
        this.color = c;
        for (const s of tools.querySelectorAll(".draw-swatch")) s.classList.toggle("active", s.style.background === c);
      });
      tools.appendChild(sw);
    }

    // Desenho com o mouse (apenas no corpo)
    const wrap = el.querySelector(".draw-canvas-wrap");
    wrap.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      this._drawing = { color: this.color, width: 3, points: [this._pt(e)] };
      wrap.setPointerCapture(e.pointerId);
      this.app.setActive(this.id);
    });
    wrap.addEventListener("pointermove", (e) => {
      if (!this._drawing) return;
      this._drawing.points.push(this._pt(e));
      this._drawPoint(this._drawing);
    });
    const endDraw = (e) => {
      if (!this._drawing) return;
      this.strokes.push(this._drawing);
      this._drawing = null;
      this._persist();
    };
    wrap.addEventListener("pointerup", endDraw);
    wrap.addEventListener("pointercancel", endDraw);

    el.querySelector(".btn-close").addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.app.removeNode) this.app.removeNode(this.id);
    });
    this._resize();
  }

  _pt(e) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / (rect.width || 1);
    const scaleY = this.canvas.height / (rect.height || 1);
    return [Math.round((e.clientX - rect.left) * scaleX), Math.round((e.clientY - rect.top) * scaleY)];
  }

  _resize() {
    const wrap = this.el.querySelector(".draw-canvas-wrap");
    if (!wrap) return;
    this.canvas.width = Math.max(2, Math.round(wrap.clientWidth));
    this.canvas.height = Math.max(2, Math.round(wrap.clientHeight));
    this._redraw();
  }

  setSize(w, h) {
    super.setSize(w, h);
    requestAnimationFrame(() => this._resize());
  }

  _redraw() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    for (const s of this.strokes) {
      this.ctx.strokeStyle = s.color;
      this.ctx.lineWidth = s.width || 3;
      this.ctx.beginPath();
      s.points.forEach(([x, y], i) => (i === 0 ? this.ctx.moveTo(x, y) : this.ctx.lineTo(x, y)));
      this.ctx.stroke();
    }
  }

  _drawPoint(stroke) {
    const pts = stroke.points;
    if (pts.length < 2) return;
    const [x1, y1] = pts[pts.length - 2];
    const [x2, y2] = pts[pts.length - 1];
    this.ctx.strokeStyle = stroke.color;
    this.ctx.lineWidth = stroke.width || 3;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  _persist() {
    if (this.app.sendUpdateNode) {
      this.app.sendUpdateNode(this.id, { strokes: this.strokes.map((s) => ({ color: s.color, width: s.width, points: s.points.map((p) => [...p]) })) });
    }
  }

  dispose() {
    if (this.el && this.el.parentNode) this.el.remove();
  }
}
