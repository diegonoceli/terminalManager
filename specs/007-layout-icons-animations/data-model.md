# Data Model: Layout, Iconografia e Animações do Maestri

Este documento descreve as entidades visuais e estruturas de estado que suportam o novo layout, sistema de ícones e animações espaciais.

---

## 1. IconRegistry e Definições de Ícones

```typescript
type IconName =
  | "terminal"
  | "note"
  | "text"
  | "draw"
  | "file-tree"
  | "web"
  | "device"
  | "editor"
  | "plus"
  | "minus"
  | "maximize"
  | "minimize"
  | "zoom-in"
  | "zoom-out"
  | "fit"
  | "close"
  | "copy"
  | "focus"
  | "link"
  | "unlink"
  | "folder"
  | "folder-open"
  | "file"
  | "file-code"
  | "file-text"
  | "image"
  | "git-commit"
  | "git-branch"
  | "git-pull"
  | "git-push"
  | "git-merge"
  | "rotate"
  | "settings"
  | "more-vertical"
  | "chevron-left"
  | "chevron-right"
  | "chevron-down"
  | "external-link"
  | "loader"
  | "alert-circle";

interface IconOptions {
  size?: number; // padrão: 16
  strokeWidth?: number; // padrão: 1.5
  className?: string;
  color?: string; // padrão: "currentColor"
  ariaLabel?: string;
}

interface IconDefinition {
  name: IconName;
  viewBox: string; // "0 0 24 24"
  elements: string; // SVG paths/circles/lines com stroke-linecap/linejoin="round"
}
```

---

## 2. Estado da Barra Lateral e Mini-Sidebar

```typescript
interface SidebarState {
  collapsed: boolean; // true = mini sidebar (~48px)
  width: number; // padrão 240px
  hoverExpanded: boolean; // true quando o mouse passa sobre a mini sidebar
  folders: SidebarFolder[];
}

interface SidebarFolder {
  id: string;
  name: string;
  icon?: string;
  collapsed: boolean;
  workspaceIds: string[];
}
```

---

## 3. Estado Visual e Físico de Nós

```typescript
interface NodeVisualState {
  id: string;
  elevated: boolean; // nó trazido em destaque ao centro da viewport
  docked: "none" | "left" | "right"; // fixado em coluna lateral
  attention: boolean; // ponto vermelho pulsante ativo (agente ocioso aguardando)
  processing: boolean; // ícone loader girando (processo/pensamento em curso)
  highlightPulse: boolean; // pulso de realce ao receber dados
}
```

---

## 4. Perfil Físico de Conexões (Corda & Circuito)

```typescript
interface ConnectionRenderState {
  id: string;
  style: "rope" | "circuit";
  bundleId?: string; // id da abraçadeira associada
  pulseTimestamp?: number; // momento do último disparo de dados
  pulseActive: boolean;
  // Parâmetros de física elástica calculados dinamicamente
  sagDistance: number; // flecha do arco no estilo corda
  pathDefinition: string; // string 'd' do elemento <path>
}
```

---

## 5. Preferências de Animação e Acessibilidade

```typescript
interface MotionPreferences {
  reducedMotion: boolean; // ignora transições (duração 0ms)
  hardwareAccelerated: boolean;
  targetFPS: number; // 60
}
```
