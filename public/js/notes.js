// public/js/notes.js
// NoteWidget — nota Markdown no canvas (FR-019..025): Raw/Formatada, título derivado/fixável,
// mover para o projeto e encadeamento por portas de conexão.

class NoteWidget extends BasePortalWidget {
  constructor(opts) {
    super({
      ...opts,
      type: "note",
      title: opts.title || "Nota",
      width: opts.width || 360,
      height: opts.height || 300,
    });
    this.filePath = opts.filePath || "";
    this.internal = opts.internal !== false;
    this.pinned = !!opts.pinned;
    this.view = opts.view || "raw";
    this._draft = "";
    this._timer = null;
    this._saving = false;
    this._createDOM();
    this._fetch();
  }

  _createDOM() {
    const el = document.createElement("div");
    el.className = "spatial-node note-widget";
    el.dataset.id = this.id;
    el.style.width = `${this.worldSize.w}px`;
    el.style.height = `${this.worldSize.h}px`;
    el.style.transform = `translate(${this.worldPos.x}px, ${this.worldPos.y}px)`;

    el.innerHTML = `
      <div class="portal-header note-header">
        <div class="portal-icon">${window.Icons ? window.Icons.svg("note", { size: 14 }) : "📝"}</div>
        <div class="portal-title">${this.title}</div>
        <div class="portal-actions">
          <button class="portal-btn note-btn-view icon-btn" title="Alternar Raw / Formatada">${window.Icons ? window.Icons.svg("file-text", { size: 13 }) : "Md"}</button>
          <button class="portal-btn note-btn-pin icon-btn" title="Fixar nome (Renomear)">${window.Icons ? window.Icons.svg("edit", { size: 13 }) : "✎"}</button>
          <button class="portal-btn note-btn-move icon-btn" title="Mover para o projeto">${window.Icons ? window.Icons.svg("folder", { size: 13 }) : "📁"}</button>
          <button class="portal-btn btn-close icon-btn danger" title="Fechar nota">${window.Icons ? window.Icons.svg("close", { size: 13 }) : "✕"}</button>
        </div>
      </div>
      <div class="note-body">
        <textarea class="note-area" spellcheck="false" placeholder="Escreva em Markdown…"></textarea>
        <div class="note-rendered"></div>
      </div>
      <div class="spatial-resize-handle"></div>
      <div class="conn-port conn-port-left" title="Conectar nó"></div>
      <div class="conn-port conn-port-right" title="Conectar nó"></div>
    `;

    this.el = el;
    this.titleEl = el.querySelector(".portal-title");
    this.textarea = el.querySelector(".note-area");
    this.rendered = el.querySelector(".note-rendered");
    this.pinBtn = el.querySelector(".note-btn-pin");
    this.moveBtn = el.querySelector(".note-btn-move");
    const header = el.querySelector(".portal-header");
    const resizeHandle = el.querySelector(".spatial-resize-handle");
    const portLeft = el.querySelector(".conn-port-left");
    const portRight = el.querySelector(".conn-port-right");

    this._setupDragAndResize(header, resizeHandle);
    this._setupConnectionPorts(portLeft, portRight);

    // Drop-in de notas soltas sobre um Fichário (US4 / T017)
    header.addEventListener("pointerup", (e) => {
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      for (const elem of elements) {
        const binderEl = elem.closest(".binder-widget");
        if (binderEl && binderEl.dataset.id && binderEl.dataset.id !== this.id) {
          const binder = this.app?.widgets?.get(binderEl.dataset.id);
          if (binder && typeof binder.addPage === "function") {
            binder.addPage(this.id);
            break;
          }
        }
      }
    });

    el.addEventListener("pointerdown", () => this.app.setActive(this.id));

    this.pinBtn.classList.toggle("active", this.pinned);
    if (!this.internal) this.moveBtn.classList.add("hidden");

    this._setView(this.view, true);

    // Save com debounce + título derivado
    this.textarea.addEventListener("input", () => {
      this._draft = this.textarea.value;
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this._save(), 500);
      if (!this.pinned) this._deriveTitle();
    });
    this.textarea.addEventListener("blur", () => this._save());

