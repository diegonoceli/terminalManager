# Implementation Plan: Ajuste da Seleção de Texto e Cópia nos Terminais

**Branch**: `004-terminal-selection-copy` | **Date**: 2026-09-07 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-terminal-selection-copy/spec.md`

## Summary

Corrigir o desalinhamento vertical e horizontal da seleção de texto nos terminais e habilitar a cópia de conteúdo para a área de transferência externa do sistema operacional. O desalinhamento ocorre porque o xterm calcula as linhas com base em coordenadas de tela sem compensar a transformação de escala (`scale(zoom)`) do contêiner `#world`. A correção intercepta `_mouseService.getCoords` e `_mouseService.getMouseReportCoords` recalculando as posições reais com base no fator de zoom. A cópia externa será viabilizada expondo os métodos nativos do `electron.clipboard` no preload bridge, interceptando atalhos de teclado (`Cmd+C` / `Ctrl+C` com seleção ativa) e refinando a ação do botão direito do mouse.

## Technical Context

**Language/Version**: JavaScript (ES Modules para Electron Main e Scripts, Scripts padrão de navegador para Frontend)
**Primary Dependencies**: Electron 31.7.7, xterm 5.5.0, @xterm/addon-fit 0.11.0, node-pty 1.1.0
**Storage**: `state.json` via Electron `userData` (já existente para persistência)
**Testing**: Verificação manual interativa (conforme `quickstart.md`) e validação estrutural de contratos
**Target Platform**: macOS (Darwin arm64/x64), Windows (x64), Linux
**Project Type**: Desktop application (Electron)
**Performance Goals**: Latência imperceptível (<16ms / 60fps) durante o cálculo de coordenadas de seleção e transferência instantânea para a área de transferência (<50ms)
**Constraints**: Sem dependências externas adicionais; compatibilidade total com o sistema de zoom/pan já existente no canvas
**Scale/Scope**: Múltiplos terminais simultâneos no canvas sem degradação de desempenho

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Simplicidade e Usabilidade: Mantida a arquitetura enxuta sem adicionar bibliotecas pesadas.
- Preservação do comportamento de processos: O atalho `Ctrl+C` sem seleção continua enviando `SIGINT` normalmente.
- Isolamento de contexto no Electron: `contextIsolation: true` preservado, expondo apenas funções seguras via `contextBridge` no `preload.cjs`.

## Project Structure

### Documentation (this feature)

```text
specs/004-terminal-selection-copy/
├── spec.md                  # Especificação da funcionalidade
├── checklists/
│   └── requirements.md      # Checklist de qualidade da especificação
├── plan.md                  # Este plano de implementação
├── research.md              # Pesquisa técnica e decisões de arquitetura
├── data-model.md            # Modelos de dados e interfaces
├── quickstart.md            # Guia de testes e validação
├── contracts/
│   └── terminal-events.md   # Contratos de eventos de teclado, mouse e clipboard
└── tasks.md                 # Tarefas detalhadas geradas na fase seguinte
```

### Source Code (repository root)

```text
electron/
├── preload.cjs              # Adição de clipboardWrite e clipboardRead ao appBridge
public/
├── js/
│   ├── terminal.js          # Compensação de zoom em getCoords do xterm e atalhos de cópia
│   └── main.js              # Tratamento de eventos globais de cópia
```

**Structure Decision**: Modificações pontuais em arquivos existentes (`electron/preload.cjs` e `public/js/terminal.js`), sem criar novas camadas desnecessárias ou quebrar os contratos vigentes.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Nenhuma violação detectada | Arquitetura minimalista seguindo o design do projeto | N/A |
