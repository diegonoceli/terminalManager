# Quickstart Guide: Mini Barra Lateral, Editor, Fichários e Spotlight

**Feature**: `010-workspaces-nav-spotlight`
**Date**: 2026-09-08

---

## 1. Visão Geral
Este guia detalha o roteiro de testes e validação prática das novas capacidades introduzidas no Maestri:
1. Navegação com **Mini Barra Lateral** e long-press.
2. Botão de abertura rápida no **Editor de Código**.
3. **Notas Markdown** com imagens inline, renomeação flexível e arraste do Finder.
4. **Fichários (Binders)** com abas laterais direitas e permanência de quadros de tarefas.
5. **Organização por Pastas e Grupos**.
6. **Integração nativa com o Spotlight do macOS**.

---

## 2. Roteiro Passo a Passo de Validação

### Teste 1: Mini Barra Lateral e Gestos
1. No cabeçalho da barra lateral, clique no botão de recolher (ou arraste a divisória até ~48px).
2. Verifique que a barra encolhe exibindo apenas os ícones redondos dos workspaces.
3. Passe o mouse sobre um ícone: observe o tooltip flutuante com nome do workspace e pasta de trabalho.
4. **Long-press**: Pressione e segure o botão do mouse sobre o ícone por ~400ms.
   - Observe a abertura do popover flutuante listando os terminais ativos daquele workspace.
   - Clique em um dos terminais da lista: o Maestri alterna para o workspace e foca aquele terminal.
5. Clique com o botão direito sobre o ícone na mini barra: observe o menu de contexto completo.

### Teste 2: Abertura Rápida no Editor
1. Olhe para a barra de ferramentas superior no canto direito.
2. Clique no botão **"Abrir no Editor"**.
3. Se o workspace possuir pasta de trabalho, verifique a inicialização do VS Code ou editor padrão apontando para a pasta.
4. Se o workspace não tiver pasta, confirme a abertura do seletor nativo de diretório.

### Teste 3: Notas Markdown Avançadas e Finder
1. Crie uma nova nota clicando em **Nota** na toolbar.
2. Copie qualquer imagem da web ou do seu computador (<kbd>Cmd+C</kbd>).
3. Dentro da nota, pressione <kbd>Cmd+V</kbd>:
   - Verifique que a sintaxe `![Imagem](...)` é inserida e na visualização formatada a imagem renderiza perfeitamente.
4. Duplo-clique no cabeçalho da nota: digite um nome fixo ("Guia de Setup").
5. Apague o texto do nome e confirme: o título volta a ser extraído da 1ª linha.
6. Arraste um arquivo `.md` do macOS Finder direto para o canvas: observe a criação de um post-it mantendo o arquivo no local original.
7. Selecione a nota e pressione <kbd>⌘W</kbd>: confirme que ela fecha e sai do canvas.

### Teste 4: Fichários (Binders) de Notas
1. Crie duas ou três notas no canvas.
2. Selecione-as, clique com botão direito e escolha **"Colocar no Fichário"**.
3. Observe as notas agrupadas em uma pasta com abas verticais na borda direita.
4. Clique nas abas para folhear as notas.
5. Solte outra nota solta sobre o Fichário: ela é incorporada no topo.
6. Puxe uma aba para fora do Fichário em direção ao canvas: a nota é desanexada e volta a ser livre.
7. Renomeie o Fichário para "Backlog" e remova todas as notas: ele continua no canvas como pasta vazia aguardando tarefas.

### Teste 5: Spotlight do macOS
1. Crie uma nota com o título "Plano Secreto 2026".
2. Feche ou minimize o Maestri.
3. Abra o Spotlight do macOS (<kbd>Cmd + Espaço</kbd>) e busque por "Plano Secreto".
4. Selecione o resultado: o Maestri surge em primeiro plano, alterna para o workspace correspondente e centraliza a câmera na nota.
