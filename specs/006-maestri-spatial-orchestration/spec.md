# Feature Specification: Maestri — Delta: Workspaces, Agentes & Responsabilidades, Notas, Conexões Avançadas e Árvore de Arquivos

**Feature Branch**: `006-maestri-spatial-orchestration`

**Created**: 2026-09-08

**Status**: Draft

**Input**: User description: "1. Visão Geral e Filosofia — O Maestri é um aplicativo de produtividade para a 'era da IA agêntica': canvas espacial infinito para organizar terminais, agentes de IA, notas, arquivos e esboços. Não é um agente em si; é a camada de orquestração visual em volta de agentes de código existentes (Claude Code, Codex, OpenCode). macOS e Windows. 2. Workspace. 3. O Canvas. 4. Terminais e Agentes. 5. Notas. 6. Conexões. 7. Árvore de Arquivos."

> **Escopo desta especificação**: delta sobre a aplicação atual. A base existente (canvas espacial infinito com pan/zoom, nós de Terminal, Portais Web/Dispositivo/Editor, Fios/Workflows "Floors", arrastar-e-soltar de arquivos no terminal, seleção/cópia precisa, notificações OS em padrões de prompt) é tratada como já implementada e NÃO é re-especificada aqui, salvo quando o comportamento descrito evolui o estado atual (ex: execução em segundo plano de workspaces, novos tipos de nó, novos estilos de conexão).

## Clarifications

### Session 2026-09-08

- Q: Ao fechar e reabrir o aplicativo por completo, como terminais/agentes devem se comportar? → A: Relançar o agente no diretório do workspace e retomar a conversa/sessão anterior automaticamente quando o agente suportar resume; caso contrário, iniciar uma nova sessão (sem perda do estado do workspace).
- Q: Qual a relação entre os novos Workspaces e os atuais "Workflows/Floors"? → A: Migração 1:1 — cada "Floor"/workflow existente vira um Workspace na barra lateral (diretório definido depois); o conceito de Floor é substituído por Workspace.
- Q: Como gerenciar recursos dos workspaces em segundo plano? → A: Manter vivos o workspace ativo e os N (padrão 3) mais recentes; os demais ficam pausados e retomam automaticamente ao serem reativados.
- Q: Ações iniciadas por agentes entre nós (agente→agente, agente→nota, agente→portal) exigem aprovação? → A: Não — execução direta imediata, porém com registro visível/histórico (indicador) de cada solicitação/ação para rastreabilidade.
- Q: O que significa "pausar" um workspace em segundo plano além do limite N? → A: Encerrar os processos e liberar recursos; ao reativar, relançar os agentes com resume quando suportado (subprocessos não-agentes, como servidores locais, não persistem).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Barra Lateral de Workspaces com Diretório e Organização (Priority: P1)

Como desenvolvedor com múltiplos projetos, quero uma barra lateral de workspaces onde cada workspace representa um projeto real (com diretório de trabalho e ícone próprio), organizáveis em pastas e grupos de seção, com uma "mini barra lateral" de ícones quando a barra completa está recolhida e atalhos rápidos para alternar entre eles, para iniciar e retomar cada contexto de trabalho com um clique.

**Why this priority**: O workspace é o container de todo o resto (canvas, terminais, notas, arquivos); sem ele as demais capacidades não têm contexto de projeto.

**Independent Test**: Criar dois workspaces apontando para diretórios distintos com ícones diferentes, organizá-los em uma pasta, recolher a barra lateral e alternar entre eles pelos ícones/atalhos.

**Acceptance Scenarios**:

1. **Given** a barra lateral do aplicativo, **When** o usuário clica no botão "+" e informa um diretório de trabalho e um ícone, **Then** um novo workspace é criado, listado na barra lateral com nome e ícone, e aberto no canvas.
2. **Given** a barra lateral completa recolhida, **When** o usuário interage com a mini barra lateral, **Then** apenas os ícones dos workspaces são exibidos e permitem alternância de um clique.
3. **Given** workspaces na barra lateral, **When** o usuário cria pastas e grupos de seção, **Then** os workspaces podem ser agrupados e categorizados visualmente, com divisores de seção (ex: pessoal vs. trabalho).
4. **Given** a lista de workspaces, **When** o usuário pressiona `Ctrl+↑/↓`, pressiona `Ctrl` duas vezes (para revelar números) ou usa `Ctrl + scroll`, **Then** o workspace anterior/próximo ou o workspace numerado correspondente é ativado.
5. **Given** um workspace selecionado na barra lateral, **When** o usuário usa o menu de contexto "Editar", **Then** nome, ícone, diretório de trabalho e instruções dos agentes podem ser atualizados.
6. **Given** um workspace com diretório válido, **When** o usuário aciona "Abrir no Editor", **Then** o diretório do workspace é aberto no editor de código padrão do sistema.
7. **Given** a aplicação com workflows/"Floors" salvos de versões anteriores, **When** o usuário abre a aplicação nesta versão, **Then** cada Floor é migrado automaticamente para um Workspace na barra lateral (1:1) com nós, conexões e estado preservados, e o conceito de Floor é substituído pelo de Workspace.

