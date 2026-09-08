# Quickstart & Verification Guide: Plataforma Maestri

**Feature**: `011-maestri-complete-docs`
**Date**: 2026-09-08
**Status**: Ready

Este guia descreve o procedimento de inicialização, teste manual e validação das 10 histórias de usuário e 11 domínios funcionais da plataforma Maestri.

---

## 1. Inicialização do Ambiente

1. **Iniciar a aplicação em modo de desenvolvimento**:
   ```bash
   npm start
   ```
2. **Validar integridade de sintaxe de todos os módulos**:
   ```bash
   node -c electron/main.js
   node -c electron/terminal-manager.js
   ```

---

## 2. Roteiro de Testes por História de Usuário

### US1 — Workspaces, Mini Barra Lateral e Spotlight
1. Clique no botão `+` na barra lateral esquerda; selecione um diretório de projeto e escolha um ícone.
2. Com a barra lateral aberta, clique no botão de recolher para ativar a **Mini Barra Lateral**:
   - Passe o cursor sobre o ícone do workspace e valide a exibição do tooltip com o nome.
   - Pressione e segure o clique por ~400ms (long-press): confirme a abertura do popover flutuante listando os terminais ativos daquele workspace.
   - Clique com o botão direito: valide a presença das opções "Editar", "Exportar", "Configurações" e "Excluir".
3. No canto superior direito, clique em "Abrir no Editor": confirme que a pasta do projeto é aberta no VS Code ou editor padrão.
4. No macOS, abra a busca nativa do Spotlight (`⌘ + Espaço`), digite o nome de uma nota ou terminal existente e confirme a abertura direta focando o elemento no Maestri.

---

### US2 — Canvas Espacial 2D, Snapping Magnético, Elevação e Grupos
1. **Navegação**: Use dois dedos no trackpad para transladar (pan) e faça pinça para zoom. No mouse, segure a roda do mouse e arraste para pan.
2. **Encaixe Magnético (Magnetic Tile Snapping)**:
   - Segure a tecla `Ctrl` e arraste um nó para perto de outro nó.
   - Observe as bordas se alinhando magneticamente e o preenchimento automático de vazios sem grade fixa rígida.
3. **Elevação e Acoplamento**:
   - Dê duplo clique no cabeçalho de um terminal ou nota: observe o nó ser elevado ao centro da viewport sobrepondo os outros nós.
   - Arraste o nó elevado para a borda direita ou esquerda da tela: observe-o se transformar em uma coluna vertical de altura inteira (Docked).
   - Dê duplo clique novamente no cabeçalho para devolvê-lo à posição original no canvas.
4. **Grupos (`Ctrl+G`)**:
   - Selecione dois ou mais nós com a ferramenta de seleção e pressione `Ctrl+G`.
   - Dê duplo clique no cabeçalho do grupo para renomeá-lo.
   - Arraste pelo cabeçalho: confirme que todos os membros se movem em conjunto.
   - Pressione `Ctrl+Shift+G` para desagrupar.
5. **Organizar em Grade**: Selecione nós dispersos e pressione `Ctrl+Shift+T`: confirme que são alinhados em uma grade perfeita.

---

### US3 — Terminais, Roles (`role.json`), Temas e Ponto de Atenção
1. Desenhe um nó de Terminal na barra de ferramentas.
2. Na tela de configuração, selecione uma responsabilidade (ex: "Revisor") ou clique em "Descobrir Responsabilidades" para importar arquivos `role.json` encontrados no repositório.
3. Acesse **Configurações → Terminal → Aparência** e selecione um tema iTerm2 (ex: Dracula, Tokyo Night, Catppuccin) ou verifique a leitura de arquivos Ghostty em `~/.maestri/terminal/themes/`.
4. Dispare uma tarefa longa no terminal: quando o processo finalizar, verifique o acendimento do **ponto vermelho de atenção** no cabeçalho e a notificação do sistema operacional.
5. Pressione `Ctrl+Shift+A` para pular diretamente para o terminal com atenção acesa.
6. Segure a tecla `Ctrl`: observe os badges numerados `1..9` aparecerem nos cabeçalhos dos terminais; tecle o número respectivo para focar instantaneamente.

---

### US4 — Notas Markdown Vivas, Imagens Inline e Encadeamento
1. Desenhe uma Nota no canvas.
2. Digite texto na primeira linha: confirme que o título da nota adota esse texto.
3. Alterne entre os modos **Raw** e **Formatada** na barra de ferramentas contextual da nota.
4. Copie um screenshot para o clipboard e pressione `⌘V` dentro da nota: verifique a renderização visual imediata da imagem no modo formatado.
5. Arraste um arquivo `.md` do Finder diretamente para o canvas: confirme a criação de uma nota apontando para o arquivo físico original.
6. Use a ferramenta de Conexão para ligar a Nota A à Nota B; conecte um agente à Nota A e verifique que ele lê o conteúdo de ambas as notas em cadeia.

