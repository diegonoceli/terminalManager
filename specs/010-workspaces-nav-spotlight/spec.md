# Feature Specification: Mini Barra Lateral, Editor, Fichários de Notas, Spotlight e Pastas/Grupos

**Feature Branch**: `010-workspaces-nav-spotlight`

**Created**: 2026-09-08

**Status**: Draft

**Input**: User descriptions:
1. "Na mini barra lateral, apenas os ícones dos espaços de trabalho são exibidos:
Clique em um ícone para mudar para aquele espaço de trabalho.
Passe o mouse em um ícone para revelar seu rótulo.
Clique e segure para ver a lista de terminais daquele espaço de trabalho.
Clique com o botão direito para o mesmo menu de contexto de um espaço de trabalho na barra lateral completa.
Abrir no editor: Um botão no canto superior direito do app permite abrir o diretório de trabalho do espaço de trabalho atual diretamente no seu editor de código.
Integração com o Spotlight: Todos os seus espaços de trabalho são indexados no sistema inteiro do macOS através da integração nativa com o Spotlight. Abra o Spotlight e pesquise por uma janela de terminal ou conteúdo de uma nota específica — o resultado te leva diretamente até ele dentro do Maestri.
Pastas e grupos: Conforme a lista de espaços de trabalho cresce, você pode organizá-la de duas formas:
Pastas — Agrupe espaços de trabalho relacionados (ex: diferentes serviços de um mesmo sistema).
Grupos — Divisores de seção na barra lateral com um rótulo. Útil para separar categorias distintas, como projetos pessoais e de trabalho."
2. "As notas parecem simples post-its no canvas, mas por baixo são arquivos markdown reais salvos no disco. O Maestri inclui um motor de markdown completo com pré-visualização ao vivo — e os agentes podem ler e escrever nelas através da CLI do Maestri.
Criando uma nota: Selecione a ferramenta Nota na barra de ferramentas superior e desenhe um retângulo no canvas. Um novo arquivo .md é criado na pasta de armazenamento do Maestri e fixado no canvas.
Visualizações raw e formatada: Raw e Formatada.
Imagens inline: Cole imagens diretamente em uma nota. Na formatada renderiza imagem; no raw aparece sintaxe markdown. Agentes conectados também podem ver essas imagens.
Nomes personalizados para notas: Derivado da primeira linha por padrão. Duplo clique no cabeçalho ou clique direito → Renomear para fixar. Limpar o nome personalizado volta à nomeação automática.
Encadeamento de notas: Notas conectadas a outras notas usando ferramenta de Conexão. Quando um agente está conectado à nota de entrada, pode acessar a cadeia inteira de notas.
Local personalizado para o arquivo: Mover para... e escolha um caminho. Se excluir a nota do canvas depois, o arquivo não é removido do local personalizado. Arrastar arquivos .md, .markdown ou .txt do Finder diretamente para o canvas cria notas mantendo o local original.
Removendo uma nota: Selecione-a e pressione ⌘W para excluir a nota e arquivo subjacente."
3. "Fichários: Um Fichário reúne notas soltas em uma pasta com abas. As notas continuam sendo notas de verdade — elas só passam a viver como páginas dentro dele, acessíveis pelas abas na lateral direita, então aquele canto do canvas que virou uma pilha de notas volta a ser um nó só, que você folheia.
Criando um: Selecione duas ou mais notas, clique com o botão direito e escolha Colocar no Fichário.
Adicionando e removendo páginas: Adicionar uma nota — solte ela dentro do Fichário. Tirar uma — clique e arraste a partir da aba dela, na direita, e aquela página volta a ser uma nota livre. Folhear — clique em uma aba para trazer aquela página para a frente. Reordenar — arraste uma aba para cima ou para baixo.
Notas arquivadas em um Fichário existente entram no topo, as mais novas primeiro. Uma nota pertence a um Fichário por vez.
Conecte um a um agente: Conecte um Fichário a um agente e ele acessa todas as páginas lá dentro.
Uma cor para a pasta inteira: Clique com o botão direito no Fichário e escolha Cor uniforme para pintar todas as páginas iguais.
Dê um nome para ele ficar: Clique com o botão direito em um Fichário e use Renomear. Um Fichário com nome continua no canvas mesmo sem nenhuma nota dentro, enquanto um sem nome se desfaz quando as páginas acabam. É isso que faz os fluxos de trabalho por tarefa funcionarem (Backlog, Fazendo, Revisão, Entregue)."

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mini Barra Lateral Interativa com Pré-visualização e Ações Rápidas (Priority: P1) 🎯 MVP