---

### User Story 2 - Multi-Workspace em Segundo Plano e Retomada Instantânea (Priority: P1)

Como usuário que alterna entre projetos, quero que os workspaces continuem rodando em segundo plano enquanto trabalho em outro (os terminais e agentes permanecem vivos) e que o estado completo de cada workspace — layout do canvas, posições/tamanhos dos nós, atribuições de agentes, conexões e configurações — seja lembrado, para retomar exatamente de onde parei sem reconfigurar nada.

**Why this priority**: É a diferença central entre "gerenciador de abas" e uma superfície espacial persistente; permite multitarefa real entre projetos.

**Independent Test**: Criar dois workspaces, iniciar processos demorados nos terminais do primeiro, alternar para o segundo, trabalhar nele, voltar ao primeiro e verificar que os processos continuaram e o layout foi restaurado fielmente.

**Acceptance Scenarios**:

1. **Given** um workspace com terminais executando processos de longa duração, **When** o usuário alterna para outro workspace e depois retorna, **Then** os processos continuaram rodando em segundo plano e as sessões dos terminais estão intactas.
2. **Given** um workspace com nós posicionados, redimensionados e conectados, **When** o aplicativo é fechado e reaberto (ou o workspace é reativado), **Then** 100% das posições, tamanhos, conexões, atribuições de agentes e configurações são restaurados fielmente, e os agentes são relançados com retomada da conversa quando o agente suportar resume.
3. **Given** múltiplos workspaces ativos em segundo plano, **When** o usuário alterna entre eles livremente, **Then** a troca é fluida, sem perda de estado em nenhum dos workspaces.
4. **Given** o gerenciamento de arquivos de instrução na edição do workspace, **When** o usuário opta pela sincronização automática, **Then** os arquivos de instrução equivalentes (ex: CLAUDE.md e AGENTS.md) são mantidos sincronizados entre si.

---

### User Story 3 - Terminais com Agentes CLI e Responsabilidades (Priority: P1)

Como desenvolvedor, quero criar um nó de Terminal escolhendo qual agente de código ele executa (Claude Code, Codex ou OpenCode, detectados do ambiente local), dar nome e ícone a cada terminal e atribuir uma "responsabilidade" (ex: Líder, Desenvolvedor, Revisor, Testador) — gerenciadas em Configurações → Agentes — para que as instruções específicas daquele papel sejam injetadas automaticamente quando o agente inicia.

**Why this priority**: É o coração do produto: orquestrar múltiplos agentes especializados em um mesmo espaço de trabalho.

**Independent Test**: Criar dois terminais executando agentes diferentes (ex: Claude Code e OpenCode) com responsabilidades distintas, verificar que cada um inicia com as instruções corretas injetadas e que as instruções persistem junto ao diretório do projeto.

**Acceptance Scenarios**:

1. **Given** a ferramenta Terminal da barra superior, **When** o usuário desenha um nó de terminal no canvas, **Then** uma lista de agentes disponíveis (Claude Code, Codex, OpenCode) é apresentada para seleção antes da inicialização.
2. **Given** um terminal criado, **When** o usuário o nomeia e escolhe um ícone, **Then** nome e ícone são exibidos no cabeçalho do nó e persistidos.
3. **Given** a tela Configurações → Agentes, **When** o usuário cria responsabilidades com nome, badge colorido e instruções, **Then** essas responsabilidades ficam disponíveis para atribuição aos terminais.
4. **Given** um terminal com responsabilidade atribuída, **When** o agente correspondente inicia, **Then** as instruções da responsabilidade são injetadas automaticamente no contexto do agente.
5. **Given** terminais com responsabilidades definidas, **When** o projeto é compartilhado ou reaberto, **Then** as instruções persistem em um arquivo sidecar junto ao diretório do projeto (independente de máquina).
6. **Given** o app em execução, **When** o agente para de produzir saída aguardando decisão ou conclui uma tarefa, **Then** um ponto de atenção é exibido no cabeçalho do terminal e uma notificação do sistema pode ser enviada.
7. **Given** múltiplos terminais no canvas, **When** o usuário segura `Ctrl`, **Then** badges numerados aparecem sobre os terminais e pressionar o número foca o terminal correspondente.

---

### User Story 4 - Nós de Nota (Markdown no Canvas) (Priority: P1)

Como usuário, quero criar notas (post-its markdown) diretamente no canvas, alternar entre edição crua (Raw) e visualização renderizada (Formatada), colar imagens inline, nomeá-las a partir da primeira linha (ou fixar um nome com "Renomear") e encadeá-las a outras notas formando hierarquias navegáveis pelos agentes — com o conteúdo salvo como arquivo Markdown real no disco.

**Why this priority**: Notas ancoradas ao espaço de trabalho (e legíveis/editáveis por agentes) são o segundo pilar do canvas depois dos terminais.

**Independent Test**: Criar uma nota, escrever markdown com imagem colada, alternar para a visualização renderizada, renomear e conectar a uma segunda nota, depois reabrir o workspace e conferir persistência.

