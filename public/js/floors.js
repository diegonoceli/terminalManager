// public/js/floors.js
// Gestão completa de Andares (Floors), Clonagem APFS/Git, 3D Canvas, Hooks e Aterrissagem (US8 / FR-034 a FR-038)

class FloorManager {
  constructor(app) {
    this.app = app;
    this.floors = [];
    this.activeFloorId = null;
    this._initUI();
  }

  _initUI() {
    this.selectEl = document.getElementById("floor-select");
    this.btnNew = document.getElementById("btn-floor-new");
    this.btnRename = document.getElementById("btn-floor-rename");
    this.btnDel = document.getElementById("btn-floor-del");
    this.btnHooks = document.getElementById("btn-floor-hooks");
    this.btnLanding = document.getElementById("btn-floor-landing");

    if (this.selectEl) {
      this.selectEl.addEventListener("change", (e) => {
        const newFloorId = e.target.value;
        if (!newFloorId || newFloorId === this.activeFloorId) return;
        this.switchToFloor(newFloorId);
      });
    }

    if (this.btnNew) {
      this.btnNew.addEventListener("click", () => this.openNewFloorModal());
    }

    if (this.btnHooks) {
      this.btnHooks.addEventListener("click", () => this.openHooksModal(this.activeFloorId));
    }

    if (this.btnLanding) {
      this.btnLanding.addEventListener("click", () => this.openLandingModal(this.activeFloorId));
    }
  }

  syncFloors(floors = [], activeFloorId = null) {
    this.floors = Array.isArray(floors) ? floors : [];
    this.activeFloorId = activeFloorId || (this.floors[0] ? this.floors[0].id : null);

    if (this.selectEl) {
      this.selectEl.innerHTML = "";
      for (const f of this.floors) {
        const opt = document.createElement("option");
        opt.value = f.id;
        const icon = f.isGroundFloor ? "🏢 " : "🌿 ";
        opt.textContent = `${icon}${f.name || "Andar"} (${f.branch || "main"})`;
        if (f.id === this.activeFloorId) opt.selected = true;
        this.selectEl.appendChild(opt);
      }
    }

    // Aterrissagem só fica ativa para andares que não são o Térreo
    const currentFloor = this.getCurrentFloor();
    if (this.btnLanding) {
      const isBranch = currentFloor && !currentFloor.isGroundFloor;
      this.btnLanding.style.display = isBranch ? "inline-flex" : "none";
    }
    if (this.btnHooks) {
      this.btnHooks.style.display = currentFloor ? "inline-flex" : "none";
    }
  }

  getCurrentFloor() {
    return this.floors.find((f) => f.id === this.activeFloorId) || this.floors[0] || null;
  }

  switchToFloor(floorId) {
    const currentIndex = this.floors.findIndex((f) => f.id === this.activeFloorId);
    const nextIndex = this.floors.findIndex((f) => f.id === floorId);
    const direction = nextIndex >= currentIndex ? "up" : "down";

    if (this.app?.canvas?.transitionFloor3D) {
      this.app.canvas.transitionFloor3D(direction, () => {
        this.activeFloorId = floorId;
        this.app.send({ type: "floor_switch", floorId });
      });
    } else {
      this.activeFloorId = floorId;
      this.app.send({ type: "floor_switch", floorId });
    }
  }

