const FitAddon = (window.FitAddon && window.FitAddon.FitAddon) || window.FitAddon;

const MIN_W = 240;
const MIN_H = 140;

const DEFAULT_STYLE = {
  bg: "#121212",
  fg: "#e6e6e6",
  cursor: "#ececec",
  cursorAccent: "#121212",
  titlebar: "#f0f0ee",
  titlebarText: "#1f1f1e",
  selBg: "#264f78",
  selFg: "#ffffff",
  fontSize: 13,
  titleSize: 12.5,
};

const THEME_PRESETS = {
  Escuro: { bg: "#121212", fg: "#e6e6e6", cursor: "#ececec", cursorAccent: "#121212", titlebar: "#f0f0ee", titlebarText: "#1f1f1e" },
  Claro: { bg: "#f4f4f2", fg: "#1f1f1e", cursor: "#1f1f1e", cursorAccent: "#ffffff", titlebar: "#ffffff", titlebarText: "#1f1f1e" },
  Verde: { bg: "#002b1a", fg: "#39ffa0", cursor: "#39ffa0", cursorAccent: "#002b1a", titlebar: "#0a3d29", titlebarText: "#c8ffe3" },
  Azul: { bg: "#0d1b2a", fg: "#9fd6ff", cursor: "#58a6ff", cursorAccent: "#0d1b2a", titlebar: "#12263a", titlebarText: "#c8e6ff" },
  Âmbar: { bg: "#1a1206", fg: "#ffd27a", cursor: "#ffb347", cursorAccent: "#1a1206", titlebar: "#2a1c08", titlebarText: "#ffe4b3" },
};

class TermWidget {
  constructor({ id, title, x, y, width, height, style, app }) {
    this.id = id;
    this.app = app;
    this.titleText = title;
    this.worldPos = { x, y };
    this.worldSize = { w: width, h: height };
    this.style = { ...DEFAULT_STYLE, ...(style || {}) };

    this.term = new window.Terminal({
      cursorBlink: true,
      fontSize: this.style.fontSize,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      scrollback: 5000,
      theme: this._themeFromStyle(),
      allowTransparency: false,
    });
    this.fitAddon = new FitAddon();

    this.el = this._build();
    this._setupTerm();
    this._bindEvents();
    this.applyStyle(this.style, { skipSend: true });
  }

