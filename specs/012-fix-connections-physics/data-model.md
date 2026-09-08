# Data Model: Correção das Ligações e Física das Linhas

**Feature**: `012-fix-connections-physics`
**Date**: 2026-09-08

> Não há alterações ao modelo de dados persistido. Todos os campos já existem. Este documento descreve as interfaces que serão normalizadas.

---

## Widget Position Interface (normalização)

Todos os widgets no canvas devem expor:

```
worldPos: { x: number, y: number }
worldSize: { w: number, h: number }
  -- ou --
worldSize: { width: number, height: number }
```

`_getAnchorPoints()` aceita ambos os formatos com fallback defensivo.

---

## Connection Object (sem alteração)

```
{
  id: string,          // "conn_xxxxxxxx"
  from: string,        // nodeId origem
  to: string,          // nodeId destino
  style: "rope"|"circuit",
  bundleId?: string,   // abraçadeira
  label?: string,
  log: array
}
```

---

## Canvas Callbacks (novo: onPan)

```
canvas.onZoom: (zoom: number) => void   -- já existe
canvas.onPan:  (tx: number, ty: number, zoom: number) => void  -- NOVO
```

---

## CSS Data Attributes (sem alteração)

```
.connection-group[data-style="rope"]    -- corda sólida
.connection-group[data-style="circuit"] -- trilho tracejado
```
