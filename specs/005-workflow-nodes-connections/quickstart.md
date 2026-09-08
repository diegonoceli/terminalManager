# Quickstart: Workflows Multi-Nós, Device Portals e Conexões

## Como Usar os Novos Recursos

### 1. Seleção Precisa e Cópia no Terminal
1. Abra ou foque qualquer nó de terminal no board.
2. Experimente navegar com zoom (`Cmd/Ctrl +` ou roda do mouse) em níveis variados (50%, 120%, 200%).
3. Clique e arraste o mouse sobre linhas de texto ou códigos exibidos: a seleção segue com 100% de exatidão o cursor do mouse sem pular linhas acima ou abaixo.
4. Pressione `Cmd+C` (macOS) ou `Ctrl+C` (Windows/Linux) ou use clique com o botão direito: o texto selecionado é copiado diretamente para a área de transferência do sistema e pode ser colado em editores ou navegadores externos.

### 2. Adicionando Telas e Portais no Board
1. Na barra superior (toolbar), utilize os botões de adicionar:
   - **+ Terminal**: adiciona um shell interativo no canvas.
   - **+ Web Portal**: adiciona um cartão de navegador com barra de endereços (carrega `localhost:3000`, docs ou qualquer URL).
   - **+ Device Portal (Android/iPhone)**: adiciona uma moldura de smartphone interativa no board.
   - **+ Editor / VS Code**: adiciona um cartão de projeto com atalho para abrir a pasta no VS Code nativo.
2. Arraste os cartões livremente pela barra superior e redimensione pelas alças no canto inferior direito.

### 3. Criando Conexões Universais ("Bolinhas")
1. Localize as alças circulares ("bolinhas") na lateral direita ou esquerda de qualquer nó (terminal, portal web, device portal ou editor).
2. Clique e arraste a partir de uma bolinha: uma linha curva pontilhada acompanha o cursor.
3. Solte sobre qualquer outro nó para conectar: uma linha de conexão dinâmica é fixada.
4. Arraste qualquer um dos nós conectados e veja os fios recalculando sua posição suavemente.
5. Para remover uma conexão, dê um duplo clique sobre a linha conectada.

### 4. Alternando e Salvando Workflows ("Floors")
1. No seletor de "Floors" (topo esquerdo da toolbar), visualize o workflow atual.
2. Clique no seletor para criar um novo workflow (ex: "Mobile Testing" ou "Frontend Dev").
3. Monte o layout desejado (ex: 3 terminais + 1 Web Portal, ou 2 terminais + 1 Emulador Pixel 9).
4. Alterne entre os workflows cadastrados instantaneamente: todos os nós, posições e conexões são preservados.
