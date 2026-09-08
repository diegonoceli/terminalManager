# Implementation Plan: Maestri Delta — Workspaces, Agentes & Responsabilidades, Notas, Conexões Avançadas e Árvore de Arquivos

**Branch**: `006-maestri-spatial-orchestration` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/006-maestri-spatial-orchestration/spec.md` + 5 clarificações registradas na seção `Clarifications`.

## Summary

Evoluir o "terminal manager" (clone Maestri) de um canvas espacial de terminais/portais para uma camada de **orquestração agêntica**: (1) migrar o conceito de "Floor/Workflow" para **Workspace** com barra lateral (diretório de trabalho, ícone, pastas, mini sidebar, import/export `.maestri`, instruções CLAUDE.md/AGENTS.md); (2) execução multi-workspace em **segundo plano** com limite LRU (N=3) e **pausa = encerrar/relançar com resume**; (3) terminais que executam **agentes CLI** (Claude Code, Codex, OpenCode) com **responsabilidades** (role.json sidecar) e indicador de atenção; (4) **nós de Nota** markdown (arquivos reais); (5) **nós de Árvore de Arquivos** com git/diff/graph e editor embutido; (6) **conexões avançadas** (Corda/Circuito/abraçadeiras, comunicação agente↔agente/nota/portal com registro); (7) produtividade de canvas (Texto/Desenho, grupos, snap, minimapa, elevar/acoplar); (8) temas Ghostty/Dracula/Catppuccin/Nord, busca Ctrl+P e Spotlight.

Arquitetura-alvo: manter o padrão atual — **processo principal (Electron) dono de processos/estado**, renderer vanilla JS em `public/` consumindo mensagens `type`-tagueadas por um único canal IPC `"msg"`. Estender sem quebrar o schema v2 (`state.json`) via migração v2 → v3.

## Technical Context

**Language/Version**: JavaScript — Renderer: ES Modules clássico (scripts em `public/js/`, classes globais `window.*`); Electron/Node: `type: module` (ESM) já usado em `electron/main.js`. Node via Electron 31.

**Primary Dependencies**:
- Electron 31 (`<webview>`, `Notification`, `shell`, `dialog`, `clipboard`, `app.setAsDefaultProtocolClient` p/ Spotlight/`maestri://`)
- `node-pty` ^1.1 (já presente) — spawn de agentes CLI e shells
- `@xterm/xterm` + `@xterm/addon-fit` vendored (`public/vendor/`)
- **Novos assets vendored** (sem runtime network): CodeMirror 5 (editor embutido), `marked` + sanitizador (render Markdown), temas Ghostty (JSON) parseado localmente
- Git CLI (`child_process`) para operações git/diff/graph — sem dependência JS de git

**Storage**: `state.json` v2 → **v3** (workspaces no lugar de workflows, migração 1:1). Sidecars: `role.json` (responsabilidades, junto ao diretório do projeto) e notas `.md` (pasta interna `notes/` do app ou no projeto). Temas/estado de UI no renderer (localStorage) e no nó.

**Testing**: Testes manuais guiados (multi-workspace, resume, 2 agentes conversando, notas persistidas, git ops, zoom/seleção mantidos). Sem framework de testes automatizados no projeto hoje — manter convenção (validação manual + checklist por domínio). *Nota: adicionar harness de testes de contrato é opcional e adiado.*

**Target Platform**: macOS (Apple Silicon/Intel) e Windows 10/11. Electron desktop.

**Project Type**: Desktop Application (Electron + Vanilla JS Canvas/DOM).

**Performance Goals**:
- Troca de workspace e restauração do layout < 1 s (SC-002); retomada pós-restart < 10 s (SC-012); retomada de workspace pausado < 5 s (SC-003).
- Canvas fluido (≥50 FPS) com até 100 nós (SC-009); redraw de conexões ancorado durante pan/zoom.
- Busca fuzzy `Ctrl+P` < 1 s em projetos de até 10.000 arquivos (SC-010).

**Constraints**:
- Manter processo principal como única autoridade sobre PTYs/estado e **nenhum** vazamento de listeners em trocas de workspace.
- Retrocompatibilidade: ler `state.json` v2 (workflows) e migrar para v3 (workspaces) sem perda (FR-053).
- Rodar offline; assets vendored; sem novos frameworks pesados.
- Segundo plano respeitar limite LRU N (padrão 3) configurável (FR-054) com semântica de pausa = encerrar/relançar + resume (Clarificação Q3/Q5).
- Comunicação entre agentes só entre nós conectados e com registro visível (FR-034/FR-035/FR-036/FR-055).

**Scale/Scope**: Delta amplo sobre app existente (~11 stories). Nós por workspace tipicamente < 30; dezenas de workspaces; 3 agentes CLI como alvos de 1ª classe; arquivos `.maestri` autocontidos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

O arquivo `.specify/memory/constitution.md` do projeto é o **template não ratificado** (placeholders); não há princípios vinculantes registrados. Como default, este plano segue os princípios implícitos consolidados nas features 001–005 e reafirmados no `plan.md` da 005:
- **Simplicidade / sem bloat de frameworks**: extensão em Vanilla JS + assets vendored; nada de runtime pesado.
- **Isolamento no processo principal**: PTYs, agentes, git e sistema de arquivos vivem no main process; renderer é visualização/entrada.
- **Persistência JSON versionada** com migração explícita e retrocompatível.
- **Mensagens assíncronas `type`-tagueadas** num único canal (`msg`) como contrato entre main e renderer.

