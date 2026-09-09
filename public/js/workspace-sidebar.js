// public/js/workspace-sidebar.js
// Barra lateral de workspaces: criar/editar (diretório+ícone), pastas, mini sidebar,
// instruções CLAUDE.md/AGENTS.md e atalhos de navegação. US1.
(function () {
  const WorkspaceSidebar = {
    app: null,
    send: null,
    workspaces: [],
    activeId: null,
    numberMode: false,

    init(app, send) {
      this.app = app;
      this.send = send;
      this.el = document.getElementById("sidebar");
      this.root = document.getElementById("modal-root");
      if (!this.el) return;
      this.el.addEventListener("wheel", (e) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          const delta = Math.sign(e.deltaY);
          if (delta > 0) this.navNext();
          else if (delta < 0) this.navPrev();
        }
      }, { passive: false });
      this.el.addEventListener("contextmenu", (e) => {
        if (e.target.closest(".sb-row") || e.target.closest(".sb-group") || e.target.closest(".sb-section-divider") || e.target.closest(".sb-btn")) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        this._openEmptyCtx(e.clientX, e.clientY);
      });
      this._ctx = document.createElement("div");
      this._ctx.className = "ctx-menu hidden";
      document.body.appendChild(this._ctx);

      this._tooltip = document.createElement("div");
      this._tooltip.className = "sb-tooltip hidden";
      document.body.appendChild(this._tooltip);

      this._popover = document.createElement("div");
      this._popover.className = "sb-terminals-popover hidden";
      document.body.appendChild(this._popover);
    },

    render(workspaces, activeId) {
      this.workspaces = workspaces || [];
      this.activeId = activeId || null;
      if (!this.el) return;
      this.el.innerHTML = "";
      const ui = (this.app && this.app.ui) || {};
      const collapsed = !!(ui.sidebar && ui.sidebar.collapsed);
      document.body.classList.toggle("sb-mini", collapsed);
      document.body.classList.add("sb-open");

      this.el.appendChild(this._buildHeader(collapsed));
      const list = document.createElement("div");
      list.className = "sb-list";

      const folders = this.app?.folders || ui.folders || [];
      const groups = this.app?.groups || ui.sections || [];

      const inFolder = new Set();
      for (const f of folders) {
        for (const wid of f.workspaceIds || []) inFolder.add(wid);
      }
      const inGroup = new Set();
      for (const g of groups) {
        for (const wid of g.workspaceIds || []) inGroup.add(wid);
      }

      // 1. Pastas (com seus membros ou vazias aguardando drop)
      for (const f of folders) {
        const members = (f.workspaceIds || [])
          .map((id) => this.workspaces.find((w) => w.id === id))
          .filter(Boolean);
        list.appendChild(collapsed ? this._buildMiniFolder(f, members) : this._buildFolder(f, members));
      }

      // 2. Grupos divisores rotulados
      for (const g of groups) {
        list.appendChild(collapsed ? this._buildMiniSectionDivider(g) : this._buildGroupSection(g));
        const members = (g.workspaceIds || [])
          .map((id) => this.workspaces.find((w) => w.id === id))
          .filter((w) => w && !inFolder.has(w.id));
        for (const w of members) {
          list.appendChild(this._row(w));
        }
      }

      // 3. Workspaces soltos (fora de pastas e grupos)
      const rest = this.workspaces.filter((w) => !inFolder.has(w.id) && !inGroup.has(w.id));
      if (rest.length && (folders.length > 0 || groups.length > 0)) {
        if (!collapsed) {
          const othersLabel = document.createElement("div");
          othersLabel.className = "sb-section-divider";
          othersLabel.innerHTML = `<span class="sb-section-title">OUTROS</span>`;
          list.appendChild(othersLabel);
        } else {
          const miniDivider = document.createElement("div");
          miniDivider.className = "sb-mini-section-divider";
          list.appendChild(miniDivider);
        }
      }
      for (const w of rest) {
        list.appendChild(this._row(w));
      }

      this.el.appendChild(list);

      if (collapsed) {
        this.el.classList.add("is-mini");
      } else {
        this.el.classList.remove("is-mini");
      }
    },

    _buildHeader(collapsed) {
      const header = document.createElement("div");
      header.className = "sb-header";
      const title = document.createElement("span");
      title.className = "sb-title";
      title.textContent = collapsed ? "" : "Workspaces";

      const addBtn = this._btn(
        window.Icons ? window.Icons.svg("plus", { size: 14 }) : "+",
        "Novo workspace"
      );
      addBtn.addEventListener("click", () => this.openModal());
      addBtn.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._openEmptyCtx(e.clientX, e.clientY);
      });

      const folderBtn = this._btn(
        window.Icons ? window.Icons.svg("folder", { size: 13 }) : "📁",
        "Nova pasta"
      );
      folderBtn.addEventListener("click", () => this.openCreateFolderDialog());

      const groupBtn = this._btn(
        window.Icons ? window.Icons.svg("layers", { size: 13 }) : "§",
        "Novo grupo / divisor"
      );
      groupBtn.addEventListener("click", () => this.openCreateGroupDialog());

      const minBtn = this._btn(
        window.Icons ? window.Icons.svg(collapsed ? "panel-left-open" : "panel-left-close", { size: 14 }) : (collapsed ? "»" : "«"),
        collapsed ? "Expandir" : "Mini barra"
      );
      minBtn.addEventListener("click", () => this.toggleCollapse());

      const numBtn = this._btn(
        window.Icons ? window.Icons.svg("grid", { size: 13 }) : "#",
        "Números de atalho (Ctrl)"
      );
      numBtn.addEventListener("click", () => this.toggleNumbers());

      header.appendChild(title);
      header.appendChild(addBtn);
      if (!collapsed) {
        header.appendChild(folderBtn);
        header.appendChild(groupBtn);
        header.appendChild(numBtn);
      }
      header.appendChild(minBtn);
      return header;
    },

    _buildFolder(f, members) {
      const folderEl = document.createElement("div");
      folderEl.className = "sb-folder" + (f.collapsed ? " is-collapsed" : "");
      folderEl.dataset.folderId = f.id;

      const header = document.createElement("div");
      header.className = "sb-group";
      const left = document.createElement("div");
      left.className = "sb-group-left";
      const ic = document.createElement("span");
      ic.style.display = "inline-flex";
      ic.style.alignItems = "center";
      ic.style.marginRight = "4px";
      ic.innerHTML = window.Icons ? window.Icons.svg(f.collapsed ? "folder" : "folder-open", { size: 12 }) : "📁";
      const txt = document.createElement("span");
      txt.textContent = f.name || "Pasta";
      const count = document.createElement("span");
      count.className = "sb-folder-count";
      count.textContent = `(${members.length})`;
      left.append(ic, txt, count);

      const right = document.createElement("div");
      right.style.display = "flex";
      right.style.alignItems = "center";
      right.style.gap = "4px";

      const toggle = document.createElement("span");
      toggle.className = "sb-group-toggle";
      toggle.innerHTML = window.Icons ? window.Icons.svg(f.collapsed ? "chevron-right" : "chevron-down", { size: 11 }) : (f.collapsed ? "▶" : "▼");
      right.appendChild(toggle);

      header.append(left, right);

      header.addEventListener("click", (e) => {
        e.stopPropagation();
        f.collapsed = !f.collapsed;
        if (this.send) this.send({ type: "folder_toggle", folderId: f.id, collapsed: f.collapsed });
        this.render(this.workspaces, this.activeId);
      });

      header.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        this.openRenameFolderDialog(f);
      });

      header.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._openFolderCtx(e.clientX, e.clientY, f);
      });

      folderEl.appendChild(header);

      const membersWrap = document.createElement("div");
      membersWrap.className = "sb-folder-members";

      if (!f.collapsed) {
        if (members.length === 0) {
          const empty = document.createElement("div");
          empty.className = "sb-folder-empty";
          empty.textContent = "Arraste workspaces aqui";
          membersWrap.appendChild(empty);
        } else {
          for (const w of members) {
            membersWrap.appendChild(this._row(w, f.id));
          }
        }
      }
      folderEl.appendChild(membersWrap);

      // Drag over folder header or members to drop workspace in folder
      const onDragOver = (e) => {
        if (!this._draggedId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        folderEl.classList.add("drag-over-folder");
      };
      const onDragLeave = () => {
        folderEl.classList.remove("drag-over-folder");
      };
      const onDrop = (e) => {
        e.preventDefault();
        folderEl.classList.remove("drag-over-folder");
        const fromId = this._draggedId;
        if (!fromId) return;
        this.addWorkspaceToFolder(f.id, fromId);
      };

      header.addEventListener("dragover", onDragOver);
      header.addEventListener("dragleave", onDragLeave);
      header.addEventListener("drop", onDrop);
      membersWrap.addEventListener("dragover", onDragOver);
      membersWrap.addEventListener("dragleave", onDragLeave);
      membersWrap.addEventListener("drop", onDrop);

      return folderEl;
    },

    _buildMiniFolder(f, members) {
      const wrap = document.createElement("div");
      wrap.className = "sb-mini-folder" + (f.collapsed ? " is-collapsed" : "");
      wrap.dataset.folderId = f.id;
      wrap.title = `${f.name || "Pasta"} (${members.length})`;

      const icon = document.createElement("div");
      icon.className = "sb-mini-folder-icon";
      icon.innerHTML = window.Icons ? window.Icons.svg(f.collapsed ? "folder" : "folder-open", { size: 14 }) : "📁";
      icon.addEventListener("click", () => {
        f.collapsed = !f.collapsed;
        if (this.send) this.send({ type: "folder_toggle", folderId: f.id, collapsed: f.collapsed });
        this.render(this.workspaces, this.activeId);
      });
      icon.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._openFolderCtx(e.clientX, e.clientY, f);
      });
      wrap.appendChild(icon);

      if (!f.collapsed) {
        const membersBox = document.createElement("div");
        membersBox.className = "sb-mini-folder-members";
        for (const w of members) {
          membersBox.appendChild(this._row(w, f.id));
        }
        wrap.appendChild(membersBox);
      }

      wrap.addEventListener("dragover", (e) => {
        if (!this._draggedId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        wrap.classList.add("drag-over-folder");
      });
      wrap.addEventListener("dragleave", () => {
        wrap.classList.remove("drag-over-folder");
      });
      wrap.addEventListener("drop", (e) => {
        e.preventDefault();
        wrap.classList.remove("drag-over-folder");
        const fromId = this._draggedId;
        if (!fromId) return;
        this.addWorkspaceToFolder(f.id, fromId);
      });

      return wrap;
    },

    _buildGroupSection(g) {
      const sec = document.createElement("div");
      sec.className = "sb-section-divider";
      sec.dataset.groupId = g.id;

      const title = document.createElement("span");
      title.className = "sb-section-title";
      title.textContent = (g.name || "Grupo").toUpperCase();

      const actions = document.createElement("div");
      actions.className = "sb-section-actions";

      const delBtn = document.createElement("button");
      delBtn.className = "sb-section-btn";
      delBtn.type = "button";
      delBtn.title = "Excluir grupo";
      delBtn.textContent = "×";
      delBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.deleteGroup(g.id);
      });
      actions.appendChild(delBtn);

      sec.append(title, actions);

      sec.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        this.openRenameGroupDialog(g);
      });

      sec.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._openGroupCtx(e.clientX, e.clientY, g);
      });

      sec.addEventListener("dragover", (e) => {
        if (!this._draggedId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        sec.classList.add("drag-over-group");
      });
      sec.addEventListener("dragleave", () => {
        sec.classList.remove("drag-over-group");
      });
      sec.addEventListener("drop", (e) => {
        e.preventDefault();
        sec.classList.remove("drag-over-group");
        const fromId = this._draggedId;
        if (!fromId) return;
        this.addWorkspaceToGroup(g.id, fromId);
      });

      return sec;
    },

    _buildMiniSectionDivider(g) {
      const d = document.createElement("div");
      d.className = "sb-mini-section-divider";
      d.title = g.name || "Grupo";
      d.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this._openGroupCtx(e.clientX, e.clientY, g);
      });
      return d;
    },

    _row(w, folderId) {
      const row = document.createElement("div");
      row.className = "sb-row" + (w.id === this.activeId ? " active" : "") + (w.dirMissing ? " missing" : "");
      row.dataset.id = w.id;
      if (folderId) row.dataset.folderId = folderId;

      const icon = document.createElement("span");
      icon.className = "sb-icon";
      if (w.icon) {
        icon.textContent = w.icon;
      } else {
        icon.innerHTML = window.Icons ? window.Icons.svg("terminal", { size: 14 }) : "▦";
      }

      const name = document.createElement("span");
      name.className = "sb-name";
      name.textContent = w.name || "Workspace";
      row.title = `${w.name || "Workspace"}\n${w.workingDir || "sem diretório"}`;

      const num = document.createElement("span");
      num.className = "sb-num hidden";

      row.appendChild(icon);
      row.appendChild(name);
      row.appendChild(num);

      // Drag and Drop reordering (T014 / FR-005)
      row.draggable = true;
      row.addEventListener("dragstart", (e) => {
        this._draggedId = w.id;
        row.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", w.id); } catch {}
      });
      row.addEventListener("dragend", () => {
        this._draggedId = null;
        row.classList.remove("dragging");
        if (this.el) {
          this.el.querySelectorAll(".sb-row").forEach((r) => r.classList.remove("drag-over-top", "drag-over-bottom", "drag-over-folder"));
        }
      });
      row.addEventListener("dragover", (e) => {
        if (!this._draggedId || this._draggedId === w.id) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const rect = row.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        row.classList.toggle("drag-over-top", e.clientY < midY);
        row.classList.toggle("drag-over-bottom", e.clientY >= midY);
      });
      row.addEventListener("dragleave", () => {
        row.classList.remove("drag-over-top", "drag-over-bottom");
      });
      row.addEventListener("drop", (e) => {
        e.preventDefault();
        const fromId = this._draggedId;
        const toId = w.id;
        row.classList.remove("drag-over-top", "drag-over-bottom");
        if (!fromId || fromId === toId) return;
        const rect = row.getBoundingClientRect();
        this._reorderWorkspaces(fromId, toId, e.clientY < rect.top + rect.height / 2 ? "before" : "after");
      });

      // Hover tooltip prolongado (>200ms) no modo mini
      row.addEventListener("pointerenter", () => {
        if (this.isMini()) {
          this._hoverTimer = setTimeout(() => this._showTooltip(w, row), 200);
        }
      });
      row.addEventListener("pointerleave", () => {
        this._hideTooltip();
        if (this._longPressTimer) {
          clearTimeout(this._longPressTimer);
          this._longPressTimer = null;
        }
      });

      // Long-press (~400ms) para ver terminais sem conflito com drag (>6px cancela)
      row.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        this._pressStartX = e.clientX;
        this._pressStartY = e.clientY;
        this._longPressFired = false;
        clearTimeout(this._longPressTimer);
        this._longPressTimer = setTimeout(() => {
          this._longPressFired = true;
          this._showTerminalsPopover(w, row);
        }, 400);
      });

      row.addEventListener("pointermove", (e) => {
        if (this._longPressTimer) {
          const dx = Math.abs(e.clientX - (this._pressStartX || e.clientX));
          const dy = Math.abs(e.clientY - (this._pressStartY || e.clientY));
          if (Math.hypot(dx, dy) > 6) {
            clearTimeout(this._longPressTimer);
            this._longPressTimer = null;
          }
        }
      });

      row.addEventListener("pointerup", (e) => {
        if (this._longPressTimer) {
          clearTimeout(this._longPressTimer);
          this._longPressTimer = null;
        }
      });

      row.addEventListener("click", (e) => {
        if (this._longPressFired) {
          e.preventDefault();
          e.stopPropagation();
          setTimeout(() => { this._longPressFired = false; }, 100);
          return;
        }
        this.switchTo(w.id);
      });

      row.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this._longPressTimer) {
          clearTimeout(this._longPressTimer);
          this._longPressTimer = null;
        }
        this._hideTooltip();
        this._hideTerminalsPopover();
        this._openCtx(e.clientX, e.clientY, w, folderId);
      });
      return row;
    },

    _reorderWorkspaces(fromId, toId, position) {
      const fromIdx = this.workspaces.findIndex((w) => w.id === fromId);
      const toIdx = this.workspaces.findIndex((w) => w.id === toId);
      if (fromIdx < 0 || toIdx < 0) return;
      const item = this.workspaces.splice(fromIdx, 1)[0];
      const targetIdx = this.workspaces.findIndex((w) => w.id === toId);
      const insertAt = position === "before" ? targetIdx : targetIdx + 1;
      this.workspaces.splice(insertAt, 0, item);
      this.render(this.workspaces, this.activeId);
      if (this.send) {
        this.send({ type: "workspaces_reorder", order: this.workspaces.map((w) => w.id) });
      }
    },

    _btn(content, title) {
      const b = document.createElement("button");
      b.className = "sb-btn";
      b.type = "button";
      b.innerHTML = content;
      b.title = title;
      return b;
    },

    switchTo(id) {
      if (id === this.activeId) return;
      if (this.send) this.send({ type: "workspace_switch", workspaceId: id });
    },

    navNext() {
      if (!this.workspaces.length) return;
      const idx = this.workspaces.findIndex((w) => w.id === this.activeId);
      const next = this.workspaces[(idx + 1 + this.workspaces.length) % this.workspaces.length];
      this.switchTo(next.id);
    },

    navPrev() {
      if (!this.workspaces.length) return;
      const idx = this.workspaces.findIndex((w) => w.id === this.activeId);
      const prev = this.workspaces[(idx - 1 + this.workspaces.length) % this.workspaces.length];
      this.switchTo(prev.id);
    },

    jumpTo(n) {
      const w = this.workspaces[n - 1];
      if (w) this.switchTo(w.id);
    },

    toggleNumbers() {
      this.numberMode = !this.numberMode;
      this._applyNumbers();
    },

    setNumbers(on) {
      this.numberMode = on;
      this._applyNumbers();
    },

    _applyNumbers() {
      const rows = this.el ? [...this.el.querySelectorAll(".sb-row")] : [];
      const visible = this.numberMode;
      rows.forEach((row, i) => {
        const num = row.querySelector(".sb-num");
        if (num) {
          num.textContent = String(i + 1);
          num.classList.toggle("hidden", !visible || i > 8);
        }
      });
    },

    isMini() {
      return document.body.classList.contains("sb-mini") || (this.el && this.el.classList.contains("is-mini"));
    },

    toggleMiniMode(enable) {
      const current = this.isMini();
      const target = typeof enable === "boolean" ? enable : !current;
      if (this.app) {
        if (!this.app.ui) this.app.ui = {};
        this.app.ui.sidebar = { ...(this.app.ui.sidebar || {}), collapsed: target };
      }
      if (this.send) this.send({ type: "sidebar_collapse", collapsed: target });
      document.body.classList.toggle("sb-mini", target);
      this.render(this.workspaces, this.activeId);
    },

    toggleCollapse() {
      this.toggleMiniMode();
    },

    _showTooltip(w, row) {
      if (!this.isMini() || !this._tooltip) return;
      const rect = row.getBoundingClientRect();
      this._tooltip.innerHTML = `
        <div class="sb-tooltip-title">${w.name || "Workspace"}</div>
        <div class="sb-tooltip-dir">${w.workingDir || "sem diretório"}</div>
      `;
      this._tooltip.classList.remove("hidden");
      this._tooltip.style.left = `${rect.right + 8}px`;
      const tipH = this._tooltip.offsetHeight || 36;
      this._tooltip.style.top = `${Math.max(8, rect.top + rect.height / 2 - tipH / 2)}px`;
    },

    _hideTooltip() {
      if (this._hoverTimer) {
        clearTimeout(this._hoverTimer);
        this._hoverTimer = null;
      }
      if (this._tooltip) {
        this._tooltip.classList.add("hidden");
      }
    },

    _showTerminalsPopover(w, row) {
      if (!this._popover) return;
      this._hideTooltip();
      const rect = row.getBoundingClientRect();
      const terminals = Array.isArray(w.terminals) ? w.terminals : [];

      let listHtml = "";
      if (terminals.length === 0) {
        listHtml = `<div class="sb-popover-empty">Nenhum terminal ativo</div>`;
      } else {
        listHtml = terminals.map((t) => `
          <div class="sb-popover-item" data-term-id="${t.id}">
            <span class="term-icon">${t.icon || "▦"}</span>
            <span class="term-title">${t.title || "Terminal"}</span>
          </div>
        `).join("");
      }

      this._popover.innerHTML = `
        <div class="sb-popover-header">
          <span>${w.name || "Workspace"} (${terminals.length})</span>
        </div>
        <div class="sb-popover-list">${listHtml}</div>
      `;

      this._popover.querySelectorAll(".sb-popover-item").forEach((item) => {
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          const termId = item.dataset.termId;
          this._hideTerminalsPopover();
          if (w.id !== this.activeId) {
            this.switchTo(w.id);
            setTimeout(() => {
              if (this.app?.focusNode) this.app.focusNode(termId);
              else if (this.app?.motion?.focusNode) this.app.motion.focusNode(termId);
            }, 120);
          } else {
            if (this.app?.focusNode) this.app.focusNode(termId);
            else if (this.app?.motion?.focusNode) this.app.motion.focusNode(termId);
          }
        });
      });

      this._popover.classList.remove("hidden");
      this._popover.style.left = `${rect.right + 8}px`;
      const popH = this._popover.offsetHeight || 120;
      const top = Math.min(window.innerHeight - popH - 12, Math.max(8, rect.top));
      this._popover.style.top = `${top}px`;

      const closePopover = (e) => {
        if (!this._popover.contains(e.target) && !row.contains(e.target)) {
          this._hideTerminalsPopover();
          document.removeEventListener("pointerdown", closePopover);
        }
      };
      setTimeout(() => document.addEventListener("pointerdown", closePopover), 50);
    },

    _hideTerminalsPopover() {
      if (this._longPressTimer) {
        clearTimeout(this._longPressTimer);
        this._longPressTimer = null;
      }
      if (this._popover) {
        this._popover.classList.add("hidden");
      }
    },

    onDirPicked(path) {
      if (this._dirCallback) {
        this._dirCallback(path);
        this._dirCallback = null;
      }
    },

    _openCtx(x, y, w, folderId) {
      const m = this._ctx;
      m.innerHTML = "";
      const item = (label, fn, danger) => {
        const d = document.createElement("div");
        d.className = "ctx-item" + (danger ? " danger" : "");
        d.textContent = label;
        d.addEventListener("click", () => {
          this._hideCtx();
          fn();
        });
        m.appendChild(d);
      };
      item("Editar", () => this.openModal(w));
      item("Exportar .terminalmanager", () => {
        if (this.send) this.send({ type: "workspace_export", workspaceId: w.id });
      });
      item("Importar .terminalmanager…", () => {
        if (this.send) this.send({ type: "workspace_import" });
      });
      if (w.workingDir) item("Abrir no Editor", () => {
        if (this.send) this.send({ type: "open_vscode", path: w.workingDir });
      });

      // Opções de Pasta
      const folders = this.app?.folders || this.app?.ui?.folders || [];
      const currentFolder = folders.find((f) => (f.workspaceIds || []).includes(w.id));
      if (currentFolder) {
        item(`Remover da pasta "${currentFolder.name}"`, () => {
          this.removeWorkspaceFromFolder(w.id);
        });
      }
      const otherFolders = folders.filter((f) => f.id !== currentFolder?.id);
      for (const f of otherFolders) {
        item(`Mover para "${f.name}"`, () => {
          this.addWorkspaceToFolder(f.id, w.id);
        });
      }
      item("Nova Pasta com este workspace…", () => {
        const ask = (name) => {
          if (name && name.trim()) {
            this.createFolderWithWorkspace(name.trim(), w.id);
          }
        };
        if (window.promptDialog) window.promptDialog("Nome da pasta:", (w.name || "Projeto") + " Pasta", ask);
        else ask((w.name || "Projeto") + " Pasta");
      });

      // Opções de Grupo
      const groups = this.app?.groups || this.app?.ui?.sections || [];
      const currentGroup = groups.find((g) => (g.workspaceIds || []).includes(w.id));
      if (currentGroup) {
        item(`Remover do grupo "${currentGroup.name}"`, () => {
          this.removeWorkspaceFromGroup(w.id);
        });
      }
      const otherGroups = groups.filter((g) => g.id !== currentGroup?.id);
      for (const g of otherGroups) {
        item(`Mover para grupo "${g.name}"`, () => {
          this.addWorkspaceToGroup(g.id, w.id);
        });
      }

      const canDelete = this.workspaces.length > 1;
      item("Excluir", () => {
        if (!canDelete) {
          alert("Não é possível excluir o único workspace.");
          return;
        }
        if (confirm(`Excluir o workspace "${w.name}" e todos os seus nós?`)) {
          if (this.send) this.send({ type: "workspace_delete", workspaceId: w.id });
        }
      }, true);

      this._positionCtx(m, x, y);
    },

    _openEmptyCtx(x, y) {
      const m = this._ctx;
      m.innerHTML = "";
      const item = (label, fn) => {
        const d = document.createElement("div");
        d.className = "ctx-item";
        d.textContent = label;
        d.addEventListener("click", () => {
          this._hideCtx();
          fn();
        });
        m.appendChild(d);
      };
      item("Novo Workspace…", () => this.openModal());
      item("Nova Pasta…", () => this.openCreateFolderDialog());
      item("Novo Divisor de Grupo…", () => this.openCreateGroupDialog());
      this._positionCtx(m, x, y);
    },

    _openFolderCtx(x, y, folder) {
      const m = this._ctx;
      m.innerHTML = "";
      const item = (label, fn, danger) => {
        const d = document.createElement("div");
        d.className = "ctx-item" + (danger ? " danger" : "");
        d.textContent = label;
        d.addEventListener("click", () => {
          this._hideCtx();
          fn();
        });
        m.appendChild(d);
      };
      item("Novo Workspace nesta Pasta", () => this.openModal(null, folder.id));
      item("Renomear Pasta…", () => this.openRenameFolderDialog(folder));
      item("Nova Pasta…", () => this.openCreateFolderDialog());
      item("Excluir Pasta", () => this.deleteFolder(folder.id), true);
      this._positionCtx(m, x, y);
    },

    _openGroupCtx(x, y, group) {
      const m = this._ctx;
      m.innerHTML = "";
      const item = (label, fn, danger) => {
        const d = document.createElement("div");
        d.className = "ctx-item" + (danger ? " danger" : "");
        d.textContent = label;
        d.addEventListener("click", () => {
          this._hideCtx();
          fn();
        });
        m.appendChild(d);
      };
      item("Renomear Grupo…", () => this.openRenameGroupDialog(group));
      item("Novo Divisor de Grupo…", () => this.openCreateGroupDialog());
      item("Excluir Grupo", () => {
        if (confirm(`Excluir grupo "${group.name}"?`)) {
          this.deleteGroup(group.id);
        }
      }, true);
      this._positionCtx(m, x, y);
    },

    _positionCtx(m, x, y) {
      m.classList.remove("hidden");
      const mw = 220;
      m.style.left = Math.min(x, window.innerWidth - mw - 8) + "px";
      m.style.top = Math.min(y, window.innerHeight - m.offsetHeight - 8) + "px";

      const close = (e) => {
        if (!m.contains(e.target)) this._hideCtx();
      };
      setTimeout(() => document.addEventListener("pointerdown", close, { once: true }), 0);
    },

    _hideCtx() {
      this._ctx.classList.add("hidden");
    },

    /* ---------------- Operações com Pastas e Grupos ---------------- */
    addWorkspaceToFolder(folderId, workspaceId) {
      const folders = this.app?.folders || this.app?.ui?.folders || [];
      for (const f of folders) {
        f.workspaceIds = (f.workspaceIds || []).filter((id) => id !== workspaceId);
      }
      const target = folders.find((f) => f.id === folderId);
      if (target) {
        target.workspaceIds = target.workspaceIds || [];
        if (!target.workspaceIds.includes(workspaceId)) {
          target.workspaceIds.push(workspaceId);
        }
      }
      const groups = this.app?.groups || this.app?.ui?.sections || [];
      for (const g of groups) {
        g.workspaceIds = (g.workspaceIds || []).filter((id) => id !== workspaceId);
      }
      if (this.send) {
        this.send({ type: "folders_save", folders });
        this.send({ type: "groups_save", groups });
      }
      this.render(this.workspaces, this.activeId);
    },

    removeWorkspaceFromFolder(workspaceId) {
      const folders = this.app?.folders || this.app?.ui?.folders || [];
      for (const f of folders) {
        f.workspaceIds = (f.workspaceIds || []).filter((id) => id !== workspaceId);
      }
      if (this.send) this.send({ type: "folders_save", folders });
      this.render(this.workspaces, this.activeId);
    },

    createFolderWithWorkspace(name, workspaceId) {
      const folderId = `folder_${Math.random().toString(36).slice(2, 10)}`;
      const folders = this.app?.folders || this.app?.ui?.folders || [];
      for (const f of folders) {
        f.workspaceIds = (f.workspaceIds || []).filter((id) => id !== workspaceId);
      }
      folders.push({
        id: folderId,
        name,
        collapsed: false,
        workspaceIds: [workspaceId],
        createdAt: new Date().toISOString(),
      });
      if (this.send) this.send({ type: "folders_save", folders });
      this.render(this.workspaces, this.activeId);
    },

    openCreateFolderDialog() {
      const ask = (name) => {
        if (name && name.trim() && this.send) {
          this.send({ type: "folder_create", name: name.trim() });
        }
      };
      if (window.promptDialog) window.promptDialog("Nome da nova pasta:", "Nova Pasta", ask);
      else ask("Nova Pasta");
    },

    openRenameFolderDialog(folder) {
      const ask = (name) => {
        if (name && name.trim() && name !== folder.name) {
          folder.name = name.trim();
          if (this.send) this.send({ type: "folder_rename", folderId: folder.id, name: folder.name });
          this.render(this.workspaces, this.activeId);
        }
      };
      if (window.promptDialog) window.promptDialog("Renomear pasta:", folder.name || "Pasta", ask);
      else ask(folder.name || "Pasta");
    },

    deleteFolder(folderId) {
      if (confirm("Excluir esta pasta? Os workspaces contidos voltarão para a lista principal.")) {
        if (this.send) this.send({ type: "folder_delete", folderId });
      }
    },

    openCreateGroupDialog() {
      const ask = (name) => {
        if (name && name.trim() && this.send) {
          this.send({ type: "group_create", name: name.trim() });
        }
      };
      if (window.promptDialog) window.promptDialog("Nome do novo divisor / grupo (ex.: Trabalho, Pessoal):", "Novo Grupo", ask);
      else ask("Novo Grupo");
    },

    openRenameGroupDialog(group) {
      const ask = (name) => {
        if (name && name.trim() && name !== group.name) {
          group.name = name.trim();
          if (this.send) this.send({ type: "group_rename", groupId: group.id, name: group.name });
          this.render(this.workspaces, this.activeId);
        }
      };
      if (window.promptDialog) window.promptDialog("Renomear grupo:", group.name || "Grupo", ask);
      else ask(group.name || "Grupo");
    },

    deleteGroup(groupId) {
      if (this.send) this.send({ type: "group_delete", groupId });
    },

    addWorkspaceToGroup(groupId, workspaceId) {
      this.removeWorkspaceFromFolder(workspaceId);
      const groups = this.app?.groups || this.app?.ui?.sections || [];
      for (const g of groups) {
        g.workspaceIds = (g.workspaceIds || []).filter((id) => id !== workspaceId);
      }
      const target = groups.find((g) => g.id === groupId);
      if (target) {
        target.workspaceIds = target.workspaceIds || [];
        if (!target.workspaceIds.includes(workspaceId)) {
          target.workspaceIds.push(workspaceId);
        }
      }
      if (this.send) this.send({ type: "groups_save", groups });
      this.render(this.workspaces, this.activeId);
    },

    removeWorkspaceFromGroup(workspaceId) {
      const groups = this.app?.groups || this.app?.ui?.sections || [];
      for (const g of groups) {
        g.workspaceIds = (g.workspaceIds || []).filter((id) => id !== workspaceId);
      }
      if (this.send) this.send({ type: "groups_save", groups });
      this.render(this.workspaces, this.activeId);
    },

    /* ---------------- Modal Novo/Editar Workspace ---------------- */
    openModal(w) {
      const root = this.root;
      if (!root) return;
      root.innerHTML = "";
      root.classList.remove("hidden");

      const editing = !!w;
      const ws = editing ? w : { name: "", icon: "", workingDir: "", instructions: {} };

      const overlay = el("div", "modal-overlay");
      const box = el("div", "modal");
      box.appendChild(el("h3", "", editing ? "Editar Workspace" : "Novo Workspace"));

      const fName = field("Nome", "text", ws.name || "");
      const nameRow = el("div", "dir-row");
      fName.input.style.flex = "1";
      const nameEmojiBtn = el("button", "btn icon-btn btn-emoji-picker", "😀");
      nameEmojiBtn.type = "button";
      nameEmojiBtn.title = "Inserir Emoji no Nome";
      nameEmojiBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (window.EmojiPicker) {
          window.EmojiPicker.open({ anchorEl: nameEmojiBtn, targetInput: fName.input, clientX: e.clientX, clientY: e.clientY });
        }
      });
      nameRow.appendChild(fName.input);
      nameRow.appendChild(nameEmojiBtn);
      fName.wrap.appendChild(nameRow);

      const fIcon = field("Ícone (emoji)", "text", ws.icon || "", 8);
      const iconRow = el("div", "dir-row");
      fIcon.input.style.flex = "1";
      const iconEmojiBtn = el("button", "btn icon-btn btn-emoji-picker", "😀");
      iconEmojiBtn.type = "button";
      iconEmojiBtn.title = "Escolher Emoji do Ícone";
      iconEmojiBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (window.EmojiPicker) {
          window.EmojiPicker.open({ anchorEl: iconEmojiBtn, targetInput: fIcon.input, clientX: e.clientX, clientY: e.clientY });
        }
      });
      iconRow.appendChild(fIcon.input);
      iconRow.appendChild(iconEmojiBtn);
      fIcon.wrap.appendChild(iconRow);
      const dirRow = el("div", "field");
      const dLabel = el("label", "", "Diretório de trabalho");
      const dWrap = el("div", "dir-row");
      const fDir = el("input", "input");
      fDir.type = "text";
      fDir.value = ws.workingDir || "";
      fDir.placeholder = "ex.: ~/projetos/meu-app";
      const dirBtn = el("button", "btn", "Procurar…");
      dirBtn.type = "button";
      dirBtn.addEventListener("click", () => {
        this._dirCallback = (path) => {
          if (path) fDir.value = path;
        };
        this.send({ type: "dir_pick" });
      });
      dWrap.appendChild(fDir);
      dWrap.appendChild(dirBtn);
      dirRow.appendChild(dLabel);
      dirRow.appendChild(dWrap);

      const inst = el("details", "field");
      const sum = el("summary", "", "Instruções dos agentes (CLAUDE.md / AGENTS.md)");
      const syncRow = el("label", "check-row");
      const syncCb = el("input", "");
      syncCb.type = "checkbox";
      syncCb.checked = !!(ws.instructions && ws.instructions.syncBetween);
      syncRow.appendChild(syncCb);
      syncRow.appendChild(document.createTextNode("Sincronizar automaticamente CLAUDE.md ⇄ AGENTS.md"));
      const taClaude = ta("CLAUDE.md", (ws.instructions && ws.instructions.claudeMd) || "");
      const taAgents = ta("AGENTS.md", (ws.instructions && ws.instructions.agentsMd) || "");
      inst.appendChild(sum);
      inst.appendChild(syncRow);
      inst.appendChild(taClaude.wrap);
      inst.appendChild(taAgents.wrap);

      box.appendChild(fName.wrap);
      box.appendChild(fIcon.wrap);
      box.appendChild(dirRow);
      box.appendChild(inst);

      const actions = el("div", "modal-actions");
      const cancel = el("button", "btn", "Cancelar");
      cancel.type = "button";
      cancel.addEventListener("click", () => this.closeModal());
      const save = el("button", "btn primary", editing ? "Salvar" : "Criar");
      save.type = "button";

      save.addEventListener("click", () => {
        const name = fName.input.value.trim();
        const icon = fIcon.input.value.trim();
        const dir = fDir.value.trim();
        if (!name && !editing) {
          alert("Informe um nome para o workspace.");
          return;
        }
        if (editing) {
          if (name && name !== ws.name) this.send({ type: "workspace_rename", workspaceId: ws.id, name });
          if (icon !== (ws.icon || "")) this.send({ type: "workspace_rename", workspaceId: ws.id, icon });
          if (dir !== (ws.workingDir || "")) this.send({ type: "workspace_set_dir", workspaceId: ws.id, workingDir: dir });
          this.send({
            type: "workspace_instructions",
            workspaceId: ws.id,
            content: { claudeMd: taClaude.area.value, agentsMd: taAgents.area.value },
            syncBetween: syncCb.checked,
          });
        } else {
          this.send({
            type: "workspace_create",
            name: name || "Workspace",
            workingDir: dir,
            icon: icon || "",
          });
        }
        this.closeModal();
      });

      actions.appendChild(cancel);
      actions.appendChild(save);
      box.appendChild(actions);
      overlay.appendChild(box);
      root.appendChild(overlay);

      fName.input.focus();

      function el(tag, cls, text) {
        const n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text) n.textContent = text;
        return n;
      }
      function field(label, type, value, max) {
        const wrap = document.createElement("div");
        wrap.className = "field";
        const lab = document.createElement("label");
        lab.textContent = label;
        const input = document.createElement("input");
        input.type = type;
        input.value = value;
        if (max) input.maxLength = max;
        wrap.appendChild(lab);
        wrap.appendChild(input);
        return { wrap, input };
      }
      function ta(labelText, value) {
        const wrap = document.createElement("div");
        wrap.className = "field";
        const lab = document.createElement("label");
        lab.textContent = labelText;
        const area = document.createElement("textarea");
        area.value = value;
        area.rows = 5;
        wrap.appendChild(lab);
        wrap.appendChild(area);
        return { wrap, area };
      }
    },

    closeModal() {
      if (this.root) {
        this.root.innerHTML = "";
        this.root.classList.add("hidden");
      }
    },
  };

  window.WorkspaceSidebar = WorkspaceSidebar;
})();
