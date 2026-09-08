# Implementation Plan: Documentação Completa e Especificação Funcional da Plataforma Maestri

**Branch**: `011-maestri-complete-docs` | **Date**: 2026-09-08 | **Spec**: [specs/011-maestri-complete-docs/spec.md](spec.md)

**Input**: Feature specification from `/specs/011-maestri-complete-docs/spec.md` baseada na documentação completa oficial do Maestri.

---

## Summary

Implementar e consolidar a arquitetura completa de orquestração espacial de agentes de IA da plataforma Maestri:
1. **Workspaces & Sessões Contínuas**: Execução de agentes em segundo plano, mini barra lateral com long-press e hover, sincronização `CLAUDE.md` ↔ `AGENTS.md`, botão de abertura rápida no editor e indexação nativa no Spotlight do macOS.
2. **Canvas 2D Infinito & Layout**: Grade de 20pt, snapping magnético mosaico via tecla `Ctrl`, elevação de nós para foco e acoplamento em colunas laterais fixas, frames de agrupamento (`Ctrl+G`) e alinhamento/arranjo em grade (`Ctrl+Shift+T`).
3. **Terminais Inteligentes & Roles**: Sidecars portáteis `role.json` para especialização de agentes, importação por auto-descoberta, esquemas de temas iTerm2/Ghostty, ponto vermelho de atenção passivo (`Ctrl+Shift+A`) e atalhos numéricos (`Ctrl+1..9`).
4. **Notas Markdown Espaciais**: Modos Raw e Formatada, colagem de imagens inline (`⌘V`), renomeação dinâmica pela 1ª linha, encadeamento em árvore para leitura por agentes e suporte a arquivos externos do Finder.
5. **Conexões Físicas & Comunicação Inter-Agentes**: Estilos Corda (física elástica) e Circuito (trilhos ortogonais), abraçadeiras magnéticas manuais (`Alt + traço`), skill de CLI com roteamento autônomo entre agentes enquanto o receptor estiver desselecionado e popover de inspeção.
6. **Árvore de Arquivos Multivisualização & Editor**: 4 Modos (Lista, Grade com Quick Look, Diff de alterações e Grafo Git), editor CodeMirror integrado, atalhos `Ctrl+P` e `>` para busca textual e citação rápida para agentes via chat.
7. **Portais Web & Dispositivos Móveis**: Navegador WebKit com compartilhamento de cookies entre portais, Portais de Simulador iOS e Emulador Android com aceleração de GPU e controle tátil, e automação por agentes via árvore de acessibilidade nativa.
8. **Andares (Floors) com Clonagem APFS**: Isolamento em branches com clonagem instantânea copy-on-write APFS em `.maestri/floors/`, transição 3D, duplicação de layout do Térreo, hooks de ciclo de vida (Setup, Run, Teardown) e interface de aterrissagem com merge controlado.
9. **Compositor de Prompts Rico**: Composer flutuante ancorado ao terminal ativo (`Ctrl+Shift+P`), menções estruturadas `@` (nós, arquivos, `@Maestro`), envio de imagens em pixels nativos / SSH, rascunhos persistentes por terminal e passthrough de teclado no vazio.
10. **Batuta Search**: Paleta global (`Ctrl+P`) com busca fuzzy de nós, arquivos e textos de notas em todos os andares e workspaces, navegação instantânea com câmera espacial, catálogo de ações globais/contextuais e fluxos integrados "Pedir..." e "Verificar...".

---

## Technical Context

**Language/Version**: JavaScript (ES Modules, ECMAScript 2022+), Electron 31.7.7, Node.js 20+

**Primary Dependencies**: Electron, node-pty, xterm.js, CodeMirror 5/6, marked.js, Canvas 2D / WebGL (zero dependências de nuvem ou telemetria; 100% offline)

**Storage**: `state.json` atômico gerenciado por `TerminalManager` no processo principal do Electron (persistência de workspaces, andares, nós, conexões, roles e rascunhos) e sistema de arquivos local (`.maestri/floors/`, `assets/`, `CLAUDE.md`, `AGENTS.md`, `role.json`)

**Testing**: Verificação estática de sintaxe com `node -c`, testes automatizados de fluxo e renderização com Electron headless e suites unitárias de algoritmos de snapping, routing ortogonal e busca fuzzy

**Target Platform**: macOS (Apple Silicon & Intel) como ambiente primário de alta fidelidade (com Spotlight, APFS copy-on-write, Simulador iOS Xcode), com compatibilidade e degradação graciosa para Windows e Linux (branches Git e Emuladores Android)

**Project Type**: Desktop Application (Spatial Desktop & Multi-Agent AI Orchestration Engine)

**Performance Goals**: 60fps constantes no canvas durante translações e arraste com física; alternância de workspace em <300ms; resposta de busca fuzzy Batuta Search em <100ms; clonagem APFS em <2s

**Constraints**: Operação local e offline sem envio de dados para servidores terceiros; preservação rigorosa da integridade dos arquivos originais do projeto