GATE: sem violações identificadas (decisões de complexidade justificadas na tabela *Complexity Tracking*). Re-checagem pós-design em **Fase 1**.

## Project Structure

### Documentation (this feature)

```text
specs/006-maestri-spatial-orchestration/
├── plan.md              # Este documento (/speckit-plan)
├── research.md          # Fase 0 — decisões técnicas (/speckit-plan)
├── data-model.md        # Fase 1 — schema v3, sidecars e migração (/speckit-plan)
├── quickstart.md        # Fase 1 — guia de uso (/speckit-plan)
├── contracts/           # Fase 1 — contratos IPC + skill CLI + formatos de arquivo
│   ├── ipc-events.md    # Mensagens main ⇄ renderer estendidas
│   ├── agent-skill.md   # Protocolo skill de comunicação entre agentes (CLI)
│   └── file-formats.md  # state.json v3, role.json, nota .md, .maestri, tema Ghostty
└── tasks.md             # Fase 2 (/speckit-tasks — NÃO criado aqui)
```

### Source Code (repository root)

```text
# Estrutura real selecionada: single Electron project, extensão do layout atual.

electron/
├── main.js                  # + handlers: workspace, agentes, notas, arquivos/git, import/export, maestri://
├── preload.cjs              # + exposições: dialog (dir/import/export), protocolo maestri, search index
├── terminal-manager.js      # dono do estado v3: workspaces, processos em background, agentes (spawn/resume), migração
├── workspace-registry.js    # NOVO — registry de workspaces (LRU N), snapshots de nós e processos por workspace
├── agent-cli.js             # NOVO — detecção/spawn/resume de claude/codex/opencode; injeção de responsabilidade
├── roles.js                 # NOVO — CRUD de responsabilidades e sincronização de role.json/CLAUDE.md/AGENTS.md
├── notes-store.js           # NOVO — persistência de notas .md (interna/projeto), watch externo
├── filetree-service.js      # NOVO — navegação fs, CRUD, git ops, diff, log/graph, search (Ctrl+P/“>”)
├── connectors/agent-comm.js # NOVO — ponte skill (agente→agente) e agente→nota/portal; registro de ações
└── state-migrate.js         # NOVO — migração v1→v2→v3 (workflows→workspaces)

public/
├── index.html               # + layout da barra lateral (workspaces), mini sidebar, Settings(Agentes)
├── styles.css               # + sidebar, notes, filetree, grupos, minimapa, docks, temas
├── vendor/                  # + codemirror5.*, marked.*, sanitize, temas ghostty JSON
└── js/
    ├── main.js              # orquestrador: sidebar, workspace switching, shortcuts globais novos
    ├── canvas.js            # + grupos, alinhar/distribuir, organizar (grade), snap, minimapa, elevar/acoplar
    ├── connections.js       # + estilos Corda/Circuito, abraçadeiras, inspeção por badge
    ├── terminal.js          # + spawn de agente CLI, temas, indicador de atenção, badges Ctrl
    ├── portals.js           # (base — reuso)
    ├── notes.js             # NOVO — NoteWidget (raw/rendered, imagens, renomear, encadeamento)
    ├── filetree.js          # NOVO — FileTreeWidget (lista/grade/diff/graph, git, editor, busca)
    ├── widgets/textdraw.js  # NOVO — TextWidget e DrawWidget leves
    ├── workspace-sidebar.js # NOVO — barra lateral, pastas/grupos, mini sidebar, atalhos
    └── settings.js          # NOVO — Configurações → Agentes (responsabilidades) e temas
```

**Structure Decision**: mantém-se **single Electron project** (como hoje). A complexidade cresce no main process em módulos por domínio (`roles`, `notes-store`, `filetree-service`, `workspace-registry`, `agent-cli`, `agent-comm`), preservando o desacoplamento main⇄renderer. No renderer, novos widgets seguem o padrão das classes `window.*` existentes (`TermWidget`/`WebPortalWidget`).

## Complexity Tracking

| Violação | Por que é necessária | Alternativa rejeitada porque |
|----------|----------------------|------------------------------|
| Registry de workspaces com processos PTY vivos em background (main process) | FR-008/FR-054: processos devem seguir vivos ao alternar workspaces, com limite LRU e pausa/retomada | Encerrar PTYs ao alternar (modelo atual 005) não atende multi-workspace em segundo plano; congelar com SIGSTOP retém memória e não libera recursos |
| Novo módulo `agent-cli.js` com detecção/spawn/injeção por agente (3 CLIs) | FR-011/FR-015: Claude Code/Codex/OpenCode são CLIs distintas com flags próprias | Assumir API única dos 3 agentes não é factível; cada um exige adaptador fino (menor acoplamento) |
| Editor embutido com CodeMirror 5 vendored | FR-031 exige realce, multicursor, autoclose, find/replace sem rede | Monaco é pesado (~MB) e complexo de vender; textarea cru não atende FR-031 |
| `.maestri` autocontido (JSON bundle) + notas/roles embutidos | FR-009/US10: portar workspace entre máquinas sem depender de paths locais | Zip binário complexo e opaco; bundle JSON mantém diffs legíveis e validação simples |

## Complexity Re-check (pós-Fase 1)

*GATE reavaliado após design.* Estrutura em módulos no main + widgets no renderer mantém os princípios de simplicidade e isolamento; nenhuma violação nova introduzida. Persistência v3 com migração explícita preserva retrocompatibilidade. **GATE: PASS.**
