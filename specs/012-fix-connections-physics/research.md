# Research: Correção das Ligações e Física das Linhas

**Feature**: `012-fix-connections-physics`
**Date**: 2026-09-08

---

## Finding 1: SVG dentro do #world herda o transform

**Decision**: A camada SVG já está corretamente dentro do `#world` e herda o `transform` CSS. Não é necessário mover o SVG.

**Rationale**: Como o SVG tem `position: absolute` dentro de `#world`, ele é afetado pelo `transform` do pai automaticamente. O problema é apenas que `redrawAll()` não é chamado após pan/zoom.

**Fix**: Adicionar chamada `redrawAll()` nos callbacks `onZoom` e `onPan` em `main.js`.

---

## Finding 2: Terminais usam left/top, Notas usam transform

**Decision**: Normalizar `_getAnchorPoints` para aceitar ambos os formatos de `worldSize` (`{ w, h }` e `{ width, height }`).

**Rationale**: Terminais têm `worldSize = { w, h }`. Outros widgets podem ter `{ width, height }`. A função `_getAnchorPoints` deve ser defensiva.

---

## Finding 3: Física de corda Bézier cúbica é abordagem correta

**Decision**: Manter Bézier cúbica (`C`) para rope, com tratamento especial do caso vertical.

**Rationale**: Catenary real requer integração numérica. Bézier cúbica com sag proporcional é visualmente indistinguível e computacionalmente trivial. Para conexões verticais, uma curva em S (dois pontos de controle laterais simétricos) funciona melhor que o sag gravitacional puro.

**Alternatives considered**: Matter.js ou physics engine real — rejeitado por ser overengineering para conexões estáticas.

---

## Finding 4: CSS dasharray está invertido

**Decision**: Rope = `stroke-dasharray: none` (sólida). Circuit = `stroke-dasharray: 8 4` (tracejado).

**Rationale**: Uma corda física é sólida. Um trilho de circuito impresso costuma ter aparência de linha tracejada/pontilhada em ferramentas de diagramação (ex: Draw.io, Mermaid flowchart). A animação de fluxo (`connection-flow`) é mais adequada para o circuit (indica dados fluindo em trilha digital).

---

## Finding 5: BasePortalWidget — _setupDragAndResize

**Decision**: Adicionar `redrawAll()` no drag handler do `BasePortalWidget` (não apenas em `NoteWidget`).

**Rationale**: Portais e fichários também podem ser conectados. A correção unificada evita regressão futura.

