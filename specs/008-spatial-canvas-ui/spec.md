# Feature Specification: Maestri Spatial 2D Canvas & Liquid Glass UI

**Feature Branch**: `008-spatial-canvas-ui`

**Created**: 2026-09-08

**Status**: Draft

**Input**: User description: "Atue como um Engenheiro de Front-end Sênior especialista em UI/UX, focado em criar interfaces modernas, fluidas e espaciais (Spatial UI). O meu projeto é o 'terminalManager' e o objetivo agora é refatorar drasticamente a interface para que ela se pareça e se comporte como o app 'Maestri' (um orquestrador de agentes de IA baseado em canvas infinito). A interface deve abandonar o padrão clássico de 'grid estático ou abas' e adotar um modelo de 'Área de Trabalho Espacial 2D'. Requisitos detalhados: 1. Design System Liquid Glass (macOS / Glassmorphism, Dark Mode elegante, dot grid pattern sutil); 2. Canvas Infinito com navegação espacial (pan, zoom, nós flutuantes em X/Y livre, z-index dinâmico); 3. Componentes Principais (Janelas de Terminal macOS flutuantes com header translúcido e padding integrado; Notas Adesivas Markdown; Bloco de Árvore de Arquivos flutuante; Cabos/Conexões Bezier SVG dinâmicos); 4. Overlays Flutuantes (Compositor de Prompts Rico e arredondado ancorável sob o terminal ativo; Barra de Ferramentas estilo macOS Dock flutuante de vidro); 5. Efeitos de feedback tátil e transições amanteigadas (buttery smooth)."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Navegação Espacial no Canvas Infinito com Malha Pontilhada (Priority: P1)

Como desenvolvedor orquestrando múltiplos fluxos e agentes de IA, quero uma área de trabalho espacial 2D infinita com malha pontilhada (dot grid) sutil e suporte intuitivo a deslocamento da câmera (Pan) e ampliação/redução (Zoom), para que eu possa organizar livremente meus nós de trabalho em qualquer coordenada bidimensional sem limitações de abas ou grids rígidos.

**Why this priority**: É a fundação do produto. Sem o motor de canvas espacial infinito e sem a navegação por pan e zoom, o modelo mental de desktop espacial estilo Maestri não existe.

**Independent Test**: Abrir o aplicativo, arrastar o fundo da tela com o ponteiro do mouse para realizar Pan, aproximar/afastar usando a rolagem do mouse ou gesto do trackpad para realizar Zoom, e verificar que o padrão de malha pontilhada acompanha perfeitamente a transformação da câmera com taxa de quadros fluida (60fps).

**Acceptance Scenarios**:

1. **Given** a área de trabalho espacial aberta, **When** o usuário clica e arrasta sobre o fundo vazio do canvas (ou usa clique do meio / barra de espaço + arrasto), **Then** a visualização translada suavemente em tempo real em todas as direções cartesianas (X e Y).
2. **Given** o canvas em qualquer posição, **When** o usuário rola o scroll do mouse ou realiza o gesto de pinça no trackpad, **Then** o nível de zoom se ajusta de forma contínua em direção ao ponto focal do cursor (zoom-to-cursor), entre limites confortáveis (ex: 20% a 300%).
3. **Given** múltiplos nós distribuídos pelo espaço, **When** a câmera se desloca ou altera a escala de zoom, **Then** a malha de pontos sutis de fundo (`dot grid pattern`) renderiza com espaçamento visual coerente e contraste sutil sobre o tema escuro.
4. **Given** qualquer nó existente no canvas, **When** o usuário clica sobre ele, **Then** o nó é elevado imediatamente ao topo da pilha visual (`z-index` dinâmico mais alto), recebendo o foco de interação.

---

### User Story 2 - Janelas de Terminal Flutuantes com Estética Liquid Glass macOS (Priority: P1)

