# Research & Technical Decisions: Plataforma Maestri

**Feature**: `011-maestri-complete-docs`
**Date**: 2026-09-08
**Status**: Completed

Este documento consolida a pesquisa técnica, a avaliação de alternativas e as decisões de arquitetura para viabilizar a implementação e paridade total de todas as funcionalidades descritas na documentação oficial do Maestri.

---

## 1. Workspaces, Background Execution e Sincronização de Instruções

### Decisão
- **Arquitetura de Workspaces**: Cada workspace mantém seu próprio subgrafo de estado no `state.json` com um `id`, `name`, `workingDir`, `icon`, `folders` e `groups`. Os processos PTY dos terminais associados continuam ativos em segundo plano no `terminal-manager.js` ao alternar de workspace, permitindo que compilações e agentes de IA terminem suas tarefas sem interrupções.
- **Sincronização `CLAUDE.md` ↔ `AGENTS.md`**: Um watcher com debouncing no `electron/main.js` monitora ambos os arquivos na raiz do projeto. Quando um arquivo é alterado, o conteúdo é espelhado no outro sem disparar loop infinito de eventos de escrita (usando uma flag transitória `isSyncing`).
- **Indexação Spotlight (macOS)**: No processo principal do Electron, cada nota e terminal gera um arquivo de metadados indexável em `~/.maestri/spotlight-index/` com extensão compatível do macOS CoreSpotlight/Spotlight (ou schema de busca local) e esquema de URL customizado `maestri://open?workspace={id}&node={nodeId}`. No Windows, a busca é mantida interna e transparente através da Batuta Search.

### Racional
- Agentes de IA rodam tarefas demoradas (instalação de pacotes, testes, refatorações); suspender ou matar os terminais ao trocar de workspace destruiria a produtividade do usuário.
- Claude Code utiliza `CLAUDE.md` por padrão, enquanto Codex/OpenCode utilizam `AGENTS.md`. A sincronização automática elimina a necessidade de duplicar convenções manualmente.

### Alternativas Rejeitadas
- *Pausar processos PTY em background*: Rejeitado porque interrompe conexões SSH e fluxos longos de agentes.
- *Usar apenas AGENTS.md*: Rejeitado porque o Claude Code ignora arquivos que não sejam `CLAUDE.md`.

---

## 2. Canvas Espacial, Encaixe Magnético, Elevação e Grupos

### Decisão
- **Grade e Alinhamento**: O canvas adota grade virtual de 20pt. Durante o arraste normal, os nós movem-se livremente ou em passos de 20pt. Ao manter pressionada a tecla `Ctrl`, ativa-se o modo **Magnetic Tile Snapping**: um algoritmo de alinhamento calcula as distâncias para as bordas mais próximas dos nós adjacentes (bounding boxes) e atrai o nó para preencher lacunas e alinhar paredes perfeitamente.
- **Elevação e Acoplamento (Docking)**:
  - Ao dar duplo clique no cabeçalho de qualquer nó (Terminal, Nota, Portal, Árvore de Arquivos), o nó recebe a classe CSS `elevated` e é transformado para coordenadas centrais fixas na viewport com scale 1.0 e z-index prioritário, desvinculando-se momentaneamente da matriz de transformação de pan/zoom do canvas.
  - Se o usuário arrasta o elemento elevado para menos de 40px de uma das bordas laterais (esquerda ou direita), o elemento entra em estado `docked`, transformando-se em uma coluna fixa de altura total (`height: 100vh; width: 420px;`).
- **Grupos de Nós (`Ctrl+G`)**:
  - Um grupo é uma entidade visual `GroupFrame` que calcula o envelope delimitador (bounding box com padding de 24px) de seus membros.
  - O frame possui um cabeçalho com nome editável. Arrastar o cabeçalho translada todos os membros pelo mesmo delta $(\Delta x, \Delta y)$.
  - O interior do frame usa `pointer-events: none`, de modo que cliques e seleções por marquee atingem diretamente os nós internos sem resistência. Se o grupo restar com menos de 2 nós, é dissolvido automaticamente.

