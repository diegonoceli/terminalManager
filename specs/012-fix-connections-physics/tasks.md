# Implementation Tasks: Correção das Ligações e Física das Linhas

**Feature**: `012-fix-connections-physics`
**Date**: 2026-09-08

---

## Tasks

- [X] T001 [FR-001] Adicionar callback `onPan` no `Canvas` e registrar em `main.js` para chamar `redrawAll()` nas conexões durante pan/zoom.
- [X] T002 [FR-002] Normalizar `_getAnchorPoints` e `_overlappingWith` em `connections.js` para suportar `worldSize` tanto `{ w, h }` quanto `{ width, height }`.
- [X] T003 [FR-003] Atualizar `_calculateRope` em `connections.js` para renderizar curva em S em conexões verticais e gravidade/sag ajustado em conexões horizontais/diagonais.
- [X] T004 [FR-006] Atualizar `styles.css` para tornar estilo `rope` sólido (sem dasharray) e estilo `circuit` tracejado com animação de fluxo de dados.
- [X] T005 Validação e verificação via suíte de testes `test-maestri-full-parity.cjs`.
