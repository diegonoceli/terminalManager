# Data Model: Drag & Drop and Link Events

## Dropped File Path Formatting
```typescript
interface DroppedPathEvent {
  rawPaths: string[];      // e.g. ["C:\\Users\\Diego\\My Folder\\app", "D:\\test.txt"]
  formattedText: string;   // e.g. '"C:\\Users\\Diego\\My Folder\\app" D:\\test.txt'
  terminalId: string;
}
```

## Link Activation Event
```typescript
interface OpenExternalEvent {
  type: "open_external";
  url: string;             // e.g. "http://localhost:3000" or "https://github.com"
}
```
