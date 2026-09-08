// public/js/widgets/binder.js
// BinderWidget — Fichário espacial de notas (US4): condensa múltiplas notas em um nó com abas laterais
// à direita para folhear, drag-in de notas, drag-out de abas, uniformização de cores e workflows vazios nomeados.

class BinderWidget extends BasePortalWidget {
  constructor(opts = {}) {
    super({
      ...opts,
      type: "binder",
      title: opts.title || "",
      width: opts.width || 460,
      height: opts.height || 380,
    });
    this.minWidth = 360;
    this.minHeight = 280;
    this.named = !!(opts.title && opts.title.trim()) || !!opts.named;
    this.uniformColor = opts.uniformColor || null;
    this.pageIds = Array.isArray(opts.pageIds) ? [...opts.pageIds] : [];
    this.activePageId = opts.activePageId || (this.pageIds[0] || "");
    this.view = opts.view || "raw";

    this._pageDrafts = new Map();
    this._saveTimer = null;
    this._draggedTabId = null;

    this._createDOM();
    this._renderTabs();
    this._loadActivePage();
  }

  _createDOM() {
    const el = document.createElement("div");
    el.className = "spatial-node binder-widget";
    el.dataset.id = this.id;
    el.style.width = `${this.worldSize.w}px`;
    el.style.height = `${this.worldSize.h}px`;
    el.style.transform = `translate(${this.worldPos.x}px, ${this.worldPos.y}px)`;
    if (this.uniformColor) el.style.setProperty("--binder-color", this.uniformColor);

    el.innerHTML = `
      <div class="portal-header binder-header">
        <div class="portal-icon">📑</div>
        <div class="portal-title">${this.title || "Fichário"}</div>
        <div class="portal-actions">
          <button class="portal-btn binder-btn-color icon-btn" title="Cor uniforme para todas as páginas">
            ${window.Icons ? window.Icons.svg("palette", { size: 13 }) : "🎨"}
          </button>
          <button class="portal-btn binder-btn-pin icon-btn" title="Renomear Fichário (permite persistir vazio)">
            ${window.Icons ? window.Icons.svg("edit", { size: 13 }) : "✎"}
          </button>
          <button class="portal-btn btn-close icon-btn danger" title="Fechar Fichário">
            ${window.Icons ? window.Icons.svg("close", { size: 13 }) : "✕"}
          </button>
        </div>
      </div>
      <div class="binder-layout">
        <div class="binder-content">
          <div class="binder-page-bar">
            <span class="binder-page-title">Página</span>
            <button class="portal-btn binder-btn-view icon-btn" title="Alternar Raw / Formatada">
              ${window.Icons ? window.Icons.svg("file-text", { size: 12 }) : "Md"}
            </button>
          </div>
          <div class="binder-page-body">
            <textarea class="binder-textarea" spellcheck="false" placeholder="Conteúdo da página…"></textarea>
            <div class="binder-rendered"></div>
            <div class="binder-empty hidden">
              <div class="binder-empty-icon">📑</div>
              <div class="binder-empty-text">Fichário Vazio</div>
              <div class="binder-empty-sub">Arraste notas para cá para adicioná-las</div>
            </div>
          </div>
        </div>
        <div class="binder-tabs-rail" title="Abas do Fichário (arraste para reordenar ou puxe para fora para extrair)">
          <div class="binder-tabs-list"></div>
        </div>
      </div>
      <div class="spatial-resize-handle"></div>
      <div class="conn-port conn-port-left" title="Conectar agente ao fichário"></div>
      <div class="conn-port conn-port-right" title="Conectar agente ao fichário"></div>
    `;

    this.el = el;
    this.titleEl = el.querySelector(".portal-title");
    this.header = el.querySelector(".portal-header");
    this.pageTitleEl = el.querySelector(".binder-page-title");
    this.textarea = el.querySelector(".binder-textarea");
    this.rendered = el.querySelector(".binder-rendered");
    this.emptyEl = el.querySelector(".binder-empty");
    this.tabsListEl = el.querySelector(".binder-tabs-list");
    this.tabsRailEl = el.querySelector(".binder-tabs-rail");
    this.viewBtn = el.querySelector(".binder-btn-view");
    this.pinBtn = el.querySelector(".binder-btn-pin");
    this.colorBtn = el.querySelector(".binder-btn-color");
    this.closeBtn = el.querySelector(".btn-close");
    const resizeHandle = el.querySelector(".spatial-resize-handle");
    const portLeft = el.querySelector(".conn-port-left");
    const portRight = el.querySelector(".conn-port-right");

    this._setupDragAndResize(this.header, resizeHandle);
    this._setupConnectionPorts(portLeft, portRight);

    el.addEventListener("pointerdown", () => {
      if (this.app?.setActive) this.app.setActive(this.id);
    });

    // Toggle Raw / Rendered
    this.viewBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this._setView(this.view === "raw" ? "rendered" : "raw");
    });

    // Renomear fichário
    this.pinBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this._promptRename();
    });
    this.titleEl.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      this._promptRename();
    });

    // Cor uniforme
    this.colorBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this._openColorMenu(e.clientX, e.clientY);
    });

    // Fechar fichário
    this.closeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.app?.removeNode) this.app.removeNode(this.id);
    });

    // Edição de texto da página ativa com debounce
    this.textarea.addEventListener("input", () => {
      if (!this.activePageId) return;
      const text = this.textarea.value;
      this._pageDrafts.set(this.activePageId, text);
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(() => this._saveActivePage(), 400);
      this._updateActivePageTitleFromContent(text);
    });

    this.textarea.addEventListener("blur", () => {
      this._saveActivePage();
    });

    // Drag-in de notas soltas sobre o fichário (T017)
    this._setupDragIn();

    this._setView(this.view, true);
  }

  _setView(mode, silent) {
    this.view = mode === "rendered" ? "rendered" : "raw";
    const isRendered = this.view === "rendered";
    this.textarea.style.display = isRendered ? "none" : "";
    this.rendered.style.display = isRendered ? "" : "none";
    if (!silent) this._paintRendered();
  }

  _paintRendered() {
    if (!this.rendered || this.view !== "rendered") return;
    const content = this._pageDrafts.get(this.activePageId) || "";
    if (window.marked && window.marked.parse) {
      const sanitized = String(window.marked.parse(content || ""))
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
      this.rendered.innerHTML = sanitized;
    } else {
      this.rendered.textContent = content;
    }
  }

  _saveActivePage() {
    if (!this.activePageId || !this.app?.send) return;
    const content = this._pageDrafts.get(this.activePageId) ?? this.textarea.value;
    this.app.send({
      type: "note_content",
      nodeId: this.activePageId,
      content,
    });
  }

  _loadActivePage() {
    if (!this.activePageId || this.pageIds.length === 0) {
      this.pageTitleEl.textContent = "";
      this.textarea.value = "";
      this.rendered.innerHTML = "";
      this.textarea.classList.add("hidden");
      this.rendered.classList.add("hidden");
      this.emptyEl.classList.remove("hidden");
      return;
    }

    this.textarea.classList.remove("hidden");
    this.emptyEl.classList.add("hidden");
    this._setView(this.view, true);

    const cached = this._pageDrafts.get(this.activePageId);
    if (typeof cached === "string") {
      this.textarea.value = cached;
      this._paintRendered();
    } else {
      this.textarea.value = "Carregando…";
      if (this.app?.send) {
        this.app.send({ type: "note_read", nodeId: this.activePageId });
      }
    }

    const pageNode = this._getPageNode(this.activePageId);
    const title = pageNode ? (pageNode.title || "Nota") : "Nota";
    this.pageTitleEl.textContent = title;
  }

  _getPageNode(pageId) {
    if (this.app?.nodeData?.has(pageId)) return this.app.nodeData.get(pageId);
    if (this.app?.widgets?.has(pageId)) return this.app.widgets.get(pageId);
    return null;
  }

  _updateActivePageTitleFromContent(text) {
    const pageNode = this._getPageNode(this.activePageId);
    if (pageNode && !pageNode.pinned) {
      const first = (text || "").split("\n").map((l) => l.trim()).find(Boolean) || "";
      const clean = first.replace(/^#+\s*/, "").trim() || "Nota";
      pageNode.title = clean;
      this.pageTitleEl.textContent = clean;
      const tabEl = this.tabsListEl.querySelector(`.binder-tab-item[data-page-id="${this.activePageId}"] .tab-label`);
      if (tabEl) tabEl.textContent = clean;
      if (this.app?.sendRename) this.app.sendRename(this.activePageId, clean);
    }
  }

  _renderTabs() {
    if (!this.tabsListEl) return;
    this.tabsListEl.innerHTML = "";

    this.pageIds.forEach((pid, index) => {
      const pageNode = this._getPageNode(pid);
      const title = pageNode ? (pageNode.title || `Nota ${index + 1}`) : `Nota ${index + 1}`;
      const color = (this.uniformColor) || (pageNode && pageNode.color) || "#fef08a";

      const tab = document.createElement("div");
      tab.className = "binder-tab-item" + (pid === this.activePageId ? " active" : "");
      tab.dataset.pageId = pid;
      tab.title = `${title} (clique para folhear, arraste para fora para soltar no canvas)`;

      const swatch = document.createElement("span");
      swatch.className = "tab-color-pip";
      swatch.style.backgroundColor = color;

      const label = document.createElement("span");
      label.className = "tab-label";
      label.textContent = title;

      tab.append(swatch, label);

      // Clique simples folheia a página (US4)
      tab.addEventListener("click", (e) => {
        e.stopPropagation();
        this.setActivePage(pid);
      });

      // Arraste da aba: reordenar internamente ou puxar para fora para extrair (T017)
      this._setupTabDrag(tab, pid);

      this.tabsListEl.appendChild(tab);
    });
  }

  _setupTabDrag(tabEl, pageId) {
    let startX = 0;
    let startY = 0;
    let isDragging = false;
    let ghost = null;

    const onPointerDown = (e) => {
      if (e.button !== 0) return;
      startX = e.clientX;
      startY = e.clientY;
      isDragging = false;

      const onPointerMove = (ev) => {
        const dist = Math.hypot(ev.clientX - startX, ev.clientY - startY);
        if (!isDragging && dist > 8) {
          isDragging = true;
          tabEl.classList.add("tab-dragging");
          ghost = document.createElement("div");
          ghost.className = "binder-tab-ghost";
          ghost.textContent = tabEl.textContent;
          document.body.appendChild(ghost);
        }

        if (isDragging && ghost) {
          ghost.style.left = `${ev.clientX + 10}px`;
          ghost.style.top = `${ev.clientY + 10}px`;

          const railRect = this.tabsRailEl.getBoundingClientRect();
          const inRail = (
            ev.clientX >= railRect.left && ev.clientX <= railRect.right &&
            ev.clientY >= railRect.top && ev.clientY <= railRect.bottom
          );

          if (inRail) {
            ghost.classList.remove("ghost-extract");
            ghost.textContent = tabEl.textContent;
          } else {
            ghost.classList.add("ghost-extract");
            ghost.textContent = `Soltar "${tabEl.textContent.trim()}" no canvas`;
          }
        }
      };

      const onPointerUp = (ev) => {
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);

        if (ghost) {
          ghost.remove();
          ghost = null;
        }
        tabEl.classList.remove("tab-dragging");

        if (!isDragging) return;

        const widgetRect = this.el.getBoundingClientRect();
        const outside = (
          ev.clientX < widgetRect.left - 25 ||
          ev.clientX > widgetRect.right + 25 ||
          ev.clientY < widgetRect.top - 25 ||
          ev.clientY > widgetRect.bottom + 25
        );

        if (outside) {
          const dropWorld = this.app?.canvas?.screenToWorld
            ? this.app.canvas.screenToWorld(ev.clientX - 100, ev.clientY - 40)
            : { x: this.worldPos.x + this.worldSize.w + 40, y: this.worldPos.y };

          this.removePage(pageId, Math.round(dropWorld.x), Math.round(dropWorld.y));
        } else {
          const tabs = [...this.tabsListEl.querySelectorAll(".binder-tab-item")];
          for (let i = 0; i < tabs.length; i++) {
            const tr = tabs[i].getBoundingClientRect();
            if (ev.clientY >= tr.top && ev.clientY <= tr.bottom) {
              const targetPid = tabs[i].dataset.pageId;
              if (targetPid && targetPid !== pageId) {
                this._reorderPage(pageId, targetPid);
              }
              break;
            }
          }
        }
      };

      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
    };

    tabEl.addEventListener("pointerdown", onPointerDown);
  }

  _setupDragIn() {
    this.el.addEventListener("dragover", (e) => {
      e.preventDefault();
      this.el.classList.add("drag-over-binder");
    });
    this.el.addEventListener("dragleave", () => {
      this.el.classList.remove("drag-over-binder");
    });
  }

  setActivePage(pageId) {
    if (!pageId || !this.pageIds.includes(pageId)) return;
    this.activePageId = pageId;
    this._renderTabs();
    this._loadActivePage();
  }

  addPage(noteId) {
    if (!noteId) return;
    this.pageIds = this.pageIds.filter((id) => id !== noteId);
    this.pageIds.unshift(noteId);
    this.activePageId = noteId;

    if (this.app?.send) {
      this.app.send({
        type: "binder_add_page",
        binderId: this.id,
        noteId,
      });
    }
    this._renderTabs();
    this._loadActivePage();
  }

  removePage(pageId, worldX, worldY) {
    if (!pageId) return;
    this.pageIds = this.pageIds.filter((id) => id !== pageId);

    if (this.activePageId === pageId) {
      this.activePageId = this.pageIds[0] || "";
    }

    if (this.app?.send) {
      this.app.send({
        type: "binder_remove_page",
        binderId: this.id,
        noteId: pageId,
        x: worldX,
        y: worldY,
      });
    }

    if (this.pageIds.length === 0 && !this.named) {
      if (this.app?.removeNode) {
        this.app.removeNode(this.id);
      }
      return;
    }

    this._renderTabs();
    this._loadActivePage();
  }

  _reorderPage(sourceId, targetId) {
    const fromIdx = this.pageIds.indexOf(sourceId);
    const toIdx = this.pageIds.indexOf(targetId);
    if (fromIdx < 0 || toIdx < 0) return;

    this.pageIds.splice(fromIdx, 1);
    this.pageIds.splice(toIdx, 0, sourceId);

    if (this.app?.send) {
      this.app.send({
        type: "binder_reorder",
        binderId: this.id,
        pageIds: this.pageIds,
      });
    }
    this._renderTabs();
  }

  setUniformColor(color) {
    this.uniformColor = color || null;
    if (color) {
      this.el.style.setProperty("--binder-color", color);
    } else {
      this.el.style.removeProperty("--binder-color");
    }
    if (this.app?.send) {
      this.app.send({
        type: "binder_uniform_color",
        binderId: this.id,
        color: this.uniformColor,
      });
    }
    this._renderTabs();
  }

  _openColorMenu(clientX, clientY) {
    let menu = document.getElementById("binder-color-menu");
    if (!menu) {
      menu = document.createElement("div");
      menu.id = "binder-color-menu";
      menu.className = "ctx-menu hidden";
      document.body.appendChild(menu);
    }

    const colors = [
      { name: "Amarelo Post-it", color: "#fef08a" },
      { name: "Verde Pastel", color: "#bbf7d0" },
      { name: "Azul Céu", color: "#bfdbfe" },
      { name: "Rosa Coral", color: "#fecdd3" },
      { name: "Lavanda Roxo", color: "#e9d5ff" },
      { name: "Laranja Suave", color: "#fed7aa" },
      { name: "Padrão (Sem cor)", color: null },
    ];

    menu.innerHTML = "";
    colors.forEach(({ name, color }) => {
      const item = document.createElement("div");
      item.className = "ctx-item";
      item.style.display = "flex";
      item.style.alignItems = "center";
      item.style.gap = "8px";

      const pip = document.createElement("span");
      pip.style.cssText = `width: 14px; height: 14px; border-radius: 50%; border: 1px solid rgba(0,0,0,0.15); background: ${color || "transparent"};`;

      const txt = document.createElement("span");
      txt.textContent = name;

      item.append(pip, txt);
      item.addEventListener("click", () => {
        menu.classList.add("hidden");
        this.setUniformColor(color);
      });
      menu.appendChild(item);
    });

    menu.classList.remove("hidden");
    menu.style.left = `${Math.min(clientX, window.innerWidth - 200)}px`;
    menu.style.top = `${Math.min(clientY, window.innerHeight - 240)}px`;

    const close = (e) => {
      if (!menu.contains(e.target)) {
        menu.classList.add("hidden");
        document.removeEventListener("pointerdown", close);
      }
    };
    setTimeout(() => document.addEventListener("pointerdown", close), 50);
  }

  _promptRename() {
    const handleRename = (nm) => {
      if (nm !== null && nm !== undefined) {
        const trimmed = nm.trim();
        this.title = trimmed;
        this.named = !!trimmed;
        if (this.titleEl) this.titleEl.textContent = this.title || "Fichário";
        if (this.app?.sendUpdateNode) {
          this.app.sendUpdateNode(this.id, { title: this.title, named: this.named });
        }
      }
    };
    if (window.promptDialog) {
      window.promptDialog("Nome do Fichário (permite persistir mesmo vazio como quadro Kanban):", this.title, handleRename);
    } else {
      handleRename(this.title);
    }
  }

  updateBinderData(data) {
    if (Array.isArray(data.pageIds)) {
      this.pageIds = [...data.pageIds];
    }
    if (data.activePageId && this.pageIds.includes(data.activePageId)) {
      this.activePageId = data.activePageId;
    } else if (this.pageIds.length && !this.pageIds.includes(this.activePageId)) {
      this.activePageId = this.pageIds[0];
    }
    if (data.title !== undefined) {
      this.title = data.title;
      this.named = !!(this.title && this.title.trim()) || !!data.named;
      if (this.titleEl) this.titleEl.textContent = this.title || "Fichário";
    }
    if (data.uniformColor !== undefined) {
      this.uniformColor = data.uniformColor;
      if (this.uniformColor) this.el.style.setProperty("--binder-color", this.uniformColor);
      else this.el.style.removeProperty("--binder-color");
    }
    this._renderTabs();
    this._loadActivePage();
  }

  loadContent(content) {
    if (this.activePageId) {
      this._pageDrafts.set(this.activePageId, content || "");
      if (this.textarea) this.textarea.value = content || "";
      this._paintRendered();
    }
  }

  dispose() {
    this._saveActivePage();
    if (this.el && this.el.parentNode) this.el.remove();
  }
}

window.BinderWidget = BinderWidget;