    // Colar imagens inline da área de transferência (US3 / T010)
    this.textarea.addEventListener("paste", (e) => {
      const items = (e.clipboardData || e.originalEvent?.clipboardData)?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type && item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (!file) continue;
          const ext = item.type.split("/")[1] || "png";
          const reader = new FileReader();
          reader.onload = (evt) => {
            const base64Data = evt.target.result.split(",")[1];
            if (this.app.send) {
              this.app.send({
                type: "note_save_image",
                nodeId: this.id,
                bufferBase64: base64Data,
                extension: ext,
              });
            }
          };
          reader.readAsDataURL(file);
          break;
        }
      }
    });

    // Duplo-clique no cabeçalho para renomeação estável (US3 / T011)
    this.titleEl.addEventListener("dblclick", (e) => {
      e.stopPropagation();
      this._startInlineRename();
    });

    el.querySelector(".note-btn-view").addEventListener("click", (e) => {
      e.stopPropagation();
      this._setView(this.view === "raw" ? "rendered" : "raw");
    });
    this.pinBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this._startInlineRename();
    });
    this.moveBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!this.internal) return;
      if (this.app.send) this.app.send({ type: "note_move", nodeId: this.id });
      this.moveBtn.disabled = true;
    });
    el.querySelector(".btn-close").addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.app.removeNode) this.app.removeNode(this.id);
    });
  }

  _setView(mode, silent) {
    this.view = mode === "rendered" ? "rendered" : "raw";
    const renderOn = this.view === "rendered";
    this.textarea.style.display = renderOn ? "none" : "";
    this.rendered.style.display = renderOn ? "" : "none";
    if (!silent) this._paint();
  }

  _paint() {
    if (this.view === "rendered") this._paintRendered();
    else if (this.textarea && this.textarea.value !== this._draft) this.textarea.value = this._draft;
  }

  _sanitize(html) {
    return String(html)
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      .replace(/javascript:/gi, "");
  }

  _paintRendered() {
    if (!this.rendered) return;
    if (window.marked && window.marked.parse) {
      const raw = this._sanitize(window.marked.parse(this._draft || ""));
      if (this.rendered.innerHTML !== raw) this.rendered.innerHTML = raw;
    } else {
      this.rendered.textContent = this._draft;
    }
  }

  _deriveTitle() {
    const first = (this._draft || "").split("\n").map((l) => l.trim()).find(Boolean) || "";
    const clean = first.replace(/^#+\s*/, "").trim();
    const targetTitle = clean || "Nota";
    if (targetTitle !== this.title) {
      this.title = targetTitle;
      if (this.titleEl) this.titleEl.textContent = targetTitle;
      if (this.app.sendRename) this.app.sendRename(this.id, targetTitle);
    }
  }

  _startInlineRename() {
    if (!this.titleEl || this._isRenaming) return;
    this._isRenaming = true;
    const oldTitle = this.title;
    const input = document.createElement("input");
    input.type = "text";
    input.className = "note-title-inline-input";
    input.value = oldTitle;
    input.style.cssText = "width: 100%; font-size: 12px; font-weight: 600; padding: 1px 4px; border: 1px solid var(--accent, #6366f1); border-radius: 4px; background: var(--bg); color: var(--fg); outline: none;";

    const finish = () => {
      if (!this._isRenaming) return;
      this._isRenaming = false;
      const val = input.value.trim();
      input.remove();
      if (val) {
        this.title = val;
        this.pinned = true;
        this.pinBtn.classList.add("active");
        if (this.titleEl) this.titleEl.textContent = this.title;
        if (this.app.sendRename) this.app.sendRename(this.id, this.title);
        if (this.app.send) this.app.send({ type: "note_pinned", nodeId: this.id, pinned: true });
      } else {
        this.pinned = false;
        this.pinBtn.classList.remove("active");
        if (this.app.send) this.app.send({ type: "note_pinned", nodeId: this.id, pinned: false });
        this._deriveTitle();
      }
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        finish();
      } else if (e.key === "Escape") {
        e.preventDefault();
        this._isRenaming = false;
        input.remove();
        if (this.titleEl) this.titleEl.textContent = oldTitle;
      }
    });
    input.addEventListener("blur", () => finish());

    this.titleEl.textContent = "";
    this.titleEl.appendChild(input);
    input.focus();
    input.select();
  }

  insertImageMarkdown(imagePath) {
    if (!imagePath) return;
    const md = `\n![Imagem](${imagePath})\n`;
    if (this.textarea) {
      const start = this.textarea.selectionStart || this.textarea.value.length;
      const end = this.textarea.selectionEnd || this.textarea.value.length;
      const text = this.textarea.value;
      this.textarea.value = text.slice(0, start) + md + text.slice(end);
      this.textarea.selectionStart = this.textarea.selectionEnd = start + md.length;
      this._draft = this.textarea.value;
      this._save();
      this._paintRendered();
      if (!this.pinned) this._deriveTitle();
    }
  }

  _save() {
    this._saving = true;
    if (this.app.send) this.app.send({ type: "note_content", nodeId: this.id, content: this._draft });
    this._saving = false;
  }

  _fetch() {
    if (this.app.send) this.app.send({ type: "note_read", nodeId: this.id });
  }

  loadContent(content) {
    this._draft = content || "";
    if (this.textarea && this.textarea.value !== this._draft) this.textarea.value = this._draft;
    this._paintRendered();
    if (!this.pinned) this._deriveTitle();
  }

  applyExternalContent(content) {
    if (content === this._draft) return;
    this._draft = content || "";
    if (this.textarea) this.textarea.value = this._draft;
    this._paintRendered();
  }

  setProject(filePath) {
    this.filePath = filePath || "";
    this.internal = false;
    if (this.moveBtn) this.moveBtn.classList.add("hidden");
  }

  focus() {
    if (this.view === "raw") this.textarea?.focus();
  }

  dispose() {
    this._save();
    if (this.el && this.el.parentNode) this.el.remove();
  }
}
