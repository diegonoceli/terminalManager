# Data Model: Delta Maestri (state.json v3 e sidecars)

Evolução do modelo atual (`terminal-manager.js`, v2) para suportar Workspaces, agentes, notas, árvore de arquivos e conexões avançadas. Formatos de arquivo (role.json, nota .md, .maestri, tema Ghostty) detalhados em `contracts/file-formats.md`.

## 1. Entidade Root: AppState (v3)

```typescript
interface AppState {
  version: 3;
  activeWorkspaceId: string;
  workspaces: Workspace[];
  ui?: UiPrefs;                    // pastas/grupos, minimapa, canvas-bg, temas recentes
  settings?: AppSettings;          // backgroundKeepalive (N), notificações, syncInstrucoes
  roles?: Role[];                  // responsabilidades globais (Configurações → Agentes)
  // Migração: campos legados v2 não são preservados após conversão bem-sucedida
}
```

**Migração (v1→v2→v3)**: `electron/state-migrate.js`. `version<3` → cada `workflow` vira `Workspace` (FR-053). `activeWorkflowId` → `activeWorkspaceId`. Nós/geometria inalterados. Grava v3.

## 2. Workspace

Substitui o "Floor/Workflow" (1:1). Container de um projeto.

```typescript
interface Workspace {
  id: string;                       // "ws_xxxx"
  name: string;
  icon: string;                     // emoji/ícone p/ sidebar
  workingDir: string;               // diretório raiz do projeto (pode ser "" → usa $HOME)
  instructions?: WorkspaceInstructions;
  nodes: WorkspaceNode[];
  connections: ConnectionData[];
  groups: Group[];
  createdAt: string;
  updatedAt: string;
  lastActiveAt?: number;            // LRU de segundo plano (FR-054)
  runtime?: WorkspaceRuntime;       // só memória, não persiste processos
}

interface WorkspaceInstructions {
  source: "none" | "claude" | "agents" | "manual";
  syncBetween: boolean;             // sincronizar CLAUDE.md ⇄ AGENTS.md (FR-010)
  claudeMd?: string;                // conteúdo atual de CLAUDE.md
  agentsMd?: string;                // conteúdo atual de AGENTS.md
}

// Em memória (main process) — não serializado
interface WorkspaceRuntime {
  state: "active" | "background" | "paused";
  processes: Map<nodeId, PtySession>;  // PTYs vivos enquanto active/background
}
```

**Regras**:
- Workspace não pode ser excluído se for o único restante (herda regra atual do último floor).
- `workingDir` inválido/inacessível na abertura → flag `dirMissing:true` no broadcast; UI oferece religar (edge case do spec).
- Troca de workspace atualiza `lastActiveAt` e aplica política LRU (N = `settings.backgroundKeepalive`, padrão 3): o menos recente além do limite é **pausado** (PTYs encerrados; snapshot preservado).

## 3. Organização da barra lateral: Folder e SectionGroup

```typescript
interface SidebarStructure {
  folders: Folder[];          // agrupam workspaces
  sections: SectionGroup[];   // divisores de seção (ex.: Pessoal, Trabalho)
}

interface Folder { id: string; name: string; workspaceIds: string[]; }
interface SectionGroup { id: string; title: string; folderIds?: string[]; workspaceIds?: string[]; }
```

`ui.sidebar` persiste `{collapsed:boolean}` (mini sidebar = lista apenas de ícones dos workspaces, FR-004).

## 4. Entidade polimórfica: WorkspaceNode

Base comum (herda o modelo atual `x/y/width/height/title`), com `type` ampliado e novos campos:

```typescript
type NodeType =
  | "terminal" | "web-portal" | "device-portal" | "code-editor"   // existentes
  | "note" | "text" | "drawing" | "file-tree";                    // novos

interface BaseNode {
  id: string; type: NodeType;
  x: number; y: number; width: number; height: number;
  zIndex?: number;
  groupId?: string;              // grupo espacial (se contido)
  docked?: "left" | "right";     // painel acoplado fixo (FR-048)
}

// Terminal + agente
interface TerminalNode extends BaseNode {
  type: "terminal";
  cols?: number; rows?: number;
  style?: TerminalStyle;          // estendido com presets/ghostty (FR-050)
  themeName?: "dracula" | "catppuccin" | "nord" | "ghostty" | "custom";
  agent?: AgentSpec;              // claude | codex | opencode (FR-011)
  roleId?: string;                // responsabilidade atribuída (FR-013/014)
  icon?: string;                  // ícone do terminal (FR-012)
}

interface AgentSpec {
  kind: "claude" | "codex" | "opencode";
  sessionId?: string;             // p/ resume (FR-052)
  cwd: string;                    // workingDir do workspace
}

// Nota (FR-019..024)
interface NoteNode extends BaseNode {
  type: "note";
  filePath: string;               // absoluto ou relativo resolvido p/ o .md real
  internal: boolean;              // true = pasta interna do app; false = no projeto
  pinnedName?: boolean;           // nome fixado via "Renomear"
  view?: "raw" | "rendered";
}

// Texto / Desenho leves (FR-041)
interface TextNode extends BaseNode { type: "text"; content: string; fontSize?: number; color?: string; }
interface DrawingNode extends BaseNode {
  type: "drawing";
  strokes: Stroke[];              // { color, width, points: Array<{x,y}> }
  bgColor?: string;
}

// Árvore de Arquivos (FR-026..033)
interface FileTreeNode extends BaseNode {
  type: "file-tree";
  rootPath: string;               // workingDir do workspace
  view: "list" | "grid" | "diff" | "graph";
  activeFilePath?: string;        // arquivo aberto no editor embutido
  expanded?: Record<string, boolean>; // pastas abertas
}
```

