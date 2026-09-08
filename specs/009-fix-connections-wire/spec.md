# Feature Specification: Restauração da Interatividade de Fios e Conexões entre Recursos Espaciais

**Feature Branch**: `009-fix-connections-wire`

**Created**: 2026-09-08

**Status**: Draft

**Input**: User description: "o traço e ligação entre recursos não esta funcional"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Arraste e Visualização do Traço de Conexão em Tempo Real (Priority: P1)

Como usuário organizando meu fluxo de trabalho no canvas infinito, ao clicar e arrastar a partir de uma porta de conexão lateral em qualquer recurso (terminal, portal web, emulador mobile, nota, editor, árvore de arquivos, texto ou desenho), quero visualizar um traço flexível (linha guia/fio) acompanhando continuamente meu cursor sem travamentos nem erros de console, para que eu consiga mirar e conectar facilmente ao recurso de destino desejado.

**Why this priority**: É o ponto crítico da interação. Sem o traço provisório visível e reativo durante o arraste, o usuário não recebe feedback visual e o processo de ligação entre recursos fica quebrado e inacessível.

**Independent Test**: Clicar na porta lateral de um terminal e arrastar o cursor livremente pelo canvas espacial; verificar que uma linha curva suave é desenhada em tempo real conectando a porta ao cursor, sem emissão de qualquer erro no console do aplicativo.

**Acceptance Scenarios**:

1. **Given** dois nós presentes no canvas espacial, **When** o usuário clica com o botão esquerdo na porta de conexão (esquerda ou direita) de um nó e inicia o arraste, **Then** um traço provisório com estilo visual translúcido/destacado é instanciado imediatamente a partir da porta de origem.
2. **Given** o traço de conexão em arraste ativo, **When** o cursor do mouse se move pelo canvas em qualquer velocidade ou nível de zoom, **Then** a ponta final da curva acompanha as coordenadas do cursor com atualização fluida (60fps) e sem lançar exceções de runtime.
3. **Given** o arraste de um traço em andamento, **When** o usuário solta o botão do mouse sobre o fundo vazio do canvas (fora de nós), **Then** o traço de preview é cancelado e descartado suavemente sem deixar resíduos visuais.

---

### User Story 2 - Estabelecimento e Persistência de Ligações entre Recursos (Priority: P1)

Como usuário construindo redes e fluxos de dependência entre terminais, navegadores, arquivos e anotações, quero soltar o traço de conexão sobre um segundo nó para estabelecer uma conexão permanente (cabo visual com física de corda ou circuito), garantindo que a ligação seja gravada e reconhecida pelo sistema.

**Why this priority**: Conexões entre nós são a essência da orquestração espacial do Maestri. Sem a criação persistente da conexão ao soltar no nó destino, a funcionalidade central de linking não se concretiza.

**Independent Test**: Iniciar o arraste na porta do Nó A e soltar o cursor sobre o corpo ou porta do Nó B; verificar que um cabo SVG definitivo é renderizado interligando os nós, com pulso luminoso de confirmação e persistência no estado do workspace.

**Acceptance Scenarios**:

1. **Given** o traço de conexão sendo arrastado a partir do Nó A, **When** o cursor é liberado sobre a superfície ou porta de um Nó B diferente, **Then** o sistema registra formalmente a conexão entre Nó A e Nó B e desenha o cabo com ancoragem precisa nas portas laterais.
2. **Given** uma conexão recém-criada, **When** ela é estabelecida, **Then** o cabo exibe um pulso luminoso suave sinalizando a ativação da rota.
3. **Given** o usuário arrastando um traço a partir do Nó A, **When** ele solta o cursor sobre o próprio Nó A, **Then** a ligação cíclica reflexiva é evitada e o traço é descartado.

---

### User Story 3 - Redesenho Reativo Contínuo ao Mover Recursos Conectados (Priority: P2)

Como usuário reorganizando o layout do meu workspace, quero que todos os cabos e fios conectados acompanhem instantaneamente os nós quando eles forem movidos, redimensionados ou elevados, mantendo as curvaturas e o alinhamento das portas sem descolar.

**Why this priority**: Garante integridade visual e consistência espacial durante o uso cotidiano e manipulação de blocos no canvas.

**Independent Test**: Conectar dois nós e em seguida arrastar um deles pelo cabeçalho; verificar que o cabo interligado se estica, encurva e reposiciona suas âncoras simultaneamente ao movimento do nó.

