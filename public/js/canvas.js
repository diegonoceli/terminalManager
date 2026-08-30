class Canvas {
  constructor(viewport, world, grid) {
    this.viewport = viewport;
    this.world = world;
    this.grid = grid;
    this.zoom = 1;
    this.tx = 0;
    this.ty = 0;
    this.gridSize = 24;

    this.onZoom = null;
    this.onEmptyDrag = null;
    this.onViewportClick = null;

    this._bindEvents();
    this.apply();
  }

  _bindEvents() {
    this.viewport.addEventListener("pointerdown", (e) => this._onPointerDown(e));
    this.viewport.addEventListener("pointermove", (e) => this._onPointerMove(e));
    this.viewport.addEventListener("pointerup", (e) => this._onPointerUp(e));
    this.viewport.addEventListener("pointercancel", (e) => this._onPointerUp(e));
    this.viewport.addEventListener("wheel", (e) => this._onWheel(e), { passive: false });
    this.viewport.addEventListener("click", (e) => this._onClick(e));
    this.viewport.addEventListener("dblclick", (e) => this._onDblClick(e));
  }

  /* ---- transform helpers ---- */
  apply() {
    this.world.style.transform = `translate(${this.tx}px, ${this.ty}px) scale(${this.zoom})`;
    const gs = this.gridSize * this.zoom;
    this.grid.style.backgroundSize = `${gs}px ${gs}px`;
    this.grid.style.backgroundPosition = `${this.tx}px ${this.ty}px`;
    if (this.onZoom) this.onZoom(this.zoom);
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.tx) / this.zoom,
      y: (sy - this.ty) / this.zoom,
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: wx * this.zoom + this.tx,
      y: wy * this.zoom + this.ty,
    };
  }

  screenToWorldDelta(dsx, dsy) {
    return { x: dsx / this.zoom, y: dsy / this.zoom };
  }

  setZoom(z, cx, cy) {
    const prev = this.zoom;
    z = Math.min(2.5, Math.max(0.1, z));
    if (cx === undefined) {
      const rect = this.viewport.getBoundingClientRect();
      cx = rect.width / 2;
      cy = rect.height / 2;
    }
    const wx = (cx - this.tx) / this.zoom;
    const wy = (cy - this.ty) / this.zoom;
    this.zoom = z;
    this.tx = cx - wx * z;
    this.ty = cy - wy * z;
    this.apply();
    return z !== prev;
  }

  zoomAt(factor, cx, cy) {
    this.setZoom(this.zoom * factor, cx, cy);
  }

  panBy(dx, dy) {
    this.tx += dx;
    this.ty += dy;
    this.apply();
  }

  panTo(wx, wy) {
    const rect = this.viewport.getBoundingClientRect();
    this.tx = rect.width / 2 - wx * this.zoom;
    this.ty = rect.height / 2 - wy * this.zoom;
    this.apply();
  }

  fitAll(bounds) {
    if (!bounds) return;
    const rect = this.viewport.getBoundingClientRect();
    const pad = 60;
    const bw = bounds.width || 1;
    const bh = bounds.height || 1;
    const zx = (rect.width - pad * 2) / bw;
    const zy = (rect.height - pad * 2) / bh;
    const z = Math.min(2.5, Math.max(0.1, Math.min(zx, zy, 1)));
    this.zoom = z;
    this.tx = rect.width / 2 - (bounds.x + bw / 2) * z;
    this.ty = rect.height / 2 - (bounds.y + bh / 2) * z;
    this.apply();
  }

  get viewportSize() {
    const rect = this.viewport.getBoundingClientRect();
    return { w: rect.width, h: rect.height };
  }

  /* ---- pan by dragging empty canvas ---- */
  _onPointerDown(e) {
    if (e.target !== this.viewport && e.target !== this.grid) return;
    if (e.button !== 0 && e.button !== 1) return;
    this._panning = true;
    this._lastX = e.clientX;
    this._lastY = e.clientY;
    this.viewport.classList.add("panning");
    this.viewport.setPointerCapture(e.pointerId);
    this._panPointerId = e.pointerId;
  }

  _onPointerMove(e) {
    if (this._panning && e.pointerId === this._panPointerId) {
      const dx = e.clientX - this._lastX;
      const dy = e.clientY - this._lastY;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
      this.panBy(dx, dy);
      if (this.onEmptyDrag) this.onEmptyDrag(dx, dy);
    }
  }

  _onPointerUp(e) {
    if (this._panning && e.pointerId === this._panPointerId) {
      this._panning = false;
      this.viewport.classList.remove("panning");
      if (this._panMoved) {
        if (this.onViewportClick) this.onViewportClick();
      }
      this._panMoved = false;
    }
  }

  _onWheel(e) {
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015));
    this.zoomAt(factor, e.clientX, e.clientY);
    this._panMoved = true;
  }

  _onClick(e) {
    if (e.target === this.viewport || e.target === this.grid) {
      if (this.onViewportClick) this.onViewportClick();
    }
  }

  _onDblClick() {}
}