**Acceptance Scenarios**:

1. **Given** a ferramenta Nota na barra superior, **When** o usuário desenha um nó no canvas, **Then** uma nota markdown vazia é criada e pronta para edição.
2. **Given** uma nota aberta, **When** o usuário alterna entre as visualizações Raw e Formatada, **Then** o conteúdo é alternado entre editor de texto e pré-visualização markdown renderizada, sem perda de conteúdo.
3. **Given** uma nota em edição, **When** o usuário cola uma imagem, **Then** a imagem é incorporada e renderizada na nota (na visualização formatada).
4. **Given** uma nota com conteúdo, **When** o usuário não fixa um nome, **Then** o título deriva automaticamente da primeira linha; ao usar "Renomear", o nome passa a ser fixo.
5. **Given** duas ou mais notas, **When** o usuário conecta notas entre si, **Then** forma-se uma hierarquia/encadeamento que os agentes podem navegar.
6. **Given** uma nota salva na pasta interna padrão, **When** o usuário a move para um local específico do projeto, **Then** a nota passa a viver naquele local, mantendo o vínculo com o nó do canvas.

---

### User Story 5 - Árvore de Arquivos como Nó do Canvas (Priority: P2)

Como desenvolvedor, quero inserir nós de Árvore de Arquivos no canvas para navegar e operar o projeto sem sair do espaço de trabalho: modos de exibição em Lista, Grade de Ícones (miniaturas de imagens/PDFs/vídeos), Diff (alterações não commitadas) e Graph (grafo de commits); operações de arquivo via menu de contexto; operações Git (commit, pull/push, checkout, nova branch, merge, fetch, stash) com indicador de branch; e arrastar arquivos para terminais ou para o canvas.

**Why this priority**: Transforma o canvas em um ambiente de desenvolvimento completo, reduzindo trocas de janela e mantendo o contexto visual do fluxo de trabalho.

**Independent Test**: Inserir um nó de árvore de arquivos apontando para o diretório do workspace, navegar pastas, criar/renomear um arquivo, visualizar um diff e executar um commit via menu Git.

**Acceptance Scenarios**:

1. **Given** a ferramenta Árvore de Arquivos, **When** o usuário desenha um nó no canvas, **Then** o nó exibe o gerenciador de arquivos do diretório do workspace em modo Lista.
2. **Given** um nó de árvore de arquivos, **When** o usuário alterna os modos de exibição, **Then** o conteúdo é apresentado em Lista (outline), Grade de Ícones (miniaturas) ou Diff (alterações não commitadas lado a lado), conforme selecionado.
3. **Given** um repositório Git no diretório, **When** o usuário acessa o modo Graph, **Then** o grafo de commits do git é exibido.
4. **Given** o menu de contexto de um item, **When** o usuário escolhe criar, renomear, mover ou excluir, **Then** a operação é executada no sistema de arquivos e o nó reflete a mudança imediatamente.
5. **Given** o indicador de branch no nó, **When** o usuário abre o menu Git e escolhe commit, pull/push, checkout, nova branch, merge, fetch ou stash, **Then** a operação é executada e o estado exibido é atualizado.
6. **Given** arquivos visíveis na árvore, **When** o usuário arrasta um arquivo para um terminal ou para o canvas, **Then** no terminal o caminho/contexto do arquivo é compartilhado e no canvas uma pré-visualização do arquivo é criada.
7. **Given** texto selecionado no editor ou no diff, **When** o usuário clica no ícone de chat exibido, **Then** o trecho é enviado a um agente conectado no fluxo.

---

### User Story 6 - Comunicação entre Agentes e Conexões Agente↔Nota / Agente↔Portal (Priority: P2)

Como usuário orquestrando múltiplos agentes, quero conectar terminais entre si e a notas e portais, de modo que os agentes conectados possam se comunicar entre si (um agente pede algo a outro via CLI) e ler/editar o conteúdo de notas conectadas ou controlar programaticamente um navegador embutido (portal) conectado.

**Why this priority**: É o recurso central da "era da IA agêntica": agentes que colaboram e usam o canvas como memória e superfície de ação.

**Independent Test**: Conectar dois terminais de agentes e uma nota aos dois; pedir a um agente que consulte o outro e que leia/atualize a nota; verificar as mudanças no conteúdo da nota e a resposta do segundo agente.

**Acceptance Scenarios**:

1. **Given** dois terminais de agentes conectados entre si, **When** um agente solicita uma ação ao outro conectado, **Then** o mecanismo de comunicação (skill) está instalado/disponível e a solicitação é entregue ao agente de destino.
2. **Given** uma conexão entre um terminal de agente e uma nota, **When** o agente emite um comando de leitura/edição, **Then** o agente consegue ler o conteúdo da nota e editar/atualizar seu arquivo.
3. **Given** uma conexão entre um terminal de agente e um portal (navegador embutido), **When** o agente emite comandos de controle, **Then** o portal navega/executa a ação solicitada programaticamente.
4. **Given** um nó com múltiplas conexões, **When** o usuário clica no badge de conexões do nó, **Then** todas as conexões do nó são listadas e podem ser inspecionadas/gerenciadas.
5. **Given** uma solicitação entre agentes ou uma ação de agente sobre nota/portal conectado, **When** a ação executa imediatamente, **Then** a solicitação/ação fica registrada e visível em um histórico/indicador associado aos nós envolvidos, sem exigir confirmação do usuário.

