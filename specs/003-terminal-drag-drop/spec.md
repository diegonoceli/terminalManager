# Feature Specification: terminal-drag-drop (e Links Clicáveis)

**Feature Branch**: `003-terminal-drag-drop`

**Created**: 2026-09-01

**Status**: Draft

**Input**: User description: "no windows não consigo colar dentro do terminal arrastando e soltando o path das pastas, pode ajustar, quero todas as funcionalidades inclusive clicar em link"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Arrastar e Soltar Arquivos e Pastas no Terminal (Priority: P1)

Como usuário trabalhando no Windows ou macOS, quero arrastar uma ou mais pastas/arquivos do explorador de arquivos (Windows Explorer ou Finder) e soltá-los diretamente sobre uma janela de terminal no canvas, para que o caminho absoluto (path) seja colado instantaneamente na linha de comando atual com o tratamento de espaços apropriado.

**Why this priority**: É uma funcionalidade essencial de produtividade em ambientes de terminal desktop, permitindo navegar em diretórios e passar argumentos de arquivos rapidamente.

**Independent Test**: Abrir o Windows Explorer (ou Finder), arrastar uma pasta com espaços no nome e soltá-la sobre um terminal; o caminho deve aparecer digitado no prompt entre aspas.

**Acceptance Scenarios**:

1. **Given** um terminal aberto no canvas, **When** o usuário arrasta uma pasta do explorador de arquivos e a solta sobre a área do terminal, **Then** o caminho absoluto da pasta é colado no prompt no cursor atual.
2. **Given** um arquivo ou pasta cujo caminho contenha espaços (ex: `C:\Meus Projetos\app`), **When** o usuário solta o item no terminal, **Then** o caminho é inserido automaticamente envolvido por aspas (ex: `"C:\Meus Projetos\app"`).
3. **Given** múltiplos arquivos/pastas selecionados e soltos simultaneamente, **When** o drop é concluído, **Then** todos os caminhos são colados separados por espaço.

---

### User Story 2 - Links Clicáveis no Terminal (Priority: P1)

Como usuário executando servidores locais, testes ou visualizando saídas no terminal, quero que URLs (como `http://localhost:3000`, `https://...`) sejam detectadas e clicáveis, para abrir diretamente no navegador padrão do sistema operacional ao clicar (ou Ctrl+Click/Cmd+Click).

**Why this priority**: Permite acesso rápido a portas de desenvolvimento web, repositórios e documentações impressas na saída do terminal.

**Independent Test**: Imprimir `http://localhost:5173` no terminal, clicar no link e verificar a abertura da URL no navegador padrão do computador.

**Acceptance Scenarios**:

1. **Given** uma URL exibida na saída do terminal, **When** o usuário clica sobre a URL (ou usa atalho `Cmd/Ctrl + Clique`), **Then** o link é aberto no navegador padrão do sistema operacional (macOS ou Windows).
2. **Given** um link sob o cursor, **When** o usuário passa o mouse por cima do link, **Then** o cursor do mouse muda para ponteiro (`pointer`) com sublinhado ou destaque indicando que é clicável.

---

### User Story 3 - Colar via Teclado e Botão Direito no Windows e macOS (Priority: P1)

Como usuário, quero colar texto e caminhos copiados para a área de transferência usando atalhos de teclado padrão (`Ctrl+V` no Windows/Linux, `Cmd+V` no macOS) ou clicando com o botão direito do mouse no terminal, de forma consistente e sem falhas de foco.

**Why this priority**: Garante que todas as formas padrão de colagem funcionem sem atrito em qualquer sistema operacional.

**Independent Test**: Copiar um texto ou caminho para a área de transferência, clicar com o botão direito ou pressionar `Ctrl+V`/`Cmd+V` dentro do terminal e verificar a inserção do texto.

**Acceptance Scenarios**:

1. **Given** um texto ou caminho na área de transferência, **When** o usuário pressiona `Ctrl+V` (no Windows/Linux) ou `Cmd+V` (no macOS) com o terminal ativo, **Then** o conteúdo é colado no terminal.
2. **Given** um texto na área de transferência, **When** o usuário clica com o botão direito sobre a área de texto do terminal, **Then** o conteúdo é colado diretamente.

