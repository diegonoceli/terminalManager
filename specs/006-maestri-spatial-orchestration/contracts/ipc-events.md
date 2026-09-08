# Contracts: IPC Messages (Delta Maestri)

Extensão do canal único `"msg"` (`preload.cjs` / `electron/main.js`). Mensagens JSON `type`-tagueadas. Tipos existentes da feature 005 permanecem válidos. Novos grupos abaixo.

## 1. Renderer ➔ Main

### Workspaces (barra lateral)
```typescript
// CRUD (substitui workflow_* ; migração mantém compat leitura)
interface WorkspaceCreateMessage { type: "workspace_create"; name: string; workingDir?: string; icon?: string; }
interface WorkspaceSwitchMessage   { type: "workspace_switch"; workspaceId: string; }  // FR-005/008
interface WorkspaceRenameMessage   { type: "workspace_rename"; workspaceId: string; name: string; icon?: string; }
interface WorkspaceUpdateDirMessage{ type: "workspace_set_dir"; workspaceId: string; workingDir: string; } // religar dir
interface WorkspaceDeleteMessage   { type: "workspace_delete"; workspaceId: string; }

// Organização da sidebar (FR-003/004)
interface SidebarFolderMessage  { type: "sidebar_folder"; action: "add"|"rename"|"delete"; id?: string; name?: string; workspaceIds?: string[]; }
interface SidebarSectionMessage { type: "sidebar_section"; action: "add"|"rename"|"delete"; id?: string; title?: string; }
interface SidebarCollapseMessage{ type: "sidebar_collapse"; collapsed: boolean; }

// Instruções CLAUDE.md/AGENTS.md (FR-010)
interface WorkspaceInstructionsMessage {
  type: "workspace_instructions";
  workspaceId: string;
  content?: { claudeMd?: string; agentsMd?: string };   // salvar manual
  syncBetween?: boolean;                                 // liga sincronização automática
}

// Import/Export .maestri (FR-009)
interface WorkspaceExportMessage { type: "workspace_export"; workspaceId: string; }
interface WorkspaceImportMessage { type: "workspace_import"; } // abre dialog de arquivo
```

### Agentes e responsabilidades
```typescript
interface AgentListRequest { type: "agent_list_request"; }                 // → agent_list (claude/codex/opencode detectados)
interface RolesSaveMessage   { type: "roles_save"; roles: Role[]; }         // Configurações → Agentes (FR-013)
interface RoleAssignMessage  { type: "role_assign"; nodeId: string; roleId: string | null; } // FR-014
interface AgentResumeToggle  { type: "agent_resume"; nodeId: string; sessionId?: string; }   // FR-052

// Indicador de atenção / notificações (FR-017)
interface AttentionPrefsMessage { type: "attention_prefs"; notifications: boolean; }

// Spawn de nó de terminal com agente (FR-011/012) — estende create_node
interface CreateTerminalAgentMessage {
  type: "create_node";
  node: { type: "terminal"; title: string; icon?: string; agent: AgentSpec; roleId?: string;
          x: number; y: number; width: number; height: number; };
}
```

### Notas (FR-019..025)
```typescript
interface NoteCreateMessage  { type: "note_create"; layout: { x:number; y:number; width?:number; height?:number; }; }
interface NoteContentMessage { type: "note_content"; nodeId: string; content: string; }       // debounce save
interface NoteMoveMessage    { type: "note_move"; nodeId: string; toProject: boolean; }        // FR-024
interface NotePinnedMessage  { type: "note_pinned"; nodeId: string; pinned: boolean; }         // FR-022
interface NoteDeleteMessage  { type: "remove_node"; id: string; confirmProject?: boolean; }    // FR-025
```

### Árvore de Arquivos, Git e busca (FR-026..033)
```typescript
interface FsReadDirMessage    { type: "fs_read_dir"; path: string; }               // list/expand
interface FsCrudMessage       { type: "fs_crud"; action: "create"|"rename"|"move"|"delete"; path: string; ... }
interface GitOpsMessage       { type: "git_ops"; action: "commit"|"pull"|"push"|"checkout"|"branch"|"merge"|"fetch"|"stash"|"status"|"branch_show"; ...; cwd: string; }
interface GitDiffMessage      { type: "git_diff"; cwd: string; file?: string; }    // uncommitted diff
interface GitGraphMessage     { type: "git_graph"; cwd: string; }                  // git log --graph
interface FileReadMessage     { type: "file_read"; path: string; }
interface FileWriteMessage    { type: "file_write"; path: string; content: string; }
interface FileSearchMessage   { type: "file_search"; cwd: string; query: string; byContent?: boolean; }
```

