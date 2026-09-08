# Implementation Plan: Maestri Spatial 2D Canvas & Liquid Glass UI

**Branch**: `008-spatial-canvas-ui` | **Date**: 2026-09-08 | **Spec**: [specs/008-spatial-canvas-ui/spec.md](spec.md)

**Input**: Feature specification from `specs/008-spatial-canvas-ui/spec.md`

---

## Summary

Refatoração arquitetural e visual da interface do `terminalManager` para adotar o paradigma de **Área de Trabalho Espacial 2D** e o **Design System "Liquid Glass"** inspirado no aplicativo Maestri. A interface abandona barras estáticas fixas e adota um **Canvas Infinito** com malha pontilhada (`dot grid`), janelas de terminal estilo macOS com cantos arredondados, bordas de vidro translúcido (`backdrop-filter`) e padding integrado, um **macOS Dock flutuante** para criação e ferramentas, um **Compositor de Prompts Rico** com ancoragem magnética sob o terminal ativo ("Docked Composer"), nós de **Notas Markdown** e **Árvore de Arquivos** flutuantes, e **Cabos Bézier SVG** dinâmicos.

A abordagem técnica preserva o runtime leve e de alta performance baseado em Electron e Vanilla JavaScript (ESM), utilizando aceleração gráfica por hardware via CSS 3D transforms (`translate3d`, `scale`) e manipulação direta de DOM para garantir resposta em 60 FPS e latência inferior a 16ms sem a sobrecarga de um framework virtual DOM pesado.

---

## Technical Context

**Language/Version**: JavaScript (ESM, ECMAScript 2022+), HTML5, CSS3  
**Primary Dependencies**: Electron `^31.7.7`, `node-pty` `^1.1.0`, `xterm.js` (com `fitAddon`), `marked.js`  
**Storage**: JSON serializado via Electron IPC em arquivo de estado do workspace no disco local  
**Testing**: Testes manuais de validação de layout, performance de renderização (Chrome DevTools Performance 60 FPS) e testes de regressão PTY  
**Target Platform**: macOS (Darwin x64/arm64) e Windows 10/11 desktop app via Electron  
**Project Type**: Desktop Application (Electron + Web Frontend)  
**Performance Goals**: 60 FPS contínuos durante Pan e Zoom com até 20 nós na tela; latência de início de arrasto e elevação z-index < 16ms; recálculo de curvas Bézier < 5ms  
**Constraints**: Zero dependência externa de bundler (Webpack/Vite); sem injeção de frameworks React/Vue pesados desnecessários; respeito estrito a `prefers-reduced-motion`  
**Scale/Scope**: Suporte a dezenas de nós simultâneos (terminais, notas, árvores de arquivos e conexões) por workspace sem degradação de memória  

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Princípio I: Separação Limpa e Modularidade**: PASSOU. Módulos de interface organizados em classes com responsabilidade única (`SpatialCanvas`, `FloatingDock`, `PromptComposer`, `TermWidget`).
- **Princípio II: Protocolos de Texto e Linha de Comando**: PASSOU. A interação do Prompt Composer se dá por injeção direta de texto no `stdin` dos processos de terminal existentes através de `app.sendInput()`.
- **Princípio III: Testabilidade e Validação**: PASSOU. Todos os cenários de aceitação em `spec.md` possuem passos verificáveis e critérios mensuráveis.
- **Princípio IV: Simplicidade e Sem Dependências Inúteis (YAGNI)**: PASSOU. Evitou a introdução de frameworks redundantes (ReactFlow), aproveitando aceleração por hardware nativa do navegador.

---

## Project Structure

### Documentation (this feature)

```text
specs/008-spatial-canvas-ui/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this file)
├── research.md          # Technical research and architectural decisions
├── data-model.md        # Entities, properties and schema
├── quickstart.md        # User and developer manual
├── contracts/
│   └── ui-spatial-canvas.md # Design tokens and component API contracts
└── checklists/
    └── requirements.md  # Quality validation checklist
```

### Source Code (repository layout)

```text
public/
├── index.html           # Viewport expandido, Floating Dock, container do Prompt Composer
├── styles.css           # Design tokens Liquid Glass, Dark Mode, Dot Grid, transições macias
├── js/
│   ├── main.js          # Orquestração do app, instanciação dos módulos espaciais
│   ├── canvas.js        # Motor SpatialCanvas, transformações de câmera, Pan, Zoom e Dot Grid
│   ├── floating-dock.js # Módulo da Barra de Ferramentas suspensa (Liquid Glass Dock)
│   ├── prompt-composer.js # Módulo do Compositor de Prompts Rico e Ancoragem Magnética
│   ├── terminal.js      # Janelas de Terminal macOS flutuantes, traffic lights, padding integrado
│   ├── notes.js         # Nós de Notas Markdown translúcidas
│   ├── filetree.js      # Nó de Árvore de Arquivos flutuante
│   ├── connections.js   # Cabos e conexões físicas em curvas Bézier SVG dinâmicas
│   └── icons.js         # Catálogo vetorial de ícones Lucide
electron/
├── main.js              # PTY manager, IPC handlers e gerenciamento de janelas
└── preload.js           # Bridge segura de IPC
```

---

## Implementation Approach & Phases

### Phase 0: Research & Architecture (Concluída)
- Avaliação de bibliotecas de grafo vs. Vanilla DOM com aceleração CSS 3D.
- Definição dos tokens do Design System "Liquid Glass" e Dark Mode nativo.
- Formulação matemática do rastreamento de cabos Bézier cúbicos.

### Phase 1: Design, Contracts & Context (Concluída)
- Criação de `data-model.md`, `contracts/ui-spatial-canvas.md` e `quickstart.md`.
- Atualização do arquivo de contexto do agente (`AGENTS.md`).

### Phase 2: Implementation Sequence (Próxima etapa: `/speckit-tasks`)
1. **Design System & Dot Grid Canvas**:
   - Expandir `#viewport` para tela cheia (`inset: 0`).
   - Aplicar padrão de malha pontilhada no `#grid` com coordenadas sincronizadas de câmera.
   - Definir variáveis e classes CSS Liquid Glass (`--glass-bg`, `backdrop-filter: blur`, iluminação de borda e sombras).
2. **Terminal Nodes macOS Flutuantes**:
   - Refatorar cabeçalho do `TermWidget` para incluir botões de controle inspirados no macOS (Traffic Lights).
   - Ajustar cantos arredondados (`rounded-xl` / `rounded-2xl`) e padding integrado com o fundo do terminal.
   - Adicionar classes e transições suaves de arrasto (`.dragging feedback`).
3. **macOS Floating Dock Toolbar**:
   - Implementar componente `FloatingDock` suspenso na base centralizada.
   - Mapear ações de criação (Terminal, Nota, Arquivos, Fios) e controles de câmera (1:1, Fit, Center).
4. **Rich Prompt Composer**:
   - Implementar componente `PromptComposer` em pílula translúcida.
   - Implementar cálculo de posicionamento magnético abaixo do terminal ativo (`Docked Composer`).
   - Conectar envio de texto diretamente ao PTY via `app.sendInput(activeId, text + "\r")`.
5. **Widgets Flutuantes (Notas & Árvore de Arquivos)**:
   - Harmonizar nós de Notas e Árvore de Arquivos para o padrão visual Liquid Glass.
6. **Cabos Físicos e Conexões Bézier**:
   - Atualizar re-renderização de curvas Bézier SVG para manter tensão visual suave durante translação e redimensionamento de nós.
