# Technical Research: Mini Sidebar, Acesso Rápido ao Editor, Notas Avançadas, Fichários e Spotlight

**Feature**: `010-workspaces-nav-spotlight`
**Date**: 2026-09-08

---

## 1. Mini Barra Lateral e Detecção de Long-Press

### Contexto
Quando a barra lateral está recolhida (~48px), ela deve exibir apenas os ícones dos workspaces em formato circular compacto. O usuário precisa de:
- Clique rápido (<400ms sem deslocamento): alternar workspace.
- Hover prolongado (>200ms): tooltip flutuante com nome do workspace e caminho da pasta de trabalho.
- Clique e segure (long-press ~400ms): abrir popover flutuante listando os terminais daquele workspace.
- Clique com botão direito: menu de contexto idêntico ao da barra completa.

### Decisão Técnica
- **Gestão de eventos na mini barra**:
  - No `pointerdown`, iniciar temporizador `this._longPressTimer = setTimeout(() => this._showTerminalsPopover(w, el), 400)`.
  - Registrar coordenadas iniciais `(startX, startY)`.
  - No `pointermove`, se a distância euclidiana $\Delta > 6\text{px}$, cancelar `clearTimeout(this._longPressTimer)` e permitir o arraste nativo de reordenação.
  - No `pointerup`, se o timer ainda não disparou, cancelar o timer e disparar a comutação normal `this.switchTo(w.id)`. Se o timer já disparou e abriu o popover, evitar o `switchTo`.
  - No `contextmenu`, prevenir default, cancelar timer de long-press e abrir `this._openCtx(e.clientX, e.clientY, w)`.

### Rationale
Garante responsividade imediata no clique simples sem atrasar a navegação, previne conflitos com drag-and-drop de workspaces e entrega acesso rápido aos terminais em exatamente 400ms.

---

## 2. Botão "Abrir no Editor" no Topo Direito

### Contexto
Um botão na toolbar superior direita permite abrir o diretório do workspace ativo diretamente no editor de código (VS Code, Cursor ou editor padrão).

### Decisão Técnica
- Adicionar o botão `#btn-open-editor` no canto direito da barra de ferramentas (`#toolbar .status`), com ícone de editor e rótulo "Abrir no Editor".
- Se `currentWorkspace().workingDir` estiver definido e a pasta existir no disco:
  - Disparar mensagem IPC `{ type: "open_vscode", path: workingDir }`. O backend em `electron/main.js` invoca `exec("code ...")` ou `shell.openPath(workingDir)`.
- Se `workingDir` estiver vazio:
  - Disparar `{ type: "dir_pick" }` para que o usuário escolha a pasta; ao confirmar, salvar o diretório no workspace e abrir o editor em seguida.

### Rationale
Aproveita a infraestrutura já existente de `open_vscode` no backend Electron, fornecendo UX sem atrito para desenvolvedores.

---

## 3. Arquitetura de Fichários (Binders) de Notas

### Contexto
Um Fichário condensa múltiplas notas em um único nó espacial com abas na lateral direita:
- Folhear páginas clicando nas abas laterais.
- Adicionar notas soltando-as sobre o Fichário (entram no topo).
- Extrair notas puxando a aba para fora em direção ao canvas livre.
- Reordenar páginas arrastando as abas verticalmente.
- Conectar agentes ao Fichário para ler todas as notas em bloco.
- Fichários com nome persistem vazios como colunas de Kanban (Backlog, Fazendo, Revisão, etc.); fichários anônimos dissolvem-se quando vazios.

### Decisão Técnica
- Criar a classe `BinderWidget` estendendo `BasePortalWidget` em `public/js/widgets/binder.js`.
- Estrutura do nó no canvas:
  - Header: ícone de fichário 📑, título ("Fichário" ou nome customizado), botões (Cor uniforme, Fechar).
  - Body: container central exibindo a nota/página atualmente ativa (renderizada em modo formatado ou raw).
  - Coluna de Abas (direita): `<div class="binder-tabs">`, onde cada aba representa uma nota contida (`data-page-id`), exibindo uma miniatura de cor e o título truncado da nota.