### Conexões avançadas (FR-037..039)
```typescript
interface ConnectionStyleMessage { type: "connection_style"; id: string; style: "rope"|"circuit"; }
interface ConnectionBundleMessage{ type: "connection_bundle"; action: "create"|"release"; connectionIds?: string[]; bundleId?: string; }
interface ConnectionInspectReq   { type: "connection_inspect"; nodeId: string; }   // → connection_inspect_result (com log FR-055)
```

### Canvas (FR-040..049)
```typescript
interface GroupMessage  { type: "group"; action: "create"|"dissolve"; nodeIds?: string[]; }
interface AlignMessage  { type: "align"; action: "align"|"distribute"|"arrange"; opts?: { axis?: "x"|"y"; mode?: string }; nodeIds: string[]; }
interface SnapPrefMsg   { type: "snap_pref"; enabled: boolean; }        // magnético sempre off; usa-se Ctrl no drag
interface DockMessage   { type: "dock_node"; nodeId: string; dock: "left"|"right"|null; }   // FR-048
interface ElevateMessage{ type: "elevate_node"; nodeId: string; }       // centralizar elevado
interface MinimapMessage{ type: "minimap_toggle"; }                     // FR-047 (estado local renderer)
```

### Temas, Settings e misc
```typescript
interface ThemeImportMessage { type: "theme_import_ghostty"; }                 // dialog *.json → FR-050
interface ThemeApplyMessage  { type: "theme_apply"; nodeId: string; themeName: string; custom?: object; }
interface SettingsSaveMessage{ type: "settings_save"; settings: AppSettings; } // backgroundKeepalive, notificações
```

## 2. Main ➔ Renderer

```typescript
// Broadcast de layout ampliado (substitui/estende layout v2)
interface LayoutBroadcastV3 {
  type: "layout";
  activeWorkspaceId: string;
  workspaces: Array<{ id: string; name: string; icon: string; workingDir: string; nodeCount: number; dirMissing?: boolean }>;
  sidebar?: SidebarStructure & { collapsed: boolean };
  nodes: WorkspaceNode[];          // do workspace ativo
  connections: ConnectionData[];
  groups: Group[];
  settings?: AppSettings;
  roles?: Role[];
}

// Agentes
interface AgentListBroadcast { type: "agent_list"; agents: Array<{ kind: "claude"|"codex"|"opencode"; available: boolean; version?: string }>; }

// Atenção (FR-017)
interface AttentionBroadcast { type: "attention"; nodeId: string; state: "waiting"|"done"; notify?: boolean; }
interface AttentionCleared   { type: "attention_cleared"; nodeId: string; }

// Notas
interface NoteUpdatedBroadcast { type: "note_updated"; nodeId: string; content: string; external?: boolean; }
interface NoteMovedBroadcast   { type: "note_moved"; nodeId: string; filePath: string; internal: boolean; }

// Árvore de arquivos / git / busca (respostas)
interface FsDirResultBroadcast { type: "fs_dir_result"; path: string; entries: FsEntry[]; }
interface GitResultBroadcast   { type: "git_result"; action: string; ok: boolean; data?: any; error?: string; }
interface FileSearchResultBcast{ type: "file_search_result"; query: string; byContent: boolean; matches: Array<{ path: string; line?: number }>; }

// Conexões
interface ConnectionInspectResult { type: "connection_inspect_result"; nodeId: string; connections: ConnectionData[]; }

// Workspace runtime (background/pause)
interface WorkspaceStateBroadcast { type: "workspace_state"; workspaceId: string; state: "active"|"background"|"paused"; note?: string; }

// Nó criado/removido (reuso de node_created/node_removed para tipos novos)
```

## 3. Notas de compatibilidade

- O renderer detecta a versão do broadcast (`layout` v3 traz `workspaces`/`activeWorkspaceId`; v2 trazia `workflows`/`activeWorkflowId`) para continuar funcionando durante a migração.
- `workspace_switch` não encerra PTYs do workspace anterior — apenas atualiza `workspace_state` (background) e troca a superfície ativa (FR-008/FR-054).

---

## 4. Notas de implementação (delta 006)

- Feixes/abraçadeiras (FR-039): agrupamento por sobreposição via **menu de contexto** da conexão (alternativa ao `Alt+drag`); `bundleId` compartilhado e visual `tie-bundle`.
- Duplicar nós: `Alt+clique` no cabeçalho (em vez de `Alt+arrastar`); usa snapshot `app.nodeData`.
- Badges de terminais: segurar `Ctrl` (~380 ms) exibe números; duplo `Ctrl` alterna números de **workspaces** na sidebar.
- `create_node` com `type:"terminal"` agora spawna PTY real (rota `manager.create`); portais/notas/texto/desenho/árvore usam `createNode`.
- `open_external` valida URL (fallback `https://`) e trata rejeição de `shell.openExternal`.
