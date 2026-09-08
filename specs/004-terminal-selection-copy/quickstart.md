# Quickstart: Validação da Seleção de Texto e Cópia Externa

## Inicialização

Para iniciar a aplicação:
```bash
npm start
```

## Passos para Verificação Manual

### 1. Teste de Seleção de Texto em Zoom Normal (100%)
1. Abra um terminal e execute um comando com múltiplas linhas (ex: `ls -la` ou `git log`).
2. Com o zoom do canvas em 100%, clique e arraste o mouse sobre uma linha específica do terminal.
3. **Resultado Esperado**: O texto selecionado deve acompanhar com exatidão a ponta do cursor do mouse, sem saltar ou deslocar para linhas acima ou abaixo.

### 2. Teste de Seleção com Zoom Alterado (Zoom In / Zoom Out)
1. Use a roda do mouse (fora do terminal) ou os botões `+` e `−` na barra superior para mudar o zoom do canvas (ex: 50%, 75%, 150%, 200%).
2. Clique e arraste o mouse para selecionar linhas de texto em um terminal.
3. Teste também duplo clique (selecionar palavra) e triplo clique (selecionar linha inteira).
4. **Resultado Esperado**: A seleção permanece milimetricamente alinhada ao cursor do mouse em qualquer nível de zoom.

### 3. Teste de Cópia Externa via Teclado
1. Selecione um trecho de texto no terminal.
2. Pressione `Cmd+C` (no macOS) ou `Ctrl+C` (no Windows/Linux).
3. Abra qualquer aplicativo externo (ex: TextEdit, VS Code, Bloco de Notas ou o navegador).
4. Pressione colar (`Cmd+V` ou `Ctrl+V`).
5. **Resultado Esperado**: O texto exato selecionado no terminal deve ser colado no aplicativo externo.

### 4. Teste de SIGINT (`Ctrl+C` sem seleção)
1. Em um terminal sem texto selecionado, execute um processo contínuo (ex: `top` ou `ping 127.0.0.1`).
2. Pressione `Ctrl+C`.
3. **Resultado Esperado**: O processo deve ser interrompido imediatamente (`SIGINT`), confirmando que o atalho não foi quebrado.

### 5. Teste de Cópia com Botão Direito
1. Selecione um trecho de texto no terminal.
2. Clique com o botão direito do mouse sobre o terminal.
3. Cole o conteúdo em um aplicativo externo.
4. **Resultado Esperado**: O texto selecionado foi copiado e pode ser colado fora da aplicação sem colar inadvertidamente dentro do próprio terminal.
