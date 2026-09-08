# Feature Specification: Correção das Ligações e Física das Linhas

**Feature ID**: `012-fix-connections-physics`
**Date**: 2026-09-08
**Status**: Draft

---

## Summary

As linhas de conexão entre nós no canvas não estão visualmente corretas e/ou não aparecem na posição esperada. O sistema de física de "corda" (rope) que deveria fazer a linha pender levemente por gravidade entre dois pontos não funciona corretamente. As conexões podem estar desalinhadas com os nós ao mover o canvas (pan/zoom), e a renderização visual das linhas (rope vs. circuit) apresenta inconsistências.

---

## Problem Statement

Ao usar a aplicação:

1. **Ligações não seguem os nós** — quando o canvas sofre pan ou zoom, as linhas de conexão podem desaparecer ou ficar em posições erradas em relação aos nós conectados.
2. **Física da corda não funciona** — a curva de "corda pendurada" (sag / catenary) não é exibida corretamente: linhas ficam retas, com arco no sentido errado, ou sem arco nenhum.
3. **Pontos de ancoragem imprecisos** — a linha parte da borda errada do nó (esquerda quando deveria partir da direita, ou do canto em vez do centro lateral).
4. **Estilo inconsistente** — linhas do tipo "rope" aparecem tracejadas como se fossem do tipo "circuit", ou vice-versa.
5. **Ligações de tipo circuit não chegam em ângulos retos** — trilhos ortogonais ficam tortos ou com arredondamentos excessivos.

---

## User Stories

### US1 — Ver as conexões sempre alinhadas com os nós
**Como** usuário do canvas, **quero** que as linhas de conexão sempre partam e cheguem visualmente nos pontos de ancoragem corretos dos nós, **para** entender claramente quais nós estão conectados independentemente do zoom ou pan.

### US2 — Física natural da corda
**Como** usuário, **quero** que a linha de tipo "corda" pendure levemente para baixo entre dois nós (como um cabo real), **para** que o canvas tenha aparência orgânica e agradável.

### US3 — Troca de estilos funcional
**Como** usuário, **quero** alternar entre o estilo "corda" e "circuito" pelo menu de contexto da linha, **para** escolher o estilo que melhor representa a relação entre os nós.

### US4 — Atualizações em tempo real
**Como** usuário, **quero** que as linhas redesenhem imediatamente quando movo ou redimensiono um nó, **para** que o grafo reflita sempre o estado atual do layout.

---

## Functional Requirements

### FR-001 — Camada SVG acompanha transformação do canvas
A camada SVG de conexões (`.connections-layer`) deve transformar junto com o `#world` ao aplicar pan e zoom, garantindo alinhamento permanente com as coordenadas mundo dos nós.

**Critério de aceite**: Ao fazer pan 200px e zoom a 50%, cada linha continua tocando as bordas corretas dos nós conectados sem deslocamento.

### FR-002 — Ponto de ancoragem correto para todos os tipos de nó
O ponto de origem e destino deve ser o centro da borda lateral (esquerda ou direita) mais próxima ao outro nó, para terminais, notas, portais, fichários e grupos.

**Critério de aceite**: A linha parte sempre do ponto central da borda lateral correta, nunca de um canto ou ponto arbitrário.

### FR-003 — Física de corda com sag proporcional à distância
- Corda pende sempre para baixo (gravidade)
- Sag mínimo: 20px, máximo: 180px
- Proporcional à distância entre nós
- Funciona para conexões horizontais, verticais e diagonais

**Critério de aceite**: Conexão horizontal longa (>400px) exibe curva claramente visível. Conexão curta (<80px) exibe curva sutil. Conexão vertical exibe curva em S suave.

### FR-004 — Estilo circuit produz trilhos ortogonais em 90°
- Apenas segmentos horizontais e verticais
- Arredondamento máximo de canto: 14px
- Funciona para nós em qualquer posição relativa

**Critério de aceite**: Nenhuma linha diagonal aparece em conexões do tipo circuit.

### FR-005 — Redesenho imediato ao mover ou redimensionar nós
Todas as linhas de um nó redesenham-se antes do próximo frame ao mover ou redimensionar.

**Critério de aceite**: Arrastando um nó conectado em velocidade normal, nenhum "rastro" ou descompasso visual é observado.