**Scale/Scope**: Suporte a dezenas de workspaces, centenas de nós em múltiplos andares e dezenas de sessões simultâneas de agentes sem degradação visual

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Requisito | Status | Justificativa |
| :--- | :--- | :--- | :--- |
| **I. Arquitetura Modular e Desacoplada** | Componentes espaciais isolados e testáveis | PASS | Cada widget (Terminal, Nota, Portal, Árvore, Fichário, Composer) opera com encapsulamento de estado e interface limpa |
| **II. Zero Dependências Externas em Runtime** | Operação 100% offline | PASS | Todos os motores de renderização, markdown, terminal e física rodam localmente no Electron |
| **III. Sensação Nativa no macOS** | Integração profunda com convenções do sistema | PASS | Suporte a atalhos nativos (`⌘W`, `Ctrl+P`, `⌘V`), indexação Spotlight, buffers diretos de GPU e APFS |
| **IV. Preservação Estrita de Dados** | Nenhum dado é perdido em trocas de contexto | PASS | Rascunhos persistentes, sidecars `role.json` no disco e notas em caminhos originais nunca são destruídas inadvertidamente |

---

## Project Structure

### Documentation (this feature)

```text
specs/011-maestri-complete-docs/
├── plan.md              # Este plano de arquitetura e implementação
├── research.md          # Pesquisa técnica e consolidação das 10 decisões centrais
├── data-model.md        # Especificação detalhada de entidades e estruturas
├── quickstart.md        # Roteiro passo a passo de inicialização e validação
├── contracts/
│   └── ui-contracts.md  # Contratos IPC e especificações de comandos CLI
└── checklists/
    └── requirements.md  # Checklist de validação de qualidade da especificação
```

### Source Code (repository root)

```text
electron/
├── main.js                  # Ponto de entrada, protocolos maestri://, spotlight, APFS floors, watcher CLAUDE/AGENTS
├── terminal-manager.js      # Gerenciamento de processos PTY, persistência atômica no state.json, background loop
├── agent-cli.js             # Implementação da CLI maestri instalada nos terminais (send, read, broadcast)
├── device-manager.js        # Integração nativa com xcrun simctl e adb para streaming e acessibilidade
└── state-migrate.js         # Migrações seguras de esquema de dados

public/
├── index.html               # Canvas SVG/HTML5, toolbar estilo macOS Dock, minimapa, containers flutuantes
├── styles.css               # Design system Liquid Glass, física de nós, cabos SVG, mini sidebar, composer
└── js/
    ├── canvas.js            # Motor 2D infinito, pan/zoom, grade 20pt, magnetic snapping, elevação e docking
    ├── main.js              # Inicialização do renderer, atalhos globais, ponte IPC
    ├── workspace-sidebar.js # Barra lateral completa e mini barra lateral (hover, long-press popover, pastas/grupos)
    ├── notes.js             # Post-its markdown, modos Raw/Formatada, paste de imagens inline, encadeamento
    ├── connections.js       # Cabos com física de corda ou trilhos de circuito, abraçadeiras Alt+traço, popover
    ├── file-tree.js         # Árvore de arquivos 4 modos (Lista, Grade, Diff, Grafo Git), editor CodeMirror
    ├── portals.js           # Portais web (WebKit) e portais de dispositivos móveis com aceleração GPU
    ├── floors.js            # Gerenciador de andares, transição 3D, duplicação de layout, interface de aterrissagem
    ├── prompt-composer.js   # Compositor flutuante, menções @, chips inline, rascunhos persistentes
    ├── batuta-search.js     # Paleta de comandos fuzzy (Ctrl+P), busca global, ações Pedir... e Verificar...
    └── widgets/
        └── binder.js        # Fichários de notas espaciais
```

---

## Phases & Execution Strategy

### Phase 0: Research & Technical Foundations (Concluída)
- Decisões consolidadas em `research.md` para todos os 11 domínios da documentação oficial.
- Estruturação dos algoritmos de snapping magnético, física de cordas vs trilhos de circuito, e comunicação inter-agentes.

### Phase 1: Design & Interface Contracts (Concluída)
- Modelagem de dados completa em `data-model.md`.
- Contratos IPC e CLI documentados em `contracts/ui-contracts.md`.
- Roteiro de testes manuais e automatizados documentado em `quickstart.md`.
- Atualização do arquivo de contexto dos agentes (`AGENTS.md`).

### Phase 2: Tasks & Implementation Breakdown (Próximo Passo)
- Executar `/speckit-tasks` para gerar `tasks.md` ordenado por dependências e fases de implementação orientadas a MVP.

---

## Complexity Tracking

| Decisão / Abstração | Por que é necessária | Alternativa mais simples rejeitada |
| :--- | :--- | :--- |
| **Clonagem APFS Copy-on-Write em Andares** | Permite clonar repositórios de múltiplos gigabytes em <1 segundo sem consumo extra de disco | Cópia de diretório tradicional (`cp -R`) rejeitada por ser lenta e esgotar o armazenamento do usuário |
| **Árvore de Acessibilidade Nativa em Dispositivos** | Permite aos agentes tocar e digitar com assertividade cirúrgica em botões e campos reais | Detecção baseada apenas em screenshots e visão computacional rejeitada por ser lenta, custosa em tokens e imprecisa |
| **Roteamento de Comunicação Inter-Agentes com Detecção de Foco** | Evita que respostas automáticas entre IAs colidam com comandos manuais digitados pelo usuário | Automação sem checagem de foco rejeitada por interromper a digitação do desenvolvedor no terminal |

