# Research: Decisões Técnicas do Delta Maestri

**Fase 0** — consolidação de decisões para os pontos abertos do plano. Formato: Decision / Rationale / Alternatives considered.

## 1. Migração Workflow ("Floor") → Workspace (state.json v2 → v3)

### Contexto
App atual persiste `{version:2, activeWorkflowId, workflows:[{id,name,nodes,connections}]}` (ver `electron/terminal-manager.js`). FR-053 exige migração 1:1 e substituição do conceito.

### Decision
Criar `electron/state-migrate.js` que, ao carregar `state.json`:
- Detecta `version < 3`. Se v2/v1 → converte cada `workflow` em `Workspace` com `{id, name, icon:"", workingDir:"", instructions:{syncClaudeAgents:false}, nodes, connections, createdAt, updatedAt}` e `activeWorkspaceId`.
- Nós permanecem com a mesma geometria; nenhum processo é relançado durante a migração (ocorre no `restore()` normal).
- Grava v3 e passa a operar no modelo novo.

### Rationale
Migração no main process preserva nós/conexões sem tocar no renderer; conceito único (1 workspace = 1 projeto = 1 canvas) simplifica o resto do delta.

### Alternatives considered
- **Workspace contendo múltiplos floors** (Q2=B): rejeitado — descrição do produto e resposta do usuário indicam modelo 1:1.
- Rodar ambos os modelos em paralelo: rejeitado — duplicação de estado e de UI.

---

## 2. Execução em segundo plano com limite LRU e pausa/retomada

### Contexto
FR-008/FR-054 + Clarificações Q3/Q5: ativo + N recentes (N=3) permanecem vivos; pausa = encerrar processos e liberar recursos; reativar = relançar agentes com resume quando suportado.

### Decision
Novo `electron/workspace-registry.js`:
- Guarda por workspace: snapshot dos nós (estado salvo) e, quando **ativo/em background**, o conjunto de sessões PTY vivas.
- Ao alternar workspace: o atual **continua vivo** (não encerra) e é marcado com timestamp de última ativação (`lastActiveAt`). Aplica política LRU: se houver > N workspaces vivos, encerra os PTYs do menos recente e guarda apenas o snapshot.
- `terminal-manager.loadWorkflow()` é refatorado para **não matar** terminais de workspaces em background; só troca a "superfície ativa" exibida no renderer.
- Workspaces pausados são relançados via `agent-cli` com resume (ver §3) ao reativar.

### Rationale
node-pty roda no main process e sobrevive à troca de UI; manter PTYs vivos no main é a única forma de "continuar rodando" sem infraestrutura externa (tmux). LRU evita exaustão de recursos. Pausa por encerramento libera CPU/memória de verdade (Q5).

### Alternatives considered
- SIGSTOP/congelar processos: mantém memória alocada e não libera recursos — rejeitado (Q5 optou por encerrar/relançar).
- Todos os workspaces ilimitados: risco de exaustão — rejeitado (Q3).

---

## 3. Agentes CLI: detecção, spawn, responsabilidades e resume

### Contexto
FR-011/FR-014/FR-015/FR-016: terminais executam Claude Code (`claude`), Codex (`codex`) ou OpenCode (`opencode`); responsabilidades injetadas no start; resume pós-restart/pausa quando suportado (FR-052).

### Decision
Novo `electron/agent-cli.js` com adaptadores por agente:
- **Detecção**: `which claude|codex|opencode` (PATH) no main; lista enviada ao renderer para seleção.
- **Spawn**: `pty.spawn(cmd, args, { cwd: workspaceDir, env })` em vez do shell padrão. `workspaceDir` = diretório do workspace (fallback `$HOME` se vazio).
- **Responsabilidade → injeção**: ao iniciar, o adaptador escreve no PTY, assim que o agente sinaliza prontidão (heurística: aguarda primeira saída estável / prompt conhecido por agente), a mensagem de abertura com as instruções da role. Mantém também o arquivo de instruções do projeto (CLAUDE.md/AGENTS.md) como camada passiva (ver §5).
- **Resume** (por agente): `claude --resume [session]`, `codex resume [session]`, `opencode --session <id>` quando houver sessão anterior; caso contrário spawn limpo. Detecção de suporte é por tentativa + fallback documentado (FR-052/SC-012).
- **Nomes/ícones**: título do nó + `icon` persistidos; cabeçalho reutiliza o padrão atual.
- **role.json sidecar**: `electron/roles.js` grava/ler `.maestri/role.json` (ou raiz do diretório) com as responsabilidades usadas naquele projeto; responsabilidades globais ficam em `state.json`.

