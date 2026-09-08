# UI Contract: Conexões Espaciais e Traçado de Cabos (009-fix-connections-wire)

## 1. Métodos Públicos da Classe `ConnectionsManager`

A classe `ConnectionsManager` gerencia a camada SVG `#connections-layer` no canvas do Maestri.

### `startDrag(sourceNodeId: string, clientX: number, clientY: number): void`
Inicia o arraste interativo de um cabo a partir do nó `sourceNodeId` com as coordenadas de tela iniciais.
- Cria o elemento SVG `<path class="conn-preview-line">` se não existir.
- Define `this.activeDrag = { fromId: sourceNodeId, currentWorld: worldPoint }`.
- Dispara `this._updatePreview()`.

### `_updatePreview(): void`
Calcula o trajeto geométrico SVG entre o nó de origem e a posição atual do cursor no espaço do mundo.
- Invoca `this._calculatePath(src, dst, { style: this.defaultStyle || "rope" })`.
- Aplica o resultado no atributo `d` de `this.previewPath`.
- Não deve emitir exceções.

### `_calculateBezier(src: Point, dst: Point): string`
Método de compatibilidade retroativo. Retorna o trajeto de curva Bezier/Corda chamando `this._calculatePath(src, dst)`.

### `_calculatePath(src: Point, dst: Point, conn?: Partial<Connection>, bundleTie?: Point): string`
Calcula a geometria do cabo dependendo de `conn.style`:
- `"circuit"`: roteamento ortogonal de 90° com cantos chanfrados (`_calculateCircuit`).
- `"rope"` (padrão): curva cúbica com sag de gravidade elástica (`_calculateRope`).
- Se `bundleTie` for fornecido: converge ao ponto médio do feixe (`_calculateBundle`).

### `redrawAll(): void`
Percorre todas as conexões ativas (`this.connections`) e atualiza os elementos SVG correspondentes às posições atuais de `worldPos` e `worldSize` dos nós conectados.

---

## 2. Eventos IPC e Mensagens de Conexão

| Tipo de Mensagem | Direção | Payload | Descrição |
| :--- | :--- | :--- | :--- |
| `create_connection` | Renderer → Backend | `{ type: "create_connection", from: string, to: string, style?: string }` | Solicita criação persistente de conexão |
| `connection_created` | Backend → Renderer | `{ type: "connection_created", connection: Connection }` | Confirmação de conexão criada |
| `remove_connection` | Renderer → Backend | `{ type: "remove_connection", id: string }` | Solicita exclusão de conexão |
| `connection_removed` | Backend → Renderer | `{ type: "connection_removed", id: string }` | Confirmação de exclusão |