### Racional
- Modelos rígidos de grid impedem layouts orgânicos. O snapping magnético ativado por tecla dá controle tátil preciso quando desejado sem engessar a exploração livre.
- A elevação permite inspecionar um agente em tela ampla sem perder o mapa mental do canvas espacial ao fundo.

---

## 3. Terminais, Responsabilidades Portáteis (`role.json`) e Sistema de Alertas

### Decisão
- **Responsabilidades e Sidecars**:
  - Quando uma responsabilidade é criada ou atribuída a um terminal em um subdiretório do projeto, o Maestri grava um arquivo sidecar `role.json` contendo:
    ```json
    {
      "name": "Revisor",
      "badgeColor": "#f59e0b",
      "prompt": "Você é o revisor de código sênior...",
      "createdAt": "2026-09-08T15:30:00Z"
    }
    ```
  - A tela de edição do terminal oferece o botão "Descobrir Responsabilidades", que faz um scan no diretório de trabalho procurando por arquivos `role.json` para adicionar à biblioteca.
- **Temas de Cores iTerm2 e Ghostty**:
  - O seletor de temas carrega mais de 30 esquemas de cores derivados do projeto iTerm2.
  - O sistema lê a pasta de usuário `~/.maestri/terminal/themes/` e analisa arquivos no formato de tema Ghostty (pares chave-valor como `background = #1e1e2e`, `foreground = #cdd6f4`, `palette = 0=#...`).
  - O modo "Seguir aparência do sistema" emparelha um tema claro com um tema escuro, alternando automaticamente via evento de tema do Electron (`nativeTheme.on('updated')`).
- **Ponto Vermelho de Atenção e Navegação**:
  - Quando a saída do terminal cessa por mais de 3 segundos após uma rajada de processamento ou quando padrões de prompt de aprovação são detectados no stream PTY, o nó ativa `hasAttention = true` (ponto vermelho pulsante no cabeçalho).
  - O atalho `Ctrl+Shift+A` navega ciclicamente entre todos os nós com atenção ativa, inclusive mudando de andar ou workspace se necessário.
  - Ao segurar `Ctrl`, todos os terminais exibem badges numerados `1..9` para salto instantâneo via teclado.

### Racional
- O arquivo `role.json` garante portabilidade entre máquinas e membros da equipe sem depender de bancos de dados locais opacos.
- O ponto de atenção somado aos atalhos numéricos permite operar até 9 agentes simultâneos sem tocar no mouse.

---

## 4. Notas Markdown Espaciais, Mídia Inline e Encadeamento

### Decisão
- **Armazenamento e Modo Visual**:
  - Notas são arquivos `.md` físicos. O cabeçalho possui toggle entre "Raw" (textarea com fonte mono) e "Formatada" (renderizada com `marked.js` e sanitização DOM).
  - Colar imagens (`⌘V` / `Ctrl+V`): O evento de `paste` intercepta arquivos blob de imagem, salva o arquivo PNG em `assets/{timestamp}_{hash}.png` no diretório de armazenamento e insere a sintaxe markdown `![imagem](assets/...)`.
  - Renomeação: Se nenhum nome personalizado estiver fixado, o título da nota adota dinamicamente a primeira linha de texto. Ao clicar duas vezes no cabeçalho, um popover permite fixar um nome customizado estável. Se o usuário apagar o nome customizado, volta à nomeação automática.
- **Encadeamento e Local Customizado**:
  - Conectar Nota A a Nota B cria uma aresta direcionada no grafo de notas. Agentes conectados à Nota A recebem comandos CLI como `maestri note read --chain <nodeId>` que recursivamente concatena os textos de toda a árvore conectada em formato estruturado.
  - O menu da nota oferece "Mover para...", permitindo apontar o caminho do arquivo para qualquer pasta do repositório. Arquivos arrastados do Finder para o canvas criam notas vinculadas àquele path original.

