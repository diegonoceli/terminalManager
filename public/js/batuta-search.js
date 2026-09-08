// public/js/batuta-search.js
// Batuta Search: Paleta de Comandos Global, Busca Fuzzy e Navegação Espacial (US10 / FR-046 a FR-050)

class BatutaSearch {
  constructor(app) {
    this.app = app;
    this.isOpen = false;
    this.results = [];
    this.selectedIndex = 0;
    this.activeWorkflow = null; // null | 'pedir' | 'verificar'

    this._createDOM();
    this._bindEvents();
  }

  _createDOM() {
    let overlay = document.getElementById("batuta-search-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "batuta-search-overlay";
      overlay.className = "batuta-overlay hidden";
      overlay.innerHTML = `
        <div class="batuta-card" id="batuta-card">
          <div class="batuta-header">
            <span class="batuta-search-icon">🔍</span>
            <input type="text" id="batuta-input" class="batuta-input" placeholder="Buscar nós, notas, andares ou ações..." autocomplete="off" spellcheck="false" />
            <div class="batuta-key-badge">ESC</div>
          </div>

          <!-- Lista de Resultados Fuzzy / Ações Rápidas -->
          <div class="batuta-results-container" id="batuta-results"></div>

          <!-- Fluxo Pedir... (T053) -->
          <div class="batuta-workflow-panel hidden" id="batuta-pedir-panel">
            <div class="workflow-header">
              <span class="workflow-target-badge" id="pedir-target-badge">Agente</span>
              <button class="icon-btn btn-back-to-search" title="Voltar à busca">‹</button>
            </div>
            <div class="workflow-body">
              <textarea id="pedir-prompt-input" class="input" placeholder="Digite sua solicitação... (Ctrl+Enter para enviar)" rows="3" style="width:100%;font-family:inherit;font-size:13px;resize:vertical;"></textarea>
              <div class="workflow-preview-container">
                <div class="workflow-preview-label">Prévia ao vivo da resposta:</div>
                <div id="pedir-preview-output" class="workflow-preview-output">Aguardando prompt...</div>
              </div>
            </div>
            <div class="workflow-footer" style="display:flex;justify-content:flex-end;gap:8px;margin-top:8px;">
              <button class="btn btn-back-to-search">Cancelar</button>
              <button id="btn-pedir-send" class="btn primary">Pedir (Ctrl+Enter)</button>
            </div>
          </div>

          <!-- Fluxo Verificar... (T053) -->
          <div class="batuta-workflow-panel hidden" id="batuta-verificar-panel">
            <div class="workflow-header">
              <span class="workflow-target-badge" id="verificar-target-badge">Terminal (Stream Somente-Leitura)</span>
              <button class="icon-btn btn-back-to-search" title="Voltar à busca">‹</button>
            </div>
            <div class="workflow-body">
              <div id="verificar-stream-output" class="workflow-stream-output">
                Conectando ao stream do terminal...
              </div>
            </div>
            <div class="workflow-footer" style="display:flex;justify-content:flex-end;margin-top:8px;">
              <button class="btn btn-back-to-search">Fechar</button>
            </div>
          </div>

          <div class="batuta-footer">
            <span><strong>↑↓</strong> para navegar</span>
            <span><strong>Enter</strong> para selecionar</span>
            <span><strong>Esc</strong> para sair</span>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    this.overlay = overlay;
    this.input = overlay.querySelector("#batuta-input");
    this.resultsList = overlay.querySelector("#batuta-results");
    this.pedirPanel = overlay.querySelector("#batuta-pedir-panel");
    this.verificarPanel = overlay.querySelector("#batuta-verificar-panel");
  }

  _bindEvents() {
    // Atalho global Ctrl+P ou Cmd+P (ignora se estiver no search do editor do filetree)
    window.addEventListener(
      "keydown",
      (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "p" && !e.shiftKey) {
          // Se já está no search do FileTree (tem classe .filetree-search-input em foco), deixa o nó tratar
          if (document.activeElement?.classList?.contains("filetree-search-input")) {
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          this.toggle();
        }
      },
      true
    );

    this.input.addEventListener("input", () => {
      this.search(this.input.value);
    });

    this.input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        this._moveHighlight(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        this._moveHighlight(-1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        this.executeSelected();
      } else if (e.key === "Escape") {
        this.close();
      }
    });

    this.overlay.addEventListener("pointerdown", (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Voltar da view de workflow
    this.overlay.querySelectorAll(".btn-back-to-search").forEach((b) => {
      b.addEventListener("click", () => this._showSearchList());
    });

    // Enviar no fluxo "Pedir..."
    this.overlay.querySelector("#btn-pedir-send")?.addEventListener("click", () => {
      this._submitPedir();
    });

    this.overlay.querySelector("#pedir-prompt-input")?.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        this._submitPedir();
      }
    });
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    this.isOpen = true;
    this.activeWorkflow = null;
    this.overlay.classList.remove("hidden");
    this.input.value = "";
    this._showSearchList();
    this.search("");
    this.input.focus();
  }

  close() {
    this.isOpen = false;
    this.overlay.classList.add("hidden");
    if (this._verificarTimer) clearInterval(this._verificarTimer);
  }

  _showSearchList() {
    this.activeWorkflow = null;
    this.resultsList.classList.remove("hidden");
    this.pedirPanel.classList.add("hidden");
    this.verificarPanel.classList.add("hidden");
    if (this._verificarTimer) clearInterval(this._verificarTimer);
    this.input.focus();
  }

  /* ---- Motor de Busca Fuzzy Unificado (T050 / FR-046) ---- */
  _normalize(str) {
    return (str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  _fuzzyMatch(pattern, text) {
    if (!pattern) return { match: true, score: 1, highlighted: text };

    const normPattern = this._normalize(pattern);
    const normText = this._normalize(text);

    let patternIdx = 0;
    let score = 0;
    const matchIndices = [];

    for (let i = 0; i < normText.length; i++) {
      if (normText[i] === normPattern[patternIdx]) {
        matchIndices.push(i);
        // Bônus se for início de palavra
        if (i === 0 || normText[i - 1] === " " || normText[i - 1] === "/" || normText[i - 1] === "-") {
          score += 15;
        } else {
          score += 5;
        }
        patternIdx++;
        if (patternIdx === normPattern.length) break;
      }
    }

    if (patternIdx < normPattern.length) {
      return { match: false, score: 0, highlighted: text };
    }

    // Destaque dos caracteres combinados em negrito
    let highlighted = "";
    let lastIdx = 0;
    for (const idx of matchIndices) {
      highlighted += text.slice(lastIdx, idx) + `<b>${text[idx]}</b>`;
      lastIdx = idx + 1;
    }
    highlighted += text.slice(lastIdx);

    return { match: true, score, highlighted };
  }

  search(query = "") {
    const rawItems = this._buildCatalog();
    const matches = [];

    for (const item of rawItems) {
      const titleRes = this._fuzzyMatch(query, item.title);
      const subRes = item.subtitle ? this._fuzzyMatch(query, item.subtitle) : { match: false, score: 0 };

      if (!query || titleRes.match || subRes.match) {
        matches.push({
          ...item,
          score: Math.max(titleRes.score, subRes.score),
          highlightedTitle: titleRes.match ? titleRes.highlighted : item.title,
          highlightedSubtitle: subRes.match ? subRes.highlighted : item.subtitle,
        });
      }
    }

    // Ordenar por score decrescente
    matches.sort((a, b) => b.score - a.score);

    this.results = matches;
    this.selectedIndex = 0;
    this._renderResults();
  }

  _buildCatalog() {
    const items = [];
    const activeNode = this.app.widgets.get(this.app.activeId);

    // 1. Ações contextuais baseadas no nó selecionado (T052)
    if (activeNode) {
      items.push({
        id: "ctx_pedir",
        type: "action",
        icon: "💬",
        category: "Ação Contextual",
        title: `Pedir ao Agente (${activeNode.title || activeNode.id})...`,
        subtitle: "Envio de prompt interativo com resposta ao vivo",
        action: () => this.openPedirWorkflow(activeNode.id),
      });

      items.push({
        id: "ctx_verificar",
        type: "action",
        icon: "👁️",
        category: "Ação Contextual",
        title: `Verificar Saída (${activeNode.title || activeNode.id})...`,
        subtitle: "Monitoramento somente-leitura do terminal",
        action: () => this.openVerificarWorkflow(activeNode.id),
      });

      items.push({
        id: "ctx_elevate",
        type: "action",
        icon: "⤢",
        category: "Ação Contextual",
        title: `Elevar / Tela Cheia (${activeNode.title || activeNode.id})`,
        subtitle: "Eleva o nó selecionado acima do canvas",
        action: () => {
          this.close();
          this.app.motion?.toggleElevateNode(activeNode.id);
        },
      });
    }

    // 2. Ações Globais (T052)
    items.push({
      id: "act_new_term",
      type: "action",
      icon: "⚡",
      category: "Ação Global",
      title: "Novo Terminal",
      subtitle: "Criar sessão PTY em branco (N)",
      action: () => {
        this.close();
        document.getElementById("btn-new")?.click();
      },
    });

    items.push({
      id: "act_arrange_grid",
      type: "action",
      icon: "▦",
      category: "Ação Global",
      title: "Organizar Nós em Grade",
      subtitle: "Alinhar nós harmonicamente no canvas (Ctrl+Shift+T)",
      action: () => {
        this.close();
        if (this.app.motion?.autoArrangeGrid) {
          this.app.motion.autoArrangeGrid([...this.app.widgets.keys()]);
        }
      },
    });

    items.push({
      id: "act_create_floor",
      type: "action",
      icon: "🏢",
      category: "Ação Global",
      title: "Criar Novo Andar (Branch Isolada)",
      subtitle: "Ambiente com clonagem instantânea APFS",
      action: () => {
        this.close();
        this.app.floorManager?.openNewFloorModal();
      },
    });

    items.push({
      id: "act_floor_landing",
      type: "action",
      icon: "🛬",
      category: "Ação Global",
      title: "Aterrissar Andar Atual (Merge)",
      subtitle: "Mesclar branch do andar atual no térreo",
      action: () => {
        this.close();
        if (this.app.floorManager) {
          this.app.floorManager.openLandingModal(this.app.floorManager.activeFloorId);
        }
      },
    });

    // 3. Nós e Terminais no Canvas Ativo
    for (const [id, w] of this.app.widgets.entries()) {
      let icon = "💻";
      let cat = "Terminal";
      if (w.type === "note") {
        icon = "📝";
        cat = "Nota";
      } else if (w.type === "web-portal") {
        icon = "🌐";
        cat = "Portal Web";
      } else if (w.type === "device-portal") {
        icon = "📱";
        cat = "Dispositivo Móvel";
      } else if (w.type === "filetree") {
        icon = "📁";
        cat = "Arquivos";
      }

      items.push({
        id,
        type: "node",
        icon,
        category: cat,
        title: w.title || id,
        subtitle: `${cat} em (${w.worldPos.x}, ${w.worldPos.y})`,
        action: () => this.jumpToNode(id),
      });

      // Se for nota, indexa trechos do conteúdo
      if (w.type === "note" && w.content) {
        items.push({
          id: `note_content_${id}`,
          type: "note_text",
          icon: "📄",
          category: "Texto de Nota",
          title: `Nota: ${w.title || id}`,
          subtitle: w.content.slice(0, 80).replace(/\n/g, " "),
          action: () => this.jumpToNode(id),
        });
      }
    }

    // 4. Andares (Floors)
    if (this.app.floors) {
      for (const f of this.app.floors) {
        items.push({
          id: `floor_${f.id}`,
          type: "floor",
          icon: f.isGroundFloor ? "🏢" : "🌿",
          category: "Andar (Floor)",
          title: `${f.name} (${f.branch || "main"})`,
          subtitle: f.isGroundFloor ? "Andar Térreo Principal" : `Ambiente isolado ${f.branch}`,
          action: () => {
            this.close();
            this.app.floorManager?.switchToFloor(f.id);
          },
        });
      }
    }

    // 5. Workspaces
    if (this.app.workspaces) {
      for (const ws of this.app.workspaces) {
        items.push({
          id: `ws_${ws.id}`,
          type: "workspace",
          icon: "📂",
          category: "Workspace",
          title: ws.name,
          subtitle: ws.workingDir || "Projeto local",
          action: () => {
            this.close();
            this.app.send({ type: "workspace_switch", workspaceId: ws.id });
          },
        });
      }
    }

    return items;
  }

  _renderResults() {
    if (this.results.length === 0) {
      this.resultsList.innerHTML = `
        <div class="batuta-empty-state">
          Nenhum resultado encontrado para "<strong>${this.input.value}</strong>"
        </div>
      `;
      return;
    }

    this.resultsList.innerHTML = this.results
      .map(
        (item, idx) => `
        <div class="batuta-result-item ${idx === this.selectedIndex ? "selected" : ""}" data-index="${idx}">
          <span class="batuta-item-icon">${item.icon}</span>
          <div class="batuta-item-content">
            <div class="batuta-item-title">${item.highlightedTitle || item.title}</div>
            <div class="batuta-item-subtitle">${item.highlightedSubtitle || item.subtitle || ""}</div>
          </div>
          <span class="batuta-item-cat">${item.category}</span>
        </div>
      `
      )
      .join("");

    this.resultsList.querySelectorAll(".batuta-result-item").forEach((el) => {
      el.addEventListener("click", () => {
        const idx = Number(el.dataset.index);
        this.selectedIndex = idx;
        this.executeSelected();
      });
    });
  }

  _moveHighlight(delta) {
    if (!this.results.length) return;
    const items = this.resultsList.querySelectorAll(".batuta-result-item");
    items[this.selectedIndex]?.classList.remove("selected");
    this.selectedIndex = (this.selectedIndex + delta + this.results.length) % this.results.length;
    items[this.selectedIndex]?.classList.add("selected");
    items[this.selectedIndex]?.scrollIntoView({ block: "nearest" });
  }

  executeSelected() {
    const item = this.results[this.selectedIndex];
    if (!item) return;
    if (typeof item.action === "function") {
      item.action();
    }
  }

  /* ---- Salto e Navegação Espacial Suave (T051 / FR-047) ---- */
  jumpToNode(nodeId) {
    this.close();
    const node = this.app.widgets.get(nodeId);
    if (!node) return;

    // Se o nó estiver em outro andar, realiza a troca
    if (node.floorId && node.floorId !== this.app.floorManager?.activeFloorId) {
      this.app.floorManager?.switchToFloor(node.floorId);
    }

    // Translação suave de câmera centralizando o nó
    const cx = node.worldPos.x + node.worldSize.w / 2;
    const cy = node.worldPos.y + node.worldSize.h / 2;

    if (this.app.canvas?.panTo) {
      this.app.canvas.panTo(cx, cy, 1.0, 450);
    }

    setTimeout(() => {
      this.app.setActive(nodeId);
      if (typeof node.focus === "function") {
        node.focus();
      }
    }, 460);
  }

  /* ---- Fluxo Pedir... (T053 / FR-049) ---- */
  openPedirWorkflow(terminalId) {
    const node = this.app.widgets.get(terminalId);
    if (!node) return;

    this.activeWorkflow = "pedir";
    this.activeWorkflowTerminalId = terminalId;

    this.resultsList.classList.add("hidden");
    this.pedirPanel.classList.remove("hidden");

    this.overlay.querySelector("#pedir-target-badge").textContent = `Agente: ${node.title || terminalId}`;
    const promptInput = this.overlay.querySelector("#pedir-prompt-input");
    promptInput.value = "";
    promptInput.focus();

    const previewOutput = this.overlay.querySelector("#pedir-preview-output");
    previewOutput.textContent = "Digite o prompt e pressione Ctrl+Enter para despachar...";
  }

  _submitPedir() {
    const promptInput = this.overlay.querySelector("#pedir-prompt-input");
    const prompt = promptInput.value.trim();
    if (!prompt) return;

    const term = this.app.widgets.get(this.activeWorkflowTerminalId);
    if (!term) return;

    const previewOutput = this.overlay.querySelector("#pedir-preview-output");
    previewOutput.textContent = `[Enviado] ${prompt}\n\nAguardando stream de resposta do agente...\n`;

    // Envia o prompt para o terminal do agente
    if (term.sendInput) {
      term.sendInput(prompt + "\r\n");
    }

    // Stream ao vivo da saída capturada
    let lastLen = 0;
    const streamPoller = setInterval(() => {
      if (!this.isOpen || this.activeWorkflow !== "pedir") {
        clearInterval(streamPoller);
        return;
      }
      if (term.terminal && term.terminal.buffer) {
        const activeBuffer = term.terminal.buffer.active;
        let text = "";
        for (let i = Math.max(0, activeBuffer.cursorY - 8); i <= activeBuffer.cursorY; i++) {
          const line = activeBuffer.getLine(i);
          if (line) text += line.translateToString(true) + "\n";
        }
        if (text.trim() && text.length !== lastLen) {
          lastLen = text.length;
          previewOutput.textContent = text;
          previewOutput.scrollTop = previewOutput.scrollHeight;
        }
      }
    }, 300);
  }

  /* ---- Fluxo Verificar... (T053 / FR-050) ---- */
  openVerificarWorkflow(terminalId) {
    const node = this.app.widgets.get(terminalId);
    if (!node) return;

    this.activeWorkflow = "verificar";
    this.resultsList.classList.add("hidden");
    this.verificarPanel.classList.remove("hidden");

    this.overlay.querySelector("#verificar-target-badge").textContent = `Stream: ${node.title || terminalId} (Somente-Leitura)`;
    const streamOutput = this.overlay.querySelector("#verificar-stream-output");

    const updateStream = () => {
      if (!this.isOpen || this.activeWorkflow !== "verificar") return;
      if (node.terminal && node.terminal.buffer) {
        const activeBuffer = node.terminal.buffer.active;
        let text = "";
        const startLine = Math.max(0, activeBuffer.length - 40);
        for (let i = startLine; i < activeBuffer.length; i++) {
          const line = activeBuffer.getLine(i);
          if (line) text += line.translateToString(true) + "\n";
        }
        streamOutput.textContent = text || "(Terminal sem saída recente)";
        streamOutput.scrollTop = streamOutput.scrollHeight;
      }
    };

    updateStream();
    this._verificarTimer = setInterval(updateStream, 250);
  }
}

window.BatutaSearch = BatutaSearch;
