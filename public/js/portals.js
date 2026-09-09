// Spatial Portals for Terminal Manager (Web Portals, Device Portals, Code Editors)
// Coexists with TermWidget on the infinite canvas

class BasePortalWidget {
  constructor({ id, type, title, x = 120, y = 120, width = 640, height = 480, app }) {
    this.id = id;
    this.type = type;
    this.title = title || "Portal";
    this.app = app;
    this.worldPos = { x, y };
    this.worldSize = { w: width, h: height };
    this.el = null;
  }

  setPosition(x, y) {
    this.worldPos.x = x;
    this.worldPos.y = y;
    if (this.el) {
      this.el.style.transform = `translate(${x}px, ${y}px)`;
    }
    if (this.app?.connections) {
      this.app.connections.redrawAll();
    }
  }

  setSize(w, h) {
    const minW = this.minWidth || 260;
    const minH = this.minHeight || 200;
    this.worldSize.w = Math.max(minW, Number(w) || minW);
    this.worldSize.h = Math.max(minH, Number(h) || minH);
    if (this.el) {
      this.el.style.width = `${this.worldSize.w}px`;
      this.el.style.height = `${this.worldSize.h}px`;
    }
    if (this.app?.connections) {
      this.app.connections.redrawAll();
    }
  }

  updateTitle(title) {
    this.title = title;
    if (this.titleEl) {
      this.titleEl.textContent = title;
    }
  }

  setActive(active) {
    if (this.el) {
      this.el.classList.toggle("active", active);
      if (active) {
        this.el.style.zIndex = "10";
      } else {
        this.el.style.zIndex = "1";
      }
    }
  }

  /** Snap magnético: alinha a widget vizinho quando Ctrl é mantido (FR-046). */
  _snapTo(nx, ny) {
    if (!(this._dragCtrl) ) return { x: nx, y: ny };
    const tol = 6;
    let bx = null, by = null;
    for (const o of this.app.getAllNodes ? this.app.getAllNodes() : []) {
      if (o.id === this.id || !o.el) continue;
      const ox = o.worldPos.x, oy = o.worldPos.y, ow = o.worldSize.w, oh = o.worldSize.h;
      if (Math.abs(nx - (ox + ow)) <= tol && (bx === null || Math.abs(nx - (ox + ow)) < Math.abs(bx - nx))) bx = ox + ow;
      if (Math.abs(nx + this.worldSize.w - ox) <= tol && (bx === null || Math.abs(nx + this.worldSize.w - ox) < Math.abs(nx - bx))) bx = ox - this.worldSize.w;
      if (Math.abs(ny - (oy + oh)) <= tol && (by === null || Math.abs(ny - (oy + oh)) < Math.abs(by - ny))) by = oy + oh;
      if (Math.abs(ny + this.worldSize.h - oy) <= tol && (by === null || Math.abs(ny + this.worldSize.h - oy) < Math.abs(ny - by))) by = oy - this.worldSize.h;
    }
    return { x: bx !== null ? bx : nx, y: by !== null ? by : ny };
  }