Como usuário navegando com foco máximo no canvas, quando a barra lateral estiver recolhida em modo mini (~48px), quero interagir com os ícones compactos dos meus espaços de trabalho — alternando com um clique, visualizando o rótulo ao passar o mouse, abrindo a lista de terminais ao segurar o clique (long-press) e acessando o menu de opções completas com o botão direito — para gerenciar e alternar contextos sem precisar expandir a sidebar.

**Why this priority**: A mini barra lateral libera 85% do espaço horizontal para o canvas infinito mantendo 100% da capacidade de navegação e inspeção rápida dos workspaces ativos.

**Independent Test**: Recolher a barra lateral para o modo mini; passar o cursor sobre um ícone e validar o tooltip; pressionar e segurar o ícone e validar o menu suspenso de terminais; clicar com botão direito e validar o menu de contexto idêntico ao da barra completa.

**Acceptance Scenarios**:

1. **Given** a barra lateral em modo recolhido (mini), **When** o usuário clica sobre o ícone de um workspace, **Then** o Maestri alterna imediatamente para o workspace correspondente.
2. **Given** a barra lateral em modo mini, **When** o usuário repousa o cursor sobre o ícone de um workspace por mais de 200ms, **Then** um tooltip flutuante exibe o nome do workspace e seu diretório de trabalho.
3. **Given** a barra lateral em modo mini, **When** o usuário pressiona e segura (long-press ~400ms) o ícone de um workspace, **Then** um menu popover lista todos os nós de terminal contidos nele, e clicar em qualquer um deles foca diretamente aquele terminal no canvas.
4. **Given** qualquer ícone na mini barra lateral, **When** o usuário clica com o botão direito, **Then** o menu de contexto completo do workspace (Editar, Exportar, Abrir no Editor, Excluir) é exibido na posição do cursor.

---

### User Story 2 - Botão de Abertura Rápida no Editor de Código (Priority: P1)

Como desenvolvedor trabalhando em múltiplos repositórios, quero um botão fixo de fácil acesso no cabeçalho (canto superior direito) que abra instantaneamente o diretório de trabalho do workspace atual no meu editor de código configurado (ex: VS Code ou Cursor), para transitar suavemente entre o canvas do Maestri e o ambiente de edição de código.

**Why this priority**: Conecta diretamente a visualização do projeto no Maestri com as ferramentas de desenvolvimento do usuário sem atrito ou necessidade de usar a linha de comando manual.

**Independent Test**: Definir o diretório de trabalho do workspace; clicar no botão de editor no canto superior direito; verificar que o editor externo é disparado com a pasta correta.

**Acceptance Scenarios**:

1. **Given** um workspace ativo com diretório de trabalho definido, **When** o usuário clica no botão "Abrir no Editor" no canto superior direito, **Then** o sistema invoca a abertura do diretório no editor de código padrão do sistema (ex: VS Code / Cursor / editor padrão).
2. **Given** um workspace ativo que ainda não possui diretório de trabalho configurado, **When** o usuário clica no botão "Abrir no Editor", **Then** uma caixa de seleção de pasta nativa é apresentada para que o usuário vincule o diretório antes de abrir.

---

