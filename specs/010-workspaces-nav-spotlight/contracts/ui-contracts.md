# Interface Contracts: Mini Barra Lateral, Editor, Fichários, Notas e Spotlight

**Feature**: `010-workspaces-nav-spotlight`
**Date**: 2026-09-08

---

## 1. Mensagens IPC (Renderer ⇄ Electron Main)

### 1.1. Gestão de Fichários (Binders)

| Mensagem | Direção | Payload | Descrição |
| :--- | :--- | :--- | :--- |
| `binder_create` | Renderer → Main | `{ type: "binder_create", title?: string, noteIds: string[], x: number, y: number }` | Cria um novo Fichário agrupando notas |
| `binder_created` | Main → Renderer | `{ type: "binder_created", node: BinderNode }` | Confirmação de criação |
| `binder_add_page` | Renderer → Main | `{ type: "binder_add_page", binderId: string, noteId: string }` | Adiciona nota ao topo da pilha |
| `binder_remove_page` | Renderer → Main | `{ type: "binder_remove_page", binderId: string, noteId: string, x: number, y: number }` | Extrai página como nota livre no canvas |
| `binder_reorder` | Renderer → Main | `{ type: "binder_reorder", binderId: string, pageIds: string[] }` | Reordena abas da pilha |
| `binder_uniform_color` | Renderer → Main | `{ type: "binder_uniform_color", binderId: string, color: string }` | Aplica cor uniforme a todas as páginas |

### 1.2. Imagens Inline em Notas

| Mensagem | Direção | Payload | Descrição |
| :--- | :--- | :--- | :--- |
| `note_save_image` | Renderer → Main | `{ type: "note_save_image", nodeId: string, bufferBase64: string, extension: string }` | Grava imagem colada em assets do workspace |
| `note_image_saved` | Main → Renderer | `{ type: "note_image_saved", nodeId: string, relativePath: string }` | Retorna o caminho para inserção no Markdown |

### 1.3. Acesso ao Editor Externo

| Mensagem | Direção | Payload | Descrição |
| :--- | :--- | :--- | :--- |
| `open_vscode` | Renderer → Main | `{ type: "open_vscode", path: string }` | Dispara abertura da pasta no VS Code/editor padrão |

### 1.4. Pastas e Grupos de Workspaces

| Mensagem | Direção | Payload | Descrição |
| :--- | :--- | :--- | :--- |
| `folder_create` | Renderer → Main | `{ type: "folder_create", name: string }` | Cria nova pasta de workspaces |
| `folder_delete` | Renderer → Main | `{ type: "folder_delete", folderId: string }` | Exclui pasta (move workspaces para raiz) |
| `folder_toggle` | Renderer → Main | `{ type: "folder_toggle", folderId: string, collapsed: boolean }` | Alterna estado recolhido/expandido |
| `group_create` | Renderer → Main | `{ type: "group_create", name: string }` | Cria divisor rotulado de seção |
| `group_delete` | Renderer → Main | `{ type: "group_delete", groupId: string }` | Remove divisor de seção |

### 1.5. Spotlight e Deep-Linking macOS

| Mensagem / Protocolo | Direção | Formato | Descrição |
| :--- | :--- | :--- | :--- |
| `maestri://open` | OS → Main | `maestri://open?workspace={wsId}&node={nodeId}` | Protocolo acionado ao clicar em resultado do Spotlight |
| `focus_node` | Main → Renderer | `{ type: "focus_node", workspaceId: string, nodeId: string }` | Comuta workspace e anima câmera até o nó |

---

## 2. Métodos e Eventos de UI do Renderer

### 2.1. `WorkspaceSidebar` (Mini Barra Lateral)
- `toggleMiniMode(enable: boolean)`: Alterna largura entre 48px e 260px.
- `_showTerminalsPopover(workspace, triggerEl)`: Renderiza menu popover com a lista de terminais após long-press (400ms).

### 2.2. `BinderWidget` (`public/js/widgets/binder.js`)
- `addPage(noteId)`: Incorpora nota à pilha de abas.
- `removePage(pageId, worldX, worldY)`: Desanexa aba e restaura post-it livre no canvas.
- `setActivePage(pageId)`: Folheia e exibe a página selecionada.
- `setUniformColor(color)`: Aplica estilo cromático em lote.
