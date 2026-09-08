# Contracts: IPC Messages & Node Events

## 1. Renderer ➔ Main Process

```typescript
// Gerenciamento de Workflows ("Floors")
interface WorkflowSwitchMessage {
  type: "workflow_switch";
  workflowId: string;
}

interface WorkflowCreateMessage {
  type: "workflow_create";
  name: string;
}

interface WorkflowRenameMessage {
  type: "workflow_rename";
  workflowId: string;
  name: string;
}

interface WorkflowDeleteMessage {
  type: "workflow_delete";
  workflowId: string;
}

// Criação de Nós Heterogêneos
interface CreateNodeMessage {
  type: "create_node";
  nodeType: "terminal" | "web-portal" | "device-portal" | "code-editor";
  layout?: {
    title?: string;
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    url?: string;
    deviceModel?: "pixel9" | "iphone17";
    projectPath?: string;
  };
}

// Atualização de Posição e Geometria do Nó
interface MoveNodeMessage {
  type: "move_node";
  id: string;
  x: number;
  y: number;
}

interface ResizeNodeMessage {
  type: "resize_node";
  id: string;
  width: number;
  height: number;
  cols?: number;
  rows?: number;
}

// Conexões Universais
interface CreateConnectionMessage {
  type: "create_connection";
  from: string; // ID de qualquer nó
  to: string;   // ID de qualquer nó
  label?: string;
}

interface RemoveConnectionMessage {
  type: "remove_connection";
  id: string;
}

// Ações Externas
interface OpenVSCodeMessage {
  type: "open_vscode";
  path: string;
}

interface OpenExternalMessage {
  type: "open_external";
  url: string;
}
```

---

## 2. Main Process ➔ Renderer

```typescript
// Envio do Estado Completo do Layout do Workflow Ativo
interface LayoutBroadcast {
  type: "layout";
  activeWorkflowId: string;
  workflows: Array<{ id: string; name: string }>;
  nodes: WorkflowNodeConfig[];
  connections: ConnectionData[];
}

// Notificação de Nó Criado
interface NodeCreatedBroadcast {
  type: "node_created";
  node: WorkflowNodeConfig;
}

// Notificação de Nó Removido
interface NodeRemovedBroadcast {
  type: "node_removed";
  id: string;
}

// Notificação de Conexão Criada/Removida
interface ConnectionCreatedBroadcast {
  type: "connection_created";
  connection: ConnectionData;
}

interface ConnectionRemovedBroadcast {
  type: "connection_removed";
  id: string;
}

// Saída de Dados do Terminal e Pulso
interface TerminalOutputBroadcast {
  type: "output";
  id: string;
  data: string;
}
```