### User Story 3 - Notas Markdown Espaciais com Imagens, Encadeamento e Integração Finder (Priority: P1)

Como usuário ou agente orquestrando tarefas no canvas, quero que notas pareçam simples post-its mas sejam arquivos markdown reais com alternância Raw/Formatada instantânea, suporte a colar imagens inline da área de transferência, renomeação flexível (automática pela 1ª linha ou personalizada por duplo clique), encadeamento hierárquico navegável por agentes de IA, arrastar arquivos .md/.txt do Finder para o canvas e exclusão rápida via atalho ⌘W.

**Why this priority**: Notas são a memória compartilhada de contexto entre humanos e agentes no canvas espacial do Maestri.

**Independent Test**: Colar uma imagem da área de transferência dentro de uma nota e verificar sua renderização visual; conectar Nota A em Nota B e validar que o agente conectado em A lê os dados de B; arrastar um arquivo .md do Finder para o canvas; selecionar a nota e teclar ⌘W para excluir.

**Acceptance Scenarios**:

1. **Given** uma nota no canvas, **When** o usuário cola uma imagem da área de transferência (`Cmd+V`), **Then** a imagem é salva como asset local, inserida no texto como sintaxe markdown `![imagem](...)` e renderizada na visualização formatada.
2. **Given** o cabeçalho de uma nota, **When** o usuário dá duplo clique ou seleciona "Renomear", **Then** um popover permite digitar um nome estável; se o campo for esvaziado, o sistema restaura automaticamente o título baseado na primeira linha de texto.
3. **Given** duas ou mais notas interligadas por cabos de conexão, **When** um agente de terminal conectado à nota raiz consulta as notas via CLI ou canal IPC, **Then** o sistema fornece o conteúdo concatenado ou navegável de toda a cadeia de notas conectadas.
4. **Given** um arquivo `.md`, `.markdown` ou `.txt` no macOS Finder, **When** o usuário arrasta o arquivo para o canvas, **Then** uma nota vinculada àquele arquivo no local original é criada sem duplicar nem mover o arquivo.
5. **Given** uma nota selecionada no canvas, **When** o usuário pressiona a tecla <kbd>⌘W</kbd> (ou <kbd>Ctrl+W</kbd>), **Then** a nota é removida do canvas (e o arquivo apagado do disco se for nota interna, ou preservado se for arquivo externo do projeto).

---

### User Story 4 - Fichários de Notas com Abas Laterais e Suporte a Workflows (Priority: P2)

Como usuário organizando pilhas de notas em fluxos de trabalho (ex: Kanban com etapas "Backlog", "Fazendo", "Revisão", "Entregue"), quero agrupar notas em **Fichários** espaciais com abas verticais na lateral direita — podendo folhear clicando nas abas, reordenar arrastando as abas para cima/baixo, soltar notas para adicioná-las no topo, puxar uma aba para soltá-la de volta no canvas, aplicar cor uniforme a todas as páginas e conectar um cabo a um agente para que ele leia todas as páginas daquele fichário.

**Why this priority**: Transforma pilhas caóticas de notas em nós condensados e elegantes, viabilizando pipelines e quadros de trabalho estruturados.

**Independent Test**: Selecionar duas notas e clicar com botão direito → "Colocar no Fichário"; verificar as abas na lateral direita; clicar em uma aba e verificar que ela vem para a frente; arrastar a aba para fora e verificar que ela volta a ser nota livre; renomear o Fichário para "Backlog" e esvaziá-lo, verificando que ele permanece no canvas como receptáculo permanente.

**Acceptance Scenarios**:

