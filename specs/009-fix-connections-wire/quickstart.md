# Quickstart: Interação de Conexões e Traçado entre Recursos (009-fix-connections-wire)

Guia rápido para testar e validar o traçado de fios e conexões espaciais no Maestri.

## 1. Como Iniciar a Aplicação
```bash
npm start
```

## 2. Como Ligar Dois Recursos no Canvas

1. Crie dois recursos quaisquer no canvas (ex: clique no botão **Terminal** e no botão **Web** na barra superior).
2. Posicione o cursor do mouse sobre a porta lateral direita (bolinha azul-cinza) do primeiro recurso.
3. Clique com o botão esquerdo e **mantenha pressionado**, arrastando o cursor em direção ao segundo recurso:
   - Observe o **fio flexível** (`conn-preview-line`) acompanhando a ponta do cursor em tempo real, sem travamentos e sem erros no console.
4. Solte o botão do mouse sobre o segundo recurso:
   - O cabo de conexão definitivo é desenhado unindo ambos os nós.
   - Um pulso luminoso suave percorre o cabo sinalizando a ativação da conexão.
5. Arraste qualquer um dos recursos:
   - O cabo se adapta e reposiciona suas âncoras fluidamente a 60fps.
6. Clique com o botão direito sobre o cabo para alternar entre os estilos **Corda** e **Circuito**, ou para remover a conexão.
