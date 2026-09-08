# Feature Specification: Ajuste da Seleção de Texto e Cópia nos Terminais

**Feature Branch**: `004-terminal-selection-copy`

**Created**: 2026-09-07

**Status**: Draft

**Input**: User description: "quero que voce ajuste o copiar dos terminais e a posição da seleção de texto, quando vou selecionar o texto ele vai para algumas liunhas acima ou abaixo, e não faz a copia pra fora."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Seleção Precisa de Texto com o Mouse (Priority: P1)

Como usuário, quero clicar e arrastar o cursor do mouse sobre o conteúdo do terminal e selecionar exatamente as linhas e palavras sob o ponteiro, sem que a seleção pule ou fique deslocada para linhas acima ou abaixo.

**Why this priority**: A precisão da seleção é a funcionalidade base para qualquer interação de leitura e cópia no terminal. Quando a seleção fica desalinhada, o usuário não consegue selecionar o texto desejado.

**Independent Test**: Clicar sobre uma linha específica no terminal, arrastar horizontalmente e verticalmente (em diferentes níveis de zoom e posições do canvas) e verificar se o destaque de seleção acompanha com precisão o ponteiro do mouse.

**Acceptance Scenarios**:

1. **Given** um terminal com texto exibido e nível de zoom normal (100%), **When** o usuário clica e arrasta o mouse sobre uma linha ou bloco de texto, **Then** o texto selecionado corresponde exatamente à área percorrida pelo ponteiro do mouse sem nenhum desvio vertical de linhas.
2. **Given** um terminal com texto exibido e canvas com zoom ampliado ou reduzido (diferente de 100%), **When** o usuário clica e arrasta o mouse para selecionar texto, **Then** a seleção acompanha fielmente a posição do cursor do mouse, selecionando as linhas e colunas exatas pretendidas.
3. **Given** um terminal com histórico acumulado e rolagem ativa, **When** o usuário seleciona linhas no meio do histórico, **Then** a seleção não sofre deslocamento vertical indevido.

---

### User Story 2 - Cópia de Texto Selecionado para a Área de Transferência Externa (Priority: P1)

Como usuário, quero copiar o texto selecionado no terminal através de atalho de teclado ou ação do mouse e conseguir colar esse conteúdo fora da aplicação (em editores de texto, navegadores ou outros programas).

**Why this priority**: A impossibilidade de exportar/copiar comandos, logs e saídas do terminal para o restante do sistema operacional impede o fluxo de trabalho cotidiano.

**Independent Test**: Selecionar um trecho de texto no terminal, acionar o comando de cópia (atalho ou clique) e colar em um aplicativo externo (como Bloco de Notas, TextEdit ou navegador), verificando se o texto exato foi colado.

**Acceptance Scenarios**:

1. **Given** um texto selecionado no terminal em um ambiente macOS, **When** o usuário pressiona `Cmd+C`, **Then** o texto selecionado é copiado para a área de transferência do sistema operacional e pode ser colado em aplicativos externos.
2. **Given** um texto selecionado no terminal em ambientes Windows/Linux, **When** o usuário pressiona `Ctrl+C`, **Then** o texto selecionado é copiado para a área de transferência do sistema operacional em vez de enviar sinal de interrupção (SIGINT).
3. **Given** o terminal está ativo mas NÃO há texto selecionado, **When** o usuário pressiona `Ctrl+C` (ou sinal de cancelamento), **Then** o sistema envia o sinal normal de interrupção para o processo em execução no terminal.
4. **Given** um texto selecionado no terminal, **When** o usuário clica com o botão direito do mouse ou aciona a ação de cópia, **Then** o texto selecionado é copiado diretamente para a área de transferência externa.

---

### Edge Cases

