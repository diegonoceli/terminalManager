# Feature Specification: Workflows Multi-Nós, Device Portals e Correção de Seleção/Cópia no Terminal

**Feature Branch**: `005-workflow-nodes-connections`

**Created**: 2026-09-08

**Status**: Draft

**Input**: User description: "quero que ajuste essa aplicação, o copiar do terminal nao funciona e a selecao de texto sempre pega linhas a mais e linhas a menos, inclusive o aplicativo original maestri, eu consigo criar workflows onde eu consigo colocar tudo que estou trabalhando, exemplo 3 terminais e um vscode, 6 terminais e uma pagina web, quero que isso seja contemplado, e as bolinhas que eram pra conectar um terminal aou outro agora devem conectar terminal a qualquer cosia, emulador android qualquer coisa que esteja no workflow. 1 a tela deve ficar no board igual terminal fica igual essa imagem https://cdn.maestri.dev/assets/feature-device-portals.webp"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Correção da Seleção de Texto e Cópia no Terminal (Priority: P1)

Como desenvolvedor utilizando o aplicativo, quero selecionar texto no terminal com o cursor do mouse e ter a certeza de que a seleção capturará exatamente as linhas e palavras sob o ponteiro (sem saltar linhas para cima ou para baixo, independentemente do zoom e deslocamento do canvas), e copiar o texto selecionado para a área de transferência do sistema operacional (`Cmd+C` / `Ctrl+C` ou clique direito) para colar em qualquer aplicativo externo.

**Why this priority**: A seleção imprecisa e a falha de cópia quebram a usabilidade básica diária do terminal, impedindo a leitura de logs, cópia de comandos e depuração de código.

**Independent Test**: Abrir um terminal com histórico de comandos em diferentes fatores de zoom do canvas (50%, 100%, 150%), clicar e arrastar o cursor sobre uma linha específica, copiar via atalho de teclado (`Cmd+C`/`Ctrl+C`) ou clique direito e colar em um editor de texto externo, verificando se o texto copiado corresponde exatamente à seleção visual.

**Acceptance Scenarios**:

1. **Given** um terminal com linhas de saída e canvas em escala normal (100%), **When** o usuário clica e arrasta o mouse sobre uma linha ou bloco de texto, **Then** a seleção destaca com precisão apenas as células sob o ponteiro do mouse, sem incluir linhas a mais ou a menos.
2. **Given** o canvas com nível de zoom ampliado ou reduzido (ex: 50% ou 150%), **When** o usuário realiza seleção com o mouse no terminal, **Then** a seleção visual acompanha com precisão matemática o ponteiro do cursor, sem desvio vertical de linhas.
3. **Given** um texto selecionado no terminal, **When** o usuário pressiona o atalho de cópia da plataforma (`Cmd+C` no macOS ou `Ctrl+C` no Windows/Linux) ou utiliza a ação de clique direito, **Then** o conteúdo selecionado é copiado diretamente para a área de transferência nativa do sistema e pode ser colado em aplicativos externos.
4. **Given** um terminal ativo onde NÃO há nenhum texto selecionado, **When** o usuário pressiona `Ctrl+C`, **Then** o sistema envia o sinal de interrupção (`SIGINT`) normal para o processo em execução no terminal.

---

### User Story 2 - Device Portals e Nós de Tela no Canvas Espacial (Priority: P1)

Como usuário, quero posicionar telas interativas de trabalho diretamente no canvas infinito (board) exatamente da mesma forma como os terminais ficam posicionados (seguindo o modelo visual de Portais do Maestri): incluindo nós de Navegador Web com barra de endereços, nós de Device Portal para dispositivos/emuladores móveis (ex: Emulador Android / Pixel com moldura de tela) e nós de Editor de Código / VS Code, permitindo mover, redimensionar e operar tudo no mesmo espaço.

**Why this priority**: Permite que o usuário visualize simultaneamente terminais de desenvolvimento, a tela da aplicação web ou mobile em teste e o código-fonte no mesmo quadro espacial interativo.