  openNewFloorModal() {
    const root = document.getElementById("modal-root");
    if (!root) return;

    const defaultName = `Andar ${this.floors.length + 1}`;
    const defaultBranch = `feature/floor-${this.floors.length + 1}`;

    root.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-card floor-create-modal" style="width: 520px;">
          <div class="modal-header">
            <h3>🏢 Criar Novo Andar (Branch Isolada)</h3>
            <button class="icon-btn btn-modal-close">✕</button>
          </div>
          <div class="modal-body" style="display:flex;flex-direction:column;gap:14px;">
            <div class="form-group">
              <label style="font-weight:600;font-size:12px;color:var(--fg-muted);">Nome do Andar</label>
              <input type="text" id="floor-name-input" class="input" value="${defaultName}" placeholder="Ex: Refactor-Auth" style="width:100%;margin-top:4px;" />
            </div>

            <div class="form-group">
              <label style="font-weight:600;font-size:12px;color:var(--fg-muted);">Branch Git Isolada</label>
              <input type="text" id="floor-branch-input" class="input" value="${defaultBranch}" placeholder="Ex: feature/auth-v2" style="width:100%;margin-top:4px;" />
              <div style="font-size:11px;color:var(--fg-muted);margin-top:4px;">
                ⚡ macOS APFS: Clonagem Copy-on-Write instantânea em <code>.terminalmanager/floors/</code> sem duplicar armazenamento.
              </div>
            </div>

            <div class="form-group">
              <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;">
                <input type="checkbox" id="floor-clone-layout" checked />
                <span><strong>Clonar layout do Térreo</strong> (duplica posições e nós de terminais, notas e portais)</span>
              </label>
            </div>

            <details style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:8px 12px;">
              <summary style="font-weight:600;font-size:12px;cursor:pointer;color:var(--accent);">⚡ Configurar Hooks de Ciclo de Vida (Setup / Run / Teardown)</summary>
              <div style="display:flex;flex-direction:column;gap:10px;margin-top:10px;">
                <div>
                  <label style="font-size:11px;font-weight:600;color:var(--fg-muted);">Setup Hook (ex: npm install, docker up)</label>
                  <input type="text" id="hook-setup-input" class="input" placeholder="npm install" style="width:100%;font-family:monospace;font-size:12px;margin-top:2px;" />
                </div>
                <div>
                  <label style="font-size:11px;font-weight:600;color:var(--fg-muted);">Run Hook (ex: npm run dev, python server.py)</label>
                  <input type="text" id="hook-run-input" class="input" placeholder="npm run dev" style="width:100%;font-family:monospace;font-size:12px;margin-top:2px;" />
                </div>
                <div>
                  <label style="font-size:11px;font-weight:600;color:var(--fg-muted);">Teardown Hook (ex: docker down, killall)</label>
                  <input type="text" id="hook-teardown-input" class="input" placeholder="pkill -f node" style="width:100%;font-family:monospace;font-size:12px;margin-top:2px;" />
                </div>
              </div>
            </details>
          </div>
          <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
            <button class="btn btn-modal-cancel">Cancelar</button>
            <button class="btn primary btn-modal-confirm">Criar Andar</button>
          </div>
        </div>
      </div>
    `;

    root.classList.remove("hidden");

    const close = () => {
      root.classList.add("hidden");
      root.innerHTML = "";
    };

    root.querySelector(".btn-modal-close")?.addEventListener("click", close);
    root.querySelector(".btn-modal-cancel")?.addEventListener("click", close);

    root.querySelector(".btn-modal-confirm")?.addEventListener("click", () => {
      const name = root.querySelector("#floor-name-input").value.trim() || defaultName;
      const branch = root.querySelector("#floor-branch-input").value.trim() || defaultBranch;
      const cloneGroundLayout = !!root.querySelector("#floor-clone-layout").checked;
      const setupHook = root.querySelector("#hook-setup-input").value.trim();
      const runHook = root.querySelector("#hook-run-input").value.trim();
      const teardownHook = root.querySelector("#hook-teardown-input").value.trim();

      const hooks = {
        setup: setupHook ? [setupHook] : [],
        run: runHook ? [runHook] : [],
        teardown: teardownHook ? [teardownHook] : [],
      };

      this.app.send({
        type: "floor_create",
        name,
        branch,
        cloneGroundLayout,
        hooks,
        workspaceId: this.app.activeWorkspaceId,
      });

      close();
      if (typeof window.toast === "function") {
        window.toast(`Criando andar "${name}" com clonagem APFS...`);
      }
    });
  }

  openHooksModal(floorId) {
    const floor = this.floors.find((f) => f.id === floorId) || this.getCurrentFloor();
    if (!floor) return;

    const root = document.getElementById("modal-root");
    if (!root) return;

    const hooks = floor.hooks || { setup: [], run: [], teardown: [] };

    root.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-card floor-hooks-modal" style="width: 560px;">
          <div class="modal-header">
            <h3>⚡ Hooks de Ciclo de Vida: ${floor.name}</h3>
            <button class="icon-btn btn-modal-close">✕</button>
          </div>
          <div class="modal-body" style="display:flex;flex-direction:column;gap:14px;">
            <div style="font-size:12px;color:var(--fg-muted);">
              Variáveis injetadas: <code>$TERMINALMANAGER_FLOOR_NAME</code>, <code>$TERMINALMANAGER_FLOOR_ID</code>, <code>$TERMINALMANAGER_FLOOR_BRANCH</code>, <code>$TERMINALMANAGER_WORKSPACE_DIR</code>.
            </div>

            <!-- Setup Hook -->
            <div class="hook-box" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:10px;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong>1. Setup Hook</strong>
                <button class="btn btn-run-setup btn-small primary">▶ Executar Setup</button>
              </div>
              <input type="text" id="hook-field-setup" class="input" value="${(hooks.setup || []).join(" && ")}" placeholder="ex: npm install" style="width:100%;margin-top:6px;font-family:monospace;font-size:12px;" />
            </div>

            <!-- Run Hook -->
            <div class="hook-box" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:10px;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong>2. Run Hook</strong>
                <button class="btn btn-run-run btn-small primary">▶ Executar Run</button>
              </div>
              <input type="text" id="hook-field-run" class="input" value="${(hooks.run || []).join(" && ")}" placeholder="ex: npm run dev" style="width:100%;margin-top:6px;font-family:monospace;font-size:12px;" />
            </div>

            <!-- Teardown Hook -->
            <div class="hook-box" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:10px;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <strong>3. Teardown Hook</strong>
                <button class="btn btn-run-teardown btn-small primary">▶ Executar Teardown</button>
              </div>
              <input type="text" id="hook-field-teardown" class="input" value="${(hooks.teardown || []).join(" && ")}" placeholder="ex: pkill -f node" style="width:100%;margin-top:6px;font-family:monospace;font-size:12px;" />
            </div>

            <div class="hook-output-container" style="background:#09090b;border:1px solid #27272a;border-radius:6px;padding:10px;height:120px;overflow-y:auto;font-family:monospace;font-size:11px;color:#a1a1aa;white-space:pre-wrap;">
              [Log de saída dos hooks aparecerá aqui ao executar...]
            </div>
          </div>
          <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
            <button class="btn btn-modal-close">Fechar</button>
          </div>
        </div>
      </div>
    `;

    root.classList.remove("hidden");
    const close = () => {
      root.classList.add("hidden");
      root.innerHTML = "";
    };
    root.querySelectorAll(".btn-modal-close").forEach((b) => b.addEventListener("click", close));

    const outBox = root.querySelector(".hook-output-container");

    const run = (type) => {
      outBox.textContent = `⚡ Executando hook ${type.toUpperCase()}...\n`;
      this.app.send({
        type: "floor_hook_run",
        floorId: floor.id,
        hookType: type,
      });
    };

    root.querySelector(".btn-run-setup")?.addEventListener("click", () => run("setup"));
    root.querySelector(".btn-run-run")?.addEventListener("click", () => run("run"));
    root.querySelector(".btn-run-teardown")?.addEventListener("click", () => run("teardown"));

    this._activeHookOutputEl = outBox;
  }

