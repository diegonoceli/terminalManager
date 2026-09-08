# Implementation Plan: Mini Barra Lateral, Editor, Fichários, Notas e Spotlight

**Branch**: `010-workspaces-nav-spotlight` | **Date**: 2026-09-08 | **Spec**: [specs/010-workspaces-nav-spotlight/spec.md](spec.md)

**Input**: Feature specification from `/specs/010-workspaces-nav-spotlight/spec.md`

---

## Summary

Implementar a orquestração e navegação de workspaces e recursos no Maestri:
1. **Mini Barra Lateral**: modo compacto (~48px) exibindo apenas ícones de workspaces, com hover de rótulo prolongado (>200ms), long-press (~400ms) abrindo popover de terminais ativos e clique direito para menu de contexto completo.
2. **Acesso Rápido ao Editor**: botão dedicado na barra superior direita para abrir o `workingDir` no VS Code ou editor padrão do sistema.
3. **Notas Markdown Espaciais**: suporte a colar imagens inline (<kbd>Cmd+V</kbd>), renomeação com restauração automática, drag-and-drop de arquivos do Finder e atalho de exclusão <kbd>⌘W</kbd>.
4. **Fichários (Binders)**: agrupador de notas em um único nó espacial com abas na lateral direita para folhear, drag-in para adicionar ao topo, drag-out para extrair nota livre, reordenação de abas, unificação de cor e persistência de quadros de tarefas nomeados vazios.
5. **Pastas e Grupos de Workspaces**: organização na sidebar com pastas agrupadoras colapsáveis e divisores de grupos rotulados.
6. **Integração Spotlight (macOS)**: geração de metadados indexáveis e registro do protocolo `maestri://open` para busca nativa no sistema com foco animado no canvas.

---

## Technical Context

**Language/Version**: JavaScript (ES Modules, ECMAScript 2022+), Electron 31.7.7, Node.js 20+

**Primary Dependencies**: Electron, xterm.js, CodeMirror, marked.js (100% offline, zero dependências externas em runtime)

**Storage**: `state.json` gerenciado por `TerminalManager` no processo principal do Electron (persistência de workspaces, pastas, grupos, fichários, nós e conexões)

**Testing**: Verificação de sintaxe com `node -c`, testes automatizados com Electron headless para eventos de ponteiro, atalhos de teclado e ciclo de vida de Fichários

**Target Platform**: macOS (Apple Silicon & Intel) com integração Spotlight e deep-links `maestri://`, com degradação graciosa para Windows/Linux

**Project Type**: Desktop Application (Spatial Canvas & Local AI Orchestration)

**Performance Goals**: 60fps no canvas durante folheamento de abas e arraste, comutação de workspace <50ms, long-press popover em 400ms, abertura de editor <300ms

**Constraints**: Operação estritamente offline, persistência atômica segura no disco, integridade de arquivos externos do projeto

**Scale/Scope**: Suporte a dezenas de workspaces em múltiplas pastas, centenas de notas agrupadas em fichários e indexação instantânea no Spotlight

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Requisito | Status | Justificativa |
| :--- | :--- | :--- | :--- |
| **I. Arquitetura Desacoplada** | Módulos com escopo claro e responsabilidade única | PASS | `BinderWidget` encapsulado em `public/js/widgets/binder.js`, `WorkspaceSidebar` gerencia mini barra e pastas |
| **II. Zero Dependências Externas** | Execução 100% offline | PASS | Manipulação de arquivos local, IPC nativo do Electron e marked.js embutido |
| **III. Sensação Nativa no macOS** | Integração com padrões do SO | PASS | Registro do protocolo `maestri://`, arquivos de metadados Spotlight e atalho nativo ⌘W |
| **IV. Preservação de Dados e Segurança** | Sem perda de arquivos do usuário | PASS | Notas externas ao projeto nunca são apagadas do disco físico |

---

## Project Structure

### Documentation (this feature)

```text
specs/010-workspaces-nav-spotlight/
├── plan.md              # Este arquivo de planejamento arquitetural
├── research.md          # Pesquisa técnica e resolução de decisões
├── data-model.md        # Modelagem de entidades (Binder, Folder, Group, Note)
├── quickstart.md        # Roteiro de testes de usuário e desenvolvedor
├── contracts/
│   └── ui-contracts.md  # Contratos IPC e eventos de interface
└── checklists/
    └── requirements.md  # Validação de qualidade da especificação
```

### Source Code (repository root)

```text
electron/
├── main.js                  # Protocolo maestri://, spotlight indexer, editor launcher
├── terminal-manager.js      # Persistência de binders, pastas, grupos no state.json
└── agent-cli.js             # Suporte a leitura de notas em cadeia e fichários por agentes

public/
├── index.html               # Botão de editor no topo direito, container de popover
├── styles.css               # Estilos da mini sidebar, binder com abas laterais, popover de terminais
├── js/
│   ├── workspace-sidebar.js # Mini sidebar, long-press popover, pastas e grupos
│   ├── notes.js             # Paste de imagens inline, renomeação flexível, ⌘W
│   ├── widgets/
│   │   └── binder.js        # Novo widget: Fichário de notas com abas verticais
│   ├── canvas.js            # Drag & drop de arquivos do Finder
│   └── main.js              # Roteamento de mensagens IPC, atalhos de teclado e bridge de UI
```

---

## Phases & Execution Strategy

### Phase 0: Research & Foundation (Concluída)
- Resolução de padrões de long-press sem colisão com drag-and-drop.
- Definição do protocolo de abas e extração/inserção em Fichários.
- Estratégia de indexação de arquivos para o macOS Spotlight.

### Phase 1: Contracts & Data Model (Concluída)
- Definição dos contratos de mensagens IPC (`binder_create`, `binder_add_page`, etc.).
- Estruturação do `data-model.md` com `BinderNode`, `WorkspaceFolder`, `WorkspaceGroup`.
- Geração do `quickstart.md` e atualização do `AGENTS.md`.

### Phase 2: Implementation Breakdown (Próximo Passo via `/speckit-tasks`)
- Implementar `BinderWidget` e suporte no backend `TerminalManager`.
- Atualizar `WorkspaceSidebar` com mini mode, long-press e pastas/grupos.
- Adicionar botão "Abrir no Editor" e handler no `electron/main.js`.
- Habilitar paste de imagens em `notes.js` e drag-drop do Finder em `canvas.js`.
- Registrar protocolo `maestri://` e geração de metadados do Spotlight.
- Testes automatizados headless com Electron validando toda a suíte.