**Independent Test**: Adicionar ao canvas um nó de terminal, um nó de navegador web e um nó de device portal (emulador Android), navegar pelo canvas com pan/zoom, mover e redimensionar os nós e interagir diretamente com o conteúdo de cada um.

**Acceptance Scenarios**:

1. **Given** o canvas do workspace aberto, **When** o usuário adiciona um nó de Navegador Web, **Then** um portal de navegador surge no board com moldura, barra de navegação de URL, botões de voltar/avançar/recarregar e renderização interativa da página (local ou remota).
2. **Given** o canvas do workspace aberto, **When** o usuário adiciona um nó de Device Portal (ex: Emulador Android / Pixel), **Then** um cartão no formato de tela de dispositivo surge no board exibindo o frame do dispositivo, status da conexão com o emulador/ADB e a visualização interativa da tela do dispositivo.
3. **Given** o canvas do workspace aberto, **When** o usuário adiciona um nó de Editor de Código / VS Code, **Then** um cartão de edição/workspace de código surge no board permitindo visualização de arquivos e abertura direta no VS Code local.
4. **Given** múltiplos nós no board, **When** o usuário arrasta pela barra de título ou redimensiona pelas alças, **Then** os portais de tela se reposicionam fluidamente no canvas espacial mantendo suas proporções.

---

### User Story 3 - Conexões Universais entre Terminais e Portais de Tela ("Bolinhas") (Priority: P2)

Como usuário, quero conectar os terminais a qualquer tela no board (páginas web, emuladores Android, outros terminais) através das alças de conexão ("bolinhas" de ancoragem), criando linhas visuais curvas (fios) que interligam os processos aos alvos de exibição e teste.

**Why this priority**: Conexões universais transformam o canvas em um fluxo de trabalho vivo onde o terminal que compila ou executa comandos está explicitamente vinculado à tela ou dispositivo que exibe o resultado.

**Independent Test**: Clicar na bolinha de ancoragem de um terminal, arrastar a linha até a bolinha de um portal de tela (ex: emulador Android ou página web), soltar para conectar, mover qualquer um dos nós e verificar que a curva de conexão acompanha os nós mantendo a ligação ativa.

**Acceptance Scenarios**:

1. **Given** um terminal e um nó de tela (ex: Device Portal Android ou Navegador Web) no board, **When** o usuário clica na bolinha de conexão do terminal e arrasta até a bolinha do nó de tela, **Then** uma linha de conexão curva é traçada entre eles e fixada com sucesso.
2. **Given** nós conectados no workflow, **When** qualquer nó é arrastado ou o canvas sofre zoom/pan, **Then** as curvas de conexão recalculam instantaneamente suas posições de ancoragem sem defasagem visual.
3. **Given** uma conexão ativa entre um terminal e um nó de tela (web ou emulador), **When** o usuário executa comandos no terminal que referenciam ou interagem com o nó conectado (ex: inicialização de servidor ou comando de build), **Then** a linha de conexão exibe animação de pulso luminoso e atualiza/notifica o portal conectado.
4. **Given** uma conexão existente, **When** o usuário dá um duplo clique na linha de conexão ou usa a ação de exclusão, **Then** a conexão é removida do board e persistida.

---

### User Story 4 - Gerenciamento de Múltiplos Workflows ("Floors") (Priority: P2)

Como usuário trabalhando em múltiplos projetos, quero criar, salvar, nomear e alternar entre diferentes Workflows (ex: "Workflow Frontend: 3 terminais + 1 Web Portal", "Workflow Mobile: 2 terminais + 1 Emulador Android + 1 VS Code"), restaurando instantaneamente a disposição espacial completa de nós e conexões.

**Why this priority**: Evita a sobrecarga de misturar projetos diferentes no mesmo board e viabiliza fluxos de trabalho especializados que podem ser retomados a qualquer momento.

**Independent Test**: Criar dois workflows distintos com conjuntos de nós e conexões diferentes, alternar entre eles pelo seletor de workflows no topo e verificar se todas as telas, posições e conexões são restauradas fielmente.