**Acceptance Scenarios**:

1. **Given** dois nós interligados por um cabo, **When** qualquer um dos nós é arrastado pelo canvas, **Then** as coordenadas de origem/destino do cabo são recalculadas em tempo real sem latência perceptível.
2. **Given** nós conectados com estilo de cabo "Corda" ou "Circuito", **When** a distância entre eles varia, **Then** a curvatura (flecha elástica ou chanfro ortogonal) é recalculada harmonicamente mantendo a identidade visual selecionada.

---

## Edge Cases

- **Arraste com Canvas em Zoom Elevado ou Reduzido**: A conversão entre coordenadas de tela (`clientX`, `clientY`) e coordenadas espaciais do mundo (`worldPos`) deve considerar a escala (`canvas.zoom`) e translação (`canvas.tx`, `canvas.ty`), garantindo que o traço conecte exatamente na ponta do cursor em qualquer nível de zoom (20% a 250%).
- **Conexão Duplicada**: Tentar conectar dois nós que já possuem uma conexão direta deve ser tratado graciosamente sem duplicar cabos visuais redundantes.
- **Nó Removido com Conexões Ativas**: Ao fechar ou deletar um nó, todas as conexões vinculadas a ele devem ser removidas do DOM e do estado sem gerar erros de referência nula.
- **Cancelamento por Tecla Esc**: Pressionar a tecla <kbd>Esc</kbd> durante o arraste do traço deve cancelar a operação imediatamente.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE fornecer portas de conexão (`conn-port`) interativas nas extremidades esquerda e direita de todos os nós suportados (terminais, portais web, dispositivos mobile, editores, notas, árvores de arquivos, textos e desenhos).
- **FR-002**: O sistema DEVE permitir iniciar o arraste de um novo traço de conexão clicando com o ponteiro sobre qualquer porta de conexão de nó.
- **FR-003**: O sistema DEVE calcular e atualizar dinamicamente o traço provisório (`conn-preview-line`) em coordenadas do espaço do mundo espacial a cada movimento do ponteiro (`pointermove`), sem invocar métodos inexistentes ou gerar exceções no console.
- **FR-004**: O sistema DEVE identificar o nó sob o cursor ao término do arraste (`pointerup`) usando detecção precisa de limites espaciais e estabelecer a conexão se o alvo for um nó válido diferente do nó de origem.
- **FR-005**: O sistema DEVE persistir a lista de conexões criadas no estado do workspace ativo e propagar aos clientes conectados.
- **FR-006**: O sistema DEVE sincronizar o redesenho de todos os cabos sempre que nós forem movidos (`setPosition`), redimensionados (`setSize`) ou quando o layout for recalculado.
- **FR-007**: O sistema DEVE permitir alternar o estilo visual dos cabos entre "Corda" (caimento elástico com gravidade) e "Circuito" (ortogonal 90° com cantos chanfrados) via menu contextual do cabo ou atalho.

### Key Entities

- **Connection**: Representa uma ligação direcional ou associativa entre dois nós (`id`, `fromId`, `toId`, `style: "rope" | "circuit"`, `color`, `active`).
- **ConnectionPort**: Ponto de ancoragem geométrico fixado nas laterais dos nós espaciais (`left`, `right`) a partir do qual os cabos são originados ou acoplados.
- **PreviewPath**: Elemento SVG efêmero utilizado para guiar o usuário visualmente durante o processo interativo de arraste antes da confirmação da conexão.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das tentativas de arraste a partir de portas de nós resultam em traçado visual fluido do preview, com zero erros (`TypeError`) no console.
- **SC-002**: Conexões completadas entre quaisquer dois nós válidos são estabelecidas e renderizadas em menos de 30ms após a liberação do clique.
- **SC-003**: Acompanhamento visual dos cabos durante o arraste de nós atinge taxa de atualização de 60fps sem oscilações (*jitter*).
- **SC-004**: Conexões persistidas permanecem intactas ao alternar entre workspaces e recarregar a sessão.

---

## Assumptions

- Cada nó possui âncoras laterais pré-definidas (esquerda como entrada/saída, direita como saída/entrada).
- Conexões são desenhadas em uma camada SVG global (`#connections-layer`) sobreposta ao mundo espacial mas abaixo do conteúdo interativo dos nós.
- A exclusão de um nó encerra e limpa automaticamente todas as conexões dependentes daquele nó.
