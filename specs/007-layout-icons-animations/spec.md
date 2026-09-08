# Feature Specification: Layout, Iconografia e Animações do Maestri

**Feature Branch**: `007-layout-icons-animations`

**Created**: 2026-09-08

**Status**: Draft

**Input**: User description: "Layout, Iconografia e Animações do Maestri: padronização visual completa com ícones vetoriais (Lucide), mini-sidebar com agrupamento de workspaces, física pendular e circuitos animados de cabos, transições fluidas de canvas a 60fps, animações de elevação/acoplamento e acessibilidade para redução de movimento."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Padronização Visual Global com Ícones Vetoriais Lucide (Priority: P1)

Como usuário do canvas espacial, desejo que toda a interface (barra de ferramentas, nós espaciais, menus, árvore de arquivos e barra lateral) utilize ícones vetoriais modernos, nítidos e consistentes (estilo Lucide, traço de 1.5px), substituindo caracteres de texto e emojis estáticos, para que o produto tenha aparência profissional, coesa e legível em qualquer resolução ou tema.

**Why this priority**: A identidade visual e clareza imediata das ações é o primeiro ponto de contato do usuário. Ícones vetoriais nítidos e padronizados eliminam a aparência de protótipo e garantem escalabilidade visual perfeita em telas retina/HiDPI.

**Independent Test**: Abrir o aplicativo e verificar visualmente todas as ferramentas da barra superior, botões dos nós (fechar, conectar, focar, duplicar), árvore de arquivos e barra lateral, comprovando que todos exibem ícones vetoriais com traço uniforme de 1.5px, resposta de realce no cursor (hover) e suporte à cor do tema ativo.

**Acceptance Scenarios**:

1. **Given** o canvas aberto com barra de ferramentas e nós, **When** o usuário observa os botões de ação e ferramentas, **Then** todos os ícones são exibidos em formato vetorial uniforme com traço de 1.5px e pontas arredondadas, sem artefatos ou desalinhamento.
2. **Given** um ícone de botão na interface, **When** o usuário passa o cursor sobre ele (hover), **Then** o ícone muda suavemente de contraste e exibe um fundo circular sutil destacando sua interatividade.
3. **Given** um nó ou ferramenta selecionada, **When** o estado ativo é estabelecido, **Then** o ícone assume a cor de destaque do tema com fundo de realce correspondente.

---

### User Story 2 - Barra Lateral Refinada com Mini-Sidebar e Agrupamento (Priority: P1)

Como desenvolvedor com múltiplos projetos, desejo poder recolher a barra lateral de workspaces em uma mini-barra lateral estreita (~48px) mostrando apenas ícones, expandir ao passar o cursor, e organizar meus workspaces em pastas e seções com reordenação por arrastar e soltar, para maximizar o espaço útil do canvas mantendo navegação ágil.

**Why this priority**: O espaço em tela é o recurso mais valioso em um canvas infinito. Permitir recolher e reordenar facilmente workspaces resolve a sobrecarga visual para usuários com múltiplos fluxos de trabalho.

**Independent Test**: Criar 3 workspaces, recolher a barra para modo mini, alternar entre eles clicando nos ícones compactos, arrastar um workspace para dentro de uma pasta e reordená-los visualmente, conferindo a exibição dos atalhos numéricos no teclado (`Ctrl`).

**Acceptance Scenarios**:

1. **Given** a barra lateral expandida, **When** o usuário clica no botão de recolher, **Then** a barra transiciona suavemente para a largura estreita (~48px) exibindo apenas os ícones e divisores.
2. **Given** a mini-barra lateral ativa, **When** o usuário repousa o cursor sobre ela, **Then** a barra se expande temporariamente ou exibe os nomes completos dos workspaces em rótulo flutuante.
3. **Given** a lista de workspaces, **When** o usuário arrasta um workspace para outra posição ou sobre uma pasta, **Then** uma indicação visual de inserção é exibida e a nova ordenação/agrupamento é persistida.
4. **Given** o usuário pressionando a tecla de atalho de navegação (`Ctrl`), **When** a tecla permanece pressionada, **Then** badges numéricos surgem ao lado dos ícones da barra lateral para salto direto por número.

