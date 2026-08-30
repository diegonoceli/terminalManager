# terminal manager

Aplicativo **desktop** (Electron) com canvas espacial: uma página infinita onde você posiciona vários terminais **reais** (PTY), cada um com nome preso acima, navega com zoom/pan e personaliza cores, fundo e fonte de cada terminal.

## Requisitos

Apenas **Node.js** (que já inclui o npm) — [nodejs.org](https://nodejs.org).

Nada mais precisa ser instalado: o `node-pty` já vem com binários prontos (N-API) para macOS e Windows, então **nenhum compilador ou pacote do sistema é necessário**. Todos os comandos são via `npm`.

## Instalação

```bash
npm install   # instala dependências (node-pty, electron) e baixa o xterm.js
```

## Executar

```bash
npm start     # abre o app numa janela nativa do Electron
```

### Windows

- **Pelo código-fonte:** com o Node.js instalado, use `npm install && npm start` no `cmd`, PowerShell ou Git Bash.
- **Um clique:** dê dois cliques em `start.bat` — ele instala as dependências (se faltarem) e abre o app automaticamente.
- Os terminais abrem no shell padrão do Windows (`cmd.exe`).

### macOS / Linux

```bash
npm start
```

ou `./start.sh`.

## Gerar instalável / portátil

Em qualquer plataforma, `npm run dist` gera o pacote do sistema atual:

| Plataforma | Comando | Saída |
| --- | --- | --- |
| Windows | `npm run dist` | `dist/terminal-manager-1.0.0-portable.exe` (**portátil, roda sem instalar**) e `dist/terminal-manager-1.0.0-setup.exe` (instalador, opcional) |
| macOS | `npm run dist` | `dist/mac-arm64/terminal-manager.app` e `dist/terminal-manager-1.0.0-arm64.dmg` |

- **Windows — rodar sem instalar:** copie o `portable.exe` para qualquer pasta (até pendrive) e execute direto.
- **macOS — rodar sem instalar:** copie `dist/mac-arm64/terminal-manager.app` para `~/Applications`.

> No Windows o `portable.exe` dispensa o Node.js: é o app completo empacotado.

## Uso

| Ação | Como |
| --- | --- |
| Pan (navegar) | arrastar no espaço vazio do canvas |
| Zoom | scroll do mouse / `Cmd/Ctrl +` e `Cmd/Ctrl −` |
| Zoom 1:1 | `Cmd/Ctrl 0` |
| Ver tudo (fit) | `V` |
| Centralizar em (0,0) | `C` |
| Novo terminal | botão **+ Novo terminal** ou `Cmd/Ctrl N` |
| **Focar terminal ao clicar** | clicar em um terminal anima o canvas até centralizar ele visível no painel; o botão **Focar** na toolbar liga/desliga essa animação |
| **Nome preso acima** | clicar em **✎** ou no painel ⚙; o nome fica fixo na barra de cada terminal |
| **Fundo, cores, fonte** | botão **⚙** na barra do terminal: tema (Escuro/Claro/Verde/Azul/Âmbar), cor de fundo, texto, cursor, barra de título e tamanho da fonte |
| Fundo do canvas | seletor **Fundo** na toolbar (persiste entre sessões) |
| Mover terminal | arrastar pela barra de título |
| Redimensionar | arrastar a alça no canto inferior direito |
| Fechar | botão ✕ na barra de título |

Todas as configurações (posição, tamanho, nome e estilo de cada terminal) são persistidas em `state.json` e restauradas ao reabrir o app:

- macOS/Linux: `~/Library/Application Support/terminal-manager/state.json`
- Windows: `%APPDATA%/terminal-manager/state.json`

## Scripts npm

| Script | Descrição |
| --- | --- |
| `npm start` | abre o app numa janela nativa do Electron |
| `npm run dist` | empacota o app para a plataforma atual (Windows portátil/instalador ou macOS app/DMG) |
| `npm install` | `postinstall` baixa o xterm.js (`fetch-vendor.js`) e ajusta permissões do `node-pty` (`fix-pty-perms.js`) |

## Arquitetura

```
electron/main.js             processo principal (janela + IPC + gerenciador de PTYs)
electron/preload.cjs         ponte segura renderer ↔ main
electron/terminal-manager.js PTYs e persistência do layout/estilo (cross-platform: cmd.exe no Windows, $SHELL/zsh no macOS/Linux)
public/                      frontend (canvas, widgets xterm, painel de configurações)
public/js/canvas.js          engine de pan/zoom + animação de foco (animateTo)
public/js/terminal.js        widget de terminal (xterm.js) + personalização
public/js/main.js            integração, toolbar, atalhos, foco ao clicar
scripts/                     fetch do xterm, permissões do node-pty, ícones e assinatura ad-hoc
build/icon.icns              ícone do app (macOS)
build/icon.ico               ícone do app (Windows)
```

## Protocolo interno (IPC)

- `create`, `input`, `resize`, `move`, `rename`, `kill` — controle do terminal
- `style` — personalização (`{ bg, fg, cursor, cursorAccent, titlebar, titlebarText, fontSize }`)
- Eventos do main: `layout`, `created`, `output`, `moved`, `renamed`, `styled`, `killed`, `exited`

O frontend também funciona servido via HTTP (fallback WebSocket) se `window.appBridge` não existir, útil para depurar no navegador.