---

### US5 — Conexões (Corda/Circuito), Abraçadeiras e Comunicação Inter-Agentes
1. Selecione um terminal e pressione `Ctrl+L` para puxar um cabo até outro terminal.
2. Abra o popover de conexões no nó e alterne o estilo entre **Corda** (física de suspensão) e **Circuito** (trilhos ortogonais com cantos de 90°).
3. Com múltiplos cabos cruzando uma região, segure `Alt` e desenhe um traço cortando as cordas: observe a criação de uma **abraçadeira** reunindo os cabos.
4. No Terminal 1, digite `maestri send <Nome_Terminal_2> "Qual é a versão do Node?"`:
   - Mantenha o Terminal 2 desselecionado (sem borda tracejada).
   - Verifique que o Maestri aguarda o Terminal 2 processar a resposta e a entrega de volta ao Terminal 1 automaticamente.

---

### US6 — Árvore de Arquivos e Editor de Código Embutido
1. Desenhe um nó de Árvore de Arquivos no canvas.
2. Alterne entre as 4 visualizações na barra do nó: **Lista**, **Grade de Ícones** (com miniaturas Quick Look), **Diff** e **Grafo Git**.
3. Clique no ícone do editor para abrir o painel CodeMirror embutido; edite um arquivo com realce de sintaxe e múltiplos cursores.
4. Selecione um trecho de código no editor ou no Diff e clique no ícone de chat: verifique a citação sendo enviada diretamente ao agente de IA conectado.
5. Pressione `Ctrl+P` com o nó selecionado para busca fuzzy de arquivos; digite `>` no campo de busca para buscar texto dentro dos arquivos com numeração de linhas.

---

### US7 — Portais Web e Dispositivos Móveis
1. Clique na ferramenta de Portal e insira uma URL (ex: `https://news.ycombinator.com` ou servidor local): verifique a navegação no WebKit isolado.
2. Conecte dois portais web: valide o compartilhamento de sessão e cookies.
3. Abra um Portal de Dispositivo escolhendo um Simulador iOS ou Emulador Android:
   - Interaja com cliques (toques), arraste (deslizar) e botões virtuais de hardware (Home, Lock, Back).
4. Conecte um agente ao portal de dispositivo e execute `maestri device <id> tree`: valide que a árvore de acessibilidade nativa com rótulos verdadeiros é retornada.

---

### US8 — Andares (Floors) com Clonagem APFS e Aterrissagem
1. Clique no botão de andares no canto inferior direito para ativar a visualização em perspectiva 3D.
2. Clique em "Novo Andar", selecione uma branch Git e ative a opção "Clonar layout do Térreo": confirme a clonagem instantânea copy-on-write APFS em `.maestri/floors/`.
3. Configure um hook de Setup (`npm install`) e clique no botão play para executar.
4. Faça alterações e commits no novo andar.
5. Clique em "Aterrissar" (ícone de avião): analise a tela de transferência de commits, a prévia de diff e conclua o merge para o Térreo.

---

### US9 — Compositor de Prompts Rico Flutuante
1. Foque em um terminal e tecle `Ctrl+Shift+P` para abrir o Compositor de Prompts.
2. Digite `@` para exibir o menu de autocompletar e selecione um terminal conectado, uma nota viva e um arquivo de projeto.
3. Cole um screenshot: verifique a exibição como thumbnail inline e a entrega em pixels nativos para agentes compatíveis.
4. Redija um rascunho com pills, troque de workspace e volte: confirme que o texto e as pills estão preservados.
5. Esvazie o compositor: verifique que teclar Setas ou Enter passa o sinal diretamente para o terminal subjacente.

---

### US10 — Batuta Search (Paleta de Comandos Global)
1. Pressione `Ctrl+P` no canvas para abrir a Batuta Search.
2. Digite um termo sem acento (ex: "cafe") e confirme a localização de termos acentuados ("Café"), com letras correspondentes em negrito.
3. Selecione um resultado com as setas e pressione `Enter`: observe o canvas deslizar suavemente até o nó correspondente, concedendo foco.
4. Apague a busca e selecione a ação "Pedir...": redija uma mensagem multilinha, envie para um terminal e acompanhe a resposta em tempo real no popover.

