// public/js/filetree.js
// FileTreeWidget — Árvore de Arquivos do workspace (US5): navegação (Lista/Grade),
// Diff (uncommitted), Graph (git log), CRUD via contexto, operações Git e
// envio de caminho para o terminal ativo.

class FileTreeWidget extends BasePortalWidget {
  constructor(opts) {
    super({
      ...opts,
      type: "file-tree",
      title: opts.title || "Arquivos",
      width: opts.width || 360,
      height: opts.height || 480,
    });
    this.root = opts.rootPath || "";
    this.view = opts.view || "list";
    this.path = this.root;
    this.entries = [];
    this.expanded = new Set();
    this.branch = "";
    this.editing = false;
    this.currentFile = null;
    this.cm = null;
    this._createDOM();
    if (this.root) {
      this.reload();
      this.refreshBranch();
    }
  }

  _createDOM() {
    const el = document.createElement("div");
    el.className = "spatial-node filetree-widget";
    el.dataset.id = this.id;
    el.style.width = `${this.worldSize.w}px`;
    el.style.height = `${this.worldSize.h}px`;
    el.style.transform = `translate(${this.worldPos.x}px, ${this.worldPos.y}px)`;

    el.innerHTML = `
      <div class="portal-header note-header ft-header">
        <div class="portal-icon">${window.Icons ? window.Icons.svg("file-tree", { size: 14 }) : "🗂"}</div>
        <div class="portal-title">${this.title}</div>
        <div class="ft-actions">
          <button class="ft-btn ft-search icon-btn" title="Buscar arquivos ou conteúdo (Ctrl+P)">${window.Icons ? window.Icons.svg("search", { size: 13 }) : "🔍"}</button>
          <button class="ft-btn ft-list icon-btn" title="Lista">${window.Icons ? window.Icons.svg("file-text", { size: 13 }) : "☰"}</button>
          <button class="ft-btn ft-grid icon-btn" title="Grade de ícones">${window.Icons ? window.Icons.svg("grid", { size: 13 }) : "▦"}</button>
          <button class="ft-btn ft-diff icon-btn" title="Diff (uncommitted)">${window.Icons ? window.Icons.svg("git-commit", { size: 13 }) : "±"}</button>
          <button class="ft-btn ft-graph icon-btn" title="Grafo de commits">${window.Icons ? window.Icons.svg("git-merge", { size: 13 }) : "⇄"}</button>
          <button class="ft-btn ft-branch icon-btn" title="Menu Git">${window.Icons ? window.Icons.svg("git-branch", { size: 13 }) : "⎇"}</button>
          <button class="ft-btn ft-reload icon-btn" title="Recarregar">${window.Icons ? window.Icons.svg("refresh-cw", { size: 13 }) : "↻"}</button>
          <button class="portal-btn btn-close icon-btn danger" title="Fechar">${window.Icons ? window.Icons.svg("close", { size: 13 }) : "✕"}</button>
        </div>
      </div>
      <div class="ft-pathbar" title="caminho atual"></div>
      <div class="ft-search-bar hidden">
        <input type="text" class="ft-search-input" placeholder="Buscar arquivo… (> para conteúdo)" />
        <div class="ft-search-results hidden"></div>
      </div>
      <div class="ft-body"></div>
      <div class="spatial-resize-handle"></div>
      <div class="conn-port conn-port-left" title="Conectar nó"></div>
      <div class="conn-port conn-port-right" title="Conectar nó"></div>
    `;

    this.el = el;
    this.titleEl = el.querySelector(".portal-title");
    this.body = el.querySelector(".ft-body");
    this.pathbar = el.querySelector(".ft-pathbar");
    const header = el.querySelector(".ft-header");
    const resizeHandle = el.querySelector(".spatial-resize-handle");
    const portLeft = el.querySelector(".conn-port-left");
    const portRight = el.querySelector(".conn-port-right");
    this._setupDragAndResize(header, resizeHandle);
    this._setupConnectionPorts(portLeft, portRight);
    el.addEventListener("pointerdown", () => this.app.setActive(this.id));

    this._ctx = document.createElement("div");
    this._ctx.className = "ctx-menu hidden";
    document.body.appendChild(this._ctx);

    el.querySelector(".btn-close").addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.app.removeNode) this.app.removeNode(this.id);
    });
    el.querySelector(".ft-search").addEventListener("click", (e) => { e.stopPropagation(); this.toggleSearch(); });
    el.querySelector(".ft-list").addEventListener("click", (e) => { e.stopPropagation(); this.setView("list"); });
    el.querySelector(".ft-grid").addEventListener("click", (e) => { e.stopPropagation(); this.setView("grid"); });
    el.querySelector(".ft-diff").addEventListener("click", (e) => { e.stopPropagation(); this.setView("diff"); });
    el.querySelector(".ft-graph").addEventListener("click", (e) => { e.stopPropagation(); this.setView("graph"); });
    el.querySelector(".ft-reload").addEventListener("click", (e) => { e.stopPropagation(); this.reload(); this.refreshBranch(); });
    el.querySelector(".ft-branch").addEventListener("click", (e) => {
      e.stopPropagation();
      this._openGitMenu(e.clientX, e.clientY);
    });

    const searchInput = el.querySelector(".ft-search-input");
    let searchDebounce = null;
    searchInput.addEventListener("input", () => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => this.runSearch(searchInput.value), 250);
    });
    searchInput.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.toggleSearch();
      } else if (e.key === "Enter") {
        this.runSearch(searchInput.value);
      }
    });

    // Atalho Ctrl+P no nó da árvore para busca fuzzy / busca interna (T034 / FR-033)
    el.addEventListener("keydown", (e) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && !e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        e.stopPropagation();
        this.toggleSearch();
      }
    });
  }

  send(m) {
    if (this.app.send) this.app.send({ ...m, nodeId: this.id });
  }

  setView(view) {
    this.view = view;
    for (const b of this.el.querySelectorAll(".ft-btn")) b.classList.remove("on");
    this.el.querySelector(`.ft-${view}`)?.classList.add("on");
    if (view === "diff") this.loadDiff();
    else if (view === "graph") this.loadGraph();
    else this.reload();
  }

  reload() {
    if (!this.root) {
      this.body.innerHTML = '<div class="ft-empty">Defina um diretório no workspace para navegar arquivos.</div>';
      return;
    }
    if (this.view === "grid" && this.path !== this.root) {
      this.renderGrid();
      return;
    }
    this.send({ type: "fs_read_dir", path: this.path });
  }

  onDirResult(path, entries) {
    this.path = path || this.root;
    this.pathbar.textContent = this.path || "";
    this.entries = entries || [];
    if (this.view === "grid") this.renderGrid();
    else this.renderList();
  }

  renderList() {
    this.body.innerHTML = "";
    if (!this.root) return;
    const ul = document.createElement("div");
    ul.className = "ft-list-view";

    if (this.path !== this.root) {
      const up = this._rowEntry({ name: "..", path: this.path.split("/").slice(0, -1).join("/") || this.root, type: "dir", up: true });
      up.addEventListener("click", () => this.send({ type: "fs_read_dir", path: this.path.split("/").slice(0, -1).join("/") || this.root }));
      ul.appendChild(up);
    }

    for (const e of this.entries) {
      const row = this._rowEntry(e);
      ul.appendChild(row);
    }
    if (!this.entries.length) ul.appendChild(elDiv("ft-empty", "Pasta vazia"));
    this.body.appendChild(ul);
  }

  _rowEntry(e) {
    const row = document.createElement("div");
    row.className = "ft-row";
    const isDir = e.type === "dir" || e.up;
    const isCode = /\.(js|ts|jsx|tsx|json|html|css|py|sh|c|cpp|rs|go|md)$/i.test(e.name);
    const iconName = isDir ? "folder" : (isCode ? "file-code" : "file-text");
    const icon = document.createElement("span");
    icon.className = "ft-file-icon";
    icon.style.display = "inline-flex";
    icon.style.alignItems = "center";
    icon.style.justifyContent = "center";
    icon.innerHTML = window.Icons ? window.Icons.svg(iconName, { size: 14 }) : (isDir ? "📁" : "📄");
    const name = document.createElement("span");
    name.className = "ft-name";
    name.textContent = e.name;
    name.title = e.path;
    row.append(icon, name);

    if (!e.up) {
      if (isDir) {
        row.addEventListener("click", () => this.send({ type: "fs_read_dir", path: e.path }));
      } else {
        row.addEventListener("dblclick", () => this.openFile(e.path));
      }
      row.addEventListener("contextmenu", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this._openFileCtx(ev.clientX, ev.clientY, e);
      });
    }
    return row;
  }

  renderGrid() {
    this.body.innerHTML = "";
    const g = document.createElement("div");
    g.className = "ft-grid-view";
    for (const e of this.entries) {
      const tile = document.createElement("div");
      tile.className = "ft-tile";
      tile.title = e.name;
      tile.addEventListener("dblclick", () => {
        if (e.type === "dir") this.send({ type: "fs_read_dir", path: e.path });
        else this.openFile(e.path);
      });
      if (e.type === "dir") {
        const dirIcon = window.Icons ? window.Icons.svg("folder", { size: 22 }) : "📁";
        tile.innerHTML = `<span class="ft-tile-ic" style="display:inline-flex;align-items:center;justify-content:center;">${dirIcon}</span><span class="ft-tile-name">${e.name}</span>`;
      } else {
        const isImg = /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(e.name);
        if (isImg) {
          tile.innerHTML = `<img class="ft-thumb" src="file://${e.path}" /><span class="ft-tile-name">${e.name}</span>`;
        } else {
          const isCode = /\.(js|ts|jsx|tsx|json|html|css|py|sh|c|cpp|rs|go|md)$/i.test(e.name);
          const fileIcon = window.Icons ? window.Icons.svg(isCode ? "file-code" : "file-text", { size: 22 }) : "📄";
          tile.innerHTML = `<span class="ft-tile-ic" style="display:inline-flex;align-items:center;justify-content:center;">${fileIcon}</span><span class="ft-tile-name">${e.name}</span>`;
        }
      }
      g.appendChild(tile);
    }
    this.body.appendChild(g);
  }

  loadDiff() {
    this.body.innerHTML = '<div class="ft-empty">Carregando diff…</div>';
    this.send({ type: "git_diff", cwd: this.root });
  }

  onDiff(text) {
    this.body.innerHTML = "";
    const pre = document.createElement("pre");
    pre.className = "ft-pre";
    pre.textContent = text || "(sem alterações não commitadas)";
    this.body.appendChild(pre);
  }

  loadGraph() {
    this.body.innerHTML = '<div class="ft-empty">Carregando grafo…</div>';
    this.send({ type: "git_graph", cwd: this.root });
  }

  onGraph(text) {
    this.body.innerHTML = "";
    const pre = document.createElement("pre");
    pre.className = "ft-pre";
    pre.textContent = text || "(repositório sem commits)";
    this.body.appendChild(pre);
  }

  refreshBranch() {
    this.send({ type: "git_ops", cwd: this.root, action: "branch_show" });
  }

  onGitResult(action, ok, data) {
    if (action === "branch_show" && ok) {
      this.branch = (data && data.out || "").trim();
      const chip = this.el.querySelector(".ft-branch");
      if (chip) chip.textContent = this.branch ? `⎇ ${this.branch}` : "⎇";
    }
    this.reload();
  }

  _openFileCtx(x, y, e) {
    const m = this._ctx;
    m.innerHTML = "";
    const item = (label, fn, danger) => {
      const d = elDiv("ctx-item" + (danger ? " danger" : ""), label);
      d.addEventListener("click", () => { m.classList.add("hidden"); fn(); });
      m.appendChild(d);
    };
    item(e.type === "dir" ? "Nova pasta dentro" : "Novo arquivo dentro", () => this._crudPrompt(e, "mkdir"));
    item("Renomear", () => this._crudPrompt(e, "rename"));
    if (e.type === "file") {
      item("Inserir caminho no terminal ativo", () => this._sendPathToTerminal(e));
    }
    item("Excluir", () => {
      if (confirm(`Excluir "${e.name}"?`)) {
        this.send({ type: "fs_crud", action: "delete", path: e.path });
        setTimeout(() => this.reload(), 250);
      }
    }, true);
    m.classList.remove("hidden");
    const mw = 240;
    m.style.left = Math.min(x, window.innerWidth - mw - 8) + "px";
    m.style.top = Math.min(y, window.innerHeight - m.offsetHeight - 8) + "px";
    setTimeout(() => document.addEventListener("pointerdown", () => m.classList.add("hidden"), { once: true }), 0);
  }

  _crudPrompt(e, mode) {
    const isRename = mode === "rename";
    const def = isRename ? e.name : "";
    const label = isRename ? "Novo nome:" : "Novo arquivo/pasta:";
    const val = prompt(label, def);
    if (!val || !val.trim()) return;
    if (isRename) {
      this.send({ type: "fs_crud", action: "rename", path: e.path, newName: val.trim() });
    } else {
      const isDir = /\/$/.test(val);
      this.send({ type: "fs_crud", action: isDir ? "mkdir" : "create", path: this.path, newName: isDir ? val.replace(/\/$/, "") : val.trim() });
    }
    setTimeout(() => this.reload(), 300);
  }

  _openGitMenu(x, y) {
    const m = this._ctx;
    m.innerHTML = "";
    const item = (label, fn) => {
      const d = elDiv("ctx-item", label);
      d.addEventListener("click", () => { m.classList.add("hidden"); fn(); });
      m.appendChild(d);
    };
    const run = (action, extra) => this.send({ type: "git_ops", cwd: this.root, action, ...extra });
    const promptFor = (action, label, key) => {
      const v = prompt(label);
      if (v && v.trim()) run(action, { [key]: v.trim() });
    };
    item("Commit…", () => promptFor("commit", "Mensagem do commit:", "message"));
    item("Pull", () => { run("pull"); setTimeout(() => this.reload(), 400); });
    item("Push", () => { run("push"); setTimeout(() => this.reload(), 400); });
    item("Fetch", () => run("fetch"));
    item("Nova branch…", () => promptFor("branch", "Nome da nova branch:", "branch"));
    item("Checkout…", () => promptFor("checkout", "Branch para checkout:", "branch"));
    item("Merge…", () => promptFor("merge", "Branch a mesclar:", "branch"));
    item("Stash", () => run("stash"));
    m.classList.remove("hidden");
    const mw = 200;
    m.style.left = Math.min(x, window.innerWidth - mw - 8) + "px";
    m.style.top = Math.min(y, window.innerHeight - m.offsetHeight - 8) + "px";
    setTimeout(() => document.addEventListener("pointerdown", () => m.classList.add("hidden"), { once: true }), 0);
  }

  _sendPathToTerminal(e) {
    const path = e.path || e;
    const active = this.app.activeId ? this.app.widgets.get(this.app.activeId) : null;
    if (active && active.id !== this.id) {
      if (this.app.sendInput) this.app.sendInput(active.id, `"${path}" `);
    } else if (window.toast) {
      toast("Foque um terminal para inserir o caminho.");
    }
  }

  /* ---- Editor embutido (CodeMirror) — US9 ---- */
  openFile(path) {
    if (!path) return;
    this.currentFile = path;
    this.send({ type: "file_read", path });
    this.body.innerHTML = '<div class="ft-empty">Abrindo arquivo…</div>';
  }

  guessMode(path) {
    const ext = (path.split(".").pop() || "").toLowerCase();
    const map = { js: "javascript", jsx: "javascript", mjs: "javascript", cjs: "javascript", json: "javascript",
      ts: "javascript", tsx: "javascript", css: "css", scss: "css", html: "htmlmixed", htm: "htmlmixed", vue: "htmlmixed",
      xml: "xml", svg: "xml", md: "markdown", markdown: "markdown", py: "python",
      c: "clike", h: "clike", cpp: "clike", java: "clike", js: "clike", cs: "clike", sh: "shell", bash: "shell", zsh: "shell" };
    return map[ext] || null;
  }

  onFileRead(path, content) {
    if (path !== this.currentFile) return;
    this.editing = true;
    this.body.innerHTML = "";
    const bar = elDiv("ft-editor-bar", "");
    const title = document.createElement("span");
    title.className = "ft-editor-file";
    title.textContent = path.split("/").pop() || path;
    const back = elDiv("btn-link", "← Voltar à lista");
    bar.append(title, back);

    const wrap = document.createElement("div");
    wrap.className = "cm-wrap";
    const ta = document.createElement("textarea");
    ta.value = content || "";
    wrap.appendChild(ta);
    this.body.append(bar, wrap);

    const scheduleSave = (fn) => {
      clearTimeout(this._saveTimer);
      this._saveTimer = setTimeout(fn, 600);
    };
    const save = () => {
      if (!this.currentFile) return;
      const value = this.cm ? this.cm.getValue() : ta.value;
      this.send({ type: "file_write", path: this.currentFile, content: value });
    };

    if (window.CodeMirror) {
      this.cm = CodeMirror.fromTextArea(ta, {
        lineNumbers: true,
        mode: this.guessMode(path) || undefined,
        autoCloseBrackets: true,
        matchBrackets: true,
        tabSize: 2,
        indentUnit: 2,
        indentWithTabs: false,
      });
      this.cm.on("change", () => scheduleSave(save));
      this._setupCodeMirrorQuote();
    } else {
      this.cm = null;
      ta.style.width = "100%";
      ta.style.height = "100%";
      ta.addEventListener("input", () => scheduleSave(save));
    }
    back.addEventListener("click", () => this.closeEditor());
  }

  /* ---- Citação de Código para Agentes (T033 / US6 / FR-034) ---- */
  _setupCodeMirrorQuote() {
    if (!this.cm) return;
    let quoteBtn = this.el.querySelector(".ft-quote-float");
    if (!quoteBtn) {
      quoteBtn = document.createElement("button");
      quoteBtn.className = "ft-quote-float btn small primary";
      quoteBtn.style.position = "absolute";
      quoteBtn.style.zIndex = "50";
      quoteBtn.style.display = "none";
      quoteBtn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
      quoteBtn.innerHTML = (window.Icons ? window.Icons.svg("message-square", { size: 12 }) : "💬 ") + " Citar para Agente";
      this.el.appendChild(quoteBtn);

      quoteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const selection = this.cm.getSelection();
        if (!selection) return;
        const from = this.cm.getCursor("from");
        const to = this.cm.getCursor("to");
        const fname = this.currentFile ? this.currentFile.split("/").pop() : "arquivo";
        const snippet = `Em \`${fname}\` (L${from.line + 1}-L${to.line + 1}):\n\`\`\`\n${selection}\n\`\`\`\n`;
        this._quoteToAgent(snippet);
        quoteBtn.style.display = "none";
      });
    }

    this.cm.on("cursorActivity", () => {
      const sel = this.cm.getSelection();
      if (!sel || !sel.trim()) {
        quoteBtn.style.display = "none";
        return;
      }
      const coords = this.cm.cursorCoords(true, "window");
      const nodeRect = this.el.getBoundingClientRect();
      quoteBtn.style.left = `${Math.max(10, coords.left - nodeRect.left)}px`;
      quoteBtn.style.top = `${Math.max(30, coords.top - nodeRect.top - 32)}px`;
      quoteBtn.style.display = "inline-flex";
    });
  }

  _quoteToAgent(snippet) {
    let targetTerm = null;
    if (this.app?.connections?.connections) {
      for (const conn of this.app.connections.connections.values()) {
        if (conn.from === this.id || conn.to === this.id) {
          const otherId = conn.from === this.id ? conn.to : conn.from;
          const other = this.app.widgets?.get(otherId);
          if (other && (other.type === "terminal" || !other.type)) {
            targetTerm = other;
            break;
          }
        }
      }
    }
    if (!targetTerm && this.app?.activeId) {
      const active = this.app.widgets?.get(this.app.activeId);
      if (active && (active.type === "terminal" || !active.type)) {
        targetTerm = active;
      }
    }

    if (targetTerm && this.app?.sendInput) {
      this.app.sendInput(targetTerm.id, snippet);
      if (typeof window.toast === "function") {
        toast(`Trecho citado para o terminal "${targetTerm.titleText || targetTerm.title || targetTerm.id}".`);
      }
      if (this.app?.connections?.triggerPulse) {
        this.app.connections.triggerPulse(this.id, targetTerm.id);
      }
    } else {
      navigator.clipboard.writeText(snippet);
      if (typeof window.toast === "function") {
        toast("Trecho copiado para a área de transferência (nenhum agente conectado).");
      }
    }
  }

  /* ---- Busca Fuzzy e Busca Interna no Nó (T034 / US6 / FR-033) ---- */
  toggleSearch() {
    const bar = this.el.querySelector(".ft-search-bar");
    const input = this.el.querySelector(".ft-search-input");
    if (!bar || !input) return;
    const isHidden = bar.classList.contains("hidden");
    bar.classList.toggle("hidden", !isHidden);
    if (isHidden) {
      input.focus();
      input.select();
    } else {
      const res = this.el.querySelector(".ft-search-results");
      if (res) res.classList.add("hidden");
    }
  }

  runSearch(val) {
    if (!val || !val.trim()) {
      const res = this.el.querySelector(".ft-search-results");
      if (res) res.classList.add("hidden");
      return;
    }
    const byContent = val.startsWith(">");
    const query = byContent ? val.slice(1).trim() : val.trim();
    if (!query) return;
    this.send({ type: "file_search", cwd: this.root, query, byContent });
  }

  onSearchResults(matches) {
    const res = this.el.querySelector(".ft-search-results");
    if (!res) return;
    res.innerHTML = "";
    if (!matches || !matches.length) {
      res.innerHTML = '<div class="ft-search-item muted" style="padding:6px 10px; font-size:11px; color:#888;">Nenhum resultado.</div>';
      res.classList.remove("hidden");
      return;
    }
    for (const m of matches.slice(0, 30)) {
      const item = document.createElement("div");
      item.className = "ft-search-item";
      item.style.padding = "5px 10px";
      item.style.fontSize = "11.5px";
      item.style.cursor = "pointer";
      item.style.borderBottom = "1px solid var(--panel-border, #eee)";
      const rel = m.path.replace(this.root, "").replace(/^[/\\]/, "");
      item.textContent = rel;
      item.title = m.path;
      item.addEventListener("mouseenter", () => item.style.background = "var(--hover-bg, #f0f0f0)");
      item.addEventListener("mouseleave", () => item.style.background = "");
      item.addEventListener("click", () => {
        this.openFile(m.path);
        this.toggleSearch();
      });
      res.appendChild(item);
    }
    res.classList.remove("hidden");
  }

  /* ---- Quick Look Preview Modal (T031 / US6 / FR-032) ---- */
  openQuickLook(e) {
    if (!e || !e.path) return;
    const existing = document.getElementById("ft-quicklook-modal");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "ft-quicklook-modal";
    overlay.className = "modal-overlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
    overlay.style.display = "flex";
    overlay.style.alignItems = "center";
    overlay.style.justifyContent = "center";
    overlay.style.zIndex = "2000";

    const box = document.createElement("div");
    box.className = "modal";
    box.style.background = "var(--panel-bg, #ffffff)";
    box.style.borderRadius = "10px";
    box.style.padding = "16px";
    box.style.maxWidth = "80vw";
    box.style.maxHeight = "80vh";
    box.style.overflow = "auto";
    box.style.boxShadow = "0 10px 40px rgba(0,0,0,0.4)";

    const title = document.createElement("h4");
    title.textContent = e.name;
    title.style.margin = "0 0 10px 0";
    box.appendChild(title);

    const isImg = /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(e.name);
    if (isImg) {
      const img = document.createElement("img");
      img.src = `file://${e.path}`;
      img.style.maxWidth = "100%";
      img.style.maxHeight = "65vh";
      img.style.borderRadius = "6px";
      box.appendChild(img);
    } else {
      const pre = document.createElement("pre");
      pre.className = "ft-pre";
      pre.style.maxHeight = "60vh";
      pre.style.overflow = "auto";
      pre.textContent = "Carregando conteúdo…";
      box.appendChild(pre);

      fetch(`file://${e.path}`)
        .then(r => r.text())
        .then(txt => { pre.textContent = txt.slice(0, 50000); })
        .catch(() => { pre.textContent = "(Arquivo binário ou não legível)"; });
    }

    const closeBtn = document.createElement("button");
    closeBtn.className = "btn";
    closeBtn.textContent = "Fechar (Esc)";
    closeBtn.style.marginTop = "10px";
    closeBtn.addEventListener("click", () => overlay.remove());
    box.appendChild(closeBtn);

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    const onKey = (ev) => {
      if (ev.key === "Escape" || ev.code === "Space") {
        ev.preventDefault();
        overlay.remove();
        document.removeEventListener("keydown", onKey);
      }
    };
    document.addEventListener("keydown", onKey);
  }

  closeEditor() {
    if (this.cm) {
      this.cm.toTextArea();
      this.cm = null;
    }
    this.editing = false;
    this.currentFile = null;
    this.reload();
  }

  dispose() {
    if (this._ctx && this._ctx.parentNode) this._ctx.remove();
    if (this.el && this.el.parentNode) this.el.remove();
  }

  fit() {}
}

function elDiv(cls, text) {
  const d = document.createElement("div");
  d.className = cls;
  if (text) d.textContent = text;
  return d;
}
