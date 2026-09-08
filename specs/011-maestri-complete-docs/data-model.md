# Data Model: Plataforma Maestri

**Feature**: `011-maestri-complete-docs`
**Date**: 2026-09-08
**Status**: Completed

Este documento especifica o modelo de entidades, estruturas de dados, regras de validação e diagramas de relacionamento para todas as funcionalidades da plataforma Maestri.

---

## 1. Diagrama Entidade-Relacionamento

```mermaid
erDiagram
    Workspace ||--o{ Floor : contains
    Workspace ||--o{ Folder : organizes
    Workspace ||--o{ GroupDivider : organizes
    Floor ||--o{ CanvasNode : places
    Floor ||--o{ GroupFrame : groups
    Floor ||--o{ Connection : links
    Floor ||--o{ CableTie : bundles
    
    CanvasNode <|-- TerminalNode : specializes
    CanvasNode <|-- NoteNode : specializes
    CanvasNode <|-- FileTreeNode : specializes
    CanvasNode <|-- PortalNode : specializes
    CanvasNode <|-- TextNode : specializes
    CanvasNode <|-- DrawingNode : specializes
    
    TerminalNode ||--o| Role : assigns
    TerminalNode ||--o| PromptDraft : holds
    Connection }o--o{ CableTie : routed_through
```

---

## 2. Especificação das Entidades

### 2.1 Workspace
Entidade raiz representando um projeto ou repositório.

| Campo | Tipo | Descrição | Regras de Validação |
| :--- | :--- | :--- | :--- |
| `id` | `string` (UUID) | Identificador único do workspace | Obrigatório, imutável |
| `name` | `string` | Nome de exibição do projeto | Obrigatório, 1 a 64 caracteres |
| `workingDir` | `string` | Caminho absoluto da pasta raiz | Obrigatório, diretório deve existir |
| `icon` | `string` | Identificador de ícone ou emoji | Obrigatório, fallback para ícone de pasta |
| `syncClaudeAgents` | `boolean` | Sincronização automática `CLAUDE.md` ↔ `AGENTS.md` | Padrão: `false` |
| `folderId` | `string?` | ID da pasta da barra lateral onde está alocado | Opcional |
| `groupId` | `string?` | ID da seção divisora da barra lateral | Opcional |
| `activeFloorId` | `string` | ID do andar atualmente selecionado | Obrigatório |
| `createdAt` | `string` (ISO 8601) | Timestamp de criação | Obrigatório |

---

### 2.2 Floor (Andar)
Ambiente de branch isolado associado a um workspace.

| Campo | Tipo | Descrição | Regras de Validação |
| :--- | :--- | :--- | :--- |
| `id` | `string` (UUID) | Identificador único do andar | Obrigatório |
| `workspaceId` | `string` | Referência ao workspace pai | Obrigatório |
| `name` | `string` | Nome do andar (ex: "Corrigir bug de login") | Obrigatório |
| `branchName` | `string` | Nome da branch Git associada | Obrigatório, formato de branch válido |
| `floorPath` | `string` | Caminho do clone em `.maestri/floors/` | Obrigatório se não for o Térreo |
| `isGroundFloor` | `boolean` | Indica se é o andar base (repositório original) | Exatamente um por workspace |
| `canvasTransform` | `object` | Coordenadas `{ x, y, zoom }` da câmera | Padrão `{ x: 0, y: 0, zoom: 1 }` |
| `hooks` | `object` | Configuração de hooks `{ setup: [], run: [], teardown: [] }` | Comandos válidos de shell |

---

### 2.3 CanvasNode (Entidade Base)
Elemento gráfico posicionado no canvas 2D de um andar.

| Campo | Tipo | Descrição | Regras de Validação |
| :--- | :--- | :--- | :--- |
| `id` | `string` (UUID) | Identificador único do nó | Obrigatório |
| `floorId` | `string` | Andar no qual o nó reside | Obrigatório |
| `type` | `enum` | `'terminal' \| 'note' \| 'file_tree' \| 'portal' \| 'text' \| 'drawing'` | Obrigatório |
| `x` | `number` | Coordenada X no plano espacial | Alinhado a grade de 20pt ao soltar |
| `y` | `number` | Coordenada Y no plano espacial | Alinhado a grade de 20pt ao soltar |
| `width` | `number` | Largura do nó em pixels | Mínimo 160px |
| `height` | `number` | Altura do nó em pixels | Mínimo 120px |
| `zIndex` | `number` | Ordem de empilhamento no canvas | Inteiro não negativo |
| `isElevated` | `boolean` | Indica se o nó está elevado ao centro | Padrão `false` |
| `isDocked` | `enum?` | `'left' \| 'right' \| null` (coluna fixa) | Padrão `null` |
| `groupFrameId` | `string?` | ID do grupo ao qual o nó pertence | Opcional |

---

### 2.4 GroupFrame
Container delimitador que agrupa dois ou mais nós com um cabeçalho arrastável.

| Campo | Tipo | Descrição | Regras de Validação |
| :--- | :--- | :--- | :--- |
| `id` | `string` (UUID) | Identificador único do grupo | Obrigatório |
| `floorId` | `string` | Andar de residência do grupo | Obrigatório |
| `title` | `string` | Título do cabeçalho do grupo | Padrão: "Grupo N", editável |
| `memberNodeIds` | `string[]` | Lista de IDs dos nós pertencentes | Mínimo 2 nós; dissolve se < 2 |
| `bounds` | `object` | `{ x, y, width, height }` computado com padding de 24px | Atualizado dinamicamente |

---

### 2.5 TerminalNode (Especialização de CanvasNode)
Terminal interativo com agente de IA e shell PTY.

