const { contextBridge, ipcRenderer, clipboard } = require("electron");

contextBridge.exposeInMainWorld("appBridge", {
  send: (msg) => ipcRenderer.send("msg", JSON.stringify(msg)),
  onMessage: (cb) => {
    ipcRenderer.on("msg", (_event, payload) => cb(JSON.parse(payload)));
  },
  clipboardWrite: (text) => {
    if (typeof text === "string") {
      clipboard.writeText(text);
    }
  },
  clipboardRead: () => clipboard.readText(),
  platform: process.platform,
});