1. **Given** duas ou mais notas selecionadas no canvas, **When** o usuário clica com botão direito e escolhe "Colocar no Fichário", **Then** as notas são agrupadas em um único nó de Fichário com abas verticais na borda direita.
2. **Given** um Fichário no canvas, **When** o usuário solta uma nota livre sobre ele, **Then** a nota é inserida no topo da pilha do Fichário e uma nova aba é adicionada.
3. **Given** um Fichário com múltiplas abas, **When** o usuário clica em uma aba, **Then** aquela nota é trazida imediatamente para o primeiro plano da visualização do Fichário.
4. **Given** um Fichário, **When** o usuário clica e arrasta uma aba para fora do Fichário em direção ao canvas, **Then** aquela página é desanexada e volta a ser uma nota independente na posição solta.
5. **Given** um cabo de conexão ligando um Fichário a um terminal de agente, **When** o agente consulta o Fichário, **Then** todas as notas contidas são disponibilizadas como contexto unificado.
6. **Given** um Fichário renomeado pelo usuário (com nome customizado), **When** todas as páginas são removidas dele, **Then** ele continua existindo no canvas como container vazio esperando novas notas.
7. **Given** um Fichário sem nome personalizado (anônimo), **When** sua última página for removida, **Then** ele se dissolve automaticamente do canvas.

---

### User Story 5 - Organização da Barra Lateral por Pastas e Grupos (Priority: P2)

Como usuário com dezenas de projetos e microsserviços, quero organizar meus workspaces em **pastas** recolhíveis (para projetos de múltiplos repositórios) e **grupos** divisores com rótulo (como "Trabalho" e "Pessoal"), para manter a lista categorizada e limpa conforme o número de workspaces cresce.

**Why this priority**: Evita sobrecarga cognitiva e poluição visual quando múltiplos fluxos de trabalho são orquestrados em paralelo.

**Independent Test**: Criar um grupo "Projetos Pessoais"; criar uma pasta "Backend Services"; arrastar dois workspaces para dentro da pasta; recolher e expandir a pasta; verificar persistência da estrutura entre reinicializações.

**Acceptance Scenarios**:

1. **Given** a lista de workspaces na barra lateral, **When** o usuário cria um divisor de grupo, **Then** uma seção rotulada visualmente é inserida separando as categorias na sidebar.
2. **Given** uma pasta criada na barra lateral, **When** o usuário arrasta um workspace para sobre a pasta, **Then** o workspace passa a ser filho dessa pasta e sua visibilidade é controlada pela abertura/fechamento da pasta.
3. **Given** a mini barra lateral ativa, **When** workspaces estão organizados em pastas, **Then** a mini barra agrupa seus ícones ou indica visualmente a pasta de origem sem perder a usabilidade compacta.

---

### User Story 6 - Integração de Busca Global via macOS Spotlight (Priority: P3)

Como usuário do macOS, quero pesquisar no Spotlight global do sistema operacional (`Cmd + Space`) por títulos de terminais, nomes de workspaces ou conteúdos textuais de notas, e ao selecionar o resultado, ter o Maestri aberto diretamente no workspace e nó correspondente com foco animado.

**Why this priority**: Oferece experiência nativa integrada ao ecossistema Apple, permitindo achar qualquer anotação ou terminal vivo sem nem mesmo abrir previamente a janela do Maestri.

**Independent Test**: Criar uma nota com texto "Revisão de Arquitetura 2026"; fechar ou minimizar o Maestri; abrir o Spotlight do macOS e digitar "Revisão de Arquitetura"; clicar no resultado; verificar abertura imediata do Maestri centrando a nota correspondente.

**Acceptance Scenarios**:

1. **Given** workspaces, notas e terminais no Maestri, **When** os recursos são salvos ou atualizados, **Then** arquivos de metadados indexáveis pelo Spotlight (`.spotlight` ou índice compatível com `mdimport`) são atualizados no diretório de dados do aplicativo.
2. **Given** um resultado do Maestri indexado no Spotlight, **When** o usuário clica no resultado ou aciona o protocolo de URL `maestri://open?workspace=<ws>&node=<id>`, **Then** o Maestri traz sua janela para o primeiro plano, comuta para o workspace correspondente e move a câmera para focar o recurso desejado.

---

