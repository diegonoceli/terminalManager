# Feature Specification: fix-terminal-scroll-zoom (and Session Management)

**Feature Branch**: `001-fix-terminal-scroll-zoom`

**Created**: 2026-08-31

**Status**: Draft

**Input**: User description: "melhore o fluxo de rolagem do mouse no terminal, está bugado tento scroll baixo e ele tira o zoom , quando terminal estiver selecionado ou mouse em cima não deve tirar o zoom. quero tambem que consiga salvar sessão, reabrir os terminais"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Rolagem no Terminal Focado (Priority: P1)

Como usuário, quero rolar o conteúdo do terminal quando ele está selecionado sem que o zoom seja alterado acidentalmente.

**Why this priority**: Evitar a perda do nível de zoom desejado ao tentar ler o histórico do terminal é fundamental para a usabilidade.

**Independent Test**: Can be fully tested by selecting the terminal and scrolling the mouse wheel down. The content should scroll without any zoom change.

**Acceptance Scenarios**:

1. **Given** o terminal está selecionado (focado), **When** o usuário rola o botão do mouse para baixo, **Then** o conteúdo do terminal rola para baixo e o zoom não é alterado.

---

### User Story 2 - Rolagem no Terminal com Mouse Sobreposto (Hover) (Priority: P1)

Como usuário, quero rolar o conteúdo do terminal apenas posicionando o mouse sobre ele (sem clicar) sem que o zoom seja afetado.

**Why this priority**: Usuários costumam interagir com componentes na tela apenas passando o mouse e rolando, o comportamento deve ser consistente.

**Independent Test**: Can be fully tested by hovering the mouse over an unfocused terminal and scrolling down.

**Acceptance Scenarios**:

1. **Given** o terminal não está focado mas o cursor do mouse está sobre ele, **When** o usuário rola o botão do mouse para baixo, **Then** o conteúdo do terminal rola e o zoom não é alterado.

---

### User Story 3 - Persistência de Sessão dos Terminais (Priority: P1)

Como usuário, quero que as sessões dos meus terminais sejam salvas automaticamente, para que eu possa fechar o aplicativo e, ao reabri-lo, meus terminais estejam lá novamente com suas sessões ativas (ou restauradas).

**Why this priority**: Garantir que o trabalho e o contexto não sejam perdidos entre reinicializações da aplicação.

**Independent Test**: Can be fully tested by opening multiple terminals, closing the application, reopening it, and verifying that the terminals are restored.

**Acceptance Scenarios**:

1. **Given** o usuário tem 2 terminais abertos, **When** ele fecha a aplicação e a reabre, **Then** a aplicação deve restaurar automaticamente os 2 terminais no mesmo estado (posições, IDs, e reconectados aos processos).

### Edge Cases

- What happens when o mouse está fora da área do terminal e o usuário faz scroll? O comportamento global (se houver) de zoom da tela/canvas deve ser mantido ou não deve afetar o terminal.
- How does system handle scroll com teclas modificadoras (ex: Ctrl + Scroll)? O comportamento de zoom intencional com modificadores deve continuar funcionando caso seja um padrão esperado (assumido como fora do escopo se não especificado, mantendo o default).
- What happens when a sessão salva possui terminais cujos processos não existem mais no sistema operacional? Os terminais devem ser recriados ou avisar o usuário que a sessão foi encerrada, inicializando em um estado limpo mas no diretório correto.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE interceptar eventos de rolagem (scroll) do mouse quando o terminal estiver em foco (selecionado) e impedir que esses eventos acionem funções de zoom (zoom out/in).
- **FR-002**: O sistema DEVE interceptar eventos de rolagem (scroll) do mouse quando o cursor estiver sobre a área do terminal (hover) e impedir que ativem funções de zoom.
- **FR-003**: O sistema DEVE permitir a rolagem normal do conteúdo do histórico do terminal nos cenários de foco e hover.
- **FR-004**: O sistema DEVE salvar o estado dos terminais (IDs, processos, posições na tela/canvas, diretório de trabalho) localmente.
- **FR-005**: O sistema DEVE restaurar os terminais com base no estado salvo na inicialização do aplicativo.

### Key Entities

- **Terminal Component**: O componente de interface que renderiza o terminal e captura os eventos de mouse (focus/hover/wheel).
- **Workspace/Canvas Manager**: O gerenciador (se aplicável) que lida com o zoom global e que está acidentalmente capturando o scroll.
- **Session Manager**: Responsável por serializar o estado atual dos terminais em disco (localStorage, arquivo JSON, etc.) e desserializar durante a inicialização.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Usuários conseguem rolar o conteúdo do terminal com o scroll do mouse 100% das vezes sem disparar eventos acidentais de zoom.
- **SC-002**: O nível de zoom da aplicação ou componente permanece inalterado durante a rolagem com o mouse sobre o terminal.
- **SC-003**: Ao reabrir a aplicação, 100% dos terminais previamente abertos são restaurados nas posições corretas em menos de 2 segundos.

## Assumptions

- Assumimos que existe um evento global ou de parent component que está capturando o scroll e convertendo em zoom (ex: behavior padrão do Maestri canvas).
- Assumimos que o zoom intencional através de botões de UI ou atalhos de teclado (ex: Ctrl/Cmd + e Ctrl/Cmd -) continua funcionando normalmente.
- Assumimos que a restauração da sessão do terminal se limita a restaurar os componentes de interface do terminal e seus diretórios base. Se for impossível restaurar o processo exato (ex. um servidor dev rodando), um novo shell limpo no mesmo diretório será considerado sucesso.
