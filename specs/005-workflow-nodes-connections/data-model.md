# Data Model: Workflows Multi-Nós, Device Portals e Conexões Universais

## 1. Entidade Root: AppState

Persistida em `state.json` do sistema operacional (`~/Library/Application Support/terminal-manager/state.json` no macOS ou `%APPDATA%/terminal-manager/state.json` no Windows).

```typescript
interface AppState {
  version: number;
  activeWorkflowId: string;
  workflows: Workflow[];
  // Compatibilidade com versões legadas:
  terminals?: TerminalNodeConfig[];
  connections?: ConnectionData[];
}
```

---

## 2. Entidade Workflow ("Floor")

Representa um ambiente de trabalho espacial independente.

```typescript
interface Workflow {
  id: string; // Ex: "wf_1717281920"
  name: string; // Ex: "Fullstack Dev (3 Terminais + 1 VSCode)"
  createdAt: string;
  updatedAt: string;
  nodes: WorkflowNodeConfig[];
  connections: ConnectionData[];
}
```

---

## 3. Entidade Polimórfica: WorkflowNodeConfig

Representa qualquer cartão espacial presente no canvas.

```typescript
type NodeType = "terminal" | "web-portal" | "device-portal" | "code-editor";

interface BaseNodeConfig {
  id: string; // UUID ou "node_..."
  type: NodeType;
  title: string;
  x: number; // Posição X no mundo do canvas
  y: number; // Posição Y no mundo do canvas
  width: number; // Largura em pixels (espaço do mundo)
  height: number; // Altura em pixels (espaço do mundo)
  zIndex?: number;
}

// Nó de Terminal
interface TerminalNodeConfig extends BaseNodeConfig {
  type: "terminal";
  cols?: number;
  rows?: number;
  style?: TerminalStyle;
}

// Nó de Web Portal
interface WebPortalNodeConfig extends BaseNodeConfig {
  type: "web-portal";
  url: string; // Ex: "http://localhost:3000" ou "https://..."
  history?: string[];
  currentHistoryIndex?: number;
}

// Nó de Device Portal (Android / iPhone)
interface DevicePortalNodeConfig extends BaseNodeConfig {
  type: "device-portal";
  deviceModel: "pixel9" | "iphone17"; // Exibição da moldura
  url?: string; // URL da aplicação mobile/web em teste
  status: "connected" | "disconnected" | "offline";
  adbDevice?: string; // Identificador do dispositivo ADB quando detectado
  orientation: "portrait" | "landscape";
}

// Nó de Editor de Código / VS Code
interface CodeEditorNodeConfig extends BaseNodeConfig {
  type: "code-editor";
  projectPath: string; // Diretório raiz do projeto
  activeFilePath?: string; // Arquivo em visualização rápida
}

type WorkflowNodeConfig = 
  | TerminalNodeConfig 
  | WebPortalNodeConfig 
  | DevicePortalNodeConfig 
  | CodeEditorNodeConfig;
```

---

## 4. Entidade Universal Connection

Representa o fio de ligação entre nós quaisquer.

```typescript
interface ConnectionData {
  id: string; // Ex: "conn_a8f9c1"
  from: string; // ID do nó de origem (qualquer tipo)
  to: string; // ID do nó de destino (qualquer tipo)
  label?: string; // Rótulo opcional
  fromPort?: "left" | "right";
  toPort?: "left" | "right";
}
```

---

## 5. Regras de Validação e Transições de Estado

1. **Auto-Conexão**: O sistema não permite conexões onde `from === to`.
2. **Duplicidade**: Não são permitidas duas conexões idênticas com o mesmo `from` e `to`.
3. **Exclusão em Cascata**: Ao excluir qualquer nó de um workflow, todas as conexões em que `conn.from === nodeId || conn.to === nodeId` são removidas imediatamente.
4. **Troca de Workflow**: Ao alternar `activeWorkflowId`, todos os processos associados aos nós do workflow anterior são pausados ou mantidos em segundo plano, e a geometria do novo workflow é renderizada no canvas.