## Edge Cases

- **Workspace sem diretório ao clicar em Abrir no Editor**: O sistema deve orientar o usuário a selecionar uma pasta imediatamente via seletor nativo, em vez de falhar silenciosamente.
- **Exclusão de pasta com workspaces filhos**: O sistema deve perguntar se deseja mover os workspaces para fora ou excluí-los conjuntamente.
- **Clique rápido vs clique longo (long-press) na mini sidebar**: O temporizador de long-press (400ms) deve cancelar caso ocorra deslocamento do cursor (`pointermove` > 5px) para não colidir com operações de arraste/reordenação.
- **Fichário com muitas páginas**: Quando o número de abas na lateral direita exceder a altura do nó, a coluna de abas deve ter rolagem vertical suave com indicadores de topo/fundo.
- **Desanexar nota de Fichário**: Ao soltar a aba no canvas, a nota recém-extraída deve preservar seu conteúdo, estilo e posição relativa próxima à saída do cursor.
- **Spotlight em plataformas não-macOS**: Em ambientes Windows/Linux, os mecanismos de indexação específicos do Spotlight devem degradar graciosamente sem lançar erros, mantendo um mecanismo de busca interna rápida via atalho de teclado (`Cmd/Ctrl + P`).
- **Imagem colada de tamanho excessivo**: Imagens coladas devem ser persistidas de forma otimizada na pasta de assets da nota (PNG/WebP local) para não sobrecarregar a renderização do canvas.
- **Arquivo externo do projeto excluído via ⌘W**: Quando a nota for externa (arrastada do Finder ou movida para o projeto), a exclusão pelo atalho ⌘W remove apenas o post-it do canvas, preservando o arquivo original no disco.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE fornecer modo mini para a barra lateral esquerda (~48px), exibindo apenas os ícones circulares dos workspaces ativos.
- **FR-002**: O sistema DEVE exibir tooltip com o título e caminho do workspace ao passar o mouse sobre o ícone na mini barra lateral.
- **FR-003**: O sistema DEVE suportar gesto de long-press (~400ms) sobre o ícone do workspace na mini barra lateral, exibindo um popover com a listagem de todos os terminais ativos no workspace para foco direto.
- **FR-004**: O sistema DEVE exibir o menu de contexto completo do workspace ao clicar com o botão direito sobre qualquer ícone na mini barra lateral.
- **FR-005**: O sistema DEVE posicionar um botão no canto superior direito do app ("Abrir no Editor") que invoque a abertura do `workingDir` do workspace no editor de código configurado (ex: VS Code via protocolo ou comando de sistema).
- **FR-006**: O sistema DEVE permitir a criação de pastas organizacionais na barra lateral, capazes de agrupar múltiplos workspaces com suporte a expandir/recolher.
- **FR-007**: O sistema DEVE permitir a criação de divisores de grupo rotulados na barra lateral para separação categórica.
- **FR-008**: O sistema DEVE persistir a hierarquia de pastas e grupos no `state.json` do aplicativo.
- **FR-009**: O sistema DEVE gerar arquivos de metadados do Spotlight no macOS no diretório `userData/spotlight/` e registrar o esquema de URL `maestri://` para permitir navegação direta a partir de buscas do sistema.
- **FR-010**: O sistema DEVE animar a câmera do canvas infinito diretamente até o nó buscado quando o app for ativado via URL deep-link do Spotlight.
- **FR-011**: O sistema DEVE interceptar o evento de colar (`Cmd+V`) em notas para aceitar imagens do clipboard, salvando-as como arquivos locais e inserindo sintaxe markdown de imagem `![imagem](...)`.
- **FR-012**: O sistema DEVE permitir renomeação de notas via duplo-clique no cabeçalho ou menu de contexto, restaurando a derivação automática do nome a partir da primeira linha caso o nome seja deixado vazio.
- **FR-013**: O sistema DEVE permitir interligar notas entre si com cabos de conexão e disponibilizar para agentes conectados a travessia de toda a cadeia de notas conectadas.
- **FR-014**: O sistema DEVE aceitar o arraste direto de arquivos `.md`, `.markdown` e `.txt` do Finder para o canvas, instanciando notas vinculadas ao caminho original.
- **FR-015**: O sistema DEVE suportar o atalho <kbd>⌘W</kbd> para fechar e excluir a nota atualmente selecionada no canvas, com proteção para não apagar arquivos locais externos movidos para o projeto.
- **FR-016**: O sistema DEVE suportar a criação de Fichários reunindo múltiplas notas em páginas com abas na lateral direita através de seleção múltipla ou arraste.
- **FR-017**: O sistema DEVE permitir folhear páginas clicando nas abas e reordenar abas via arraste vertical no Fichário.
- **FR-018**: O sistema DEVE permitir extrair páginas de um Fichário arrastando sua aba para fora em direção ao canvas.
- **FR-019**: O sistema DEVE permitir aplicar cor uniforme a todas as páginas do Fichário via menu contextual.
- **FR-020**: O sistema DEVE manter no canvas Fichários vazios que possuam nome personalizado, e dissolver automaticamente Fichários sem nome quando sua última página for removida.
- **FR-021**: O sistema DEVE permitir a conexão por cabo entre um Fichário e um terminal de agente, fornecendo o conteúdo de todas as suas páginas concatenado/acessível para o agente.

