# Feature Specification: Documentação Completa e Especificação Funcional da Plataforma Maestri

**Feature Branch**: `011-maestri-complete-docs`

**Created**: 2026-09-08

**Status**: Draft

**Input**: User description: Documentação Completa do Maestri extraída em 2026-09-08 de https://www.themaestri.app/pt-br/docs, contemplando: Introdução, Espaços de Trabalho (Workspaces), O Canvas, Terminais e Agentes, Notas, Conexões, Árvore de Arquivos, Portais (Web e Dispositivos Móveis), Andares (Floors), Compositor de Prompts e Batuta Search.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Gestão Completa de Workspaces, Mini Barra Lateral e Indexação de Sistema (Priority: P1) 🎯 MVP

Como desenvolvedor coordenando múltiplos projetos e serviços, quero criar, organizar, alternar e importar Espaços de Trabalho (Workspaces) independentes com execução em segundo plano, mini barra lateral com pré-visualizações, sincronização de instruções de agentes (`CLAUDE.md` e `AGENTS.md`) e indexação nativa no Spotlight do macOS, para que eu possa alternar de contexto instantaneamente sem perda de estado.

**Why this priority**: O Workspace é a unidade atômica fundamental de isolamento de projetos no Maestri. Toda a persistência espacial, layouts, terminais e contexto de agentes residem em um Workspace.

**Independent Test**: Criar dois workspaces com diretórios distintos e ícones personalizados; alternar entre eles usando cliques na mini barra lateral ou atalhos de teclado (`Ctrl + ↑/↓` e toque duplo no `Ctrl`); verificar que processos continuam executando em segundo plano; pesquisar notas e terminais no Spotlight do sistema e verificar o redirecionamento direto para o nó correspondente.

**Acceptance Scenarios**:

1. **Given** a barra lateral do aplicativo aberta, **When** o usuário clica no botão `+`, define uma pasta raiz do projeto e seleciona um ícone, **Then** o novo espaço de trabalho é criado, salvo na barra lateral e aberto imediatamente no canvas.
2. **Given** múltiplos espaços de trabalho configurados, **When** o usuário alterna para outro workspace enquanto tarefas de agentes estão em execução, **Then** os terminais do workspace anterior continuam processando em segundo plano sem interrupção.
3. **Given** a barra lateral fechada, **When** a mini barra lateral estiver visível, **Then** apenas os ícones dos workspaces são exibidos, revelando o rótulo ao passar o cursor, abrindo a lista de terminais ao segurar o clique e exibindo o menu de contexto completo ao clicar com o botão direito.
4. **Given** as opções de configuração do workspace, **When** o usuário ativa a sincronização entre `CLAUDE.md` e `AGENTS.md`, **Then** qualquer modificação feita nas instruções de projeto de um arquivo é refletida de forma idêntica no outro.
5. **Given** espaços de trabalho com notas e terminais salvos no macOS, **When** o usuário busca por palavras-chave contidas em uma nota ou terminal na barra de busca Spotlight do sistema operacional, **Then** o resultado exibe o item correspondente do Maestri e, ao ser selecionado, abre o app focando exatamente no nó desejado.

---

### User Story 2 - Canvas Espacial 2D, Snapping Magnético, Elevação e Agrupamento (Priority: P1)

Como usuário organizando visualmente um ecossistema de trabalho complexo, quero um canvas 2D infinito com navegação fluida estilo Figma (pan/zoom), alinhamento em grade de 20pt, encaixe magnético de tiles ao segurar `Ctrl`, capacidade de elevar nós para foco centralizado ou acoplamento em coluna lateral, e agrupamento de nós com frame nomeado, para estruturar minhas ferramentas no layout que melhor reflete meu modelo mental.

**Why this priority**: O canvas espacial infinito é o ambiente operacional onde toda a orquestração acontece. Ergonomia visual, alinhamento intuitivo e manipulação de grupos previnem a sobrecarga cognitiva ao operar múltiplos agentes.

**Independent Test**: Navegar no canvas usando trackpad (gestos de pinça e deslizamento de 2 dedos) e mouse; arrastar nós segurando `Ctrl` e validar o encaixe magnético em paredes adjacentes; dar duplo clique no cabeçalho de um nó para elevá-lo ao centro e arrastá-lo para a borda da tela para acoplá-lo em coluna fixa; selecionar múltiplos nós com `Ctrl+G` e verificar a movimentação em conjunto pelo cabeçalho do grupo.

**Acceptance Scenarios**:

1. **Given** nós no canvas, **When** o usuário segura `Ctrl` e arrasta um nó próximo a outros elementos, **Then** o nó se encaixa magneticamente às bordas adjacentes e preenche vazios automaticamente sem exigir alinhamento manual milimétrico.
2. **Given** um terminal ou nota no canvas, **When** o usuário dá duplo clique no cabeçalho do nó, **Then** o elemento é elevado para uma visualização centralizada destacada sobre os demais nós; ao dar duplo clique novamente, retorna à sua posição original no canvas.
3. **Given** um nó elevado, **When** o usuário o arrasta em direção a uma das bordas laterais da tela, **Then** o nó se acopla como uma coluna vertical de altura total e permanece fixo enquanto o canvas é movimentado e ampliado livremente ao fundo.
4. **Given** dois ou mais nós selecionados, **When** o usuário pressiona `Ctrl+G`, **Then** um frame de grupo com cabeçalho compartilhado e renomeável é criado ao redor deles, permitindo mover todos os membros simultaneamente ao arrastar o cabeçalho.
5. **Given** um grupo com apenas dois membros, **When** um dos membros é excluído, **Then** o grupo se dissolve automaticamente para não deixar frames órfãos no canvas.
6. **Given** nós desordenados no canvas, **When** o usuário seleciona múltiplos nós e aciona `Ctrl+Shift+T` (Organizar), **Then** os nós são reorganizados automaticamente em uma grade uniforme perfeitamente alinhada.

---

### User Story 3 - Terminais Inteligentes, Responsabilidades Portáteis (Roles) e Sistema de Atenção (Priority: P1)

