// public/js/emoji-picker.js
// Seletor Nativo de Emojis para o TerminalManager (Notas, Prompts, Andares e Títulos)

class EmojiPickerPopover {
  constructor() {
    this.popoverEl = null;
    this.activeCategory = "faces";
    this.searchQuery = "";
    this.currentTargetInput = null;
    this.currentOnSelect = null;
    this.categories = [
      {
        id: "faces",
        icon: "😀",
        title: "Rostos & Emoções",
        emojis: [
          "😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","😚","😙","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁","😮","😯","😲","😳","🥺","😦","😧"
        ]
      },
      {
        id: "tech",
        icon: "🚀",
        title: "Tecnologia & Código",
        emojis: [
          "💻","🖥️","⌨️","🖱️","🖨️","📱","📲","⚡","🔥","🛠️","⚙️","🔧","🔨","🧰","🛢️","📦","📊","📈","📉","🎯","🚀","💡","🔍","🔎","🔒","🔓","🔑","🛡️","🤖","👾","🎮","📻","🛰️","📡"
        ]
      },
      {
        id: "work",
        icon: "📝",
        title: "Trabalho & Notas",
        emojis: [
          "📝","📄","📑","📖","📚","📌","📍","✂️","🖊️","🖋️","✏️","🎨","🖌️","📁","📂","🗂️","📅","📆","⏱️","⏰","🧭","🏆","🥇","⭐","🌟","✨","💥","💯","✅","❌","⚠️","🚨","🔔"
        ]
      },
      {
        id: "symbols",
        icon: "🎨",
        title: "Símbolos & Cores",
        emojis: [
          "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","🔴","🟠","🟡","🟢","🔵","🟣","⚫","⚪","🟤","💎","💠","🔱","⭕","⛔","🚫","💬","💭","🗨️","👁️‍🗨️","🏁","🚩"
        ]
      }
    ];

    this._closeHandler = (e) => {
      if (this.popoverEl && !this.popoverEl.contains(e.target) && !e.target.closest(".note-btn-emoji, .btn-composer-emoji, .btn-emoji-picker")) {
        this.close();
      }
    };
  }

  _createDOM() {
    if (this.popoverEl) return;

    const el = document.createElement("div");
    el.id = "emoji-picker-popover";
    el.className = "emoji-picker-popover hidden";
    el.innerHTML = `
      <div class="emoji-picker-header">
        <input type="text" class="emoji-picker-search" placeholder="🔍 Buscar emoji..." />
      </div>
      <div class="emoji-picker-tabs"></div>
      <div class="emoji-picker-grid"></div>
    `;

    document.body.appendChild(el);
    this.popoverEl = el;

    const searchInput = el.querySelector(".emoji-picker-search");
    searchInput.addEventListener("input", (e) => {
      this.searchQuery = (e.target.value || "").trim().toLowerCase();
      this.renderGrid();
    });

    const tabsContainer = el.querySelector(".emoji-picker-tabs");
    for (const cat of this.categories) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `emoji-picker-tab ${cat.id === this.activeCategory ? "active" : ""}`;
      btn.dataset.id = cat.id;
      btn.textContent = cat.icon;
      btn.title = cat.title;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.activeCategory = cat.id;
        this.searchQuery = "";
        searchInput.value = "";
        this.updateTabsUI();
        this.renderGrid();
      });
      tabsContainer.appendChild(btn);
    }
  }

  updateTabsUI() {
    if (!this.popoverEl) return;
    const tabs = this.popoverEl.querySelectorAll(".emoji-picker-tab");
    tabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.id === this.activeCategory);
    });
  }

  renderGrid() {
    if (!this.popoverEl) return;
    const grid = this.popoverEl.querySelector(".emoji-picker-grid");
    grid.innerHTML = "";

    let emojis = [];
    if (this.searchQuery) {
      for (const cat of this.categories) {
        emojis.push(...cat.emojis);
      }
      emojis = Array.from(new Set(emojis));
    } else {
      const cat = this.categories.find((c) => c.id === this.activeCategory);
      emojis = cat ? cat.emojis : [];
    }

    if (!emojis.length) {
      grid.innerHTML = `<div class="emoji-picker-empty">Nenhum emoji encontrado</div>`;
      return;
    }

    for (const emoji of emojis) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "emoji-picker-item";
      item.textContent = emoji;
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        this.selectEmoji(emoji);
      });
      grid.appendChild(item);
    }
  }

  selectEmoji(emoji) {
    if (this.currentTargetInput) {
      const el = this.currentTargetInput;
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const val = el.value || "";
      el.value = val.substring(0, start) + emoji + val.substring(end);
      const newPos = start + emoji.length;
      if (typeof el.setSelectionRange === "function") {
        el.setSelectionRange(newPos, newPos);
      }
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.focus();
    }

    if (typeof this.currentOnSelect === "function") {
      this.currentOnSelect(emoji);
    }

    this.close();
  }

  open({ anchorEl, targetInput = null, onSelect = null, clientX, clientY }) {
    this._createDOM();
    this.currentTargetInput = targetInput;
    this.currentOnSelect = onSelect;
    this.searchQuery = "";

    const searchInput = this.popoverEl.querySelector(".emoji-picker-search");
    if (searchInput) searchInput.value = "";

    this.updateTabsUI();
    this.renderGrid();

    this.popoverEl.classList.remove("hidden");

    let left = clientX;
    let top = clientY;

    if (anchorEl) {
      const rect = anchorEl.getBoundingClientRect();
      left = rect.left;
      top = rect.bottom + 6;
    }

    const popW = 280;
    const popH = 260;

    if (left + popW > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popW - 12);
    }
    if (top + popH > window.innerHeight - 12) {
      top = Math.max(12, window.innerHeight - popH - 12);
    }

    this.popoverEl.style.left = `${left}px`;
    this.popoverEl.style.top = `${top}px`;

    setTimeout(() => {
      document.addEventListener("pointerdown", this._closeHandler);
    }, 50);
  }

  close() {
    if (this.popoverEl) {
      this.popoverEl.classList.add("hidden");
    }
    document.removeEventListener("pointerdown", this._closeHandler);
    this.currentTargetInput = null;
    this.currentOnSelect = null;
  }
}

window.EmojiPicker = new EmojiPickerPopover();