Como desenvolvedor utilizando agentes de linha de comando, quero que cada terminal seja uma janela flutuante elegante com cantos arredondados, bordas translúcidas finas e sombras de profundidade que remetam à fluidez nativa do macOS (Glassmorphism), com cabeçalho refinado e espaçamento interno que integre a área do terminal ao vidro escurecido.

**Why this priority**: O terminal é o nó de maior valor e frequência de uso. Ele deve transmitir qualidade visual premium, legibilidade impecável e sensação tátil imediata.

**Independent Test**: Criar um nó de terminal no canvas, movê-lo sobre outros nós e o dot grid, observar o efeito de desfoque de fundo (backdrop blur), verificar a transição suave de foco e borda, e interagir com comandos do terminal com padding perfeitamente integrado.

**Acceptance Scenarios**:

1. **Given** um nó de terminal criado no canvas, **When** ele é renderizado, **Then** apresenta geometria com cantos generosamente arredondados (`rounded-xl` ou `rounded-2xl`), borda sutil de 1px com reflexo translúcido (`border-white/15`), e sombra de profundidade (`drop-shadow-2xl`).
2. **Given** a barra de título do terminal, **When** visualizada, **Then** apresenta visual fino e translúcido contendo o nome do agente/processo, badge identificador e controles de janela (fechar, minimizar/maximizar, configurações) inspirados no padrão macOS.
3. **Given** o corpo do terminal executando comandos ou agentes, **When** o texto flui, **Then** o espaçamento interno (padding) abraça harmonicamente a cor de fundo do terminal, sem frestas ou cortes visuais indesejados.
4. **Given** o usuário arrastando a barra de título de um nó de terminal, **When** o nó está em movimento, **Then** o nó recebe feedback tátil sutil (leve alteração de opacidade ou escala suave) e acompanha o cursor sem atraso perceptível.

---

### User Story 3 - Barra de Ferramentas Estilo Dock Flutuante Translúcido (Priority: P1)

Como usuário, quero interagir com uma barra de ferramentas suspensa e centralizada em formato de Dock flutuante com efeito de vidro líquido ("Liquid Glass Dock"), contendo botões de ação rápida para instanciar novos terminais, notas, árvores de arquivos e conexões, libertando o topo da tela de menus fixos e antiquados.

**Why this priority**: A barra de ferramentas define a identidade espacial do produto e liberta a tela de layouts de janelas estáticas convencionais, unificando a criação de entidades.

**Independent Test**: Observar a barra de ferramentas flutuando no viewport com fundo fosco translúcido e bordas de vidro, acionar a criação de diferentes nós e validar que os nós surgem próximos ao centro visível da câmera ou na posição desejada.

**Acceptance Scenarios**:

1. **Given** o aplicativo em exibição, **When** o usuário observa a interface global, **Then** a barra de ferramentas aparece como um Dock flutuante isolado (posicionado centralizado na base ou topo da tela), com cantos arredondados, fundo de vidro escuro fosco (`backdrop-blur`) e sem ocupar 100% da largura da janela.
2. **Given** os botões do Dock ("Novo Terminal", "Nova Nota", "Nova Árvore de Arquivos", "Conexão/Fio"), **When** o usuário passa o cursor sobre eles, **Then** animações de hover suaves (elevação suave e brilho sutil) indicam o estado interativo.
3. **Given** o clique em qualquer botão de criação do Dock, **When** acionado, **Then** a entidade correspondente é instanciada na área visível da câmera com animação de surgimento suave.
4. **Given** atalhos de zoom e centralização (1:1, Fit, Center) no Dock, **When** acionados, **Then** a câmera interpola suavemente para a posição ou escala solicitada.

---

### User Story 4 - Compositor de Prompts Rico e Flutuante com Ancoragem Magnética (Priority: P2)

Como desenvolvedor interagindo intensamente com agentes e LLMs nos terminais, quero uma barra de entrada de prompt rica, arredondada e flutuante que possa ficar ancorada magnética e harmonicamente logo abaixo do terminal ativo ("Docked Composer") ou flutuar livremente, permitindo redigir prompts longos e comandos com foco e ergonomia superiores.

