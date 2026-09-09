/**
 * Maestri Floating Liquid Glass Dock
 * Floating macOS-style dock toolbar with frosted glassmorphism, buttery smooth hovers,
 * creation shortcuts, and viewport camera controls.
 */
(function (root) {
  'use strict';

  class FloatingDock {
    constructor(container, app) {
      this.container = container;
      this.app = app;
      this.el = null;
      this._zoomReadout = null;
      this._statusDot = null;
      this._statusText = null;

      this.init();
    }

    init() {
      this.el = document.createElement("nav");
      this.el.id = "floating-dock";
      this.el.className = "floating-dock glass-surface";
      this.el.setAttribute("aria-label", "Barra de ferramentas principal");

      this._renderItems();
      this.container.appendChild(this.el);

      // Listen for canvas zoom updates to refresh readout
      if (this.app?.canvas) {
        const origOnZoom = this.app.canvas.onZoom;
        this.app.canvas.onZoom = (z) => {
          if (origOnZoom) origOnZoom(z);
          this.updateZoom(z);
        };
      }
    }

    _renderItems() {
      const svg = (name, opts = {}) => (window.Icons ? window.Icons.svg(name, { size: 16, strokeWidth: 1.5, ...opts }) : "");

      // Group 1: Creation Tools
      const creationGroup = document.createElement("div");
      creationGroup.className = "dock-group";

      const tools = [
        {
          id: "dock-btn-term",
          label: "Novo Terminal (N)",
          icon: svg("terminal"),
          action: () => {
            const btn = document.getElementById("btn-new");
            if (btn) btn.click();
            else if (typeof this.app.requestNewTerminal === "function") this.app.requestNewTerminal();
          },
          primary: true,
        },
        {
          id: "dock-btn-web",
          label: "Navegador Web",
          icon: svg("web"),
          action: () => document.getElementById("btn-new-web")?.click(),
        },
        {
          id: "dock-btn-device",
          label: "Device Portal (Mobile)",
          icon: svg("device"),
          action: () => document.getElementById("btn-new-device")?.click(),
        },
        {
          id: "dock-btn-note",
          label: "Nota Markdown",
          icon: svg("note"),
          action: () => document.getElementById("btn-new-note")?.click(),
        },
        {
          id: "dock-btn-binder",
          label: "Fichário Espacial",
          icon: svg("file-text"),
          action: () => document.getElementById("btn-new-binder")?.click(),
        },
        {
          id: "dock-btn-files",
          label: "Árvore de Arquivos",
          icon: svg("file-tree"),
          action: () => document.getElementById("btn-new-files")?.click(),
        },
        {
          id: "dock-btn-text",
          label: "Nota de Texto",
          icon: svg("text"),
          action: () => document.getElementById("btn-new-text")?.click(),
        },
        {
          id: "dock-btn-draw",
          label: "Esboço / Desenho",
          icon: svg("draw"),
          action: () => document.getElementById("btn-new-draw")?.click(),
        },
      ];

      tools.forEach((t) => {
        const btn = document.createElement("button");
        btn.id = t.id;
        btn.className = `dock-btn ${t.primary ? "dock-btn-primary" : ""}`;
        btn.title = t.label;
        btn.setAttribute("aria-label", t.label);
        btn.innerHTML = `<span class="dock-icon">${t.icon}</span>`;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          t.action();
        });
        creationGroup.appendChild(btn);
      });
      this.el.appendChild(creationGroup);

      // Separator
      this.el.appendChild(this._createSeparator());

      // Group 2: Camera & Viewport Controls
      const cameraGroup = document.createElement("div");
      cameraGroup.className = "dock-group";

      const camControls = [
        {
          id: "dock-zoom-in",
          label: "Aproximar Zoom (Ctrl +)",
          icon: svg("zoom-in"),
          action: () => this.app.canvas?.zoomAt(1.2),
        },
        {
          id: "dock-zoom-out",
          label: "Afastar Zoom (Ctrl -)",
          icon: svg("zoom-out"),
          action: () => this.app.canvas?.zoomAt(0.8),
        },
        {
          id: "dock-zoom-reset",
          label: "Zoom 1:1 (Ctrl 0)",
          text: "1:1",
          action: () => this.app.canvas?.setZoom(1),
        },
        {
          id: "dock-fit",
          label: "Ver Tudo (V)",
          icon: svg("fit"),
          action: () => document.getElementById("btn-fit")?.click(),
        },
        {
          id: "dock-center",
          label: "Centralizar (C)",
          icon: svg("crosshair"),
          action: () => document.getElementById("btn-center")?.click(),
        },
      ];

      camControls.forEach((c) => {
        const btn = document.createElement("button");
        btn.id = c.id;
        btn.className = "dock-btn";
        btn.title = c.label;
        btn.setAttribute("aria-label", c.label);
        if (c.icon) {
          btn.innerHTML = `<span class="dock-icon">${c.icon}</span>`;
        } else {
          btn.innerHTML = `<span class="dock-text">${c.text}</span>`;
        }
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          c.action();
        });
        cameraGroup.appendChild(btn);
      });

      this._zoomReadout = document.createElement("span");
      this._zoomReadout.className = "dock-zoom-readout";
      this._zoomReadout.textContent = "100%";
      cameraGroup.appendChild(this._zoomReadout);

      this.el.appendChild(cameraGroup);

      // Separator
      this.el.appendChild(this._createSeparator());

      // Group 3: Utility & Agent Settings
      const utilityGroup = document.createElement("div");
      utilityGroup.className = "dock-group";

      const agentBtn = document.createElement("button");
      agentBtn.id = "dock-btn-agents";
      agentBtn.className = "dock-btn";
      agentBtn.title = "Configurações de Agentes";
      agentBtn.setAttribute("aria-label", "Configurações de Agentes");
      agentBtn.innerHTML = `<span class="dock-icon">${svg("settings")}</span>`;
      agentBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        document.getElementById("btn-agents")?.click();
      });
      utilityGroup.appendChild(agentBtn);

      // Status Indicator
      const statusPill = document.createElement("div");
      statusPill.className = "dock-status-pill";
      statusPill.title = "Status do Servidor PTY";

      this._statusDot = document.createElement("span");
      this._statusDot.className = "dock-status-dot";
      statusPill.appendChild(this._statusDot);

      this._statusText = document.createElement("span");
      this._statusText.className = "dock-status-text";
      this._statusText.textContent = "conectado";
      statusPill.appendChild(this._statusText);

      utilityGroup.appendChild(statusPill);
      this.el.appendChild(utilityGroup);
    }

    _createSeparator() {
      const sep = document.createElement("div");
      sep.className = "dock-separator";
      return sep;
    }

    updateZoom(z) {
      if (this._zoomReadout) {
        this._zoomReadout.textContent = `${Math.round(z * 100)}%`;
      }
    }

    updateStatus(connected, text) {
      if (this._statusDot) {
        this._statusDot.className = `dock-status-dot ${connected ? "on" : "off"}`;
      }
      if (this._statusText && text) {
        this._statusText.textContent = text;
      }
    }
  }

  root.FloatingDock = FloatingDock;
})(window);