Como engenheiro delegando tarefas para agentes autônomos de IA, quero criar terminais com papéis especializados (Líder, Desenvolvedor, Revisor, Testador) persistidos em sidecars `role.json` portáteis, navegar entre terminais numerados via teclado (`Ctrl + 1..9`), aplicar temas de cores do iTerm2/Ghostty e receber alertas visuais (ponto vermelho de atenção) e notificações do sistema quando o agente necessita de intervenção, para orquestrar múltiplos agentes simultâneos com supervisão sem atrito.

**Why this priority**: O terminal é o executor do trabalho de software. A atribuição clara de papéis e a notificação passiva de término/bloqueio garantem que o usuário nunca deixe um agente ocioso esperando instruções.

**Independent Test**: Desenhar um terminal no canvas e atribuir uma responsabilidade personalizada; verificar que o diretório recebe as instruções e o sidecar `role.json`; testar navegação rápida segurando `Ctrl` e pressionando o número do badge; simular a finalização de um comando e confirmar o acendimento do ponto vermelho de atenção no cabeçalho e o envio de notificação do sistema operacional; pressionar `Ctrl+Shift+A` para pular sequencialmente entre terminais que necessitam de atenção.

**Acceptance Scenarios**:

1. **Given** um terminal aberto, **When** o usuário atribui uma responsabilidade (ex: "Revisor"), **Then** o agente recebe as instruções correspondentes na inicialização e o Maestri cria/atualiza o arquivo portátil `role.json` com nome, cor do badge e prompt de instrução no subdiretório.
2. **Given** um repositório clonado contendo arquivos `role.json`, **When** o usuário clica em "Descobrir Responsabilidades" na edição do terminal, **Then** o sistema lista e permite importar as responsabilidades encontradas diretamente para a biblioteca do usuário.
3. **Given** vários terminais ativos no canvas, **When** o usuário segura a tecla `Ctrl`, **Then** badges numéricos aparecem temporariamente nos cabeçalhos de cada terminal e, ao teclar o número respectivo (1 a 9), o foco é transferido instantaneamente para aquele terminal.
4. **Given** um agente em execução que conclui seu turno ou solicita confirmação de comando, **When** a saída do terminal cessa, **Then** o terminal exibe um ponto vermelho de atenção em seu cabeçalho e emite uma notificação nativa do sistema.
5. **Given** múltiplos terminais com alertas pendentes, **When** o usuário pressiona `Ctrl+Shift+A`, **Then** a visualização do canvas navega diretamente para o próximo terminal com ponto de atenção aceso, percorrendo andares caso necessário.

---

### User Story 4 - Notas Markdown Vivas, Imagens Inline, Encadeamento e Arquivos Locais (Priority: P1)

Como usuário registrando especificações, listas de tarefas e mapas de contexto para agentes, quero desenhar notas markdown reais que sincronizam com o disco, alternar entre modos Raw (edição de texto) e Formatada (renderização rica), colar imagens diretamente via clipboard, conectar notas em cadeias navegáveis e associá-las a caminhos do projeto ou arquivos soltos do Finder, para que humanos e agentes compartilhem uma base de conhecimento dinâmica e persistente.

**Why this priority**: As notas são a memória viva do projeto no canvas. Elas fornecem o caderno persistente onde prompts, planos e dados intermediários sobrevivem entre sessões e podem ser consumidos diretamente pelos agentes.

**Independent Test**: Criar uma nota no canvas desenhando com a ferramenta de notas; digitar markdown no modo Raw e alternar para Formatada validando títulos, listas e tabelas; colar uma imagem da área de transferência e validar a exibição visual e sintaxe markdown; renomear a nota com duplo clique e depois limpar o campo para verificar a volta da nomeação automática pela 1ª linha; arrastar um arquivo `.md` do Finder para o canvas e verificar criação da nota apontando para o arquivo original.

**Acceptance Scenarios**:

1. **Given** uma nota no canvas, **When** o usuário cola uma imagem da área de transferência com `⌘V`, **Then** a imagem é salva e renderizada visualmente no modo formatado e inserida como link markdown no modo raw, ficando legível tanto para o usuário quanto para agentes de IA conectados.
2. **Given** uma nota criada, **When** o usuário digita texto na primeira linha, **Then** o título do cabeçalho adota esse texto dinamicamente; se o usuário definir um nome manual no popover de renomeação, esse nome passa a ser estável até que o campo seja esvaziado novamente.
3. **Given** uma cadeia de notas conectadas entre si (Nota A → Nota B → Nota C), **When** um agente de IA é conectado apenas à Nota A, **Then** o agente consegue navegar e consumir programaticamente o conteúdo de todas as notas da hierarquia encadeada.
4. **Given** uma nota armazenada na pasta interna, **When** o usuário seleciona "Mover para..." e escolhe um caminho no repositório do projeto, **Then** o arquivo passa a residir naquele local; se a nota for posteriormente deletada do canvas com `⌘W`, o arquivo físico no repositório permanece intacto.

---

### User Story 5 - Conexões com Física de Cordas ou Trilhos de Circuito e Orquestração Inter-Agentes (Priority: P1)

Como orquestrador de múltiplos agentes, quero criar conexões visuais entre terminais, notas e portais com opções de física balançante ("Corda") ou trilhos ortogonais limpos ("Circuito"), agrupar cabos concorrentes usando abraçadeiras magnéticas manuais (`Alt + traço`), e habilitar a comunicação fluida agente-para-agente via Skill integrada de CLI, para que meus agentes possam solicitar análises e passar tarefas entre si sem intervenção humana manual.

**Why this priority**: A conexão é o canal operacional de colaboração entre IAs no Maestri. É o que transforma terminais isolados em uma equipe coordenada de engenharia de software.

**Independent Test**: Conectar dois terminais com a ferramenta de conexão ou atalho `Ctrl+L`; alternar o estilo entre Corda e Circuito pelo popover de conexão; segurar `Alt` e desenhar uma linha cortando múltiplos cabos para criar uma abraçadeira visual arrastável; instruir um agente no Terminal 1 a enviar uma pergunta para o Terminal 2 ("Peça ao Revisor para avaliar o código"); verificar que a resposta do Terminal 2 é entregue de volta ao Terminal 1 automaticamente enquanto o Terminal 2 estiver desselecionado.