---

### User Story 7 - Estilos de Conexão e Feixes de Cabos (Priority: P2)

Como usuário de canvases densos, quero escolher o estilo visual das conexões — Corda (padrão, física pendular) ou Circuito (trilhos em eixos com curvas de 90°, mais limpo) — e agrupar várias cordas em um feixe (abraçadeiras / cable ties) para manter o fluxo legível.

**Why this priority**: Em fluxos com muitos nós conectados, a clareza visual das conexões determina a usabilidade do canvas.

**Acceptance Scenarios**:

1. **Given** dois nós conectados, **When** o usuário escolhe o estilo Corda, **Then** a conexão é desenhada como corda padrão com física pendular suave.
2. **Given** dois nós conectados, **When** o usuário escolhe o estilo Circuito, **Then** a conexão é desenhada como trilhos alinhados aos eixos com curvas de 90°.
3. **Given** múltiplas conexões paralelas, **When** o usuário mantém `Alt` pressionado e arrasta sobre as cordas, **Then** as cordas são agrupadas em um feixe único (abraçadeira) que pode ser reposicionado como um todo.

---

### User Story 8 - Produtividade do Canvas: Inserção por Arrasto, Nós Texto/Desenho, Grupos e Minimapa (Priority: P2)

Como usuário, quero inserir nós desenhando o retângulo do tamanho desejado (não apenas clicando), criar nós leves de Texto e Desenho, duplicar nós com `Alt + Arrastar`, agrupar seleções (`Ctrl+G`), alinhar/distribuir, organizar a seleção em grade (`Ctrl+Shift+T`), encaixar com snap magnético (`Ctrl` durante o arrasto), alternar o minimapa (`Ctrl+Shift+M`) e elevar/acoplar painéis à borda da tela como colunas fixas que não acompanham o canvas.

**Why this priority**: Essas operações elevam o canvas de "grade de janelas" a uma ferramenta de organização espacial no padrão de ferramentas de design.

**Acceptance Scenarios**:

1. **Given** uma ferramenta de nó selecionada na barra superior, **When** o usuário arrasta no canvas para desenhar um retângulo, **Then** o nó é criado com o tamanho e posição do retângulo desenhado.
2. **Given** a ferramenta Texto ou Desenho, **When** o usuário insere o nó no canvas, **Then** um nó de texto (rótulo/snippet) ou de desenho (esboço à mão livre) leve é criado e operável.
3. **Given** um nó selecionado, **When** o usuário mantém `Alt` e arrasta, **Then** uma cópia do nó é criada na posição solta.
4. **Given** dois ou mais nós selecionados, **When** o usuário pressiona `Ctrl+G` (ou `Ctrl+Shift+G` para desagrupar), **Then** os nós passam a compartilhar um frame nomeado que move todo o grupo (ou voltam a ser independentes).
5. **Given** múltiplos nós selecionados, **When** o usuário aplica alinhamento/distribuição ou `Ctrl+Shift+T`, **Then** os nós são alinhados/distribuídos ou arranjados em grade uniforme.
6. **Given** um nó sendo arrastado com `Ctrl` pressionado, **When** o nó se aproxima de outro, **Then** ele encaixa magneticamente em layouts estilo mosaico (paredes alinhadas, espaços preenchidos).
7. **Given** o canvas com zoom alterado, **When** o usuário pressiona `Ctrl+Shift+M`, **Then** um minimapa com a posição atual é exibido/ocultado.
8. **Given** um nó no canvas, **When** o usuário dá dois cliques no cabeçalho, **Then** o nó é elevado para um painel centralizado; arrastado à borda da tela, ele é acoplado como coluna fixa que não se move com o canvas.

---

### User Story 9 - Editor de Código Embutido e Busca no Projeto (Priority: P3)

Como desenvolvedor, quero abrir arquivos em um editor de código embutido no nó de árvore de arquivos (com realce de sintaxe, localizar/substituir, múltiplos cursores, fechamento automático e detecção de indentação) e buscar arquivos do projeto via `Ctrl+P` (busca fuzzy em nomes) e busca por conteúdo prefixada com `>`.

**Why this priority**: Completa o ambiente de desenvolvimento no canvas para edição e navegação sem sair do espaço de trabalho.

**Acceptance Scenarios**:

1. **Given** um arquivo de código na árvore, **When** o usuário o abre, **Then** o conteúdo é exibido em um editor embutido com realce de sintaxe e os recursos de edição (localizar/substituir, múltiplos cursores, fechamento automático, indentação) disponíveis.
2. **Given** o campo de busca do projeto, **When** o usuário digita um trecho de nome de arquivo após `Ctrl+P`, **Then** resultados fuzzy de arquivos são apresentados e selecionáveis.
3. **Given** o campo de busca, **When** o usuário prefixa a busca com `>`, **Then** a busca é realizada sobre o conteúdo dos arquivos.

