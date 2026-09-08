# Research: Workflows Multi-Nós, Device Portals e Correção de Seleção/Cópia no Terminal

## 1. Correção Definitiva da Seleção de Texto e Cópia no Terminal

### Contexto do Problema
No xterm.js sob canvas com CSS transform (`scale(zoom)` e `translate(tx, ty)`), a seleção de texto com o mouse apresentava saltos de linha ("pegando linhas a mais ou a menos") e a cópia para fora falhava.

### Investigação Técnica do xterm.js
1. `this.term._core._mouseService.getCoords` calcula as coordenadas da célula de texto a partir de `e.clientX` e `e.clientY`.
2. Durante a seleção com clique-e-arraste, `SelectionService._handleMouseMove` chama internamente `_getMouseEventScrollAmount(e)`.
3. `_getMouseEventScrollAmount(e)` invoca diretamente `getCoordsRelativeToElement(window, e, this._screenElement)[1]`, ignorando o zoom do canvas se apenas `mouseService.getCoords` for interceptado.
4. Quando `zoom !== 1`, `_getMouseEventScrollAmount` calcula uma distância incorreta em relação ao canvas não escalado, definindo `_dragScrollAmount != 0` mesmo com o cursor dentro do terminal. Isso ativa o timer de autoscroll a cada 50ms e força `selectionEnd[0]` para 0 ou `cols`, gerando o salto contínuo de linhas na seleção.

### Decisão
- Interceptar e compensar matematicamente o zoom do canvas em ambos os pontos:
  1. `mouseService.getCoords`
  2. `selectionService._getMouseEventScrollAmount`
- Para cópia: interceptar `Cmd+C` / `Ctrl+C` e evento nativo `copy` de modo que, havendo seleção ativa (`term.hasSelection()`), o texto selecionado seja imediatamente enviado para `clipboard.writeText` do Electron (`window.appBridge.clipboardWrite`) com fallback seguro para `navigator.clipboard.writeText`. Quando não houver seleção, `Ctrl+C` continua enviando `\x03` (SIGINT) para o shell.

---

## 2. Device Portals e Web Portals no Board (Modelo Maestri)

### Contexto do Problema
O usuário requisitou a experiência do Maestri (`feature-device-portals.webp`), onde o board espacial contém não apenas terminais, mas portais de dispositivos (Android/Pixel, iPhone) e navegadores web com moldura visual completa e conexões por fios.

### Decisão
- Implementar uma arquitetura espacial extensível no canvas (`#world`):
  - **Nó de Terminal (`TermWidget`)**: shell interativo com PTY real.
  - **Nó de Web Portal (`WebPortalWidget`)**: janela de navegador com barra de endereços, botões de navegação e `<webview>` (tag nativa do Electron permitindo carregar qualquer site ou `localhost` sem restrições de cabeçalhos de iframe).
  - **Nó de Device Portal (`DevicePortalWidget`)**: moldura de smartphone (Pixel 9 / Android e iPhone) com status bar, visualização de viewport mobile, status de conexão ADB e barra de ferramentas de controle.
  - **Nó de Editor (`EditorWidget`)**: visualizador de arquivos do projeto com botão para abrir diretamente no VS Code nativo instalado na máquina.
- Todos os nós compartilham as mesmas capacidades espaciais: mover, redimensionar, focar ao clicar, alças de ancoragem de conexão e persistência.

---

## 3. Conexões Universais ("Bolinhas" / Wires)

### Contexto do Problema
As bolinhas anteriormente conectavam apenas terminais entre si. Agora devem conectar qualquer nó a qualquer outro nó (ex: Terminal conectado a Device Portal, Terminal conectado a Web Portal).

### Decisão
- Generalizar `ConnectionsManager` para operar sobre `app.nodes` (ou `app.widgets` com suporte polimórfico a qualquer tipo de nó).
- Cada nó expõe portas de conexão esquerda e direita (`.conn-port-left`, `.conn-port-right`).
- As conexões calculam curvas de Bezier suaves entre as bordas dos nós conectados.
- Ao detectar eventos de saída nos terminais (ex: servidor iniciado em `localhost:PORT`), os nós web ou device portals conectados são notificados para carregar/recarregar a URL automaticamente, emitindo pulsos visuais pela linha.

---

## 4. Workflows Multi-Ambiente ("Floors")

### Contexto do Problema
O usuário precisa salvar e alternar entre diferentes fluxos de trabalho (ex: "3 terminais + 1 editor" ou "6 terminais + 1 web portal").

### Decisão
- Adicionar o controle de "Floors" (Workflows) na barra superior do aplicativo.
- O modelo de dados em `state.json` é estruturado com uma lista de workflows:
  ```json
  {
    "activeWorkflowId": "wf_1",
    "workflows": [
      {
        "id": "wf_1",
        "name": "Fullstack Dev",
        "nodes": [...],
        "connections": [...]
      }
    ]
  }
  ```
- Ao selecionar um workflow, o canvas limpa os nós anteriores e instancia os nós e conexões daquele workflow preservando posições e configurações.