### Rationale
Cada CLI é um binário distinto com flags próprias; adaptadores finos isolam essa variação. Injeção por escrita no PTY não exige flag não padronizada entre os 3 e funciona para sessões interativas (padrão TUI).

### Alternatives considered
- Lançar só o shell e instruir o usuário a digitar `claude`: não atende "selecione um agente na lista" (FR-011).
- Injeção via `--append-system-prompt`/flags equivalentes: flags não são comuns aos 3 agentes e mudam entre versões — rejeitado como mecanismo primário (pode ser otimização futura).

---

## 4. Indicador de atenção, notificações e navegação por badges

### Contexto
FR-017/FR-018: ponto de atenção quando o agente para (aguardando decisão/concluído); notificação opcional; badges numerados com `Ctrl` para focar terminal.

### Decision
- No main (`terminal-manager.js`), ampliar a detecção existente de padrões de prompt (`[y/n]`, `password:`) e adicionar heurística de **ociosidade do agente** (sem saída por T ms após burst de atividade) para emitir `attention` com `{id, state:"waiting"|"done", viaNotifications:bool}`.
- No renderer, `terminal.js` adiciona classe `.attention` (ponto vermelho) no cabeçalho do nó e notificação reutiliza o fluxo atual (`notify`).
- Badges: ao manter `Ctrl`, overlay numerado sobre os widgets (`main.js`) ordenado por posição/z; digitar número → `setActive`+foco. `Ctrl+Shift+A` pula ao próximo nó com `.attention`.

### Rationale
Reaproveita a infraestrutura de notificação/prompt existente; heurística de ociosidade é barata e determinística o bastante para v1.

### Alternatives considered
- Detectar fim de tarefa por parsing semântico da saída do agente: frágil entre 3 CLIs — rejeitado para v1.

---

## 5. Notas markdown e arquivos de instrução (CLAUDE.md/AGENTS.md)

### Contexto
FR-019..FR-025 (Notas como arquivos .md) e FR-010 (sincronização CLAUDE.md/AGENTS.md).

### Decision
- `electron/notes-store.js`: mapeia `noteId → arquivo .md`. Padrão: pasta interna do app (`userData/notes/<workspaceId>/<noteId>.md`). "Mover para o projeto" = atualizar mapeamento e mover o arquivo (opção em menu do nó). Watch de mudança externa (fs.watch) → evento ao renderer (evita sobrescrever edições externas).
- Render: `public/vendor/marked.min.js` + sanitização básica de HTML (whitelist) — sem DOMPurify completo para manter bundle pequeno; imagens inline coladas são salvas como arquivos ao lado do `.md` (data URI → arquivo).
- Título: primeira linha do `.md`; flag `pinnedName` fixa o nome. Remoção (`⌘W`) → confirmação quando o arquivo está fora da pasta interna (FR-025).
- Encadeamento: usa o mesmo grafo de conexões (nó–nó); notas ligadas são navegáveis (skill agente→nota, §7).
- **Sincronização CLAUDE.md/AGENTS.md**: na edição do workspace, `roles.js` mantém ambos sincronizados quando habilitado (fonte = conteúdo editado na UI); escrita atômica (tmp+rename).

### Rationale
Notas são arquivos reais (descrito no produto) e reutilizam o modelo de conexões existente para hierarquia.

### Alternatives considered
- Guardar notas apenas no `state.json`: contraria "arquivos Markdown reais no disco" e o acesso dos agentes via CLI.
- Renderer completo tipo Monaco/Milkdown: peso desnecessário para notas.

---

## 6. Árvore de Arquivos, Git, Diff/Graph e busca

### Contexto
FR-026..FR-033: file tree node com lista/grade/diff/graph, CRUD, git ops, editor embutido, busca Ctrl+P e `>`.