- O que acontece se o usuário selecionar texto através de múltiplas linhas com quebras de linha longas ou buffers com rolagem ativa? O texto copiado deve respeitar a quebra de linha visual ou do buffer sem corromper caracteres.
- O que acontece se a aplicação estiver em um nível de zoom extremo (ex: 10% ou 250%)? O cálculo da posição do cursor do mouse deve converter corretamente as coordenadas da tela para o grid interno do terminal, mantendo a seleção alinhada.
- O que acontece se o usuário tentar copiar com atalho de teclado enquanto a permissão da área de transferência estiver restrita pelo sistema operacional? O aplicativo deve tentar a integração direta do Electron com a área de transferência nativa como fallback seguro.
- O que acontece se o usuário der duplo clique para selecionar uma palavra ou triplo clique para selecionar uma linha inteira? A seleção deve selecionar com precisão a palavra ou linha alvo sob o cursor.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE calcular as coordenadas da seleção de texto do mouse levando em consideração a escala (zoom) e a translação do canvas, garantindo que o caractere e a linha selecionados correspondam exatamente à posição visual do ponteiro do mouse.
- **FR-002**: O sistema DEVE manter o alinhamento correto da seleção de texto por clique e arraste independentemente do fator de zoom atual do workspace.
- **FR-003**: O sistema DEVE suportar a seleção por duplo clique (palavra) e triplo clique (linha inteira) com posicionamento vertical exato sob o ponteiro do mouse.
- **FR-004**: O sistema DEVE permitir a cópia do texto selecionado no terminal para a área de transferência nativa do sistema operacional (clipboard).
- **FR-005**: O sistema DEVE capturar o atalho de cópia (`Cmd+C` no macOS e `Ctrl+C` no Windows/Linux) quando houver texto selecionado no terminal, copiando-o para a área de transferência sem disparar cancelamento do comando do terminal.
- **FR-006**: O sistema DEVE preservar o comportamento nativo de envio de sinal de interrupção (`SIGINT`) via `Ctrl+C` quando não houver nenhuma seleção de texto ativa no terminal.
- **FR-007**: O texto copiado para a área de transferência DEVE estar acessível imediatamente para colagem em qualquer aplicativo externo do sistema operacional.
- **FR-008**: O sistema DEVE disponibilizar ação de cópia via interação de mouse (menu contextual ou clique apropriado) com o texto selecionado.

### Key Entities

- **Terminal Component**: Componente visual do terminal que renderiza os caracteres em tela, gerencia o buffer de linhas e recebe eventos de ponteiro/teclado.
- **Canvas Viewport**: Gerenciador do espaço de trabalho infinito que aplica transformações de zoom e pan aos terminais.
- **System Clipboard**: Área de transferência global do sistema operacional responsável por reter o texto copiado para compartilhamento entre aplicações.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em 100% dos testes de seleção com mouse (em zoom padrão, reduzido e ampliado), a linha destacada pela seleção corresponde exatamente à linha sob a ponta do cursor, com desvio vertical de zero linhas.
- **SC-002**: 100% do texto selecionado e copiado (`Cmd+C` / `Ctrl+C` / clique) é transferido com sucesso para a área de transferência global do sistema operacional.
- **SC-003**: O texto copiado de dentro do terminal pode ser colado em qualquer aplicativo externo (editor de texto, navegador, mensageiro) em menos de 1 segundo após o comando de cópia.
- **SC-004**: O envio de `SIGINT` (interrupção de processo) continua funcionando sem falhas quando nenhuma seleção de texto estiver ativa.

## Assumptions

- O aplicativo roda em ambiente Electron com acesso às APIs de clipboard do sistema ou da Web (`navigator.clipboard` / `clipboard` do Electron).
- A interface gráfica utiliza um contêiner com transformações CSS (translação e escala) para prover zoom e pan dos terminais.
- O comportamento esperado de `Ctrl+C` no terminal segue a convenção moderna: copia se houver texto selecionado, interrompe se não houver texto selecionado.
- O atalho `Cmd+C` no macOS é dedicado prioritariamente para cópia de texto selecionado.