Portais existentes (`web-portal`, `device-portal`, `code-editor`) permanecem conforme o data-model da feature 005.

## 5. Grupo espacial

```typescript
interface Group {
  id: string;
  name: string;              // frame nomeado
  nodeIds: string[];         // nós membros
  // bounding box derivada dos nós (não persistida como posição própria)
}
```

**Regras**: `Ctrl+G` cria (≥2 nós selecionados), `Ctrl+Shift+G` dissolve (remove `groupId` dos nós). Mover o cabeçalho do grupo move todos os membros (FR-043). Seleção clicada passa "pelo frame" sem atrapalhar nós internos.

## 6. ConnectionData (estendida)

```typescript
type ConnectionKind =
  | "node"              // ligação visual genérica (nós quaisquer)
  | "agent-agent"       // comunicação via skill (FR-034)
  | "agent-note"        // agente lê/edita nota (FR-035)
  | "agent-portal";     // agente controla navegador (FR-036)

interface ConnectionData {
  id: string;
  from: string;   // nó origem
  to: string;     // nó destino
  fromPort?: "left" | "right";
  toPort?: "left" | "right";
  style: "rope" | "circuit";       // FR-038
  bundleId?: string;               // abraçadeira/feixe (FR-039)
  log?: ActionLogEntry[];          // rastreabilidade (FR-055)
}
```

**Regras de validação** (herdadas + novas):
- `from !== to`; sem duplicidade por par; exclusão em cascata ao remover nó (base).
- `agent-agent`/`agent-note`/`agent-portal` exigem que ao menos um extremo seja `terminal` com `agent`.
- Remover um nó remove também as entradas de `log` associadas e o vínculo do feixe.
- `bundleId` agrupa 2+ conexões; desfazer o feixe preserva cada conexão individual.

## 7. Responsabilidade (Role)

```typescript
interface Role {
  id: string;
  name: string;            // ex.: "Líder", "Revisor"
  badgeColor: string;      // cor do badge
  instructions: string;    // instruções injetadas no agente (FR-014/015)
}
```

- **Armazenamento**: `settings.roles` (global) + **role.json sidecar** por projeto (`contracts/file-formats.md`) contendo as roles usadas naquele workspace (FR-016, viaja com o diretório).
- **Injeção**: ao spawnar o agente de um terminal com `roleId`, `agent-cli.js` envia as `instructions` como primeira mensagem da sessão (ver research §3).

## 8. Transições de estado

### Workspace runtime
```
active ──(troca p/ outro)──▶ background ──(excede N, LRU)──▶ paused (encerra PTYs)
  ▲                            │                                   │
  └──────── retorno ◀──────────┴──────── reactivar: spawn+resume ◀─┘
```

### Terminal node (processo)
```
creating → starting(agent) → running
                              ├── idle/waiting  → attention dot + notif (FR-017)
                              └── killed(pausa/fechar) → relaunch/resume ao reativar (FR-052/FR-054)
```

### Nota (arquivo)
```
internal(.md) ──"mover para o projeto"──▶ project(.md)   (FR-024)
delete node → remove .md (confirmação se project)          (FR-025)
external edit (fs.watch) → evento → renderer atualiza       (edge case)
```

## 9. Regras de validação transversais

1. **Nós**: `id` único por workspace; `x/y/width/height` numéricos (herdado).
2. **Workspace único**: não permitir excluir o último workspace ativo.
3. **Agentes**: `agent.kind` ∈ {claude, codex, opencode}; se binário não detectado → estado `agent_missing` no nó (edge case FR-011).
4. **Background**: número de workspaces `background+active` ≤ `backgroundKeepalive` (N). Pausa é ordem de `lastActiveAt` (mais antigo primeiro).
5. **Conexões**: validações da §6.
6. **Sidecar role.json**: se o arquivo do diretório divergir do estado em memória, o estado do diretório vence na abertura (é a fonte que viaja com o projeto); divergência é registrada em log/UI.
7. **`.maestri`**: import valida `app` e `version`; cria novo workspace (sufixo "(importado)") quando o id já existir.