### FR-006 — Diferenciação visual clara entre rope e circuit
- **Rope**: linha contínua (sem traço), gradiente de cor, curva de gravidade
- **Circuit**: linha com traço (dasharray), cor uniforme, sem curva

**Critério de aceite**: Um usuário sem instruções distingue rope de circuit apenas pela aparência visual.

### FR-007 — Pulso de atividade viaja pelo caminho correto
O pulso animado percorre o caminho da linha (curva rope ou trilhos circuit), não uma linha reta.

**Critério de aceite**: O pulso segue a curvatura da corda ou os trilhos ortogonais sem jamais atravessar a tela em diagonal.

---

## User Scenarios & Testing

### Cenário 1: Conexão rope básica
1. Dois terminais lado a lado → conectar
2. **Verificar**: curva pendendo para baixo com arco visível
3. Pan + zoom out a 50%
4. **Verificar**: linha continua alinhada com as bordas dos terminais

### Cenário 2: Conexão circuit
1. Terminal e nota em posições diferentes → conectar → mudar para circuit
2. **Verificar**: trilhos ortogonais com cantos arredondados
3. Mover a nota
4. **Verificar**: trilhos se ajustam imediatamente

### Cenário 3: Arrastar em tempo real
1. Dois terminais conectados (rope) → arrastar um lentamente
2. **Verificar**: linha segue sem delay ou rastro
3. Soltar
4. **Verificar**: linha estabiliza na posição correta

### Cenário 4: Conexão vertical
1. Terminal diretamente acima de outro → conectar (rope)
2. **Verificar**: exibe curva suave em S ou arco lateral, nunca linha reta

### Cenário 5: Diferenciação visual + pulso
1. Criar par rope e par circuit
2. **Verificar sem rótulos**: distinguível só pela aparência
3. Ativar pulso na rope
4. **Verificar**: ponto animado percorre a curva, não vai em diagonal

---

## Success Criteria

1. **100% das conexões visíveis** — nenhuma linha válida fica invisível ou desalinhada após pan/zoom
2. **Física correta** — em 20+ conexões em posições variadas, todas exibem curvatura no sentido correto
3. **Zero lag visual** — ao arrastar nó conectado, nenhum frame exibe linha desalinhada (60 FPS)
4. **Diferenciação imediata** — usuários sem instruções identificam rope vs. circuit visualmente
5. **Pulso correto** — 100% dos pulsos percorrem o caminho exato da linha, sem desvios

---

## Out of Scope

- Novos estilos de linha além de rope e circuit
- Animação de criação de conexão
- Conexão broadcast (mais de dois nós)
- Cor individualizada por conexão

---

## Key Entities

| Entidade | Descrição |
|----------|-----------|
| `ConnectionsManager` | Classe JS que gerencia renderização SVG das conexões |
| `.connections-layer` | Elemento SVG que contém todos os caminhos de conexão |
| `worldPos` / `worldSize` | Propriedades de posição e tamanho dos nós no espaço-mundo |
| `_calculateRope()` | Função de física de corda — gera path Bézier cúbica |
| `_calculateCircuit()` | Função de trilhos ortogonais — gera path SVG com segmentos L e Q |
| `_getAnchorPoints()` | Determina os pontos de origem e destino da linha |
| `redrawAll()` | Redesenha todas as conexões via `requestAnimationFrame` |

---

## Assumptions

- A camada SVG reside dentro do `#world` e deve receber a mesma `transform` CSS (translate + scale) que o `#world` recebe do sistema de canvas
- Os nós expõem `worldPos: { x, y }` e `worldSize: { w, h }` quando registrados no `ConnectionsManager`
- A física de corda é uma aproximação visual usando Bézier cúbica, não simulação em tempo real
- O redesenho é acionado por eventos de movimento e por `redrawAll()` chamado pelo canvas

---

## Dependencies

- `public/js/connections.js` — lógica de renderização das conexões
- `public/js/canvas.js` — gerencia transformação pan/zoom do `#world`
- `public/js/terminal.js` — fonte de `worldPos`/`worldSize` para terminais
- `public/js/notes.js` — fonte de `worldPos`/`worldSize` para notas
- `public/styles.css` — estilo visual das linhas (stroke, dasharray, gradiente)
- `public/index.html` — estrutura DOM do `#world` e `#connections-layer`