### Decision
- `electron/filetree-service.js` no main (fs + git via `child_process`), expondo operações por mensagens: `read_dir`, `crud`, `git_*`, `diff`, `log_graph`, `search`.
- **Lista**: leitura recursiva lazy (por pasta) do diretório do workspace.
- **Grade**: miniaturas nativas via `file://` (img/vídeo/PDF) geradas no renderer.
- **Diff**: `git diff` (working vs HEAD) com parsing por arquivo; exibição lado a lado (base vs atual) no widget.
- **Graph**: `git log --graph --all --decorate --oneline` apresentado como grafo SVG simples (sem lib).
- **Git ops**: branch atual (`git branch --show-current`), commit (status+diff resumido + mensagem), pull/push/fetch, checkout, new branch, merge, stash — via child_process com `cwd`.
- **Editor embutido**: CodeMirror 5 vendored (`public/vendor/`), modos de linguagem mínimos por extensão; suporta find/replace, multicursor, autoclose, indent detection.
- **Busca**: índice fuzzy em memória por nome (Ctrl+P) construído sob demanda; busca por conteúdo (`>termo`) com `rg`/`grep -rl` se disponível, senão varredura limitada a arquivos de texto; limite de profundidade/tamanho para manter <1 s (SC-010).
- **Seleção → agente**: overlay `.chat-send` sobre seleção no editor/diff; envia o trecho ao terminal do agente conectado (via `agent-comm`).

### Rationale
Git por CLI nativo evita dependência pesada; editor via CodeMirror 5 é leve, suporta todos os requisitos de FR-031 e é vendável offline. Busca lazy mantém performance.

### Alternatives considered
- Monaco: pesado demais para vender e integrar — rejeitado.
- Lib JS de git (isomorphic-git): duplicaria `git` e aumenta superfície — rejeitado.

---

## 7. Conexões avançadas e comunicação agente↔agente/nota/portal

### Contexto
FR-034..FR-039, FR-055, US6/US7: estilos Corda/Circuito, abraçadeiras, inspeção; skill de comunicação entre agentes e agente→nota/portal com registro.

### Decision
- **Modelo**: `ConnectionData` ganha `style: "rope"|"circuit"` e `bundle?: string` (id do feixe). Renderer desenha corda (bezier + física pendular simétrica suave) ou circuito (polilinha ortogonal com curvas de 90°). `Alt+drag` sobre fios cria `bundle` (agrupa ids); remover do feixe restaura estilos individuais.
- **Inspeção**: badge de conexões no cabeçalho do nó → painel listando conexões (criar/remover/mudar estilo).
- **Skill de comunicação (contrato em `contracts/agent-skill.md`)**: Maestri instala, para cada agente conectado, uma skill/CLI local (`maestri-agent <send|note|portal>`), registrada no agente via seu mecanismo de extensão (ex: instruções + binário no PATH de sessão). Canal agente→agente: `maestri-agent send --to <terminalId> "texto"` escreve no PTY do destino (entrada) e registra a ação. agente→nota: `maestri-agent note read|write <noteId>` opera no `.md`. agente→portal: `maestri-agent portal navigate|reload <portalId> <url>` aciona o `<webview>`.
- **Registro/rastreabilidade (FR-055)**: cada ação da skill é persistida num histórico por par de nós e exibida no painel de inspeção/indicador.
- Segurança: comando somente entre nós conectados; inputs vindos de agentes são tratados como entrada de teclado do terminal destino (mesma confiança de um usuário digitando), alinhado à decisão "execução direta com registro" (Q4).

### Rationale
Comunicação via CLI local (skill) é o único mecanismo que agentes externos conseguem invocar de forma agnóstica (todos têm execução de comandos); o registro atende FR-055 sem filas de aprovação.

### Alternatives considered
- Socket/websocket interno para agentes: agentes não têm como falar com sockets arbitrariamente sem skill — skill CLI é o padrão Maestri/agêntico.
- Fila de aprovação manual (Q4=B): rejeitado — trava autonomia.

---

## 8. Produtividade de canvas: grupos, snap, minimapa, elevar/acoplar, Texto/Desenho