**Acceptance Scenarios**:

1. **Given** dois terminais conectados no canvas, **When** um agente emite um comando direcionado ao outro terminal conectado, **Then** o Maestri utiliza a skill de CLI instalada para entregar a solicitação ao terminal alvo e aguarda a conclusão da resposta.
2. **Given** o agente receptor processando a solicitação, **When** o usuário mantém o terminal receptor desselecionado (sem borda tracejada de foco), **Then** o Maestri detecta o término da geração e envia a resposta de volta ao agente de origem automaticamente.
3. **Given** múltiplos cabos de conexão cruzando a mesma região do canvas, **When** o usuário segura `Alt` e faz um traço cortando as cordas, **Then** uma abraçadeira é inserida naquele ponto convergindo os cabos em um feixe único com movimentação ajustável.
4. **Given** uma conexão existente, **When** o usuário abre o popover de conexões no nó, **Then** cada linha exibe o elemento conectado (mesmo em outro andar), permitindo deslocar a câmera até o nó correspondente ou remover a conexão com um clique no `×`.
5. **Given** um terminal conectado a um nó de Nota ou Portal, **When** o agente executa comandos de leitura/escrita ou automação, **Then** ele acessa o conteúdo da nota ou controla o navegador/dispositivo sem necessidade de configuração de servidores MCP externos.

---

### User Story 6 - Árvore de Arquivos Multivisualização e Editor de Código Embutido (Priority: P2)

Como desenvolvedor inspecionando o repositório no próprio canvas, quero um nó de Árvore de Arquivos com 4 modos de visualização (Lista, Grade de Ícones com Quick Look, Diffs de alterações e Grafo Git de commits), editor de código integrado nativo com realce de sintaxe e cursores múltiplos, busca rápida com `Ctrl+P` e busca textual interna com `>`, além de capacidade de citar trechos de código diretamente para agentes conectados, para examinar e modificar código sem trocar de aplicativo.

**Why this priority**: Elimina a alternância constante de contexto entre o canvas do Maestri e uma IDE externa pesada para inspeções rápidas, revisões de diff e pequenos ajustes pontuais.

**Independent Test**: Inserir um nó de Árvore de Arquivos no canvas; alternar entre visualização em Lista, Grade de Ícones, Diff e Grafo Git; abrir o editor embutido, carregar um arquivo, editar com realce de sintaxe e salvar; selecionar um bloco de código no editor ou no diff e clicar no ícone de chat para enviar o trecho citado ao terminal conectado; teclar `Ctrl+P` com a árvore selecionada para buscar arquivos e digitar `>termo` para buscar dentro do texto dos arquivos.

**Acceptance Scenarios**:

1. **Given** um nó de Árvore de Arquivos no canvas, **When** o usuário seleciona o modo "Grade de Ícones", **Then** arquivos de mídia (imagens, PDFs, vídeos) exibem miniaturas visuais do Quick Look em vez de ícones genéricos.
2. **Given** alterações de arquivos não commitadas no repositório, **When** o usuário seleciona o modo "Diff", **Then** as alterações são exibidas lado a lado com a versão original, permitindo selecionar qualquer trecho e citá-lo para um agente de IA conectado através de um ícone flutuante de chat.
3. **Given** o nó no modo "Grafo Git", **When** o repositório possui branches e commits, **Then** a visualização renderiza o histórico com lanes de branches e marcadores de referência idênticos ao `git log --graph`.
4. **Given** o painel de editor de código aberto dentro da árvore de arquivos, **When** o usuário seleciona um arquivo de código, **Then** o editor oferece realce de sintaxe, múltiplos cursores, busca e substituição, auto-fechamento de colchetes e detecção inteligente de indentação.
5. **Given** o campo de busca inferior da árvore de arquivos, **When** o usuário inicia o texto com o caractere `>`, **Then** a busca varre o conteúdo interno dos arquivos, exibindo o arquivo e o número da linha de cada correspondência, abrindo o arquivo exatamente naquela linha ao ser clicado.

---

### User Story 7 - Portais Web e Dispositivos Móveis com Controle Manual e Automação de IA (Priority: P2)

Como desenvolvedor web e mobile validando aplicações com auxílio de agentes, quero inserir Portais de Navegador (WebKit) e Portais de Dispositivos Móveis (Simulador iOS no macOS, Emuladores Android e dispositivos físicos conectados) diretamente no canvas, com renderização de tela de alto desempenho, controle manual tátil e automação programática por agentes lendo a árvore de acessibilidade real ou DOM, para testar e depurar aplicações visualmente de ponta a ponta.

**Why this priority**: Fecha o ciclo de desenvolvimento autônomo: o agente compila o código, inicia a aplicação no portal de navegador ou dispositivo, inspeciona a interface e navega pelas telas para validar as alterações.

**Independent Test**: Criar um portal web apontando para uma URL local ou remota e verificar navegação e renderização; conectar um terminal ao portal e emitir comandos para tirar screenshot, clicar e preencher formulários; abrir um portal de dispositivo selecionando um Simulador iOS ou Emulador Android listado; interagir manualmente com toques, rolagem e botões de hardware virtuais; conectar um agente ao dispositivo e verificar leitura de elementos nativos da árvore de acessibilidade e navegação autônoma.

**Acceptance Scenarios**:

