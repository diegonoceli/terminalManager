# IPC Contracts: Notifications & Connections

## Renderer -> Main

### 1. `create_connection`
```json
{
  "type": "create_connection",
  "from": "terminal_id_1",
  "to": "terminal_id_2",
  "label": "Collaborating"
}
```

### 2. `remove_connection`
```json
{
  "type": "remove_connection",
  "id": "conn_id"
}
```

### 3. `notify`
```json
{
  "type": "notify",
  "terminalId": "terminal_id_1",
  "title": "Build Finished",
  "body": "Your test suite passed."
}
```

---

## Main -> Renderer

### 1. `layout` (Updated)
```json
{
  "type": "layout",
  "terminals": [ ... ],
  "connections": [
    {
      "id": "conn_1",
      "from": "terminal_id_1",
      "to": "terminal_id_2",
      "label": "Collaborating"
    }
  ]
}
```

### 2. `connection_created`
```json
{
  "type": "connection_created",
  "connection": {
    "id": "conn_1",
    "from": "terminal_id_1",
    "to": "terminal_id_2"
  }
}
```

### 3. `connection_removed`
```json
{
  "type": "connection_removed",
  "id": "conn_1"
}
```

### 4. `focus_terminal`
Dispatched when user clicks a native desktop notification.
```json
{
  "type": "focus_terminal",
  "id": "terminal_id_1"
}
```