**Acceptance Scenarios**:

1. **Given** o seletor de Workflows na barra superior, **When** o usuário clica para criar um novo workflow, **Then** um novo board vazio é disponibilizado permitindo configurar um novo conjunto de nós.
2. **Given** múltiplos workflows configurados, **When** o usuário seleciona outro workflow na lista, **Then** o canvas transiciona suavemente e restaura os nós, coordenadas, tamanhos e conexões daquele workflow.
3. **Given** alterações feitas em nós ou conexões, **When** a aplicação é fechada e reaberta, **Then** todos os workflows cadastrados continuam persistidos e disponíveis no mesmo estado.

---

### Edge Cases

- **Zoom Extremo no Canvas**: O cálculo de coordenadas da tela para o grid interno do terminal e para os portais de tela deve manter precisão absoluta em qualquer nível de zoom (20% a 300%).
- **Portais Web Apontando para Servidores Locais Inativos**: Quando um nó de navegador web for configurado para um endereço local (`localhost:PORT`) cujo servidor ainda não foi iniciado no terminal, o portal deve exibir um estado visual amigável de espera com botão de recarga manual e automática.
- **Desconexão de Dispositivo / Emulador**: Se o emulador Android for fechado externamente, o nó correspondente no board deve indicar o estado "Desconectado / Offline" com opção de reiniciar ou reconectar.
- **Exclusão de Nós com Conexões Ativas**: Ao fechar qualquer nó (terminal ou portal de tela), todas as linhas de conexão conectadas a ele devem ser automaticamente removidas do SVG e do estado sem deixar resíduos visuais.
- **Tratamento de Clipboard Sem Foco**: Se o usuário selecionar texto em um terminal e clicar em um botão de outro nó, a área de transferência do sistema não deve ser corrompida.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE calcular as coordenadas de seleção do cursor no terminal compensando a escala de zoom e a translação espacial do canvas, garantindo que o texto selecionado corresponda estritamente às linhas e caracteres apontados pelo ponteiro do mouse.
- **FR-002**: O sistema DEVE garantir a seleção precisa por clique-e-arraste, duplo clique (selecionar palavra) e triplo clique (selecionar linha inteira) no terminal em qualquer escala de visualização.
- **FR-003**: O sistema DEVE copiar o texto selecionado no terminal para a área de transferência nativa do sistema operacional (`clipboard`) através dos atalhos `Cmd+C` (macOS), `Ctrl+C` (Windows/Linux) e clique com o botão direito.
- **FR-004**: O sistema DEVE manter o envio do sinal de interrupção (`SIGINT`) do `Ctrl+C` no terminal quando NÃO houver texto selecionado.
- **FR-005**: O sistema DEVE suportar a criação de portais de tela no canvas espacial (board), renderizados como cartões espaciais livres no mesmo plano que os terminais.
- **FR-006**: O sistema DEVE fornecer nós de Navegador Web no board, contendo barra de navegação com input de URL, botões de ação (voltar, avançar, recarregar) e visualização de páginas web locais e remotas.
- **FR-007**: O sistema DEVE fornecer nós de Device Portal (Emulador Android / Mobile) no board, exibindo moldura visual de dispositivo móvel, tela interativa do dispositivo e status de conexão.
- **FR-008**: O sistema DEVE fornecer nós de Editor de Código / VS Code no board, exibindo diretório de trabalho, arquivos do projeto e atalhos rápidos de navegação e abertura no VS Code.
- **FR-009**: O sistema DEVE disponibilizar pontos de ancoragem ("bolinhas" de conexão) nas laterais de todos os nós presentes no board (terminais, portais web, device portals e editores).
- **FR-010**: O sistema DEVE permitir traçar conexões arrastando a partir da bolinha de um terminal até a bolinha de qualquer outro nó no board (outros terminais, navegadores web, device portals ou editores).
- **FR-011**: O sistema DEVE manter as curvas de conexão conectadas e perfeitamente ancoradas em tempo real durante o movimento de nós, redimensionamento ou navegação de pan/zoom no canvas.
- **FR-012**: O sistema DEVE transmitir sinais visuais (pulsos animados na linha) e ações contextuais entre terminais e nós de tela conectados (ex: atualizar portal web ou acionar emulador quando comandos correspondentes são executados).
- **FR-013**: O sistema DEVE permitir a exclusão de conexões individuais via duplo clique ou menu de contexto da linha, e remover conexões automaticamente quando nós vinculados forem excluídos.
- **FR-014**: O sistema DEVE suportar o gerenciamento de múltiplos Workflows ("Floors"), permitindo criar novos workflows, renomeá-los, alternar entre eles e persistir de forma independente a composição completa de nós e conexões de cada um.
- **FR-015**: O sistema DEVE persistir no armazenamento local todo o estado dos workflows, nós (posição x/y, dimensões w/h, tipo, título, configurações) e conexões entre reinicializações do aplicativo.