1. **Given** um portal web inserido no canvas, **When** ele é conectado a outro portal web, **Then** ambos compartilham a mesma sessão de cookies e armazenamento local, permitindo fluxos com autenticação compartilhada.
2. **Given** um portal web conectado ao terminal de um agente, **When** o agente executa instruções de automação, **Then** ele é capaz de clicar em elementos, digitar texto, rolar páginas, executar scripts JavaScript no contexto da página e capturar screenshots da tela.
3. **Given** a seleção de "Novo Portal → Devices", **When** o usuário escolhe um Simulador iOS ou Emulador Android disponível, **Then** o Maestri renderiza o buffer de tela do dispositivo diretamente na GPU com suporte a gestos de toque, rolagem, rotação (retrato/paisagem) e acionamento de botões físicos (Home, Lock, Back, Recents).
4. **Given** um portal de dispositivo conectado a um agente de IA, **When** o agente inspeciona a tela, **Then** ele lê a árvore hierárquica de acessibilidade nativa com rótulos verdadeiros e coordenadas exatas (incluindo webviews embutidas), permitindo toques precisos em elementos da interface sem depender de suposições visuais.
5. **Given** múltiplos portais de dispositivos abertos simultaneamente, **When** o usuário alterna de workspace ou andar, **Then** o estado das instâncias é preservado e mantido em execução contínua.

---

### User Story 8 - Andares (Floors) com Clonagem APFS Copy-on-Write, Aterrissagem e Hooks (Priority: P2)

Como desenvolvedor executando tarefas em branches paralelos, quero criar Andares (Floors) no workspace que usam clonagem instantânea copy-on-write (via APFS no macOS ou branch git isolada no Windows) com transição de perspectiva 3D, clonar opcionalmente o layout do Térreo, executar hooks de ciclo de vida (Setup, Run, Teardown) com variáveis de ambiente dedicadas e aterrissar (fazer merge seguro) as alterações de volta ao repositório principal com prévia de diff, para trabalhar em tarefas paralelas sem tocar na pasta de trabalho original.

**Why this priority**: Permite isolamento radical de experimentos e correções emergenciais sem necessidade de `git stash`, conflitos de diretório ou duplicação pesada de armazenamento em disco.

**Independent Test**: Clicar no botão de andares no canto inferior direito; acionar a transição 3D e criar um novo andar a partir de uma branch; verificar a velocidade instantânea da clonagem copy-on-write; configurar e disparar um hook de Setup; realizar alterações e commits no andar; acionar "Aterrissar", inspecionar a interface de transferência com ícone de avião e pré-visualização de diff, e concluir o merge de volta ao Térreo.

**Acceptance Scenarios**:

1. **Given** um workspace sob repositório Git em volume APFS no macOS, **When** o usuário cria um novo andar, **Then** o repositório é clonado instantaneamente usando copy-on-write em `.maestri/floors`, compartilhando os blocos de disco inalterados e fazendo checkout da branch especificada.
2. **Given** a opção "Clonar layout do Térreo" ativada na criação do andar, **When** o novo andar é inicializado, **Then** todos os nós (notas, terminais, blocos de texto) do andar principal são duplicados para o novo andar mantendo as posições relativas.
3. **Given** hooks configurados para o andar, **When** o andar é criado (Setup com auto-run), executado pelo botão play (Run) ou excluído (Teardown), **Then** os comandos definidos são executados no diretório do andar com acesso às variáveis `$MAESTRI_FLOOR_NAME`, `$MAESTRI_BRANCH_NAME`, `$MAESTRI_FLOOR_PATH`, `$MAESTRI_ROOT_PATH` e `$MAESTRI_PROJECT_NAME`.
4. **Given** alterações commitadas no andar, **When** o usuário clica em "Aterrissar", **Then** a interface apresenta a branch de origem e destino com estatísticas de diff e prévia de conflitos potenciais antes de efetivar o merge via comandos git seguros.
5. **Given** a exclusão de um andar, **When** o usuário confirma a remoção, **Then** o diretório clonado correspondente em `.maestri/floors` é totalmente removido do disco, oferecendo a opção de manter ou excluir a branch git correspondente.

---

### User Story 9 - Compositor de Prompts Rico Flutuante, Menções (@) e Rascunhos Persistentes (Priority: P2)

Como usuário redigindo prompts complexos e contextuais para agentes, quero um Compositor de Prompts flutuante e expansível ancorado ao terminal ativo (`Ctrl+Shift+P`), com suporte a menções estruturadas via `@` (terminais, notas vivas, portais, arquivos e `@Maestro`), anexação direta de imagens (pixels puros para o agente) e arquivos, e rascunhos persistentes independentes por terminal, para compor instruções precisas sem perder texto ao alternar de tela.

**Why this priority**: Reduz drasticamente o tempo gasto na preparação de prompts contextuais. O usuário referencia graficamente qualquer entidade do canvas e o agente recebe os dados resolvidos em tempo real.

**Independent Test**: Focar em um terminal e teclar `Ctrl+Shift+P` para abrir o compositor flutuante; digitar `@` e selecionar uma nota conectada e um arquivo do projeto; colar um screenshot e validar o chip inline inclinado; redigir parte do texto, alternar de workspace e retornar para verificar que o rascunho continua intacto; teclar Enter para enviar ao terminal e verificar a resolução do contexto.

**Acceptance Scenarios**:

1. **Given** o foco em um terminal, **When** o usuário pressiona `Ctrl+Shift+P`, **Then** o Compositor de Prompts se abre flutuando sobre a base do terminal e acompanha dinamicamente as mudanças de foco de terminal para terminal.
2. **Given** o campo do compositor aberto, **When** o usuário digita `@`, **Then** um menu de autocompletar exibe os terminais conectados, notas (com leitura do conteúdo vivo), portais, busca de arquivos de projeto, comando `@Maestro` para orquestração e ações de criação rápida (`@New Note`, `@New Portal`, `@New Device Portal`).
3. **Given** uma imagem colada no compositor, **When** o usuário a envia para agentes compatíveis (Claude Code, Codex, Gemini), **Then** os dados visuais são entregues diretamente em pixels nativos; em terminais SSH, os bytes da imagem são transmitidos para resolução remota no servidor host.
4. **Given** um prompt parcialmente digitado com menções e pills, **When** o usuário pressiona `Esc` ou navega para outro andar/workspace, **Then** o rascunho daquele terminal específico permanece salvo na íntegra para quando o usuário retornar, sendo descartado apenas após o envio efetivo com `Return`.
5. **Given** o compositor aberto mas sem texto digitado, **When** o usuário pressiona setas, `Return` ou `Tab`, **Then** essas teclas são repassadas diretamente para a sessão do terminal subjacente (permitindo responder prompts do agente sem fechar o composer).