---

### User Story 10 - Temas de Terminal, Portabilidade e Integrações do Sistema (Priority: P3)

Como usuário, quero personalizar terminais com temas embutidos (Dracula, Catppuccin, Nord) e temas personalizados no formato Ghostty, compartilhar/portar workspaces via arquivos `.maestri` (importação/exportação) e, no macOS, encontrar workspaces e notas indexados no Spotlight.

**Why this priority**: Personalização e portabilidade tornam o Maestri adequado a diferentes fluxos e permitem colaboração/compartilhamento de setups.

**Acceptance Scenarios**:

1. **Given** as configurações de tema do terminal, **When** o usuário seleciona um tema embutido (Dracula, Catppuccin, Nord) ou importa um tema no formato Ghostty, **Then** o esquema de cores do terminal é aplicado e persistido por terminal.
2. **Given** um workspace configurado, **When** o usuário exporta, **Then** um arquivo `.maestri` é gerado contendo o estado do workspace; ao importar o arquivo em outra instalação, **Then** o workspace é recriado fielmente.
3. **Given** o app em execução no macOS, **When** o usuário busca por workspaces ou notas no Spotlight, **Then** eles aparecem nos resultados e podem ser abertos diretamente.

---

### Edge Cases

- **Diretório de trabalho inexistente/inacessível**: Ao criar ou reabrir um workspace cujo diretório foi movido ou removido, o aplicativo deve exibir estado claro de erro com opção de religar a um novo diretório sem perder o restante do workspace.
- **Reinício sem suporte a resume**: Ao reabrir o aplicativo, um agente que não suporta retomada de conversa deve iniciar uma nova sessão de forma limpa, sem erro e sem perda do estado do workspace (layout, notas e arquivos preservados).
- **Pausa de workspace com subprocessos ativos**: Ao pausar um workspace (limite N excedido), o usuário deve ser informado de que os processos serão encerrados e que subprocessos não-agentes (ex: servidores locais) não persistem; agentes com suporte a resume retomam a conversa ao reativar o workspace.
- **Agente CLI não instalado**: Se um terminal for configurado para um agente (Claude Code, Codex ou OpenCode) não detectado no ambiente, o terminal deve informar o usuário e sugerir alternativas instaladas.
- **Dois agentes conectados pedindo ações simultaneamente**: Comunicação entre agentes deve serializar/ordenar solicitações sem corromper o estado dos terminais.
- **Nota com primeira linha vazia**: Uma nota sem conteúdo e sem nome fixado deve exibir um título genérico e não gerar erro de persistência.
- **Nota removida com `⌘W`**: Remover o nó deve remover também o arquivo subjacente, com confirmação se o arquivo tiver sido movido para local do projeto (evita apagar arquivo fora do controle do app por engano).
- **Operação Git com conflito/erro**: Operações Git (merge, pull, push) com conflitos ou falhas devem apresentar mensagem legível e estado consistente, sem travar o canvas.
- **Arquivo sendo editado removido externamente**: O editor embutido e o diff devem detectar mudanças externas e oferecer recarregar/manter.
- **Minimapa em canvas muito grande**: Deve permanecer utilizável e de baixo custo visual mesmo com muitos nós.
- **Snap magnético conflitando com posição livre**: O encaixe magnético deve ser intencional (somente com `Ctrl` pressionado) e reversível.
- **Abraçadeira sobre conexões de estilos distintos**: Feixes devem respeitar o estilo individual de cada corda ao serem desfeitos.

## Requirements *(mandatory)*

### Functional Requirements

**Workspaces e barra lateral**

- **FR-001**: O sistema DEVE permitir criar workspaces a partir de um diretório de trabalho e ícone, via botão "+" na barra lateral.
- **FR-002**: O sistema DEVE permitir editar um workspace (nome, ícone, diretório, instruções dos agentes) por menu de contexto "Editar".
- **FR-003**: O sistema DEVE permitir organizar workspaces em pastas e em grupos de seção na barra lateral.
- **FR-004**: O sistema DEVE fornecer uma mini barra lateral minimalista (apenas ícones) quando a barra completa está recolhida, permitindo alternância de um clique.
- **FR-005**: O sistema DEVE alternar para o workspace anterior/próximo com `Ctrl+↑/↓` e saltar para um workspace numerado (revelando números ao pressionar `Ctrl` duas vezes).
- **FR-006**: O sistema DEVE fornecer ação "Abrir no Editor" para abrir o diretório do workspace no editor de código do sistema.

**Persistência, segundo plano e multi-workspace**

