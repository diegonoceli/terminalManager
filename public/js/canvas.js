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

    // Drag-and-drop de arquivos .md, .markdown e .txt do Finder (US4, T026 / FR-025)
    this.viewport.addEventListener("dragover", (e) => {
      if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes("Files")) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }
    });
    this.viewport.addEventListener("drop", async (e) => {
      if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
      const files = Array.from(e.dataTransfer.files).filter((f) => {
        const name = (f.name || "").toLowerCase();
        return name.endsWith(".md") || name.endsWith(".markdown") || name.endsWith(".txt");
      });
      if (!files.length) return;
      e.preventDefault();
      e.stopPropagation();

      let offset = 0;
      for (const file of files) {
        const name = file.name.replace(/\.(md|markdown|txt)$/i, "");
        let text = "";
        try {
          text = await file.text();
        } catch {}
        const pt = this.screenToWorld(e.clientX + offset, e.clientY + offset);
        offset += 30;
        if (window.app && window.app.send) {
          window.app.send({
            type: "create_node",
            node: {
              type: "note",
              title: name || "Nota",
              content: text,
              x: Math.round(pt.x),
              y: Math.round(pt.y),
              width: 360,
              height: 300,
              filePath: file.path || undefined,
              internal: !file.path,
            },
          });
        }
      }
      if (typeof window.toast === "function") {
        window.toast(`${files.length} nota(s) importada(s) do Finder.`);
      }
    });

    window.addEventListener("keydown", (e) => {
      if (e.code === "Space" && !this._isEditingText(e.target) && !this._spacePressed) {
        this._spacePressed = true;
        this.viewport.classList.add("space-grab");
      }
    });
    window.addEventListener("keyup", (e) => {
      if (e.code === "Space") {
        this._spacePressed = false;
        this.viewport.classList.remove("space-grab");
      }
    });
  }

  _isEditingText(target) {
    if (!target) return false;
    const tag = target.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable || target.closest(".xterm");
  }

  /* ---- transform helpers ---- */
  apply() {
    this.world.style.transform = `translate(${this.tx}px, ${this.ty}px) scale(${this.zoom})`;
    const gs = this.gridSize * this.zoom;
    this.grid.style.backgroundSize = `${gs}px ${gs}px`;
    this.grid.style.backgroundPosition = `${this.tx}px ${this.ty}px`;

    // Dynamic dot alpha and sizing for elegant Liquid Glass dot grid
    const dotAlpha = Math.min(0.22, Math.max(0.06, 0.14 * Math.min(this.zoom, 1.2)));
    this.grid.style.setProperty("--canvas-dot-color", `rgba(255, 255, 255, ${dotAlpha})`);

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

  /** Transição de perspectiva 3D para troca e visualização de andares (T041 / FR-035). */
  transitionFloor3D(direction = "up", callback) {
    const world = this.world;
    if (!world) {
      if (callback) callback();
      return;
    }
    const angle = direction === "up" ? 18 : -18;
    const tz = -250;

    world.style.transition = "transform 0.32s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.32s ease";
    world.style.transform = `translate(${this.tx}px, ${this.ty}px) scale(${this.zoom * 0.9}) perspective(1000px) rotateX(${angle}deg) translateZ(${tz}px)`;
    world.style.opacity = "0.2";

    setTimeout(() => {
      if (callback) callback();
      world.style.transform = `translate(${this.tx}px, ${this.ty}px) scale(${this.zoom * 0.9}) perspective(1000px) rotateX(${-angle}deg) translateZ(${tz}px)`;
      requestAnimationFrame(() => {
        world.style.transition = "transform 0.38s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.38s ease";
        world.style.transform = `translate(${this.tx}px, ${this.ty}px) scale(${this.zoom})`;
        world.style.opacity = "1";
        setTimeout(() => {
          world.style.transition = "";
          this.apply();
        }, 380);
      });
    }, 320);
  }

  /** Navegação suave de câmera com translação e zoom para um nó ou ponto (T051 / FR-048). */
  panTo(targetX, targetY, targetZoom = null, duration = 400) {
    const startTx = this.tx;
    const startTy = this.ty;
    const startZoom = this.zoom;
    const endZoom = targetZoom !== null ? targetZoom : this.zoom;

    const endTx = (this.viewport.clientWidth / 2) - (targetX * endZoom);
    const endTy = (this.viewport.clientHeight / 2) - (targetY * endZoom);

    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = 1 - Math.pow(1 - progress, 3);

      this.tx = startTx + (endTx - startTx) * ease;
      this.ty = startTy + (endTy - startTy) * ease;
      this.zoom = startZoom + (endZoom - startZoom) * ease;
      this.apply();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }

  /* ---- Magnetic Tile Snapping (Ctrl + Drag) & Spatial Alignment ---- */
  computeMagneticSnap(activeWidget, rawX, rawY, widgets, threshold = 24) {
    let bestX = Math.round(rawX / 20) * 20;
    let bestY = Math.round(rawY / 20) * 20;
    let minDx = threshold + 1;
    let minDy = threshold + 1;

    const myW = activeWidget?.worldSize?.width || activeWidget?.width || 360;
    const myH = activeWidget?.worldSize?.height || activeWidget?.height || 260;

    if (widgets && widgets.size) {
      for (const w of widgets.values()) {
        if (!w || w.id === activeWidget?.id || !w.worldPos) continue;
        const ox = w.worldPos.x;
        const oy = w.worldPos.y;
        const ow = w.worldSize?.width || w.width || 360;
        const oh = w.worldSize?.height || w.height || 260;

        const xCandidates = [ox, ox + ow, ox - myW, ox + ow - myW];
        for (const cx of xCandidates) {
          const diff = Math.abs(rawX - cx);
          if (diff < minDx) {
            minDx = diff;
            bestX = cx;
          }
        }

        const yCandidates = [oy, oy + oh, oy - myH, oy + oh - myH];
        for (const cy of yCandidates) {
          const diff = Math.abs(rawY - cy);
          if (diff < minDy) {
            minDy = diff;
            bestY = cy;
          }
        }
      }
    }

    return { x: bestX, y: bestY };
  }

  arrangeGrid(widgetsList, startX = 60, startY = 60, gap = 24, cols = 3) {
    if (!widgetsList || !widgetsList.length) return;
    let col = 0;
    let row = 0;
    let maxHeightInRow = 0;
    let curX = startX;
    let curY = startY;

    for (let i = 0; i < widgetsList.length; i++) {
      const w = widgetsList[i];
      if (!w || typeof w.setPosition !== "function") continue;
      const ww = w.worldSize?.width || w.width || 360;
      const wh = w.worldSize?.height || w.height || 260;

      w.setPosition(curX, curY);
      maxHeightInRow = Math.max(maxHeightInRow, wh);

      col++;
      if (col >= cols) {
        col = 0;
        row++;
        curX = startX;
        curY += maxHeightInRow + gap;
        maxHeightInRow = 0;
      } else {
        curX += ww + gap;
      }
    }
  }

  alignNodes(widgetsList, alignment) {
    if (!widgetsList || widgetsList.length < 2) return;
    const boxes = widgetsList.map((w) => ({
      w,
      x: w.worldPos?.x ?? 0,
      y: w.worldPos?.y ?? 0,
      width: w.worldSize?.width || w.width || 360,
      height: w.worldSize?.height || w.height || 260,
    }));

    switch (alignment) {
      case "left": {
        const minX = Math.min(...boxes.map((b) => b.x));
        boxes.forEach((b) => b.w.setPosition(minX, b.y));
        break;
      }
      case "centerH": {
        const avgCenterX = boxes.reduce((acc, b) => acc + (b.x + b.width / 2), 0) / boxes.length;
        boxes.forEach((b) => b.w.setPosition(avgCenterX - b.width / 2, b.y));
        break;
      }
      case "right": {
        const maxRight = Math.max(...boxes.map((b) => b.x + b.width));
        boxes.forEach((b) => b.w.setPosition(maxRight - b.width, b.y));
        break;
      }
      case "top": {
        const minY = Math.min(...boxes.map((b) => b.y));
        boxes.forEach((b) => b.w.setPosition(b.x, minY));
        break;
      }
      case "centerV": {
        const avgCenterY = boxes.reduce((acc, b) => acc + (b.y + b.height / 2), 0) / boxes.length;
        boxes.forEach((b) => b.w.setPosition(b.x, avgCenterY - b.height / 2));
        break;
      }
      case "bottom": {
        const maxBottom = Math.max(...boxes.map((b) => b.y + b.height));
        boxes.forEach((b) => b.w.setPosition(b.x, maxBottom - b.height));
        break;
      }
      case "distributeH": {
        boxes.sort((a, b) => a.x - b.x);
        const minX = boxes[0].x;
        const maxX = boxes[boxes.length - 1].x;
        const step = (maxX - minX) / (boxes.length - 1);
        boxes.forEach((b, i) => b.w.setPosition(minX + i * step, b.y));
        break;
      }
      case "distributeV": {
        boxes.sort((a, b) => a.y - b.y);
        const minY = boxes[0].y;
        const maxY = boxes[boxes.length - 1].y;
        const step = (maxY - minY) / (boxes.length - 1);
        boxes.forEach((b, i) => b.w.setPosition(b.x, minY + i * step));
        break;
      }
    }
  }

  setZoom(z, cx, cy) {
    this._stopAnim();
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
    this._stopAnim();
    this.tx += dx;
    this.ty += dy;
    this.apply();
  }

  panTo(wx, wy) {
    this._stopAnim();
    const rect = this.viewport.getBoundingClientRect();
    this.tx = rect.width / 2 - wx * this.zoom;
    this.ty = rect.height / 2 - wy * this.zoom;
    this.apply();
  }

  animateTo(target, opts = {}) {
    this._stopAnim();
    const reduced = window.app?.motion?.isReduced ? window.app.motion.isReduced() : false;
    const dur = reduced ? 0 : (opts.duration ?? 300);
    if (dur <= 0) {
      if (target.tx !== undefined) this.tx = target.tx;
      if (target.ty !== undefined) this.ty = target.ty;
      if (target.zoom !== undefined) this.zoom = target.zoom;
      this.apply();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      const start = { tx: this.tx, ty: this.ty, zoom: this.zoom };
      const t0 = performance.now();
      const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur);
        const e = ease(k);
        if (target.tx !== undefined) this.tx = start.tx + (target.tx - start.tx) * e;
        if (target.ty !== undefined) this.ty = start.ty + (target.ty - start.ty) * e;
        if (target.zoom !== undefined) this.zoom = start.zoom + (target.zoom - start.zoom) * e;
        this.apply();
        if (k < 1) {
          this._animId = requestAnimationFrame(step);
        } else {
          this._animId = null;
          resolve();
        }
      };
      this._animId = requestAnimationFrame(step);
    });
  }

  _stopAnim() {
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
  }

  fitAll(bounds) {
    this._stopAnim();
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
    const isBg = (e.target === this.viewport || e.target === this.grid || e.target.id === "connections-layer");
    const isSpaceOrMiddle = e.button === 1 || this._spacePressed;
    if (!isBg && !isSpaceOrMiddle) return;
    if (e.button !== 0 && e.button !== 1) return;
    this._panning = true;
    this._lastX = e.clientX;
    this._lastY = e.clientY;
    this.viewport.classList.add("panning");
    try {
      this.viewport.setPointerCapture(e.pointerId);
    } catch {}
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
