# Implementation Plan: Layout, Iconografia e Animações do Maestri

**Branch**: `007-layout-icons-animations` | **Date**: 2026-09-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/007-layout-icons-animations/spec.md`

---

## Summary

Modernizar e elevar a qualidade visual do Maestri a um padrão profissional de ponta através de:
1. Uma biblioteca vetorial integrada de ícones Lucide (SVG com traço 1.5px, 100% offline, `currentColor`).
2. Uma barra lateral aprimorada com modo compacto mini-sidebar (~48px), reordenação fluida e agrupamento em pastas.
3. Transições espaciais suaves no canvas (fly-to 300ms, duplicação e exclusão animadas).
4. Física pendular refinada e traçados ortogonais de 90° com vértices suaves para conexões e cabos com pulso luminoso.
5. Elevação, acoplamento (docking) lateral e acessibilidade completa ("Reduzir Movimento").

---

## Technical Context

**Language/Version**: JavaScript (ES2022+), CSS3 (Transforms, Transitions, Flexbox/Grid, CSS Custom Properties), HTML5, Electron 31+.

**Primary Dependencies**: Lucide Icons (SVGs inline compactados no catálogo local `public/js/icons.js`), xterm.js (terminais), CodeMirror 5 (editor), marked (markdown).

**Storage**: Local persistence via `AppState.ui` (sidebar collapsed state, animation preferences) e `localStorage`.

**Testing**: Validação visual e manual através dos cenários descritos em [quickstart.md](quickstart.md) e verificação de sintaxe via `node -c`.

**Target Platform**: Electron Desktop App (macOS, Linux, Windows).

**Project Type**: Desktop Application.

**Performance Goals**: Taxa de quadros constante de 60 FPS durante zoom, pan e animações de múltiplos nós; tempo de resposta de clique em ícones < 50ms; fly-to em 300ms.

**Constraints**: Funcionamento 100% offline (sem requisições externas para CDN de ícones ou scripts); conformidade com WCAG 2.1 para redução de movimento (`prefers-reduced-motion`).

---

## Constitution Check

*GATE: Todas as alterações respeitam a integridade do código, ausência de regressão em terminais/nós existentes e modularização clara.*

- [X] Arquitetura modular no renderer (`public/js/icons.js` isolado).
- [X] Sem dependências pesadas adicionadas ao `package.json`.
- [X] Compatibilidade retroativa garantida com o estado v3 de workspaces.
- [X] Fallback gracioso para acessibilidade (`reducedMotion`).

---

## Project Structure

### Documentation (this feature)

```text
specs/007-layout-icons-animations/
├── plan.md              # Este plano de implementação
├── research.md          # Decisões arquiteturais e de iconografia
├── data-model.md        # Modelos de dados e interfaces
├── quickstart.md        # Roteiro de validação rápida
├── contracts/           # Contratos de interface UI
│   └── ui-icons-animations.md
├── checklists/
│   └── requirements.md
└── tasks.md             # Tarefas de implementação (gerado pelo /speckit-tasks)
```

### Source Code (repository root)

```text
public/
├── index.html           # Inclusão do script de ícones e botões vetoriais
├── styles.css           # Estilos para ícones, mini-sidebar, docks, física de cabos e animações
└── js/
    ├── icons.js         # NOVO: Catálogo vetorial Lucide e helper window.Icons
    ├── canvas.js        # Ajustes de animação da câmera (fly-to com easing)
    ├── connections.js   # Física pendular melhorada, circuitos ortogonais e pulsos
    ├── workspace-sidebar.js # Mini-sidebar, drag & drop de pastas, badges
    ├── terminal.js      # Cabeçalhos com ícones Lucide, ponto de atenção pulsante
    ├── portals.js       # Cabeçalhos de portais com ícones Lucide e rotação
    ├── notes.js         # Cabeçalho e alternância de notas com ícones Lucide
    ├── filetree.js      # Ícones de arquivos, pastas e ações git Lucide
    ├── settings.js      # Opção "Reduzir Movimento" e iconografia Lucide
    └── main.js          # Barra superior com ícones Lucide, atalhos de foco e docking
```