**Why this priority**: A interação com agentes é centrada em comandos e prompts conversacionais; uma barra de entrada contextual e fluida evita o confinamento aos limites acanhados de uma única linha de comando em terminais pequenos.

**Independent Test**: Focar um terminal ativo, observar o Compositor de Prompts surgir ou se posicionar encaixado logo abaixo da janela do terminal, digitar uma mensagem com suporte a quebra de linha e expansão elástica, enviar para o terminal com `Enter` (ou `Cmd+Enter`), e alternar para modo flutuante livre.

**Acceptance Scenarios**:

1. **Given** um terminal ativo selecionado, **When** o usuário abre ou foca a entrada de prompt, **Then** o Compositor de Prompts se alinha e ancora diretamente abaixo da borda inferior do terminal ativo (Docked Composer), acompanhando a largura e posição da janela.
2. **Given** o usuário optando por desacoplar o compositor, **When** arrasta o compositor pela sua alça de controle, **Then** ele se torna uma janela flutuante independente que pode ser colocada em qualquer ponto da tela.
3. **Given** a digitação no compositor, **When** o usuário insere múltiplas linhas de texto, **Then** a caixa de entrada expande verticalmente de forma fluida até um limite ergonômico, mantendo efeito de vidro e foco visual.
4. **Given** um comando pronto no compositor, **When** o usuário pressiona `Enter` (ou `Cmd/Ctrl+Enter`), **Then** o texto é transmitido imediatamente para o processo do terminal ativo e o campo é limpo ou preservado conforme configuração.

---

### User Story 5 - Nós de Notas Markdown e Árvore de Arquivos Flutuante em Vidro Líquido (Priority: P2)

Como usuário planejando projetos e inspecionando código, quero que as Notas Adesivas em Markdown e a Árvore de Arquivos do projeto se comportem como blocos/widgets flutuantes no canvas com o mesmo padrão estético Liquid Glass, permitindo documentar ideias e navegar na estrutura do projeto lado a lado com os terminais.

**Why this priority**: O Maestri se diferencia por unificar o ecossistema de trabalho (código, documentação e arquivos) em uma única superfície espacial contínua.

**Independent Test**: Instanciar um nó de Árvore de Arquivos e um nó de Nota no canvas, posicioná-los ao lado de um terminal, editar markdown na nota e navegar por pastas na árvore de arquivos sem que nenhum menu lateral fixo ocupe a tela.

**Acceptance Scenarios**:

1. **Given** a criação de um nó de Árvore de Arquivos, **When** exibido no canvas, **Then** ele se apresenta como um card flutuante translúcido arrastável, contendo a navegação hierárquica de arquivos e pastas do projeto, substituindo a necessidade de uma barra lateral estática fixa.
2. **Given** a criação de um nó de Nota, **When** renderizado, **Then** apresenta acabamento translúcido (com opção de matiz pastel suave ou vidro neutro escuro), cantos arredondados e tipografia refinada para Markdown formatado.
3. **Given** o nó de Nota, **When** o usuário clica para editar, **Then** alterna suavemente entre visualização Markdown rica e modo de edição, preservando a diagramação.
4. **Given** múltiplos nós heterogêneos no canvas (Terminal, Nota, Arquivos), **When** o usuário os organiza visualmente, **Then** todos compartilham a mesma elevação z-index dinâmica e sombras de profundidade coerentes.

---

### User Story 6 - Cabos e Conexões Físicas em Curvas Bezier Dinâmicas (Priority: P3)

Como arquiteto de fluxos de agentes, quero conectar nós entre si (terminal com terminal, terminal com nota ou arquivo) através de cabos visuais curvos (Bezier curves em SVG) que se atualizem dinamicamente ao mover os nós, transmitindo a sensação de cabeamento físico de um estúdio de áudio ou sintetizador modular.

