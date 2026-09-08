// public/js/settings.js
// Configurações → Agentes (responsabilidades: nome/badge/instruções) e
// modal de criação de terminal com agente CLI + responsabilidade. US3.

(function () {
  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  const Settings = {
    app: null,
    send: null,
    root: null,

    init(app, send) {
      this.app = app;
      this.send = send;
      this.root = document.getElementById("modal-root");
    },

    /* ---------- Configurações → Agentes (roles CRUD) ---------- */
    openRolesManager() {
      if (!this.root) return;
      this.root.innerHTML = "";
      this.root.classList.remove("hidden");
      const overlay = el("div", "modal-overlay");
      const box = el("div", "modal wide");
      box.appendChild(el("h3", "", "Configurações → Agentes (Responsabilidades)"));

      const list = el("div", "roles-list");
      const render = () => {
        list.innerHTML = "";
        for (const role of this.app.roles || []) {
          const row = el("div", "role-row");
          const badge = el("span", "role-badge", role.name);
          badge.style.background = role.badgeColor || "#888";
          row.appendChild(badge);
          const hint = el("span", "role-desc", (role.instructions || "").slice(0, 60));
          row.appendChild(hint);
          const edit = el("button", "btn small", "Editar");
          const del = el("button", "btn small danger", "Excluir");
          edit.addEventListener("click", () => form(role));
          del.addEventListener("click", () => {
            if (confirm(`Excluir a responsabilidade "${role.name}"?`)) {
              const roles = (this.app.roles || []).filter((r) => r.id !== role.id);
              this.app.roles = roles;
              if (this.send) this.send({ type: "roles_save", roles });
              render();
            }
          });
          row.appendChild(edit);
          row.appendChild(del);
          list.appendChild(row);
        }
        if (!(this.app.roles || []).length) {
          list.appendChild(el("p", "muted", "Nenhuma responsabilidade ainda. Crie uma para atribuir a terminais."));
        }
      };

      const form = (role) => {
        const editing = !!role;
        const fname = el("input");
        fname.value = (role && role.name) || "";
        fname.placeholder = "Nome (ex.: Líder)";
        const fcolor = el("input");
        fcolor.type = "color";
        fcolor.value = (role && role.badgeColor) || "#4f46e5";
        const finst = el("textarea");
        finst.rows = 4;
        finst.value = (role && role.instructions) || "";
        finst.placeholder = "Instruções injetadas automaticamente no agente ao iniciar…";
        const save = el("button", "btn primary", editing ? "Salvar" : "Adicionar");
        const cancel = el("button", "btn", "Fechar");
        const fwrap = el("div", "role-form");
        const r1 = el("div", "role-form-row");
        r1.append(el("label", "", "Nome"), fname, el("label", "", "Cor"), fcolor);
        fwrap.append(r1, el("label", "", "Instruções"), finst, cancel, save);
        box.insertBefore(fwrap, list.nextSibling || null);

        save.addEventListener("click", () => {
          const name = fname.value.trim();
          if (!name) {
            alert("Informe o nome da responsabilidade.");
            return;
          }
          const roles = this.app.roles || [];
          if (editing) {
            role.name = name;
            role.badgeColor = fcolor.value;
            role.instructions = finst.value;
          } else {
            roles.push({
              id: `role_${Date.now().toString(36)}`,
              name,
              badgeColor: fcolor.value,
              instructions: finst.value,
            });
          }
          this.app.roles = roles;
          if (this.send) this.send({ type: "roles_save", roles });
          fwrap.remove();
          render();
        });
        cancel.addEventListener("click", () => fwrap.remove());
      };

      const addBtn = el("button", "btn primary", "＋ Nova responsabilidade");
      addBtn.addEventListener("click", () => form(null));
      box.append(el("div", "role-head", "Responsabilidades disponíveis"), list, addBtn);
      const close = el("button", "btn", "Fechar");
      close.addEventListener("click", () => this.close());
      box.appendChild(close);
      overlay.appendChild(box);
      this.root.appendChild(overlay);
      render();
    },

    /* ---------- Novo Terminal com agente + responsabilidade ---------- */
    openNewTerminal() {
      if (!this.root) return;
      this.root.innerHTML = "";
      this.root.classList.remove("hidden");
      const overlay = el("div", "modal-overlay");
      const box = el("div", "modal");
      box.appendChild(el("h3", "", "Novo Terminal"));

      const fname = el("input");
      fname.value = `Terminal ${(this.app.widgets?.size || 0) + 1}`;
      const ficon = el("input");
      ficon.placeholder = "ícone (emoji)";
      ficon.maxLength = 4;

      const fagent = el("select");
      const noneOpt = el("option", "", "Shell padrão (sem agente)");
      noneOpt.value = "";
      fagent.appendChild(noneOpt);
      for (const a of this.app.agents || []) {
        const opt = el("option", "", `${a.kind}${a.available ? "" : " (não instalado)"}`);
        opt.value = a.kind;
        fagent.appendChild(opt);
      }

      const frole = el("select");
      const rNone = el("option", "", "Sem responsabilidade");
      rNone.value = "";
      frole.appendChild(rNone);
      for (const r of this.app.roles || []) {
        const opt = el("option", "", r.name);
        opt.value = r.id;
        frole.appendChild(opt);
      }

      const fld = (label) => {
        const w = el("div", "field");
        w.appendChild(el("label", "", label));
        return w;
      };

      const actions = el("div", "modal-actions");
      const cancel = el("button", "btn", "Cancelar");
      cancel.addEventListener("click", () => this.close());
      const save = el("button", "btn primary", "Criar terminal");
      save.addEventListener("click", () => {
        const size = this.app.canvas.viewportSize;
        const center = this.app.canvas.screenToWorld(size.w / 2, size.h / 2);
        const title = fname.value.trim() || "Terminal";
        const node = {
          type: "terminal",
          title,
          icon: ficon.value.trim() || "",
          x: Math.round(center.x - 360),
          y: Math.round(center.y - 210),
          width: 720,
          height: 420,
        };
        if (fagent.value) {
          node.agent = { kind: fagent.value };
          if (frole.value) node.roleId = frole.value;
        }
        if (this.send) this.send({ type: "create_node", node });
        this.close();
      });

      box.append(
        (() => {
          const w = fld("Nome");
          w.appendChild(fname);
          return w;
        })(),
        (() => {
          const w = fld("Ícone");
          w.appendChild(ficon);
          return w;
        })(),
        (() => {
          const w = fld("Agente");
          w.appendChild(fagent);
          return w;
        })(),
        (() => {
          const w = fld("Responsabilidade");
          w.appendChild(frole);
          return w;
        })()
      );
      actions.appendChild(cancel);
      actions.appendChild(save);
      box.appendChild(actions);
      overlay.appendChild(box);
      this.root.appendChild(overlay);
      fname.focus();
    },

    close() {
      if (this.root) {
        this.root.innerHTML = "";
        this.root.classList.add("hidden");
      }
    },
  };

  window.Settings = Settings;
})();