---

### User Story 3 - Transições e Navegação Fluida no Canvas (Priority: P2)

Como usuário navegando por dezenas de elementos no canvas, desejo transições animadas suaves e com sensação de inércia ao mover, duplicar, excluir e focar nós (`Ctrl+\`), além de zoom contínuo suave centrado no cursor, para manter a orientação espacial sem saltos visuais bruscos.

**Why this priority**: Movimentação com física e transições espaciais fluidas reduzem a desorientação cognitiva ao manipular nós e layouts complexos em espaços bidimensionais extensos.

**Independent Test**: Selecionar um nó e acionar `Ctrl+\` para verificar a animação de centralização suave (fly-to de 300ms); duplicar um nó com `Alt+arraste` conferindo animação de escala/fade-in (0.8 → 1.0); e excluir com `Ctrl+W` conferindo o encolhimento com fade-out (200ms).

**Acceptance Scenarios**:

1. **Given** um nó fora do centro de visão, **When** o usuário aciona o comando de focar (`Ctrl+\`), **Then** a viewport realiza uma transição suave e contínua até centralizar o nó em aproximadamente 300ms com desaceleração natural.
2. **Given** um nó selecionado, **When** o usuário arrasta segurando `Alt`, **Then** o nó duplicado surge na nova posição com animação de fade-in e leve expansão elástica.
3. **Given** um nó em tela, **When** o usuário comanda sua remoção, **Then** o elemento encolhe suavemente acompanhado de desvanecimento de opacidade em cerca de 200ms antes de ser eliminado do canvas.
4. **Given** múltiplos nós selecionados, **When** o usuário aciona a organização em grade (`Ctrl+Shift+T`), **Then** os nós deslizam simultaneamente e com suavidade para suas novas posições alinhadas.

---

### User Story 4 - Conexões com Física Pendular, Circuitos e Abraçadeiras (Priority: P2)

Como usuário interligando agentes e nós, desejo que as conexões em estilo "Corda" tenham física pendular suave simulando elasticidade ao mover elementos, que o estilo "Circuito" trace caminhos ortogonais com cantos arredondados, e que conexões agrupadas em abraçadeiras convirjam harmoniosamente, com indicador de pulso luminoso durante troca de dados.

**Why this priority**: Os cabos representam o fluxo de dados e cooperação entre agentes. Dar vida visual às conexões torna a orquestração multiagente tangível e perceptível.

**Independent Test**: Conectar dois nós no modo corda e arrastar um deles em círculos observando a oscilação elástica da curva; alternar para circuito e verificar o traçado em 90° com curvas de canto; agrupar dois cabos em abraçadeira e conferir o pulso luminoso quando mensagens fluem.

**Acceptance Scenarios**:

1. **Given** dois nós conectados no estilo Corda, **When** um nó é movido, **Then** a curva do cabo reage com leve atraso e oscilação amortecida imitando gravidade e elasticidade.
2. **Given** dois nós conectados no estilo Circuito, **When** sua posição relativa muda, **Then** a rota de 90° é recalculada com transição fluida nos vértices arredondados.
3. **Given** cabos agrupados em uma abraçadeira, **When** são movidos, **Then** os cabos convergem para o ponto central do feixe e mantêm fidelidade visual unificada.
4. **Given** uma conexão ativa onde ocorrem mensagens ou atividade de agente, **When** um evento de dados é transmitido, **Then** a linha emite uma onda luminosa (pulso de brilho) ao longo do trajeto por aproximadamente 2 segundos.

---

### User Story 5 - Elevação Centrada, Acoplamento (Docking) e Minimapa Interativo (Priority: P3)

Como usuário focado em uma tarefa detalhada, desejo elevar um terminal ou nota para visualização em destaque no centro da tela ao dar duplo clique no cabeçalho, ou acoplá-lo às bordas laterais em coluna fixa, além de poder arrastar a área de visão diretamente no minimapa.

**Why this priority**: A alternância entre visão panorâmica do canvas e foco total em uma única janela é crucial para produtividade prolongada.

**Independent Test**: Dar duplo clique no cabeçalho de um nó e confirmar sua animação de elevação ao centro; arrastar o retângulo no minimapa e conferir a navegação instantânea; arrastar nó elevado para a margem da janela confirmando acoplamento fixo.

**Acceptance Scenarios**:

1. **Given** qualquer nó no canvas, **When** o usuário dá duplo clique em seu cabeçalho, **Then** o nó se destaca com animação de expansão e foco centralizado (250ms).
2. **Given** o minimapa visível no canto inferior direito, **When** o usuário clica ou arrasta o retângulo indicador da viewport, **Then** o canvas se move sincronamente em tempo real para a coordenada apontada.
3. **Given** um nó elevado, **When** o usuário o arrasta contra a lateral esquerda ou direita da janela, **Then** o elemento se acopla em formato de dock lateral de largura fixa.

---

### User Story 6 - Indicadores de Estado e Acessibilidade de Movimento (Priority: P3)

Como usuário com sensibilidade a movimentos contínuos ou operando em hardware com restrições de desempenho, desejo poder desativar animações decorativas em uma opção de "Reduzir Movimento" nas configurações, além de contar com indicadores claros e acessíveis para estados de atenção e processamento.

**Why this priority**: Acessibilidade e conforto ergonômico garantem que o aplicativo seja inclusivo e adaptável a preferências de uso e limitações visuais ou vestibulares.

**Independent Test**: Acessar as configurações do aplicativo, ativar a opção "Reduzir Movimento" e constatar que todas as transições de nós, zoom e pulso de cabos passam a ocorrer de forma instantânea sem efeitos de transição móvel.

**Acceptance Scenarios**:

1. **Given** a opção "Reduzir Movimento" habilitada, **When** o usuário foca nós, fecha janelas ou altera o zoom, **Then** as alterações de posição e visibilidade ocorrem imediatamente sem interpolações ou atrasos.
2. **Given** um terminal com agente aguardando entrada do usuário, **When** o estado de atenção é disparado, **Then** um indicador visual luminoso vermelho pulsa suavemente no cabeçalho com texto acessível associado.
3. **Given** processos assíncronos ou pensamento de agentes em andamento, **When** a atividade está em curso, **Then** um indicador vetorial de progresso giratório (spinner) é apresentado de forma contínua e suave.

---

### Edge Cases

- **Telas de baixa taxa de atualização ou alto consumo de GPU**: Animações devem degradar graciosamente ou limitar quadros para manter a interface responsiva.
- **Nomes longos de workspace na mini-sidebar**: Em modo mini, textos longos nunca devem vazar horizontalmente; devem ser truncados com reticências ou exibidos em tooltip inteligente.
- **Conexões com extremidades coincidentes ou sobrepostas**: Cabos devem evitar colapsar em pontos cegos; raios mínimos de curvatura devem ser mantidos.
- **Seleção massiva (50+ nós simultâneos)**: Animações em lote (como alinhamento em grade) devem processar todas as transformações de forma performática sem congelar a thread principal.
- **Ativação da preferência do sistema operacional por redução de movimento**: O app deve respeitar automaticamente a configuração `prefers-reduced-motion` do sistema operacional por padrão.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE utilizar ícones vetoriais padronizados (Lucide ou SVG equivalente) com espessura de traço consistente de 1.5px em todos os elementos de UI (barra superior, nós, menus, barra lateral e árvore de arquivos).
- **FR-002**: O sistema DEVE fornecer tamanhos padronizados para ícones conforme hierarquia funcional: 18–20px em barras principais, 14–16px em cabeçalhos, 14px em botões de ação e 10–12px em status.
- **FR-003**: Os ícones DEVEM herdar dinamicamente as cores dos temas claro e escuro através de propriedades CSS padronizadas (`currentColor`).
- **FR-004**: A barra lateral DEVE suportar recolhimento para modo mini (~48px), mantendo apenas ícones visíveis com expansão automática sob o cursor.
- **FR-005**: O sistema DEVE permitir a organização de workspaces em pastas expansíveis e divisores de grupos, com suporte a reordenação por arrastar e soltar.
- **FR-006**: Ao manter a tecla de atalho de navegação (`Ctrl`), o sistema DEVE exibir badges numéricos sobrepostos nos ícones da barra lateral para alternância direta.
- **FR-007**: A movimentação de nós no canvas DEVE possuir sensação suave de inércia e resposta linear de redimensionamento pelas bordas.
- **FR-008**: A duplicação de nós (`Alt+arraste`) DEVE apresentar transição animada de fade-in e escala elástica (0.8 para 1.0).
- **FR-009**: A remoção de nós (`Ctrl+W` ou botão fechar) DEVE reproduzir animação de encolhimento e desvanecimento antes da exclusão física.
- **FR-010**: O comando de foco (`Ctrl+\`) DEVE animar suavemente a viewport até centralizar o nó selecionado em aproximadamente 300ms.
- **FR-011**: A organização em grade (`Ctrl+Shift+T`) DEVE interpolar simultaneamente as coordenadas de todos os nós selecionados.
- **FR-012**: O estilo de conexão Corda DEVE simular física pendular elástica com amortecimento ao mover nós interligados.
- **FR-013**: O estilo de conexão Circuito DEVE calcular trajetos ortogonais em ângulos retos de 90° com vértices suavemente arredondados.
- **FR-014**: O sistema DEVE permitir agrupar cabos adjacentes em feixes com abraçadeiras, convergindo para o eixo comum.
- **FR-015**: Conexões com tráfego de mensagens DEVEM emitir pulso luminoso de atividade por 2 segundos ao longo do cabo.
- **FR-016**: O sistema DEVE suportar elevação de nós para o centro da tela mediante duplo clique no cabeçalho.
- **FR-017**: O sistema DEVE suportar acoplamento lateral (docking) em coluna fixa ao arrastar nós elevados para as extremidades da janela.
- **FR-018**: O minimapa DEVE permitir navegação bidirecional por clique e arraste do retângulo representativo da viewport.
- **FR-019**: O cabeçalho do terminal DEVE apresentar indicador luminoso pulsante em vermelho quando o agente associado requerer atenção.
- **FR-020**: O sistema DEVE oferecer nas configurações e respeitar a preferência de "Reduzir Movimento", suprimindo transições contínuas e executando mudanças de estado instantaneamente.

### Key Entities

- **IconDefinition**: Representa o vetor visual, nome semântico, dimensões padronizadas e classes de estado (hover, active, disabled).
- **SidebarLayoutState**: Estado da barra lateral contendo ordenação de workspaces, pastas, seções, estado recolhido (mini) e largura customizada.
- **CanvasAnimationConfig**: Parâmetros de temporização, curvas de desaceleração (easing) e flag de supressão por acessibilidade.
- **ConnectionPhysicsProfile**: Parâmetros físicos de tensão, amortecimento, curvatura mínima e feixes de cabos.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% dos ícones da interface utilizam vetores padronizados com traço de 1.5px, eliminando completamente caracteres e emojis soltos de controle.
- **SC-002**: Todas as animações do canvas (zoom, pan, movimentação, conexões) mantêm taxa estável de 60 quadros por segundo em condições normais de uso (até 50 nós ativos).
- **SC-003**: A transição entre barra lateral completa e mini-barra lateral ocorre em menos de 150ms sem travamentos visuais.
- **SC-004**: O foco animado em nós (`Ctrl+\`) atinge o destino precisamente em 300ms (±30ms) com desaceleração suave.
- **SC-005**: Ao ativar a preferência "Reduzir Movimento", o tempo de todas as transições de tela cai para 0ms, eliminando náusea ou desconforto visual.
- **SC-006**: O índice de satisfação do usuário com a clareza e beleza visual da interface atinge padrão de ferramenta de desenvolvedor profissional de primeira linha.

---

## Assumptions

- O ambiente de execução suporta aceleração gráfica via GPU para transformações CSS (`transform: translate3d`, `opacity`, SVG styling).
- Os ícones vetoriais são empacotados localmente no bundle do aplicativo para funcionamento 100% offline sem dependência de CDNs externos.
- Ícones personalizados para workspaces podem ser emojis inseridos pelo usuário ou arquivos SVG locais.
- A biblioteca de ícones escolhida (Lucide) possui cobertura semântica completa para todas as ações descritas sem introduzir peso excessivo no build.