  handleHookResult(msg) {
    if (this._activeHookOutputEl) {
      const status = msg.ok ? "✓ Sucesso" : "✕ Erro";
      this._activeHookOutputEl.textContent = `[${status}] Hook ${msg.hookType}:\n${msg.output || msg.error || "(sem saída)"}`;
    }
    if (typeof window.toast === "function") {
      window.toast(`Hook ${msg.hookType} ${msg.ok ? "concluído" : "falhou"}`);
    }
  }

  openLandingModal(floorId) {
    const floor = this.floors.find((f) => f.id === floorId) || this.getCurrentFloor();
    if (!floor) return;

    const root = document.getElementById("modal-root");
    if (!root) return;

    root.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal-card floor-landing-modal" style="width: 640px;">
          <div class="modal-header">
            <h3>🛬 Aterrissagem do Andar (Merge para Térreo)</h3>
            <button class="icon-btn btn-modal-close">✕</button>
          </div>
          <div class="modal-body" style="display:flex;flex-direction:column;gap:14px;">
            <div class="landing-branches" style="display:flex;align-items:center;gap:12px;background:rgba(255,255,255,0.03);padding:10px 14px;border-radius:6px;">
              <span class="branch-badge" style="background:#27272a;padding:4px 8px;border-radius:4px;font-family:monospace;font-size:12px;">🌿 ${floor.branch}</span>
              <span style="color:var(--accent);font-weight:bold;">→ aterrissar em →</span>
              <span class="branch-badge" style="background:#1e3a8a;padding:4px 8px;border-radius:4px;font-family:monospace;font-size:12px;">🏢 Térreo (main)</span>
            </div>

            <!-- Gráfico de Transferência de Commits (T044) -->
            <div>
              <div style="font-weight:600;font-size:12px;margin-bottom:6px;color:var(--fg-muted);">Commits do Andar:</div>
              <div id="landing-commits-list" style="background:#09090b;border:1px solid #27272a;border-radius:6px;padding:8px 12px;max-height:100px;overflow-y:auto;font-family:monospace;font-size:12px;color:#e4e4e7;">
                Carregando commits...
              </div>
            </div>

            <!-- Prévia de Diff -->
            <div>
              <div style="font-weight:600;font-size:12px;margin-bottom:6px;color:var(--fg-muted);">Prévia de Alterações (Diff):</div>
              <pre id="landing-diff-preview" style="background:#09090b;border:1px solid #27272a;border-radius:6px;padding:10px;max-height:160px;overflow-y:auto;font-family:monospace;font-size:11px;color:#a1a1aa;white-space:pre-wrap;">
                Carregando diff...
              </pre>
            </div>

            <!-- Status de conflito -->
            <div id="landing-conflict-status" style="padding:8px 12px;border-radius:6px;font-size:12px;display:flex;align-items:center;gap:8px;background:rgba(34,197,94,0.1);color:#4ade80;border:1px solid rgba(34,197,94,0.2);">
              ✓ Verificando árvore de merge...
            </div>
          </div>
          <div class="modal-footer" style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
            <button class="btn btn-modal-close">Cancelar</button>
            <button id="btn-confirm-merge" class="btn primary">Confirmar Aterrissagem (Merge)</button>
          </div>
        </div>
      </div>
    `;

    root.classList.remove("hidden");
    const close = () => {
      root.classList.add("hidden");
      root.innerHTML = "";
    };
    root.querySelector(".btn-modal-close")?.addEventListener("click", close);

    root.querySelector("#btn-confirm-merge")?.addEventListener("click", () => {
      this.app.send({
        type: "floor_landing_merge",
        floorId: floor.id,
      });
      if (typeof window.toast === "function") {
        window.toast("Executando aterrissagem e mesclando branch...");
      }
      close();
    });

    // Requisita prévia ao backend
    this.app.send({
      type: "floor_landing_preview",
      floorId: floor.id,
    });
  }

  handleLandingPreview(msg) {
    const root = document.getElementById("modal-root");
    if (!root) return;

    const commitsEl = root.querySelector("#landing-commits-list");
    const diffEl = root.querySelector("#landing-diff-preview");
    const conflictEl = root.querySelector("#landing-conflict-status");

    if (commitsEl && Array.isArray(msg.commits)) {
      if (msg.commits.length === 0) {
        commitsEl.textContent = "(Nenhum commit novo em relação ao térreo)";
      } else {
        commitsEl.innerHTML = msg.commits.map((c) => `<div>● ${c}</div>`).join("");
      }
    }

    if (diffEl && msg.diff) {
      diffEl.textContent = msg.diff;
    }

    if (conflictEl) {
      if (msg.hasConflict) {
        conflictEl.style.background = "rgba(239, 68, 68, 0.1)";
        conflictEl.style.color = "#f87171";
        conflictEl.style.borderColor = "rgba(239, 68, 68, 0.2)";
        conflictEl.innerHTML = "⚠️ <strong>Atenção:</strong> Conflitos detectados na mesclagem. Resolva os conflitos antes de prosseguir.";
      } else {
        conflictEl.style.background = "rgba(34, 197, 94, 0.1)";
        conflictEl.style.color = "#4ade80";
        conflictEl.style.borderColor = "rgba(34, 197, 94, 0.2)";
        conflictEl.innerHTML = "✓ <strong>Merge limpo:</strong> Todas as alterações prontas para aterrissar com segurança.";
      }
    }
  }

  handleLandingResult(msg) {
    if (msg.ok) {
      if (typeof window.toast === "function") {
        window.toast("Aterrissagem concluída com sucesso! Retornado ao Térreo.");
      }
      // Voltar ao térreo com animação
      const ground = this.floors.find((f) => f.isGroundFloor) || this.floors[0];
      if (ground) this.switchToFloor(ground.id);
    } else {
      if (typeof window.toast === "function") {
        window.toast(`Falha na aterrissagem: ${msg.error || "Erro desconhecido"}`);
      }
    }
  }
}

window.FloorManager = FloorManager;