---

### User Story 10 - Batuta Search (Paleta de Comandos Unificada), Busca Global e Ações Rápidas (Priority: P3)

Como usuário operando exclusivamente pelo teclado, quero uma paleta de comandos global (Batuta Search) acessível com `Ctrl+P` que realiza busca fuzzy ignorando caixa e acentos em todos os workspaces, andares, terminais, notas (título e corpo), arquivos e portais, permitindo pular diretamente para qualquer nó ou executar ações globais e contextuais (como "Pedir..." e "Verificar..."), para navegar e controlar todo o aplicativo instantaneamente.

**Why this priority**: Centraliza a navegação sem mouse. Em projetos com dezenas de nós distribuídos em múltiplos andares e workspaces, a busca instantânea com prévia ao vivo e despacho de prompts é o multiplicador definitivo de produtividade.

**Independent Test**: Pressionar `Ctrl+P` em qualquer ponto do app; pesquisar um termo com caracteres sem acento (ex: "cafe") e validar correspondência em palavras acentuadas ("Café"); combinar termos (ex: "claude api") para filtrar terminais específicos; selecionar um nó para verificar o canvas navegando até ele; limpar o campo de busca e executar a ação "Pedir...", digitando uma mensagem multilinha e acompanhando a resposta ao vivo.

**Acceptance Scenarios**:

1. **Given** a paleta Batuta Search aberta via `Ctrl+P`, **When** o usuário digita uma busca fuzzy, **Then** o sistema indexa e classifica resultados considerando nomes, tipos, workspaces, apelidos e conteúdo do corpo de notas e blocos de texto, priorizando o workspace atual e destacando caracteres combinados em negrito.
2. **Given** a seleção de um resultado de nota ou terminal na lista de busca, **When** o usuário pressiona `Enter`, **Then** o Maestri desloca suavemente o canvas até o nó correspondente, trocando de workspace ou andar se necessário, abrindo notas em modo de edição e aplicando foco de teclado a terminais ou portais.
3. **Given** a barra de busca limpa (sem texto), **When** a paleta é exibida, **Then** ela lista todas as ações globais disponíveis (criar terminais, notas, portais, workspaces, andares, salvar, alternar barras laterais) e ações contextuais específicas baseadas no nó atualmente selecionado.
4. **Given** a ação "Pedir..." disparada na paleta, **When** o usuário redige uma instrução multilinha e a envia a um terminal selecionado, **Then** uma prévia ao vivo permite acompanhar a resposta gerada diretamente dentro da paleta, com atalho `Ctrl+Enter` para pular para o terminal correspondente.
5. **Given** a ação "Verificar...", **When** acionada, **Then** uma visualização somente leitura exibe o fluxo de saída em tempo real do terminal selecionado sem interromper a execução do agente.

---

### Edge Cases

- **Queda de conectividade ou encerramento abrupto do app**: Todos os layouts espaciais, posições de nós, estados de conexões, rascunhos de prompts do compositor e arquivos de notas vinculados devem ser persistidos atomicamente em disco sem corrupção. Ao reabrir, os workspaces devem ser restaurados exatamente no mesmo estado visual.
- **Conflito de merge durante aterrissagem de andar**: Se a aterrissagem de um andar encontrar conflitos de merge entre branches, a interface deve alertar claramente o usuário exibindo os arquivos em conflito e bloquear o merge automatizado, orientando a resolução manual antes de prosseguir.
- **Rede ou volume não-APFS no recurso de Andares**: No Windows ou em sistemas de arquivos que não suportam clonagem copy-on-write APFS nativa, o sistema deve usar isolamento direto por branch Git, garantindo integridade sem perda de funcionalidade.
- **Remoção de nó conectado com cabo participante de abraçadeira**: Quando um terminal ou nota que possui cabos reunidos em uma abraçadeira for excluído, os cabos conectados a ele devem ser removidos e a abraçadeira deve se autoajustar para as cordas restantes; se restar apenas uma ou nenhuma corda, a abraçadeira visual deve ser dissolvida sem erros.
- **Seleção do agente receptor durante comunicação inter-agentes**: Se o usuário selecionar ou focar o terminal que está recebendo uma mensagem de outro agente, o Maestri deve pausar a interceptação automática para dar controle manual ao usuário, retomando o monitoramento assim que o nó for desselecionado.
- **Dispositivos móveis sem runtime nativo instalado (ex: Xcode ausente)**: Ao tentar abrir um portal de Simulador iOS em máquinas que não possuem o Xcode ou ferramentas de linha de comando necessárias, o sistema deve apresentar uma mensagem amigável explicando o pré-requisito e oferecer alternativas viáveis (ex: Emulador Android).

---

## Requirements *(mandatory)*

### Functional Requirements

#### 1. Espaços de Trabalho (Workspaces) e Navegação Global
- **FR-001**: O sistema DEVE permitir a criação de múltiplos Espaços de Trabalho isolados, cada um contendo diretório raiz de projeto, ícone de identificação, layout 2D salvo e configurações específicas.
- **FR-002**: O sistema DEVE manter workspaces executando processos em segundo plano quando o usuário alterna entre workspaces.
- **FR-003**: O sistema DEVE suportar importação e exportação de workspaces por meio de pacotes de arquivo com extensão `.maestri`.
- **FR-004**: O sistema DEVE sincronizar bidirecionalmente as alterações feitas entre os arquivos de instrução `CLAUDE.md` e `AGENTS.md` no diretório de trabalho quando a opção de sincronização estiver ativada.
- **FR-005**: O sistema DEVE disponibilizar uma Mini Barra Lateral minimalista exibindo apenas ícones de workspaces, suportando alternância no clique, rótulo no hover, lista de terminais no clique prolongado (long-press) e menu contextual no clique com o botão direito.
- **FR-006**: O sistema DEVE fornecer um botão fixo no canto superior direito para abertura direta do diretório do workspace no editor de código configurado pelo usuário.
- **FR-007**: O sistema DEVE indexar todos os workspaces, notas e terminais no Spotlight do macOS, fornecendo links profundos que abrem o Maestri focando diretamente no elemento pesquisado.
- **FR-008**: O sistema DEVE suportar atalhos de navegação entre workspaces via teclado (`Ctrl + ↑/↓`), atalhos numéricos temporários acionados por toque duplo na tecla `Ctrl`, e rolagem por gesto de trackpad ou mouse com `Ctrl` pressionado.

