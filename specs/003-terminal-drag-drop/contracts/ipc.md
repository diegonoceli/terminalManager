# IPC Contracts: External Link Opening

## Renderer -> Main

### `open_external`
Requests the Electron main process to open a URL safely in the system default web browser.

```json
{
  "type": "open_external",
  "url": "https://github.com"
}
```