| Campo | Tipo | Descrição | Regras de Validação |
| :--- | :--- | :--- | :--- |
| `ptySessionId` | `string` | Identificador do processo PTY no backend | Ativo enquanto o app roda |
| `name` | `string` | Nome atribuído ao terminal (ex: "Claude Dev") | Padrão: "Terminal N" |
| `icon` | `string` | Ícone do cabeçalho | Padrão: terminal |
| `roleId` | `string?` | ID da responsabilidade associada | Opcional |
| `theme` | `string` | Nome do tema de cores (iTerm2 / Ghostty) | Padrão: "system" |
| `hasAttention` | `boolean` | Flag de ponto vermelho de atenção | `true` se saída cessar aguardando input |
| `attentionReason` | `string?` | Causa do alerta (ex: "turn_completed", "prompt_approval") | Opcional |

---

### 2.6 Role (Responsabilidade de Agente)
Especificação de comportamento gravada no sidecar `role.json`.

| Campo | Tipo | Descrição | Regras de Validação |
| :--- | :--- | :--- | :--- |
| `id` | `string` | Identificador slug da responsabilidade | Obrigatório, alfanumérico com hífens |
| `name` | `string` | Nome amigável (ex: "Líder", "Revisor") | Obrigatório, 1 a 32 caracteres |
| `badgeColor` | `string` (Hex) | Cor de destaque da tag | Hexadecimal `#RRGGBB` válido |
| `prompt` | `string` | Instrução de sistema a ser injetada | Texto livre não vazio |
| `isDiscovered` | `boolean` | Se foi importado de um arquivo `role.json` do projeto | Padrão `false` |

---

### 2.7 NoteNode (Especialização de CanvasNode)
Post-it de notas com arquivo Markdown no disco.

| Campo | Tipo | Descrição | Regras de Validação |
| :--- | :--- | :--- | :--- |
| `filePath` | `string` | Caminho do arquivo `.md` no disco | Obrigatório |
| `isCustomPath` | `boolean` | Se o arquivo foi movido para fora da pasta interna | Padrão: `false` |
| `isRawMode` | `boolean` | Modo de edição atual (`true` = Raw, `false` = Formatada) | Padrão: `false` |
| `customName` | `string?` | Nome fixado manualmente pelo usuário | Se `null`, deriva da 1ª linha |
| `inlineAssets` | `string[]` | Lista de caminhos de imagens anexadas | Validados na pasta de assets |

---

### 2.8 Connection e CableTie
Conexão física e abraçadeira visual entre nós do canvas.

#### Connection:
| Campo | Tipo | Descrição | Regras de Validação |
| :--- | :--- | :--- | :--- |
| `id` | `string` (UUID) | Identificador da conexão | Obrigatório |
| `floorId` | `string` | Andar onde a conexão é exibida | Obrigatório |
| `sourceNodeId` | `string` | ID do nó de origem | Deve existir no mesmo andar ou referência |
| `targetNodeId` | `string` | ID do nó de destino | Deve existir |
| `style` | `enum` | `'rope' \| 'circuit'` | Padrão: `'rope'` |

#### CableTie:
| Campo | Tipo | Descrição | Regras de Validação |
| :--- | :--- | :--- | :--- |
| `id` | `string` (UUID) | Identificador da abraçadeira | Obrigatório |
| `floorId` | `string` | Andar de exibição | Obrigatório |
| `connectionIds` | `string[]` | IDs dos cabos que passam pelo feixe | Mínimo 2 cabos |
| `positionRatio` | `number` | Posição normalizada ao longo do comprimento (0.0 a 1.0) | Padrão: `0.5` |

---

### 2.9 FileTreeNode (Especialização de CanvasNode)
Gerenciador de arquivos e editor integrado embutido no canvas.

| Campo | Tipo | Descrição | Regras de Validação |
| :--- | :--- | :--- | :--- |
| `rootPath` | `string` | Diretório raiz exibido no nó | Obrigatório, diretório existente |
| `viewMode` | `enum` | `'list' \| 'grid' \| 'diff' \| 'graph'` | Padrão: `'list'` |
| `expandedDirs` | `string[]` | Lista de subpastas expandidas | Lista de caminhos relativos |
| `editorOpen` | `boolean` | Se o painel de editor de código está visível | Padrão: `false` |
| `activeFile` | `string?` | Caminho do arquivo atualmente aberto no editor | Opcional |

---

### 2.10 PortalNode (Especialização de CanvasNode)
Janela de navegador web ou emulador de dispositivo móvel.

| Campo | Tipo | Descrição | Regras de Validação |
| :--- | :--- | :--- | :--- |
| `portalType` | `enum` | `'web' \| 'device'` | Obrigatório |
| `url` | `string?` | URL da página web (para portais web) | Obrigatório se `portalType == 'web'` |
| `sessionGroupId` | `string?` | ID de sessão compartilhada de cookies | Se conectado a outro portal |
| `deviceType` | `enum?` | `'ios_simulator' \| 'android_emulator' \| 'android_physical'` | Obrigatório se `device` |
| `deviceId` | `string?` | UDID do simulador ou serial do dispositivo | Obrigatório se `device` |
| `orientation` | `enum` | `'portrait' \| 'landscape'` | Padrão: `'portrait'` |

---

### 2.11 PromptDraft
Rascunho persistente de prompt associado a um terminal específico.

| Campo | Tipo | Descrição | Regras de Validação |
| :--- | :--- | :--- | :--- |
| `terminalId` | `string` | ID do terminal associado | Chave primária |
| `text` | `string` | Texto bruto digitado | Pode conter menções `@` |
| `pills` | `object[]` | Array de metadados das entidades mencionadas | Nós, arquivos, portais, ações |
| `updatedAt` | `string` (ISO 8601) | Timestamp da última digitação | Persistido com debounce de 300ms |