#### 2. Canvas Espacial e Manipulação de Nós
- **FR-009**: O sistema DEVE renderizar uma área de trabalho 2D infinita com suporte a pan (deslocamento) e zoom contínuo com aceleração suave e controles dedicados de minimapa.
- **FR-010**: O sistema DEVE suportar a inserção de nós dos tipos Terminal, Nota, Texto, Desenho, Árvore de Arquivos e Portais desenhados livremente pelo usuário sobre uma grade de alinhamento de 20pt.
- **FR-011**: O sistema DEVE suportar elevação de nós por meio de duplo clique no cabeçalho para foco centralizado sobreposto ao canvas, e permitir acoplamento do nó elevado nas bordas laterais da tela como coluna vertical de altura total.
- **FR-012**: O sistema DEVE suportar encaixe magnético no estilo mosaico de tiles ao arrastar nós com a tecla `Ctrl` pressionada, alinhando paredes e preenchendo espaços vazios adjacentes dinamicamente.
- **FR-013**: O sistema DEVE permitir agrupar dois ou mais nós selecionados (`Ctrl+G`) em um frame com cabeçalho compartilhado arrastável e renomeável, preservando transparência para cliques e seleções em elementos internos.
- **FR-014**: O sistema DEVE dissolver automaticamente grupos quando o número de elementos internos for reduzido para menos de dois membros.
- **FR-015**: O sistema DEVE fornecer ferramentas de alinhamento e distribuição espacial (à esquerda, centro, direita, topo, meio, fundo, distribuição horizontal e vertical) e arranjo automático em grade uniforme (`Ctrl+Shift+T`).

#### 3. Terminais de Agentes e Sistema de Responsabilidades
- **FR-016**: O sistema DEVE permitir a execução de shells interativos com agentes de código instalados (Claude Code, Codex, OpenCode, etc.), permitindo atribuir nome, ícone e tema a cada terminal.
- **FR-017**: O sistema DEVE gerenciar responsabilidades especializadas (Roles) injetando prompts e configurações dedicadas em subdiretórios com arquivos `CLAUDE.md`/`AGENTS.md` e metadados portáteis `role.json`.
- **FR-018**: O sistema DEVE varrer o diretório do projeto para descobrir e permitir a importação em lote de arquivos `role.json` para a biblioteca de responsabilidades do usuário.
- **FR-019**: O sistema DEVE fornecer esquemas de temas de cores para terminais com mais de 30 predefinições (iTerm2), suporte a alternância automática sincronizada com a aparência clara/escura do sistema operacional e leitura de temas Ghostty personalizados em pasta de usuário.
- **FR-020**: O sistema DEVE sinalizar quando um agente conclui o processamento ou aguarda interação do usuário exibindo um ponto vermelho de atenção no cabeçalho e emitindo notificações nativas no sistema operacional.
- **FR-021**: O sistema DEVE navegar ciclicamente entre terminais que possuem o ponto de atenção ativado por meio do atalho `Ctrl+Shift+A`, percorrendo andares conforme necessário.
- **FR-022**: O sistema DEVE exibir badges numéricos nos cabeçalhos dos terminais ao segurar `Ctrl`, permitindo focar instantaneamente no terminal correspondente ao pressionar o número de 1 a 9.

#### 4. Notas Markdown Espaciais
- **FR-023**: O sistema DEVE armazenar notas como arquivos Markdown válidos no disco, com visualização alternável entre texto puro (Raw) e formatação rica renderizada em tempo real (Formatada).
- **FR-024**: O sistema DEVE permitir a colagem de imagens diretamente na nota (`⌘V`), salvando o asset localmente e renderizando visualmente no modo formatado e como sintaxe de imagem no modo raw.
- **FR-025**: O sistema DEVE derivar o nome da nota a partir de sua primeira linha por padrão, permitindo fixar um nome customizado por duplo clique ou renomeação no menu contextual, e restaurar a nomenclatura automática caso o nome personalizado seja apagado.
- **FR-026**: O sistema DEVE permitir conectar notas entre si formando cadeias hierárquicas, viabilizando a agentes conectados a uma nota raiz percorrer e ler todo o grafo encadeado de notas.
- **FR-027**: O sistema DEVE permitir mover o arquivo físico da nota para um diretório customizado do projeto ("Mover para..."), garantindo que a exclusão da nota no canvas não remova o arquivo do local customizado.
- **FR-028**: O sistema DEVE criar notas no canvas automaticamente ao arrastar arquivos `.md`, `.markdown` ou `.txt` do gerenciador de arquivos do sistema operacional, referenciando o arquivo em seu local original.

#### 5. Conexões Físicas e Comunicação Inter-Agentes
- **FR-029**: O sistema DEVE renderizar conexões visuais entre nós nos estilos "Corda" (com física de suspensão elástica) e "Circuito" (trilhos ortogonais alinhados aos eixos com curvas arredondadas de 90°), configuráveis individualmente.
- **FR-030**: O sistema DEVE permitir criar abraçadeiras visuais desenhando um traço perpendicular sobre múltiplos cabos com a tecla `Alt` pressionada, convergindo-os em um feixe único reposicionável sem alterar a lógica de comunicação.
- **FR-031**: O sistema DEVE disponibilizar uma skill de CLI nos terminais conectados que permite aos agentes enviar comandos e receber respostas de outros agentes conectados.
- **FR-032**: O sistema DEVE interceptar e rotear respostas de agentes de forma autônoma apenas quando o terminal receptor estiver desselecionado, interrompendo o monitoramento automatizado caso o usuário assuma o controle interativo direto do terminal.
- **FR-033**: O sistema DEVE disponibilizar um popover de conexões no nó listando todos os nós interligados (incluindo destinos em outros andares), com suporte a centralização de câmera e exclusão rápida de cabos.