  _setupDragAndResize(handle, resizeHandle) {
    // Spatial drag
    let dragging = false;
    let startPointer = { x: 0, y: 0 };
    let startPos = { x: 0, y: 0 };

    handle.addEventListener("pointerdown", (e) => {
      if (e.target.closest("button") || e.target.closest("input") || e.target.closest("textarea")) return;
      if (e.button !== 0) return;
      dragging = true;
      this._dragCtrl = e.ctrlKey || e.metaKey;
      startPointer = { x: e.clientX, y: e.clientY };
      startPos = { x: this.worldPos.x, y: this.worldPos.y };
      this.el.classList.add("dragging");
      handle.setPointerCapture(e.pointerId);
      this.app.setActive(this.id);
      e.stopPropagation();
    });

    handle.addEventListener("dblclick", (e) => {
      if (e.target.closest("button") || e.target.closest("input") || e.target.closest("textarea")) return;
      if (this.app?.motion?.toggleElevateNode) {
        this.app.motion.toggleElevateNode(this.id);
      }
    });

    handle.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      this._dragCtrl = e.ctrlKey || e.metaKey;
      const zoom = this.app.canvas.zoom;
      const dx = (e.clientX - startPointer.x) / zoom;
      const dy = (e.clientY - startPointer.y) / zoom;
      let nx = Math.round(startPos.x + dx);
      let ny = Math.round(startPos.y + dy);
      const snapped = this._snapTo(nx, ny);
      nx = snapped.x;
      ny = snapped.y;
      this.setPosition(nx, ny);
      this.app.sendMove(this.id, nx, ny);
    });

    const stopDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      this.el.classList.remove("dragging");
      try {
        handle.releasePointerCapture(e.pointerId);
      } catch {}
      if (this.el.classList.contains("node-elevated") && this.app?.motion) {
        const sbW = document.body.classList.contains("sb-mini") ? 48 : 240;
        if (e.clientX <= sbW + 50) {
          this.app.motion.toggleElevateNode(this.id);
          this.app.motion.dockNode(this.id, "left");
          return;
        } else if (e.clientX >= window.innerWidth - 60) {
          this.app.motion.toggleElevateNode(this.id);
          this.app.motion.dockNode(this.id, "right");
          return;
        }
      }
    };

    handle.addEventListener("pointerup", stopDrag);
    handle.addEventListener("pointercancel", stopDrag);

    // Spatial resize
    let resizing = false;
    let startResizePointer = { x: 0, y: 0 };
    let startSize = { w: 0, h: 0 };

    resizeHandle.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      resizing = true;
      startResizePointer = { x: e.clientX, y: e.clientY };
      startSize = { w: this.worldSize.w, h: this.worldSize.h };
      this.el.classList.add("resizing");
      resizeHandle.setPointerCapture(e.pointerId);
      this.app.setActive(this.id);
      e.stopPropagation();
    });

    resizeHandle.addEventListener("pointermove", (e) => {
      if (!resizing) return;
      const zoom = this.app.canvas.zoom;
      const dw = (e.clientX - startResizePointer.x) / zoom;
      const dh = (e.clientY - startResizePointer.y) / zoom;
      const minW = this.minWidth || 260;
      const minH = this.minHeight || 200;
      let nw = Math.max(minW, Math.round(startSize.w + dw));
      let nh = Math.max(minH, Math.round(startSize.h + dh));
      if (this.preserveAspectRatio && !e.shiftKey) {
        const ratio = startSize.h / startSize.w;
        nh = Math.round(nw * ratio);
      }
      this.setSize(nw, nh);
      this.app.sendResize(this.id, 0, 0, nw, nh);
    });

    const stopResize = (e) => {
      if (!resizing) return;
      resizing = false;
      this.el.classList.remove("resizing");
      try {
        resizeHandle.releasePointerCapture(e.pointerId);
      } catch {}
    };

    resizeHandle.addEventListener("pointerup", stopResize);
    resizeHandle.addEventListener("pointercancel", stopResize);
  }

  _setupConnectionPorts(portLeft, portRight) {
    const bindPort = (port) => {
      let downPos = null;
      port.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        downPos = { x: e.clientX, y: e.clientY };
        if (this.app?.connections) {
          this.app.connections.startDrag(this.id, e.clientX, e.clientY);
        }
      });
      port.addEventListener("click", (e) => {
        e.stopPropagation();
        if (downPos && Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y) < 5) {
          if (this.app?.connections?.openNodeConnectionsPopover) {
            this.app.connections.openNodeConnectionsPopover(this.id, e.clientX, e.clientY);
          }
        }
      });
    };
    if (portLeft) bindPort(portLeft);
    if (portRight) bindPort(portRight);
  }

  dispose() {
    if (this.el && this.el.parentNode) {
      this.el.remove();
    }
  }

  fit() {}
  focus() {}
}

/* =========================================================================
   1. WebPortalWidget: Browser window portal with URL bar and <webview>
   ========================================================================= */
class WebPortalWidget extends BasePortalWidget {
  constructor(opts) {
    super({
      ...opts,
      type: "web-portal",
      title: opts.title || "Web Portal",
      width: opts.width || 720,
      height: opts.height || 480,
    });
    this.minWidth = 320;
    this.minHeight = 220;
    this.url = opts.url || "http://localhost:3000";
    this._createDOM();
  }