### Key Entities

- **WorkspaceFolder**: Entidade de agrupamento que contém múltiplos IDs de workspaces, rótulo e estado colapsado (`id`, `name`, `workspaceIds`, `collapsed`).
- **WorkspaceGroup**: Entidade de divisão na lista da barra lateral contendo rótulo (`id`, `name`).
- **SpotlightIndexItem**: Registro de indexação contendo metadados pesquisáveis de terminais, notas e workspaces (`id`, `title`, `description`, `content`, `workspaceId`, `nodeId`, `updatedAt`).
- **NoteEntity**: Entidade de nota markdown contendo caminho de arquivo, visualização ativa (`raw` | `rendered`), nome estável ou derivado, lista de imagens anexadas e cadeia de nós conectados.
- **BinderEntity (Fichário)**: Nó agregador espacial contendo lista ordenada de notas como páginas, abas laterais direitas, nome customizado (opcional), cor uniforme (opcional) e conexões de entrada/saída.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Transição e comutação entre workspaces pela mini barra lateral ocorre em menos de 50ms após o clique.
- **SC-002**: O popover de lista de terminais no long-press abre em exatamente 400ms sem conflitos com arrastes.
- **SC-003**: O botão "Abrir no Editor" dispara o processo do editor em menos de 300ms.
- **SC-004**: Resultados de notas e terminais criados no Maestri aparecem nas buscas do Spotlight em menos de 2 segundos após a edição.
- **SC-005**: Imagens coladas em notas aparecem renderizadas na tela em menos de 100ms.
- **SC-006**: Arquivos arrastados do Finder para o canvas são convertidos em notas ativas em menos de 150ms.
- **SC-007**: Agrupamento de notas em Fichário e folheamento de abas ocorrem instantaneamente a 60fps sem engasgos.
- **SC-008**: Profundidade e ordenação da árvore de pastas e grupos é preservada 100% fielmente ao reiniciar o app.

---

## Assumptions

- O usuário no macOS possui editor de código configurável (com fallback automático para `code` ou aplicativo associado a pastas).
- A mini barra lateral pode ser acionada via botão de recolher/expandir ou arrastando o divisor da sidebar até a largura mínima.
- O macOS Spotlight indexa arquivos com atributos e extensões suportadas em caminhos sob o container da aplicação.
- Arquivos de imagem colados são salvos em formato PNG em uma subpasta segura de cache/assets do workspace.
- Cada nota só pertence a um único Fichário por vez.
