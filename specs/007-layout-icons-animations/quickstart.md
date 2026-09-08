# Quickstart: Validação Visual de Layout, Ícones e Animações

Guia rápido para testar manualmente as novas capacidades visuais e de movimento implementadas na feature 007.

---

## 1. Inicialização do Aplicativo
```bash
npm start
```

---

## 2. Roteiro de Testes Rápidos

### A. Iconografia Lucide e Barra Superior
1. Olhe para a barra de ferramentas superior (`#toolbar`).
2. Comprove que os botões exibem ícones vetoriais finos (traço 1.5px: Terminal, Web, Device, Editor, Nota, Arquivos, Texto, Desenho).
3. Passe o mouse sobre os botões e confirme a transição de contraste e fundo circular de destaque.

### B. Mini-Sidebar de Workspaces
1. Clique no botão de recolher a barra lateral.
2. A barra lateral encolhe suavemente para modo compacto (~48px) mostrando apenas os ícones.
3. Passe o mouse sobre a mini-sidebar: observe a expansão fluida ou revelação dos nomes.
4. Pressione e segure a tecla `Ctrl`: observe os números de atalho surgindo ao lado dos ícones.

### C. Transições de Canvas e Foco
1. Selecione qualquer terminal ou nó no canvas.
2. Pressione `Ctrl+\`: a câmera desliza suavemente até centralizar o nó (300ms fly-to).
3. Segure `Alt` e arraste o nó: observe o nó duplicado surgindo com animação de expansão suave.
4. Pressione `Ctrl+W` para fechar o nó: observe o encolhimento e desvanecimento suave em 200ms.

### D. Física das Conexões
1. Conecte dois nós com o estilo "Corda".
2. Arraste um dos nós: note o arco pendular oscilando suavemente como um cabo elástico real.
3. Alterne a conexão para o estilo "Circuito": observe os cantos em 90° com curvas suaves.

### E. Acessibilidade (Reduzir Movimento)
1. Abra as Configurações e ative a opção "Reduzir Movimento".
2. Repita o foco com `Ctrl+\` e duplicação: todas as transições devem ocorrer instantaneamente sem interpolação de movimento.