- **Detecção de Arraste**:
  - Drag-in: evento `pointerup` de uma nota livre sobre o elemento do Fichário dispara agrupamento (`binder.addPage(noteId)`).
  - Drag-out: `pointerdown` na aba e arraste além dos limites do fichário remove a página (`binder.removePage(pageId, worldPos)`), recriando a nota livre no canvas.
- **Persistência**: Entidade `binder` salva em `workspace.nodes` com `pages: [noteId1, noteId2, ...]`.
- **Agentes**: Ao receber `note_read` em um nó do tipo `binder`, o backend concatena o conteúdo de todas as notas filhas com separadores `--- [Título da Nota] ---`, permitindo que agentes naveguem pelo conjunto completo.

### Rationale
Mantém cada nota como arquivo markdown real independente no disco, mas condensa a representação visual no canvas, viabilizando workflows de tarefas estruturadas sem poluição visual.

---

## 4. Notas Markdown Avançadas (Imagens, Finder e ⌘W)

### Contexto
- Colar imagens inline (<kbd>Cmd+V</kbd>): salva como asset local, gera markdown `![img](...)` e renderiza na visualização formatada.
- Renomeação flexível: duplo-clique no cabeçalho ou menu; esvaziar restaura derivação da 1ª linha.
- Arraste do Finder: soltar arquivos `.md`/`.txt` no canvas cria notas externas mantendo o local original.
- Remoção rápida: atalho <kbd>⌘W</kbd> exclui a nota selecionada.

### Decisão Técnica
- **Paste de imagens**: Na `.note-area`, listener de `paste`. Se `event.clipboardData.items` contiver tipo de imagem (`image/png`, `image/jpeg`):
  - Converter para ArrayBuffer/Blob e enviar IPC `note_save_asset` para salvar em `userData/assets/{workspaceId}/{noteId}/image_{hash}.png`.
  - Inserir no cursor do textarea a sintaxe `![Imagem](./assets/{hash}.png)`.
- **Drag & Drop do Finder**: Modificar o listener global em `public/js/main.js`:
  - Se `e.dataTransfer.files` contiver arquivos com extensões `.md`, `.markdown` ou `.txt`:
    - Para cada arquivo, calcular coordenadas do canvas (`screenToWorld(e.clientX, e.clientY)`).
    - Criar nó `note` com `internal: false`, `filePath: file.path`, `title: file.name`.
- **Atalho ⌘W**: No listener de `keydown` global de `main.js`:
  - Se `(e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "w"` e o nó ativo for uma nota, solicitar confirmação se necessário e invocar `app.removeNode(activeId)`.

### Rationale
Alinha o comportamento do canvas com os padrões nativos do macOS, transformando notas em uma ferramenta rica e visual de colaboração com agentes de IA.

---

## 5. Integração com Spotlight do macOS

### Contexto
Workspaces, notas e terminais devem ser pesquisáveis globalmente pelo Spotlight (`Cmd + Espaço`), e clicar no resultado deve abrir o Maestri e navegar com foco até o recurso.

### Decisão Técnica
1. **Registro do Esquema de URL**:
   - No `electron/main.js`, invocar `app.setAsDefaultProtocolClient("maestri")`.
   - Tratar evento `open-url` no macOS: extrair parâmetros de `maestri://open?workspace=<wsId>&node=<nodeId>`.
2. **Geração de Arquivos de Metadados do Spotlight**:
   - No salvamento do workspace (`saveLayout` no backend), gerar arquivos `.spotlight` indexáveis em `userData/spotlight/`:
     - Cada arquivo contém título, descrição, conteúdo textual da nota ou histórico do terminal, e o link de protocolo `maestri://open?...`.
   - macOS Spotlight indexa automaticamente arquivos de texto/metadados sob a pasta da aplicação, permitindo busca nativa instantânea.
3. **Foco e Animação**:
   - Ao receber o deep-link `maestri://open`, o app comuta para o workspace e dispara `app.canvas.animateTo` centrando a tela nas coordenadas do nó selecionado com pulso visual de destaque.

### Rationale
Proporciona sensação de aplicativo macOS nativo de primeira classe sem requerer plugins Swift nativos complexos ou binários externos compilados.