### Key Entities *(include if feature involves data)*

- **Workflow ("Floor")**: Estrutura de dados representando um ambiente de trabalho completo. Contém identificador único, nome, data de criação, lista de nós pertencentes e malha de conexões ativas.
- **Workflow Node**: Entidade base de elemento espacial no board. Contém identificador único, tipo de nó (`terminal`, `web-portal`, `device-portal`, `code-editor`), coordenadas no canvas `(x, y)`, dimensões `(largura, altura)`, título visível, estilo e portas de ancoragem ("bolinhas").
- **Terminal Node**: Especialização de nó contendo uma instância de shell/PTY ativa, histórico de rolagem, configurações de estilo do terminal e manipulador de seleção precisa e cópia para o clipboard.
- **Web Portal Node**: Especialização de nó contendo janela de visualização web com barra de URL, controles de navegação e renderização de conteúdo web.
- **Device Portal Node**: Especialização de nó representando um dispositivo móvel (ex: Pixel / Android), contendo moldura de tela, status de conexão ADB/dispositivo e visualização da tela.
- **Code Editor Node**: Especialização de nó contendo visualizador/editor de código do workspace e integração com VS Code.
- **Universal Connection**: Vínculo entre dois nós quaisquer do board, definido por nó de origem (`fromId`), nó de destino (`toId`), tipo de conexão e linha gráfica bezier com suporte a animação de pulso.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das seleções de texto realizadas com o mouse no terminal (em qualquer nível de zoom do canvas entre 20% e 250%) destacam com exatidão matemática as linhas e colunas sob o cursor, sem saltos de linha ou desvios verticais.
- **SC-002**: O comando de cópia (`Cmd+C`/`Ctrl+C` ou clique direito) transfere o texto selecionado para a área de transferência do sistema em menos de 500ms, pronto para ser colado em aplicativos externos.
- **SC-003**: O usuário consegue adicionar e posicionar no mesmo board nós de terminal, portais web, device portals de emuladores e editores, movimentando-os e redimensionando-os livremente.
- **SC-004**: O usuário consegue criar conexões entre a bolinha de um terminal e a bolinha de qualquer tela no board em menos de 2 segundos.
- **SC-005**: Ao alternar entre diferentes Workflows salvos, 100% dos nós, portais, coordenadas e conexões correspondentes são restaurados em menos de 1 segundo.
- **SC-006**: A renderização das conexões curvas dinâmicas acompanha o arrastar de nós com taxa de atualização fluida (mínimo de 50 FPS).

## Assumptions

- O aplicativo é executado em ambiente desktop (macOS, Windows ou Linux) com suporte ao Electron.
- Para o Device Portal Android, o emulador do Android Studio ou dispositivo físico conectado possui servidor ADB disponível no ambiente local.
- Para portais de páginas web locais (`localhost`), os servidores de desenvolvimento são executados na máquina local pelo usuário ou via terminais do próprio workflow.
- Atalhos de teclado respeitam a plataforma do usuário (`Cmd` no macOS e `Ctrl` no Windows/Linux).
