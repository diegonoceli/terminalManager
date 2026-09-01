# Data Model

## Terminal State (Backend)
```json
{
  "id": "uuid",
  "title": "string",
  "x": "number",
  "y": "number",
  "width": "number",
  "height": "number",
  "cols": "number",
  "rows": "number",
  "style": {
    "bg": "string",
    "fg": "string"
  }
}
```

This state is persisted in `state.json` inside the Electron user data directory.

## Frontend Layout Message
```json
{
  "type": "layout",
  "terminals": [
    {
      "id": "uuid",
      "title": "string",
      "x": "number",
      "y": "number"
    }
  ]
}
```
