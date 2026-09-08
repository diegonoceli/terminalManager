# Quickstart: Delta Maestri — Workspaces, Agentes, Notas, Árvore de Arquivos e Conexões Avançadas

Guia rápido das novas capacidades (delta sobre a base de terminais/portais).

## 1. Workspaces na barra lateral

1. Clique em **+** na barra lateral para criar um workspace: informe **nome**, **ícone** e **diretório de trabalho**.
2. Clique direito no workspace → **Editar** para mudar nome/ícone/diretório ou editar **CLAUDE.md/AGENTS.md** (ative a sincronização automática se usar agentes mistos).
3. Organize com **Pastas** (agrupam workspaces) e **Grupos de seção** (divisores: Pessoal/Trabalho).
4. Recolha a barra lateral: a **mini barra lateral** mostra só os ícones para troca rápida.
5. Atalhos: `Ctrl+↑/↓` (anterior/próximo), `Ctrl` duas vezes (mostra números → digite o número), `Ctrl+scroll` para navegar.
6. **Abrir no Editor**: abre o diretório do workspace no seu editor (VS Code).

> Migração automática: floors/workflows existentes viram workspaces (1:1) na primeira abertura.

## 2. Multi-workspace em segundo plano

- Troque de workspace livremente: os terminais/agentes do anterior **continuam rodando em segundo plano** (limite: ativo + 3 mais recentes; configurável).
- O que estiver além do limite é **pausado** (processos encerrados) e **relança com resume** ao voltar — agentes retomam a conversa quando o CLI suporta.
- Feche e reabra o app: o layout é restaurado e os agentes relançados com retomada de conversa quando possível.

## 3. Terminais com agentes e responsabilidades

1. Escolha a ferramenta **Terminal** na barra e desenhe o nó no canvas.
2. Na lista de agentes, selecione **Claude Code**, **Codex** ou **OpenCode** (detectados do ambiente).
3. Dê **nome** e **ícone** ao terminal.
4. Em **Configurações → Agentes**, crie responsabilidades (nome, badge colorido, instruções) — ex.: Líder, Desenvolvedor, Revisor.
5. Atribua uma responsabilidade ao terminal: as instruções são **injetadas automaticamente** no início da sessão e persistem num `role.json` junto ao projeto.
6. Quando um agente para (aguardando decisão/concluído), um **ponto de atenção** aparece no cabeçalho (e pode notificar o sistema).
7. Segure `Ctrl` para ver **badges numerados** e pressione o número para focar o terminal. `Ctrl+Shift+A` pula ao próximo agente que precisa de atenção.

## 4. Notas no canvas

1. Ferramenta **Nota** → desenhe o nó → escreva Markdown.
2. Alterne **Raw/Formatada** para editar ou ver renderizado (imagens coladas aparecem inline).
3. O título vem da primeira linha; use **Renomear** para fixar.
4. Conecte notas entre si para formar **hierarquias** que agentes podem navegar.
5. Por padrão a nota vive na pasta interna do app; use o menu do nó para **mover para o projeto**.
6. `⌘W` remove a nota e o arquivo (pede confirmação se o arquivo estiver no projeto).

## 5. Árvore de Arquivos

1. Ferramenta **Árvore de Arquivos** → desenhe o nó → navegue o diretório do workspace.
2. Alterne os modos: **Lista**, **Grade** (miniaturas), **Diff** (alterações não commitadas) e **Graph** (grafo de commits).
3. Menu de contexto: criar/renomear/mover/excluir arquivos.
4. Indicador de **branch** com menu Git: commit, pull/push, checkout, nova branch, merge, fetch, stash.
5. Arraste um arquivo para um **terminal** (compartilha o caminho) ou para o **canvas** (cria pré-visualização).
6. Abra arquivos no **editor embutido** (realce, localizar/substituir, multicursor). Selecione texto no editor/diff e clique no **ícone de chat** para enviar ao agente conectado.
7. `Ctrl+P`: busca fuzzy por arquivo; prefixe com `>` para buscar por conteúdo.

## 6. Conexões avançadas

1. Conecte dois terminais de agentes: a **skill** de comunicação é instalada — um agente pode pedir algo ao outro via `maestri-agent send`.
2. Conecte um terminal a uma **nota** (`maestri-agent note read/write`) ou a um **portal** (`maestri-agent portal navigate/reload`).
3. Troque o **estilo** da conexão: **Corda** (padrão) ou **Circuito** (curvas de 90°).
4. Com `Alt` pressionado, arraste sobre as cordas para criar **abraçadeiras** (feixe); arraste de novo para soltar.
5. Clique no **badge de conexões** de um nó para inspecionar/gerenciar todas as conexões e ver o **histórico** de ações dos agentes.

## 7. Produtividade do canvas

- Desenhe o retângulo do tamanho desejado ao inserir nós; `Alt+Arrastar` duplica.
- Selecione 2+ nós → `Ctrl+G` agrupa (frame nomeado) e `Ctrl+Shift+G` desagrupa.
- Alinhe/distribua pela toolbar ou `Ctrl+Shift+T` para organizar em grade.
- Segure `Ctrl` durante o arrasto para **snap magnético** (encaixe em mosaico).
- `Ctrl+Shift+M` alterna o **minimapa**.
- Dois cliques no cabeçalho **elevam** o nó ao centro; arraste à borda para **acoplar** como coluna fixa.
- Nós **Texto** e **Desenho**: rótulos/snippets e esboços à mão livre leves.

## 8. Temas, portabilidade e Spotlight

1. No terminal, escolha temas **Dracula/Catppuccin/Nord** ou **importe um tema Ghostty** (`.json`).
2. **Exporte** um workspace como `.maestri` e **importe** em outra máquina (layout + notas + roles).
3. No macOS, workspaces/notas exportados para a pasta indexável do Maestri aparecem no **Spotlight** e abrem via `maestri://`.