  _createDOM() {
    const el = document.createElement("div");
    el.className = "spatial-node portal-widget web-portal";
    el.dataset.id = this.id;
    el.style.width = `${this.worldSize.w}px`;
    el.style.height = `${this.worldSize.h}px`;
    el.style.transform = `translate(${this.worldPos.x}px, ${this.worldPos.y}px)`;

    el.innerHTML = `
      <div class="portal-header">
        <div class="portal-icon">${window.Icons ? window.Icons.svg("web", { size: 14 }) : "🌐"}</div>
        <div class="portal-title">${this.title}</div>
        <div class="portal-browser-bar">
          <button class="portal-btn btn-back icon-btn" title="Voltar">${window.Icons ? window.Icons.svg("chevron-left", { size: 13 }) : "‹"}</button>
          <button class="portal-btn btn-fwd icon-btn" title="Avançar">${window.Icons ? window.Icons.svg("chevron-right", { size: 13 }) : "›"}</button>
          <button class="portal-btn btn-reload icon-btn" title="Recarregar">${window.Icons ? window.Icons.svg("refresh-cw", { size: 13 }) : "↻"}</button>
          <input type="text" class="portal-url-input" value="${this.url}" spellcheck="false" placeholder="http://localhost:3000" />
          <button class="portal-btn btn-external icon-btn" title="Abrir no navegador externo">${window.Icons ? window.Icons.svg("external-link", { size: 13 }) : "↗"}</button>
        </div>
        <div class="portal-actions">
          <button class="portal-btn btn-maximize icon-btn" title="Maximizar / Restaurar">${window.Icons ? window.Icons.svg("maximize-2", { size: 13 }) : "⤢"}</button>
          <button class="portal-btn btn-close icon-btn danger" title="Fechar portal">${window.Icons ? window.Icons.svg("close", { size: 13 }) : "✕"}</button>
        </div>
      </div>
      <div class="portal-content">
        <!-- webview or iframe container -->
        <div class="portal-view-container"></div>
      </div>
      <div class="spatial-resize-handle"></div>
      <div class="conn-port conn-port-left" title="Conectar nó"></div>
      <div class="conn-port conn-port-right" title="Conectar nó"></div>
    `;

    this.el = el;
    this.titleEl = el.querySelector(".portal-title");
    const header = el.querySelector(".portal-header");
    const resizeHandle = el.querySelector(".spatial-resize-handle");
    const portLeft = el.querySelector(".conn-port-left");
    const portRight = el.querySelector(".conn-port-right");
    const urlInput = el.querySelector(".portal-url-input");
    const viewContainer = el.querySelector(".portal-view-container");

    this._setupDragAndResize(header, resizeHandle);
    this._setupConnectionPorts(portLeft, portRight);

    // Click to focus node
    el.addEventListener("pointerdown", () => {
      this.app.setActive(this.id);
    });

    // Maximize / Elevate button
    const maxBtn = el.querySelector(".btn-maximize");
    if (maxBtn) {
      maxBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.app?.motion?.toggleElevateNode) {
          this.app.motion.toggleElevateNode(this.id);
          const isElevated = el.classList.contains("node-elevated");
          maxBtn.innerHTML = window.Icons ? window.Icons.svg(isElevated ? "minimize-2" : "maximize-2", { size: 13 }) : (isElevated ? "⤡" : "⤢");
        }
      });
    }

    // Close button
    el.querySelector(".btn-close").addEventListener("click", (e) => {
      e.stopPropagation();
      this.app.removeNode(this.id);
    });

    // Browser navigation
    const backBtn = el.querySelector(".btn-back");
    const fwdBtn = el.querySelector(".btn-fwd");
    const reloadBtn = el.querySelector(".btn-reload");
    const externalBtn = el.querySelector(".btn-external");

    this._createView(viewContainer);

    urlInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        let val = urlInput.value.trim();
        if (val && !val.startsWith("http://") && !val.startsWith("https://")) {
          val = "http://" + val;
          urlInput.value = val;
        }
        this.navigate(val);
      }
    });

    reloadBtn.addEventListener("click", () => this.reload());
    backBtn.addEventListener("click", () => {
      if (this.viewEl && typeof this.viewEl.goBack === "function") this.viewEl.goBack();
    });
    fwdBtn.addEventListener("click", () => {
      if (this.viewEl && typeof this.viewEl.goForward === "function") this.viewEl.goForward();
    });
    externalBtn.addEventListener("click", () => {
      if (this.app.openExternal) this.app.openExternal(this.url);
      else window.open(this.url, "_blank");
    });
  }

  getPartition() {
    return this.sessionPartition || "persist:portal_" + (this.sharedSessionId || this.id);
  }

  syncSessionWith(otherPortal) {
    if (!otherPortal || typeof otherPortal.getPartition !== "function") return;
    if (this.app?.send) {
      this.app.send({
        type: "portal_sync_cookies",
        fromPartition: this.getPartition(),
        toPartition: otherPortal.getPartition(),
      });
    }
  }

  _createView(container) {
    container.innerHTML = "";
    // Check if Electron webview tag is available
    if (window.appBridge) {
      const webview = document.createElement("webview");
      webview.setAttribute("src", this.url);
      webview.setAttribute("allowpopups", "true");
      const partition = this.sessionPartition || "persist:portal_" + (this.sharedSessionId || this.id);
      webview.setAttribute("partition", partition);
      webview.className = "portal-webview";
      webview.addEventListener("did-start-loading", () => {
        this.el.classList.add("loading");
      });
      webview.addEventListener("did-stop-loading", () => {
        this.el.classList.remove("loading");
        try {
          const current = webview.getURL();
          if (current && current !== "about:blank") {
            this.url = current;
            const input = this.el.querySelector(".portal-url-input");
            if (input && document.activeElement !== input) input.value = current;
          }
        } catch {}
      });
      container.appendChild(webview);
      this.viewEl = webview;
    } else {
      // Fallback iframe
      const iframe = document.createElement("iframe");
      iframe.src = this.url;
      iframe.className = "portal-webview";
      container.appendChild(iframe);
      this.viewEl = iframe;
    }
    this._observeViewSize(container);
  }

  /** Mantém o <webview>/iframe com tamanho em px sincronizado com o container em coordenadas do mundo (sem distorção de zoom). */
  _observeViewSize(container) {
    const sync = () => {
      if (!this.viewEl) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w && h) {
        this.viewEl.style.width = `${w}px`;
        this.viewEl.style.height = `${h}px`;
      }
    };
    if (typeof ResizeObserver === "function") {
      this._ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect && entry.contentRect.width && entry.contentRect.height) {
            if (this.viewEl) {
              this.viewEl.style.width = `${Math.round(entry.contentRect.width)}px`;
              this.viewEl.style.height = `${Math.round(entry.contentRect.height)}px`;
            }
          } else {
            sync();
          }
        }
      });
      this._ro.observe(container);
    }
    requestAnimationFrame(sync);
  }

  dispose() {
    if (this._ro) this._ro.disconnect();
    if (this.el && this.el.parentNode) this.el.remove();
  }

  navigate(url) {
    this.url = url;
    if (this.viewEl) {
      if (typeof this.viewEl.loadURL === "function") {
        this.viewEl.loadURL(url);
      } else {
        this.viewEl.src = url;
      }
    }
    const input = this.el.querySelector(".portal-url-input");
    if (input) input.value = url;
    this.app.sendUpdateNode(this.id, { url });
  }

  reload() {
    if (this.viewEl) {
      if (typeof this.viewEl.reload === "function") this.viewEl.reload();
      else this.viewEl.src = this.url;
    }
  }

  setZoom(factor) {
    if (this.viewEl && typeof this.viewEl.setZoomFactor === "function") {
      this.viewEl.setZoomFactor(factor);
    }
  }

  /* ---- Automação de Portais Web via CLI terminalmanager portal (T036 / US7 / FR-040) ---- */
  async evalJS(code) {
    if (this.viewEl && typeof this.viewEl.executeJavaScript === "function") {
      return this.viewEl.executeJavaScript(code);
    }
    return null;
  }

  async clickSelector(selector) {
    return this.evalJS(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (el) { el.click(); return true; }
      return false;
    })()`);
  }

  async typeSelector(selector, text) {
    return this.evalJS(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (el) {
        el.value = ${JSON.stringify(text)};
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    })()`);
  }

  async getDOM() {
    return this.evalJS(`document.documentElement.outerHTML`);
  }

  async takeScreenshot() {
    if (this.viewEl && typeof this.viewEl.capturePage === "function") {
      const nativeImg = await this.viewEl.capturePage();
      return nativeImg.toDataURL();
    }
    return null;
  }
}

