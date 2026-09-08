# Quickstart: Verificação das Ligações e Física das Linhas

**Feature**: `012-fix-connections-physics`
**Date**: 2026-09-08

---

## 1. Abrir a aplicação

```bash
npm start
```

---

## 2. Verificação manual rápida (5 cenários)

### Cenário 1 — Rope horizontal
1. Criar 2 terminais lado a lado (≥300px de distância horizontal)
2. Conectar arrastando da porta direita de um para o outro
3. ✅ Verificar: linha curva, pendendo para baixo

### Cenário 2 — Rope vertical
1. Criar 2 terminais alinhados verticalmente (mesmo X, ≥200px de distância Y)
2. Conectar
3. ✅ Verificar: linha em S suave (nunca linha reta)

### Cenário 3 — Pan/Zoom não quebra conexões
1. Com conexão criada, fazer pan (arrastar canvas vazio)
2. ✅ Verificar: linha permanece tocando as bordas dos terminais
3. Fazer zoom out (Ctrl + scroll)
4. ✅ Verificar: linha escala junto com os nós

### Cenário 4 — Circuit
1. Conexão criada → botão direito → "Estilo: Circuito"
2. ✅ Verificar: linha tracejada, trilhos ortogonais em 90°
3. Rope ao lado
4. ✅ Verificar: rope é sólida (linha contínua), circuit é tracejada

### Cenário 5 — Nota conectada
1. Criar nota + terminal → conectar
2. Mover a nota arrastando
3. ✅ Verificar: linha segue a nota em tempo real, sem rastro
