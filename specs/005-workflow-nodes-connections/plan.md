# Implementation Plan: Workflows Multi-Nós, Device Portals e Conexões Universais

**Branch**: `005-workflow-nodes-connections` | **Date**: 2026-09-08 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-workflow-nodes-connections/spec.md`

## Summary

Implementar a arquitetura completa de Workflows Espaciais com múltiplos nós no board (inspirada no modelo Maestri mostrado em `feature-device-portals.webp`), conexões universais por fios ("bolinhas") conectando terminais a qualquer tela do workflow, e a correção matemática definitiva do cálculo de seleção de texto e cópia para o clipboard no xterm.js sob canvas com zoom/pan.

## Technical Context

**Language/Version**: JavaScript (ES Modules no frontend e CommonJS/ESM no Electron/Node.js v20+)

**Primary Dependencies**:
- Electron 30+ (janela principal, processos nativos, `<webview>`, clipboard nativo)
- `node-pty` (gerenciamento de sessões de terminal e processos de shell PTY)
- `@xterm/xterm` (v5.3+) e `@xterm/addon-fit`

**Storage**: Arquivo de estado `state.json` com serialização JSON dos Workflows ("Floors"), nós espaciais e conexões.

**Testing**: Testes manuais integrados com múltiplos nós no canvas, testes de seleção em diferentes níveis de zoom (25% a 250%), teste de cópia para clipboard nativo do SO, teste de persistência e alternância de workflows.

**Target Platform**: macOS (Apple Silicon / Intel), Windows 10/11 e Linux desktop.

**Project Type**: Desktop Application (Electron + Vanilla JS Canvas/DOM).

**Performance Goals**:
- Mínimo de 50 FPS durante pan/zoom do canvas com até 12 nós simultâneos.
- 0 desvios verticais de linha na seleção do terminal em qualquer zoom.
- Tempo de restauração ao alternar workflows inferior a 1 segundo.

**Constraints**:
- Execução fluida sem quebra de IPC ou vazamento de listeners.
- Manter o suporte retrocompatível ao layout legado de terminais em `state.json`.

## Constitution Check

- Princípios de Simplicidade e Desacoplamento respeitados: o canvas espacial gerencia nós polimórficos de forma uniforme.
- O gerenciador de PTYs continua isolado no processo principal (`electron/terminal-manager.js`), comunicando-se via mensagens assíncronas com o renderer.
- Sem dependências pesadas adicionais de frameworks: mantém arquitetura ágil e nativa.

## Project Structure

### Documentation (this feature)

```text
specs/005-workflow-nodes-connections/
├── plan.md              # Este documento de planejamento de implementação
├── research.md          # Decisões de pesquisa técnica (Phase 0)
├── data-model.md        # Esquema de entidades e estado (Phase 1)
├── quickstart.md        # Guia rápido de uso (Phase 1)
├── contracts/           # Contratos de mensagens IPC (Phase 1)
└── checklists/          # Validação de qualidade da especificação
```

### Source Code Impact

```text
electron/
├── main.cjs             # Suporte a <webview>, handlers IPC de nós, workflows e VS Code
├── preload.cjs          # Exposição de clipboard nativo e ponte de mensagens
└── terminal-manager.js  # Gerenciamento de múltiplos workflows, nós persistidos e conexões

public/
├── index.html           # Toolbar com seletor de "Floors", botões de adicionar nós (+Web, +Device, +Editor)
├── css/style.css        # Estilos dos Device Portals (moldura Pixel/iPhone), Web Portals, conexões e toolbar
└── js/
    ├── canvas.js        # Engine de zoom e pan espacial
    ├── connections.js   # Conexões universais entre quaisquer nós, curvas bezier e animações de pulso
    ├── terminal.js      # Correção matemática de seleção/cópia (getCoords e _getMouseEventScrollAmount)
    ├── portals.js       # Classes de nós espaciais: WebPortalWidget, DevicePortalWidget e EditorWidget
    └── main.js          # Orquestrador de workflows, nós polimórficos, listeners e IPC
```

## Complexity Tracking

| Decisão | Por que é necessária | Alternativa rejeitada e motivo |
|---|---|---|
| `<webview>` para Web Portals | Permite carregar qualquer endereço web ou local sem restrições de headers `X-Frame-Options` ou CSP | `<iframe>` padrão: bloqueado por quase todos os serviços e sites externos |
| Interceptação dupla no xterm (`getCoords` + `_getMouseEventScrollAmount`) | `SelectionService` chama internamente a medição de scroll que causa autoscroll errático quando escalado | Tentar desativar o autoscroll do xterm degradaria a seleção de seleções longas que excedem a janela visível |
| Modelo de Workflows ("Floors") | O usuário precisa separar projetos (ex: 3 terminais + 1 editor vs 6 terminais + 1 web) | Manter tudo em uma única tela infinita sobrecarrega a visualização e consome recursos desnecessários |