  _build() {
    const el = document.createElement("div");
    el.className = "widget";
    el.dataset.id = this.id;
    el.style.left = `${this.worldPos.x}px`;
    el.style.top = `${this.worldPos.y}px`;
    el.style.width = `${this.worldSize.w}px`;
    el.style.height = `${this.worldSize.h}px`;

    const titlebar = document.createElement("div");
    titlebar.className = "titlebar";

    this.titleEl = document.createElement("span");
    this.titleEl.className = "title";
    this.titleEl.textContent = this.titleText;
    titlebar.appendChild(this.titleEl);

    const renameBtn = document.createElement("button");
    renameBtn.className = "tb-btn";
    renameBtn.textContent = "✎";
    renameBtn.title = "Renomear";
    renameBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
    renameBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.startRename();
    });
    titlebar.appendChild(renameBtn);

    const settingsBtn = document.createElement("button");
    settingsBtn.className = "tb-btn";
    settingsBtn.textContent = "⚙";
    settingsBtn.title = "Configurações (fundo, cores, fonte)";
    settingsBtn.dataset.settingsFor = this.id;
    settingsBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
    settingsBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleSettings();
    });
    titlebar.appendChild(settingsBtn);

    const delBtn = document.createElement("button");
    delBtn.className = "tb-btn danger";
    delBtn.textContent = "✕";
    delBtn.title = "Fechar terminal";
    delBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.app.requestKill(this.id);
    });
    titlebar.appendChild(delBtn);

    const host = document.createElement("div");
    host.className = "term-host";
    this.termHost = host;

    const handle = document.createElement("div");
    handle.className = "resize-handle";

    const portRight = document.createElement("div");
    portRight.className = "conn-port port-right";
    portRight.title = "Arrastar para conectar a outro terminal";

    const portLeft = document.createElement("div");
    portLeft.className = "conn-port port-left";
    portLeft.title = "Ponto de conexão";

    el.appendChild(titlebar);
    el.appendChild(host);
    el.appendChild(handle);
    el.appendChild(portRight);
    el.appendChild(portLeft);
    return el;
  }

  _setupTerm() {
    const hostDiv = document.createElement("div");
    hostDiv.className = "xterm";
    this.termHost.appendChild(hostDiv);
    this.term.open(hostDiv);
    this.term.loadAddon(this.fitAddon);

    // Register Link Provider for clickable URLs and localhost
    if (typeof this.term.registerLinkProvider === "function") {
      const urlRegex = /(https?:\/\/[^\s"'`<>]+|localhost:[0-9]+[^\s"'`<>]*)/gi;
      this.term.registerLinkProvider({
        provideLinks: (bufferLineNumber, callback) => {
          const line = this.term.buffer.active.getLine(bufferLineNumber - 1);
          if (!line) return callback([]);
          const text = line.translateToString(true);
          const links = [];
          let match;
          urlRegex.lastIndex = 0;
          while ((match = urlRegex.exec(text)) !== null) {
            let uri = match[0];
            if (uri.startsWith("localhost:")) uri = "http://" + uri;
            links.push({
              range: {
                start: { x: match.index + 1, y: bufferLineNumber },
                end: { x: match.index + match[0].length, y: bufferLineNumber },
              },
              text: uri,
              activate: (e, text) => {
                if (this.app.openExternal) {
                  this.app.openExternal(text);
                } else {
                  window.open(text, "_blank");
                }
              },
            });
          }
          callback(links);
        },
      });
    }

    // Attach custom key handler for reliable Ctrl+V / Cmd+V paste
    this.term.attachCustomKeyEventHandler((e) => {
      if (e.type === "keydown") {
        const isPaste =
          (e.ctrlKey && !e.metaKey && e.key.toLowerCase() === "v") ||
          (e.metaKey && !e.ctrlKey && e.key.toLowerCase() === "v") ||
          (e.shiftKey && e.key === "Insert");

        if (isPaste) {
          e.preventDefault();
          navigator.clipboard
            .readText()
            .then((text) => {
              if (text) this.app.sendInput(this.id, text);
            })
            .catch(() => {});
          return false;
        }
      }
      return true;
    });

    this.term.onData((data) => this.app.sendInput(this.id, data));
    this.term.onResize(({ cols, rows }) => {
      this.app.sendResize(this.id, cols, rows, this.worldSize.w, this.worldSize.h);
    });
    this.fit();
  }

  fit() {
    try {
      this.fitAddon.fit();
    } catch {}
  }

  /* ---- estado ---- */
  setActive(active) {
    this.el.classList.toggle("active", active);
  }

  isActive() {
    return this.el.classList.contains("active");
  }

  focus() {
    this.term.focus();
  }

  write(data) {
    this.term.write(data);
  }

  /* ---- estilo ---- */
  _themeFromStyle() {
    const st = this.style;
    return {
      background: st.bg,
      foreground: st.fg,
      cursor: st.cursor,
      cursorAccent: st.cursorAccent,
      selectionBackground: st.selBg,
      selectionForeground: st.selFg,
    };
  }

  applyStyle(style, { skipSend = false } = {}) {
    this.style = { ...DEFAULT_STYLE, ...this.style, ...style };
    const st = this.style;
    this.term.options.theme = this._themeFromStyle();
    this.term.options.fontSize = st.fontSize;
    this.termHost.style.background = st.bg;
    this.el.style.setProperty("--tb-bg", st.titlebar);
    this.el.style.setProperty("--tb-fg", st.titlebarText);
    this.el.style.setProperty("--tb-fs", `${st.titleSize}px`);
    this.fit();
    if (!skipSend) this.app.sendStyle(this.id, style);
    if (this.popEl) this._syncPopInputs();
  }

  /* ---- painel de configurações ---- */
  toggleSettings() {
    if (this.popEl) this.closeSettings();
    else this.openSettings();
  }

  openSettings() {
    if (this.popEl) return;
    this._buildSettingsPop();
    document.body.appendChild(this.popEl);
    this._positionSettingsPop();
    this._outsideHandler = (e) => {
      if (!this.popEl.contains(e.target) && !e.target.closest(`[data-settings-for="${this.id}"]`)) {
        this.closeSettings();
      }
    };
    setTimeout(() => document.addEventListener("pointerdown", this._outsideHandler), 0);
  }

  closeSettings() {
    if (!this.popEl) return;
    document.removeEventListener("pointerdown", this._outsideHandler);
    this.popEl.remove();
    this.popEl = null;
    this._outsideHandler = null;
  }

  _positionSettingsPop() {
    const r = this.el.getBoundingClientRect();
    const pw = 280;
    const ph = this.popEl.offsetHeight || 440;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let x = r.right - pw - 8;
    if (x < 8) x = r.left + 8;
    let y = r.top + 6;
    if (y + ph > vh - 8) y = Math.max(8, r.bottom - ph - 8);
    this.popEl.style.left = `${x}px`;
    this.popEl.style.top = `${y}px`;
  }

  _buildSettingsPop() {
    const st = this.style;
    const pop = document.createElement("div");
    pop.className = "settings-pop";
    this.popEl = pop;

    const head = document.createElement("div");
    head.className = "sp-head";
    const htitle = document.createElement("div");
    htitle.className = "sp-title";
    htitle.textContent = "Configurações do terminal";
    const closeBtn = document.createElement("button");
    closeBtn.className = "sp-x";
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", () => this.closeSettings());
    head.appendChild(htitle);
    head.appendChild(closeBtn);
    pop.appendChild(head);

    const mkGroup = (label) => {
      const g = document.createElement("div");
      g.className = "sp-group";
      const l = document.createElement("label");
      l.className = "sp-label";
      l.textContent = label;
      g.appendChild(l);
      return g;
    };

    const nameGroup = mkGroup("Nome (preso acima)");
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = this.titleText;
    nameInput.addEventListener("change", () => {
      const val = nameInput.value.trim();
      if (val && val !== this.titleText) this.app.sendRename(this.id, val);
    });
    nameGroup.appendChild(nameInput);
    pop.appendChild(nameGroup);

    const themeGroup = mkGroup("Tema");
    const themeSelect = document.createElement("select");
    for (const name of Object.keys(THEME_PRESETS)) {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      themeSelect.appendChild(opt);
    }
    themeSelect.addEventListener("change", () => {
      const preset = THEME_PRESETS[themeSelect.value];
      if (preset) this.applyStyle(preset);
    });
    themeGroup.appendChild(themeSelect);
    pop.appendChild(themeGroup);

    const colorGroup = mkGroup("Cores");
    const grid = document.createElement("div");
    grid.className = "sp-grid";
    this.popFields = {};
    const colorFields = [
      ["bg", "Fundo"],
      ["fg", "Texto"],
      ["selBg", "Fundo texto"],
      ["selFg", "Texto seleção"],
      ["cursor", "Cursor"],
      ["titlebar", "Barra título"],
      ["titlebarText", "Texto título"],
    ];
    this.popFields.colors = {};
    for (const [key, label] of colorFields) {
      const row = document.createElement("div");
      row.className = "sp-color";
      const lab = document.createElement("span");
      lab.textContent = label;
      const input = document.createElement("input");
      input.type = "color";
      input.value = st[key];
      input.addEventListener("input", () => this._emitFromPop());
      row.appendChild(lab);
      row.appendChild(input);
      grid.appendChild(row);
      this.popFields.colors[key] = input;
    }
    colorGroup.appendChild(grid);
    pop.appendChild(colorGroup);

    const fontGroup = mkGroup("Tamanho da fonte");
    const fontRow = document.createElement("div");
    fontRow.className = "sp-fontrow";
    const range = document.createElement("input");
    range.type = "range";
    range.min = 8;
    range.max = 24;
    range.step = 1;
    range.value = st.fontSize;
    const val = document.createElement("span");
    val.className = "sp-fontval";
    val.textContent = `${st.fontSize}px`;
    range.addEventListener("input", () => {
      val.textContent = `${range.value}px`;
      this.applyStyle({ fontSize: Number(range.value) });
    });
    fontRow.appendChild(range);
    fontRow.appendChild(val);
    fontGroup.appendChild(fontRow);
    pop.appendChild(fontGroup);
    this.popFields.fontSize = range;
    this.popFields.fontSizeVal = val;

    const titleGroup = mkGroup("Tamanho do título");
    const titleRow = document.createElement("div");
    titleRow.className = "sp-fontrow";
    const titleRange = document.createElement("input");
    titleRange.type = "range";
    titleRange.min = 9;
    titleRange.max = 22;
    titleRange.step = 0.5;
    titleRange.value = st.titleSize;
    const titleVal = document.createElement("span");
    titleVal.className = "sp-fontval";
    titleVal.textContent = `${st.titleSize}px`;
    titleRange.addEventListener("input", () => {
      titleVal.textContent = `${titleRange.value}px`;
      this.applyStyle({ titleSize: Number(titleRange.value) });
    });
    titleRow.appendChild(titleRange);
    titleRow.appendChild(titleVal);
    titleGroup.appendChild(titleRow);
    pop.appendChild(titleGroup);
    this.popFields.titleSize = titleRange;
    this.popFields.titleSizeVal = titleVal;

    const actions = document.createElement("div");
    actions.className = "sp-actions";
    const reset = document.createElement("button");
    reset.className = "sp-reset";
    reset.textContent = "Restaurar padrão";
    reset.addEventListener("click", () => this.applyStyle({ ...DEFAULT_STYLE }));
    actions.appendChild(reset);
    pop.appendChild(actions);
  }

  _emitFromPop() {
    const style = {};
    for (const [key, input] of Object.entries(this.popFields.colors)) {
      style[key] = input.value;
    }
    this.applyStyle(style);
  }

  _syncPopInputs() {
    if (!this.popFields) return;
    const st = this.style;
    for (const [key, input] of Object.entries(this.popFields.colors)) {
      input.value = st[key];
    }
    if (this.popFields.fontSize) this.popFields.fontSize.value = st.fontSize;
    if (this.popFields.fontSizeVal) this.popFields.fontSizeVal.textContent = `${st.fontSize}px`;
    if (this.popFields.titleSize) this.popFields.titleSize.value = st.titleSize;
    if (this.popFields.titleSizeVal) this.popFields.titleSizeVal.textContent = `${st.titleSize}px`;
  }

  updateTitle(title) {
    this.titleText = title;
    this.titleEl.textContent = title;
  }

  setPosition(x, y) {
    this.worldPos.x = x;
    this.worldPos.y = y;
    this.el.style.left = `${x}px`;
    this.el.style.top = `${y}px`;
    if (this.app.connections) this.app.connections.redrawAll();
  }

  setSize(w, h) {
    this.worldSize.w = w;
    this.worldSize.h = h;
    this.el.style.width = `${w}px`;
    this.el.style.height = `${h}px`;
    this.fit();
    if (this.app.connections) this.app.connections.redrawAll();
  }

  dispose() {
    this.term.dispose();
    this.el.remove();
    if (this.app.connections) this.app.connections.redrawAll();
  }

  get dims() {
    return { cols: this.term.cols, rows: this.term.rows };
  }

  /* ---- interações ---- */
  _bindEvents() {
    this.el.addEventListener("pointerdown", (e) => {
      this._dragged = false;
      e.stopPropagation();
      this.app.setActive(this.id);
    });

    this.el.addEventListener("click", (e) => {
      if (this._dragged) return;
      if (this.app.focusTerminal) this.app.focusTerminal(this);
    });

    const titlebar = this.el.querySelector(".titlebar");
    titlebar.addEventListener("pointerdown", (e) => this._onDragStart(e));

    const handle = this.el.querySelector(".resize-handle");
    handle.addEventListener("pointerdown", (e) => this._onResizeStart(e));

    const portRight = this.el.querySelector(".conn-port.port-right");
    if (portRight) {
      portRight.addEventListener("pointerdown", (e) => {
        e.stopPropagation();
        if (this.app.connections) {
          this.app.connections.startDrag(this.id, e.clientX, e.clientY);
        }
      });
    }

    this.termHost.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.app.focusTerminal) this.app.focusTerminal(this);
    });

    this.el.addEventListener("mouseenter", () => (this._hovered = true));
    this.el.addEventListener("mouseleave", () => (this._hovered = false));
    this.el.addEventListener("wheel", (e) => {
      if (this.isActive() || this._hovered) {
        e.stopPropagation();
      }
    }, { passive: false });

    // Right-click paste support
    this.termHost.addEventListener("contextmenu", async (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        const text = await navigator.clipboard.readText();
        if (text) {
          this.app.setActive(this.id);
          this.app.sendInput(this.id, text);
        }
      } catch (err) {
        console.error("Erro ao colar do clipboard:", err);
      }
    });

    // Native Drag & Drop for Files and Folders (Windows & macOS)
    let dragCounter = 0;
    this.el.addEventListener("dragenter", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      this.el.classList.add("drag-over");
    });

    this.el.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
      this.el.classList.add("drag-over");
    });

    this.el.addEventListener("dragleave", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        this.el.classList.remove("drag-over");
      }
    });

    this.el.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      this.el.classList.remove("drag-over");

      let textToInsert = "";
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files);
        const paths = files.map((f) => {
          const p = f.path || f.name;
          // Wrap paths containing spaces in double quotes
          return p.includes(" ") ? `"${p}"` : p;
        });
        textToInsert = paths.join(" ");
      } else {
        textToInsert = e.dataTransfer.getData("text");
      }

      if (textToInsert) {
        this.app.setActive(this.id);
        this.app.sendInput(this.id, textToInsert);
      }
    });
  }

  _onDragStart(e) {
    if (e.target.closest("button") || e.target.closest("input")) return;
    if (e.button !== 0) return;
    e.stopPropagation();
    this.closeSettings();
    const startWorld = { ...this.worldPos };
    const startSx = e.clientX;
    const startSy = e.clientY;
    const canvas = this.app.canvas;
    this.el.classList.add("dragging");
    const pointerId = e.pointerId;

    const onMove = (ev) => {
      if (ev.pointerId !== pointerId) return;
      this._dragged = true;
      const d = canvas.screenToWorldDelta(ev.clientX - startSx, ev.clientY - startSy);
      this.setPosition(startWorld.x + d.x, startWorld.y + d.y);
    };

    const onUp = (ev) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      this.el.classList.remove("dragging");
      this.app.sendMove(this.id, this.worldPos.x, this.worldPos.y);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  _onResizeStart(e) {
    if (e.button !== 0) return;
    e.stopPropagation();
    this.closeSettings();
    const startSize = { ...this.worldSize };
    const startSx = e.clientX;
    const startSy = e.clientY;
    const canvas = this.app.canvas;
    const pointerId = e.pointerId;

    const onMove = (ev) => {
      if (ev.pointerId !== pointerId) return;
      this._dragged = true;
      const d = canvas.screenToWorldDelta(ev.clientX - startSx, ev.clientY - startSy);
      this.setSize(
        Math.max(MIN_W, startSize.w + d.x),
        Math.max(MIN_H, startSize.h + d.y)
      );
    };

    const onUp = (ev) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      const { cols, rows } = this.dims;
      this.app.sendResize(this.id, cols, rows, this.worldSize.w, this.worldSize.h);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  startRename() {
    const input = document.createElement("input");
    input.className = "title editing";
    input.type = "text";
    input.value = this.titleText;
    input.spellcheck = false;
    this.titleEl.replaceWith(input);
    input.focus();
    input.select();

    const commit = () => {
      const val = input.value.trim();
      if (val && val !== this.titleText) {
        this.app.sendRename(this.id, val);
      } else {
        this.titleEl.textContent = this.titleText;
      }
      if (input.parentElement) input.replaceWith(this.titleEl);
    };

    input.addEventListener("keydown", (e) => {
      e.stopPropagation();
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      } else if (e.key === "Escape") {
        this.titleEl.textContent = this.titleText;
        if (input.parentElement) input.replaceWith(this.titleEl);
      }
    });
    input.addEventListener("blur", commit);
  }
}
