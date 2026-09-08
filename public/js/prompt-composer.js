/**
 * Maestri Rich Prompt Composer
 * Floating and magnetically dockable prompt composer bar with glassmorphism,
 * multiline expansion, and direct terminal PTY injection.
 */
(function (root) {
  'use strict';

  class PromptComposer {
    constructor(container, app) {
      this.container = container;
      this.app = app;
      this.el = null;
      this.inputEl = null;
      this.activeNode = null;

      this.isDocked = true;
      this.worldPos = { x: 100, y: 100 };
      this.customPos = null;

      this.init();
    }

    init() {
      this.el = document.createElement("div");
      this.el.id = "prompt-composer";
      this.el.className = "prompt-composer glass-surface docked";
      this.el.setAttribute("aria-label", "Compositor de prompts rico");

      const svg = (name, opts = {}) => (window.Icons ? window.Icons.svg(name, { size: 14, strokeWidth: 1.5, ...opts }) : "");

      // Drag Handle / Dock indicator
      const dragHandle = document.createElement("div");
      dragHandle.className = "composer-handle";
      dragHandle.title = "Arrastar para desacoplar do terminal";
      dragHandle.innerHTML = '<span class="composer-handle-bar"></span>';
      this.el.appendChild(dragHandle);

      // Main Input Container
      const mainRow = document.createElement("div");
      mainRow.className = "composer-main";

      const sparkIcon = document.createElement("span");
      sparkIcon.className = "composer-spark-icon";
      sparkIcon.innerHTML = svg("sparkles");
      mainRow.appendChild(sparkIcon);

      this.inputEl = document.createElement("textarea");
      this.inputEl.className = "composer-textarea";
      this.inputEl.rows = 1;
      this.inputEl.placeholder = "Escreva uma instrução ou comando para o agente… (Enter envia)";
      mainRow.appendChild(this.inputEl);

      // Actions
      const actions = document.createElement("div");
      actions.className = "composer-actions";

      this.dockBtn = document.createElement("button");
      this.dockBtn.className = "composer-btn icon-btn active";
      this.dockBtn.title = "Ancorado no terminal ativo (clique para alternar flutuação livre)";
      this.dockBtn.innerHTML = svg("pin");
      this.dockBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.toggleDock();
      });
      actions.appendChild(this.dockBtn);

      const sendBtn = document.createElement("button");
      sendBtn.className = "composer-btn send-btn";
      sendBtn.title = "Enviar comando para o terminal (Enter)";
      sendBtn.innerHTML = svg("send");
      sendBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.submit();
      });
      actions.appendChild(sendBtn);

      mainRow.appendChild(actions);
      this.el.appendChild(mainRow);

      this.container.appendChild(this.el);

      this._bindEvents(dragHandle);
    }

    _bindEvents(dragHandle) {
      // Auto-grow textarea
      this.inputEl.addEventListener("input", () => {
        this.inputEl.style.height = "auto";
        this.inputEl.style.height = `${Math.min(180, Math.max(36, this.inputEl.scrollHeight))}px`;
      });

      // Submit on Enter, line break on Shift+Enter
      this.inputEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.submit();
        } else if (e.key === "Escape") {
          if (this.activeNode && typeof this.activeNode.focus === "function") {
            this.activeNode.focus();
          }
        }
      });

      // Prevent canvas drag when clicking inside composer
      this.el.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
      });

      // Drag to undock and reposition freely
      dragHandle.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        const startSx = e.clientX;
        const startSy = e.clientY;
        const startPos = { ...this.worldPos };
        const canvas = this.app.canvas;

        this.el.classList.add("dragging");

        const onMove = (ev) => {
          const delta = canvas.screenToWorldDelta(ev.clientX - startSx, ev.clientY - startSy);
          this.isDocked = false;
          this.dockBtn.classList.remove("active");
          this.el.classList.remove("docked");
          this.customPos = { x: startPos.x + delta.x, y: startPos.y + delta.y };
          this.worldPos = { ...this.customPos };
          this.applyPosition();
        };

        const onUp = () => {
          window.removeEventListener("pointermove", onMove);
          window.removeEventListener("pointerup", onUp);
          this.el.classList.remove("dragging");
        };

        window.addEventListener("pointermove", onMove);
        window.addEventListener("pointerup", onUp);
      });
    }

    attachTo(node) {
      if (!node) {
        this.detach();
        return;
      }
      this.activeNode = node;
      this.el.classList.remove("hidden");
      this.syncPosition();
    }

    detach() {
      this.activeNode = null;
      if (this.isDocked) {
        this.el.classList.add("hidden");
      }
    }

    toggleDock() {
      this.isDocked = !this.isDocked;
      if (this.isDocked) {
        this.dockBtn.classList.add("active");
        this.dockBtn.title = "Ancorado no terminal ativo";
        this.el.classList.add("docked");
        this.syncPosition();
      } else {
        this.dockBtn.classList.remove("active");
        this.dockBtn.title = "Flutuante livre (clique para reancorar ao terminal)";
        this.el.classList.remove("docked");
      }
    }

    syncPosition() {
      if (!this.activeNode || !this.activeNode.worldPos) return;

      if (this.isDocked) {
        // Dock magnetically centered beneath the active node
        const nodePos = this.activeNode.worldPos;
        const nodeSize = this.activeNode.worldSize || { w: 480, h: 320 };
        const composerWidth = Math.max(380, Math.min(nodeSize.w, 720));

        this.worldPos.x = nodePos.x + (nodeSize.w - composerWidth) / 2;
        this.worldPos.y = nodePos.y + nodeSize.h + 12;
        this.el.style.width = `${composerWidth}px`;
      } else if (this.customPos) {
        this.worldPos = { ...this.customPos };
      }

      this.applyPosition();
    }

    applyPosition() {
      this.el.style.left = `${this.worldPos.x}px`;
      this.el.style.top = `${this.worldPos.y}px`;
    }

    submit() {
      const text = (this.inputEl.value || "").trim();
      if (!text) return;

      if (this.activeNode && typeof this.app.sendInput === "function") {
        this.app.sendInput(this.activeNode.id, text + "\r");
        this.inputEl.value = "";
        this.inputEl.style.height = "auto";
      }
    }

    focus() {
      if (this.inputEl) this.inputEl.focus();
    }
  }

  root.PromptComposer = PromptComposer;
})(window);