const MOBILE_USER_AGENTS = {
  pixel9:
    "Mozilla/5.0 (Linux; Android 14; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
  iphone17:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
};

/* =========================================================================
   2. DevicePortalWidget: Mobile phone device frame (Pixel 9 / iPhone)
   ========================================================================= */
class DevicePortalWidget extends BasePortalWidget {
  constructor(opts) {
    super({
      ...opts,
      type: "device-portal",
      title: opts.title || (opts.deviceModel === "iphone17" ? "iPhone 17 Pro Max" : "Pixel 9"),
      width: opts.width || 380,
      height: opts.height || 740,
    });
    this.deviceModel = opts.deviceModel || "pixel9";
    this.url = opts.url || "http://localhost:3000";
    this.status = opts.status || "connected";
    this.orientation = opts.orientation || (this.worldSize.w > this.worldSize.h ? "landscape" : "portrait");
    this.preserveAspectRatio = true;
    this.minWidth = 240;
    this.minHeight = 360;
    this._createDOM();
  }

  _createDOM() {
    const el = document.createElement("div");
    el.className = `spatial-node portal-widget device-portal ${this.deviceModel}${this.orientation === "landscape" ? " landscape" : ""}`;
    el.dataset.id = this.id;
    el.style.width = `${this.worldSize.w}px`;
    el.style.height = `${this.worldSize.h}px`;
    el.style.transform = `translate(${this.worldPos.x}px, ${this.worldPos.y}px)`;

    const isApple = this.deviceModel === "iphone17";

    el.innerHTML = `
      <div class="device-header">
        <div class="device-notch-icon">${window.Icons ? window.Icons.svg("smartphone", { size: 14 }) : "📱"}</div>
        <div class="portal-title">${this.title}</div>
        <input type="text" class="device-url-input" value="${this.url}" spellcheck="false" placeholder="http://localhost:3000" title="URL da aplicação móvel" />
        <div class="device-status-badge ${this.status}">${this.status === "connected" ? "Online" : "Offline"}</div>
        <div class="portal-actions">
          <button class="portal-btn btn-rotate icon-btn" title="Alternar orientação (Retrato / Paisagem)">${window.Icons ? window.Icons.svg("rotate", { size: 13 }) : "🔄"}</button>
          <button class="portal-btn btn-reload icon-btn" title="Recarregar tela">${window.Icons ? window.Icons.svg("refresh-cw", { size: 13 }) : "↻"}</button>
          <button class="portal-btn btn-maximize icon-btn" title="Maximizar / Restaurar">${window.Icons ? window.Icons.svg("maximize-2", { size: 13 }) : "⤢"}</button>
          <button class="portal-btn btn-close icon-btn danger" title="Fechar emulador">${window.Icons ? window.Icons.svg("close", { size: 13 }) : "✕"}</button>
        </div>
      </div>
      
      <!-- Smartphone chassis frame -->
      <div class="phone-frame">
        <div class="phone-side-btn btn-vol-up" title="Aumentar Volume"></div>
        <div class="phone-side-btn btn-vol-down" title="Diminuir Volume"></div>
        <div class="phone-side-btn btn-power" title="Power / Bloquear Tela"></div>
        <div class="phone-speaker"></div>
        <div class="phone-camera"></div>
        
        <!-- Screen status bar -->
        <div class="phone-status-bar">
          <span class="phone-time">09:41</span>
          <div class="phone-island ${isApple ? "dynamic-island" : "pinhole"}"></div>
          <span class="phone-icons">5G 100% 🔋</span>
        </div>
        
        <!-- Screen webview or app preview -->
        <div class="phone-screen-container"></div>
        
        <!-- Home bar / Android navigation buttons -->
        ${!isApple ? `
        <div class="phone-nav-buttons">
          <button class="phone-nav-btn btn-back" title="Voltar (Back)">◀</button>
          <button class="phone-nav-btn btn-home" title="Início (Home)">●</button>
          <button class="phone-nav-btn btn-recents" title="Recentes (Apps)">■</button>
        </div>` : `
        <div class="phone-home-indicator" title="Início (Home)"></div>`}
      </div>

      <div class="spatial-resize-handle"></div>
      <div class="conn-port conn-port-left" title="Conectar ao emulador"></div>
      <div class="conn-port conn-port-right" title="Conectar ao emulador"></div>
    `;

    this.el = el;
    this.titleEl = el.querySelector(".portal-title");
    const header = el.querySelector(".device-header");
    const resizeHandle = el.querySelector(".spatial-resize-handle");
    const portLeft = el.querySelector(".conn-port-left");
    const portRight = el.querySelector(".conn-port-right");
    const screenContainer = el.querySelector(".phone-screen-container");
    const urlInput = el.querySelector(".device-url-input");

    this._setupDragAndResize(header, resizeHandle);
    this._setupConnectionPorts(portLeft, portRight);

    el.addEventListener("pointerdown", () => {
      this.app.setActive(this.id);
    });

    // Controles físicos laterais (T038 / US7)
    el.querySelector(".btn-vol-up")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.app.send?.({
        type: "portal_device_action",
        deviceId: this.deviceId || this.id,
        platform: isApple ? "ios" : "android",
        action: "key",
        params: { key: "volume_up" },
      });
    });
    el.querySelector(".btn-vol-down")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.app.send?.({
        type: "portal_device_action",
        deviceId: this.deviceId || this.id,
        platform: isApple ? "ios" : "android",
        action: "key",
        params: { key: "volume_down" },
      });
    });
    el.querySelector(".btn-power")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.isLocked = !this.isLocked;
      screenContainer.classList.toggle("phone-screen-locked", this.isLocked);
      this.app.send?.({
        type: "portal_device_action",
        deviceId: this.deviceId || this.id,
        platform: isApple ? "ios" : "android",
        action: "key",
        params: { key: "lock" },
      });
    });

    // Botões de navegação inferiores
    el.querySelector(".btn-back")?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.viewEl && typeof this.viewEl.goBack === "function" && this.viewEl.canGoBack()) {
        this.viewEl.goBack();
      }
      this.app.send?.({
        type: "portal_device_action",
        deviceId: this.deviceId || this.id,
        platform: "android",
        action: "key",
        params: { key: "back" },
      });
    });
    const triggerHome = (e) => {
      e.stopPropagation();
      this.app.send?.({
        type: "portal_device_action",
        deviceId: this.deviceId || this.id,
        platform: isApple ? "ios" : "android",
        action: "key",
        params: { key: "home" },
      });
    };
    el.querySelector(".btn-home")?.addEventListener("click", triggerHome);
    el.querySelector(".phone-home-indicator")?.addEventListener("click", triggerHome);
    el.querySelector(".btn-recents")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.app.send?.({
        type: "portal_device_action",
        deviceId: this.deviceId || this.id,
        platform: "android",
        action: "key",
        params: { key: "recents" },
      });
    });

    // Controle tátil e gestos de toque/deslize (swipe)
    let touchStart = null;
    screenContainer.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      touchStart = { x: e.clientX, y: e.clientY, time: Date.now() };
    });
    screenContainer.addEventListener("pointerup", (e) => {
      if (!touchStart) return;
      const dx = e.clientX - touchStart.x;
      const dy = e.clientY - touchStart.y;
      const dt = Date.now() - touchStart.time;
      touchStart = null;
      if (dt < 600 && (Math.abs(dx) > 30 || Math.abs(dy) > 30)) {
        const direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
        this.app.send?.({
          type: "portal_device_action",
          deviceId: this.deviceId || this.id,
          platform: isApple ? "ios" : "android",
          action: "swipe",
          params: { direction, dx, dy },
        });
      }
    });

    // Maximize / Elevate button
    const maxBtn = el.querySelector(".btn-maximize");
    if (maxBtn) {
      maxBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.app?.motion?.toggleElevateNode) {
          this.app.motion.toggleElevateNode(this.id);
          const isElevated = el.classList.contains("node-elevated");
          maxBtn.innerHTML = window.Icons ? window.Icons.svg(isElevated ? "minimize-2" : "maximize-2", { size: 13 }) : (isElevated ? "⤡" : "⤢");
        }
      });
    }

    el.querySelector(".btn-close").addEventListener("click", (e) => {
      e.stopPropagation();
      this.app.removeNode(this.id);
    });

    el.querySelector(".btn-reload").addEventListener("click", () => this.reload());

    el.querySelector(".btn-rotate")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleOrientation();
    });

    urlInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        let val = urlInput.value.trim();
        if (val && !val.startsWith("http://") && !val.startsWith("https://")) {
          val = "http://" + val;
          urlInput.value = val;
        }
        this.setURL(val);
      }
    });

    this._createView(screenContainer);

    // Clock updater
    const updateTime = () => {
      const timeEl = el.querySelector(".phone-time");
      if (timeEl) {
        const d = new Date();
        timeEl.textContent = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      }
    };
    updateTime();
    this._timeInterval = setInterval(updateTime, 30000);
  }

  toggleOrientation() {
    this.orientation = this.orientation === "landscape" ? "portrait" : "landscape";
    this.el.classList.toggle("landscape", this.orientation === "landscape");
    const nw = this.worldSize.h;
    const nh = this.worldSize.w;
    this.setSize(nw, nh);
    this.app.sendResize(this.id, 0, 0, nw, nh);
    this.app.sendUpdateNode(this.id, { orientation: this.orientation });
  }

  _createView(container) {
    container.innerHTML = "";
    if (window.appBridge) {
      const webview = document.createElement("webview");
      webview.setAttribute("src", this.url);
      webview.setAttribute("allowpopups", "true");
      const ua = MOBILE_USER_AGENTS[this.deviceModel] || MOBILE_USER_AGENTS.pixel9;
      webview.setAttribute("useragent", ua);
      webview.addEventListener("dom-ready", () => {
        try {
          webview.executeJavaScript(`
            if (!document.querySelector('meta[name="viewport"]')) {
              const meta = document.createElement('meta');
              meta.name = 'viewport';
              meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=5.0';
              document.head.appendChild(meta);
            }
          `);
        } catch {}
      });
      webview.addEventListener("did-stop-loading", () => {
        try {
          const current = webview.getURL();
          if (current && current !== "about:blank") {
            this.url = current;
            const input = this.el.querySelector(".device-url-input");
            if (input && document.activeElement !== input) input.value = current;
          }
        } catch {}
      });
      container.appendChild(webview);
      this.viewEl = webview;
    } else {
      const iframe = document.createElement("iframe");
      iframe.src = this.url;
      iframe.className = "phone-webview";
      container.appendChild(iframe);
      this.viewEl = iframe;
    }
    this._observeViewSize(container);
  }

  /** Mantém o <webview>/iframe do aparelho sincronizado com tamanho do container em coordenadas do mundo. */
  _observeViewSize(container) {
    const sync = () => {
      if (!this.viewEl) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w && h) {
        this.viewEl.style.width = `${w}px`;
        this.viewEl.style.height = `${h}px`;
      }
    };
    if (typeof ResizeObserver === "function") {
      this._ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect && entry.contentRect.width && entry.contentRect.height) {
            if (this.viewEl) {
              this.viewEl.style.width = `${Math.round(entry.contentRect.width)}px`;
              this.viewEl.style.height = `${Math.round(entry.contentRect.height)}px`;
            }
          } else {
            sync();
          }
        }
      });
      this._ro.observe(container);
    }
    requestAnimationFrame(sync);
  }

  reload() {
    if (this.viewEl) {
      if (typeof this.viewEl.reload === "function") this.viewEl.reload();
      else this.viewEl.src = this.url;
    }
  }

  setURL(url) {
    this.url = url;
    if (this.viewEl) {
      if (typeof this.viewEl.loadURL === "function") this.viewEl.loadURL(url);
      else this.viewEl.src = url;
    }
    const input = this.el.querySelector(".device-url-input");
    if (input) input.value = url;
    this.app.sendUpdateNode(this.id, { url });
  }

  setZoom(factor) {
    if (this.viewEl && typeof this.viewEl.setZoomFactor === "function") {
      this.viewEl.setZoomFactor(factor);
    }
  }

  dispose() {
    if (this._timeInterval) clearInterval(this._timeInterval);
    if (this._ro) this._ro.disconnect();
    super.dispose();
  }
}

