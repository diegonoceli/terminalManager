# Implementation Plan: Restauração da Interatividade de Fios e Conexões entre Recursos Espaciais

**Branch**: `009-fix-connections-wire` | **Date**: 2026-09-08 | **Spec**: [specs/009-fix-connections-wire/spec.md](spec.md)

**Input**: Feature specification from `/specs/009-fix-connections-wire/spec.md`

## Summary

Corrigir a interatividade do traçado e estabelecimento de conexões entre nós no canvas espacial do Maestri. A causa raiz foi identificada como a ausência do método `_calculateBezier` em `ConnectionsManager`, invocado em `_updatePreview()` a cada `pointermove`, resultando em `TypeError: this._calculateBezier is not a function`. A solução restabelece o cálculo contínuo do fio provisório (`_calculatePath`), adiciona método de retrocompatibilidade, valida a detecção de nós destino em `_onPointerUp`, e garante redesenho reativo em 60fps sem erros no console.

---

## Technical Context

**Language/Version**: JavaScript (ES Modules, ECMAScript 2022+), Electron 31.7.7, Node.js 20+

**Primary Dependencies**: Electron, SVG nativo, DOM Pointer Events API (100% offline, zero dependências externas ou CDNs)

**Storage**: `state.json` gerenciado por `TerminalManager` no processo principal do Electron (persistência de nós, conexões e workspaces)

**Testing**: Verificação de sintaxe com `node -c`, execução automatizada com Electron headless para validação de eventos e console livre de erros

**Target Platform**: macOS (Apple Silicon & Intel), Windows, Linux (Desktop Electron)

**Project Type**: Desktop Application (Spatial UI & AI Agent Orchestrator)

**Performance Goals**: 60fps no arraste e renderização de curvas de conexões, latência <16ms na atualização do preview, tempo de persistência de conexão <30ms

**Constraints**: Operação estritamente offline, sem bibliotecas externas pesadas para grafos, coordenadas do mundo desacopladas da escala de zoom

**Scale/Scope**: Suporte a dezenas de nós simultâneos e centenas de cabos conectados com feixes (*bundles*) inteligentes

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Requisito | Status | Justificativa |
| :--- | :--- | :--- | :--- |
| **I. Arquitetura Desacoplada** | Módulos com escopo claro | PASS | `ConnectionsManager` encapsula a camada SVG `#connections-layer` e comunica via IPC/App Bridge |
| **II. Zero Dependências Externas em Runtime** | Operação 100% offline | PASS | Renderização vetorial SVG pura com funções matemáticas nativas |
| **III. Feedback Imediato e Acessibilidade** | Transições suaves e sem travamento | PASS | Pulso luminoso, cálculo sem bloqueio e cancelamento gracioso via Esc ou liberação fora de nós |
| **IV. Qualidade e Resiliência** | Zero exceções não tratadas no console | PASS | Resolução do `TypeError` e inclusão de fallbacks seguros |

---

## Project Structure

### Documentation (this feature)

```text
specs/009-fix-connections-wire/
├── spec.md              # Feature specification
├── plan.md              # Implementation plan (this file)
├── research.md          # Technical research & root cause diagnosis
├── data-model.md        # Data models (Connection, ActiveDrag, AnchorPoint)
├── quickstart.md        # Quickstart & manual verification steps
├── contracts/           # Interface contracts
│   └── ui-connections.md # ConnectionsManager API contract
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code

```text
public/
├── js/
│   ├── connections.js   # [MODIFY] ConnectionsManager: _calculateBezier alias & _updatePreview fix
│   ├── portals.js       # BasePortalWidget: connection ports listeners
│   ├── terminal.js      # TermWidget: connection ports listeners
│   └── main.js          # App & IPC bridge orchestration
└── styles.css           # .conn-preview-line, .conn-pulse, .conn-port styles
```

---

## Phase 0: Outline & Research

Consolidado em [research.md](research.md):
- **Causa Raiz**: Chamada de `this._calculateBezier(src, dst)` na linha 431 de `public/js/connections.js`.
- **Estratégia de Resolução**:
  1. Adicionar alias `_calculateBezier(src, dst)` delegando para `this._calculatePath(src, dst, { style: this.defaultStyle || "rope" })`.
  2. Ajustar `_updatePreview()` para chamar diretamente `this._calculatePath(src, dst, { style: this.defaultStyle || "rope" })`.
  3. Garantir que a detecção de destino em `_onPointerUp` verifique nós sem colidir com o nó de origem e dispare `sendCreateConnection`.

---

## Phase 1: Design & Contracts

- **Data Model**: Definido em [data-model.md](data-model.md).
- **Interface Contracts**: Definido em [contracts/ui-connections.md](contracts/ui-connections.md).
- **Guia de Testes**: Definido em [quickstart.md](quickstart.md).
- **Agent Context**: Atualizado em [AGENTS.md](../../AGENTS.md).

---

## Proposed Changes

### [Component: Spatial Connections Subsystem]

#### [MODIFY] `public/js/connections.js`
- Substituir `this._calculateBezier(src, dst)` por `this._calculatePath(src, dst, { style: this.defaultStyle || "rope" })` em `_updatePreview()`.
- Implementar o método `_calculateBezier(src, dst)` como delegação para `this._calculatePath(src, dst)`.
- Adicionar validação em `_onPointerUp` para garantir emissão correta de `sendCreateConnection` e cancelamento limpo do preview.

---

## Verification Plan

### Automated Tests
1. **Verificação de Sintaxe**:
   ```bash
   node -c public/js/connections.js
   ```
2. **Teste Headless com Electron**:
   - Iniciar simulação de arraste a partir da porta lateral de um nó.
   - Disparar `pointermove` com diferentes coordenadas.
   - Confirmar ausência total de `TypeError` no console.
   - Disparar `pointerup` sobre um segundo nó e validar criação do elemento SVG de conexão definitiva.

### Manual Verification
1. Executar `npm start`.
2. Arrastar a partir da porta lateral direita de um terminal ou web portal em direção a outro recurso.
3. Observar o traço azul acompanhando o cursor sem falhas.
4. Soltar sobre o nó de destino e observar o cabo fixado com pulso de luz azul.