- **FR-007**: O sistema DEVE persistir, por workspace, o layout do canvas, posições/tamanhos dos nós, atribuições de agentes, responsabilidades e configurações, restaurando-os fielmente ao reabrir.
- **FR-008**: O sistema DEVE manter workspaces ativos em segundo plano, preservando os processos dos terminais ao alternar entre workspaces.
- **FR-009**: O sistema DEVE permitir exportar e importar workspaces completos através de arquivos portáveis `.maestri`.
- **FR-010**: O sistema DEVE permitir gerenciar os arquivos de instrução dos agentes na edição do workspace e sincronizar automaticamente os arquivos equivalentes (ex: CLAUDE.md e AGENTS.md) quando o usuário optar por agentes mistos.

**Terminais, agentes e responsabilidades**

- **FR-011**: O sistema DEVE apresentar, ao criar um nó de terminal, uma lista de agentes CLI disponíveis (Claude Code, Codex, OpenCode) detectados do ambiente local.
- **FR-012**: O sistema DEVE permitir nomear e atribuir um ícone a cada terminal, exibidos no cabeçalho do nó.
- **FR-013**: O sistema DEVE fornecer uma tela Configurações → Agentes para gerenciar responsabilidades com nome, badge colorido e instruções.
- **FR-014**: O sistema DEVE permitir atribuir uma responsabilidade a cada instância de terminal.
- **FR-015**: O sistema DEVE injetar automaticamente as instruções da responsabilidade quando o agente do terminal inicia.
- **FR-016**: O sistema DEVE persistir as instruções de responsabilidade em um arquivo sidecar junto ao diretório do projeto, permitindo que viaje com ele.
- **FR-017**: O sistema DEVE exibir um indicador de atenção (ponto) no cabeçalho do terminal quando o agente para de produzir saída (aguardando decisão ou concluído) e DEVE poder enviar notificações do sistema nesses casos.
- **FR-018**: O sistema DEVE revelar badges numerados sobre os terminais ao manter `Ctrl` pressionado e focar o terminal cujo número for pressionado.

**Notas**

- **FR-019**: O sistema DEVE permitir criar nós de Nota (conteúdo Markdown) no canvas e salvá-los como arquivos Markdown reais no disco.
- **FR-020**: O sistema DEVE oferecer, na nota, alternância entre visualização Raw (edição) e Formatada (renderizada) sem perda de conteúdo.
- **FR-021**: O sistema DEVE suportar colagem e renderização de imagens inline nas notas.
- **FR-022**: O sistema DEVE derivar o nome da nota da primeira linha por padrão e permitir fixar um nome com a ação "Renomear".
- **FR-023**: O sistema DEVE permitir conectar notas a outras notas formando hierarquia/encadeamento navegável pelos agentes.
- **FR-024**: O sistema DEVE salvar notas por padrão na pasta interna do aplicativo e permitir movê-las para um local específico do projeto.
- **FR-025**: O sistema DEVE remover a nota e o arquivo subjacente ao excluir o nó (`⌘W`), com confirmação quando o arquivo estiver fora da área interna do aplicativo.

**Árvore de arquivos, editor e busca**

- **FR-026**: O sistema DEVE permitir inserir nós de Árvore de Arquivos apontando para o diretório do workspace.
- **FR-027**: O sistema DEVE oferecer modos de exibição Lista, Grade de Ícones (miniaturas de imagens/PDFs/vídeos), Diff (alterações não commitadas lado a lado) e Graph (grafo de commits).
- **FR-028**: O sistema DEVE permitir operações de arquivo (criar, renomear, mover, excluir) via menu de contexto.
- **FR-029**: O sistema DEVE permitir arrastar arquivos da árvore para um terminal (compartilhando contexto) e para o canvas (criando pré-visualização).
- **FR-030**: O sistema DEVE exibir indicador de branch e oferecer operações Git (commit, pull/push, checkout, nova branch, merge, fetch, stash).
- **FR-031**: O sistema DEVE abrir arquivos em editor de código embutido com realce de sintaxe, localizar/substituir, múltiplos cursores, fechamento automático e detecção de indentação.
- **FR-032**: O sistema DEVE exibir ícone de chat sobre texto selecionado no editor ou diff para enviar o trecho a um agente conectado.
- **FR-033**: O sistema DEVE oferecer busca fuzzy de arquivos via `Ctrl+P` e busca por conteúdo quando o termo for prefixado com `>`.

**Conexões e comunicação entre agentes**

- **FR-034**: O sistema DEVE conectar dois terminais de agentes, instalando/disponibilizando um mecanismo (skill) que permita a um agente solicitar ações a outro agente conectado via CLI.
- **FR-035**: O sistema DEVE suportar conexões agente↔nota, permitindo que o agente leia e edite o conteúdo da nota conectada.
- **FR-036**: O sistema DEVE suportar conexões agente↔portal, permitindo que o agente controle programaticamente o navegador embutido conectado.
- **FR-037**: O sistema DEVE permitir inspecionar e gerenciar todas as conexões de um nó através do clique no badge de conexões do nó.
- **FR-038**: O sistema DEVE oferecer estilo de conexão Corda (padrão, com física pendular) e Circuito (trilhos em eixos com curvas de 90°), selecionável pelo usuário.
- **FR-039**: O sistema DEVE permitir agrupar múltiplas cordas em um feixe ("abraçadeiras"), criado ao manter `Alt` e arrastar sobre as cordas, e desfazer o feixe preservando cada conexão.

