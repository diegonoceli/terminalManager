// public/js/prompt-composer.js
// Compositor de Prompts Rico Flutuante, Menções (@), Rascunhos Persistentes e Passthrough (US9 / FR-041 a FR-045)

class PromptComposer {
  constructor(app) {
    this.app = app;
    this.visible = false;
    this.activeTerminalId = null;
    this.chips = []; // { type: 'image'|'file'|'node'|'action', label, value, previewUrl }
    this.mentionIndex = 0;
    this.mentionQuery = null; // null se menu fechado, string se aberto
    this._saveTimeout = null;

    this._createDOM();
    this._bindEvents();
  }

  _createDOM() {
    let el = document.getElementById("prompt-composer");
    if (!el) {
      el = document.createElement("div");
      el.id = "prompt-composer";
      el.className = "prompt-composer hidden";
      el.innerHTML = `
        <div class="composer-mention-menu hidden" id="composer-mention-menu"></div>
        <div class="composer-chips-container" id="composer-chips"></div>
        <div class="composer-input-row">
          <textarea id="composer-textarea" class="composer-textarea" rows="1" placeholder="Prompt contextual... (@ para mencionar nós, notas ou arquivos)" spellcheck="false"></textarea>
          <div class="composer-actions">
            <button class="composer-btn btn-composer-attach icon-btn" title="Anexar imagem ou arquivo">📎</button>
            <button class="composer-btn btn-composer-mention icon-btn" title="Mencionar (@)">@</button>
            <button class="composer-btn btn-composer-send primary" title="Enviar para o terminal (Enter / ⌘Enter)">
              <span>Enviar</span> ⏎
            </button>
          </div>
        </div>
        <input type="file" id="composer-file-input" style="display:none;" accept="image/*,.txt,.md,.json,.js,.ts" multiple />
      `;
      document.body.appendChild(el);
    }
    this.el = el;
    this.chipsContainer = el.querySelector("#composer-chips");
    this.textarea = el.querySelector("#composer-textarea");
    this.mentionMenu = el.querySelector("#composer-mention-menu");
    this.fileInput = el.querySelector("#composer-file-input");
    this.btnSend = el.querySelector(".btn-composer-send");
  }

