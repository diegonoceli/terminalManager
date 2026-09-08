# Research: Restauração da Interatividade de Fios e Conexões (009-fix-connections-wire)

## 1. Diagnóstico do Traçado do Fio Provisório (`_updatePreview`)

### Contexto do Problema
Durante a interação de arrastar a partir de uma porta lateral (`.conn-port`), o gerenciador de conexões instancia um elemento SVG provisório (`.conn-preview-line`) e invoca `_updatePreview()` a cada evento de `pointermove`:
```javascript
// public/js/connections.js (linha 431)
const d = this._calculateBezier(src, dst);
this.previewPath.setAttribute("d", d);
```
O método `_calculateBezier` não existe na classe `ConnectionsManager`, pois foi refatorado para os algoritmos especializados `_calculateRope(src, dst)` e `_calculateCircuit(src, dst)`, unificados sob o despachante `_calculatePath(src, dst, conn, bundleTie)`.

### Decisão
1. Atualizar `_updatePreview()` para utilizar `this._calculatePath(src, dst, { style: this.defaultStyle || "rope" })`.
2. Adicionar o método de compatibilidade `_calculateBezier(src, dst)` que atua como fallback seguro chamando `this._calculatePath(src, dst)`.

### Alternativas Consideradas
- **Apenas renomear para `_calculateRope`**: Não resolveria se algum nó ou extensão ainda invocasse `_calculateBezier`. Manter o método com delegação direta garante retrocompatibilidade e resiliência total.

---

## 2. Detecção de Alvo e Criação da Conexão (`_onPointerUp`)

### Contexto
Ao liberar o botão do mouse, `_onPointerUp(e)` itera sobre `this._getAllNodes()` e testa as coordenadas do ponteiro contra `rect = node.el.getBoundingClientRect()`.
Para conexões precisas:
- Deve ignorar o nó de origem (`node.id === this.activeDrag.fromId`).
- Deve evitar conexões duplicadas idempotentemente (se já existir conexão direta ativa entre os nós, apenas ativar pulso em vez de criar cabo redundante).
- Deve disparar `this.app.sendCreateConnection({ from: sourceId, to: targetId })`.

### Decisão
Manter a detecção por bounding rect com tolerância de margem e acionar imediatamente `triggerPulse(connId, 2000)` assim que o cabo for desenhado no DOM, proporcionando feedback tátil/visual imediato de sucesso.

---

## 3. Redesenho Reativo a 60fps

### Contexto
Quando nós são arrastados, redimensionados ou elevados, `redrawAll()` é invocado para reposicionar os cabos.
Para evitar cálculo repetido de bundles a cada micro-movimento:
- As âncoras das portas são calculadas a partir de `worldPos` e `worldSize` dos nós.
- A curva SVG calcula o ponto de saída à direita (`x + w, y + h/2`) ou esquerda (`x, y + h/2`) dependendo da orientação relativa dos nós, eliminando nós invertidos.

### Decisão
Manter cálculo vetorial puro em coordenadas espaciais do mundo (`worldPos`), sem depender de transformações de CSS da tela que possam distorcer com o zoom.