---

## 5. Conexões Visuais, Abraçadeiras e Comunicação Inter-Agentes

### Decisão
- **Física de Cordas vs Trilhos de Circuito**:
  - **Corda (padrão)**: Curva cúbica de Bézier com vetor de gravidade e pontos de controle dinâmicos calculados por simulação física simplificada de mola amortecida durante o arraste dos nós.
  - **Circuito**: Rota ortogonal gerada por algoritmo de Manhattan routing, desenhada com segmentos alinhados aos eixos X e Y e cantos arredondados com raio de 12px.
- **Abraçadeiras (Cable Ties)**:
  - Ao segurar `Alt` e arrastar o cursor cruzando múltiplos cabos, calcula-se a interseção da linha desenhada com os cabos SVG.
  - Uma entidade `CableTie` é criada no ponto médio, forçando todas as curvas interceptadas a passarem por aquele ponto coordenado antes de continuarem para seus destinos.
  - Arrastar a faixa da abraçadeira atualiza o ponto de convergência. Pressionar `Delete` remove a abraçadeira e devolve os cabos às suas trajetórias naturais.
- **Maestri Agent Skill e Roteamento Autônomo**:
  - Uma skill de linha de comando `maestri send <target_terminal_id> "<message>"` é disponibilizada no ambiente de shell de cada terminal.
  - Quando um terminal receptor recebe a mensagem, o Maestri monitora sua execução. Se o terminal receptor estiver desselecionado (sem foco do usuário), o Maestri aguarda a conclusão da geração do agente e envia a resposta de volta ao terminal remetente via injeção PTY. Se o usuário selecionar o terminal receptor, o monitoramento é pausado para não colidir com comandos manuais.

---

## 6. Árvore de Arquivos e Editor de Código Embutido

### Decisão
- **4 Modos de Visualização**:
  1. *Lista*: Árvore colapsável com expansão sob demanda e ordenação alfabética.
  2. *Grade de Ícones*: Miniaturas visuais para imagens, vídeos e arquivos PDF via Quick Look nativo ou renderizador web.
  3. *Diff*: Invocação de `git diff` processada no processo principal, exibindo diff unificado ou lado a lado.
  4. *Grafo Git*: Execução de `git log --graph --oneline --decorate` parseada para desenhar nós de commits conectados por linhas coloridas de branches.
- **Editor de Código Integrado**:
  - Componente baseado em CodeMirror embutido no nó da árvore de arquivos. Suporta realce de sintaxe, múltiplos cursores, busca/substituição e atalhos customizáveis.
  - Qualquer seleção de código no editor ou na visualização de diff exibe um botão flutuante de chat: clicar nele abre um popover para enviar o trecho citado diretamente para qualquer terminal de agente conectado.
- **Busca por Nome (`Ctrl+P`) e Conteúdo (`>`)**:
  - `Ctrl+P` com o nó selecionado abre busca fuzzy rápida nos caminhos de arquivos.
  - Digitar `>` no campo de busca do nó aciona busca de texto interna (ripgrep/grep nativo) retornando o arquivo e a linha correspondente.

---

## 7. Portais Web e Dispositivos Móveis com Automação de IA

### Decisão
- **Portais de Navegador**:
  - Implementados com `<webview>` isoladas do Electron com sessões particionadas (`persist:portal_{id}`). Conectar dois portais web faz ambos usarem a mesma partição de sessão (`persist:shared_session_{groupId}`), compartilhando cookies e localStorage.
  - Automação via CLI `maestri portal <id> [click|type|scroll|screenshot|eval]` executa scripts diretamente no webContents via IPC.