#### 6. Árvore de Arquivos e Editor de Código Embutido
- **FR-034**: O sistema DEVE renderizar nós de Árvore de Arquivos com suporte a 4 modos de visualização: Lista hierárquica, Grade de Ícones com miniaturas Quick Look, Diff lado a lado de alterações não commitadas e Grafo visual de commits Git.
- **FR-035**: O sistema DEVE permitir arrastar arquivos da árvore para terminais (como injeção de contexto) ou diretamente para o canvas (gerando nós nativos de mídia).
- **FR-036**: O sistema DEVE integrar operações Git comuns (Commit, Pull, Push, Checkout, Nova Branch, Merge, Fetch, Stash) acionáveis diretamente no cabeçalho da árvore de arquivos.
- **FR-037**: O sistema DEVE incluir um editor de código integrado nativo no nó da árvore com realce de sintaxe, múltiplos cursores, busca e substituição, auto-fechamento de colchetes, indentação inteligente e atalhos configuráveis.
- **FR-038**: O sistema DEVE permitir selecionar trechos de código no editor embutido ou na tela de diff e citá-los diretamente para um terminal de agente conectado através de botão de chat contextual.
- **FR-039**: O sistema DEVE disponibilizar busca fuzzy de arquivos restrita ao nó da árvore via `Ctrl+P` e busca textual no conteúdo dos arquivos ao prefixar o campo de busca com o caractere `>`.

#### 7. Portais de Navegador e de Dispositivos Móveis
- **FR-040**: O sistema DEVE suportar Portais Web baseados em WebKit com instâncias e cookies isolados, permitindo conectar múltiplos portais para compartilhamento opcional de sessão.
- **FR-041**: O sistema DEVE permitir que agentes de IA controlem portais web programaticamente via linha de comando, executando cliques, digitação, rolagem, navegação de URLs, execução de scripts JavaScript, leitura de DOM e captura de screenshots.
- **FR-042**: O sistema DEVE suportar Portais de Dispositivos Móveis gerenciando Simuladores iOS (no macOS), Emuladores Android e dispositivos Android físicos conectados via USB/Wi-Fi.
- **FR-043**: O sistema DEVE desenhar o buffer de tela do dispositivo diretamente via aceleração de GPU e transmitir entradas táteis, gestos de rolagem, rotação de tela e teclas de botões físicos do sistema.
- **FR-044**: O sistema DEVE expor a árvore de elementos de acessibilidade nativa da aplicação móvel para agentes conectados, permitindo identificar e acionar botões, campos e webviews embutidas por coordenadas exatas e identificadores verdadeiros.

#### 8. Andares (Floors) com Clonagem Isolada
- **FR-045**: O sistema DEVE permitir criar múltiplos Andares isolados vinculados a branches Git utilizando clonagem instantânea copy-on-write APFS no macOS (e branches Git isoladas em outros sistemas operacionais).
- **FR-046**: O sistema DEVE suportar a transição espacial tridimensional do canvas para seleção e visualização de andares e permitir clonar opcionalmente o layout completo de nós do Térreo para o novo andar.
- **FR-047**: O sistema DEVE suportar a configuração de hooks de ciclo de vida (Setup com auto-run, Run sob demanda e Teardown na exclusão) executados com variáveis de ambiente dedicadas (`$MAESTRI_FLOOR_NAME`, `$MAESTRI_BRANCH_NAME`, `$MAESTRI_FLOOR_PATH`, `$MAESTRI_ROOT_PATH`, `$MAESTRI_PROJECT_NAME`).
- **FR-048**: O sistema DEVE fornecer interface de aterrissagem (merge) exibindo a branch de origem e destino, métricas de diff e aviso de conflitos potenciais antes de mesclar as alterações de volta ao repositório principal.

#### 9. Compositor de Prompts Rico
- **FR-049**: O sistema DEVE disponibilizar um Compositor de Prompts flutuante e expansível ancorado ao terminal ativo, ativado pelo atalho `Ctrl+Shift+P` ou botão na barra do terminal, acompanhando a troca de foco entre terminais.
- **FR-050**: O sistema DEVE permitir referenciar nós conectados no prompt digitando `@`, incluindo agentes por nome, notas (com injeção dinâmica de conteúdo ao vivo), portais, arquivos pesquisáveis do projeto, comandos de orquestração `@Maestro` e ações de criação rápida.
- **FR-051**: O sistema DEVE renderizar imagens coladas como miniaturas inline com envio de pixels nativos ao CLI do agente (e transmissão de bytes em sessões SSH), e arquivos anexados como chips com ícones do sistema e caminhos resolvidos.
- **FR-052**: O sistema DEVE reter rascunhos de prompts incompletos de forma independente para cada terminal, persistindo o texto e as menções estruturadas entre trocas de andares e workspaces até o envio efetivo.
- **FR-053**: O sistema DEVE repassar teclas de navegação, Enter e Tab diretamente para a sessão do terminal subjacente quando o compositor estiver aberto e totalmente vazio.

#### 10. Batuta Search (Paleta de Comandos Global)
- **FR-054**: O sistema DEVE fornecer uma paleta de comandos unificada (Batuta Search) aberta via `Ctrl+P` que realiza busca fuzzy ignorando diferenças de caixa alta/baixa e acentuação gráfica.
- **FR-055**: O sistema DEVE indexar todos os nós de todos os workspaces e andares (terminais, notas com corpo de texto completo, arquivos, links, árvores de arquivos, portais e workspaces), destacando os caracteres correspondentes em negrito e priorizando o workspace ativo.
- **FR-056**: O sistema DEVE navegar instantaneamente para o item selecionado na paleta, ajustando a câmera do canvas, alternando de workspace ou andar e concedendo foco de digitação ao nó correspondente.
- **FR-057**: O sistema DEVE listar ações globais e contextuais disponíveis quando o campo de busca estiver vazio, adaptando as ações contextuais com base no nó atualmente selecionado.
- **FR-058**: O sistema DEVE integrar os fluxos "Pedir..." (envio de mensagem multilinha a qualquer terminal com acompanhamento da resposta em tempo real) e "Verificar..." (inspeção em tempo real e somente leitura de saídas de terminais) diretamente no interior da paleta de comandos.

