# Research Findings: Seleção Precisa de Texto e Cópia nos Terminais

## Topic 1: Correção do Deslocamento Vertical e Horizontal da Seleção de Texto (Canvas Zoom)
- **Decision**: Interceptar e compensar as coordenadas de ponteiro nos métodos `getCoords` e `getMouseReportCoords` do serviço interno de mouse do xterm (`term._core._mouseService`). O cálculo ajusta o delta de coordenadas (`clientX - rect.left` e `clientY - rect.top`) dividindo pelo fator de escala atual do canvas (`app.canvas.zoom`) antes de repassar para o xterm.
- **Rationale**: O xterm calcula linhas e colunas através da fórmula `Math.ceil((clientY - rect.top) / cellHeight)`. No entanto, como o contêiner `#world` possui a transformação CSS `transform: translate(tx, ty) scale(zoom)`, o `rect = element.getBoundingClientRect()` e o `clientY` do evento do mouse estão em pixels escalados da tela, enquanto o `cellHeight` está em pixels CSS não escalados. Quando `zoom < 1.0` (ex: após `fitAll()` ou zoom out), a linha calculada fica acima da esperada; quando `zoom > 1.0`, fica abaixo. Dividir o deslocamento pelo fator de zoom restaura a proporção exata de 1:1 com o grid de células do terminal em qualquer nível de ampliação ou redução.
- **Alternatives considered**:
  - *Remover a transformação CSS `scale()` e redimensionar os elementos manualmente*: Descartado por ser computacionalmente muito caro e causar reflow de todo o layout do DOM e redimensionamento contínuo de buffers do PTY.
  - *Disparar eventos sintéticos com `initMouseEvent`*: Descartado porque navegadores modernos tratam MouseEvents como imutáveis e `isTrusted` pode causar comportamentos inconsistentes.
  - *Ajustar via CSS transform reverso no terminal*: Descartado por anular o efeito visual de zoom do canvas para os terminais.

## Topic 2: Integração com a Área de Transferência do Sistema Operacional (Clipboard)
- **Decision**: Expor métodos dedicados `clipboardWrite(text)` e `clipboardRead()` no `preload.cjs` usando o módulo `clipboard` nativo do Electron (`require("electron").clipboard`), mantendo fallback gracioso para a API Web `navigator.clipboard`.
- **Rationale**: Em navegadores e webviews Electron sem menu de aplicação padrão (`win.removeMenu()`), chamadas de cópia via atalhos podem ser bloqueadas ou sofrer restrições de foco/permissão de documento. O módulo nativo `electron.clipboard` opera diretamente no nível do sistema operacional (macOS pasteboard, Windows clipboard, X11/Wayland selection), garantindo que o texto copiado de um terminal esteja imediatamente disponível fora do aplicativo para qualquer programa.
- **Alternatives considered**:
  - *Usar apenas `navigator.clipboard.writeText`*: Descartado como solução única porque pode falhar silenciosamente se a janela perder o foco estrito no momento exato da chamada ou se não houver um gesto de usuário reconhecido nativamente pelo Chromium.
  - *Usar `document.execCommand('copy')` exclusivo*: Descartado por estar obsoleto e ter suporte inconsistente em ambientes sem seleção de DOM padrão (xterm renderiza via canvas ou buffers customizados).

## Topic 3: Gerenciamento dos Atalhos de Cópia e Conflito com SIGINT (`Ctrl+C`)
- **Decision**: Em `term.attachCustomKeyEventHandler`:
  - No macOS: Se `Cmd+C` for pressionado e houver seleção ativa (`term.hasSelection()`), copiar o texto selecionado e cancelar a propagação (`e.preventDefault()`, retornar `false`).
  - No Windows / Linux: Se `Ctrl+C` for pressionado:
    - Se houver texto selecionado (`term.hasSelection()`), copiar o texto para o clipboard e retornar `false` (impedindo o envio de `SIGINT`).
    - Se NÃO houver texto selecionado, retornar `true`, permitindo que o xterm envie `\x03` (SIGINT / cancelamento) ao processo PTY.
  - Suportar adicionalmente `Ctrl+Shift+C` universalmente como atalho explícito de cópia no terminal quando houver seleção.
- **Rationale**: Este é o padrão adotado pelos principais emuladores de terminal modernos (Windows Terminal, VS Code Integrated Terminal, Hyper, iTerm2). Ele resolve a frustração do usuário de não conseguir copiar sem perder a capacidade de cancelar comandos em execução.
- **Alternatives considered**:
  - *Sempre copiar no `Ctrl+C` sem permitir interrupção*: Inaceitável, pois impediria o usuário de cancelar processos travados ou encerrar scripts (`Ctrl+C`).
  - *Exigir atalhos não usuais (ex: `Alt+C`)*: Descartado por contrariar a convenção natural de uso de sistemas operacionais.

## Topic 4: Interação com Botão Direito do Mouse (Menu Contextual / Ação Rápida)
- **Decision**: Atualizar o evento `contextmenu` no `termHost`:
  - Se houver texto selecionado (`term.hasSelection()`), copiar a seleção para a área de transferência externa.
  - Se não houver texto selecionado, manter o comportamento existente de colar o conteúdo da área de transferência externa no terminal.
- **Rationale**: Segue a convenção consolidada do PuTTY e Windows Terminal ("Copy on right-click if selected, paste if unselected"), permitindo que o usuário copie rapidamente usando apenas o mouse com precisão.
- **Alternatives considered**:
  - *Exibir um menu popup HTML/CSS customizado*: Adiciona complexidade visual desnecessária para uma operação rápida, mas a arquitetura deixa a porta aberta caso menus adicionais sejam necessários no futuro.
