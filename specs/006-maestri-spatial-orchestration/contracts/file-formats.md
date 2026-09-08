# Contracts: Formatos de Arquivo

## 1. state.json (v3)

Localização: `~/Library/Application Support/terminal-manager/state.json` (macOS) / `%APPDATA%/terminal-manager/state.json` (Windows).

```jsonc
{
  "version": 3,
  "activeWorkspaceId": "ws_ab12",
  "workspaces": [ /* data-model.md §2 */ ],
  "ui": { "sidebar": { "collapsed": false }, "folders": [], "sections": [] },
  "settings": { "backgroundKeepalive": 3, "attentionNotifications": true, "snapEnabled": false },
  "roles": [ /* responsabilidades globais */ ]
}
```

**Migração**: `state-migrate.js` converte v1/v2 (workflows) para v3 (workspaces). V2 lido é transformado em memória e regravado como v3.

## 2. role.json (sidecar por projeto)

Localização: `<workingDir>/.maestri/role.json` (criado sob demanda; viaja com o diretório — FR-016).

```jsonc
{
  "version": 1,
  "workspaceId": "ws_ab12",           // workspace que gravou por último
  "updatedAt": "2026-09-08T10:00:00Z",
  "roles": [
    { "id": "role_lead", "name": "Líder", "badgeColor": "#f59e0b",
      "instructions": "Você é o líder...", "usedInTerminals": ["node_x"] }
  ]
}
```

Regra de divergência: na abertura do workspace, se o `role.json` do diretório existir, ele é a fonte das roles daquele projeto (estado em memória se alinha ao arquivo).

## 3. Nota (arquivo .md)

- **Interna** (padrão): `<userData>/notes/<workspaceId>/<nodeId>.md`.
- **No projeto**: `<workingDir>/<caminho escolhido>.md`, com mapeamento `nodeId → filePath` no nó (`NoteNode.filePath`).
- Front matter opcional de controle (não interfere no render):
  ```md
  <!-- maestri: { "noteId": "node_x", "pinned": true, "title": "Nome fixo" } -->
  ```
- Título padrão = primeira linha do `.md` (FR-022). Imagens coladas viram arquivos `assets/` junto ao `.md` e são referenciadas por caminho relativo.
- Mudanças externas (fs.watch) disparam `note_updated {external:true}` (não sobrescreve edição externa).

## 4. Arquivo portável .maestri

Export/import autocontido (FR-009, research §9). Bundle JSON:

```jsonc
{
  "app": "maestri",
  "format": "maestri-bundle",
  "version": 1,
  "exportedAt": "2026-09-08T10:00:00Z",
  "workspaces": [
    {
      "id": "ws_ab12",
      "name": "Fullstack",
      "icon": "⚡",
      "nodes": [ /* WorkspaceNode[] — NoteNode.content embutido, DrawingNode.strokes */ ],
      "connections": [ /* ConnectionData[] */ ],
      "groups": [],
      "roles": [ /* roles usadas, espelho do role.json */ ],
      "notes": { "node_x.md": "conteúdo", "assets/node_x/img1.png": "<base64>" }
    }
  ]
}
```

Import: valida `app`/`format`/`version`; se `workspace.id` já existir, recria com sufixo "(importado)". Caminhos absolutos de `workingDir` são **não restaurados** (fica vazio → usuário religa).

## 5. Tema Ghostty (importação — FR-050)

Arquivo de tema no formato Ghostty (terminal-themes): JSON com chaves de cor hex.

```jsonc
// Ex.: base16-dracula.json (subset usado)
{
  "name": "Dracula",
  "background": "#282a36",
  "foreground": "#f8f8f2",
  "cursor": "#f8f8f2",
  "cursor_text": "#282a36",
  "selection_background": "#44475a",
  "palette": [ "#21222c", "#ff5555", "#50fa7b", "#f1fa8c", "#bd93f9", "#ff79c6", "#8be9fd", "#f8f8f2", "#6272a4", ... ]
}
```

Mapeamento → `TerminalStyle` atual (`bg, fg, cursor, cursorAccent, selBg, selFg, …`) no `terminal.js`. Presets embutidos (Dracula/Catppuccin/Nord) são objetos equivalentes incluídos no bundle.

## 6. Instruções CLAUDE.md / AGENTS.md

- Arquivos reais no `workingDir` (CLAUDE.md e/ou AGENTS.md).
- Edição pela UI do workspace grava o arquivo correspondente; com `syncBetween:true`, a escrita de um sincroniza o outro (FR-010) com escrita atômica (tmp+rename) para não corromper durante leitura de agentes.