### Contexto
FR-040..FR-049, US8.

### Decision
- **Inserção por arrasto**: ferramentas ativas na toolbar; `mousedown` no canvas abre um retângulo de seleção que, ao soltar, cria o nó do tamanho desenhado (`canvas.js` + dispatch `create_node` com layout).
- **Grupos**: `frame` com `groupId`; seleção múltipla + `Ctrl+G` cria grupo com bounding box nomeada; mover cabeçalho move filhos; `Ctrl+Shift+G` dissolve. Persistido como nó-sombra `type:"group"` ou campo `group` por nó (decisão: campo `group` + entidade Group no estado, pois não é nó renderizável).
- **Alinhar/distribuir/organizar**: comandos no renderer (sem round-trip) sobre nós selecionados; `Ctrl+Shift+T` grade.
- **Snap magnético**: só com `Ctrl` pressionado durante drag — testa limites contra nós vizinhos (tolerância ~6px mundo) e encaixa paredes/preenche lacunas.
- **Minimapa**: overlay SVG `#minimap` no canto; desenha viewport atual e nós (retângulos) em escala; `Ctrl+Shift+M` alterna; clicar navega.
- **Elevar/Acoplar**: duplo clique no cabeçalho → anima o nó ao centro (elevar). Arrastar cabeçalho à borda da tela cria painel acoplado (coluna fixa fora do `#world` transform, ex.: dock esquerda/direita) — novo container `#docks` não-transformado; estado `docked:"left"|"right"|null` por nó.
- **Texto/Desenho**: `TextWidget` (contenteditable/textarea leve) e `DrawWidget` (canvas 2D de rascunho; strokes serializados `{color,width,points[]}` persistidos no nó).

### Rationale
Decisões espaciais são do renderer (mais fluido, sem IPC por frame); persistência via nós/entidades no estado. Docks exigem container separado do `#world` para não acompanhar pan/zoom.

### Alternatives considered
- Persistir grupo como nó do tipo `group`: rejeitado — grupos são composição, não widget.
- Dock dentro do mundo transformado: rejeitado — coluna fixa precisa viver fora do transform.

---

## 9. Temas (Ghostty/Dracula/Catppuccin/Nord), `.maestri` e Spotlight

### Contexto
FR-050/FR-051, US10, FR-009.

### Decision
- **Temas**: presets Dracula/Catppuccin/Nord adicionados como objetos no formato do tema atual do xterm (mapeados de paletas conhecidas); importar tema Ghostty = parsear o JSON de tema (`*.json`) e mapear `background/foreground/cursor/palette` para o `style` do nó (`terminal.js`).
- **`.maestri`**: bundle JSON autocontido `{app, version, exportedAt, workspaces:[...]}` com notas e roles **embutidos** (base64/raw) para independência de paths locais; import = validar + criar workspaces (merge ou novo, decisão de UI: novo workspace com nome + "(importado)").
- **Spotlight (macOS)**: registrar esquema `maestri://open?workspace=<id>` (`app.setAsDefaultProtocolClient`). Workspaces são expostos como arquivos `.maestri` numa pasta de usuário indexável (`~/Maestri`) ou metadados; notas `.md` já indexáveis se estiverem em pasta acessível. Abertura via protocolo foca o app e carrega o alvo. (v1: workspaces como `.maestri` na pasta Maestri + protocolo.)

### Rationale
Ghostty themes são JSON documentado (fácil parse); `.maestri` JSON é auditável e importável sem zip; protocolo custom é o mecanismo padrão de deep-link em Electron.

### Alternatives considered
- Importador Spotlight nativo (SpotlightImporter/.mdimporter): alta complexidade nativa — adiado; protocolo + arquivos indexáveis cobrem o caso de uso v1.

---

## 10. Atualização de contexto de agente e testes

### Decision
- `AGENTS.md` passa a referenciar `specs/006-maestri-spatial-orchestration/plan.md` (entre marcadores SPECKIT) — feito na Fase 1.
- Testes: checklist manual por domínio em `checklists/`; nenhuma infraestrutura nova de testes automatizados nesta feature (mantém convenção do projeto). A busca de contrato IPC pode ser validada por um `docs/smoke.md` opcional.