  _bindEvents() {
    // Atalho global Ctrl+Shift+P / Cmd+Shift+P para toggle
    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyP") {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
      }
    });

    // Auto-resize do textarea e detector de @
    this.textarea.addEventListener("input", (e) => {
      this._autoResize();
      this._checkMentionTrigger();
      this._saveDraftDebounced();
    });

    // Passthrough transparente de teclado (T049 / FR-045) e atalhos de envio
    this.textarea.addEventListener("keydown", (e) => {
      // Se menu de menções estiver aberto, controlar navegação do menu
      if (this.mentionQuery !== null) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          this._moveMentionHighlight(1);
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          this._moveMentionHighlight(-1);
          return;
        }
        if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          this._selectActiveMention();
          return;
        }
        if (e.key === "Escape") {
          e.preventDefault();
          this._closeMentionMenu();
          return;
        }
      }

      // Passthrough transparente se campo de texto estiver vazio e sem chips
      const isEmpty = !this.textarea.value.trim() && this.chips.length === 0;
      if (isEmpty) {
        if (["ArrowUp", "ArrowDown", "Enter", "Tab"].includes(e.key)) {
          e.preventDefault();
          const term = this._getTargetTerminal();
          if (term && term.sendInput) {
            const keyMap = {
              ArrowUp: "\x1b[A",
              ArrowDown: "\x1b[B",
              Enter: "\r",
              Tab: "\t",
            };
            term.sendInput(keyMap[e.key]);
          }
          return;
        }
      }

      // Envio de prompt (Enter ou ⌘Enter / Ctrl+Enter)
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        this.sendPrompt();
        return;
      }

      if (e.key === "Escape") {
        this.hide();
      }
    });

    // Anexo de arquivo por clique
    this.el.querySelector(".btn-composer-attach")?.addEventListener("click", () => {
      this.fileInput.click();
    });

    this.fileInput.addEventListener("change", (e) => {
      const files = Array.from(e.target.files || []);
      for (const file of files) {
        this._addFileChip(file);
      }
      this.fileInput.value = "";
    });

    // Botão de menção @
    this.el.querySelector(".btn-composer-mention")?.addEventListener("click", () => {
      this.textarea.value += "@";
      this.textarea.focus();
      this._checkMentionTrigger();
    });

    // Botão de envio
    this.btnSend?.addEventListener("click", () => this.sendPrompt());

    // Suporte a colar imagem (⌘V) diretamente no compositor
    this.textarea.addEventListener("paste", (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            this._addFileChip(file);
          }
        }
      }
    });

    // Fechar menu de menção ao clicar fora
    document.addEventListener("pointerdown", (e) => {
      if (!this.el.contains(e.target)) {
        this._closeMentionMenu();
      }
    });
  }

  _autoResize() {
    this.textarea.style.height = "auto";
    const newHeight = Math.min(160, Math.max(34, this.textarea.scrollHeight));
    this.textarea.style.height = `${newHeight}px`;
  }

  toggle() {
    if (this.visible) this.hide();
    else this.show();
  }

  show(terminalId = null) {
    const targetId = terminalId || this.app.activeId || this._findFirstTerminalId();
    if (!targetId) {
      if (typeof window.toast === "function") {
        window.toast("Nenhum terminal disponível para ancorar o compositor de prompts.");
      }
      return;
    }
    this.activeTerminalId = targetId;
    this.visible = true;
    this.el.classList.remove("hidden");
    this.anchorToTerminal(targetId);
    this.loadDraft(targetId);
    this.textarea.focus();
    this._autoResize();
  }

  hide() {
    this._saveDraftNow();
    this.visible = false;
    this.el.classList.add("hidden");
    this._closeMentionMenu();
  }

  anchorToTerminal(terminalId) {
    const w = this.app.widgets.get(terminalId);
    if (!w || !w.el) return;

    // Reposiciona o compositor logo abaixo do rodapé do terminal ou sobre ele
    const rect = w.el.getBoundingClientRect();
    const top = Math.min(window.innerHeight - 120, rect.bottom - 48);
    const left = Math.max(20, Math.min(window.innerWidth - 620, rect.left + (rect.width - 580) / 2));

    this.el.style.top = `${top}px`;
    this.el.style.left = `${left}px`;
  }

  _findFirstTerminalId() {
    for (const [id, w] of this.app.widgets.entries()) {
      if (w.type === "terminal" || !w.type) return id;
    }
    return null;
  }

  _getTargetTerminal() {
    return this.app.widgets.get(this.activeTerminalId) || null;
  }

  /* ---- Menções com @ (T046 / FR-042) ---- */
  _checkMentionTrigger() {
    const val = this.textarea.value;
    const selEnd = this.textarea.selectionEnd;
    const textBefore = val.slice(0, selEnd);
    const lastAt = textBefore.lastIndexOf("@");

    if (lastAt !== -1 && !/\s/.test(textBefore.slice(lastAt + 1))) {
      const query = textBefore.slice(lastAt + 1).toLowerCase();
      this._openMentionMenu(query);
    } else {
      this._closeMentionMenu();
    }
  }

  _openMentionMenu(query) {
    this.mentionQuery = query;
    const items = this._gatherMentionItems(query);
    if (items.length === 0) {
      this._closeMentionMenu();
      return;
    }

    this.mentionIndex = 0;
    this.mentionMenu.innerHTML = items
      .map(
        (it, idx) => `
        <div class="composer-mention-item ${idx === 0 ? "active" : ""}" data-index="${idx}">
          <span class="mention-cat-icon">${it.icon}</span>
          <span class="mention-label">${it.label}</span>
          <span class="mention-subtext">${it.subtext || ""}</span>
        </div>
      `
      )
      .join("");

    this.mentionMenu.classList.remove("hidden");
    this._currentMentionItems = items;

    // Eventos de clique nas opções
    this.mentionMenu.querySelectorAll(".composer-mention-item").forEach((el) => {
      el.addEventListener("click", () => {
        const idx = Number(el.dataset.index);
        this.mentionIndex = idx;
        this._selectActiveMention();
      });
    });
  }

  _closeMentionMenu() {
    this.mentionQuery = null;
    this.mentionMenu.classList.add("hidden");
    this.mentionMenu.innerHTML = "";
    this._currentMentionItems = [];
  }

  _moveMentionHighlight(delta) {
    if (!this._currentMentionItems || !this._currentMentionItems.length) return;
    const items = this.mentionMenu.querySelectorAll(".composer-mention-item");
    items[this.mentionIndex]?.classList.remove("active");
    this.mentionIndex = (this.mentionIndex + delta + items.length) % items.length;
    items[this.mentionIndex]?.classList.add("active");
    items[this.mentionIndex]?.scrollIntoView({ block: "nearest" });
  }

  _selectActiveMention() {
    if (!this._currentMentionItems || !this._currentMentionItems[this.mentionIndex]) return;
    const item = this._currentMentionItems[this.mentionIndex];

    // Remove o "@query" do textarea
    const val = this.textarea.value;
    const selEnd = this.textarea.selectionEnd;
    const textBefore = val.slice(0, selEnd);
    const lastAt = textBefore.lastIndexOf("@");
    const textAfter = val.slice(selEnd);

    this.textarea.value = textBefore.slice(0, lastAt) + textAfter;

    // Adiciona o chip estruturado
    this._addChip({
      type: item.type,
      label: item.label,
      value: item.value,
      icon: item.icon,
    });

    this._closeMentionMenu();
    this.textarea.focus();
    this._saveDraftDebounced();
  }

  _gatherMentionItems(query) {
    const items = [];

    // 1. Maestro & Ações do Orquestrador
    items.push({
      type: "action",
      label: "@Maestro",
      value: "maestro",
      icon: "🪄",
      subtext: "Orquestrador mestre",
    });

    // 2. Nós / Terminais / Agentes conectados
    for (const [id, w] of this.app.widgets.entries()) {
      if (id === this.activeTerminalId) continue;
      const title = w.title || id;
      if (!query || title.toLowerCase().includes(query)) {
        let icon = "💻";
        if (w.type === "note") icon = "📝";
        else if (w.type === "web-portal") icon = "🌐";
        else if (w.type === "device-portal") icon = "📱";
        else if (w.type === "filetree") icon = "📁";
        items.push({
          type: w.type || "terminal",
          label: `@${title}`,
          value: id,
          icon,
          subtext: w.type || "terminal",
        });
      }
    }

    // 3. Notas do projeto
    if (this.app.noteStore?.notes) {
      for (const n of this.app.noteStore.notes.values()) {
        const title = n.title || n.id;
        if (!query || title.toLowerCase().includes(query)) {
          items.push({
            type: "note",
            label: `@nota:${title}`,
            value: n.id,
            icon: "📝",
            subtext: "Nota Markdown",
          });
        }
      }
    }

    return items.slice(0, 10);
  }

  /* ---- Chips e Mídia (T047 / FR-043) ---- */
  _addFileChip(file) {
    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();

    reader.onload = (e) => {
      const dataUrl = e.target.result;
      this._addChip({
        type: isImage ? "image" : "file",
        label: file.name,
        value: file.path || file.name,
        previewUrl: isImage ? dataUrl : null,
        dataUrl: isImage ? dataUrl : null,
        file,
      });
      this._saveDraftDebounced();
    };

    if (isImage) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  }

  _addChip(chip) {
    this.chips.push(chip);
    this._renderChips();
  }

  _removeChip(index) {
    this.chips.splice(index, 1);
    this._renderChips();
    this._saveDraftDebounced();
  }

  _renderChips() {
    this.chipsContainer.innerHTML = "";
    this.chips.forEach((c, idx) => {
      const chipEl = document.createElement("div");
      chipEl.className = `composer-chip chip-${c.type}`;
      let inner = "";
      if (c.type === "image" && c.previewUrl) {
        inner += `<img src="${c.previewUrl}" class="composer-chip-thumb" alt="${c.label}" />`;
      } else if (c.icon) {
        inner += `<span class="composer-chip-icon">${c.icon}</span>`;
      }
      inner += `<span class="composer-chip-text">${c.label}</span>`;
      inner += `<button class="composer-chip-del" title="Remover">✕</button>`;
      chipEl.innerHTML = inner;

      chipEl.querySelector(".composer-chip-del")?.addEventListener("click", () => {
        this._removeChip(idx);
      });

      this.chipsContainer.appendChild(chipEl);
    });
  }

  /* ---- Persistência de Rascunhos por Terminal (T048 / FR-044) ---- */
  _saveDraftDebounced() {
    if (this._saveTimeout) clearTimeout(this._saveTimeout);
    this._saveTimeout = setTimeout(() => this._saveDraftNow(), 400);
  }

  _saveDraftNow() {
    if (!this.activeTerminalId) return;
    const text = this.textarea.value;
    const pills = this.chips.map((c) => ({
      type: c.type,
      label: c.label,
      value: c.value,
      previewUrl: c.previewUrl,
    }));

    this.app.send({
      type: "prompt_draft_save",
      terminalId: this.activeTerminalId,
      text,
      pills,
    });
  }

  loadDraft(terminalId) {
    this.activeTerminalId = terminalId;
    const draft = this.app.drafts?.[terminalId];
    if (draft) {
      this.textarea.value = draft.text || "";
      this.chips = Array.isArray(draft.pills) ? [...draft.pills] : [];
    } else {
      this.textarea.value = "";
      this.chips = [];
    }
    this._renderChips();
    this._autoResize();
  }

  /* ---- Envio de Prompt Construto para o Terminal Ativo ---- */
  sendPrompt() {
    const term = this._getTargetTerminal();
    if (!term || !term.sendInput) {
      if (typeof window.toast === "function") window.toast("Terminal de destino inválido.");
      return;
    }

    const text = this.textarea.value.trim();
    const parts = [];

    // Resolver referências de chips (notas vivas, arquivos)
    for (const chip of this.chips) {
      if (chip.type === "note") {
        const noteNode = this.app.widgets.get(chip.value);
        if (noteNode && noteNode.content) {
          parts.push(`[Contexto da Nota: ${chip.label}]\n${noteNode.content}`);
        } else {
          parts.push(`maestri note read ${chip.value}`);
        }
      } else if (chip.type === "image") {
        parts.push(`[Imagem anexada: ${chip.label}]`);
      } else if (chip.type === "file") {
        parts.push(`[Arquivo: ${chip.value}]`);
      } else if (chip.type === "terminal") {
        parts.push(`@${chip.label}`);
      }
    }

    if (text) parts.push(text);

    const fullPrompt = parts.join("\n\n");
    if (!fullPrompt.trim()) return;

    // Enviar ao PTY
    term.sendInput(fullPrompt + "\r\n");

    // Limpa compositor e rascunho
    this.textarea.value = "";
    this.chips = [];
    this._renderChips();
    this._saveDraftNow();
    this.hide();
  }
}

window.PromptComposer = PromptComposer;