---

### Key Entities *(include if feature involves data)*

- **Workspace**: Entidade raiz do projeto; encapsula diretório de trabalho, identificador, ícone, preferências de sincronização (`CLAUDE.md`/`AGENTS.md`), pastas/grupos e conjunto de andares.
- **Floor (Andar)**: Ambiente de branch isolado associado a um workspace; armazena diretório de clone copy-on-write, layout espacial 2D próprio, configurações de hooks de ciclo de vida e estado de sincronização git.
- **CanvasNode**: Elemento visual posicionado no plano 2D com coordenadas $(X, Y)$, dimensões $(Largura, Altura)$, z-index, estado de elevação, grupo ao qual pertence e dados de conectividade.
- **TerminalNode**: Especialização de CanvasNode representando uma sessão de shell com processo ativo, histórico de saída, ícone, tema, responsabilidade associada, badge de atenção e rascunho de prompt persistente.
- **Role (Responsabilidade)**: Instrução comportamental portátil de agente; representada por arquivo `role.json` contendo nome, cor de identificação, prompt do sistema e convenções de arquivos de instruções.
- **NoteNode**: Especialização de CanvasNode representando um arquivo Markdown vivo; contém caminho de persistência em disco, modo de visualização (Raw ou Formatada), imagens inline e conexões encadeadas.
- **Connection (Conexão)**: Vínculo direcionado ou bidirecional entre dois CanvasNodes; define estilo visual ("Corda" ou "Circuito"), estado de abraçadeiras associadas e habilitação de canal de troca de mensagens inter-agentes.
- **CableTie (Abraçadeira)**: Agrupador magnético visual posicionado sobre um conjunto de conexões físicas; define ponto de convergência de feixes de cabos sem alterar a semântica de comunicação.
- **FileTreeNode**: Especialização de CanvasNode encapsulando um navegador de diretórios com modo de visualização ativo (Lista, Grade, Diff, Grafo Git) e instância embutida de editor de código.
- **PortalNode**: Especialização de CanvasNode encapsulando uma visualização de navegador WebKit ou runtime de dispositivo móvel (iOS/Android), buffer de renderização acelerado por GPU e canal de automação para agentes de IA.
- **PromptDraft**: Estrutura persistente de composição de prompt vinculada a um terminal; armazena texto não enviado, referências de menções (`@`) a nós e arquivos, e anexos de mídia.
- **SearchIndexEntry**: Registro indexado na Batuta Search contendo identificador do elemento, tipo, título, conteúdo textual para busca profunda, tags de contexto, workspace e andar de origem.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O tempo de alternância entre workspaces com restauração completa do layout visual do canvas e terminais ativos deve ocorrer em menos de 300 milissegundos.
- **SC-002**: A renderização do canvas espacial com dezenas de nós, cabos animados com física e miniaturas deve sustentar uma taxa de quadros consistente de pelo menos 60 quadros por segundo em monitores padrão.
- **SC-003**: A criação de um novo Andar via clonagem copy-on-write APFS em volumes suportados no macOS deve ser concluída em menos de 2 segundos, independentemente do tamanho do repositório.
- **SC-004**: O mecanismo de busca da Batuta Search (`Ctrl+P`) deve retornar resultados de busca fuzzy indexando milhares de arquivos, notas e terminais em menos de 100 milissegundos a partir da digitação.
- **SC-005**: A entrega de instruções entre dois agentes conectados via skill de comunicação CLI deve ocorrer com latência de encaminhamento inferior a 150 milissegundos após o término da geração pelo agente de origem.
- **SC-006**: A sincronização automática bidirecional entre `CLAUDE.md` e `AGENTS.md` deve refletir alterações de conteúdo no outro arquivo em menos de 200 milissegundos após o salvamento.
- **SC-007**: 100% dos rascunhos redigidos no Compositor de Prompts devem sobreviver a trocas de workspaces, alternância de andares e fechamento acidental da paleta, sendo limpos apenas pelo envio voluntário do usuário.
- **SC-008**: O editor de código integrado na Árvore de Arquivos deve ser capaz de carregar e colorir sintaxe de arquivos de texto de até 10.000 linhas sem congelar a interface do usuário.
- **SC-009**: O tempo de resposta para focar um nó específico no Maestri a partir de um clique em resultado da busca nativa do Spotlight do macOS deve ser inferior a 500 milissegundos.
- **SC-010**: A taxa de assertividade na identificação de elementos na automação de portais de dispositivos móveis por agentes via árvore de acessibilidade nativa deve ser superior a 98%.

---

## Assumptions

- **Ambiente de Agentes**: O usuário possui agentes de linha de comando suportados (como Claude Code, Codex ou OpenCode) previamente instalados e acessíveis no PATH de seu sistema operacional.
- **Suporte a Sistemas Operacionais**: O aplicativo opera integralmente no macOS e no Windows. Recursos exclusivamente nativos do macOS (como integração de busca com o Spotlight, Simuladores iOS via Xcode e clonagem copy-on-write via APFS) degradam graciosamente para mecanismos universais (busca interna Batuta Search, Emuladores Android e branches Git convencionais) no ambiente Windows.
- **Comunicação Inter-Agentes e Foco**: A automação de resposta entre agentes interconectados pressupõe que o terminal receptor esteja desselecionado no momento da emissão da resposta, garantindo que intervenções manuais diretas do usuário sempre tenham precedência de controle sobre a automação.
- **Armazenamento de Notas e Persistência**: Por padrão, notas criadas no canvas que não forem explicitamente movidas para um diretório de projeto residem no armazenamento interno de dados do Maestri, sendo salvas em formato Markdown legível padrão UTF-8.
- **Isolamento de Portais Web**: As instâncias de portais web operam sob motores WebKit isolados com armazenamento local separado por padrão, a menos que sejam explicitamente conectadas entre si por cabos no canvas.

