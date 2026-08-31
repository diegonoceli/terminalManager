# Feature Specification: alerts-terminal-connections

**Feature Branch**: `002-alerts-terminal-connections`

**Created**: 2026-08-31

**Status**: Draft

**Input**: User description: "quero que crie alertas, winfows e mac quando um dos terminais terminarem, pra voltar e aprovar o comando, tambem quero que voce crie linhas desenhadas caso os terminais se comuniquem, no claude igual o maestri mesmo faz https://www.themaestri.app/pt-br"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Notificações Nativas no macOS e Windows (Priority: P1)

Como usuário executando tarefas demoradas ou comandos em segundo plano, quero receber uma notificação nativa do sistema operacional (Windows/macOS) quando um comando terminar ou quando o terminal exigir aprovação/interação do usuário, para que eu não precise ficar monitorando a tela continuamente.

**Why this priority**: Permite produtividade assíncrona enquanto agentes ou processos executam tarefas no terminal.

**Independent Test**: Executar um comando em um terminal, minimizar ou colocar a janela em segundo plano e verificar se a notificação nativa do SO é disparada com o título e status do terminal ao finalizar.

**Acceptance Scenarios**:

1. **Given** a aplicação está em segundo plano ou minimizada, **When** um comando ou processo em um terminal finaliza ou solicita aprovação, **Then** o sistema exibe uma notificação nativa do sistema operacional (Windows ou macOS) informando o nome do terminal e o status da tarefa.
2. **Given** uma notificação nativa é exibida, **When** o usuário clica na notificação, **Then** o aplicativo ganha foco e o terminal correspondente é centralizado/selecionado na tela.

---

### User Story 2 - Linhas de Conexão Visuais entre Terminais no Canvas (Priority: P1)

Como usuário gerenciando múltiplos terminais e agentes que colaboram entre si (estilo Maestri), quero ver linhas visuais (curvas/conectores) desenhadas no canvas conectando os terminais que estão se comunicando ou compartilhando tarefas, para entender claramente a topologia e o fluxo de dados entre os agentes.

**Why this priority**: É a funcionalidade central de experiência espacial visual inspirada no Maestri para coordenação multi-agente.

**Independent Test**: Definir ou disparar uma comunicação entre dois terminais e verificar que uma linha conectora é desenhada entre os dois blocos no canvas, acompanhando movimentações e zoom.

**Acceptance Scenarios**:

1. **Given** dois ou mais terminais conectados/em comunicação no canvas, **When** o usuário visualiza o canvas, **Then** linhas curvas ou retas visíveis conectam as bordas dos terminais envolvidos.
2. **Given** terminais conectados por linhas, **When** o usuário arrasta, move ou dá zoom no canvas, **Then** as linhas permanecem ancoradas aos terminais sem distorções ou descompassos.
3. **Given** uma mensagem ou payload está sendo transmitido entre dois terminais, **When** a comunicação ocorre, **Then** a linha de conexão apresenta feedback visual ativo (ex: pulso/animação de fluxo).

---

### User Story 3 - Criação e Gerenciamento de Conexões entre Terminais (Priority: P2)

Como usuário, quero poder criar conexões visuais entre terminais manualmente (arrastando pontos de conexão) ou programaticamente (via comando/agente) para organizar meu fluxo de trabalho.

**Why this priority**: Dá flexibilidade ao usuário para estruturar times de agentes e pipelines visuais.

**Independent Test**: Arrastar a partir do ponto de conexão de um terminal até outro e verificar a criação da linha persistente.

**Acceptance Scenarios**:

1. **Given** dois terminais no canvas, **When** o usuário arrasta uma conexão de um terminal para outro, **Then** a conexão é criada e persistida no estado do canvas.

### Edge Cases

- O que acontece se uma notificação for disparada enquanto o app já está em foco? O sistema pode exibir um toast interno ou notificação sutil para não poluir o sistema operacional desnecessariamente.
- O que acontece se um dos terminais conectados for fechado/encerrado? Todas as linhas conectadas a ele devem ser removidas suavemente sem quebrar o canvas.
- O que acontece quando os terminais estão fora do viewport visível com zoom alto? As linhas devem continuar calculadas no espaço de coordenadas do mundo (world coordinates) e ser renderizadas apenas nos limites visíveis.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE emitir notificações nativas no macOS e Windows quando comandos em terminais terminarem, encerrarem com erro ou aguardarem aprovação/interação.
- **FR-002**: O sistema DEVE trazer a janela principal para o primeiro plano e focar no terminal de origem ao clicar na notificação.
- **FR-003**: O sistema DEVE renderizar linhas de conexão visuais (conectores SVG ou Canvas) entre terminais interligados no espaço espacial 2D.
- **FR-004**: O sistema DEVE atualizar continuamente as posições e curvas das linhas conforme os terminais são reposicionados, redimensionados ou durante zoom/pan do canvas.
- **FR-005**: O sistema DEVE fornecer indicação visual de atividade/transmissão (pulso/animação) na linha conectora quando houver comunicação entre os terminais.
- **FR-006**: O sistema DEVE persistir a lista de conexões no estado da sessão (salvando quais terminais estão ligados entre si).

### Key Entities

- **Notification Service**: Gerenciador responsável por despachar notificações nativas do sistema operacional e lidar com eventos de clique para navegação.
- **Connection Link**: Entidade que representa a ligação entre dois terminais (`sourceTerminalId`, `targetTerminalId`, `status`, `metadata`).
- **Canvas Connector Overlay**: Camada visual (SVG/Canvas) renderizada sobre o mundo do canvas para desenhar as linhas curvas e animações de fluxo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das tarefas concluídas em segundo plano emitem notificação com latência inferior a 500ms após a finalização do processo.
- **SC-002**: As linhas de conexão acompanham o movimento dos terminais a 60 FPS sem atraso perceptível de renderização.
- **SC-003**: As conexões entre terminais são 100% restauradas após fechar e reabrir o aplicativo.

## Assumptions

- O Electron possui suporte nativo à API `Notification` tanto no macOS quanto no Windows, que será utilizada em conjunto com `app.focus()` / `window.show()`.
- A detecção de término de comando ou pedido de aprovação pode ser baseada no status de saída do processo, padrões de texto no stream de saída ou eventos explícitos enviados pelos agentes.
- A renderização de linhas será feita no sistema de coordenadas do canvas existente em `public/js/canvas.js` para garantir escala e transformações consistentes.