**Produtividade do canvas**

- **FR-040**: O sistema DEVE criar nós com tamanho e posição definidos pelo arrasto de um retângulo quando uma ferramenta de nó está selecionada.
- **FR-041**: O sistema DEVE fornecer nós leves de Texto (rótulo/snippet) e de Desenho (esboço à mão livre) no canvas.
- **FR-042**: O sistema DEVE duplicar nós via `Alt + Arrastar` ou menu de contexto.
- **FR-043**: O sistema DEVE agrupar nós selecionados (`Ctrl+G`) em um frame compartilhado e nomeado (e desagrupar com `Ctrl+Shift+G`), movendo o grupo pelo cabeçalho.
- **FR-044**: O sistema DEVE fornecer alinhamento e distribuição uniforme para múltiplos nós selecionados.
- **FR-045**: O sistema DEVE arranjar a seleção em grade uniforme com `Ctrl+Shift+T`.
- **FR-046**: O sistema DEVE encaixar magneticamente um nó arrastado com `Ctrl` pressionado (paredes alinhadas e espaços preenchidos).
- **FR-047**: O sistema DEVE exibir/ocultar minimapa com a posição atual do canvas via `Ctrl+Shift+M`.
- **FR-048**: O sistema DEVE elevar um nó para painel centralizado com dois cliques no cabeçalho e acoplá-lo como coluna fixa (que não se move com o canvas) ao arrastá-lo para a borda da tela.
- **FR-049**: O sistema DEVE manter os atalhos de exclusão (`Ctrl+W`/`⌘W`), focar (`Ctrl+\`) e zoom para seleção (`Ctrl+Alt+\`), e a navegação entre conexões (`Ctrl+Alt+→/←`), além de pular ao próximo agente que precisa de atenção com `Ctrl+Shift+A`.

**Temas e integrações do sistema**

- **FR-050**: O sistema DEVE oferecer temas de terminal embutidos (Dracula, Catppuccin, Nord) e suportar importação de temas personalizados no formato Ghostty.
- **FR-051**: No macOS, o sistema DEVE indexar workspaces e notas no Spotlight para abertura direta dos resultados.

**Reinício do aplicativo**

- **FR-052**: Ao reabrir o aplicativo, o sistema DEVE relançar os agentes dos terminais no diretório do workspace e retomar automaticamente a conversa/sessão anterior quando o agente suportar resume; na ausência de suporte, DEVE iniciar uma nova sessão sem perda do estado do workspace.

**Migração de Workflows/Floors existentes**

- **FR-053**: O sistema DEVE migrar automaticamente cada "Floor"/workflow existente para um Workspace na barra lateral (1:1), preservando nós, conexões, posições e estado, e substituir o conceito de Floor pelo de Workspace na interface; um diretório de trabalho pode ser definido posteriormente pelo usuário.

**Limites de execução em segundo plano**

- **FR-054**: O sistema DEVE manter ativos em segundo plano os terminais/agentes do workspace ativo e dos N (padrão 3, configurável) workspaces mais recentes. Ao pausar um workspace além desse limite, o sistema DEVE encerrar seus processos e liberar recursos; ao reativá-lo, DEVE relançar os agentes retomando a conversa quando suportado — subprocessos não-agentes (ex: servidores locais iniciados por comando) não persistem durante a pausa.

**Rastreabilidade de ações de agentes**

- **FR-055**: O sistema DEVE executar imediatamente, sem confirmação do usuário, as solicitações entre agentes e as ações de agentes sobre notas e portais conectados, e DEVE registrar cada solicitação/ação em um histórico visível (indicador) associado aos nós envolvidos.

### Key Entities *(include if feature involves data)*

- **Workspace**: Container de um projeto com diretório de trabalho, nome, ícone, instruções de agentes e estado espacial completo; pode pertencer a pastas/grupos de seção.
- **Pasta / Grupo de Seção**: Organizadores visuais da barra lateral que agrupam workspaces relacionados (pasta) ou criam divisores de categoria (grupo).
- **Arquivo Portável (.maestri)**: Representação serializada e importável/exportável de um workspace completo.
- **Terminal Node**: Nó que executa um agente CLI (Claude Code, Codex ou OpenCode) em sessão ativa; carrega nome, ícone, responsabilidade e tema.
- **Responsabilidade (Role)**: Instruções nomeadas (com badge colorido) atribuíveis a terminais e persistidas em arquivo sidecar junto ao diretório do projeto.
- **Nota Node**: Nó cujo conteúdo é um arquivo Markdown no disco, com localização (interna ou no projeto), nome (derivado ou fixo) e encadeamento com outras notas.
- **Texto Node / Desenho Node**: Nós leves para rótulos/snippets e esboços à mão livre.
- **Árvore de Arquivos Node**: Nó de gerenciamento de arquivos e Git do diretório do workspace, com modos de exibição e editor embutido.
- **Conexão**: Vínculo entre dois nós; especializa-se em agente↔agente (comunicação via skill), agente↔nota (leitura/edição) e agente↔portal (controle), com estilos Corda/Circuito e opção de agrupamento em feixes.
- **Minimapa / Indicador de Atenção / Badge de Conexão**: Elementos de navegação e status do canvas (posição atual, agente aguardando, conexões de um nó).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O usuário cria e organiza um novo workspace (com diretório e ícone) em menos de 30 segundos, sem sair do aplicativo.
- **SC-002**: 100% do layout de um workspace (nós, posições, tamanhos, conexões, atribuições) é restaurado fielmente ao alternar workspaces ou reabrir o aplicativo, e a troca de workspace leva menos de 1 segundo.
- **SC-003**: Ao alternar entre o workspace ativo e os N (padrão 3) mais recentes, 100% dos processos iniciados nos terminais continuam ativos em segundo plano; workspaces pausados retomam automaticamente seus processos em menos de 5 segundos ao serem reativados.
- **SC-004**: O usuário configura um terminal com agente e responsabilidade, e o agente inicia com as instruções corretas injetadas, em menos de 1 minuto desde a criação do nó.
- **SC-005**: 100% das notas criadas no canvas persistem como arquivos Markdown válidos e são restauradas/renderizadas corretamente após reabertura.
- **SC-006**: O usuário executa as operações Git básicas (commit e pull/push) e de arquivo (criar/renomear/excluir) pelo nó de árvore de arquivos, com feedback visual consistente, sem falhas.
- **SC-007**: Um agente consegue solicitar ação a outro agente conectado e a solicitação é entregue e respondida em menos de 10 segundos, com as instruções da skill instaladas automaticamente.
- **SC-008**: O usuário cria uma conexão entre quaisquer dois nós em menos de 2 segundos e alterna entre estilos Corda/Circuito sem perder a conexão.
- **SC-009**: As operações de agrupamento, alinhamento, organização em grade e snap magnético funcionam com latência imperceptível (feedback visual imediato) em canvases com até 100 nós.
- **SC-010**: A busca `Ctrl+P` retorna resultados fuzzy em menos de 1 segundo em projetos de até 10.000 arquivos.
- **SC-011**: Um workspace exportado como `.maestri` é reimportado em outra instalação com 100% de fidelidade do layout e configurações.
- **SC-012**: Após fechar e reabrir o aplicativo, o usuário retoma um workspace com os agentes relançados e, quando suportado, a conversa retomada em menos de 10 segundos desde a abertura do workspace.
- **SC-013**: 100% das solicitações entre agentes e das ações de agentes sobre notas/portais conectados ficam registradas e visíveis (histórico/indicador) sem exigir confirmação do usuário.

## Assumptions

- A base atual (canvas infinito com pan/zoom, nós de Terminal/Portais, workflows "Floors", conexões com pulsos, notificações do sistema) permanece como base, mas os "Floors" existentes são migrados 1:1 para Workspaces (FR-053) e o conceito de Floor deixa de existir na interface; esta especificação cobre o delta descrito.
- O aplicativo roda em desktop macOS e Windows, com tratamentos de atalho por plataforma (`Ctrl` vs `⌘`); funcionalidades de Spotlight aplicam-se apenas ao macOS.
- Os agentes (Claude Code, Codex, OpenCode) são ferramentas CLI instaladas pelo usuário no ambiente local; o aplicativo os detecta e não os embute.
- Onde a descrição lista "Claude Code, Codex ou OpenCode", os três são tratados igualmente como alvos de primeira classe.
- Nós "Texto" e "Desenho" são tratados como nós leves: Texto = rótulo/snippet de texto; Desenho = esboço à mão livre com ferramentas básicas (traço, cor, espessura, borracha), persistidos junto ao workspace.
- Notas são salvas, por padrão, na pasta interna do aplicativo; mover para o projeto é uma ação explícita do usuário.
- Comunicação entre agentes via skill ocorre exclusivamente entre terminais conectados pelo usuário; não há comunicação implícita entre agentes não conectados.
- Operações Git exigem repositório Git no diretório do workspace; na ausência dele, os comandos Git ficam indisponíveis com orientação clara.
- O formato `.maestri` é autocontido (estado + referências a instruções) e não inclui os binários/processos vivos dos terminais.
- A sincronização CLAUDE.md/AGENTS.md é opcional e controlada pelo usuário na edição do workspace.
- A retomada de conversa após reinício do aplicativo depende do suporte nativo de resume de cada agente; agentes sem suporte iniciam sessão nova no diretório do workspace.
- O número N de workspaces mantidos ativos em segundo plano tem padrão 3 e é configurável pelo usuário; "recente" é definido pela ordem de última ativação.

## Out of Scope *(nesta iteração)*

- Re-especificação do canvas/terminais/portais/conexões básicas já existentes (tratados como base).
- Implementação de um agente de IA próprio (o aplicativo orquestra agentes externos).
- Suporte a outras plataformas além de macOS e Windows.
- Colaboração multiusuário em tempo real no mesmo workspace.
