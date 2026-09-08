# Terminal Events & Clipboard Contracts

## 1. Electron Preload Bridge Contract (`window.appBridge`)

### `clipboardWrite(text: string): void`
- **Descrição**: Copia o texto fornecido diretamente para a área de transferência nativa do sistema operacional.
- **Entrada**: `text` (string). Se não for string, a operação é ignorada silenciosamente.
- **Implementação**: `clipboard.writeText(text)` do Electron.

### `clipboardRead(): string`
- **Descrição**: Lê o texto atual armazenado na área de transferência nativa do sistema operacional.
- **Retorno**: `string` contendo o conteúdo textual da área de transferência, ou string vazia caso não haja texto disponível.
- **Implementação**: `clipboard.readText()` do Electron.

---

## 2. Keyboard Event Contract (`attachCustomKeyEventHandler`)

| Tecla / Combinação | Plataforma | Condição | Ação | Retorno |
| :--- | :--- | :--- | :--- | :--- |
| `Cmd + C` | macOS | `term.hasSelection() === true` | Copia `term.getSelection()` para o clipboard do SO | `false` (previne ação padrão) |
| `Cmd + C` | macOS | `term.hasSelection() === false` | Nenhuma ação (mantém estado) | `false` |
| `Ctrl + C` | Windows/Linux | `term.hasSelection() === true` | Copia `term.getSelection()` para o clipboard do SO | `false` (bloqueia envio de `\x03`) |
| `Ctrl + C` | Windows/Linux | `term.hasSelection() === false` | Nenhuma interceptação | `true` (xterm envia `\x03` / SIGINT) |
| `Ctrl + Shift + C` | Todas | `term.hasSelection() === true` | Copia `term.getSelection()` para o clipboard do SO | `false` |
| `Cmd + V` / `Ctrl + V` | Todas | Qualquer | Cola texto do clipboard | `false` (já existente) |

---

## 3. Mouse Interaction Contract (`contextmenu` & Selection)

### Seleção de Texto (Mouse Drag / Double Click / Triple Click)
- O sistema intercepta o cálculo de coordenadas do xterm (`getCoords`).
- **Fórmula de Compensação**:
  $$\text{clientX}_{\text{unscaled}} = \text{rect.left} + \frac{\text{event.clientX} - \text{rect.left}}{\text{zoom}}$$
  $$\text{clientY}_{\text{unscaled}} = \text{rect.top} + \frac{\text{event.clientY} - \text{rect.top}}{\text{zoom}}$$
- O xterm recebe as coordenadas virtuais não escaladas, garantindo alinhamento de 100% com as células visuais.

### Botão Direito do Mouse (`contextmenu` no `termHost`)
- **Se `term.hasSelection() === true`**:
  - Copia o texto selecionado para a área de transferência do SO.
  - Não cola por cima.
- **Se `term.hasSelection() === false`**:
  - Lê o texto da área de transferência do SO e insere no terminal ativo (comportamento de colagem rápida existente).
