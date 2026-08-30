# maestri-like

Aplicativo **desktop** (Electron) com canvas espacial estilo Miro/Maestri: uma página infinita onde você posiciona vários terminais **reais** (PTY), cada um com nome preso acima, navega com zoom/pan e personaliza cores, fundo e fonte de cada terminal.

## Executar

```bash
npm install        # instala dependências (node-pty, electron) e baixa o xterm.js
npm start          # abre o app numa janela nativa do Electron
```

## Gerar o .app instalável / DMG

```bash
npm run dist       # gera dist/mac-arm64/maestri-like.app e dist/maestri-like-1.0.0-arm64.dmg
```

Ou copie `dist/mac-arm64/maestri-like.app` direto para `~/Applications`.

## Uso

| Ação | Como |
| --- | --- |
| Pan (navegar) | arrastar no espaço vazio do canvas |
| Zoom | scroll do mouse / `Cmd/Ctrl +` e `Cmd/Ctrl −` |
| Zoom 1:1 | `Cmd/Ctrl 0` |
| Ver tudo (fit) | `V` |
| Centralizar em (0,0) | `C` |
| Novo terminal | botão **+ Novo terminal** ou `Cmd/Ctrl N` |
| **Nome preso acima** | clicar em **✎** ou no painel ⚙; o nome fica fixo na barra de cada terminal |
| **Fundo, cores, fonte** | botão **⚙** na barra do terminal: tema (Escuro/Claro/Verde/Azul/Âmbar), cor de fundo, texto, cursor, barra de título e tamanho da fonte |
| Fundo do canvas | seletor **Fundo** na toolbar (persiste entre sessões) |
| Mover terminal | arrastar pela barra de título |
| Redimensionar | arrastar a alça no canto inferior direito |
| Fechar | botão ✕ na barra de título |

Todas as configurações (posição, tamanho, nome e estilo de cada terminal) são persistidas em `~/Library/Application Support/maestri-like/state.json` e restauradas ao reabrir o app.

## Arquitetura

```
electron/main.js             processo principal (janela + IPC + gerenciador de PTYs)
electron/preload.cjs         ponte segura renderer ↔ main
electron/terminal-manager.js PTYs e persistência do layout/estilo
public/                      frontend (canvas, widgets xterm, painel de configurações)
public/js/canvas.js          engine de pan/zoom
public/js/terminal.js        widget de terminal (xterm.js) + personalização
public/js/main.js            integração, toolbar, atalhos
scripts/                     fetch do xterm e permissões do node-pty
build/icon.icns              ícone do app
```

## Protocolo interno (IPC)

- `create`, `input`, `resize`, `move`, `rename`, `kill` — controle do terminal
- `style` — personalização (`{ bg, fg, cursor, cursorAccent, titlebar, titlebarText, fontSize }`)
- Eventos do main: `layout`, `created`, `output`, `moved`, `renamed`, `styled`, `killed`, `exited`

O frontend também funciona servido via HTTP (fallback WebSocket) se `window.appBridge` não existir, útil para depurar no navegador.