/* =========================================================================
   3. EditorWidget: Code editor / project workspace card
   ========================================================================= */
class EditorWidget extends BasePortalWidget {
  constructor(opts) {
    super({
      ...opts,
      type: "code-editor",
      title: opts.title || "Workspace Code",
      width: opts.width || 420,
      height: opts.height || 340,
    });
    this.projectPath = opts.projectPath || "./";
    this._createDOM();
  }

  _createDOM() {
    const el = document.createElement("div");
    el.className = "spatial-node portal-widget editor-widget";
    el.dataset.id = this.id;
    el.style.width = `${this.worldSize.w}px`;
    el.style.height = `${this.worldSize.h}px`;
    el.style.transform = `translate(${this.worldPos.x}px, ${this.worldPos.y}px)`;

    el.innerHTML = `
      <div class="portal-header">
        <div class="portal-icon">${window.Icons ? window.Icons.svg("code", { size: 14 }) : "💻"}</div>
        <div class="portal-title">${this.title}</div>
        <div class="portal-actions">
          <button class="portal-btn btn-close icon-btn danger" title="Fechar editor">${window.Icons ? window.Icons.svg("close", { size: 13 }) : "✕"}</button>
        </div>
      </div>
      
      <div class="editor-body">
        <div class="editor-info">
          <div class="editor-label">Diretório do Projeto</div>
          <div class="editor-path" title="${this.projectPath}">${this.projectPath}</div>
        </div>

        <div class="editor-actions-list">
          <button class="btn-vscode-open btn" style="gap: 6px;">
            <span class="vscode-icon" style="display:inline-flex;align-items:center;">${window.Icons ? window.Icons.svg("editor", { size: 14 }) : "⚡"}</span> Abrir no VS Code
          </button>
          <button class="btn-folder-open btn" style="gap: 6px;">
            <span style="display:inline-flex;align-items:center;">${window.Icons ? window.Icons.svg("folder-open", { size: 14 }) : "📁"}</span> Abrir Pasta Local
          </button>
        </div>

        <div class="editor-meta">
          <div class="meta-item">Status: <span>Pronto</span></div>
          <div class="meta-item">Ambiente: <span>Local / Git</span></div>
        </div>
      </div>

      <div class="spatial-resize-handle"></div>
      <div class="conn-port conn-port-left" title="Conectar editor"></div>
      <div class="conn-port conn-port-right" title="Conectar editor"></div>
    `;

    this.el = el;
    this.titleEl = el.querySelector(".portal-title");
    const header = el.querySelector(".portal-header");
    const resizeHandle = el.querySelector(".spatial-resize-handle");
    const portLeft = el.querySelector(".conn-port-left");
    const portRight = el.querySelector(".conn-port-right");

    this._setupDragAndResize(header, resizeHandle);
    this._setupConnectionPorts(portLeft, portRight);

    el.addEventListener("pointerdown", () => {
      this.app.setActive(this.id);
    });

    el.querySelector(".btn-close").addEventListener("click", (e) => {
      e.stopPropagation();
      this.app.removeNode(this.id);
    });

    el.querySelector(".btn-vscode-open").addEventListener("click", () => {
      if (this.app.sendOpenVSCode) {
        this.app.sendOpenVSCode(this.projectPath);
      }
    });

    el.querySelector(".btn-folder-open").addEventListener("click", () => {
      if (this.app.openExternal) {
        this.app.openExternal(this.projectPath);
      }
    });
  }
}

window.BasePortalWidget = BasePortalWidget;
window.WebPortalWidget = WebPortalWidget;
window.DevicePortalWidget = DevicePortalWidget;
window.EditorWidget = EditorWidget;
