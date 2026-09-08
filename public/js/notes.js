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
        <div class="portal-icon">📝</div>
        <div class="portal-title">${this.title}</div>
        <div class="portal-actions">
          <button class="portal-btn note-btn-view" title="Alternar Raw / Formatada">Md</button>
          <button class="portal-btn note-btn-pin" title="Fixar nome (Renomear)">📌</button>
          <button class="portal-btn note-btn-move" title="Mover para o projeto">📁</button>
          <button class="portal-btn btn-close" title="Fechar nota">✕</button>
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

    el.querySelector(".note-btn-view").addEventListener("click", (e) => {
      e.stopPropagation();
      this._setView(this.view === "raw" ? "rendered" : "raw");
    });
    this.pinBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!this.pinned) {
        const nm = prompt("Renomear nota (fixa o nome):", this.title);
        if (nm && nm.trim()) {
          this.title = nm.trim();
          if (this.titleEl) this.titleEl.textContent = this.title;
          if (this.app.sendRename) this.app.sendRename(this.id, this.title);
        }
      }
      this.pinned = true;
      this.pinBtn.classList.add("active");
      if (this.app.send) this.app.send({ type: "note_pinned", nodeId: this.id, pinned: true });
    });
    this.moveBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!this.internal) return;
      if (this.app.send) this.app.send({ type: "note_move", nodeId: this.id });
      this.moveBtn.disabled = true;
    });
    el.querySelector(".btn-close").addEventListener("click", (e) => {
      e.stopPropagation();
      if (!this.internal && !confirm("Excluir a nota e o arquivo localizado no projeto?")) return;
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
    if (clean && clean !== this.title) {
      this.title = clean;
      if (this.titleEl) this.titleEl.textContent = clean;
      if (this.app.sendRename) this.app.sendRename(this.id, clean);
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
