# Data Model: Notifications & Connections

## Connection Entity

```json
{
  "id": "conn_123456",
  "from": "terminal_uuid_a",
  "to": "terminal_uuid_b",
  "label": "Agent Stream",
  "style": {
    "color": "#3b82f6",
    "animated": true
  }
}
```

## Notification Event Payload

```json
{
  "terminalId": "terminal_uuid_a",
  "title": "Terminal 1: Task Completed",
  "body": "Process exited with code 0. Click to review.",
  "type": "completed" | "approval_needed" | "error"
}
```

## Updated State File Schema (`state.json`)

```json
{
  "terminals": [
    {
      "id": "uuid",
      "title": "Agent Main",
      "x": 100,
      "y": 100,
      "width": 720,
      "height": 420,
      "cols": 80,
      "rows": 24,
      "style": {}
    }
  ],
  "connections": [
    {
      "id": "conn_1",
      "from": "uuid_a",
      "to": "uuid_b",
      "label": "Collaborator"
    }
  ]
}
```