---

### User Story 4 - Feedback Visual durante o Arraste (Priority: P2)

Como usuário, quero ver um feedback visual claro (borda destacada/brilho no terminal) quando estiver com um arquivo sendo arrastado sobre um terminal específico, para ter certeza de qual terminal receberá o caminho.

**Why this priority**: Melhora a usabilidade e precisão no canvas espacial com múltiplos terminais próximos.

**Independent Test**: Arrastar um arquivo sobre o canvas e observar o terminal sob o cursor destacar visualmente sua borda até o item ser solto ou sair da área.

**Acceptance Scenarios**:

1. **Given** um arquivo sendo arrastado sobre a janela da aplicação, **When** o cursor entra na área de um terminal específico, **Then** o terminal exibe uma indicação visual de área de recebimento ativa (`drag-over`).
2. **When** o arquivo é solto ou o cursor sai da área do terminal, **Then** o destaque visual é removido imediatamente.

### Edge Cases

- O que acontece se o link não tiver `http://` explícito (ex: `localhost:8080`)? O sistema deve reconhecer padrões comuns de localhost e IP e abrir como HTTP.
- O que acontece se o usuário arrastar um texto selecionado de outra aplicação (não um arquivo)? O texto solto deve ser colado diretamente no terminal.
- O que acontece se o arquivo for solto no fundo vazio do canvas (fora de qualquer terminal)? O evento deve ser cancelado de forma segura sem recarregar a página Electron ou abrir o arquivo em nova aba.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE interceptar e prevenir o comportamento padrão do navegador/Electron em eventos de `dragover` e `drop` no canvas global para evitar abertura acidental de arquivos.
- **FR-002**: O sistema DEVE escutar eventos `dragover`, `dragenter`, `dragleave` e `drop` em cada widget de terminal.
- **FR-003**: O sistema DEVE extrair a lista de caminhos absolutos (`file.path` ou `DataTransferItemList`) ao soltar arquivos/pastas no terminal.
- **FR-004**: O sistema DEVE formatar cada caminho contendo espaços adicionando aspas duplas ao redor do caminho.
- **FR-005**: O sistema DEVE injetar a string resultante diretamente na sessão PTY do terminal correspondente.
- **FR-006**: O sistema DEVE aplicar uma classe CSS de destaque visual (ex: `.drag-over`) no terminal alvo enquanto o arquivo estiver sobreposto.
- **FR-007**: O sistema DEVE suportar colagem de texto da área de transferência via atalhos de teclado (`Ctrl+V`, `Cmd+V`, `Shift+Insert`) e evento `paste`.
- **FR-008**: O sistema DEVE habilitar o addon `WebLinksAddon` ou regex link handler no `xterm.js` para detectar URLs e acionar a abertura externa via `shell.openExternal`.

### Key Entities

- **Terminal Widget**: Componente no frontend que encapsula a instância do `xterm.js`, a área receptora de eventos de drop/paste e o manipulador de links clicáveis.
- **DragDrop Path Formatter**: Utilitário responsável por iterar sobre os itens do `DataTransfer`, resolver caminhos de arquivos e aplicar regras de escape/aspas para espaços.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos arquivos e pastas arrastados do Windows Explorer ou macOS Finder têm seus caminhos colados com sucesso no prompt do terminal.
- **SC-002**: Caminhos contendo espaços são 100% das vezes envolvidos por aspas para evitar erros de sintaxe no shell.
- **SC-003**: Links clicáveis abrem no navegador do sistema com latência inferior a 300ms após o clique.
- **SC-004**: Zero recarregamentos ou quebras acidentais de janela ao soltar arquivos em áreas vazias do canvas.

## Assumptions

- O Electron possui a API `shell.openExternal(url)` que abre URLs com segurança no navegador padrão do usuário sem navegar a janela do aplicativo.
- O xterm.js suporta link handlers customizados ou o addon de web links para interceptar cliques em URLs.