**Why this priority**: Enriquece a clareza do fluxo de orquestração entre agentes e documentos de contexto, completando a metáfora espacial avançada do Maestri.

**Independent Test**: Puxar uma conexão entre a porta de saída de um nó de terminal até um nó de nota ou outro terminal, mover qualquer um dos nós pelo canvas e validar que a curva Bezier se recalcula suavemente sem cortes, tremulações ou atrasos.

**Acceptance Scenarios**:

1. **Given** dois nós no canvas, **When** o usuário arrasta a partir do ponto de conexão de um nó em direção a outro, **Then** uma curva de Bézier suave com gradiente luminoso é desenhada acompanhando o ponteiro.
2. **Given** uma conexão estabelecida entre dois nós, **When** qualquer um dos nós é transladado ou redimensionado, **Then** os pontos de controle da curva são recalculados em tempo real, mantendo curvatura física natural.
3. **Given** conexões ativas na tela, **When** a visualização espacial é ampliada ou reduzida (Zoom), **Then** as linhas mantêm espessura e resolução vetoriais perfeitas sem pixelização.

---

### Edge Cases

- **Telas com densidade variada e monitores ultrawide**: Como o canvas se comporta ao mover a janela entre telas Retina/HiDPI e monitores convencionais? A malha de pontos e os fios SVG devem reescalar sem borrões e com alinhamento subpixel exato.
- **Terminais redimensionados com TUI complexa (htop, neovim, claude)**: Quando a janela flutuante é redimensionada pelas bordas ou cantos, os caracteres do terminal devem recalcular colunas e linhas sem piscar e o container de vidro deve conter a renderização sem artefatos de overflow.
- **Dezenas de nós no canvas simultaneamente**: Quando o usuário possui mais de 20 nós com blur ativo (`backdrop-filter`), o motor de renderização deve manter desempenho suave de rolagem e pan, otimizando o isolamento de camadas compostas (`will-change: transform`).
- **Nó arrastado para coordenadas negativas extremas ou fora do campo de visão**: A câmera deve permitir navegar até qualquer quadrante do espaço, e a barra de ferramentas deve oferecer botão rápido para recentralizar a visão no nó ativo ou em `(0, 0)`.
- **Perda de ponteiro do mouse durante arrasto rápido sobre iframes/webviews ou canvas**: Os listeners de arrasto devem capturar ponteiro globalmente (`setPointerCapture` ou overlay transparente de arrasto) para evitar que o nó "grude" ou solte inadvertidamente ao passar sobre áreas com tratamento especial de eventos.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE fornecer um espaço de trabalho infinito 2D navegável via Pan (translação nos eixos X e Y) e Zoom contínuo (escala proporcional).
- **FR-002**: O fundo da área de trabalho espacial DEVE exibir um padrão de malha pontilhada sutil (`dot grid pattern`) que se move e escala em consonância com as coordenadas da câmera.
- **FR-003**: O sistema DEVE adotar o tema Dark Mode elegante como padrão nativo, com contraste balanceado e paleta baseada em tons profundos de grafite e vidro escurecido.
- **FR-004**: Todos os elementos flutuantes primários (terminais, notas, árvore de arquivos, docks e compositores) DEVEM utilizar o Design System "Liquid Glass", caracterizado por superfícies translúcidas, desfoque de fundo (`backdrop-filter: blur`), bordas sutis com iluminação de borda de 1px e sombras de elevação com profundidade.
- **FR-005**: Todo elemento no canvas DEVE ser instanciado como um Nó Flutuante independente, com coordenadas `(x, y)` e dimensões `(width, height)` livres e persistentes.
- **FR-006**: Ao clicar sobre qualquer nó flutuante, o sistema DEVE elevá-lo imediatamente à camada superior através de gestão dinâmica de `z-index`, aplicando feedback visual de foco na borda da janela.
- **FR-007**: As Janelas de Terminal DEVEM possuir cantos arredondados generosos (`rounded-xl` ou `rounded-2xl`), uma barra de título fina e translúcida com identificação do terminal e botões de controle integrados, e área de saída (TUI) com padding harmonizado ao fundo escuro.
- **FR-008**: Durante a operação de arrasto de um nó, o sistema DEVE fornecer feedback visual tátil imediato (suave variação de opacidade e/ou microescala com transição física).
- **FR-009**: O sistema DEVE substituir a barra de navegação estática superior presa à janela por uma Barra de Ferramentas suspensa estilo macOS Dock flutuante, com efeito de vidro líquido e cantos arredondados, centralizada ergonomicamente.
- **FR-010**: A Barra de Ferramentas Dock DEVE conter ações acessíveis para criação de novos nós (Terminal, Nota, Árvore de Arquivos, Conexão), controles de câmera (Reset 1:1, Ver Tudo, Centralizar) e indicação de status do sistema.
- **FR-011**: O sistema DEVE disponibilizar um Compositor de Prompts Rico ("Rich Prompt Composer") com formato de pílula arredondada translúcida flutuante, projetado para redação e injeção de comandos nos terminais.
- **FR-012**: O Compositor de Prompts DEVE suportar modo ancorado magnético ("Docked Composer") que se acopla automaticamente abaixo da janela do terminal atualmente focado, expandindo-se dinamicamente com quebras de linha.
- **FR-013**: O Compositor de Prompts DEVE permitir desanexação sob demanda, possibilitando ao usuário arrastá-lo livremente pelo canvas como um painel flutuante autônomo.
- **FR-014**: O sistema DEVE disponibilizar Nós de Notas Adesivas capazes de exibir e formatar conteúdo Markdown enriquecido, com suporte a alternância fluida entre visualização formatada e modo de edição.
- **FR-015**: O sistema DEVE disponibilizar um Nó de Árvore de Arquivos em formato de bloco flutuante arrastável no canvas, possibilitando inspeção da estrutura do diretório do projeto sem depender de barras laterais fixas que comprimam o espaço visual.
- **FR-016**: O sistema DEVE fornecer conexões visuais vetoriais dinâmicas (cabos/fios em curvas Bézier SVG) ligando nós compatíveis, mantendo a curvatura natural e acompanhando o movimento dos nós sem latência visual perceptível.
- **FR-017**: Todas as transições de estado visual (hover em botões, foco de janela, ancoragem de compositor, elevação e minimização) DEVEM empregar curvas de atenuação suaves ("buttery smooth" transitions), garantindo fluidez que emule a experiência de aplicativos nativos do macOS.
- **FR-018**: O sistema DEVE garantir que a rolagem interna do terminal (histórico de comandos/scrollback do xterm) não interfira no zoom do canvas quando o cursor estiver ativamente focado na superfície do terminal.
- **FR-019**: O estado espacial do canvas (posição da câmera, nível de zoom, coordenadas de cada nó, estado das conexões e nós minimizados/expandidos) DEVE ser salvo de forma resiliente e restaurado fielmente ao reabrir o aplicativo ou alternar entre projetos.
- **FR-020**: O sistema DEVE garantir acessibilidade e respeito a configurações do usuário de movimento reduzido (`prefers-reduced-motion`), suavizando ou desabilitando animações expansivas conforme a preferência do sistema operacional.

