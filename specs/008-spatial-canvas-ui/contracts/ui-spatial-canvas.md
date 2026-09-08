# UI & Component Contracts: Maestri Spatial Canvas

**Feature**: `008-spatial-canvas-ui`  
**Date**: 2026-09-08  
**Status**: Complete

---

## 1. Design System Tokens (CSS Custom Properties)

```css
:root {
  /* Spatial Canvas Base */
  --canvas-bg: #090b10;
  --canvas-dot-color: rgba(255, 255, 255, 0.12);
  --canvas-dot-size: 1.2px;
  --canvas-grid-spacing: 24px;

  /* Liquid Glass Surface (macOS Dark) */
  --glass-bg: rgba(18, 22, 31, 0.72);
  --glass-bg-hover: rgba(26, 32, 44, 0.82);
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-border-focus: rgba(99, 102, 241, 0.65);
  --glass-blur: 24px;
  --glass-saturate: 180%;
  --glass-specular: inset 0 1px 1px 0 rgba(255, 255, 255, 0.15);
  --glass-shadow: 0 20px 50px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.06);
  --glass-radius: 18px;
  --glass-radius-pill: 9999px;

  /* macOS Traffic Light Colors */
  --traffic-close: #ff5f56;
  --traffic-minimize: #ffbd2e;
  --traffic-maximize: #27c93f;

  /* Typography & Accents */
  --fg-primary: #f3f4f6;
  --fg-secondary: #9ca3af;
  --accent-primary: #6366f1;
  --accent-glow: rgba(99, 102, 241, 0.35);
}
```

---

## 2. Component API Contracts

### A) `SpatialCanvas`
```typescript
interface SpatialCanvasConfig {
  viewport: HTMLElement;
  world: HTMLElement;
  grid: HTMLElement;
  initialZoom?: number;
  initialTx?: number;
  initialTy?: number;
}

interface CameraState {
  tx: number;
  ty: number;
  zoom: number;
}

class SpatialCanvas {
  constructor(config: SpatialCanvasConfig);
  apply(): void;
  setZoom(zoom: number, focalX?: number, focalY?: number): boolean;
  zoomAt(factor: number, focalX?: number, focalY?: number): void;
  panBy(dx: number, dy: number): void;
  panTo(worldX: number, worldY: number): void;
  animateTo(target: Partial<CameraState>, options?: { duration?: number }): Promise<void>;
  screenToWorld(sx: number, sy: number): { x: number; y: number };
  worldToScreen(wx: number, wy: number): { x: number; y: number };
}
```

### B) `FloatingDock`
```typescript
interface DockToolAction {
  id: string;
  label: string;
  iconSvg: string;
  shortcut?: string;
  onClick: (e: MouseEvent) => void;
}

class FloatingDock {
  constructor(container: HTMLElement, actions: DockToolAction[]);
  render(): HTMLElement;
  setActiveTool(toolId: string | null): void;
  updateStatus(status: { connected: boolean; workspaceName: string }): void;
  destroy(): void;
}
```

### C) `PromptComposer`
```typescript
interface PromptComposerEvents {
  onSubmit: (terminalId: string, text: string) => void;
  onDockChange: (isDocked: boolean) => void;
  onHeightChange: (height: number) => void;
}

class PromptComposer {
  constructor(options: { app: any; events: PromptComposerEvents });
  show(): void;
  hide(): void;
  attachTo(terminalNode: TermWidget): void;
  detach(): void;
  syncPosition(): void;
  clear(): void;
  focus(): void;
}
```

---

## 3. DOM & Interaction Contracts

### Drag Tactile Feedback
When a node starts moving:
- CSS class `.dragging` is added to the node container:
  ```css
  .widget.dragging {
    opacity: 0.88;
    transform: scale(1.015);
    box-shadow: 0 30px 60px -15px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(255, 255, 255, 0.2);
    transition: opacity 0.15s ease, transform 0.15s ease;
    cursor: grabbing !important;
  }
  ```

### Terminal Node Header Layout
```html
<div class="mac-titlebar">
  <div class="traffic-lights">
    <button class="tl-btn close" title="Fechar"></button>
    <button class="tl-btn minimize" title="Minimizar"></button>
    <button class="tl-btn maximize" title="Maximizar / Elevar"></button>
  </div>
  <div class="mac-title-content">
    <span class="agent-badge">Claude</span>
    <span class="title-text">terminal-1</span>
    <span class="attention-pulse hidden"></span>
  </div>
  <div class="mac-actions">
    <button class="action-btn rename" title="Renomear">✎</button>
    <button class="action-btn settings" title="Configurações">⚙</button>
  </div>
</div>
```
