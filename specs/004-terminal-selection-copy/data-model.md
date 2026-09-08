# Data Model: Terminal Selection & Clipboard

## Selection State (Frontend Memory)

O estado de seleção de texto é gerenciado em memória pelo emulador de terminal `xterm` e pelo widget de terminal (`TermWidget`):

```typescript
interface TerminalSelectionState {
  hasSelection: boolean;
  selectedText: string;
  bufferRange?: {
    start: { x: number; y: number };
    end: { x: number; y: number };
  };
}
```

- **`hasSelection`**: Booleano indicando se existe texto atualmente destacado no terminal (`this.term.hasSelection()`).
- **`selectedText`**: Sequência de texto pura correspondente às células selecionadas no buffer (`this.term.getSelection()`).
- **`bufferRange`**: Coordenadas baseadas em linha e coluna no buffer do xterm.

## Mouse Event Adjustment Parameters

Estrutura interna utilizada para ajustar as coordenadas do cursor durante eventos de seleção e clique:

```typescript
interface MouseAdjustmentContext {
  zoom: number;            // Fator de escala atual do canvas (ex: 1.0, 0.85, 1.25)
  elementRect: DOMRect;    // Bounding client rect do elemento do terminal
  originalEvent: MouseEvent;
  adjustedCoords: {
    clientX: number;       // Posição horizontal virtual calculada
    clientY: number;       // Posição vertical virtual calculada
  };
}
```

## Clipboard Bridge Interface

Contrato dos métodos de ponte expostos para o renderer pelo `electron/preload.cjs`:

```typescript
interface AppBridgeClipboard {
  clipboardWrite(text: string): void;
  clipboardRead(): string;
}
```