---

### Key Entities

- **SpatialCanvas**: Representa a superfície 2D contínua infinita. Possui atributos de translação de câmera `(cameraX, cameraY)`, fator de escala `zoomLevel`, dimensões virtuais e configurações de malha pontilhada (`dotGridSpacing`, `dotGridColor`).
- **CanvasNode**: Entidade base para qualquer elemento colocado no canvas. Possui identificador único `id`, tipo (`terminal`, `note`, `filetree`, `portal`), coordenadas espaciais `(x, y)`, dimensões `(width, height)`, índice de empilhamento `zIndex`, estado de minimizado/elevado e metadados visuais.
- **TerminalWindowNode** (especialização de `CanvasNode`): Representa uma janela de terminal macOS flutuante. Contém título da sessão, identificador do processo ou agente associado, tema de cores, padding interno e configurações de shell.
- **MarkdownNoteNode** (especialização de `CanvasNode`): Representa um post-it ou documento flutuante no canvas. Contém corpo de texto em Markdown, modo atual (`rendered` ou `editing`), e paleta de matiz translúcido.
- **FileTreeNode** (especialização de `CanvasNode`): Representa o explorador de arquivos desancorado. Contém caminho raiz do projeto, mapa de diretórios expandidos/recolhidos e arquivo atualmente selecionado.
- **FloatingDock**: Entidade de controle de interface suspensa. Contém lista de ferramentas e atalhos disponíveis, posição na tela (topo ou rodapé centralizado) e estado de visibilidade.
- **PromptComposer**: Entidade do compositor rico flutuante. Possui texto de entrada atual, estado de ancoragem (`isDocked`, `anchoredNodeId`), dimensões elásticas e histórico de envio recente.
- **SpatialConnection**: Representa um fio ou cabo físico ligando dois nós. Contém nó de origem `sourceNodeId`, porta de saída `sourceAnchor`, nó de destino `targetNodeId`, porta de entrada `targetAnchor` e pontos de controle da curva Bézier.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A movimentação de câmera (Pan) e ampliação/redução (Zoom) no canvas infinito DEVE operar com taxa de atualização consistente de 60 quadros por segundo (60 FPS) em condições usuais de uso (até 15 nós ativos simultaneamente).
- **SC-002**: O tempo de resposta perceptual ao arrastar um nó ou clicar para elevar o `z-index` da janela DEVE ser inferior a 16 milissegundos (feedback visual instantâneo sem travamentos perceptíveis).
- **SC-003**: 100% dos nós presentes no espaço de trabalho (terminais, notas, árvore de arquivos) devem adotar fielmente o design system translúcido "Liquid Glass" com bordas de 1px e sombras de profundidade sem discrepâncias visuais ou fundos sólidos recortados.
- **SC-004**: O Compositor de Prompts ancorado DEVE acompanhar a movimentação e o redimensionamento do terminal ativo de maneira perfeitamente sincronizada em tempo real (diferença de alinhamento visual de 0 pixels durante repouso).
- **SC-005**: Ao redimensionar ou mover nós conectados por cabos vetoriais, as curvas Bézier SVG DEVEM recalcular seus trajetos em tempo real com atraso imperceptível (< 16ms), mantendo sensação de conexão física orgânica.
- **SC-006**: Ao fechar e reabrir o aplicativo, 100% das coordenadas espaciais `(x, y)`, tamanhos, z-index relativo e conexões de todos os nós DEVEM ser restaurados exatamente na posição onde o usuário os deixou.
- **SC-007**: A taxa de conclusão com sucesso na criação de novos nós a partir do macOS Dock flutuante DEVE ser de 100% no primeiro clique para qualquer usuário familiarizado com o sistema.

---

## Assumptions

- O aplicativo continuará funcionando como aplicação desktop baseada no ambiente web/Electron existente do projeto `terminalManager`, com suporte pleno a APIs de aceleração gráfica por hardware (CSS 3D Transforms, `backdrop-filter`, SVG e Canvas 2D).
- O suporte ao tema Dark Mode elegante é a prioridade visual primária do design system "Liquid Glass", com valores padrão otimizados para fundos escuros e translúcidos.
- A árvore de arquivos em formato de nó flutuante não elimina a possibilidade futura de reabrir um painel lateral, mas se torna a representação padrão do espaço de trabalho espacial.
- O Compositor de Prompts enriquecido transmitirá strings formatadas diretamente para o fluxo de entrada (`stdin`) do terminal associado quando submetido.
- Os cálculos matemáticos de curvas de Bézier cúbicas para cabos físicos calcularão dinamicamente as âncoras mais próximas (topo, base, esquerda, direita) de cada nó conectado para evitar nós ou trajetos não-naturais.