- **Portais de Dispositivos Móveis**:
  - **iOS Simulator (macOS)**: Integração com `xcrun simctl`. O buffer de tela é capturado via streaming de frames e renderizado via WebGL/Canvas 2D com aceleração de hardware. Entradas de mouse são convertidas para `simctl io bootio / simctl send_event`.
  - **Android**: Conexão com `adb`. Captura de tela via `adb exec-out screenrecord` ou `minicap`, e eventos via `adb shell input`.
  - **Automação por IA**: Em vez de coordenadas cegas, o agente lê a árvore de acessibilidade nativa (`xcrun simctl io dump_accessibility` no iOS e `adb shell uiautomator dump` no Android), permitindo selecionar botões e campos por rótulos verdadeiros e identificadores nativos.

---

## 8. Andares (Floors) com Clonagem APFS e Ciclo de Vida

### Decisão
- **Clonagem Copy-on-Write (APFS)**:
  - No macOS, a criação de um novo andar executa `cp -c -R <project_dir> .maestri/floors/<floor_name>`, criando um clone instantâneo em nível de filesystem que consome zero blocos extras no disco até que arquivos sejam modificados.
  - No Windows/Linux, executa-se `git worktree add .maestri/floors/<floor_name> <branch>`, garantindo isolamento sem dependência de APFS.
- **Transição 3D**:
  - O canvas aplica uma transformação CSS `perspective(1000px) rotateX(45deg) translateZ(-200px)` com transição suave, permitindo visualizar os andares como camadas empilhadas no espaço 3D antes de selecionar ou criar um andar.
- **Aterrissagem (Merge) e Hooks**:
  - A aterrissagem busca os commits do andar com `git fetch` e realiza um merge controlado com prévia visual de diff e detecção de conflitos.
  - Hooks de ciclo de vida (Setup com auto-run, Run, Teardown) são gravados em `.maestri/hooks.json` e executados com variáveis de ambiente preenchidas (`$MAESTRI_FLOOR_NAME`, etc.).

---

## 9. Compositor de Prompts Rico e Rascunhos

### Decisão
- **Compositor Flutuante (`Ctrl+Shift+P`)**:
  - O composer flutua logo abaixo do terminal ativo, ancorado ao rodapé da janela do terminal e movendo-se suavemente conforme o foco muda.
  - Suporta pills ricas com autocompletar ao digitar `@`:
    * Agentes conectados (endereça pelo nome)
    * Notas conectadas (injeta o markdown vivo na hora do envio)
    * Portais (anexa metadados e captura da tela do navegador/dispositivo)
    * Arquivos do projeto (busca fuzzy de arquivos)
    * `@Maestro` (aciona modo orquestrador)
- **Persistência de Rascunhos e Passthrough**:
  - O estado do editor (texto e pills) é salvo em um mapa `drafts[terminalId]`. Se o usuário alterna de andar ou workspace, o rascunho é restaurado exatamente como estava.
  - Quando o compositor estiver vazio, eventos de teclado como Setas, Return e Tab passam direto para o terminal subjacente via emulação de entrada PTY, permitindo responder confirmações do agente sem fechar o composer.

---

## 10. Batuta Search (Paleta de Comandos Global)

### Decisão
- **Motor de Busca Fuzzy Unificado**:
  - Indexador em memória no processo renderer que mapeia todos os workspaces, andares, nós de terminais, notas (título e texto completo), árvores de arquivos e portais.
  - Algoritmo de busca fuzzy que normaliza caracteres (remove acentos: "cafe" → "café") e compara sequências de caracteres destacando letras coincidentes em negrito (`<mark>`).
  - Priorização: nós do workspace atual > nós em outros workspaces; correspondências no nome > correspondências no corpo do texto.
- **Ações Rápidas "Pedir..." e "Verificar..."**:
  - Submodos da paleta:
    * "Pedir...": Seleciona um terminal, abre uma área de texto multilinha dentro da própria paleta e transmite o prompt para o terminal com prévia da saída em tempo real e atalho `Ctrl+Enter` para pular para lá.
    * "Verificar...": Exibe stream em tempo real somente leitura do terminal escolhido sem interferir no foco do canvas.

