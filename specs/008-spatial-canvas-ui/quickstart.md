# Quickstart: Maestri Spatial 2D Canvas & Liquid Glass UI

**Feature**: `008-spatial-canvas-ui`  
**Date**: 2026-09-08

---

## 1. Executando o Ambiente

Inicie a aplicação em modo de desenvolvimento com o Electron:

```bash
npm start
```

---

## 2. Guia de Interação Espacial

### Navegando no Canvas Infinito
- **Pan (Mover Câmera)**: Clique e arraste o botão esquerdo sobre o fundo pontilhado do canvas, ou mantenha a `Barra de Espaço` pressionada enquanto move o cursor.
- **Zoom (Aproximar / Afastar)**: Gire a roda do mouse (`scroll wheel`) ou faça gesto de pinça no trackpad. O zoom se ajusta continuamente em direção à posição exata do seu cursor.
- **Reset de Câmera**: Clique no botão `1:1` ou `Center` na Barra de Ferramentas suspensa (Dock) para voltar ao centro.

### Manipulando Nós Flutuantes
- **Criar Nós**: Clique nos botões do **Dock de Vidro** na parte inferior:
  - `+ Terminal`: Instancia uma nova janela de terminal flutuante estilo macOS.
  - `Nota`: Cria um post-it Markdown translúcido.
  - `Arquivos`: Abre o nó de navegação na árvore de arquivos do projeto.
  - `Cabo`: Entra em modo de conexão de fios entre nós.
- **Mover Nós**: Arraste pela barra de título translúcida superior do nó. Observe o efeito de leve transparência e microelevação (`dragging feedback`).
- **Elevar e Focar**: Clicar em qualquer janela traz ela para o topo (`z-index` dinâmico).

### Usando o Compositor de Prompts Rico
- **Modo Ancorado (Docked)**: Ao selecionar um terminal, o compositor surge magneticamente acoplado logo abaixo da janela do terminal ativo.
- **Digitação Fluida**: Escreva comandos ou prompts de IA. Use `Shift+Enter` para pular linha. O compositor expande verticalmente até a altura ideal.
- **Enviar Prompt**: Pressione `Enter` para injetar o texto diretamente no processo do terminal.
- **Desanexar (Floating)**: Arraste o compositor para desacoplá-lo e posicioná-lo livremente em qualquer coordenada do canvas.

### Fios e Conexões Físicas
- Puxe a linha a partir da alça de conexão de um terminal até outro nó.
- Movimente os nós livremente: a curva Bézier SVG se recalcula em tempo real mantendo a tensão visual de um cabo elástico.
